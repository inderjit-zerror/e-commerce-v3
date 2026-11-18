// Game actions shared by the HUD (buttons/keys) and the 3D scene (clicks).
import gsap from 'gsap';
import * as THREE from 'three';
import { useStore } from './useStore';
import { runtime } from './runtime';
import { EYE_HEIGHT, SPAWN } from './layout';
import { device } from './device';

export function requestLock() {
  const el = runtime.lockEl;
  // Touch screens look by dragging; pointer lock only makes sense with a mouse/trackpad.
  if (device.touch || !el?.requestPointerLock || document.pointerLockElement === el) return;
  try {
    const result = el.requestPointerLock();
    if (result && typeof result.catch === 'function') result.catch(() => {});
  } catch {
    // Pointer lock can be unavailable (iframes, some mobile browsers). Drag-to-look still works.
  }
}

export function exitLock() {
  if (document.pointerLockElement) document.exitPointerLock();
}

export function enterStore() {
  const { mode, setMode } = useStore.getState();
  if (mode !== 'intro') return;
  setMode('entering');
  requestLock();

  const p = runtime.player;
  // Respect "reduce motion": a short, gentle move instead of the full fly-in.
  const t = device.reducedMotion ? 0.35 : 1;
  gsap
    .timeline({ onComplete: () => useStore.getState().setMode('play') })
    .to(runtime.doors, { open: 1, duration: 1.2 * t, ease: 'power2.inOut' }, 0)
    .to(p, { z: SPAWN.z, x: SPAWN.x, duration: 3.6 * t, ease: 'power2.inOut' }, 0.35 * t)
    .to(p, { y: EYE_HEIGHT, pitch: 0, yaw: 0, duration: 3.6 * t, ease: 'power2.inOut' }, 0.35 * t)
    .to(runtime.doors, { open: 0, duration: 1.3 * t, ease: 'power2.inOut' }, 3.1 * t);
}

export function pauseGame() {
  const { mode, setMode } = useStore.getState();
  if (mode !== 'play') return;
  setMode('paused');
  exitLock();
}

const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();

export function openInspect() {
  const { mode, hovered, inspect, startInspect } = useStore.getState();
  if (mode !== 'play' || !hovered || inspect) return;
  const node = runtime.garmentNodes.get(hovered.key);
  if (!node) return;
  node.updateWorldMatrix(true, false);
  node.matrixWorld.decompose(_pos, _quat, _scale);
  exitLock();
  runtime.inspectSpin = 0;
  startInspect({
    key: hovered.key,
    productId: hovered.productId,
    from: { position: _pos.toArray(), quaternion: _quat.toArray() },
  });
  // Level the view so the garment is framed nicely.
  gsap.to(runtime.player, { pitch: 0, duration: 0.8, ease: 'power3.out' });
}

export function closeInspect(relock = true) {
  const { mode, closeInspect: close } = useStore.getState();
  if (mode !== 'inspect') return;
  close();
  if (relock) requestLock();
}

export function openCart() {
  const { mode, setMode } = useStore.getState();
  if (mode !== 'play' && mode !== 'paused') return;
  exitLock();
  setMode('cart');
}

export function closeCart(relock = true) {
  const { mode, setMode } = useStore.getState();
  if (mode !== 'cart') return;
  setMode('play');
  if (relock) requestLock();
}

export function resumeGame() {
  const { mode, setMode } = useStore.getState();
  if (mode !== 'paused') return;
  setMode('play');
  requestLock();
}
