'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from '@/styles/page5.module.css';
import EmotionMonitor from '@/components/EmotionMonitor';
import EmotionLineChart, { Session } from '@/components/EmotionLineChart';

const avatarOptions = [
  { id: 1, name: 'Alex', baseColor: '#4a90e2', emoji: '🤖' },
  { id: 2, name: 'Sam', baseColor: '#ff6b9d', emoji: '🌟' },
  { id: 3, name: 'Jordan', baseColor: '#98fb98', emoji: '🦄' },
  { id: 4, name: 'Casey', baseColor: '#ffd700', emoji: '✨' },
  { id: 5, name: 'Riley', baseColor: '#ff8c42', emoji: '🚀' },
  { id: 6, name: 'Morgan', baseColor: '#9b59b6', emoji: '🎨' },
];

interface GameStats {
  timePlayed: number;
  wins: number;
  score: number;
  emotionTime: Record<string, number>;
  sessions: Session[];
}

const EMOTION_CONFIG: Array<{ key: string; label: string; color: string; emoji: string }> = [
  { key: 'happy',     label: 'Happy',     color: '#fbbf24', emoji: '😊' },
  { key: 'neutral',   label: 'Neutral',   color: '#94a3b8', emoji: '😐' },
  { key: 'sad',       label: 'Sad',       color: '#60a5fa', emoji: '😢' },
  { key: 'angry',     label: 'Angry',     color: '#f87171', emoji: '😠' },
  { key: 'surprised', label: 'Surprised', color: '#fb923c', emoji: '😮' },
  { key: 'fearful',   label: 'Fearful',   color: '#a78bfa', emoji: '😨' },
  { key: 'disgusted', label: 'Disgusted', color: '#4ade80', emoji: '🤢' },
];

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

function emptyStats(): GameStats {
  return { timePlayed: 0, wins: 0, score: 0, emotionTime: {}, sessions: [] };
}

function parseStats(raw: Record<string, unknown> | undefined): GameStats {
  if (!raw) return emptyStats();
  return {
    timePlayed: (raw.timePlayed as number) || 0,
    wins:       (raw.wins as number)       || 0,
    score:      (raw.score as number)      || 0,
    emotionTime: (raw.emotionTime as Record<string, number>) || {},
    sessions:   (raw.sessions as Session[]) || [],
  };
}

