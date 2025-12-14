'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useTransition } from 'react';

// Styles for the apply button (from Uiverse.io by satyamchaudharydev)
const applyButtonStyles = `
  .pantry-apply-button {
    position: relative;
    transition: all 0.3s ease-in-out;
    box-shadow: 0px 10px 20px rgba(0, 0, 0, 0.2);
    padding-block: 0.3rem;
    padding-inline: 2rem;
    min-width: 220px;
    width: auto;
    background-color: rgb(0 107 179);
    border-radius: 9999px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffff;
    gap: 10px;
    font-weight: bold;
    border: 3px solid #ffffff4d;
    outline: none;
    overflow: hidden;
    font-size: 15px;
    cursor: pointer;
  }

  .pantry-apply-button .icon {
    width: 24px;
    height: 24px;
    transition: all 0.3s ease-in-out;
  }

  .pantry-apply-button:hover {
    transform: scale(1.05);
    border-color: #fff9;
  }

  .pantry-apply-button:hover .icon {
    transform: translate(4px);
  }

  .pantry-apply-button:hover::before {
    animation: shine 1.5s ease-out infinite;
  }

  .pantry-apply-button::before {
    content: "";
    position: absolute;
    width: 100px;
    height: 100%;
    background-image: linear-gradient(
      120deg,
      rgba(255, 255, 255, 0) 30%,
      rgba(255, 255, 255, 0.8),
      rgba(255, 255, 255, 0) 70%
    );
    top: 0;
    left: -100px;
    opacity: 0.6;
  }

  @keyframes shine {
    0% {
      left: -100px;
    }

    60% {
      left: 100%;
    }

    to {
      left: 100%;
    }
  }
`;

// Styles for the clear all button (from Uiverse.io by ernestnash)
const clearButtonStyles = `
  .pantry-clear-button {
    display: inline-block;
    padding-block: 0.3rem;
    padding-inline: 1.5rem;
    min-width: 150px;
    width: auto;
    font-size: 16px;
    font-weight: 700;
    color: white;
    border: 3px solid rgb(252, 70, 100);
    cursor: pointer;
    position: relative;
    background-color: transparent;
    text-decoration: none;
    overflow: hidden;
    z-index: 1;
    font-family: inherit;
    border-radius: 9999px;
  }

  .pantry-clear-button::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: rgb(252, 70, 100);
    transform: translateX(-100%);
    transition: all .3s;
    z-index: -1;
    border-radius: 9999px;
  }

  .pantry-clear-button:hover::before {
    transform: translateX(0);
  }
`;

const CATEGORIES = ['Produce', 'Dairy', 'Pantry', 'Meat', 'Frozen', 'Spices', 'Other'];
const LOCATIONS = ['Pantry', 'Fridge', 'Freezer'];
const EXPIRY_STATUSES = [
  { value: '', label: 'N/A' },
  { value: 'expired', label: 'Expired' },
  { value: 'expiring_soon', label: 'Expiring Soon (≤3d)' },
  { value: 'expiring_week', label: 'Expiring Week (≤7d)' },
  { value: 'no_expiry', label: 'No Expiry' },
];
const SORT_OPTIONS = [
  { value: '', label: 'N/A' },
  { value: 'expiry_soonest', label: 'Expiry Soonest' },
  { value: 'name_az', label: 'Name A-Z' },
  { value: 'recent', label: 'Recently Added' },
  { value: 'quantity_desc', label: 'Quantity (High to Low)' },
];

interface PantryFiltersProps {
  search: string;
  category?: string;
  location?: string;
  expiry_status?: string;
  opened_only: boolean;
  sort_by: string;
}

