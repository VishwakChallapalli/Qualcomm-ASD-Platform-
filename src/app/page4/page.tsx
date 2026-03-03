'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from '@/styles/page4.module.css';
import EmotionMonitor from '@/components/EmotionMonitor';
import GamesPage from '../games/page';

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
  {
    id: 4,
    name: 'Color Patterns',
    description: 'Predict the next few colors!',
    icon: '🟥🟦',
    color: '#8845f5',
  },
  {
    id: 5,
    name: 'What Would You Do?', //SCENARIO SELECTION GAME
    description: 'Choose the best option',
    icon: '🗣️',
    color: '#45f2f5',
  },
];

export default function Page4() {
  const [selectedAvatar, setSelectedAvatar] = useState<number | null>(null);
  const [avatarColor, setAvatarColor] = useState<string>('#4a90e2');
  const [showExploreDropdown, setShowExploreDropdown] = useState(false);
  const [userName, setUserName] = useState<string>("User Name");

  useEffect(() => {
    // Load selected avatar from localStorage
    async function getUserInfo() {
      const res = await fetch("/api/me");
      const data = await res.json();
      const savedAvatar = data.avatarId;
      const savedColor = data.avatarColor;
      if (savedAvatar) {
        setSelectedAvatar(savedAvatar);
      }
      else {
        setSelectedAvatar(1);
      }
      if (savedColor) {
        setAvatarColor(savedColor);
      }
      else {
        setAvatarColor('#4a90e2');
      }
      const currentUserName = data.accountName;
      setUserName(currentUserName);
    }

    getUserInfo();
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
    ? avatarOptions.find(a => a.id === selectedAvatar)
    : null;

  const courseList = [
    'Content 1',
    'Content 2',
    'Content 3',
    'Content 4',
    'Content 5',
  ];

  return (
    <div className={styles.container}>
      {/* Top Header Bar */}
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
            <input
              type="text"
              placeholder="Search"
              className={styles.searchInput}
            />
          </div>
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

      {/* Streak and Level Bar */}
      <div className={styles.streakBar}>
        <span className={styles.streakText}>Start leveling up and building your weekly streak!</span>
        <div className={styles.streakInfo}>
          <span>0 week streak</span>
          <span className={styles.levelInfo}>Level 1 ⓘ</span>
          <div className={styles.progressBar}>
            <div className={styles.progressFill}>0/1 skill</div>
          </div>
        </div>
      </div>

      <div className={styles.mainLayout}>
        {/* Left Sidebar */}
        <div className={styles.sidebar}>
          <div className={styles.profileSection}>
            {selectedAvatarData ? (
              <div className={styles.userAvatarLarge} style={{ backgroundColor: avatarColor }}>
                <span className={styles.userAvatarLargeEmoji}>{selectedAvatarData.emoji}</span>
              </div>
            ) : (
              <div className={styles.userAvatarLarge}>
                <span className={styles.userAvatarLargeEmoji}>👤</span>
              </div>
            )}
            <h3 className={styles.profileName}>{userName}</h3>
            <button className={styles.editProfileButton}>Edit Profile</button>
            <div className={styles.badgesRow}>
              <div className={styles.badge}>🏆</div>
              <div className={styles.badge}>⭐</div>
              <div className={styles.badge}>🎯</div>
              <div className={styles.badge}>💎</div>
              <div className={styles.badge}>🌟</div>
            </div>
          </div>

          <nav className={styles.sidebarNav}>
            <div className={styles.navSection}>
              <h4 className={styles.navSectionTitle}>MY STUFF</h4>
              <Link href="#" className={`${styles.navLink} ${styles.active}`}>Courses</Link>
            </div>
            <div className={styles.navSection}>
              <h4 className={styles.navSectionTitle}>MY ACCOUNT</h4>
              <Link href="#" className={styles.navLink}>Progress</Link>
              <Link href="#" className={styles.navLink}>Profile</Link>
              <Link href="#" className={styles.navLink}>Settings</Link>
            </div>
          </nav>
        </div>

        {/* Main Content Area */}
        <div className={styles.mainContent}>
          {/* <div className={styles.contentHeader}>
            <h1 className={styles.contentTitle}>My courses</h1>
            <div className={styles.headerActions}>
              <Link href="/admin" className={styles.adminLink}>
                Admin Console
              </Link>
              <Link href="/page5" className={styles.achievementsLink}>
                Achievements & Leaderboard
              </Link>
              <button className={styles.editCoursesButton}>Edit Courses</button>
            </div>
          </div> */}
          <div className={styles.courseSection}>
            {/* <div className={styles.courseSectionHeader}>
              <h2 className={styles.courseSubtitle}>Learning Journey</h2>
            </div> */}
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
                      ) : game.id === 4 ? (
                        <Link
                          href="/games/color-pattern-game"
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
            {/* <div className={styles.courseList}>
              {courseList.map((course, index) => {
                const courseSlug = course.toLowerCase().replace(/\s+/g, '-');
                return (
                  <Link
                    key={index}
                    href={`/tests/${courseSlug}`}
                    className={styles.courseItem}
                  >
                    <div className={styles.courseIcon}>📚</div>
                    <div className={styles.courseDetails}>
                      <h3 className={styles.courseName}>{course}</h3>
                      <span className={styles.startButton}>
                        Start Test →
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div> */}
          </div>

          {/* <div className={styles.addCourseSection}>
            <div className={styles.addCourseBox}>
              <span className={styles.addCourseIcon}>+</span>
            </div>
            <p className={styles.addCourseText}>Add another course</p>
          </div> */}
        </div>
      </div>
      <EmotionMonitor />
    </div>
  );
}
