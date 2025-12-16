import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET: Fetch all conversations for the current user
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const conversations = await sql`
      SELECT 
        c.id,
        c.user1_id,
        c.user2_id,
        c.created_at,
        c.updated_at,
        CASE 
          WHEN c.user1_id = ${user.id} THEN u2.id
          ELSE u1.id
        END as other_user_id,
        CASE 
          WHEN c.user1_id = ${user.id} THEN u2.name
          ELSE u1.name
        END as other_user_name,
        CASE 
          WHEN c.user1_id = ${user.id} THEN cp2.avatar_url
          ELSE cp1.avatar_url
        END as other_user_avatar,
        (
          SELECT content 
          FROM messages 
          WHERE conversation_id = c.id 
          ORDER BY created_at DESC 
          LIMIT 1
        ) as last_message,
        (
          SELECT created_at 
          FROM messages 
          WHERE conversation_id = c.id 
          ORDER BY created_at DESC 
          LIMIT 1
        ) as last_message_at,
        (
          SELECT COUNT(*) 
          FROM messages 
          WHERE conversation_id = c.id 
            AND sender_id != ${user.id} 
            AND is_read = FALSE
        ) as unread_count
      FROM conversations c
      JOIN users u1 ON c.user1_id = u1.id
      JOIN users u2 ON c.user2_id = u2.id
      LEFT JOIN community_profiles cp1 ON cp1.user_id = u1.id
      LEFT JOIN community_profiles cp2 ON cp2.user_id = u2.id
      WHERE c.user1_id = ${user.id} OR c.user2_id = ${user.id}
      ORDER BY c.updated_at DESC;
    `;

    return NextResponse.json({ conversations: conversations.rows });
  } catch (err: any) {
    console.error('Get conversations error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}

// POST: Create a new conversation or return existing one
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { otherUserId } = body;

    if (!otherUserId || otherUserId === user.id) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    // Ensure user1_id < user2_id for consistency
    const user1Id = user.id < otherUserId ? user.id : otherUserId;
    const user2Id = user.id < otherUserId ? otherUserId : user.id;

    // Check if conversation already exists
    const existing = await sql`
      SELECT id FROM conversations
      WHERE user1_id = ${user1Id} AND user2_id = ${user2Id}
      LIMIT 1;
    `;

    if (existing.rows.length > 0) {
      return NextResponse.json({ conversationId: existing.rows[0].id });
    }

    // Create new conversation
    const result = await sql`
      INSERT INTO conversations (user1_id, user2_id)
      VALUES (${user1Id}, ${user2Id})
      RETURNING id;
    `;

    return NextResponse.json({ conversationId: result.rows[0].id });
  } catch (err: any) {
    console.error('Create conversation error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to create conversation' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';


