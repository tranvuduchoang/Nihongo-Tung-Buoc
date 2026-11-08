// Matches finger-drawn strokes against every Hiragana template with KanjiCanvas's stroke mapping.
(() => {
  const MAX_POINT_GAP = 2;
  const COMPARED_POINTS = 32;
  const DIRECTION_WEIGHT = 320;
  const STROKE_COUNT_PENALTY = 0.25;

  const segmentLength = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);

  // Fast finger strokes have points far apart, which the feature extractor cannot fill in.
  function densify(stroke) {
    const dense = [stroke[0]];
    if (stroke.length === 1) dense.push(stroke[0]);
    for (let i = 1; i < stroke.length; i++) {
      const [a, b] = [stroke[i - 1], stroke[i]];
      const parts = Math.max(1, Math.ceil(segmentLength(a, b) / MAX_POINT_GAP));
      for (let part = 1; part <= parts; part++) {
        dense.push([a[0] + (b[0] - a[0]) * part / parts, a[1] + (b[1] - a[1]) * part / parts]);
      }
    }
    return dense;
  }

  function resample(stroke, count) {
    const distances = [0];
    for (let i = 1; i < stroke.length; i++) {
      distances.push(distances[i - 1] + segmentLength(stroke[i - 1], stroke[i]));
    }
    const total = distances.at(-1);
    const points = [];
    let segment = 0;
    for (let i = 0; i < count; i++) {
      const target = total * i / (count - 1);
      while (segment < stroke.length - 2 && distances[segment + 1] < target) segment++;
      const a = stroke[segment];
      const b = stroke[Math.min(segment + 1, stroke.length - 1)];
      const span = (distances[segment + 1] - distances[segment]) || 1;
      const ratio = Math.min(1, (target - distances[segment]) / span);
      points.push([a[0] + (b[0] - a[0]) * ratio, a[1] + (b[1] - a[1]) * ratio]);
    }
    return points;
  }

  const shapes = new WeakMap();
  function shapeOf(stroke) {
    let shape = shapes.get(stroke);
    if (!shape) {
      const points = resample(stroke, COMPARED_POINTS);
      const directions = points.map((_, i) => {
        const before = points[Math.max(0, i - 2)];
        const after = points[Math.min(COMPARED_POINTS - 1, i + 2)];
        return Math.atan2(after[1] - before[1], after[0] - before[0]);
      });
      shape = {points, directions};
      shapes.set(stroke, shape);
    }
    return shape;
  }

  // The library's version floors the length ratio, so 28 points are compared with only
  // the first 28 of 40 and the end of the character is ignored.
  KanjiCanvas.wholeWholeDistance = (first, second) => {
    if (!first?.length || !second?.length) return 0;
    const a = shapeOf(first);
    const b = shapeOf(second);
    let distance = 0;
    for (let i = 0; i < COMPARED_POINTS; i++) {
      const turn = Math.abs(a.directions[i] - b.directions[i]);
      distance += Math.abs(a.points[i][0] - b.points[i][0]) + Math.abs(a.points[i][1] - b.points[i][1]) +
        DIRECTION_WEIGHT * Math.min(turn, 2 * Math.PI - turn) / Math.PI;
    }
    return distance / COMPARED_POINTS;
  };

  KanjiCanvas.kanaFeatures = strokes => {
    KanjiCanvas.recordedPattern_quiz = strokes.map(densify);
    return KanjiCanvas.extractFeatures(KanjiCanvas.momentNormalize('quiz'), 20);
  };

  // Returns the distinct candidates, best match first.
  KanjiCanvas.recognizeKana = strokes => {
    const features = KanjiCanvas.kanaFeatures(strokes);
    const strokeCount = features.length;
    const best = new Map();
    for (const [char, templateCount, template] of KanjiCanvas.refPatterns) {
      if (strokeCount >= templateCount + 2 || strokeCount <= templateCount - 3) continue;
      const initialMap = KanjiCanvas.getMap(template, features, KanjiCanvas.initialDistance);
      const map = KanjiCanvas.completeMap(template, features, KanjiCanvas.wholeWholeDistance, initialMap);
      const distance = KanjiCanvas.computeWholeDistanceWeighted(template, features, map) /
        Math.min(strokeCount, templateCount) *
        (1 + STROKE_COUNT_PENALTY * Math.abs(strokeCount - templateCount));
      if (!best.has(char) || distance < best.get(char)) best.set(char, distance);
    }
    return [...best].sort((a, b) => a[1] - b[1]).map(([char]) => char);
  };
})();
