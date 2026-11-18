'use client';

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {
  BAY_WIDTH,
  BAYS,
  BENCH,
  CHECKOUT,
  DISPLAY_TABLE,
  FITTING,
  GONDOLAS,
  PLANTS,
  PODIUM,
  ROOM,
  ROUND_TABLE,
  WINDOW_PLATFORMS,
} from '@/lib/store/layout';
import { registerTarget } from '@/lib/store/runtime';
import { getLabelTexture, getSlatTexture } from './textures';

const W = ROOM.halfW;
const D = ROOM.halfD;

// One texture per repeat size, shared, so identical panels can be batched together.
const slatCache = new Map();
function getSlats(repeatX, repeatY) {
  const key = `${repeatX.toFixed(3)}:${repeatY.toFixed(3)}`;
  if (!slatCache.has(key)) {
    const t = getSlatTexture().clone();
    t.repeat.set(repeatX, repeatY);
    t.needsUpdate = true;
    slatCache.set(key, t);
  }
  return slatCache.get(key);
}

function Sign({ text, width = 3, height = 0.56, color = '#1d1d1f', bg = null, glow = false, ...props }) {
  const map = getLabelTexture(text, { color, bg, weight: 700, size: 104, tracking: 20 });
  return (
    <mesh {...props}>
      <planeGeometry args={[width, height]} />
      {glow ? <meshBasicMaterial map={map} transparent={!bg} toneMapped={false} /> : <meshStandardMaterial map={map} transparent={!bg} roughness={0.7} />}
    </mesh>
  );
}

function HangingSign({ text, position, rotationY = 0, width = 3.2 }) {
  const drop = ROOM.height - position[1];
  return (
    <group position={position} rotation-y={rotationY}>
      <mesh>
        <boxGeometry args={[width + 0.1, 0.62, 0.05]} />
        <meshStandardMaterial color="#1b1b1d" roughness={0.5} />
      </mesh>
      <Sign text={text} width={width} height={width * (192 / 1024)} color="#f3e7d3" glow position={[0, 0, 0.027]} />
      <Sign text={text} width={width} height={width * (192 / 1024)} color="#f3e7d3" glow position={[0, 0, -0.027]} rotation-y={Math.PI} />
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (width / 2 - 0.2), drop / 2, 0]}>
          <cylinderGeometry args={[0.004, 0.004, drop, 4]} />
          <meshStandardMaterial color="#888" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Wall bays
// ---------------------------------------------------------------------------
function WallBay({ bay }) {
  const slats = getSlats(BAY_WIDTH / 1.4, 3.2 / 1.4);
  return (
    <group position={[bay.side * W, 0, bay.z]} rotation-y={(-bay.side * Math.PI) / 2}>
      <mesh position={[0, 2.0, 0.03]} receiveShadow>
        <boxGeometry args={[BAY_WIDTH, 3.2, 0.06]} />
        <meshStandardMaterial map={slats} roughness={0.7} />
      </mesh>
      <mesh position={[0, 3.63, 0.1]}>
        <boxGeometry args={[BAY_WIDTH - 0.2, 0.035, 0.05]} />
        <meshStandardMaterial color="#fff4e0" emissive="#ffe8c2" emissiveIntensity={2.4} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.21, 0.25]} castShadow receiveShadow>
        <boxGeometry args={[BAY_WIDTH, 0.42, 0.5]} />
        <meshStandardMaterial color="#2d2a27" roughness={0.6} />
      </mesh>
      <Sign text={bay.label} width={3.6} height={0.675} position={[0, 4.08, 0.02]} />
    </group>
  );
}

function Gondola({ g }) {
  const panelRef = useRef(null);
  const slats = getSlats(g.length / 1.4, 2.4 / 1.4);
  useEffect(() => registerTarget(panelRef.current), []);
  const signBg = g.accent ?? '#1b1b1d';
  return (
    <group position={[g.x, 0, g.z]}>
      <mesh position={[0, 0.06, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.1, 0.12, g.length + 0.2]} />
        <meshStandardMaterial color="#1e1e20" roughness={0.5} />
      </mesh>
      <mesh ref={panelRef} position={[0, 1.32, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.1, 2.4, g.length]} />
        <meshStandardMaterial map={slats} roughness={0.7} />
      </mesh>
      <mesh position={[0, 2.82, 0]} castShadow>
        <boxGeometry args={[0.14, 0.44, 2.4]} />
        <meshStandardMaterial color={signBg} roughness={0.5} />
      </mesh>
      <Sign text={g.label} width={2.2} height={0.41} color="#f6efe4" bg={signBg} position={[0.071, 2.82, 0]} rotation-y={Math.PI / 2} glow />
      <Sign text={g.label} width={2.2} height={0.41} color="#f6efe4" bg={signBg} position={[-0.071, 2.82, 0]} rotation-y={-Math.PI / 2} glow />
    </group>
  );
}

