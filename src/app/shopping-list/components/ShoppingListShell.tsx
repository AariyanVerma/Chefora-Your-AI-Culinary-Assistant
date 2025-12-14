'use client';

import { useState, useEffect, useTransition } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ShoppingList, ShoppingItem } from '../actions';
import ListsPanel from './ListsPanel';
import ItemsBoard from './ItemsBoard';
import SmartPanel from './SmartPanel';
import CommandBar from './CommandBar';
import BulkActionBar from './BulkActionBar';
import ShoppingItemModal from './ShoppingItemModal';
import { createShoppingList } from '../actions';

interface ShoppingListShellProps {
  initialLists: ShoppingList[];
  initialSelectedList: ShoppingList | null;
  initialItems: ShoppingItem[];
}

export default function ShoppingListShell({
  initialLists,
  initialSelectedList,
  initialItems,
}: ShoppingListShellProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [lists, setLists] = useState(initialLists);
  const [selectedList, setSelectedList] = useState(initialSelectedList);
  const [items, setItems] = useState(initialItems);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [viewMode, setViewMode] = useState<'grouped' | 'list'>('grouped');
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);

  // Sync state with props when they change (e.g., after router.refresh())
  useEffect(() => {
    setLists(initialLists);
    setSelectedList(initialSelectedList);
    setItems(initialItems);
  }, [initialLists, initialSelectedList, initialItems]);
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || '',
    store: searchParams.get('store') || '',
    priority: searchParams.get('priority') || '',
    purchased: searchParams.get('purchased') === 'true' ? true : searchParams.get('purchased') === 'false' ? false : undefined,
    pantry_linked: searchParams.get('pantry_linked') === 'true',
  });
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'recent');

  const handleCreateList = async () => {
    try {
      const result = await createShoppingList({
        name: `Shopping List ${lists.length + 1}`,
        store: null,
        planned_date: null,
      });
      // Refresh to get updated lists
      router.push(`/shopping-list?list=${result.id}`);
      router.refresh();
    } catch (error) {
      console.error('Failed to create list:', error);
      alert('Failed to create list. Please try again.');
    }
  };

  const handleListSelect = (listId: string) => {
    router.push(`/shopping-list?list=${listId}`);
    router.refresh();
  };

  const handleRefresh = () => {
    // Refresh server data in background
    startTransition(() => {
      router.refresh();
    });
  };

  // Update a specific item in the items array
  const handleItemUpdate = (itemId: string, updates: Partial<ShoppingItem>) => {
    setItems(prevItems => 
      prevItems.map(item => 
        item.id === itemId ? { ...item, ...updates } : item
      )
    );
  };

  // Filter and sort items client-side
  const filteredAndSortedItems = items.filter(item => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch = 
        item.name?.toLowerCase().includes(searchLower) ||
        item.category?.toLowerCase().includes(searchLower) ||
        item.store?.toLowerCase().includes(searchLower) ||
        item.notes?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    // Category filter
    if (filters.category && item.category !== filters.category) {
      return false;
    }

    // Store filter
    if (filters.store && item.store !== filters.store) {
      return false;
    }

    // Priority filter
    if (filters.priority && item.priority !== filters.priority) {
      return false;
    }

    // Purchased filter
    if (filters.purchased !== undefined && item.purchased !== filters.purchased) {
      return false;
    }

    // Pantry linked filter
    if (filters.pantry_linked && !item.pantry_item_id) {
      return false;
    }

    return true;
  }).sort((a, b) => {
    // Sort logic
    switch (sortBy) {
      case 'name':
        return (a.name || '').localeCompare(b.name || '');
      case 'price':
        return (a.price || 0) - (b.price || 0);
      case 'priority':
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) - 
               (priorityOrder[a.priority as keyof typeof priorityOrder] || 0);
      case 'aisle':
        return (a.aisle || '').localeCompare(b.aisle || '');
      case 'recent':
      default:
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    }
  });

  return (
    <div className="shopping-list-container">
      {/* Header */}
      <div className="shopping-list-header">
        <div className="shopping-list-header-left">
          <div>
            <h1 className="shopping-list-title">Shopping List</h1>
            <p className="shopping-list-subtitle">Plan, optimize, and shop smarter.</p>
          </div>
        </div>
        <div className="shopping-list-header-right">
          <div className="shopping-tech-status">
            <span className="shopping-status-pill synced">Synced</span>
            <span className="shopping-status-pill smart">Smart Suggestions On</span>
          </div>
          <button
            className="shopping-btn shopping-btn-primary"
            onClick={handleCreateList}
          >
            + New List
          </button>
          <button className="shopping-btn shopping-btn-icon" title="Scan / Barcode">
            📷
          </button>
          <button className="shopping-btn shopping-btn-icon" title="Voice Add">
            🎤
          </button>
        </div>
      </div>

      {/* Top Row: Lists Panel and Smart Panel */}
      <div className="shopping-list-top-row">
        {/* Left: Lists Panel */}
        <aside className="shopping-lists-panel">
          <ListsPanel
            lists={lists}
            selectedListId={selectedList?.id}
            onSelectList={handleListSelect}
            onRefresh={handleRefresh}
          />
        </aside>

        {/* Right: Smart Panel */}
        <aside className="shopping-smart-panel">
          <SmartPanel
            listId={selectedList?.id}
            items={items}
            onRefresh={handleRefresh}
          />
        </aside>
      </div>

      {/* Command Bar */}
      <CommandBar
        filters={filters}
        sortBy={sortBy}
        onFiltersChange={setFilters}
        onSortChange={setSortBy}
        onBulkModeToggle={() => setBulkMode(!bulkMode)}
        bulkMode={bulkMode}
        onAddItem={() => {
          setIsAddItemModalOpen(true);
        }}
      />

      {/* Bottom: Items Board - Full Width */}
      <main className="shopping-items-board">
        {selectedList ? (
          <>
            {bulkMode && selectedItems.size > 0 && (
              <BulkActionBar
                selectedIds={Array.from(selectedItems)}
                listId={selectedList.id}
                onActionComplete={() => {
                  setSelectedItems(new Set());
                  handleRefresh();
                }}
              />
            )}
            <ItemsBoard
              items={filteredAndSortedItems}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              selectedItems={selectedItems}
              onSelectionChange={setSelectedItems}
              bulkMode={bulkMode}
              onRefresh={() => {
                setSelectedItems(new Set());
                // Refresh server data in background - state will sync via useEffect
                handleRefresh();
              }}
              onItemUpdate={handleItemUpdate}
              listId={selectedList.id}
              onAddItem={() => {
                setIsAddItemModalOpen(true);
              }}
            />
          </>
        ) : (
          <div className="shopping-empty-state">
            <div className="shopping-empty-card">
              <div className="shopping-empty-icon">🛒</div>
              <h2 className="cardTitle">No List Selected</h2>
              <p className="subtitle">Create a new list or select an existing one to get started!</p>
              <button
                className="shopping-btn shopping-btn-primary"
                onClick={handleCreateList}
              >
                + Create Your First List
              </button>
            </div>
          </div>
        )}
      </main>
      
      {selectedList && isAddItemModalOpen && (
        <ShoppingItemModal
          listId={selectedList.id}
          onClose={() => {
            setIsAddItemModalOpen(false);
            handleRefresh();
          }}
        />
      )}
    </div>
  );
}



