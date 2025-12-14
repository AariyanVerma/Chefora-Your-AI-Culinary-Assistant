'use client';

import { useState, useTransition } from 'react';
import { ShoppingItem, updateShoppingItem, deleteShoppingItem } from '../actions';
import ShoppingItemModal from './ShoppingItemModal';

interface ShoppingItemCardProps {
  item: ShoppingItem;
  bulkMode: boolean;
  selected: boolean;
  onSelect: () => void;
  onUpdate: (shouldRefresh?: boolean) => void;
  compact?: boolean;
  listId: string;
  viewMode?: 'grouped' | 'list';
}

export default function ShoppingItemCard({
  item,
  bulkMode,
  selected,
  onSelect,
  onUpdate,
  compact = false,
  listId,
  viewMode = 'grouped',
}: ShoppingItemCardProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [optimisticPurchased, setOptimisticPurchased] = useState<boolean | null>(null);

  // Use optimistic state if available, otherwise use item state
  const displayPurchased = optimisticPurchased !== null ? optimisticPurchased : item.purchased;

  const handleTogglePurchased = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    const newPurchasedState = !displayPurchased;
    
    // Optimistically update the UI immediately
    setOptimisticPurchased(newPurchasedState);
    
    // Notify parent immediately to update local state (this calls handleItemUpdate, not router.refresh)
    onUpdate(false); // false = don't refresh yet
    
    // Update server in background
    startTransition(async () => {
      try {
        await updateShoppingItem(item.id, { purchased: newPurchasedState });
        // Clear optimistic state after successful update
        // The parent's state should already be updated via handleItemUpdate
        setOptimisticPurchased(null);
        // Now refresh server data in background to ensure sync
        // Use a small delay to ensure server has processed
        setTimeout(() => {
          onUpdate(true); // true = refresh now
        }, 200);
      } catch (error) {
        console.error('Failed to update item:', error);
        // Revert optimistic update on error
        setOptimisticPurchased(null);
        // Refresh to get correct state from server
        onUpdate(true); // true = refresh to get correct state
        alert('Failed to update item. Please try again.');
      }
    });
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) return;
    try {
      setIsDeleting(true);
      await deleteShoppingItem(item.id);
      onUpdate(true);
    } catch (error) {
      console.error('Failed to delete item:', error);
      alert('Failed to delete item. Please try again.');
      setIsDeleting(false);
    }
  };

  // Priority color mapping - similar to pantry expiry colors
  const priorityColor = 
    item.priority === 'high' ? '#ef4444' :
    item.priority === 'medium' ? '#fbbf24' :
    '#4ade80';

  const cardAccentColor = priorityColor;

  if (compact || viewMode === 'list') {
    return (
      <>
        <div className={`pantry-item-parent list-view ${displayPurchased ? 'purchased' : ''}`}>
          <div 
            className="pantry-item-card-3d list-view"
            style={{ 
              '--accent-color': cardAccentColor,
              '--card-bg-color': displayPurchased ? '#2a2a2a' : cardAccentColor
            } as any}
          >
            {/* Purchased checkbox - top left corner */}
            <div style={{ position: 'absolute', top: '2px', left: '2px', zIndex: 20 }}>
              <input
                type="checkbox"
                checked={displayPurchased}
                onChange={handleTogglePurchased}
                disabled={isPending}
                className="pantry-item-checkbox"
                style={{ width: '18px', height: '18px', cursor: isPending ? 'wait' : 'pointer' }}
              />
            </div>

            {/* Bulk mode checkbox - top left corner, slightly offset */}
            {bulkMode && (
              <div style={{ position: 'absolute', top: '2px', left: '26px', zIndex: 20 }}>
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={onSelect}
                  className="pantry-item-checkbox"
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </div>
            )}
            {/* Priority box - top right corner for list view */}
            <div className="pantry-item-date-box shopping-item-priority-box list-view-priority" style={{ '--priority-color': priorityColor, '--card-bg-color': priorityColor, '--accent-color': priorityColor } as any}>
              <div className="pantry-item-date-box-content" style={{ padding: '8px 4px', minHeight: '35px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span 
                  className="pantry-item-date shopping-priority-value" 
                  style={{ 
                    color: '#ffffff',
                    display: 'block', 
                    fontSize: '16px', 
                    fontWeight: 900,
                    textAlign: 'center',
                    width: '100%',
                    lineHeight: '1.2'
                  }}
                >
                  {(() => {
                    const priority = String(item.priority || 'medium').toUpperCase();
                    return priority === 'MEDIUM' ? 'MED' : priority;
                  })()}
                </span>
              </div>
            </div>

            {/* Image for list view */}
            {item.image_url ? (
              <div className="pantry-item-image-wrapper list-view-image">
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="pantry-item-image"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            ) : (
              <div className="pantry-item-image-placeholder list-view-image">
                <button
                  className="pantry-item-fetch-image-btn"
                  onClick={() => setIsEditModalOpen(true)}
                  disabled={false}
                  title="Add image"
                >
                  📷
                  <span>Add Image</span>
                </button>
              </div>
            )}

            <div className="pantry-item-content-box">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span className={`pantry-item-card-title ${displayPurchased ? 'strikethrough' : ''}`}>
                  {item.name}
                </span>
                {displayPurchased && (
                  <span className="shopping-item-status-badge">Purchased</span>
                )}
              </div>
              <p className="pantry-item-card-content">
                {item.quantity} {item.unit}
                {item.category && ` • ${item.category}`}
                {item.aisle && ` • ${item.aisle}`}
                {item.store && ` • ${item.store}`}
              </p>
              {item.price_est != null && (
                <p className="pantry-item-card-price">${Number(item.price_est).toFixed(2)}</p>
              )}
              {item.notes && (
                <p className="pantry-item-card-notes">{item.notes}</p>
              )}
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                <span className={`shopping-item-priority priority-${item.priority}`}>
                  {item.priority}
                </span>
                {item.pantry_item_id && (
                  <span className="shopping-item-pantry-link">✓ In Pantry</span>
                )}
              </div>
              <div className="pantry-item-actions-3d">
                <button
                  className="pantry-item-action-btn-3d"
                  onClick={() => setIsEditModalOpen(true)}
                >
                  Edit
                </button>
                <button
                  className="pantry-item-action-btn-3d danger"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
        {isEditModalOpen && (
          <ShoppingItemModal
            item={item}
            listId={listId}
            onClose={() => {
              setIsEditModalOpen(false);
              onUpdate();
            }}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className={`pantry-item-parent ${displayPurchased ? 'purchased' : ''}`}>
        <div 
          className="pantry-item-card-3d"
          style={{ 
            '--accent-color': cardAccentColor,
            '--card-bg-color': displayPurchased ? '#2a2a2a' : cardAccentColor
          } as any}
        >
          {/* Purchased checkbox - top left corner */}
          <div style={{ position: 'absolute', top: '8px', left: '8px', zIndex: 20 }}>
            <input
              type="checkbox"
              checked={displayPurchased}
              onChange={handleTogglePurchased}
              disabled={isPending}
              className="pantry-item-checkbox"
              style={{ width: '18px', height: '18px', cursor: isPending ? 'wait' : 'pointer' }}
            />
          </div>

          {/* Bulk mode checkbox - top left corner, slightly offset */}
          {bulkMode && (
            <div style={{ position: 'absolute', top: '8px', left: '32px', zIndex: 20 }}>
              <input
                type="checkbox"
                checked={selected}
                onChange={onSelect}
                className="pantry-item-checkbox"
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
            </div>
          )}
          
          {item.image_url ? (
            <div className="pantry-item-image-wrapper shopping-item-image-wrapper">
              <img
                src={item.image_url}
                alt={item.name}
                className="pantry-item-image"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          ) : (
            <div className="pantry-item-image-placeholder shopping-item-image-placeholder">
              <button
                className="pantry-item-fetch-image-btn"
                onClick={() => setIsEditModalOpen(true)}
                title="Add image"
              >
                📷
                <span>Add Image</span>
              </button>
            </div>
          )}

          {/* Priority box - top right corner */}
          <div className="pantry-item-date-box shopping-item-priority-box" style={{ '--priority-color': priorityColor, '--card-bg-color': priorityColor, '--accent-color': priorityColor } as any}>
            <div className="pantry-item-date-box-content" style={{ padding: '8px 4px', minHeight: '35px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span 
                className="pantry-item-date shopping-priority-value" 
                style={{ 
                  color: '#ffffff',
                  display: 'block', 
                  fontSize: '16px', 
                  fontWeight: 900,
                  textAlign: 'center',
                  width: '100%',
                  lineHeight: '1.2'
                }}
              >
                {(() => {
                  const priority = String(item.priority || 'medium').toUpperCase();
                  return priority === 'MEDIUM' ? 'MED' : priority;
                })()}
              </span>
            </div>
          </div>

          <div className="pantry-item-content-box shopping-item-content-box-adjust">
            <span className={`pantry-item-card-title ${displayPurchased ? 'strikethrough' : ''}`} style={{ marginBottom: '8px', display: 'block' }}>
              {item.name}
            </span>
            
            <p className="pantry-item-card-content">
              <strong>{item.quantity} {item.unit}</strong>
            </p>

            {item.category && (
              <p className="pantry-item-card-content" style={{ marginTop: '4px' }}>
                {item.category}
                {item.aisle && ` • ${item.aisle}`}
                {item.store && ` • ${item.store}`}
              </p>
            )}

            {item.price_est != null && (
              <p className="pantry-item-card-price" style={{ marginTop: '8px' }}>
                ${Number(item.price_est).toFixed(2)}
              </p>
            )}

            {item.notes && (
              <p className="pantry-item-card-notes" style={{ marginTop: '8px', fontSize: '12px' }}>
                📝 {item.notes}
              </p>
            )}

            <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
              <span className={`shopping-item-priority priority-${item.priority}`}>
                {item.priority.toUpperCase()}
              </span>
              {displayPurchased && (
                <span className="shopping-item-status-badge">Purchased</span>
              )}
              {item.pantry_item_id && (
                <span className="shopping-item-pantry-link" style={{ fontSize: '11px' }}>✓ In Pantry</span>
              )}
            </div>

            <div className="pantry-item-actions-3d" style={{ marginTop: '16px' }}>
              <button
                className="pantry-item-action-btn-3d"
                onClick={() => setIsEditModalOpen(true)}
              >
                Edit
              </button>
              <button
                className="pantry-item-action-btn-3d danger"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      </div>
      {isEditModalOpen && (
        <ShoppingItemModal
          item={item}
          listId={listId}
          onClose={() => {
            setIsEditModalOpen(false);
            onUpdate(true);
          }}
        />
      )}
    </>
  );
}



