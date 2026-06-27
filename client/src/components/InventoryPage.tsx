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

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="page-title">Inventory</h1>
        <div className="flex flex-wrap gap-2">
          {isOwner && (
            <>
              <button onClick={() => setShowImport(true)} className="btn-secondary text-xs">Import</button>
              <button onClick={() => setShowBulkUpdate(true)} className="btn-secondary text-xs">Bulk Update</button>
            </>
          )}
          <button onClick={() => { setEditingItem(null); setShowForm(true); }} className="btn-primary text-xs">
            + Add Item
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input w-full pl-9"
          />
        </div>
        <select value={filterStyle} onChange={(e) => setFilterStyle(e.target.value)} className="input w-full sm:w-40" title="Filter by packaging type" aria-label="Filter by packaging type">
          <option value="">All Types</option>
          <option value="packet">Packet</option>
          <option value="standing_package">Standing Package</option>
        </select>
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="input w-full sm:w-40" title="Filter by category" aria-label="Filter by category">
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Items count + stock info */}
      <div className="flex items-center gap-3 text-sm">
        <span className="text-zinc-500">{items.length} items</span>
        {items.filter(i => (i.current_stock || 0) <= (i.low_stock_threshold || 10)).length > 0 && (
          <span className="badge-danger">
            {items.filter(i => (i.current_stock || 0) <= (i.low_stock_threshold || 10)).length} low stock
          </span>
        )}
      </div>

      {/* Items Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-44 bg-zinc-200 dark:bg-zinc-800 rounded-2xl animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
          </div>
          <p className="text-zinc-700 dark:text-zinc-300 font-semibold">No items found</p>
          <p className="text-sm text-zinc-400 mt-1">Add your first item to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
    </div>
  );
}
