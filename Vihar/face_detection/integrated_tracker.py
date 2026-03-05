#!/usr/bin/env python3
"""
Integrated Tracker v2 - ASD Learning Tool
Uses MediaPipe (gaze/blink) + DeepFace (emotion) + Session CSV Logging
Press 'C' to calibrate | Press 'Q' to quit and save session report
"""

import cv2
import time
import numpy as np
import mediapipe as mp
from datetime import datetime
import os
import shutil
import threading
import csv
import onnxruntime as ort
from scipy.special import softmax
import pickle

SCREENSHOT_DIR  = "screenshots"
SESSION_LOG_DIR = "session_logs"

# FER+ ONNX emotion labels (Microsoft model order)
FERPLUS_LABELS = [
    "neutral", "happiness", "surprise", "sadness",
    "anger", "disgust", "fear", "contempt"
]

MODEL_PATH = os.path.join(os.path.dirname(__file__), "emotion_ferplus.onnx")


class EmotionEyeTracker:
    def __init__(self):
        # ── Clean up old screenshots and session logs on every restart ───────
        for folder in [SCREENSHOT_DIR, SESSION_LOG_DIR]:
            if os.path.exists(folder):
                shutil.rmtree(folder)
            os.makedirs(folder)
        print("Cleared old screenshots and session logs.")

        self.mp_face_mesh = mp.solutions.face_mesh
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )

        # FER+ ONNX model (Microsoft, trained on FER+ — much more accurate)
        print("Loading FER+ emotion model (ONNX)...")
        self.ort_session    = ort.InferenceSession(MODEL_PATH)
        self.ort_input_name = self.ort_session.get_inputs()[0].name
        print("FER+ model loaded OK.")

        # Personal model (trained via train_personal_model.py)
        personal_path = os.path.join(os.path.dirname(__file__), "personal_emotion_model.pkl")
        self._personal_path  = personal_path
        self._personal_mtime = 0.0
        self.personal_clf    = None
        self._load_personal_model()
        self._start_personal_model_watcher()

        # Session logging
        self.session_start = datetime.now()
        session_name = self.session_start.strftime("session_%Y%m%d_%H%M%S.csv")
        self.session_file = os.path.join(SESSION_LOG_DIR, session_name)
        self.session_log = []


        # Blink state
        self.blink_counter = 0
        self.last_blink_time = 0

        # Screenshot state
        self.last_screenshot_time = 0
        self.screenshot_interval = 3.0

        # Calibration
        self.calibrated = False
        self.calib_pitch = 0.0
        self.calib_yaw = 0.0
        self.calib_ratio_l = 0.5
        self.calib_ratio_r = 0.5
        self.do_calibrate = False

        # Emotion state
        self.current_emotion = "neutral"
        self.emotion_confidence = 0.0
        self.last_emotion_time = 0
        self.emotion_interval = 0.5
        self.emotion_thread_running = False

        # Temporal smoothing — rolling window of raw probability dicts
        self.emotion_history   = []   # list of {emotion: prob} dicts
        self.HISTORY_LEN       = 7    # average over last 7 predictions
        self.CONFIDENCE_THRESH = 45.0 # only accept predictions above this %

        # CLAHE for preprocessing
        self.clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))

        # Per-emotion calibration bias (saved by calibrate_emotions.py)
        bias_path = os.path.join(os.path.dirname(__file__), "emotion_bias.npy")
        self._bias_path     = bias_path
        self._bias_mtime    = 0.0
        if os.path.exists(bias_path):
            self.emotion_bias  = np.load(bias_path).astype(np.float32)
            self._bias_mtime   = os.path.getmtime(bias_path)
            print(f"Loaded calibration bias from {bias_path}")
        else:
            self.emotion_bias = np.zeros(8, dtype=np.float32)

        # Watch bias file for live reload (so calibrate_emotions.py updates
        # take effect immediately without restarting the tracker)
        self._start_bias_watcher()

        # Stats for display
        self.looking_frames  = 0
        self.total_frames    = 0
        self.session_emotions = {}

    # ── Live bias file watcher ─────────────────────────────────────────────────

    def _start_bias_watcher(self):
        """Background thread: reloads emotion_bias.npy whenever it changes.
        Run calibrate_emotions.py in a second terminal; the tracker picks
        up the new bias automatically within 1 second."""
        def watch():
            while True:
                time.sleep(1.0)
                if not os.path.exists(self._bias_path):
                    continue
                mtime = os.path.getmtime(self._bias_path)
                if mtime != self._bias_mtime:
                    try:
                        new_bias = np.load(self._bias_path).astype(np.float32)
                        self.emotion_bias  = new_bias
                        self._bias_mtime   = mtime
                        print("[Bias] Reloaded emotion_bias.npy — calibration updated.")
                    except Exception:
                        pass
        threading.Thread(target=watch, daemon=True).start()

    def _load_personal_model(self):
        if not os.path.exists(self._personal_path):
            return
        try:
            with open(self._personal_path, "rb") as f:
                data = pickle.load(f)
            self.personal_clf    = data["pipeline"]
            self._personal_mtime = os.path.getmtime(self._personal_path)
            print(f"[Personal] Loaded personal model — using fine-tuned classifier.")
        except Exception as e:
            print(f"[Personal] Could not load personal model: {e}")

    def _start_personal_model_watcher(self):
        """Reloads personal_emotion_model.pkl automatically if retrained."""
        def watch():
            while True:
                time.sleep(1.5)
                if not os.path.exists(self._personal_path):
                    continue
                mtime = os.path.getmtime(self._personal_path)
                if mtime != self._personal_mtime:
                    self._load_personal_model()
        threading.Thread(target=watch, daemon=True).start()


    # ── Eye Aspect Ratio ────────────────────────────────────────────────────

    def calculate_ear(self, eye_lms, fw, fh):
        def pt(i):
            return np.array([eye_lms[i].x * fw, eye_lms[i].y * fh])
        v1 = np.linalg.norm(pt(1) - pt(5))
        v2 = np.linalg.norm(pt(2) - pt(4))
        h  = np.linalg.norm(pt(0) - pt(3))
        return (v1 + v2) / (2.0 * h) if h else 0

    # ── Iris Position ───────────────────────────────────────────────────────

    def get_iris_ratio(self, eye_lms, iris_lm, fw, fh):
        p_in  = np.array([eye_lms[0].x * fw, eye_lms[0].y * fh])
        p_out = np.array([eye_lms[3].x * fw, eye_lms[3].y * fh])
        p_iris = np.array([iris_lm.x * fw,   iris_lm.y * fh])
        v_eye  = p_out - p_in
        denom  = np.dot(v_eye, v_eye)
        if denom == 0:
            return 0.5
        return np.dot(p_iris - p_in, v_eye) / denom

    # ── Head Pose ───────────────────────────────────────────────────────────

    def calculate_head_pose(self, lms, fw, fh):
        model_pts = np.array([
            (0.0, 0.0, 0.0),
            (0.0, -330.0, -65.0),
            (-225.0, 170.0, -135.0),
            (225.0, 170.0, -135.0),
            (-150.0, -150.0, -125.0),
            (150.0, -150.0, -125.0)
        ])
        img_pts = np.array([
            (lms.landmark[1].x * fw,   lms.landmark[1].y * fh),
            (lms.landmark[152].x * fw, lms.landmark[152].y * fh),
            (lms.landmark[33].x * fw,  lms.landmark[33].y * fh),
            (lms.landmark[263].x * fw, lms.landmark[263].y * fh),
            (lms.landmark[61].x * fw,  lms.landmark[61].y * fh),
            (lms.landmark[291].x * fw, lms.landmark[291].y * fh),
        ], dtype="double")
        cam_mat = np.array([[fw, 0, fw/2], [0, fw, fh/2], [0, 0, 1]], dtype="double")
        dist    = np.zeros((4, 1))
        ok, rvec, _ = cv2.solvePnP(model_pts, img_pts, cam_mat, dist, flags=cv2.SOLVEPNP_ITERATIVE)
        if not ok:
            return 0, 0, 0
        rmat, _ = cv2.Rodrigues(rvec)
        angles, *_ = cv2.RQDecomp3x3(rmat)
        return angles[0], angles[1], angles[2]

    # ── Face crop with alignment ─────────────────────────────────────────────

    def get_aligned_face_crop(self, frame, face_landmarks, fw, fh):
        """
        Uses MediaPipe eye-corner landmarks to align and crop the face.
        Rotating the face upright before emotion analysis improves accuracy.
        """
        # Eye corner landmarks: left eye outer=33, right eye outer=263
        lc = face_landmarks.landmark[33]
        rc = face_landmarks.landmark[263]
        lx, ly = int(lc.x * fw), int(lc.y * fh)
        rx, ry = int(rc.x * fw), int(rc.y * fh)

        # Compute rotation angle to level eyes
        dy = ry - ly
        dx = rx - lx
        angle = np.degrees(np.arctan2(dy, dx))

        # Centre of face from bounding landmarks
        xs = [int(lm.x * fw) for lm in face_landmarks.landmark]
        ys = [int(lm.y * fh) for lm in face_landmarks.landmark]
        cx = (min(xs) + max(xs)) // 2
        cy = (min(ys) + max(ys)) // 2

        # Rotate frame around face centre
        M    = cv2.getRotationMatrix2D((cx, cy), angle, 1.0)
        rot  = cv2.warpAffine(frame, M, (fw, fh))

        # Generous crop around the aligned face
        fw_face = max(xs) - min(xs)
        fh_face = max(ys) - min(ys)
        pad_w   = int(fw_face * 0.25)
        pad_h   = int(fh_face * 0.30)
        x1 = max(0, min(xs) - pad_w)
        y1 = max(0, min(ys) - pad_h)
        x2 = min(fw, max(xs) + pad_w)
        y2 = min(fh, max(ys) + pad_h)

        crop = rot[y1:y2, x1:x2]
        return crop

    # ── Geometric sadness detector (landmark-based) ──────────────────────────

    def compute_geometric_sad_score(self, face_landmarks, fw, fh):
        """
        Computes a 0-100 sadness likelihood from face geometry.
        Cues: lip corner droop + inner brow raise.
        Uses forehead (10) → chin (152) for a reliable face height.
        """
        lm = face_landmarks.landmark
        def y(idx): return lm[idx].y * fh

        # Reliable face height: forehead top (10) to chin (152)
        face_h = abs(y(152) - y(10)) + 1e-6

        # ── Lip corner droop ──────────────────────────────────────────────
        # Lip vertical midpoint (upper=13, lower=14)
        lip_mid_y     = (y(13) + y(14)) / 2.0
        corner_avg_y  = (y(61) + y(291)) / 2.0
        # Positive = corners below midpoint = frown
        droop_norm    = (corner_avg_y - lip_mid_y) / face_h
        droop_score   = float(np.clip(droop_norm * 1200, 0, 60))  # 0-60

        # ── Inner brow raise ──────────────────────────────────────────────
        inner_brow_y  = (y(107) + y(336)) / 2.0
        outer_brow_y  = (y(46)  + y(276)) / 2.0
        # Positive = inner brow above outer = raised inner brow = sad
        brow_norm     = (outer_brow_y - inner_brow_y) / face_h
        brow_score    = float(np.clip(brow_norm * 900, 0, 40))   # 0-40

        return droop_score + brow_score  # 0-100

    # ── CLAHE face preprocessing ─────────────────────────────────────────────

    def preprocess_face(self, crop):
        """
        Apply CLAHE adaptive histogram equalisation per channel.
        Improves emotion detection under varied lighting conditions.
        """
        if crop is None or crop.size == 0:
            return crop
        lab = cv2.cvtColor(crop, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        l_eq = self.clahe.apply(l)
        lab_eq = cv2.merge([l_eq, a, b])
        return cv2.cvtColor(lab_eq, cv2.COLOR_LAB2BGR)

    # ── Temporal smoothing ───────────────────────────────────────────────────

    def smooth_and_update_emotion(self, raw_scores: dict, geo_sad_score: float = 0.0):
        """
        Add the latest prediction to a rolling window and return the
        average dominant emotion. Blends geometric sadness signal in.
        """
        if not raw_scores:
            return

        # Blend geometric sadness: if geometry strongly suggests sad,
        # boost the sad score proportionally before gating
        if geo_sad_score > 20:
            boost = geo_sad_score * 0.5   # up to +50% additive boost
            raw_scores = dict(raw_scores)
            raw_scores["sadness"] = min(100.0, raw_scores.get("sadness", 0) + boost)
            # Re-normalise slightly
            total = sum(raw_scores.values())
            raw_scores = {k: v / total * 100 for k, v in raw_scores.items()}

        dom_emotion = max(raw_scores, key=raw_scores.get)
        dom_score   = raw_scores[dom_emotion]

        # Sadness gets a lower confidence gate since it's subtler
        threshold = 28.0 if dom_emotion == "sadness" else self.CONFIDENCE_THRESH
        if dom_score < threshold:
            return

        self.emotion_history.append(raw_scores)
        if len(self.emotion_history) > self.HISTORY_LEN:
            self.emotion_history.pop(0)

        # Average probabilities across history window
        all_keys = set(k for d in self.emotion_history for k in d)
        avg = {k: np.mean([d.get(k, 0) for d in self.emotion_history])
               for k in all_keys}

        best_emo  = max(avg, key=avg.get)
        best_conf = avg[best_emo]

        self.current_emotion    = best_emo
        self.emotion_confidence = best_conf
        emo = best_emo
        self.session_emotions[emo] = self.session_emotions.get(emo, 0) + 1

    # ── FER+ ONNX emotion inference (async) ─────────────────────────────────

    def run_ferplus(self, crop_bgr):
        """
        1. Runs the FER+ ONNX model to get raw 8-dim logit features.
        2a. If a personal model is loaded (trained via train_personal_model.py),
            uses its LogisticRegression predict_proba for the final label.
        2b. Otherwise falls back to calibration bias + softmax.
        Returns: dict of {emotion_label: probability_percent}
        """
        gray = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2GRAY)
        gray = cv2.resize(gray, (64, 64))
        inp  = gray.astype(np.float32)[np.newaxis, np.newaxis, :, :]
        raw  = self.ort_session.run(None, {self.ort_input_name: inp})[0][0]  # (8,)

        if self.personal_clf is not None:
            # Personal model: LogisticRegression on top of raw logits
            proba  = self.personal_clf.predict_proba([raw])[0]   # (n_classes,)
            labels = self.personal_clf.classes_                   # class names
            scores = {label: float(p * 100) for label, p in zip(labels, proba)}
            # Fill any missing labels with 0
            return {lbl: scores.get(lbl, 0.0) for lbl in FERPLUS_LABELS}
        else:
            # Fallback: calibration bias + softmax over FER+ logits
            probs = softmax(raw + self.emotion_bias) * 100.0
            return {FERPLUS_LABELS[i]: float(probs[i]) for i in range(len(FERPLUS_LABELS))}


    def update_emotion_async(self, frame, face_landmarks, fw, fh, geo_sad_score=0.0):
        if self.emotion_thread_running:
            return
        if time.time() - self.last_emotion_time < self.emotion_interval:
            return

        def task():
            self.emotion_thread_running = True
            try:
                crop = self.get_aligned_face_crop(frame, face_landmarks, fw, fh)
                if crop is None or crop.size == 0:
                    return

                # CLAHE preprocessing
                crop = self.preprocess_face(crop)

                # FER+ ONNX inference + geometry blend
                raw_scores = self.run_ferplus(crop)
                self.smooth_and_update_emotion(raw_scores, geo_sad_score)
                self.last_emotion_time = time.time()
            except Exception:
                pass
            finally:
                self.emotion_thread_running = False

        threading.Thread(target=task, daemon=True).start()





    # ── Session Logging ──────────────────────────────────────────────────────

    def log_frame(self, timestamp, looking, emotion, blinks, pitch, yaw):
        self.session_log.append({
            "timestamp": timestamp,
            "looking": looking,
            "emotion": emotion,
            "blinks": blinks,
            "pitch": round(pitch, 1),
            "yaw": round(yaw, 1),
        })

    def save_session_csv(self):
        if not self.session_log:
            return
        with open(self.session_file, "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=self.session_log[0].keys())
            writer.writeheader()
            writer.writerows(self.session_log)
        print(f"\nSession saved to: {self.session_file}")

    # ── Screenshot ────────────────────────────────────────────────────────────

    def save_screenshot(self, frame):
        if time.time() - self.last_screenshot_time >= self.screenshot_interval:
            ts = datetime.now().strftime("%Y%m%d_%H%M%S")
            cv2.imwrite(f"{SCREENSHOT_DIR}/capture_{ts}.jpg", frame)
            self.last_screenshot_time = time.time()

    # ── Drawing ──────────────────────────────────────────────────────────────

    def draw_ui(self, frame, face_detected, eyes_open, looking, pitch, yaw):
        h, w = frame.shape[:2]

        # Top bar background
        cv2.rectangle(frame, (0, 0), (w, 110), (15, 15, 15), -1)

        # Face status
        face_col = (0, 220, 100) if face_detected else (80, 80, 80)
        cv2.putText(frame, f"FACE: {'DETECTED' if face_detected else 'NONE'}", (10, 28),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.65, face_col, 2)

        # Eyes
        eye_col = (0, 220, 100) if eyes_open else (50, 50, 200)
        cv2.putText(frame, f"EYES: {'OPEN' if eyes_open else 'CLOSED'}", (200, 28),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.65, eye_col, 2)

        # Blinks
        cv2.putText(frame, f"BLINKS: {self.blink_counter}", (380, 28),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.65, (200, 200, 200), 2)

        # Attention (Looking)
        attn_col = (0, 255, 80) if looking else (0, 60, 255)
        attn_txt = "LOOKING AT SCREEN" if looking else "NOT LOOKING"
        cv2.putText(frame, attn_txt, (10, 68),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.95, attn_col, 2)

        # Emotion
        emo_colors = {
            "happy": (0, 220, 0), "sad": (200, 80, 80),
            "angry": (0, 0, 230), "surprise": (0, 200, 220),
            "fear": (150, 0, 200), "disgust": (100, 150, 0),
            "neutral": (200, 200, 200),
        }
        emo_col = emo_colors.get(self.current_emotion, (200, 200, 200))
        conf_str = f"{self.emotion_confidence:.0f}%" if self.emotion_confidence else ""
        cv2.putText(frame, f"EMOTION: {self.current_emotion.upper()} {conf_str}", (10, 100),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, emo_col, 2)

        # Engagement % (looking frames / total)
        if self.total_frames > 0:
            pct = int(100 * self.looking_frames / self.total_frames)
            cv2.putText(frame, f"Engagement: {pct}%", (w - 200, 28),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (160, 220, 255), 2)

        # Calibration hint / status
        if not self.calibrated:
            cv2.rectangle(frame, (0, h - 40), (w, h), (0, 80, 120), -1)
            cv2.putText(frame, "Look at screen & press 'C' to calibrate",
                        (10, h - 14), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
        else:
            cv2.putText(frame, "CALIBRATED", (w - 150, h - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 255, 120), 2)

        # Debug pitch/yaw
        cv2.putText(frame, f"P:{int(pitch)}  Y:{int(yaw)}", (10, h - 14),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (120, 120, 120), 1)

    def draw_landmarks(self, frame, lms, w, h, looking, lic, ric):
        color = (0, 255, 80) if looking else (0, 60, 255)
        xs = [int(l.x * w) for l in lms.landmark]
        ys = [int(l.y * h) for l in lms.landmark]
        cv2.rectangle(frame, (min(xs), min(ys)), (max(xs), max(ys)), color, 2)
        cv2.circle(frame, (int(lic.x * w), int(lic.y * h)), 5, (255, 230, 0), -1)
        cv2.circle(frame, (int(ric.x * w), int(ric.y * h)), 5, (255, 230, 0), -1)

    # ── Main Frame Processing ────────────────────────────────────────────────

    def process_frame(self, frame):
        frame = cv2.flip(frame, 1)
        rgb   = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        res   = self.face_mesh.process(rgb)
        h, w  = frame.shape[:2]

        face_detected = False
        eyes_open     = False
        looking       = False
        pitch = yaw   = 0.0

        self.total_frames += 1

        if res.multi_face_landmarks:
            face_detected = True
            lms = res.multi_face_landmarks[0]

            # Eye landmark indices
            L_IDX = [33, 160, 158, 133, 153, 144]
            R_IDX = [362, 385, 387, 263, 373, 380]
            l_lms = [lms.landmark[i] for i in L_IDX]
            r_lms = [lms.landmark[i] for i in R_IDX]

            l_iris = lms.landmark[468]
            r_iris = lms.landmark[473]

            # EAR / blink
            avg_ear = (self.calculate_ear(l_lms, w, h) + self.calculate_ear(r_lms, w, h)) / 2
            eyes_open = avg_ear > 0.2
            if not eyes_open and time.time() - self.last_blink_time > 0.3:
                self.blink_counter += 1
                self.last_blink_time = time.time()

            # Head pose
            pitch, yaw, _ = self.calculate_head_pose(lms, w, h)

            # Iris ratios
            l_ratio = self.get_iris_ratio(l_lms, l_iris, w, h)
            r_ratio = self.get_iris_ratio(r_lms, r_iris, w, h)

            # Calibrate if triggered
            if self.do_calibrate:
                self.calib_pitch   = pitch
                self.calib_yaw     = yaw
                self.calib_ratio_l = l_ratio
                self.calib_ratio_r = r_ratio
                self.calibrated    = True
                self.do_calibrate  = False
                print(f"Calibrated! P:{pitch:.1f} Y:{yaw:.1f}")

            t_p = self.calib_pitch   if self.calibrated else 0
            t_y = self.calib_yaw     if self.calibrated else 0
            t_l = self.calib_ratio_l if self.calibrated else 0.5
            t_r = self.calib_ratio_r if self.calibrated else 0.5

            dp = abs(pitch - t_p)
            dy = abs(yaw   - t_y)
            dl = abs(l_ratio - t_l)
            dr = abs(r_ratio - t_r)

            is_head_ok  = dp < 35 and dy < 45
            is_iris_ok  = dl < 0.4 and dr < 0.4
            looking = is_head_ok and is_iris_ok and eyes_open

            if looking:
                self.looking_frames += 1

            self.draw_landmarks(frame, lms, w, h, looking, l_iris, r_iris)

            # Compute geometry-based sadness cue in main thread (fast, no model needed)
            geo_sad_score = self.compute_geometric_sad_score(lms, w, h)
            self.update_emotion_async(frame.copy(), lms, w, h, geo_sad_score)

        else:
            self.current_emotion    = "neutral"
            self.emotion_confidence = 0

        # Log this frame
        ts = datetime.now().strftime("%H:%M:%S.%f")[:-3]
        self.log_frame(ts, looking, self.current_emotion, self.blink_counter, pitch, yaw)

        self.draw_ui(frame, face_detected, eyes_open, looking, pitch, yaw)
        self.save_screenshot(frame)
        return frame

    # ── Run Loop ─────────────────────────────────────────────────────────────

    def run(self):
        cap = cv2.VideoCapture(0)
        if not cap.isOpened():
            print("Error: Camera not found.")
            return

        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

        print("ASD Learning Tool — Face & Emotion Tracker v2")
        print("Press 'C' to calibrate | Press 'Q' to quit & save session")

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            frame = self.process_frame(frame)
            cv2.imshow("ASD Learning Tool — Face & Emotion Tracker v2", frame)

            key = cv2.waitKey(1) & 0xFF
            if key == ord('q'):
                break
            elif key == ord('c'):
                self.do_calibrate = True

        cap.release()
        cv2.destroyAllWindows()
        self.face_mesh.close()

        # Save session
        self.save_session_csv()
        duration = (datetime.now() - self.session_start).seconds
        print(f"\nSession Duration : {duration}s")
        print(f"Total Blinks     : {self.blink_counter}")
        if self.total_frames > 0:
            pct = int(100 * self.looking_frames / self.total_frames)
            print(f"Engagement       : {pct}%")
        if self.session_emotions:
            dominant = max(self.session_emotions, key=self.session_emotions.get)
            print(f"Dominant Emotion : {dominant}")


def main():
    tracker = EmotionEyeTracker()
    tracker.run()


if __name__ == "__main__":
    main()
