'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useStore, cartCount } from '@/lib/store/useStore';
import { PRODUCTS_BY_ID, CATEGORY_LABELS, STORE_NAME, formatPrice } from '@/lib/store/products';
import { closeCart, closeInspect, openCart, openInspect, pauseGame } from '@/lib/store/actions';
import { device } from '@/lib/store/device';
import { TouchControls } from './TouchControls';
import { IntroScreen } from './IntroScreen';
import { PauseScreen } from './PauseScreen';
import { ProductPanel } from './ProductPanel';
import { CartDrawer } from './CartDrawer';
import { Minimap } from './Minimap';
import { ZoneBanner } from './ZoneBanner';
import styles from './hud.module.css';

gsap.registerPlugin(useGSAP);

function useGameKeys() {
  useEffect(() => {
    const onKey = (e) => {
      if (e.repeat) return;
      const s = useStore.getState();
      switch (e.code) {
        case 'KeyE':
          if (s.mode === 'play') openInspect();
          else if (s.mode === 'inspect') closeInspect(true);
          break;
        case 'KeyQ':
        case 'Backspace':
          if (s.mode === 'inspect') closeInspect(true);
          break;
        case 'Escape':
          if (s.mode === 'inspect') closeInspect(false);
          else if (s.mode === 'cart') closeCart(false);
          else if (s.mode === 'play') pauseGame(); // drag-to-look mode has no pointer lock to exit
          break;
        case 'KeyC':
        case 'KeyB':
          if (s.mode === 'cart') closeCart(true);
          else openCart();
          break;
        case 'KeyM':
          s.toggleMap();
          break;
        case 'KeyH':
          s.toggleHelp();
          break;
        case 'Enter':
          if (s.mode === 'inspect' && s.inspect && !s.inspect.closing) {
            s.addToCart({ productId: s.inspect.productId, colorIndex: s.inspect.colorIndex, size: s.inspect.size });
          }
          break;
        default:
          if (s.mode === 'inspect' && /^Digit[1-9]$/.test(e.code)) {
            const index = Number(e.code.slice(5)) - 1;
            const product = PRODUCTS_BY_ID[s.inspect.productId];
            if (index < product.colors.length) s.updateInspect({ colorIndex: index });
          }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

function Crosshair() {
  const hovered = useStore((s) => s.hovered);
  const product = hovered ? PRODUCTS_BY_ID[hovered.productId] : null;
  return (
    <>
      <div className={`${styles.crosshair} ${hovered ? styles.crosshairActive : ''}`} />
      {product && (
        <div className={styles.tooltip} key={hovered.key}>
          <span className={styles.tooltipEyebrow}>{CATEGORY_LABELS[product.category]}</span>
          <strong>{product.name}</strong>
          <span className={styles.tooltipPrice}>
            {formatPrice(product.price)}
            {product.compareAt && <s>{formatPrice(product.compareAt)}</s>}
          </span>
          <span className={styles.tooltipHint}>
            {device.touch ? (
              'Tap to inspect'
            ) : (
              <>
                <kbd>E</kbd> or click to inspect
              </>
            )}
          </span>
        </div>
      )}
    </>
  );
}

function BagButton() {
  const count = useStore((s) => cartCount(s.cart));
  const bump = useStore((s) => s.cartBump);
  const ref = useRef(null);
  useGSAP(
    () => {
      if (bump) gsap.fromTo(ref.current, { scale: 1.35 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    },
    { dependencies: [bump] },
  );
  return (
    <button ref={ref} data-ui className={styles.bagButton} onClick={() => openCart()} aria-label={`Open bag, ${count} items`}>
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
        <path d="M5 8h14l-1 12H6L5 8Z" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      </svg>
      <span className={styles.bagLabel}>Bag</span>
      <span className={styles.bagCount}>{count}</span>
      <kbd>C</kbd>
    </button>
  );
}

function HelpPanel() {
  const show = useStore((s) => s.showHelp);
  if (!show) return null;
  const rows = [
    ['W A S D', 'Move'],
    ['Mouse', 'Look around'],
    ['← →', 'Turn'],
    ['Shift', 'Run'],
    ['E', 'Inspect'],
    ['C', 'Bag'],
    ['M', 'Map'],
    ['H', 'Hide help'],
  ];
  return (
    <div className={styles.help}>
      {rows.map(([k, label]) => (
        <div key={label} className={styles.helpRow}>
          <kbd>{k}</kbd>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

function LockHint() {
  const locked = useStore((s) => s.locked);
  if (device.touch) {
    return <div className={`${styles.lockHint} ${styles.fadeAway}`}>Left thumb to walk · drag to look · tap a garment</div>;
  }
  if (locked) return null;
  return <div className={styles.lockHint}>Click to look around · or drag to turn</div>;
}

function MenuButton() {
  return (
    <button data-ui className={styles.iconButton} onClick={() => pauseGame()} aria-label="Pause menu">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M4 7h16M4 12h16M4 17h16" />
      </svg>
    </button>
  );
}

function Toasts() {
  const toasts = useStore((s) => s.toasts);
  return (
    <div className={styles.toasts}>
      {toasts.map((t) => (
        <div key={t.id} className={styles.toast}>
          <span className={styles.toastDot} />
          {t.text}
        </div>
      ))}
    </div>
  );
}

export function Hud() {
  const mode = useStore((s) => s.mode);
  useGameKeys();

  const playing = mode === 'play';
  return (
    <div className={styles.hud}>
      <div className={`${styles.letterbox} ${mode === 'entering' ? styles.letterboxOn : ''}`} />
      {mode === 'intro' && <IntroScreen />}
      {(playing || mode === 'inspect' || mode === 'cart' || mode === 'paused') && (
        <>
          <div className={styles.topBar}>
            <div className={styles.brand}>{STORE_NAME}</div>
            <div className={styles.topActions}>
              {playing && <MenuButton />}
              <BagButton />
            </div>
          </div>
          <Minimap />
        </>
      )}
      {playing && (
        <>
          <Crosshair />
          {device.touch ? <TouchControls /> : <HelpPanel />}
          <LockHint />
          <ZoneBanner />
        </>
      )}
      {mode === 'inspect' && <div className={styles.inspectVignette} />}
      <ProductPanel />
      {mode === 'cart' && <CartDrawer />}
      {mode === 'paused' && <PauseScreen />}
      <Toasts />
    </div>
  );
}
