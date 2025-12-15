'use server';

import { sql } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// Validation schemas
const pantryItemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  quantity: z.number().min(0, 'Quantity must be non-negative'),
  unit: z.string().max(20),
  category: z.string().max(50),
  location: z.string().max(50),
  expiry_date: z.string().nullable().optional(),
  purchase_date: z.string().nullable().optional(),
  is_opened: z.boolean().default(false),
  notes: z.string().max(1000).nullable().optional(),
  price: z.union([
    z.string().max(50),
    z.number()
  ]).nullable().optional().transform((val) => {
    if (!val) return null;
    // If it's already a number, return it
    if (typeof val === 'number') return val;
    // Remove currency symbols and whitespace, keep only numbers and decimal point
    const cleaned = val.replace(/[^\d.-]/g, '').trim();
    if (!cleaned) return null;
    // Convert to number, return null if invalid
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }),
  brand: z.string().max(100).nullable().optional(),
  is_running_low: z.boolean().default(false),
  image_url: z.string().url().nullable().optional().or(z.literal('')),
});

const bulkUpdateSchema = z.object({
  item_ids: z.array(z.string().uuid()),
  action: z.enum(['delete', 'move_location', 'set_category', 'toggle_opened', 'add_expiry_days']),
  value: z.string().nullable().optional(),
});

export type PantryItem = {
  id: string;
  user_id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  location: string;
  expiry_date: string | null;
  purchase_date: string | null;
  is_opened: boolean;
  notes: string | null;
  price: string | null;
  brand: string | null;
  is_running_low: boolean;
  snooze_until: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
};

export type PantryStats = {
  total_items: number;
  expiring_1_3_days: number;
  expiring_7_days: number;
  expired: number;
  health_score: number;
};

// Helper to verify ownership
async function verifyOwnership(itemId: string, userId: string): Promise<boolean> {
  const result = await sql<{ user_id: string }>`
    SELECT user_id FROM pantry_items WHERE id = ${itemId} AND user_id = ${userId}
  `;
  return result.rows.length > 0;
}

// Helper to auto-fetch product image from Google
async function fetchProductImage(productName: string): Promise<string | null> {
  try {
    const GOOGLE_SEARCH_KEY = process.env.GOOGLE_SEARCH_KEY;
    const GOOGLE_SEARCH_CX = process.env.GOOGLE_SEARCH_CX;
    
    if (!GOOGLE_SEARCH_KEY || !GOOGLE_SEARCH_CX) {
      console.warn('Google Custom Search API keys not configured');
      return null;
    }
    
    const query = String(productName || "").trim();
    if (!query) return null;
    
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
          return bestItem.link;
        }
        
        // If no high-scoring item, try any item with non-negative score
        const neutralItem = scoredItems.find(item => item.score >= 0 && item.link && item.link.startsWith('http'));
        if (neutralItem) {
          return neutralItem.link;
        }
        
        // If still nothing, try the first valid URL that doesn't contain recipe keywords
        for (const item of items) {
          const link = item?.link;
          if (link && typeof link === 'string' && link.startsWith('http')) {
            // Quick check: skip if URL clearly indicates a recipe
            const linkLower = link.toLowerCase();
            if (!recipeKeywords.some(keyword => linkLower.includes(keyword))) {
              return link;
            }
          }
        }
        
        // Last resort: return the first valid image even if it might be a recipe
        // Better to have some image than no image
        for (const item of items) {
          const link = item?.link;
          if (link && typeof link === 'string' && link.startsWith('http')) {
            return link;
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
            return link;
          }
        }
      }
    } catch (fallbackError) {
      console.error('Fallback image search failed:', fallbackError);
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching product image from Google:', error);
    return null;
  }
}

