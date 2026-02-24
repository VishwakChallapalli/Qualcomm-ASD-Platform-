import { el, clear } from "../lib/dom.js";
import { normalizeReading } from "./base.js";

export function createViharProvider() {
  /** @type {string|null} */
  let label = null;
  /** @type {number|null} */
  let confidence = null;

  function mountControls(container) {
    clear(container);

    container.appendChild(
      el(
        "div",
        { class: "note muted" },
        "Vihar model provider - Integration coming soon.",
      ),
    );
  }

  async function start() {
    // Placeholder for future implementation
    label = "neutral";
    confidence = 0.5;
  }

  async function stop() {
    label = null;
    confidence = null;
  }

  function getReading() {
    return normalizeReading({ label, confidence }, "vihar");
  }

  return {
    id: "vihar",
    name: "Vihar model",
    mountControls,
    start,
    stop,
    getReading,
  };
}
