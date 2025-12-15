'use client';

import React from 'react';

interface CommunityFiltersProps {
  sort: 'new' | 'trending' | 'following';
  onSortChange: (sort: 'new' | 'trending' | 'following') => void;
  filterCuisine?: string;
  onCuisineChange: (cuisine: string) => void;
  filterDifficulty?: string;
  onDifficultyChange: (difficulty: string) => void;
  search?: string;
  onSearchChange: (search: string) => void;
}

const cuisines = ['Italian', 'Mexican', 'Asian', 'Indian', 'Mediterranean', 'American', 'French', 'Japanese', 'Thai', 'Chinese'];
const difficulties = ['easy', 'medium', 'hard'];

export default function CommunityFilters({
  sort,
  onSortChange,
  filterCuisine,
  onCuisineChange,
  filterDifficulty,
  onDifficultyChange,
  search,
  onSearchChange,
}: CommunityFiltersProps) {
  return (
    <div className="community-filters" style={{ marginBottom: '24px' }}>
      <div className="community-filters-card community-neon-card" style={{
        padding: 'var(--pad-lg)',
        borderRadius: '16px',
        background: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(20px) saturate(150%)',
        WebkitBackdropFilter: 'blur(20px) saturate(150%)',
        minHeight: '705px'
      }}>
        {/* Search - Prominent */}
        <div className="community-filter-section" style={{ marginBottom: '20px' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="🔍 Search recipes, ingredients, or chefs..."
              value={search || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              className="input community-search-input"
              style={{ 
                width: '100%',
                padding: '14px 16px',
                fontSize: 'var(--fs-md)',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border)',
                transition: 'all 0.3s ease'
              }}
            />
          </div>
        </div>

        {/* Sort */}
        <div className="community-filter-section" style={{ marginBottom: '20px' }}>
          <label className="community-filter-label">Sort by</label>
          <div className="community-filter-buttons">
            <button
              onClick={() => onSortChange('new')}
              className={`community-filter-btn ${sort === 'new' ? 'active' : ''}`}
            >
              New
            </button>
            <button
              onClick={() => onSortChange('trending')}
              className={`community-filter-btn ${sort === 'trending' ? 'active' : ''}`}
            >
              Trending
            </button>
            <button
              onClick={() => onSortChange('following')}
              className={`community-filter-btn ${sort === 'following' ? 'active' : ''}`}
            >
              Following
            </button>
          </div>
        </div>

        {/* Cuisine Filter */}
        <div className="community-filter-section" style={{ marginBottom: '20px' }}>
          <label className="community-filter-label">Cuisine</label>
          <div className="chip-row community-filter-chips">
            <button
              onClick={() => onCuisineChange('')}
              className={`chip tap-ripple community-filter-chip ${!filterCuisine ? 'active' : ''}`}
            >
              <span className="chip-label">All</span>
            </button>
            {cuisines.map(cuisine => (
              <button
                key={cuisine}
                onClick={() => onCuisineChange(cuisine)}
                className={`chip tap-ripple community-filter-chip ${filterCuisine === cuisine ? 'active' : ''}`}
              >
                <span className="chip-label">{cuisine}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty Filter */}
        <div className="community-filter-section">
          <label className="community-filter-label">Difficulty</label>
          <div className="community-filter-buttons">
            <button
              onClick={() => onDifficultyChange('')}
              className={`community-filter-btn ${!filterDifficulty ? 'active' : ''}`}
            >
              All
            </button>
            {difficulties.map(difficulty => (
              <button
                key={difficulty}
                onClick={() => onDifficultyChange(difficulty)}
                className={`community-filter-btn ${filterDifficulty === difficulty ? 'active' : ''}`}
              >
                {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

