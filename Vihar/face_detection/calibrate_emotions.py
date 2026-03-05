#!/usr/bin/env python3
"""
Emotion Bias Calibrator — ASD Toolkit
======================================
Run this ONCE before using integrated_tracker.py.

It captures a few seconds of each expression from your webcam,
computes how much the FER+ model UNDER/OVER-estimates each emotion,
and saves a correction bias to emotion_bias.npy.

The tracker loads this automatically on next run.

Usage:
    python3 calibrate_emotions.py

You do NOT need a GPU. Takes ~3 minutes.
"""

import cv2
import numpy as np
import onnxruntime as ort
import mediapipe as mp
import os
from scipy.special import softmax

MODEL_PATH = os.path.join(os.path.dirname(__file__), "emotion_ferplus.onnx")
BIAS_PATH  = os.path.join(os.path.dirname(__file__), "emotion_bias.npy")

FERPLUS_LABELS = [
    "neutral", "happiness", "surprise", "sadness",
    "anger",   "disgust",   "fear",     "contempt"
]

# Emotions to calibrate and what index they map to in FERPLUS_LABELS
CALIBRATE = [
    ("neutral",   0, "Look normal / relax your face"),
    ("happiness", 1, "Smile naturally"),
    ("sadness",   3, "Look sad / slight frown"),
    ("surprise",  2, "Look surprised"),
    ("anger",     4, "Look annoyed / angry"),
]

CAPTURE_SECONDS = 4   # seconds of frames to collect per emotion
SKIP_FRAMES     = 3   # process every Nth frame (speed up on slow CPU)


def run_onnx(sess, inp_name, crop_bgr):
    gray = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2GRAY)
    gray = cv2.resize(gray, (64, 64))
    inp  = gray.astype(np.float32)[np.newaxis, np.newaxis, :, :]
    raw  = sess.run(None, {inp_name: inp})[0][0]
    return raw  # raw logits, shape (8,)


def get_face_crop(frame, face_mesh, fw, fh):
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    res = face_mesh.process(rgb)
    if not res.multi_face_landmarks:
        return None
    lms = res.multi_face_landmarks[0].landmark
    xs  = [int(l.x * fw) for l in lms]
    ys  = [int(l.y * fh) for l in lms]
    pad = 30
    x1, y1 = max(0, min(xs) - pad), max(0, min(ys) - pad)
    x2, y2 = min(fw, max(xs) + pad), min(fh, max(ys) + pad)
    return frame[y1:y2, x1:x2]


def main():
    sess     = ort.InferenceSession(MODEL_PATH)
    inp_name = sess.get_inputs()[0].name

    mp_mesh   = mp.solutions.face_mesh
    face_mesh = mp_mesh.FaceMesh(max_num_faces=1,
                                  min_detection_confidence=0.5,
                                  min_tracking_confidence=0.5)

    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

    # Per-emotion: list of raw logit vectors collected
    collected = {label: [] for label, _, _ in CALIBRATE}

    print("\n=== Emotion Calibration ===")
    print("For each expression, hold it and press SPACE to start collecting.")
    print("Press Q to quit early.\n")

    for label, idx, instruction in CALIBRATE:
        print(f"\n  → Expression: {label.upper()}")
        print(f"    {instruction}")
        print(f"    Press SPACE when ready...")

        # Wait for space
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            frame = cv2.flip(frame, 1)
            cv2.putText(frame, f"Expression: {label.upper()}", (20, 50),
                        cv2.FONT_HERSHEY_DUPLEX, 1.1, (0, 200, 100), 2)
            cv2.putText(frame, instruction, (20, 90),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 200), 1)
            cv2.putText(frame, "Press SPACE to start recording", (20, 130),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.55, (100, 180, 255), 1)
            cv2.imshow("Calibration", frame)
            key = cv2.waitKey(1) & 0xFF
            if key == ord(' '):
                break
            if key == ord('q'):
                cap.release()
                face_mesh.close()
                cv2.destroyAllWindows()
                return

        # Collect frames
        print(f"    Recording {CAPTURE_SECONDS}s...")
        import time
        t_start = time.time()
        frame_count = 0

        while time.time() - t_start < CAPTURE_SECONDS:
            ret, frame = cap.read()
            if not ret:
                break
            frame = cv2.flip(frame, 1)
            h, w  = frame.shape[:2]
            frame_count += 1

            remaining = CAPTURE_SECONDS - (time.time() - t_start)
            cv2.putText(frame, f"Recording: {label.upper()}", (20, 50),
                        cv2.FONT_HERSHEY_DUPLEX, 1.0, (0, 80, 255), 2)
            cv2.putText(frame, f"Hold your expression!  {remaining:.1f}s left", (20, 90),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 200), 1)
            cv2.imshow("Calibration", frame)
            cv2.waitKey(1)

            if frame_count % SKIP_FRAMES != 0:
                continue

            crop = get_face_crop(frame, face_mesh, w, h)
            if crop is not None and crop.size > 0:
                try:
                    logits = run_onnx(sess, inp_name, crop)
                    collected[label].append(logits)
                except Exception:
                    pass

        n = len(collected[label])
        print(f"    Collected {n} samples.")

    cap.release()
    face_mesh.close()
    cv2.destroyAllWindows()

    # Compute bias
    print("\n=== Computing bias ===")
    bias = np.zeros(8, dtype=np.float32)

    for label, idx, _ in CALIBRATE:
        samples = collected[label]
        if not samples:
            print(f"  {label}: no samples, skipping.")
            continue

        avg_logits = np.mean(samples, axis=0)  # shape (8,)
        avg_probs  = softmax(avg_logits)

        # We WANT this class to be dominant (ideally ~0.7 probability)
        # Current average probability for this class:
        current_p = avg_probs[idx]
        target_p  = 0.70

        # Bias = log(target_p/(1-target_p)) - log(current_p/(1-current_p)) roughly
        # Simpler: just add a logit offset to make this class rise
        if current_p > 0.01:
            bias[idx] += float(np.log(target_p / current_p))

        print(f"  {label:<12} model avg prob: {current_p*100:.1f}%  →  adding logit bias: {bias[idx]:+.2f}")

    np.save(BIAS_PATH, bias)
    print(f"\n✓ Saved calibration bias to: {BIAS_PATH}")
    print("  Restart integrated_tracker.py — the bias will be loaded automatically.\n")


if __name__ == "__main__":
    main()
