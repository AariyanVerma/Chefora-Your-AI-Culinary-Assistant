import { NextResponse } from 'next/server';
import { getFriends } from '@/app/community/actions';

export async function GET() {
  try {
    const friends = await getFriends();
    return NextResponse.json(friends);
  } catch (error) {
    console.error('Failed to get friends:', error);
    return NextResponse.json({ error: 'Failed to get friends' }, { status: 500 });
  }
}
