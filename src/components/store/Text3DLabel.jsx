'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { useLoader } from '@react-three/fiber';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const FONT_URL = '/fonts/helvetiker_bold.typeface.json';

// Extruded, letter-spaced 3D text, centred on its origin.
// (Built by hand because three r18x renamed TextGeometry's `height` to `depth`.)
export function Text3DLabel({ text, size = 1, depth = 0.1, tracking = 0.1, bevel = 0.01, children, ...props }) {
  const font = useLoader(FontLoader, FONT_URL);
  const geometry = useMemo(() => {
    const scale = size / font.data.resolution;
    const parts = [];
    let x = 0;
    for (const ch of text) {
      const glyph = font.data.glyphs[ch] ?? font.data.glyphs['?'];
      if (ch !== ' ') {
        const shapes = font.generateShapes(ch, size);
        const g = new THREE.ExtrudeGeometry(shapes, {
          depth,
          curveSegments: 6,
          bevelEnabled: bevel > 0,
          bevelSize: bevel,
          bevelThickness: bevel,
          bevelSegments: 2,
        });
        g.translate(x, 0, 0);
        parts.push(g);
      }
      x += glyph.ha * scale + size * tracking;
    }
    const merged = mergeGeometries(parts);
    parts.forEach((g) => g.dispose());
    merged.center();
    merged.computeVertexNormals();
    return merged;
  }, [font, text, size, depth, tracking, bevel]);

  return (
    <mesh geometry={geometry} {...props}>
      {children}
    </mesh>
  );
}
