import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productName = searchParams.get('name');
    const quantity = searchParams.get('quantity') || '1';
    const unit = searchParams.get('unit') || '';
    const store = searchParams.get('store') || '';
    const category = searchParams.get('category') || '';

    if (!productName) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
    }

    const GOOGLE_SEARCH_KEY = process.env.GOOGLE_SEARCH_KEY;
    const GOOGLE_SEARCH_CX = process.env.GOOGLE_SEARCH_CX;
    
    if (!GOOGLE_SEARCH_KEY || !GOOGLE_SEARCH_CX) {
      return NextResponse.json(
        { error: 'Google Search API keys not configured. Please set GOOGLE_SEARCH_KEY and GOOGLE_SEARCH_CX in your .env.local file.' },
        { status: 500 }
      );
    }

    try {
      // Build search query for product price lookup
      // Try multiple query variations to find the best price match
      const queryVariations = [
        `${productName}${store ? ` ${store}` : ''}${unit ? ` ${quantity} ${unit}` : ''} price`,
        `${productName}${unit ? ` ${quantity} ${unit}` : ''} buy online price${store ? ` ${store}` : ''}`,
        `${productName}${category ? ` ${category}` : ''} price${store ? ` ${store}` : ''}`,
      ];

      const prices: number[] = [];
      const allItems: any[] = [];

      // Try each query variation
      for (const searchQuery of queryVariations) {
        try {
          const params = new URLSearchParams({
            q: searchQuery,
            num: '10',
            key: GOOGLE_SEARCH_KEY,
            cx: GOOGLE_SEARCH_CX,
            safe: 'active',
          });

          const url = `https://www.googleapis.com/customsearch/v1?${params.toString()}`;
          const response = await fetch(url, {
            signal: AbortSignal.timeout(5000), // 5 second timeout
            next: { revalidate: 1800 } // Cache for 30 minutes
          });

          if (response.ok) {
            const data = await response.json();
            if (data?.items) {
              allItems.push(...data.items);
            }
          }
        } catch (queryError) {
          // Continue to next query variation
          console.log(`Query "${searchQuery}" failed, trying next variation`);
        }
      }

      // Extract prices from all collected results
      const pricePattern = /\$[\d,]+(?:\.\d{2})?/g;
      const priceRegex = /\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g;

      allItems.forEach((item: any) => {
        const text = `${item.title || ''} ${item.snippet || ''} ${item.displayLink || ''}`.toLowerCase();
        
        // Skip if this looks like a recipe or unrelated content
        if (text.includes('recipe') || text.includes('how to') || text.includes('cooking')) {
          return;
        }

        // Try to find prices in the text
        const matches = [...text.matchAll(priceRegex)];
        
        matches.forEach((match) => {
          const priceStr = match[1].replace(/,/g, '');
          const numericValue = parseFloat(priceStr);
          
          // Filter reasonable price ranges (between $0.01 and $1000)
          if (!isNaN(numericValue) && numericValue >= 0.01 && numericValue <= 1000) {
            // Additional validation: check if context suggests this is a product price
            const context = text.substring(Math.max(0, match.index! - 20), Math.min(text.length, match.index! + 20));
            const priceKeywords = ['price', 'cost', '$', 'buy', 'purchase', 'add to cart', 'order'];
            
            if (priceKeywords.some(keyword => context.includes(keyword))) {
              prices.push(numericValue);
            }
          }
        });
      });

      // If we found prices, return the median (more robust than average)
      if (prices.length > 0) {
        // Remove outliers using IQR method
        const sortedPrices = [...prices].sort((a, b) => a - b);
        const q1 = sortedPrices[Math.floor(sortedPrices.length * 0.25)];
        const q3 = sortedPrices[Math.floor(sortedPrices.length * 0.75)];
        const iqr = q3 - q1;
        const lowerBound = q1 - 1.5 * iqr;
        const upperBound = q3 + 1.5 * iqr;
        
        const filteredPrices = sortedPrices.filter(p => p >= lowerBound && p <= upperBound);
        
        if (filteredPrices.length > 0) {
          const medianPrice = filteredPrices[Math.floor(filteredPrices.length / 2)];
          
          return NextResponse.json({ 
            price: Math.round(medianPrice * 100) / 100, // Round to 2 decimal places
            source: 'google_search',
            confidence: filteredPrices.length >= 5 ? 'high' : filteredPrices.length >= 2 ? 'medium' : 'low',
            priceRange: {
              min: Math.min(...filteredPrices),
              max: Math.max(...filteredPrices)
            }
          });
        }
      }

      // No prices found
      return NextResponse.json(
        { error: 'Could not find price information for this product. Please enter a price manually.' },
        { status: 404 }
      );

    } catch (error: any) {
      console.error('Error fetching price:', error);
      return NextResponse.json(
        { error: `Failed to fetch price: ${error.message}` },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('Error in fetch-price route:', error);
    return NextResponse.json(
      { error: `Failed to fetch price: ${error.message}` },
      { status: 500 }
    );
  }
}
