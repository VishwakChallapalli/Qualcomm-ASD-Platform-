'use client';

import Link from 'next/link';
import { Playfair_Display } from 'next/font/google';
import ColorBends from '@/components/ColorBends';
import styles from '@/styles/page1.module.css';

const displaySerif = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
});

export default function Page1() {
  return (
    <div className={styles.container}>
      <div className={styles.bendsBackground} aria-hidden>
        <ColorBends
          colors={['#1f3558', '#f0a0b5', '#12b4ff']}
          rotation={0}
          speed={0.2}
          scale={1}
          frequency={1}
          warpStrength={1}
          mouseInfluence={1}
          parallax={0.5}
          noise={0.1}
          transparent
          autoRotate={0}
        />
      </div>

      <div className={styles.middleColumn}>
        <header className={styles.heroBlock}>
          <h1 className={styles.titleWrap}>
            <span className={`${styles.titleMain} ${displaySerif.className}`}>
              Qualcomm ASD
            </span>
            <span className={styles.titleAccent}>Platform</span>
          </h1>
        </header>

        <div className={styles.ctaStack}>
          <Link href="/signup" className={styles.enterButton}>
            Enter
          </Link>
          <div className={styles.subEnterRow}>
            <span className={styles.subEnterText}>Already have an account?</span>
            <Link href="/login" className={styles.loginLink}>
              Log in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
