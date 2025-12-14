'use client';

import { useState } from 'react';
import { ShoppingList } from '../actions';
import ListModals from './ListModals';

interface ListsPanelProps {
  lists: ShoppingList[];
  selectedListId?: string;
  onSelectList: (listId: string) => void;
  onRefresh: () => void;
}

export default function ListsPanel({
  lists,
  selectedListId,
  onSelectList,
  onRefresh,
}: ListsPanelProps) {
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <div className="shopping-lists-panel-content">
      <div className="shopping-lists-header">
        <h2 className="shopping-lists-title">My Lists</h2>
        <button
          className="shopping-btn shopping-btn-icon-small"
          onClick={() => setShowCreateModal(true)}
          title="New List"
        >
          +
        </button>
      </div>

      <div className="shopping-lists-list">
        {lists.length === 0 ? (
          <div className="shopping-lists-empty">
            <p>No lists yet</p>
            <button
              className="shopping-btn shopping-btn-secondary"
              onClick={() => setShowCreateModal(true)}
            >
              Create List
            </button>
          </div>
        ) : (
          lists.map((list) => (
            <div
              key={list.id}
              className={`shopping-list-item ${selectedListId === list.id ? 'active' : ''}`}
              onClick={() => onSelectList(list.id)}
            >
              <div className="shopping-list-item-icon">🛒</div>
              <div className="shopping-list-item-content">
                <div className="shopping-list-item-name">{list.name}</div>
                <div className="shopping-list-item-meta">
                  <span>{list.unpurchased_count || 0} items</span>
                  {list.store && <span>• {list.store}</span>}
                </div>
              </div>
              <div className="shopping-list-item-actions">
                <button
                  className="shopping-btn shopping-btn-icon-tiny"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingListId(list.id);
                  }}
                  title="Edit"
                >
                  ✏️
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <ListModals
        showCreate={showCreateModal}
        editingListId={editingListId}
        onClose={() => {
          setShowCreateModal(false);
          setEditingListId(null);
        }}
        onSuccess={() => {
          setShowCreateModal(false);
          setEditingListId(null);
          onRefresh();
        }}
      />
    </div>
  );
}



