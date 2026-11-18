'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { useFrame, useThree } from '@react-three/fiber';
import { Hud, useKeyboardControls } from '@react-three/drei';
import { PRODUCTS_BY_ID } from '@/lib/store/products';
import { EYE_HEIGHT } from '@/lib/store/layout';
import { runtime } from '@/lib/store/runtime';
import { useQuality, useStore } from '@/lib/store/useStore';
import { device } from '@/lib/store/device';
import { GarmentModel } from './Garment';
import { getGarmentSpec } from './garmentGeometry';
import { fovForAspect } from './Player';

const Y_AXIS = new THREE.Vector3(0, 1, 0);

// Portrait phones show product details as a bottom sheet; everything else uses
// the side panel. Keep in sync with the media query in hud.module.css.
const isBottomSheet = (size) => size.width <= 760 && size.width / size.height <= 1.1;

// Where the garment should float so it fills the free part of the screen:
// left of the side panel on wide screens, above the bottom sheet on narrow ones.
function frameGarment(spec, size) {
  const p = runtime.player;
  const aspect = size.width / size.height;
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(fovForAspect(aspect) / 2));
  const fwd = new THREE.Vector3(-Math.sin(p.yaw), 0, -Math.cos(p.yaw));
  const right = new THREE.Vector3(Math.cos(p.yaw), 0, -Math.sin(p.yaw));
  const target = new THREE.Vector3(p.x, EYE_HEIGHT, p.z);

  if (isBottomSheet(size)) {
    // Fit hook-to-hem into the band between the top bar (~NDC 0.84) and the
    // bottom sheet (~NDC 0.02), i.e. a band 0.82 tall centred at NDC y 0.43.
    const SCALE = 1.05; // matches the scale-up applied in useFrame
    const top = 0.14 * SCALE; // hanger hook above the neckline
    const visualH = (spec.len + 0.14) * SCALE;
    const halfH = Math.max(visualH / (0.9 * 0.82), (spec.width * SCALE) / (1.8 * aspect));
    const dist = Math.max(halfH / tanHalf, 0.8);
    const centreY = EYE_HEIGHT + 0.43 * tanHalf * dist;
    const neckY = centreY - (top - spec.len * SCALE) / 2;
    return target.addScaledVector(fwd, dist).setY(neckY);
  }

  const dist = Math.max(1.4, (spec.len * 0.62) / tanHalf);
  const halfW = tanHalf * dist * aspect;
  const panel = Math.min(440, size.width * 0.42);
  const shift = -((panel / 2 + 12) / (size.width / 2)) * halfW;
  return target.addScaledVector(fwd, dist).addScaledVector(right, shift).setY(EYE_HEIGHT + spec.len * 0.5);
}

// Flies the selected garment off the rack to just in front of the player.
// Rendered in a HUD layer (depth cleared) so it never clips into walls or racks.
function InspectItem({ inspect }) {
  const size = useThree((s) => s.size);
  // Same material variant as the racks, so opening inspect never compiles a new shader.
  const { fabricDetail } = useQuality();
  const [, getKeys] = useKeyboardControls();
  const groupRef = useRef(null);
  const lightRig = useRef(null);
  const anim = useRef(null);
  const product = PRODUCTS_BY_ID[inspect.productId];
  const spec = getGarmentSpec(product);
  const color = product.colors[inspect.colorIndex]?.hex ?? product.colors[0].hex;

  useLayoutEffect(() => {
    const p = runtime.player;
    anim.current = {
      t: 0,
      spin: 0,
      fromPos: new THREE.Vector3().fromArray(inspect.from.position),
      fromQuat: new THREE.Quaternion().fromArray(inspect.from.quaternion),
      toPos: frameGarment(spec, size),
      toQuat: new THREE.Quaternion().setFromAxisAngle(Y_AXIS, p.yaw),
      q: new THREE.Quaternion(),
      spinQ: new THREE.Quaternion(),
    };
    const tween = gsap.to(anim.current, { t: 1, duration: device.reducedMotion ? 0.4 : 0.95, ease: 'power3.inOut' });
    return () => tween.kill();
    // Only on open: later colour/size changes must not restart the flight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-frame (without restarting the flight) when the screen is resized or rotated.
  useLayoutEffect(() => {
    if (!anim.current) return;
    anim.current.toPos.copy(frameGarment(spec, size));
    if (lightRig.current) {
      lightRig.current.position.copy(anim.current.toPos);
      lightRig.current.rotation.y = runtime.player.yaw;
    }
  }, [spec, size]);

  useEffect(() => {
    if (!inspect.closing || !anim.current) return;
    const tween = gsap.to(anim.current, {
      t: 0,
      duration: 0.7,
      ease: 'power3.inOut',
      onComplete: () => useStore.getState().finishInspect(),
    });
    return () => tween.kill();
  }, [inspect.closing]);

  useFrame((state, dt) => {
    const a = anim.current;
    const g = groupRef.current;
    if (!a || !g) return;
    if (!inspect.closing) {
      const k = getKeys();
      const dir = (k.right || k.turnRight ? 1 : 0) - (k.left || k.turnLeft ? 1 : 0);
      if (dir) runtime.inspectSpin += dir * dt * 2.4;
      else if (!runtime.inspectDragging && a.t > 0.99) runtime.inspectSpin += dt * 0.3;
    }
    a.spin += (runtime.inspectSpin - a.spin) * Math.min(1, dt * 8);
    g.position.lerpVectors(a.fromPos, a.toPos, a.t);
    g.position.y += Math.sin(state.clock.elapsedTime * 1.6) * 0.012 * a.t;
    a.q.slerpQuaternions(a.fromQuat, a.toQuat, a.t);
    a.spinQ.setFromAxisAngle(Y_AXIS, a.spin * a.t);
    g.quaternion.copy(a.q).multiply(a.spinQ);
    const scale = 1 + 0.05 * a.t;
    g.scale.setScalar(scale);
  });

  return (
    <>
      <ambientLight intensity={0.55} />
      <hemisphereLight args={['#fff6ea', '#3b342e', 0.9]} />
      {/* Rig sits at the garment, rotated to face the player: key light front-right, rim light behind. */}
      <group ref={lightRig}>
        <pointLight position={[1.2, 1.4, 2.4]} intensity={2.6} decay={0} color="#fff3e2" />
        <pointLight position={[-1.8, 0.4, 1.6]} intensity={0.9} decay={0} color="#e8eeff" />
        <pointLight position={[0, 1.5, -2]} intensity={1.2} decay={0} color="#ffe6c7" />
      </group>
      <group ref={groupRef}>
        <GarmentModel product={product} colorHex={color} shadows={false} detail={fabricDetail} />
      </group>
    </>
  );
}

export function InspectView() {
  const inspect = useStore((s) => s.inspect);
  if (!inspect) return null;
  return (
    <Hud renderPriority={1}>
      <InspectItem key={inspect.openedAt} inspect={inspect} />
    </Hud>
  );
}
