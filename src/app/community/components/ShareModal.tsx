'use client';

import React, { useState, useEffect } from 'react';
import { X, Search, User } from 'lucide-react';
import Image from 'next/image';

interface Friend {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

interface ShareModalProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
  onShareSuccess: () => void;
}

export default function ShareModal({ postId, isOpen, onClose, onShareSuccess }: ShareModalProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [filteredFriends, setFilteredFriends] = useState<Friend[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadFriends();
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      setFilteredFriends(
        friends.filter(
          friend =>
            friend.display_name.toLowerCase().includes(query) ||
            friend.username.toLowerCase().includes(query)
        )
      );
    } else {
      setFilteredFriends(friends);
    }
  }, [searchQuery, friends]);

  const loadFriends = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/community/friends');
      if (response.ok) {
        const data = await response.json();
        setFriends(data.friends || []);
        setFilteredFriends(data.friends || []);
      }
    } catch (error) {
      console.error('Failed to load friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!selectedFriend || sharing) return;

    setSharing(true);
    try {
      const response = await fetch('/api/community/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, friendId: selectedFriend }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to share post');
      }

      onShareSuccess();
      onClose();
      setSelectedFriend(null);
      setSearchQuery('');
    } catch (error: any) {
      console.error('Failed to share:', error);
      alert(error.message || 'Failed to share post. Please try again.');
    } finally {
      setSharing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="share-modal-overlay" style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div className="community-neon-card" style={{ 
        maxWidth: '500px', 
        width: '100%', 
        maxHeight: '80vh',
        padding: 'var(--pad-lg)',
        borderRadius: '20px',
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(20px) saturate(150%)',
        WebkitBackdropFilter: 'blur(20px) saturate(150%)'
      }}>
            {}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 className="cardTitle" style={{ fontSize: 'var(--fs-lg)' }}>Share Post</h2>
              <button
                onClick={onClose}
                className="btn ghost tap-ripple"
                style={{ padding: '4px 8px', minWidth: 'auto' }}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {}
            <div style={{ marginBottom: '20px', position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input"
                placeholder="Search friends..."
                style={{ paddingLeft: '40px' }}
              />
            </div>

            {}
            <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '20px' }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                  Loading friends...
                </div>
              ) : filteredFriends.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                  {searchQuery ? 'No friends found' : 'No friends yet'}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {filteredFriends.map(friend => (
                    <button
                      key={friend.id}
                      onClick={() => setSelectedFriend(friend.id)}
                      className={`community-friend-item ${selectedFriend === friend.id ? 'selected' : ''}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px',
                        borderRadius: '8px',
                        border: selectedFriend === friend.id ? '2px solid var(--accent)' : '1px solid var(--border)',
                        background: selectedFriend === friend.id ? 'rgba(103, 232, 249, 0.1)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        width: '100%',
                        textAlign: 'left'
                      }}
                    >
                      {friend.avatar_url ? (
                        <Image
                          src={friend.avatar_url}
                          alt={friend.display_name}
                          width={40}
                          height={40}
                          className="community-avatar-img"
                          style={{ borderRadius: '50%' }}
                          unoptimized
                        />
                      ) : (
                        <div className="community-avatar-placeholder" style={{ width: '40px', height: '40px' }}>
                          {friend.display_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div style={{ flex: 1 }}>
                        <div className="community-post-author-name">{friend.display_name}</div>
                        <div className="community-post-author-handle">@{friend.username}</div>
                      </div>
                      {selectedFriend === friend.id && (
                        <div style={{ color: 'var(--accent)' }}>✓</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {}
            <div className="toolbar">
              <button
                onClick={handleShare}
                className="btn tap-ripple"
                disabled={!selectedFriend || sharing || loading}
              >
                {sharing ? 'Sharing...' : 'Send'}
              </button>
              <button
                onClick={onClose}
                className="btn ghost tap-ripple"
                disabled={sharing}
              >
                Cancel
              </button>
            </div>
      </div>
    </div>
  );
}
