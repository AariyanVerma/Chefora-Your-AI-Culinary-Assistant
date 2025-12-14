'use server';

import { sql } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// Validation schemas
const shoppingListSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  store: z.string().max(100).nullable().optional(),
  planned_date: z.string().nullable().optional(),
});

const shoppingItemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  quantity: z.number().min(0, 'Quantity must be non-negative').default(1),
  unit: z.string().max(20).default('pcs'),
  category: z.string().max(50).nullable().optional(),
  aisle: z.string().max(50).nullable().optional(),
  store: z.string().max(100).nullable().optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  price_est: z.number().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  pantry_item_id: z.string().uuid().nullable().optional(),
  recipe_id: z.string().nullable().optional(),
  image_url: z.string().url().nullable().optional().or(z.literal('')),
});

const bulkUpdateSchema = z.object({
  item_ids: z.array(z.string().uuid()),
  action: z.enum(['mark_purchased', 'mark_unpurchased', 'delete', 'move_to_list', 'set_category', 'set_priority']),
  value: z.string().nullable().optional(),
  target_list_id: z.string().uuid().nullable().optional(),
});

export type ShoppingList = {
  id: string;
  user_id: string;
  name: string;
  store: string | null;
  planned_date: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
  item_count?: number;
  unpurchased_count?: number;
};

export type ShoppingItem = {
  id: string;
  list_id: string;
  user_id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string | null;
  aisle: string | null;
  store: string | null;
  priority: 'low' | 'medium' | 'high';
  price_est: number | null;
  notes: string | null;
  purchased: boolean;
  pantry_item_id: string | null;
  recipe_id: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
};

// Get all shopping lists for user
export async function getShoppingLists(): Promise<ShoppingList[]> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const result = await sql<ShoppingList & { item_count: number; unpurchased_count: number }>`
    SELECT 
      sl.*,
      COUNT(si.id)::int as item_count,
      COUNT(CASE WHEN si.purchased = false THEN 1 END)::int as unpurchased_count
    FROM shopping_lists sl
    LEFT JOIN shopping_items si ON sl.id = si.list_id
    WHERE sl.user_id = ${user.id} AND sl.archived = false
    GROUP BY sl.id
    ORDER BY sl.updated_at DESC
  `;

  return result.rows.map(row => ({
    ...row,
    item_count: row.item_count || 0,
    unpurchased_count: row.unpurchased_count || 0,
  }));
}

// Get shopping list by ID
export async function getShoppingList(listId: string): Promise<ShoppingList | null> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const result = await sql<ShoppingList>`
    SELECT * FROM shopping_lists 
    WHERE id = ${listId} AND user_id = ${user.id}
    LIMIT 1
  `;

  return result.rows[0] || null;
}

// Get items for a list
export async function getShoppingItems(
  listId: string,
  filters?: {
    search?: string;
    category?: string;
    store?: string;
    priority?: string;
    purchased?: boolean;
    pantry_linked_only?: boolean;
  },
  sortBy?: string
): Promise<ShoppingItem[]> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  // Verify list belongs to user
  const listCheck = await sql<{ id: string }>`
    SELECT id FROM shopping_lists WHERE id = ${listId} AND user_id = ${user.id}
  `;
  if (listCheck.rows.length === 0) {
    return [];
  }

  // Fetch all items for the list (we'll filter in memory to avoid SQL complexity)
  const result = await sql<ShoppingItem>`
    SELECT * FROM shopping_items 
    WHERE list_id = ${listId} AND user_id = ${user.id}
    ORDER BY created_at DESC
  `;

  let filtered = result.rows;

  // Apply filters
  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter(item =>
      item.name.toLowerCase().includes(searchLower) ||
      (item.notes && item.notes.toLowerCase().includes(searchLower))
    );
  }

  if (filters?.category) {
    filtered = filtered.filter(item => item.category === filters.category);
  }

  if (filters?.store) {
    filtered = filtered.filter(item => item.store === filters.store);
  }

  if (filters?.priority) {
    filtered = filtered.filter(item => item.priority === filters.priority);
  }

  if (filters?.purchased !== undefined) {
    filtered = filtered.filter(item => item.purchased === filters.purchased);
  }

  if (filters?.pantry_linked_only) {
    filtered = filtered.filter(item => item.pantry_item_id !== null);
  }

  // Apply sorting
  if (sortBy === 'aisle') {
    filtered.sort((a, b) => {
      if (!a.aisle && !b.aisle) return a.name.localeCompare(b.name);
      if (!a.aisle) return 1;
      if (!b.aisle) return -1;
      return a.aisle.localeCompare(b.aisle) || a.name.localeCompare(b.name);
    });
  } else if (sortBy === 'priority') {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    filtered.sort((a, b) => {
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      return priorityDiff !== 0 ? priorityDiff : a.name.localeCompare(b.name);
    });
  } else if (sortBy === 'price') {
    filtered.sort((a, b) => {
      const priceA = a.price_est || 0;
      const priceB = b.price_est || 0;
      return priceB - priceA || a.name.localeCompare(b.name);
    });
  } else if (sortBy === 'name') {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    // Default: recently added
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  return filtered;
}

