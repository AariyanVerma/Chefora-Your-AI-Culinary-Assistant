import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (process.env.NODE_ENV === 'production') {
      
      return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
    }

    const results = {
      posts: 0,
      comments: 0,
      post_media: 0,
      likes: 0,
      bookmarks: 0,
      reposts: 0,
    };

    const softDeletedPosts = await sql<{ id: string }>`
      SELECT id FROM community_posts WHERE deleted_at IS NOT NULL
    `;

    for (const post of softDeletedPosts.rows) {
      
      await sql`DELETE FROM community_notifications WHERE post_id = ${post.id}`;
      await sql`DELETE FROM community_likes WHERE post_id = ${post.id}`;
      await sql`DELETE FROM community_likes WHERE comment_id IN (SELECT id FROM community_comments WHERE post_id = ${post.id})`;
      await sql`DELETE FROM community_comments WHERE post_id = ${post.id}`;
      await sql`DELETE FROM community_bookmarks WHERE post_id = ${post.id}`;
      await sql`DELETE FROM community_reposts WHERE original_post_id = ${post.id}`;
      await sql`DELETE FROM community_post_media WHERE post_id = ${post.id}`;
      await sql`DELETE FROM community_recipes WHERE post_id = ${post.id}`;
      await sql`DELETE FROM community_posts WHERE id = ${post.id}`;
      results.posts++;
    }

    const softDeletedComments = await sql<{ id: string }>`
      SELECT id FROM community_comments WHERE deleted_at IS NOT NULL
    `;

    for (const comment of softDeletedComments.rows) {
      await sql`DELETE FROM community_notifications WHERE comment_id = ${comment.id}`;
      await sql`DELETE FROM community_likes WHERE comment_id = ${comment.id}`;
      await sql`DELETE FROM community_comments WHERE parent_comment_id = ${comment.id}`;
      await sql`DELETE FROM community_comments WHERE id = ${comment.id}`;
      results.comments++;
    }

    return NextResponse.json({ 
      success: true,
      deleted: results,
      message: `Cleaned up ${results.posts} posts and ${results.comments} comments`
    });
  } catch (error: any) {
    console.error('Error cleaning up soft-deleted records:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
