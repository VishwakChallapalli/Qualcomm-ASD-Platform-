#!/usr/bin/env python3
"""
Emotion Monitoring Server
Uses OpenCV (face detection) + DeepFace (emotion recognition).
Runs at: http://127.0.0.1:5050
"""

from flask import Flask, jsonify
from flask_cors import CORS
import threading
import time

# ── Vision deps ───────────────────────────────────────────────────────────────
try:
    import cv2
    import numpy as np
    from deepface import DeepFace
    FULL_MODEL = True
    print("✓ OpenCV + DeepFace loaded")
except ImportError as e:
    FULL_MODEL = False
    print(f"⚠ Lite mode (missing deps): {e}")

app = Flask(__name__)
CORS(app)

# ── Shared state ──────────────────────────────────────────────────────────────
state = {
    "running":            False,
    "emotion":            "neutral",
    "emotion_confidence": 0.0,
    "face_detected":      False,
    "session_start":      None,
    "last_updated":       None,
    "emotion_history":    [],
    "error":              None,
}
state_lock = threading.Lock()

# ── Tracker ───────────────────────────────────────────────────────────────────
class TrackerThread(threading.Thread):
    def __init__(self):
        super().__init__(daemon=True)
        self.stop_event          = threading.Event()
        self.current_emotion     = "neutral"
        self.last_emotion_time   = 0
        self.emotion_interval    = 1.0   # seconds between DeepFace calls
        self.emotion_running     = False

    # ── Async DeepFace call so camera loop stays at ~20 fps ──────────────────
    def _run_deepface(self, face_crop):
        try:
            results = DeepFace.analyze(
                face_crop,
                actions=["emotion"],
                enforce_detection=False,
                silent=True
            )
            if results:
                dom  = results[0]["dominant_emotion"]
                conf = float(results[0]["emotion"].get(dom, 0.0))  # cast numpy float32 → Python float
                self.current_emotion = dom
                with state_lock:
                    state["emotion"]            = dom
                    state["emotion_confidence"] = round(conf, 2)
                    entry = {"time": time.strftime("%H:%M:%S"), "emotion": dom}
                    state["emotion_history"].append(entry)
                    if len(state["emotion_history"]) > 20:
                        state["emotion_history"].pop(0)
        except Exception:
            pass
        finally:
            self.emotion_running = False

    def _trigger_emotion(self, frame, x, y, w, h):
        if self.emotion_running:
            return
        if time.time() - self.last_emotion_time < self.emotion_interval:
            return
        self.last_emotion_time = time.time()

        pad = int(h * 0.15)
        y1  = max(0, y - pad);  y2 = min(frame.shape[0], y + h + pad)
        x1  = max(0, x - pad);  x2 = min(frame.shape[1], x + w + pad)
        crop = frame[y1:y2, x1:x2].copy()
        if crop.size == 0:
            return

        self.emotion_running = True
        t = threading.Thread(target=self._run_deepface, args=(crop,), daemon=True)
        t.start()

    # ── Lite simulation ───────────────────────────────────────────────────────
    def _run_lite(self):
        emotions = ["neutral", "happy", "surprised", "sad", "neutral", "happy"]
        idx = 0
        with state_lock:
            state["running"]       = True
            state["session_start"] = time.strftime("%H:%M:%S")
            state["error"]         = "lite_mode"
        while not self.stop_event.is_set():
            with state_lock:
                state["emotion"]      = emotions[idx % len(emotions)]
                state["face_detected"] = True
                state["last_updated"] = time.strftime("%H:%M:%S")
            idx += 1
            time.sleep(3)

    # ── Main loop ─────────────────────────────────────────────────────────────
    def run(self):
        if not FULL_MODEL:
            self._run_lite()
            return

        # Load Haar cascade for face detection (ships with OpenCV — no download)
        cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        face_detector = cv2.CascadeClassifier(cascade_path)
        if face_detector.empty():
            with state_lock:
                state["error"] = "cascade_load_failed"
            return

        cap = cv2.VideoCapture(0)
        if not cap.isOpened():
            with state_lock:
                state["error"] = "camera_unavailable"
            return

        cap.set(cv2.CAP_PROP_FRAME_WIDTH,  640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

        with state_lock:
            state["running"]       = True
            state["session_start"] = time.strftime("%H:%M:%S")
            state["error"]         = None

        try:
            while not self.stop_event.is_set():
                ret, frame = cap.read()
                if not ret:
                    time.sleep(0.05)
                    continue

                gray  = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                faces = face_detector.detectMultiScale(gray, 1.1, 5, minSize=(80, 80))

                face_detected = len(faces) > 0

                if face_detected:
                    # Use the largest face
                    x, y, w, h = max(faces, key=lambda r: r[2] * r[3])
                    self._trigger_emotion(frame, x, y, w, h)
                else:
                    self.current_emotion = "neutral"

                with state_lock:
                    state["face_detected"] = face_detected
                    state["last_updated"]  = time.strftime("%H:%M:%S")
                    if not face_detected:
                        state["emotion"] = "neutral"

                time.sleep(0.05)   # ~20 fps
        finally:
            cap.release()
            with state_lock:
                state["running"] = False

    def stop(self):
        self.stop_event.set()


_tracker: None = None

# ── REST API ──────────────────────────────────────────────────────────────────

@app.route("/status")
def status():
    with state_lock:
        return jsonify({
            "ok":      True,
            "running": state["running"],
            "mode":    "full" if FULL_MODEL else "lite",
        })


@app.route("/emotion")
def get_emotion():
    with state_lock:
        return jsonify({
            "emotion":            state["emotion"],
            "emotion_confidence": state["emotion_confidence"],
            "face_detected":      state["face_detected"],
            "eyes_open":          state["face_detected"],   # proxy
            "looking_at_screen":  state["face_detected"],   # proxy
            "blink_count":        0,
            "session_start":      state["session_start"],
            "last_updated":       state["last_updated"],
            "emotion_history":    state["emotion_history"][-10:],
            "error":              state["error"],
        })


@app.route("/start", methods=["POST"])
def start_tracker():
    global _tracker
    with state_lock:
        if state["running"]:
            return jsonify({"ok": True, "message": "already running"})
    _tracker = TrackerThread()
    _tracker.start()
    time.sleep(0.3)
    return jsonify({"ok": True, "message": "tracker started"})


@app.route("/stop", methods=["POST"])
def stop_tracker():
    global _tracker
    if _tracker:
        _tracker.stop()
        _tracker = None
    with state_lock:
        state["running"] = False
    return jsonify({"ok": True, "message": "tracker stopped"})


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 55)
    print("  Emotion Monitoring Server  —  http://127.0.0.1:5050")
    print("=" * 55)

    _tracker = TrackerThread()
    _tracker.start()

    app.run(host="127.0.0.1", port=5050, debug=False, use_reloader=False)
