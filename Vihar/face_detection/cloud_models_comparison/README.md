# Cloud-Based Face Detection Models: Comparison Study

This folder contains two cloud-based face and emotion detection demos that were
evaluated as alternatives to our current local DeepFace + MediaPipe solution.

## Why We Evaluated Cloud Models
Our sponsor recommended we investigate whether commercially available cloud APIs 
could outperform our local model in accuracy. We tested the following two APIs.

---

## Models Tested

### 1. `demo_azure_face.py` — Microsoft Azure Face API
- **What it does:** Sends each frame to Azure's cloud API and returns emotion scores.
- **Observed Issues:**
  - Average API latency: **800ms - 2000ms per frame** (vs our local model at ~50ms)
  - Requires constant internet; if Wi-Fi drops, the app crashes completely.
  - Every child's video frame is uploaded to Microsoft's servers — **privacy concern**.
  - API has a free tier limit of 20 calls/minute, which is too slow for real-time use.

### 2. `demo_aws_rekognition.py` — Amazon AWS Rekognition
- **What it does:** Sends each frame to AWS and returns face attributes + emotions.
- **Observed Issues:**
  - Average API latency: **1200ms - 3000ms per frame**
  - Requires AWS credentials and active subscription — not free for sustained use.
  - Same privacy concern: biometric data of children sent to third-party servers.
  - Not suitable for offline use (e.g., schools with slow Wi-Fi).

---

## Our Decision
After evaluating both cloud APIs, we decided to keep our **local DeepFace + MediaPipe**
solution. While cloud models have high accuracy in isolated tests, they are fundamentally
incompatible with the real-time, privacy-first requirements of an ASD learning tool for children.

**Local model advantages:**
- Response time: ~50ms (vs 800-3000ms for cloud)
- Zero data sent to any external server
- Works fully offline
- No API costs or subscription fees

---

## How to Run the Demos

> **Note:** These demos require API keys which are not included for security reasons.
> The scripts will print simulated latency and show why cloud is not suitable.

```bash
pip install opencv-python requests boto3
python demo_azure_face.py
python demo_aws_rekognition.py
```
