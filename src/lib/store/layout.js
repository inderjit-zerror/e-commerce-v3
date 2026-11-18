// Single source of truth for where everything sits in the store.
// Units are metres. The entrance is at +z, the back wall at -z.
import { PRODUCTS } from './products';

export const ROOM = { halfW: 11, halfD: 15, height: 5 };
export const EYE_HEIGHT = 1.7;
export const PLAYER_RADIUS = 0.35;
export const SPAWN = { x: 0, z: 11.5 };
export const INTRO_CAMERA = { x: 0, y: 2.3, z: 25.5, pitch: -0.03 };

// Garments hang with their neckline at HANG_Y; the rail sits ROD_Y above that.
export const HANG_Y = 2.0;
export const ROD_Y = 0.116;

export const BAY_WIDTH = 5.6;
export const BAYS = [
  { id: 'outerwear', label: 'OUTERWEAR', side: -1, z: -8, category: 'outerwear' },
  { id: 'denim', label: 'DENIM & TROUSERS', side: -1, z: -1, category: 'bottoms' },
  { id: 'knitwear', label: 'KNITWEAR', side: -1, z: 6, category: 'knitwear' },
  { id: 'dresses', label: 'DRESSES', side: 1, z: -8, category: 'dresses' },
  { id: 'hoodies', label: 'HOODIES', side: 1, z: -1, category: 'hoodies' },
  { id: 'tees', label: 'TEES', side: 1, z: 6, category: 'tees' },
];

export const GONDOLAS = [
  { id: 'new-in', label: 'NEW IN', x: -5.2, z: 0, length: 5, category: 'new' },
  { id: 'sale', label: 'SALE', x: 5.2, z: 0, length: 5, category: 'sale', accent: '#c8452f' },
];

export const PODIUM = { x: 0, z: 6, radius: 1.6, height: 0.25 };
export const DISPLAY_TABLE = { x: 0, z: -2, w: 3.2, d: 1.1, h: 0.82 };
export const ROUND_TABLE = { x: 0, z: -8, r: 1.0, h: 0.78 };
export const BENCH = { x: 0, z: -11.6, w: 2.4, d: 0.6 };
export const CHECKOUT = { minX: -9.6, maxX: -4.4, minZ: -13.6, maxZ: -12.4, h: 1.05 };
export const FITTING = { minX: 5.2, maxX: 11, minZ: -15, maxZ: -12, booths: 3 };
export const WINDOW_PLATFORMS = [
  { x: -7, z: 13.6, w: 3, d: 1.6 },
  { x: 7, z: 13.6, w: 3, d: 1.6 },
];
export const PLANTS = [
  { x: -10, z: 11.6, scale: 1.1 },
  { x: 10, z: 11.6, scale: 1.1 },
  { x: -2.5, z: 14.2, scale: 0.8 },
  { x: 2.5, z: 14.2, scale: 0.8 },
  { x: 4.4, z: -11.6, scale: 0.9 },
];

// ---------------------------------------------------------------------------
// Garment placements (derived from fixtures + catalogue)
// ---------------------------------------------------------------------------
const byCategory = (category) => PRODUCTS.filter((item) => item.category === category);

export const PLACEMENTS = [];

for (const bay of BAYS) {
  const items = byCategory(bay.category);
  const x = bay.side * (ROOM.halfW - 0.5);
  items.forEach((item, i) => {
    const offset = (i - (items.length - 1) / 2) * 1.3;
    PLACEMENTS.push({
      key: `${bay.id}-${i}`,
      productId: item.id,
      position: [x, HANG_Y, bay.z + offset],
      rotationY: (-bay.side * Math.PI) / 2,
      armLength: 0.47,
    });
  });
}

for (const g of GONDOLAS) {
  const items = byCategory(g.category);
  const perSide = Math.ceil(items.length / 2);
  items.forEach((item, i) => {
    const side = i < perSide ? -1 : 1;
    const slot = i % perSide;
    const offset = (slot - (perSide - 1) / 2) * 1.5;
    PLACEMENTS.push({
      key: `${g.id}-${i}`,
      productId: item.id,
      position: [g.x + side * 0.45, HANG_Y, g.z + offset],
      rotationY: (side * Math.PI) / 2,
      armLength: 0.4,
    });
  });
}

