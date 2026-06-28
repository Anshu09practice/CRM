import { useState, useEffect } from 'react';
import { Item, Purchase } from '../services/api';

interface PurchaseFormProps {
  items: Item[];
  purchase?: Purchase | null;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

export default function PurchaseForm({ items, purchase, onSubmit, onCancel }: PurchaseFormProps) {
  const [formData, setFormData] = useState({
    item_id: 0,
    quantity: 1,
    purchase_cost: 0,
    purchase_date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (purchase) {
      setFormData({
        item_id: purchase.item_id,
        quantity: purchase.quantity,
        purchase_cost: purchase.purchase_cost,
        purchase_date: purchase.purchase_date,
        notes: purchase.notes || ''
      });
    }
  }, [purchase]);

  const selectedItem = items.find(i => i.id === formData.item_id);

  const filteredItems = items.filter(i =>
    i.item_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectItem = (item: Item) => {
    setFormData(prev => ({
      ...prev,
      item_id: item.id!,
      purchase_cost: item.purchase_cost
    }));
    setSearchTerm(item.item_name);
    setShowDropdown(false);
  };

  const totalCost = formData.quantity * formData.purchase_cost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.item_id) {
      setError('Please select an item from inventory');
      return;
    }
    if (formData.quantity <= 0) {
      setError('Quantity must be greater than 0');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (err: any) {
      setError(err.message || 'Failed to save purchase');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-zinc-900 w-full sm:max-w-lg sm:rounded-xl rounded-t-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 py-3 flex items-center justify-between rounded-t-xl">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{purchase ? 'Edit Purchase' : 'Record Purchase'}</h2>
          <button onClick={onCancel} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="bg-rose-50 dark:bg-rose-950/40 text-red-700 dark:text-rose-300 text-sm px-3 py-2 rounded-lg">{error}</div>
          )}

          {/* Item Selection */}
          <div className="relative">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Select Item *</label>
            <input
              type="text"
              value={searchTerm || (selectedItem?.item_name || '')}
              onChange={e => { setSearchTerm(e.target.value); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              className="input-field"
              placeholder="Type to search items..."
            />
            {showDropdown && filteredItems.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredItems.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectItem(item)}
                    className="w-full text-left px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-700 border-b border-zinc-100 dark:border-zinc-700 last:border-0"
                  >
                    <span className="font-medium text-sm text-zinc-900 dark:text-zinc-100">{item.item_name}</span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-2">
                      {item.package_quantity_grams}g · ₹{item.purchase_cost}/unit
                    </span>
                  </button>
                ))}
              </div>
            )}
            {selectedItem && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                {selectedItem.package_quantity_grams}g · {selectedItem.packaging_style === 'packet' ? 'Packet' : 'Standing Pack'} · Default cost: ₹{selectedItem.purchase_cost}
              </p>
            )}
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Quantity (units) *</label>
            <input
              type="number"
              value={formData.quantity || ''}
              onChange={e => setFormData(prev => ({ ...prev, quantity: e.target.value === '' ? 0 : (parseInt(e.target.value) || 0) }))}
              className="input-field"
              min="1"
              step="1"
              placeholder="e.g., 100"
            />
          </div>

          {/* Purchase Cost */}
          <div>
            <label htmlFor="purchase-cost" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Purchase Cost (₹ per unit)</label>
            <input
              id="purchase-cost"
              type="number"
              value={formData.purchase_cost || ''}
              onChange={e => setFormData(prev => ({ ...prev, purchase_cost: e.target.value === '' ? 0 : (parseFloat(e.target.value) || 0) }))}
              className="input-field"
              min="0"
              step="0.01"
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Pre-filled from item's default cost. Change if this purchase was different.</p>
          </div>

          {/* Total Preview */}
          {formData.quantity > 0 && formData.purchase_cost > 0 && (
            <div className="bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/50 rounded-lg p-3">
              <p className="text-sm font-medium text-orange-800 dark:text-orange-300">
                Total: ₹{totalCost.toFixed(2)}
              </p>
              <p className="text-xs text-orange-600 dark:text-orange-400">
                {formData.quantity} units × ₹{formData.purchase_cost} per unit
              </p>
            </div>
          )}

          {/* Purchase Date */}
          <div>
            <label htmlFor="purchase-date" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Purchase Date</label>
            <input
              id="purchase-date"
              type="date"
              value={formData.purchase_date}
              onChange={e => setFormData(prev => ({ ...prev, purchase_date: e.target.value }))}
              className="input-field"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Notes (optional)</label>
            <input
              type="text"
              value={formData.notes}
              onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="input-field"
              placeholder="e.g., Supplier name, invoice #"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1">
              {submitting ? 'Saving...' : (purchase ? 'Update' : 'Record Purchase')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

