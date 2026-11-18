'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { runtime } from '@/lib/store/runtime';
import { useStore } from '@/lib/store/useStore';

const REACH = 4.2;

// Casts a ray from the centre of the screen (the crosshair) every frame and
// reports which garment, if any, the player is looking at.
export function Interaction() {
  const camera = useThree((s) => s.camera);
  const { raycaster, center } = useMemo(() => {
    const r = new THREE.Raycaster();
    r.far = REACH;
    return { raycaster: r, center: new THREE.Vector2(0, 0) };
  }, []);

  useFrame(() => {
    const s = useStore.getState();
    if (s.mode !== 'play') return;
    raycaster.setFromCamera(center, camera);
    const hit = raycaster.intersectObjects(runtime.raycastTargets, false)[0];
    const key = hit?.object.userData.garmentKey ?? null;
    if ((s.hovered?.key ?? null) !== key) {
      s.setHovered(key ? { key, productId: hit.object.userData.productId } : null);
    }
  });

  return null;
}