export const MANNEQUINS = [
  { key: 'podium-0', productId: 'm1', position: [0, PODIUM.height, 6.7], rotationY: 0 },
  { key: 'podium-1', productId: 'm2', position: [-0.95, PODIUM.height, 5.4], rotationY: 0.3 },
  { key: 'podium-2', productId: 'm3', position: [0.95, PODIUM.height, 5.4], rotationY: -0.3 },
  { key: 'window-0', productId: 'm4', position: [-7, 0.2, 13.6], rotationY: 0 },
  { key: 'window-1', productId: 'm5', position: [7, 0.2, 13.6], rotationY: 0 },
];

// ---------------------------------------------------------------------------
// Collision shapes on the floor plane (x/z). Used by the player + minimap.
// ---------------------------------------------------------------------------
const rect = (minX, maxX, minZ, maxZ, kind) => ({ type: 'rect', minX, maxX, minZ, maxZ, kind });
const circle = (x, z, r, kind) => ({ type: 'circle', x, z, r, kind });

export const COLLIDERS = [
  ...BAYS.map((b) => {
    const inner = b.side * (ROOM.halfW - 0.72);
    const outer = b.side * ROOM.halfW;
    return rect(Math.min(inner, outer), Math.max(inner, outer), b.z - BAY_WIDTH / 2, b.z + BAY_WIDTH / 2, 'bay');
  }),
  ...GONDOLAS.map((g) => rect(g.x - 0.62, g.x + 0.62, g.z - g.length / 2 - 0.15, g.z + g.length / 2 + 0.15, 'gondola')),
  circle(PODIUM.x, PODIUM.z, PODIUM.radius + 0.05, 'podium'),
  rect(
    DISPLAY_TABLE.x - DISPLAY_TABLE.w / 2,
    DISPLAY_TABLE.x + DISPLAY_TABLE.w / 2,
    DISPLAY_TABLE.z - DISPLAY_TABLE.d / 2,
    DISPLAY_TABLE.z + DISPLAY_TABLE.d / 2,
    'table',
  ),
  circle(ROUND_TABLE.x, ROUND_TABLE.z, ROUND_TABLE.r, 'table'),
  rect(BENCH.x - BENCH.w / 2, BENCH.x + BENCH.w / 2, BENCH.z - BENCH.d / 2, BENCH.z + BENCH.d / 2, 'bench'),
  rect(CHECKOUT.minX, CHECKOUT.maxX, CHECKOUT.minZ, CHECKOUT.maxZ, 'counter'),
  rect(FITTING.minX, FITTING.maxX, FITTING.minZ, FITTING.maxZ, 'fitting'),
  ...WINDOW_PLATFORMS.map((w) => rect(w.x - w.w / 2, w.x + w.w / 2, w.z - w.d / 2, w.z + w.d / 2, 'window')),
  ...PLANTS.map((pl) => circle(pl.x, pl.z, 0.35 * pl.scale, 'plant')),
];

// Named areas for the "you are here" banner.
export const ZONES = [
  ...BAYS.map((b) => ({ label: b.label, x: b.side * 8.6, z: b.z, r: 3.4 })),
  ...GONDOLAS.map((g) => ({ label: g.label, x: g.x, z: g.z, r: 2.6 })),
  { label: 'FEATURED LOOKS', x: PODIUM.x, z: PODIUM.z, r: 3.2 },
  { label: 'ESSENTIALS TABLE', x: DISPLAY_TABLE.x, z: DISPLAY_TABLE.z, r: 2.6 },
  { label: 'CHECKOUT', x: -7, z: -11, r: 3 },
  { label: 'FITTING ROOMS', x: 8, z: -11, r: 3 },
  { label: 'LOUNGE', x: 0, z: -10, r: 3 },
  { label: 'ENTRANCE', x: 0, z: 12.5, r: 3.2 },
];
