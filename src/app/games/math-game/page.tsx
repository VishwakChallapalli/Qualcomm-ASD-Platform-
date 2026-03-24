'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import styles from '@/styles/math-game.module.css';

type Operation = '+' | '-' | '*' | '/';

const EMOTION_SERVER = 'http://127.0.0.1:5050/emotion';

function updateProgress(payload: Record<string, unknown>) {
  fetch('/api/updateProgress', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {});
}

export default function MathGamePage() {
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [question, setQuestion] = useState({ num1: 0, num2: 0, operation: '+' as Operation, answer: 0 });
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const sessionStartRef = useRef<number>(Date.now());
  const emotionTimeRef = useRef<Record<string, number>>({});
  const lastEmotionRef = useRef<string>('neutral');

  useEffect(() => {
    generateQuestion();

    // Load saved score & level from DB
    fetch('/api/progress')
      .then((r) => r.json())
      .then((data) => {
        if (data.mathGame) {
          if (data.mathGame.score) setScore(data.mathGame.score);
          if (data.mathGame.level) setLevel(data.mathGame.level);
        }
      })
      .catch(() => {});

    sessionStartRef.current = Date.now();

    return () => {
      const elapsed = Math.floor((Date.now() - sessionStartRef.current) / 1000);
      const payload: Record<string, unknown> = { game: 'mathGame' };
      if (elapsed > 0) payload.addTimePlayed = elapsed;
      if (Object.keys(emotionTimeRef.current).length > 0) {
        payload.addEmotionTime = { ...emotionTimeRef.current };
      }
      if (elapsed > 0 || Object.keys(emotionTimeRef.current).length > 0) {
        updateProgress(payload);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      handleTimeUp();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  const generateQuestion = () => {
    let num1: number, num2: number, operation: Operation, answer: number;

    if (level === 1) {
      operation = Math.random() > 0.5 ? '+' : '-';
      num1 = Math.floor(Math.random() * 20) + 1;
      num2 = Math.floor(Math.random() * 20) + 1;
    } else if (level === 2) {
      operation = Math.random() > 0.5 ? '+' : '-';
      num1 = Math.floor(Math.random() * 50) + 10;
      num2 = Math.floor(Math.random() * 50) + 10;
    } else {
      const ops: Operation[] = ['+', '-', '*'];
      operation = ops[Math.floor(Math.random() * ops.length)];
      num1 = Math.floor(Math.random() * 20) + 1;
      num2 = Math.floor(Math.random() * 20) + 1;
    }

    switch (operation) {
      case '+': answer = num1 + num2; break;
      case '-': answer = num1 - num2; break;
      case '*': answer = num1 * num2; break;
      case '/':
        num2 = Math.floor(Math.random() * 10) + 1;
        num1 = num2 * (Math.floor(Math.random() * 10) + 1);
        answer = num1 / num2;
        break;
      default: answer = 0;
    }

    setQuestion({ num1, num2, operation, answer });
    setUserAnswer('');
    setFeedback(null);
  };

  const handleSubmit = () => {
    const answer = parseFloat(userAnswer);
    if (answer === question.answer) {
      const newScore = score + 10;
      const newStreak = streak + 1;
      let newLevel = level;
      if (newStreak >= 5 && level < 3) {
        newLevel = level + 1;
        setStreak(0);
      } else {
        setStreak(newStreak);
      }
      setScore(newScore);
      setLevel(newLevel);
      setFeedback('Correct! 🎉');

      // Save to DB
      updateProgress({ game: 'mathGame', addWins: 1, setScore: newScore, setLevel: newLevel });

      setTimeout(() => {
        generateQuestion();
        setTimeLeft(30);
      }, 1000);
    } else {
      setFeedback(`Wrong! The answer is ${question.answer}`);
      setStreak(0);
      setTimeout(() => {
        generateQuestion();
        setTimeLeft(30);
      }, 2000);
    }
  };

  const handleTimeUp = () => {
    setFeedback("Time's up! Starting new question...");
    setTimeout(() => {
      generateQuestion();
      setTimeLeft(30);
    }, 2000);
  };

  const resetGame = () => {
    setScore(0);
    setLevel(1);
    setStreak(0);
    setTimeLeft(30);
    generateQuestion();
  };

  const getOperationSymbol = (op: Operation) => {
    switch (op) {
      case '+': return '+';
      case '-': return '−';
      case '*': return '×';
      case '/': return '÷';
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href="/page4" className={styles.backButton}>← Back to Games</Link>
        <h1 className={styles.title}>Math Game</h1>
      </div>

      <div className={styles.gameContainer}>
        <div className={styles.statsPanel}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Score</div>
            <div className={styles.statValue}>{score}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Level</div>
            <div className={styles.statValue}>{level}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Streak</div>
            <div className={styles.statValue}>{streak}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Time</div>
            <div className={styles.statValue} style={{ color: timeLeft < 10 ? '#ff4d6d' : '#667eea' }}>
              {timeLeft}s
            </div>
          </div>
        </div>

        <div className={styles.questionPanel}>
          <div className={styles.questionCard}>
            <h2 className={styles.questionTitle}>Solve the problem:</h2>
            <div className={styles.question}>
              <span className={styles.number}>{question.num1}</span>
              <span className={styles.operator}>{getOperationSymbol(question.operation)}</span>
              <span className={styles.number}>{question.num2}</span>
              <span className={styles.equals}>=</span>
              <span className={styles.questionMark}>?</span>
            </div>

            <div className={styles.answerSection}>
              <input
                type="number"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                className={styles.answerInput}
                placeholder="Your answer"
                autoFocus
              />
              <button onClick={handleSubmit} className={styles.submitButton}>
                Submit
              </button>
            </div>

            {feedback && (
              <div className={`${styles.feedback} ${feedback.includes('Correct') ? styles.feedbackCorrect : styles.feedbackWrong}`}>
                {feedback}
              </div>
            )}
          </div>

          <button onClick={resetGame} className={styles.resetButton}>
            Reset Game
          </button>
        </div>
      </div>
    </div>
  );
}
