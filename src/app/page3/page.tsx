'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from '@/styles/page3.module.css';

// Avatar options with customizable properties
const avatarOptions = [
  { id: 1, name: 'Alex', baseColor: '#4a90e2', emoji: '🤖' },
  { id: 2, name: 'Sam', baseColor: '#ff6b9d', emoji: '🌟' },
  { id: 3, name: 'Jordan', baseColor: '#98fb98', emoji: '🦄' },
  { id: 4, name: 'Casey', baseColor: '#ffd700', emoji: '✨' },
  { id: 5, name: 'Riley', baseColor: '#ff8c42', emoji: '🚀' },
  { id: 6, name: 'Morgan', baseColor: '#9b59b6', emoji: '🎨' },
];

const colorOptions = [
  '#4a90e2', // Blue
  '#ff6b9d', // Pink
  '#98fb98', // Green
  '#ffd700', // Yellow
  '#ff8c42', // Orange
  '#9b59b6', // Purple
  '#00d4ff', // Cyan
  '#ff1493', // Hot Pink
];

export default function Page3() {
  const [selectedAvatar, setSelectedAvatar] = useState<number | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>('#4a90e2');
  const [isConfirmed, setIsConfirmed] = useState(false);

  const handleAvatarSelect = (avatarId: number) => {
    setSelectedAvatar(avatarId);
    setIsConfirmed(false);
    // Set the base color of the selected avatar
    const avatar = avatarOptions.find(a => a.id === avatarId);
    if (avatar) {
      setSelectedColor(avatar.baseColor);
    }
  };

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    setIsConfirmed(false);
  };

  const handleConfirm = () => {
    if (selectedAvatar) {
      setIsConfirmed(true);
      // Here you could save to localStorage or context
      localStorage.setItem('selectedAvatar', selectedAvatar.toString());
      localStorage.setItem('avatarColor', selectedColor);
    }
  };

  const selectedAvatarData = avatarOptions.find(a => a.id === selectedAvatar);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Choose Your Companion</h1>
        <p className={styles.subtitle}>Pick an avatar that will guide you through your learning journey!</p>
      </div>

      <div className={styles.content}>
        {/* Avatar Selection Grid */}
        <div className={styles.avatarSection}>
          <h2 className={styles.sectionTitle}>Select Your Avatar</h2>
          <div className={styles.avatarGrid}>
            {avatarOptions.map((avatar) => (
              <button
                key={avatar.id}
                className={`${styles.avatarCard} ${
                  selectedAvatar === avatar.id ? styles.selected : ''
                }`}
                onClick={() => handleAvatarSelect(avatar.id)}
              >
                <div
                  className={styles.avatarCircle}
                  style={{
                    backgroundColor: selectedAvatar === avatar.id ? selectedColor : avatar.baseColor,
                    boxShadow: selectedAvatar === avatar.id
                      ? `0 0 30px ${selectedColor}, 0 0 50px ${selectedColor}40`
                      : 'none',
                  }}
                >
                  <span className={styles.avatarEmoji}>{avatar.emoji}</span>
                </div>
                <p className={styles.avatarName}>{avatar.name}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Customization Section */}
        {selectedAvatar && (
          <div className={styles.customizationSection}>
            <h2 className={styles.sectionTitle}>Customize Your Avatar</h2>
            <div className={styles.colorPicker}>
              <p className={styles.colorLabel}>Choose a color:</p>
              <div className={styles.colorGrid}>
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    className={`${styles.colorOption} ${
                      selectedColor === color ? styles.colorSelected : ''
                    }`}
                    style={{
                      backgroundColor: color,
                      boxShadow: selectedColor === color
                        ? `0 0 20px ${color}, 0 0 30px ${color}60`
                        : 'none',
                    }}
                    onClick={() => handleColorChange(color)}
                  />
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className={styles.previewSection}>
              <p className={styles.previewLabel}>Preview:</p>
              <div className={styles.previewCircle} style={{ backgroundColor: selectedColor }}>
                <span className={styles.previewEmoji}>
                  {selectedAvatarData?.emoji || '🤖'}
                </span>
              </div>
              <p className={styles.previewName}>
                {selectedAvatarData?.name || 'Your Companion'}
              </p>
            </div>

            {/* Confirm Button */}
            <button
              className={`${styles.confirmButton} ${isConfirmed ? styles.confirmed : ''}`}
              onClick={handleConfirm}
            >
              {isConfirmed ? '✓ Avatar Selected!' : 'Confirm Selection'}
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className={styles.navBar}>
        <Link href="/page2" className={styles.navButton}>
          ← Back
        </Link>
        {isConfirmed && (
          <Link href="/page4" className={styles.navButton}>
            Continue →
          </Link>
        )}
      </div>
    </div>
  );
}