// ---------------------------------------------------------------------------
// Centre floor
// ---------------------------------------------------------------------------
function Podium() {
  return (
    <group position={[PODIUM.x, 0, PODIUM.z]}>
      <mesh position-y={PODIUM.height / 2} castShadow receiveShadow>
        <cylinderGeometry args={[PODIUM.radius, PODIUM.radius, PODIUM.height, 64]} />
        <meshStandardMaterial color="#cfae84" roughness={0.45} />
      </mesh>
      <mesh position-y={0.03} rotation-x={Math.PI / 2}>
        <torusGeometry args={[PODIUM.radius + 0.01, 0.012, 6, 96]} />
        <meshStandardMaterial color="#fff2da" emissive="#ffe3b8" emissiveIntensity={2} toneMapped={false} />
      </mesh>
      <HangingSign text="FEATURED LOOKS" position={[0, 3.7, 0]} width={3.4} />
    </group>
  );
}

function DisplayTable() {
  const t = DISPLAY_TABLE;
  return (
    <group position={[t.x, 0, t.z]}>
      <mesh position-y={t.h} castShadow receiveShadow>
        <boxGeometry args={[t.w, 0.06, t.d]} />
        <meshStandardMaterial color="#c49f74" roughness={0.45} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (t.w / 2 - 0.25), t.h / 2 - 0.015, 0]} castShadow>
          <boxGeometry args={[0.06, t.h - 0.03, t.d - 0.2]} />
          <meshStandardMaterial color="#1c1c1e" metalness={0.5} roughness={0.4} />
        </mesh>
      ))}
      <group position={[0, t.h + 0.1, 0]}>
        <mesh>
          <boxGeometry args={[0.62, 0.14, 0.03]} />
          <meshStandardMaterial color="#f4f1ea" roughness={0.3} />
        </mesh>
        <Sign text="ESSENTIALS" width={0.6} height={0.1125} position={[0, 0, 0.016]} />
        <Sign text="ESSENTIALS" width={0.6} height={0.1125} position={[0, 0, -0.016]} rotation-y={Math.PI} />
      </group>
    </group>
  );
}

function RoundTable() {
  const t = ROUND_TABLE;
  return (
    <group position={[t.x, 0, t.z]}>
      <mesh position-y={t.h} castShadow receiveShadow>
        <cylinderGeometry args={[t.r, t.r, 0.05, 48]} />
        <meshStandardMaterial color="#efebe4" roughness={0.25} />
      </mesh>
      <mesh position-y={t.h / 2}>
        <cylinderGeometry args={[0.12, 0.16, t.h, 20]} />
        <meshStandardMaterial color="#1c1c1e" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position-y={0.015} receiveShadow>
        <cylinderGeometry args={[0.45, 0.45, 0.03, 32]} />
        <meshStandardMaterial color="#1c1c1e" metalness={0.5} roughness={0.4} />
      </mesh>
    </group>
  );
}

