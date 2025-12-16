'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Image from 'next/image';
import { UserPlus, UserCheck, UserX, MessageCircle, MoreVertical, Settings, Users, List, Grid, Camera, X, Plus, Edit, Bell, Bookmark } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toggleFollow, sendFriendRequest, acceptFriendRequest, removeFriend, cancelFriendRequest, type CommunityProfile, type CommunityPost } from '../actions';
import PostCard from './PostCard';

interface ProfilePageProps {
  profile: CommunityProfile;
  initialPosts: CommunityPost[];
  activeTab?: string;
  currentUserId?: string;
}

export default function ProfilePage({ profile, initialPosts, activeTab = 'posts', currentUserId }: ProfilePageProps) {
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(profile.is_following);
  const [followerCount, setFollowerCount] = useState(profile.follower_count);
  const [postCount, setPostCount] = useState(profile.post_count);
  const [posts, setPosts] = useState<CommunityPost[]>(initialPosts);
  const [currentTab, setCurrentTab] = useState(activeTab);
  const [friendStatus, setFriendStatus] = useState(profile.friend_request_status);
  const [isFriend, setIsFriend] = useState(profile.is_friend);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [uploading, setUploading] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [dashboardMain, setDashboardMain] = useState<HTMLElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isOwnProfile = currentUserId && profile.user_id === currentUserId;

  // Update posts when initialPosts changes (e.g., after tab switch)
  useEffect(() => {
    setPosts(initialPosts);
  }, [initialPosts]);

  // Handle post deletion - remove from state and update count
  const handlePostDelete = (postId: string) => {
    setPosts(prevPosts => prevPosts.filter(p => p.id !== postId));
    // Update post count if on own profile
    if (isOwnProfile && currentTab === 'posts') {
      setPostCount(prev => Math.max(0, prev - 1));
      // Also fetch live count to ensure accuracy
      fetchLivePostCount();
    }
  };

  // Fetch live post count from database
  const fetchLivePostCount = async () => {
    try {
      const response = await fetch(`/api/community/profile?username=${encodeURIComponent(profile.username)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.post_count !== undefined) {
          setPostCount(data.post_count);
        }
      }
    } catch (error) {
      console.error('Failed to fetch post count:', error);
    }
  };

  // Fetch live post count on mount and periodically to keep it up to date
  useEffect(() => {
    fetchLivePostCount();
    
    // Poll every 3 seconds to keep count updated without refresh
    const interval = setInterval(() => {
      fetchLivePostCount();
    }, 3000);

    // Listen for focus events (when user comes back to tab)
    const handleFocus = () => {
      fetchLivePostCount();
    };
    
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [profile.username]);

  // Also update when posts list changes (optimistic update for own profile)
  useEffect(() => {
    // Optimistically update count for own profile based on visible posts
    // The periodic fetch will ensure accuracy
    if (isOwnProfile && currentTab === 'posts') {
      // Only update if we're on the posts tab
      fetchLivePostCount();
    }
  }, [initialPosts.length, isOwnProfile, currentTab]);

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

  const handleFriendAction = async () => {
    try {
      if (friendStatus === 'none') {
        await sendFriendRequest(profile.user_id);
        setFriendStatus('sent');
      } else if (friendStatus === 'sent') {
        await cancelFriendRequest(profile.user_id);
        setFriendStatus('none');
      } else if (friendStatus === 'pending') {
        // This would be handled on the friends page, but we can show a message
        router.push('/community/friends');
      } else if (isFriend) {
        if (confirm('Are you sure you want to remove this friend?')) {
          await removeFriend(profile.user_id);
          setIsFriend(false);
          setFriendStatus('none');
        }
      }
    } catch (error: any) {
      console.error('Friend action error:', error);
      alert(error.message || 'Failed to perform friend action');
    }
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          // Use higher max size for better quality (1024px for avatars)
          const maxSize = 1024;
          let width = img.width;
          let height = img.height;

          // Only resize if image is larger than maxSize
          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = (height * maxSize) / width;
              width = maxSize;
            } else {
              width = (width * maxSize) / height;
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }

          // Use high-quality settings
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          ctx.drawImage(img, 0, 0, width, height);
          
          // Use PNG for better quality, or JPEG at 95% quality
          const isPng = file.type === 'image/png';
          const dataUrl = isPng 
            ? canvas.toDataURL('image/png') // PNG for lossless quality
            : canvas.toDataURL('image/jpeg', 0.95); // 95% quality for JPEG
          resolve(dataUrl);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      const compressedDataUrl = await compressImage(file);
      
      const res = await fetch('/api/community/profile/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarDataUrl: compressedDataUrl }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to upload avatar');
      }

      const data = await res.json();
      setAvatarUrl(data.avatar_url);
      
      // Refresh the page to update all avatar displays
      router.refresh();
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      alert(error.message || 'Failed to upload avatar');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarClick = (e: React.MouseEvent) => {
    // Don't open modal if clicking the camera button, input, or uploading
    const target = e.target as HTMLElement;
    if (uploading || target.closest('button') || target.closest('input')) {
      e.stopPropagation();
      return;
    }
    // Only open modal if there's an avatar image
    if (avatarUrl) {
      setIsAvatarModalOpen(true);
    }
  };

  const closeAvatarModal = () => {
    setIsAvatarModalOpen(false);
  };

  // Find dashboard-main container
  useEffect(() => {
    const main = document.querySelector('.dashboard-main') as HTMLElement;
    setDashboardMain(main);
  }, []);

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isAvatarModalOpen) {
        closeAvatarModal();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isAvatarModalOpen]);

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
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <div 
                  className="community-profile-avatar-large"
                  onClick={handleAvatarClick}
                  style={{ cursor: avatarUrl ? 'pointer' : 'default' }}
                >
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt={profile.display_name}
                      width={120}
                      height={120}
                      className="community-profile-avatar-img"
                      unoptimized
                      quality={100}
                      style={{ objectFit: 'cover' }}
                    />
                  ) : (
                    <div className="community-profile-avatar-placeholder-large">
                      {profile.display_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                {isOwnProfile && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      style={{ display: 'none' }}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerFileInput();
                      }}
                      disabled={uploading}
                      style={{
                        position: 'absolute',
                        bottom: '4px',
                        right: '4px',
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: 'rgba(103, 232, 249, 0.9)',
                        border: '2px solid var(--bg)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: uploading ? 'wait' : 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 0 10px rgba(103, 232, 249, 0.5)',
                        zIndex: 20
                      }}
                      onMouseEnter={(e) => {
                        if (!uploading) {
                          e.currentTarget.style.background = 'rgba(103, 232, 249, 1)';
                          e.currentTarget.style.transform = 'scale(1.1)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!uploading) {
                          e.currentTarget.style.background = 'rgba(103, 232, 249, 0.9)';
                          e.currentTarget.style.transform = 'scale(1)';
                        }
                      }}
                      title="Change avatar"
                    >
                      <Camera size={18} color="var(--bg)" />
                    </button>
                    {uploading && (
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        background: 'rgba(0, 0, 0, 0.8)',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        fontSize: '12px',
                        color: '#67e8f9',
                        zIndex: 20
                      }}>
                        Uploading...
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="community-profile-info">
                <div className="community-profile-name-row">
                  <h1 className="cardTitle" style={{ fontSize: 'var(--fs-xl)', marginBottom: '4px', color: '#67e8f9' }}>
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
                    <span className="cardTitle" style={{ fontSize: 'var(--fs-lg)', color: '#67e8f9' }}>{postCount}</span>
                    <span className="subtitle" style={{ color: 'var(--muted)', marginLeft: '4px' }}>Posts</span>
                  </div>
                  <div className="community-profile-stat">
                    <span className="cardTitle" style={{ fontSize: 'var(--fs-lg)', color: '#67e8f9' }}>{followerCount}</span>
                    <span className="subtitle" style={{ color: 'var(--muted)', marginLeft: '4px' }}>Followers</span>
                  </div>
                  <div className="community-profile-stat">
                    <span className="cardTitle" style={{ fontSize: 'var(--fs-lg)', color: '#67e8f9' }}>{profile.following_count}</span>
                    <span className="subtitle" style={{ color: 'var(--muted)', marginLeft: '4px' }}>Following</span>
                  </div>
                </div>
              </div>
              <div className="community-profile-actions">
                {isOwnProfile ? (
                  // Own profile - show useful actions
                  <>
                    <Link href="/community/new">
                      <button className="btn tap-ripple">
                        <Plus size={16} style={{ marginRight: '4px' }} />
                        Create Post
                      </button>
                    </Link>
                    <Link href="/community/notifications">
                      <button className="btn ghost tap-ripple">
                        <Bell size={16} style={{ marginRight: '4px' }} />
                        Notifications
                      </button>
                    </Link>
                    <button
                      onClick={() => {
                        setCurrentTab('saved');
                        router.push(`/community/u/${profile.username}?tab=saved`);
                      }}
                      className={`btn ghost tap-ripple ${currentTab === 'saved' ? 'active' : ''}`}
                    >
                      <Bookmark size={16} style={{ marginRight: '4px' }} />
                      Saved
                    </button>
                    <Link href="/community/friends">
                      <button className="btn ghost tap-ripple">
                        <Users size={16} style={{ marginRight: '4px' }} />
                        Friends
                      </button>
                    </Link>
                  </>
                ) : (
                  // Other user's profile - show friend/follow actions
                  !profile.is_blocked && (
                    <>
                      {isFriend ? (
                        <button
                          onClick={handleFriendAction}
                          className="btn tap-ripple"
                          style={{ background: 'rgba(103, 232, 249, 0.2)', borderColor: 'var(--accent)' }}
                        >
                          <UserCheck size={16} style={{ marginRight: '4px' }} />
                          Friends
                        </button>
                      ) : friendStatus === 'sent' ? (
                        <button
                          onClick={handleFriendAction}
                          className="btn ghost tap-ripple"
                        >
                          <UserPlus size={16} style={{ marginRight: '4px' }} />
                          Request Sent
                        </button>
                      ) : friendStatus === 'pending' ? (
                        <Link href="/community/friends">
                          <button className="btn tap-ripple">
                            <UserCheck size={16} style={{ marginRight: '4px' }} />
                            Accept Request
                          </button>
                        </Link>
                      ) : (
                        <button
                          onClick={handleFriendAction}
                          className="btn tap-ripple"
                        >
                          <UserPlus size={16} style={{ marginRight: '4px' }} />
                          Add Friend
                        </button>
                      )}
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
                  )
                )}
                {!isOwnProfile && (
                  <button className="btn ghost tap-ripple" aria-label="More options">
                    <MoreVertical size={16} />
                  </button>
                )}
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
                    router.push(`/community/u/${profile.username}?tab=posts`);
                  }}
                  className={`chip tap-ripple ${currentTab === 'posts' ? 'active' : ''}`}
                >
                  <span className="chip-label">Posts</span>
                </button>
                <button
                  onClick={() => {
                    setCurrentTab('saved');
                    router.push(`/community/u/${profile.username}?tab=saved`);
                  }}
                  className={`chip tap-ripple ${currentTab === 'saved' ? 'active' : ''}`}
                >
                  <span className="chip-label">Saved</span>
                </button>
                <button
                  onClick={() => {
                    setCurrentTab('friends');
                    router.push(`/community/u/${profile.username}?tab=friends`);
                  }}
                  className={`chip tap-ripple ${currentTab === 'friends' ? 'active' : ''}`}
                >
                  <span className="chip-label">Friends</span>
                </button>
                <button
                  onClick={() => {
                    setCurrentTab('about');
                    router.push(`/community/u/${profile.username}?tab=about`);
                  }}
                  className={`chip tap-ripple ${currentTab === 'about' ? 'active' : ''}`}
                >
                  <span className="chip-label">About</span>
                </button>
        </div>
      </div>

      {/* View Toggle - Only show for posts and saved tabs */}
      {(currentTab === 'posts' || currentTab === 'saved') && posts.length > 0 && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          gap: '8px', 
          marginTop: '16px',
          marginBottom: '8px'
        }}>
          <button
            onClick={() => setViewMode('list')}
            className={`chip tap-ripple ${viewMode === 'list' ? 'active' : ''}`}
            style={{
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <List size={16} />
            <span className="chip-label">List</span>
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`chip tap-ripple ${viewMode === 'grid' ? 'active' : ''}`}
            style={{
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Grid size={16} />
            <span className="chip-label">Grid</span>
          </button>
        </div>
      )}

      {/* Tab Content */}
      <div className="community-profile-content" style={{ marginTop: '24px' }}>
        {currentTab === 'posts' && (
          <>
            {posts.length === 0 ? (
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
            ) : viewMode === 'list' ? (
              <div className="community-feed">
                {posts.map(post => (
                  <PostCard key={post.id} post={post} currentUserId={currentUserId} onDelete={handlePostDelete} />
                ))}
              </div>
            ) : (
              <div className="community-posts-grid">
                {posts.map(post => (
                  <PostCard key={post.id} post={post} compact={true} currentUserId={currentUserId} onDelete={handlePostDelete} />
                ))}
              </div>
            )}
          </>
        )}

        {currentTab === 'saved' && (
          <>
            {currentUserId && profile.user_id !== currentUserId ? (
              <div className="community-neon-card" style={{
                padding: 'var(--pad-lg)',
                borderRadius: '20px',
                background: 'rgba(0, 0, 0, 0.45)',
                backdropFilter: 'blur(20px) saturate(150%)',
                WebkitBackdropFilter: 'blur(20px) saturate(150%)',
                textAlign: 'center'
              }}>
                <p className="subtitle" style={{ color: 'var(--muted)' }}>
                  Saved posts are private.
                </p>
              </div>
            ) : posts.length === 0 ? (
              <div className="community-neon-card" style={{
                padding: 'var(--pad-lg)',
                borderRadius: '20px',
                background: 'rgba(0, 0, 0, 0.45)',
                backdropFilter: 'blur(20px) saturate(150%)',
                WebkitBackdropFilter: 'blur(20px) saturate(150%)',
                textAlign: 'center'
              }}>
                <p className="subtitle" style={{ color: 'var(--muted)' }}>
                  No saved posts yet.
                </p>
              </div>
            ) : viewMode === 'list' ? (
              <div className="community-feed">
                {posts.map(post => (
                  <PostCard key={post.id} post={post} currentUserId={currentUserId} onDelete={handlePostDelete} />
                ))}
              </div>
            ) : (
              <div className="community-posts-grid">
                {posts.map(post => (
                  <PostCard key={post.id} post={post} compact={true} currentUserId={currentUserId} onDelete={handlePostDelete} />
                ))}
              </div>
            )}
          </>
        )}

        {currentTab === 'friends' && (
          <div className="community-neon-card" style={{
            padding: 'var(--pad-lg)',
            borderRadius: '20px',
            background: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(20px) saturate(150%)',
            WebkitBackdropFilter: 'blur(20px) saturate(150%)'
          }}>
            <Link href="/community/friends">
              <button className="btn tap-ripple" style={{ marginBottom: '16px' }}>
                <Users size={16} style={{ marginRight: '4px' }} />
                View All Friends
              </button>
            </Link>
            <p className="subtitle" style={{ color: 'var(--muted)' }}>
              Friend list is available on the Friends page.
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

      {/* Avatar Image Modal - Rendered via Portal inside dashboard-main */}
      {isAvatarModalOpen && avatarUrl && dashboardMain && createPortal(
        <div
          className="avatar-modal-overlay"
          onClick={closeAvatarModal}
          style={{
            position: 'fixed',
            top: 0,
            left: '280px',
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            zIndex: 10001,
            padding: '40px',
            paddingTop: '60px',
            cursor: 'pointer',
            overflow: 'hidden'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="community-neon-card"
            style={{
              position: 'relative',
              cursor: 'default',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(11, 18, 32, 0.95)',
              backdropFilter: 'blur(40px) saturate(200%)',
              WebkitBackdropFilter: 'blur(40px) saturate(200%)',
              borderRadius: '24px',
              padding: '24px',
              boxShadow: '0 0 80px rgba(103, 232, 249, 0.3), 0 0 160px rgba(167, 139, 250, 0.2), inset 0 0 60px rgba(103, 232, 249, 0.1)',
              border: '2px solid rgba(103, 232, 249, 0.3)',
              maxWidth: 'calc(100vw - 360px)',
              maxHeight: 'calc(100vh - 80px)',
              width: 'fit-content',
              height: 'fit-content'
            }}
          >
            <button
              onClick={closeAvatarModal}
              className="btn ghost tap-ripple"
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                padding: '8px',
                minWidth: 'auto',
                zIndex: 10002,
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                borderRadius: '50%',
                border: '2px solid rgba(103, 232, 249, 0.5)'
              }}
              aria-label="Close"
            >
              <X size={20} color="#67e8f9" />
            </button>
            <img
              src={avatarUrl}
              alt={`${profile.display_name}'s avatar`}
              style={{
                maxWidth: 'calc(100vw - 440px)',
                maxHeight: 'calc(100vh - 180px)',
                width: 'auto',
                height: 'auto',
                display: 'block',
                borderRadius: '12px',
                objectFit: 'contain'
              }}
            />
          </div>
        </div>,
        dashboardMain
      )}
    </div>
  );
}

