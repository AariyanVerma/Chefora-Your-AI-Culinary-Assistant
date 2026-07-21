
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { LogoutButton } from '@/app/components/logoutbutton';

interface User {
  id: string;
  name: string;
  email: string;
}

interface Profile {
  dietary_profile: string | null;
  allergies: string[] | null;
  skill_level: string | null;
  kitchen_tools: string[] | null;
  favorite_cuisines: string[] | null;
  max_prep_time_minutes: number | null;
  persona: string | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [stats, setStats] = useState({
    totalRecipes: 0,
    recipesCooked: 0,
    streak: 0,
    ingredientsExpiring: 3,
    weeklyMeals: 0,
  });
  const [recentPages, setRecentPages] = useState<Array<{
    path: string;
    title: string;
    icon: string;
    visited_at: Date;
    postImageUrl?: string | null;
    isPost?: boolean;
  }>>([]);
  const [lastRecipe, setLastRecipe] = useState<{
    recipe_id: string;
    recipe_title: string | null;
    recipe_image_url: string | null;
    recipe_prep_time: number | null;
    recipe_difficulty: string | null;
    recipe_servings: number | null;
    recipe_cuisine: string | null;
    recipe_diet_tags: string[] | null;
  } | null>(null);
  const [showLastRecipeModal, setShowLastRecipeModal] = useState(false);
  const [pantryStats, setPantryStats] = useState({
    total_items: 0,
    expiring_1_3_days: 0,
    expiring_7_days: 0,
    expired: 0,
    health_score: 100,
  });
  const [expiringIngredients, setExpiringIngredients] = useState<Array<{
    name: string;
    expiry_date: string;
    daysUntilExpiry: number;
  }>>([]);
  const [suggestedRecipe, setSuggestedRecipe] = useState<{
    title: string;
    imageUrl: string;
    estimatedTimeMinutes: number;
    difficulty: string;
    servings: number;
    description?: string;
    recipeId?: string;
    diet?: string | null;
    cuisine?: string | null;
    ingredients?: Array<{ name: string; quantity?: string } | string>;
    steps?: string[];
  } | null>(null);
  const [generatingRecipe, setGeneratingRecipe] = useState(false);
  const [weeklyMeals, setWeeklyMeals] = useState<Record<string, Array<{ timeOfDay: string; title: string; recipeId: string }>>>({});
  const [recipeGenerationIteration, setRecipeGenerationIteration] = useState(0); 
  const [allPantryIngredients, setAllPantryIngredients] = useState<Array<{ name: string; expiry_date: string; daysUntilExpiry: number }>>([]);
  const [previousRecipeTitles, setPreviousRecipeTitles] = useState<string[]>([]); 
  const [recipeDetails, setRecipeDetails] = useState<{
    title: string;
    imageUrl: string | null;
    ingredients: Array<{ name: string; quantity: string }>;
    steps: string[];
    servings: number | null;
    prepTimeMinutes: number | null;
    cookTimeMinutes: number | null;
    totalTimeMinutes: number | null;
    difficulty: string | null;
    cuisine: string | null;
    diet: string | null;
    summary?: string;
  } | null>(null);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [loadingRecipeDetails, setLoadingRecipeDetails] = useState(false);

