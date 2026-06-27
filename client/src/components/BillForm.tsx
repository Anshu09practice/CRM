import { useState, useMemo, useEffect, useCallback } from 'react';
import { StockItem, Bill, Customer, api } from '../services/api';

interface BillFormProps {
  stock: StockItem[];
  bill?: Bill;
  onSubmit: (data: any) => Promise<any>;
  onCancel: () => void;
  onWhatsApp?: (bill: any) => void;
}

interface LineItem {
  item_id: number;
  item_name: string;
  package_quantity_grams: number;
  quantity: number;
  selling_price: number;
  available_qty: number;
}

export default function BillForm({ stock, bill, onSubmit, onCancel, onWhatsApp }: BillFormProps) {
  const [customerName, setCustomerName] = useState(bill?.customer_name || '');
  const [customerPhone, setCustomerPhone] = useState(bill?.customer_phone || '');
  const [customerAddress, setCustomerAddress] = useState(bill?.customer_address || '');
  const [discount, setDiscount] = useState(bill?.discount_percent ? String(bill.discount_percent) : '');
  const [notes, setNotes] = useState(bill?.notes || '');
  const [billDate, setBillDate] = useState(bill?.bill_date || new Date().toISOString().split('T')[0]);
  const [lineItems, setLineItems] = useState<LineItem[]>(
    bill?.items?.map(i => ({
      item_id: i.item_id,
      item_name: i.item_name,
      package_quantity_grams: i.package_quantity_grams,
      quantity: i.quantity,
      selling_price: i.selling_price,
      available_qty: 999
    })) || []
  );
  const [itemSearch, setItemSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showSendOption, setShowSendOption] = useState(false);
  const [createdBill, setCreatedBill] = useState<any>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(bill?.customer_id || null);

  // Load customers list
  useEffect(() => {
    api.getCustomers().then(setCustomers).catch(() => {});
  }, []);

  // Filter customers by search
  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return [];
    const q = customerSearch.toLowerCase();
    return customers.filter(c =>
      c.name.toLowerCase().includes(q) || c.phone.includes(q)
    ).slice(0, 8);
  }, [customers, customerSearch]);

  const selectCustomer = useCallback((customer: Customer) => {
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone);
    setCustomerAddress(customer.address || '');
    setSelectedCustomerId(customer.id);
    setCustomerSearch('');
    setShowCustomerDropdown(false);
  }, []);

  // Filter stock by search, excluding already-added items
  const filteredStock = useMemo(() => {
    const addedIds = new Set(lineItems.map(i => i.item_id));
    return stock
      .filter(s => !addedIds.has(s.item_id))
      .filter(s => !itemSearch || s.item_name.toLowerCase().includes(itemSearch.toLowerCase()));
  }, [stock, lineItems, itemSearch]);

  const addItem = (stockItem: StockItem) => {
    setLineItems(prev => [...prev, {
      item_id: stockItem.item_id,
      item_name: stockItem.item_name,
      package_quantity_grams: stockItem.package_quantity_grams,
      quantity: 1,
      selling_price: stockItem.selling_price,
      available_qty: stockItem.available_qty
    }]);
    setItemSearch('');
  };

  const updateLineItem = (idx: number, field: keyof LineItem, value: number) => {
    setLineItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const removeLineItem = (idx: number) => {
    setLineItems(prev => prev.filter((_, i) => i !== idx));
  };

  const subtotal = lineItems.reduce((sum, item) => sum + item.selling_price * item.quantity, 0);
  const discountPct = Math.min(Math.max(parseFloat(discount) || 0, 0), 100);
  const discountAmt = (subtotal * discountPct) / 100;
  const total = subtotal - discountAmt;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) return;
    if (lineItems.length === 0) return;

    setSubmitting(true);
    try {
      const result = await onSubmit({
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_address: customerAddress,
        customer_id: selectedCustomerId || undefined,
        items: lineItems.map(i => ({ item_id: i.item_id, quantity: i.quantity, selling_price: i.selling_price })),
        discount_percent: discountPct,
        notes,
        bill_date: billDate
      });
      if (result && onWhatsApp) {
        setCreatedBill(result);
        setShowSendOption(true);
      }
    } catch (err: any) {
      // error handled by caller
    } finally {
      setSubmitting(false);
    }
  };

  // Post-creation: send via WhatsApp?
  if (showSendOption && createdBill) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onCancel}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
          <div className="text-center">
            <div className="text-5xl mb-3">✅</div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Bill Created!</h3>
            <p className="text-slate-600 text-sm mb-1">Bill No: <span className="font-mono font-bold">{createdBill.bill_number}</span></p>
            <p className="text-2xl font-bold text-emerald-600 mb-4">₹{createdBill.total}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => { onWhatsApp!(createdBill); onCancel(); }}
                className="px-5 py-2.5 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors flex items-center gap-2"
              >
                📲 Send WhatsApp
              </button>
              <button onClick={onCancel} className="px-5 py-2.5 bg-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-300 transition-colors">
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-4" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white rounded-t-2xl border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">{bill ? 'Edit Bill' : 'New Bill'}</h3>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Customer Details */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-3">
            <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              👤 Customer Details
            </h4>

            {/* Customer Search / Select */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search existing customers (name or phone)..."
                value={customerSearch}
                onChange={e => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); }}
                onFocus={() => setShowCustomerDropdown(true)}
                className="input-field text-sm"
              />
              {showCustomerDropdown && filteredCustomers.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 max-h-48 overflow-y-auto z-20">
                  {filteredCustomers.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => selectCustomer(c)}
                      className="w-full text-left px-3 py-2 hover:bg-brand-50 flex items-center justify-between text-sm border-b border-slate-100 last:border-0"
                    >
                      <span className="font-medium text-slate-900">{c.name}</span>
                      <span className="text-xs text-slate-500">{c.phone || 'No phone'}</span>
                    </button>
                  ))}
                </div>
              )}
              {showCustomerDropdown && customerSearch && filteredCustomers.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 p-2 text-center text-xs text-slate-500 z-20">
                  No matching customer — fill details below to create new
                </div>
              )}
            </div>

            {selectedCustomerId && (
              <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 px-2 py-1 rounded">
                <span>✓ Linked to existing customer</span>
                <button type="button" onClick={() => { setSelectedCustomerId(null); setCustomerName(''); setCustomerPhone(''); setCustomerAddress(''); }} className="ml-auto text-red-500 hover:text-red-700 font-medium">Clear</button>
              </div>
            )}

            <input
              type="text"
              placeholder="Customer Name *"
              value={customerName}
              onChange={e => { setCustomerName(e.target.value); if (selectedCustomerId) setSelectedCustomerId(null); }}
              className="input-field"
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="tel"
                placeholder="Phone Number"
                value={customerPhone}
                onChange={e => { setCustomerPhone(e.target.value); if (selectedCustomerId) setSelectedCustomerId(null); }}
                className="input-field"
              />
              <input
                type="date"
                value={billDate}
                onChange={e => setBillDate(e.target.value)}
                className="input-field"
                title="Bill date"
                aria-label="Bill date"
              />
            </div>
            <input
              type="text"
              placeholder="Address"
              value={customerAddress}
              onChange={e => { setCustomerAddress(e.target.value); if (selectedCustomerId) setSelectedCustomerId(null); }}
              className="input-field"
            />
          </div>

          {/* Add Items */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-3">
            <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              📦 Items <span className="text-xs text-slate-400 font-normal">(from stock)</span>
            </h4>

            {/* Item Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search items to add..."
                value={itemSearch}
                onChange={e => setItemSearch(e.target.value)}
                className="input-field"
              />
              {itemSearch && filteredStock.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 max-h-48 overflow-y-auto z-10">
                  {filteredStock.slice(0, 10).map(s => (
                    <button
                      key={s.item_id}
                      type="button"
                      onClick={() => addItem(s)}
                      className="w-full text-left px-3 py-2 hover:bg-brand-50 flex items-center justify-between text-sm border-b border-slate-100 last:border-0"
                    >
                      <span>
                        <span className="font-medium text-slate-900">{s.item_name}</span>
                        <span className="text-slate-500 ml-2">{s.package_quantity_grams}g</span>
                      </span>
                      <span className="text-xs">
                        <span className="text-emerald-600 font-medium">₹{s.selling_price}</span>
                        <span className="text-slate-400 ml-2">Stock: {s.available_qty}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {itemSearch && filteredStock.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 p-3 text-center text-sm text-slate-500 z-10">
                  No items in stock matching "{itemSearch}"
                </div>
              )}
            </div>

            {/* Line Items */}
            {lineItems.length > 0 && (
              <div className="space-y-2">
                {lineItems.map((item, idx) => (
                  <div key={idx} className="bg-white rounded-lg p-3 border border-slate-200 flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{item.item_name}</p>
                      <p className="text-[11px] text-slate-500">{item.package_quantity_grams}g • Stock: {item.available_qty}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="number"
                        min={1}
                        max={item.available_qty}
                        value={item.quantity || ''}
                        onChange={e => updateLineItem(idx, 'quantity', e.target.value === '' ? 0 : (parseInt(e.target.value) || 0))}
                        className="w-16 px-2 py-1 border border-slate-300 rounded text-sm text-center"
                        title="Quantity"
                        aria-label={`Quantity for ${item.item_name}`}
                      />
                      <span className="text-xs text-slate-500">×</span>
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        value={item.selling_price || ''}
                        onChange={e => updateLineItem(idx, 'selling_price', e.target.value === '' ? 0 : (parseFloat(e.target.value) || 0))}
                        className="w-20 px-2 py-1 border border-slate-300 rounded text-sm text-center"
                        title="Price"
                        aria-label={`Price for ${item.item_name}`}
                      />
                      <span className="text-sm font-semibold text-slate-700 w-16 text-right">
                        ₹{(item.quantity * item.selling_price).toFixed(0)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeLineItem(idx)}
                        className="text-red-400 hover:text-rose-600 text-lg ml-1"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {lineItems.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-3">Search and add items above</p>
            )}
          </div>

          {/* Discount & Totals */}
          <div className="bg-gradient-to-br from-emerald-50 to-blue-50 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <label htmlFor="discount-input" className="text-sm font-medium text-slate-700 shrink-0">Discount %</label>
              <input
                id="discount-input"
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={discount}
                onChange={e => setDiscount(e.target.value)}
                className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-sm text-center"
              />
              <div className="flex-1"></div>
            </div>

            <div className="border-t border-slate-200 pt-3 space-y-1">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              {discountPct > 0 && (
                <div className="flex justify-between text-sm text-orange-600">
                  <span>Discount ({discountPct}%)</span>
                  <span>-₹{discountAmt.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold text-emerald-700 pt-1 border-t border-slate-300">
                <span>Total</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <textarea
            placeholder="Notes (optional)"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            className="input-field"
          />

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting || !customerName.trim() || lineItems.length === 0}
              className="btn-primary flex-1"
            >
              {submitting ? 'Saving...' : bill ? 'Update Bill' : 'Create Bill'}
            </button>
            <button type="button" onClick={onCancel} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

