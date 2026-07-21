'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, MessageCircle, Bookmark, Share2, Repeat2, ArrowLeft, Edit, Trash2, MoreVertical } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toggleLikePost, toggleSavePost, repostPost, createComment, deleteComment, deletePost, type CommunityPost, type CommunityComment } from '../actions';
import ShareModal from './ShareModal';
import CommentCard from './CommentCard';
import ImageCarousel from './ImageCarousel';
import { getPostTitleColor } from '../utils';

interface PostDetailProps {
  post: CommunityPost;
  initialComments: CommunityComment[];
  currentUserId?: string;
}

export default function PostDetail({ post, initialComments, currentUserId }: PostDetailProps) {
  const router = useRouter();
  const [isLiked, setIsLiked] = useState(post.is_liked);
  const [isSaved, setIsSaved] = useState(post.is_saved);
  const [isReposted, setIsReposted] = useState(post.is_reposted || false);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [repostCount, setRepostCount] = useState(post.repost_count);
  const [shareCount, setShareCount] = useState(post.share_count || 0);
  const [commentCount, setCommentCount] = useState(post.comment_count);
  const [comments, setComments] = useState<CommunityComment[]>(initialComments);
  const [showShareModal, setShowShareModal] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
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
            setCommentCount(counts.comment_count);
          }
        }
      } catch (error) {
        console.error('Failed to update counts:', error);
      }
    };

    const updateComments = async () => {
      try {
        const response = await fetch(`/api/community/comments?postId=${post.id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.comments) {
            setComments(data.comments);
          }
        }
      } catch (error) {
        console.error('Failed to update comments:', error);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateCounts();
        updateComments();
        intervalId = setInterval(() => {
          updateCounts();
          updateComments();
        }, 1000); 
      } else {
        if (intervalId) clearInterval(intervalId);
      }
    };

    if (document.visibilityState === 'visible') {
      updateCounts();
      updateComments();
      intervalId = setInterval(() => {
        updateCounts();
        updateComments();
      }, 1000);
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [post.id]);

  const handleLike = async () => {
    
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

  const handleSave = async () => {
    lastActionTimeRef.current = Date.now();
    setIsSaved(!isSaved);
    try {
      await toggleSavePost(post.id);
    } catch (error) {
      setIsSaved(!isSaved);
    }
  };

  const handleRepost = async () => {
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

  const handleShare = () => {
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

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || submitting) return;

    setSubmitting(true);
    const commentContent = commentText.trim();
    setCommentText(''); 
    
    try {
      const result = await createComment({ post_id: post.id, content: commentContent });
      
      const [countsResponse, commentsResponse] = await Promise.all([
        fetch(`/api/community/post-counts?postIds=${post.id}`),
        fetch(`/api/community/comments?postId=${post.id}`)
      ]);
      
      if (countsResponse.ok) {
        const countsData = await countsResponse.json();
        const counts = countsData.counts[post.id];
        if (counts) {
          setCommentCount(counts.comment_count);
        }
      }
      
      if (commentsResponse.ok) {
        const commentsData = await commentsResponse.json();
        if (commentsData.comments) {
          setComments(commentsData.comments);
        }
      }
    } catch (error) {
      console.error('Failed to post comment:', error);
      alert('Failed to post comment. Please try again.');
      setCommentText(commentContent); 
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      await deletePost(post.id);
      router.push('/community');
    } catch (error) {
      console.error('Failed to delete post:', error);
      alert('Failed to delete post. Please try again.');
      setDeleting(false);
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

  React.useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.community-post-menu') && !target.closest('button[aria-label="Post options"]')) {
        setShowMenu(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showMenu]);

  return (
    <div className="community-post-detail">
      <button
        onClick={() => router.push('/community')}
        className="btn ghost tap-ripple"
        style={{ marginBottom: '16px' }}
      >
        <ArrowLeft size={16} style={{ marginRight: '8px' }} />
        Back
      </button>

      {}
      <div className="community-post-detail-card community-neon-card" style={{
        marginBottom: '24px',
        padding: 'var(--pad-lg)',
        borderRadius: '20px',
        background: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(20px) saturate(150%)',
        WebkitBackdropFilter: 'blur(20px) saturate(150%)'
      }}>
            {}
            <div className="community-post-header">
              <Link href={`/community/u/${post.author_username}`} className="community-post-author">
                <div className="community-avatar">
                  {post.author_avatar_url ? (
                    <Image
                      src={post.author_avatar_url}
                      alt={post.author_display_name}
                      width={48}
                      height={48}
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
                      onClick={() => setShowMenu(!showMenu)}
                      className="btn ghost tap-ripple"
                      style={{ padding: '4px 8px', minWidth: 'auto' }}
                      aria-label="Post options"
                    >
                      <MoreVertical size={18} />
                    </button>
                    {showMenu && (
                      <div className="community-post-menu" style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: '8px',
                        zIndex: 100,
                        minWidth: '160px'
                        }}>
                          <button
                            type="button"
                            onClick={() => {
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
                              transition: 'all 0.2s ease',
                              marginBottom: '4px'
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
                            onClick={() => {
                              setShowMenu(false);
                              handleDelete();
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
              </div>
            </div>

            {}
            {post.media_urls.length > 0 && (
              <div className="community-post-image-wrapper-large">
                <ImageCarousel
                  images={post.media_urls}
                  alt={post.title}
                  showIndicators={post.media_urls.length > 1}
                  showArrows={post.media_urls.length > 1}
                  className="community-image-carousel-large"
                />
              </div>
            )}

            {}
            <div className="community-post-content">
              <h1 className="cardTitle" style={{ marginBottom: '12px', fontSize: 'var(--fs-xl)', color: titleColor }}>
                {post.title}
              </h1>
              {post.caption && (
                <p className="subtitle" style={{ marginBottom: '16px', color: 'var(--muted)', lineHeight: '1.6' }}>
                  {post.caption}
                </p>
              )}

              {}
              {post.recipe && (
                <div className="chip-row" style={{ marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
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

              {}
              {post.recipe && (
                <div className="community-recipe-details">
                  {post.recipe.ingredients && post.recipe.ingredients.length > 0 && (
                    <div className="community-recipe-section">
                      <h3 className="cardTitle" style={{ fontSize: 'var(--fs-md)', marginBottom: '8px' }}>
                        Ingredients
                      </h3>
                      <ul className="community-recipe-list">
                        {post.recipe.ingredients.map((ingredient, i) => (
                          <li key={i} className="subtitle" style={{ marginBottom: '4px' }}>
                            {ingredient}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {post.recipe.instructions && post.recipe.instructions.length > 0 && (
                    <div className="community-recipe-section" style={{ marginTop: '16px' }}>
                      <h3 className="cardTitle" style={{ fontSize: 'var(--fs-md)', marginBottom: '8px' }}>
                        Instructions
                      </h3>
                      <ol className="community-recipe-list">
                        {post.recipe.instructions.map((instruction, i) => (
                          <li key={i} className="subtitle" style={{ marginBottom: '8px', lineHeight: '1.6' }}>
                            {instruction}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              )}
            </div>

            {}
            <div className="community-post-actions" style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
              <button
                onClick={handleLike}
                className={`community-post-action ${isLiked ? 'active' : ''}`}
                aria-label="Like"
                style={{ color: '#ef4444' }}
              >
                <Heart size={20} fill={isLiked ? '#ef4444' : 'none'} />
                <span>{likeCount}</span>
              </button>
              <button className="community-post-action" aria-label="Comment">
                <MessageCircle size={20} />
                <span>{commentCount}</span>
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

      {}
      <div className="community-comments-section community-neon-card" style={{ 
        marginTop: '24px',
        padding: 'var(--pad-lg)',
        borderRadius: '20px',
        background: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(20px) saturate(150%)',
        WebkitBackdropFilter: 'blur(20px) saturate(150%)'
      }}>
        <h2 className="cardTitle" style={{ 
          fontSize: 'var(--fs-lg)', 
          marginBottom: '16px',
          color: '#67e8f9',
          textShadow: '0 0 10px rgba(103, 232, 249, 0.5), 0 0 20px rgba(103, 232, 249, 0.3)'
        }}>
          Comments ({comments.length})
        </h2>

        {}
        <form onSubmit={handleSubmitComment} className="community-comment-form">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            className="input"
            placeholder="Write a comment..."
            rows={3}
            style={{ marginBottom: '12px', width: '90%' }}
          />
          <button
            type="submit"
            className="btn tap-ripple"
            disabled={!commentText.trim() || submitting}
          >
            {submitting ? 'Posting...' : 'Post Comment'}
          </button>
        </form>

        {}
        <div className="community-comments-list" style={{ marginTop: '24px' }}>
          {comments.length === 0 ? (
            <p className="subtitle" style={{ color: 'var(--muted)', textAlign: 'center', padding: '24px' }}>
              No comments yet. Be the first to comment!
            </p>
          ) : (
            comments.map(comment => (
              <CommentCard
                key={comment.id}
                comment={{...comment, author_id: comment.author_id || ''}}
                currentUserId={currentUserId}
                onDelete={async () => {
                  try {
                    const result = await deleteComment(comment.id);
                    
                    const [countsResponse, commentsResponse] = await Promise.all([
                      fetch(`/api/community/post-counts?postIds=${post.id}`),
                      fetch(`/api/community/comments?postId=${post.id}`)
                    ]);
                    
                    if (countsResponse.ok) {
                      const countsData = await countsResponse.json();
                      const counts = countsData.counts[post.id];
                      if (counts) {
                        setCommentCount(counts.comment_count);
                      }
                    }
                    
                    if (commentsResponse.ok) {
                      const commentsData = await commentsResponse.json();
                      if (commentsData.comments) {
                        setComments(commentsData.comments);
                      }
                    }
                  } catch (error) {
                    console.error('Failed to delete comment:', error);
                    alert('Failed to delete comment. Please try again.');
                  }
                }}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