// Create shopping list
export async function createShoppingList(data: z.infer<typeof shoppingListSchema>): Promise<{ id: string }> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const validated = shoppingListSchema.parse(data);
  const plannedDate = validated.planned_date ? new Date(validated.planned_date) : null;

  const result = await sql<{ id: string }>`
    INSERT INTO shopping_lists (user_id, name, store, planned_date)
    VALUES (${user.id}, ${validated.name}, ${validated.store || null}, ${plannedDate ? plannedDate.toISOString().split('T')[0] : null})
    RETURNING id
  `;

  revalidatePath('/shopping-list');
  return { id: result.rows[0].id };
}

// Update shopping list
export async function updateShoppingList(
  listId: string,
  data: z.infer<typeof shoppingListSchema>
): Promise<{ success: boolean }> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  // Verify ownership
  const listCheck = await sql<{ id: string }>`
    SELECT id FROM shopping_lists WHERE id = ${listId} AND user_id = ${user.id}
  `;
  if (listCheck.rows.length === 0) {
    throw new Error('List not found');
  }

  const validated = shoppingListSchema.parse(data);
  const plannedDate = validated.planned_date ? new Date(validated.planned_date) : null;

  await sql`
    UPDATE shopping_lists
    SET name = ${validated.name},
        store = ${validated.store || null},
        planned_date = ${plannedDate ? plannedDate.toISOString().split('T')[0] : null},
        updated_at = NOW()
    WHERE id = ${listId} AND user_id = ${user.id}
  `;

  revalidatePath('/shopping-list');
  return { success: true };
}

// Delete shopping list
export async function deleteShoppingList(listId: string): Promise<{ success: boolean }> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  // Verify ownership
  const listCheck = await sql<{ id: string }>`
    SELECT id FROM shopping_lists WHERE id = ${listId} AND user_id = ${user.id}
  `;
  if (listCheck.rows.length === 0) {
    throw new Error('List not found');
  }

  await sql`DELETE FROM shopping_lists WHERE id = ${listId} AND user_id = ${user.id}`;

  revalidatePath('/shopping-list');
  return { success: true };
}

// Archive shopping list
export async function archiveShoppingList(listId: string): Promise<{ success: boolean }> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  await sql`
    UPDATE shopping_lists
    SET archived = true, updated_at = NOW()
    WHERE id = ${listId} AND user_id = ${user.id}
  `;

  revalidatePath('/shopping-list');
  return { success: true };
}

// Duplicate shopping list
export async function duplicateShoppingList(listId: string): Promise<{ id: string }> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  // Get original list
  const originalList = await sql<ShoppingList>`
    SELECT * FROM shopping_lists WHERE id = ${listId} AND user_id = ${user.id}
  `;
  if (originalList.rows.length === 0) {
    throw new Error('List not found');
  }

  const list = originalList.rows[0];

  // Create new list
  const newListResult = await sql<{ id: string }>`
    INSERT INTO shopping_lists (user_id, name, store, planned_date)
    VALUES (${user.id}, ${list.name + ' (Copy)'}, ${list.store}, ${list.planned_date})
    RETURNING id
  `;

  const newListId = newListResult.rows[0].id;

  // Copy items
  await sql`
    INSERT INTO shopping_items (list_id, user_id, name, quantity, unit, category, aisle, store, priority, price_est, notes, pantry_item_id, recipe_id, image_url)
    SELECT ${newListId}, user_id, name, quantity, unit, category, aisle, store, priority, price_est, notes, pantry_item_id, recipe_id, image_url
    FROM shopping_items
    WHERE list_id = ${listId} AND user_id = ${user.id}
  `;

  revalidatePath('/shopping-list');
  return { id: newListId };
}

