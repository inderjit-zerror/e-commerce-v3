'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { cartTotal, useStore } from '@/lib/store/useStore';
import { PRODUCTS_BY_ID, formatPrice } from '@/lib/store/products';
import { closeCart } from '@/lib/store/actions';
import styles from './hud.module.css';

const FREE_SHIPPING = 150;

export function CartDrawer() {
  const ref = useRef(null);
  const cart = useStore((s) => s.cart);
  const setQty = useStore((s) => s.setQty);
  const removeLine = useStore((s) => s.removeLine);
  const pushToast = useStore((s) => s.pushToast);
  const lines = cart.filter((line) => PRODUCTS_BY_ID[line.productId]);
  const total = cartTotal(lines);
  const remaining = Math.max(0, FREE_SHIPPING - total);

  useGSAP(
    () => {
      gsap
        .timeline({ defaults: { ease: 'power3.out' } })
        .from(ref.current, { xPercent: 105, duration: 0.6 })
        .from('[data-anim]', { y: 12, opacity: 0, duration: 0.4, stagger: 0.04 }, '-=0.3');
    },
    { scope: ref },
  );

  return (
    <div className={styles.drawerBackdrop} data-ui onClick={(e) => e.target === e.currentTarget && closeCart(true)}>
      <aside ref={ref} className={styles.drawer} aria-label="Shopping bag">
        <header className={styles.drawerHeader} data-anim>
          <h2>Your bag</h2>
          <button className={styles.closeButton} onClick={() => closeCart(true)} aria-label="Close bag">
            <span aria-hidden>×</span>
            <kbd>C</kbd>
          </button>
        </header>

        {lines.length === 0 ? (
          <div className={styles.emptyBag} data-anim>
            <p>Your bag is empty.</p>
            <p>Walk the racks and press <kbd>E</kbd> on anything that catches your eye.</p>
            <button className={styles.cta} onClick={() => closeCart(true)}>
              Keep browsing <span aria-hidden>→</span>
            </button>
          </div>
        ) : (
          <>
            <div className={styles.shipping} data-anim>
              {remaining > 0 ? (
                <span>
                  Add <strong>{formatPrice(remaining)}</strong> for free shipping
                </span>
              ) : (
                <span>You&apos;ve unlocked free shipping</span>
              )}
              <div className={styles.shippingBar}>
                <div style={{ width: `${Math.min(100, (total / FREE_SHIPPING) * 100)}%` }} />
              </div>
            </div>
            <ul className={styles.lines}>
              {lines.map((line) => {
                const product = PRODUCTS_BY_ID[line.productId];
                const color = product.colors[line.colorIndex] ?? product.colors[0];
                return (
                  <li key={line.lineId} className={styles.line} data-anim>
                    <div className={styles.lineSwatch} style={{ '--swatch': color.hex }} />
                    <div className={styles.lineInfo}>
                      <strong>{product.name}</strong>
                      <span>
                        {color.name} · {line.size}
                      </span>
                      <div className={styles.qty}>
                        <button onClick={() => setQty(line.lineId, line.qty - 1)} aria-label="Decrease quantity">
                          −
                        </button>
                        <span>{line.qty}</span>
                        <button onClick={() => setQty(line.lineId, line.qty + 1)} aria-label="Increase quantity">
                          +
                        </button>
                      </div>
                    </div>
                    <div className={styles.lineRight}>
                      <span>{formatPrice(product.price * line.qty)}</span>
                      <button className={styles.remove} onClick={() => removeLine(line.lineId)}>
                        Remove
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <footer className={styles.drawerFooter} data-anim>
              <div className={styles.subtotal}>
                <span>Subtotal</span>
                <strong>{formatPrice(total)}</strong>
              </div>
              <button className={`${styles.cta} ${styles.ctaFull}`} onClick={() => pushToast('Checkout is not connected yet')}>
                Checkout <span aria-hidden>→</span>
              </button>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