// Get pantry stats
export async function getPantryStats(): Promise<PantryStats> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [totalRes, expiring1_3Res, expiring7Res, expiredRes] = await Promise.all([
    sql<{ count: number }>`
      SELECT COUNT(*)::int as count FROM pantry_items WHERE user_id = ${user.id}
    `,
    sql<{ count: number }>`
      SELECT COUNT(*)::int as count 
      FROM pantry_items 
      WHERE user_id = ${user.id} 
        AND expiry_date IS NOT NULL 
        AND expiry_date > ${now.toISOString().split('T')[0]}
        AND expiry_date <= ${threeDaysFromNow.toISOString().split('T')[0]}
        AND (snooze_until IS NULL OR snooze_until < NOW())
    `,
    sql<{ count: number }>`
      SELECT COUNT(*)::int as count 
      FROM pantry_items 
      WHERE user_id = ${user.id} 
        AND expiry_date IS NOT NULL 
        AND expiry_date > ${now.toISOString().split('T')[0]}
        AND expiry_date <= ${sevenDaysFromNow.toISOString().split('T')[0]}
        AND (snooze_until IS NULL OR snooze_until < NOW())
    `,
    sql<{ count: number }>`
      SELECT COUNT(*)::int as count 
      FROM pantry_items 
      WHERE user_id = ${user.id} 
        AND expiry_date IS NOT NULL 
        AND expiry_date < ${now.toISOString().split('T')[0]}
    `,
  ]);

  const total = totalRes.rows[0]?.count || 0;
  const expiring1_3 = expiring1_3Res.rows[0]?.count || 0;
  const expiring7 = expiring7Res.rows[0]?.count || 0;
  const expired = expiredRes.rows[0]?.count || 0;

  // Health score: 100 - (expired * 10) - (expiring_1_3 * 5) - (expiring_7 * 2)
  const healthScore = Math.max(0, Math.min(100, 100 - (expired * 10) - (expiring1_3 * 5) - (expiring7 * 2)));

  return {
    total_items: total,
    expiring_1_3_days: expiring1_3,
    expiring_7_days: expiring7,
    expired,
    health_score: healthScore,
  };
}

// Get pantry items with filters
export async function getPantryItems(params: {
  search?: string;
  category?: string;
  location?: string;
  expiry_status?: string;
  opened_only?: boolean;
  sort_by?: string;
  page?: number;
  limit?: number;
}): Promise<PantryItem[]> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const {
    search = '',
    category,
    location,
    expiry_status,
    opened_only = false,
    sort_by = 'expiry_soonest',
    page = 1,
    limit = 50,
  } = params;

  const offset = (page - 1) * limit;
  const now = new Date();
  const nowDateStr = now.toISOString().split('T')[0];
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const threeDaysDateStr = threeDaysFromNow.toISOString().split('T')[0];
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const sevenDaysDateStr = sevenDaysFromNow.toISOString().split('T')[0];

  // Build query using a workaround for @vercel/postgres conditional fragment limitations
  // Fetch all items for user first, then filter in memory
  // This is not ideal for large datasets but works reliably
  const searchPattern = search ? `%${search}%` : '';

  // Fetch all items for user (with a reasonable limit to avoid memory issues)
  // We'll filter and sort in memory to avoid SQL parameter issues
  const fetchLimit = 1000; // Reasonable limit for in-memory filtering
  const query = sql<PantryItem>`
    SELECT * FROM pantry_items 
    WHERE user_id = ${user.id}
    ORDER BY created_at DESC
    LIMIT ${fetchLimit}
  `;
  
  const result = await query;
  let filtered = result.rows;

  console.log('getPantryItems - Initial items count:', filtered.length);
  console.log('getPantryItems - Filters applied:', {
    search,
    category,
    location,
    expiry_status,
    opened_only,
    sort_by
  });

  // Apply search filter
  if (search) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter(item => 
      item.name.toLowerCase().includes(searchLower) ||
      (item.brand && item.brand.toLowerCase().includes(searchLower)) ||
      (item.notes && item.notes.toLowerCase().includes(searchLower))
    );
  }

  // Apply category filter
  if (category) {
    filtered = filtered.filter(item => item.category === category);
  }

  // Apply location filter
  if (location) {
    filtered = filtered.filter(item => item.location === location);
  }

  // Apply opened filter
  if (opened_only) {
    filtered = filtered.filter(item => item.is_opened);
  }

  // Apply expiry status filter
  if (expiry_status === 'expired') {
    filtered = filtered.filter(item => item.expiry_date && new Date(item.expiry_date) < new Date(nowDateStr));
  } else if (expiry_status === 'expiring_soon') {
    filtered = filtered.filter(item => {
      if (!item.expiry_date) return false;
      const expDate = new Date(item.expiry_date);
      const now = new Date(nowDateStr);
      const threeDays = new Date(threeDaysDateStr);
      return expDate > now && expDate <= threeDays && (!item.snooze_until || new Date(item.snooze_until) < new Date());
    });
  } else if (expiry_status === 'expiring_week') {
    filtered = filtered.filter(item => {
      if (!item.expiry_date) return false;
      const expDate = new Date(item.expiry_date);
      const now = new Date(nowDateStr);
      const sevenDays = new Date(sevenDaysDateStr);
      return expDate > now && expDate <= sevenDays && (!item.snooze_until || new Date(item.snooze_until) < new Date());
    });
  } else if (expiry_status === 'no_expiry') {
    filtered = filtered.filter(item => !item.expiry_date);
  }

  // Apply sorting
  if (sort_by === 'expiry_soonest' && expiry_status !== 'no_expiry') {
    filtered.sort((a, b) => {
      if (!a.expiry_date && !b.expiry_date) return a.name.localeCompare(b.name);
      if (!a.expiry_date) return 1;
      if (!b.expiry_date) return -1;
      const dateA = new Date(a.expiry_date).getTime();
      const dateB = new Date(b.expiry_date).getTime();
      if (dateA !== dateB) return dateA - dateB;
      return a.name.localeCompare(b.name);
    });
  } else if (sort_by === 'name_az' || (sort_by === 'expiry_soonest' && expiry_status === 'no_expiry')) {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sort_by === 'recent') {
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } else if (sort_by === 'quantity_desc') {
    filtered.sort((a, b) => Number(b.quantity) - Number(a.quantity));
  }

  // Apply pagination
  const paginated = filtered.slice(offset, offset + limit);
  console.log('getPantryItems - Filtered items count:', filtered.length);
  console.log('getPantryItems - Returning items count:', paginated.length);
  return paginated;
}

