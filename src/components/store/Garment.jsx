'use client';

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Outlines } from '@react-three/drei';
import { PRODUCTS_BY_ID } from '@/lib/store/products';
import { PLACEMENTS, ROD_Y } from '@/lib/store/layout';
import { useQuality, useStore } from '@/lib/store/useStore';
import { registerGarmentNode, registerTarget, runtime } from '@/lib/store/runtime';
import { getArmGeometry, getFabricMaterial, getGarmentSpec, getHangerGeometry, getSolidMaterial, getVertexColorMaterial } from './garmentGeometry';
import { getPrintTexture, getPriceTagTexture } from './textures';

// Stable per-garment animation offset (keeps renders pure).
export const phaseFromKey = (key) => [...key].reduce((acc, ch) => acc + ch.charCodeAt(0) * 0.37, 0) % (Math.PI * 2);

function PriceTag({ product, spec }) {
  const texture = getPriceTagTexture(product);
  return (
    <mesh position={[spec.tag[0], spec.tag[1], spec.front + 0.006]} rotation-z={0.12}>
      <planeGeometry args={[0.055, 0.0825]} />
      <meshStandardMaterial map={texture} roughness={0.8} />
    </mesh>
  );
}

// The visual garment: hanger + baked fabric + trims. Used on racks and in inspect
// mode. At most 3 draw calls (+ print / price tag where they apply).
export function GarmentModel({ product, colorHex, hovered = false, showTag = false, shadows = true, detail = true, hanger = true }) {
  const spec = getGarmentSpec(product);
  const fabric = getFabricMaterial(colorHex, { type: product.type, pattern: product.pattern, vertexColors: true, detail });
  return (
    <group>
      {hanger && <mesh geometry={getHangerGeometry(hangerKind(spec))} material={getVertexColorMaterial('hanger')} />}
      <mesh geometry={spec.fabric} material={fabric} castShadow={shadows} receiveShadow>
        {hovered && <Outlines thickness={0.012} color="#fff7e8" angle={Math.PI} />}
      </mesh>
      {spec.trim && <mesh geometry={spec.trim} material={getVertexColorMaterial(spec.trimMetal ? 'metal' : 'trim')} />}
      {product.print && (
        <mesh position={[0, -0.25, spec.front + 0.002]}>
          <planeGeometry args={[0.2, 0.2]} />
          <meshStandardMaterial map={getPrintTexture(colorHex)} transparent roughness={0.9} />
        </mesh>
      )}
      {showTag && <PriceTag product={product} spec={spec} />}
    </group>
  );
}

const hangerKind = (spec) => (spec.hanger === 'clip' ? 'clip' : 'bar');
const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);

// Every hanger on the racks in one instanced draw call per hanger type. Each
// instance follows its garment's (swaying) model node; the inspected one is hidden.
export function Hangers() {
  const groups = useMemo(() => {
    const kinds = new Map();
    for (const p of PLACEMENTS) {
      const kind = hangerKind(getGarmentSpec(PRODUCTS_BY_ID[p.productId]));
      if (!kinds.has(kind)) kinds.set(kind, []);
      kinds.get(kind).push(p.key);
    }
    return [...kinds.entries()];
  }, []);
  return groups.map(([kind, keys]) => <HangerInstances key={kind} kind={kind} keys={keys} />);
}

