'use client';

import { useState } from 'react';
import { bulkUpdatePantryItems, exportPantryItemsToCSV } from '../actions';
import { useRouter } from 'next/navigation';

const CATEGORIES = ['Produce', 'Dairy', 'Pantry', 'Meat', 'Frozen', 'Spices', 'Other'];
const LOCATIONS = ['Pantry', 'Fridge', 'Freezer'];

interface BulkActionBarProps {
  selectedIds: string[];
  onActionComplete: () => void;
  onDelete?: () => void;
  onExport?: () => void;
}

export default function BulkActionBar({ selectedIds, onActionComplete }: BulkActionBarProps) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [action, setAction] = useState<string>('');
  const [value, setValue] = useState<string>('');

  const handleBulkAction = async (actionType: string, actionValue?: string) => {
    if (actionType === 'delete') {
      if (!confirm(`Are you sure you want to delete ${selectedIds.length} item(s)?`)) {
        return;
      }
    }

    setIsProcessing(true);
    try {
      await bulkUpdatePantryItems({
        item_ids: selectedIds,
        action: actionType as any,
        value: actionValue || null,
      });
      router.refresh();
      onActionComplete();
    } catch (error: any) {
      console.error('Bulk action error:', error);
      alert(error.message || 'Failed to perform bulk action. Please try again.');
    } finally {
      setIsProcessing(false);
      setAction('');
      setValue('');
    }
  };

  const handleExport = async () => {
    try {
      const csv = await exportPantryItemsToCSV(selectedIds);
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

  return (
    <div className="pantry-bulk-action-bar">
      <div className="pantry-bulk-content">
        <span className="pantry-bulk-count">
          {selectedIds.length} item{selectedIds.length !== 1 ? 's' : ''} selected
        </span>
        <div className="pantry-bulk-dropdown">
          <select
            className="pantry-bulk-select"
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setValue('');
            }}
            disabled={isProcessing}
          >
            <option value="">Bulk Actions...</option>
            <option value="move_location">Move Location</option>
            <option value="set_category">Set Category</option>
            <option value="toggle_opened">Toggle Opened</option>
            <option value="add_expiry_days">Add 3 Days to Expiry</option>
          </select>

          {action === 'move_location' && (
            <select
              className="pantry-bulk-select"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={isProcessing}
            >
              <option value="">Select location...</option>
              {LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          )}

          {action === 'set_category' && (
            <select
              className="pantry-bulk-select"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={isProcessing}
            >
              <option value="">Select category...</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          )}

          {action && value && (
            <button
              className="btn tap-ripple pantry-bulk-apply"
              onClick={() => handleBulkAction(action, value)}
              disabled={isProcessing}
            >
              Apply
            </button>
          )}

          {action === 'toggle_opened' && (
            <button
              className="btn tap-ripple pantry-bulk-apply"
              onClick={() => handleBulkAction('toggle_opened')}
              disabled={isProcessing}
            >
              Toggle
            </button>
          )}

          {action === 'add_expiry_days' && (
            <button
              className="btn tap-ripple pantry-bulk-apply"
              onClick={() => handleBulkAction('add_expiry_days')}
              disabled={isProcessing}
            >
              Add 3 Days
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
