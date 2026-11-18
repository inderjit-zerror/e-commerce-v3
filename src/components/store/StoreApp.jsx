'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { KeyboardControls } from '@react-three/drei';
import { Experience } from './Experience';
import { KEY_MAP } from './Player';
import { Hud } from './hud/Hud';
import { useGamepad } from './useGamepad';
import { runtime } from '@/lib/store/runtime';
import { device, QUALITY } from '@/lib/store/device';
import { selectTier, useStore } from '@/lib/store/useStore';
import { openInspect, requestLock } from '@/lib/store/actions';
import styles from './hud/hud.module.css';

const LOOK_SPEED = 0.0022; // mouse (pointer lock), rad per px
const DRAG_SPEED = { mouse: 0.0045, pen: 0.0045, touch: 0.0058 };
const MAX_PITCH = 1.35;

function look(dx, dy, speed) {
  const p = runtime.player;
  p.yaw -= dx * speed;
  p.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, p.pitch - dy * speed));
}

// Mouse look (pointer lock), drag-to-look for touch/pen/unlocked mouse, tap/click to
// inspect. Each drag is tied to its pointerId so a second finger on the joystick
// never turns the camera.
function usePointerControls(rootRef) {
  useEffect(() => {
    const root = rootRef.current;
    runtime.lockEl = root;
    let drag = null;

    const isLocked = () => document.pointerLockElement === root;

    const onLockChange = () => {
      const locked = isLocked();
      const s = useStore.getState();
      s.setLocked(locked);
      if (!locked && s.mode === 'play') s.setMode('paused');
    };

    const onMouseMove = (e) => {
      if (!isLocked() || useStore.getState().mode !== 'play') return;
      // Some browsers report a huge spike on the first event after locking.
      if (Math.abs(e.movementX) > 400 || Math.abs(e.movementY) > 400) return;
      look(e.movementX, e.movementY, LOOK_SPEED);
    };

    const onPointerDown = (e) => {
      if (drag || e.target.closest?.('[data-ui]')) return;
      const { mode } = useStore.getState();
      if (mode !== 'play' && mode !== 'inspect') return;
      drag = { id: e.pointerId, type: e.pointerType, x: e.clientX, y: e.clientY, moved: 0, inspect: mode === 'inspect' };
      if (drag.inspect) runtime.inspectDragging = true;
    };

    const onPointerMove = (e) => {
      if (!drag || e.pointerId !== drag.id || isLocked()) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      drag.x = e.clientX;
      drag.y = e.clientY;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      if (drag.inspect) runtime.inspectSpin += dx * 0.012;
      else look(dx, dy, DRAG_SPEED[drag.type] ?? DRAG_SPEED.mouse);
    };

    const onPointerUp = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const { moved, inspect, type } = drag;
      drag = null;
      runtime.inspectDragging = false;
      if (inspect || moved > (type === 'touch' ? 10 : 6)) return;
      const s = useStore.getState();
      if (s.mode !== 'play' || e.type === 'pointercancel') return;
      if (s.hovered) openInspect();
      else if (type === 'mouse' && !isLocked()) requestLock();
    };

    document.addEventListener('pointerlockchange', onLockChange);
    window.addEventListener('mousemove', onMouseMove);
    root.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    return () => {
      document.removeEventListener('pointerlockchange', onLockChange);
      window.removeEventListener('mousemove', onMouseMove);
      root.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      if (runtime.lockEl === root) runtime.lockEl = null;
    };
  }, [rootRef]);
}

function Notice({ title, children }) {
  return (
    <div className={styles.notice} data-ui>
      <div className={styles.pauseCard}>
        <h2 className={styles.pauseTitle}>{title}</h2>
        {children}
      </div>
    </div>
  );
}

export default function StoreApp() {
  const rootRef = useRef(null);
  const tier = useStore(selectTier);
  const mode = useStore((s) => s.mode);
  // Antialiasing is fixed when the WebGL context is created, so decide it once.
  const q = QUALITY[tier];
  const [antialias] = useState(() => QUALITY[selectTier(useStore.getState())].antialias);
  const [contextLost, setContextLost] = useState(false);
  usePointerControls(rootRef);
  useGamepad();

  // Nothing moves on the intro, pause and bag screens: render on demand there to
  // save battery. Battery saver also renders on demand, paced by <FrameCap>.
  const idle = mode === 'intro' || mode === 'paused' || mode === 'cart';
  const frameloop = idle || q.fpsCap ? 'demand' : 'always';

  if (!device.webgl) {
    return (
      <div ref={rootRef} className={styles.root}>
        <Notice title="3D isn’t available here">
          <p className={styles.noticeCopy}>
            This store needs WebGL. Try an up-to-date Chrome, Safari, Edge or Firefox, or turn on hardware acceleration in your browser settings.
          </p>
        </Notice>
      </div>
    );
  }

  return (
    <div ref={rootRef} className={[styles.root, device.touch && styles.touch, !q.uiBlur && styles.lite].filter(Boolean).join(' ')}>
      <KeyboardControls map={KEY_MAP}>
        <Canvas
          className={styles.canvas}
          shadows
          frameloop={frameloop}
          dpr={q.dpr}
          camera={{ fov: 70, near: 0.05, far: 140, position: [0, 2.3, 25.5] }}
          gl={{ antialias, stencil: false, powerPreference: 'high-performance' }}
          onCreated={({ gl }) => {
            gl.domElement.addEventListener('webglcontextlost', (e) => {
              e.preventDefault();
              setContextLost(true);
            });
          }}
        >
          <Suspense fallback={null}>
            <Experience />
          </Suspense>
        </Canvas>
      </KeyboardControls>
      <Hud />
      {contextLost && (
        <Notice title="Graphics paused">
          <p className={styles.noticeCopy}>Your device needed the graphics memory back. Your bag is saved.</p>
          <button className={styles.cta} onClick={() => window.location.reload()}>
            Reload the store <span aria-hidden>→</span>
          </button>
        </Notice>
      )}
    </div>
  );
}
