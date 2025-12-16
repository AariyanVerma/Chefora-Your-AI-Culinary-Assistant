'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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

interface MessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MessagesModal({ isOpen, onClose }: MessagesModalProps) {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/messages/conversations', {
        cache: 'no-store',
      });
      
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchConversations();
      // Poll every 3 seconds for conversations in modal
      const interval = setInterval(fetchConversations, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

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

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(10px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '60px 20px 20px 20px',
      }}
      onClick={onClose}
    >
      <div
        className="community-neon-card messages-modal-content"
        style={{
          maxWidth: '600px',
          width: '100%',
          maxHeight: '80vh',
          overflow: 'auto',
          padding: 'var(--pad-lg)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 className="cardTitle" style={{ fontSize: 'var(--fs-xl)' }}>Messages</h2>
          <button
            onClick={onClose}
            className="btn ghost"
            style={{ padding: '8px' }}
          >
            ✕
          </button>
        </div>

        {loading ? (
          <p className="subtitle" style={{ color: 'var(--muted)', textAlign: 'center', padding: '20px' }}>
            Loading conversations...
          </p>
        ) : conversations.length === 0 ? (
          <p className="subtitle" style={{ color: 'var(--muted)', textAlign: 'center', padding: '20px' }}>
            No conversations yet. Start chatting with other users!
          </p>
        ) : (
          <div>
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className="messages-conversation-item"
                style={{ marginBottom: '8px', cursor: 'pointer' }}
                onClick={() => {
                  router.push(`/messages/${conv.id}`);
                  onClose();
                }}
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

