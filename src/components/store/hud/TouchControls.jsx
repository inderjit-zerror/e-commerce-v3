'use client';

import { useEffect, useRef } from 'react';
import { runtime } from '@/lib/store/runtime';
import { useStore } from '@/lib/store/useStore';
import { openInspect } from '@/lib/store/actions';
import styles from './hud.module.css';

const RADIUS = 52; // px the knob can travel

// Floating thumbstick: touch anywhere in the lower-left zone, the stick appears
// under your thumb, push to walk (push to the edge to run).
function Joystick() {
  const zoneRef = useRef(null);
  const baseRef = useRef(null);
  const knobRef = useRef(null);
  const active = useRef(null);

  useEffect(() => {
    const zone = zoneRef.current;
    const base = baseRef.current;
    const knob = knobRef.current;

    const reset = () => {
      active.current = null;
      runtime.touchMove.x = 0;
      runtime.touchMove.y = 0;
      base.style.transform = '';
      knob.style.transform = '';
      base.classList.remove(styles.stickActive);
    };

    const onDown = (e) => {
      if (active.current) return;
      e.preventDefault();
      try {
        zone.setPointerCapture(e.pointerId); // keep tracking the thumb if it slides off the zone
      } catch {
        // Not every pointer can be captured; the zone still receives its events.
      }
      const rect = zone.getBoundingClientRect();
      const restX = base.offsetLeft + base.offsetWidth / 2;
      const restY = base.offsetTop + base.offsetHeight / 2;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      active.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
      base.style.transform = `translate(${x - restX}px, ${y - restY}px)`;
      base.classList.add(styles.stickActive);
    };

    const onMove = (e) => {
      const a = active.current;
      if (!a || e.pointerId !== a.id) return;
      let dx = e.clientX - a.x;
      let dy = e.clientY - a.y;
      const len = Math.hypot(dx, dy);
      if (len > RADIUS) {
        dx = (dx / len) * RADIUS;
        dy = (dy / len) * RADIUS;
      }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      runtime.touchMove.x = dx / RADIUS;
      runtime.touchMove.y = dy / RADIUS;
    };

    const onUp = (e) => {
      if (active.current?.id === e.pointerId) reset();
    };

    zone.addEventListener('pointerdown', onDown);
    zone.addEventListener('pointermove', onMove);
    zone.addEventListener('pointerup', onUp);
    zone.addEventListener('pointercancel', onUp);
    return () => {
      zone.removeEventListener('pointerdown', onDown);
      zone.removeEventListener('pointermove', onMove);
      zone.removeEventListener('pointerup', onUp);
      zone.removeEventListener('pointercancel', onUp);
      reset();
    };
  }, []);

  return (
    <div ref={zoneRef} className={styles.stickZone} data-ui aria-hidden>
      <div ref={baseRef} className={styles.stickBase}>
        <div ref={knobRef} className={styles.stickKnob} />
      </div>
    </div>
  );
}

function InspectButton() {
  const hovered = useStore((s) => s.hovered);
  if (!hovered) return null;
  return (
    <button className={styles.touchInspect} data-ui onClick={() => openInspect()}>
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4.5 4.5" />
      </svg>
      Inspect
    </button>
  );
}

export function TouchControls() {
  return (
    <>
      <Joystick />
      <InspectButton />
    </>
  );
}
