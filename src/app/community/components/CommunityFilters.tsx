'use client';

import React, { useState } from 'react';

interface CommunityFiltersProps {
  sort: 'new' | 'trending' | 'following';
  onSortChange: (sort: 'new' | 'trending' | 'following') => void;
  filterCuisine?: string;
  onCuisineChange: (cuisine: string) => void;
  filterDifficulty?: string;
  onDifficultyChange: (difficulty: string) => void;
  filterTime?: string;
  onTimeChange: (time: string) => void;
  filterServings?: string;
  onServingsChange: (servings: string) => void;
  filterDiet?: string[];
  onDietChange: (diet: string[]) => void;
  filterTags?: string[];
  onTagsChange: (tags: string[]) => void;
  search?: string;
  onSearchChange: (search: string) => void;
  onClearAll?: () => void;
}

const cuisines = ['Italian', 'Mexican', 'Asian', 'Indian', 'Mediterranean', 'American', 'French', 'Japanese', 'Thai', 'Chinese', 'Spanish', 'Greek', 'Middle Eastern', 'Korean', 'Vietnamese'];
const difficulties = ['easy', 'medium', 'hard'];
const timeRanges = [
  { value: 'quick', label: '⚡ Quick', max: 15 },
  { value: 'fast', label: '🚀 Fast', min: 15, max: 30 },
  { value: 'moderate', label: '⏱️ Moderate', min: 30, max: 60 },
  { value: 'long', label: '🍳 Long', min: 60 }
];
const servingsRanges = [
  { value: '1-2', label: '1-2', min: 1, max: 2 },
  { value: '3-4', label: '3-4', min: 3, max: 4 },
  { value: '5-6', label: '5-6', min: 5, max: 6 },
  { value: '7+', label: '7+', min: 7 }
];
const dietOptions = ['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Keto', 'Paleo', 'Low-Carb', 'High-Protein', 'Nut-Free', 'Halal', 'Kosher'];
const popularTags = ['Quick', 'Healthy', 'Comfort Food', 'Dessert', 'Breakfast', 'Lunch', 'Dinner', 'Snack', 'Appetizer', 'One-Pot', 'Meal Prep', 'Budget-Friendly', 'Gourmet', 'Kid-Friendly', 'Date Night'];