// Create shopping item
export async function createShoppingItem(
  listId: string,
  data: z.infer<typeof shoppingItemSchema>
): Promise<{ id: string }> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  // Verify list ownership
  const listCheck = await sql<{ id: string }>`
    SELECT id FROM shopping_lists WHERE id = ${listId} AND user_id = ${user.id}
  `;
  if (listCheck.rows.length === 0) {
    throw new Error('List not found');
  }

  const validated = shoppingItemSchema.parse(data);
  
  // Transform image_url to null if empty string
  const imageUrl = validated.image_url && validated.image_url.trim() ? validated.image_url.trim() : null;

  const result = await sql<{ id: string }>`
    INSERT INTO shopping_items (
      list_id, user_id, name, quantity, unit, category, aisle, store, 
      priority, price_est, notes, pantry_item_id, recipe_id, image_url
    )
    VALUES (
      ${listId}, ${user.id}, ${validated.name}, ${validated.quantity}, 
      ${validated.unit}, ${validated.category || null}, ${validated.aisle || null}, 
      ${validated.store || null}, ${validated.priority}, ${validated.price_est || null}, 
      ${validated.notes || null}, ${validated.pantry_item_id || null}, 
      ${validated.recipe_id || null}, ${imageUrl}
    )
    RETURNING id
  `;

  revalidatePath('/shopping-list');
  return { id: result.rows[0].id };
}

// Update shopping item
export async function updateShoppingItem(
  itemId: string,
  data: Partial<z.infer<typeof shoppingItemSchema>> & { purchased?: boolean }
): Promise<{ success: boolean }> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  // Verify ownership
  const itemCheck = await sql<{ id: string }>`
    SELECT id FROM shopping_items WHERE id = ${itemId} AND user_id = ${user.id}
  `;
  if (itemCheck.rows.length === 0) {
    throw new Error('Item not found');
  }

  // Since @vercel/postgres doesn't support dynamic column updates easily,
  // we'll update each field that's provided. In practice, most updates will be single-field
  // (like toggling purchased), so this is acceptable.
  
  if (data.name !== undefined) {
    await sql`UPDATE shopping_items SET name = ${data.name}, updated_at = NOW() WHERE id = ${itemId} AND user_id = ${user.id}`;
  }
  if (data.quantity !== undefined) {
    await sql`UPDATE shopping_items SET quantity = ${data.quantity}, updated_at = NOW() WHERE id = ${itemId} AND user_id = ${user.id}`;
  }
  if (data.unit !== undefined) {
    await sql`UPDATE shopping_items SET unit = ${data.unit}, updated_at = NOW() WHERE id = ${itemId} AND user_id = ${user.id}`;
  }
  if (data.category !== undefined) {
    await sql`UPDATE shopping_items SET category = ${data.category || null}, updated_at = NOW() WHERE id = ${itemId} AND user_id = ${user.id}`;
  }
  if (data.aisle !== undefined) {
    await sql`UPDATE shopping_items SET aisle = ${data.aisle || null}, updated_at = NOW() WHERE id = ${itemId} AND user_id = ${user.id}`;
  }
  if (data.store !== undefined) {
    await sql`UPDATE shopping_items SET store = ${data.store || null}, updated_at = NOW() WHERE id = ${itemId} AND user_id = ${user.id}`;
  }
  if (data.priority !== undefined) {
    await sql`UPDATE shopping_items SET priority = ${data.priority}, updated_at = NOW() WHERE id = ${itemId} AND user_id = ${user.id}`;
  }
  if (data.price_est !== undefined) {
    await sql`UPDATE shopping_items SET price_est = ${data.price_est || null}, updated_at = NOW() WHERE id = ${itemId} AND user_id = ${user.id}`;
  }
  if (data.notes !== undefined) {
    await sql`UPDATE shopping_items SET notes = ${data.notes || null}, updated_at = NOW() WHERE id = ${itemId} AND user_id = ${user.id}`;
  }
  if (data.purchased !== undefined) {
    await sql`UPDATE shopping_items SET purchased = ${data.purchased}, updated_at = NOW() WHERE id = ${itemId} AND user_id = ${user.id}`;
  }
  if (data.pantry_item_id !== undefined) {
    await sql`UPDATE shopping_items SET pantry_item_id = ${data.pantry_item_id || null}, updated_at = NOW() WHERE id = ${itemId} AND user_id = ${user.id}`;
  }
  if (data.recipe_id !== undefined) {
    await sql`UPDATE shopping_items SET recipe_id = ${data.recipe_id || null}, updated_at = NOW() WHERE id = ${itemId} AND user_id = ${user.id}`;
  }
  if ('image_url' in data && data.image_url !== undefined) {
    const imageUrl = typeof data.image_url === 'string' && data.image_url.trim() ? data.image_url.trim() : null;
    await sql`UPDATE shopping_items SET image_url = ${imageUrl}, updated_at = NOW() WHERE id = ${itemId} AND user_id = ${user.id}`;
  }

  revalidatePath('/shopping-list');
  return { success: true };
}

