'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { selectTier, useStore } from '@/lib/store/useStore';
import { openCart, resumeGame } from '@/lib/store/actions';
import { TIER_LABELS } from '@/lib/store/device';
import styles from './hud.module.css';

export function PauseScreen() {
  const ref = useRef(null);
  const qualityMode = useStore((s) => s.qualityMode);
  const tier = useStore(selectTier);
  const showMap = useStore((s) => s.showMap);
  const cycleQuality = useStore((s) => s.cycleQuality);
  const toggleMap = useStore((s) => s.toggleMap);
  const qualityLabel = qualityMode === 'auto' ? `Auto · ${TIER_LABELS[tier]}` : TIER_LABELS[tier];

  useGSAP(() => {
    gsap.from(ref.current.children, { y: 20, opacity: 0, duration: 0.5, stagger: 0.06, ease: 'power3.out' });
  }, { scope: ref });

  return (
    <div className={styles.pause} data-ui onClick={(e) => e.target === e.currentTarget && resumeGame()}>
      <div ref={ref} className={styles.pauseCard}>
        <p className={styles.introEyebrow}>Paused</p>
        <h2 className={styles.pauseTitle}>Take your time.</h2>
        <button className={styles.cta} onClick={resumeGame}>
          Resume shopping <span aria-hidden>→</span>
        </button>
        <div className={styles.pauseActions}>
          <button className={styles.ghostButton} onClick={openCart}>
            View bag
          </button>
          <button className={styles.ghostButton} onClick={cycleQuality} title="Lower this if the store feels slow">
            Graphics: {qualityLabel}
          </button>
          <button className={styles.ghostButton} onClick={toggleMap}>
            Minimap: {showMap ? 'On' : 'Off'}
          </button>
        </div>
      </div>
    </div>
  );
}