export default function PantryFilters({
  search: initialSearch,
  category: initialCategory,
  location: initialLocation,
  expiry_status: initialExpiryStatus,
  opened_only: initialOpenedOnly,
  sort_by: initialSortBy,
}: PantryFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(initialSearch);
  const [category, setCategory] = useState(initialCategory || '');
  const [location, setLocation] = useState(initialLocation || '');
  const [expiryStatus, setExpiryStatus] = useState(initialExpiryStatus || '');
  const [openedOnly, setOpenedOnly] = useState(initialOpenedOnly);
  const [sortBy, setSortBy] = useState(initialSortBy || '');

  // Sync state with URL params when they change externally
  useEffect(() => {
    const urlSearch = searchParams.get('search') || '';
    const urlCategory = searchParams.get('category') || '';
    const urlLocation = searchParams.get('location') || '';
    const urlExpiryStatus = searchParams.get('expiry_status') || '';
    const urlOpenedOnly = searchParams.get('opened_only') === 'true';
    const urlSortBy = searchParams.get('sort_by') || '';

    console.log('PantryFilters - URL params changed:', {
      urlSearch,
      urlCategory,
      urlLocation,
      urlExpiryStatus,
      urlOpenedOnly,
      urlSortBy
    });

    // Update state from URL params
    setSearch(urlSearch);
    setCategory(urlCategory);
    setLocation(urlLocation);
    setExpiryStatus(urlExpiryStatus);
    setOpenedOnly(urlOpenedOnly);
    setSortBy(urlSortBy);
  }, [searchParams]);

  const updateFilters = (updates?: {
    search?: string;
    category?: string;
    location?: string;
    expiryStatus?: string;
    openedOnly?: boolean;
    sortBy?: string;
  }) => {
    const params = new URLSearchParams();
    const currentSearch = updates?.search !== undefined ? updates.search : search;
    const currentCategory = updates?.category !== undefined ? updates.category : category;
    const currentLocation = updates?.location !== undefined ? updates.location : location;
    const currentExpiryStatus = updates?.expiryStatus !== undefined ? updates.expiryStatus : expiryStatus;
    const currentOpenedOnly = updates?.openedOnly !== undefined ? updates.openedOnly : openedOnly;
    const currentSortBy = updates?.sortBy !== undefined ? updates.sortBy : sortBy;
    
    if (currentSearch && currentSearch.trim()) params.set('search', currentSearch.trim());
    if (currentCategory && currentCategory.trim()) params.set('category', currentCategory);
    if (currentLocation && currentLocation.trim()) params.set('location', currentLocation);
    if (currentExpiryStatus && currentExpiryStatus.trim()) params.set('expiry_status', currentExpiryStatus);
    if (currentOpenedOnly) params.set('opened_only', 'true');
    if (currentSortBy && currentSortBy.trim()) params.set('sort_by', currentSortBy);
    
    const queryString = params.toString();
    const newUrl = `/pantry${queryString ? `?${queryString}` : ''}`;
    
    console.log('updateFilters - Navigating to:', newUrl);
    console.log('updateFilters - Current filters:', {
      currentSearch,
      currentCategory,
      currentLocation,
      currentExpiryStatus,
      currentOpenedOnly,
      currentSortBy
    });
    
    // Use router.replace to update URL without adding to history, then refresh
    // Add a timestamp to bust cache and ensure server component re-renders
    const urlWithCacheBust = `${newUrl}${newUrl.includes('?') ? '&' : '?'}_t=${Date.now()}`;
    console.log('updateFilters - Final URL with cache bust:', urlWithCacheBust);
    
    // Force a full page reload to ensure server component receives new searchParams
    window.location.href = urlWithCacheBust;
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters();
  };

  const handleClearAllFilters = () => {
    // Reset all filter states
    setSearch('');
    setCategory('');
    setLocation('');
    setExpiryStatus('');
    setOpenedOnly(false);
    setSortBy('');
    
    // Navigate to base pantry URL with cache-busting
    const urlWithCacheBust = `/pantry?_t=${Date.now()}`;
    router.replace(urlWithCacheBust);
    setTimeout(() => {
      router.refresh();
    }, 100);
  };

  return (
    <div className="pantry-filters">
      <style>{applyButtonStyles}</style>
      <style>{clearButtonStyles}</style>
      {isPending && (
        <div style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          background: 'rgba(0, 0, 0, 0.3)', 
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none'
        }}>
          <div style={{ color: '#fff', fontSize: '14px' }}>Loading...</div>
        </div>
      )}
      <div className="pantry-filters-card">
        <form onSubmit={handleSearchSubmit} className="pantry-search-form">
          <div className="inputIcon" style={{ flex: 1 }}>
            <i>🔎</i>
            <input
              className="input"
              type="text"
              placeholder="Search by name, brand, or notes..."
              value={search}
              onChange={handleSearchChange}
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  const params = new URLSearchParams(searchParams.toString());
                  params.delete('search');
                  const newUrl = `/pantry${params.toString() ? `?${params.toString()}` : ''}`;
                  // Add cache-busting parameter and refresh
                  const urlWithCacheBust = `${newUrl}${newUrl.includes('?') ? '&' : '?'}_t=${Date.now()}`;
                  router.replace(urlWithCacheBust);
                  setTimeout(() => {
                    router.refresh();
                  }, 100);
                }}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(230, 237, 246, 0.6)',
                  fontSize: '18px',
                  cursor: 'pointer',
                  padding: '4px',
                  zIndex: 10
                }}
              >
                ✕
              </button>
            )}
          </div>
        </form>

        <div className="pantry-filters-row">
          <div className="pantry-filter-group">
            <label className="pantry-filter-label">Category</label>
            <select
              className="pantry-filter-select"
              value={category}
              onChange={(e) => {
                const newCategory = e.target.value || undefined;
                setCategory(newCategory || '');
                // Don't apply immediately - wait for Apply button
              }}
            >
              <option value="">N/A</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="pantry-filter-group">
            <label className="pantry-filter-label">Location</label>
            <select
              className="pantry-filter-select"
              value={location}
              onChange={(e) => {
                const newLocation = e.target.value || undefined;
                setLocation(newLocation || '');
                // Don't apply immediately - wait for Apply button
              }}
            >
              <option value="">N/A</option>
              {LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          <div className="pantry-filter-group">
            <label className="pantry-filter-label">Expiry Status</label>
            <select
              className="pantry-filter-select"
              value={expiryStatus}
              onChange={(e) => {
                const newExpiryStatus = e.target.value || undefined;
                setExpiryStatus(newExpiryStatus || '');
                // Don't apply immediately - wait for Apply button
              }}
            >
              {EXPIRY_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          <div className="pantry-filter-group">
            <label className="pantry-filter-label">Sort By</label>
            <select
              className="pantry-filter-select"
              value={sortBy}
              onChange={(e) => {
                const newSortBy = e.target.value || undefined;
                setSortBy(newSortBy || '');
                // Don't apply immediately - wait for Apply button
              }}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="pantry-filter-group">
            <div style={{
              padding: '0.6rem 1rem',
              background: 'white',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '45px'
            }}>
              <label className="pantry-filter-checkbox-label" style={{ margin: 0, cursor: 'pointer', color: 'black' }}>
                <input
                  type="checkbox"
                  checked={openedOnly}
                  onChange={(e) => {
                    const newOpenedOnly = e.target.checked;
                    setOpenedOnly(newOpenedOnly);
                    // Don't apply immediately - wait for Apply button
                  }}
                  className="pantry-filter-checkbox"
                />
                <span style={{ color: 'black' }}>Opened Only</span>
              </label>
            </div>
          </div>
        </div>

        <div className="pantry-filters-actions-row">
            <button
              type="button"
              onClick={handleSearchSubmit}
              className="pantry-apply-button"
              title="Apply all filters"
            >
              Apply Now
              <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm4.28 10.28a.75.75 0 000-1.06l-3-3a.75.75 0 10-1.06 1.06l1.72 1.72H8.25a.75.75 0 000 1.5h5.69l-1.72 1.72a.75.75 0 101.06 1.06l3-3z"
                  clipRule="evenodd"
                ></path>
              </svg>
            </button>
            <button
              type="button"
              onClick={handleClearAllFilters}
              className="pantry-clear-button"
              title="Clear all filters"
            >
              🗑️ Clear All
            </button>
        </div>
      </div>
    </div>
  );
}

