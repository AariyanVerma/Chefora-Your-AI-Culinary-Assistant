'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import CommunityFeed from './components/CommunityFeed';
import CommunityFilters from './components/CommunityFilters';
import CommunitySidebar from './components/CommunitySidebar';
import MessagesModal from './components/MessagesModal';
import { getPosts, type CommunityPost } from './actions';
import Link from 'next/link';
import { Bell, MessageCircle } from 'lucide-react';

interface CommunityPageClientProps {
  currentUserId: string;
}

export default function CommunityPageClient({ currentUserId }: CommunityPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedContainerHeight, setFeedContainerHeight] = useState<number | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const filtersColumnRef = useRef<HTMLDivElement>(null);
  const feedContainerRef = useRef<HTMLDivElement>(null);

  const sort = (searchParams.get('sort') as 'new' | 'trending' | 'following') || 'new';
  const filterCuisine = searchParams.get('cuisine') || '';
  const filterDifficulty = searchParams.get('difficulty') || '';
  const filterTime = searchParams.get('time') || '';
  const filterServings = searchParams.get('servings') || '';
  const filterDiet = searchParams.get('diet') ? searchParams.get('diet')!.split(',') : [];
  const filterTags = searchParams.get('tags') ? searchParams.get('tags')!.split(',') : [];
  const search = searchParams.get('search') || '';

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        
        const data = await getPosts({
          sort,
          filter_cuisine: filterCuisine || undefined,
          filter_difficulty: filterDifficulty || undefined,
          filter_time: filterTime || undefined,
          filter_servings: filterServings || undefined,
          filter_diet: filterDiet.length > 0 ? filterDiet : undefined,
          filter_tags: filterTags.length > 0 ? filterTags : undefined,
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
  }, [sort, filterCuisine, filterDifficulty, filterTime, filterServings, filterDiet.join(','), filterTags.join(','), search]);

  useEffect(() => {
    async function fetchNotificationCount() {
      try {
        const res = await fetch('/api/community/notifications/count', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setNotificationCount(data.count || 0);
        }
      } catch (error) {
        console.error('Failed to fetch notification count:', error);
      }
    }

    fetchNotificationCount();
    
    const interval = setInterval(fetchNotificationCount, 5000);
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchNotificationCount();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    const handleNotificationsRead = () => {
      fetchNotificationCount();
    };
    window.addEventListener('notifications-read', handleNotificationsRead);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('notifications-read', handleNotificationsRead);
    };
  }, []);

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

    if (!loading) {
      
      const timeoutId = setTimeout(updateFeedHeight, 100);
      
      window.addEventListener('resize', updateFeedHeight);
      
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

  const handleTimeChange = (time: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (time) {
      params.set('time', time);
    } else {
      params.delete('time');
    }
    router.replace(`/community?${params.toString()}`, { scroll: false });
  };

  const handleServingsChange = (servings: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (servings) {
      params.set('servings', servings);
    } else {
      params.delete('servings');
    }
    router.replace(`/community?${params.toString()}`, { scroll: false });
  };

  const handleDietChange = (diet: string[]) => {
    const params = new URLSearchParams(searchParams.toString());
    if (diet.length > 0) {
      params.set('diet', diet.join(','));
    } else {
      params.delete('diet');
    }
    router.replace(`/community?${params.toString()}`, { scroll: false });
  };

  const handleTagsChange = (tags: string[]) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tags.length > 0) {
      params.set('tags', tags.join(','));
    } else {
      params.delete('tags');
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

  const handleClearAll = () => {
    router.replace('/community', { scroll: false });
  };

  return (
    <>
    <div className="container" style={{ padding: 'var(--pad-lg)' }}>
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
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <Link href="/community/friends" style={{ marginRight: '12px' }}>
                  <button className="btn ghost tap-ripple" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    <span>Friends</span>
                  </button>
                </Link>
                <button
                  onClick={() => setShowMessagesModal(true)}
                  className="btn ghost tap-ripple"
                  style={{ position: 'relative' }}
                  aria-label="Messages"
                >
                  <MessageCircle size={16} style={{ marginRight: '4px' }} />
                  Messages
                </button>
                <div style={{ position: 'relative' }}>
                  <Link href="/community/notifications">
                    <button className="btn ghost tap-ripple" style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}>
                      <Bell size={20} />
                    </button>
                  </Link>
                  {notificationCount > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: '-6px',
                      right: '-6px',
                      background: '#ef4444',
                      color: 'white',
                      borderRadius: '50%',
                      width: '20px',
                      height: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 600,
                      border: '2px solid var(--bg)',
                      boxShadow: '0 0 10px rgba(239, 68, 68, 0.8)',
                      zIndex: 10
                    }}>
                      {notificationCount > 99 ? '99+' : notificationCount}
                    </span>
                  )}
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
        </div>

        {}
        <div style={{ marginBottom: '32px' }}>
          <CommunitySidebar />
        </div>

        {}
        <div className="community-layout-single-row">
          <div ref={filtersColumnRef} className="community-filters-column">
            <CommunityFilters
              sort={sort}
              onSortChange={handleSortChange}
              filterCuisine={filterCuisine}
              onCuisineChange={handleCuisineChange}
              filterDifficulty={filterDifficulty}
              onDifficultyChange={handleDifficultyChange}
              filterTime={filterTime}
              onTimeChange={handleTimeChange}
              filterServings={filterServings}
              onServingsChange={handleServingsChange}
              filterDiet={filterDiet}
              onDietChange={handleDietChange}
              filterTags={filterTags}
              onTagsChange={handleTagsChange}
              search={search}
              onSearchChange={handleSearchChange}
              onClearAll={handleClearAll}
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

      {}
      <MessagesModal
        isOpen={showMessagesModal}
        onClose={() => setShowMessagesModal(false)}
      />
    </>
  );
}
