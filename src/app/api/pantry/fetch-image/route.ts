import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productName = searchParams.get('name');

    if (!productName) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
    }

    // Try to use backend API first if available
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
    try {
      const backendResponse = await fetch(`${API_BASE}/api/ingredients/autocomplete?q=${encodeURIComponent(productName)}`, {
        signal: AbortSignal.timeout(3000), // 3 second timeout
      });
      
      if (backendResponse.ok) {
        const backendData = await backendResponse.json();
        // Check if backend returned image data
        if (backendData && backendData.length > 0 && backendData[0]?.imageUrl) {
          return NextResponse.json({ image_url: backendData[0].imageUrl });
        }
      }
    } catch (backendError) {
      // Backend not available or doesn't have image, continue to direct Google API
      console.log('Backend image fetch not available, using direct Google API');
    }

    // Direct Google Custom Search API
    const GOOGLE_SEARCH_KEY = process.env.GOOGLE_SEARCH_KEY;
    const GOOGLE_SEARCH_CX = process.env.GOOGLE_SEARCH_CX;
    
    if (!GOOGLE_SEARCH_KEY || !GOOGLE_SEARCH_CX) {
      return NextResponse.json(
        { error: 'Google Custom Search API keys not configured. Please set GOOGLE_SEARCH_KEY and GOOGLE_SEARCH_CX in your .env.local file (copy from chefora-backend/.env).' },
        { status: 500 }
      );
    }
    
    const query = String(productName || "").trim();
    if (!query) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
    }
    
    // Build a more specific query to get product images, not recipe images
    // Exclude common recipe/dish terms and focus on the raw/fresh product
    const searchTerms = [
      `${query} fresh product`,
      `${query} raw ingredient`,
      `${query} whole food product`,
      `${query} package product`,
      `${query} grocery store product`
    ];
    
    // Try multiple search strategies to find the best product image
    for (const searchQuery of searchTerms) {
      try {
        const params = new URLSearchParams({
          q: `${searchQuery} -recipe -dish -pizza -pasta -salad -soup -cooked -prepared`,
          searchType: "image",
          num: "10", // Get more results to filter through
          key: GOOGLE_SEARCH_KEY,
          cx: GOOGLE_SEARCH_CX,
          safe: "active",
          imgSize: "large",
          imgType: "photo",
        });
        
        const url = `https://www.googleapis.com/customsearch/v1?${params.toString()}`;
        const response = await fetch(url, {
          next: { revalidate: 3600 } // Cache for 1 hour
        });
        
        if (!response.ok) {
          continue; // Try next search term
        }
        
        const data = await response.json();
        const items = data?.items || [];
        
        if (!items.length) {
          continue; // Try next search term
        }
        
        // Filter results to prefer product images over recipe images
        // Check image context and URL for product-related keywords
        const productKeywords = ['fresh', 'raw', 'whole', 'package', 'grocery', 'store', 'ingredient', 'produce', 'organic'];
        const recipeKeywords = ['recipe', 'dish', 'pizza', 'pasta', 'salad', 'soup', 'cooked', 'prepared', 'meal', 'foodie'];
        
        // Score each image based on context
        const scoredItems = items.map((item: any) => {
          const link = item?.link || '';
          const title = (item?.title || '').toLowerCase();
          const snippet = (item?.snippet || '').toLowerCase();
          const context = `${title} ${snippet} ${link}`.toLowerCase();
          
          let score = 0;
          
          // Positive points for product-related terms
          productKeywords.forEach(keyword => {
            if (context.includes(keyword)) score += 2;
          });
          
          // Negative points for recipe-related terms
          recipeKeywords.forEach(keyword => {
            if (context.includes(keyword)) score -= 3;
          });
          
          return { item, score, link };
        });
        
        // Sort by score (highest first)
        scoredItems.sort((a, b) => b.score - a.score);
        
        // First, try to find a high-scoring item (score > 0)
        const bestItem = scoredItems.find(item => item.score > 0 && item.link && item.link.startsWith('http'));
        if (bestItem) {
          return NextResponse.json({ image_url: bestItem.link });
        }
        
        // If no high-scoring item, try any item with non-negative score
        const neutralItem = scoredItems.find(item => item.score >= 0 && item.link && item.link.startsWith('http'));
        if (neutralItem) {
          return NextResponse.json({ image_url: neutralItem.link });
        }
        
        // If still nothing, try the first valid URL that doesn't contain recipe keywords
        for (const item of items) {
          const link = item?.link;
          if (link && typeof link === 'string' && link.startsWith('http')) {
            // Quick check: skip if URL clearly indicates a recipe
            const linkLower = link.toLowerCase();
            if (!recipeKeywords.some(keyword => linkLower.includes(keyword))) {
              return NextResponse.json({ image_url: link });
            }
          }
        }
        
        // Last resort: return the first valid image even if it might be a recipe
        // Better to have some image than no image
        for (const item of items) {
          const link = item?.link;
          if (link && typeof link === 'string' && link.startsWith('http')) {
            return NextResponse.json({ image_url: link });
          }
        }
        
      } catch (error) {
        // Continue to next search term if this one fails
        continue;
      }
    }
    
    // If all search terms failed, try a simpler search as last resort
    try {
      const params = new URLSearchParams({
        q: `${query} product`,
        searchType: "image",
        num: "5",
        key: GOOGLE_SEARCH_KEY,
        cx: GOOGLE_SEARCH_CX,
        safe: "active",
        imgSize: "large",
        imgType: "photo",
      });
      
      const url = `https://www.googleapis.com/customsearch/v1?${params.toString()}`;
      const response = await fetch(url, {
        next: { revalidate: 3600 }
      });
      
      if (response.ok) {
        const data = await response.json();
        const items = data?.items || [];
        
        // Return the first valid image URL as last resort
        for (const item of items) {
          const link = item?.link;
          if (link && typeof link === 'string' && link.startsWith('http')) {
            return NextResponse.json({ image_url: link });
          }
        }
      }
    } catch (fallbackError) {
      console.error('Fallback image search failed:', fallbackError);
    }
    
    return NextResponse.json(
      { error: 'No valid product images found for this item' },
      { status: 404 }
    );
  } catch (error: any) {
    console.error('Error fetching product image:', error);
    return NextResponse.json(
      { error: `Failed to fetch image: ${error.message}` },
      { status: 500 }
    );
  }
}

