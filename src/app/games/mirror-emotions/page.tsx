'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from '@/styles/mirror-emotions.module.css';

const emotions = [
  { name: 'Happy', emoji: '😊', color: '#ffd700' },
  { name: 'Sad', emoji: '😢', color: '#4a90e2' },
  { name: 'Angry', emoji: '😠', color: '#ff4444' },
  { name: 'Surprised', emoji: '😮', color: '#ff8c42' },
  { name: 'Calm', emoji: '😌', color: '#98fb98' },
  { name: 'Excited', emoji: '🤩', color: '#ff6b9d' },
];

export default function MirrorEmotionsPage() {
  const [targetEmotion, setTargetEmotion] = useState<typeof emotions[0] | null>(null);
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(true);

  useEffect(() => {
    startNewRound();
    const savedScore = localStorage.getItem('mirrorEmotionsScore');
    if (savedScore) setScore(parseInt(savedScore));
  }, []);

  const startNewRound = () => {
    const randomEmotion = emotions[Math.floor(Math.random() * emotions.length)];
    setTargetEmotion(randomEmotion);
    setSelectedEmotion(null);
    setFeedback(null);
  };

  const handleEmotionSelect = (emotionName: string) => {
    if (!targetEmotion) return;
    
    setSelectedEmotion(emotionName);
    
    if (emotionName === targetEmotion.name) {
      setFeedback('Correct! Great job! 🎉');
      setScore(score + 10);
      localStorage.setItem('mirrorEmotionsScore', String(score + 10));
      setTimeout(() => {
        setRound(round + 1);
        startNewRound();
      }, 1500);
    } else {
      setFeedback(`Try again! The target was ${targetEmotion.name}`);
      setTimeout(() => {
        setSelectedEmotion(null);
        setFeedback(null);
      }, 2000);
    }
  };

  const resetGame = () => {
    setScore(0);
    setRound(1);
    setSelectedEmotion(null);
    setFeedback(null);
    localStorage.removeItem('mirrorEmotionsScore');
    startNewRound();
  };

  if (showInstructions) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <Link href="/games" className={styles.backButton}>← Back to Games</Link>
          <h1 className={styles.title}>Mirror Emotions</h1>
        </div>
        <div className={styles.instructionsCard}>
          <h2>How to Play</h2>
          <ol>
            <li>Look at the target emotion shown</li>
            <li>Try to match that emotion with your facial expression</li>
            <li>Select the emotion you think matches</li>
            <li>Get points for correct matches!</li>
          </ol>
          <button onClick={() => setShowInstructions(false)} className={styles.startButton}>
            Start Playing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href="/games" className={styles.backButton}>← Back to Games</Link>
        <h1 className={styles.title}>Mirror Emotions</h1>
      </div>

      <div className={styles.gameContainer}>
        <div className={styles.statsBar}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Score</span>
            <span className={styles.statValue}>{score}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Round</span>
            <span className={styles.statValue}>{round}</span>
          </div>
        </div>

        <div className={styles.targetSection}>
          <h2 className={styles.sectionTitle}>Match This Emotion:</h2>
          {targetEmotion && (
            <div 
              className={styles.targetEmotion}
              style={{ borderColor: targetEmotion.color }}
            >
              <span className={styles.targetEmoji}>{targetEmotion.emoji}</span>
              <span className={styles.targetName}>{targetEmotion.name}</span>
            </div>
          )}
        </div>

        <div className={styles.emotionsGrid}>
          <h3 className={styles.chooseTitle}>Choose the matching emotion:</h3>
          <div className={styles.emotionsList}>
            {emotions.map((emotion) => (
              <button
                key={emotion.name}
                className={`${styles.emotionButton} ${
                  selectedEmotion === emotion.name ? styles.selected : ''
                } ${
                  selectedEmotion && emotion.name === targetEmotion?.name ? styles.correct : ''
                }`}
                onClick={() => handleEmotionSelect(emotion.name)}
                disabled={!!selectedEmotion}
                style={{
                  borderColor: emotion.color,
                  backgroundColor: selectedEmotion === emotion.name 
                    ? `${emotion.color}20` 
                    : 'transparent'
                }}
              >
                <span className={styles.emotionEmoji}>{emotion.emoji}</span>
                <span className={styles.emotionLabel}>{emotion.name}</span>
              </button>
            ))}
          </div>
        </div>

        {feedback && (
          <div className={`${styles.feedback} ${
            feedback.includes('Correct') ? styles.feedbackCorrect : styles.feedbackWrong
          }`}>
            {feedback}
          </div>
        )}

        <button onClick={resetGame} className={styles.resetButton}>
          Reset Game
        </button>
      </div>
    </div>
  );
}
