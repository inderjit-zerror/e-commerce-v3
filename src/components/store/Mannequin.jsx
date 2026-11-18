'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { PRODUCTS_BY_ID } from '@/lib/store/products';
import { useQuality, useStore } from '@/lib/store/useStore';
import { registerGarmentNode, registerTarget } from '@/lib/store/runtime';
import { getFabricMaterial, getSolidMaterial } from './garmentGeometry';
import { getFabricNormalMap } from './textures';

const TORSO_Y = 0.95; // height of the torso base above the stand base
const NECK = 0.69; // torso height

const TORSO = [
  [0.001, 0],
  [0.15, 0],
  [0.165, 0.05],
  [0.155, 0.16],
  [0.135, 0.26],
  [0.14, 0.32],
  [0.165, 0.42],
  [0.175, 0.5],
  [0.165, 0.58],
  [0.13, 0.64],
  [0.07, 0.675],
  [0.05, 0.69],
  [0.001, 0.69],
];

const TOP = TORSO.slice(1, 11).map(([r, y]) => [r + 0.013, y]);
const COVERS = {
  top: [[0.178, -0.04], ...TOP, [0.064, 0.684]],
  jacket: [[0.2, -0.14], [0.19, 0.0], ...TOP.slice(1).map(([r, y]) => [r + 0.012, y]), [0.07, 0.688]],
  coat: [[0.27, -0.52], [0.23, -0.25], [0.2, -0.04], ...TOP.slice(1).map(([r, y]) => [r + 0.014, y]), [0.072, 0.688]],
  dress: [[0.37, -0.64], [0.29, -0.32], [0.205, -0.03], [0.175, 0.1], [0.15, 0.26], [0.155, 0.32], [0.18, 0.42], [0.189, 0.5], [0.178, 0.565]],
};

const geoCache = new Map();
function lathe(key, points) {
  if (!geoCache.has(key)) {
    const geometry = new THREE.LatheGeometry(
      points.map(([r, y]) => new THREE.Vector2(r, y - NECK)),
      36,
    );
    geoCache.set(key, geometry);
  }
  return geoCache.get(key);
}

let formMaterial = null;
function getFormMaterial() {
  if (!formMaterial) {
    formMaterial = new THREE.MeshStandardMaterial({
      color: '#e6ddcd',
      roughness: 0.85,
      normalMap: getFabricNormalMap(),
      normalScale: new THREE.Vector2(0.3, 0.3),
    });
  }
  return formMaterial;
}

function coverKind(product) {
  if (product.type === 'dress') return 'dress';
  if (product.type === 'jacket') return product.long ? 'coat' : 'jacket';
  return 'top';
}

function GarmentCover({ product, colorHex, detail }) {
  const kind = coverKind(product);
  const material = getFabricMaterial(colorHex, { type: product.type, detail });
  // The lathe is open at the bottom, so render both sides.
  const shell = getFabricMaterial(colorHex, { type: product.type, doubleSide: true, detail });
  const geometry = lathe(kind, COVERS[kind]);
  return (
    <group>
      <mesh geometry={geometry} material={shell} scale={[1, 1, 0.76]} castShadow />
      {kind !== 'dress' &&
        [-1, 1].map((s) => (
          <mesh key={s} material={shell} position={[s * 0.165, -0.085, 0]} rotation-z={s * 1.05} castShadow>
            <cylinderGeometry args={[0.05, 0.062, 0.12, 16, 1, true]} />
          </mesh>
        ))}
      {product.type === 'hoodie' && (
        <mesh material={material} position={[0, -0.03, -0.06]} rotation-x={-1.15} scale={[1, 1, 0.8]}>
          <torusGeometry args={[0.075, 0.038, 10, 24]} />
        </mesh>
      )}
      {product.rollneck && (
        <mesh material={material} position={[0, 0.03, 0]}>
          <cylinderGeometry args={[0.058, 0.064, 0.1, 20]} />
        </mesh>
      )}
      {kind === 'coat' && (
        <mesh material={material} position={[0, -0.47, 0.155]} rotation-x={0.12}>
          <boxGeometry args={[0.36, 0.045, 0.02]} />
        </mesh>
      )}
    </group>
  );
}

export function Mannequin({ placement }) {
  const product = PRODUCTS_BY_ID[placement.productId];
  const q = useQuality();
  const hidden = useStore((s) => s.inspect?.key === placement.key);
  const hovered = useStore((s) => s.hovered?.key === placement.key);
  const modelRef = useRef(null);
  const hitRef = useRef(null);
  const tall = product.type === 'dress' || product.long;

  useEffect(() => {
    const offTarget = registerTarget(hitRef.current);
    const offNode = registerGarmentNode(placement.key, modelRef.current);
    return () => {
      offTarget();
      offNode();
    };
  }, [placement.key]);

  const metal = getSolidMaterial('#1f1f22', { metal: true });
  const wood = getSolidMaterial('#8a6646', { roughness: 0.5 });

  return (
    <group position={placement.position} rotation-y={placement.rotationY}>
      {/* stand */}
      <mesh material={metal} position-y={0.015} castShadow receiveShadow>
        <cylinderGeometry args={[0.2, 0.22, 0.03, 32]} />
      </mesh>
      <mesh material={metal} position-y={TORSO_Y / 2}>
        <cylinderGeometry args={[0.014, 0.014, TORSO_Y, 8]} />
      </mesh>
      {/* dress form */}
      <mesh geometry={lathe('torso', TORSO)} material={getFormMaterial()} position-y={TORSO_Y + NECK} scale={[1, 1, 0.72]} castShadow />
      <mesh material={getFormMaterial()} position-y={TORSO_Y + NECK + 0.045}>
        <cylinderGeometry args={[0.042, 0.048, 0.09, 16]} />
      </mesh>
      <mesh material={wood} position-y={TORSO_Y + NECK + 0.1} scale={[1, 0.55, 1]}>
        <sphereGeometry args={[0.05, 16, 12]} />
      </mesh>
      {/* the product being worn; origin sits at the neckline */}
      {/* noBatch: this part hides while inspected, so it can't be merged with the stands */}
      <group ref={modelRef} position-y={TORSO_Y + NECK} visible={!hidden} userData={{ noBatch: true }}>
        <GarmentCover product={product} colorHex={product.colors[0].hex} detail={q.fabricDetail} />
        {hovered && (
          <mesh position={[0, tall ? -0.55 : -0.33, 0]}>
            <cylinderGeometry args={[0.32, 0.32, tall ? 1.3 : 0.8, 32, 1, true]} />
            <meshBasicMaterial color="#fff3df" transparent opacity={0.08} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        )}
      </group>
      <mesh
        ref={hitRef}
        visible={false}
        position-y={tall ? 1.1 : 1.25}
        userData={{ garmentKey: placement.key, productId: product.id }}
      >
        <boxGeometry args={[0.6, tall ? 1.4 : 0.95, 0.5]} />
      </mesh>
    </group>
  );
}
