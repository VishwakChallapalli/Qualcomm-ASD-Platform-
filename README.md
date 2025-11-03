# Qualcomm Technologies – Intelligent Learning Tool for Children with Autism Spectrum Disorder (ASD)

An AI-driven interactive learning platform designed to help children on the autism spectrum recognize, interpret, and regulate emotions through adaptive digital experiences. Built in collaboration with Qualcomm Technologies, this project demonstrates how on‑device AI running on Snapdragon hardware can deliver real-time emotion recognition, dynamic content generation, and natural voice interaction — all while preserving privacy and minimizing latency.

This repository contains the web front-end (Next.js) that is evolving from the initial Gradio prototype toward a scalable, accessible learning interface. It currently showcases interactive 3D scenes and a modular UI foundation where multimodal AI capabilities will be integrated.

## Overview

- **Real-time, on-device AI**: Showcases how Qualcomm’s NPU/GPU acceleration enables offline emotion recognition and adaptive learning flows.
- **Educational focus**: Teaches emotional awareness and self-regulation to children with ASD using feedback, stories, and mini-games.
- **Privacy by design**: Processing is designed to run locally to avoid cloud dependency and protect user data.

The tool expands an earlier Qualcomm hackathon prototype and integrates modern emotion-recognition models, lightweight generative AI, and speech technology into a cohesive learning platform.

## Core Features

- **Real-Time Emotion Recognition**: Uses facial expression and eye-gaze signals to infer states such as happy, sad, confused, neutral, or frustrated.
- **Adaptive Scenario Generation**: On-device generative models create social scenarios tailored to the learner’s emotional state and progress.
- **Voice Interaction**: Speech-to-text and text-to-speech enable natural, hands-free conversation with the learner.
- **Emotion-Regulation Mini-Games**: Short, interactive experiences that reinforce awareness and self-regulation with real-time feedback.
- **Performance Analytics Dashboard**: Tracks engagement, recognition confidence, and learning outcomes locally for caregivers/educators.

## Tech Stack

Current repository (front-end):
- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **React Three Fiber** + **Three.js** + **@react-three/drei** (interactive scenes)
- **Tailwind CSS 4** + **CSS Modules** (styling)

Planned/related components (prototype/back-end/inference):
- **Hardware**: Qualcomm Snapdragon-based developer boards with integrated NPU/GPU
- **Runtime/SDK**: Python, ONNX Runtime, Qualcomm AI Hub SDK, PyTorch
- **Vision**: MediaPipe / FER+ / custom CNN for facial emotion recognition; OpenCV + MediaPipe for gaze
- **Generative**: Qualcomm AI Hub LLM integration (e.g., Llama‑2, Phi‑2)
- **Speech**: Whisper / SpeechRecognition / TTS models

Note: This repo focuses on the Next.js UI. Model execution and on-device integration will be wired through bridging layers/APIs as those modules mature.

## System Architecture (Concept)

1. **Input Layer**: Captures video/audio input.
2. **Emotion Recognition Engine**: Local model infers discrete emotion states using Snapdragon acceleration.
3. **Adaptive Logic Layer**: Maps detected states to scenarios, feedback, or mini-games.
4. **Generative Scenario Engine**: Produces dialogue and narratives conditioned on emotion and learner profile.
5. **Front-End Display**: React/Next.js UI presents instructions, games, and visual feedback.
6. **Analytics Module**: Logs anonymized engagement metrics locally for review.

## Getting Started

Prerequisites: Node.js 18+ and npm.

Install dependencies (using the lockfile):

```bash
npm ci
```

Start the development server:

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

## Project Structure

```
src/
├── app/
│   ├── layout.tsx                  # Root layout
│   ├── globals.css                 # Global styles
│   ├── page.tsx                    # Landing page
│   ├── page1/                      # Scene 1 page
│   │   └── page.tsx
│   ├── page2/                      # Scene 2 page
│   │   └── page.tsx
│   └── page3/                      # Scene 3 page
│       └── page.tsx
├── components/
│   └── scenes/
│       ├── Scene1.tsx              # 3D component (hook point for vision/affect cues)
│       ├── Scene2.tsx
│       └── Scene3.tsx
└── styles/
    ├── page1.module.css
    ├── page2.module.css
    └── page3.module.css
```

## Available Scripts

- `npm run dev` — Start development server
- `npm run build` — Build for production
- `npm run start` — Start production server
- `npm run lint` — Run ESLint

## Objectives

- Demonstrate real-time, offline emotional intelligence modeling on Snapdragon hardware.
- Develop an accessible and inclusive platform for emotional learning in ASD.
- Showcase end-to-end multimodal AI (vision, text, voice) in an educational context.
- Provide a POC for future deployment on consumer-grade Qualcomm devices.

## Current Progress (Sprint 3)

- Completed initial front-end prototype (Gradio) and began Next.js migration.
- Researched prior hackathon codebase and interaction design.
- Ran preliminary LLM tests on Qualcomm developer hardware for latency/inference.
- Defined the integration plan linking emotion recognition to adaptive UI responses.

## Roadmap / Next Steps

- Migrate fully from Gradio to scalable React-based UI components.
- Deploy and benchmark on-device LLMs on Qualcomm boards for optimization.
- Integrate emotion recognition with UI event triggers and scenario generation.
- Implement analytics logging and begin internal user testing.

## Contributing

1. Create a feature branch from `main`.
2. Follow the existing code style and TypeScript patterns.
3. Add tests where feasible and run `npm run lint` before opening a PR.

## License

TBD. For internal Qualcomm prototyping and research use unless stated otherwise.

## Acknowledgments

This work builds on Qualcomm Technologies research and prior hackathon prototypes. Thanks to contributors working on vision, speech, and generative components, and to caregivers and educators advising on accessibility and inclusive design.

