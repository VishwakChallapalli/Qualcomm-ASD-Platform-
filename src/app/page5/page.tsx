'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from '@/styles/page5.module.css';

const dailyLeaders = [
  { name: 'Avery', points: 1500 },
  { name: 'Kai', points: 1280 },
  { name: 'River', points: 1195 },
  { name: 'Nova', points: 1120 },
  { name: 'Skye', points: 980 },
];

const allTimeLeaders = [
  { name: 'Sol', points: 18450 },
  { name: 'Harper', points: 17620 },
  { name: 'Rowan', points: 16900 },
  { name: 'Ember', points: 15875 },
  { name: 'Atlas', points: 15240 },
];

const achievements = [
  {
    name: 'Cosmic Explorer',
    description: 'Complete 10 interactive journeys',
    progress: 0.35,
  },
  {
    name: 'Emotion Guide',
    description: 'Help your companion in 5 reflection sessions',
    progress: 0.6,
  },
  {
    name: 'Story Weaver',
    description: 'Create 3 custom narratives',
    progress: 0.15,
  },
  {
    name: 'Mindful Master',
    description: 'Finish 7 mindfulness mini-games',
    progress: 0.8,
  },
  {
    name: 'Team Captain',
    description: 'Collaborate with friends for 5 challenges',
    progress: 0.5,
  },
];

const avatarOptions = [
  { id: 1, name: 'Alex', baseColor: '#4a90e2', emoji: '🤖' },
  { id: 2, name: 'Sam', baseColor: '#ff6b9d', emoji: '🌟' },
  { id: 3, name: 'Jordan', baseColor: '#98fb98', emoji: '🦄' },
  { id: 4, name: 'Casey', baseColor: '#ffd700', emoji: '✨' },
  { id: 5, name: 'Riley', baseColor: '#ff8c42', emoji: '🚀' },
  { id: 6, name: 'Morgan', baseColor: '#9b59b6', emoji: '🎨' },
];

export default function Page5() {
  const [activeBoard, setActiveBoard] = useState<'daily' | 'allTime'>('daily');
  const [selectedAvatar, setSelectedAvatar] = useState<number | null>(null);
  const [avatarColor, setAvatarColor] = useState<string>('#4a90e2');
  const [showExploreDropdown, setShowExploreDropdown] = useState(false);

  useEffect(() => {
    const savedAvatar = localStorage.getItem('selectedAvatar');
    const savedColor = localStorage.getItem('avatarColor');
    if (savedAvatar) {
      setSelectedAvatar(parseInt(savedAvatar, 10));
    }
    if (savedColor) {
      setAvatarColor(savedColor);
    }
  }, []);

  useEffect(() => {
    // Close dropdown when clicking outside
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
    ? avatarOptions.find((option) => option.id === selectedAvatar)
    : null;

  const leaderboardEntries = activeBoard === 'daily' ? dailyLeaders : allTimeLeaders;

  return (
    <div className={styles.container}>
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
                  <h4 className={styles.dropdownSectionTitle}>Games</h4>
                  <Link 
                    href="/games" 
                    className={styles.dropdownItem}
                    onClick={() => setShowExploreDropdown(false)}
                  >
                    🎮 All Games
                  </Link>
                </div>
                <div className={styles.dropdownSection}>
                  <h4 className={styles.dropdownSectionTitle}>Learning</h4>
                  <Link href="/page4" className={styles.dropdownItem} onClick={() => setShowExploreDropdown(false)}>
                    📚 Courses
                  </Link>
                  <Link href="/page5" className={styles.dropdownItem} onClick={() => setShowExploreDropdown(false)}>
                    🏆 Achievements
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
          <Link href="/page4" className={styles.backLink}>
            ← Back to Dashboard
          </Link>
          <div className={styles.userDropdown}>
            <div
              className={styles.userAvatarSmall}
              style={{ backgroundColor: selectedAvatarData ? avatarColor : '#4a5568' }}
            >
              <span className={styles.userAvatarEmoji}>
                {selectedAvatarData ? selectedAvatarData.emoji : '👤'}
              </span>
            </div>
            <span className={styles.userName}>User</span>
          </div>
        </div>
      </div>

      <div className={styles.banner}>
        <div className={styles.bannerText}>
          <h1 className={styles.bannerTitle}>Achievements & Leaderboards</h1>
          <p className={styles.bannerSubtitle}>
            Track your progress, celebrate milestones, and climb the leaderboards with your companion.
          </p>
        </div>
        <div className={styles.bannerBadge}>🏅</div>
      </div>

      <div className={styles.contentLayout}>
        <section className={styles.leaderboardSection}>
          <div className={styles.leaderboardHeader}>
            <h2 className={styles.sectionTitle}>Leaderboard</h2>
            <div className={styles.toggleGroup}>
              <button
                className={`${styles.toggleButton} ${activeBoard === 'daily' ? styles.active : ''}`}
                onClick={() => setActiveBoard('daily')}
              >
                Daily
              </button>
              <button
                className={`${styles.toggleButton} ${activeBoard === 'allTime' ? styles.active : ''}`}
                onClick={() => setActiveBoard('allTime')}
              >
                All Time
              </button>
            </div>
          </div>

          <ul className={styles.leaderboardList}>
            {leaderboardEntries.map((entry, index) => (
              <li
                key={entry.name}
                className={`${styles.leaderRow} ${index === 0 ? styles.leaderFirst : ''}`}
              >
                <span className={styles.leaderRank}>{index + 1}</span>
                <div className={styles.leaderAvatar}>
                  <span>👤</span>
                </div>
                <div className={styles.leaderInfo}>
                  <span className={styles.leaderName}>{entry.name}</span>
                  <span className={styles.leaderPoints}>{entry.points.toLocaleString()} pts</span>
                </div>
              </li>
            ))}
          </ul>

          <div className={styles.calloutCard}>
            <h3 className={styles.calloutTitle}>How to earn points</h3>
            <p className={styles.calloutText}>
              Complete daily missions, help your avatar with emotion check-ins, and explore new stories.
              Bonus streaks unlock every 5 consecutive days!
            </p>
          </div>
        </section>

        <section className={styles.achievementsSection}>
          <h2 className={styles.sectionTitle}>Medals & Progress</h2>
          <div className={styles.achievementList}>
            {achievements.map((achievement) => (
              <div className={styles.achievementCard} key={achievement.name}>
                <div className={styles.achievementIcon}>🎖️</div>
                <div className={styles.achievementDetails}>
                  <div className={styles.achievementHeader}>
                    <h3 className={styles.achievementName}>{achievement.name}</h3>
                    <span className={styles.achievementPercent}>
                      {Math.round(achievement.progress * 100)}%
                    </span>
                  </div>
                  <p className={styles.achievementDescription}>{achievement.description}</p>
                  <div className={styles.progressTrack}>
                    <span className={styles.progressLabel}>0%</span>
                    <div className={styles.progressBar}>
                      <div
                        className={styles.progressFill}
                        style={{ width: `${achievement.progress * 100}%` }}
                      />
                    </div>
                    <span className={styles.progressLabel}>100%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.motivationCard}>
            <div className={styles.motivationIcon}>🚀</div>
            <div>
              <h3 className={styles.motivationTitle}>New Milestones Coming Soon</h3>
              <p className={styles.motivationText}>
                Earn limited-edition badges when you encourage a friend, share a story, or complete a full
                learning path with your companion.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
