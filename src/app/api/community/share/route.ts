import { NextRequest, NextResponse } from 'next/server';
import { sharePost } from '@/app/community/actions';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { postId, friendId } = body;

    if (!postId || !friendId) {
      return NextResponse.json({ error: 'postId and friendId are required' }, { status: 400 });
    }

    const result = await sharePost(postId, friendId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Share error:', error);
    return NextResponse.json({ error: error.message || 'Failed to share post' }, { status: 500 });
  }
}
