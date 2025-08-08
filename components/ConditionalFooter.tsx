'use client';

import { usePathname } from 'next/navigation';
import Footer from '@/components/Footer';

export function ConditionalFooter() {
  const pathname = usePathname();
  
  // Don't show footer on book detail pages
  if (pathname?.startsWith('/library/') && pathname !== '/library') {
    return null;
  }
  
  return <Footer />;
}