'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, Stars, PerspectiveCamera, Float, Text } from '@react-three/drei';
import * as THREE from 'three';
import Link from 'next/link';
import styles from '@/styles/astral-jump.module.css';

const EMOTION_SERVER = "http://127.0.0.1:5050/emotion";

function updateProgress(payload: Record<string, unknown>) {
    fetch('/api/updateProgress', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
    }).catch(() => {});
}

// ── Game Logic Components ──

function Player({ jump, onCollide, posY }: { jump: boolean, onCollide: () => void, posY: number }) {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame(() => {
        if (meshRef.current) {
            meshRef.current.position.y = posY + 0.5;
        }
    });

    return (
        <Sphere ref={meshRef} args={[0.5, 32, 32]} position={[0, 0.5, 0]}>
            <meshStandardMaterial color="#a855f7" emissive="#6366f1" emissiveIntensity={2} />
        </Sphere>
    );
}

function Obstacle({ position, playerY, speed, onCollide }: { position: [number, number, number], playerY: number, speed: number, onCollide: () => void }) {
    const meshRef = useRef<THREE.Mesh>(null);
    const collided = useRef(false);

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.position.z += speed; // Move towards player

            // If passed player or reset
            if (meshRef.current.position.z > 5) {
                meshRef.current.position.z = -50 - Math.random() * 20;
                meshRef.current.position.x = (Math.random() - 0.5) * 4;
                collided.current = false; // Reset collision for this obstacle
            }

            // Collision detection
            // Player is at z=0, width/height ~0.8
            // Obstacle is 1x1x1
            if (!collided.current && Math.abs(meshRef.current.position.z) < 0.5) {
                // Check if player is NOT jumping high enough
                if (playerY < 0.5) {
                    onCollide();
                    collided.current = true;
                }
            }
        }
    });

    return (
        <mesh ref={meshRef} position={position}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#f43f5e" />
        </mesh>
    );
}

function Ground({ flowState }: { flowState: string }) {
    const color = flowState === 'Stressed' ? '#450a0a' : flowState === 'Bored' ? '#1e1b4b' : '#0f172a';
    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -20]}>
            <planeGeometry args={[10, 100]} />
            <meshStandardMaterial color={color} />
        </mesh>
    );
}

