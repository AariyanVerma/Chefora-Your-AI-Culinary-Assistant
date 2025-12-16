import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    // Create conversations table
    await sql`
      CREATE TABLE IF NOT EXISTS conversations (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user1_id, user2_id),
        CHECK(user1_id < user2_id)
      );
    `;

    // Create messages table
    await sql`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // Create indexes for better performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_conversations_user1_id ON conversations(user1_id);
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_conversations_user2_id ON conversations(user2_id);
    `;

    return NextResponse.json({ ok: true, message: 'Messages tables created successfully' });
  } catch (err: any) {
    console.error('Messages migration error:', err);
    return NextResponse.json(
      { ok: false, error: err?.message || 'Migration failed' },
      { status: 500 }
    );
  }
}

