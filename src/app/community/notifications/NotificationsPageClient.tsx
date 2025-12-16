'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, MessageCircle, UserPlus, Repeat2, Bell, UserCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Notification {
  id: string;
  type: string;
  actor_id: string;
  actor_username: string;
  actor_display_name: string;
  actor_avatar_url: string | null;
  post_id: string | null;
  comment_id: string | null;
  read: boolean;
  created_at: string;
  post_image_url: string | null;
  comment_content: string | null;
}

export default function NotificationsPageClient() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNotifications() {
      try {
        const res = await fetch('/api/community/notifications');
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
          
          // Mark all notifications as read when page is visited
          if (data.notifications && data.notifications.length > 0) {
            const unreadIds = data.notifications
              .filter((n: Notification) => !n.read)
              .map((n: Notification) => n.id);
            
            if (unreadIds.length > 0) {
              await fetch('/api/community/notifications/mark-read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notificationIds: unreadIds }),
              });
              
              // Update local state to mark as read
              setNotifications(prev => prev.map(n => ({ ...n, read: true })));
              
              // Trigger a custom event to notify other components
              window.dispatchEvent(new CustomEvent('notifications-read'));
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchNotifications();
  }, []);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart size={20} fill="#ef4444" color="#ef4444" />;
      case 'comment':
        return <MessageCircle size={20} />;
      case 'follow':
        return <UserPlus size={20} />;
      case 'friend_request':
        return <UserPlus size={20} />;
      case 'friend_accepted':
        return <UserCheck size={20} />;
      case 'repost':
        return <Repeat2 size={20} />;
      default:
        return <Bell size={20} />;
    }
  };

  const getNotificationText = (notification: Notification) => {
    switch (notification.type) {
      case 'like':
        return notification.post_id ? 'liked your post' : 'liked your comment';
      case 'comment':
        return 'commented on your post';
      case 'follow':
        return 'started following you';
      case 'friend_request':
        return 'sent you a friend request';
      case 'friend_accepted':
        return 'accepted your friend request';
      case 'repost':
        return 'reposted your recipe';
      default:
        return 'interacted with you';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    return date.toLocaleDateString();
  };

  const getNotificationLink = (notification: Notification) => {
    if (notification.post_id) {
      return `/community/p/${notification.post_id}`;
    }
    if (notification.actor_username) {
      return `/community/u/${notification.actor_username}`;
    }
    return '/community';
  };

  if (loading) {
    return (
      <div style={{ padding: 'var(--pad-lg)' }}>
        <div className="community-neon-card" style={{
          padding: 'var(--pad-lg)',
          borderRadius: '20px',
          background: 'rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(20px) saturate(150%)',
          WebkitBackdropFilter: 'blur(20px) saturate(150%)',
          textAlign: 'center'
        }}>
          <p className="subtitle" style={{ color: 'var(--muted)' }}>Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--pad-lg)' }}>
      <div className="community-neon-card" style={{
        padding: 'var(--pad-lg)',
        borderRadius: '20px',
        background: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(20px) saturate(150%)',
        WebkitBackdropFilter: 'blur(20px) saturate(150%)',
        marginBottom: '24px'
      }}>
        <h1 className="cardTitle" style={{ 
          fontSize: 'var(--fs-xl)', 
          marginBottom: '8px',
          color: '#67e8f9',
          textShadow: '0 0 8px rgba(103, 232, 249, 0.6)'
        }}>
          Notifications
        </h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {notifications.length === 0 ? (
          <div className="community-neon-card" style={{
            padding: 'var(--pad-lg)',
            borderRadius: '20px',
            background: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(20px) saturate(150%)',
            WebkitBackdropFilter: 'blur(20px) saturate(150%)',
            textAlign: 'center'
          }}>
            <Bell size={48} style={{ marginBottom: '16px', opacity: 0.5, color: 'var(--muted)' }} />
            <p className="subtitle" style={{ color: 'var(--muted)' }}>
              No notifications yet
            </p>
          </div>
        ) : (
          notifications.map(notification => {
            // Determine what to show based on notification type
            const isLike = notification.type === 'like';
            const isComment = notification.type === 'comment';
            const isFriendRequest = notification.type === 'friend_request' || notification.type === 'friend_accepted';
            const isFollow = notification.type === 'follow';
            const showAvatar = isFriendRequest || isFollow || isComment;
            
            return (
              <Link
                key={notification.id}
                href={getNotificationLink(notification)}
                style={{ textDecoration: 'none', display: 'block' }}
              >
                <div className={`notification-card community-neon-card ${!notification.read ? 'unread' : ''}`} style={{
                  padding: 'var(--pad-md)',
                  borderRadius: '16px',
                  background: notification.read ? 'rgba(0, 0, 0, 0.45)' : 'rgba(103, 232, 249, 0.1)',
                  backdropFilter: 'blur(20px) saturate(150%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(150%)',
                  border: notification.read ? '1px solid rgba(103, 232, 249, 0.3)' : '1px solid rgba(103, 232, 249, 0.6)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(103, 232, 249, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = notification.read ? 'rgba(0, 0, 0, 0.45)' : 'rgba(103, 232, 249, 0.1)';
                }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    {/* For likes: show post image, for friend/follow: show avatar, for others: show icon */}
                    {isLike && notification.post_image_url ? (
                      <div style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        flexShrink: 0,
                        border: '1px solid rgba(103, 232, 249, 0.3)',
                        position: 'relative'
                      }}>
                        <Image
                          src={notification.post_image_url}
                          alt="Post"
                          fill
                          style={{
                            objectFit: 'cover'
                          }}
                          unoptimized
                        />
                      </div>
                    ) : showAvatar && notification.actor_avatar_url ? (
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        flexShrink: 0,
                        border: '2px solid rgba(103, 232, 249, 0.3)',
                        position: 'relative'
                      }}>
                        <Image
                          src={notification.actor_avatar_url}
                          alt={notification.actor_display_name}
                          fill
                          style={{
                            objectFit: 'cover'
                          }}
                          unoptimized
                        />
                      </div>
                    ) : showAvatar && !notification.actor_avatar_url ? (
                      <div className="community-avatar-placeholder" style={{ 
                        width: '48px', 
                        height: '48px', 
                        fontSize: '18px',
                        flexShrink: 0,
                        border: '2px solid rgba(103, 232, 249, 0.3)'
                      }}>
                        {notification.actor_display_name?.charAt(0) || 'U'}
                      </div>
                    ) : (
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(103, 232, 249, 0.1)',
                        flexShrink: 0
                      }}>
                        {getNotificationIcon(notification.type)}
                      </div>
                    )}

                    {/* Main Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* User info and action text */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: isComment && notification.comment_content ? '8px' : '4px', flexWrap: 'wrap' }}>
                        <p className="subtitle" style={{ margin: 0, color: 'var(--text)' }}>
                          <strong style={{ color: '#67e8f9' }}>{notification.actor_display_name}</strong>{' '}
                          {getNotificationText(notification)}
                        </p>
                      </div>

                      {/* Comment text */}
                      {isComment && notification.comment_content && (
                        <div style={{
                          padding: '8px 12px',
                          background: 'rgba(103, 232, 249, 0.05)',
                          borderRadius: '8px',
                          marginBottom: '8px',
                          border: '1px solid rgba(103, 232, 249, 0.2)'
                        }}>
                          <p style={{ 
                            margin: 0, 
                            fontSize: '14px', 
                            color: 'var(--text)',
                            lineHeight: '1.4',
                            wordBreak: 'break-word'
                          }}>
                            {notification.comment_content}
                          </p>
                        </div>
                      )}

                      {/* Post image - for comments only (likes already show it on the left) */}
                      {isComment && notification.post_image_url && (
                        <div style={{
                          width: '100%',
                          maxWidth: '200px',
                          height: '120px',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          marginTop: '8px',
                          border: '1px solid rgba(103, 232, 249, 0.3)',
                          position: 'relative'
                        }}>
                          <Image
                            src={notification.post_image_url}
                            alt="Post"
                            fill
                            style={{
                              objectFit: 'cover'
                            }}
                            unoptimized
                          />
                        </div>
                      )}

                      {/* Time ago */}
                      <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '8px' }}>
                        {formatTimeAgo(notification.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}

