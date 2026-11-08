"""Trains the Hiragana classifier and writes hiragana-model.js. Needs: pip install torch numpy pillow

python scripts/train-model.py --fonts <dir of OFL .ttf files> --version 2026-11-v3
Optional: --samples mau-chu-viet-cua-toi.json adds handwriting exported from the site.
Optional: --real-images <dir of kana{ROMAJI}{0-19}.jpg> reports accuracy on photos; they are never trained on.
"""
import argparse, base64, glob, json, math, os, random, re
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE_CHARS = list('あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん')
ROMAJI = 'A I U E O KA KI KU KE KO SA SHI SU SE SO TA CHI TSU TE TO NA NI NU NE NO HA HI FU HE HO MA MI MU ME MO YA YU YO RA RI RU RE RO WA WO N'.split()
DAKUTEN = dict(zip('がぎぐげござじずぜぞだぢづでどばびぶべぼゔ', 'かきくけこさしすせそたちつてとはひふへほう'))
HANDAKUTEN = dict(zip('ぱぴぷぺぽ', 'はひふへほ'))
MARKED = {**DAKUTEN, **HANDAKUTEN}
CHARS = BASE_CHARS + list(MARKED)
# Marked characters present in the optional real-image test set.
REAL_MARKED = {'BA': 'ば', 'DA': 'だ', 'JI': 'じ', 'PI': 'ぴ'}
INDEX = {char: i for i, char in enumerate(CHARS)}
SIZE, INNER, SUPERSAMPLE = 48, 40, 4
STROKE_DRAWINGS_PER_CHAR, FONT_DRAWINGS_PER_CHAR = 420, 200
MARKED_STROKE_DRAWINGS_PER_CHAR, MARKED_FONT_DRAWINGS_PER_CHAR = 300, 150


def load_templates(samples_file):
    templates = {char: [] for char in CHARS}
    for name in ['hiragana-patterns.js', 'hiragana-patterns-tomoe.js', 'hiragana-patterns-kanjivg.js']:
        text = open(os.path.join(ROOT, name), encoding='utf8').read()
        for char, _, strokes, source in json.loads(re.search(r'\[\[.*\]\]', text, re.S).group(0)):
            if source != 'project':
                templates[char].append(strokes)
    if samples_file:
        saved = json.load(open(samples_file, encoding='utf8'))['samples']
        for char, drawings in saved.items():
            templates[char].extend(drawing['strokes'] for drawing in drawings)
    return templates


def rasterize(strokes, width):
    points = np.array([p for stroke in strokes for p in stroke], float)
    low, high = points.min(0), points.max(0)
    scale = INNER / max(high[0] - low[0], high[1] - low[1], 1.0) * SUPERSAMPLE
    offset = np.array([SIZE * SUPERSAMPLE / 2] * 2) - (low + high) / 2 * scale
    image = Image.new('L', (SIZE * SUPERSAMPLE, SIZE * SUPERSAMPLE), 0)
    draw = ImageDraw.Draw(image)
    pen = max(1, int(round(width * SUPERSAMPLE)))
    for stroke in strokes:
        placed = [(p[0] * scale + offset[0], p[1] * scale + offset[1]) for p in stroke]
        if len(placed) > 1:
            draw.line(placed, fill=255, width=pen, joint='curve')
        for x, y in (placed[0], placed[-1]):
            draw.ellipse((x - pen / 2, y - pen / 2, x + pen / 2, y + pen / 2), fill=255)
    return np.asarray(image.resize((SIZE, SIZE), Image.BOX), np.float32) / 255


def densify(stroke, gap=6.0):
    dense = [stroke[0]]
    for a, b in zip(stroke, stroke[1:]):
        parts = max(1, int(math.ceil(math.hypot(b[0] - a[0], b[1] - a[1]) / gap)))
        dense.extend([a[0] + (b[0] - a[0]) * t / parts, a[1] + (b[1] - a[1]) * t / parts] for t in range(1, parts + 1))
    return dense


