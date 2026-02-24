import { clear, el } from "./lib/dom.js";
import { prettyEmotion } from "./lib/emotions.js";
import { createSessionLogger } from "./lib/log.js";
import { loadSessions, clearSessions, downloadJson } from "./lib/session_store.js";

import { createManualProvider } from "./providers/manual.js";
import { createMockProvider } from "./providers/mock.js";
import { createPythonProvider } from "./providers/python.js";
import { createViharProvider } from "./providers/vihar.js";

import { createIdentifyGame } from "./games/identify.js";
import { createMirrorGame } from "./games/mirror.js";
import { createCalmGame } from "./games/calm.js";

const ui = {
  selectGame: mustEl("#selectGame"),
  btnStartGame: mustEl("#btnStartGame"),
  btnStopGame: mustEl("#btnStopGame"),
  gameRoot: mustEl("#gameRoot"),

  selectProvider: mustEl("#selectProvider"),
  providerControls: mustEl("#providerControls"),

  detectedEmotion: mustEl("#detectedEmotion"),
  detectedConfidence: mustEl("#detectedConfidence"),

  camera: mustEl("#camera"),
  btnStartCamera: mustEl("#btnStartCamera"),
  btnStopCamera: mustEl("#btnStopCamera"),
};

const logger = createSessionLogger();
const BUILD = "2026-01-09.1";

/** @type {ReturnType<createManualProvider> | ReturnType<createMockProvider> | ReturnType<createPythonProvider> | ReturnType<createViharProvider>} */
let provider = createManualProvider();
const providers = [
  createManualProvider(),
  createMockProvider(),
  createPythonProvider(() => /** @type {HTMLVideoElement} */ (ui.camera)),
  createViharProvider(),
];

/** @type {ReturnType<createIdentifyGame> | ReturnType<createMirrorGame> | ReturnType<createCalmGame>} */
let game = createIdentifyGame();
const games = [createIdentifyGame(), createMirrorGame(), createCalmGame()];

let uiTick = /** @type {number|null} */ (null);
let cameraStream = /** @type {MediaStream|null} */ (null);

boot();

function boot() {
  logger.log("session_start", { userAgent: navigator.userAgent });
  console.log(`[mini-games] build ${BUILD}`);
  mountAdminTools();

  // Populate providers
  for (const p of providers) {
    ui.selectProvider.appendChild(el("option", { value: p.id, text: p.name }));
  }
  // Helpful default: if python provider exists, select it when user has started the python server.
  // (User can always switch back.)
  ui.selectProvider.value = provider.id;
  ui.selectProvider.addEventListener("change", async () => {
    await setProvider(ui.selectProvider.value);
  });

  // Populate games
  for (const g of games) {
    ui.selectGame.appendChild(el("option", { value: g.id, text: g.name }));
  }
  ui.selectGame.value = game.id;
  ui.selectGame.addEventListener("change", () => setGame(ui.selectGame.value));

  ui.btnStartGame.addEventListener("click", () => startGame());
  ui.btnStopGame.addEventListener("click", () => stopGame());

  ui.btnStartCamera.addEventListener("click", () => startCamera());
  ui.btnStopCamera.addEventListener("click", () => stopCamera());

  // Initial mounts
  provider.mountControls(ui.providerControls);
  mountGame(game.id);

  startUiTick();
}

function mountAdminTools() {
  const root = document.querySelector(".header__controls");
  if (!root) return;

  const btnDownload = el("button", { class: "btn btn--ghost", type: "button" }, "Download last session");
  btnDownload.addEventListener("click", () => {
    const sessions = loadSessions();
    if (!sessions.length) {
      alert("No saved sessions found yet. Run Kids Mode and click 'Save report' or exit to auto-save.");
      return;
    }
    const s = sessions[0];
    downloadJson(s, `session_${s.sessionId || "latest"}.json`);
  });

  const btnClear = el("button", { class: "btn btn--ghost", type: "button" }, "Clear saved sessions");
  btnClear.addEventListener("click", () => {
    if (!confirm("Clear saved sessions from this browser?")) return;
    clearSessions();
    alert("Cleared.");
  });

  // Insert after Kids Mode link (if present)
  root.prepend(btnClear);
  root.prepend(btnDownload);
}

async function setProvider(providerId) {
  await provider.stop();
  const next = providers.find((p) => p.id === providerId) ?? providers[0];
  provider = next;
  clear(ui.providerControls);
  provider.mountControls(ui.providerControls);
  logger.log("provider_change", { providerId: provider.id });
  await provider.start();
}

function setGame(gameId) {
  stopGame();
  mountGame(gameId);
  logger.log("game_select", { gameId });
}

function mountGame(gameId) {
  const next = games.find((g) => g.id === gameId) ?? games[0];
  game = next;
  clear(ui.gameRoot);

  const ctx = {
    getEmotion: () => provider.getReading(),
    log: (type, payload) => logger.log(type, payload),
  };

  game.mount(ui.gameRoot, ctx);
  game.start(); // start immediately on selection for responsiveness
  ui.btnStopGame.disabled = false;
}

function startGame() {
  game?.start?.();
  ui.btnStopGame.disabled = false;
  logger.log("ui_start_game", { gameId: game.id });
}

function stopGame() {
  game?.stop?.();
  ui.btnStopGame.disabled = true;
  logger.log("ui_stop_game", { gameId: game.id });
}

function startUiTick() {
  if (uiTick != null) return;
  uiTick = window.setInterval(() => {
    const r = provider.getReading();
    ui.detectedEmotion.textContent = r.label ? prettyEmotion(r.label) : "—";
    ui.detectedConfidence.textContent = r.confidence == null ? "—" : r.confidence.toFixed(2);
  }, 120);
}

async function startCamera() {
  if (cameraStream) return;
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    ui.camera.srcObject = cameraStream;
    ui.btnStartCamera.disabled = true;
    ui.btnStopCamera.disabled = false;
    logger.log("camera_start", {});
  } catch (e) {
    console.error(e);
    alert("Could not start camera. Please allow camera permission in the browser.");
    logger.log("camera_error", { message: String(e?.message ?? e) });
  }
}

async function stopCamera() {
  if (!cameraStream) return;
  for (const t of cameraStream.getTracks()) t.stop();
  cameraStream = null;
  ui.camera.srcObject = null;
  ui.btnStartCamera.disabled = false;
  ui.btnStopCamera.disabled = true;
  logger.log("camera_stop", {});
}

function mustEl(sel) {
  const n = document.querySelector(sel);
  if (!n) throw new Error(`Missing element: ${sel}`);
  return /** @type {HTMLElement} */ (n);
}
