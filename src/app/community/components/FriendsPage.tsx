'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { UserPlus, UserCheck, UserX, Check, X, Search } from 'lucide-react';
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  cancelFriendRequest,
  type CommunityProfile,
} from '../actions';

interface FriendRequest {
  id: string;
  requester_id?: string;
  receiver_id?: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
}

interface Friend {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
}

interface FriendsPageProps {
  initialFriendRequests: {
    incoming: FriendRequest[];
    outgoing: FriendRequest[];
  };
  initialFriends: Friend[];
  initialSuggestions: Array<{
    user_id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    mutual_friends: number;
  }>;
}

export default function FriendsPage({
  initialFriendRequests,
  initialFriends,
  initialSuggestions,
}: FriendsPageProps) {
  const [activeTab, setActiveTab] = useState<'requests' | 'friends' | 'suggestions'>('requests');
  const [friendRequests, setFriendRequests] = useState(initialFriendRequests);
  const [friends, setFriends] = useState(initialFriends);
  const [suggestions, setSuggestions] = useState(initialSuggestions);
  const [searchQuery, setSearchQuery] = useState('');

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await acceptFriendRequest(requestId);
      setFriendRequests(prev => ({
        ...prev,
        incoming: prev.incoming.filter(r => r.id !== requestId),
      }));
      // Refresh friends list
      const updatedFriends = await fetch('/api/community/friends').then(r => r.json());
      setFriends(updatedFriends);
    } catch (error) {
      console.error('Failed to accept request:', error);
      alert('Failed to accept friend request');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await rejectFriendRequest(requestId);
      setFriendRequests(prev => ({
        ...prev,
        incoming: prev.incoming.filter(r => r.id !== requestId),
      }));
    } catch (error) {
      console.error('Failed to reject request:', error);
      alert('Failed to reject friend request');
    }
  };

  const handleCancelRequest = async (userId: string) => {
    try {
      await cancelFriendRequest(userId);
      setFriendRequests(prev => ({
        ...prev,
        outgoing: prev.outgoing.filter(r => r.receiver_id !== userId),
      }));
    } catch (error) {
      console.error('Failed to cancel request:', error);
      alert('Failed to cancel friend request');
    }
  };

  const handleRemoveFriend = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this friend?')) return;
    try {
      await removeFriend(userId);
      setFriends(prev => prev.filter(f => f.user_id !== userId));
    } catch (error) {
      console.error('Failed to remove friend:', error);
      alert('Failed to remove friend');
    }
  };

  const handleSendRequest = async (userId: string) => {
    try {
      await sendFriendRequest(userId);
      setSuggestions(prev => prev.filter(s => s.user_id !== userId));
      setFriendRequests(prev => ({
        ...prev,
        outgoing: [
          ...prev.outgoing,
          {
            id: '',
            receiver_id: userId,
            username: suggestions.find(s => s.user_id === userId)?.username || '',
            display_name: suggestions.find(s => s.user_id === userId)?.display_name || '',
            avatar_url: suggestions.find(s => s.user_id === userId)?.avatar_url || null,
            created_at: new Date().toISOString(),
          },
        ],
      }));
    } catch (error: any) {
      console.error('Failed to send request:', error);
      alert(error.message || 'Failed to send friend request');
    }
  };

  const filteredFriends = friends.filter(f =>
    f.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSuggestions = suggestions.filter(s =>
    s.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="community-profile-page">
      <div className="community-neon-card" style={{
        padding: 'var(--pad-lg)',
        borderRadius: '20px',
        background: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(20px) saturate(150%)',
        WebkitBackdropFilter: 'blur(20px) saturate(150%)',
      }}>
        <h1 className="cardTitle" style={{ 
          fontSize: 'var(--fs-xl)', 
          marginBottom: '24px', 
          textAlign: 'center',
          color: '#67e8f9',
          textShadow: '0 0 10px rgba(103, 232, 249, 0.5), 0 0 20px rgba(103, 232, 249, 0.3)'
        }}>
          Friends
        </h1>

        {/* Tabs */}
        <div className="chip-row" style={{ marginBottom: '24px', justifyContent: 'center', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('requests')}
            className={`chip tap-ripple ${activeTab === 'requests' ? 'active' : ''}`}
          >
            <span className="chip-label">
              Requests
              {friendRequests.incoming.length > 0 && (
                <span style={{ marginLeft: '6px', background: '#ef4444', borderRadius: '10px', padding: '2px 6px', fontSize: '11px' }}>
                  {friendRequests.incoming.length}
                </span>
              )}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('friends')}
            className={`chip tap-ripple ${activeTab === 'friends' ? 'active' : ''}`}
          >
            <span className="chip-label">Friends ({friends.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('suggestions')}
            className={`chip tap-ripple ${activeTab === 'suggestions' ? 'active' : ''}`}
          >
            <span className="chip-label">Search</span>
          </button>
        </div>

        {/* Search */}
        {(activeTab === 'friends' || activeTab === 'suggestions') && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input"
                placeholder="Search friends..."
                style={{ paddingLeft: '40px', width: '100%' }}
              />
            </div>
          </div>
        )}

        {/* Content */}
        {activeTab === 'requests' && (
          <div>
            {/* Incoming Requests */}
            {friendRequests.incoming.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <h2 className="cardTitle" style={{ fontSize: 'var(--fs-md)', marginBottom: '16px' }}>
                  Incoming Requests ({friendRequests.incoming.length})
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {friendRequests.incoming.map((request) => (
                    <div
                      key={request.id}
                      className="community-neon-card"
                      style={{
                        padding: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                      }}
                    >
                      <Link href={`/community/u/${request.username}`}>
                        {request.avatar_url ? (
                          <Image
                            src={request.avatar_url}
                            alt={request.display_name}
                            width={48}
                            height={48}
                            className="community-profile-avatar-img"
                            style={{ borderRadius: '50%' }}
                            unoptimized
                          />
                        ) : (
                          <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--accent), rgba(103, 232, 249, 0.3))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text)',
                            fontWeight: 600,
                            fontSize: '20px',
                          }}>
                            {request.display_name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </Link>
                      <div style={{ flex: 1 }}>
                        <Link href={`/community/u/${request.username}`}>
                          <div className="cardTitle" style={{ fontSize: 'var(--fs-sm)', marginBottom: '4px', color: '#67e8f9' }}>
                            {request.display_name}
                          </div>
                          <div className="subtitle" style={{ fontSize: '12px', color: 'var(--muted)' }}>
                            @{request.username}
                          </div>
                        </Link>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleAcceptRequest(request.id)}
                          className="btn tap-ripple"
                          style={{ padding: '8px 16px' }}
                        >
                          <Check size={16} style={{ marginRight: '4px' }} />
                          Accept
                        </button>
                        <button
                          onClick={() => handleRejectRequest(request.id)}
                          className="btn ghost tap-ripple"
                          style={{ padding: '8px 16px' }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Outgoing Requests */}
            {friendRequests.outgoing.length > 0 && (
              <div>
                <h2 className="cardTitle" style={{ fontSize: 'var(--fs-md)', marginBottom: '16px', color: '#ffffff' }}>
                  Outgoing Requests ({friendRequests.outgoing.length})
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {friendRequests.outgoing.map((request) => (
                    <div
                      key={request.id || request.receiver_id}
                      className="community-neon-card"
                      style={{
                        padding: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                      }}
                    >
                      <Link href={`/community/u/${request.username}`}>
                        {request.avatar_url ? (
                          <Image
                            src={request.avatar_url}
                            alt={request.display_name}
                            width={48}
                            height={48}
                            className="community-profile-avatar-img"
                            style={{ borderRadius: '50%' }}
                            unoptimized
                          />
                        ) : (
                          <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--accent), rgba(103, 232, 249, 0.3))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text)',
                            fontWeight: 600,
                            fontSize: '20px',
                          }}>
                            {request.display_name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </Link>
                      <div style={{ flex: 1 }}>
                        <Link href={`/community/u/${request.username}`}>
                          <div className="cardTitle" style={{ fontSize: 'var(--fs-sm)', marginBottom: '4px', color: '#67e8f9' }}>
                            {request.display_name}
                          </div>
                          <div className="subtitle" style={{ fontSize: '12px', color: 'var(--muted)' }}>
                            @{request.username}
                          </div>
                        </Link>
                      </div>
                      <button
                        onClick={() => handleCancelRequest(request.receiver_id!)}
                        className="btn ghost tap-ripple"
                        style={{ padding: '8px 16px' }}
                      >
                        Cancel
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {friendRequests.incoming.length === 0 && friendRequests.outgoing.length === 0 && (
              <p className="subtitle" style={{ textAlign: 'center', color: 'var(--muted)', padding: '40px' }}>
                No friend requests
              </p>
            )}
          </div>
        )}

        {activeTab === 'friends' && (
          <div>
            {filteredFriends.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                {filteredFriends.map((friend) => (
                  <div
                    key={friend.user_id}
                    className="community-neon-card"
                    style={{
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                    }}
                  >
                    <Link href={`/community/u/${friend.username}`}>
                      {friend.avatar_url ? (
                        <Image
                          src={friend.avatar_url}
                          alt={friend.display_name}
                          width={80}
                          height={80}
                          className="community-profile-avatar-img"
                          style={{ borderRadius: '50%', marginBottom: '12px' }}
                          unoptimized
                        />
                      ) : (
                        <div style={{
                          width: '80px',
                          height: '80px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, var(--accent), rgba(103, 232, 249, 0.3))',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--text)',
                          fontWeight: 600,
                          fontSize: '32px',
                          marginBottom: '12px',
                        }}>
                          {friend.display_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </Link>
                    <Link href={`/community/u/${friend.username}`}>
                      <div className="cardTitle" style={{ fontSize: 'var(--fs-sm)', marginBottom: '4px', color: '#67e8f9' }}>
                        {friend.display_name}
                      </div>
                      <div className="subtitle" style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '12px' }}>
                        @{friend.username}
                      </div>
                    </Link>
                    <button
                      onClick={() => handleRemoveFriend(friend.user_id)}
                      className="btn ghost tap-ripple"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                    >
                      <UserX size={14} style={{ marginRight: '4px' }} />
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="subtitle" style={{ textAlign: 'center', color: 'var(--muted)', padding: '40px' }}>
                {searchQuery ? 'No friends found' : 'No friends yet'}
              </p>
            )}
          </div>
        )}

        {activeTab === 'suggestions' && (
          <div>
            {filteredSuggestions.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredSuggestions.map((suggestion) => (
                  <div
                    key={suggestion.user_id}
                    className="community-neon-card"
                    style={{
                      padding: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                    }}
                  >
                    <Link href={`/community/u/${suggestion.username}`}>
                      {suggestion.avatar_url ? (
                        <Image
                          src={suggestion.avatar_url}
                          alt={suggestion.display_name}
                          width={48}
                          height={48}
                          className="community-profile-avatar-img"
                          style={{ borderRadius: '50%' }}
                          unoptimized
                        />
                      ) : (
                        <div style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, var(--accent), rgba(103, 232, 249, 0.3))',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--text)',
                          fontWeight: 600,
                          fontSize: '20px',
                        }}>
                          {suggestion.display_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </Link>
                    <div style={{ flex: 1 }}>
                      <Link href={`/community/u/${suggestion.username}`}>
                        <div className="cardTitle" style={{ fontSize: 'var(--fs-sm)', marginBottom: '4px', color: '#67e8f9' }}>
                          {suggestion.display_name}
                        </div>
                        <div className="subtitle" style={{ fontSize: '12px', color: 'var(--muted)' }}>
                          @{suggestion.username}
                          {suggestion.mutual_friends > 0 && (
                            <span style={{ marginLeft: '8px' }}>
                              • {suggestion.mutual_friends} mutual friend{suggestion.mutual_friends !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </Link>
                    </div>
                    <button
                      onClick={() => handleSendRequest(suggestion.user_id)}
                      className="btn tap-ripple"
                      style={{ padding: '8px 16px' }}
                    >
                      <UserPlus size={16} style={{ marginRight: '4px' }} />
                      Add Friend
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="subtitle" style={{ textAlign: 'center', color: 'var(--muted)', padding: '40px' }}>
                {searchQuery ? 'No users found' : 'No users available'}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

