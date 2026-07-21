'use client';

import React, { useState, useEffect } from 'react';
import PostCard from './PostCard';
import { getPosts, type CommunityPost } from '../actions';

interface CommunityFeedProps {
  initialPosts?: CommunityPost[];
  currentUserId?: string;
}

export default function CommunityFeed({ initialPosts = [], currentUserId }: CommunityFeedProps) {
  const [posts, setPosts] = useState<CommunityPost[]>(initialPosts);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadMore = async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const newPosts = await getPosts({ page: page + 1, limit: 20 });
      if (newPosts.length === 0) {
        setHasMore(false);
      } else {
        setPosts(prev => [...prev, ...newPosts]);
        setPage(prev => prev + 1);
      }
    } catch (error) {
      console.error('Failed to load posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePostDelete = (postId: string) => {
    setPosts(prevPosts => prevPosts.filter(p => p.id !== postId));
  };

  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 1000) {
        loadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loading, hasMore, page]);

  if (posts.length === 0 && !loading) {
    return (
      <div className="community-empty-state">
        <div className="community-neon-card" style={{
          padding: 'var(--pad-lg)',
          borderRadius: '16px',
          background: 'rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(20px) saturate(150%)',
          WebkitBackdropFilter: 'blur(20px) saturate(150%)',
          textAlign: 'center'
        }}>
          <p className="subtitle" style={{ color: 'var(--muted)' }}>
            No posts yet. Be the first to share a recipe! 🍳
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="community-feed">
      {posts.map(post => (
        <PostCard key={post.id} post={post} currentUserId={currentUserId} onDelete={handlePostDelete} />
      ))}
      {loading && (
        <div className="community-loading" style={{ marginTop: '16px' }}>
          <div style={{
            padding: 'var(--pad-lg)',
            borderRadius: '16px',
            background: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(20px) saturate(150%)',
            WebkitBackdropFilter: 'blur(20px) saturate(150%)',
            border: '1px solid var(--border)',
            textAlign: 'center'
          }}>
            <p className="subtitle" style={{ color: 'var(--muted)' }}>Loading more posts...</p>
          </div>
        </div>
      )}
    </div>
  );
}