export default function AstralJumpPage() {
    const [score, setScore] = useState(0);
    const [health, setHealth] = useState(100);
    const [speedMultiplier, setSpeedMultiplier] = useState(1.0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [gameOver, setGameOver] = useState(false);
    const [jump, setJump] = useState(false);
    const [emotion, setEmotion] = useState("neutral");
    const [flowState, setFlowState] = useState("Flow");

    // Player Physics logic moved here to share with Obstacles
    const [posY, setPosY] = useState(0);
    const velocity = useRef(0);
    const gravity = -0.012;
    const jumpStrength = 0.25;

    const sessionStartRef = useRef<number>(Date.now());
    const emotionTimeRef = useRef<Record<string, number>>({});
    const lastEmotionRef = useRef<string>("neutral");

    useEffect(() => {
        if (!isPlaying || gameOver) return;

        let frameId: number;
        const physUpdate = () => {
            setJump(j => {
                if (j && posY === 0) {
                    velocity.current = jumpStrength;
                }
                return false; // Toggle off
            });

            velocity.current += gravity;
            setPosY(y => Math.max(0, y + velocity.current));
            frameId = requestAnimationFrame(physUpdate);
        };

        frameId = requestAnimationFrame(physUpdate);
        return () => cancelAnimationFrame(frameId);
    }, [isPlaying, gameOver, posY]);

    // ── Emotion Monitoring ──
    useEffect(() => {
        if (!isPlaying || gameOver) return;

        const emotionInterval = setInterval(async () => {
            try {
                const res = await fetch(EMOTION_SERVER);
                if (res.ok) {
                    const data = await res.json();
                    const em = data.emotion || 'neutral';
                    setEmotion(em);
                    lastEmotionRef.current = em;
                    if (['angry', 'fear'].includes(em)) setFlowState('Stressed');
                    else if (['neutral', 'sad'].includes(em)) setFlowState('Bored');
                    else setFlowState('Flow');
                }
            } catch (e) { }
        }, 2000);

        const accumInterval = setInterval(() => {
            const em = lastEmotionRef.current;
            emotionTimeRef.current[em] = (emotionTimeRef.current[em] || 0) + 1;
        }, 1000);

        return () => {
            clearInterval(emotionInterval);
            clearInterval(accumInterval);
        };
    }, [isPlaying, gameOver]);

    // Speed Progression
    useEffect(() => {
        if (!isPlaying || gameOver) return;
        const interval = setInterval(() => {
            setSpeedMultiplier(s => s + 0.005); // Balanced progression
        }, 1000);
        return () => clearInterval(interval);
    }, [isPlaying, gameOver]);

    // Flow Modifiers: Flow > Bored > Stressed
    const getSpeedMod = () => {
        if (flowState === "Stressed") return 0.8;
        if (flowState === "Bored") return 1.2;
        if (flowState === "Flow") return 1.6;
        return 1.0;
    };

    const currentSpeed = 0.15 * speedMultiplier * getSpeedMod();

    // Scoring
    useEffect(() => {
        if (!isPlaying || gameOver) return;
        const interval = setInterval(() => setScore(s => s + 1), 100);
        return () => clearInterval(interval);
    }, [isPlaying, gameOver]);

    // Save score + emotionTime on game over
    useEffect(() => {
        if (!gameOver) return;
        updateProgress({
            game: 'astralJump',
            setScore: score,
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
            if (elapsed > 0) updateProgress({ game: 'astralJump', addTimePlayed: elapsed });
        };
    }, []);

    const handleCollide = () => {
        setHealth(h => {
            const newHealth = Math.max(0, h - 20);
            if (newHealth <= 0) setGameOver(true);
            return newHealth;
        });
    };

    const startGame = () => {
        setScore(0);
        setHealth(100);
        setSpeedMultiplier(1.0);
        setGameOver(false);
        emotionTimeRef.current = {};
        setIsPlaying(true);
        setPosY(0);
        velocity.current = 0;
    };

    const handleKeyDown = (e: React.KeyboardEvent | React.MouseEvent) => {
        setJump(true);
    };

    return (
        <div className={styles.container} onMouseDown={handleKeyDown}>
            <div className={styles.canvasContainer}>
                <Canvas shadows={true}>
                    <PerspectiveCamera makeDefault position={[0, 3, 8]} fov={50} />
                    <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
                    <ambientLight intensity={0.5} />
                    <pointLight position={[10, 10, 10]} intensity={1} />

                    <Player jump={jump} onCollide={() => { }} posY={posY} />
                    <Ground flowState={flowState} />

                    <Obstacle position={[0, 0.5, -20]} playerY={posY} speed={currentSpeed} onCollide={handleCollide} />
                    <Obstacle position={[2, 0.5, -35]} playerY={posY} speed={currentSpeed} onCollide={handleCollide} />
                    <Obstacle position={[-2, 0.5, -50]} playerY={posY} speed={currentSpeed} onCollide={handleCollide} />

                    {flowState === 'Stressed' && <fog attach="fog" args={['#450a0a', 1, 15]} />}
                </Canvas>
            </div>

            <div className={styles.overlay}>
                <header className={styles.header}>
                    <Link href="/page4" className={styles.backButton}>← Back</Link>
                    <div className={styles.scoreBoard}>
                        <div className={styles.healthContainer}>
                            <div className={styles.healthFill} style={{ width: `${health}%` }} />
                        </div>
                        <span className={styles.scoreLabel}>Distance</span>
                        <span className={styles.scoreValue}>{score}m</span>
                    </div>
                </header>

                <div className={styles.emotionPill}>
                    <span className={styles.statusIcon}>{flowState === 'Stressed' ? '🌪️' : flowState === 'Bored' ? '💤' : '⚡'}</span>
                    <span className={styles.statusText}>{flowState.toUpperCase()} MODE</span>
                    <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>({emotion})</span>
                </div>

                <div className={styles.controlsHint}>Press SPACE or CLICK to Jump</div>
            </div>

            {!isPlaying && (
                <div className={styles.modal}>
                    <div className={styles.modalCard}>
                        <h1 className={styles.title}>Astral Jump</h1>
                        <p className={styles.description}>
                            Navigate the cosmic expanse. The universe reacts to your emotions.<br />
                            Stress brings shadows, boredom brings speed.
                        </p>
                        <button className={styles.startButton} onClick={startGame}>
                            Launch Mission
                        </button>
                    </div>
                </div>
            )}

            {gameOver && (
                <div className={styles.gameOver}>
                    <h1 className={styles.title}>GAME OVER</h1>
                    <p className={styles.description}>You traveled {score} meters before the void caught you.</p>
                    <button className={styles.startButton} onClick={startGame}>
                        Restart Mission
                    </button>
                </div>
            )}
        </div>
    );
}
