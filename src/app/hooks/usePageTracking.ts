'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function usePageTracking() {
  const pathname = usePathname();

  useEffect(() => {
    
    if (!pathname || pathname.startsWith('/login') || pathname.startsWith('/signup')) {
      return;
    }

    fetch('/api/dashboard/track-visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: pathname }),
    })
    .then(res => {
      if (!res.ok && res.status !== 401) {
        
        console.warn('Failed to track page visit:', res.status, res.statusText);
      }
      return res.json();
    })
    .catch(err => {
      
      if (err.name !== 'TypeError') {
        console.error('Failed to track page visit:', err);
      }
    });
  }, [pathname]);
}

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
