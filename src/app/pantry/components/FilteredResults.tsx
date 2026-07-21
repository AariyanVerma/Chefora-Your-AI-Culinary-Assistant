'use client';

import { PantryItem } from '../actions';
import PantryItemCard from './PantryItemCard';

interface FilteredResultsProps {
  items: PantryItem[];
}

export default function FilteredResults({ items }: FilteredResultsProps) {
  console.log('FilteredResults - items count:', items.length);
  
  if (items.length === 0) {
    return (
      <div className="pantry-filter-results-container">
        <div className="pantry-filter-results-card pantry-filter-results-empty">
          <div className="pantry-filter-results-header">
            <h3 className="pantry-filter-results-title">
              <span className="pantry-filter-results-icon">🔍</span>
              No Items Found
          </h3>
          </div>
          <div className="pantry-filter-results-content">
            <div className="pantry-filter-results-empty-message">
              <p className="pantry-filter-results-empty-text">
                No items match all your filter constraints.
              </p>
              <p className="pantry-filter-results-empty-hint">
                Try adjusting your filter criteria or click "Clear All" to see all items.
          </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pantry-filter-results-container">
      <div className="pantry-filter-results-card pantry-filter-results-success">
        <div className="pantry-filter-results-header">
          <div className="pantry-filter-results-count-badge">
            {items.length} {items.length === 1 ? 'Item' : 'Items'} Found
          </div>
          <h3 className="pantry-filter-results-title">
            <span className="pantry-filter-results-icon">✓</span>
            Filter Results
        </h3>
          <p className="pantry-filter-results-subtitle">
            Items that match all applied filter constraints
          </p>
        </div>
        <div className="pantry-filter-results-content">
          <div className="pantry-filter-results-grid">
          {items.map((item) => (
              <div key={item.id} className="pantry-item-wrapper">
              <PantryItemCard item={item} onUpdate={() => window.location.reload()} viewMode="grid" />
            </div>
          ))}
          </div>
        </div>
      </div>
    </div>
  );
}