// Create pantry item
export async function createPantryItem(data: z.infer<typeof pantryItemSchema>) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const validated = pantryItemSchema.parse(data);

  // Auto-fetch image if not provided
  let imageUrl = validated.image_url || null;
  if (!imageUrl && validated.name) {
    try {
      imageUrl = await fetchProductImage(validated.name);
    } catch (error) {
      console.error('Failed to fetch product image:', error);
      // Continue without image if fetch fails
    }
  }

  await sql`
    INSERT INTO pantry_items (
      user_id, name, quantity, unit, category, location,
      expiry_date, purchase_date, is_opened, notes, price, brand, is_running_low, image_url
    ) VALUES (
      ${user.id},
      ${validated.name},
      ${validated.quantity},
      ${validated.unit},
      ${validated.category},
      ${validated.location},
      ${validated.expiry_date || null},
      ${validated.purchase_date || null},
      ${validated.is_opened},
      ${validated.notes || null},
      ${validated.price || null},
      ${validated.brand || null},
      ${validated.is_running_low},
      ${imageUrl || null}
    )
  `;

  revalidatePath('/pantry');
  return { success: true };
}

// Update pantry item
export async function updatePantryItem(
  itemId: string,
  data: z.infer<typeof pantryItemSchema>
) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  if (!(await verifyOwnership(itemId, user.id))) {
    throw new Error('Unauthorized');
  }

  const validated = pantryItemSchema.parse(data);

  // Auto-fetch image if not provided and name changed
  let imageUrl = validated.image_url || null;
  if (!imageUrl && validated.name) {
    // Check if we need to fetch a new image (only if name changed or no existing image)
    const existing = await sql<{ image_url: string | null }>`
      SELECT image_url FROM pantry_items WHERE id = ${itemId} AND user_id = ${user.id}
    `;
    if (!existing.rows[0]?.image_url) {
      try {
        imageUrl = await fetchProductImage(validated.name);
      } catch (error) {
        console.error('Failed to fetch product image:', error);
      }
    }
  }

  await sql`
    UPDATE pantry_items
    SET 
      name = ${validated.name},
      quantity = ${validated.quantity},
      unit = ${validated.unit},
      category = ${validated.category},
      location = ${validated.location},
      expiry_date = ${validated.expiry_date || null},
      purchase_date = ${validated.purchase_date || null},
      is_opened = ${validated.is_opened},
      notes = ${validated.notes || null},
      price = ${validated.price || null},
      brand = ${validated.brand || null},
      is_running_low = ${validated.is_running_low},
      image_url = ${imageUrl || null},
      updated_at = NOW()
    WHERE id = ${itemId} AND user_id = ${user.id}
  `;

  revalidatePath('/pantry');
  return { success: true };
}

