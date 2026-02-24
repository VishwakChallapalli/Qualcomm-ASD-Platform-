import { el, clear } from "../lib/dom.js";
import { clamp01 } from "../lib/emotions.js";
import { normalizeReading } from "./base.js";

export function createPythonProvider(getVideoEl, opts = {}) {
  /** @type {string|null} */
  let label = null;
  /** @type {number|null} */
  let confidence = null;

  let endpoint = typeof opts.endpoint === "string" ? opts.endpoint : "http://127.0.0.1:5055/infer";
  let intervalMs = Number.isFinite(opts.intervalMs) ? Math.max(150, Math.floor(opts.intervalMs)) : 350;
  let jpegQuality = opts.jpegQuality == null ? 0.8 : clamp01(opts.jpegQuality);
  let maxW = Number.isFinite(opts.maxW) ? Math.max(240, Math.floor(opts.maxW)) : 480;
  const sessionId = `web_${Math.random().toString(16).slice(2)}_${Date.now()}`;
  let running = false;
  let timer = /** @type {number|null} */ (null);
  let inflight = false;
  let lastError = "";

  // Shared offscreen canvas for frame capture
  const canvas = document.createElement("canvas");
  const ctx2d = canvas.getContext("2d", { willReadFrequently: false });

  function mountControls(container) {
    clear(container);

    const endpointInput = el("input", {
      class: "input",
      id: "pyEndpoint",
      value: endpoint,
      placeholder: "http://127.0.0.1:5055/infer",
    });
    endpointInput.addEventListener("input", () => {
      endpoint = endpointInput.value.trim();
    });

    const intervalInput = el("input", {
      class: "input",
      id: "pyInterval",
      type: "number",
      min: "150",
      step: "50",
      value: String(intervalMs),
    });
    intervalInput.addEventListener("input", () => {
      const v = Number(intervalInput.value);
      intervalMs = Number.isFinite(v) ? Math.max(150, Math.floor(v)) : 450;
      restartTimerIfRunning();
    });

    const qualityInput = el("input", {
      class: "input",
      id: "pyQuality",
      type: "number",
      min: "0.2",
      max: "0.95",
      step: "0.05",
      value: String(jpegQuality),
    });
    qualityInput.addEventListener("input", () => {
      jpegQuality = clamp01(qualityInput.value);
    });

    const status = el("div", { class: "note muted", id: "pyStatus" }, "Status: idle");

    const btnPing = el("button", { class: "btn btn--ghost", type: "button" }, "Ping server");
    btnPing.addEventListener("click", async () => {
      try {
        status.textContent = "Status: pinging…";
        const r = await fetch(endpoint.replace(/\/infer$/, "/health"), { method: "GET" });
        status.textContent = r.ok ? "Status: server OK" : `Status: server responded ${r.status}`;
      } catch (e) {
        status.textContent = `Status: cannot reach server (${String(e?.message ?? e)})`;
      }
    });

    container.appendChild(
      el(
        "div",
        { class: "row" },
        el("label", { class: "label", for: "pyEndpoint", text: "Endpoint" }),
        endpointInput,
      ),
    );
    container.appendChild(
      el(
        "div",
        { class: "row" },
        el("label", { class: "label", for: "pyInterval", text: "Interval (ms)" }),
        intervalInput,
        el("label", { class: "label", for: "pyQuality", text: "JPEG quality" }),
        qualityInput,
      ),
    );
    container.appendChild(el("div", { class: "row" }, btnPing));
    container.appendChild(status);

    container.appendChild(
      el(
        "div",
        { class: "note muted" },
        "Requires the camera preview to be running and the Python server to be started.",
      ),
    );

    // keep status updated
    window.setInterval(() => {
      if (!container.isConnected) return;
      const base = running ? "running" : "idle";
      status.textContent = lastError ? `Status: ${base} • ${lastError}` : `Status: ${base}`;
    }, 600);
  }

  function restartTimerIfRunning() {
    if (!running) return;
    stop();
    start();
  }

  async function start() {
    if (running) return;
    running = true;
    lastError = "";
    if (timer != null) clearInterval(timer);
    timer = window.setInterval(() => tick(), intervalMs);
    await tick();
  }

  async function stop() {
    running = false;
    inflight = false;
    if (timer != null) {
      clearInterval(timer);
      timer = null;
    }
  }

  async function tick() {
    if (!running || inflight) return;
    const video = getVideoEl?.();
    if (!video || video.readyState < 2) {
      lastError = "camera not ready";
      return;
    }
    if (!ctx2d) {
      lastError = "canvas not available";
      return;
    }

    // Downscale for speed
    const w = Math.max(1, video.videoWidth || 640);
    const h = Math.max(1, video.videoHeight || 480);
    const scale = Math.min(1, maxW / w);
    canvas.width = Math.floor(w * scale);
    canvas.height = Math.floor(h * scale);
    ctx2d.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageB64 = canvas.toDataURL("image/jpeg", jpegQuality);

    inflight = true;
    try {
      const resp = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageB64, sessionId }),
      });
      if (!resp.ok) {
        lastError = `HTTP ${resp.status}`;
        return;
      }
      const data = await resp.json();
      label = typeof data?.label === "string" ? data.label : null;
      confidence = typeof data?.confidence === "number" ? data.confidence : null;
      lastError = "";
    } catch (e) {
      lastError = String(e?.message ?? e);
    } finally {
      inflight = false;
    }
  }

  function getReading() {
    return normalizeReading({ label, confidence }, "python");
  }

  return {
    id: "python",
    name: "Python + OpenCV (local server)",
    mountControls,
    start,
    stop,
    getReading,
  };
}
