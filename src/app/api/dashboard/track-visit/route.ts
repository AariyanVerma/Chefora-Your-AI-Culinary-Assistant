import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { sql } from '@/lib/db';

const PAGE_METADATA: Record<string, { title: string; icon: string }> = {
  '/dashboard': { title: 'Dashboard', icon: '📊' },
  '/': { title: 'Recipes', icon: '🍳' },
  '/ai-recipes': { title: 'AI Recipe Generator', icon: '🤖' },
  '/pantry': { title: 'Pantry', icon: '🥘' },
  '/shopping-list': { title: 'Shopping List', icon: '🛒' },
  '/meal-planner': { title: 'Meal Planner', icon: '📅' },
  '/community': { title: 'Community', icon: '👥' },
  '/settings': { title: 'Settings', icon: '⚙️' },
  '/messages': { title: 'Messages', icon: '💬' },
  '/notifications': { title: 'Notifications', icon: '🔔' },
  '/community/friends': { title: 'Friends', icon: '👫' },
  '/community/notifications': { title: 'Notifications', icon: '🔔' },
};

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { path } = body;

    if (!path || typeof path !== 'string') {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 });
    }

    const metadata = PAGE_METADATA[path] || { title: path, icon: '📄' };

    try {
      await sql`
        INSERT INTO dashboard_page_visits (user_id, path, title, icon, visited_at)
        VALUES (${user.id}, ${path}, ${metadata.title}, ${metadata.icon}, NOW())
      `;
    } catch (dbError: any) {
      
      if (dbError?.code === '42P01') {
        console.log('Dashboard page_visits table does not exist yet. Run migration to enable tracking.');
        return NextResponse.json({ ok: true, message: 'Table not created yet' });
      }
      throw dbError;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Track visit error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
