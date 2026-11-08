// Grades a drawing using the classifier plus the learner's own saved handwriting.
(() => {
  // Accept the target when it scores within this many log-probability units of the best character.
  const ACCEPT_MARGIN = 1.5;
  const PERSONAL_WEIGHT = 5;
  const PERSONAL_MIN_SIMILARITY = 0.85;

  const similarity = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0);

  function recognize(strokes, target, samples = {}) {
    const {logProbabilities, features} = window.KanaModel.predict(strokes);
    const scores = new Map(logProbabilities);
    for (const [char, saved] of Object.entries(samples)) {
      const closest = Math.max(-1, ...saved.map(sample => similarity(features, sample.features)));
      const match = Math.max(0, (closest - PERSONAL_MIN_SIMILARITY) / (1 - PERSONAL_MIN_SIMILARITY));
      scores.set(char, scores.get(char) + PERSONAL_WEIGHT * match);
    }
    const [best, bestScore] = [...scores].reduce((top, entry) => entry[1] > top[1] ? entry : top);
    const correct = bestScore - scores.get(target) <= ACCEPT_MARGIN;
    return {correct, recognized: correct ? target : best, features};
  }

  window.KanaRecognizer = {recognize};
})();
