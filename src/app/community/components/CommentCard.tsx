'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, Trash2 } from 'lucide-react';
import { toggleLikeComment } from '../actions';

interface CommentCardProps {
  comment: {
    id: string;
    author_id: string;
    author_username: string;
    author_display_name: string;
    author_avatar_url: string | null;
    content: string;
    like_count: number;
    created_at: string;
    is_liked: boolean;
    replies: any[];
  };
  onDelete?: () => void;
  currentUserId?: string;
}

export default function CommentCard({ comment, onDelete, currentUserId }: CommentCardProps) {
  const isOwn = currentUserId === comment.author_id;
  const [isLiked, setIsLiked] = useState(comment.is_liked);
  const [likeCount, setLikeCount] = useState(comment.like_count);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newLikedState = !isLiked;
    setIsLiked(newLikedState);
    setLikeCount(prev => {
      const newCount = newLikedState ? prev + 1 : Math.max(0, prev - 1);
      return newCount;
    });
    try {
      const result = await toggleLikeComment(comment.id);
      if (result?.like_count !== undefined) {
        setLikeCount(result.like_count);
        setIsLiked(result.is_liked);
      }
    } catch (error) {
      setIsLiked(!newLikedState);
      setLikeCount(comment.like_count);
      console.error('Failed to toggle comment like:', error);
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
    <div className="community-comment-card">
      <div className="community-comment-header">
        <Link href={`/u/${comment.author_username}`} className="community-comment-author">
          <div className="community-avatar" style={{ width: '32px', height: '32px' }}>
            {comment.author_avatar_url ? (
              <Image
                src={comment.author_avatar_url}
                alt={comment.author_display_name}
                width={32}
                height={32}
                className="community-avatar-img"
                unoptimized
              />
            ) : (
              <div className="community-avatar-placeholder">
                {comment.author_display_name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="community-comment-author-info">
            <div className="community-comment-author-name">{comment.author_display_name}</div>
            <div className="community-comment-time">{formatTimeAgo(comment.created_at)}</div>
          </div>
        </Link>
        {isOwn && onDelete && (
          <button
            onClick={onDelete}
            className="community-comment-delete"
            aria-label="Delete comment"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
      <div className="community-comment-content">
        <p className="subtitle" style={{ lineHeight: '1.6', marginBottom: '8px' }}>
          {comment.content}
        </p>
        <div className="community-comment-actions">
          <button
            onClick={handleLike}
            className={`community-comment-action ${isLiked ? 'active' : ''}`}
            aria-label="Like comment"
            style={{ color: '#ef4444' }}
          >
            <Heart size={16} fill={isLiked ? '#ef4444' : 'none'} />
            <span>{likeCount}</span>
          </button>
        </div>
      </div>
      {comment.replies && comment.replies.length > 0 && (
        <div className="community-comment-replies" style={{ marginLeft: '40px', marginTop: '12px' }}>
          {comment.replies.map(reply => (
            <CommentCard key={reply.id} comment={reply} isOwn={false} />
          ))}
        </div>
      )}
    </div>
  );
}

