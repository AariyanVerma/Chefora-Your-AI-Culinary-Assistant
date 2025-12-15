import { NextResponse } from 'next/server';
import { createPost } from '@/app/community/actions';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await createPost(body);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Test create error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create post' },
      { status: 500 }
    );
  }
}
