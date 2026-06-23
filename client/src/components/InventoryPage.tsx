import { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import ItemCard from './ItemCard';
import ItemForm from './ItemForm';
import DeleteModal from './DeleteModal';
import ImportModal from './ImportModal';
import BulkUpdateModal from './BulkUpdateModal';
import { api, Item, Category } from '../services/api';

export default function InventoryPage() {
  const { isOwner } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
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
      const res = await api.getItems(search || undefined, filterStyle || undefined, filterCategory || undefined);
      setItems(res.items);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [search, filterStyle, filterCategory]);

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
        <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
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
        <input
          type="text"
          placeholder="Search items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input flex-1"
        />
        <select value={filterStyle} onChange={(e) => setFilterStyle(e.target.value)} className="input w-full sm:w-40">
          <option value="">All Types</option>
          <option value="packet">Packet</option>
          <option value="standing_package">Standing Package</option>
        </select>
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="input w-full sm:w-40">
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Items count + stock info */}
      <div className="flex items-center gap-4 text-sm text-gray-500">
        <span>{items.length} items</span>
        {items.filter(i => (i.current_stock || 0) <= (i.low_stock_threshold || 10)).length > 0 && (
          <span className="text-red-600 font-medium">
            ⚠ {items.filter(i => (i.current_stock || 0) <= (i.low_stock_threshold || 10)).length} low stock
          </span>
        )}
      </div>

      {/* Items Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-40 bg-gray-200 rounded-xl animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg">No items found</p>
          <p className="text-sm mt-1">Add your first item to get started</p>
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
