'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import styles from '@/styles/story-reader.module.css';

const WHISPER_URL   = 'http://127.0.0.1:5051';
const EMOTION_URL   = 'http://127.0.0.1:5050/emotion';
const API_PROGRESS  = '/api/updateProgress';

async function updateProgress(payload: Record<string, unknown>) {
  try {
    await fetch(API_PROGRESS, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game: 'storyReader', ...payload }),
    });
  } catch { /* silent — offline */ }
}

// ── Stories ───────────────────────────────────────────────────────────────────
const STORIES = [
  {
    id: 'sun',
    title: 'The Sunny Day',
    emoji: '☀️',
    level: 'Beginner',
    color: '#fbbf24',
    text: 'The sun is up high. The sky is bright blue. A little bird flies by. It sings a sweet song. What a nice warm day!',
  },
  {
    id: 'cat',
    title: 'My Little Cat',
    emoji: '🐱',
    level: 'Beginner',
    color: '#fb923c',
    text: 'My cat is soft and small. She loves to sleep all day. She curls up in a warm ball. I pet her gently. She purrs and purrs away.',
  },
  {
    id: 'seed',
    title: 'The Little Seed',
    emoji: '🌱',
    level: 'Easy',
    color: '#4ade80',
    text: 'A tiny seed fell in the warm dark ground. Rain came down and made it wet. The bright sun gave it light. A small green shoot grew up. It became a tall bright flower.',
  },
  {
    id: 'bear',
    title: 'The Brave Bear',
    emoji: '🐻',
    level: 'Easy',
    color: '#a78bfa',
    text: 'A little bear walked through the green forest. He found sweet golden honey in a tree. He climbed high up to get it. Bees flew out and made him run away fast. But the brave bear smiled all the way home.',
  },
  {
    id: 'ocean',
    title: 'The Big Blue Ocean',
    emoji: '🌊',
    level: 'Medium',
    color: '#60a5fa',
    text: 'The big blue ocean is wide and deep. Waves crash loud upon the sandy shore. Colorful fish swim below the shiny surface. A red crab walks along the wet sand. Sea birds cry and circle high above.',
  },
];

// ── Types ─────────────────────────────────────────────────────────────────────
type Story = typeof STORIES[0];
type WordStatus = 'idle' | 'correct' | 'wrong';
type Phase = 'select' | 'playing' | 'complete';
type MicState = 'off' | 'listening' | 'recording' | 'processing';

