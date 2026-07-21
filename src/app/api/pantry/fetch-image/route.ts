import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productName = searchParams.get('name');
    const quantity = searchParams.get('quantity');
    const unit = searchParams.get('unit');
    const category = searchParams.get('category');
    const store = searchParams.get('store');
    const skipParam = searchParams.get('skip');
    const skip = skipParam ? parseInt(skipParam, 10) : 0;

    if (!productName) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
    }

    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
    try {
      const backendResponse = await fetch(`${API_BASE}/api/ingredients/autocomplete?q=${encodeURIComponent(productName)}`, {
        signal: AbortSignal.timeout(3000), 
      });
      
      if (backendResponse.ok) {
        const backendData = await backendResponse.json();
        
        if (backendData && backendData.length > 0 && backendData[0]?.imageUrl) {
          return NextResponse.json({ image_url: backendData[0].imageUrl });
        }
      }
    } catch (backendError) {
      
      console.log('Backend image fetch not available, using direct Google API');
    }

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
    
    const queryParts: string[] = [query];
    
    if (quantity && unit) {
      queryParts.push(`${quantity} ${unit}`);
    } else if (unit) {
      queryParts.push(unit);
    }
    
    if (store && store !== 'Other') {
      queryParts.push(store);
    }
    
    if (category) {
      queryParts.push(category);
    }
    
    const baseQuery = queryParts.join(' ');
    
    const searchTerms: string[] = [];
    
    searchTerms.push(`${baseQuery} product image`);
    searchTerms.push(`${baseQuery} grocery product`);
    
    if (store && store !== 'Other') {
      searchTerms.push(`${query}${quantity && unit ? ` ${quantity} ${unit}` : ''} ${store} product`);
    }
    
    if (category) {
      searchTerms.push(`${query}${quantity && unit ? ` ${quantity} ${unit}` : ''} ${category} product`);
    }
    
    searchTerms.push(`${query}${quantity && unit ? ` ${quantity} ${unit}` : ''} fresh product`);
    searchTerms.push(`${query}${quantity && unit ? ` ${quantity} ${unit}` : ''} raw ingredient`);
    searchTerms.push(`${query} whole food product`);
    searchTerms.push(`${query} package product`);
    searchTerms.push(`${query} grocery store product`);
    
    for (const searchQuery of searchTerms) {
      try {
        const params = new URLSearchParams({
          q: `${searchQuery} -recipe -dish -pizza -pasta -salad -soup -cooked -prepared`,
          searchType: "image",
          num: "10", 
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
        
        if (!response.ok) {
          continue; 
        }
        
        const data = await response.json();
        const items = data?.items || [];
        
        if (!items.length) {
          continue; 
        }
        
        const productKeywords = ['fresh', 'raw', 'whole', 'package', 'grocery', 'store', 'ingredient', 'produce', 'organic'];
        const recipeKeywords = ['recipe', 'dish', 'pizza', 'pasta', 'salad', 'soup', 'cooked', 'prepared', 'meal', 'foodie'];
        
        interface ScoredItem {
          item: any;
          score: number;
          link: string;
        }
        
        const scoredItems: ScoredItem[] = items.map((item: any) => {
          const link = item?.link || '';
          const title = (item?.title || '').toLowerCase();
          const snippet = (item?.snippet || '').toLowerCase();
          const context = `${title} ${snippet} ${link}`.toLowerCase();
          
          let score = 0;
          
          productKeywords.forEach(keyword => {
            if (context.includes(keyword)) score += 2;
          });
          
          if (store && store !== 'Other') {
            const storeLower = store.toLowerCase();
            if (context.includes(storeLower)) score += 5;
            
            const storeDomains: Record<string, string[]> = {
              'walmart': ['walmart', 'walmart.com'],
              'target': ['target', 'target.com'],
              'costco': ['costco', 'costco.com'],
              'whole foods': ['wholefoods', 'wholefoodsmarket'],
              'kroger': ['kroger', 'kroger.com'],
              'safeway': ['safeway', 'safeway.com'],
              'trader joe\'s': ['traderjoes', 'traderjoes.com'],
              'aldi': ['aldi', 'aldi.com'],
            };
            const storeVariations = storeDomains[storeLower] || [storeLower];
            storeVariations.forEach(variation => {
              if (context.includes(variation)) score += 5;
            });
          }
          
          if (category) {
            const categoryLower = category.toLowerCase();
            if (context.includes(categoryLower)) score += 3;
          }
          
          if (unit) {
            const unitLower = unit.toLowerCase();
            if (context.includes(unitLower)) score += 2;
          }
          
          recipeKeywords.forEach(keyword => {
            if (context.includes(keyword)) score -= 3;
          });
          
          return { item, score, link };
        });
        
        scoredItems.sort((a, b) => b.score - a.score);
        
        const validItems = scoredItems.filter(item => item.link && item.link.startsWith('http'));
        
        if (validItems.length === 0) {
          continue; 
        }
        
        const selectedIndex = Math.min(skip, validItems.length - 1);
        const selectedItem = validItems[selectedIndex];
        
        if (selectedItem && selectedItem.link) {
          return NextResponse.json({ image_url: selectedItem.link });
        }
        
        const bestItem = scoredItems.find(item => item.score > 0 && item.link && item.link.startsWith('http'));
        if (bestItem && bestItem.link) {
          return NextResponse.json({ image_url: bestItem.link });
        }
        
        const neutralItem = scoredItems.find(item => item.score >= 0 && item.link && item.link.startsWith('http'));
        if (neutralItem && neutralItem.link) {
          return NextResponse.json({ image_url: neutralItem.link });
        }
        
        for (const item of items) {
          const link = item?.link;
          if (link && typeof link === 'string' && link.startsWith('http')) {
            
            const linkLower = link.toLowerCase();
            if (!recipeKeywords.some((keyword: string) => linkLower.includes(keyword))) {
              return NextResponse.json({ image_url: link });
            }
          }
        }
        
        for (const item of items) {
          const link = item?.link;
          if (link && typeof link === 'string' && link.startsWith('http')) {
            return NextResponse.json({ image_url: link });
          }
        }
        
      } catch (error) {
        
        continue;
      }
    }
    
    try {
      const fallbackQuery = store && store !== 'Other' 
        ? `${query}${quantity && unit ? ` ${quantity} ${unit}` : ''} ${store} product`
        : category
        ? `${query}${quantity && unit ? ` ${quantity} ${unit}` : ''} ${category} product`
        : `${query} product`;
      
      const params = new URLSearchParams({
        q: fallbackQuery,
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
