'use client';

import { Suspense, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { MeshReflectorMaterial } from '@react-three/drei';
import { ROOM } from '@/lib/store/layout';
import { STORE_NAME } from '@/lib/store/products';
import { runtime } from '@/lib/store/runtime';
import { useQuality } from '@/lib/store/useStore';
import { getFloorTexture, getLabelTexture, getWindowsTexture } from './textures';
import { Text3DLabel } from './Text3DLabel';

const W = ROOM.halfW;
const D = ROOM.halfD;
const H = ROOM.height;

function Floor() {
  const { reflections } = useQuality();
  const map = getFloorTexture();
  return (
    // The reflector renders a mirror view of this exact mesh, so it must stay its own mesh.
    <mesh rotation-x={-Math.PI / 2} receiveShadow userData={{ noBatch: true }}>
      <planeGeometry args={[W * 2, D * 2]} />
      {reflections ? (
        <MeshReflectorMaterial
          map={map}
          color="#d8d2c8"
          blur={[400, 120]}
          resolution={512}
          mixBlur={1}
          mixStrength={0.9}
          mixContrast={1}
          roughness={0.75}
          metalness={0.05}
          depthScale={0.8}
          minDepthThreshold={0.3}
          maxDepthThreshold={1.3}
          mirror={0.5}
        />
      ) : (
        <meshStandardMaterial map={map} color="#d8d2c8" roughness={0.55} metalness={0.05} />
      )}
    </mesh>
  );
}

function Walls() {
  return (
    <group>
      <mesh position={[0, H / 2, -D - 0.15]} receiveShadow>
        <boxGeometry args={[W * 2 + 0.6, H, 0.3]} />
        <meshStandardMaterial color="#e9e3d8" roughness={0.95} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (W + 0.15), H / 2, 0]} receiveShadow>
          <boxGeometry args={[0.3, H, D * 2]} />
          <meshStandardMaterial color="#e9e3d8" roughness={0.95} />
        </mesh>
      ))}
      {/* skirting */}
      <mesh position={[0, 0.06, -D + 0.01]}>
        <boxGeometry args={[W * 2, 0.12, 0.03]} />
        <meshStandardMaterial color="#2b2a2a" roughness={0.6} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (W - 0.01), 0.06, 0]}>
          <boxGeometry args={[0.03, 0.12, D * 2]} />
          <meshStandardMaterial color="#2b2a2a" roughness={0.6} />
        </mesh>
      ))}
      {/* ceiling */}
      <mesh position={[0, H + 0.1, 0]}>
        <boxGeometry args={[W * 2 + 0.6, 0.2, D * 2 + 0.6]} />
        <meshStandardMaterial color="#2a2a2d" roughness={0.9} />
      </mesh>
      {/* linear light strips */}
      {[-6, 0, 6].map((x) => (
        <mesh key={x} position={[x, H - 0.03, -0.5]}>
          <boxGeometry args={[0.14, 0.05, D * 2 - 3]} />
          <meshStandardMaterial color="#fff6e6" emissive="#fff3df" emissiveIntensity={2.2} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function Glass({ width, height, position }) {
  return (
    <mesh position={position}>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial
        color="#cfe2ea"
        transparent
        opacity={0.14}
        roughness={0.05}
        metalness={0.9}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

function DoorPanel({ side }) {
  const ref = useRef(null);
  const frame = <meshStandardMaterial color="#161616" metalness={0.6} roughness={0.35} />;
  useFrame(() => {
    if (ref.current) ref.current.position.x = side * (0.75 + runtime.doors.open * 1.45);
  });
  return (
    <group ref={ref} position={[side * 0.75, 0, D - 0.08]} userData={{ noBatch: true }}>
      <Glass width={1.42} height={2.9} position={[0, 1.5, 0]} />
      {[
        [0, 2.97, 1.5, 0.08],
        [0, 0.05, 1.5, 0.1],
      ].map(([x, y, w, h], i) => (
        <mesh key={i} position={[x, y, 0]}>
          <boxGeometry args={[w, h, 0.06]} />
          {frame}
        </mesh>
      ))}
      {[-0.72, 0.72].map((x) => (
        <mesh key={x} position={[x, 1.5, 0]}>
          <boxGeometry args={[0.06, 3, 0.06]} />
          {frame}
        </mesh>
      ))}
      {/* long pull handle */}
      <mesh position={[-side * 0.55, 1.2, 0.07]}>
        <cylinderGeometry args={[0.016, 0.016, 1.1, 10]} />
        <meshStandardMaterial color="#b9a17a" metalness={1} roughness={0.25} />
      </mesh>
    </group>
  );
}

function Storefront() {
  const mullionMat = <meshStandardMaterial color="#141414" metalness={0.5} roughness={0.4} />;
  const subtitle = getLabelTexture('CONCEPT STORE', { color: '#d9c3a1', weight: 600, size: 80, tracking: 26 });
  return (
    <group>
      {/* fixed glazing */}
      <Glass width={W - 1.55} height={3.8} position={[-(W + 1.55) / 2, 1.9, D]} />
      <Glass width={W - 1.55} height={3.8} position={[(W + 1.55) / 2, 1.9, D]} />
      <Glass width={3.1} height={0.8} position={[0, 3.4, D]} />
      {[-W, -7.8, -4.6, -1.55, 1.55, 4.6, 7.8, W].map((x) => (
        <mesh key={x} position={[x, 1.9, D]}>
          <boxGeometry args={[0.1, 3.8, 0.16]} />
          {mullionMat}
        </mesh>
      ))}
      <mesh position={[0, 3.0, D]}>
        <boxGeometry args={[3.1, 0.1, 0.16]} />
        {mullionMat}
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (W + 1.55) / 2, 0.075, D]}>
          <boxGeometry args={[W - 1.55, 0.15, 0.14]} />
          {mullionMat}
        </mesh>
      ))}
      <DoorPanel side={-1} />
      <DoorPanel side={1} />
      {/* fascia + sign */}
      <mesh position={[0, 4.75, D + 0.15]}>
        <boxGeometry args={[W * 2 + 0.6, 1.9, 0.3]} />
        <meshStandardMaterial color="#1b1b1d" roughness={0.6} />
      </mesh>
      <Suspense fallback={null}>
        <Text3DLabel text={STORE_NAME} size={0.78} depth={0.08} tracking={0.14} bevel={0.008} position={[0, 4.95, D + 0.36]}>
          <meshStandardMaterial color="#fff4e2" emissive="#ffe9c4" emissiveIntensity={1.6} toneMapped={false} />
        </Text3DLabel>
      </Suspense>
      <mesh position={[0, 4.2, D + 0.31]}>
        <planeGeometry args={[3.2, 0.6]} />
        <meshBasicMaterial map={subtitle} transparent toneMapped={false} />
      </mesh>
      {/* apartments above the shop */}
      <mesh position={[0, 8.4, D - 0.25]}>
        <boxGeometry args={[W * 2 + 0.6, 5.4, 1.1]} />
        <meshStandardMaterial color="#3a3836" roughness={0.9} map={getWindowsTexture(3)} emissiveMap={getWindowsTexture(3)} emissive="#ffffff" emissiveIntensity={0.55} />
      </mesh>
    </group>
  );
}