function HangerInstances({ kind, keys }) {
  const ref = useRef(null);
  const { sway } = useQuality();
  const last = useRef({ inspectKey: null, frames: 0 });
  useFrame(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const inspectKey = useStore.getState().inspect?.key ?? null;
    const l = last.current;
    // Without sway nothing moves: only refresh when the inspected garment changes.
    if (!sway && l.frames > 2 && l.inspectKey === inspectKey) return;
    l.inspectKey = inspectKey;
    l.frames += 1;
    keys.forEach((key, i) => {
      const node = runtime.garmentNodes.get(key);
      mesh.setMatrixAt(i, !node || key === inspectKey ? HIDDEN : node.matrixWorld);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh
      ref={ref}
      args={[getHangerGeometry(kind), getVertexColorMaterial('hanger'), keys.length]}
      frustumCulled={false}
    />
  );
}

// Every rail arm in the store in one instanced draw call per arm length.
export function WallArms() {
  const groups = useMemo(() => {
    const byLength = new Map();
    for (const p of PLACEMENTS) {
      if (!p.armLength) continue;
      if (!byLength.has(p.armLength)) byLength.set(p.armLength, []);
      byLength.get(p.armLength).push(p);
    }
    return [...byLength.entries()];
  }, []);
  return groups.map(([length, placements]) => <ArmInstances key={length} length={length} placements={placements} />);
}

function ArmInstances({ length, placements }) {
  const ref = useRef(null);
  const geometry = getArmGeometry(length, ROD_Y);
  const material = getSolidMaterial('#cfcfcf', { metal: true });
  useLayoutEffect(() => {
    const mesh = ref.current;
    const m = new THREE.Object3D();
    placements.forEach((p, i) => {
      m.position.set(...p.position);
      m.rotation.set(0, p.rotationY, 0);
      m.updateMatrix();
      mesh.setMatrixAt(i, m.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [placements]);
  return <instancedMesh ref={ref} args={[geometry, material, placements.length]} />;
}

// A garment hanging in the store that the player can look at and inspect.
export function Garment({ placement }) {
  const product = PRODUCTS_BY_ID[placement.productId];
  const spec = getGarmentSpec(product);
  const q = useQuality();
  const hovered = useStore((s) => s.hovered?.key === placement.key);
  const hidden = useStore((s) => s.inspect?.key === placement.key);
  const swayRef = useRef(null);
  const modelRef = useRef(null);
  const hitRef = useRef(null);
  const motion = useRef({ amp: 0.006, phase: phaseFromKey(placement.key) });

  useEffect(() => {
    const offTarget = registerTarget(hitRef.current);
    const offNode = registerGarmentNode(placement.key, modelRef.current);
    return () => {
      offTarget();
      offNode();
    };
  }, [placement.key]);

  useFrame((state, dt) => {
    const sway = swayRef.current;
    if (!sway) return;
    if (!q.sway) {
      if (sway.rotation.z !== 0 || sway.rotation.y !== 0) sway.rotation.set(0, 0, 0);
      return;
    }
    const m = motion.current;
    const p = runtime.player;
    const dx = p.x - placement.position[0];
    const dz = p.z - placement.position[2];
    const near = dx * dx + dz * dz < 1.1;
    const target = hovered ? 0.02 : near ? 0.045 : 0.006;
    m.amp += (target - m.amp) * Math.min(1, dt * 2.5);
    const t = state.clock.elapsedTime;
    sway.rotation.z = Math.sin(t * 1.3 + m.phase) * m.amp;
    sway.rotation.y = Math.sin(t * 0.9 + m.phase * 1.7) * m.amp * 1.6;
  });

  return (
    <group position={placement.position} rotation-y={placement.rotationY}>
      <group position-y={ROD_Y}>
        <group ref={swayRef}>
          <group ref={modelRef} position-y={-ROD_Y} visible={!hidden}>
            <GarmentModel
              product={product}
              colorHex={product.colors[0].hex}
              hovered={hovered}
              showTag={q.priceTags}
              shadows={q.shadows}
              detail={q.fabricDetail}
              hanger={false} // drawn by <Hangers />
            />
          </group>
        </group>
      </group>
      <mesh
        ref={hitRef}
        visible={false}
        position={[0, -spec.len / 2 + 0.06, 0]}
        userData={{ garmentKey: placement.key, productId: product.id }}
      >
        <boxGeometry args={[spec.width, spec.len + 0.18, 0.3]} />
      </mesh>
    </group>
  );
}
