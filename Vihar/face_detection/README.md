# ASD Learning Tool - Face Detection & Eye Tracking

Emotion detection and eye tracking system for children with Autism Spectrum Disorder.

## Setup

```bash
cd face_detection
pip3 install -r requirements.txt
```

## Usage

Run the integrated system:
```bash
python3 integrated_tracker.py
```

Legacy emotion detection only:
```bash
python3 face_detection.py
```

## Features

- Real-time emotion recognition using DeepFace
- Eye tracking with MediaPipe Face Mesh
- Engagement scoring based on eye contact
- Visual feedback with color-coded engagement bar
- Optimized for Snapdragon X-Elite platform

## Controls

Press 'q' to quit
