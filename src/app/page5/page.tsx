'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from '@/styles/page5.module.css';
import EmotionMonitor from '@/components/EmotionMonitor';

const avatarOptions = [
  { id: 1, name: 'Alex', baseColor: '#4a90e2', emoji: '🤖' },
  { id: 2, name: 'Sam', baseColor: '#ff6b9d', emoji: '🌟' },
  { id: 3, name: 'Jordan', baseColor: '#98fb98', emoji: '🦄' },
  { id: 4, name: 'Casey', baseColor: '#ffd700', emoji: '✨' },
  { id: 5, name: 'Riley', baseColor: '#ff8c42', emoji: '🚀' },
  { id: 6, name: 'Morgan', baseColor: '#9b59b6', emoji: '🎨' },
];

interface GameStats {
  timePlayed: number; // seconds
  wins: number;
  score: number;
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

export default function Page5() {
  const [selectedAvatar, setSelectedAvatar] = useState<number | null>(null);
  const [avatarColor, setAvatarColor] = useState<string>('#4a90e2');
  const [userName, setUserName] = useState<string>('User');
  const [showExploreDropdown, setShowExploreDropdown] = useState(false);

  const [ticTacToe, setTicTacToe] = useState<GameStats>({ timePlayed: 0, wins: 0, score: 0 });
  const [mathGame, setMathGame] = useState<GameStats>({ timePlayed: 0, wins: 0, score: 0 });
  const [mirrorEmotions, setMirrorEmotions] = useState<GameStats>({ timePlayed: 0, wins: 0, score: 0 });

  useEffect(() => {
    // Load user info from API
    async function getUserInfo() {
      const res = await fetch('/api/me');
      const data = await res.json();
      if (data.avatarId) setSelectedAvatar(data.avatarId);
      if (data.avatarColor) setAvatarColor(data.avatarColor);
      if (data.accountName) setUserName(data.accountName);
    }
    getUserInfo();

    // Load game stats from localStorage
    const tttScores = JSON.parse(localStorage.getItem('ticTacToeScores') || '{"player":0}');
    setTicTacToe({
      timePlayed: parseInt(localStorage.getItem('ticTacToeTimePlayed') || '0', 10),
      wins: parseInt(localStorage.getItem('ticTacToeWins') || '0', 10),
      score: tttScores.player || 0,
    });

    setMathGame({
      timePlayed: parseInt(localStorage.getItem('mathGameTimePlayed') || '0', 10),
      wins: parseInt(localStorage.getItem('mathGameWins') || '0', 10),
      score: parseInt(localStorage.getItem('mathGameScore') || '0', 10),
    });

    setMirrorEmotions({
      timePlayed: parseInt(localStorage.getItem('mirrorEmotionsTimePlayed') || '0', 10),
      wins: parseInt(localStorage.getItem('mirrorEmotionsWins') || '0', 10),
      score: parseInt(localStorage.getItem('mirrorEmotionsScore') || '0', 10),
    });
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(`.${styles.exploreDropdown}`)) {
        setShowExploreDropdown(false);
      }
    };
    if (showExploreDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExploreDropdown]);

  const selectedAvatarData = selectedAvatar
    ? avatarOptions.find((a) => a.id === selectedAvatar)
    : null;

  const totalTimePlayed = ticTacToe.timePlayed + mathGame.timePlayed + mirrorEmotions.timePlayed;
  const totalWins = ticTacToe.wins + mathGame.wins + mirrorEmotions.wins;

  const games = [
    {
      key: 'tic-tac-toe',
      name: 'Tic Tac Toe',
      emoji: '⭕',
      color: '#ff6b9d',
      href: '/games/tic-tac-toe',
      stats: ticTacToe,
      winLabel: 'Games Won',
      scoreLabel: 'Total Rounds',
      scoreValue: (ticTacToe.score + (JSON.parse(localStorage?.getItem('ticTacToeScores') || '{"ties":0}').ties || 0)),
    },
    {
      key: 'math-game',
      name: 'Math Game',
      emoji: '🔢',
      color: '#4a90e2',
      href: '/games/math-game',
      stats: mathGame,
      winLabel: 'Correct Answers',
      scoreLabel: 'Total Score',
      scoreValue: mathGame.score,
    },
    {
      key: 'mirror-emotions',
      name: 'Mirror Emotions',
      emoji: '🪞',
      color: '#98fb98',
      href: '/games/mirror-emotions',
      stats: mirrorEmotions,
      winLabel: 'Correct Matches',
      scoreLabel: 'Total Score',
      scoreValue: mirrorEmotions.score,
    },
  ];

