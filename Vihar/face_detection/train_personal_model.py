#!/usr/bin/env python3
"""
Personal Emotion Trainer — ASD Toolkit
========================================
Trains a tiny LogisticRegression classifier on YOUR face using FER+ logits
as features. This is "linear probing" / transfer learning — no GPU needed,
takes ~2 minutes to collect data and <5 seconds to train.

The result (personal_emotion_model.pkl) is loaded automatically by
integrated_tracker.py on the next run.

How it works:
  1. FER+ ONNX model runs on your face → produces 8 raw logit values
  2. You label what expression you're making with a keypress
  3. We collect ~15-20 samples per emotion
  4. A LogisticRegression is trained on those (logits → label) pairs
  5. Saved to disk → tracker uses it instead of raw softmax

Usage:
    python3 train_personal_model.py

Controls (while camera is open):
    N  → neutral
    H  → happiness
    S  → sadness
    U  → surprise
    A  → anger
    F  → fear
    D  → disgust
    C  → contempt
    T  → Train & save (do this when you've collected enough samples)
    Q  → Quit without saving
"""

import cv2
import numpy as np
import os
import pickle
import mediapipe as mp
import onnxruntime as ort
from datetime import datetime

# ── sklearn ─────────────────────────────────────────────────────────────────
try:
    from sklearn.linear_model import LogisticRegression
    from sklearn.preprocessing import StandardScaler
    from sklearn.pipeline import Pipeline
except ImportError:
    import subprocess, sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "scikit-learn", "-q"])
    from sklearn.linear_model import LogisticRegression
    from sklearn.preprocessing import StandardScaler
    from sklearn.pipeline import Pipeline

MODEL_PATH    = os.path.join(os.path.dirname(__file__), "emotion_ferplus.onnx")
SAVE_PATH     = os.path.join(os.path.dirname(__file__), "personal_emotion_model.pkl")

FERPLUS_LABELS = [
    "neutral", "happiness", "surprise", "sadness",
    "anger",   "disgust",   "fear",     "contempt"
]

KEY_MAP = {
    ord('n'): "neutral",
    ord('h'): "happiness",
    ord('s'): "sadness",
    ord('u'): "surprise",
    ord('a'): "anger",
    ord('f'): "fear",
    ord('d'): "disgust",
    ord('c'): "contempt",
}

EMOTION_COLORS = {
    "neutral":   (180, 180, 180),
    "happiness": (0, 220, 100),
    "sadness":   (200, 80, 80),
    "surprise":  (80, 200, 255),
    "anger":     (0, 50, 220),
    "fear":      (180, 0, 180),
    "disgust":   (0, 180, 180),
    "contempt":  (150, 150, 0),
}

MIN_SAMPLES  = 8    # minimum per class to include it in training
IDEAL_SAMPLES = 20  # display warning below this


def get_onnx_logits(sess, inp_name, crop_bgr):
    """Run FER+ on a face crop; return raw 8-dim logit vector."""
    gray = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2GRAY)
    gray = cv2.resize(gray, (64, 64))
    inp  = gray.astype(np.float32)[np.newaxis, np.newaxis, :, :]
    return sess.run(None, {inp_name: inp})[0][0]  # (8,)


def get_face_crop(frame, face_mesh, fw, fh):
    """Use MediaPipe to get a tight, padded face crop."""
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    res = face_mesh.process(rgb)
    if not res.multi_face_landmarks:
        return None
    lms = res.multi_face_landmarks[0].landmark
    xs  = [int(l.x * fw) for l in lms]
    ys  = [int(l.y * fh) for l in lms]

    # Use forehead (10) → chin (152) for height-aware padding
    face_h = abs(int(lms[152].y * fh) - int(lms[10].y * fh))
    pad = max(20, int(face_h * 0.25))
    x1 = max(0, min(xs) - pad);   x2 = min(fw, max(xs) + pad)
    y1 = max(0, min(ys) - pad);   y2 = min(fh, max(ys) + pad)
    crop = frame[y1:y2, x1:x2]
    return crop if crop.size > 0 else None


def train_and_save(X, y):
    """Train LogisticRegression pipeline and save to disk."""
    clf = Pipeline([
        ("scaler", StandardScaler()),
        ("clf",    LogisticRegression(
            max_iter=1000,
            C=1.0,
            solver="lbfgs",
            multi_class="multinomial"
        ))
    ])
    clf.fit(X, y)
    with open(SAVE_PATH, "wb") as f:
        pickle.dump({"pipeline": clf, "labels": FERPLUS_LABELS}, f)
    return clf


