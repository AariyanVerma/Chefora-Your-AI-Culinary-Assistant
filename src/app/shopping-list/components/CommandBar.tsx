'use client';

interface CommandBarProps {
  filters: {
    search: string;
    category: string;
    store: string;
    priority: string;
    purchased: boolean | undefined;
    pantry_linked: boolean;
  };
  sortBy: string;
  onFiltersChange: (filters: any) => void;
  onSortChange: (sortBy: string) => void;
  onBulkModeToggle: () => void;
  bulkMode: boolean;
  onAddItem?: () => void;
}

export default function CommandBar({
  filters,
  sortBy,
  onFiltersChange,
  onSortChange,
  onBulkModeToggle,
  bulkMode,
  onAddItem,
}: CommandBarProps) {

  const updateFilter = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value };
    onFiltersChange(newFilters);
    
  };

  const updateSort = (value: string) => {
    onSortChange(value);
    
  };

  return (
    <div className="shopping-command-bar">
      <div className="shopping-command-search">
        <div className="shopping-command-search-left" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', flexWrap: 'nowrap', width: '100%' }}>
          <input
            type="text"
            className="shopping-input"
            placeholder="Search items, lists, stores, categories..."
            value={filters.search || ''}
            onChange={(e) => updateFilter('search', e.target.value)}
            style={{ flex: '1 1 auto', minWidth: '200px', margin: 0 }}
          />
          <div className="shopping-command-spacer" style={{ flex: '0 0 120px', width: '120px', minWidth: '120px', maxWidth: '120px', display: 'block' }}></div>
          <button
            style={{ flex: '0 0 auto', margin: 0, whiteSpace: 'nowrap' }}
            className={`shopping-btn ${bulkMode ? 'shopping-btn-active' : 'shopping-btn-secondary'}`}
            onClick={onBulkModeToggle}
          >
            {bulkMode ? '✓ Select Mode' : 'Select Items'}
          </button>
        </div>
        {onAddItem && (
          <button
            className="shopping-btn shopping-btn-primary shopping-command-add-item"
            onClick={onAddItem}
            style={{ marginLeft: '40px' }}
          >
            + Add New Item
          </button>
        )}
      </div>

      <div className="shopping-command-filters">
        <select
          className="shopping-select"
          value={filters.store}
          onChange={(e) => updateFilter('store', e.target.value)}
        >
          <option value="">All Stores</option>
          <option value="Walmart">Walmart</option>
          <option value="Target">Target</option>
          <option value="Whole Foods">Whole Foods</option>
          <option value="Kroger">Kroger</option>
          <option value="Costco">Costco</option>
        </select>

        <select
          className="shopping-select"
          value={filters.category || ''}
          onChange={(e) => updateFilter('category', e.target.value)}
        >
          <option value="">All Categories</option>
          <option value="Produce">Produce</option>
          <option value="Dairy">Dairy</option>
          <option value="Pantry">Pantry</option>
          <option value="Meat">Meat</option>
          <option value="Frozen">Frozen</option>
          <option value="Beverages">Beverages</option>
          <option value="Snacks">Snacks</option>
        </select>

        <select
          className="shopping-select"
          value={filters.priority}
          onChange={(e) => updateFilter('priority', e.target.value)}
        >
          <option value="">All Priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select
          className="shopping-select"
          value={filters.purchased === undefined ? '' : filters.purchased ? 'true' : 'false'}
          onChange={(e) => {
            const val = e.target.value === '' ? undefined : e.target.value === 'true';
            updateFilter('purchased', val);
          }}
        >
          <option value="">All Status</option>
          <option value="false">Unpurchased</option>
          <option value="true">Purchased</option>
        </select>

        <select
          className="shopping-select"
          value={sortBy || 'recent'}
          onChange={(e) => updateSort(e.target.value)}
        >
          <option value="recent">Recently Added</option>
          <option value="aisle">By Aisle</option>
          <option value="priority">By Priority</option>
          <option value="price">By Price</option>
          <option value="name">By Name</option>
        </select>

        <div className="shopping-checkbox-field">
          <label className="shopping-checkbox-label">
            <input
              type="checkbox"
              checked={!!filters.pantry_linked}
              onChange={(e) => {
                const val = e.target.checked;
                updateFilter('pantry_linked', val ? 'true' : '');
              }}
            />
            <span>Pantry-linked only</span>
          </label>
        </div>

        <div className="shopping-checkbox-field">
          <label className="shopping-checkbox-label">
            <input type="checkbox" />
            <span>Deals only</span>
          </label>
        </div>
      </div>
    </div>
  );
}
