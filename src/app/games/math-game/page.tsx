'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from '@/styles/math-game.module.css';

type Operation = '+' | '-' | '*' | '/';

export default function MathGamePage() {
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [question, setQuestion] = useState({ num1: 0, num2: 0, operation: '+' as Operation, answer: 0 });
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    generateQuestion();
    const savedScore = localStorage.getItem('mathGameScore');
    const savedLevel = localStorage.getItem('mathGameLevel');
    if (savedScore) setScore(parseInt(savedScore));
    if (savedLevel) setLevel(parseInt(savedLevel));
  }, []);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      handleTimeUp();
    }
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
      case '+':
        answer = num1 + num2;
        break;
      case '-':
        answer = num1 - num2;
        break;
      case '*':
        answer = num1 * num2;
        break;
      case '/':
        num2 = Math.floor(Math.random() * 10) + 1;
        num1 = num2 * (Math.floor(Math.random() * 10) + 1);
        answer = num1 / num2;
        break;
    }

    setQuestion({ num1, num2, operation, answer });
    setUserAnswer('');
    setFeedback(null);
  };

  const handleSubmit = () => {
    const answer = parseFloat(userAnswer);
    if (answer === question.answer) {
      setFeedback('Correct! 🎉');
      setScore(score + 10);
      setStreak(streak + 1);
      if (streak >= 5 && level < 3) {
        setLevel(level + 1);
        setStreak(0);
      }
      localStorage.setItem('mathGameScore', String(score + 10));
      localStorage.setItem('mathGameLevel', String(level));
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
    setFeedback('Time\'s up! Starting new question...');
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
    localStorage.removeItem('mathGameScore');
    localStorage.removeItem('mathGameLevel');
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
        <Link href="/games" className={styles.backButton}>← Back to Games</Link>
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
