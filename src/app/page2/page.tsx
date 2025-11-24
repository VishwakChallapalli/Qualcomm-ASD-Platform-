'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import styles from '@/styles/page2.module.css';

export default function Page2() {
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<number[]>([]);

  const colors = ['#00d4ff', '#ff6b9d', '#ffd700', '#98fb98'];
  const puzzleColors = useMemo(() =>
    [...colors, ...colors].sort(() => Math.random() - 0.5),
    []
  );

  const handleColorClick = (index: number) => {
    if (matchedPairs.includes(index)) return;

    if (selectedColor === null) {
      setSelectedColor(index.toString());
    } else {
      const selectedIndex = parseInt(selectedColor);
      if (puzzleColors[selectedIndex] === puzzleColors[index] && selectedIndex !== index) {
        setMatchedPairs([...matchedPairs, selectedIndex, index]);
      }
      setSelectedColor(null);
    }
  };

  return (
    <div className={styles.container}>
      {/* Left Section - Dashboard */}
      <div className={styles.leftSection}>
        <div className={styles.dashboardContent}>
          <h2 className={styles.welcomeTitle}>Welcome to the Learning Platform</h2>
          <Link href="/signup" className={styles.startButton}>
            Start the process here
          </Link>
        </div>
      </div>

      {/* Vertical Divider */}
      <div className={styles.divider}></div>

      {/* Right Section - Puzzle Game */}
      <div className={styles.rightSection}>
        <div className={styles.puzzleSection}>
          <h3 className={styles.puzzleTitle}>Color Match Puzzle</h3>
          <div className={styles.puzzleGrid}>
            {puzzleColors.map((color, index) => (
              <button
                key={index}
                className={`${styles.puzzlePiece} ${selectedColor === index.toString() ? styles.selected : ''
                  } ${matchedPairs.includes(index) ? styles.matched : ''}`}
                style={{
                  backgroundColor: matchedPairs.includes(index) || selectedColor === index.toString() ? color : '#2a2a3e',
                  borderColor: matchedPairs.includes(index) ? '#00d4ff' : 'rgba(255, 255, 255, 0.3)'
                }}
                onClick={() => handleColorClick(index)}
                disabled={matchedPairs.includes(index)}
              />
            ))}
          </div>
          {matchedPairs.length === puzzleColors.length && (
            <div className={styles.successMessage}>
              🎉 Great job! All matched!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
