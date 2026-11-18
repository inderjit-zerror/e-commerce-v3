// Procedural clothing. Each garment is a flat silhouette (rounded with Chaikin
// smoothing), extruded with a soft bevel, plus a few detail pieces. Geometry and
// materials are cached and shared between every garment that uses them.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { getFabricNormalMap, getStripeTexture } from './textures';

// ---------------------------------------------------------------------------
// Outline helpers
// ---------------------------------------------------------------------------
function chaikin(points, iterations = 2) {
  let pts = points;
  for (let k = 0; k < iterations; k++) {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i];
      const [bx, by] = pts[(i + 1) % pts.length];
      out.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25], [ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75]);
    }
    pts = out;
  }
  return pts;
}

// `right` runs from the right side of the neckline, clockwise, to the centre of the hem.
function topOutline(right, neckDip) {
  const [nx, ny] = right[0];
  const pts = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    const s = 2 * t - 1;
    pts.push([-nx + 2 * nx * t, ny - neckDip * (1 - s * s)]);
  }
  for (let i = 1; i < right.length; i++) pts.push(right[i]);
  for (let i = right.length - 2; i >= 1; i--) pts.push([-right[i][0], right[i][1]]);
  return pts;
}

const mirror = (pts) => pts.map(([x, y]) => [-x, y]).reverse();

function shapeFrom(points, smooth = 2) {
  const pts = chaikin(points, smooth);
  const shape = new THREE.Shape();
  shape.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1]);
  shape.closePath();
  return shape;
}

function extrude(points, depth, { smooth = 2, bevel = 0.014 } = {}) {
  const geometry = new THREE.ExtrudeGeometry(shapeFrom(points, smooth), {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel * 0.85,
    bevelSegments: 2,
    curveSegments: 4,
  });
  geometry.translate(0, 0, -depth / 2);
  geometry.computeVertexNormals();
  return geometry;
}

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);

// ---------------------------------------------------------------------------
// Garment specs
// ---------------------------------------------------------------------------
function buildTee() {
  const len = 0.72;
  const right = [
    [0.085, 0],
    [0.22, -0.035],
    [0.4, -0.15],
    [0.345, -0.3],
    [0.235, -0.235],
    [0.25, -len],
    [0, -len],
  ];
  const depth = 0.03;
  return { len, width: 0.82, depth, body: extrude(topOutline(right, 0.07), depth), details: [], tag: [-0.21, -0.3] };
}

function buildSweater({ rollneck = false } = {}) {
  const len = 0.7;
  const right = [
    [0.08, 0],
    [0.23, -0.04],
    [0.36, -0.2],
    [0.44, -0.62],
    [0.37, -0.655],
    [0.3, -0.3],
    [0.245, -0.25],
    [0.25, -0.66],
    [0.235, -len],
    [0, -len],
  ];
  const depth = 0.04;
  const front = depth / 2 + 0.014;
  const details = [
    // ribbed hem band
    { geometry: box(0.5, 0.05, 0.012), position: [0, -len + 0.03, front], tint: 0.86 },
  ];
  if (rollneck) details.push({ geometry: new THREE.CylinderGeometry(0.085, 0.09, 0.09, 20), position: [0, 0.02, 0], tint: 0.92 });
  return { len, width: 0.92, depth, body: extrude(topOutline(right, 0.06), depth), details, tag: [-0.23, -0.33] };
}