function Bench() {
  const b = BENCH;
  return (
    <group position={[b.x, 0, b.z]}>
      <mesh position-y={0.38} castShadow receiveShadow>
        <boxGeometry args={[b.w, 0.16, b.d]} />
        <meshStandardMaterial color="#6f5b49" roughness={0.95} />
      </mesh>
      <mesh position-y={0.28}>
        <boxGeometry args={[b.w, 0.04, b.d]} />
        <meshStandardMaterial color="#1c1c1e" roughness={0.4} metalness={0.5} />
      </mesh>
      {[
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ].map(([sx, sz]) => (
        <mesh key={`${sx}${sz}`} position={[sx * (b.w / 2 - 0.08), 0.13, sz * (b.d / 2 - 0.08)]}>
          <boxGeometry args={[0.04, 0.26, 0.04]} />
          <meshStandardMaterial color="#1c1c1e" metalness={0.5} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function Checkout() {
  const c = CHECKOUT;
  const w = c.maxX - c.minX;
  const d = c.maxZ - c.minZ;
  const cx = (c.minX + c.maxX) / 2;
  const cz = (c.minZ + c.maxZ) / 2;
  const slats = getSlats(w / 1.4, 1);
  return (
    <group>
      <group position={[cx, 0, cz]}>
        <mesh position-y={(c.h - 0.05) / 2} castShadow receiveShadow>
          <boxGeometry args={[w, c.h - 0.05, d]} />
          <meshStandardMaterial map={slats} roughness={0.7} />
        </mesh>
        <mesh position-y={c.h - 0.025} castShadow receiveShadow>
          <boxGeometry args={[w + 0.1, 0.05, d + 0.1]} />
          <meshStandardMaterial color="#f1eee8" roughness={0.25} />
        </mesh>
        {/* POS terminal */}
        <group position={[-1, c.h, -0.1]}>
          <mesh position-y={0.12}>
            <cylinderGeometry args={[0.02, 0.02, 0.24, 8]} />
            <meshStandardMaterial color="#202022" metalness={0.6} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.3, 0]} rotation-x={-0.25}>
            <boxGeometry args={[0.42, 0.28, 0.03]} />
            <meshStandardMaterial color="#202022" metalness={0.4} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.3, 0.017]} rotation-x={-0.25}>
            <planeGeometry args={[0.38, 0.24]} />
            <meshStandardMaterial color="#1b2733" emissive="#8fb3d9" emissiveIntensity={0.6} />
          </mesh>
        </group>
        {/* shopping bags */}
        {[0, 1, 2].map((i) => (
          <group key={i} position={[1.4 + i * 0.36, c.h + 0.2, -0.15 + (i % 2) * 0.12]} rotation-y={0.2 - i * 0.15}>
            <mesh castShadow>
              <boxGeometry args={[0.3, 0.38, 0.12]} />
              <meshStandardMaterial color={i === 1 ? '#1d1d1f' : '#c9a77d'} roughness={0.85} />
            </mesh>
            <mesh position-y={0.2}>
              <torusGeometry args={[0.07, 0.006, 6, 16, Math.PI]} />
              <meshStandardMaterial color="#1d1d1f" />
            </mesh>
          </group>
        ))}
      </group>
      {/* shelves behind the counter */}
      {[1.5, 2.0, 2.5].map((y) => (
        <mesh key={y} position={[cx, y, -D + 0.18]} castShadow receiveShadow>
          <boxGeometry args={[w - 0.4, 0.04, 0.36]} />
          <meshStandardMaterial color="#c49f74" roughness={0.45} />
        </mesh>
      ))}
      <HangingSign text="CHECKOUT" position={[cx, 3.4, cz]} width={2.4} />
    </group>
  );
}

function useCurtainGeometry() {
  return useMemo(() => {
    const g = new THREE.PlaneGeometry(1.8, 2.4, 60, 1);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      pos.setZ(i, Math.sin((x / 0.16) * Math.PI) * 0.035);
    }
    g.computeVertexNormals();
    return g;
  }, []);
}