  return (
    <div className={styles.container}>
      {/* Top Header */}
      <div className={styles.topHeader}>
        <div className={styles.headerLeft}>
          <div className={styles.exploreDropdown}>
            <button
              className={styles.exploreButton}
              onClick={() => setShowExploreDropdown(!showExploreDropdown)}
            >
              Explore ▼
            </button>
            {showExploreDropdown && (
              <div className={styles.dropdownMenu}>
                <div className={styles.dropdownSection}>
                  <h4 className={styles.dropdownSectionTitle}>Learning</h4>
                  <Link href="/page4" className={styles.dropdownItem} onClick={() => setShowExploreDropdown(false)}>
                    📚 Dashboard
                  </Link>
                </div>
              </div>
            )}
          </div>
          <div className={styles.searchContainer}>
            <span className={styles.searchIcon}>🔍</span>
            <input type="text" placeholder="Search" className={styles.searchInput} />
          </div>
        </div>
        <div className={styles.headerRight}>
          <Link href="/page4" className={styles.backLink}>← Back to Dashboard</Link>
          <div className={styles.userDropdown}>
            <div
              className={styles.userAvatarSmall}
              style={{ backgroundColor: selectedAvatarData ? avatarColor : '#4a5568' }}
            >
              <span className={styles.userAvatarEmoji}>
                {selectedAvatarData ? selectedAvatarData.emoji : '👤'}
              </span>
            </div>
            <span className={styles.userName}>{userName}</span>
          </div>
        </div>
      </div>

      {/* Banner */}
      <div className={styles.banner}>
        <div className={styles.bannerText}>
          <h1 className={styles.bannerTitle}>My Progress</h1>
          <p className={styles.bannerSubtitle}>
            Track how long you've played each game and how many times you've won.
          </p>
        </div>
        <div className={styles.bannerBadge}>📊</div>
      </div>

      {/* Summary Row */}
      <div className={styles.summaryRow}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryIcon}>⏱️</span>
          <div>
            <p className={styles.summaryValue}>{formatTime(totalTimePlayed)}</p>
            <p className={styles.summaryLabel}>Total Time Played</p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryIcon}>🏆</span>
          <div>
            <p className={styles.summaryValue}>{totalWins}</p>
            <p className={styles.summaryLabel}>Total Wins</p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryIcon}>🎮</span>
          <div>
            <p className={styles.summaryValue}>{games.filter(g => g.stats.timePlayed > 0).length}</p>
            <p className={styles.summaryLabel}>Games Played</p>
          </div>
        </div>
      </div>

      {/* Game Cards */}
      <div className={styles.gamesSection}>
        <h2 className={styles.sectionTitle}>Game Breakdown</h2>
        <div className={styles.gameCards}>
          {games.map((game) => {
            const played = game.stats.timePlayed > 0;
            return (
              <div key={game.key} className={styles.gameCard} style={{ borderTopColor: game.color }}>
                <div className={styles.gameCardHeader}>
                  <div className={styles.gameIconCircle} style={{ backgroundColor: `${game.color}20`, color: game.color }}>
                    <span>{game.emoji}</span>
                  </div>
                  <div className={styles.gameCardTitle}>
                    <h3 className={styles.gameName}>{game.name}</h3>
                    {!played && <span className={styles.notPlayedBadge}>Not played yet</span>}
                  </div>
                  <Link href={game.href} className={styles.playLink} style={{ color: game.color, borderColor: game.color }}>
                    Play →
                  </Link>
                </div>

                <div className={styles.gameStats}>
                  <div className={styles.statBlock}>
                    <span className={styles.statIcon}>⏱️</span>
                    <div>
                      <p className={styles.statValue}>{formatTime(game.stats.timePlayed)}</p>
                      <p className={styles.statLabel}>Time Played</p>
                    </div>
                  </div>
                  <div className={styles.statDivider} />
                  <div className={styles.statBlock}>
                    <span className={styles.statIcon}>🏆</span>
                    <div>
                      <p className={styles.statValue}>{game.stats.wins}</p>
                      <p className={styles.statLabel}>{game.winLabel}</p>
                    </div>
                  </div>
                  <div className={styles.statDivider} />
                  <div className={styles.statBlock}>
                    <span className={styles.statIcon}>⭐</span>
                    <div>
                      <p className={styles.statValue}>{game.scoreValue}</p>
                      <p className={styles.statLabel}>{game.scoreLabel}</p>
                    </div>
                  </div>
                </div>

                {/* Time bar */}
                {totalTimePlayed > 0 && (
                  <div className={styles.timeBarWrapper}>
                    <div className={styles.timeBarTrack}>
                      <div
                        className={styles.timeBarFill}
                        style={{
                          width: `${Math.round((game.stats.timePlayed / totalTimePlayed) * 100)}%`,
                          backgroundColor: game.color,
                        }}
                      />
                    </div>
                    <span className={styles.timeBarPct}>
                      {totalTimePlayed > 0
                        ? `${Math.round((game.stats.timePlayed / totalTimePlayed) * 100)}% of total`
                        : '—'}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <EmotionMonitor />
    </div>
  );
}
