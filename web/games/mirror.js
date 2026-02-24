import { el, clear, fmtMs } from "../lib/dom.js";
import { EMOTIONS, pickRandom, prettyEmotion } from "../lib/emotions.js";

export function createMirrorGame() {
  /** @type {HTMLElement|null} */
  let root = null;
  /** @type {any} */
  let ctx = null;
  let active = false;
  let tick = /** @type {number|null} */ (null);

  /** @type {string|null} */
  let target = null;
  let streak = 0;
  let successes = 0;
  let attempts = 0;
  let startedAt = 0;

  const requiredStableMs = 1200;
  let stableSince = /** @type {number|null} */ (null);

  function mount(_root, _ctx) {
    root = _root;
    ctx = _ctx;
  }

  function start() {
    if (!root) return;
    active = true;
    streak = 0;
    successes = 0;
    attempts = 0;
    startedAt = Date.now();
    ctx?.log?.("game_start", { gameId: "mirror" });
    nextTarget();
    render();
    tick = window.setInterval(() => onTick(), 150);
  }

  function stop() {
    active = false;
    if (tick != null) {
      clearInterval(tick);
      tick = null;
    }
    ctx?.log?.("game_stop", { gameId: "mirror", successes, attempts, streak });
  }

  function nextTarget() {
    target = pickRandom(EMOTIONS.filter((e) => e !== "disgust")); // keep it friendly for now
    stableSince = null;
    attempts += 1;
    ctx?.log?.("prompt", { gameId: "mirror", target, attempt: attempts });
  }

  function onTick() {
    if (!active) return;
    const reading = ctx.getEmotion();
    const now = Date.now();
    const matches = target && reading.label === target;

    if (matches) {
      if (stableSince == null) stableSince = now;
      const stableFor = now - stableSince;
      if (stableFor >= requiredStableMs) {
        successes += 1;
        streak += 1;
        ctx?.log?.("success", {
          gameId: "mirror",
          target,
          detected: reading.label,
          confidence: reading.confidence,
          provider: reading.provider,
          stableForMs: stableFor,
        });
        nextTarget();
      }
    } else {
      stableSince = null;
    }

    render();
  }

  function render() {
    if (!root) return;
    clear(root);
    const reading = ctx.getEmotion();
    const now = Date.now();
    const elapsed = fmtMs(now - startedAt);
    const matches = target && reading.label === target;
    const stableFor = stableSince ? now - stableSince : 0;
    const progress = Math.min(1, stableFor / requiredStableMs);

    root.appendChild(
      el(
        "div",
        { class: "card" },
        el(
          "div",
          { class: "titleRow" },
          el("h3", { text: "Mirror" }),
          el("span", { class: "pill", text: `Time ${elapsed}` }),
        ),
        el(
          "div",
          { class: "muted" },
          "Prompt: match the target emotion for a moment. (Use Manual provider to simulate detection.)",
        ),
        el(
          "div",
          { class: "kpiRow" },
          kpi("Target", target ? prettyEmotion(target) : "—"),
          kpi("Detected", reading.label ? prettyEmotion(reading.label) : "—"),
          kpi("Streak", String(streak)),
          kpi("Successes", `${successes}/${attempts}`),
        ),
        el(
          "div",
          { class: "note muted" },
          matches
            ? `Hold it… ${(progress * 100).toFixed(0)}%`
            : "Try to match the target emotion.",
        ),
        progressBar(progress, matches),
      ),
    );

    root.appendChild(
      el(
        "div",
        { class: "row" },
        el(
          "button",
          { class: "btn btn--ghost", type: "button", onclick: () => nextTarget() },
          "New target",
        ),
        el(
          "button",
          { class: "btn btn--danger", type: "button", onclick: () => stop() },
          "End game",
        ),
      ),
    );
  }

  return {
    id: "mirror",
    name: "Mirror (match the target emotion)",
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

function progressBar(p, good) {
  const outer = el("div", {
    class: "card",
    style:
      "padding:10px;border-radius:16px;border:1px solid rgba(255,255,255,0.12);background:rgba(0,0,0,0.18)",
  });
  const inner = el("div", {
    style: `height:10px;border-radius:999px;width:${Math.floor(
      p * 100,
    )}%;background:${good ? "rgba(61,214,208,0.85)" : "rgba(124,92,255,0.75)"};`,
  });
  outer.appendChild(inner);
  return outer;
}
