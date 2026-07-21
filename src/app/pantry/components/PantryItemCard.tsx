'use client';

import { PantryItem, fetchItemImage } from '../actions';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import PantryItemModal from './PantryItemModal';
import { deletePantryItem, snoozeExpiryReminder, addToShoppingList } from '../actions';
import { useRouter } from 'next/navigation';
import { getShoppingLists, createShoppingList } from '../../shopping-list/actions';
import type { ShoppingList } from '../../shopping-list/actions';

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
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [isLoadingLists, setIsLoadingLists] = useState(false);
  const [isAddingToList, setIsAddingToList] = useState(false);
  const [successMessage, setSuccessMessage] = useState<{ show: boolean; listName: string }>({ show: false, listName: '' });
  const [isMounted, setIsMounted] = useState(false);
  const [messagePosition, setMessagePosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const calculateDashboardMainCenter = () => {
    const dashboardMain = document.querySelector('.dashboard-main') as HTMLElement;
    if (dashboardMain) {
      const rect = dashboardMain.getBoundingClientRect();
      const centerTop = rect.top + rect.height / 2;
      const centerLeft = rect.left + rect.width / 2;
      setMessagePosition({ top: centerTop, left: centerLeft });
    } else {
      
      setMessagePosition({ top: window.innerHeight / 2, left: window.innerWidth / 2 });
    }
  };

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

  const loadShoppingLists = async () => {
    setIsLoadingLists(true);
    try {
      const lists = await getShoppingLists();
      setShoppingLists(lists);
    } catch (error) {
      console.error('Failed to load shopping lists:', error);
    } finally {
      setIsLoadingLists(false);
    }
  };

  const handleAddToShoppingList = async () => {
    await loadShoppingLists();
    setIsListModalOpen(true);
  };

  const handleSelectList = async (listId: string, listName: string) => {
    setIsAddingToList(true);
    try {
      const result = await addToShoppingList(item.id, listId);
      setIsListModalOpen(false);
      setIsAddingToList(false);
      
      calculateDashboardMainCenter();
      
      setSuccessMessage({ show: true, listName });
      
      setTimeout(() => {
        setSuccessMessage({ show: false, listName: '' });
        setMessagePosition(null);
      }, 3000);
      
      setTimeout(() => {
        onUpdate();
      }, 3500);
    } catch (error) {
      console.error('Failed to add to shopping list:', error);
      alert('Failed to add to shopping list. Please try again.');
      setIsAddingToList(false);
    }
  };

  const handleCreateNewList = async () => {
    setIsAddingToList(true);
    try {
      const newList = await createShoppingList({
        name: `Shopping List ${shoppingLists.length + 1}`,
        store: null,
        planned_date: null,
      });
      const newListName = `Shopping List ${shoppingLists.length + 1}`;
      const result = await addToShoppingList(item.id, newList.id);
      setIsListModalOpen(false);
      setIsAddingToList(false);
      
      calculateDashboardMainCenter();
      
      setSuccessMessage({ show: true, listName: newListName });
      
      setTimeout(() => {
        setSuccessMessage({ show: false, listName: '' });
        setMessagePosition(null);
      }, 3000);
      
      setTimeout(() => {
        onUpdate();
      }, 3500);
    } catch (error) {
      console.error('Failed to create list:', error);
      alert('Failed to create new list. Please try again.');
      setIsAddingToList(false);
    }
  };

  const handleFetchImage = async () => {
    setIsFetchingImage(true);
    try {
      const result = await fetchItemImage(item.id);
      if (result.success && result.image_url) {
        
        item.image_url = result.image_url;
        router.refresh();
      } else {
        
        const errorMsg = result.error || 'Could not find an image for this product. A placeholder image will be used.';
        console.warn('Image fetch warning:', errorMsg);
        
        router.refresh();
      }
    } catch (error: any) {
      console.error('Failed to fetch image:', error);
      
      router.refresh();
    } finally {
      setIsFetchingImage(false);
    }
  };

  const expiryMonth = expiryDate ? expiryDate.toLocaleString('default', { month: 'short' }).toUpperCase() : '';
  const expiryDay = expiryDate ? expiryDate.getDate() : '';

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
                  <button
                    className="pantry-item-action-btn-3d danger"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
                <button
                  className="pantry-add-to-list-icon"
                  onClick={handleAddToShoppingList}
                  title="Add this item to shopping list"
                >
                  <img 
                    src="/assets/add-to-list-icon.png" 
                    alt="Add to shopping list"
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'contain',
                      background: 'transparent'
                    }}
                  />
                </button>
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
                  <button
                    className="pantry-item-action-btn-3d danger"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
                <button
                  className="pantry-add-to-list-icon"
                  onClick={handleAddToShoppingList}
                  title="Add this item to shopping list"
                >
                  <img 
                    src="/assets/add-to-list-icon.png" 
                    alt="Add to shopping list"
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'contain',
                      background: 'transparent'
                    }}
                  />
                </button>
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

      {}
      {isListModalOpen && (
        <>
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              zIndex: 10000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onClick={() => setIsListModalOpen(false)}
          />
          <div 
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: '#1a1a1a',
              border: '2px solid rgba(103, 232, 249, 0.3)',
              borderRadius: '20px',
              padding: '24px',
              zIndex: 10001,
              minWidth: '400px',
              maxWidth: '500px',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: '700', margin: 0 }}>
                Select Shopping List
              </h3>
              <button
                onClick={() => setIsListModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '0',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', margin: '0 0 12px 0' }}>
                Choose a list to add "{item.name}" to:
              </p>
              
              {isLoadingLists ? (
                <div style={{ color: '#67e8f9', textAlign: 'center', padding: '20px' }}>
                  Loading lists...
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                  {shoppingLists.map((list) => (
                    <button
                      key={list.id}
                      onClick={() => handleSelectList(list.id, list.name)}
                      disabled={isAddingToList}
                      style={{
                        padding: '12px 16px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(103, 232, 249, 0.3)',
                        borderRadius: '8px',
                        color: '#fff',
                        cursor: isAddingToList ? 'not-allowed' : 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.3s ease',
                        opacity: isAddingToList ? 0.6 : 1
                      }}
                      onMouseEnter={(e) => {
                        if (!isAddingToList) {
                          e.currentTarget.style.background = 'rgba(103, 232, 249, 0.15)';
                          e.currentTarget.style.borderColor = 'rgba(103, 232, 249, 0.5)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isAddingToList) {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                          e.currentTarget.style.borderColor = 'rgba(103, 232, 249, 0.3)';
                        }
                      }}
                    >
                      <div style={{ fontWeight: '600', marginBottom: '4px' }}>{list.name}</div>
                      {list.store && (
                        <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                          Store: {list.store}
                        </div>
                      )}
                      <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                        {list.unpurchased_count || 0} items
                      </div>
                    </button>
                  ))}
                  
                  {shoppingLists.length === 0 && (
                    <div style={{ color: 'rgba(255, 255, 255, 0.5)', textAlign: 'center', padding: '20px' }}>
                      No shopping lists found
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <button
              onClick={handleCreateNewList}
              disabled={isAddingToList || isLoadingLists}
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(103, 232, 249, 0.2)',
                border: '1px solid rgba(103, 232, 249, 0.5)',
                borderRadius: '8px',
                color: '#67e8f9',
                cursor: (isAddingToList || isLoadingLists) ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                opacity: (isAddingToList || isLoadingLists) ? 0.6 : 1
              }}
              onMouseEnter={(e) => {
                if (!isAddingToList && !isLoadingLists) {
                  e.currentTarget.style.background = 'rgba(103, 232, 249, 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isAddingToList && !isLoadingLists) {
                  e.currentTarget.style.background = 'rgba(103, 232, 249, 0.2)';
                }
              }}
            >
              + Create New List
            </button>
          </div>
        </>
      )}

      {}
      {isMounted && successMessage.show && successMessage.listName && messagePosition && createPortal(
        <div 
          className="pantry-success-message"
          style={{
            position: 'fixed',
            top: `${messagePosition.top}px`,
            left: `${messagePosition.left}px`,
            transform: 'translate(-50%, -50%)',
            backgroundColor: '#22c55e',
            color: '#fff',
            padding: '24px 32px',
            borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(34, 197, 94, 0.5)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            minWidth: '400px',
            maxWidth: '500px',
            pointerEvents: 'none'
          }}
        >
          <span style={{ fontSize: '32px', flexShrink: 0 }}>✓</span>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontWeight: '700', fontSize: '18px' }}>
              Item added to "{successMessage.listName}" successfully!
            </div>
          </div>
        </div>,
        document.body
      )}

    </>
  );
}
