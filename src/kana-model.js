// Runs the Hiragana image classifier in the browser; drawings never leave the device.
(() => {
  const SIZE = 48;
  const INNER_SIZE = 40;
  const PEN_WIDTH = 2.2;
  const BLOCK_CHANNELS = [[1, 20], [20, 40], [40, 80], [80, 120]];

  let network = null;

  function decodeNetwork() {
    const {tensors, data} = window.KANA_MODEL_DATA;
    const binary = atob(data);
    const values = new Int16Array(binary.length / 2);
    for (let i = 0; i < values.length; i++) {
      values[i] = (binary.charCodeAt(2 * i) | binary.charCodeAt(2 * i + 1) << 8) << 16 >> 16;
    }
    let offset = 0;
    const decoded = tensors.map(({size, scale}) => {
      const tensor = new Float32Array(size);
      for (let i = 0; i < size; i++) tensor[i] = values[offset + i] * scale;
      offset += size;
      return tensor;
    });
    let index = 0;
    const blocks = BLOCK_CHANNELS.map(([inputs, outputs]) => ({
      inputs, outputs, weight: decoded[index++], scale: decoded[index++], shift: decoded[index++],
      mean: decoded[index++], variance: decoded[index++]
    }));
    return {blocks, classifier: decoded[index++], bias: decoded[index++]};
  }

  function distanceToSegment(px, py, a, b) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const lengthSquared = dx * dx + dy * dy;
    const t = lengthSquared ? Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / lengthSquared)) : 0;
    return Math.hypot(px - a[0] - t * dx, py - a[1] - t * dy);
  }

  // Draws the strokes centered and scaled to a fixed size, so size and position on the canvas do not matter.
  function rasterize(strokes) {
    const points = strokes.flat();
    const xs = points.map(p => p[0]);
    const ys = points.map(p => p[1]);
    const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const scale = INNER_SIZE / Math.max(maxX - minX, maxY - minY, 1);
    const place = ([x, y]) => [(x - (minX + maxX) / 2) * scale + SIZE / 2, (y - (minY + maxY) / 2) * scale + SIZE / 2];
    const image = new Float32Array(SIZE * SIZE);
    for (const stroke of strokes) {
      const placed = stroke.map(place);
      if (placed.length === 1) placed.push(placed[0]);
      for (let i = 1; i < placed.length; i++) {
        const [a, b] = [placed[i - 1], placed[i]];
        const reach = PEN_WIDTH / 2 + 1;
        const left = Math.max(0, Math.floor(Math.min(a[0], b[0]) - reach));
        const right = Math.min(SIZE - 1, Math.ceil(Math.max(a[0], b[0]) + reach));
        const top = Math.max(0, Math.floor(Math.min(a[1], b[1]) - reach));
        const bottom = Math.min(SIZE - 1, Math.ceil(Math.max(a[1], b[1]) + reach));
        for (let y = top; y <= bottom; y++) {
          for (let x = left; x <= right; x++) {
            const ink = PEN_WIDTH / 2 + 0.5 - distanceToSegment(x + 0.5, y + 0.5, a, b);
            if (ink > image[y * SIZE + x]) image[y * SIZE + x] = Math.min(1, ink);
          }
        }
      }
    }
    return image;
  }

  function runBlock(block, input, size) {
    const {inputs, outputs, weight, scale, shift, mean, variance} = block;
    const area = size * size;
    const activations = new Float32Array(outputs * area);
    for (let output = 0; output < outputs; output++) {
      for (let channel = 0; channel < inputs; channel++) {
        const kernel = (output * inputs + channel) * 9;
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            let sum = 0;
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                const [nx, ny] = [x + dx, y + dy];
                if (nx >= 0 && ny >= 0 && nx < size && ny < size) {
                  sum += weight[kernel + (dy + 1) * 3 + dx + 1] * input[channel * area + ny * size + nx];
                }
              }
            }
            activations[output * area + y * size + x] += sum;
          }
        }
      }
    }
    const half = size / 2;
    const pooled = new Float32Array(outputs * half * half);
    for (let output = 0; output < outputs; output++) {
      const gain = scale[output] / Math.sqrt(variance[output] + 1e-5);
      const base = output * area;
      for (let y = 0; y < half; y++) {
        for (let x = 0; x < half; x++) {
          let peak = 0;
          for (const [px, py] of [[2 * x, 2 * y], [2 * x + 1, 2 * y], [2 * x, 2 * y + 1], [2 * x + 1, 2 * y + 1]]) {
            peak = Math.max(peak, (activations[base + py * size + px] - mean[output]) * gain + shift[output]);
          }
          pooled[output * half * half + y * half + x] = peak;
        }
      }
    }
    return pooled;
  }

  // Returns per-character log probabilities and a unit-length feature vector.
  function predict(strokes) {
    network ||= decodeNetwork();
    let output = rasterize(strokes);
    let size = SIZE;
    for (const block of network.blocks) {
      output = runBlock(block, output, size);
      size /= 2;
    }
    const channels = BLOCK_CHANNELS.at(-1)[1];
    const features = new Float32Array(channels);
    for (let channel = 0; channel < channels; channel++) {
      for (let i = 0; i < size * size; i++) features[channel] += output[channel * size * size + i] / (size * size);
    }
    const classes = [...window.KANA_MODEL_DATA.classes];
    const logits = classes.map((_, row) => {
      let value = network.bias[row];
      for (let channel = 0; channel < channels; channel++) value += network.classifier[row * channels + channel] * features[channel];
      return value;
    });
    const largest = Math.max(...logits);
    const total = logits.reduce((sum, value) => sum + Math.exp(value - largest), 0);
    const logProbabilities = new Map(classes.map((char, i) => [char, logits[i] - largest - Math.log(total)]));
    const length = Math.hypot(...features) || 1;
    return {logProbabilities, features: Array.from(features, value => value / length)};
  }

  window.KanaModel = {predict};
})();
