'use client';

import { ShoppingItem, createShoppingItem, updateShoppingItem } from '../actions';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';

const CATEGORIES = [
  'Produce',
  'Dairy',
  'Pantry',
  'Meat',
  'Poultry',
  'Seafood',
  'Frozen',
  'Beverages',
  'Snacks',
  'Bakery',
  'Grains',
  'Cereal',
  'Pasta',
  'Rice',
  'Canned Goods',
  'Condiments',
  'Sauces',
  'Spices',
  'Herbs',
  'Oils',
  'Vinegar',
  'Nuts',
  'Seeds',
  'Dried Fruits',
  'Sweets',
  'Chocolate',
  'Coffee',
  'Tea',
  'Baby Food',
  'Pet Food',
  'Cleaning Supplies',
  'Personal Care',
  'Other'
];

const AISLES = [
  'Produce',
  'Dairy',
  'Meat & Seafood',
  'Deli',
  'Bakery',
  'Pantry',
  'Frozen Foods',
  'Beverages',
  'Snacks',
  'Health & Beauty',
  'Household',
  'Other'
];

const STORES = [
  'Walmart',
  'Target',
  'Whole Foods',
  'Kroger',
  'Costco',
  'Safeway',
  'Albertsons',
  'Publix',
  'Trader Joe\'s',
  'Aldi',
  'Lidl',
  'Other'
];

const UNIT_GROUPS = {
  'Count/Quantity': ['pcs', 'piece', 'unit', 'item'],
  'Weight (Metric)': ['g', 'gram', 'kg', 'kilogram', 'mg', 'milligram'],
  'Weight (Imperial)': ['oz', 'ounce', 'lb', 'pound'],
  'Volume/Liquid (Metric)': ['ml', 'milliliter', 'l', 'liter', 'litre'],
  'Volume/Liquid (Imperial)': ['fl oz', 'fluid ounce', 'cup', 'pint', 'pt', 'quart', 'qt', 'gallon', 'gal'],
  'Cooking Measurements': ['tbsp', 'tablespoon', 'tsp', 'teaspoon', 'tbs', 'tb', 'dash', 'pinch', 'handful'],
  'Length': ['cm', 'centimeter', 'm', 'meter', 'metre', 'in', 'inch', 'ft', 'foot'],
  'Area': ['sq cm', 'sq m', 'sq in', 'sq ft'],
  'Containers/Packages': ['pack', 'packet', 'box', 'bottle', 'can', 'jar', 'bag', 'container', 'tube', 'bar'],
  'Food-Specific': ['slice', 'serving', 'portion', 'bunch', 'head', 'clove', 'stalk', 'sprig', 'leaf', 'strip']
};

// Flatten for default value check
const UNITS = Object.values(UNIT_GROUPS).flat();

interface ShoppingItemModalProps {
  item?: ShoppingItem;
  listId: string;
  onClose: () => void;
}

