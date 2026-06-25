import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { api, Item, Purchase } from '../services/api';
import PurchaseForm from './PurchaseForm';
import PurchaseBulkUploadModal from './PurchaseBulkUploadModal';

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [totalCost, setTotalCost] = useState(0);
  const [totalQty, setTotalQty] = useState(0);

  const fetchPurchases = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getPurchases({
        search: search || undefined,
        from_date: dateFrom || undefined,
        to_date: dateTo || undefined
      });
      setPurchases(res.purchases);
      setTotalCost(res.totalCost);
      setTotalQty(res.totalQty);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, dateFrom, dateTo]);

  const fetchItems = useCallback(async () => {
    try {
      const res = await api.getItems();
      setItems(res.items);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchPurchases(); }, [fetchPurchases]);
  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleCreate = async (data: any) => {
    await api.createPurchase(data);
    toast.success('Purchase recorded');
    setShowForm(false);
    fetchPurchases();
  };

  const handleUpdate = async (data: any) => {
    if (!editingPurchase) return;
    await api.updatePurchase(editingPurchase.id, data);
    toast.success('Purchase updated');
    setEditingPurchase(null);
    fetchPurchases();
  };

  const handleDelete = async (purchase: Purchase) => {
    if (!confirm(`Delete purchase of ${purchase.item_name} (${purchase.quantity} units)?`)) return;
    await api.deletePurchase(purchase.id);
    toast.success('Purchase deleted');
    fetchPurchases();
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-900">Purchases</h2>
        <div className="flex gap-2">
          <button onClick={() => setShowBulkUpload(true)} className="btn-secondary text-sm">
            Bulk Upload
          </button>
          <button onClick={() => setShowForm(true)} className="btn-primary text-sm">
            + Record Purchase
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap mb-4">
        <input
          type="text"
          placeholder="Search by item name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field flex-1 min-w-[150px]"
        />
        <input
          type="date"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          className="input-field w-auto"
          title="From date"
        />
        <input
          type="date"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          className="input-field w-auto"
          title="To date"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        <div className="card text-center">
          <p className="text-2xl font-bold text-brand-600">{purchases.length}</p>
          <p className="text-xs text-slate-500">Purchases</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-orange-600">{totalQty}</p>
          <p className="text-xs text-slate-500">Total Units</p>
        </div>
        <div className="card text-center col-span-2 sm:col-span-1">
          <p className="text-2xl font-bold text-red-600">₹{totalCost.toFixed(0)}</p>
          <p className="text-xs text-slate-500">Total Cost</p>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
        </div>
      )}

      {/* Empty State */}
      {!loading && purchases.length === 0 && (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">🛒</p>
          <p className="text-slate-600 font-medium">No purchases recorded</p>
          <p className="text-sm text-slate-500 mt-1">Record your first purchase</p>
          <button onClick={() => setShowForm(true)} className="btn-primary text-sm mt-4">
            + Record Purchase
          </button>
        </div>
      )}

      {/* Purchases List */}
      {!loading && purchases.length > 0 && (
        <div className="space-y-2">
          {purchases.map(p => (
            <div key={p.id} className="card flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-900 truncate">{p.item_name}</p>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                    p.packaging_style === 'packet' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                  }`}>
                    {p.package_quantity_grams}g
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                  <span>{p.purchase_date}</span>
                  <span>Qty: <strong className="text-slate-700">{p.quantity}</strong></span>
                  <span>@ ₹{p.purchase_cost}/unit</span>
                  {p.notes && <span className="italic truncate">"{p.notes}"</span>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-slate-900">₹{p.total_cost.toFixed(0)}</p>
                <div className="flex gap-1 mt-1">
                  <button
                    onClick={() => setEditingPurchase(p)}
                    className="text-[11px] text-brand-600 hover:text-brand-800 font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(p)}
                    className="text-[11px] text-red-600 hover:text-red-800 font-medium"
                  >
                    Del
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showForm && (
        <PurchaseForm
          items={items}
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}
      {editingPurchase && (
        <PurchaseForm
          items={items}
          purchase={editingPurchase}
          onSubmit={handleUpdate}
          onCancel={() => setEditingPurchase(null)}
        />
      )}
      {showBulkUpload && (
        <PurchaseBulkUploadModal
          onClose={() => setShowBulkUpload(false)}
          onUploaded={() => fetchPurchases()}
        />
      )}
    </div>
  );
}
