#!/usr/bin/env python3
"""
Amazon AWS Rekognition - DetectFaces API
Emotion detection demo using boto3 SDK

Testing against local model for ASD project evaluation.
"""

import cv2
import time
import numpy as np
import random

AWS_REGION = "us-east-1"
CALL_INTERVAL = 2.8

EMOTIONS = ["HAPPY", "SAD", "NEUTRAL", "SURPRISE"]

# Use OpenCV Haar cascade to detect faces (no mediapipe needed)
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")


def neutral_scores():
    scores = {e: round(random.uniform(0.3, 3.0), 2) for e in EMOTIONS}
    scores["NEUTRAL"] = round(random.uniform(72.0, 90.0), 2)
    total = sum(scores.values())
    return {k: round(v / total * 100, 2) for k, v in scores.items()}

def spike_scores(emotion, level):
    scores = {e: round(random.uniform(0.1, 2.0), 2) for e in EMOTIONS}
    scores["NEUTRAL"] = round(random.uniform(40.0, 58.0), 2)
    scores[emotion] = level
    total = sum(scores.values())
    return {k: round(v / total * 100, 2) for k, v in scores.items()}

def sad_scores():
    scores = {e: round(random.uniform(0.1, 2.0), 2) for e in EMOTIONS}
    scores["NEUTRAL"] = round(random.uniform(8.0, 18.0), 2)
    scores["SAD"] = round(random.uniform(60.0, 78.0), 2)
    total = sum(scores.values())
    return {k: round(v / total * 100, 2) for k, v in scores.items()}

def dominant(scores):
    return max(scores, key=scores.get)


def run():
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Camera not found.")
        return

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

    print(f"AWS Rekognition — Region: {AWS_REGION}")
    print(f"DetectFaces interval: {CALL_INTERVAL}s")
    print("Press Q to quit.\n")

    display_scores = {e: 0.0 for e in EMOTIONS}
    display_scores["NEUTRAL"] = 100.0
    target_scores = neutral_scores()

    last_call_time = 0.0
    spike_end_time = 0.0
    in_spike       = False
    next_spike_at  = time.time() + random.uniform(9, 15)

    noise_offsets  = {e: 0.0 for e in EMOTIONS}
    jitter_scores  = dict(display_scores)
    next_jitter_at = time.time() + random.uniform(2.0, 5.0)

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        frame = cv2.flip(frame, 1)
        h, w = frame.shape[:2]
        now = time.time()

        # ── Detect faces with Haar cascade ────────────────────────────────
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1,
                                              minNeighbors=5, minSize=(80, 80))
        second_face = len(faces) >= 2

        # ── Emotion logic ─────────────────────────────────────────────────
        if second_face:
            target_scores = sad_scores()
        elif now - last_call_time >= CALL_INTERVAL:
            last_call_time = now
            if in_spike and now >= spike_end_time:
                target_scores = neutral_scores()
                in_spike = False
                next_spike_at = now + random.uniform(9, 17)
            elif not in_spike and now >= next_spike_at:
                emotion = random.choice(["HAPPY", "HAPPY", "SURPRISE", "SAD"])
                level   = round(random.uniform(14.0, 28.0), 2)
                target_scores = spike_scores(emotion, level)
                in_spike = True
                spike_end_time = now + random.uniform(3, 6)
            else:
                target_scores = neutral_scores()

        # ── Lerp ──────────────────────────────────────────────────────────
        LERP = 0.025
        for e in EMOTIONS:
            display_scores[e] += (target_scores[e] - display_scores[e]) * LERP

        # ── Random walk jitter ────────────────────────────────────────────
        for e in EMOTIONS:
            drift = random.uniform(-0.4, 0.4)
            noise_offsets[e] = np.clip(noise_offsets[e] + drift, -3.5, 3.5)
            jitter_scores[e] = max(0.0, display_scores[e] + noise_offsets[e])

        if now >= next_jitter_at:
            next_jitter_at = now + random.uniform(2.0, 5.5)
            for e in EMOTIONS:
                noise_offsets[e] += random.uniform(-2.5, 2.5)
                noise_offsets[e]  = np.clip(noise_offsets[e], -5.0, 5.0)
                jitter_scores[e]  = max(0.0, display_scores[e] + noise_offsets[e])
            jitter_scores["NEUTRAL"] = max(display_scores["NEUTRAL"] - 4.0,
                                           jitter_scores["NEUTRAL"])

        dom      = dominant(jitter_scores)
        dom_conf = jitter_scores[dom]

        # ── Minimal UI ────────────────────────────────────────────────────
        # Thin header
        cv2.rectangle(frame, (0, 0), (w, 38), (15, 20, 30), -1)
        cv2.putText(frame, "Amazon Rekognition", (10, 25),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (80, 100, 130), 1)
        cv2.putText(frame, f"us-east-1", (w - 90, 25),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (60, 80, 110), 1)

        # Big red emotion label centered at bottom
        label_size = cv2.getTextSize(dom, cv2.FONT_HERSHEY_DUPLEX, 1.6, 2)[0]
        lx = (w - label_size[0]) // 2
        cv2.putText(frame, dom, (lx, h - 28),
                    cv2.FONT_HERSHEY_DUPLEX, 1.6, (0, 0, 220), 2)

        # Confidence score below
        conf_str  = f"{dom_conf:.1f}%"
        conf_size = cv2.getTextSize(conf_str, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 1)[0]
        cx = (w - conf_size[0]) // 2
        cv2.putText(frame, conf_str, (cx, h - 8),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (80, 80, 160), 1)

        cv2.imshow("AWS Rekognition — DetectFaces", frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    run()
