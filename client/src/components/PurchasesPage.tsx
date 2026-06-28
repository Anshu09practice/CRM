import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { api, Item, Purchase } from '../services/api';
import PurchaseForm from './PurchaseForm';
import PurchaseBulkUploadModal from './PurchaseBulkUploadModal';
import DeleteModal from './DeleteModal';

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
  const [deletingPurchase, setDeletingPurchase] = useState<Purchase | null>(null);

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

  const handleDelete = (purchase: Purchase) => {
    setDeletingPurchase(purchase);
  };

  const confirmDelete = async () => {
    if (!deletingPurchase) return;
    try {
      await api.deletePurchase(deletingPurchase.id);
      toast.success('Purchase deleted');
      fetchPurchases();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeletingPurchase(null);
    }
  };

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="text"
          placeholder="Search by item name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field pl-9 pr-9"
        />
        {search && (
          <button onClick={() => setSearch('')} aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Date + bulk upload chip */}
      <div className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar -mx-1 px-1">
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          className="shrink-0 text-xs px-3 py-1.5 rounded-full border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-500 dark:text-stone-400"
          title="From date" />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          className="shrink-0 text-xs px-3 py-1.5 rounded-full border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-500 dark:text-stone-400"
          title="To date" />
        <button onClick={() => setShowBulkUpload(true)}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
          Bulk Upload
        </button>
      </div>

      {/* Summary */}
      {!loading && purchases.length > 0 && (
        <div className="flex items-center justify-between px-0.5">
          <p className="text-sm text-stone-500 dark:text-stone-400">{purchases.length} purchases · {totalQty} units</p>
          <p className="text-sm font-semibold text-rose-700 dark:text-rose-400">₹{totalCost.toFixed(0)} cost</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-stone-200 border-t-brand-600"></div>
        </div>
      )}

      {/* Empty State */}
      {!loading && purchases.length === 0 && (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">🛒</p>
          <p className="text-stone-800 dark:text-stone-200 font-medium">No purchases recorded</p>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">Record your first purchase</p>
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
                  <p className="font-semibold text-stone-900 dark:text-stone-100 truncate">{p.item_name}</p>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                    p.packaging_style === 'packet' ? 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400' : 'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400'
                  }`}>
                    {p.package_quantity_grams}g
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-stone-500 dark:text-stone-400 mt-1">
                  <span>{p.purchase_date}</span>
                  <span>Qty: <strong className="text-stone-700 dark:text-stone-300">{p.quantity}</strong></span>
                  <span>@ ₹{p.purchase_cost}/unit</span>
                  {p.notes && <span className="italic truncate">"{p.notes}"</span>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-zinc-900 dark:text-zinc-100">₹{p.total_cost.toFixed(0)}</p>
                <div className="flex gap-1 mt-1">
                  <button
                    onClick={() => setEditingPurchase(p)}
                    className="min-h-[44px] flex items-center px-2 text-[11px] text-brand-600 dark:text-brand-400 hover:text-brand-800 font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(p)}
                    className="min-h-[44px] flex items-center px-2 text-[11px] text-rose-600 dark:text-rose-400 hover:text-red-800 font-medium"
                  >
                    Del
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FAB — Record Purchase */}
      <button
        onClick={() => setShowForm(true)}
        className="m3-fab"
        aria-label="Record new purchase"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>

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
      {deletingPurchase && (
        <DeleteModal
          itemName={`purchase of ${deletingPurchase.item_name} (${deletingPurchase.quantity} units)`}
          onConfirm={confirmDelete}
          onCancel={() => setDeletingPurchase(null)}
        />
      )}
    </div>
  );
}
