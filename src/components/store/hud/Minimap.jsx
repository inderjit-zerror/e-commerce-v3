'use client';

import { useEffect, useRef } from 'react';
import { BAYS, COLLIDERS, GONDOLAS, ROOM } from '@/lib/store/layout';
import { runtime } from '@/lib/store/runtime';
import { useStore } from '@/lib/store/useStore';
import styles from './hud.module.css';

const WIDTH = 168;
const SCALE = WIDTH / (ROOM.halfW * 2);
const HEIGHT = Math.round(ROOM.halfD * 2 * SCALE);

const COLORS = {
  bay: 'rgba(214, 178, 122, 0.55)',
  gondola: 'rgba(214, 178, 122, 0.8)',
  counter: 'rgba(255,255,255,0.35)',
  fitting: 'rgba(255,255,255,0.22)',
  plant: 'rgba(120, 170, 120, 0.6)',
};

const toMap = (x, z) => [(x + ROOM.halfW) * SCALE, (z + ROOM.halfD) * SCALE];

function drawStatic(ctx) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  for (const c of COLLIDERS) {
    ctx.fillStyle = COLORS[c.kind] ?? 'rgba(255,255,255,0.28)';
    if (c.type === 'circle') {
      const [x, y] = toMap(c.x, c.z);
      ctx.beginPath();
      ctx.arc(x, y, c.r * SCALE, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const [x0, y0] = toMap(c.minX, c.minZ);
      const [x1, y1] = toMap(c.maxX, c.maxZ);
      ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    }
  }
  // entrance
  ctx.fillStyle = '#d6b27a';
  const [ex] = toMap(-1.5, 0);
  ctx.fillRect(ex, HEIGHT - 3, 3 * SCALE, 3);
  // labels
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '600 7px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (const b of BAYS) {
    const [x, y] = toMap(b.side * 8.4, b.z);
    ctx.fillText(b.label.split(' ')[0], x, y + 2);
  }
  for (const g of GONDOLAS) {
    const [x, y] = toMap(g.x, g.z - 3.2);
    ctx.fillText(g.label, x, y);
  }
}

export function Minimap() {
  const show = useStore((s) => s.showMap);
  const baseRef = useRef(null);
  const playerRef = useRef(null);

  useEffect(() => {
    if (!show) return;
    drawStatic(baseRef.current.getContext('2d'));
    let raf;
    const tick = () => {
      const p = runtime.player;
      const [x, y] = toMap(p.x, p.z);
      if (playerRef.current) {
        playerRef.current.style.transform = `translate(${x}px, ${y}px) rotate(${-p.yaw}rad)`;
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [show]);

  if (!show) return null;
  return (
    <div className={styles.minimap} style={{ width: WIDTH, height: HEIGHT }}>
      <canvas ref={baseRef} width={WIDTH} height={HEIGHT} />
      <div ref={playerRef} className={styles.minimapPlayer}>
        <div className={styles.minimapCone} />
        <div className={styles.minimapDot} />
      </div>
      <span className={styles.minimapKey}>
        <kbd>M</kbd>
      </span>
    </div>
  );
}
