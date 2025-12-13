'use client';

import { PantryItem, createPantryItem, updatePantryItem } from '../actions';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'BRL', 'MXN', 'ZAR', 'KRW', 'SGD', 'HKD', 'NZD', 'SEK', 'NOK', 'DKK', 'PLN', 'RUB', 'TRY', 'THB', 'MYR', 'PHP', 'IDR', 'VND', 'Other'];

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
const LOCATIONS = ['Pantry', 'Fridge', 'Freezer'];
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

interface PantryItemModalProps {
  item?: PantryItem;
  onClose: () => void;
}

export default function PantryItemModal({ item, onClose }: PantryItemModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    name: item?.name || '',
    quantity: item?.quantity || 0,
    unit: item?.unit || 'pcs',
    category: item?.category || 'Other',
    location: item?.location || 'Pantry',
    expiry_date: item?.expiry_date || '',
    purchase_date: item?.purchase_date || '',
    is_opened: item?.is_opened || false,
    notes: item?.notes || '',
    price: item?.price || '',
    brand: item?.brand || '',
    is_running_low: item?.is_running_low || false,
    image_url: item?.image_url || '',
  });
  const [isFetchingImage, setIsFetchingImage] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleFetchImage = async () => {
    if (!formData.name.trim()) {
      alert('Please enter a product name first');
      return;
    }
    
    setIsFetchingImage(true);
    try {
      const response = await fetch(`/api/pantry/fetch-image?name=${encodeURIComponent(formData.name)}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      const data = await response.json();
      if (data.image_url) {
        setFormData({ ...formData, image_url: data.image_url });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    try {
      const data = {
        name: formData.name.trim(),
        quantity: Number(formData.quantity),
        unit: formData.unit,
        category: formData.category,
        location: formData.location,
        expiry_date: formData.expiry_date || null,
        purchase_date: formData.purchase_date || null,
        is_opened: formData.is_opened,
        notes: formData.notes.trim() || null,
        price: formData.price.trim() || null,
        brand: formData.brand.trim() || null,
        is_running_low: formData.is_running_low,
        image_url: formData.image_url.trim() || null,
      };

      if (item) {
        await updatePantryItem(item.id, data);
      } else {
        await createPantryItem(data);
      }

      router.refresh();
      onClose();
    } catch (error: any) {
      console.error('Form submission error:', error);
      if (error.errors) {
        const zodErrors: Record<string, string> = {};
        error.errors.forEach((err: any) => {
          if (err.path) {
            zodErrors[err.path[0]] = err.message;
          }
        });
        setErrors(zodErrors);
      } else {
        setErrors({ submit: error.message || 'Failed to save item. Please try again.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pantry-modal-overlay" onClick={onClose}>
      <div className="pantry-modal" onClick={(e) => e.stopPropagation()}>
        <div className="card-wrapper pantry-modal-card">
          <div className="card-background"></div>
          <div className="glass card card-mount">
            <div className="cardBody">
              <div className="pantry-modal-header">
                <h2 className="cardTitle">{item ? 'Edit Item' : 'Add New Item'}</h2>
                <button
                  className="btn ghost tap-ripple pantry-modal-close"
                  onClick={onClose}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="pantry-modal-form">
                <div className="pantry-form-row">
                  <div className="pantry-form-group" style={{ flex: 2 }}>
                    <label className="pantry-form-label">
                      Name <span className="pantry-form-required">*</span>
                    </label>
                    <input
                      className="input"
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      placeholder="e.g., Milk, Tomatoes, Flour"
                    />
                    {errors.name && <div className="pantry-form-error">{errors.name}</div>}
                  </div>

                  <div className="pantry-form-group">
                    <label className="pantry-form-label">
                      Quantity <span className="pantry-form-required">*</span>
                    </label>
                    <input
                      className="input"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                      required
                    />
                    {errors.quantity && <div className="pantry-form-error">{errors.quantity}</div>}
                  </div>

                  <div className="pantry-form-group">
                    <label className="pantry-form-label">Unit</label>
                    <select
                      className="input"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
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

                <div className="pantry-form-row">
                  <div className="pantry-form-group">
                    <label className="pantry-form-label">Category</label>
                    <select
                      className="input"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="pantry-form-group">
                    <label className="pantry-form-label">Location</label>
                    <select
                      className="input"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    >
                      {LOCATIONS.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pantry-form-row">
                  <div className="pantry-form-group">
                    <label className="pantry-form-label">Expiry Date</label>
                    <input
                      className="input"
                      type="date"
                      value={formData.expiry_date}
                      onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                    />
                  </div>

                  <div className="pantry-form-group">
                    <label className="pantry-form-label">Purchase Date</label>
                    <input
                      className="input"
                      type="date"
                      value={formData.purchase_date}
                      onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="pantry-form-row">
                  <div className="pantry-form-group">
                    <label className="pantry-form-label">Brand</label>
                    <input
                      className="input"
                      type="text"
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>

                  <div className="pantry-form-group">
                    <label className="pantry-form-label">Price</label>
                    <input
                      className="input"
                      type="text"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="e.g., $5.99 or 5.99"
                    />
                  </div>
                </div>

                <div className="pantry-form-row">
                  <div className="pantry-form-group" style={{ flex: 2 }}>
                    <label className="pantry-form-label">Product Image URL</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        className="input"
                        type="url"
                        value={formData.image_url}
                        onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                        placeholder="Image URL (auto-fetched if left empty)"
                        style={{ flex: 3 }}
                      />
                      <button
                        type="button"
                        onClick={handleFetchImage}
                        disabled={isFetchingImage || !formData.name.trim()}
                        className="btn"
                        style={{
                          padding: '12px 16px',
                          whiteSpace: 'nowrap',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          border: 'none',
                          borderRadius: '12px',
                          color: '#ffffff',
                          fontWeight: 600,
                          cursor: isFetchingImage || !formData.name.trim() ? 'not-allowed' : 'pointer',
                          opacity: isFetchingImage || !formData.name.trim() ? 0.6 : 1,
                          flex: 1,
                          minWidth: '120px',
                        }}
                      >
                        {isFetchingImage ? 'Fetching...' : 'Auto-fetch'}
                      </button>
                    </div>
                    <p style={{ fontSize: '12px', color: '#718096', marginTop: '4px' }}>
                      Leave empty to automatically fetch an image, or enter a custom URL
                    </p>
                  </div>
                </div>

                <div className="pantry-form-group">
                  <label className="pantry-form-label">Notes</label>
                  <textarea
                    className="input"
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Any additional notes..."
                  />
                </div>

                <div className="pantry-form-checkboxes">
                  <label className="pantry-form-checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.is_opened}
                      onChange={(e) => setFormData({ ...formData, is_opened: e.target.checked })}
                    />
                    <span>Item is opened</span>
                  </label>

                  <label className="pantry-form-checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.is_running_low}
                      onChange={(e) => setFormData({ ...formData, is_running_low: e.target.checked })}
                    />
                    <span>Running low (add to shopping list)</span>
                  </label>
                </div>

                {errors.submit && (
                  <div className="pantry-form-error" style={{ marginTop: '12px' }}>
                    {errors.submit}
                  </div>
                )}

                <div className="toolbar pantry-modal-toolbar">
                  <button
                    type="button"
                    className="btn ghost tap-ripple"
                    onClick={onClose}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn tap-ripple"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Saving...' : item ? 'Update' : 'Add Item'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

