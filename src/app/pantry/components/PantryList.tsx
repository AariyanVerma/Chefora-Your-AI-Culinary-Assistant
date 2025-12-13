'use client';

import { PantryItem, bulkUpdatePantryItems, exportPantryItemsToCSV } from '../actions';
import PantryItemCard from './PantryItemCard';
import { useState, useEffect } from 'react';
import BulkActionBar from './BulkActionBar';
import PantryItemModal from './PantryItemModal';
import { useRouter } from 'next/navigation';

interface PantryListProps {
  items: PantryItem[];
}

export default function PantryList({ items }: PantryListProps) {
  const router = useRouter();
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset selected items when items change (e.g., when filters are applied)
  useEffect(() => {
    setSelectedItems(new Set());
  }, [items.length]);

  useEffect(() => {
    const handleOpenAddModal = () => {
      setIsAddModalOpen(true);
    };
    window.addEventListener('openAddModal' as any, handleOpenAddModal);
    return () => window.removeEventListener('openAddModal' as any, handleOpenAddModal);
  }, []);

  const toggleSelect = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const selectAll = () => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map(item => item.id)));
    }
  };

  const handleUpdate = () => {
    // Refresh the page to get updated data
    window.location.reload();
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedItems.size} item(s)?`)) {
      return;
    }

    setIsProcessing(true);
    try {
      await bulkUpdatePantryItems({
        item_ids: Array.from(selectedItems),
        action: 'delete',
        value: null,
      });
      setSelectedItems(new Set());
      router.refresh();
    } catch (error: any) {
      console.error('Bulk delete error:', error);
      alert(error.message || 'Failed to delete items. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = async () => {
    try {
      const csv = await exportPantryItemsToCSV(Array.from(selectedItems));
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pantry-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export. Please try again.');
    }
  };

  if (items.length === 0) {
    return (
      <>
        <div className="pantry-empty-state">
          <div className="pantry-empty-card">
            <div className="pantry-empty-icon">📦</div>
            <h2 className="cardTitle">Your pantry is empty</h2>
            <p className="subtitle">Start by adding your first item to track what you have!</p>
            <button
              className="Btn pantry-add-item-btn"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Button clicked! Opening modal...');
                console.log('Current isAddModalOpen state:', isAddModalOpen);
                setIsAddModalOpen(true);
                console.log('Set isAddModalOpen to true');
              }}
              type="button"
              style={{ position: 'relative', zIndex: 100 }}
            >
              + Add Item
            </button>
          </div>
        </div>
        {isAddModalOpen && (
          <PantryItemModal
            onClose={() => {
              console.log('Modal close called');
              setIsAddModalOpen(false);
              handleUpdate();
            }}
          />
        )}
      </>
    );
  }

  return (
    <div className="pantry-list-container">
      <div className="pantry-list-header">
        <div className="pantry-list-header-left">
          <h2 className="cardTitle">{items.length} {items.length === 1 ? 'Item' : 'Items'}</h2>
          {selectedItems.size > 0 && (
            <span className="pantry-selected-count">
              {selectedItems.size} selected
            </span>
          )}
        </div>
        <div className="pantry-list-header-right">
          {selectedItems.size > 0 && (
            <>
              <button
                className="btn tap-ripple pantry-header-action-btn danger"
                onClick={handleBulkDelete}
                disabled={isProcessing}
                title="Delete Selected"
              >
                🗑️ Delete
              </button>
              <button
                className="btn tap-ripple pantry-header-action-btn"
                onClick={handleExport}
                disabled={isProcessing}
                title="Export to CSV"
              >
                📥 Export
              </button>
            </>
          )}
          <div className="pantry-view-toggle">
            <button
              className={`pantry-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              ⊞
            </button>
            <button
              className={`pantry-view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List View"
            >
              ☰
            </button>
          </div>
          <button
            className="btn tap-ripple"
            onClick={() => setIsAddModalOpen(true)}
          >
            + Add Item
          </button>
        </div>
      </div>

      {selectedItems.size > 0 && (
        <BulkActionBar
          selectedIds={Array.from(selectedItems)}
          onActionComplete={() => {
            setSelectedItems(new Set());
            handleUpdate();
          }}
        />
      )}

      <div className={`pantry-items-${viewMode}`}>
        {items.map((item) => (
          <div key={item.id} className="pantry-item-wrapper">
            {viewMode === 'grid' && (
              <label className="pantry-item-checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedItems.has(item.id)}
                  onChange={() => toggleSelect(item.id)}
                  className="pantry-item-checkbox"
                />
              </label>
            )}
            <PantryItemCard item={item} onUpdate={handleUpdate} viewMode={viewMode} />
          </div>
        ))}
      </div>

      {isAddModalOpen && (
        <>
          {console.log('Rendering PantryItemModal, isAddModalOpen:', isAddModalOpen)}
          <PantryItemModal
            onClose={() => {
              console.log('Modal close called');
              setIsAddModalOpen(false);
              handleUpdate();
            }}
          />
        </>
      )}
    </div>
  );
}

