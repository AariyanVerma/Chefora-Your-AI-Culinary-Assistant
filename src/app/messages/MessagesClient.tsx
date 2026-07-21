'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

interface Conversation {
  id: string;
  other_user_id: string;
  other_user_name: string;
  other_user_avatar: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
}

export default function MessagesClient() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/messages/conversations', {
        cache: 'no-store',
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          setError('Please log in to view messages');
          return;
        }
        throw new Error('Failed to fetch conversations');
      }

      const data = await res.json();
      setConversations(data.conversations || []);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching conversations:', err);
      if (err.message !== 'Failed to fetch') {
        setError(err.message || 'Failed to load conversations');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    
    const interval = setInterval(fetchConversations, 3000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="messages-page">
        <div className="community-neon-card" style={{ padding: 'var(--pad-lg)', textAlign: 'center' }}>
          <p className="subtitle" style={{ color: 'var(--muted)' }}>Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="messages-page">
      <h1 className="cardTitle" style={{ 
        fontSize: 'var(--fs-xl)', 
        marginBottom: '8px',
        color: '#67e8f9',
        textShadow: '0 0 10px rgba(103, 232, 249, 0.5), 0 0 20px rgba(103, 232, 249, 0.3)'
      }}>
        Messages
      </h1>

      {error && (
        <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.5)', borderRadius: '12px', marginBottom: '16px', color: '#ef4444' }}>
          <p style={{ fontWeight: 600, marginBottom: '8px' }}>Error loading conversations:</p>
          <p>{error}</p>
          {error.includes('Unauthorized') && (
            <p style={{ marginTop: '8px', fontSize: '12px' }}>Please ensure you are logged in.</p>
          )}
          {error.includes('Failed to fetch') && (
            <p style={{ marginTop: '8px', fontSize: '12px' }}>
              This might be a network issue or the database tables are not set up.
              Try running the <a href="/api/messages/migrate" target="_blank" rel="noopener noreferrer" style={{ color: '#67e8f9', textDecoration: 'underline' }}>migration</a>.
            </p>
          )}
        </div>
      )}

      <div className="messages-layout">
        <div className="community-neon-card" style={{ padding: 'var(--pad-md)' }}>
          <h2 className="cardTitle" style={{ 
            fontSize: 'var(--fs-md)',
            color: '#67e8f9',
            textShadow: '0 0 8px rgba(103, 232, 249, 0.6)'
          }}>Conversations</h2>
          
          {conversations.length === 0 ? (
            <p className="subtitle" style={{ color: 'var(--muted)', marginTop: '16px' }}>
              No conversations yet. Start chatting with other users!
            </p>
          ) : (
            <div style={{ marginTop: '16px' }}>
              {conversations.map((conv) => (
                <Link 
                  key={conv.id} 
                  href={`/messages/${conv.id}`}
                  className="messages-conversation-item"
                >
                  <div style={{ position: 'relative' }}>
                    {conv.other_user_avatar ? (
                      <Image
                        src={conv.other_user_avatar}
                        alt={conv.other_user_name}
                        width={48}
                        height={48}
                        style={{ borderRadius: '50%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        background: 'rgba(103, 232, 249, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#67e8f9',
                        fontWeight: 600,
                        fontSize: '18px'
                      }}>
                        {conv.other_user_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {conv.unread_count > 0 && (
                      <span className="messages-unread-badge">
                        {conv.unread_count > 99 ? '99+' : conv.unread_count}
                      </span>
                    )}
                  </div>
                  <div className="messages-conversation-info">
                    <div className="messages-conversation-name">{conv.other_user_name}</div>
                    <div className="messages-conversation-preview">
                      {conv.last_message || 'No messages yet'}
                    </div>
                  </div>
                  {conv.last_message_at && (
                    <div className="messages-conversation-time">
                      {formatTime(conv.last_message_at)}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="messages-main">
          <div className="community-neon-card" style={{ padding: 'var(--pad-lg)', textAlign: 'center', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div>
              <p className="subtitle" style={{ color: 'var(--muted)' }}>
                Select a conversation to start chatting
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
