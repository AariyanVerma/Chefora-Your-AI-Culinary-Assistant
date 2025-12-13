'use client';

import { PantryItem, fetchItemImage } from '../actions';
import { useState } from 'react';
import PantryItemModal from './PantryItemModal';
import { deletePantryItem, snoozeExpiryReminder, addToShoppingList } from '../actions';
import { useRouter } from 'next/navigation';

interface PantryItemCardProps {
  item: PantryItem;
  onUpdate: () => void;
  viewMode?: 'grid' | 'list';
}

export default function PantryItemCard({ item, onUpdate, viewMode = 'grid' }: PantryItemCardProps) {
  const router = useRouter();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFetchingImage, setIsFetchingImage] = useState(false);

  const now = new Date();
  const expiryDate = item.expiry_date ? new Date(item.expiry_date) : null;
  const daysUntilExpiry = expiryDate
    ? Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  let expiryStatus: 'expired' | 'expiring_soon' | 'expiring_week' | 'safe' | 'no_expiry' = 'no_expiry';
  let expiryLabel = 'No expiry';
  let expiryColor = 'rgba(230, 237, 246, 0.6)';

  if (expiryDate) {
    if (daysUntilExpiry! < 0) {
      expiryStatus = 'expired';
      expiryLabel = `Expired ${Math.abs(daysUntilExpiry!)} day${Math.abs(daysUntilExpiry!) !== 1 ? 's' : ''} ago`;
      expiryColor = '#ef4444';
    } else if (daysUntilExpiry! <= 3) {
      expiryStatus = 'expiring_soon';
      expiryLabel = `Expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}`;
      expiryColor = '#fb923c';
    } else if (daysUntilExpiry! <= 7) {
      expiryStatus = 'expiring_week';
      expiryLabel = `Expires in ${daysUntilExpiry} days`;
      expiryColor = '#fbbf24';
    } else {
      expiryStatus = 'safe';
      expiryLabel = `Expires in ${daysUntilExpiry} days`;
      expiryColor = '#4ade80';
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) return;
    
    setIsDeleting(true);
    try {
      await deletePantryItem(item.id);
      router.refresh();
    } catch (error) {
      console.error('Failed to delete item:', error);
      alert('Failed to delete item. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSnooze = async () => {
    try {
      await snoozeExpiryReminder(item.id, 24);
      router.refresh();
    } catch (error) {
      console.error('Failed to snooze reminder:', error);
    }
  };

  const handleAddToShoppingList = async () => {
    try {
      await addToShoppingList(item.id);
      alert('Added to shopping list!');
    } catch (error) {
      console.error('Failed to add to shopping list:', error);
      alert('Failed to add to shopping list. Please try again.');
    }
  };

  const handleFetchImage = async () => {
    setIsFetchingImage(true);
    try {
      const result = await fetchItemImage(item.id);
      if (result.success && result.image_url) {
        // Update the item locally for immediate feedback
        item.image_url = result.image_url;
        router.refresh();
      } else {
        // Show a more user-friendly error message
        const errorMsg = result.error || 'Could not find an image for this product. A placeholder image will be used.';
        console.warn('Image fetch warning:', errorMsg);
        // Still refresh to show any placeholder that was set
        router.refresh();
      }
    } catch (error: any) {
      console.error('Failed to fetch image:', error);
      // Don't show alert for network errors, just log and refresh
      router.refresh();
    } finally {
      setIsFetchingImage(false);
    }
  };

  // Get month and date for expiry date box
  const expiryMonth = expiryDate ? expiryDate.toLocaleString('default', { month: 'short' }).toUpperCase() : '';
  const expiryDay = expiryDate ? expiryDate.getDate() : '';

  // Determine card accent color based on expiry status (same as card background)
  const cardAccentColor = 
    expiryStatus === 'expired' ? '#ef4444' :
    expiryStatus === 'expiring_soon' ? '#fb923c' :
    expiryStatus === 'expiring_week' ? '#fbbf24' :
    expiryStatus === 'safe' ? '#4ade80' :
    '#67e8f9';

  return (
    <>
      <div className={`pantry-item-parent ${viewMode === 'list' ? 'list-view' : ''}`}>
        <div 
          className={`pantry-item-card-3d ${expiryStatus} ${viewMode === 'list' ? 'list-view' : ''}`} 
          style={{ 
            '--accent-color': cardAccentColor,
            '--card-bg-color': cardAccentColor
          } as any}
        >
          {viewMode === 'list' ? (
            <>
              <div className="pantry-item-content-box">
                <span className="pantry-item-card-title">{item.name}</span>
                {item.brand && (
                  <p className="pantry-item-card-brand">{item.brand}</p>
                )}
                <p className="pantry-item-card-content">
                  {item.quantity} {item.unit} • {item.category} • {item.location}
                  {item.is_opened && ' • Opened'}
                </p>
                {item.price && (
                  <p className="pantry-item-card-price">
                    {(() => {
                      const num = parseFloat(item.price);
                      return isNaN(num) ? `$${item.price}` : `$${num.toFixed(2)}`;
                    })()}
                  </p>
                )}
                {item.notes && (
                  <p className="pantry-item-card-notes">{item.notes}</p>
                )}
                {expiryDate && (
                  <div className="pantry-item-expiry-info" style={{ color: expiryColor, backgroundColor: '#141414', padding: '4px 8px', borderRadius: '4px', display: 'inline-block' }}>
                    {expiryLabel}
                  </div>
                )}
                <div className="pantry-item-actions-3d">
                  <button
                    className="pantry-item-action-btn-3d"
                    onClick={() => setIsEditModalOpen(true)}
                  >
                    Edit
                  </button>
                  {(expiryStatus === 'expiring_soon' || expiryStatus === 'expired') && (
                    <button
                      className="pantry-item-action-btn-3d"
                      onClick={handleSnooze}
                      title="Snooze reminder for 24 hours"
                    >
                      Snooze
                    </button>
                  )}
                  {item.is_running_low && (
                    <button
                      className="pantry-item-action-btn-3d"
                      onClick={handleAddToShoppingList}
                    >
                      Add to List
                    </button>
                  )}
                  <button
                    className="pantry-item-action-btn-3d danger"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
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
                    onClick={handleFetchImage}
                    disabled={isFetchingImage}
                    title="Fetch product image"
                  >
                    {isFetchingImage ? '⏳' : '📷'}
                    <span>{isFetchingImage ? 'Fetching...' : 'Add Image'}</span>
                  </button>
                </div>
              )}
              {expiryDate && (
                <div className="pantry-item-date-box">
                  <div className="pantry-item-date-box-content">
                    <span className="pantry-item-month">{expiryMonth}</span>
                    <span className="pantry-item-date">{expiryDay}</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {item.image_url ? (
                <div className="pantry-item-image-wrapper">
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="pantry-item-image"
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'contain',
                      display: 'block'
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              ) : (
                <div className="pantry-item-image-placeholder">
                  <button
                    className="pantry-item-fetch-image-btn"
                    onClick={handleFetchImage}
                    disabled={isFetchingImage}
                    title="Fetch product image"
                  >
                    {isFetchingImage ? '⏳' : '📷'}
                    <span>{isFetchingImage ? 'Fetching...' : 'Add Image'}</span>
                  </button>
                </div>
              )}
              <div className="pantry-item-content-box">
                <span className="pantry-item-card-title">{item.name}</span>
                {item.brand && (
                  <p className="pantry-item-card-brand">{item.brand}</p>
                )}
                <p className="pantry-item-card-content">
                  {item.quantity} {item.unit} • {item.category} • {item.location}
                  {item.is_opened && ' • Opened'}
                </p>
                {item.price && (
                  <p className="pantry-item-card-price">
                    {(() => {
                      const num = parseFloat(item.price);
                      return isNaN(num) ? `$${item.price}` : `$${num.toFixed(2)}`;
                    })()}
                  </p>
                )}
                {item.notes && (
                  <p className="pantry-item-card-notes">{item.notes}</p>
                )}
                {expiryDate && (
                  <div className="pantry-item-expiry-info" style={{ color: expiryColor, backgroundColor: '#141414', padding: '4px 8px', borderRadius: '4px', display: 'inline-block' }}>
                    {expiryLabel}
                  </div>
                )}
                <div className="pantry-item-actions-3d">
                  <button
                    className="pantry-item-action-btn-3d"
                    onClick={() => setIsEditModalOpen(true)}
                  >
                    Edit
                  </button>
                  {(expiryStatus === 'expiring_soon' || expiryStatus === 'expired') && (
                    <button
                      className="pantry-item-action-btn-3d"
                      onClick={handleSnooze}
                      title="Snooze reminder for 24 hours"
                    >
                      Snooze
                    </button>
                  )}
                  {item.is_running_low && (
                    <button
                      className="pantry-item-action-btn-3d"
                      onClick={handleAddToShoppingList}
                    >
                      Add to List
                    </button>
                  )}
                  <button
                    className="pantry-item-action-btn-3d danger"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
              {expiryDate && (
                <div className="pantry-item-date-box">
                  <div className="pantry-item-date-box-content">
                    <span className="pantry-item-month">{expiryMonth}</span>
                    <span className="pantry-item-date">{expiryDay}</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {isEditModalOpen && (
        <PantryItemModal
          item={item}
          onClose={() => {
            setIsEditModalOpen(false);
            onUpdate();
          }}
        />
      )}
    </>
  );
}

