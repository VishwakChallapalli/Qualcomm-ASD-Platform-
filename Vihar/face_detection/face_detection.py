import cv2
import time
import argparse
import os
import json
import numpy as np
from deepface import DeepFace

# Global variables
last_emotion = "neutral"
last_check_time = 0
custom_model = None
class_names = []

def load_custom_model(model_path, config_path):
    """
    Load custom trained emotion model
    """
    global custom_model, class_names
    
    try:
        import tensorflow as tf
        
        # Load the model
        custom_model = tf.keras.models.load_model(model_path)
        print(f"Loaded custom model from: {model_path}")
        
        # Load class names
        if os.path.exists(config_path):
            with open(config_path, 'r') as f:
                config = json.load(f)
                class_names = config['class_names']
            print(f"Class names: {class_names}")
        else:
            print("Warning: model_config.json not found, using default classes")
            class_names = ['anger', 'delight', 'fear', 'joy', 'sadness', 'surprise']
        
        return True
        
    except Exception as e:
        print(f"Error loading custom model: {e}")
        return False

def detect_emotion_custom(frame, bbox):
    """
    Detect emotion using custom trained model
    """
    global last_emotion, last_check_time, custom_model, class_names
    
    # Only check emotion every 0.5 seconds to keep it fast
    if time.time() - last_check_time < 0.5:
        return last_emotion
    
    try:
        # Get the face region
        x, y, w, h = bbox
        
        # Add padding
        padding = int(h * 0.1)
        face_image = frame[max(0, y-padding):min(frame.shape[0], y+h+padding),
                           max(0, x-padding):min(frame.shape[1], x+w+padding)]
        
        if face_image.size == 0:
            return last_emotion
        
        # Preprocess for model (resize to 224x224 and normalize)
        face_resized = cv2.resize(face_image, (224, 224))
        face_normalized = face_resized / 255.0
        face_expanded = np.expand_dims(face_normalized, axis=0)
        
        # Predict emotion
        predictions = custom_model.predict(face_expanded, verbose=0)
        emotion_idx = np.argmax(predictions[0])
        emotion = class_names[emotion_idx]
        
        last_emotion = emotion
        last_check_time = time.time()
        
        return emotion
        
    except Exception as e:
        print(f"Custom model error: {e}")
        return last_emotion

def detect_emotion(frame, bbox):
    """
    Detect emotion from a face region using DeepFace
    """
    global last_emotion, last_check_time
    
    # Only check emotion every 0.5 seconds to keep it fast
    if time.time() - last_check_time < 0.5:
        return last_emotion
    
    try:
        # Get the face region
        x, y, w, h = bbox
        
        # Add some padding around the face
        padding = int(h * 0.1)
        face_image = frame[max(0, y-padding):min(frame.shape[0], y+h+padding),
                           max(0, x-padding):min(frame.shape[1], x+w+padding)]
        
        # Check if face image is valid
        if face_image.size == 0:
            return last_emotion
        
        # Use DeepFace to analyze the emotion
        result = DeepFace.analyze(face_image, actions=['emotion'], 
                                 enforce_detection=False, silent=True)
        
        # Get the main emotion detected
        emotion = result[0]['dominant_emotion']
        last_emotion = emotion
        last_check_time = time.time()
        
        return emotion
        
    except Exception as e:
        # If something goes wrong, just return the last emotion
        return last_emotion

def draw_face_mesh(frame, x, y, w, h):
    """
    Draw a red mesh overlay on the detected face
    """
    # Convert the face region to grayscale for feature detection
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    face_region = gray[y:y+h, x:x+w]
    
    # Find feature points on the face
    features = cv2.goodFeaturesToTrack(face_region, maxCorners=400, 
                                      qualityLevel=0.0001, minDistance=4)
    
    if features is not None:
        features = features.astype(int)
        points = []
        
        # Draw red dots on each feature point
        for feature in features:
            fx, fy = feature.ravel()
            point = (x + fx, y + fy)
            points.append(point)
            cv2.circle(frame, point, 1, (0, 0, 255), -1)
        
        # Draw lines connecting nearby points to create mesh effect
        for i, point1 in enumerate(points):
            if i % 2 == 0:  # Skip some points for performance
                connections = 0
                for j, point2 in enumerate(points):
                    if i == j:
                        continue
                    
                    # Calculate distance between points
                    distance = abs(point1[0] - point2[0]) + abs(point1[1] - point2[1])
                    
                    # Connect nearby points
                    if distance < 15:
                        cv2.line(frame, point1, point2, (0, 0, 255), 1)
                        connections += 1
                        if connections > 2:  # Limit connections per point
                            break

