/**
 * Game interface (duck-typed):
 * - id: string
 * - name: string
 * - mount(root: HTMLElement, ctx: GameContext): void
 * - start(): void
 * - stop(): void
 *
 * GameContext:
 * - getEmotion(): {label: string|null, confidence: number|null, provider: string}
 * - log(type: string, payload?: any): void
 */

export function createStopSignal() {
  let stopped = false;
  return {
    stop() {
      stopped = true;
    },
    get stopped() {
      return stopped;
    },
  };
}
