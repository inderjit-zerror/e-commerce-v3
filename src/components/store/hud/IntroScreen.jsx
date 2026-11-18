'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { enterStore, requestLock } from '@/lib/store/actions';
import { STORE_NAME } from '@/lib/store/products';
import { device } from '@/lib/store/device';
import styles from './hud.module.css';

const CONTROLS = device.touch
  ? [
      ['Left thumb', 'Walk · push far to run'],
      ['Drag', 'Look around'],
      ['Tap', 'Inspect clothes'],
      ['Bag', 'Your bag'],
    ]
  : [
      ['W A S D', 'Walk'],
      ['Mouse', 'Look'],
      ['Shift', 'Run'],
      ['E / Click', 'Inspect clothes'],
      ['C', 'Shopping bag'],
      ['Esc', 'Pause'],
    ];

export function IntroScreen() {
  const ref = useRef(null);

  useGSAP(
    () => {
      gsap
        .timeline({ defaults: { ease: 'power3.out' } })
        .from('[data-anim="eyebrow"]', { y: 16, opacity: 0, duration: 0.8 }, 0.2)
        .from('[data-anim="title"] span', { yPercent: 110, duration: 1.1, stagger: 0.05 }, 0.3)
        .from('[data-anim="copy"]', { y: 18, opacity: 0, duration: 0.9 }, 0.8)
        .from('[data-anim="key"]', { y: 12, opacity: 0, duration: 0.6, stagger: 0.06 }, 1.0)
        .from('[data-anim="cta"]', { y: 18, opacity: 0, duration: 0.8 }, 1.3);
    },
    { scope: ref },
  );

  const leave = () => {
    requestLock(); // must happen inside the click for the browser to allow it
    gsap.to(ref.current, { opacity: 0, duration: 0.6, ease: 'power2.out', onComplete: enterStore });
  };

  return (
    <div ref={ref} className={styles.intro} data-ui>
      <div className={styles.introInner}>
        <p className={styles.introEyebrow} data-anim="eyebrow">
          A walk-in 3D concept store
        </p>
        <h1 className={styles.introTitle} data-anim="title">
          {[...STORE_NAME].map((ch, i) => (
            <span key={i}>{ch}</span>
          ))}
        </h1>
        <p className={styles.introCopy} data-anim="copy">
          Step inside, browse the racks like you would in real life, pick anything up for a closer look and fill your bag.
        </p>
        <div className={styles.introKeys}>
          {CONTROLS.map(([k, label]) => (
            <div key={label} className={styles.introKey} data-anim="key">
              <kbd>{k}</kbd>
              <span>{label}</span>
            </div>
          ))}
        </div>
        <button className={styles.cta} onClick={leave} data-anim="cta" autoFocus>
          Enter the store
          <span aria-hidden>→</span>
        </button>
        {!device.touch && (
          <p className={styles.introNote} data-anim="cta">
            Got a controller? Gamepads work too.
          </p>
        )}
      </div>
    </div>
  );
}
