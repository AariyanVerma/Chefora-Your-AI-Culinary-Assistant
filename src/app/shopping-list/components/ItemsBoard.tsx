'use client';

import { useState } from 'react';
import { ShoppingItem } from '../actions';
import ShoppingItemCard from './ShoppingItemCard';

interface ItemsBoardProps {
  items: ShoppingItem[];
  viewMode: 'grouped' | 'list';
  onViewModeChange: (mode: 'grouped' | 'list') => void;
  selectedItems: Set<string>;
  onSelectionChange: (selected: Set<string>) => void;
  bulkMode: boolean;
  onRefresh: () => void;
  onItemUpdate?: (itemId: string, updates: Partial<ShoppingItem>) => void;
  listId: string;
  onAddItem?: () => void;
}

export default function ItemsBoard({
  items,
  viewMode,
  onViewModeChange,
  selectedItems,
  onSelectionChange,
  bulkMode,
  onRefresh,
  onItemUpdate,
  listId,
  onAddItem,
}: ItemsBoardProps) {

  const toggleSelect = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    onSelectionChange(newSelected);
  };

  const selectAll = () => {
    if (selectedItems.size === items.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(items.map(item => item.id)));
    }
  };

  // Group items by category/aisle for grouped view
  const groupedItems = viewMode === 'grouped' ? items.reduce((acc, item) => {
    const groupKey = item.category || item.aisle || 'Other';
    if (!acc[groupKey]) {
      acc[groupKey] = [];
    }
    acc[groupKey].push(item);
    return acc;
  }, {} as Record<string, ShoppingItem[]>) : {};

  if (items.length === 0) {
    return (
      <div className="shopping-items-empty">
        {/* Background card - full width */}
        <div className="shopping-empty-background-card"></div>
        {/* Foreground card */}
        <div className="card-wrapper">
          <div className="card-background"></div>
          <div className="glass card card-mount">
            <div className="cardBody">
              <div className="shopping-empty-card">
                <div className="shopping-empty-icon">📝</div>
                <h2 className="cardTitle">No Items Yet</h2>
                <p className="subtitle">Add items to your shopping list to get started!</p>
                {onAddItem && (
                  <button
                    className="shopping-btn shopping-btn-primary"
                    onClick={onAddItem}
                    style={{ marginTop: '24px' }}
                  >
                    + Add New Item
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="shopping-items-board-content">
      <div className="shopping-items-header">
        <div className="shopping-items-header-left">
          <h3 className="shopping-items-title">
            {items.length} {items.length === 1 ? 'Item' : 'Items'}
          </h3>
          {bulkMode && (
            <button
              className="shopping-btn shopping-btn-link"
              onClick={selectAll}
            >
              {selectedItems.size === items.length ? 'Deselect All' : 'Select All'}
            </button>
          )}
        </div>
        <div className="shopping-view-toggle">
          <button
            className={`shopping-view-btn ${viewMode === 'grouped' ? 'active' : ''}`}
            onClick={() => onViewModeChange('grouped')}
            title="Grouped View"
          >
            ⊞ Grouped
          </button>
          <button
            className={`shopping-view-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => onViewModeChange('list')}
            title="List View"
          >
            ☰ List
          </button>
        </div>
      </div>

      {viewMode === 'grouped' ? (
        <div className="shopping-items-grouped">
          {Object.entries(groupedItems).map(([groupName, groupItems]) => (
            <div key={groupName} className="shopping-item-group">
              <h4 className="shopping-item-group-title">
                {groupName} ({groupItems.length})
              </h4>
              <div className="shopping-items-grid">
                {groupItems.map((item, index) => (
                  <div key={item.id} className="shopping-item-wrapper card-mount" style={{ '--i': index } as React.CSSProperties}>
                    <ShoppingItemCard
                      item={item}
                      bulkMode={bulkMode}
                      selected={selectedItems.has(item.id)}
                      onSelect={() => toggleSelect(item.id)}
                      onUpdate={(shouldRefresh = false) => {
                        if (onItemUpdate) {
                          // Optimistically update the item immediately
                          onItemUpdate(item.id, { purchased: !item.purchased });
                        }
                        // Only refresh if explicitly requested (after server update completes)
                        if (shouldRefresh) {
                          onRefresh();
                        }
                      }}
                      listId={listId}
                      viewMode={viewMode}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="shopping-items-list">
          {items.map((item, index) => (
            <div key={item.id} className="shopping-item-wrapper card-mount" style={{ '--i': index } as React.CSSProperties}>
              <ShoppingItemCard
                item={item}
                bulkMode={bulkMode}
                selected={selectedItems.has(item.id)}
                onSelect={() => toggleSelect(item.id)}
                onUpdate={() => {
                  if (onItemUpdate) {
                    // Optimistically update the item immediately
                    onItemUpdate(item.id, { purchased: !item.purchased });
                  }
                  // Then refresh in background
                  onRefresh();
                }}
                compact
                listId={listId}
                viewMode={viewMode}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}