function Street() {
  const windowsA = getWindowsTexture(1);
  const windowsB = getWindowsTexture(2);
  return (
    <group>
      {/* sidewalk */}
      <mesh position={[0, -0.05, D + 4.15]} receiveShadow>
        <boxGeometry args={[90, 0.1, 8.3]} />
        <meshStandardMaterial color="#77736d" roughness={0.95} />
      </mesh>
      <mesh position={[0, -0.02, D + 8.3]}>
        <boxGeometry args={[90, 0.16, 0.25]} />
        <meshStandardMaterial color="#9a958c" roughness={0.9} />
      </mesh>
      {/* road */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.1, D + 28]}>
        <planeGeometry args={[180, 40]} />
        <meshStandardMaterial color="#202226" roughness={0.95} />
      </mesh>
      {Array.from({ length: 14 }, (_, i) => (
        <mesh key={i} rotation-x={-Math.PI / 2} position={[-39 + i * 6, -0.09, D + 15]}>
          <planeGeometry args={[2.6, 0.14]} />
          <meshBasicMaterial color="#c9c3b5" />
        </mesh>
      ))}
      {/* neighbouring buildings */}
      {[
        { x: -26.3, w: 30, h: 12, tex: windowsA },
        { x: 26.3, w: 30, h: 14, tex: windowsB },
      ].map((b) => (
        <mesh key={b.x} position={[b.x, b.h / 2, -2]}>
          <boxGeometry args={[b.w, b.h, D * 2 + 4.6]} />
          <meshStandardMaterial color="#45423f" roughness={0.9} map={b.tex} emissiveMap={b.tex} emissive="#ffffff" emissiveIntensity={0.5} />
        </mesh>
      ))}
      {/* street lamps */}
      {[-14, 14].map((x) => (
        <group key={x} position={[x, 0, D + 7.6]}>
          <mesh position-y={2.6}>
            <cylinderGeometry args={[0.06, 0.08, 5.2, 10]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.6} roughness={0.4} />
          </mesh>
          <mesh position-y={5.2}>
            <sphereGeometry args={[0.28, 16, 12]} />
            <meshStandardMaterial color="#fff1d6" emissive="#ffdca0" emissiveIntensity={3} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function FeatureWall() {
  const subtitle = getLabelTexture('CONCEPT STORE  ·  FW26', { color: '#cdb38c', weight: 500, size: 70, tracking: 22 });
  return (
    <group position={[0, 0, -D + 0.02]}>
      <mesh position={[0, 2.9, 0.04]}>
        <boxGeometry args={[8, 3, 0.08]} />
        <meshStandardMaterial color="#1c1c1e" roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.38, 0.09]}>
        <boxGeometry args={[8, 0.04, 0.04]} />
        <meshStandardMaterial color="#fff2dc" emissive="#ffe6bf" emissiveIntensity={2} toneMapped={false} />
      </mesh>
      <Suspense fallback={null}>
        <Text3DLabel text={STORE_NAME} size={0.7} depth={0.06} tracking={0.12} bevel={0.006} position={[0, 3.25, 0.16]}>
          <meshStandardMaterial color="#d6b27a" metalness={1} roughness={0.22} />
        </Text3DLabel>
      </Suspense>
      <mesh position={[0, 2.35, 0.09]}>
        <planeGeometry args={[4.2, 0.78]} />
        <meshBasicMaterial map={subtitle} transparent toneMapped={false} />
      </mesh>
    </group>
  );
}

function EntranceRug() {
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.006, D - 1.4]} receiveShadow>
      <planeGeometry args={[3.4, 1.9]} />
      <meshStandardMaterial color="#2c2a28" roughness={1} />
    </mesh>
  );
}

export function StoreBuilding() {
  return (
    <group>
      <Floor />
      <Walls />
      <Storefront />
      <FeatureWall />
      <EntranceRug />
      <Street />
    </group>
  );
}
