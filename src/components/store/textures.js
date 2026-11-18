// Procedural canvas textures. Everything is generated at runtime so the store
// needs no image assets. Results are cached so each texture is built once.
import * as THREE from 'three';
import { formatPrice, STORE_NAME } from '@/lib/store/products';
import { LIGHT_TEXTURES } from '@/lib/store/device';

// Weak devices get half-resolution canvases (a quarter of the memory).
const RES = LIGHT_TEXTURES ? 0.5 : 1;

const cache = new Map();
const cached = (key, build) => {
  if (!cache.has(key)) cache.set(key, build());
  return cache.get(key);
};

const FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function finish(c, { srgb = true, repeat = false, aniso = 4 } = {}) {
  const tex = new THREE.CanvasTexture(c);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  if (repeat) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = aniso;
  tex.needsUpdate = true;
  return tex;
}

// Seeded pseudo random so textures look identical on every load.
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Soft vertical drape folds + fine weave, encoded as a tangent-space normal map.
export function getFabricNormalMap() {
  return cached('fabric-normal', () => {
    const size = 256 * RES;
    const [c, ctx] = canvas(size, size);
    const rand = rng(7);
    const height = new Float32Array(size * size);
    const weave = new Float32Array(size * size).map(() => rand());
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = x / size;
        const v = y / size;
        const fold =
          Math.sin(u * Math.PI * 2 * 5 + Math.sin(v * Math.PI * 2) * 1.4) * (0.65 + 0.35 * Math.sin(v * Math.PI * 2 * 2)) +
          0.45 * Math.sin(u * Math.PI * 2 * 11 + Math.cos(v * Math.PI * 2 * 3) * 2.0);
        const grain = ((x + y) % 4 < 2 ? 0.04 : -0.04) + weave[y * size + x] * 0.06;
        height[y * size + x] = fold * 0.5 + grain;
      }
    }
    const img = ctx.createImageData(size, size);
    const h = (x, y) => height[((y + size) % size) * size + ((x + size) % size)];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = (h(x + 1, y) - h(x - 1, y)) * 2.2;
        const dy = (h(x, y + 1) - h(x, y - 1)) * 2.2;
        const len = Math.hypot(dx, dy, 1);
        const i = (y * size + x) * 4;
        img.data[i] = ((-dx / len) * 0.5 + 0.5) * 255;
        img.data[i + 1] = ((dy / len) * 0.5 + 0.5) * 255;
        img.data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    const tex = finish(c, { srgb: false, repeat: true });
    tex.repeat.set(2, 2);
    return tex;
  });
}

export function getStripeTexture(hex) {
  return cached(`stripes-${hex}`, () => {
    const [c, ctx] = canvas(16, 64);
    ctx.fillStyle = '#efe9dc';
    ctx.fillRect(0, 0, 16, 64);
    ctx.fillStyle = hex;
    ctx.fillRect(0, 0, 16, 26);
    const tex = finish(c, { repeat: true });
    tex.repeat.set(1, 18);
    tex.magFilter = THREE.LinearFilter;
    return tex;
  });
}

