'use client';

import { useState } from 'react';
import ShoppingItemModal from './ShoppingItemModal';

interface AddItemBarProps {
  listId: string;
  onItemAdded: () => void;
}

export default function AddItemBar({ listId, onItemAdded }: AddItemBarProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="shopping-add-item-bar">
        <button
          className="shopping-btn shopping-btn-primary"
          onClick={() => setShowModal(true)}
        >
          + Add New Item
        </button>
      </div>
      {showModal && (
        <ShoppingItemModal
          listId={listId}
          onClose={() => {
            setShowModal(false);
            onItemAdded();
          }}
        />
      )}
    </>
  );
}



