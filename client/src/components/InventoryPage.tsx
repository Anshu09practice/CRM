import { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import ItemCard from './ItemCard';
import ItemForm from './ItemForm';
import DeleteModal from './DeleteModal';
import ImportModal from './ImportModal';
import BulkUpdateModal from './BulkUpdateModal';
import { api, Item, Category } from '../services/api';
import { useDebounce } from '../hooks/useDebounce';

export default function InventoryPage() {
  const { isOwner } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [filterStyle, setFilterStyle] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [deletingItem, setDeletingItem] = useState<Item | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showBulkUpdate, setShowBulkUpdate] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadItems = useCallback(async () => {
    try {
      const res = await api.getItems(debouncedSearch || undefined, filterStyle || undefined, filterCategory || undefined);
      setItems(res.items);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filterStyle, filterCategory]);

  const loadCategories = useCallback(async () => {
    try {
      const cats = await api.getCategories();
      setCategories(cats);
    } catch {}
  }, []);

  useEffect(() => { loadItems(); }, [loadItems]);
  useEffect(() => { loadCategories(); }, [loadCategories]);

  const handleDelete = async () => {
    if (!deletingItem?.id) return;
    try {
      await api.deleteItem(deletingItem.id);
      toast.success('Item deleted');
      setDeletingItem(null);
      loadItems();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleBulkDelete = async () => {
    try {
      const res = await api.bulkDeleteItems();
      toast.success(`Deleted ${res.deleted} items`);
      setShowBulkDelete(false);
      loadItems();
    } catch (e: any) {
      toast.error(e.message);
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
          placeholder="Search items..."
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

      {/* Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar -mx-1 px-1">
        {[
          { value: '',                 label: 'All' },
          { value: 'packet',           label: 'Packet' },
          { value: 'standing_package', label: 'Standing' },
        ].map(({ value, label }) => (
          <button key={`type-${value}`}
            onClick={() => setFilterStyle(value)}
            className={`shrink-0 ${filterStyle === value ? 'm3-chip-active' : 'm3-chip'}`}>
            {label}
          </button>
        ))}
        {categories.length > 0 && (
          <>
            <div className="w-px bg-stone-200 dark:bg-stone-700 shrink-0 self-stretch my-0.5" />
            {categories.map(c => (
              <button key={c.id}
                onClick={() => setFilterCategory(filterCategory === String(c.id) ? '' : String(c.id))}
                className={`shrink-0 ${filterCategory === String(c.id) ? 'm3-chip-active' : 'm3-chip'}`}>
                {c.name}
              </button>
            ))}
          </>
        )}
      </div>

      {/* Owner tools */}
      {isOwner && (
        <div className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar -mx-1 px-1">
          <button onClick={() => setShowImport(true)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
            Import
          </button>
          <button onClick={() => setShowBulkUpdate(true)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
            Bulk Update
          </button>
          <button onClick={() => setShowBulkDelete(true)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
            Bulk Delete
          </button>
        </div>
      )}

      {/* Summary */}
      {!loading && items.length > 0 && (
        <div className="flex items-center justify-between px-0.5">
          <p className="text-sm text-stone-500 dark:text-stone-400">{items.length} items</p>
          {items.filter(i => (i.current_stock || 0) <= (i.low_stock_threshold || 10)).length > 0 && (
            <span className="badge-danger">
              {items.filter(i => (i.current_stock || 0) <= (i.low_stock_threshold || 10)).length} low stock
            </span>
          )}
        </div>
      )}

      {/* Items Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-44 bg-stone-100 dark:bg-stone-800 rounded-2xl animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-brand-50 dark:bg-brand-950/40 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
          </div>
          <p className="text-stone-800 dark:text-stone-200 font-semibold">No items found</p>
          <p className="text-sm text-stone-400 mt-1">Add your first item to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onEdit={() => { setEditingItem(item); setShowForm(true); }}
              onDelete={() => setDeletingItem(item)}
            />
          ))}
        </div>
      )}

      {/* FAB — Add Item */}
      <button
        onClick={() => { setEditingItem(null); setShowForm(true); }}
        className="m3-fab"
        aria-label="Add new item"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>

      {/* Modals */}
      {showForm && (
        <ItemForm
          item={editingItem}
          categories={categories}
          onClose={() => { setShowForm(false); setEditingItem(null); }}
          onSaved={() => { setShowForm(false); setEditingItem(null); loadItems(); }}
        />
      )}

      {deletingItem && (
        <DeleteModal
          itemName={deletingItem.item_name}
          onConfirm={handleDelete}
          onCancel={() => setDeletingItem(null)}
        />
      )}

      {showImport && <ImportModal onClose={() => setShowImport(false)} onImported={() => { setShowImport(false); loadItems(); }} />}
      {showBulkUpdate && <BulkUpdateModal onClose={() => setShowBulkUpdate(false)} onUpdated={() => { setShowBulkUpdate(false); loadItems(); }} />}

      {showBulkDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-semibold text-red-600 mb-2">Delete All Items</h3>
            <p className="text-sm text-stone-600 dark:text-stone-400 mb-4">
              This will permanently delete <strong>all {items.length} items</strong> from inventory. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowBulkDelete(false)} className="btn-secondary text-sm">Cancel</button>
              <button onClick={handleBulkDelete} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">Delete All</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
