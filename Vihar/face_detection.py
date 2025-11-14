import numpy as np
import cv2
import time
import mediapipe as mp
import qai_hub as hub

mp_face_mesh = mp.solutions.face_mesh
mp_drawing = mp.solutions.drawing_utils

ai_hub_connected = False

def check_ai_hub():
    global ai_hub_connected
    try:
        devices = hub.get_devices()
        snapdragon = [d for d in devices if 'Snapdragon X Elite' in d.name]
        if snapdragon:
            ai_hub_connected = True
            return True
    except:
        pass
    return False

def detect_faces(frame, face_detector):
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = face_detector.process(gray)
    
    faces = []
    if results.detections:
        h, w = frame.shape[:2]
        for detection in results.detections:
            bbox = detection.location_data.relative_bounding_box
            x = int(bbox.xmin * w)
            y = int(bbox.ymin * h)
            width = int(bbox.width * w)
            height = int(bbox.height * h)
            faces.append((x, y, width, height))
    
    return faces

def get_landmarks(frame, face_mesh):
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = face_mesh.process(rgb_frame)
    
    landmarks = []
    if results.multi_face_landmarks:
        for face_landmarks in results.multi_face_landmarks:
            face_points = []
            h, w = frame.shape[:2]
            for landmark in face_landmarks.landmark:
                x = int(landmark.x * w)
                y = int(landmark.y * h)
                z = landmark.z
                face_points.append([x, y, z])
            landmarks.append(np.array(face_points))
    
    return landmarks

def detect_emotion(landmarks):
    if len(landmarks) == 0:
        return "emotion 0"
    
    face_points = landmarks[0]
    if len(face_points) < 468:
        return "emotion 0"
    
    # Mouth landmarks
    left_mouth = face_points[61]
    right_mouth = face_points[291]
    top_lip = face_points[13]
    bottom_lip = face_points[14]
    
    # Eyebrow landmarks
    left_eyebrow = face_points[107]
    right_eyebrow = face_points[336]
    nose_tip = face_points[4]
    
    # Eye landmarks
    left_eye_top = face_points[159]
    left_eye_bottom = face_points[145]
    right_eye_top = face_points[386]
    right_eye_bottom = face_points[374]
    
    # Calculate mouth features
    mouth_width = abs(right_mouth[0] - left_mouth[0])
    mouth_height = abs(bottom_lip[1] - top_lip[1])
    mouth_center_y = (top_lip[1] + bottom_lip[1]) / 2
    left_corner_y = left_mouth[1]
    right_corner_y = right_mouth[1]
    
    # Calculate eyebrow position
    eyebrow_avg_y = (left_eyebrow[1] + right_eyebrow[1]) / 2
    eyebrow_distance = abs(left_eyebrow[0] - right_eyebrow[0])
    
    # Reference points
    forehead_y = face_points[10][1]
    eyebrow_to_forehead = eyebrow_avg_y - forehead_y
    
    # Calculate baseline for comparison
    face_height = abs(face_points[10][1] - face_points[175][1])
    
    # Emotion 1: Smile - mouth corners raised and wider (more strict)
    corners_raised = (left_corner_y < mouth_center_y - 8) and (right_corner_y < mouth_center_y - 8)
    mouth_wide = mouth_width > 45
    
    # Emotion 2: Surprise - eyebrows raised and mouth open (more lenient)
    eyebrows_high = eyebrow_to_forehead < -3
    mouth_open = mouth_height > 8
    
    # Emotion 3: Sad - mouth corners down (more lenient)
    corners_down = (left_corner_y > mouth_center_y + 5) and (right_corner_y > mouth_center_y + 5)
    
    # Emotion 4: Anger - eyebrows lowered and close together (very strict)
    eyebrows_low = eyebrow_to_forehead > 20
    eyebrows_close = eyebrow_distance < 90
    
    # Determine emotion - check in order of specificity
    if eyebrows_high and mouth_open:
        return "emotion 2"
    elif corners_down:
        return "emotion 3"
    elif corners_raised and mouth_wide:
        return "emotion 1"
    elif eyebrows_low and eyebrows_close:
        return "emotion 4"
    else:
        return "emotion 0"

def draw_landmarks(frame, landmarks, bbox, emotion):
    if len(landmarks) == 0:
        return frame
    
    x, y, w, h = bbox
    cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
    
    # Draw emotion text
    emotion_colors = {
        "emotion 0": (255, 255, 255),
        "emotion 1": (0, 255, 0),
        "emotion 2": (255, 255, 0),
        "emotion 3": (255, 0, 255),
        "emotion 4": (0, 0, 255)
    }
    color = emotion_colors.get(emotion, (255, 255, 255))
    cv2.putText(frame, emotion.upper(), (x, y - 10),
               cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
    
    face_points = landmarks[0]
    
    # Draw key facial features
    for point in face_points:
        px, py = int(point[0]), int(point[1])
        cv2.circle(frame, (px, py), 1, (0, 0, 255), -1)
    
    return frame

def process_frame(frame, face_detector, face_mesh):
    landmarks = get_landmarks(frame, face_mesh)
    faces = detect_faces(frame, face_detector)
    face_data = []
    
    if len(landmarks) > 0 and len(faces) > 0:
        for i, bbox in enumerate(faces):
            if i < len(landmarks):
                emotion = detect_emotion([landmarks[i]])
                face_data.append({
                    'bbox': bbox,
                    'landmarks': landmarks[i],
                    'emotion': emotion
                })
                frame = draw_landmarks(frame, [landmarks[i]], bbox, emotion)
    
    return frame, face_data

def run_live_detection(camera_index=0):
    global ai_hub_connected
    
    print("Face Detection and Landmark Mapping")
    print("=" * 40)
    
    check_ai_hub()
    
    face_detection = mp.solutions.face_detection.FaceDetection(
        model_selection=0,
        min_detection_confidence=0.5
    )
    
    face_mesh = mp_face_mesh.FaceMesh(
        static_image_mode=False,
        max_num_faces=1,
        refine_landmarks=True,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5
    )
    
    cap = cv2.VideoCapture(camera_index)
    
    if not cap.isOpened():
        print(f"Could not open camera {camera_index}")
        return
    
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    
    time.sleep(0.5)
    
    ret, test_frame = cap.read()
    if not ret:
        print("Camera opened but cannot read frames")
        cap.release()
        return
    
    print("Camera ready")
    print("Press 'q' to quit\n")
    
    fps_start = time.time()
    fps_count = 0
    fps = 0
    
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            annotated_frame, face_data = process_frame(frame, face_detection, face_mesh)
            
            fps_count += 1
            if time.time() - fps_start >= 1.0:
                fps = fps_count
                fps_count = 0
                fps_start = time.time()
            
            cv2.putText(annotated_frame, f"FPS: {fps}", (10, 30),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            cv2.putText(annotated_frame, f"Faces: {len(face_data)}", (10, 60),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            
            if face_data:
                emotion = face_data[0].get('emotion', 'emotion 0')
                cv2.putText(annotated_frame, f"Emotion: {emotion}", (10, 90),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            
            cv2.imshow('Face Detection', annotated_frame)
            
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
                
    except KeyboardInterrupt:
        pass
    finally:
        cap.release()
        face_detection.close()
        face_mesh.close()
        cv2.destroyAllWindows()
        print("Done")

def main():
    import sys
    
    camera_index = 0
    if len(sys.argv) > 1:
        try:
            camera_index = int(sys.argv[1])
        except:
            pass
    
    run_live_detection(camera_index)

if __name__ == "__main__":
    main()