function buildHoodie() {
  const len = 0.72;
  const right = [
    [0.09, 0],
    [0.24, -0.045],
    [0.37, -0.21],
    [0.45, -0.63],
    [0.38, -0.665],
    [0.31, -0.31],
    [0.255, -0.26],
    [0.26, -0.67],
    [0.245, -len],
    [0, -len],
  ];
  const depth = 0.05;
  const front = depth / 2 + 0.014;
  const hoodPts = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    hoodPts.push([Math.cos(a) * 0.17, -0.02 + Math.sin(a) * 0.13]);
  }
  const pocket = [
    [-0.15, -0.44],
    [0.15, -0.44],
    [0.19, -0.62],
    [-0.19, -0.62],
  ];
  const string = new THREE.CylinderGeometry(0.0055, 0.0055, 0.17, 6);
  string.translate(0, -0.085, 0);
  return {
    len,
    width: 0.94,
    depth,
    body: extrude(topOutline(right, 0.09), depth),
    details: [
      { geometry: extrude(hoodPts, 0.05, { smooth: 0 }), position: [0, 0, -0.028], tint: 0.8 },
      { geometry: extrude(pocket, 0.008, { smooth: 1, bevel: 0.008 }), position: [0, 0, front], tint: 0.9 },
      { geometry: box(0.5, 0.05, 0.012), position: [0, -len + 0.03, front], tint: 0.85 },
      { geometry: string, position: [-0.045, -0.08, front + 0.006], color: '#ece6da' },
      { geometry: string, position: [0.045, -0.08, front + 0.006], color: '#ece6da' },
    ],
    tag: [-0.24, -0.34],
  };
}

function buildJacket({ long = false } = {}) {
  const len = long ? 1.05 : 0.78;
  const right = [
    [0.09, 0],
    [0.26, -0.045],
    [0.39, -0.21],
    [0.47, -0.66],
    [0.39, -0.69],
    [0.32, -0.32],
    [0.265, -0.27],
    [long ? 0.31 : 0.28, -len],
    [0, -len],
  ];
  const depth = 0.05;
  const front = depth / 2 + 0.014;
  const lapel = [
    [0.015, -0.16],
    [0.09, 0.005],
    [0.16, -0.025],
    [0.085, -0.13],
    [0.05, -0.22],
  ];
  const button = new THREE.CylinderGeometry(0.011, 0.011, 0.008, 12);
  button.rotateX(Math.PI / 2);
  const buttonYs = long ? [-0.26, -0.4, -0.54, -0.68] : [-0.27, -0.4, -0.53, -0.66];
  const details = [
    { geometry: extrude(lapel, 0.01, { smooth: 1, bevel: 0.007 }), position: [0, 0, front], tint: 0.88 },
    { geometry: extrude(mirror(lapel), 0.01, { smooth: 1, bevel: 0.007 }), position: [0, 0, front], tint: 0.88 },
    { geometry: box(0.03, len - 0.2, 0.01), position: [0, -0.2 - (len - 0.2) / 2, front + 0.002], tint: 0.8 },
    { geometry: box(0.12, 0.035, 0.012), position: [-0.13, -0.27, front + 0.002], tint: 0.82 },
    { geometry: box(0.12, 0.035, 0.012), position: [0.13, -0.27, front + 0.002], tint: 0.82 },
    ...buttonYs.map((y) => ({ geometry: button, position: [0, y, front + 0.01], color: '#2a2622' })),
  ];
  if (long) details.push({ geometry: box(0.6, 0.05, 0.014), position: [0, -0.5, front + 0.004], tint: 0.86 });
  return { len, width: 0.98, depth, body: extrude(topOutline(right, 0.13), depth), details, tag: [-0.25, -0.36] };
}

function buildPants({ wide = false, cargo = false } = {}) {
  const len = 1.0;
  const hemOut = wide ? 0.25 : 0.205;
  const hemIn = wide ? 0.03 : 0.04;
  const pts = [
    [-0.19, 0],
    [0.19, 0],
    [0.205, -0.22],
    [hemOut, -len],
    [hemIn, -len],
    [0.012, -0.32],
    [-0.012, -0.32],
    [-hemIn, -len],
    [-hemOut, -len],
    [-0.205, -0.22],
  ];
  const depth = 0.04;
  const front = depth / 2 + 0.014;
  const metal = new THREE.CylinderGeometry(0.009, 0.009, 0.008, 12);
  metal.rotateX(Math.PI / 2);
  const details = [
    { geometry: box(0.4, 0.05, 0.014), position: [0, -0.03, front], tint: 0.82 },
    { geometry: metal, position: [0, -0.03, front + 0.01], color: '#c9a96b', metal: true },
  ];
  if (cargo) {
    details.push(
      { geometry: box(0.12, 0.15, 0.012), position: [-0.17, -0.56, front], tint: 0.88 },
      { geometry: box(0.12, 0.15, 0.012), position: [0.17, -0.56, front], tint: 0.88 },
    );
  }
  return { len, width: 0.52, depth, body: extrude(pts, depth, { smooth: 2 }), details, tag: [-0.16, -0.12], hanger: 'clip' };
}

