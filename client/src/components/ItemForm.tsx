import { useState, useEffect } from 'react';
import { Item } from '../services/api';
import { calculateSizing, formatSizing } from '../utils/sizing';

interface ItemFormProps {
  item?: Item | null;
  onSubmit: (data: Partial<Item>) => Promise<void>;
  onCancel: () => void;
}

export default function ItemForm({ item, onSubmit, onCancel }: ItemFormProps) {
  const [formData, setFormData] = useState({
    item_name: '',
    package_quantity_grams: 50,
    purchase_cost: 0,
    selling_price: 0,
    mrp: 0,
    packaging_style: 'packet' as 'packet' | 'standing_package'
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (item) {
      setFormData({
        item_name: item.item_name,
        package_quantity_grams: item.package_quantity_grams,
        purchase_cost: item.purchase_cost,
        selling_price: item.selling_price,
        mrp: item.mrp,
        packaging_style: item.packaging_style
      });
    }
  }, [item]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.item_name.trim()) {
      setError('Item name is required');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (err: any) {
      setError(err.message || 'Failed to save item');
    } finally {
      setSubmitting(false);
    }
  };

  const sizing = calculateSizing(formData.packaging_style, formData.package_quantity_grams);
  const sizingText = formatSizing(formData.packaging_style, formData.package_quantity_grams);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-xl rounded-t-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between rounded-t-xl">
          <h2 className="text-lg font-semibold">{item ? 'Edit Item' : 'Add New Item'}</h2>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          {/* Item Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Item Name *</label>
            <input
              type="text"
              name="item_name"
              value={formData.item_name}
              onChange={handleChange}
              className="input-field"
              placeholder="e.g., Jeera Powder"
              required
            />
          </div>

          {/* Packaging Style */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Packaging Style *</label>
            <select
              name="packaging_style"
              value={formData.packaging_style}
              onChange={handleChange}
              className="input-field"
            >
              <option value="packet">Packet</option>
              <option value="standing_package">Standing Package</option>
            </select>
          </div>

          {/* Package Quantity */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Package Quantity (grams) *</label>
            <input
              type="number"
              name="package_quantity_grams"
              value={formData.package_quantity_grams}
              onChange={handleChange}
              className="input-field"
              min="1"
              step="1"
              placeholder="50"
            />
          </div>

          {/* Sizing Preview */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm font-medium text-blue-800">📦 Sizing Calculation</p>
            <p className="text-sm text-blue-700 mt-1">{sizingText}</p>
            {formData.packaging_style === 'packet' && (
              <p className="text-xs text-blue-600 mt-1">
                {sizing.packets_per_bundle} packets per bundle = {sizing.bundle_weight_grams}g total
              </p>
            )}
          </div>

          {/* Prices */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Purchase ₹</label>
              <input
                type="number"
                name="purchase_cost"
                value={formData.purchase_cost}
                onChange={handleChange}
                className="input-field"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Selling ₹</label>
              <input
                type="number"
                name="selling_price"
                value={formData.selling_price}
                onChange={handleChange}
                className="input-field"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">MRP ₹</label>
              <input
                type="number"
                name="mrp"
                value={formData.mrp}
                onChange={handleChange}
                className="input-field"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Profit preview */}
          {formData.selling_price > 0 && formData.purchase_cost > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-800">
                Profit: ₹{(formData.selling_price - formData.purchase_cost).toFixed(2)} per unit
                ({((formData.selling_price - formData.purchase_cost) / formData.selling_price * 100).toFixed(1)}% margin)
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onCancel} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1">
              {submitting ? 'Saving...' : (item ? 'Update Item' : 'Add Item')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
