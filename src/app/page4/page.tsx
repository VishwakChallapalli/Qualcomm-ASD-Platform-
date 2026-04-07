'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '@/styles/page4.module.css';
import ThemeToggle from '@/components/ThemeToggle';

// Avatar options to match what was selected
const avatarOptions = [
  { id: 1, name: 'Alex', baseColor: '#4a90e2', emoji: '🤖' },
  { id: 2, name: 'Sam', baseColor: '#ff6b9d', emoji: '🌟' },
  { id: 3, name: 'Jordan', baseColor: '#98fb98', emoji: '🦄' },
  { id: 4, name: 'Casey', baseColor: '#ffd700', emoji: '✨' },
  { id: 5, name: 'Riley', baseColor: '#ff8c42', emoji: '🚀' },
  { id: 6, name: 'Morgan', baseColor: '#9b59b6', emoji: '🎨' },
];

const colorOptions = [
  '#4a90e2',
  '#ff6b9d',
  '#98fb98',
  '#ffd700',
  '#ff8c42',
  '#9b59b6',
  '#00d4ff',
  '#ff1493',
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
    name: 'What Would You Do?',
    description: 'Choose the best option',
    icon: '🗣️',
    color: '#45f2f5',
  },
  {
    id: 6,
    name: 'Neon Rhythm',
    description: 'Keep the beat and find your flow! Adapts to your mood.',
    icon: '⚡',
    color: '#00f2fe',
  },
  {
    id: 7,
    name: 'Astral Jump',
    description: 'Navigate the stars in this 3D cosmic challenge.',
    icon: '🚀',
    color: '#a855f7',
  },
  {
    id: 8,
    name: 'Story Reader',
    description: 'Read stories out loud word by word — powered by Whisper AI!',
    icon: '📖',
    color: '#e0c3fc',
  },
];

