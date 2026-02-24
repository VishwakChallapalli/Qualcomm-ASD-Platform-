import { el, clear } from "../lib/dom.js";
import { EMOTIONS, isEmotion, clamp01, prettyEmotion } from "../lib/emotions.js";
import { normalizeReading } from "./base.js";

export function createManualProvider() {
  /** @type {string|null} */
  let label = "neutral";
  /** @type {number|null} */
  let confidence = 0.9;
  /** @type {HTMLElement|null} */
  let root = null;

  function mountControls(container) {
    root = container;
    clear(container);

    const select = el(
      "select",
      { class: "select", id: "manualEmotionSelect", "aria-label": "Manual emotion selection" },
      ...["—", ...EMOTIONS].map((e) =>
        el("option", { value: e === "—" ? "" : e, text: e === "—" ? "—" : prettyEmotion(e) }),
      ),
    );
    select.value = label ?? "";
    select.addEventListener("change", () => {
      const v = select.value.trim();
      label = v === "" ? null : isEmotion(v) ? v : null;
    });

    const conf = el("input", {
      class: "input",
      id: "manualConfidence",
      type: "number",
      min: "0",
      max: "1",
      step: "0.05",
      value: String(confidence ?? 0.9),
      "aria-label": "Manual confidence (0 to 1)",
    });
    conf.addEventListener("input", () => {
      confidence = clamp01(conf.value);
    });

    container.appendChild(
      el(
        "div",
        { class: "row" },
        el("label", { class: "label", for: "manualEmotionSelect", text: "Emotion" }),
        select,
      ),
    );
    container.appendChild(
      el(
        "div",
        { class: "row" },
        el("label", { class: "label", for: "manualConfidence", text: "Confidence" }),
        conf,
      ),
    );
    container.appendChild(
      el(
        "div",
        { class: "note muted" },
        "This provider is for testing game logic without a model. You control the detected label.",
      ),
    );
  }

  async function start() {
    // no-op
  }

  async function stop() {
    // no-op
  }

  function getReading() {
    return normalizeReading({ label, confidence }, "manual");
  }

  return {
    id: "manual",
    name: "Manual (you choose)",
    mountControls,
    start,
    stop,
    getReading,
  };
}
