'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/app/components/DashboardLayout';
import CommunityFeed from './components/CommunityFeed';
import CommunityFilters from './components/CommunityFilters';
import CommunitySidebar from './components/CommunitySidebar';
import { getPosts, type CommunityPost } from './actions';
import { getCurrentUser } from '@/lib/auth';
import Link from 'next/link';

export default function CommunityPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  const [feedContainerHeight, setFeedContainerHeight] = useState<number | null>(null);
  const filtersColumnRef = useRef<HTMLDivElement>(null);
  const feedContainerRef = useRef<HTMLDivElement>(null);

  const sort = (searchParams.get('sort') as 'new' | 'trending' | 'following') || 'new';
  const filterCuisine = searchParams.get('cuisine') || '';
  const filterDifficulty = searchParams.get('difficulty') || '';
  const search = searchParams.get('search') || '';

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // Get current user ID
        const userRes = await fetch('/api/auth/me');
        if (userRes.ok) {
          const userData = await userRes.json();
          setCurrentUserId(userData.user?.id);
        }

        // Load posts
        const data = await getPosts({
          sort,
          filter_cuisine: filterCuisine || undefined,
          filter_difficulty: filterDifficulty || undefined,
          search: search || undefined,
          page: 1,
          limit: 20,
        });
        setPosts(data);
      } catch (error) {
        console.error('Failed to load posts:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [sort, filterCuisine, filterDifficulty, search]);

  // Match feed container height to filter card height
  useEffect(() => {
    const updateFeedHeight = () => {
      if (filtersColumnRef.current && feedContainerRef.current) {
        const filterCard = filtersColumnRef.current.querySelector('.community-filters-card') as HTMLElement;
        if (filterCard) {
          const filterHeight = filterCard.offsetHeight;
          setFeedContainerHeight(filterHeight);
        }
      }
    };

    // Initial measurement
    if (!loading) {
      // Wait a bit for DOM to render
      const timeoutId = setTimeout(updateFeedHeight, 100);
      
      // Update on resize
      window.addEventListener('resize', updateFeedHeight);
      
      // Also update when loading completes
      updateFeedHeight();

      return () => {
        clearTimeout(timeoutId);
        window.removeEventListener('resize', updateFeedHeight);
      };
    }
  }, [loading]);

  const handleSortChange = (newSort: 'new' | 'trending' | 'following') => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', newSort);
    router.replace(`/community?${params.toString()}`, { scroll: false });
  };

  const handleCuisineChange = (cuisine: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (cuisine) {
      params.set('cuisine', cuisine);
    } else {
      params.delete('cuisine');
    }
    router.replace(`/community?${params.toString()}`, { scroll: false });
  };

  const handleDifficultyChange = (difficulty: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (difficulty) {
      params.set('difficulty', difficulty);
    } else {
      params.delete('difficulty');
    }
    router.replace(`/community?${params.toString()}`, { scroll: false });
  };

  const handleSearchChange = (searchValue: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (searchValue) {
      params.set('search', searchValue);
    } else {
      params.delete('search');
    }
    router.replace(`/community?${params.toString()}`, { scroll: false });
  };

  return (
    <DashboardLayout>
      <div className="container" style={{ paddingBottom: 0, marginBottom: 0 }}>
        {/* Header Section */}
        <div style={{ marginBottom: '32px' }}>
          <div className="community-header-card community-neon-card" style={{
            padding: 'var(--pad-lg)',
            borderRadius: '20px',
            background: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(20px) saturate(150%)',
            WebkitBackdropFilter: 'blur(20px) saturate(150%)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
              <div>
                <h1 className="cardTitle" style={{ 
                  fontSize: 'clamp(24px, 4vw, 36px)', 
                  marginBottom: '8px',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, var(--accent) 0%, rgba(147, 197, 253, 0.8) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  Community Feed
                </h1>
                <p className="subtitle" style={{ color: 'var(--muted)', fontSize: 'var(--fs-md)' }}>
                  Discover recipes from chefs around the world
                </p>
              </div>
              <Link href="/community/new">
                <button className="btn tap-ripple community-create-btn" style={{
                  background: 'linear-gradient(135deg, var(--accent) 0%, rgba(147, 197, 253, 0.8) 100%)',
                  border: 'none',
                  color: '#0b1220',
                  fontWeight: 600,
                  padding: '12px 24px',
                  borderRadius: '12px',
                  boxShadow: '0 4px 20px rgba(103, 232, 249, 0.3)',
                  transition: 'all 0.3s ease'
                }}>
                  + Create Post
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Sidebar - Below Header in Single Row */}
        <div style={{ marginBottom: '32px' }}>
          <CommunitySidebar />
        </div>

        {/* Main Layout - Filters and Feed */}
        <div className="community-layout-single-row">
          <div ref={filtersColumnRef} className="community-filters-column">
            <CommunityFilters
              sort={sort}
              onSortChange={handleSortChange}
              filterCuisine={filterCuisine}
              onCuisineChange={handleCuisineChange}
              filterDifficulty={filterDifficulty}
              onDifficultyChange={handleDifficultyChange}
              search={search}
              onSearchChange={handleSearchChange}
            />
          </div>
          <div 
            ref={feedContainerRef}
            className="community-feed-scrollable-container"
            style={feedContainerHeight ? { height: `${feedContainerHeight}px` } : {}}
          >
            <div className="community-main-column">
              {loading ? (
                <div className="community-loading">
                  <div className="community-neon-card" style={{
                    padding: 'var(--pad-lg)',
                    borderRadius: '16px',
                    background: 'rgba(0, 0, 0, 0.45)',
                    backdropFilter: 'blur(20px) saturate(150%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(150%)',
                    textAlign: 'center'
                  }}>
                    <p className="subtitle" style={{ color: 'var(--muted)' }}>Loading posts...</p>
                  </div>
                </div>
              ) : (
                <CommunityFeed initialPosts={posts} currentUserId={currentUserId} />
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

