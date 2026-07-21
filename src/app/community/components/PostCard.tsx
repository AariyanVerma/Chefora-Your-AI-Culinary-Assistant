'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, MessageCircle, Bookmark, Share2, Repeat2, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { toggleLikePost, toggleSavePost, repostPost, deletePost } from '../actions';
import ShareModal from './ShareModal';
import ImageCarousel from './ImageCarousel';
import { useRouter } from 'next/navigation';
import { getPostTitleColor } from '../utils';

interface PostCardProps {
  post: {
    id: string;
    author_id: string;
    author_username: string;
    author_display_name: string;
    author_avatar_url: string | null;
    title: string;
    caption: string | null;
    media_urls: string[];
    like_count: number;
    comment_count: number;
    repost_count: number;
    save_count: number;
    share_count: number;
    created_at: string;
    recipe: {
      difficulty: string | null;
      cuisine: string | null;
      total_time_minutes: number | null;
      diet_tags: string[];
      tags: string[];
    } | null;
    is_liked: boolean;
    is_saved: boolean;
    is_reposted?: boolean;
  };
  currentUserId?: string;
  compact?: boolean;
  onDelete?: (postId: string) => void;
}

export default function PostCard({ post, currentUserId, compact = false, onDelete }: PostCardProps) {
  const router = useRouter();
  const [isLiked, setIsLiked] = useState(post.is_liked);
  const [isSaved, setIsSaved] = useState(post.is_saved);
  const [isReposted, setIsReposted] = useState(post.is_reposted || false);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [repostCount, setRepostCount] = useState(post.repost_count);
  const [shareCount, setShareCount] = useState(post.share_count || 0);
  const [showMenu, setShowMenu] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const lastActionTimeRef = React.useRef<number>(0);

  const isOwner = currentUserId === post.author_id;
  const titleColor = getPostTitleColor(post.id);

  React.useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    const updateCounts = async () => {
      try {
        const response = await fetch(`/api/community/post-counts?postIds=${post.id}`);
        if (response.ok) {
          const data = await response.json();
          const counts = data.counts[post.id];
          if (counts) {
            setLikeCount(counts.like_count);
            setIsLiked(counts.is_liked);
            setRepostCount(counts.repost_count);
            setIsReposted(counts.is_reposted);
            setIsSaved(counts.is_saved);
            setShareCount(counts.share_count || 0);
          }
        }
      } catch (error) {
        console.error('Failed to update counts:', error);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateCounts();
        intervalId = setInterval(updateCounts, 1000); 
      } else {
        if (intervalId) clearInterval(intervalId);
      }
    };

    if (document.visibilityState === 'visible') {
      updateCounts();
      intervalId = setInterval(updateCounts, 1000);
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [post.id]);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    lastActionTimeRef.current = Date.now();
    
    const newLikedState = !isLiked;
    setIsLiked(newLikedState);
    setLikeCount(prev => {
      const newCount = newLikedState ? prev + 1 : Math.max(0, prev - 1);
      return newCount;
    });
    
    try {
      const result = await toggleLikePost(post.id);
      
      if (result?.like_count !== undefined) {
        setLikeCount(result.like_count);
        setIsLiked(result.is_liked);
      }
    } catch (error) {
      
      setIsLiked(!newLikedState);
      setLikeCount(post.like_count);
      console.error('Failed to toggle like:', error);
    }
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    lastActionTimeRef.current = Date.now();
    setIsSaved(!isSaved);
    try {
      await toggleSavePost(post.id);
    } catch (error) {
      setIsSaved(!isSaved);
    }
  };

  const handleRepost = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    lastActionTimeRef.current = Date.now();
    const wasReposted = isReposted;
    setIsReposted(!isReposted);
    setRepostCount(prev => wasReposted ? prev - 1 : prev + 1);
    try {
      await repostPost(post.id);
    } catch (error) {
      setIsReposted(wasReposted);
      setRepostCount(prev => wasReposted ? prev + 1 : prev - 1);
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowShareModal(true);
  };

  const handleShareSuccess = async () => {
    
    try {
      const response = await fetch(`/api/community/post-counts?postIds=${post.id}`);
      if (response.ok) {
        const data = await response.json();
        const counts = data.counts[post.id];
        if (counts) {
          setShareCount(counts.share_count || 0);
        }
      }
    } catch (error) {
      console.error('Failed to update share count:', error);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      await deletePost(post.id);
      
      if (onDelete) {
        onDelete(post.id);
      } else {
        router.refresh();
      }
    } catch (error) {
      console.error('Failed to delete post:', error);
      alert('Failed to delete post. Please try again.');
      setDeleting(false);
    }
  };

  React.useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.community-post-card-menu') && !target.closest('button[aria-label="Post options"]')) {
        setShowMenu(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showMenu]);

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

  const handleCardClick = (e: React.MouseEvent) => {
    
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('a') ||
      target.closest('.community-post-card-menu')
    ) {
      return;
    }
    router.push(`/community/p/${post.id}`);
  };

  if (compact) {
    return (
      <div 
        className="community-post-card-compact" 
        style={{ 
          cursor: 'pointer',
          position: 'relative',
          aspectRatio: '1',
          borderRadius: '12px',
          overflow: 'hidden',
          background: 'rgba(0, 0, 0, 0.45)',
          border: '1px solid rgba(103, 232, 249, 0.3)',
          transition: 'all 0.3s ease'
        }}
        onClick={handleCardClick}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.02)';
          e.currentTarget.style.borderColor = 'rgba(103, 232, 249, 0.6)';
          e.currentTarget.style.boxShadow = '0 0 20px rgba(103, 232, 249, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.borderColor = 'rgba(103, 232, 249, 0.3)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {post.media_urls.length > 0 && (
          <div 
            style={{ 
              width: '100%', 
              height: '100%', 
              position: 'relative',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <ImageCarousel
              images={post.media_urls}
              alt={post.title}
              className="community-post-compact-carousel"
              imageClassName="community-post-compact-image"
              showIndicators={post.media_urls.length > 1}
              showArrows={post.media_urls.length > 1}
            />
          </div>
        )}
        {}
        {isOwner && (
          <div style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            zIndex: 10
          }}>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="btn ghost tap-ripple"
              style={{
                width: '32px',
                height: '32px',
                padding: '0',
                minWidth: 'auto',
                background: 'rgba(0, 0, 0, 0.7)',
                backdropFilter: 'blur(10px)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}
              aria-label="Post options"
            >
              <MoreVertical size={16} color="#fff" />
            </button>
            {showMenu && (
              <div 
                className="community-post-card-menu"
                style={{
                  position: 'absolute',
                  top: '40px',
                  right: '0',
                  background: 'rgba(11, 18, 32, 0.98)',
                  backdropFilter: 'blur(20px) saturate(200%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(200%)',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                  zIndex: 1000,
                  minWidth: '180px',
                  overflow: 'hidden'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="community-menu-item"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    router.push(`/community/edit/${post.id}`);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(103, 232, 249, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'none';
                  }}
                >
                  <Edit size={16} style={{ marginRight: '8px' }} />
                  Edit Post
                </button>
                <button
                  type="button"
                  className="community-menu-item"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    handleDelete(e);
                  }}
                  disabled={deleting}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'none',
                    border: 'none',
                    color: '#ef4444',
                    cursor: deleting ? 'not-allowed' : 'pointer',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!deleting) {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'none';
                  }}
                >
                  <Trash2 size={16} style={{ marginRight: '8px' }} />
                  {deleting ? 'Deleting...' : 'Delete Post'}
                </button>
              </div>
            )}
          </div>
        )}
        {}
        <div style={{
          position: 'absolute',
          bottom: '8px',
          left: '8px',
          right: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(10px)',
          padding: '6px 10px',
          borderRadius: '8px',
          zIndex: 5
        }}>
          <Heart size={14} fill={isLiked ? '#ef4444' : 'none'} color={isLiked ? '#ef4444' : 'currentColor'} />
          <span style={{ fontSize: '12px', color: 'var(--text)' }}>{likeCount}</span>
          <MessageCircle size={14} />
          <span style={{ fontSize: '12px', color: 'var(--text)' }}>{post.comment_count}</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div 
        className="community-post-card community-neon-card" 
        style={{ 
          marginBottom: '24px', 
          cursor: 'pointer',
          padding: 'var(--pad-lg)',
          borderRadius: '20px',
          background: 'rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(20px) saturate(150%)',
          WebkitBackdropFilter: 'blur(20px) saturate(150%)'
        }}
        onClick={handleCardClick}
      >
              {}
              <div className="community-post-header">
                <Link 
                  href={`/community/u/${post.author_username}`}
                  className="community-post-author"
                  onClick={(e) => e.stopPropagation()}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div className="community-avatar">
                    {post.author_avatar_url ? (
                      <Image
                        src={post.author_avatar_url}
                        alt={post.author_display_name}
                        width={40}
                        height={40}
                        className="community-avatar-img"
                        unoptimized
                      />
                    ) : (
                      <div className="community-avatar-placeholder">
                        {post.author_display_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="community-post-author-info">
                    <div className="community-post-author-name">{post.author_display_name}</div>
                    <div className="community-post-author-handle">@{post.author_username}</div>
                  </div>
                </Link>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="community-post-time">{formatTimeAgo(post.created_at)}</div>
                  {isOwner && (
                    <div style={{ position: 'relative' }}>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowMenu(!showMenu);
                        }}
                        className="btn ghost tap-ripple"
                        style={{ padding: '4px 8px', minWidth: 'auto' }}
                        aria-label="Post options"
                      >
                        <MoreVertical size={16} />
                      </button>
                      {showMenu && (
                        <div className="community-post-card-menu" style={{
                          position: 'absolute',
                          top: '100%',
                          right: 0,
                          marginTop: '8px',
                          zIndex: 100,
                          minWidth: '160px',
                          padding: '8px',
                          borderRadius: '12px',
                          background: 'rgba(0, 0, 0, 0.8)',
                          backdropFilter: 'blur(20px) saturate(150%)',
                          WebkitBackdropFilter: 'blur(20px) saturate(150%)',
                          border: '1px solid var(--border)'
                        }}>
                          <button
                            type="button"
                            className="community-menu-item"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowMenu(false);
                              router.push(`/community/edit/${post.id}`);
                            }}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              background: 'none',
                              border: 'none',
                              color: 'var(--text)',
                              cursor: 'pointer',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(103, 232, 249, 0.1)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'none';
                            }}
                          >
                            <Edit size={16} style={{ marginRight: '8px' }} />
                            Edit Post
                          </button>
                          <button
                            type="button"
                            className="community-menu-item"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowMenu(false);
                              handleDelete(e);
                            }}
                            disabled={deleting}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              background: 'none',
                              border: 'none',
                              color: '#ef4444',
                              cursor: deleting ? 'not-allowed' : 'pointer',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              transition: 'all 0.2s ease',
                              marginTop: '4px'
                            }}
                            onMouseEnter={(e) => {
                              if (!deleting) {
                                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'none';
                            }}
                          >
                            <Trash2 size={16} style={{ marginRight: '8px' }} />
                            {deleting ? 'Deleting...' : 'Delete Post'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {}
              {post.media_urls.length > 0 && (
                <div className="community-post-image-wrapper" onClick={(e) => e.stopPropagation()}>
                  <ImageCarousel
                    images={post.media_urls}
                    alt={post.title}
                    showIndicators={post.media_urls.length > 1}
                    showArrows={post.media_urls.length > 1}
                  />
                </div>
              )}

              {}
              <div className="community-post-content">
                <h3 className="cardTitle" style={{ marginBottom: '8px', color: titleColor }}>{post.title}</h3>
                {post.caption && (
                  <p className="subtitle" style={{ marginBottom: '12px', color: 'var(--muted)' }}>
                    {post.caption}
                  </p>
                )}

                {}
                {post.recipe && (
                  <div className="chip-row" style={{ marginBottom: '12px', flexWrap: 'wrap', gap: '6px' }}>
                    {post.recipe.difficulty && (
                      <span className="chip tap-ripple active">
                        <span className="chip-dot" />
                        <span className="chip-label">{post.recipe.difficulty}</span>
                      </span>
                    )}
                    {post.recipe.cuisine && (
                      <span className="chip tap-ripple active">
                        <span className="chip-dot" />
                        <span className="chip-label">{post.recipe.cuisine}</span>
                      </span>
                    )}
                    {post.recipe.total_time_minutes && (
                      <span className="chip tap-ripple active">
                        <span className="chip-dot" />
                        <span className="chip-label">⏱️ {post.recipe.total_time_minutes} min</span>
                      </span>
                    )}
                    {post.recipe.diet_tags?.map((tag, i) => (
                      <span key={i} className="chip tap-ripple active">
                        <span className="chip-dot" />
                        <span className="chip-label">{tag}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {}
              <div className="community-post-actions">
                <button
                  onClick={handleLike}
                  className={`community-post-action ${isLiked ? 'active' : ''}`}
                  aria-label="Like"
                  style={{ color: '#ef4444' }}
                >
                  <Heart size={20} fill={isLiked ? '#ef4444' : 'none'} />
                  <span>{likeCount}</span>
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    router.push(`/community/p/${post.id}#comments`);
                  }}
                  className="community-post-action"
                  aria-label="Comment"
                >
                  <MessageCircle size={20} />
                  <span>{post.comment_count}</span>
                </button>
                <button
                  onClick={handleRepost}
                  className={`community-post-action ${isReposted ? 'active' : ''}`}
                  aria-label="Repost"
                  style={{ color: isReposted ? 'var(--accent)' : 'inherit' }}
                >
                  <Repeat2 size={20} fill={isReposted ? 'currentColor' : 'none'} />
                  <span>{repostCount}</span>
                </button>
                <button
                  onClick={handleSave}
                  className={`community-post-action ${isSaved ? 'active' : ''}`}
                  aria-label="Save"
                >
                  <Bookmark size={20} fill={isSaved ? 'currentColor' : 'none'} />
                  <span>{post.save_count}</span>
                </button>
                <button
                  onClick={handleShare}
                  className="community-post-action"
                  aria-label="Share"
                >
                  <Share2 size={20} />
                  <span>{shareCount}</span>
                </button>
              </div>
      </div>
      <ShareModal
        postId={post.id}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        onShareSuccess={handleShareSuccess}
      />
    </>
  );
}
