import { useState, useCallback } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './components/LoginPage';
import Layout from './components/Layout';
import ItemCard from './components/ItemCard';
import ItemForm from './components/ItemForm';
import DeleteModal from './components/DeleteModal';
import ImportModal from './components/ImportModal';
import BulkUpdateModal from './components/BulkUpdateModal';
import PurchasesPage from './components/PurchasesPage';
import BillingPage from './components/BillingPage';
import { useItems } from './hooks/useItems';
import { api, Item } from './services/api';

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
      <AuthGate />
    </AuthProvider>
  );
}

function AuthGate() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <MainApp />;
}

function MainApp() {
  const { logout, username } = useAuth();
  const [activeTab, setActiveTab] = useState<'inventory' | 'purchases' | 'billing'>('billing');
  const [search, setSearch] = useState('');
  const [filterStyle, setFilterStyle] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [deletingItem, setDeletingItem] = useState<Item | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showBulkUpdate, setShowBulkUpdate] = useState(false);

  const { items, loading, error, isOffline, refetch } = useItems(search, filterStyle);

  // Add item
  const handleAdd = useCallback(async (data: Partial<Item>) => {
    await api.createItem(data);
    toast.success('Item added successfully');
    setShowForm(false);
    refetch();
  }, [refetch]);

  // Edit item
  const handleEdit = useCallback(async (data: Partial<Item>) => {
    if (!editingItem?.id) return;
    await api.updateItem(editingItem.id, data);
    toast.success('Item updated successfully');
    setEditingItem(null);
    refetch();
  }, [editingItem, refetch]);

  // Delete item
  const handleDelete = useCallback(async () => {
    if (!deletingItem?.id) return;
    await api.deleteItem(deletingItem.id);
    toast.success('Item deleted');
    setDeletingItem(null);
    refetch();
  }, [deletingItem, refetch]);

  // Backup
  const handleBackup = async () => {
    try {
      await api.createBackup();
      toast.success('Backup created successfully');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <>
      <Layout isOffline={isOffline}>
        {/* Tab Navigation */}
        <div className="flex items-center gap-1 mb-5 bg-slate-100 rounded-xl p-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('billing')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'billing'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            🧾 Billing
          </button>
          <button
            onClick={() => setActiveTab('purchases')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'purchases'
                ? 'bg-white text-brand-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            🛒 Purchases
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'inventory'
                ? 'bg-white text-brand-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            📦 Inventory
          </button>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-slate-400 hidden sm:inline">{username}</span>
            <button onClick={logout} className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">
              Logout
            </button>
          </div>
        </div>

        {/* Billing Tab */}
        {activeTab === 'billing' && <BillingPage />}

        {/* Purchases Tab */}
        {activeTab === 'purchases' && <PurchasesPage />}

        {/* Inventory Tab */}
        {activeTab === 'inventory' && (<>
        {/* Search & Actions Bar */}
        <div className="space-y-3 mb-4">
          {/* Search */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search items..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-field flex-1"
            />
            <select
              value={filterStyle}
              onChange={e => setFilterStyle(e.target.value)}
              className="input-field w-auto"
            >
              <option value="">All Types</option>
              <option value="packet">Packet</option>
              <option value="standing_package">Standing Pack</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 flex-wrap items-center">
            <button onClick={() => setShowForm(true)} className="btn-primary text-sm">
              + Add Item
            </button>
            <button onClick={() => setShowImport(true)} className="btn-secondary text-sm">
              📥 Import Excel
            </button>
            <button onClick={() => setShowBulkUpdate(true)} className="btn-secondary text-sm">
              📋 CSV Bulk Update
            </button>
            <button onClick={handleBackup} className="btn-secondary text-sm">
              💾 Backup
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="card text-center">
            <p className="text-2xl font-bold text-brand-600">{items.length}</p>
            <p className="text-xs text-slate-500">Total Items</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-blue-600">
              {items.filter(i => i.packaging_style === 'packet').length}
            </p>
            <p className="text-xs text-slate-500">Packets</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-purple-600">
              {items.filter(i => i.packaging_style === 'standing_package').length}
            </p>
            <p className="text-xs text-slate-500">Standing Packs</p>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
          </div>
        )}

        {/* Empty State */}
        {!loading && items.length === 0 && (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">📦</p>
            <p className="text-slate-600 font-medium">No items found</p>
            <p className="text-sm text-slate-500 mt-1">Add your first item or import from Excel</p>
            <div className="flex gap-2 justify-center mt-4">
              <button onClick={() => setShowForm(true)} className="btn-primary text-sm">
                + Add Item
              </button>
              <button onClick={() => setShowImport(true)} className="btn-secondary text-sm">
                📥 Import
              </button>
            </div>
          </div>
        )}

        {/* Items Grid */}
        {!loading && items.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map(item => (
              <ItemCard
                key={item.id}
                item={item}
                onEdit={() => setEditingItem(item)}
                onDelete={() => setDeletingItem(item)}
              />
            ))}
          </div>
        )}

        {/* Modals */}
        {showForm && (
          <ItemForm onSubmit={handleAdd} onCancel={() => setShowForm(false)} />
        )}

        {editingItem && (
          <ItemForm item={editingItem} onSubmit={handleEdit} onCancel={() => setEditingItem(null)} />
        )}

        {deletingItem && (
          <DeleteModal
            itemName={deletingItem.item_name}
            onConfirm={handleDelete}
            onCancel={() => setDeletingItem(null)}
          />
        )}

        {showImport && (
          <ImportModal onClose={() => setShowImport(false)} onImported={refetch} />
        )}

        {showBulkUpdate && (
          <BulkUpdateModal onClose={() => setShowBulkUpdate(false)} onUpdated={refetch} />
        )}
        </>)}
      </Layout>
    </>
  );
}