interface Word {
  raw: string;   // display text including punctuation
  clean: string; // lowercased letters only for matching
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseWords(text: string): Word[] {
  return text
    .split(/\s+/)
    .map(w => ({ raw: w, clean: w.toLowerCase().replace(/[^a-z']/g, '') }))
    .filter(w => w.clean.length > 0);
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const d: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      d[i][j] =
        a[i - 1] === b[j - 1]
          ? d[i - 1][j - 1]
          : 1 + Math.min(d[i - 1][j], d[i][j - 1], d[i - 1][j - 1]);
    }
  }
  return d[m][n];
}

/** Check whether Whisper's transcription contains the expected word */
function wordMatches(transcription: string, expected: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');
  const e = norm(expected);
  if (!e) return false;
  const candidates = transcription.split(/\s+/).map(norm).filter(Boolean);
  return candidates.some(w => {
    if (w === e) return true;
    // Allow 1 edit for short words, 2 edits for longer words (mishearing tolerance)
    const maxDist = e.length <= 4 ? 1 : 2;
    if (levenshtein(w, e) <= maxDist) return true;
    // Also match if either string starts with the other (handles truncation)
    if (e.length >= 3 && (w.startsWith(e) || e.startsWith(w))) return true;
    return false;
  });
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function StoryReaderPage() {
  const [phase, setPhase] = useState<Phase>('select');
  const [story, setStory] = useState<Story>(STORIES[0]);
  const [words, setWords] = useState<Word[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [statuses, setStatuses] = useState<WordStatus[]>([]);
  const [micState, setMicState] = useState<MicState>('off');
  const [whisperOnline, setWhisperOnline] = useState<boolean | null>(null);
  const [micError, setMicError] = useState('');
  const [micVolume, setMicVolume] = useState(0); // 0–100 live volume level

  // Refs so async callbacks always see latest values without stale closures
  const currentIdxRef = useRef(0);
  const wordsRef = useRef<Word[]>([]);
  const phaseRef = useRef<Phase>('select');

  // Progress / emotion tracking refs
  const sessionStartRef  = useRef<number>(Date.now());
  const emotionTimeRef   = useRef<Record<string, number>>({});
  const lastEmotionRef   = useRef<string>('neutral');
  const correctWordsRef  = useRef<number>(0);

  // Audio refs
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const vadFrameRef = useRef<number>(0);
  const isRecordingRef = useRef(false);
  const speechActiveRef = useRef(false);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processingRef = useRef(false);

  // Keep refs in sync
  useEffect(() => { currentIdxRef.current = currentIdx; }, [currentIdx]);
  useEffect(() => { wordsRef.current = words; }, [words]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // ── Check Whisper server availability ──────────────────────────────────────
  useEffect(() => {
    fetch(`${WHISPER_URL}/status`, { signal: AbortSignal.timeout(2500) })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setWhisperOnline(d.ok === true))
      .catch(() => setWhisperOnline(false));
  }, []);

  // ── Global cleanup on unmount ──────────────────────────────────────────────
  useEffect(() => {
    return () => {
      cancelAnimationFrame(vadFrameRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (audioCtxRef.current?.state !== 'closed') audioCtxRef.current?.close();
    };
  }, []);

  // ── Emotion polling (every 2 s) ────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const r = await fetch(EMOTION_URL, { signal: AbortSignal.timeout(1500) });
        if (r.ok) {
          const d = await r.json();
          if (d.emotion) lastEmotionRef.current = d.emotion.toLowerCase();
        }
      } catch { /* server may not be running */ }
    }, 2000);
    return () => clearInterval(id);
  }, []);

  // ── Emotion time accumulation (every 1 s while playing) ───────────────────
  useEffect(() => {
    const id = setInterval(() => {
      if (phaseRef.current !== 'playing') return;
      const e = lastEmotionRef.current || 'neutral';
      emotionTimeRef.current[e] = (emotionTimeRef.current[e] || 0) + 1;
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // ── Save timePlayed + emotionTime on unmount ───────────────────────────────
  useEffect(() => {
    return () => {
      const elapsed = Math.round((Date.now() - sessionStartRef.current) / 1000);
      if (elapsed > 0) {
        updateProgress({ addTimePlayed: elapsed, addEmotionTime: emotionTimeRef.current });
      }
    };
  }, []);

  // ── Advance helper (mark current word correct and move forward) ────────────
  const advanceWord = useCallback((idx: number) => {
    setStatuses(prev => { const n = [...prev]; n[idx] = 'correct'; return n; });
    correctWordsRef.current += 1;
    const next = idx + 1;
    currentIdxRef.current = next;
    setCurrentIdx(next);
    if (next >= wordsRef.current.length) {
      // Save per-story completion stats
      updateProgress({
        addWins:  correctWordsRef.current,
        addScore: 1, // increment stories-completed counter
      });
      correctWordsRef.current = 0;
      setTimeout(() => setPhase('complete'), 700);
    }
  }, []);

  // ── Cleanup & stop audio ───────────────────────────────────────────────────
  const stopAudio = useCallback(() => {
    cancelAnimationFrame(vadFrameRef.current);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (audioCtxRef.current?.state !== 'closed') audioCtxRef.current?.close();
    streamRef.current = null;
    audioCtxRef.current = null;
    analyserRef.current = null;
    recorderRef.current = null;
    isRecordingRef.current = false;
    speechActiveRef.current = false;
    processingRef.current = false;
  }, []);

  // ── Start game ─────────────────────────────────────────────────────────────
  const startGame = useCallback((s: Story) => {
    stopAudio();

    // Reset per-round tracking
    sessionStartRef.current  = Date.now();
    emotionTimeRef.current   = {};
    correctWordsRef.current  = 0;

    const parsed = parseWords(s.text);
    setStory(s);
    setWords(parsed);
    wordsRef.current = parsed;
    setCurrentIdx(0);
    currentIdxRef.current = 0;
    setStatuses(new Array(parsed.length).fill('idle'));
    setMicError('');
    setPhase('playing');
    phaseRef.current = 'playing';

    // Init microphone + VAD + Whisper pipeline
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        streamRef.current = stream;

        const ctx = new AudioContext();
        audioCtxRef.current = ctx;

        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.65;
        source.connect(analyser);
        analyserRef.current = analyser;

        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm';

        const recorder = new MediaRecorder(stream, { mimeType });

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        // ── Handle finished recording → send to Whisper ──────────────────────
        recorder.onstop = async () => {
          if (processingRef.current || phaseRef.current !== 'playing') return;

          const blob = new Blob(chunksRef.current, { type: mimeType });
          // Ignore truly empty blobs (header-only with no audio data)
          if (blob.size < 100) {
            setMicState('listening');
            return;
          }

          processingRef.current = true;
          setMicState('processing');

          try {
            const form = new FormData();
            form.append('audio', blob, 'speech.webm');
            const res = await fetch(`${WHISPER_URL}/transcribe`, {
              method: 'POST',
              body: form,
              signal: AbortSignal.timeout(9000),
            });
            const data = await res.json();

            if (data.ok && data.text) {
              const idx = currentIdxRef.current;
              const ws = wordsRef.current;
              if (!ws[idx]) return;

              if (wordMatches(data.text, ws[idx].clean)) {
                // ✅ Correct
                advanceWord(idx);
              } else {
                // ❌ Wrong — shake red then reset
                setStatuses(prev => { const n = [...prev]; n[idx] = 'wrong'; return n; });
                setTimeout(() => {
                  setStatuses(prev => {
                    const n = [...prev];
                    if (n[idx] === 'wrong') n[idx] = 'idle';
                    return n;
                  });
                }, 800);
              }
            }
          } catch {
            // Whisper server offline or timed out — silent fail, user can tap word
          } finally {
            processingRef.current = false;
            setMicState('listening');
          }
        };

        recorderRef.current = recorder;
        setMicState('listening');

        // ── VAD loop ─────────────────────────────────────────────────────────
        // Use time-domain amplitude (values 0–255, silence = 128).
        // Deviation from 128 = actual sound energy — much more reliable than
        // frequency-domain RMS for detecting whether someone is speaking.
        const SPEECH_THRESHOLD = 8;   // deviation from 128 (very sensitive)
        const SILENCE_DELAY_MS = 900; // wait 900 ms of quiet before stopping

        function vadTick() {
          if (!analyserRef.current) return;

          const buf = new Uint8Array(analyserRef.current.fftSize);
          analyserRef.current.getByteTimeDomainData(buf);
          // RMS of deviation from midpoint (128 = silence on time-domain data)
          const rms = Math.sqrt(buf.reduce((s, v) => s + (v - 128) ** 2, 0) / buf.length);

          // Update live volume meter (scale RMS 0–30 → 0–100%)
          setMicVolume(Math.min(100, Math.round((rms / 30) * 100)));

          if (rms > SPEECH_THRESHOLD) {
            // Speech detected
            if (silenceTimerRef.current) {
              clearTimeout(silenceTimerRef.current);
              silenceTimerRef.current = null;
            }
            speechActiveRef.current = true;

            if (
              !isRecordingRef.current &&
              !processingRef.current &&
              recorderRef.current?.state === 'inactive'
            ) {
              chunksRef.current = [];
              recorderRef.current.start();
              isRecordingRef.current = true;
              setMicState('recording');
            }
          } else if (speechActiveRef.current && isRecordingRef.current) {
            // Silence after speech — start countdown to stop recording
            if (!silenceTimerRef.current) {
              silenceTimerRef.current = setTimeout(() => {
                silenceTimerRef.current = null;
                speechActiveRef.current = false;
                if (isRecordingRef.current && recorderRef.current?.state === 'recording') {
                  isRecordingRef.current = false;
                  recorderRef.current.stop();
                }
              }, SILENCE_DELAY_MS);
            }
          }

          vadFrameRef.current = requestAnimationFrame(vadTick);
        }

        vadFrameRef.current = requestAnimationFrame(vadTick);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        const isDenied = msg.includes('Permission') || msg.includes('NotAllowed') || msg.includes('denied');
        setMicError(
          isDenied
            ? '🎤 Microphone blocked — tap the glowing word to advance manually.'
            : '🎤 Could not access microphone — tap the glowing word to advance manually.'
        );
        setMicState('off');
      }
    })();
  }, [stopAudio, advanceWord]);

  // ── Skip current word ──────────────────────────────────────────────────────
  const skipWord = useCallback(() => {
    const idx = currentIdxRef.current;
    if (idx < wordsRef.current.length) advanceWord(idx);
  }, [advanceWord]);

  // ── Tap word (offline / mic-denied fallback) ───────────────────────────────
  const handleWordTap = useCallback((idx: number) => {
    if (idx !== currentIdxRef.current) return;
    // Only allow tap-advance when speech input isn't working
    if (micState === 'off' || whisperOnline === false) {
      advanceWord(idx);
    }
  }, [micState, whisperOnline, advanceWord]);

  // ── Select Screen ──────────────────────────────────────────────────────────
  if (phase === 'select') {
    return (
      <div className={styles.container}>
        <div className={styles.selectScreen}>
          <Link href="/page4" className={styles.backLink}>← Back to Games</Link>
          <h1 className={styles.selectTitle}>📖 Story Reader</h1>
          <p className={styles.selectSub}>Read each glowing word out loud as the story comes to life!</p>

          {whisperOnline === false && (
            <p className={styles.offlineNote}>
              ⚠️ Speech server offline — start the Whisper server or tap words to advance
            </p>
          )}

          <div className={styles.storyGrid}>
            {STORIES.map(s => (
              <button
                key={s.id}
                className={styles.storyCard}
                style={{ '--accent': s.color } as React.CSSProperties}
                onClick={() => startGame(s)}
              >
                <span className={styles.storyEmoji}>{s.emoji}</span>
                <h2 className={styles.storyName}>{s.title}</h2>
                <span className={styles.levelTag}>{s.level}</span>
                <p className={styles.storySnippet}>&ldquo;{s.text.slice(0, 58)}…&rdquo;</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Complete Screen ────────────────────────────────────────────────────────
  if (phase === 'complete') {
    return (
      <div className={styles.container}>
        <div className={styles.completeScreen}>
          <div className={styles.confetti}>🎉</div>
          <h1 className={styles.completeTitle}>Amazing job!</h1>
          <p className={styles.completeStoryName}>
            You finished &ldquo;{story.title}&rdquo; {story.emoji}
          </p>
          <div className={styles.completeStat}>
            <span className={styles.completeStatNum}>{words.length}</span>
            <span className={styles.completeStatLabel}>words read</span>
          </div>
          <div className={styles.completeButtons}>
            <button className={styles.btnPrimary} onClick={() => startGame(story)}>
              Read Again
            </button>
            <button className={styles.btnSecondary} onClick={() => { stopAudio(); setPhase('select'); }}>
              Pick a Story
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Playing Screen ─────────────────────────────────────────────────────────
  const pct = words.length > 0 ? (currentIdx / words.length) * 100 : 0;

  const micLabel =
    micState === 'off'        ? 'Tap word to advance' :
    micState === 'listening'  ? 'Listening…'          :
    micState === 'recording'  ? 'Hearing you…'        :
                                'Thinking…';

  return (
    <div className={styles.container}>
      <header className={styles.gameHeader}>
        <button
          className={styles.smallBtn}
          onClick={() => { stopAudio(); setPhase('select'); setMicState('off'); }}
        >
          ← Back
        </button>
        <span className={styles.gameTitle}>{story.emoji} {story.title}</span>
        <button className={styles.smallBtn} onClick={skipWord}>
          Skip Word
        </button>
      </header>

      <div className={styles.progressBar}>
        <div
          className={styles.progressFill}
          style={{ width: `${pct}%`, backgroundColor: story.color }}
        />
      </div>

      {(whisperOnline === false || micError) && (
        <div className={styles.banner}>
          {micError || '⚠️ Speech server offline — tap the glowing word to advance'}
        </div>
      )}

      {/* Story display — all words visible, current one glowing */}
      <div className={styles.bookPage}>
        <p className={styles.storyText}>
          {words.map((word, idx) => (
            <span
              key={idx}
              onClick={() => handleWordTap(idx)}
              className={[
                styles.word,
                idx === currentIdx          ? styles.wordActive  : '',
                statuses[idx] === 'correct' ? styles.wordCorrect : '',
                statuses[idx] === 'wrong'   ? styles.wordWrong   : '',
              ].filter(Boolean).join(' ')}
            >
              {word.raw}{' '}
            </span>
          ))}
        </p>
      </div>

      {/* Mic status bar */}
      <div className={styles.micBar}>
        <div className={[
          styles.micPill,
          micState === 'recording'  ? styles.micRecording  : '',
          micState === 'processing' ? styles.micProcessing : '',
        ].filter(Boolean).join(' ')}>
          <span className={styles.micDot} />
          <span>{micLabel}</span>
        </div>
        {/* Live volume meter — shows green bar growing with mic input */}
        {micState !== 'off' && micState !== 'processing' && (
          <div className={styles.volumeMeter}>
            <div
              className={styles.volumeFill}
              style={{ width: `${micVolume}%`, backgroundColor: micVolume > 60 ? '#4ade80' : micVolume > 20 ? '#fbbf24' : '#94a3b8' }}
            />
          </div>
        )}
        <span className={styles.wordCount}>{currentIdx} / {words.length} words</span>
      </div>
    </div>
  );
}
