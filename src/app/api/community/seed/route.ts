import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { seedCommunityData } from '@/app/community/seed';

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow in development or for admins
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 });
    }

    await seedCommunityData();

    return NextResponse.json({ success: true, message: 'Community data seeded successfully' });
  } catch (error: any) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to seed data' },
      { status: 500 }
    );
  }
}

