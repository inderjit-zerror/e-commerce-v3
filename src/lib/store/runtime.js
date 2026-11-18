// Mutable per-frame state shared between the 3D scene and the HUD.
// Lives outside React on purpose: it changes every frame and must never re-render.
import { INTRO_CAMERA, ROOM, PLAYER_RADIUS, COLLIDERS } from './layout';

export const runtime = {
  player: { x: INTRO_CAMERA.x, y: INTRO_CAMERA.y, z: INTRO_CAMERA.z, yaw: 0, pitch: INTRO_CAMERA.pitch },
  doors: { open: 0 },
  lockEl: null,
  inspectSpin: 0,
  inspectDragging: false,
  // Analog movement from the touch joystick and gamepad stick, each in [-1, 1].
  // y is "down" on screen/stick, so pushing forward gives a negative y.
  touchMove: { x: 0, y: 0 },
  padMove: { x: 0, y: 0, run: false },
  raycastTargets: [],
  garmentNodes: new Map(),
};

export function registerTarget(object) {
  runtime.raycastTargets.push(object);
  return () => {
    const i = runtime.raycastTargets.indexOf(object);
    if (i >= 0) runtime.raycastTargets.splice(i, 1);
  };
}

export function registerGarmentNode(key, object) {
  runtime.garmentNodes.set(key, object);
  return () => {
    if (runtime.garmentNodes.get(key) === object) runtime.garmentNodes.delete(key);
  };
}

// ---------------------------------------------------------------------------
// Collision (circle player vs. rects/circles on the floor plane)
// ---------------------------------------------------------------------------
export function collides(x, z) {
  const r = PLAYER_RADIUS;
  if (x < -ROOM.halfW + r || x > ROOM.halfW - r || z < -ROOM.halfD + r || z > ROOM.halfD - r - 0.15) return true;
  for (const c of COLLIDERS) {
    if (c.type === 'circle') {
      const dx = x - c.x;
      const dz = z - c.z;
      if (dx * dx + dz * dz < (c.r + r) * (c.r + r)) return true;
    } else if (x > c.minX - r && x < c.maxX + r && z > c.minZ - r && z < c.maxZ + r) {
      return true;
    }
  }
  return false;
}

// Moves the player, sliding along whatever it bumps into.
export function moveWithCollisions(p, dx, dz) {
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) / 0.08));
  const sx = dx / steps;
  const sz = dz / steps;
  for (let i = 0; i < steps; i++) {
    if (!collides(p.x + sx, p.z)) p.x += sx;
    if (!collides(p.x, p.z + sz)) p.z += sz;
  }
}