def coarsen(stroke, gap):
    """Mimics a fast finger, which reports few points and makes angular lines."""
    points, travelled = [stroke[0]], 0.0
    for a, b in zip(stroke, stroke[1:]):
        travelled += math.hypot(b[0] - a[0], b[1] - a[1])
        if travelled >= gap:
            points.append(b)
            travelled = 0.0
    if points[-1] is not stroke[-1]:
        points.append(stroke[-1])
    return points


def vary_strokes(strokes):
    """Moves and resizes each stroke separately, since handwriting varies stroke by stroke."""
    turn, shear = random.uniform(-.2, .2), random.uniform(-.2, .2)
    stretch_x, stretch_y = random.uniform(.75, 1.3), random.uniform(.75, 1.3)
    wobble = random.uniform(0, 12)
    waves = [random.uniform(.008, .03) for _ in range(4)]
    phases = [random.uniform(0, 6.3) for _ in range(4)]
    strength = random.uniform(.3, 1)
    result = []
    for stroke in strokes:
        dense = np.array(densify(stroke), float)
        center = dense.mean(0)
        angle = random.uniform(-.22, .22) * strength
        size = 1 + random.uniform(-.28, .32) * strength
        size_x, size_y = size * (1 + random.uniform(-.2, .2) * strength), size * (1 + random.uniform(-.2, .2) * strength)
        reach = 44 if len(dense) < 16 else 26
        move_x, move_y = random.uniform(-reach, reach) * strength, random.uniform(-reach, reach) * strength
        x, y = dense[:, 0] - center[0], dense[:, 1] - center[1]
        x_out = (x * math.cos(angle) - y * math.sin(angle)) * size_x + center[0] + move_x - 128
        y_out = (x * math.sin(angle) + y * math.cos(angle)) * size_y + center[1] + move_y - 128
        final_x = stretch_x * (x_out * math.cos(turn) - y_out * math.sin(turn) + shear * y_out) + wobble * np.sin(waves[0] * y_out + phases[0]) + wobble * .6 * np.sin(waves[1] * x_out + phases[1])
        final_y = stretch_y * (x_out * math.sin(turn) + y_out * math.cos(turn)) + wobble * np.sin(waves[2] * x_out + phases[2]) + wobble * .6 * np.sin(waves[3] * y_out + phases[3])
        result.append(np.stack([final_x, final_y], 1).tolist())
    if random.random() < .7:
        result = [coarsen(stroke, random.uniform(8, 26)) for stroke in result]
    return result


def add_marks(strokes, handakuten):
    """Adds dakuten ticks or a handakuten circle at the top right, where learners write them."""
    points = [p for stroke in strokes for p in stroke]
    xs, ys = [p[0] for p in points], [p[1] for p in points]
    span = max(max(xs) - min(xs), max(ys) - min(ys), 1.0)
    x = max(xs) + random.uniform(-.08, .12) * span
    y = min(ys) + random.uniform(-.1, .14) * span
    if handakuten:
        radius = random.uniform(.06, .13) * span
        sides = random.randint(7, 14)
        start = random.uniform(0, 6.3)
        return strokes + [[[x + radius * math.cos(start + 6.3 * i / sides) * random.uniform(.85, 1.15),
                            y + radius * math.sin(start + 6.3 * i / sides) * random.uniform(.85, 1.15)] for i in range(sides + 1)]]
    gap = random.uniform(.09, .2) * span
    length = random.uniform(.12, .26) * span
    tilt = random.uniform(.5, 1.3)
    ticks = []
    for offset in (0, gap):
        tick_y = y + random.uniform(-.03, .03) * span
        tick_x = x + offset
        ticks.append([[tick_x, tick_y], [tick_x + length * math.cos(tilt) * random.uniform(.8, 1.2), tick_y + length * math.sin(tilt) * random.uniform(.8, 1.2)]])
    return strokes + ticks


def stroke_example(templates, char):
    own = templates[char]
    if char not in MARKED or (own and random.random() < .5):
        return vary_strokes(random.choice(own))
    return add_marks(vary_strokes(random.choice(templates[MARKED[char]])), char in HANDAKUTEN)


