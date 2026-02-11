'use client';

import dynamic from 'next/dynamic';

const IncomingCallPopup = dynamic(
  () => import('@/components/calls/IncomingCallPopup').then(mod => mod.IncomingCallPopup),
  { ssr: false }
);

export function IncomingCallPopupLazy() {
  return <IncomingCallPopup />;
}
