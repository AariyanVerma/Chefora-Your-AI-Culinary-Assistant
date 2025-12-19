'use client';

import { usePageTracking } from '@/app/hooks/usePageTracking';

/**
 * Global page tracking component
 * This component tracks page visits across the entire application
 */
export function PageTracking() {
  usePageTracking();
  return null; // This component doesn't render anything
}




