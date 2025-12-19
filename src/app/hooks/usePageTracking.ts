'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Hook to track page visits for dashboard recent pages feature
 * Call this hook in any page component where you want to track visits
 */
export function usePageTracking() {
  const pathname = usePathname();

  useEffect(() => {
    // Don't track auth pages
    if (!pathname || pathname.startsWith('/login') || pathname.startsWith('/signup')) {
      return;
    }

    // Track the page visit (only if user is authenticated - API will handle auth check)
    fetch('/api/dashboard/track-visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: pathname }),
    })
    .then(res => {
      if (!res.ok && res.status !== 401) {
        // 401 is expected for unauthenticated users, other errors are worth logging
        console.warn('Failed to track page visit:', res.status, res.statusText);
      }
      return res.json();
    })
    .catch(err => {
      // Silently fail - tracking shouldn't break the app
      // Only log if it's not a network error (which could be normal)
      if (err.name !== 'TypeError') {
        console.error('Failed to track page visit:', err);
      }
    });
  }, [pathname]);
}

/**
 * Helper function to track recipe views
 * Call this when a user views a recipe
 */
export async function trackRecipeView(recipeData: {
  recipeId: string;
  recipeTitle?: string;
  recipeImageUrl?: string;
  recipePrepTime?: number;
  recipeDifficulty?: string;
  recipeServings?: number;
  recipeCuisine?: string;
  recipeDietTags?: string[];
}) {
  try {
    await fetch('/api/dashboard/track-recipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(recipeData),
    });
  } catch (err) {
    console.error('Failed to track recipe view:', err);
  }
}




