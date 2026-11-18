// One-time device sniffing: input type, screen class and a starting graphics tier.
// The tier is only a first guess — <AutoQuality> refines it from the real frame rate.

// Lowest → highest. 'saver' is for very weak / overheating / data-saver devices.
export const TIERS = ['saver', 'low', 'medium', 'high'];

export const TIER_LABELS = { saver: 'Battery saver', low: 'Low', medium: 'Medium', high: 'High' };

// What each tier turns on. Everything a weak device can't afford is switched off
// here, in one place.
export const QUALITY = {
  high: {
    dpr: [1, 1.75],
    antialias: true,
    shadows: true,
    shadowMap: 2048,
    reflections: true,
    envResolution: 256,
    extraLights: true, // podium spots + fill point lights
    fabricDetail: true, // normal-mapped fabric weave
    priceTags: true,
    sway: true,
    uiBlur: true, // CSS backdrop-filter over the canvas
    fpsCap: 0,
  },
  medium: {
    dpr: [1, 1.5],
    antialias: true,
    shadows: true,
    shadowMap: 1024,
    reflections: false,
    envResolution: 128,
    extraLights: true,
    fabricDetail: true,
    priceTags: true,
    sway: true,
    uiBlur: true,
    fpsCap: 0,
  },
  low: {
    dpr: [0.75, 1.1],
    antialias: false,
    shadows: false,
    shadowMap: 512,
    reflections: false,
    envResolution: 64,
    extraLights: false,
    fabricDetail: false,
    priceTags: false, // 41 extra draw calls; the hover tooltip still shows the price
    sway: true,
    uiBlur: false,
    fpsCap: 0,
  },
  saver: {
    dpr: [0.6, 0.85],
    antialias: false,
    shadows: false,
    shadowMap: 512,
    reflections: false,
    envResolution: 32,
    extraLights: false,
    fabricDetail: false,
    priceTags: false,
    sway: false,
    uiBlur: false,
    fpsCap: 30, // steady 30 beats a jittery 40, and keeps phones cooler
  },
};

function probeGpu() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return { webgl: false, renderer: '' };
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return { webgl: true, renderer };
  } catch {
    return { webgl: false, renderer: '' };
  }
}

// Rough GPU classes from the renderer string. Unknown strings fall through to
// the CPU / memory heuristics below.
const SOFTWARE_GPU = /swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic/;
const WEAK_MOBILE_GPU = /mali-(4|t)\d|mali-g(31|51|52|57)\b|adreno \(tm\) [2-5]\d\d|adreno \(tm\) 6[0-1]\d|powervr|sgx|videocore/;
const STRONG_MOBILE_GPU = /apple|adreno \(tm\) (6[4-9]\d|[7-9]\d\d)|mali-g(6[8-9]|7\d|[7-9]\d\d)|immortalis|xclipse/;
const INTEGRATED_GPU = /intel|mali|adreno|powervr|radeon\(tm\) graphics|vega \d/;

// Intel "HD Graphics" before the 6xx generation (HD 4000, HD 520, Bay Trail…) and
// old AMD APUs struggle with real-time PBR. ("UHD Graphics" is newer and is fine.)
function isOldIntegrated(gpu) {
  if (/intel\(r\) (gma|q\d)|radeon\(tm\) r[2-5]\b/.test(gpu)) return true;
  const m = gpu.match(/\bhd graphics(?: (\d{3,4}))?/);
  if (!m) return false;
  const n = Number(m[1] ?? 0);
  return n < 600 || (n >= 2000 && n < 6000);
}

function pickTier({ phone, tablet, cores, memory, saveData, gpu }) {
  if (SOFTWARE_GPU.test(gpu)) return 'saver';
  if (saveData || memory <= 1 || cores <= 2) return 'saver';
  if (WEAK_MOBILE_GPU.test(gpu) || isOldIntegrated(gpu) || memory <= 2) return 'low';
  if (phone) return STRONG_MOBILE_GPU.test(gpu) || (cores >= 8 && memory >= 6) ? 'medium' : 'low';
  if (tablet) return STRONG_MOBILE_GPU.test(gpu) ? 'medium' : 'low';
  if (/\barc\b|nvidia|geforce|radeon (rx|pro)|apple m\d/.test(gpu) && cores > 4) return 'high';
  if (INTEGRATED_GPU.test(gpu) || cores <= 4 || memory <= 4) return 'medium';
  return 'high';
}

function detect() {
  if (typeof window === 'undefined') {
    return { touch: false, phone: false, tablet: false, reducedMotion: false, webgl: true, tier: 'high' };
  }
  const mq = (query) => window.matchMedia?.(query).matches ?? false;
  const coarse = mq('(pointer: coarse)');
  const touch = coarse || (navigator.maxTouchPoints > 1 && !mq('(pointer: fine)'));
  const shortSide = Math.min(window.screen.width, window.screen.height);
  const phone = touch && shortSide < 600;
  const tablet = touch && !phone;
  const { webgl, renderer } = probeGpu();
  const tier = pickTier({
    phone,
    tablet,
    cores: navigator.hardwareConcurrency || 4,
    memory: navigator.deviceMemory || 8, // only Chromium reports this
    saveData: Boolean(navigator.connection?.saveData),
    gpu: renderer.toLowerCase(),
  });
  return { touch, phone, tablet, reducedMotion: mq('(prefers-reduced-motion: reduce)'), webgl, tier };
}

export const device = detect();

// Weak devices get smaller canvas textures (decided once, at load).
export const LIGHT_TEXTURES = device.tier === 'low' || device.tier === 'saver';
