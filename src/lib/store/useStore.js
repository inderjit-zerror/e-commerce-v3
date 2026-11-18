import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { PRODUCTS_BY_ID } from './products';
import { device, QUALITY, TIERS } from './device';

let toastId = 0;

// mode: 'intro' | 'entering' | 'play' | 'paused' | 'inspect' | 'cart'
export const useStore = create(
  persist(
    (set, get) => ({
      mode: 'intro',
      locked: false,
      hovered: null, // { key, productId }
      inspect: null, // { key, productId, colorIndex, size, from, closing, openedAt }
      cart: [], // { lineId, productId, colorIndex, size, qty }
      showMap: true,
      showHelp: true,
      qualityMode: 'auto', // 'auto' | one of TIERS
      autoTier: device.tier, // what 'auto' currently resolves to
      toasts: [],
      cartBump: 0,

      setMode: (mode) => set({ mode }),
      setLocked: (locked) => set({ locked }),
      setHovered: (hovered) => set({ hovered }),

      startInspect: ({ key, productId, from }) => {
        const product = PRODUCTS_BY_ID[productId];
        set({
          mode: 'inspect',
          hovered: null,
          inspect: {
            key,
            productId,
            from,
            colorIndex: 0,
            size: product.sizes[Math.floor((product.sizes.length - 1) / 2)],
            closing: false,
            openedAt: Date.now(),
          },
        });
      },
      updateInspect: (patch) => set((s) => (s.inspect ? { inspect: { ...s.inspect, ...patch } } : {})),
      closeInspect: () =>
        set((s) => (s.inspect && !s.inspect.closing ? { mode: 'play', inspect: { ...s.inspect, closing: true } } : {})),
      finishInspect: () => set({ inspect: null }),

      addToCart: ({ productId, colorIndex, size }) => {
        const lineId = `${productId}:${colorIndex}:${size}`;
        const cart = get().cart;
        const existing = cart.find((line) => line.lineId === lineId);
        const next = existing
          ? cart.map((line) => (line.lineId === lineId ? { ...line, qty: line.qty + 1 } : line))
          : [...cart, { lineId, productId, colorIndex, size, qty: 1 }];
        set({ cart: next, cartBump: get().cartBump + 1 });
        get().pushToast(`${PRODUCTS_BY_ID[productId].name} added to your bag`);
      },
      setQty: (lineId, qty) =>
        set((s) => ({
          cart: qty <= 0 ? s.cart.filter((l) => l.lineId !== lineId) : s.cart.map((l) => (l.lineId === lineId ? { ...l, qty } : l)),
        })),
      removeLine: (lineId) => set((s) => ({ cart: s.cart.filter((l) => l.lineId !== lineId) })),

      toggleMap: () => set((s) => ({ showMap: !s.showMap })),
      toggleHelp: () => set((s) => ({ showHelp: !s.showHelp })),
      cycleQuality: () =>
        set((s) => {
          const order = ['auto', 'high', 'medium', 'low', 'saver'];
          return { qualityMode: order[(order.indexOf(s.qualityMode) + 1) % order.length] };
        }),
      // Called by the frame-rate monitor; never climbs above what the device was detected as.
      stepAutoTier: (dir) =>
        set((s) => {
          const max = TIERS.indexOf(device.tier);
          const next = Math.max(0, Math.min(max, TIERS.indexOf(s.autoTier) + dir));
          return next === TIERS.indexOf(s.autoTier) ? {} : { autoTier: TIERS[next] };
        }),
      setAutoTier: (autoTier) => set({ autoTier }),

      pushToast: (text) => {
        const id = ++toastId;
        set((s) => ({ toasts: [...s.toasts.slice(-2), { id, text }] }));
        setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 2600);
      },
    }),
    {
      name: 'threads-3d-store',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ cart: s.cart, showMap: s.showMap, qualityMode: s.qualityMode }),
      // v0 stored a boolean-ish `quality`; keep the cart, reset graphics to auto.
      migrate: (persisted) => ({ cart: persisted?.cart ?? [], showMap: persisted?.showMap ?? true, qualityMode: 'auto' }),
    },
  ),
);

export const selectTier = (s) => (s.qualityMode === 'auto' ? s.autoTier : s.qualityMode);
export const useQuality = () => QUALITY[useStore(selectTier)];

export const cartCount = (cart) => cart.reduce((n, line) => n + line.qty, 0);
export const cartTotal = (cart) => cart.reduce((n, line) => n + (PRODUCTS_BY_ID[line.productId]?.price ?? 0) * line.qty, 0);