// Delete pantry item
export async function deletePantryItem(itemId: string) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  if (!(await verifyOwnership(itemId, user.id))) {
    throw new Error('Unauthorized');
  }

  await sql`DELETE FROM pantry_items WHERE id = ${itemId} AND user_id = ${user.id}`;

  revalidatePath('/pantry');
  return { success: true };
}

// Bulk actions
export async function bulkUpdatePantryItems(data: z.infer<typeof bulkUpdateSchema>) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const validated = bulkUpdateSchema.parse(data);

  // Verify all items belong to user
  const ownershipCheck = await sql<{ id: string }>`
    SELECT id FROM pantry_items 
    WHERE id = ANY(${validated.item_ids}) AND user_id = ${user.id}
  `;

  if (ownershipCheck.rows.length !== validated.item_ids.length) {
    throw new Error('Unauthorized: Some items do not belong to you');
  }

  switch (validated.action) {
    case 'delete':
      await sql`
        DELETE FROM pantry_items 
        WHERE id = ANY(${validated.item_ids}) AND user_id = ${user.id}
      `;
      break;

    case 'move_location':
      if (!validated.value) throw new Error('Location value required');
      await sql`
        UPDATE pantry_items
        SET location = ${validated.value}, updated_at = NOW()
        WHERE id = ANY(${validated.item_ids}) AND user_id = ${user.id}
      `;
      break;

    case 'set_category':
      if (!validated.value) throw new Error('Category value required');
      await sql`
        UPDATE pantry_items
        SET category = ${validated.value}, updated_at = NOW()
        WHERE id = ANY(${validated.item_ids}) AND user_id = ${user.id}
      `;
      break;

    case 'toggle_opened':
      await sql`
        UPDATE pantry_items
        SET is_opened = NOT is_opened, updated_at = NOW()
        WHERE id = ANY(${validated.item_ids}) AND user_id = ${user.id}
      `;
      break;

    case 'add_expiry_days':
      await sql`
        UPDATE pantry_items
        SET expiry_date = expiry_date + INTERVAL '3 days', updated_at = NOW()
        WHERE id = ANY(${validated.item_ids}) 
          AND user_id = ${user.id}
          AND expiry_date IS NOT NULL
      `;
      break;
  }

  revalidatePath('/pantry');
  return { success: true };
}

// Snooze expiry reminder
export async function snoozeExpiryReminder(itemId: string, hours: number = 24) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  if (!(await verifyOwnership(itemId, user.id))) {
    throw new Error('Unauthorized');
  }

  const snoozeUntil = new Date(Date.now() + hours * 60 * 60 * 1000);

  await sql`
    UPDATE pantry_items
    SET snooze_until = ${snoozeUntil.toISOString()}, updated_at = NOW()
    WHERE id = ${itemId} AND user_id = ${user.id}
  `;

  revalidatePath('/pantry');
  return { success: true };
}

