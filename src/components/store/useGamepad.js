'use client';

import { useEffect } from 'react';
import { runtime } from '@/lib/store/runtime';
import { useStore } from '@/lib/store/useStore';
import { PRODUCTS_BY_ID } from '@/lib/store/products';
import { closeCart, closeInspect, enterStore, openCart, openInspect, pauseGame, resumeGame } from '@/lib/store/actions';

// Standard gamepad mapping (Xbox / PlayStation / Switch Pro / Steam Deck):
// left stick walk (click to run), right stick look, A inspect / add to bag,
// B back, Y bag, Start pause, D-pad colour + size while inspecting.
const DEAD_ZONE = 0.18;
const LOOK_YAW = 2.6;
const LOOK_PITCH = 1.8;
const BTN = { A: 0, B: 1, Y: 3, RT: 7, START: 9, L3: 10, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };

const axis = (v = 0) => (Math.abs(v) < DEAD_ZONE ? 0 : (v - Math.sign(v) * DEAD_ZONE) / (1 - DEAD_ZONE));

function cycleInspect(s, key, dir) {
  const product = PRODUCTS_BY_ID[s.inspect.productId];
  if (key === 'color') {
    const n = product.colors.length;
    s.updateInspect({ colorIndex: (s.inspect.colorIndex + dir + n) % n });
  } else {
    const sizes = product.sizes;
    const i = sizes.indexOf(s.inspect.size);
    s.updateInspect({ size: sizes[(i + dir + sizes.length) % sizes.length] });
  }
}

function poll(pad, prev, dt) {
  const s = useStore.getState();
  const pressed = (i) => !!pad.buttons[i]?.pressed;
  const tapped = (i) => pressed(i) && !prev[i];
  const lx = axis(pad.axes[0]);
  const ly = axis(pad.axes[1]);
  const rx = axis(pad.axes[2]);
  const ry = axis(pad.axes[3]);

  if (s.mode === 'play') {
    runtime.padMove.x = lx;
    runtime.padMove.y = ly;
    runtime.padMove.run = pressed(BTN.L3) || pressed(BTN.RT);
    const p = runtime.player;
    p.yaw -= rx * LOOK_YAW * dt;
    p.pitch = Math.max(-1.35, Math.min(1.35, p.pitch - ry * LOOK_PITCH * dt));
  } else {
    runtime.padMove.x = 0;
    runtime.padMove.y = 0;
    runtime.padMove.run = false;
  }

  if (s.mode === 'inspect' && s.inspect && !s.inspect.closing) {
    runtime.inspectSpin += (rx || lx) * LOOK_YAW * dt;
    if (tapped(BTN.LEFT)) cycleInspect(s, 'color', -1);
    if (tapped(BTN.RIGHT)) cycleInspect(s, 'color', 1);
    if (tapped(BTN.UP)) cycleInspect(s, 'size', -1);
    if (tapped(BTN.DOWN)) cycleInspect(s, 'size', 1);
  }

  if (tapped(BTN.A)) {
    if (s.mode === 'intro') enterStore();
    else if (s.mode === 'play') openInspect();
    else if (s.mode === 'inspect' && s.inspect && !s.inspect.closing) {
      s.addToCart({ productId: s.inspect.productId, colorIndex: s.inspect.colorIndex, size: s.inspect.size });
    } else if (s.mode === 'paused') resumeGame();
  }
  if (tapped(BTN.B)) {
    if (s.mode === 'inspect') closeInspect(false);
    else if (s.mode === 'cart') closeCart(false);
    else if (s.mode === 'paused') resumeGame();
  }
  if (tapped(BTN.Y)) {
    if (s.mode === 'cart') closeCart(false);
    else openCart();
  }
  if (tapped(BTN.START)) {
    if (s.mode === 'play') pauseGame();
    else if (s.mode === 'paused') resumeGame();
  }
}

export function useGamepad() {
  useEffect(() => {
    if (!navigator.getGamepads) return;
    let raf = 0;
    let last = 0;
    let prev = [];

    const loop = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const pad = [...navigator.getGamepads()].find(Boolean);
      if (pad) {
        poll(pad, prev, dt);
        prev = pad.buttons.map((b) => b.pressed);
      } else {
        runtime.padMove.x = 0;
        runtime.padMove.y = 0;
        runtime.padMove.run = false;
      }
      raf = requestAnimationFrame(loop);
    };
    // Only spin up a loop once a controller actually shows up.
    const start = () => {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener('gamepadconnected', start);
    if ([...navigator.getGamepads()].some(Boolean)) start();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('gamepadconnected', start);
    };
  }, []);
}
