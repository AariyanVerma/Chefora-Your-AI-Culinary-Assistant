'use client';

import React, { useState } from 'react';
import DashboardLayout from '@/app/components/DashboardLayout';
import Link from 'next/link';
import Image from 'next/image';
import { MessageCircle, Plus } from 'lucide-react';

export default function MessagesPage() {
  const [conversations] = useState<any[]>([]); // Would fetch from API

  return (
    <DashboardLayout>
      <div className="messages-page">
        <div className="messages-header">
          <h1 className="cardTitle" style={{ fontSize: 'var(--fs-xl)', marginBottom: '8px' }}>
            Messages
          </h1>
          <p className="subtitle" style={{ color: 'var(--muted)', marginBottom: '16px' }}>
            Connect with other chefs
          </p>
        </div>

        <div className="messages-layout">
          <div className="messages-sidebar">
            <div className="community-neon-card" style={{
              padding: 'var(--pad-md)',
              borderRadius: '16px',
              background: 'rgba(0, 0, 0, 0.45)',
              backdropFilter: 'blur(20px) saturate(150%)',
              WebkitBackdropFilter: 'blur(20px) saturate(150%)'
            }}>
              <div className="messages-sidebar-header">
                <h2 className="cardTitle" style={{ fontSize: 'var(--fs-md)' }}>Conversations</h2>
                <button className="btn ghost tap-ripple" aria-label="New message">
                  <Plus size={16} />
                </button>
              </div>
              {conversations.length === 0 ? (
                <div className="messages-empty">
                  <p className="subtitle" style={{ color: 'var(--muted)', textAlign: 'center', padding: '24px' }}>
                    No conversations yet. Start a new one!
                  </p>
                </div>
              ) : (
                <div className="messages-list">
                  {conversations.map(conv => (
                    <Link key={conv.id} href={`/messages/${conv.id}`}>
                      <div className="messages-conversation-item">
                        <div className="community-avatar">
                          {conv.avatar_url ? (
                            <Image
                              src={conv.avatar_url}
                              alt={conv.name}
                              width={40}
                              height={40}
                              className="community-avatar-img"
                              unoptimized
                            />
                          ) : (
                            <div className="community-avatar-placeholder">
                              {conv.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="messages-conversation-info">
                          <div className="messages-conversation-name">{conv.name}</div>
                          <div className="messages-conversation-preview">{conv.lastMessage}</div>
                        </div>
                        <div className="messages-conversation-time">{conv.time}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="messages-main">
            <div className="community-neon-card" style={{
              padding: 'var(--pad-lg)',
              borderRadius: '20px',
              background: 'rgba(0, 0, 0, 0.45)',
              backdropFilter: 'blur(20px) saturate(150%)',
              WebkitBackdropFilter: 'blur(20px) saturate(150%)',
              textAlign: 'center'
            }}>
              <MessageCircle size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
              <p className="subtitle" style={{ color: 'var(--muted)' }}>
                Select a conversation to start messaging
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

