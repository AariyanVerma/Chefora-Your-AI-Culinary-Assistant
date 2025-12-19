import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all pantry items (excluding expired)
    const now = new Date();
    const nowDateStr = now.toISOString().split('T')[0];

    // Fetch ONLY non-expired pantry items, sorted by expiry (soonest first)
    const pantryItemsRes = await sql<{
      name: string;
      expiry_date: string | null;
    }>`
      SELECT name, expiry_date
      FROM pantry_items
      WHERE user_id = ${user.id}
      AND (expiry_date IS NULL OR expiry_date >= ${nowDateStr})  -- Only non-expired items
      ORDER BY 
        CASE 
          WHEN expiry_date IS NULL THEN 999
          ELSE EXTRACT(EPOCH FROM (expiry_date::date - CURRENT_DATE))
        END ASC
      LIMIT 100
    `;

    const nowDateOnly = new Date(now);
    nowDateOnly.setHours(0, 0, 0, 0);

    const pantryIngredients = pantryItemsRes.rows.map(item => {
      let daysUntilExpiry: number;
      if (!item.expiry_date) {
        daysUntilExpiry = 999; // Items without expiry get a high number
      } else {
        const expiryDate = new Date(item.expiry_date);
        expiryDate.setHours(0, 0, 0, 0);
        // Calculate days until expiry (0 = today, negative = expired)
        daysUntilExpiry = Math.floor((expiryDate.getTime() - nowDateOnly.getTime()) / (1000 * 60 * 60 * 24));
      }
      return {
        name: item.name,
        expiry_date: item.expiry_date || '',
        daysUntilExpiry: daysUntilExpiry,
      };
    }).filter(ing => ing.daysUntilExpiry >= 0); // Double-check: NEVER include expired items

    return NextResponse.json({ ingredients: pantryIngredients });
  } catch (error: any) {
    console.error('Error fetching pantry ingredients:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}




