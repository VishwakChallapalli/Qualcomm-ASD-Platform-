import { el, clear } from "../lib/dom.js";
import { EMOTIONS, pickRandom, prettyEmotion } from "../lib/emotions.js";

export function createIdentifyGame() {
  /** @type {HTMLElement|null} */
  let root = null;
  /** @type {any} */
  let ctx = null;
  let active = false;

  let total = 0;
  let correct = 0;
  /** @type {string|null} */
  let target = null;
  /** @type {number|null} */
  let trialStartMs = null;

  function mount(_root, _ctx) {
    root = _root;
    ctx = _ctx;
  }

  function start() {
    if (!root) return;
    active = true;
    total = 0;
    correct = 0;
    ctx?.log?.("game_start", { gameId: "identify" });
    nextTrial();
  }

  function stop() {
    active = false;
    ctx?.log?.("game_stop", { gameId: "identify", total, correct });
  }

  function nextTrial() {
    if (!root || !active) return;
    target = pickRandom(EMOTIONS);
    trialStartMs = Date.now();
    total += 1;

    const options = shuffle([...EMOTIONS]).slice(0, 4);
    if (!options.includes(target)) options[Math.floor(Math.random() * options.length)] = target;

    clear(root);
    root.appendChild(
      el(
        "div",
        { class: "card" },
        el(
          "div",
          { class: "titleRow" },
          el("h3", { text: "Identify" }),
          el("span", { class: "pill", text: `Trial ${total}` }),
        ),
        el(
          "div",
          { class: "muted" },
          "Prompt: choose the label that matches the character's emotion.",
        ),
        el(
          "div",
          { class: "grid2", style: "margin-top:10px" },
          el(
            "div",
            { class: "card", style: "display:grid;place-items:center;min-height:160px" },
            emotionVisual(target, 92),
            el("div", { class: "muted", style: "margin-top:8px" }, "Character face"),
          ),
          el(
            "div",
            { class: "card" },
            el(
              "div",
              { class: "kpiRow" },
              kpi("Score", `${correct}/${Math.max(1, total - 1)}`),
              kpi("Target", target ? emotionEmoji(target) : "—"),
            ),
            el(
              "div",
              { class: "note muted", style: "margin-top:6px" },
              "Tip: drop your own images into web/assets/emotions/ to replace emojis with photos.",
            ),
          ),
        ),
        el(
          "div",
          { class: "options" },
          options.map((opt) =>
            el(
              "button",
              {
                class: "optionBtn",
                type: "button",
                onclick: () => onPick(opt),
              },
              prettyEmotion(opt),
            ),
          ),
        ),
      ),
    );
    root.appendChild(
      el(
        "div",
        { class: "note muted" },
        "This game doesn't need the camera/model; it's a baseline for recognition.",
      ),
    );

    ctx?.log?.("trial_start", { gameId: "identify", trial: total, target });
  }

  function onPick(opt) {
    if (!active || !root || !target) return;
    const rtMs = trialStartMs ? Date.now() - trialStartMs : null;
    const ok = opt === target;
    if (ok) correct += 1;

    ctx?.log?.("trial_end", {
      gameId: "identify",
      trial: total,
      target,
      choice: opt,
      correct: ok,
      rtMs,
    });

    // Mark buttons and continue shortly
    const btns = Array.from(root.querySelectorAll("button.optionBtn"));
    for (const b of btns) {
      const txt = (b.textContent || "").toLowerCase();
      if (txt === opt) b.classList.add(ok ? "correct" : "wrong");
      if (txt === target) b.classList.add("correct");
      b.disabled = true;
    }

    const msg = el(
      "div",
      { class: "note" },
      ok ? "Nice! That's correct." : "Good try — let's do another one.",
    );
    root.appendChild(msg);

    window.setTimeout(() => nextTrial(), 850);
  }

  return {
    id: "identify",
    name: "Identify (label the emotion)",
    mount,
    start,
    stop,
  };
}

function kpi(label, value) {
  return el(
    "div",
    { class: "kpi" },
    el("div", { class: "kpi__label", text: label }),
    el("div", { class: "kpi__value", text: value }),
  );
}

function emotionEmoji(label) {
  switch (label) {
    case "happy":
      return "😊";
    case "sad":
      return "😢";
    case "angry":
      return "😠";
    case "frustrated":
      return "😣";
    case "surprised":
      return "😮";
    case "fear":
      return "😨";
    case "disgust":
      return "🤢";
    case "neutral":
    default:
      return "😐";
  }
}

function emotionVisual(label, sizePx) {
  const box = el("div", {
    style: `width:${sizePx}px;height:${sizePx}px;display:grid;place-items:center;`,
  });
  const fallback = el(
    "div",
    { style: `font-size:${Math.max(18, Math.floor(sizePx * 0.85))}px;line-height:1` },
    emotionEmoji(label),
  );

  // Try a few common image extensions; if none exist, we just keep the emoji.
  const exts = ["png", "jpg", "jpeg", "webp"];
  const img = el("img", {
    alt: label ? `Example: ${label}` : "Example emotion",
    style: `width:${sizePx}px;height:${sizePx}px;object-fit:cover;border-radius:${Math.max(
      12,
      Math.floor(sizePx / 5),
    )}px;border:1px solid rgba(255,255,255,0.12);display:none;`,
  });

  let idx = 0;
  const tryNext = () => {
    if (idx >= exts.length) return;
    img.src = `./assets/emotions/${label}.${exts[idx++]}`;
  };

  img.addEventListener("load", () => {
    img.style.display = "block";
    fallback.style.display = "none";
  });
  img.addEventListener("error", () => {
    // Try the next extension
    tryNext();
  });

  // start attempts
  if (label) tryNext();

  box.appendChild(img);
  box.appendChild(fallback);
  return box;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
