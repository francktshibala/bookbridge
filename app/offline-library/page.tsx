'use client';

import { OfflineLibrary } from '@/components/offline/OfflineLibrary';
import { OfflineProvider } from '@/contexts/OfflineContext';

export default function OfflineLibraryPage() {
  return (
    <OfflineProvider>
      <OfflineLibrary />
    </OfflineProvider>
  );
}