def draw_ui(frame, counts, current_label, recording):
    h, w = frame.shape[:2]

    # Dark semi-transparent sidebar
    overlay = frame.copy()
    cv2.rectangle(overlay, (0, 0), (220, h), (15, 15, 25), -1)
    cv2.addWeighted(overlay, 0.7, frame, 0.3, 0, frame)

    # Title
    cv2.putText(frame, "Personal Trainer", (8, 28),
                cv2.FONT_HERSHEY_DUPLEX, 0.62, (255, 255, 255), 1)
    cv2.line(frame, (8, 36), (212, 36), (60, 60, 80), 1)

    # Emotion counts
    for i, label in enumerate(["neutral","happiness","sadness","surprise","anger","fear","disgust","contempt"]):
        count = counts.get(label, 0)
        key_char = {"neutral":"N","happiness":"H","sadness":"S","surprise":"U",
                    "anger":"A","fear":"F","disgust":"D","contempt":"C"}[label]
        color = EMOTION_COLORS[label]
        bar_w = min(int(count / IDEAL_SAMPLES * 100), 100)
        y_pos = 60 + i * 42
        # Bar background
        cv2.rectangle(frame, (8, y_pos - 2), (112, y_pos + 16), (40, 40, 60), -1)
        # Bar fill
        cv2.rectangle(frame, (8, y_pos - 2), (8 + bar_w, y_pos + 16), color, -1)
        # Label
        status = "✓" if count >= MIN_SAMPLES else f"{count}"
        text   = f"[{key_char}] {label[:7]:<7} {status}"
        col    = (255, 255, 255) if label == current_label else (160, 160, 160)
        cv2.putText(frame, text, (10, y_pos + 13),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.42, col, 1)

    # Recording indicator
    ry = h - 75
    if recording and current_label:
        color_rec = EMOTION_COLORS.get(current_label, (255, 255, 255))
        cv2.circle(frame, (20, ry), 7, color_rec, -1)
        cv2.putText(frame, f"REC  {current_label}", (34, ry + 5),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.52, color_rec, 1)
    else:
        cv2.putText(frame, "Hold key to record", (8, ry + 5),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.44, (120, 120, 120), 1)

    # Footer
    total = sum(counts.values())
    classes_ready = sum(1 for v in counts.values() if v >= MIN_SAMPLES)
    cv2.putText(frame, f"[T] Train  ({classes_ready}+ classes ready)", (8, h - 42),
                cv2.FONT_HERSHEY_SIMPLEX, 0.40, (80, 200, 120) if classes_ready >= 2 else (120, 120, 120), 1)
    cv2.putText(frame, f"[Q] Quit  |  {total} samples total", (8, h - 22),
                cv2.FONT_HERSHEY_SIMPLEX, 0.38, (120, 120, 120), 1)


def main():
    sess      = ort.InferenceSession(MODEL_PATH)
    inp_name  = sess.get_inputs()[0].name

    mp_mesh   = mp.solutions.face_mesh
    face_mesh = mp_mesh.FaceMesh(max_num_faces=1,
                                  min_detection_confidence=0.5,
                                  min_tracking_confidence=0.5)

    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

    X, y    = [], []   # logit vectors, labels
    counts  = {}
    current_label = None
    recording     = False

    print("\n=== Personal Emotion Trainer ===")
    print("HOLD a key to record samples for that emotion:")
    for k, v in KEY_MAP.items():
        print(f"  {chr(k).upper()} → {v}")
    print("  T → Train & save when ready")
    print("  Q → Quit\n")

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        frame = cv2.flip(frame, 1)
        h, w  = frame.shape[:2]

        key = cv2.waitKey(1) & 0xFF

        if key == ord('q'):
            break
        elif key == ord('t'):
            # Train now
            if sum(v >= MIN_SAMPLES for v in counts.values()) < 2:
                print(f"Need at least 2 emotions with {MIN_SAMPLES}+ samples each. Keep recording!")
            else:
                print(f"\nTraining on {len(X)} samples across {len(set(y))} classes...")
                clf = train_and_save(np.array(X), np.array(y))
                print(f"✓ Saved to: {SAVE_PATH}  ({len(set(y))} emotions, {len(X)} samples)")
                print("  integrated_tracker.py will hot-reload it within 2 seconds.\n")
                break
        elif key in KEY_MAP:
            current_label = KEY_MAP[key]
            recording     = True
        else:
            recording = False

        # Draw UI first
        draw_ui(frame, counts, current_label, recording)

        # Collect sample if recording
        crop = get_face_crop(frame, face_mesh, w, h)
        face_found = crop is not None

        if recording and current_label and face_found:
            try:
                logits = get_onnx_logits(sess, inp_name, crop)
                X.append(logits)
                y.append(current_label)
                counts[current_label] = counts.get(current_label, 0) + 1
            except Exception:
                pass

        # Face indicator
        if face_found:
            cv2.putText(frame, "Face detected", (230, 25),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 200, 80), 1)
        else:
            cv2.putText(frame, "No face — move closer", (230, 25),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 80, 200), 1)

        cv2.imshow("Personal Trainer", frame)

    cap.release()
    face_mesh.close()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
