'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { bulkUpdateShoppingItems, getShoppingLists } from '../actions';

interface BulkActionBarProps {
  selectedIds: string[];
  listId: string;
  onActionComplete: () => void;
}

export default function BulkActionBar({ selectedIds, listId, onActionComplete }: BulkActionBarProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [targetListId, setTargetListId] = useState('');
  const [availableLists, setAvailableLists] = useState<Array<{ id: string; name: string }>>([]);

  const handleBulkAction = async (action: string, value?: string) => {
    if (selectedIds.length === 0) return;
    setIsProcessing(true);

    try {
      if (action === 'move_to_list') {
        if (!value) {
          // Load lists for move modal
          const lists = await getShoppingLists();
          setAvailableLists(lists.filter(l => l.id !== listId));
          setShowMoveModal(true);
          setIsProcessing(false);
          return;
        }
        await bulkUpdateShoppingItems({
          item_ids: selectedIds,
          action: 'move_to_list',
          target_list_id: value,
        });
      } else {
        await bulkUpdateShoppingItems({
          item_ids: selectedIds,
          action: action as any,
          value: value || null,
        });
      }
      onActionComplete();
    } catch (error: any) {
      console.error('Bulk action error:', error);
      alert(error.message || 'Failed to perform bulk action. Please try again.');
    } finally {
      setIsProcessing(false);
      setShowMoveModal(false);
    }
  };

  const handleMove = async () => {
    if (!targetListId) return;
    await handleBulkAction('move_to_list', targetListId);
  };

  useEffect(() => {
    if (showMoveModal) {
      document.body.classList.add('shopping-modal-open');
      return () => {
        document.body.classList.remove('shopping-modal-open');
      };
    }
  }, [showMoveModal]);

  return (
    <>
      <div className="shopping-bulk-action-bar">
        <div className="shopping-bulk-info">
          {selectedIds.length} item{selectedIds.length !== 1 ? 's' : ''} selected
        </div>
        <div className="shopping-bulk-actions">
          <button
            className="shopping-btn shopping-btn-secondary"
            onClick={() => handleBulkAction('mark_purchased')}
            disabled={isProcessing}
          >
            Mark Purchased
          </button>
          <button
            className="shopping-btn shopping-btn-secondary"
            onClick={() => handleBulkAction('mark_unpurchased')}
            disabled={isProcessing}
          >
            Mark Unpurchased
          </button>
          <button
            className="shopping-btn shopping-btn-secondary"
            onClick={() => handleBulkAction('move_to_list')}
            disabled={isProcessing}
          >
            Move to List
          </button>
          <button
            className="shopping-btn shopping-btn-secondary"
            onClick={() => {
              if (confirm(`Delete ${selectedIds.length} item(s)?`)) {
                handleBulkAction('delete');
              }
            }}
            disabled={isProcessing}
          >
            Delete
          </button>
        </div>
      </div>

      {showMoveModal && typeof window !== 'undefined' && createPortal(
        <>
          {/* Backdrop */}
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: window.innerWidth > 968 ? 280 : 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 9998,
              cursor: 'pointer'
            }}
            onClick={() => setShowMoveModal(false)}
          />
          {/* Modal */}
          <div className="shopping-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Move Items to List</h3>
            <select
              className="shopping-select"
              value={targetListId}
              onChange={(e) => setTargetListId(e.target.value)}
            >
              <option value="">Select a list...</option>
              {availableLists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name}
                </option>
              ))}
            </select>
            <div className="shopping-modal-actions">
              <button
                className="shopping-btn shopping-btn-secondary"
                onClick={() => setShowMoveModal(false)}
              >
                Cancel
              </button>
              <button
                className="shopping-btn shopping-btn-primary"
                onClick={handleMove}
                disabled={!targetListId}
              >
                Move
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}