export default function CommunityFilters({
  sort,
  onSortChange,
  filterCuisine,
  onCuisineChange,
  filterDifficulty,
  onDifficultyChange,
  filterTime,
  onTimeChange,
  filterServings,
  onServingsChange,
  filterDiet = [],
  onDietChange,
  filterTags = [],
  onTagsChange,
  search,
  onSearchChange,
  onClearAll,
}: CommunityFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const hasActiveFilters = filterCuisine || filterDifficulty || filterTime || filterServings || filterDiet.length > 0 || filterTags.length > 0;

  const handleDietToggle = (diet: string) => {
    if (filterDiet.includes(diet)) {
      onDietChange(filterDiet.filter(d => d !== diet));
    } else {
      onDietChange([...filterDiet, diet]);
    }
  };

  const handleTagToggle = (tag: string) => {
    if (filterTags.includes(tag)) {
      onTagsChange(filterTags.filter(t => t !== tag));
    } else {
      onTagsChange([...filterTags, tag]);
    }
  };

  return (
    <div className="community-filters" style={{ marginBottom: '24px' }}>
      <div className="community-filters-card community-neon-card" style={{
        padding: 'var(--pad-lg)',
        borderRadius: '16px',
        background: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(20px) saturate(150%)',
        WebkitBackdropFilter: 'blur(20px) saturate(150%)',
        minHeight: '660px'
      }}>
        {}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ 
            margin: 0, 
            fontSize: 'var(--fs-md)', 
            fontWeight: 600,
            background: 'linear-gradient(135deg, var(--accent) 0%, rgba(147, 197, 253, 0.8) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            🔍 Filters
          </h3>
          {hasActiveFilters && onClearAll && (
            <button
              onClick={onClearAll}
              className="tap-ripple"
              style={{
                padding: '4px 10px',
                fontSize: 'var(--fs-xs)',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                color: 'var(--text)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Clear All
            </button>
          )}
        </div>

        {}
        <div className="community-filter-section" style={{ marginBottom: '12px' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="🔍 Search recipes, ingredients, or chefs..."
              value={search || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              className="input community-search-input"
              style={{ 
                width: '100%',
                padding: '10px 12px',
                fontSize: 'var(--fs-sm)',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border)',
                transition: 'all 0.3s ease'
              }}
            />
          </div>
        </div>

        {}
        <div className="community-filter-section" style={{ marginBottom: '12px' }}>
          <label className="community-filter-label" style={{ fontSize: 'var(--fs-sm)', marginBottom: '6px' }}>Sort by</label>
          <div className="community-filter-buttons" style={{ gap: '6px' }}>
            <button
              onClick={() => onSortChange('new')}
              className={`community-filter-btn ${sort === 'new' ? 'active' : ''}`}
              style={{ padding: '6px 12px', fontSize: 'var(--fs-xs)' }}
            >
              New
            </button>
            <button
              onClick={() => onSortChange('trending')}
              className={`community-filter-btn ${sort === 'trending' ? 'active' : ''}`}
              style={{ padding: '6px 12px', fontSize: 'var(--fs-xs)' }}
            >
              Trending
            </button>
            <button
              onClick={() => onSortChange('following')}
              className={`community-filter-btn ${sort === 'following' ? 'active' : ''}`}
              style={{ padding: '6px 12px', fontSize: 'var(--fs-xs)' }}
            >
              Following
            </button>
          </div>
        </div>

        {}
        <div className="community-filter-section" style={{ marginBottom: '12px' }}>
          <label className="community-filter-label" style={{ fontSize: 'var(--fs-sm)', marginBottom: '6px' }}>Cuisine</label>
          <div className="chip-row community-filter-chips" style={{ flexWrap: 'wrap', gap: '6px' }}>
            <button
              onClick={() => onCuisineChange('')}
              className={`chip tap-ripple community-filter-chip ${!filterCuisine ? 'active' : ''}`}
              style={{ padding: '4px 10px', fontSize: 'var(--fs-xs)' }}
            >
              <span className="chip-label">All</span>
            </button>
            {cuisines.slice(0, 10).map(cuisine => (
              <button
                key={cuisine}
                onClick={() => onCuisineChange(cuisine)}
                className={`chip tap-ripple community-filter-chip ${filterCuisine === cuisine ? 'active' : ''}`}
                style={{ padding: '4px 10px', fontSize: 'var(--fs-xs)' }}
              >
                <span className="chip-label">{cuisine}</span>
              </button>
            ))}
          </div>
        </div>

        {}
        <div className="community-filter-section" style={{ marginBottom: '12px' }}>
          <label className="community-filter-label" style={{ fontSize: 'var(--fs-sm)', marginBottom: '6px' }}>Difficulty</label>
          <div className="community-filter-buttons" style={{ gap: '6px' }}>
            <button
              onClick={() => onDifficultyChange('')}
              className={`community-filter-btn ${!filterDifficulty ? 'active' : ''}`}
              style={{ padding: '6px 12px', fontSize: 'var(--fs-xs)' }}
            >
              All
            </button>
            {difficulties.map(difficulty => (
              <button
                key={difficulty}
                onClick={() => onDifficultyChange(difficulty)}
                className={`community-filter-btn ${filterDifficulty === difficulty ? 'active' : ''}`}
                style={{ padding: '6px 12px', fontSize: 'var(--fs-xs)' }}
              >
                {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {}
        <div className="community-filter-section" style={{ marginBottom: '12px' }}>
          <label className="community-filter-label" style={{ fontSize: 'var(--fs-sm)', marginBottom: '6px' }}>⏱️ Time</label>
          <div className="community-filter-buttons" style={{ flexWrap: 'wrap', gap: '6px' }}>
            <button
              onClick={() => onTimeChange('')}
              className={`community-filter-btn ${!filterTime ? 'active' : ''}`}
              style={{ padding: '6px 10px', fontSize: 'var(--fs-xs)' }}
            >
              All
            </button>
            {timeRanges.map(range => (
              <button
                key={range.value}
                onClick={() => onTimeChange(range.value)}
                className={`community-filter-btn ${filterTime === range.value ? 'active' : ''}`}
                style={{ padding: '6px 10px', fontSize: 'var(--fs-xs)' }}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        {}
        <div className="community-filter-section" style={{ marginBottom: '12px' }}>
          <label className="community-filter-label" style={{ fontSize: 'var(--fs-sm)', marginBottom: '6px' }}>👥 Servings</label>
          <div className="community-filter-buttons" style={{ gap: '6px' }}>
            <button
              onClick={() => onServingsChange('')}
              className={`community-filter-btn ${!filterServings ? 'active' : ''}`}
              style={{ padding: '6px 12px', fontSize: 'var(--fs-xs)' }}
            >
              All
            </button>
            {servingsRanges.map(range => (
              <button
                key={range.value}
                onClick={() => onServingsChange(range.value)}
                className={`community-filter-btn ${filterServings === range.value ? 'active' : ''}`}
                style={{ padding: '6px 12px', fontSize: 'var(--fs-xs)' }}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        {}
        <div className="community-filter-section" style={{ marginBottom: '12px' }}>
          <label className="community-filter-label" style={{ fontSize: 'var(--fs-sm)', marginBottom: '6px' }}>🥗 Dietary</label>
          <div className="chip-row community-filter-chips" style={{ flexWrap: 'wrap', gap: '6px' }}>
            {dietOptions.slice(0, 8).map(diet => (
              <button
                key={diet}
                onClick={() => handleDietToggle(diet)}
                className={`chip tap-ripple community-filter-chip ${filterDiet.includes(diet) ? 'active' : ''}`}
                style={{ padding: '4px 10px', fontSize: 'var(--fs-xs)' }}
              >
                <span className="chip-label">{diet}</span>
              </button>
            ))}
          </div>
        </div>

        {}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="tap-ripple"
          style={{
            width: '100%',
            padding: '8px',
            marginBottom: showAdvanced ? '8px' : '0',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            color: 'var(--text)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 'var(--fs-xs)',
            transition: 'all 0.2s ease'
          }}
        >
          <span>🏷️ Tags & Categories</span>
          <span style={{ transform: showAdvanced ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
            ▼
          </span>
        </button>

        {}
        {showAdvanced && (
          <div className="community-filter-section" style={{ marginBottom: '12px' }}>
            <label className="community-filter-label" style={{ fontSize: 'var(--fs-sm)', marginBottom: '6px' }}>Popular Tags</label>
            <div className="chip-row community-filter-chips" style={{ flexWrap: 'wrap', gap: '6px' }}>
              {popularTags.slice(0, 12).map(tag => (
                <button
                  key={tag}
                  onClick={() => handleTagToggle(tag)}
                  className={`chip tap-ripple community-filter-chip ${filterTags.includes(tag) ? 'active' : ''}`}
                  style={{ padding: '4px 10px', fontSize: 'var(--fs-xs)' }}
                >
                  <span className="chip-label">{tag}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {}
        {hasActiveFilters && (
          <div style={{
            marginTop: '12px',
            padding: '8px',
            background: 'rgba(103, 232, 249, 0.1)',
            borderRadius: '6px',
            border: '1px solid rgba(103, 232, 249, 0.3)'
          }}>
            <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, marginBottom: '6px', color: 'var(--accent)' }}>
              Active:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', fontSize: 'var(--fs-xs)' }}>
              {filterCuisine && (
                <span style={{ padding: '3px 6px', background: 'rgba(103, 232, 249, 0.2)', borderRadius: '4px' }}>
                  {filterCuisine}
                </span>
              )}
              {filterDifficulty && (
                <span style={{ padding: '3px 6px', background: 'rgba(103, 232, 249, 0.2)', borderRadius: '4px' }}>
                  {filterDifficulty}
                </span>
              )}
              {filterTime && (
                <span style={{ padding: '3px 6px', background: 'rgba(103, 232, 249, 0.2)', borderRadius: '4px' }}>
                  {timeRanges.find(r => r.value === filterTime)?.label}
                </span>
              )}
              {filterServings && (
                <span style={{ padding: '3px 6px', background: 'rgba(103, 232, 249, 0.2)', borderRadius: '4px' }}>
                  {servingsRanges.find(r => r.value === filterServings)?.label}
                </span>
              )}
              {filterDiet.slice(0, 3).map(diet => (
                <span key={diet} style={{ padding: '3px 6px', background: 'rgba(103, 232, 249, 0.2)', borderRadius: '4px' }}>
                  {diet}
                </span>
              ))}
              {filterDiet.length > 3 && (
                <span style={{ padding: '3px 6px', background: 'rgba(103, 232, 249, 0.2)', borderRadius: '4px' }}>
                  +{filterDiet.length - 3}
                </span>
              )}
              {filterTags.slice(0, 3).map(tag => (
                <span key={tag} style={{ padding: '3px 6px', background: 'rgba(103, 232, 249, 0.2)', borderRadius: '4px' }}>
                  {tag}
                </span>
              ))}
              {filterTags.length > 3 && (
                <span style={{ padding: '3px 6px', background: 'rgba(103, 232, 249, 0.2)', borderRadius: '4px' }}>
                  +{filterTags.length - 3}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