// Delete shopping item
export async function deleteShoppingItem(itemId: string): Promise<{ success: boolean }> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  await sql`DELETE FROM shopping_items WHERE id = ${itemId} AND user_id = ${user.id}`;

  revalidatePath('/shopping-list');
  return { success: true };
}

// Bulk update shopping items
export async function bulkUpdateShoppingItems(data: z.infer<typeof bulkUpdateSchema>): Promise<{ success: boolean }> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const validated = bulkUpdateSchema.parse(data);

  // Verify all items belong to user
  const ownershipCheck = await sql<{ id: string }>`
    SELECT id FROM shopping_items 
    WHERE id = ANY(${validated.item_ids}) AND user_id = ${user.id}
  `;

  if (ownershipCheck.rows.length !== validated.item_ids.length) {
    throw new Error('Unauthorized: Some items do not belong to you');
  }

  switch (validated.action) {
    case 'mark_purchased':
      await sql`
        UPDATE shopping_items
        SET purchased = true, updated_at = NOW()
        WHERE id = ANY(${validated.item_ids}) AND user_id = ${user.id}
      `;
      break;

    case 'mark_unpurchased':
      await sql`
        UPDATE shopping_items
        SET purchased = false, updated_at = NOW()
        WHERE id = ANY(${validated.item_ids}) AND user_id = ${user.id}
      `;
      break;

    case 'delete':
      await sql`
        DELETE FROM shopping_items 
        WHERE id = ANY(${validated.item_ids}) AND user_id = ${user.id}
      `;
      break;

    case 'move_to_list':
      if (!validated.target_list_id) throw new Error('Target list ID required');
      // Verify target list ownership
      const targetListCheck = await sql<{ id: string }>`
        SELECT id FROM shopping_lists WHERE id = ${validated.target_list_id} AND user_id = ${user.id}
      `;
      if (targetListCheck.rows.length === 0) {
        throw new Error('Target list not found');
      }
      await sql`
        UPDATE shopping_items
        SET list_id = ${validated.target_list_id}, updated_at = NOW()
        WHERE id = ANY(${validated.item_ids}) AND user_id = ${user.id}
      `;
      break;

    case 'set_category':
      if (!validated.value) throw new Error('Category value required');
      await sql`
        UPDATE shopping_items
        SET category = ${validated.value}, updated_at = NOW()
        WHERE id = ANY(${validated.item_ids}) AND user_id = ${user.id}
      `;
      break;

    case 'set_priority':
      if (!validated.value || !['low', 'medium', 'high'].includes(validated.value)) {
        throw new Error('Valid priority value required');
      }
      await sql`
        UPDATE shopping_items
        SET priority = ${validated.value}, updated_at = NOW()
        WHERE id = ANY(${validated.item_ids}) AND user_id = ${user.id}
      `;
      break;
  }

  revalidatePath('/shopping-list');
  return { success: true };
}

// Get pantry items for smart suggestions
export async function getPantryLowItems(): Promise<Array<{ id: string; name: string; category: string }>> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const result = await sql<{ id: string; name: string; category: string }>`
    SELECT id, name, category
    FROM pantry_items
    WHERE user_id = ${user.id} AND is_running_low = true
    ORDER BY name ASC
    LIMIT 20
  `;

  return result.rows;
}



