'use client';

import { useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useStore } from '@/lib/store/useStore';
import { CATEGORY_LABELS, PRODUCTS_BY_ID, formatPrice } from '@/lib/store/products';
import { closeInspect } from '@/lib/store/actions';
import { device } from '@/lib/store/device';
import styles from './hud.module.css';

function Panel({ inspect }) {
  const ref = useRef(null);
  const [added, setAdded] = useState(false);
  const updateInspect = useStore((s) => s.updateInspect);
  const addToCart = useStore((s) => s.addToCart);
  const product = PRODUCTS_BY_ID[inspect.productId];
  const color = product.colors[inspect.colorIndex] ?? product.colors[0];

  useGSAP(
    () => {
      gsap
        .timeline({ defaults: { ease: 'power3.out' } })
        .from(ref.current, { xPercent: 105, duration: 0.75, delay: 0.25 })
        .from('[data-anim]', { y: 14, opacity: 0, duration: 0.5, stagger: 0.05 }, '-=0.35');
    },
    { scope: ref },
  );

  const add = () => {
    addToCart({ productId: product.id, colorIndex: inspect.colorIndex, size: inspect.size });
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  return (
    <aside ref={ref} className={styles.panel} data-ui aria-label={`${product.name} details`}>
      <button className={styles.closeButton} onClick={() => closeInspect(true)} aria-label="Close">
        <span aria-hidden>×</span>
        <kbd>E</kbd>
      </button>
      <div className={styles.panelEyebrow} data-anim>
        {CATEGORY_LABELS[product.category]}
        {product.badge && <span className={`${styles.badge} ${product.compareAt ? styles.badgeSale : ''}`}>{product.badge}</span>}
      </div>
      <h2 className={styles.panelTitle} data-anim>
        {product.name}
      </h2>
      <div className={styles.panelPrice} data-anim>
        {formatPrice(product.price)}
        {product.compareAt && <s>{formatPrice(product.compareAt)}</s>}
      </div>
      <p className={styles.panelCopy} data-anim>
        {product.description}
      </p>

      <div className={styles.optionGroup} data-anim>
        <div className={styles.optionLabel}>
          Colour <span>{color.name}</span>
        </div>
        <div className={styles.swatches}>
          {product.colors.map((c, i) => (
            <button
              key={c.name}
              className={`${styles.swatch} ${i === inspect.colorIndex ? styles.swatchActive : ''}`}
              style={{ '--swatch': c.hex }}
              onClick={() => updateInspect({ colorIndex: i })}
              aria-label={`${c.name} (key ${i + 1})`}
              title={`${c.name} · ${i + 1}`}
            />
          ))}
        </div>
      </div>

      <div className={styles.optionGroup} data-anim>
        <div className={styles.optionLabel}>
          Size <span>{inspect.size}</span>
        </div>
        <div className={styles.sizes}>
          {product.sizes.map((size) => (
            <button
              key={size}
              className={`${styles.size} ${size === inspect.size ? styles.sizeActive : ''}`}
              onClick={() => updateInspect({ size })}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <button className={`${styles.cta} ${styles.ctaFull}`} onClick={add} data-anim>
        {added ? 'Added to bag ✓' : `Add to bag · ${formatPrice(product.price)}`}
        <kbd>Enter</kbd>
      </button>

      <ul className={styles.detailList} data-anim>
        {product.details.map((d) => (
          <li key={d}>{d}</li>
        ))}
      </ul>

      <p className={styles.panelHint} data-anim>
        {device.touch ? (
          'Drag the garment to spin it around.'
        ) : (
          <>
            Drag or use <kbd>A</kbd>
            <kbd>D</kbd> to rotate · <kbd>1</kbd>–<kbd>{product.colors.length}</kbd> colours · <kbd>Esc</kbd> back
          </>
        )}
      </p>
    </aside>
  );
}

export function ProductPanel() {
  const inspect = useStore((s) => s.inspect);
  if (!inspect || inspect.closing) return null;
  return <Panel key={inspect.openedAt} inspect={inspect} />;
}
