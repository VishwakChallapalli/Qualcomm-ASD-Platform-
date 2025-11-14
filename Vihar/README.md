# Qualcomm AI Hub - Face Detection and Speech Recognition

Real-time face detection with emotion recognition and speech-to-text using Qualcomm AI Hub and Snapdragon X Elite.

## Features

- **Live Face Detection**: Real-time facial landmark detection using MediaPipe
- **Emotion Recognition**: Detects 5 emotion states (neutral, smile, surprise, sad, anger)
- **Speech-to-Text**: Audio recording and transcription using Whisper model
- **Qualcomm AI Hub Integration**: Optimized for Snapdragon X Elite hardware

## Requirements

- Python 3.8+
- Qualcomm AI Hub access
- Webcam for face detection
- Microphone for speech recognition

## Installation

```bash
pip install -r requirements.txt
```

## Usage

### Face Detection with Emotion Recognition

```bash
python3 face_detection.py
```

Press 'q' to quit the camera feed.

### Speech-to-Text

```bash
python3 speech_to_text.py
```

## Project Structure

- `face_detection.py` - Live face detection and emotion recognition
- `speech_to_text.py` - Audio recording and speech transcription
- `models/whisper/` - Whisper model files for speech recognition

## Technologies

- MediaPipe - Facial landmark detection
- OpenCV - Video processing
- Qualcomm AI Hub - Hardware acceleration
- Whisper - Speech recognition
- Librosa - Audio processing

## Emotion Detection

The system detects 5 emotion states:
- Emotion 0: Neutral
- Emotion 1: Smile
- Emotion 2: Surprise
- Emotion 3: Sad
- Emotion 4: Anger

## License

MIT

