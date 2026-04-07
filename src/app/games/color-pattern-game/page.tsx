'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import styles from '@/styles/ColorPatternPage.module.css';
import Link from 'next/link';
import { sessionHeaders } from '@/lib/session';

type Color = 'red' | 'green' | 'yellow' | 'blue';

const EMOTION_SERVER = 'http://127.0.0.1:5050/emotion';

function updateProgress(payload: Record<string, unknown>) {
  fetch('/api/updateProgress', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...sessionHeaders() },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {});
}

interface Pattern {
    sequence: Color[];
    answer: Color[];
}

const COLORS: Color[] = ['red', 'green', 'yellow', 'blue'];

const COLOR_MAP = {
    red: '#EF4444',
    green: '#10B981',
    yellow: '#F59E0B',
    blue: '#3B82F6'
};

/**
 * Generates a clean repeating pattern.
 *
 * difficulty 0 → base unit of 2 colors, show 4, answer 1
 * difficulty 1 → base unit of 2 colors, show 4, answer 2
 * difficulty 2 → base unit of 3 colors, show 6, answer 2
 * difficulty 3+ → base unit of 3 colors, show 6, answer 3
 *
 * The sequence shown is always exactly 2 full repetitions of the base unit,
 * and the answer is the next M colors that continue that same unit.
 */
const generatePattern = (difficulty: number): Pattern => {
    const unitLength = difficulty < 2 ? 2 : 3;
    const answerLength = difficulty === 0 ? 1 : difficulty === 1 ? 2 : Math.min(difficulty, 3);
    const repetitions = 2;

    // Build a random base unit with no two adjacent duplicates
    const unit: Color[] = [];
    for (let i = 0; i < unitLength; i++) {
        let color: Color;
        do {
            color = COLORS[Math.floor(Math.random() * COLORS.length)];
        } while (color === unit[i - 1]);
        unit.push(color);
    }

    // sequence = unit repeated N times
    const sequence: Color[] = [];
    for (let i = 0; i < repetitions; i++) {
        sequence.push(...unit);
    }

    // answer = the next answerLength colors continuing the same unit
    const answer: Color[] = [];
    for (let i = 0; i < answerLength; i++) {
        answer.push(unit[i % unitLength]);
    }

    return { sequence, answer };
};

export default function ColorPatternGame() {
    const [difficulty, setDifficulty] = useState(0);
    const [pattern, setPattern] = useState<Pattern>(() => generatePattern(0));
    const [userAnswer, setUserAnswer] = useState<Color[]>([]);
    const [score, setScore] = useState(0);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showError, setShowError] = useState(false);

    const sessionStartRef = useRef<number>(Date.now());
    const emotionTimeRef = useRef<Record<string, number>>({});
    const lastEmotionRef = useRef<string>('neutral');

    // Emotion polling + time accumulation
    useEffect(() => {
        const emotionInterval = setInterval(async () => {
            try {
                const res = await fetch(EMOTION_SERVER, { signal: AbortSignal.timeout(1000) });
                if (res.ok) {
                    const data = await res.json();
                    lastEmotionRef.current = data.emotion || 'neutral';
                }
            } catch { /* emotion server unavailable */ }
        }, 2000);

        const accumInterval = setInterval(() => {
            const em = lastEmotionRef.current;
            emotionTimeRef.current[em] = (emotionTimeRef.current[em] || 0) + 1;
        }, 1000);

        return () => {
            clearInterval(emotionInterval);
            clearInterval(accumInterval);
        };
    }, []);

    // Save timePlayed + emotionTime on unmount
    useEffect(() => {
        sessionStartRef.current = Date.now();
        return () => {
            const elapsed = Math.floor((Date.now() - sessionStartRef.current) / 1000);
            const payload: Record<string, unknown> = { game: 'colorPattern' };
            if (elapsed > 0) payload.addTimePlayed = elapsed;
            if (Object.keys(emotionTimeRef.current).length > 0) {
                payload.addEmotionTime = { ...emotionTimeRef.current };
            }
            updateProgress(payload);
        };
    }, []);

    // Takes explicit difficulty arg to avoid stale closures in setTimeout
    const startNewPattern = useCallback((nextDifficulty: number) => {
        setPattern(generatePattern(nextDifficulty));
        setUserAnswer([]);
        setShowSuccess(false);
        setShowError(false);
    }, []);

    const handleColorClick = (color: Color) => {
        if (showSuccess || showError) return;

        const newAnswer = [...userAnswer, color];
        setUserAnswer(newAnswer);

        const isCorrectSoFar = pattern.answer
            .slice(0, newAnswer.length)
            .every((c, i) => c === newAnswer[i]);

        if (!isCorrectSoFar) {
            setShowError(true);
            setTimeout(() => {
                setUserAnswer([]);
                setShowError(false);
            }, 1000);
            return;
        }

        if (newAnswer.length === pattern.answer.length) {
            setShowSuccess(true);

            // Calculate next values now, before the timeout captures them
            const newScore = score + 1;
            const nextDifficulty = newScore % 3 === 0 ? difficulty + 1 : difficulty;

            setScore(newScore);
            setDifficulty(nextDifficulty);

            // Save to DB
            updateProgress({ game: 'colorPattern', addWins: 1, setScore: newScore, setLevel: nextDifficulty });

            setTimeout(() => {
                startNewPattern(nextDifficulty);
            }, 1500);
        }
    };

    return (
        <div className={styles.pageWrapper}>
            <div className={styles.container}>

                {/* Header */}
                <div className={styles.header}>
                    <Link href="/page4" className={styles.backButton}>← Back to Games</Link>
                    <h1 className={styles.title}>Color Pattern Game</h1>
                    <h1 className={styles.score}> Score: {score}</h1>

                </div>

                {/* Pattern Display */}
                <div className={styles.patternSection}>
                    <h2 className={styles.patternTitle}>What comes next?</h2>

                    <div className={styles.cardsRow}>
                        {pattern.sequence.map((color, index) => (
                            <div
                                key={index}
                                className={styles.card}
                                style={{
                                    backgroundColor: COLOR_MAP[color],
                                    animationDelay: `${index * 0.1}s`
                                }}
                            />
                        ))}

                        {userAnswer.map((color, index) => (
                            <div
                                key={`answer-${index}`}
                                className={styles.answerCard}
                                style={{ backgroundColor: COLOR_MAP[color] }}
                            />
                        ))}

                        {Array.from({ length: pattern.answer.length - userAnswer.length }).map((_, index) => (
                            <div key={`empty-${index}`} className={styles.emptyCard}>
                                ?
                            </div>
                        ))}
                    </div>
                </div>

                {/* Color Choices */}
                <div className={styles.choicesSection}>
                    <h3 className={styles.choicesTitle}>Pick the next color:</h3>

                    <div className={styles.choicesRow}>
                        {COLORS.map((color) => (
                            <button
                                key={color}
                                onClick={() => handleColorClick(color)}
                                disabled={showSuccess || showError}
                                className={styles.colorButton}
                                style={{ backgroundColor: COLOR_MAP[color] }}
                            />
                        ))}
                    </div>
                </div>

                {/* Success Overlay */}
                {showSuccess && (
                    <div className={`${styles.overlay} ${styles.successOverlay}`}>
                        🎉 Great Job! 🎉
                    </div>
                )}

                {/* Error Overlay */}
                {showError && (
                    <div className={`${styles.overlay} ${styles.errorOverlay}`}>
                        Try Again!
                    </div>
                )}
            </div>
        </div>
    );
}
