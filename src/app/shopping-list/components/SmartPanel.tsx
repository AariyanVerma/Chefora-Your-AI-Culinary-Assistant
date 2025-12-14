'use client';

import { useState, useEffect } from 'react';
import { ShoppingItem, getPantryLowItems, createShoppingItem } from '../actions';
import { useRouter } from 'next/navigation';

interface SmartPanelProps {
  listId?: string;
  items: ShoppingItem[];
  onRefresh: () => void;
}

export default function SmartPanel({ listId, items, onRefresh }: SmartPanelProps) {
  const [pantryLowItems, setPantryLowItems] = useState<Array<{ id: string; name: string; category: string }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (listId) {
      getPantryLowItems().then(setPantryLowItems).catch(console.error);
    }
  }, [listId]);

  const calculateTotal = () => {
    return items
      .filter(item => !item.purchased && item.price_est != null)
      .reduce((sum, item) => sum + (Number(item.price_est) || 0), 0);
  };

  const getCategoryTotals = () => {
    const totals: Record<string, number> = {};
    items
      .filter(item => !item.purchased && item.category && item.price_est != null)
      .forEach(item => {
        totals[item.category!] = (totals[item.category!] || 0) + (Number(item.price_est) || 0);
      });
    return totals;
  };

  const getAisleOrder = () => {
    const aisles = [...new Set(items.map(item => item.aisle).filter(Boolean))];
    // Simple ordering - you could make this smarter
    const order = ['Produce', 'Dairy', 'Meat', 'Pantry', 'Frozen', 'Beverages'];
    return aisles.sort((a, b) => {
      const aIndex = order.indexOf(a || '');
      const bIndex = order.indexOf(b || '');
      if (aIndex === -1 && bIndex === -1) return (a || '').localeCompare(b || '');
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  };

  const handleAddPantryItem = async (pantryItemId: string, itemName: string) => {
    if (!listId) return;
    setLoading(true);
    try {
      await createShoppingItem(listId, {
        name: itemName,
        quantity: 1,
        unit: 'pcs',
        pantry_item_id: pantryItemId,
      });
      onRefresh();
    } catch (error) {
      console.error('Failed to add item:', error);
      alert('Failed to add item. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const total = calculateTotal();
  const categoryTotals = getCategoryTotals();
  const aisleOrder = getAisleOrder();
  const unpurchasedCount = items.filter(item => !item.purchased).length;

  return (
    <div className="shopping-smart-panel-content">
      {/* Smart Suggestions */}
      <div className="shopping-smart-card">
        <h3 className="shopping-smart-title">
          <span className="shopping-smart-icon">💡</span>
          Smart Suggestions
        </h3>
        <div className="shopping-smart-section">
          <h4 className="shopping-smart-section-title">Based on Pantry Low Items</h4>
          {pantryLowItems.length === 0 ? (
            <p className="shopping-smart-empty">No low items in pantry</p>
          ) : (
            <div className="shopping-smart-items">
              {pantryLowItems.slice(0, 5).map((item) => (
                <button
                  key={item.id}
                  className="shopping-smart-item"
                  onClick={() => handleAddPantryItem(item.id, item.name)}
                  disabled={loading || !listId}
                >
                  + {item.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="shopping-smart-section">
          <h4 className="shopping-smart-section-title">Based on Recipes</h4>
          <p className="shopping-smart-empty">No recipe suggestions yet</p>
        </div>
        <div className="shopping-smart-section">
          <h4 className="shopping-smart-section-title">Frequently Bought</h4>
          <p className="shopping-smart-empty">No frequent items yet</p>
        </div>
      </div>

      {/* Budget & Totals */}
      <div className="shopping-smart-card">
        <h3 className="shopping-smart-title">
          <span className="shopping-smart-icon">💰</span>
          Budget & Totals
        </h3>
        <div className="shopping-budget-summary">
          <div className="shopping-budget-total">
            <span className="shopping-budget-label">Estimated Subtotal</span>
            <span className="shopping-budget-value">${Number(total).toFixed(2)}</span>
          </div>
          <div className="shopping-budget-progress">
            <div className="shopping-budget-bar" style={{ width: `${Math.min(100, (Number(total) / 200) * 100)}%` }}></div>
          </div>
          <div className="shopping-budget-items">
            {unpurchasedCount} items remaining
          </div>
        </div>
        {Object.keys(categoryTotals).length > 0 && (
          <div className="shopping-category-totals">
            <h4 className="shopping-smart-section-title">By Category</h4>
            {Object.entries(categoryTotals).map(([category, amount]) => (
              <div key={category} className="shopping-category-total-item">
                <span>{category}</span>
                <span>${Number(amount).toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Shopping Route */}
      {aisleOrder.length > 0 && (
        <div className="shopping-smart-card">
          <h3 className="shopping-smart-title">
            <span className="shopping-smart-icon">🗺️</span>
            Shopping Route
          </h3>
          <div className="shopping-route">
            <div className="shopping-route-start">Start here →</div>
            {aisleOrder.map((aisle, index) => (
              <div key={aisle} className="shopping-route-item">
                <span className="shopping-route-number">{index + 1}</span>
                <span className="shopping-route-aisle">{aisle}</span>
                {index < aisleOrder.length - 1 && <span className="shopping-route-arrow">→</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}



