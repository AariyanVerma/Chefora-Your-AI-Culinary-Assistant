'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/app/components/DashboardLayout';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, MessageCircle, UserPlus, Repeat2, Bell } from 'lucide-react';

export default function NotificationsPage() {
  const [notifications] = useState<any[]>([]); 

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart size={20} />;
      case 'comment':
        return <MessageCircle size={20} />;
      case 'follow':
        return <UserPlus size={20} />;
      case 'repost':
        return <Repeat2 size={20} />;
      default:
        return <Bell size={20} />;
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

  return (
    <DashboardLayout>
      <div className="notifications-page">
        <div className="notifications-header">
          <h1 className="cardTitle" style={{ fontSize: 'var(--fs-xl)', marginBottom: '8px' }}>
            Notifications
          </h1>
        </div>

        <div className="notifications-list">
          {notifications.length === 0 ? (
            <div className="community-neon-card" style={{
              padding: 'var(--pad-lg)',
              borderRadius: '20px',
              background: 'rgba(0, 0, 0, 0.45)',
              backdropFilter: 'blur(20px) saturate(150%)',
              WebkitBackdropFilter: 'blur(20px) saturate(150%)',
              textAlign: 'center'
            }}>
              <Bell size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
              <p className="subtitle" style={{ color: 'var(--muted)' }}>
                No notifications yet
              </p>
            </div>
          ) : (
            notifications.map(notification => (
              <Link
                key={notification.id}
                href={
                  notification.post_id
                    ? `/community/p/${notification.post_id}`
                    : notification.actor_id
                    ? `/u/${notification.actor_username}`
                    : '#'
                }
                style={{ textDecoration: 'none', display: 'block', marginBottom: '12px' }}
              >
                <div className={`notification-card community-neon-card ${!notification.read ? 'unread' : ''}`} style={{
                  padding: 'var(--pad-md)',
                  borderRadius: '16px',
                  background: 'rgba(0, 0, 0, 0.45)',
                  backdropFilter: 'blur(20px) saturate(150%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(150%)'
                }}>
                  <div className="notification-content">
                    <div className="notification-icon">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="notification-avatar">
                      {notification.actor_avatar_url ? (
                        <Image
                          src={notification.actor_avatar_url}
                          alt={notification.actor_name}
                          width={40}
                          height={40}
                          className="community-avatar-img"
                          unoptimized
                        />
                      ) : (
                        <div className="community-avatar-placeholder">
                          {notification.actor_name?.charAt(0) || 'U'}
                        </div>
                      )}
                    </div>
                    <div className="notification-text">
                      <p className="subtitle">
                        <strong>{notification.actor_name}</strong>{' '}
                        {notification.type === 'like' && 'liked your post'}
                        {notification.type === 'comment' && 'commented on your post'}
                        {notification.type === 'follow' && 'started following you'}
                        {notification.type === 'repost' && 'reposted your recipe'}
                      </p>
                      <div className="notification-time">{formatTimeAgo(notification.created_at)}</div>
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