// Add to shopping list
export async function addToShoppingList(itemId: string, listId?: string) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  if (!(await verifyOwnership(itemId, user.id))) {
    throw new Error('Unauthorized');
  }

  const item = await sql<PantryItem>`
    SELECT * FROM pantry_items WHERE id = ${itemId} AND user_id = ${user.id}
  `;

  if (item.rows.length === 0) {
    throw new Error('Item not found');
  }

  const pantryItem = item.rows[0];

  // Get or create a default shopping list
  let targetListId = listId;
  if (!targetListId) {
    // Get the most recently updated non-archived list, or create a new one
    const existingList = await sql<{ id: string }>`
      SELECT id FROM shopping_lists 
      WHERE user_id = ${user.id} AND archived = false 
      ORDER BY updated_at DESC 
      LIMIT 1
    `;
    
    if (existingList.rows.length > 0) {
      targetListId = existingList.rows[0].id;
    } else {
      // Create a new default list
      const newList = await sql<{ id: string }>`
        INSERT INTO shopping_lists (user_id, name, store, planned_date, archived)
        VALUES (${user.id}, 'Shopping List', null, null, false)
        RETURNING id
      `;
      targetListId = newList.rows[0].id;
    }
  }

  // Check if item already exists in this list (by pantry_item_id)
  const existing = await sql<{ id: string }>`
    SELECT id FROM shopping_items 
    WHERE list_id = ${targetListId} 
      AND user_id = ${user.id} 
      AND pantry_item_id = ${itemId}
      AND purchased = false
    LIMIT 1
  `;

  if (existing.rows.length > 0) {
    // Item already in list, don't duplicate
    return { success: true, message: 'Item already in shopping list' };
  }

  // Convert price string to number if it exists
  let priceEst: number | null = null;
  if (pantryItem.price) {
    const priceNum = typeof pantryItem.price === 'string' 
      ? parseFloat(pantryItem.price.replace(/[^\d.-]/g, '')) 
      : pantryItem.price;
    priceEst = isNaN(priceNum) ? null : priceNum;
  }

  // Insert into shopping_items with pantry_item_id link
  await sql`
    INSERT INTO shopping_items (
      list_id, user_id, name, quantity, unit, category, 
      notes, pantry_item_id, image_url, price_est
    )
    VALUES (
      ${targetListId},
      ${user.id},
      ${pantryItem.name},
      ${pantryItem.quantity},
      ${pantryItem.unit},
      ${pantryItem.category || null},
      ${pantryItem.notes || null},
      ${itemId},
      ${pantryItem.image_url || null},
      ${priceEst}
    )
  `;

  // Update shopping list updated_at timestamp
  await sql`
    UPDATE shopping_lists
    SET updated_at = NOW()
    WHERE id = ${targetListId} AND user_id = ${user.id}
  `;

  revalidatePath('/pantry');
  revalidatePath('/shopping-list');
  return { success: true, listId: targetListId };
}

// Fetch and update image for existing item
export async function fetchItemImage(itemId: string): Promise<{ success: boolean; image_url?: string; error?: string }> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  if (!(await verifyOwnership(itemId, user.id))) {
    throw new Error('Unauthorized');
  }

  const item = await sql<{ name: string; image_url: string | null }>`
    SELECT name, image_url FROM pantry_items WHERE id = ${itemId} AND user_id = ${user.id}
  `;

  if (item.rows.length === 0) {
    return { success: false, error: 'Item not found' };
  }

  const pantryItem = item.rows[0];
  
  // If item already has an image, return it
  if (pantryItem.image_url) {
    return { success: true, image_url: pantryItem.image_url };
  }

  // Fetch new image
  try {
    const imageUrl = await fetchProductImage(pantryItem.name);
    
    if (imageUrl) {
      await sql`
        UPDATE pantry_items
        SET image_url = ${imageUrl}, updated_at = NOW()
        WHERE id = ${itemId} AND user_id = ${user.id}
      `;
      revalidatePath('/pantry');
      return { success: true, image_url: imageUrl };
    } else {
      return { success: false, error: 'Could not find an image for this product' };
    }
  } catch (error: any) {
    console.error('Error fetching item image:', error);
    return { success: false, error: error.message || 'Failed to fetch image' };
  }
}

// Export to CSV
export async function exportPantryItemsToCSV(itemIds?: string[]): Promise<string> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  let query;
  if (itemIds && itemIds.length > 0) {
    query = sql<PantryItem>`
      SELECT * FROM pantry_items 
      WHERE user_id = ${user.id} AND id = ANY(${itemIds})
      ORDER BY name ASC
    `;
  } else {
    query = sql<PantryItem>`
      SELECT * FROM pantry_items 
      WHERE user_id = ${user.id}
      ORDER BY name ASC
    `;
  }

  const result = await query;
  const items = result.rows;

  // Generate CSV
  const headers = ['Name', 'Quantity', 'Unit', 'Category', 'Location', 'Expiry Date', 'Purchase Date', 'Opened', 'Brand', 'Notes'];
  const rows = items.map(item => [
    item.name,
    item.quantity.toString(),
    item.unit,
    item.category,
    item.location,
    item.expiry_date || '',
    item.purchase_date || '',
    item.is_opened ? 'Yes' : 'No',
    item.brand || '',
    item.notes || '',
  ]);

  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  return csv;
}

