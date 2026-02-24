export const EMOTIONS = /** @type {const} */ ([
  "happy",
  "sad",
  "angry",
  "frustrated",
  "surprised",
  "fear",
  "disgust",
  "neutral",
]);

export function isEmotion(x) {
  return typeof x === "string" && EMOTIONS.includes(x);
}

export function clamp01(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export function prettyEmotion(label) {
  if (!label) return "—";
  return label.slice(0, 1).toUpperCase() + label.slice(1);
}

export function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
