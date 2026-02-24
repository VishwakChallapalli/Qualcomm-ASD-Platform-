/**
 * @typedef {Object} EmotionReading
 * @property {string|null} label
 * @property {number|null} confidence
 * @property {string} provider
 */

/**
 * Provider interface (duck-typed):
 * - id: string
 * - name: string
 * - mountControls(container: HTMLElement): void
 * - start(): Promise<void> | void
 * - stop(): Promise<void> | void
 * - getReading(): EmotionReading
 */

export function normalizeReading(r, providerId) {
  const label = typeof r?.label === "string" ? r.label : null;
  const confidence =
    typeof r?.confidence === "number" && Number.isFinite(r.confidence) ? r.confidence : null;
  return {
    label,
    confidence,
    provider: providerId,
  };
}
