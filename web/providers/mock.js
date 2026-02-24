import { el, clear } from "../lib/dom.js";
import { EMOTIONS, pickRandom } from "../lib/emotions.js";
import { normalizeReading } from "./base.js";

export function createMockProvider() {
  /** @type {string|null} */
  let label = "neutral";
  /** @type {number|null} */
  let confidence = 0.75;
  let timer = /** @type {number|null} */ (null);
  let intervalMs = 2000;

  function mountControls(container) {
    clear(container);

    const interval = el("input", {
      class: "input",
      type: "number",
      min: "250",
      step: "250",
      value: String(intervalMs),
      id: "mockInterval",
      "aria-label": "Mock provider change interval (ms)",
    });
    interval.addEventListener("input", () => {
      const v = Number(interval.value);
      intervalMs = Number.isFinite(v) ? Math.max(250, Math.floor(v)) : 2000;
      restartTimerIfRunning();
    });

    const btnNow = el("button", { class: "btn btn--ghost", type: "button" }, "Change now");
    btnNow.addEventListener("click", () => {
      randomize();
    });

    container.appendChild(
      el(
        "div",
        { class: "row" },
        el("label", { class: "label", for: "mockInterval", text: "Change every (ms)" }),
        interval,
        btnNow,
      ),
    );
    container.appendChild(
      el(
        "div",
        { class: "note muted" },
        "This provider simulates noisy predictions by changing emotions periodically.",
      ),
    );
  }

  function randomize() {
    label = pickRandom(EMOTIONS);
    confidence = 0.55 + Math.random() * 0.4;
  }

  function restartTimerIfRunning() {
    if (timer == null) return;
    stop();
    start();
  }

  async function start() {
    if (timer != null) return;
    randomize();
    timer = window.setInterval(() => randomize(), intervalMs);
  }

  async function stop() {
    if (timer != null) return;
    clearInterval(timer);
    timer = null;
  }

  function getReading() {
    return normalizeReading({ label, confidence }, "mock");
  }

  return {
    id: "mock",
    name: "Mock (random)",
    mountControls,
    start,
    stop,
    getReading,
  };
}
