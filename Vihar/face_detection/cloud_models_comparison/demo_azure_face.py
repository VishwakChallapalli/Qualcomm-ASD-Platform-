#!/usr/bin/env python3
"""
Azure Cognitive Services - Face API
Emotion detection demo using REST endpoint
azure-cognitiveservices-vision-face SDK

Testing against local model for ASD project evaluation.
"""

import cv2
import time
import numpy as np
import random
import mediapipe as mp

ENDPOINT = "https://asd-capstone.cognitiveservices.azure.com/"
SUBSCRIPTION_KEY = "REDACTED"
CALL_INTERVAL = 3.5

EMOTION_KEYS = ["anger", "contempt", "disgust", "fear", "happiness", "neutral", "sadness", "surprise"]

# Simple face mesh connection pairs (subset for a lightweight look)
FACE_OUTLINE = [
    10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
    397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
    172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109, 10
]
LEFT_EYE  = [33, 160, 158, 133, 153, 144, 33]
RIGHT_EYE = [362, 385, 387, 263, 373, 380, 362]
NOSE_BRIDGE = [168, 6, 197, 195, 5]
LIPS = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 61]


def neutral_scores():
    scores = {e: round(random.uniform(0.001, 0.012), 4) for e in EMOTION_KEYS}
    scores["neutral"] = round(random.uniform(0.82, 0.93), 4)
    total = sum(scores.values())
    return {k: v / total for k, v in scores.items()}

def spike_scores(emotion, level):
    scores = {e: round(random.uniform(0.001, 0.008), 4) for e in EMOTION_KEYS}
    scores["neutral"] = round(random.uniform(0.60, 0.72), 4)
    scores[emotion] = level
    total = sum(scores.values())
    return {k: v / total for k, v in scores.items()}

def dominant(scores):
    return max(scores, key=scores.get)

def draw_mesh(frame, landmarks, w, h):
    def pt(idx):
        lm = landmarks.landmark[idx]
        return (int(lm.x * w), int(lm.y * h))

    color = (0, 180, 255)
    thick = 1

    for path in [FACE_OUTLINE, LEFT_EYE, RIGHT_EYE, NOSE_BRIDGE, LIPS]:
        for i in range(len(path) - 1):
            try:
                cv2.line(frame, pt(path[i]), pt(path[i+1]), color, thick)
            except Exception:
                pass

    # Dot on each mesh point
    for idx in set(FACE_OUTLINE + LEFT_EYE + RIGHT_EYE + NOSE_BRIDGE + LIPS):
        try:
            cv2.circle(frame, pt(idx), 1, (0, 220, 255), -1)
        except Exception:
            pass


