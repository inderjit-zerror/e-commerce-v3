'use client';

import dynamic from 'next/dynamic';

// The store is pure WebGL + browser APIs, so render it on the client only.
const StoreApp = dynamic(() => import('@/components/store/StoreApp'), {
  ssr: false,
  loading: () => <div className="boot">Opening the store…</div>,
});

export default function Home() {
  return <StoreApp />;
}
