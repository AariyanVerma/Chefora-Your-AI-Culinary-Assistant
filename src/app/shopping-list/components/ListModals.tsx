'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { createShoppingList, updateShoppingList, deleteShoppingList, archiveShoppingList, duplicateShoppingList, getShoppingList } from '../actions';

interface ListModalsProps {
  showCreate: boolean;
  editingListId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ListModals({ showCreate, editingListId, onClose, onSuccess }: ListModalsProps) {
  const [name, setName] = useState('');
  const [store, setStore] = useState('');
  const [plannedDate, setPlannedDate] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (editingListId) {
      getShoppingList(editingListId).then(list => {
        if (list) {
          setName(list.name);
          setStore(list.store || '');
          setPlannedDate(list.planned_date || '');
        }
      }).catch(console.error);
    } else {
      setName('');
      setStore('');
      setPlannedDate('');
    }
  }, [editingListId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isProcessing) return;

    setIsProcessing(true);
    try {
      if (editingListId) {
        await updateShoppingList(editingListId, {
          name: name.trim(),
          store: store.trim() || null,
          planned_date: plannedDate || null,
        });
      } else {
        await createShoppingList({
          name: name.trim(),
          store: store.trim() || null,
          planned_date: plannedDate || null,
        });
      }
      onSuccess();
    } catch (error: any) {
      console.error('List operation error:', error);
      alert(error.message || 'Failed to save list. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!editingListId || !confirm('Are you sure you want to delete this list? All items will be deleted.')) {
      return;
    }
    setIsProcessing(true);
    try {
      await deleteShoppingList(editingListId);
      onSuccess();
    } catch (error: any) {
      console.error('Delete error:', error);
      alert(error.message || 'Failed to delete list. Please try again.');
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (showCreate || editingListId) {
      document.body.classList.add('shopping-modal-open');
      return () => {
        document.body.classList.remove('shopping-modal-open');
      };
    }
  }, [showCreate, editingListId]);

  if (!showCreate && !editingListId) return null;
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
      <div className="shopping-modal" onClick={(e) => e.stopPropagation()}>
        <div className="shopping-modal-header">
          <h2>{editingListId ? 'Edit List' : 'Create New List'}</h2>
          <button
            className="btn ghost tap-ripple pantry-modal-close"
            onClick={onClose}
            type="button"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="shopping-form-group">
            <label className="shopping-form-label">List Name</label>
            <input
              type="text"
              className="shopping-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isProcessing}
            />
          </div>
          <div className="shopping-form-group">
            <label className="shopping-form-label">Store (Optional)</label>
            <input
              type="text"
              className="shopping-input"
              value={store}
              onChange={(e) => setStore(e.target.value)}
              disabled={isProcessing}
            />
          </div>
          <div className="shopping-form-group">
            <label className="shopping-form-label">Planned Shopping Date (Optional)</label>
            <input
              type="date"
              className="shopping-input"
              value={plannedDate}
              onChange={(e) => setPlannedDate(e.target.value)}
              disabled={isProcessing}
            />
          </div>
          <div className="shopping-modal-actions">
            {editingListId && (
              <button
                type="button"
                className="shopping-btn shopping-btn-danger"
                onClick={handleDelete}
                disabled={isProcessing}
              >
                Delete
              </button>
            )}
            <button
              type="button"
              className="shopping-btn shopping-btn-secondary"
              onClick={onClose}
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="shopping-btn shopping-btn-primary"
              disabled={!name.trim() || isProcessing}
            >
              {isProcessing ? 'Saving...' : editingListId ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
}



