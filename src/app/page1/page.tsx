'use client';

import Link from 'next/link';
import Scene1 from '@/components/scenes/Scene1';
import styles from '@/styles/page1.module.css';

export default function Page1() {
  return (
    <div className={styles.container}>
      <Scene1 />

      {/* Title at the top */}
      <div className={styles.overlay}>
        <h1 className={styles.title}>Qualcomm ASD Platform</h1>
      </div>

      {/* Enter button at the bottom */}
      <div className={styles.enterButtonContainer}>
        <Link href="/signup" className={styles.enterButton}>
          Enter
        </Link>
      </div>
    </div>
  );
}
