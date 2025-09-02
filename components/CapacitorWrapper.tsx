'use client';

import dynamic from 'next/dynamic';

// Dynamically import CapacitorAppListener to avoid build issues on web-only deployments
const CapacitorAppListener = dynamic(
  () => import('./CapacitorAppListener').then(mod => ({ default: mod.CapacitorAppListener })),
  { 
    ssr: false,
    loading: () => null,
  }
);

export function CapacitorWrapper() {
  return <CapacitorAppListener />;
}