function buildDress() {
  const len = 1.1;
  const right = [
    [0.07, 0],
    [0.12, 0],
    [0.165, -0.18],
    [0.135, -0.37],
    [0.29, -0.8],
    [0.37, -len],
    [0, -len],
  ];
  const depth = 0.03;
  const front = depth / 2 + 0.014;
  return {
    len,
    width: 0.78,
    depth,
    body: extrude(topOutline(right, 0.12), depth),
    details: [{ geometry: box(0.3, 0.045, 0.012), position: [0, -0.37, front], tint: 0.8 }],
    tag: [-0.15, -0.26],
  };
}

// ---------------------------------------------------------------------------
// Baking: many small parts → one geometry with per-part vertex colours.
// Fewer meshes means far fewer draw calls, which is what weak GPUs/CPUs choke on.
// ---------------------------------------------------------------------------
const toLinear = (hex) => new THREE.Color(hex).toArray();

function bake(parts) {
  const prepared = parts.map(({ geometry, position = [0, 0, 0], rotation = [0, 0, 0], color = [1, 1, 1] }) => {
    const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    g.rotateX(rotation[0]).rotateY(rotation[1]).rotateZ(rotation[2]);
    g.translate(position[0], position[1], position[2]);
    for (const name of Object.keys(g.attributes)) {
      if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
    }
    const count = g.attributes.position.count;
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) colors.set(color, i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.clearGroups();
    return g;
  });
  const merged = mergeGeometries(prepared, false);
  prepared.forEach((g) => g.dispose());
  merged.computeBoundingSphere();
  return merged;
}

// Body + fabric details become one "fabric" mesh (tint = vertex colour, base
// colour = material), fixed-colour bits (buttons, drawstrings) one "trim" mesh.
function bakeSpec(spec) {
  const fabric = [{ geometry: spec.body }];
  const trim = [];
  for (const d of spec.details) {
    if (d.color) trim.push({ geometry: d.geometry, position: d.position, color: toLinear(d.color) });
    else fabric.push({ geometry: d.geometry, position: d.position, color: [d.tint, d.tint, d.tint] });
  }
  spec.fabric = bake(fabric);
  spec.trim = trim.length ? bake(trim) : null;
  spec.trimMetal = spec.details.some((d) => d.metal);
  // The source parts are never rendered on their own.
  spec.body.dispose();
  spec.details.forEach((d) => d.geometry.dispose());
  delete spec.body;
  delete spec.details;
}

const specCache = new Map();

export function getGarmentSpec(product) {
  const flags = [product.long && 'long', product.wide && 'wide', product.cargo && 'cargo', product.rollneck && 'roll']
    .filter(Boolean)
    .join('-');
  const key = `${product.type}:${flags}`;
  if (!specCache.has(key)) {
    let spec;
    switch (product.type) {
      case 'tee':
        spec = buildTee();
        break;
      case 'sweater':
        spec = buildSweater({ rollneck: product.rollneck });
        break;
      case 'hoodie':
        spec = buildHoodie();
        break;
      case 'jacket':
        spec = buildJacket({ long: product.long });
        break;
      case 'pants':
        spec = buildPants({ wide: product.wide, cargo: product.cargo });
        break;
      default:
        spec = buildDress();
    }
    spec.key = key;
    spec.front = spec.depth / 2 + 0.014;
    bakeSpec(spec);
    specCache.set(key, spec);
  }
  return specCache.get(key);
}

// ---------------------------------------------------------------------------
// Materials
// ---------------------------------------------------------------------------
const materialCache = new Map();

export function shade(hex, factor) {
  const c = new THREE.Color(hex);
  c.multiplyScalar(factor);
  return `#${c.getHexString()}`;
}

