"use client";

import { useEffect, useState, useCallback } from "react";
import styles from "@/styles/emotion-monitor.module.css";

// ── Types ─────────────────────────────────────────────────────────────────────
interface EmotionData {
  emotion: string;
  emotion_confidence: number;
  face_detected: boolean;
  eyes_open: boolean;
  looking_at_screen: boolean;
  blink_count: number;
  session_start: string | null;
  last_updated: string | null;
  emotion_history: { time: string; emotion: string }[];
  error: string | null;
  model_name?: string;
}

// ── Emotion → emoji map ───────────────────────────────────────────────────────
const EMOTION_EMOJI: Record<string, string> = {
  happy: "😄",
  sad: "😢",
  angry: "😠",
  surprise: "😲",
  surprised: "😲",
  fear: "😨",
  disgust: "🤢",
  neutral: "😐",
  calm: "😌",
  confused: "😕",
  delight: "😁",
  joy: "🤩",
};

const EMOTION_COLOR: Record<string, string> = {
  happy: "#4ade80",
  delight: "#4ade80",
  joy: "#4ade80",
  sad: "#60a5fa",
  angry: "#f87171",
  surprise: "#fbbf24",
  surprised: "#fbbf24",
  fear: "#c084fc",
  disgust: "#a3e635",
  neutral: "#94a3b8",
  calm: "#67e8f9",
};

const SERVER = "http://127.0.0.1:5050";
const POLL_MS = 2000;

// ── Component ─────────────────────────────────────────────────────────────────
export default function EmotionMonitor() {
  const [data, setData] = useState<EmotionData | null>(null);
  const [serverUp, setServerUp] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [starting, setStarting] = useState(false);

  // Start tracker if not running
  const startTracker = useCallback(async () => {
    setStarting(true);
    try {
      await fetch(`${SERVER}/start`, { method: "POST" });
    } catch (_) { /* server offline */ }
    setStarting(false);
  }, []);

  const switchModel = async (model: "standard" | "enhanced") => {
    try {
      const res = await fetch(`${SERVER}/set_model`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model }),
      });
      if (res.ok) {
        // Poll immediately to update local state
        const pollRes = await fetch(`${SERVER}/emotion`);
        if (pollRes.ok) setData(await pollRes.json());
      }
    } catch (e) {
      console.error("Failed to switch model:", e);
    }
  };

  // Poll /emotion every POLL_MS
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const res = await fetch(`${SERVER}/emotion`, { signal: AbortSignal.timeout(1500) });
        if (res.ok) {
          const json: EmotionData = await res.json();
          setData(json);
          setServerUp(true);
        }
      } catch (_) {
        setServerUp(false);
      }
      timer = setTimeout(poll, POLL_MS);
    };

    // Check status first, auto-start if needed
    fetch(`${SERVER}/status`, { signal: AbortSignal.timeout(1500) })
      .then(r => r.json())
      .then(async (s) => {
        setServerUp(true);
        if (!s.running) await startTracker();
        poll();
      })
      .catch(() => {
        setServerUp(false);
        timer = setTimeout(poll, POLL_MS);
      });

    return () => clearTimeout(timer);
  }, [startTracker]);

  // ── Server offline state ────────────────────────────────────────────────────
  if (!serverUp) {
    return (
      <div className={styles.badge} title="Emotion monitor offline">
        <span className={styles.offlineDot} />
        <span className={styles.offlineLabel}>Emotion monitor offline</span>
      </div>
    );
  }

  const emotion = data?.emotion ?? "neutral";
  const emoji = EMOTION_EMOJI[emotion] ?? "😐";
  const color = EMOTION_COLOR[emotion] ?? "#94a3b8";
  const looking = data?.looking_at_screen ?? false;
  const faceFound = data?.face_detected ?? false;

  return (
    <div
      className={`${styles.wrapper} ${expanded ? styles.expanded : ""}`}
      style={{ "--accent": color } as React.CSSProperties}
    >
      {/* ── Collapsed pill ── */}
      <button
        className={styles.pill}
        onClick={() => setExpanded(v => !v)}
        title="Click to see emotion details"
      >
        <span className={styles.liveDot} />
        <span className={styles.emoji}>{faceFound ? emoji : "🚫"}</span>
        <span className={styles.label}>
          {faceFound ? emotion.charAt(0).toUpperCase() + emotion.slice(1) : "No face"}
        </span>
        {looking && <span className={styles.eyeIcon}>👁</span>}
      </button>

      {/* ── Expanded panel ── */}
      {expanded && (
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <span>Emotion Monitor</span>
            <button className={styles.closeBtn} onClick={() => setExpanded(false)}>✕</button>
          </div>

          <div className={styles.bigEmoji}>{faceFound ? emoji : "🚫"}</div>
          <div className={styles.bigLabel} style={{ color }}>
            {faceFound ? emotion.toUpperCase() : "NO FACE DETECTED"}
          </div>

          {data?.emotion_confidence ? (
            <div className={styles.confidence}>
              Confidence: {Math.round(data.emotion_confidence)}%
            </div>
          ) : null}

          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statIcon}>{data?.eyes_open ? "👁" : "😑"}</span>
              <span>{data?.eyes_open ? "Eyes open" : "Eyes closed"}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statIcon}>{looking ? "✅" : "❌"}</span>
              <span>{looking ? "Looking at screen" : "Not looking"}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statIcon}>😉</span>
              <span>Blinks: {data?.blink_count ?? 0}</span>
            </div>
            {data?.session_start && (
              <div className={styles.stat}>
                <span className={styles.statIcon}>🕐</span>
                <span>Session start: {data.session_start}</span>
              </div>
            )}
          </div>

          {/* Recent emotion history */}
          {data?.emotion_history && data.emotion_history.length > 0 && (
            <div className={styles.historySection}>
              <div className={styles.historyTitle}>Recent</div>
              <div className={styles.historyList}>
                {[...data.emotion_history].reverse().slice(0, 6).map((e, i) => (
                  <div key={i} className={styles.historyItem}>
                    <span>{EMOTION_EMOJI[e.emotion] ?? "😐"}</span>
                    <span style={{ color: EMOTION_COLOR[e.emotion] ?? "#94a3b8" }}>
                      {e.emotion}
                    </span>
                    <span className={styles.historyTime}>{e.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={styles.modelSelector}>
            <button
              className={`${styles.modelBtn} ${data?.model_name === 'standard' ? styles.activeModel : ''}`}
              onClick={() => switchModel('standard')}
              title="Optimized for speed"
            >
              Standard
            </button>
            <button
              className={`${styles.modelBtn} ${data?.model_name === 'enhanced' ? styles.activeModel : ''}`}
              onClick={() => switchModel('enhanced')}
              title="Optimized for accuracy"
            >
              Enhanced
            </button>
          </div>

          {data?.error === "lite_mode" && (
            <div className={styles.warning}>
              ⚠ Lite mode — install deps for real detection
            </div>
          )}
        </div>
      )}
    </div>
  );
}
