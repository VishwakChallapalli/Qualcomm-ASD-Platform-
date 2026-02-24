'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from '@/styles/games.module.css';
import EmotionMonitor from '@/components/EmotionMonitor';

// Avatar options to match what was selected
const avatarOptions = [
  { id: 1, name: 'Alex', baseColor: '#4a90e2', emoji: '🤖' },
  { id: 2, name: 'Sam', baseColor: '#ff6b9d', emoji: '🌟' },
  { id: 3, name: 'Jordan', baseColor: '#98fb98', emoji: '🦄' },
  { id: 4, name: 'Casey', baseColor: '#ffd700', emoji: '✨' },
  { id: 5, name: 'Riley', baseColor: '#ff8c42', emoji: '🚀' },
  { id: 6, name: 'Morgan', baseColor: '#9b59b6', emoji: '🎨' },
];

const gamesList = [
  {
    id: 1,
    name: 'Math Game',
    description: 'Practice math skills with fun interactive challenges',
    icon: '🔢',
    color: '#4a90e2',
  },
  {
    id: 2,
    name: 'Tic Tac Toe',
    description: 'Classic strategy game to challenge your thinking',
    icon: '⭕',
    color: '#ff6b9d',
  },
  {
    id: 3,
    name: 'Mirror Emotions',
    description: 'Practice matching emotions with your expressions',
    icon: '🪞',
    color: '#98fb98',
  },
];

export default function GamesPage() {
  const [selectedAvatar, setSelectedAvatar] = useState<number | null>(null);
  const [avatarColor, setAvatarColor] = useState<string>('#4a90e2');

  useEffect(() => {
    // Load selected avatar from localStorage
    const savedAvatar = localStorage.getItem('selectedAvatar');
    const savedColor = localStorage.getItem('avatarColor');
    if (savedAvatar) {
      setSelectedAvatar(parseInt(savedAvatar));
    }
    if (savedColor) {
      setAvatarColor(savedColor);
    }
  }, []);

  const selectedAvatarData = selectedAvatar 
    ? avatarOptions.find(a => a.id === selectedAvatar)
    : null;

  return (
    <div className={styles.container}>
      {/* Top Header Bar */}
      <div className={styles.topHeader}>
        <div className={styles.headerLeft}>
          <Link href="/page4" className={styles.backButton}>← Back</Link>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.userDropdown}>
            {selectedAvatarData ? (
              <div className={styles.userAvatarSmall} style={{ backgroundColor: avatarColor }}>
                <span className={styles.userAvatarEmoji}>{selectedAvatarData.emoji}</span>
              </div>
            ) : (
              <div className={styles.userAvatarSmall}>
                <span className={styles.userAvatarEmoji}>👤</span>
              </div>
            )}
            <span className={styles.userName}>User</span>
          </div>
        </div>
      </div>

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Games</h1>
        <p className={styles.pageSubtitle}>Fun and engaging games to learn and practice</p>
      </div>

      {/* Games Grid */}
      <div className={styles.gamesContainer}>
        <div className={styles.gamesGrid}>
          {gamesList.map((game) => (
            <div key={game.id} className={styles.gameCard}>
              <div className={styles.gameIcon} style={{ backgroundColor: `${game.color}20`, color: game.color }}>
                <span className={styles.gameIconEmoji}>{game.icon}</span>
              </div>
              <div className={styles.gameContent}>
                <h3 className={styles.gameName}>{game.name}</h3>
                <p className={styles.gameDescription}>{game.description}</p>
                {game.id === 1 ? (
                  <Link 
                    href="/games/math-game" 
                    className={styles.playButton} 
                    style={{ borderColor: game.color, color: game.color }}
                  >
                    Play →
                  </Link>
                ) : game.id === 2 ? (
                  <Link 
                    href="/games/tic-tac-toe" 
                    className={styles.playButton} 
                    style={{ borderColor: game.color, color: game.color }}
                  >
                    Play →
                  </Link>
                ) : game.id === 3 ? (
                  <Link 
                    href="/games/mirror-emotions" 
                    className={styles.playButton} 
                    style={{ borderColor: game.color, color: game.color }}
                  >
                    Play →
                  </Link>
                ) : (
                  <button className={styles.playButton} style={{ borderColor: game.color, color: game.color }}>
                    Play →
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      <EmotionMonitor />
    </div>
  );
}