def fit_to_canvas(image):
    box = image.getbbox()
    if box:
        image = image.crop(box)
    width, height = image.size
    scale = INNER / max(width, height)
    image = image.resize((max(1, round(width * scale)), max(1, round(height * scale))), Image.BILINEAR)
    canvas = Image.new('L', (SIZE, SIZE), 0)
    canvas.paste(image, ((SIZE - image.size[0]) // 2, (SIZE - image.size[1]) // 2))
    return np.asarray(canvas, np.float32) / 255


def load_fonts(directory):
    fonts = []
    for path in sorted(glob.glob(os.path.join(directory, '*.ttf'))):
        font = ImageFont.truetype(path, 160)
        glyphs = {}
        for char in CHARS:
            image = Image.new('L', (260, 260), 0)
            ImageDraw.Draw(image).text((30, 20), char, 255, font=font)
            box = image.getbbox()
            if box:
                glyphs[char] = image.crop(box)
        if len(glyphs) == len(CHARS):
            fonts.append(glyphs)
    return fonts


def vary_glyph(glyph):
    padded = Image.new('L', (glyph.size[0] + 120, glyph.size[1] + 120), 0)
    padded.paste(glyph, (60, 60))
    turn, shear = random.uniform(-.2, .2), random.uniform(-.2, .2)
    stretch_x, stretch_y = random.uniform(.8, 1.25), random.uniform(.8, 1.25)
    cx, cy = padded.size[0] / 2, padded.size[1] / 2
    a, b = math.cos(turn) / stretch_x, (-math.sin(turn) + shear) / stretch_x
    d, e = math.sin(turn) / stretch_y, math.cos(turn) / stretch_y
    return fit_to_canvas(padded.transform(padded.size, Image.AFFINE, (a, b, cx - a * cx - b * cy, d, e, cy - d * cx - e * cy), Image.BILINEAR))


def make_epoch(templates, fonts):
    images, labels = [], []
    for char in CHARS:
        strokes_count, fonts_count = (MARKED_STROKE_DRAWINGS_PER_CHAR, MARKED_FONT_DRAWINGS_PER_CHAR) if char in MARKED else (STROKE_DRAWINGS_PER_CHAR, FONT_DRAWINGS_PER_CHAR)
        for _ in range(strokes_count):
            images.append(rasterize(stroke_example(templates, char), random.uniform(1.3, 3.6)))
            labels.append(INDEX[char])
        for _ in range(fonts_count if fonts else 0):
            images.append(vary_glyph(random.choice(fonts)[char]))
            labels.append(INDEX[char])
    return torch.from_numpy(np.stack(images))[:, None], torch.tensor(labels)


def warp(batch):
    count = batch.size(0)
    field = F.interpolate(torch.randn(count, 2, 6, 6), size=(SIZE, SIZE), mode='bicubic', align_corners=True).permute(0, 2, 3, 1)
    shift = (torch.rand(count, 1, 1, 2) - .5) * .14
    ys, xs = torch.meshgrid(torch.linspace(-1, 1, SIZE), torch.linspace(-1, 1, SIZE), indexing='ij')
    grid = torch.stack([xs, ys], 2)[None].repeat(count, 1, 1, 1)
    return F.grid_sample(batch, grid + field * torch.rand(count, 1, 1, 1) * .09 + shift, align_corners=True, padding_mode='zeros')


def load_real_images(directory):
    images, labels = [], []
    for romaji, char in [*zip(ROMAJI, BASE_CHARS), *REAL_MARKED.items()]:
        for number in range(20):
            pixels = np.asarray(Image.open(os.path.join(directory, f'kana{romaji}{number}.jpg')).convert('L'), np.float32)
            if pixels.mean() > 127:
                pixels = 255 - pixels
            low, high = np.percentile(pixels, 50), np.percentile(pixels, 99.5)
            pixels = np.clip((pixels - low) / max(1, high - low), 0, 1)
            pixels[pixels < .35] = 0
            images.append(fit_to_canvas(Image.fromarray((pixels * 255).astype(np.uint8))))
            labels.append(INDEX[char])
    return torch.from_numpy(np.stack(images))[:, None], torch.tensor(labels)


def block(inputs, outputs):
    return nn.Sequential(nn.Conv2d(inputs, outputs, 3, padding=1, bias=False), nn.BatchNorm2d(outputs), nn.ReLU(inplace=True), nn.MaxPool2d(2))


class Network(nn.Module):
    def __init__(self):
        super().__init__()
        self.f = nn.Sequential(block(1, 20), block(20, 40), block(40, 80), block(80, 120))
        self.drop = nn.Dropout(.25)
        self.fc = nn.Linear(120, len(CHARS))

    def forward(self, batch):
        return self.fc(self.drop(self.f(batch).mean((2, 3))))


def export(state, version):
    keys = [f'f.{b}.{name}' for b in range(4) for name in ('0.weight', '1.weight', '1.bias', '1.running_mean', '1.running_var')] + ['fc.weight', 'fc.bias']
    tensors, values = [], []
    for key in keys:
        array = state[key].numpy().astype(np.float64).ravel()
        scale = float(max(np.abs(array).max(), 1e-9) / 32767)
        values.append(np.round(array / scale).astype(np.int16))
        tensors.append({'size': int(array.size), 'scale': scale})
    payload = {'version': version, 'classes': ''.join(CHARS), 'tensors': tensors,
               'data': base64.b64encode(np.concatenate(values).astype('<i2').tobytes()).decode()}
    notice = 'Hiragana classifier trained on the stroke data in hiragana-patterns*.js and open-licensed fonts. See THIRD_PARTY_NOTICES.md.'
    with open(os.path.join(ROOT, 'hiragana-model.js'), 'w', encoding='utf8') as file:
        file.write(f'// {notice}\nwindow.KANA_MODEL_DATA = {json.dumps(payload, ensure_ascii=False, separators=(",", ":"))};\n')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--fonts', required=True)
    parser.add_argument('--version', required=True)
    parser.add_argument('--epochs', type=int, default=26)
    parser.add_argument('--samples')
    parser.add_argument('--real-images')
    args = parser.parse_args()
    random.seed(1); np.random.seed(1); torch.manual_seed(1)
    templates, fonts = load_templates(args.samples), load_fonts(args.fonts)
    print(f'{len(fonts)} fonts', flush=True)
    real = load_real_images(args.real_images) if args.real_images else None
    network = Network()
    optimizer = torch.optim.AdamW(network.parameters(), lr=1e-3, weight_decay=1e-4)
    batches_per_epoch = (len(BASE_CHARS) * (STROKE_DRAWINGS_PER_CHAR + FONT_DRAWINGS_PER_CHAR) +
                         len(MARKED) * (MARKED_STROKE_DRAWINGS_PER_CHAR + MARKED_FONT_DRAWINGS_PER_CHAR)) // 128 + 1
    total_steps = args.epochs * batches_per_epoch
    schedule = torch.optim.lr_scheduler.OneCycleLR(optimizer, max_lr=3e-3, total_steps=total_steps, pct_start=.15)
    for epoch in range(args.epochs):
        images, labels = make_epoch(templates, fonts)
        network.train()
        order = torch.randperm(len(images))
        for start in range(0, len(images), 128):
            batch = order[start:start + 128]
            loss = F.cross_entropy(network(warp(images[batch])), labels[batch], label_smoothing=.05)
            optimizer.zero_grad(); loss.backward(); optimizer.step()
            if schedule.last_epoch < total_steps - 1:
                schedule.step()
        message = f'epoch {epoch + 1}/{args.epochs}'
        if real:
            network.eval()
            with torch.no_grad():
                correct = network(real[0]).argmax(1) == real[1]
                is_marked = real[1] >= len(BASE_CHARS)
                message += f' real-image accuracy: base {correct[~is_marked].float().mean().item() * 100:.1f}% marked {correct[is_marked].float().mean().item() * 100:.1f}%'
        print(message, flush=True)
    export(network.state_dict(), args.version)
    print('Wrote hiragana-model.js')


if __name__ == '__main__':
    main()
