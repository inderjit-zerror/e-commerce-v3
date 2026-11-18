'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, PerformanceMonitor } from '@react-three/drei';
import { MANNEQUINS, PLACEMENTS, PODIUM } from '@/lib/store/layout';
import { QUALITY } from '@/lib/store/device';
import { selectTier, useQuality, useStore } from '@/lib/store/useStore';
import { StoreBuilding } from './StoreBuilding';
import { Fixtures } from './Fixtures';
import { StaticBatch } from './StaticBatch';
import { Garment, Hangers, WallArms } from './Garment';
import { Mannequin } from './Mannequin';
import { Player } from './Player';
import { Interaction } from './Interaction';
import { InspectView } from './InspectView';

function Spot({ position, target }) {
  const targetObject = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(...target);
    return o;
  }, [target]);
  return (
    <>
      <primitive object={targetObject} />
      <spotLight position={position} target={targetObject} angle={0.38} penumbra={0.7} intensity={38} distance={9} decay={2} color="#ffe9cc" />
    </>
  );
}

// Lowers (or restores) the graphics tier from the measured frame rate when
// quality is on "Auto". Only measures while walking around (not during the
// fly-in, when shaders are still compiling) and ignores background tabs.
function AutoQuality() {
  const auto = useStore((s) => s.qualityMode === 'auto');
  const walking = useStore((s) => s.mode === 'play' || s.mode === 'inspect');
  const stepAutoTier = useStore((s) => s.stepAutoTier);
  const setAutoTier = useStore((s) => s.setAutoTier);
  if (!auto || !walking) return null;
  const visible = () => document.visibilityState === 'visible';
  return (
    <PerformanceMonitor
      ms={300}
      iterations={8}
      flipflops={4}
      bounds={(refresh) => (refresh > 100 ? [55, 90] : [38, 55])}
      onDecline={() => visible() && stepAutoTier(-1)}
      onIncline={() => visible() && stepAutoTier(1)}
      onFallback={() => visible() && setAutoTier('saver')}
    />
  );
}

// Nothing that casts a shadow moves (garment sway is a few millimetres), so the
// shadow map is drawn for the first frames and after a quality change, then frozen.
// That removes a whole extra render of the store from every frame.
function ShadowBaker() {
  const tier = useStore(selectTier);
  const pending = useRef(0);
  useEffect(() => {
    pending.current = 90;
  }, [tier]);
  useFrame(({ gl }) => {
    gl.shadowMap.autoUpdate = false;
    if (pending.current > 0) {
      pending.current -= 1;
      gl.shadowMap.needsUpdate = true;
    }
  });
  return null;
}

// Battery saver: render at a steady 30 fps (frameloop is 'demand' in that tier).
function FrameCap() {
  const { fpsCap } = useQuality();
  const moving = useStore((s) => s.mode === 'play' || s.mode === 'inspect' || s.mode === 'entering');
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (!fpsCap || !moving) return;
    const interval = 1000 / fpsCap;
    let last = 0;
    let raf = requestAnimationFrame(function loop(now) {
      raf = requestAnimationFrame(loop);
      if (now - last >= interval - 1) {
        last = now;
        invalidate();
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [fpsCap, moving, invalidate]);
  return null;
}

// Compile every shader while the intro screen is up, instead of stuttering the
// first time each material comes into view (worst on slow mobile GPUs).
function Precompile() {
  const get = useThree((s) => s.get);
  useEffect(() => {
    const id = setTimeout(() => {
      const { gl, scene, camera } = get();
      gl.compileAsync?.(scene, camera)?.catch(() => {});
    }, 400);
    return () => clearTimeout(id);
  }, [get]);
  return null;
}

function Lighting() {
  const tier = useStore(selectTier);
  const q = QUALITY[tier];
  return (
    <>
      <ambientLight intensity={q.extraLights ? 0.28 : 0.45} />
      <hemisphereLight args={['#fff4e6', '#4a4038', q.extraLights ? 0.85 : 1.35]} />
      <directionalLight
        key={`sun-${tier}`} // remount so a new shadow map size takes effect
        position={[5, 14, 7]}
        intensity={1.25}
        color="#fff1de"
        castShadow={q.shadows}
        shadow-mapSize={[q.shadowMap, q.shadowMap]}
        shadow-camera-left={-17}
        shadow-camera-right={17}
        shadow-camera-top={17}
        shadow-camera-bottom={-17}
        shadow-camera-near={1}
        shadow-camera-far={40}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      />
      {/* Extra fill lights are the main per-pixel cost, so low-end devices skip them. */}
      {q.extraLights && (
        <>
          {[
            [-6, 4.2, -7],
            [6, 4.2, -7],
            [-6, 4.2, 6],
            [6, 4.2, 6],
          ].map((p) => (
            <pointLight key={p.join()} position={p} intensity={14} distance={13} decay={2} color="#ffe6c7" />
          ))}
          <Spot position={[0, 4.8, PODIUM.z + 2.6]} target={[0, 1.4, PODIUM.z + 0.7]} />
          <Spot position={[-2.2, 4.8, PODIUM.z + 1.4]} target={[-0.95, 1.4, PODIUM.z - 0.6]} />
          <Spot position={[2.2, 4.8, PODIUM.z + 1.4]} target={[0.95, 1.4, PODIUM.z - 0.6]} />
        </>
      )}
      <Environment key={`env-${tier}`} resolution={q.envResolution} frames={1} environmentIntensity={q.extraLights ? 0.65 : 0.9}>
        <Lightformer form="rect" intensity={2.2} color="#fff3e2" position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[18, 26, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#ffe8cc" position={[-10, 2.5, 0]} rotation-y={Math.PI / 2} scale={[26, 3, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#ffe8cc" position={[10, 2.5, 0]} rotation-y={-Math.PI / 2} scale={[26, 3, 1]} />
        <Lightformer form="rect" intensity={0.8} color="#cfe0ff" position={[0, 2.5, 14]} rotation-y={Math.PI} scale={[20, 4, 1]} />
      </Environment>
    </>
  );
}

export function Experience() {
  return (
    <>
      <color attach="background" args={['#12141a']} />
      <fog attach="fog" args={['#12141a', 28, 75]} />
      <AutoQuality />
      <ShadowBaker />
      <FrameCap />
      <Precompile />
      <Lighting />
      <StaticBatch>
        <StoreBuilding />
        <Fixtures />
        {MANNEQUINS.map((placement) => (
          <Mannequin key={placement.key} placement={placement} />
        ))}
      </StaticBatch>
      <WallArms />
      <Hangers />
      {PLACEMENTS.map((placement) => (
        <Garment key={placement.key} placement={placement} />
      ))}
      <Player />
      <Interaction />
      <InspectView />
    </>
  );
}