export function getPrintTexture(hex) {
  return cached(`print-${hex}`, () => {
    const [c, ctx] = canvas(256, 256);
    const light = new THREE.Color(hex).getHSL({}).l < 0.5;
    const ink = light ? '#f1ece2' : '#1d1d1f';
    ctx.strokeStyle = ink;
    ctx.fillStyle = ink;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(128, 128, 104, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(128, 128, 90, 0, Math.PI * 2);
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `800 46px ${FONT}`;
    ctx.fillText(STORE_NAME, 128, 120);
    ctx.font = `600 18px ${FONT}`;
    ctx.fillText('STUDIO · EST. 2026', 128, 162);
    return finish(c);
  });
}

export function getPriceTagTexture(product) {
  return cached(`tag-${product.id}`, () => {
    const [c, ctx] = canvas(128, 192);
    ctx.fillStyle = '#f7f4ee';
    ctx.fillRect(0, 0, 128, 192);
    ctx.fillStyle = '#d8d2c6';
    ctx.beginPath();
    ctx.arc(64, 18, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#1d1d1f';
    ctx.font = `700 15px ${FONT}`;
    ctx.fillText(STORE_NAME, 64, 52);
    ctx.font = `800 34px ${FONT}`;
    ctx.fillStyle = product.compareAt ? '#c8452f' : '#1d1d1f';
    ctx.fillText(formatPrice(product.price), 64, 112);
    if (product.compareAt) {
      ctx.font = `500 20px ${FONT}`;
      ctx.fillStyle = '#8a857c';
      const label = formatPrice(product.compareAt);
      ctx.fillText(label, 64, 146);
      const w = ctx.measureText(label).width;
      ctx.fillRect(64 - w / 2, 139, w, 2);
    }
    return finish(c);
  });
}

// Text on a transparent or solid background, for signage.
export function getLabelTexture(text, { color = '#1d1d1f', bg = null, weight = 700, size = 120, tracking = 18, w = 1024, h = 192 } = {}) {
  return cached(`label-${text}-${color}-${bg}-${weight}-${size}-${w}-${h}`, () => {
    const [c, ctx] = canvas(w * RES, h * RES);
    ctx.scale(RES, RES); // draw in full-size units, store at the device's resolution
    if (bg) {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.fillStyle = color;
    ctx.textBaseline = 'middle';
    // Manual letter spacing for a fashion-signage look; long labels shrink to fit.
    const chars = [...text];
    const measure = (px) => {
      ctx.font = `${weight} ${px}px ${FONT}`;
      const widths = chars.map((ch) => ctx.measureText(ch).width);
      return { widths, total: widths.reduce((a, b) => a + b, 0) + tracking * (px / size) * (chars.length - 1) };
    };
    let px = size;
    let m = measure(px);
    if (m.total > w * 0.92) {
      px = Math.floor(size * ((w * 0.92) / m.total));
      m = measure(px);
    }
    const gap = tracking * (px / size);
    let x = (w - m.total) / 2;
    chars.forEach((ch, i) => {
      ctx.fillText(ch, x, h / 2 + px * 0.04);
      x += m.widths[i] + gap;
    });
    return finish(c, { aniso: 8 });
  });
}

export function getFloorTexture() {
  return cached('floor', () => {
    const size = 512;
    const [c, ctx] = canvas(size * RES, size * RES);
    ctx.scale(RES, RES);
    const rand = rng(21);
    const tile = size / 2;
    for (let ty = 0; ty < 2; ty++) {
      for (let tx = 0; tx < 2; tx++) {
        const shade = 196 + Math.floor(rand() * 14);
        ctx.fillStyle = `rgb(${shade}, ${shade - 4}, ${shade - 10})`;
        ctx.fillRect(tx * tile, ty * tile, tile, tile);
      }
    }
    // Concrete speckle
    for (let i = 0; i < 9000; i++) {
      const v = rand();
      ctx.fillStyle = v > 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
      ctx.fillRect(rand() * size, rand() * size, 1 + rand() * 2, 1 + rand() * 2);
    }
    ctx.strokeStyle = 'rgba(70,64,58,0.55)';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * tile, 0);
      ctx.lineTo(i * tile, size);
      ctx.moveTo(0, i * tile);
      ctx.lineTo(size, i * tile);
      ctx.stroke();
    }
    const tex = finish(c, { repeat: true, aniso: 8 });
    tex.repeat.set(22 / 2.4, 30 / 2.4);
    return tex;
  });
}

export function getSlatTexture() {
  return cached('slats', () => {
    const [c, ctx] = canvas(256, 256);
    const rand = rng(3);
    const slat = 256 / 8;
    for (let i = 0; i < 8; i++) {
      const tone = 150 + Math.floor(rand() * 26);
      ctx.fillStyle = `rgb(${tone}, ${Math.floor(tone * 0.74)}, ${Math.floor(tone * 0.5)})`;
      ctx.fillRect(i * slat, 0, slat - 5, 256);
      // grain
      for (let g = 0; g < 26; g++) {
        ctx.fillStyle = `rgba(60,35,15,${0.05 + rand() * 0.08})`;
        ctx.fillRect(i * slat + rand() * (slat - 6), 0, 1, 256);
      }
      ctx.fillStyle = '#2a211a';
      ctx.fillRect(i * slat + slat - 5, 0, 5, 256);
    }
    const tex = finish(c, { repeat: true });
    return tex;
  });
}

export function getWindowsTexture(seed = 1) {
  return cached(`windows-${seed}`, () => {
    const [c, ctx] = canvas(512 * RES, 512 * RES);
    ctx.scale(RES, RES);
    const rand = rng(seed * 97);
    ctx.fillStyle = '#23262d';
    ctx.fillRect(0, 0, 512, 512);
    const cols = 8;
    const rows = 8;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const lit = rand() > 0.62;
        ctx.fillStyle = lit ? `rgba(255, ${200 + Math.floor(rand() * 40)}, ${140 + Math.floor(rand() * 50)}, 0.9)` : '#15171c';
        ctx.fillRect(x * 64 + 14, y * 64 + 12, 36, 42);
      }
    }
    return finish(c, { repeat: true });
  });
}