export default function Page5() {
  const [selectedAvatar, setSelectedAvatar] = useState<number | null>(null);
  const [avatarColor, setAvatarColor] = useState<string>('#4a90e2');
  const [userName, setUserName] = useState<string>('User');
  const [showExploreDropdown, setShowExploreDropdown] = useState(false);
  const [selectedTrendGame, setSelectedTrendGame] = useState<string>('ticTacToe');

  const [ticTacToe, setTicTacToe]         = useState<GameStats>(emptyStats());
  const [mathGame, setMathGame]           = useState<GameStats>(emptyStats());
  const [mirrorEmotions, setMirrorEmotions] = useState<GameStats>(emptyStats());
  const [colorPattern, setColorPattern]   = useState<GameStats>(emptyStats());
  const [neonRhythm, setNeonRhythm]       = useState<GameStats>(emptyStats());
  const [astralJump, setAstralJump]       = useState<GameStats>(emptyStats());
  const [whatWouldYouDo, setWhatWouldYouDo] = useState<GameStats>(emptyStats());
  const [storyReader, setStoryReader]       = useState<GameStats>(emptyStats());

  useEffect(() => {
    async function loadAllData() {
      const meRes = await fetch('/api/me').catch(() => null);
      if (meRes?.ok) {
        const me = await meRes.json();
        if (me.avatarId)    setSelectedAvatar(me.avatarId);
        if (me.avatarColor) setAvatarColor(me.avatarColor);
        if (me.accountName) setUserName(me.accountName);
      }

      const progRes = await fetch('/api/progress').catch(() => null);
      if (progRes?.ok) {
        const prog = await progRes.json();
        if (prog.ticTacToe)     setTicTacToe(parseStats(prog.ticTacToe));
        if (prog.mathGame)      setMathGame(parseStats(prog.mathGame));
        if (prog.mirrorEmotions) setMirrorEmotions(parseStats(prog.mirrorEmotions));
        if (prog.colorPattern)  setColorPattern(parseStats(prog.colorPattern));
        if (prog.neonRhythm)    setNeonRhythm(parseStats(prog.neonRhythm));
        if (prog.astralJump)    setAstralJump(parseStats(prog.astralJump));
        if (prog.whatWouldYouDo) setWhatWouldYouDo(parseStats(prog.whatWouldYouDo));
        if (prog.storyReader)    setStoryReader(parseStats(prog.storyReader));
      }
    }
    loadAllData();
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

  const allStats = [ticTacToe, mathGame, mirrorEmotions, colorPattern, neonRhythm, astralJump, whatWouldYouDo, storyReader];
  const totalTimePlayed = allStats.reduce((sum, g) => sum + g.timePlayed, 0);
  const totalWins       = allStats.reduce((sum, g) => sum + g.wins, 0);

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
      scoreValue: ticTacToe.wins,
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
    {
      key: 'color-pattern',
      name: 'Color Patterns',
      emoji: '🎨',
      color: '#f59e0b',
      href: '/games/color-pattern-game',
      stats: colorPattern,
      winLabel: 'Patterns Solved',
      scoreLabel: 'High Score',
      scoreValue: colorPattern.score,
    },
    {
      key: 'neon-rhythm',
      name: 'Neon Rhythm',
      emoji: '⚡',
      color: '#4facfe',
      href: '/games/neon-rhythm',
      stats: neonRhythm,
      winLabel: 'Notes Hit',
      scoreLabel: 'High Score',
      scoreValue: neonRhythm.score,
    },
    {
      key: 'astral-jump',
      name: 'Astral Jump',
      emoji: '🚀',
      color: '#a855f7',
      href: '/games/astral-jump',
      stats: astralJump,
      winLabel: 'Runs Completed',
      scoreLabel: 'Best Distance',
      scoreValue: astralJump.score,
    },
    {
      key: 'what-would-you-do',
      name: 'What Would You Do?',
      emoji: '🤔',
      color: '#10b981',
      href: null,
      stats: whatWouldYouDo,
      winLabel: 'Correct Choices',
      scoreLabel: 'Total Score',
      scoreValue: whatWouldYouDo.score,
    },
    {
      key: 'story-reader',
      name: 'Story Reader',
      emoji: '📖',
      color: '#e0c3fc',
      href: '/games/story-reader',
      stats: storyReader,
      winLabel: 'Words Read Correctly',
      scoreLabel: 'Stories Completed',
      scoreValue: storyReader.score,
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
            Track how long you&apos;ve played each game and how many times you&apos;ve won.
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
            <p className={styles.summaryValue}>{allStats.filter(g => g.timePlayed > 0).length}</p>
            <p className={styles.summaryLabel}>Games Played</p>
          </div>
        </div>
      </div>

      {/* Emotion Trends */}
      {(() => {
        const gameKeyMap: Record<string, GameStats> = {
          ticTacToe, mathGame, mirrorEmotions, colorPattern,
          neonRhythm, astralJump, whatWouldYouDo, storyReader,
        };
        const gameLabels: Record<string, string> = {
          ticTacToe: 'Tic Tac Toe', mathGame: 'Math Game',
          mirrorEmotions: 'Mirror Emotions', colorPattern: 'Color Patterns',
          neonRhythm: 'Neon Rhythm', astralJump: 'Astral Jump',
          whatWouldYouDo: 'What Would You Do?', storyReader: 'Story Reader',
        };
        const playedGames = Object.keys(gameKeyMap).filter(k => gameKeyMap[k].timePlayed > 0);
        const trendSessions = gameKeyMap[selectedTrendGame]?.sessions ?? [];
        return (
          <div className={styles.trendsSection}>
            <div className={styles.trendsHeader}>
              <h2 className={styles.sectionTitle}>Emotion Trends</h2>
              <select
                className={styles.gameSelector}
                value={selectedTrendGame}
                onChange={(e) => setSelectedTrendGame(e.target.value)}
              >
                {Object.keys(gameKeyMap).map(k => (
                  <option key={k} value={k} disabled={!playedGames.includes(k)}>
                    {gameLabels[k]}{!playedGames.includes(k) ? ' (not played)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <EmotionLineChart sessions={trendSessions} />
          </div>
        );
      })()}

      {/* Game Cards */}
      <div className={styles.gamesSection}>
        <h2 className={styles.sectionTitle}>Game Breakdown</h2>
        <div className={styles.gameCards}>
          {games.map((game) => {
            const played = game.stats.timePlayed > 0;
            const emotionData = game.stats.emotionTime || {};
            const totalEmotionTime = EMOTION_CONFIG.reduce((sum, e) => sum + (emotionData[e.key] || 0), 0);

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
                  {game.href ? (
                    <Link href={game.href} className={styles.playLink} style={{ color: game.color, borderColor: game.color }}>
                      Play →
                    </Link>
                  ) : (
                    <span className={styles.comingSoonBadge}>Coming Soon</span>
                  )}
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

                {/* Emotion Breakdown — always visible */}
                <div className={styles.emotionSection}>
                  <p className={styles.emotionSectionTitle}>Emotion Breakdown</p>
                  {!played && (
                    <p className={styles.emotionNoData}>Play this game to see emotion data</p>
                  )}
                  {played && (
                    <div className={styles.emotionList}>
                      {EMOTION_CONFIG.map((cfg) => {
                        const seconds = emotionData[cfg.key] || 0;
                        const pct = totalEmotionTime > 0 ? Math.round((seconds / totalEmotionTime) * 100) : 0;
                        return (
                          <div key={cfg.key} className={styles.emotionRow}>
                            <span className={styles.emotionEmoji}>{cfg.emoji}</span>
                            <span className={styles.emotionLabel}>{cfg.label}</span>
                            <div className={styles.emotionBarTrack}>
                              <div
                                className={styles.emotionBarFill}
                                style={{ width: `${pct}%`, backgroundColor: cfg.color }}
                              />
                            </div>
                            <span className={styles.emotionTime}>{seconds > 0 ? formatTime(seconds) : '0s'}</span>
                            <span className={styles.emotionPct}>{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <EmotionMonitor />
    </div>
  );
}