function FittingRooms() {
  const f = FITTING;
  const width = f.maxX - f.minX;
  const booth = width / f.booths;
  const depth = f.maxZ - f.minZ;
  const curtain = useCurtainGeometry();
  return (
    <group>
      {Array.from({ length: f.booths }, (_, i) => f.minX + i * booth).map((x) => (
        <mesh key={x} position={[x, 1.3, (f.minZ + f.maxZ) / 2]} castShadow receiveShadow>
          <boxGeometry args={[0.08, 2.6, depth]} />
          <meshStandardMaterial color="#f2eee7" roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[(f.minX + f.maxX) / 2, 2.92, f.maxZ]}>
        <boxGeometry args={[width, 0.64, 0.12]} />
        <meshStandardMaterial color="#f2eee7" roughness={0.8} />
      </mesh>
      <Sign text="FITTING ROOMS" width={2.8} height={0.525} position={[(f.minX + f.maxX) / 2, 2.92, f.maxZ + 0.065]} />
      <mesh position={[(f.minX + f.maxX) / 2, 2.55, f.maxZ - 0.06]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.015, 0.015, width, 8]} />
        <meshStandardMaterial color="#b9a17a" metalness={1} roughness={0.3} />
      </mesh>
      {Array.from({ length: f.booths }, (_, i) => (
        <mesh key={i} geometry={curtain} position={[f.minX + (i + 0.5) * booth, 1.33, f.maxZ - 0.06]} castShadow>
          <meshStandardMaterial color="#34473c" roughness={0.9} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

function seededRandom(seed) {
  let s = seed * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function Plant({ x, z, scale, seed }) {
  const leaves = useMemo(() => {
    const rand = seededRandom(seed);
    return Array.from({ length: 9 }, (_, i) => ({
      position: [(rand() - 0.5) * 0.6, 0.9 + i * 0.12 + rand() * 0.2, (rand() - 0.5) * 0.6],
      scale: 0.22 + rand() * 0.16,
      color: ['#3f6b45', '#4d7d4f', '#2f5638'][i % 3],
    }));
  }, [seed]);
  return (
    <group position={[x, 0, z]} scale={scale}>
      <mesh position-y={0.3} castShadow receiveShadow>
        <cylinderGeometry args={[0.3, 0.24, 0.6, 24]} />
        <meshStandardMaterial color="#e5dfd3" roughness={0.6} />
      </mesh>
      <mesh position-y={0.85}>
        <cylinderGeometry args={[0.025, 0.035, 0.9, 6]} />
        <meshStandardMaterial color="#5a4330" roughness={0.9} />
      </mesh>
      {leaves.map((l, i) => (
        <mesh key={i} position={l.position} scale={l.scale} castShadow>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={l.color} roughness={0.8} flatShading />
        </mesh>
      ))}
    </group>
  );
}

function WindowPlatforms() {
  return WINDOW_PLATFORMS.map((w) => (
    <group key={w.x} position={[w.x, 0, w.z]}>
      <mesh position-y={0.1} castShadow receiveShadow>
        <boxGeometry args={[w.w, 0.2, w.d]} />
        <meshStandardMaterial color="#efebe4" roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.02, w.d / 2 + 0.005]}>
        <boxGeometry args={[w.w, 0.02, 0.01]} />
        <meshStandardMaterial color="#fff2da" emissive="#ffe3b8" emissiveIntensity={2} toneMapped={false} />
      </mesh>
    </group>
  ));
}

// ---------------------------------------------------------------------------
// Folded clothes: one instanced mesh for every stack in the store.
// ---------------------------------------------------------------------------
const FOLD_COLORS = ['#e9e2d3', '#1d1d1f', '#cbb595', '#5d6140', '#1f2a44', '#a7a9ac', '#a2482b', '#99ad86', '#2f4a73', '#b5864f', '#6d1f2c', '#f2f1ee'];

function buildStacks() {
  const stacks = [];
  let seed = 11;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const add = (x, y, z, rotY, count) => stacks.push({ x, y, z, rotY, count, color: FOLD_COLORS[Math.floor(rand() * FOLD_COLORS.length)] });

  // Display table: 2 rows x 4
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 4; c++) {
      add(DISPLAY_TABLE.x - 1.2 + c * 0.8, DISPLAY_TABLE.h + 0.03, DISPLAY_TABLE.z + (r ? 0.24 : -0.24), 0, 4 + Math.floor(rand() * 3));
    }
  }
  // Round table: ring of 6
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    add(ROUND_TABLE.x + Math.cos(a) * 0.6, ROUND_TABLE.h + 0.025, ROUND_TABLE.z + Math.sin(a) * 0.6, -a + Math.PI / 2, 3 + Math.floor(rand() * 3));
  }
  // Bay plinths: 3 per bay
  for (const bay of BAYS) {
    for (const lx of [-1.9, 0, 1.9]) {
      const lz = 0.24;
      add(bay.side * W - bay.side * lz, 0.42, bay.z + bay.side * lx, (-bay.side * Math.PI) / 2, 3 + Math.floor(rand() * 3));
    }
  }
  // Shelves behind checkout
  const cx = (CHECKOUT.minX + CHECKOUT.maxX) / 2;
  for (const y of [1.52, 2.02, 2.52]) {
    for (let i = 0; i < 4; i++) add(cx - 1.6 + i * 1.05, y, -D + 0.2, 0, 2 + Math.floor(rand() * 3));
  }
  return { stacks, rand };
}

function FoldedClothes() {
  const ref = useRef(null);
  const { geometry, items } = useMemo(() => {
    const g = new RoundedBoxGeometry(0.34, 0.052, 0.27, 2, 0.02);
    const { stacks, rand } = buildStacks();
    const list = [];
    for (const s of stacks) {
      const base = new THREE.Color(s.color);
      for (let i = 0; i < s.count; i++) {
        const tint = 0.92 + rand() * 0.12;
        list.push({
          position: [s.x + (rand() - 0.5) * 0.015, s.y + 0.026 + i * 0.052, s.z + (rand() - 0.5) * 0.015],
          rotY: s.rotY + (rand() - 0.5) * 0.08,
          color: base.clone().multiplyScalar(tint),
        });
      }
    }
    return { geometry: g, items: list };
  }, []);

  useLayoutEffect(() => {
    const mesh = ref.current;
    const m = new THREE.Object3D();
    items.forEach((it, i) => {
      m.position.set(...it.position);
      m.rotation.set(0, it.rotY, 0);
      m.updateMatrix();
      mesh.setMatrixAt(i, m.matrix);
      mesh.setColorAt(i, it.color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items]);

  return (
    <instancedMesh ref={ref} args={[geometry, undefined, items.length]} castShadow receiveShadow>
      <meshStandardMaterial roughness={0.92} />
    </instancedMesh>
  );
}

export function Fixtures() {
  return (
    <group>
      {BAYS.map((bay) => (
        <WallBay key={bay.id} bay={bay} />
      ))}
      {GONDOLAS.map((g) => (
        <Gondola key={g.id} g={g} />
      ))}
      <Podium />
      <DisplayTable />
      <RoundTable />
      <Bench />
      <Checkout />
      <FittingRooms />
      <WindowPlatforms />
      {PLANTS.map((p, i) => (
        <Plant key={i} {...p} seed={i + 1} />
      ))}
      <FoldedClothes />
    </group>
  );
}
