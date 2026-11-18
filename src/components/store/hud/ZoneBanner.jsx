'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ZONES } from '@/lib/store/layout';
import { runtime } from '@/lib/store/runtime';
import styles from './hud.module.css';

function currentZone() {
  const { x, z } = runtime.player;
  let best = null;
  let bestDist = Infinity;
  for (const zone of ZONES) {
    const d = Math.hypot(x - zone.x, z - zone.z);
    if (d < zone.r && d < bestDist) {
      best = zone.label;
      bestDist = d;
    }
  }
  return best;
}

// Game-style "area name" that fades in whenever you walk into a new section.
export function ZoneBanner() {
  const ref = useRef(null);

  useEffect(() => {
    let last = currentZone();
    const id = setInterval(() => {
      const zone = currentZone();
      if (zone === last) return;
      last = zone;
      if (!zone || !ref.current) return;
      ref.current.textContent = zone;
      gsap.killTweensOf(ref.current);
      gsap
        .timeline()
        .fromTo(ref.current, { opacity: 0, y: -10, letterSpacing: '0.6em' }, { opacity: 1, y: 0, letterSpacing: '0.35em', duration: 0.6, ease: 'power3.out' })
        .to(ref.current, { opacity: 0, y: -6, duration: 0.6, ease: 'power2.in' }, '+=1.6');
    }, 200);
    return () => clearInterval(id);
  }, []);

  return <div ref={ref} className={styles.zone} />;
}
