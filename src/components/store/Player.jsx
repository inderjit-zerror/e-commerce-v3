'use client';

import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import { EYE_HEIGHT } from '@/lib/store/layout';
import { device } from '@/lib/store/device';
import { moveWithCollisions, runtime } from '@/lib/store/runtime';
import { useStore } from '@/lib/store/useStore';

const WALK = 3.0;
const RUN = 5.6;
const TURN = 2.1; // rad/s for arrow-key turning
const ACCEL = 10;
const BASE_FOV = 70;

export const KEY_MAP = [
  { name: 'forward', keys: ['KeyW', 'ArrowUp'] },
  { name: 'backward', keys: ['KeyS', 'ArrowDown'] },
  { name: 'left', keys: ['KeyA'] },
  { name: 'right', keys: ['KeyD'] },
  { name: 'turnLeft', keys: ['ArrowLeft'] },
  { name: 'turnRight', keys: ['ArrowRight'] },
  { name: 'sprint', keys: ['ShiftLeft', 'ShiftRight'] },
];

// Vertical FOV that keeps a usable horizontal view on tall (portrait) screens.
export function fovForAspect(aspect) {
  if (aspect >= 1.2) return BASE_FOV;
  const horizontal = THREE.MathUtils.degToRad(80);
  const vertical = 2 * Math.atan(Math.tan(horizontal / 2) / aspect);
  return THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(vertical), BASE_FOV, 95);
}

// First-person controller: keyboard / touch joystick / gamepad movement with
// sliding collisions, head bob, and a camera driven entirely by runtime.player
// (so GSAP can animate it too).
export function Player() {
  const [, getKeys] = useKeyboardControls();
  const state = useRef({ vel: new THREE.Vector2(), bob: 0, aspect: 0 });

  useFrame(({ camera, size }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const p = runtime.player;
    const s = state.current;
    const { mode } = useStore.getState();

    const aspect = size.width / size.height;
    if (aspect !== s.aspect) {
      s.aspect = aspect;
      camera.fov = fovForAspect(aspect);
      camera.updateProjectionMatrix();
    }

    let tx = 0;
    let tz = 0;
    if (mode === 'play') {
      const k = getKeys();
      p.yaw += ((k.turnLeft ? 1 : 0) - (k.turnRight ? 1 : 0)) * TURN * dt;
      const keyF = (k.forward ? 1 : 0) - (k.backward ? 1 : 0);
      const keyR = (k.right ? 1 : 0) - (k.left ? 1 : 0);
      const stickX = runtime.touchMove.x + runtime.padMove.x;
      const stickY = runtime.touchMove.y + runtime.padMove.y;
      const f = keyF - stickY;
      const r = keyR + stickX;
      const len = Math.hypot(f, r);
      if (len > 0.08) {
        const usingKeys = keyF !== 0 || keyR !== 0;
        const analog = Math.min(1, Math.hypot(stickX, stickY));
        const run = k.sprint || runtime.padMove.run || (!usingKeys && analog > 0.95);
        const throttle = usingKeys ? 1 : analog;
        const speed = (run ? RUN : WALK) * throttle;
        const sin = Math.sin(p.yaw);
        const cos = Math.cos(p.yaw);
        tx = ((-sin * f + cos * r) / len) * speed;
        tz = ((-cos * f - sin * r) / len) * speed;
      }
    }

    const a = 1 - Math.exp(-ACCEL * dt);
    s.vel.x += (tx - s.vel.x) * a;
    s.vel.y += (tz - s.vel.y) * a;
    if (mode === 'play' && (Math.abs(s.vel.x) > 1e-4 || Math.abs(s.vel.y) > 1e-4)) {
      moveWithCollisions(p, s.vel.x * dt, s.vel.y * dt);
    }

    const speed = s.vel.length();
    s.bob += speed * dt * 2.3;
    const bobAmount = device.reducedMotion ? 0 : Math.min(speed / RUN, 1) * 0.04;
    const baseY = mode === 'intro' || mode === 'entering' ? p.y : EYE_HEIGHT;
    camera.position.set(p.x, baseY + Math.abs(Math.sin(s.bob)) * bobAmount, p.z);
    // YXZ order = yaw first, then pitch: classic FPS camera with no gimbal roll.
    camera.rotation.set(p.pitch, p.yaw, Math.sin(s.bob) * bobAmount * 0.12, 'YXZ');
  });

  return null;
}