// `vertexColors`: geometry carries per-part tints (baked garments).
// `detail`: normal-mapped weave; weak devices skip it (one less texture fetch per pixel).
export function getFabricMaterial(hex, { type = 'tee', pattern = null, doubleSide = false, vertexColors = false, detail = true } = {}) {
  const key = `${hex}:${type}:${pattern}:${doubleSide}:${vertexColors}:${detail}`;
  if (!materialCache.has(key)) {
    const glossy = type === 'jacket';
    const mat = new THREE.MeshStandardMaterial({
      side: doubleSide ? THREE.DoubleSide : THREE.FrontSide,
      color: pattern === 'stripes' ? '#ffffff' : hex,
      map: pattern === 'stripes' ? getStripeTexture(hex) : null,
      vertexColors,
      roughness: glossy ? 0.62 : 0.92,
      metalness: 0,
      normalMap: detail ? getFabricNormalMap() : null,
      normalScale: new THREE.Vector2(0.4, 0.4),
      envMapIntensity: 0.7,
    });
    materialCache.set(key, mat);
  }
  return materialCache.get(key);
}

// Buttons, drawstrings and hangers: colour comes from the baked vertex colours.
export function getVertexColorMaterial(kind) {
  const key = `vc:${kind}`;
  if (!materialCache.has(key)) {
    const metal = kind === 'metal' || kind === 'hanger';
    materialCache.set(
      key,
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: metal ? 0.42 : 0.55, metalness: kind === 'metal' ? 0.6 : metal ? 0.3 : 0.1 }),
    );
  }
  return materialCache.get(key);
}

export function getSolidMaterial(hex, { metal = false, roughness = 0.5 } = {}) {
  const key = `solid:${hex}:${metal}:${roughness}`;
  if (!materialCache.has(key)) {
    materialCache.set(
      key,
      new THREE.MeshStandardMaterial({ color: hex, metalness: metal ? 0.85 : 0.1, roughness: metal ? 0.3 : roughness }),
    );
  }
  return materialCache.get(key);
}

// ---------------------------------------------------------------------------
// Hangers and wall arms: baked once, shared by every garment.
// ---------------------------------------------------------------------------
const CHROME = toLinear('#d6d6d6');
const WOOD = toLinear('#9a7350');
const bakedCache = new Map();

// kind: 'bar' (shoulder hanger) or 'clip' (trouser hanger)
export function getHangerGeometry(kind) {
  const key = `hanger:${kind}`;
  if (!bakedCache.has(key)) {
    const hook = new THREE.TorusGeometry(0.026, 0.0035, 6, 18, Math.PI * 1.55);
    const stem = new THREE.CylinderGeometry(0.0035, 0.0035, 0.06, 6);
    const parts = [
      { geometry: hook, rotation: [0, 0, -Math.PI / 2], position: [0, 0.1, 0], color: CHROME },
      { geometry: stem, position: [0, 0.05, 0], color: CHROME },
    ];
    if (kind === 'clip') {
      parts.push({ geometry: new THREE.BoxGeometry(0.46, 0.028, 0.03), position: [0, 0.028, 0], color: WOOD });
    } else {
      const bar = new THREE.BoxGeometry(0.23, 0.018, 0.022);
      parts.push(
        { geometry: bar, rotation: [0, 0, -0.27], position: [0.105, -0.005, 0], color: WOOD },
        { geometry: bar, rotation: [0, 0, 0.27], position: [-0.105, -0.005, 0], color: WOOD },
      );
    }
    bakedCache.set(key, bake(parts));
    parts.forEach((p) => p.geometry.dispose());
  }
  return bakedCache.get(key);
}

// Rail arm sticking out of the wall/gondola, in the garment's local space
// (rod at `rodY`, running back `length` metres to its wall plate).
export function getArmGeometry(length, rodY) {
  const key = `arm:${length}:${rodY}`;
  if (!bakedCache.has(key)) {
    const parts = [
      {
        geometry: new THREE.CylinderGeometry(0.008, 0.008, length + 0.06, 8),
        rotation: [Math.PI / 2, 0, 0],
        position: [0, rodY, -length / 2 + 0.03],
      },
      { geometry: new THREE.SphereGeometry(0.014, 10, 8), position: [0, rodY, 0.06] },
      { geometry: new THREE.BoxGeometry(0.05, 0.08, 0.02), position: [0, rodY, -length] },
    ];
    bakedCache.set(key, bake(parts));
    parts.forEach((p) => p.geometry.dispose());
  }
  return bakedCache.get(key);
}
