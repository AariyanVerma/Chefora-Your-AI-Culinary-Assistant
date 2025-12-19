import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const recipeTitle = searchParams.get('title');

    if (!recipeTitle) {
      return NextResponse.json({ error: 'Recipe title is required' }, { status: 400 });
    }

    const GOOGLE_SEARCH_KEY = process.env.GOOGLE_SEARCH_KEY;
    const GOOGLE_SEARCH_CX = process.env.GOOGLE_SEARCH_CX;
    
    if (!GOOGLE_SEARCH_KEY || !GOOGLE_SEARCH_CX) {
      // Return null instead of error - we'll use fallback
      return NextResponse.json({ image_url: null });
    }

    const query = String(recipeTitle || "").trim();
    if (!query) {
      return NextResponse.json({ image_url: null });
    }

    try {
      // Search for recipe/dish images
      const params = new URLSearchParams({
        q: `${query} recipe dish food`,
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
        next: { revalidate: 3600 } // Cache for 1 hour
      });
      
      if (response.ok) {
        const data = await response.json();
        const items = data?.items || [];
        
        // Return the first valid image URL
        for (const item of items) {
          const link = item?.link;
          if (link && typeof link === 'string' && link.startsWith('http')) {
            return NextResponse.json({ image_url: link });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching recipe image from Google:', error);
    }
    
    return NextResponse.json({ image_url: null });
  } catch (error: any) {
    console.error('Error in fetch-recipe-image:', error);
    return NextResponse.json({ image_url: null });
  }
}




