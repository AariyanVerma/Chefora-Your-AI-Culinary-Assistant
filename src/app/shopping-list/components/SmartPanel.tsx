'use client';

import { useState, useEffect } from 'react';
import { ShoppingItem, getPantryLowItems, getRecipeSuggestions, getFrequentlyBoughtItems, createShoppingItem } from '../actions';
import { useRouter } from 'next/navigation';

interface SmartPanelProps {
  listId?: string;
  items: ShoppingItem[];
  onRefresh: () => void;
  onAisleClick?: (aisle: string) => void;
  selectedAisle?: string;
}

interface RecipeSuggestion {
  name: string;
  category: string | null;
  reason: string;
}

interface FrequentItem {
  name: string;
  category: string | null;
  frequency: number;
}

export default function SmartPanel({ listId, items, onRefresh, onAisleClick, selectedAisle }: SmartPanelProps) {
  const [pantryLowItems, setPantryLowItems] = useState<Array<{ id: string; name: string; category: string; reason: string }>>([]);
  const [recipeSuggestions, setRecipeSuggestions] = useState<RecipeSuggestion[]>([]);
  const [frequentItems, setFrequentItems] = useState<FrequentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [addingItems, setAddingItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (listId) {
      loadAllSuggestions();
    }
  }, [listId, items.length]); 

  const loadAllSuggestions = async () => {
    if (!listId) return;
    setLoadingSuggestions(true);
    try {
      const [lowItems, recipeSuggs, frequent] = await Promise.all([
        getPantryLowItems(listId).catch(() => []),
        getRecipeSuggestions(listId).catch(() => []),
        getFrequentlyBoughtItems(listId).catch(() => []),
      ]);
      setPantryLowItems(lowItems);
      setRecipeSuggestions(recipeSuggs);
      setFrequentItems(frequent);
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

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

  const getAisleItems = (aisle: string) => {
    return items.filter(item => !item.purchased && item.aisle === aisle);
  };

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      'Produce': '#22c55e', 
      'Dairy': '#3b82f6', 
      'Meat': '#ef4444', 
      'Poultry': '#f97316', 
      'Seafood': '#06b6d4', 
      'Frozen': '#8b5cf6', 
      'Beverages': '#ec4899', 
      'Snacks': '#fbbf24', 
      'Bakery': '#d97706', 
      'Pantry': '#84cc16', 
      'Grains': '#eab308', 
      'Cereal': '#f59e0b', 
      'Pasta': '#f97316', 
      'Rice': '#fbbf24', 
      'Canned Goods': '#64748b', 
      'Condiments': '#a855f7', 
      'Sauces': '#dc2626', 
      'Spices': '#ea580c', 
      'Herbs': '#16a34a', 
      'Oils': '#facc15', 
      'Vinegar': '#7c3aed', 
      'Nuts': '#d97706', 
      'Seeds': '#65a30d', 
      'Dried Fruits': '#f59e0b', 
      'Sweets': '#ec4899', 
      'Chocolate': '#7c2d12', 
      'Coffee': '#78350f', 
      'Tea': '#166534', 
      'Baby Food': '#f472b6', 
      'Pet Food': '#6b7280', 
      'Cleaning Supplies': '#0ea5e9', 
      'Personal Care': '#a855f7', 
      'Other': '#6b7280', 
    };
    return colors[category] || '#6b7280';
  };

  const getAisleOrder = () => {
    const aisles = [...new Set(items.map(item => item.aisle).filter((aisle): aisle is string => Boolean(aisle)))];
    
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
        priority: 'medium',
        pantry_item_id: pantryItemId,
      });
      await loadAllSuggestions(); 
      onRefresh();
    } catch (error) {
      console.error('Failed to add item:', error);
      alert('Failed to add item. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSuggestion = async (itemName: string, category: string | null, itemType: 'recipe' | 'frequent') => {
    if (!listId) return;
    const itemKey = `${itemType}-${itemName}`;
    setAddingItems(prev => new Set(prev).add(itemKey));
    try {
      await createShoppingItem(listId, {
        name: itemName,
        quantity: 1,
        unit: 'pcs',
        priority: 'medium',
        category: category || undefined,
      });
      await loadAllSuggestions(); 
      onRefresh();
    } catch (error) {
      console.error('Failed to add item:', error);
      alert('Failed to add item. Please try again.');
    } finally {
      setAddingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemKey);
        return newSet;
      });
    }
  };

  const total = calculateTotal();
  const categoryTotals = getCategoryTotals();
  const aisleOrder = getAisleOrder();
  const unpurchasedCount = items.filter(item => !item.purchased).length;

  return (
    <div className="shopping-smart-panel-content">
      {}
      <div className="shopping-smart-card">
        <h3 className="shopping-smart-title">
          <span className="shopping-smart-icon">💡</span>
          Smart Suggestions
        </h3>
        <div className="shopping-smart-section">
          <h4 className="shopping-smart-section-title">Pantry Restock Suggestions</h4>
          {loadingSuggestions ? (
            <p className="shopping-smart-empty" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Analyzing pantry...</p>
          ) : pantryLowItems.length === 0 ? (
            <p className="shopping-smart-empty">Your pantry looks well-stocked! 🎉</p>
          ) : (
            <div className="shopping-smart-items">
              {pantryLowItems.map((item) => {
                const itemKey = `pantry-${item.id}`;
                const isAdding = addingItems.has(itemKey);
                const categoryColor = item.category ? getCategoryColor(item.category) : undefined;
                return (
                  <button
                    key={item.id}
                    className="shopping-smart-item"
                    onClick={() => {
                      setAddingItems(prev => new Set(prev).add(itemKey));
                      handleAddPantryItem(item.id, item.name).finally(() => {
                        setAddingItems(prev => {
                          const newSet = new Set(prev);
                          newSet.delete(itemKey);
                          return newSet;
                        });
                      });
                    }}
                    disabled={isAdding || loading || !listId}
                    title={item.reason}
                    style={{
                      border: categoryColor ? `1px solid ${categoryColor}40` : undefined,
                      background: categoryColor ? `${categoryColor}15` : undefined,
                    }}
                  >
                    {isAdding ? '⏳ Adding...' : `+ ${item.name}`}
                    <span style={{ 
                      fontSize: '0.65rem', 
                      color: categoryColor || 'rgba(255, 255, 255, 0.5)',
                      marginLeft: '4px',
                      opacity: 0.7,
                      fontStyle: 'italic'
                    }}>
                      ({item.reason})
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="shopping-smart-section">
          <h4 className="shopping-smart-section-title">Based on Recipes</h4>
          {loadingSuggestions ? (
            <p className="shopping-smart-empty" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Loading suggestions...</p>
          ) : recipeSuggestions.length === 0 ? (
            <p className="shopping-smart-empty">No recipe suggestions yet</p>
          ) : (
            <div className="shopping-smart-items">
              {recipeSuggestions.map((item, index) => {
                const itemKey = `recipe-${item.name}`;
                const isAdding = addingItems.has(itemKey);
                const categoryColor = item.category ? getCategoryColor(item.category) : undefined;
                return (
                  <button
                    key={`recipe-${index}`}
                    className="shopping-smart-item"
                    onClick={() => handleAddSuggestion(item.name, item.category, 'recipe')}
                    disabled={isAdding || !listId}
                    title={item.reason}
                    style={{
                      border: categoryColor ? `1px solid ${categoryColor}40` : undefined,
                      background: categoryColor ? `${categoryColor}15` : undefined,
                    }}
                  >
                    {isAdding ? '⏳ Adding...' : `+ ${item.name}`}
                    {item.category && (
                      <span style={{ 
                        fontSize: '0.7rem', 
                        color: categoryColor,
                        marginLeft: '4px',
                        opacity: 0.7
                      }}>
                        ({item.category})
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="shopping-smart-section">
          <h4 className="shopping-smart-section-title">Frequently Bought</h4>
          {loadingSuggestions ? (
            <p className="shopping-smart-empty" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Loading suggestions...</p>
          ) : frequentItems.length === 0 ? (
            <p className="shopping-smart-empty">No frequent items yet</p>
          ) : (
            <div className="shopping-smart-items">
              {frequentItems.map((item, index) => {
                const itemKey = `frequent-${item.name}`;
                const isAdding = addingItems.has(itemKey);
                const categoryColor = item.category ? getCategoryColor(item.category) : undefined;
                return (
                  <button
                    key={`frequent-${index}`}
                    className="shopping-smart-item"
                    onClick={() => handleAddSuggestion(item.name, item.category, 'frequent')}
                    disabled={isAdding || !listId}
                    title={`Bought ${item.frequency} time${item.frequency > 1 ? 's' : ''} recently`}
                    style={{
                      border: categoryColor ? `1px solid ${categoryColor}40` : undefined,
                      background: categoryColor ? `${categoryColor}15` : undefined,
                    }}
                  >
                    {isAdding ? '⏳ Adding...' : `+ ${item.name}`}
                    <span style={{ 
                      fontSize: '0.7rem', 
                      color: categoryColor || 'rgba(255, 255, 255, 0.5)',
                      marginLeft: '4px',
                      opacity: 0.7
                    }}>
                      ({item.frequency}x)
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {}
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
          <div className="shopping-budget-progress" style={{ position: 'relative', width: '100%' }}>
            {(() => {
              const budgetLimit = 200; 
              const percentage = Math.min(100, (Number(total) / budgetLimit) * 100);
              const categoryTotals = getCategoryTotals();
              const sortedCategories = Object.entries(categoryTotals)
                .sort(([, a], [, b]) => b - a);
              
              if (sortedCategories.length === 0) {
                return (
                  <div 
                    className="shopping-budget-bar" 
                    style={{ width: `${percentage}%`, background: 'rgba(103, 232, 249, 0.5)' }}
                  />
                );
              }

              if (total === 0 || percentage === 0) {
                return null;
              }

              let accumulatedWidth = 0;
              const segments = sortedCategories
                .map(([category, amount], index) => {
                  const categoryPercentage = (amount / total) * 100;
                  const segmentWidth = (categoryPercentage / 100) * percentage;
                  const categoryColor = getCategoryColor(category);
                  const left = accumulatedWidth;
                  accumulatedWidth += segmentWidth;
                  
                  if (segmentWidth < 0.5) {
                    return null;
                  }
                  
                  const isFirst = index === 0;
                  const isLast = index === sortedCategories.length - 1;
                  
                  return (
                    <div
                      key={category}
                      className="shopping-budget-bar-segment"
                      style={{
                        position: 'absolute',
                        top: '0',
                        left: `${left}%`,
                        width: `${segmentWidth}%`,
                        height: '100%',
                        maxHeight: '100%',
                        background: categoryColor,
                        opacity: 0.9,
                        transition: 'all 0.3s ease',
                        borderRadius: isFirst && isLast 
                          ? '4px' 
                          : isFirst 
                          ? '4px 0 0 4px' 
                          : isLast 
                          ? '0 4px 4px 0' 
                          : '0',
                        boxSizing: 'border-box',
                      }}
                      title={`${category}: $${amount.toFixed(2)} (${categoryPercentage.toFixed(1)}%)`}
                    />
                  );
                })
                .filter(Boolean);
              
              return segments.length > 0 ? segments : null;
            })()}
          </div>
          <div className="shopping-budget-items">
            {unpurchasedCount} items remaining
          </div>
        </div>
        {Object.keys(categoryTotals).length > 0 && (
          <div className="shopping-category-totals">
            <h4 className="shopping-smart-section-title">By Category</h4>
            {Object.entries(categoryTotals).map(([category, amount]) => {
              const categoryColor = getCategoryColor(category);
              return (
                <div 
                  key={category} 
                  className="shopping-category-total-item"
                  style={{ 
                    borderLeft: `3px solid ${categoryColor}`,
                    backgroundColor: `${categoryColor}15`
                  }}
                >
                  <span style={{ color: categoryColor, fontWeight: 600 }}>{category}</span>
                  <span style={{ color: categoryColor, fontWeight: 700 }}>${Number(amount).toFixed(2)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {}
      {aisleOrder.length > 0 && (
        <div className="shopping-smart-card">
          <h3 className="shopping-smart-title">
            <span className="shopping-smart-icon">🗺️</span>
            Shopping Route
          </h3>
          <div className="shopping-route">
            <div className="shopping-route-start">Start here →</div>
            {aisleOrder.map((aisle, index) => {
              const aisleItems = getAisleItems(aisle);
              const aisleItemsCount = aisleItems.length;
              const isSelected = selectedAisle === aisle;
              
              return (
                <button
                  key={aisle}
                  type="button"
                  className={`shopping-route-item ${isSelected ? 'shopping-route-item-active' : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onAisleClick?.(aisle);
                  }}
                  style={{
                    cursor: onAisleClick ? 'pointer' : 'default',
                    width: '100%',
                    textAlign: 'left',
                    border: isSelected ? '1px solid rgba(103, 232, 249, 0.5)' : '1px solid transparent',
                    background: isSelected 
                      ? 'rgba(103, 232, 249, 0.2)' 
                      : 'rgba(255, 255, 255, 0.05)',
                    transition: 'all 0.3s ease',
                    outline: 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'rgba(103, 232, 249, 0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    }
                  }}
                >
                  <span className="shopping-route-number">{index + 1}</span>
                  <span className="shopping-route-aisle">
                    {aisle}
                    {aisleItemsCount > 0 && (
                      <span className="shopping-route-item-count"> ({aisleItemsCount})</span>
                    )}
                  </span>
                  {index < aisleOrder.length - 1 && <span className="shopping-route-arrow">→</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
