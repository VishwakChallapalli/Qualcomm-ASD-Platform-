#!/usr/bin/env python3
"""
Eye Tracking and Emotion Detection for ASD Learning Tool
Uses MediaPipe for face/eye detection and DeepFace for robust emotion recognition
"""

import cv2
import time
import numpy as np
import mediapipe as mp
from datetime import datetime
import os
import threading
from deepface import DeepFace

class EmotionEyeTracker:
    def __init__(self):
        self.mp_face_mesh = mp.solutions.face_mesh
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        
        # Initialize DeepFace - run once to load model
        print("Loading DeepFace emotion model... (this may take a moment)")
        try:
            # We run a dummy prediction to load the model into memory
            dummy_img = np.zeros((48, 48, 3), dtype=np.uint8)
            DeepFace.analyze(dummy_img, actions=['emotion'], enforce_detection=False, silent=True)
            print("DeepFace model loaded successfully!")
        except Exception as e:
            print(f"Warning: DeepFace initialization info: {e}")
        
        # Cleanup old screenshots
        if os.path.exists("screenshots"):
            import shutil
            shutil.rmtree("screenshots")
        os.makedirs("screenshots", exist_ok=True)
        
        self.blink_counter = 0
        self.last_blink_time = 0
        self.last_screenshot_time = 0
        self.screenshot_interval = 2.0
        
        # Calibration state
        self.calibrated = False
        self.calib_pitch = 0
        self.calib_yaw = 0
        self.calib_l_dist = 0
        self.calib_r_dist = 0
        self.calib_ratio_l = 0.5
        self.calib_ratio_r = 0.5
        
        # Emotion detection control
        self.current_emotion = "neutral"
        self.last_emotion_time = 0
        self.emotion_interval = 0.5  # Check emotion every 0.5 seconds
        self.emotion_thread_running = False
        
    def calculate_eye_aspect_ratio(self, eye_landmarks, frame_w, frame_h):
        def get_point(idx):
            return np.array([eye_landmarks[idx].x * frame_w,
                            eye_landmarks[idx].y * frame_h])
        
        points = [get_point(i) for i in range(6)]
        
        vertical_1 = np.linalg.norm(points[1] - points[5])
        vertical_2 = np.linalg.norm(points[2] - points[4])
        horizontal = np.linalg.norm(points[0] - points[3])
        
        if horizontal == 0:
            return 0
        
        ear = (vertical_1 + vertical_2) / (2.0 * horizontal)
        return ear
    
    def detect_emotion_deepface(self, frame_crop):
        try:
            # DeepFace expects RGB (or BGR depending on backend, but handle internally)
            # OpenCV gives BGR, DeepFace handles it or we convert. DeepFace internally uses cv2 (BGR) usually or PIL (RGB)
            # Safe bet is to pass BGR as is since we use cv2
            results = DeepFace.analyze(frame_crop, actions=['emotion'], enforce_detection=False, silent=True)
            if results:
                # results is a list of dicts
                return results[0]['dominant_emotion']
        except Exception:
            # print(f"Emotion error: {e}")
            pass
        return self.current_emotion

    def update_emotion_async(self, frame, face_box):
        if self.emotion_thread_running:
            return
            
        if time.time() - self.last_emotion_time < self.emotion_interval:
            return

        def emotion_task():
            self.emotion_thread_running = True
            try:
                x, y, w, h = face_box
                # Add some padding
                h_pad = int(h * 0.1)
                w_pad = int(w * 0.1)
                y1 = max(0, y - h_pad)
                x1 = max(0, x - w_pad)
                y2 = min(frame.shape[0], y + h + h_pad)
                x2 = min(frame.shape[1], x + w + w_pad)
                
                face_crop = frame[y1:y2, x1:x2]
                
                if face_crop.size > 0:
                     emotion = self.detect_emotion_deepface(face_crop)
                     self.current_emotion = emotion
                     self.last_emotion_time = time.time()
            except Exception:
                pass
            finally:
                self.emotion_thread_running = False
        
        thread = threading.Thread(target=emotion_task)
        thread.daemon = True
        thread.start()
    
    def save_screenshot(self, frame):
        current_time = time.time()
        if current_time - self.last_screenshot_time >= self.screenshot_interval:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"screenshots/capture_{timestamp}.jpg"
            cv2.imwrite(filename, frame)
            self.last_screenshot_time = current_time
            print(f"Screenshot saved: {filename}")
    
    def get_iris_position(self, eye_landmarks, iris_center, frame_w, frame_h):
        """
        Calculates the horizontal ratio of the iris within the eye.
        Returns: ratio (0.0=left, 0.5=center, 1.0=right)
        """
        # corners: 0=left(inner for left eye), 3=right(outer for left eye) 
        # Note: landmark indices passed in are already mapped. 
        # For left eye: 33(inner), 133(outer). For right eye: 362(inner), 263(outer)
        # We need the specific indices from the subset.
        
        # Get absolute coordinates
        p_inner = np.array([eye_landmarks[0].x * frame_w, eye_landmarks[0].y * frame_h]) # 0 is ind 33/362 
        p_outer = np.array([eye_landmarks[3].x * frame_w, eye_landmarks[3].y * frame_h]) # 3 is ind 133/263
        p_iris = np.array([iris_center.x * frame_w, iris_center.y * frame_h])
        
        # Eye width
        eye_width = np.linalg.norm(p_outer - p_inner)
        if eye_width == 0: return 0.5
        
        # Project iris on the line connecting corners
        # Vector from inner to outer
        v_eye = p_outer - p_inner
        v_iris = p_iris - p_inner
        
        # Projection length
        proj = np.dot(v_iris, v_eye) / np.dot(v_eye, v_eye)
        # horizontal ratio (0=inner, 1=outer)
        
        return proj

    def calculate_head_pose(self, face_landmarks, frame_w, frame_h):
        # 3D model points
        model_points = np.array([
            (0.0, 0.0, 0.0),             # Nose tip
            (0.0, -330.0, -65.0),        # Chin
            (-225.0, 170.0, -135.0),     # Left eye left corner
            (225.0, 170.0, -135.0),      # Right eye right corner
            (-150.0, -150.0, -125.0),    # Left Mouth corner
            (150.0, -150.0, -125.0)      # Right mouth corner
        ])
        
        # Camera internals
        focal_length = frame_w
        center = (frame_w/2, frame_h/2)
        camera_matrix = np.array(
            [[focal_length, 0, center[0]],
             [0, focal_length, center[1]],
             [0, 0, 1]], dtype = "double"
        )
        dist_coeffs = np.zeros((4,1)) # Assuming no lens distortion
        
        # 2D image points
        # indices: 1(nose), 152(chin), 226(L eye corner), 446(R eye corner), 57(L mouth), 287(R mouth)
        # Using standard robust indices:
        ids = [1, 9, 33, 263, 61, 291] # Adjusted for stability: 1=nose, 152->9(chin alt), 33=L_in, 263=R_in
        # Re-mapping to standard model points correspondence:
        # Nose(1), Chin(152), LeftEyeLeft(33 - wait, model needs LeftEyeLeftCorner... let's use 263/33 swapped or standard)
        # Let's use simple set:
        image_points = np.array([
            (face_landmarks.landmark[1].x * frame_w, face_landmarks.landmark[1].y * frame_h),     # Nose tip
            (face_landmarks.landmark[152].x * frame_w, face_landmarks.landmark[152].y * frame_h), # Chin
            (face_landmarks.landmark[33].x * frame_w, face_landmarks.landmark[33].y * frame_h),   # Left eye left corner
            (face_landmarks.landmark[263].x * frame_w, face_landmarks.landmark[263].y * frame_h), # Right eye right corner
            (face_landmarks.landmark[61].x * frame_w, face_landmarks.landmark[61].y * frame_h),   # Left mouth
            (face_landmarks.landmark[291].x * frame_w, face_landmarks.landmark[291].y * frame_h)  # Right mouth
        ], dtype="double")
        
        (success, rotation_vector, translation_vector) = cv2.solvePnP(model_points, image_points, camera_matrix, dist_coeffs, flags=cv2.SOLVEPNP_ITERATIVE)
        
        # Get rotational angles
        rmat, _ = cv2.Rodrigues(rotation_vector)
        angles, _, _, _, _, _ = cv2.RQDecomp3x3(rmat)
        
        # angles: [pitch, yaw, roll]
        pitch = angles[0]
        yaw = angles[1]
        roll = angles[2]
        
        return pitch, yaw, roll

    def process_frame(self, frame):
        # Do NOT flip frame for internal processing if we want raw head pose to mean "forward"
        # However, flipping for mirror display is UX standard.
        # Let's flip for display AND processing to match user expectations of "left/right"
        frame = cv2.flip(frame, 1)
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.face_mesh.process(rgb_frame)
        
        h, w, _ = frame.shape
        face_detected = False
        eyes_open = False
        looking = False
        
        debug_info = ""
        
        if results.multi_face_landmarks:
            face_detected = True
            face_landmarks = results.multi_face_landmarks[0]
            
            # Eye Indices (Inner, Top, Outer, Bottom) - simplified for EAR
            # Left: 33, 160, 158, 133, 153, 144
            # Right: 362, 385, 387, 263, 373, 380
            left_eye_indices = [33, 160, 158, 133, 153, 144]
            right_eye_indices = [362, 385, 387, 263, 373, 380]
            
            left_landmarks = [face_landmarks.landmark[i] for i in left_eye_indices]
            right_landmarks = [face_landmarks.landmark[i] for i in right_eye_indices]
            
            # Iris Centers
            left_iris_center = face_landmarks.landmark[468]
            right_iris_center = face_landmarks.landmark[473]
            
            # 1. Calculate EAR (Blink Detection)
            left_ear = self.calculate_eye_aspect_ratio(left_landmarks, w, h)
            right_ear = self.calculate_eye_aspect_ratio(right_landmarks, w, h)
            avg_ear = (left_ear + right_ear) / 2.0
            eyes_open = avg_ear > 0.2
            
            if not eyes_open and time.time() - self.last_blink_time > 0.3:
                self.blink_counter += 1
                self.last_blink_time = time.time()
                
            # 2. Gaze Detection (Head Pose + Iris)
            # Head Pose
            pitch, yaw, roll = self.calculate_head_pose(face_landmarks, w, h)
            
            # Iris position (0.5 is center)
            # We pass the eye corners (0=inner, 3=outer)
            # Note: For left eye, 33 is inner, 133 is outer. Code above: index 0 is 33, index 3 is 133.
            # For right eye, 362 is inner, 263 is outer. Code above: index 0 is 362, index 3 is 263.
            # Wait, 362 is inner for right, 263 is outer. Correct.
            
            l_ratio = self.get_iris_position(left_landmarks, left_iris_center, w, h)
            r_ratio = self.get_iris_position(right_landmarks, right_iris_center, w, h)
            
            # Calibration Check
            if hasattr(self, 'do_calibrate') and self.do_calibrate:
                self.calib_pitch = pitch
                self.calib_yaw = yaw
                self.calib_ratio_l = l_ratio
                self.calib_ratio_r = r_ratio
                self.calibrated = True
                self.do_calibrate = False
                print(f"Calibrated! Pitch:{pitch:.1f} Yaw:{yaw:.1f} L:{l_ratio:.2f} R:{r_ratio:.2f}")

            # Calculate Deltas from Calibration (or 0 if not calibrated)
            target_pitch = self.calib_pitch if self.calibrated else 0
            target_yaw = self.calib_yaw if self.calibrated else 0
            target_l = self.calib_ratio_l if self.calibrated else 0.5
            target_r = self.calib_ratio_r if self.calibrated else 0.5
            
            delta_pitch = abs(pitch - target_pitch)
            delta_yaw = abs(yaw - target_yaw)
            delta_l = abs(l_ratio - target_l)
            delta_r = abs(r_ratio - target_r)
            
            # Thresholds REFINED (Relaxed further for better usability)
            # Head facing forward: Pitch [-35, 35], Yaw [-45, 45]
            # Iris centered: dist < 0.4 (meaning within 10% - 90% of eye width - checking for extreme side glances only)
            is_face_valid = delta_pitch < 35 and delta_yaw < 45
            is_iris_valid = delta_l < 0.4 and delta_r < 0.4
            
            looking = is_face_valid and is_iris_valid and eyes_open
            
            debug_info = f"P:{int(pitch)} Y:{int(yaw)} L:{l_ratio:.2f}"
            
            # Drawing
            self.draw_debug(frame, face_landmarks, w, h, looking, left_iris_center, right_iris_center)
            
            # Emotion
            x_coords = [int(lm.x * w) for lm in face_landmarks.landmark]
            y_coords = [int(lm.y * h) for lm in face_landmarks.landmark]
            face_box = (min(x_coords), min(y_coords), max(x_coords)-min(x_coords), max(y_coords)-min(y_coords))
            self.update_emotion_async(frame.copy(), face_box)
            
        else:
            self.current_emotion = "neutral"

        self.draw_ui(frame, face_detected, eyes_open, looking, self.current_emotion, debug_info)
        self.save_screenshot(frame)
        return frame
        
    def draw_debug(self, frame, landmarks, w, h, looking, lic, ric):
        color = (0, 255, 0) if looking else (0, 0, 255)
        # Bounding box
        x_c = [int(l.x * w) for l in landmarks.landmark]
        y_c = [int(l.y * h) for l in landmarks.landmark]
        cv2.rectangle(frame, (min(x_c), min(y_c)), (max(x_c), max(y_c)), color, 2)
        
        # Iris
        cv2.circle(frame, (int(lic.x*w), int(lic.y*h)), 4, (255, 255, 0), -1)
        cv2.circle(frame, (int(ric.x*w), int(ric.y*h)), 4, (255, 255, 0), -1)

    def draw_ui(self, frame, face_detected, eyes_open, looking, emotion, debug_info=""):
        status_y = 30
        
        # Main Status
        cv2.putText(frame, f"Face: {'Yes' if face_detected else 'No'}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255,255,255), 2)
        cv2.putText(frame, f"Eyes: {'Open' if eyes_open else 'Closed'}", (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255,255,255), 2)
        
        # Blinking (Restored)
        cv2.putText(frame, f"Blinks: {self.blink_counter}", (10, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255,255,255), 2)
        
        # LOOKING Status - Big and Bold
        look_color = (0, 255, 0) if looking else (0, 0, 255)
        look_text = "LOOKING AT SCREEN" if looking else "NOT LOOKING"
        cv2.putText(frame, look_text, (10, 130), cv2.FONT_HERSHEY_SIMPLEX, 0.8, look_color, 2)
        
        # Emotion
        emo_color = (0, 255, 255)
        if emotion == 'happy': emo_color = (0, 255, 0)
        elif emotion == 'sad': emo_color = (0, 0, 255)
        elif emotion == 'angry': emo_color = (0, 0, 255)
        cv2.putText(frame, f"Emotion: {emotion.upper()}", (10, 140), cv2.FONT_HERSHEY_SIMPLEX, 0.8, emo_color, 2)
         
        # Calibration Instruction
        if not self.calibrated:
            cv2.putText(frame, "Look at screen & Press 'C' to Calibrate", (20, 400), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
        else:
            cv2.putText(frame, "Calibrated", (frame.shape[1]-150, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
            
        # Debug Data
        if debug_info:
            cv2.putText(frame, debug_info, (10, 460), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)

    def run(self):
        cap = cv2.VideoCapture(0)
        
        if not cap.isOpened():
            print("Error: Could not open camera")
            return
        
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        
        print("DeepFace Eye Tracking System Started")
        print("Features: DeepFace Emotion | Eye Tracking | Gaze Detection")
        print("Press 'q' to quit")
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            frame = self.process_frame(frame)
            cv2.imshow('Eye Tracker - ASD Learning Tool', frame)
            
            key = cv2.waitKey(1) & 0xFF
            if key == ord('q'):
                break
            if key == ord('c'): self.do_calibrate = True
        
        cap.release()
        cv2.destroyAllWindows()
        self.face_mesh.close()

def main():
    tracker = EmotionEyeTracker()
    tracker.run()

if __name__ == "__main__":
    main()
