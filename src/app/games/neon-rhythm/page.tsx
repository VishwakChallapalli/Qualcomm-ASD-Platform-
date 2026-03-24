'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import styles from '@/styles/neon-rhythm.module.css';

interface Note {
    id: number;
    angle: number;
    distance: number;
    speed: number;
}

const EMOTION_SERVER = "http://127.0.0.1:5050/emotion";

function updateProgress(payload: Record<string, unknown>) {
    fetch('/api/updateProgress', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
    }).catch(() => {});
}

export default function NeonRhythmPage() {
    const [score, setScore] = useState(0);
    const [health, setHealth] = useState(100);
    const [isPlaying, setIsPlaying] = useState(false);
    const [gameOver, setGameOver] = useState(false);
    const [showInstructions, setShowInstructions] = useState(true);
    const [notes, setNotes] = useState<Note[]>([]);
    const [emotion, setEmotion] = useState<string>("neutral");
    const [flowState, setFlowState] = useState<"Bored" | "Flow" | "Stressed">("Flow");

    const requestRef = useRef<number>(0);
    const lastNoteTime = useRef<number>(0);
    const noteIdCounter = useRef<number>(0);
    const gameConfig = useRef({
        spawnRate: 2000,
        baseSpeed: 2,
        hitZone: 200, // Distance from center
        tolerance: 20,
    });

    const sessionStartRef = useRef<number>(Date.now());
    const emotionTimeRef = useRef<Record<string, number>>({});
    const lastEmotionRef = useRef<string>("neutral");
    const hitsRef = useRef<number>(0);

    // ── Emotion Monitoring ──
    useEffect(() => {
        if (!isPlaying) return;

        const checkEmotion = async () => {
            try {
                const res = await fetch(EMOTION_SERVER, { signal: AbortSignal.timeout(1000) });
                if (res.ok) {
                    const data = await res.json();
                    const currentEmotion = data.emotion || "neutral";
                    setEmotion(currentEmotion);
                    lastEmotionRef.current = currentEmotion;

                    // Flow Logic Adaptation: Flow > Bored > Stressed
                    if (["angry", "fear", "disgust"].includes(currentEmotion)) {
                        setFlowState("Stressed");
                        gameConfig.current.spawnRate = 3000;
                        gameConfig.current.baseSpeed = 1.5;
                    } else if (["sad", "neutral", "calm"].includes(currentEmotion)) {
                        setFlowState("Bored");
                        gameConfig.current.spawnRate = 1800;
                        gameConfig.current.baseSpeed = 2.2;
                    } else {
                        setFlowState("Flow");
                        gameConfig.current.spawnRate = 1000;
                        gameConfig.current.baseSpeed = 3.5;
                    }
                }
            } catch (e) {
                console.log("Emotion server unavailable");
            }
        };

        const emotionInterval = setInterval(checkEmotion, 3000);

        const accumInterval = setInterval(() => {
            const em = lastEmotionRef.current;
            emotionTimeRef.current[em] = (emotionTimeRef.current[em] || 0) + 1;
        }, 1000);

        return () => {
            clearInterval(emotionInterval);
            clearInterval(accumInterval);
        };
    }, [isPlaying]);

    // ── Game Loop ──
    const update = useCallback((time: number) => {
        if (gameOver) return;

        // Spawn notes
        if (time - lastNoteTime.current > gameConfig.current.spawnRate) {
            const newNote: Note = {
                id: noteIdCounter.current++,
                angle: Math.random() * Math.PI * 2,
                distance: 400, // Start far away
                speed: gameConfig.current.baseSpeed,
            };
            setNotes(prev => [...prev, newNote]);
            lastNoteTime.current = time;
        }

        // Move notes
        setNotes(prev => {
            const updated = prev
                .map(note => ({ ...note, distance: note.distance - note.speed }))
                .filter(note => note.distance > -20); // Remove if passed center

            // Check for missed notes
            const missedCount = prev.length - updated.length;
            if (missedCount > 0) {
                // Only deduct health if the note actually passed the hit zone significantly
                // actually any note that exits the updated array was 'missed' if it wasn't hit
                setHealth(h => {
                    const newHealth = Math.max(0, h - (10 * missedCount));
                    if (newHealth <= 0) setGameOver(true);
                    return newHealth;
                });
            }

            return updated;
        });

        requestRef.current = requestAnimationFrame(update);
    }, [gameOver]);

    useEffect(() => {
        if (isPlaying) {
            requestRef.current = requestAnimationFrame(update);
        } else {
            cancelAnimationFrame(requestRef.current);
        }
        return () => cancelAnimationFrame(requestRef.current);
    }, [isPlaying, update]);

    // Save score + hits on game over
    useEffect(() => {
        if (!gameOver) return;
        updateProgress({
            game: 'neonRhythm',
            setScore: score,
            addWins: hitsRef.current,
            addEmotionTime: { ...emotionTimeRef.current },
        });
    // score is captured at game-over; intentionally not in deps to avoid double-save
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameOver]);

    // Save timePlayed on unmount
    useEffect(() => {
        sessionStartRef.current = Date.now();
        return () => {
            const elapsed = Math.floor((Date.now() - sessionStartRef.current) / 1000);
            if (elapsed > 0) updateProgress({ game: 'neonRhythm', addTimePlayed: elapsed });
        };
    }, []);

    const handleInput = useCallback((e: React.KeyboardEvent | React.MouseEvent) => {
        if (!isPlaying) return;

        // Find note closest to hit zone
        setNotes(prev => {
            let hit = false;
            const nextNotes = prev.filter(note => {
                const dist = Math.abs(note.distance - gameConfig.current.hitZone);
                if (!hit && dist < gameConfig.current.tolerance) {
                    setScore(s => s + 100);
                    hitsRef.current += 1;
                    hit = true;
                    return false; // Remove note
                }
                return true;
            });
            return nextNotes;
        });
    }, [isPlaying]);

    const startGame = () => {
        setScore(0);
        setHealth(100);
        setGameOver(false);
        setNotes([]);
        hitsRef.current = 0;
        emotionTimeRef.current = {};
        setIsPlaying(true);
        setShowInstructions(false);
    };

    const getFlowColor = () => {
        if (flowState === "Stressed") return "#f87171";
        if (flowState === "Bored") return "#fbbf24";
        return "#4facfe";
    };

    return (
        <div className={styles.container} onMouseDown={handleInput} tabIndex={0} onKeyDown={handleInput}>
            <header className={styles.header}>
                <Link href="/page4" className={styles.backButton}>← Back</Link>
                <h1 className={styles.title}>Neon Rhythm</h1>
                <div className={styles.statsBar}>
                    <div className={styles.stat}>
                        <span className={styles.statLabel}>Health</span>
                        <div className={styles.healthContainer}>
                            <div className={styles.healthFill} style={{ width: `${health}%` }} />
                        </div>
                    </div>
                    <div className={styles.stat}>
                        <span className={styles.statLabel}>Score</span>
                        <span className={styles.statValue}>{score}</span>
                    </div>
                </div>
            </header>

            <div className={styles.emotionStatus}>
                <div className={styles.emotionDot} style={{ backgroundColor: getFlowColor() }} />
                <span className={styles.flowLabel}>{flowState.toUpperCase()} MODE</span>
                <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>({emotion})</span>
            </div>

            <main className={styles.gameArea}>
                {/* Target hit ring */}
                <div className={`${styles.targetRing} ${styles.activeRing}`} />

                {/* Center hub */}
                <div className={styles.center}>
                    {flowState === "Bored" ? "⚡" : flowState === "Stressed" ? "🧘" : "✨"}
                </div>

                {/* Dynamic Notes */}
                {notes.map(note => {
                    const x = Math.cos(note.angle) * note.distance;
                    const y = Math.sin(note.angle) * note.distance;
                    return (
                        <div
                            key={note.id}
                            className={styles.note}
                            style={{
                                transform: `translate(${x}px, ${y}px)`,
                                backgroundColor: getFlowColor(),
                                boxShadow: `0 0 15px ${getFlowColor()}`
                            }}
                        />
                    );
                })}
            </main>

            <div className={styles.instructions}>
                Click or press any key when the neon sparks hit the dashed circle!
            </div>

            {gameOver && (
                <div className={styles.gameOverOverlay}>
                    <h2 className={styles.modalTitle}>GAME OVER</h2>
                    <p className={styles.modalText}>Final Score: {score}</p>
                    <button className={styles.startButton} onClick={startGame}>
                        Try Again
                    </button>
                </div>
            )}

            {showInstructions && (
                <div className={styles.modal}>
                    <div className={styles.modalContent}>
                        <h2 className={styles.modalTitle}>Neon Rhythm</h2>
                        <p className={styles.modalText}>
                            A rhythm game that adapts to your mood.<br />
                            The game will speed up if you're bored and slow down if you're stressed.<br />
                            <strong>Stay in Flow!</strong>
                        </p>
                        <button className={styles.startButton} onClick={startGame}>
                            Start Playing
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