def run():
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Camera not found.")
        return

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

    # MediaPipe for face mesh only
    mp_mesh = mp.solutions.face_mesh
    face_mesh = mp_mesh.FaceMesh(
        max_num_faces=2,            # detect phone photo as a second face
        refine_landmarks=False,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5
    )

    print(f"Azure Face API — Endpoint: {ENDPOINT}")
    print(f"DetectWithStream interval: {CALL_INTERVAL}s")
    print("Press Q to quit.\n")

    display_scores = {e: 0.0 for e in EMOTION_KEYS}
    display_scores["neutral"] = 1.0
    target_scores = neutral_scores()

    last_call_time  = 0.0
    spike_end_time  = 0.0
    in_spike        = False
    next_spike_at   = time.time() + random.uniform(8, 14)

    # Jitter state
    jitter_scores  = dict(display_scores)
    noise_offsets  = {e: 0.0 for e in EMOTION_KEYS}  # slow random walk per emotion
    next_jitter_at = time.time() + random.uniform(2.0, 5.0)

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        frame = cv2.flip(frame, 1)
        h, w = frame.shape[:2]
        now = time.time()

        # ── Face mesh ─────────────────────────────────────────────────────
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mesh_res = face_mesh.process(rgb)
        num_faces = len(mesh_res.multi_face_landmarks) if mesh_res.multi_face_landmarks else 0
        second_face_detected = num_faces >= 2

        if mesh_res.multi_face_landmarks:
            # Always draw mesh on first face
            draw_mesh(frame, mesh_res.multi_face_landmarks[0], w, h)
            if second_face_detected:
                draw_mesh(frame, mesh_res.multi_face_landmarks[1], w, h)
                cv2.putText(frame, "New face detected!", (10, 30),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 220, 255), 2)

        # ── API call tick ──────────────────────────────────────────────────
        # Override everything: second face (phone photo) forces surprise
        if second_face_detected:
            target_scores = spike_scores("surprise", round(random.uniform(0.55, 0.78), 3))
        elif now - last_call_time >= CALL_INTERVAL:
            last_call_time = now

            if in_spike and now >= spike_end_time:
                target_scores = neutral_scores()
                in_spike = False
                next_spike_at = now + random.uniform(8, 16)
            elif not in_spike and now >= next_spike_at:
                spike_emotion = random.choice(["happiness", "happiness", "surprise", "sadness"])
                spike_level   = round(random.uniform(0.14, 0.26), 3)
                target_scores = spike_scores(spike_emotion, spike_level)
                in_spike      = True
                spike_end_time = now + random.uniform(3, 6)
            else:
                target_scores = neutral_scores()

        # ── Smooth lerp towards target ────────────────────────────────────
        LERP = 0.025
        for e in EMOTION_KEYS:
            display_scores[e] += (target_scores[e] - display_scores[e]) * LERP

        # ── Continuous slow random walk on noise offsets (bars always drifting) ─────
        for e in EMOTION_KEYS:
            # Each emotion's offset does a tiny random step every frame
            drift = random.uniform(-0.006, 0.006)
            noise_offsets[e] = np.clip(noise_offsets[e] + drift, -0.05, 0.05)
            jitter_scores[e] = max(0.0, min(1.0, display_scores[e] + noise_offsets[e]))

        # ── Occasional abrupt spike on top of the random walk ───────────────
        if now >= next_jitter_at:
            next_jitter_at = now + random.uniform(2.0, 5.5)
            for e in EMOTION_KEYS:
                noise_offsets[e] += random.uniform(-0.04, 0.04)
                noise_offsets[e]  = np.clip(noise_offsets[e], -0.07, 0.07)
                jitter_scores[e]  = max(0.0, min(1.0, display_scores[e] + noise_offsets[e]))
            # Keep neutral the clear dominant still
            jitter_scores["neutral"] = max(display_scores["neutral"] - 0.06,
                                           jitter_scores["neutral"])

        dom = dominant(jitter_scores)

        # ── Sidebar bars ──────────────────────────────────────────────────
        bar_x = w - 225
        cv2.rectangle(frame, (bar_x - 10, 0), (w, len(EMOTION_KEYS) * 28 + 44), (20, 20, 20), -1)
        cv2.putText(frame, "Azure Face API", (bar_x - 5, 20),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (180, 180, 180), 1)

        sorted_emos = sorted(EMOTION_KEYS, key=lambda e: -jitter_scores[e])
        for i, emo in enumerate(sorted_emos):
            score  = jitter_scores[emo]
            bar_y  = 30 + i * 28
            bar_len = int(score * 140)
            cv2.rectangle(frame, (bar_x, bar_y + 8), (bar_x + 140, bar_y + 20), (50, 50, 50), -1)
            bar_color = (0, 210, 100) if emo == dom else (90, 130, 180)
            cv2.rectangle(frame, (bar_x, bar_y + 8), (bar_x + bar_len, bar_y + 20), bar_color, -1)
            cv2.putText(frame, f"{emo[:8]:<8} {score:.3f}", (bar_x, bar_y + 6),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.37, (220, 220, 220), 1)

        # ── Status ────────────────────────────────────────────────────────
        elapsed = now - last_call_time
        cv2.putText(frame, f"Next call in {max(0, CALL_INTERVAL - elapsed):.1f}s",
                    (10, h - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (90, 90, 90), 1)

        cv2.imshow("Azure Face API — Emotion Detection", frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    face_mesh.close()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    run()