export default function ShoppingItemModal({ item, listId, onClose }: ShoppingItemModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    name: item?.name || '',
    quantity: item?.quantity || 1,
    unit: item?.unit || 'pcs',
    category: item?.category || '',
    aisle: item?.aisle || '',
    store: item?.store || '',
    priority: item?.priority || 'medium' as 'low' | 'medium' | 'high',
    price_est: item?.price_est || undefined as number | undefined,
    notes: item?.notes || '',
    image_url: item?.image_url || '',
  });
  const [isFetchingImage, setIsFetchingImage] = useState(false);
  const [imageFetchCount, setImageFetchCount] = useState(0);
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const [suggestedPrice, setSuggestedPrice] = useState<{ price: number; confidence: string; priceRange?: { min: number; max: number } } | null>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleFetchImage = async (skip: number = 0) => {
    if (!formData.name.trim()) {
      alert('Please enter a product name first');
      return;
    }
    
    setIsFetchingImage(true);
    try {
      const params = new URLSearchParams({
        name: formData.name.trim(),
        ...(formData.quantity && { quantity: String(formData.quantity) }),
        ...(formData.unit && { unit: formData.unit }),
        ...(formData.category && { category: formData.category }),
        ...(formData.store && { store: formData.store }),
        ...(skip > 0 && { skip: String(skip) }),
      });
      
      const url = `/api/pantry/fetch-image?${params.toString()}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      const data = await response.json();
      if (data.image_url) {
        setFormData({ ...formData, image_url: data.image_url });
        if (skip === 0) {
          setImageFetchCount(1);
        } else {
          setImageFetchCount(prev => prev + 1);
        }
      } else {
        alert('Could not find an image for this product. Please try entering a URL manually.');
      }
    } catch (error: any) {
      console.error('Failed to fetch image:', error);
      const errorMessage = error.message || 'Unknown error occurred';
      alert(`Failed to fetch image: ${errorMessage}. Please try again or enter a URL manually.`);
    } finally {
      setIsFetchingImage(false);
    }
  };

  const handleFetchPrice = async () => {
    if (!formData.name.trim()) {
      alert('Please enter a product name first');
      return;
    }
    
    setIsFetchingPrice(true);
    setSuggestedPrice(null);
    
    try {
      const params = new URLSearchParams({
        name: formData.name.trim(),
        quantity: String(formData.quantity),
        unit: formData.unit,
        store: formData.store || '',
        category: formData.category || '',
      });

      const url = `/api/shopping-list/fetch-price?${params.toString()}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      const data = await response.json();
      if (data.price !== undefined) {
        setSuggestedPrice({
          price: data.price,
          confidence: data.confidence || 'low',
          priceRange: data.priceRange,
        });
      } else {
        alert('Could not find price information for this product. Please enter a price manually.');
      }
    } catch (error: any) {
      console.error('Failed to fetch price:', error);
      const errorMessage = error.message || 'Unknown error occurred';
      alert(`Failed to fetch price: ${errorMessage}. Please enter a price manually.`);
    } finally {
      setIsFetchingPrice(false);
    }
  };

  const handleAcceptPrice = () => {
    if (suggestedPrice) {
      setFormData({ ...formData, price_est: suggestedPrice.price });
      setSuggestedPrice(null);
    }
  };

  const handleDeclinePrice = () => {
    setSuggestedPrice(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    if (!formData.name.trim()) {
      setErrors({ name: 'Item name is required' });
      return;
    }

    setIsSubmitting(true);

    try {
      const data = {
        name: formData.name.trim(),
        quantity: Number(formData.quantity),
        unit: formData.unit,
        category: formData.category || undefined,
        aisle: formData.aisle || undefined,
        store: formData.store || undefined,
        priority: formData.priority,
        price_est: formData.price_est ? Number(formData.price_est) : undefined,
        notes: formData.notes.trim() || undefined,
        image_url: formData.image_url.trim() || undefined,
      };

      if (item) {
        await updateShoppingItem(item.id, data);
      } else {
        await createShoppingItem(listId, data);
      }
      
      router.refresh();
      onClose();
    } catch (error: any) {
      console.error('Failed to save item:', error);
      setErrors({ submit: error.message || 'Failed to save item. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    // Add body class when modal opens
    document.body.classList.add('shopping-modal-open');
    return () => {
      // Remove body class when modal closes
      document.body.classList.remove('shopping-modal-open');
    };
  }, []);

  if (typeof window === 'undefined') return null;

  const modalContent = (
    <>
      {/* Backdrop */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: typeof window !== 'undefined' && window.innerWidth > 968 ? 280 : 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9998,
          cursor: 'pointer'
        }}
        onClick={onClose}
      />
      {/* Modal */}
      <div className="shopping-modal shopping-item-modal" onClick={(e) => e.stopPropagation()}>
        <div className="shopping-modal-header">
          <h2>{item ? 'Edit Item' : 'Add New Item'}</h2>
          <button
            className="btn ghost tap-ripple pantry-modal-close"
            onClick={onClose}
            type="button"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="shopping-modal-form">
          <div className="shopping-form-row">
            <div className="shopping-form-group shopping-form-group-full">
              <label className="shopping-form-label">
                Item Name <span className="shopping-form-required">*</span>
              </label>
              <input
                type="text"
                className={`shopping-input ${errors.name ? 'shopping-input-error' : ''}`}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Milk, Bread, Chicken Breast"
                required
                disabled={isSubmitting}
              />
              {errors.name && <span className="shopping-form-error">{errors.name}</span>}
            </div>
          </div>

          <div className="shopping-form-row">
            <div className="shopping-form-group">
              <label className="shopping-form-label">Quantity</label>
              <input
                type="number"
                className="shopping-input"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) || 0 })}
                min="0"
                step="0.01"
                disabled={isSubmitting}
              />
            </div>

            <div className="shopping-form-group">
              <label className="shopping-form-label">Unit</label>
              <select
                className="shopping-select"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                disabled={isSubmitting}
              >
                {Object.entries(UNIT_GROUPS).map(([groupName, units]) => (
                  <optgroup key={groupName} label={groupName}>
                    {units.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          <div className="shopping-form-row">
            <div className="shopping-form-group">
              <label className="shopping-form-label">Category</label>
              <select
                className="shopping-select"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                disabled={isSubmitting}
              >
                <option value="">Select category</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="shopping-form-group">
              <label className="shopping-form-label">Aisle</label>
              <select
                className="shopping-select"
                value={formData.aisle}
                onChange={(e) => setFormData({ ...formData, aisle: e.target.value })}
                disabled={isSubmitting}
              >
                <option value="">Select aisle</option>
                {AISLES.map((aisle) => (
                  <option key={aisle} value={aisle}>
                    {aisle}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="shopping-form-row">
            <div className="shopping-form-group">
              <label className="shopping-form-label">Store</label>
              <select
                className="shopping-select"
                value={formData.store}
                onChange={(e) => setFormData({ ...formData, store: e.target.value })}
                disabled={isSubmitting}
              >
                <option value="">Select store</option>
                {STORES.map((store) => (
                  <option key={store} value={store}>
                    {store}
                  </option>
                ))}
              </select>
            </div>

            <div className="shopping-form-group">
              <label className="shopping-form-label">Priority</label>
              <select
                className="shopping-select"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'low' | 'medium' | 'high' })}
                disabled={isSubmitting}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div className="shopping-form-row">
            <div className="shopping-form-group shopping-form-group-full">
              <label className="shopping-form-label">Estimated Price ($)</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: '1', minWidth: '200px' }}>
                  <input
                    type="number"
                    className="shopping-input"
                    value={formData.price_est || ''}
                    onChange={(e) => setFormData({ ...formData, price_est: e.target.value ? Number(e.target.value) : undefined })}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    disabled={isSubmitting}
                    style={{ maxWidth: '300px' }}
                  />
                  {suggestedPrice && (
                    <div style={{
                      padding: '12px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(139, 92, 246, 0.1)',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: '600', color: '#8b5cf6' }}>
                          💰 Today's Estimated Price: ${suggestedPrice.price.toFixed(2)}
                        </span>
                        {suggestedPrice.confidence === 'high' && (
                          <span style={{ 
                            fontSize: '0.75rem', 
                            padding: '2px 6px', 
                            backgroundColor: 'rgba(34, 197, 94, 0.2)', 
                            color: '#22c55e',
                            borderRadius: '4px'
                          }}>
                            High Confidence
                          </span>
                        )}
                        {suggestedPrice.confidence === 'medium' && (
                          <span style={{ 
                            fontSize: '0.75rem', 
                            padding: '2px 6px', 
                            backgroundColor: 'rgba(251, 191, 36, 0.2)', 
                            color: '#fbbf24',
                            borderRadius: '4px'
                          }}>
                            Medium Confidence
                          </span>
                        )}
                        {suggestedPrice.confidence === 'low' && (
                          <span style={{ 
                            fontSize: '0.75rem', 
                            padding: '2px 6px', 
                            backgroundColor: 'rgba(239, 68, 68, 0.2)', 
                            color: '#ef4444',
                            borderRadius: '4px'
                          }}>
                            Low Confidence
                          </span>
                        )}
                      </div>
                      {suggestedPrice.priceRange && (
                        <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                          Price Range: ${suggestedPrice.priceRange.min.toFixed(2)} - ${suggestedPrice.priceRange.max.toFixed(2)}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                        <button
                          type="button"
                          className="shopping-btn shopping-btn-primary"
                          onClick={handleAcceptPrice}
                          disabled={isSubmitting}
                          style={{ fontSize: '0.875rem', padding: '6px 12px' }}
                        >
                          ✓ Accept
                        </button>
                        <button
                          type="button"
                          className="shopping-btn shopping-btn-secondary"
                          onClick={handleDeclinePrice}
                          disabled={isSubmitting}
                          style={{ fontSize: '0.875rem', padding: '6px 12px' }}
                        >
                          ✕ Decline
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="shopping-btn shopping-btn-secondary"
                  onClick={handleFetchPrice}
                  disabled={isFetchingPrice || !formData.name.trim() || isSubmitting}
                  title="Fetch today's current estimated price online"
                >
                  {isFetchingPrice ? '⏳' : '💰'} {isFetchingPrice ? 'Fetching...' : 'Fetch Price'}
                </button>
              </div>
            </div>
          </div>

          <div className="shopping-form-row">
            <div className="shopping-form-group shopping-form-group-full">
              <label className="shopping-form-label">Image URL</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  className="shopping-input"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="Enter image URL or click fetch to auto-detect"
                  disabled={isSubmitting}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="shopping-btn shopping-btn-secondary"
                  onClick={() => handleFetchImage(0)}
                  disabled={isFetchingImage || !formData.name.trim() || isSubmitting}
                  title="Auto-fetch product image"
                >
                  {isFetchingImage ? '⏳' : '📷'} {isFetchingImage ? 'Fetching...' : 'Fetch'}
                </button>
                {formData.image_url && (
                  <button
                    type="button"
                    className="shopping-btn shopping-btn-secondary"
                    onClick={() => handleFetchImage(imageFetchCount)}
                    disabled={isFetchingImage || !formData.name.trim() || isSubmitting}
                    title="Fetch a different/relevant image"
                  >
                    {isFetchingImage ? '⏳' : '🔄'} {isFetchingImage ? 'Fetching...' : 'Fetch New'}
                  </button>
                )}
              </div>
              {formData.image_url && (
                <div style={{ marginTop: '8px', borderRadius: '8px', overflow: 'hidden', maxWidth: '200px' }}>
                  <img
                    src={formData.image_url}
                    alt="Preview"
                    style={{ width: '100%', height: 'auto', display: 'block' }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="shopping-form-row">
            <div className="shopping-form-group shopping-form-group-full">
              <label className="shopping-form-label">Notes</label>
              <textarea
                className="shopping-textarea"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="e.g., get lactose-free, organic preferred, large size"
                rows={3}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {errors.submit && (
            <div className="shopping-form-error-message">{errors.submit}</div>
          )}

          <div className="shopping-modal-actions">
            <button
              type="button"
              className="shopping-btn shopping-btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="shopping-btn shopping-btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : item ? 'Update Item' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
}



