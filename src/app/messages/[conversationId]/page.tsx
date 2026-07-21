'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/app/components/DashboardLayout';
import Image from 'next/image';
import { Send, ArrowLeft } from 'lucide-react';

interface Message {
  id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender_name: string;
  sender_avatar: string | null;
}

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params.conversationId as string;
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef<boolean>(true);
  const userScrolledUpRef = useRef<boolean>(false);
  const lastMessageIdsRef = useRef<Set<string>>(new Set());
  const pendingMessagesRef = useRef<Set<string>>(new Set());
  const isMountedRef = useRef(true);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(res => res.json()),
      fetch('/api/community/profile').then(res => res.json()).catch(() => ({ avatar_url: null }))
    ]).then(([userData, profileData]) => {
      if (userData.user) {
        setCurrentUserId(userData.user.id);
        setCurrentUserName(userData.user.name || 'You');
        setCurrentUserAvatar(profileData.avatar_url || null);
      }
    });
  }, []);

  const fetchMessages = async () => {
    if (!conversationId || !isMountedRef.current || isFetchingRef.current) return;
    
    isFetchingRef.current = true;
    try {
      const res = await fetch(`/api/messages/messages?conversationId=${conversationId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      });

      if (!res) return;

      if (!res.ok) {
        try {
          const errorData = await res.json();
          if (res.status !== 401 && res.status !== 403) {
            console.error('Failed to fetch messages:', res.status, errorData);
          }
        } catch {
          
        }
        return;
      }
      
      const data = await res.json().catch(() => null);
      if (!data || !data.messages) return;
      
      const serverMessages: Message[] = data.messages || [];
      
      setMessages(prev => {
        const optimisticMessages = prev.filter(m => 
          pendingMessagesRef.current.has(m.id) &&
          !serverMessages.some(serverMsg => 
            serverMsg.content === m.content && 
            serverMsg.sender_id === m.sender_id &&
            Math.abs(new Date(serverMsg.created_at).getTime() - new Date(m.created_at).getTime()) < 5000
          )
        );
        
        const combined = [...serverMessages];
        optimisticMessages.forEach(optMsg => {
          combined.push(optMsg);
        });
        
        serverMessages.forEach(serverMsg => {
          pendingMessagesRef.current.forEach(pendingId => {
            const pendingMsg = prev.find(m => m.id === pendingId);
            if (pendingMsg && 
                pendingMsg.content === serverMsg.content && 
                pendingMsg.sender_id === serverMsg.sender_id &&
                Math.abs(new Date(serverMsg.created_at).getTime() - new Date(pendingMsg.created_at).getTime()) < 5000) {
              pendingMessagesRef.current.delete(pendingId);
            }
          });
        });
        
        return combined.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      });
    } catch (err) {
      
      if (err instanceof Error && err.message.includes('fetch')) {
        return;
      }
      console.error('Error fetching messages:', err);
    } finally {
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    if (!conversationId) return;
    
    fetchMessages();
    
    const interval = setInterval(fetchMessages, 2000);
    
    return () => {
      clearInterval(interval);
      isMountedRef.current = false;
    };
  }, [conversationId]);

  const checkIfNearBottom = () => {
    const container = messagesContainerRef.current;
    if (!container) return false;
    const threshold = 100;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    return distanceFromBottom < threshold;
  };

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const isNearBottom = checkIfNearBottom();
      shouldAutoScrollRef.current = isNearBottom;
      if (!isNearBottom) {
        userScrolledUpRef.current = true;
      } else {
        userScrolledUpRef.current = false;
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (messages.length === 0) {
      lastMessageIdsRef.current = new Set();
      return;
    }

    const currentMessageIds = new Set(messages.map(m => m.id));
    const isInitialLoad = lastMessageIdsRef.current.size === 0;
    const hasNewMessages = isInitialLoad || Array.from(currentMessageIds).some(id => !lastMessageIdsRef.current.has(id));
    
    lastMessageIdsRef.current = currentMessageIds;

    if (hasNewMessages && shouldAutoScrollRef.current && !userScrolledUpRef.current) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUserId) return;

    const messageContent = newMessage.trim();
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    
    const optimisticMessage: Message = {
      id: tempId,
      sender_id: currentUserId,
      content: messageContent,
      is_read: false,
      created_at: new Date().toISOString(),
      sender_name: currentUserName,
      sender_avatar: currentUserAvatar,
    };

    pendingMessagesRef.current.add(tempId);
    shouldAutoScrollRef.current = true;
    userScrolledUpRef.current = false;

    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage('');

    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    });

    try {
      console.log('[Client] Sending message:', { conversationId, contentLength: messageContent.length });
      const res = await fetch('/api/messages/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          content: messageContent,
        }),
        cache: 'no-store',
      });

      console.log('[Client] Response status:', res.status, res.ok);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('[Client] Error response:', errorData);
        throw new Error(errorData.error || `Failed to send message (${res.status})`);
      }

      const responseData = await res.json();
      console.log('[Client] Success response:', responseData);
      if (responseData.messageId || responseData.success) {
        pendingMessagesRef.current.delete(tempId);
        
        setTimeout(() => {
          if (!isFetchingRef.current) {
            fetchMessages();
          }
        }, 500);
      } else {
        throw new Error('Unexpected response format');
      }
    } catch (err: any) {
      console.error('[Client] Error sending message:', err);
      setMessages(prev => prev.filter(m => m.id !== tempId));
      pendingMessagesRef.current.delete(tempId);
      setNewMessage(messageContent);
      alert(err.message || 'Failed to send message. Please try again.');
    }
  };

  const formatTime = (dateString: string) => {
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

  const isImageUrl = (text: string) => {
    return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(text) || text.startsWith('data:image');
  };

  const renderMessageContent = (content: string) => {
    if (isImageUrl(content)) {
      return (
        <Image
          src={content}
          alt="Message attachment"
          width={300}
          height={300}
          style={{
            maxWidth: '300px',
            maxHeight: '300px',
            width: 'auto',
            height: 'auto',
            objectFit: 'contain',
            borderRadius: '12px',
          }}
        />
      );
    }
    return <span>{content}</span>;
  };

  if (loading && messages.length === 0) {
    return (
      <DashboardLayout>
        <div style={{ padding: 'var(--pad-lg)' }}>
          <div className="community-neon-card" style={{ padding: 'var(--pad-lg)', textAlign: 'center' }}>
            <p className="subtitle" style={{ color: 'var(--muted)' }}>Loading messages...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const otherUser = messages.find(m => m.sender_id !== currentUserId);
  const otherUserName = otherUser?.sender_name || 'Unknown User';
  const otherUserAvatar = otherUser?.sender_avatar;

  return (
    <DashboardLayout>
      <div style={{ padding: 'var(--pad-lg)' }}>
        <div className="chat-header" style={{ marginBottom: '16px' }}>
          <button
            onClick={() => router.push('/messages')}
            className="btn ghost"
            style={{ marginRight: '16px' }}
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="cardTitle" style={{ 
            fontSize: 'var(--fs-xl)',
            color: '#67e8f9',
            textShadow: '0 0 10px rgba(103, 232, 249, 0.5), 0 0 20px rgba(103, 232, 249, 0.3)'
          }}>
            Chat
          </h1>
        </div>

        <div className="chat-container">
          <div 
            ref={messagesContainerRef}
            className="chat-messages"
          >
            {messages.length === 0 ? (
              <div className="chat-empty">
                <p className="subtitle" style={{ color: 'var(--muted)' }}>
                  No messages yet. Start the conversation!
                </p>
              </div>
            ) : (
              messages.map((message) => {
                const isOwn = message.sender_id === currentUserId;
                return (
                  <div
                    key={message.id}
                    className={`chat-message ${isOwn ? 'chat-message-own' : 'chat-message-other'}`}
                  >
                    {!isOwn && (
                      <div className="chat-message-avatar">
                        {message.sender_avatar ? (
                          <Image
                            src={message.sender_avatar}
                            alt={message.sender_name}
                            width={40}
                            height={40}
                            style={{ borderRadius: '50%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            background: 'rgba(103, 232, 249, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#67e8f9',
                            fontWeight: 600,
                            fontSize: '16px'
                          }}>
                            {message.sender_name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="chat-message-content">
                      {!isOwn && (
                        <div className="chat-message-sender">{message.sender_name}</div>
                      )}
                      <div className="chat-message-bubble">
                        {renderMessageContent(message.content)}
                      </div>
                      <div className="chat-message-time">{formatTime(message.created_at)}</div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="chat-input-form">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1px solid rgba(103, 232, 249, 0.3)',
                background: 'rgba(0, 0, 0, 0.4)',
                color: 'var(--text)',
                fontSize: 'var(--fs-md)',
              }}
            />
            <button
              type="submit"
              className="btn"
              style={{
                padding: '12px 20px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, var(--accent) 0%, rgba(147, 197, 253, 0.8) 100%)',
                border: 'none',
                color: '#0b1220',
                fontWeight: 600,
              }}
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
