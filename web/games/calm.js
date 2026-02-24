import { el, clear, fmtMs } from "../lib/dom.js";
import { prettyEmotion } from "../lib/emotions.js";

export function createCalmGame() {
  /** @type {HTMLElement|null} */
  let root = null;
  /** @type {any} */
  let ctx = null;
  let active = false;

  let phase = "idle"; // idle | breathing | check
  let tick = /** @type {number|null} */ (null);

  const totalMs = 30_000;
  const inhaleMs = 4_000;
  const exhaleMs = 4_000;
  let startedAt = 0;

  function mount(_root, _ctx) {
    root = _root;
    ctx = _ctx;
  }

  function start() {
    if (!root) return;
    active = true;
    phase = "idle";
    ctx?.log?.("game_start", { gameId: "calm" });
    render();
  }

  function stop() {
    active = false;
    if (tick != null) {
      clearInterval(tick);
      tick = null;
    }
    ctx?.log?.("game_stop", { gameId: "calm" });
  }

  function beginBreathing() {
    if (!active) return;
    phase = "breathing";
    startedAt = Date.now();
    ctx?.log?.("breathing_start", { gameId: "calm", totalMs });
    if (tick != null) clearInterval(tick);
    tick = window.setInterval(() => {
      render();
      const elapsed = Date.now() - startedAt;
      if (elapsed >= totalMs) {
        phase = "check";
        ctx?.log?.("breathing_end", { gameId: "calm", elapsedMs: elapsed });
        render();
      }
    }, 150);
    render();
  }

  function render() {
    if (!root) return;
    clear(root);
    const reading = ctx.getEmotion();
    const now = Date.now();

    root.appendChild(
      el(
        "div",
        { class: "card" },
        el(
          "div",
          { class: "titleRow" },
          el("h3", { text: "Calm-down" }),
          el("span", { class: "pill", text: phaseLabel(phase) }),
        ),
        el(
          "div",
          { class: "muted" },
          "Goal: practice a short breathing exercise, then check if the detected emotion looks calmer.",
        ),
        el(
          "div",
          { class: "kpiRow" },
          kpi("Detected", reading.label ? prettyEmotion(reading.label) : "—"),
          kpi("Confidence", reading.confidence == null ? "—" : reading.confidence.toFixed(2)),
        ),
      ),
    );

    if (phase === "idle") {
      root.appendChild(
        el(
          "div",
          { class: "card" },
          el("div", { class: "muted" }, "When you're ready, start breathing."),
          el(
            "div",
            { class: "row" },
            el("button", { class: "btn", type: "button", onclick: () => beginBreathing() }, "Start"),
            el(
              "button",
              { class: "btn btn--danger", type: "button", onclick: () => stop() },
              "End game",
            ),
          ),
        ),
      );
      return;
    }

    if (phase === "breathing") {
      const elapsed = now - startedAt;
      const remaining = Math.max(0, totalMs - elapsed);
      const cycleMs = inhaleMs + exhaleMs;
      const inCycle = elapsed % cycleMs;
      const inhale = inCycle < inhaleMs;

      root.appendChild(
        el(
          "div",
          { class: "card" },
          el(
            "div",
            { class: "kpiRow" },
            kpi("Remaining", fmtMs(remaining)),
            kpi("Step", inhale ? "Inhale" : "Exhale"),
          ),
          el(
            "div",
            { class: "breath" },
            el("div", { class: `breath__circle ${inhale ? "inhale" : ""}` }),
            el("div", { class: "breath__label", text: inhale ? "Inhale slowly…" : "Exhale slowly…" }),
          ),
        ),
      );
      return;
    }

    // phase === "check"
    root.appendChild(
      el(
        "div",
        { class: "card" },
        el(
          "div",
          { class: "muted" },
          "Check: does the detected emotion look calmer now? (In the prototype, use Manual provider to set it.)",
        ),
        el(
          "div",
          { class: "row" },
          el(
            "button",
            {
              class: "btn",
              type: "button",
              onclick: () => {
                ctx?.log?.("calm_check", { gameId: "calm", detected: reading.label });
                phase = "idle";
                if (tick != null) {
                  clearInterval(tick);
                  tick = null;
                }
                render();
              },
            },
            "Done",
          ),
          el(
            "button",
            { class: "btn btn--ghost", type: "button", onclick: () => beginBreathing() },
            "Repeat breathing",
          ),
          el(
            "button",
            { class: "btn btn--danger", type: "button", onclick: () => stop() },
            "End game",
          ),
        ),
        el(
          "div",
          { class: "note muted" },
          "Later: define "calmer" formally (e.g., not angry/frustrated; or arousal score decreases).",
        ),
      ),
    );
  }

  return {
    id: "calm",
    name: "Calm-down (guided breathing)",
    mount,
    start,
    stop,
  };
}

function phaseLabel(phase) {
  if (phase === "idle") return "Ready";
  if (phase === "breathing") return "Breathing";
  if (phase === "check") return "Check-in";
  return "—";
}

function kpi(label, value) {
  return el(
    "div",
    { class: "kpi" },
    el("div", { class: "kpi__label", text: label }),
    el("div", { class: "kpi__value", text: value }),
  );
}
