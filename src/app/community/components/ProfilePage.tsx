'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { UserPlus, UserCheck, MessageCircle, MoreVertical, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toggleFollow, type CommunityProfile, type CommunityPost } from '../actions';
import PostCard from './PostCard';

interface ProfilePageProps {
  profile: CommunityProfile;
  initialPosts: CommunityPost[];
  activeTab?: string;
}

export default function ProfilePage({ profile, initialPosts, activeTab = 'posts' }: ProfilePageProps) {
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(profile.is_following);
  const [followerCount, setFollowerCount] = useState(profile.follower_count);
  const [currentTab, setCurrentTab] = useState(activeTab);

  const handleFollow = async () => {
    setIsFollowing(!isFollowing);
    setFollowerCount(prev => isFollowing ? prev - 1 : prev + 1);
    try {
      await toggleFollow(profile.user_id);
    } catch (error) {
      setIsFollowing(!isFollowing);
      setFollowerCount(prev => isFollowing ? prev + 1 : prev - 1);
    }
  };

  return (
    <div className="community-profile-page">
      {/* Cover Image */}
      {profile.cover_image_url && (
        <div className="community-profile-cover">
          <Image
            src={profile.cover_image_url}
            alt={`${profile.display_name}'s cover`}
            width={1200}
            height={300}
            className="community-profile-cover-img"
            unoptimized
          />
        </div>
      )}

      {/* Profile Header */}
      <div className="community-profile-header-card community-neon-card" style={{
        marginBottom: '24px',
        padding: 'var(--pad-lg)',
        borderRadius: '20px',
        background: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(20px) saturate(150%)',
        WebkitBackdropFilter: 'blur(20px) saturate(150%)'
      }}>
        <div className="community-profile-header">
              <div className="community-profile-avatar-large">
                {profile.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={profile.display_name}
                    width={120}
                    height={120}
                    className="community-profile-avatar-img"
                    unoptimized
                  />
                ) : (
                  <div className="community-profile-avatar-placeholder-large">
                    {profile.display_name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="community-profile-info">
                <div className="community-profile-name-row">
                  <h1 className="cardTitle" style={{ fontSize: 'var(--fs-xl)', marginBottom: '4px' }}>
                    {profile.display_name}
                  </h1>
                  {profile.verified && (
                    <span className="community-profile-verified" title="Verified">✓</span>
                  )}
                </div>
                <div className="community-profile-handle">@{profile.username}</div>
                {profile.bio && (
                  <p className="subtitle" style={{ marginTop: '8px', color: 'var(--muted)', lineHeight: '1.6' }}>
                    {profile.bio}
                  </p>
                )}
                <div className="community-profile-meta" style={{ marginTop: '12px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  {profile.location && (
                    <span className="subtitle" style={{ color: 'var(--muted)' }}>📍 {profile.location}</span>
                  )}
                  {profile.website && (
                    <a
                      href={profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="subtitle"
                      style={{ color: 'var(--accent)' }}
                    >
                      🔗 {profile.website.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                </div>
                <div className="community-profile-stats" style={{ marginTop: '16px', display: 'flex', gap: '24px' }}>
                  <div className="community-profile-stat">
                    <span className="cardTitle" style={{ fontSize: 'var(--fs-lg)' }}>{profile.post_count}</span>
                    <span className="subtitle" style={{ color: 'var(--muted)', marginLeft: '4px' }}>Posts</span>
                  </div>
                  <div className="community-profile-stat">
                    <span className="cardTitle" style={{ fontSize: 'var(--fs-lg)' }}>{followerCount}</span>
                    <span className="subtitle" style={{ color: 'var(--muted)', marginLeft: '4px' }}>Followers</span>
                  </div>
                  <div className="community-profile-stat">
                    <span className="cardTitle" style={{ fontSize: 'var(--fs-lg)' }}>{profile.following_count}</span>
                    <span className="subtitle" style={{ color: 'var(--muted)', marginLeft: '4px' }}>Following</span>
                  </div>
                </div>
              </div>
              <div className="community-profile-actions">
                {!profile.is_blocked && (
                  <>
                    <button
                      onClick={handleFollow}
                      className={`btn tap-ripple ${isFollowing ? 'ghost' : ''}`}
                    >
                      {isFollowing ? (
                        <>
                          <UserCheck size={16} style={{ marginRight: '4px' }} />
                          Following
                        </>
                      ) : (
                        <>
                          <UserPlus size={16} style={{ marginRight: '4px' }} />
                          Follow
                        </>
                      )}
                    </button>
                    <Link href={`/messages?user=${profile.username}`}>
                      <button className="btn ghost tap-ripple">
                        <MessageCircle size={16} style={{ marginRight: '4px' }} />
                        Message
                      </button>
                    </Link>
                  </>
                )}
                <button className="btn ghost tap-ripple" aria-label="More options">
                  <MoreVertical size={16} />
                </button>
              </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="community-profile-tabs community-neon-card" style={{ 
        marginTop: '24px',
        padding: 'var(--pad-md)',
        borderRadius: '16px',
        background: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(20px) saturate(150%)',
        WebkitBackdropFilter: 'blur(20px) saturate(150%)'
      }}>
        <div className="chip-row" style={{ gap: '8px' }}>
                <button
                  onClick={() => {
                    setCurrentTab('posts');
                    router.push(`/u/${profile.username}?tab=posts`);
                  }}
                  className={`chip tap-ripple ${currentTab === 'posts' ? 'active' : ''}`}
                >
                  <span className="chip-label">Posts</span>
                </button>
                <button
                  onClick={() => {
                    setCurrentTab('saved');
                    router.push(`/u/${profile.username}?tab=saved`);
                  }}
                  className={`chip tap-ripple ${currentTab === 'saved' ? 'active' : ''}`}
                >
                  <span className="chip-label">Saved</span>
                </button>
                <button
                  onClick={() => {
                    setCurrentTab('about');
                    router.push(`/u/${profile.username}?tab=about`);
                  }}
                  className={`chip tap-ripple ${currentTab === 'about' ? 'active' : ''}`}
                >
                  <span className="chip-label">About</span>
                </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="community-profile-content" style={{ marginTop: '24px' }}>
        {currentTab === 'posts' && (
          <div className="community-feed">
            {initialPosts.length === 0 ? (
              <div className="community-neon-card" style={{
                padding: 'var(--pad-lg)',
                borderRadius: '20px',
                background: 'rgba(0, 0, 0, 0.45)',
                backdropFilter: 'blur(20px) saturate(150%)',
                WebkitBackdropFilter: 'blur(20px) saturate(150%)',
                textAlign: 'center'
              }}>
                <p className="subtitle" style={{ color: 'var(--muted)' }}>
                  No posts yet.
                </p>
              </div>
            ) : (
              initialPosts.map(post => (
                <PostCard key={post.id} post={post} />
              ))
            )}
          </div>
        )}

        {currentTab === 'saved' && (
          <div style={{
            padding: 'var(--pad-lg)',
            borderRadius: '20px',
            background: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(20px) saturate(150%)',
            WebkitBackdropFilter: 'blur(20px) saturate(150%)',
            border: '1px solid var(--border)',
            textAlign: 'center'
          }}>
            <p className="subtitle" style={{ color: 'var(--muted)' }}>
              Saved posts are private.
            </p>
          </div>
        )}

        {currentTab === 'about' && (
          <div className="community-neon-card" style={{
            padding: 'var(--pad-lg)',
            borderRadius: '20px',
            background: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(20px) saturate(150%)',
            WebkitBackdropFilter: 'blur(20px) saturate(150%)'
          }}>
            <h3 className="cardTitle" style={{ marginBottom: '12px' }}>About</h3>
            {profile.bio ? (
              <p className="subtitle" style={{ lineHeight: '1.6', marginBottom: '16px' }}>
                {profile.bio}
              </p>
            ) : (
              <p className="subtitle" style={{ color: 'var(--muted)' }}>
                No bio yet.
              </p>
            )}
            <div className="community-profile-about-meta">
              {profile.location && (
                <div className="community-profile-about-item">
                  <strong>Location:</strong> {profile.location}
                </div>
              )}
              {profile.website && (
                <div className="community-profile-about-item">
                  <strong>Website:</strong>{' '}
                  <a href={profile.website} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>
                    {profile.website}
                  </a>
                </div>
              )}
              <div className="community-profile-about-item">
                <strong>Joined:</strong> {new Date(profile.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