def process_frame(frame, face_detector, use_custom=False):
    """
    Process each frame to detect faces and emotions
    """
    global custom_model
    
    # Convert to grayscale for face detection
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    
    # Detect faces in the frame
    faces = face_detector.detectMultiScale(gray, 1.1, 4)
    
    # Process each detected face
    for (x, y, w, h) in faces:
        # Detect emotion (use custom model if loaded)
        if use_custom and custom_model is not None:
            emotion = detect_emotion_custom(frame, (x, y, w, h))
        else:
            emotion = detect_emotion(frame, (x, y, w, h))
        
        # Draw green rectangle around face
        cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 255, 0), 2)
        
        # Draw the red mesh overlay
        draw_face_mesh(frame, x, y, w, h)
        
        # Display emotion text above the face
        cv2.putText(frame, emotion.upper(), (x, y-10), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)
        
        # Print to terminal
        timestamp = time.strftime("%H:%M:%S")
        print(f"[{timestamp}] Detected Emotion: {emotion.upper()}")
    
    return frame

def main():
    """
    Main function to run the face detection
    """
    # Parse command-line arguments
    parser = argparse.ArgumentParser(description='Face Detection with Emotion Recognition')
    parser.add_argument('--use-custom-model', action='store_true',
                       help='Use custom trained model instead of DeepFace')
    parser.add_argument('--model-path', type=str, default='models/emotion_model.h5',
                       help='Path to custom model file')
    parser.add_argument('--test-mode', action='store_true',
                       help='Test mode (just verify model loading)')
    args = parser.parse_args()
    
    print("=" * 50)
    print("Face Detection with Emotion Recognition")
    print("=" * 50)
    
    # Load custom model if requested
    use_custom = False
    if args.use_custom_model:
        print("Loading custom trained model...")
        config_path = 'models/model_config.json'
        success = load_custom_model(args.model_path, config_path)
        if success:
            use_custom = True
            print("Custom model loaded successfully")
            if args.test_mode:
                print("Test mode: Model loaded successfully!")
                return
        else:
            print("Failed to load custom model, falling back to DeepFace")
    else:
        print("Using DeepFace for emotion detection...")

    
    print("Loading face detector...")
    
    # Load Haar Cascade classifier for face detection
    cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
    face_detector = cv2.CascadeClassifier(cascade_path)
    
    if face_detector.empty():
        print("Error: Could not load face detection model")
        return
    
    # Try to open the camera
    camera = None
    for camera_id in [0, 1]:
        print(f"Trying camera {camera_id}...")
        temp_camera = cv2.VideoCapture(camera_id)
        if temp_camera.isOpened():
            ret, frame = temp_camera.read()
            if ret:
                camera = temp_camera
                print(f"Camera {camera_id} opened successfully!")
                break
            else:
                temp_camera.release()
    
    if camera is None:
        print("Error: Could not open camera")
        return
    
    # Set camera resolution
    camera.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    
    print("Press 'q' to quit")
    print("=" * 50)
    
    try:
        while True:
            # Read frame from camera
            success, frame = camera.read()
            if not success:
                break
            
            # Process the frame
            frame = process_frame(frame, face_detector, use_custom=use_custom)
            
            # Display the result
            cv2.imshow('Face Detection', frame)
            
            # Save current frame periodically
            if time.time() % 0.5 < 0.1:
                cv2.imwrite('monitor.jpg', frame)
            
            # Check if user pressed 'q' to quit
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
                
    except KeyboardInterrupt:
        print("\nStopped by user")
    
    finally:
        # Clean up
        if camera:
            camera.release()
        cv2.destroyAllWindows()
        print("Done!")

if __name__ == "__main__":
    main()