export default function Page4() {
  const router = useRouter();
  const [selectedAvatar, setSelectedAvatar] = useState<number | null>(null);
  const [avatarColor, setAvatarColor] = useState<string>('#4a90e2');
  const [showExploreDropdown, setShowExploreDropdown] = useState(false);
  const [userName, setUserName] = useState<string>('User');

  // Edit Profile modal state
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editAvatar, setEditAvatar] = useState<number | null>(null);
  const [editColor, setEditColor] = useState<string>('#4a90e2');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    async function getUserInfo() {
      const res = await fetch('/api/me');
      const data = await res.json();
      if (data.avatarId) setSelectedAvatar(data.avatarId);
      else setSelectedAvatar(1);
      if (data.avatarColor) setAvatarColor(data.avatarColor);
      else setAvatarColor('#4a90e2');
      if (data.accountName) setUserName(data.accountName);
    }
    getUserInfo();
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

  const openEditProfile = () => {
    setEditUsername(userName);
    setEditAvatar(selectedAvatar);
    setEditColor(avatarColor);
    setSaveStatus('idle');
    setSaveError('');
    setShowEditProfile(true);
  };

  const handleEditAvatarSelect = (avatarId: number) => {
    setEditAvatar(avatarId);
    const avatar = avatarOptions.find(a => a.id === avatarId);
    if (avatar) setEditColor(avatar.baseColor);
  };

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/page1');
  };

  const handleSaveProfile = async () => {
    setSaveStatus('saving');
    setSaveError('');
    try {
      const res = await fetch('/api/updateProfile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountName: editUsername,
          avatarId: editAvatar,
          avatarColor: editColor,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.message || 'Failed to save');
        setSaveStatus('error');
        return;
      }
      // Update displayed state
      setUserName(editUsername);
      setSelectedAvatar(editAvatar);
      setAvatarColor(editColor);
      setSaveStatus('saved');
      setTimeout(() => {
        setShowEditProfile(false);
        setSaveStatus('idle');
      }, 1000);
    } catch {
      setSaveError('Network error. Please try again.');
      setSaveStatus('error');
    }
  };

  const selectedAvatarData = selectedAvatar
    ? avatarOptions.find(a => a.id === selectedAvatar)
    : null;

  const editAvatarData = editAvatar
    ? avatarOptions.find(a => a.id === editAvatar)
    : null;

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
                  <h4 className={styles.dropdownSectionTitle}>Learning</h4>
                  <Link href="/page5" className={styles.dropdownItem} onClick={() => setShowExploreDropdown(false)}>
                    📈 Progress
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
            <span className={styles.userName}>{userName}</span>
          </div>
          <ThemeToggle />
          <button className={styles.logoutButton} onClick={handleLogout}>
            Log Out
          </button>
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
            <button className={styles.editProfileButton} onClick={openEditProfile}>
              Edit Profile
            </button>
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
              <Link href="/page5" className={styles.navLink}>Progress</Link>
              <button className={styles.navLink} onClick={openEditProfile} style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}>Profile</button>
              <Link href="#" className={styles.navLink}>Settings</Link>
            </div>
          </nav>
        </div>

        {/* Main Content Area */}
        <div className={styles.mainContent}>
          <div className={styles.courseSection}>
            <div className={styles.pageHeader}>
              <h1 className={styles.pageTitle}>Games</h1>
              <p className={styles.pageSubtitle}>Fun and engaging games to learn and practice</p>
            </div>
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
                        <Link href="/games/math-game" className={styles.playButton} style={{ borderColor: game.color, color: game.color }}>Play →</Link>
                      ) : game.id === 2 ? (
                        <Link href="/games/tic-tac-toe" className={styles.playButton} style={{ borderColor: game.color, color: game.color }}>Play →</Link>
                      ) : game.id === 3 ? (
                        <Link href="/games/mirror-emotions" className={styles.playButton} style={{ borderColor: game.color, color: game.color }}>Play →</Link>
                      ) : game.id === 4 ? (
                        <Link href="/games/color-pattern-game" className={styles.playButton} style={{ borderColor: game.color, color: game.color }}>Play →</Link>
                      ) : game.id === 6 ? (
                        <Link href="/games/neon-rhythm" className={styles.playButton} style={{ borderColor: game.color, color: game.color }}>Play →</Link>
                      ) : game.id === 7 ? (
                        <Link href="/games/astral-jump" className={styles.playButton} style={{ borderColor: game.color, color: game.color }}>Play →</Link>
                      ) : game.id === 8 ? (
                        <Link href="/games/story-reader" className={styles.playButton} style={{ borderColor: game.color, color: game.color }}>Play →</Link>
                      ) : (
                        <button className={styles.playButton} style={{ borderColor: game.color, color: game.color }}>Play →</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setShowEditProfile(false); }}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Edit Profile</h2>
              <button className={styles.modalClose} onClick={() => setShowEditProfile(false)}>✕</button>
            </div>

            {/* Preview */}
            <div className={styles.editPreview}>
              <div className={styles.editPreviewAvatar} style={{ backgroundColor: editColor }}>
                <span className={styles.editPreviewEmoji}>{editAvatarData?.emoji || '👤'}</span>
              </div>
              <p className={styles.editPreviewName}>{editUsername || 'Your Name'}</p>
            </div>

            {/* Username */}
            <div className={styles.editField}>
              <label className={styles.editLabel}>Username</label>
              <input
                type="text"
                className={styles.editInput}
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                placeholder="Enter username"
                maxLength={20}
              />
            </div>

            {/* Avatar Picker */}
            <div className={styles.editField}>
              <label className={styles.editLabel}>Choose Avatar</label>
              <div className={styles.editAvatarGrid}>
                {avatarOptions.map((avatar) => (
                  <button
                    key={avatar.id}
                    className={`${styles.editAvatarCard} ${editAvatar === avatar.id ? styles.editAvatarSelected : ''}`}
                    onClick={() => handleEditAvatarSelect(avatar.id)}
                  >
                    <div className={styles.editAvatarCircle} style={{ backgroundColor: editAvatar === avatar.id ? editColor : avatar.baseColor }}>
                      <span className={styles.editAvatarEmoji}>{avatar.emoji}</span>
                    </div>
                    <p className={styles.editAvatarName}>{avatar.name}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Color Picker */}
            {editAvatar && (
              <div className={styles.editField}>
                <label className={styles.editLabel}>Choose Color</label>
                <div className={styles.editColorGrid}>
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      className={`${styles.editColorDot} ${editColor === color ? styles.editColorSelected : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setEditColor(color)}
                    />
                  ))}
                </div>
              </div>
            )}

            {saveError && <p className={styles.saveError}>{saveError}</p>}

            <button
              className={`${styles.saveButton} ${saveStatus === 'saved' ? styles.saveButtonDone : ''}`}
              onClick={handleSaveProfile}
              disabled={saveStatus === 'saving' || !editUsername.trim()}
            >
              {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? '✓ Saved!' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