  const getTimeBasedGreeting = () => {
    const now = new Date();
    const hour = now.getHours();
    
    if (hour >= 5 && hour < 12) {
      return 'morning';
    } else if (hour >= 12 && hour < 17) {
      return 'afternoon';
    } else {
      return 'evening';
    }
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/dashboard/data');
        if (res.ok) {
          const data = await res.json();
          console.log('Dashboard data received:', data); 
          setUser(data.user);
          setProfile(data.profile);
          setStats(data.stats || stats);
          setRecentPages(data.recentPages || []);
          setLastRecipe(data.lastRecipe || null);
          setPantryStats(data.pantryStats || pantryStats);
          setExpiringIngredients(data.expiringIngredients || []);
          
          fetchAllPantryIngredients(data.profile);
          
          if (data.expiringIngredients && data.expiringIngredients.length > 0) {
            
            setRecipeGenerationIteration(0);
            console.log('[Dashboard] Generating recipe with expiring ingredients:', data.expiringIngredients);
            generateRecipeSuggestion(data.expiringIngredients, data.profile, 0);
          } else if (!suggestedRecipe && !generatingRecipe) {
            
            setRecipeGenerationIteration(0);
            setPreviousRecipeTitles([]);
            console.log('[Dashboard] Generating recipe with no ingredients (preferences only)');
            generateRecipeSuggestion([], data.profile, 0);
          }
          
          fetchWeeklyMeals();
          
          if (data.user?.id) {
            try {
              const profileRes = await fetch(`/api/community/profile?userId=${data.user.id}`);
              if (profileRes.ok) {
                const profileData = await profileRes.json();
                setAvatarUrl(profileData.avatar_url);
                setUsername(profileData.username);
              }
            } catch (error) {
              console.error('Failed to fetch community profile:', error);
            }
          }
        } else if (res.status === 401) {
          router.push('/login');
        } else {
          console.error('Failed to fetch dashboard data:', res.status, res.statusText);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [router]);

  async function fetchAllPantryIngredients(userProfile: Profile | null): Promise<void> {
    try {
      const response = await fetch('/api/dashboard/pantry-ingredients');
      if (response.ok) {
        const data = await response.json();
        const ingredients = data.ingredients || [];
        console.log('[Dashboard] Loaded pantry ingredients:', ingredients.length);
        setAllPantryIngredients(ingredients);
      } else {
        console.warn('[Dashboard] Failed to fetch pantry ingredients:', response.status);
        setAllPantryIngredients([]);
      }
    } catch (error) {
      console.error('[Dashboard] Exception fetching pantry ingredients:', error);
      setAllPantryIngredients([]);
    }
  }

  function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  function extractDetailedIngredient(ing: any): { name: string; quantity: string } {
    
    let quantity = '';
    
    if (ing.original && typeof ing.original === 'string' && ing.original.trim()) {
      
      quantity = ing.original.trim();
    } else if (ing.amount && ing.unit) {
      
      quantity = `${ing.amount} ${ing.unit}`.trim();
      if (ing.unitLong && ing.unitLong !== ing.unit) {
        quantity += ` (${ing.unitLong})`;
      }
    } else if (ing.amount) {
      quantity = String(ing.amount);
      if (ing.unit) {
        quantity += ` ${ing.unit}`;
      }
    } else if (ing.quantity) {
      quantity = String(ing.quantity);
    }
    
    const name = ing.name || ing.originalName || ing.ingredientName || '';
    
    return { name, quantity };
  }

  function enhanceInstructionsForBeginners(steps: string[]): string[] {
    return steps.map((step, index) => {
      let enhanced = step.trim();
      if (!enhanced) return enhanced;
      
      const alreadyEnhanced = enhanced.includes('(turn knob') || enhanced.includes('(cook while') || enhanced.includes('(mix thoroughly');
      
      if (!alreadyEnhanced) {
        
        if (/heat\s+(?:the\s+)?oil/i.test(enhanced) && !enhanced.includes('medium heat')) {
          enhanced = enhanced.replace(/heat\s+(?:the\s+)?oil\s+(?:in\s+)?(?:a\s+)?(?:pan|pot)/i, 'Heat the oil in a pan over medium heat (turn knob to medium, about 5-6 on a 1-10 scale) for about 1-2 minutes until it shimmers slightly');
          if (enhanced === step.trim()) {
            enhanced = enhanced.replace(/heat\s+(?:the\s+)?oil/i, 'Heat the oil in a pan over medium heat (about 2-3 minutes) until it shimmers slightly');
          }
        }
        
        if (!enhanced.includes('(turn knob')) {
          enhanced = enhanced.replace(/\bmedium-high\s+heat\b/i, 'medium-high heat (turn knob to medium-high, about 6-7 on a 1-10 scale)');
          enhanced = enhanced.replace(/\bmedium\s+heat\b/i, 'medium heat (turn knob to medium, about 5-6 on a 1-10 scale)');
          enhanced = enhanced.replace(/\bhigh\s+heat\b/i, 'high heat (turn knob to high, about 8-9 on a 1-10 scale)');
          enhanced = enhanced.replace(/\blow\s+heat\b/i, 'low heat (turn knob to low, about 2-3 on a 1-10 scale)');
          enhanced = enhanced.replace(/\bmedium-low\s+heat\b/i, 'medium-low heat (turn knob to medium-low, about 3-4 on a 1-10 scale)');
        }
        
        if (!enhanced.includes('(cook while') && !enhanced.includes('(cook in hot')) {
          enhanced = enhanced.replace(/\bsauté\b/i, 'sauté (cook while stirring frequently)');
          enhanced = enhanced.replace(/\bfry\b/i, 'fry (cook in hot oil)');
        }
        if (!enhanced.includes('(cook gently')) {
          enhanced = enhanced.replace(/\bsimmer\b/i, 'simmer (cook gently just below boiling point)');
        }
        if (!enhanced.includes('(cook at a rolling')) {
          enhanced = enhanced.replace(/\bboil\b/i, 'boil (cook at a rolling boil with bubbles)');
        }
        
        if (!enhanced.includes('(mix thoroughly')) {
          enhanced = enhanced.replace(/\bstir\s+well\b/i, 'stir well (mix thoroughly using a spoon or spatula)');
        }
        if (!enhanced.includes('(combine all')) {
          enhanced = enhanced.replace(/\bmix\s+together\b/i, 'mix together (combine all ingredients evenly)');
        }
        if (!enhanced.includes('(mix every')) {
          enhanced = enhanced.replace(/\bstir\s+occasionally\b/i, 'stir occasionally (mix every 1-2 minutes)');
          enhanced = enhanced.replace(/\bstir\s+frequently\b/i, 'stir frequently (mix every 30 seconds)');
        }
        
        if (!enhanced.includes('(test by poking')) {
          enhanced = enhanced.replace(/cook\s+until\s+tender\b/i, 'cook until tender (test by poking with a fork - it should go through easily without resistance, usually 5-10 minutes)');
        }
        if (!enhanced.includes('(check by cutting')) {
          enhanced = enhanced.replace(/cook\s+until\s+done\b/i, 'cook until done (check by cutting a piece in half - it should be cooked through with no raw center)');
        }
        if (!enhanced.includes('(the color should be')) {
          enhanced = enhanced.replace(/cook\s+until\s+golden\s+brown\b/i, 'cook until golden brown (the color should be a light to medium brown, like honey)');
        }
        if (!enhanced.includes('(test by pressing')) {
          enhanced = enhanced.replace(/cook\s+until\s+soft\b/i, 'cook until soft (test by pressing with a fork - it should yield easily)');
        }
        
        if (!enhanced.includes('(add salt, pepper')) {
          enhanced = enhanced.replace(/season\s+to\s+taste\b/i, 'season to taste (add salt, pepper, or spices gradually, tasting as you go until it tastes good to you)');
          enhanced = enhanced.replace(/add\s+salt\s+to\s+taste\b/i, 'add salt to taste (sprinkle a little salt, mix, taste, and add more if needed)');
        }
      }
      
      if (enhanced && enhanced[0]) {
        enhanced = enhanced[0].toUpperCase() + enhanced.slice(1);
      }
      
      return enhanced;
    });
  }

  function getIngredientsForIteration(iteration: number): Array<{ name: string }> {
    
    if (allPantryIngredients.length === 0) {
      return [];
    }
    
    const dayThresholds = [3, 7, 14, 999];
    const threshold = dayThresholds[Math.min(iteration, dayThresholds.length - 1)];
    
    const filtered = allPantryIngredients
      .filter(ing => ing.daysUntilExpiry >= 0 && ing.daysUntilExpiry <= threshold) 
      .map(ing => ({ name: ing.name }));
    
    const shuffled = shuffleArray(filtered);
    
    const maxIngredients = Math.min(Math.max(3, Math.floor(Math.random() * 5) + 3), shuffled.length);
    const selected = shuffled.slice(0, maxIngredients);
    
    console.log('[Dashboard] Selected ingredients for iteration', iteration, ':', selected.map(i => i.name).join(', '));
    
    return selected;
  }

  async function fetchRecipeImage(recipeTitle: string): Promise<string | null> {
    try {
      console.log('[Dashboard] Fetching recipe image for:', recipeTitle);
      const response = await fetch(`/api/dashboard/fetch-recipe-image?title=${encodeURIComponent(recipeTitle)}`, {
        method: 'GET',
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('[Dashboard] Image fetch response:', data);
        const imageUrl = data.image_url || null;
        if (imageUrl) {
          console.log('[Dashboard] Successfully fetched image URL:', imageUrl);
        } else {
          console.warn('[Dashboard] Image fetch returned null/empty image_url');
        }
        return imageUrl;
      } else {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('[Dashboard] Image fetch failed:', response.status, response.statusText, errorText);
      }
    } catch (error) {
      console.error('[Dashboard] Exception fetching recipe image:', error);
    }
    console.log('[Dashboard] Returning null from fetchRecipeImage');
    return null;
  }

  async function generateRecipeSuggestion(
    ingredients: Array<{ name: string }>,
    userProfile: Profile | null,
    iteration: number
  ) {
    if (generatingRecipe) return;
    
    setGeneratingRecipe(true);
    try {
      
      let ingredientsToUse: Array<{ name: string }>;
      if (iteration === 0) {
        
        if (ingredients.length > 0) {
          
          ingredientsToUse = ingredients;
        } else if (allPantryIngredients.length > 0) {
          
          ingredientsToUse = getIngredientsForIteration(0);
        } else {
          
          ingredientsToUse = [];
        }
      } else {
        
        ingredientsToUse = getIngredientsForIteration(iteration);
      }
      
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";
      const ingredientNames = ingredientsToUse.map(i => i.name);
      
      const requestBody: {
        ingredients?: string[];
        diet?: string;
        cuisine?: string;
        maxTimeMinutes?: number;
        mood?: string;
        exclude?: string[]; 
      } = {
        mood: iteration === 0 ? 'quick dinner' : (iteration === 1 ? 'comfort food' : iteration === 2 ? 'healthy meal' : 'creative cooking'), 
      };

      if (ingredientNames.length > 0) {
        requestBody.ingredients = ingredientNames;
      }
      
      if (previousRecipeTitles.length > 0) {
        
        requestBody.exclude = previousRecipeTitles;
      }
      
      console.log('[Dashboard] Requesting recipe with ingredients:', ingredientNames, 'excluding:', previousRecipeTitles);
      
      if (userProfile?.dietary_profile) {
        requestBody.diet = userProfile.dietary_profile;
      }
      if (userProfile?.favorite_cuisines && userProfile.favorite_cuisines.length > 0) {
        requestBody.cuisine = userProfile.favorite_cuisines[0];
      }
      if (userProfile?.max_prep_time_minutes) {
        requestBody.maxTimeMinutes = userProfile.max_prep_time_minutes;
      }
      
      console.log('[Dashboard] Generating recipe with pantry ingredients:', ingredientNames);
      console.log('[Dashboard] Request body:', requestBody);
      
      const response = await fetch(`${API_BASE}/api/recipes/ai-suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const responseData = await response.json();
        
        let recipe = responseData;
        if (responseData.searchMatches && Array.isArray(responseData.searchMatches) && responseData.searchMatches.length > 0) {
          
          recipe = responseData.searchMatches[0];
        } else if (responseData.mainRecipe) {
          
          recipe = responseData.mainRecipe;
        }
        
        const recipeTitle = recipe.title || recipe.name || 'Recipe Suggestion';
        
        let difficulty = 'Easy';
        if (recipe.difficulty) {
          difficulty = recipe.difficulty.charAt(0).toUpperCase() + recipe.difficulty.slice(1);
        } else if (recipe.estimatedTimeMinutes || recipe.totalTimeMinutes || recipe.readyInMinutes) {
          const time = recipe.estimatedTimeMinutes || recipe.totalTimeMinutes || recipe.readyInMinutes;
          if (time > 60) difficulty = 'Hard';
          else if (time > 30) difficulty = 'Medium';
        }
        
        const servings = recipe.servings || 4;
        
        const diet = recipe.diet || (recipe.dietLabels && recipe.dietLabels.length > 0 ? recipe.dietLabels[0] : null) || userProfile?.dietary_profile || null;
        
        const cuisine = recipe.cuisine || (recipe.cuisines && Array.isArray(recipe.cuisines) && recipe.cuisines.length > 0 ? recipe.cuisines[0] : null) || null;
        
        let extractedIngredients: Array<{ name: string; quantity?: string }> = [];
        if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
          extractedIngredients = recipe.ingredients.map((ing: any) => {
            if (typeof ing === 'string') {
              
              const parts = ing.trim().split(/\s+/);
              if (parts.length >= 3 && /^\d+/.test(parts[0])) {
                const quantity = parts.slice(0, 2).join(' ');
                const name = parts.slice(2).join(' ');
                return { name, quantity };
              }
              return { name: ing, quantity: '' };
            }
            return extractDetailedIngredient(ing);
          }).filter((ing: { name: string; quantity?: string }) => ing.name && ing.name.length > 0);
        } else if (recipe.extendedIngredients && Array.isArray(recipe.extendedIngredients)) {
          extractedIngredients = recipe.extendedIngredients.map((ing: any) => extractDetailedIngredient(ing))
            .filter((ing: { name: string; quantity?: string }) => ing.name && ing.name.length > 0);
        }
        
        let extractedSteps: string[] = [];
        if (recipe.steps && Array.isArray(recipe.steps)) {
          extractedSteps = recipe.steps.map((step: any) => typeof step === 'string' ? step : step.step || step.text || '').filter(Boolean);
        } else if (recipe.analyzedInstructions && Array.isArray(recipe.analyzedInstructions)) {
          const instructions = recipe.analyzedInstructions[0];
          if (instructions && instructions.steps && Array.isArray(instructions.steps)) {
            extractedSteps = instructions.steps.map((s: any) => s.step || s.text || '').filter(Boolean);
          }
        } else if (recipe.instructions && typeof recipe.instructions === 'string') {
          extractedSteps = recipe.instructions
            .replace(/<[^>]*>/g, '')
            .split(/[\r\n]+/)
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 0);
        }
        
        if (extractedSteps.length > 0) {
          extractedSteps = enhanceInstructionsForBeginners(extractedSteps);
        }
        
        let recipeImageUrl = recipe.imageUrl || recipe.image || recipe.thumbnailUrl || null;
        console.log('[Dashboard] Initial recipe image URL from API:', recipeImageUrl);
        
        if (!recipeImageUrl && recipeTitle && recipeTitle !== 'Recipe Suggestion') {
          console.log('[Dashboard] No image from API, fetching from Google for:', recipeTitle);
          recipeImageUrl = await fetchRecipeImage(recipeTitle);
          console.log('[Dashboard] Image URL after Google fetch:', recipeImageUrl);
        }
        
        if (!recipeImageUrl) {
          console.log('[Dashboard] No image found, using placeholder');
          recipeImageUrl = 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=400&fit=crop&q=80';
        }
        
        console.log('[Dashboard] Final recipe image URL:', recipeImageUrl);
        
        let description = recipe.summary || recipe.description || recipe.shortDescription || null;
        if (description && typeof description === 'string') {
          
          description = description.replace(/<[^>]*>/g, '').trim();
        }
        
        if (!description) {
          if (ingredientsToUse.length > 0) {
            const ingredientList = ingredientsToUse.slice(0, 5).map(i => i.name).join(', ');
            if (iteration === 0) {
              description = `A delicious recipe using your expiring pantry ingredients: ${ingredientList}${ingredientsToUse.length > 5 ? '...' : ''}. Perfect for using what you already have!`;
            } else {
              description = `A tasty recipe featuring your pantry items: ${ingredientList}${ingredientsToUse.length > 5 ? '...' : ''}. Uses ingredients you already have!`;
            }
          } else {
            description = 'A delicious recipe suggestion tailored to your preferences!';
          }
        } else if (ingredientsToUse.length > 0) {
          
          const ingredientHint = ingredientsToUse.slice(0, 3).map(i => i.name).join(', ');
          if (iteration === 0) {
            description = `${description} Uses your expiring ingredients: ${ingredientHint}.`;
          } else {
            description = `${description} Features your pantry items: ${ingredientHint}.`;
          }
        }
        
        const recipeToSet = {
          title: recipeTitle,
          imageUrl: recipeImageUrl,
          estimatedTimeMinutes: recipe.estimatedTimeMinutes || recipe.totalTimeMinutes || recipe.readyInMinutes || 30,
          difficulty: difficulty,
          servings: servings,
          description: description,
          recipeId: recipe.recipeId || recipe.id || recipe.recipe_id || null,
          diet: diet,
          cuisine: cuisine,
          ingredients: extractedIngredients,
          steps: extractedSteps,
        };
        
        console.log('[Dashboard] Setting suggested recipe:', recipeToSet);
        setSuggestedRecipe(recipeToSet);
        
        setPreviousRecipeTitles(prev => {
          const normalizedNewTitle = recipeTitle.toLowerCase().trim();
          
          if (!prev.some(title => title.toLowerCase().trim() === normalizedNewTitle)) {
            const updated = [recipeTitle, ...prev].slice(0, 10); 
            console.log('[Dashboard] Updated previous recipes list:', updated);
            return updated;
          }
          return prev;
        });
      }
    } catch (error) {
      console.error('Failed to generate recipe suggestion:', error);
    } finally {
      setGeneratingRecipe(false);
    }
  }

  async function fetchRecipeDetails(recipeId: string) {
    if (!recipeId) {
      console.log('[Dashboard] fetchRecipeDetails called with no recipeId');
      return;
    }
    
    setLoadingRecipeDetails(true);
    
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";
      console.log('[Dashboard] Fetching recipe details for ID:', recipeId);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); 
      
      const response = await fetch(`${API_BASE}/api/recipes/${recipeId}`, {
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      console.log('[Dashboard] Recipe details response status:', response.status);
      
      if (response.ok) {
        const recipe = await response.json();
        console.log('[Dashboard] Recipe details received:', recipe);
        
        let recipeData = recipe;
        if (recipe.searchMatches && Array.isArray(recipe.searchMatches) && recipe.searchMatches.length > 0) {
          recipeData = recipe.searchMatches[0];
        } else if (recipe.mainRecipe) {
          recipeData = recipe.mainRecipe;
        }
        
        let ingredients: Array<{ name: string; quantity: string }> = [];
        if (recipeData.ingredients && Array.isArray(recipeData.ingredients)) {
          ingredients = recipeData.ingredients.map((ing: any) => {
            if (typeof ing === 'string') {
              
              const parts = ing.trim().split(/\s+/);
              if (parts.length >= 3 && /^\d+/.test(parts[0])) {
                const quantity = parts.slice(0, 2).join(' ');
                const name = parts.slice(2).join(' ');
                return { name, quantity };
              }
              return { name: ing, quantity: '' };
            }
            return extractDetailedIngredient(ing);
          }).filter((ing: { name: string; quantity: string }) => ing.name && ing.name.length > 0);
        } else if (recipeData.extendedIngredients && Array.isArray(recipeData.extendedIngredients)) {
          ingredients = recipeData.extendedIngredients.map((ing: any) => extractDetailedIngredient(ing))
            .filter((ing: { name: string; quantity: string }) => ing.name && ing.name.length > 0);
        }
        
        let steps: string[] = [];
        if (recipeData.steps && Array.isArray(recipeData.steps)) {
          steps = recipeData.steps.map((step: any) => typeof step === 'string' ? step : step.step || step.text || '');
        } else if (recipeData.analyzedInstructions && Array.isArray(recipeData.analyzedInstructions)) {
          const instructions = recipeData.analyzedInstructions[0];
          if (instructions && instructions.steps && Array.isArray(instructions.steps)) {
            steps = instructions.steps.map((s: any) => s.step || s.text || '');
          }
        } else if (recipeData.instructions && typeof recipeData.instructions === 'string') {
          
          steps = recipeData.instructions
            .replace(/<[^>]*>/g, '')
            .split(/[\r\n]+/)
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 0);
        }
        
        try {
          console.log('[Dashboard] Fetching ingredients and instructions from AI models...');
          const enhanceResponse = await fetch('/api/dashboard/enhance-recipe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              recipeTitle: recipeData.title || recipeData.name || suggestedRecipe?.title || 'Recipe',
              description: recipeData.summary || recipeData.description || suggestedRecipe?.description,
              existingIngredients: ingredients, 
              existingSteps: steps, 
              servings: recipeData.servings || suggestedRecipe?.servings,
              difficulty: recipeData.difficulty || suggestedRecipe?.difficulty,
              cuisine: recipeData.cuisine || (recipeData.cuisines && Array.isArray(recipeData.cuisines) && recipeData.cuisines.length > 0 ? recipeData.cuisines[0] : null),
              diet: recipeData.diet || (recipeData.dietLabels && Array.isArray(recipeData.dietLabels) && recipeData.dietLabels.length > 0 ? recipeData.dietLabels[0] : null) || profile?.dietary_profile,
            }),
          });
          
          if (enhanceResponse.ok) {
            const enhanced = await enhanceResponse.json();
            
            if (enhanced.ingredients && enhanced.ingredients.length > 0) {
              ingredients = enhanced.ingredients;
              console.log('[Dashboard] Using AI-generated ingredients:', ingredients.length, 'items');
            } else if (enhanced.partial) {
              
              console.warn('[Dashboard] Using partial ingredient enhancements (AI unavailable)');
              ingredients = enhanced.ingredients || ingredients;
            }
            
            if (enhanced.steps && enhanced.steps.length > 0) {
              
              steps = enhanceInstructionsForBeginners(enhanced.steps);
              console.log('[Dashboard] Using AI-generated instructions:', steps.length, 'steps');
            } else if (enhanced.partial) {
              
              console.warn('[Dashboard] Using partial instruction enhancements (AI unavailable)');
              steps = enhanced.steps || steps;
              if (steps.length > 0) {
                steps = enhanceInstructionsForBeginners(steps);
              }
            }
            
            if (!enhanced.partial) {
              console.log('[Dashboard] ✅ Successfully fetched recipe details from AI models (Gemini/Groq)');
              console.log('[Dashboard] AI provided', enhanced.ingredients?.length || 0, 'ingredients and', enhanced.steps?.length || 0, 'steps');
            } else {
              console.error('[Dashboard] ❌ AI models unavailable!');
              console.error('[Dashboard] Error:', enhanced.error);
              console.error('[Dashboard] ⚠️ Using fallback data instead of AI-generated content');
            }
          } else {
            
            const errorText = await enhanceResponse.text().catch(() => 'Unknown error');
            console.warn('[Dashboard] AI enhancement API failed:', enhanceResponse.status, errorText);
            
            if (steps.length > 0) {
              steps = enhanceInstructionsForBeginners(steps);
            }
          }
        } catch (enhanceError: any) {
          console.warn('[Dashboard] Error calling AI enhancement API:', enhanceError?.message || enhanceError);
          
          if (steps.length > 0) {
            steps = enhanceInstructionsForBeginners(steps);
          }
        }
        
        const totalTime = recipeData.estimatedTimeMinutes || recipeData.totalTimeMinutes || recipeData.readyInMinutes || suggestedRecipe?.estimatedTimeMinutes || null;
        let prepTime = recipeData.prepTimeMinutes || recipeData.preparationMinutes || null;
        let cookTime = recipeData.cookTimeMinutes || recipeData.cookingMinutes || null;
        
        if (totalTime && !prepTime && !cookTime) {
          prepTime = Math.floor(totalTime * 0.4);
          cookTime = Math.floor(totalTime * 0.6);
        }
        
        const cuisine = recipeData.cuisine || 
                       (recipeData.cuisines && Array.isArray(recipeData.cuisines) && recipeData.cuisines.length > 0 ? recipeData.cuisines[0] : null) ||
                       null;
        
        setRecipeDetails({
          title: recipeData.title || recipeData.name || suggestedRecipe?.title || 'Recipe',
          imageUrl: recipeData.imageUrl || recipeData.image || recipeData.thumbnailUrl || suggestedRecipe?.imageUrl || null,
          ingredients: ingredients,
          steps: steps,
          servings: recipeData.servings || suggestedRecipe?.servings || null,
          prepTimeMinutes: prepTime,
          cookTimeMinutes: cookTime,
          totalTimeMinutes: totalTime,
          difficulty: recipeData.difficulty || suggestedRecipe?.difficulty || null,
          cuisine: cuisine,
          diet: recipeData.diet || 
                (recipeData.dietLabels && Array.isArray(recipeData.dietLabels) && recipeData.dietLabels.length > 0 ? recipeData.dietLabels[0] : null) ||
                profile?.dietary_profile || null,
          summary: recipeData.summary || recipeData.description || recipeData.shortDescription || suggestedRecipe?.description || null,
        });
      } else {
        
        const errorText = await response.text().catch(() => 'Unknown error');
        console.warn('[Dashboard] Recipe details API failed:', response.status, errorText);
        console.log('[Dashboard] Keeping existing recipe details (modal already showing)');
        
      }
    } catch (error: any) {
      
      if (error.name === 'AbortError') {
        console.warn('[Dashboard] Recipe details fetch timed out after 10 seconds');
      } else {
        console.warn('[Dashboard] Error fetching recipe details (network/timeout):', error?.message || error);
      }
      console.log('[Dashboard] Keeping existing recipe details (modal already showing)');
      
    } finally {
      setLoadingRecipeDetails(false);
    }
  }

  async function handleCookThis() {
    if (!suggestedRecipe) return;
    
    let ingredients: Array<{ name: string; quantity: string }> = [];
    if (suggestedRecipe.ingredients && Array.isArray(suggestedRecipe.ingredients)) {
      ingredients = suggestedRecipe.ingredients.map(ing => {
        if (typeof ing === 'string') {
          
          const parts = ing.trim().split(/\s+/);
          if (parts.length >= 3 && /^\d+/.test(parts[0])) {
            const quantity = parts.slice(0, 2).join(' ');
            const name = parts.slice(2).join(' ');
            return { name, quantity };
          }
          return { name: ing, quantity: '' };
        }
        return {
          name: ing.name || '',
          quantity: ing.quantity || '',
        };
      });
    }
    
    if (ingredients.length === 0 && suggestedRecipe.description) {
      const ingredientMatch = suggestedRecipe.description.match(/Uses your.*?ingredients?:\s*([^.]+)/i) ||
                              suggestedRecipe.description.match(/featuring.*?ingredients?:\s*([^.]+)/i);
      if (ingredientMatch) {
        ingredients = ingredientMatch[1]
          .split(',')
          .map(ing => ({ name: ing.trim(), quantity: '' }))
          .filter(ing => ing.name.length > 0);
      }
    }
    
    let steps = suggestedRecipe.steps && Array.isArray(suggestedRecipe.steps) 
      ? [...suggestedRecipe.steps] 
      : [];
    
    if (steps.length > 0) {
      steps = enhanceInstructionsForBeginners(steps);
    }
    
    const hasMissingQuantities = ingredients.some(ing => 
      !ing.quantity || 
      ing.quantity.length === 0 || 
      ing.quantity.toLowerCase().includes('as needed') ||
      ing.quantity.toLowerCase().includes('to taste') ||
      ing.quantity.toLowerCase().includes('quantity as needed')
    );
    const hasBriefSteps = steps.some(step => step.length < 50); 
    
    const needsEnhancement = ingredients.length === 0 || 
                             steps.length === 0 || 
                             hasMissingQuantities ||
                             hasBriefSteps ||
                             ingredients.length < 3; 
    
    if (needsEnhancement) {
      try {
        console.log('[Dashboard] Suggested recipe details are incomplete, generating via AI...');
        const enhanceResponse = await fetch('/api/dashboard/enhance-recipe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipeTitle: suggestedRecipe.title,
            description: suggestedRecipe.description,
            existingIngredients: ingredients,
            existingSteps: steps,
            servings: suggestedRecipe.servings,
            difficulty: suggestedRecipe.difficulty,
            cuisine: suggestedRecipe.cuisine,
            diet: suggestedRecipe.diet || profile?.dietary_profile,
          }),
        });
        
        if (enhanceResponse.ok) {
          const enhanced = await enhanceResponse.json();
          if (enhanced.ingredients && enhanced.ingredients.length > 0) {
            if (ingredients.length === 0) {
              ingredients = enhanced.ingredients;
            } else {
              
              ingredients = ingredients.map(ing => {
                const aiIng = enhanced.ingredients.find((ai: any) => 
                  ai.name.toLowerCase().includes(ing.name.toLowerCase()) || 
                  ing.name.toLowerCase().includes(ai.name.toLowerCase())
                );
                return {
                  name: ing.name,
                  quantity: ing.quantity || aiIng?.quantity || '',
                };
              });
              
              enhanced.ingredients.forEach((aiIng: any) => {
                if (!ingredients.some(ing => 
                  ing.name.toLowerCase().includes(aiIng.name.toLowerCase()) ||
                  aiIng.name.toLowerCase().includes(ing.name.toLowerCase())
                )) {
                  ingredients.push(aiIng);
                }
              });
            }
          }
          
          if (enhanced.steps && enhanced.steps.length > 0) {
            if (steps.length === 0 || steps.every(s => s.length < 30)) {
              steps = enhanceInstructionsForBeginners(enhanced.steps);
            }
          }
          
          if (!enhanced.partial) {
            console.log('[Dashboard] Successfully enhanced suggested recipe with AI-generated details');
          } else {
            console.warn('[Dashboard] Using partial enhancement for suggested recipe (AI unavailable)');
          }
        } else {
          console.warn('[Dashboard] AI enhancement API failed for suggested recipe:', enhanceResponse.status);
        }
      } catch (enhanceError: any) {
        console.warn('[Dashboard] Error enhancing suggested recipe with AI:', enhanceError?.message || enhanceError);
        
      }
    }
    
    const totalTime = suggestedRecipe.estimatedTimeMinutes || null;
    let prepTime = null;
    let cookTime = null;
    if (totalTime) {
      prepTime = Math.floor(totalTime * 0.4);
      cookTime = Math.floor(totalTime * 0.6);
    }
    
    const basicRecipeDetails = {
      title: suggestedRecipe.title,
      imageUrl: suggestedRecipe.imageUrl || null,
      ingredients: ingredients,
      steps: steps,
      servings: suggestedRecipe.servings,
      prepTimeMinutes: prepTime,
      cookTimeMinutes: cookTime,
      totalTimeMinutes: totalTime,
      difficulty: suggestedRecipe.difficulty,
      cuisine: suggestedRecipe.cuisine || null,
      diet: suggestedRecipe.diet || profile?.dietary_profile || null,
      summary: suggestedRecipe.description || undefined,
    };
    
    if (ingredients.length > 0 && steps.length > 0) {
      console.log('[Dashboard] ✅ Displaying recipe with AI-generated ingredients and instructions');
      console.log('[Dashboard] Ingredients count:', ingredients.length, 'Steps count:', steps.length);
    } else {
      console.warn('[Dashboard] ⚠️ Displaying recipe with incomplete data - AI may have failed');
      console.warn('[Dashboard] Ingredients:', ingredients.length, 'Steps:', steps.length);
    }
    setRecipeDetails(basicRecipeDetails);
    setShowRecipeModal(true);
  }

  async function handleAnotherIdea() {
    
    if (allPantryIngredients.length === 0) {
      await fetchAllPantryIngredients(profile);
      
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    
    const nextIteration = recipeGenerationIteration + 1;
    setRecipeGenerationIteration(nextIteration);
    
    console.log('[Dashboard] "Another idea" clicked - iteration:', nextIteration, 'previous recipes:', previousRecipeTitles);
    
    await generateRecipeSuggestion([], profile, nextIteration);
  }

  async function fetchWeeklyMeals() {
    if (!user) return;
    
    try {
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1); 
      startOfWeek.setHours(0, 0, 0, 0);
      
      const mealsByDay: Record<string, Array<{ timeOfDay: string; title: string; recipeId: string }>> = {};
      
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      days.forEach(day => {
        mealsByDay[day] = [];
      });
      
      setWeeklyMeals(mealsByDay);
    } catch (error) {
      console.error('Failed to fetch weekly meals:', error);
    }
  }

  function getDayName(date: Date): string {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[date.getDay()];
  }

  if (loading || !user) {
    return (
      <div className="dashboard-layout layer-content">
        <div className="dashboard-loading">Loading...</div>
      </div>
    );
  }

  return (
    <>
      {}
      <div className="bg-base" aria-hidden />
      <div className="bg-anim" aria-hidden>
        <span
          className="bubble b-pink"
          style={
            { "--sz": "520px", "--x": "10%", "--y": "-6%", "--d": "18s" } as any
          }
        />
        <span
          className="bubble b-blue"
          style={
            { "--sz": "620px", "--x": "82%", "--y": "-12%", "--d": "22s" } as any
          }
        />
        <span
          className="bubble b-green"
          style={
            { "--sz": "460px", "--x": "14%", "--y": "76%", "--d": "20s" } as any
          }
        />
        <span
          className="bubble b-neon"
          style={
            { "--sz": "540px", "--x": "86%", "--y": "78%", "--d": "19s" } as any
          }
        />
        <span
          className="bubble b-purple"
          style={
            { "--sz": "360px", "--x": "48%", "--y": "16%", "--d": "16s" } as any
          }
        />
        <span
          className="bubble b-amber"
          style={
            { "--sz": "320px", "--x": "58%", "--y": "54%", "--d": "21s" } as any
          }
        />
        <span
          className="bubble b-cyan"
          style={
            { "--sz": "340px", "--x": "30%", "--y": "52%", "--d": "17s" } as any
          }
        />
        <span
          className="bubble b-magenta"
          style={
            { "--sz": "300px", "--x": "72%", "--y": "32%", "--d": "15s" } as any
          }
        />
      </div>

      {}
      <aside 
        className={`dashboard-sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}
      >
          <div className="dashboard-brand">Chefora</div>
          <nav className="dashboard-nav">
            <Link 
              href="/dashboard" 
              className={`dashboard-nav-link ${pathname === '/dashboard' ? 'dashboard-nav-link-active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              Dashboard
            </Link>
            <Link 
              href="/" 
              className={`dashboard-nav-link ${pathname === '/' ? 'dashboard-nav-link-active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              Recipes
            </Link>
            <Link 
              href="/ai-recipes" 
              className={`dashboard-nav-link ${pathname === '/ai-recipes' ? 'dashboard-nav-link-active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              AI Recipe Generator
            </Link>
            <Link 
              href="/pantry" 
              className={`dashboard-nav-link ${pathname === '/pantry' ? 'dashboard-nav-link-active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              Pantry
            </Link>
            <Link 
              href="/shopping-list" 
              className={`dashboard-nav-link ${pathname === '/shopping-list' ? 'dashboard-nav-link-active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              Shopping List
            </Link>
            <Link 
              href="/meal-planner" 
              className={`dashboard-nav-link ${pathname === '/meal-planner' ? 'dashboard-nav-link-active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              Meal Planner
            </Link>
            <Link 
              href="/community" 
              className={`dashboard-nav-link ${pathname === '/community' ? 'dashboard-nav-link-active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              Community
            </Link>
            <Link 
              href="/settings" 
              className={`dashboard-nav-link ${pathname === '/settings' ? 'dashboard-nav-link-active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              Settings
            </Link>
          </nav>
          
          {}
          <div className="dashboard-sidebar-section">
            <div className="dashboard-sidebar-section-header">
              <span>Recent</span>
            </div>
            <div className="dashboard-recent-items">
              {lastRecipe && (
                <div 
                  className="dashboard-recent-item"
                  onClick={() => setShowLastRecipeModal(true)}
                  style={{ cursor: 'pointer' }}
                >
                  <span className="dashboard-recent-icon">📝</span>
                  <span className="dashboard-recent-text">
                    {lastRecipe.recipe_title || 'Last Recipe'}
                  </span>
                </div>
              )}
              {recentPages.map((page, index) => (
                <Link
                  key={index}
                  href={page.path}
                  className="dashboard-recent-item"
                  onClick={() => setSidebarOpen(false)}
                  style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  {page.isPost && page.postImageUrl ? (
                    <Image
                      src={page.postImageUrl}
                      alt={page.title}
                      width={24}
                      height={24}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '4px',
                        objectFit: 'cover',
                        flexShrink: 0
                      }}
                      unoptimized
                    />
                  ) : (
                    <span className="dashboard-recent-icon">{page.icon}</span>
                  )}
                  <span className="dashboard-recent-text" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {page.title}
                  </span>
                </Link>
              ))}
              {!lastRecipe && recentPages.length === 0 && (
                <div className="dashboard-recent-item" style={{ opacity: 0.6 }}>
                  <span className="dashboard-recent-text">No recent activity</span>
                </div>
              )}
            </div>
          </div>

          {}
          <div className="dashboard-sidebar-section">
            <div className="dashboard-sidebar-section-header">
              <span>Quick Stats</span>
            </div>
            <div className="dashboard-quick-stats">
              <div className="dashboard-quick-stat">
                <span className="dashboard-quick-stat-value">{stats.totalRecipes}</span>
                <span className="dashboard-quick-stat-label">Recipes</span>
              </div>
              <div className="dashboard-quick-stat">
                <span className="dashboard-quick-stat-value">{stats.streak}</span>
                <span className="dashboard-quick-stat-label">Day Streak</span>
              </div>
            </div>
          </div>
        </aside>

        {}
        {sidebarOpen && (
          <div 
            className="dashboard-sidebar-overlay" 
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {}
        <button 
          className="dashboard-sidebar-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle sidebar"
        >
          <span className={`hamburger-line ${sidebarOpen ? 'active' : ''}`}></span>
          <span className={`hamburger-line ${sidebarOpen ? 'active' : ''}`}></span>
          <span className={`hamburger-line ${sidebarOpen ? 'active' : ''}`}></span>
        </button>

      <div className="dashboard-layout layer-content">
        {}
        <main className="dashboard-main">
          {}
          <header className="dashboard-top-header">
            {}
            <div className="dashboard-logo-center-screen">
              <Link href="/dashboard">
                <Image
                  src="/assets/chefora-logo.svg"
                  alt="Chefora Logo"
                  width={80}
                  height={80}
                  className="dashboard-header-logo"
                  priority
                />
              </Link>
            </div>
            <div className="dashboard-search-wrapper">
              <div className="inputIcon" style={{ flex: 1 }}>
                <i>🔎</i>
                <input
                  className="input"
                  placeholder="Search or ask Chefora anything…"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                />
                {searchValue && (
                  <button 
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: 'rgba(230, 237, 246, 0.6)',
                      fontSize: '18px',
                      cursor: 'pointer',
                      padding: '4px'
                    }}
                    onClick={() => setSearchValue('')}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
            <div className="dashboard-user-section">
              <button className="btn ghost tap-ripple dashboard-theme-toggle">☾</button>
              <div className="dashboard-user-info">
                <div className="dashboard-user-details">
                  <div className="dashboard-user-name">{user.name}</div>
                  <div className="dashboard-user-email">{user.email}</div>
                </div>
                {username ? (
                  <Link 
                    href={`/community/u/${username}`}
                    className="dashboard-user-avatar"
                    style={{ cursor: 'pointer', textDecoration: 'none', display: 'block', position: 'relative', overflow: 'hidden' }}
                  >
                    {avatarUrl ? (
                      <Image
                        src={avatarUrl}
                        alt={user?.name || 'User avatar'}
                        width={36}
                        height={36}
                        style={{ objectFit: 'cover', borderRadius: '50%' }}
                        unoptimized
                      />
                    ) : (
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #a855f7, #06b6d4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: '14px',
                        fontWeight: 'bold'
                      }}>
                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                  </Link>
                ) : (
                  <div className="dashboard-user-avatar">
                    {user?.name && (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: '14px',
                        fontWeight: 'bold'
                      }}>
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                )}
                <LogoutButton />
              </div>
            </div>
          </header>

          {}
          <div className="dashboard-profile-section">
            <div className="card-wrapper dashboard-profile-card">
              <div className="card-background"></div>
              <div className="glass ios solid card">
                <div className="dashboard-profile-header">
                <span className="dashboard-profile-icon">👤</span>
                <span className="dashboard-profile-label">Your Profile</span>
              </div>
              {profile ? (
                <div className="chip-row dashboard-profile-chips">
                  {profile.dietary_profile && (
                    <span className="chip tap-ripple active dashboard-profile-chip">
                      <span className="chip-dot" />
                      <span className="chip-label">{profile.dietary_profile.replace('_', ' ')}</span>
                    </span>
                  )}
                  {profile.allergies && profile.allergies.length > 0 && (
                    <span className="chip tap-ripple active dashboard-profile-chip">
                      <span className="chip-dot" />
                      <span className="chip-label">⚠️ {profile.allergies.join(', ')}</span>
                    </span>
                  )}
                  {profile.skill_level && (
                    <span className="chip tap-ripple active dashboard-profile-chip">
                      <span className="chip-dot" />
                      <span className="chip-label">🎯 {profile.skill_level}</span>
                    </span>
                  )}
                  {profile.kitchen_tools && profile.kitchen_tools.length > 0 && (
                    <span className="chip tap-ripple active dashboard-profile-chip">
                      <span className="chip-dot" />
                      <span className="chip-label">🔪 {profile.kitchen_tools.join(', ')}</span>
                    </span>
                  )}
                  {profile.persona && (
                    <span className="chip tap-ripple active dashboard-profile-chip">
                      <span className="chip-dot" />
                      <span className="chip-label">
                        {profile.persona === 'student'
                          ? '🎓 Student mode'
                          : profile.persona === 'fitness'
                          ? '💪 Fitness mode'
                          : '👨‍👩‍👧 Family mode'}
                      </span>
                    </span>
                  )}
                  {profile.favorite_cuisines && profile.favorite_cuisines.length > 0 && (
                    <span className="chip tap-ripple active dashboard-profile-chip">
                      <span className="chip-dot" />
                      <span className="chip-label">❤️ {profile.favorite_cuisines.join(', ')}</span>
                    </span>
                  )}
                  {profile.max_prep_time_minutes && (
                    <span className="chip tap-ripple active dashboard-profile-chip">
                      <span className="chip-dot" />
                      <span className="chip-label">⏱️ Max {profile.max_prep_time_minutes} min</span>
                    </span>
                  )}
                  {!profile.dietary_profile && 
                   !profile.allergies?.length && 
                   !profile.skill_level && 
                   !profile.kitchen_tools?.length && 
                   !profile.persona && 
                   !profile.favorite_cuisines?.length && 
                   !profile.max_prep_time_minutes && (
                    <span className="dashboard-profile-empty">
                      No profile data yet. Complete your profile in settings!
                    </span>
                  )}
                </div>
              ) : (
                <div className="dashboard-profile-empty">
                  <p>No profile found. Please complete your profile setup.</p>
                </div>
              )}
              </div>
            </div>
          </div>

          {}
          <div className="dashboard-stats-row">
            <div className="card-wrapper dashboard-stat-card">
              <div className="card-background"></div>
              <div className="glass card card-mount">
                <div className="dashboard-stat-icon">🔥</div>
                <div className="dashboard-stat-content">
                  <div className="dashboard-stat-value">{stats.streak}</div>
                  <div className="dashboard-stat-label">Day Streak</div>
                </div>
              </div>
            </div>
            <div className="card-wrapper dashboard-stat-card">
              <div className="card-background"></div>
              <div className="glass card card-mount">
                <div className="dashboard-stat-icon">🍳</div>
                <div className="dashboard-stat-content">
                  <div className="dashboard-stat-value">{stats.recipesCooked}</div>
                  <div className="dashboard-stat-label">Recipes Cooked</div>
                </div>
              </div>
            </div>
            <div className="card-wrapper dashboard-stat-card">
              <div className="card-background"></div>
              <div className="glass card card-mount">
                <div className="dashboard-stat-icon">⚠️</div>
                <div className="dashboard-stat-content">
                  <div className="dashboard-stat-value">{stats.ingredientsExpiring}</div>
                  <div className="dashboard-stat-label">Expiring Soon</div>
                </div>
              </div>
            </div>
            <div className="card-wrapper dashboard-stat-card">
              <div className="card-background"></div>
              <div className="glass card card-mount">
                <div className="dashboard-stat-icon">📅</div>
                <div className="dashboard-stat-content">
                  <div className="dashboard-stat-value">{stats.weeklyMeals}</div>
                  <div className="dashboard-stat-label">This Week</div>
                </div>
              </div>
            </div>
          </div>

          {}
          <div className="container">
            <div className="dashboard-grid">
              {}
              <div className="card-wrapper dashboard-hero-card">
                <div className="card-background"></div>
                <div className="glass card card-mount">
                  <div className="cardBody">
                  <div className="dashboard-hero-content-wrapper">
                    <div className="dashboard-hero-left-section">
                      <div className="dashboard-greeting">
                        <h2 className="cardTitle" style={{ marginBottom: '6px', fontSize: 'clamp(16px, 2vw, 20px)' }}>
                          Good {getTimeBasedGreeting()}, {user.name?.split(' ')[0] || 'chef'} 👋
                        </h2>
                        <p className="subtitle" style={{ marginBottom: '16px' }}>
                          {generatingRecipe ? (
                            '✨ Generating a personalized recipe suggestion for you...'
                          ) : stats.ingredientsExpiring > 0 ? (
                            `You have ${stats.ingredientsExpiring} ingredient${stats.ingredientsExpiring > 1 ? 's' : ''} expiring soon. Here's a quick dinner idea:`
                          ) : suggestedRecipe ? (
                            'Here\'s a recipe suggestion for you:'
                          ) : (
                            'Get personalized recipe suggestions based on your preferences!'
                          )}
                        </p>
                      </div>

                      {suggestedRecipe ? (
                        <div 
                          className="dashboard-recipe-preview"
                          style={{ cursor: 'pointer' }}
                          onClick={() => {
                            if (suggestedRecipe.recipeId) {
                              router.push(`/ai-recipes?recipe=${suggestedRecipe.recipeId}`);
                            } else {
                              router.push('/ai-recipes');
                            }
                          }}
                          title="Click to view full recipe"
                        >
                          <div className="dashboard-recipe-image" style={{ position: 'relative', overflow: 'hidden' }}>
                            <img
                              src={suggestedRecipe.imageUrl}
                              alt={suggestedRecipe.title}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                borderRadius: '12px',
                                transition: 'transform 0.3s ease',
                                display: 'block',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'scale(1.05)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'scale(1)';
                              }}
                              onError={(e) => {
                                
                                const target = e.target as HTMLImageElement;
                                target.src = 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=400&fit=crop&q=80';
                              }}
                            />
                            <div style={{
                              position: 'absolute',
                              top: '8px',
                              right: '8px',
                              background: 'rgba(0, 0, 0, 0.7)',
                              borderRadius: '50%',
                              width: '32px',
                              height: '32px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '16px',
                            }}>
                              👁️
                            </div>
                          </div>
                          <div className="dashboard-recipe-content">
                            <div 
                              className="cardTitle" 
                              style={{ 
                                marginBottom: '4px',
                                transition: 'color 0.2s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = 'var(--accent)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = '';
                              }}
                            >
                              {suggestedRecipe.title}
                            </div>
                            <div className="subtitle" style={{ marginBottom: '8px', fontSize: '12px' }}>
                              ⏱️ {suggestedRecipe.estimatedTimeMinutes} min • ⭐ {suggestedRecipe.difficulty} • 🍽️ {suggestedRecipe.servings} servings
                            </div>
                          </div>
                        </div>
                      ) : generatingRecipe ? (
                        <div className="dashboard-recipe-preview">
                          <div className="subtitle">Generating recipe suggestion...</div>
                        </div>
                      ) : (
                        <div className="dashboard-recipe-preview">
                          <div className="subtitle">No recipe suggestions available</div>
                        </div>
                      )}
                    </div>
                    {suggestedRecipe && (
                      <div 
                        className="dashboard-recipe-description-side"
                        onClick={() => {
                          if (suggestedRecipe.recipeId) {
                            router.push(`/ai-recipes?recipe=${suggestedRecipe.recipeId}`);
                          } else {
                            router.push('/ai-recipes');
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        {suggestedRecipe.description}
                      </div>
                    )}
                  </div>
                  <div className="dashboard-recipe-tags">
                    {suggestedRecipe && (
                      <>
                        {(suggestedRecipe.diet || profile?.dietary_profile) && (
                          <span 
                            className="dashboard-recipe-tag"
                            onClick={() => router.push(`/?diet=${suggestedRecipe.diet || profile?.dietary_profile}`)}
                            style={{ cursor: 'pointer' }}
                            title={`Filter recipes by ${suggestedRecipe.diet || profile?.dietary_profile}`}
                          >
                            {(suggestedRecipe.diet || profile?.dietary_profile)?.replace('_', ' ') || 'Diet'}
                          </span>
                        )}
                        {suggestedRecipe.difficulty && (
                          <span 
                            className="dashboard-recipe-tag"
                            onClick={() => router.push(`/?difficulty=${suggestedRecipe.difficulty.toLowerCase()}`)}
                            style={{ cursor: 'pointer' }}
                            title={`Find more ${suggestedRecipe.difficulty.toLowerCase()} recipes`}
                          >
                            {suggestedRecipe.difficulty}
                          </span>
                        )}
                        <span 
                          className="dashboard-recipe-tag"
                          onClick={() => router.push('/?quick=true')}
                          style={{ cursor: 'pointer' }}
                          title="Find quick meal recipes"
                        >
                          Quick Meal
                        </span>
                        <span 
                          className="dashboard-recipe-tag"
                          onClick={() => router.push('/ai-recipes')}
                          style={{ cursor: 'pointer' }}
                          title="Get more recipe ideas"
                        >
                          One Pot
                        </span>
                      </>
                    )}
                  </div>
                  <div className="toolbar dashboard-hero-toolbar">
                    <button 
                      className="btn tap-ripple"
                      onClick={handleCookThis}
                      disabled={!suggestedRecipe}
                      style={{
                        opacity: suggestedRecipe ? 1 : 0.6,
                        cursor: suggestedRecipe ? 'pointer' : 'not-allowed',
                      }}
                    >
                      🍳 Cook this
                    </button>
                    <button 
                      className="btn ghost tap-ripple"
                      onClick={handleAnotherIdea}
                      disabled={generatingRecipe}
                      style={{
                        opacity: generatingRecipe ? 0.6 : 1,
                        cursor: generatingRecipe ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span style={{ 
                        display: 'inline-block',
                        transition: 'transform 0.3s ease',
                        transform: generatingRecipe ? 'rotate(180deg)' : 'rotate(0deg)',
                      }}>
                        🔄
                      </span>
                      {generatingRecipe ? 'Generating...' : 'Another idea'}
                    </button>
                    {suggestedRecipe && (
                      <button
                        className="btn ghost tap-ripple"
                        onClick={() => {
                          
                          if (navigator.share && suggestedRecipe) {
                            navigator.share({
                              title: suggestedRecipe.title,
                              text: `Check out this recipe: ${suggestedRecipe.title}`,
                              url: suggestedRecipe.recipeId 
                                ? `${window.location.origin}/ai-recipes?recipe=${suggestedRecipe.recipeId}`
                                : window.location.origin + '/ai-recipes',
                            }).catch(() => {
                              
                              const text = `Check out this recipe: ${suggestedRecipe.title}`;
                              navigator.clipboard.writeText(text);
                            });
                          } else if (suggestedRecipe) {
                            
                            const text = `Check out this recipe: ${suggestedRecipe.title}`;
                            navigator.clipboard.writeText(text).then(() => {
                              alert('Recipe link copied to clipboard!');
                            });
                          }
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                        title="Share this recipe"
                      >
                        📤 Share
                      </button>
                    )}
                  </div>
                  </div>
                </div>
              </div>

              {}
              <div className="card-wrapper dashboard-pantry-card">
                <div className="card-background"></div>
                <div className="glass card card-mount">
                  <div className="cardBody" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div className="dashboard-card-header">
                    <span className="dashboard-card-icon">🥘</span>
                    <h3 className="cardTitle" style={{ marginBottom: '0' }}>Pantry Overview</h3>
                  </div>
                  <div className="dashboard-pantry-stats">
                    <div className="dashboard-pantry-stat">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                        <span className="dashboard-pantry-stat-icon">📦</span>
                        <span className="dashboard-pantry-stat-label">Total ingredients</span>
                      </div>
                      <span className="dashboard-pantry-stat-value">{pantryStats.total_items}</span>
                    </div>
                    <div className="dashboard-pantry-stat-divider"></div>
                    <div className="dashboard-pantry-stat">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                        <span className="dashboard-pantry-stat-icon">⏰</span>
                        <span className="dashboard-pantry-stat-label">Expiring in days</span>
                      </div>
                      <span className="dashboard-pantry-stat-value urgent">{pantryStats.expiring_1_3_days}</span>
                    </div>
                  </div>
                  <div style={{ flex: '1', minHeight: '40px', marginBottom: '12px', display: 'flex', flexDirection: 'column' }}>
                    {expiringIngredients.length > 0 ? (
                      <ul className="dashboard-list" style={{ 
                        maxHeight: '180px', 
                        overflowY: 'auto',
                        marginBottom: '0',
                        marginTop: '0',
                        paddingRight: '4px',
                        flex: '1'
                      }}>
                        {expiringIngredients.map((ingredient, idx) => (
                          <li 
                            key={idx} 
                            className={`dashboard-list-item ${ingredient.daysUntilExpiry === 0 ? 'urgent' : ingredient.daysUntilExpiry <= 1 ? 'urgent' : 'warning'}`}
                          >
                            🥘 {ingredient.name} – expires {ingredient.daysUntilExpiry === 0 ? 'today' : `in ${ingredient.daysUntilExpiry} ${ingredient.daysUntilExpiry === 1 ? 'day' : 'days'}`}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <ul className="dashboard-list" style={{ marginBottom: '0', marginTop: '0' }}>
                        <li className="dashboard-list-item" style={{ opacity: 0.6 }}>
                          No ingredients expiring soon
                        </li>
                      </ul>
                    )}
                  </div>
                  <button 
                    className="dashboard-card-button" 
                    style={{ 
                      marginTop: 'auto', 
                      flexShrink: 0,
                      padding: '8px 16px',
                      minHeight: 'auto',
                      height: 'auto'
                    }}
                    onClick={() => router.push('/pantry')}
                  >
                    <span>View pantry</span>
                  </button>
                  </div>
                </div>
              </div>

              {}
              <div className="card-wrapper dashboard-planner-card">
                <div className="card-background"></div>
                <div className="glass card card-mount">
                  <div className="cardBody">
                  <div className="dashboard-card-header">
                    <span className="dashboard-card-icon">📅</span>
                    <h3 className="cardTitle" style={{ marginBottom: '0' }}>This Week&apos;s Plan</h3>
                  </div>
                  <div className="dashboard-week-container">
                    <div className="dashboard-week-grid">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
                        const dayMeals = weeklyMeals[day] || [];
                        const hasMeals = dayMeals.length > 0;
                        return (
                          <button
                            key={day}
                            className="dashboard-day-button"
                            style={{ ["--i" as any]: index }}
                            onClick={() => router.push('/meal-planner')}
                          >
                            <span className="dashboard-day-name">{day}</span>
                            <span className="dashboard-day-status">
                              {hasMeals 
                                ? `${dayMeals.length} meal${dayMeals.length > 1 ? 's' : ''}`
                                : 'Not planned'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <button 
                    className="dashboard-card-button dashboard-card-button-primary" 
                    style={{ marginTop: '12px' }}
                    onClick={() => router.push('/meal-planner')}
                  >
                    <span className="dashboard-button-icon">🤖</span>
                    <span>Auto-fill week with AI</span>
                  </button>
                  </div>
                </div>
              </div>

              {}
              <div className="card-wrapper dashboard-actions-card">
                <div className="card-background"></div>
                <div className="glass card card-mount">
                  <div className="cardBody">
                  <div className="dashboard-card-header">
                    <span className="dashboard-card-icon">⚡</span>
                    <h3 className="cardTitle" style={{ marginBottom: '0' }}>Quick Actions</h3>
                  </div>
                  <div className="dashboard-quick-actions">
                    <button 
                      className="dashboard-action-btn tap-ripple"
                      onClick={() => router.push('/')}
                    >
                      <span className="dashboard-action-icon">🔍</span>
                      <span>Find Recipe</span>
                    </button>
                    <button 
                      className="dashboard-action-btn tap-ripple"
                      onClick={() => router.push('/ai-recipes')}
                    >
                      <span className="dashboard-action-icon">🤖</span>
                      <span>AI Generator</span>
                    </button>
                    <button 
                      className="dashboard-action-btn tap-ripple"
                      onClick={() => router.push('/meal-planner')}
                    >
                      <span className="dashboard-action-icon">📝</span>
                      <span>Meal Plan</span>
                    </button>
                    <button 
                      className="dashboard-action-btn tap-ripple"
                      onClick={() => router.push('/shopping-list')}
                    >
                      <span className="dashboard-action-icon">🛒</span>
                      <span>Shopping List</span>
                    </button>
                  </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {}
      {showRecipeModal && (
        <div 
          className="dashboard-sidebar-overlay"
          style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowRecipeModal(false);
              setRecipeDetails(null);
            }
          }}
        >
          <div 
            className="card-wrapper dashboard-recipe-modal-card"
            style={{
              maxWidth: '900px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'hidden',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-background"></div>
            <div className="glass card card-mount" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
              <div className="cardBody" style={{ overflowY: 'auto', flex: 1, padding: 'var(--pad-lg)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                  <button
                    onClick={() => {
                      setShowRecipeModal(false);
                      setRecipeDetails(null);
                    }}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '50%',
                      width: '36px',
                      height: '36px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: 'var(--text)',
                      fontSize: '24px',
                      lineHeight: '1',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      marginLeft: 'auto',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(103, 232, 249, 0.2)';
                      e.currentTarget.style.borderColor = 'rgba(103, 232, 249, 0.4)';
                      e.currentTarget.style.transform = 'scale(1.1)';
                      e.currentTarget.style.boxShadow = '0 0 20px rgba(103, 232, 249, 0.3)';
                      e.currentTarget.style.color = '#67e8f9';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.color = 'var(--text)';
                    }}
                  >
                    ×
                  </button>
                </div>

            {loadingRecipeDetails ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text)' }}>
                Loading recipe details...
              </div>
            ) : recipeDetails ? (
              <>
                {}
                <h2 className="cardTitle" style={{ 
                  fontSize: 'var(--fs-xl)', 
                  marginBottom: '1.5rem',
                  marginTop: '-0.5rem',
                  color: '#ffffff',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}>
                  {recipeDetails.title}
                </h2>

                {}
                {recipeDetails.imageUrl && (
                  <div style={{
                    marginBottom: '1.5rem',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}>
                    <img
                      src={recipeDetails.imageUrl}
                      alt={recipeDetails.title}
                      style={{
                        width: '100%',
                        height: 'auto',
                        maxHeight: '400px',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                      onError={(e) => {
                        
                        const target = e.target as HTMLImageElement;
                        target.src = 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=400&fit=crop&q=80';
                      }}
                    />
                  </div>
                )}

                {}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '1rem',
                  marginBottom: '1.5rem',
                  padding: 'var(--pad-md)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }}
                >
                  {recipeDetails.servings && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--muted)' }}>🍽️ Servings</span>
                      <span style={{ fontWeight: '600', color: 'var(--text)' }}>{recipeDetails.servings}</span>
                    </div>
                  )}
                  {recipeDetails.totalTimeMinutes && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--muted)' }}>⏱️ Total Time</span>
                      <span style={{ fontWeight: '600', color: 'var(--text)' }}>{recipeDetails.totalTimeMinutes} min</span>
                    </div>
                  )}
                  {recipeDetails.prepTimeMinutes && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--muted)' }}>⏳ Prep Time</span>
                      <span style={{ fontWeight: '600', color: 'var(--text)' }}>{recipeDetails.prepTimeMinutes} min</span>
                    </div>
                  )}
                  {recipeDetails.cookTimeMinutes && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--muted)' }}>🔥 Cook Time</span>
                      <span style={{ fontWeight: '600', color: 'var(--text)' }}>{recipeDetails.cookTimeMinutes} min</span>
                    </div>
                  )}
                  {recipeDetails.difficulty && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--muted)' }}>⭐ Difficulty</span>
                      <span style={{ fontWeight: '600', color: 'var(--text)' }}>{recipeDetails.difficulty.charAt(0).toUpperCase() + recipeDetails.difficulty.slice(1)}</span>
                    </div>
                  )}
                  {recipeDetails.cuisine && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--muted)' }}>🌍 Cuisine</span>
                      <span style={{ fontWeight: '600', color: 'var(--text)' }}>{recipeDetails.cuisine.charAt(0).toUpperCase() + recipeDetails.cuisine.slice(1)}</span>
                    </div>
                  )}
                  {recipeDetails.diet && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--muted)' }}>🥗 Diet</span>
                      <span style={{ fontWeight: '600', color: 'var(--text)' }}>{recipeDetails.diet.replace('_', ' ').split(' ').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</span>
                    </div>
                  )}
                </div>

                {}
                {recipeDetails.summary && (
                  <div style={{
                    marginBottom: '1.5rem',
                    padding: 'var(--pad-md)',
                    background: 'rgba(103, 232, 249, 0.1)',
                    borderRadius: '12px',
                    border: '1px solid rgba(103, 232, 249, 0.2)',
                    color: 'var(--text)',
                    lineHeight: '1.6',
                  }}>
                    <div>{recipeDetails.summary.replace(/<[^>]*>/g, '')}</div>
                  </div>
                )}

                {}
                {recipeDetails.ingredients && recipeDetails.ingredients.length > 0 && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h3 className="cardTitle" style={{ 
                      fontSize: 'var(--fs-lg)', 
                      marginBottom: '1rem',
                      color: '#ffffff'
                    }}>
                      Ingredients Required
                    </h3>
                    <ul className="dashboard-list" style={{
                      listStyle: 'none',
                      padding: 0,
                      margin: 0,
                    }}>
                      {recipeDetails.ingredients.map((ingredient, idx) => (
                        <li key={idx} className="dashboard-list-item" style={{
                          padding: 'var(--pad-md)',
                          marginBottom: '0.5rem',
                          background: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          cursor: 'default',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(103, 232, 249, 0.1)';
                          e.currentTarget.style.borderColor = 'rgba(103, 232, 249, 0.3)';
                          e.currentTarget.style.transform = 'translateX(4px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                          e.currentTarget.style.transform = 'translateX(0)';
                        }}
                        >
                          <span style={{ 
                            fontSize: '18px',
                            color: 'rgba(103, 232, 249, 0.9)',
                            flexShrink: 0,
                          }}>✓</span>
                          <span style={{ flex: 1, color: 'var(--text)' }}>
                            {ingredient.quantity ? (
                              <>
                                <strong style={{ color: 'var(--accent)', marginRight: '0.5rem' }}>
                                  {ingredient.quantity}
                                </strong>
                                {ingredient.name}
                              </>
                            ) : (
                              <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>
                                {ingredient.name} (quantity as needed)
                              </span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {}
                {recipeDetails.steps && recipeDetails.steps.length > 0 && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h3 className="cardTitle" style={{ 
                      fontSize: 'var(--fs-lg)', 
                      marginBottom: '1rem',
                      color: '#ffffff'
                    }}>
                      Recipe Instructions
                    </h3>
                    <ol style={{
                      listStyle: 'none',
                      padding: 0,
                      margin: 0,
                      counterReset: 'step-counter',
                    }}>
                      {recipeDetails.steps.map((step, idx) => (
                        <li key={idx} style={{
                          counterIncrement: 'step-counter',
                          padding: 'var(--pad-md)',
                          marginBottom: '0.75rem',
                          background: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: 'var(--text)',
                          position: 'relative',
                          paddingLeft: '3.5rem',
                          lineHeight: '1.6',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          cursor: 'default',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(103, 232, 249, 0.1)';
                          e.currentTarget.style.borderColor = 'rgba(103, 232, 249, 0.3)';
                          e.currentTarget.style.transform = 'translateX(4px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                          e.currentTarget.style.transform = 'translateX(0)';
                        }}
                        >
                          <span style={{
                            position: 'absolute',
                            left: 'var(--pad-md)',
                            top: 'var(--pad-md)',
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, rgba(103, 232, 249, 0.3), rgba(168, 85, 247, 0.3))',
                            border: '1px solid rgba(103, 232, 249, 0.4)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            fontSize: 'var(--fs-sm)',
                            color: 'var(--text)',
                            boxShadow: '0 0 10px rgba(103, 232, 249, 0.2)',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          }}>
                            {idx + 1}
                          </span>
                          <span style={{ display: 'block' }}>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {}
                {(!recipeDetails.ingredients || recipeDetails.ingredients.length === 0) && (
                  <div style={{
                    padding: 'var(--pad-md)',
                    marginTop: '1rem',
                    marginBottom: '1rem',
                    background: 'rgba(255, 193, 7, 0.1)',
                    border: '1px solid rgba(255, 193, 7, 0.3)',
                    borderRadius: '8px',
                    color: 'var(--text)',
                  }}>
                    <strong>Note:</strong> Ingredient details are not available for this recipe. Please check the recipe page for complete information.
                  </div>
                )}
                
                {(!recipeDetails.steps || recipeDetails.steps.length === 0) && (
                  <div style={{
                    padding: 'var(--pad-md)',
                    marginTop: '1rem',
                    marginBottom: '1rem',
                    background: 'rgba(255, 193, 7, 0.1)',
                    border: '1px solid rgba(255, 193, 7, 0.3)',
                    borderRadius: '8px',
                    color: 'var(--text)',
                  }}>
                    <strong>Note:</strong> Cooking instructions are not available for this recipe. Please check the recipe page for step-by-step instructions.
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text)' }}>
                No recipe details available.
              </div>
            )}
              </div>
            </div>
          </div>
        </div>
      )}

      {}
      {showLastRecipeModal && lastRecipe && (
        <div 
          className="dashboard-sidebar-overlay"
          style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
          onClick={() => setShowLastRecipeModal(false)}
        >
          <div 
            className="card-wrapper"
            style={{ maxWidth: '500px', width: '90%', maxHeight: '90vh', overflow: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-background"></div>
            <div className="glass card card-mount">
              <div className="cardBody">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h2 className="cardTitle">Last Recipe</h2>
                  <button 
                    onClick={() => setShowLastRecipeModal(false)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      fontSize: '24px',
                      cursor: 'pointer',
                      color: 'var(--text)',
                      padding: '4px 8px'
                    }}
                  >
                    ✕
                  </button>
                </div>
                {lastRecipe.recipe_image_url && (
                  <div style={{ marginBottom: '16px', borderRadius: '12px', overflow: 'hidden' }}>
                    <Image
                      src={lastRecipe.recipe_image_url}
                      alt={lastRecipe.recipe_title || 'Recipe'}
                      width={500}
                      height={300}
                      style={{
                        width: '100%',
                        height: 'auto',
                        objectFit: 'cover'
                      }}
                      unoptimized
                    />
                  </div>
                )}
                <div className="cardTitle" style={{ marginBottom: '8px' }}>
                  {lastRecipe.recipe_title || 'Untitled Recipe'}
                </div>
                <div className="subtitle" style={{ marginBottom: '16px' }}>
                  {lastRecipe.recipe_prep_time && `⏱️ ${lastRecipe.recipe_prep_time} min`}
                  {lastRecipe.recipe_difficulty && ` • ⭐ ${lastRecipe.recipe_difficulty.charAt(0).toUpperCase() + lastRecipe.recipe_difficulty.slice(1)}`}
                  {lastRecipe.recipe_servings && ` • 🍽️ ${lastRecipe.recipe_servings} servings`}
                </div>
                {lastRecipe.recipe_cuisine && (
                  <div style={{ marginBottom: '8px' }}>
                    <span className="chip tap-ripple active">
                      <span className="chip-label">🌍 {lastRecipe.recipe_cuisine}</span>
                    </span>
                  </div>
                )}
                {lastRecipe.recipe_diet_tags && lastRecipe.recipe_diet_tags.length > 0 && (
                  <div style={{ marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {lastRecipe.recipe_diet_tags.map((tag, idx) => (
                      <span key={idx} className="chip tap-ripple active">
                        <span className="chip-label">{tag}</span>
                      </span>
                    ))}
                  </div>
                )}
                <div className="toolbar" style={{ marginTop: '16px' }}>
                  <button 
                    className="btn tap-ripple"
                    onClick={() => {
                      
                      router.push(`/ai-recipes?recipe=${lastRecipe.recipe_id}`);
                      setShowLastRecipeModal(false);
                    }}
                  >
                    View Recipe
                  </button>
                  <button 
                    className="btn ghost tap-ripple"
                    onClick={() => setShowLastRecipeModal(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
