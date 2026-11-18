'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Merge static meshes that look identical (same material settings) into one mesh
// each, after the subtree mounts. The store's fixtures are ~250 small meshes; this
// turns them into a few dozen draw calls, which is the main cost on weak devices.
//
// Originals are hidden, not removed, so raycasting against them still works.
// Mark anything that moves or uses a special material with userData.noBatch.
//
// Off in `next dev` (an edited fixture wouldn't show until reload); add ?batch=1
// to the URL to try it there.
const ENABLED =
  typeof window !== 'undefined' && (process.env.NODE_ENV === 'production' || new URLSearchParams(window.location.search).has('batch'));

const hex = (c) => (c ? c.getHexString() : '-');

function signature(mesh) {
  const m = mesh.material;
  return [
    m.type,
    hex(m.color),
    hex(m.emissive),
    m.emissiveIntensity,
    m.roughness,
    m.metalness,
    m.map?.uuid,
    m.normalMap?.uuid,
    m.emissiveMap?.uuid,
    m.transparent,
    m.opacity,
    m.side,
    m.toneMapped,
    m.flatShading,
    m.depthWrite,
    m.envMapIntensity,
    mesh.castShadow,
    mesh.receiveShadow,
    mesh.renderOrder,
  ].join('|');
}

function isBatchable(mesh, root) {
  if (!mesh.isMesh || mesh.isInstancedMesh || mesh.isSkinnedMesh) return false;
  const m = mesh.material;
  if (!m || Array.isArray(m) || m.vertexColors || m.isShaderMaterial) return false;
  if (!mesh.geometry?.attributes.position || !mesh.geometry.attributes.normal) return false;
  if (mesh.matrixWorld.determinant() < 0) return false; // mirrored: winding would flip
  for (let o = mesh; o && o !== root.parent; o = o.parent) {
    if (!o.visible || o.userData.noBatch) return false;
  }
  return true;
}

function batch(root) {
  root.updateWorldMatrix(true, true);
  const toRoot = root.matrixWorld.clone().invert();
  const groups = new Map();
  root.traverse((o) => {
    if (o === root || !isBatchable(o, root)) return;
    const key = signature(o);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(o);
  });

  const created = [];
  const hidden = [];
  const matrix = new THREE.Matrix4();
  for (const meshes of groups.values()) {
    if (meshes.length < 2) continue;
    const { material } = meshes[0];
    const keepUv = Boolean(material.map || material.normalMap || material.emissiveMap);
    const parts = meshes.map((mesh) => {
      const g = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
      for (const name of Object.keys(g.attributes)) {
        if (name !== 'position' && name !== 'normal' && !(keepUv && name === 'uv')) g.deleteAttribute(name);
      }
      if (keepUv && !g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      g.morphAttributes = {};
      g.clearGroups();
      g.applyMatrix4(matrix.multiplyMatrices(toRoot, mesh.matrixWorld));
      return g;
    });
    const merged = mergeGeometries(parts, false);
    parts.forEach((g) => g.dispose());
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = meshes[0].castShadow;
    mesh.receiveShadow = meshes[0].receiveShadow;
    mesh.renderOrder = meshes[0].renderOrder;
    mesh.name = `batch(${meshes.length})`;
    root.add(mesh);
    created.push(mesh);
    for (const original of meshes) {
      original.visible = false;
      hidden.push(original);
    }
  }

  return () => {
    for (const mesh of created) {
      root.remove(mesh);
      mesh.geometry.dispose();
    }
    for (const original of hidden) original.visible = true;
  };
}

export function StaticBatch({ children }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ENABLED || !ref.current) return;
    return batch(ref.current);
  }, []);
  return <group ref={ref}>{children}</group>;
}
