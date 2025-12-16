import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET: Fetch messages for a conversation
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });
    }

    // Verify user is part of this conversation
    const conversation = await sql`
      SELECT id FROM conversations
      WHERE id = ${conversationId}
        AND (user1_id = ${user.id} OR user2_id = ${user.id})
      LIMIT 1;
    `;

    if (conversation.rows.length === 0) {
      return NextResponse.json({ error: 'Conversation not found or access denied' }, { status: 403 });
    }

    // Fetch messages
    const messages = await sql`
      SELECT 
        m.id,
        m.sender_id,
        m.content,
        m.is_read,
        m.created_at,
        u.name as sender_name,
        cp.avatar_url as sender_avatar
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      LEFT JOIN community_profiles cp ON cp.user_id = u.id
      WHERE m.conversation_id = ${conversationId}
      ORDER BY m.created_at ASC;
    `;

    // Mark messages as read (only messages sent by the other user)
    await sql`
      UPDATE messages
      SET is_read = TRUE
      WHERE conversation_id = ${conversationId}
        AND sender_id != ${user.id}
        AND is_read = FALSE;
    `;

    // Update conversation updated_at
    await sql`
      UPDATE conversations
      SET updated_at = NOW()
      WHERE id = ${conversationId};
    `;

    return NextResponse.json({ messages: messages.rows });
  } catch (err: any) {
    console.error('Get messages error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// POST: Send a new message
export async function POST(req: Request) {
  console.log('[POST /api/messages/messages] Request received');
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.log('[POST /api/messages/messages] Unauthorized - no user');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[POST /api/messages/messages] User authenticated:', user.id);
    const body = await req.json();
    const { conversationId, content } = body;

    console.log('[POST /api/messages/messages] Body:', { conversationId, contentLength: content?.length });

    if (!conversationId || !content || !content.trim()) {
      console.log('[POST /api/messages/messages] Validation failed');
      return NextResponse.json(
        { error: 'conversationId and content are required' },
        { status: 400 }
      );
    }

    // Verify user is part of this conversation
    console.log('[POST /api/messages/messages] Verifying conversation access');
    const conversation = await sql`
      SELECT id FROM conversations
      WHERE id = ${conversationId}
        AND (user1_id = ${user.id} OR user2_id = ${user.id})
      LIMIT 1;
    `;

    if (conversation.rows.length === 0) {
      console.log('[POST /api/messages/messages] Conversation not found or access denied');
      return NextResponse.json({ error: 'Conversation not found or access denied' }, { status: 403 });
    }

    // Sanitize content (basic XSS prevention)
    const sanitizedContent = content.trim().slice(0, 5000); // Max 5000 characters

    console.log('[POST /api/messages/messages] Inserting message into database');
    // Insert message
    let result;
    try {
      result = await sql`
        INSERT INTO messages (conversation_id, sender_id, content)
        VALUES (${conversationId}, ${user.id}, ${sanitizedContent})
        RETURNING id, created_at;
      `;
      console.log('[POST /api/messages/messages] Message inserted successfully:', result.rows[0]?.id);
    } catch (dbError: any) {
      console.error('[POST /api/messages/messages] Database error:', dbError);
      if (dbError?.code === '42P01' || dbError?.message?.includes('does not exist')) {
        return NextResponse.json(
          { error: 'Messages table not found. Please run /api/messages/migrate' },
          { status: 500 }
        );
      }
      throw dbError;
    }

    // Update conversation updated_at
    try {
      await sql`
        UPDATE conversations
        SET updated_at = NOW()
        WHERE id = ${conversationId};
      `;
    } catch (updateError) {
      console.error('[POST /api/messages/messages] Error updating conversation timestamp (non-fatal):', updateError);
    }

    console.log('[POST /api/messages/messages] Success');
    return NextResponse.json({
      messageId: result.rows[0].id,
      createdAt: result.rows[0].created_at,
      success: true,
    });
  } catch (err: any) {
    console.error('[POST /api/messages/messages] Error:', err);
    console.error('[POST /api/messages/messages] Error details:', {
      message: err?.message,
      code: err?.code,
      detail: err?.detail,
    });
    return NextResponse.json(
      { error: err?.message || 'Failed to send message', details: err?.detail || err?.code },
      { status: 500 }
    );
  }
}

