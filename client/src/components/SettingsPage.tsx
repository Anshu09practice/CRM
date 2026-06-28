import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { api, UserInfo, Category } from '../services/api';
import DeleteModal from './DeleteModal';

export default function SettingsPage() {
  const { isOwner, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'categories' | 'password'>('users');

  if (!isOwner) {
    return (
      <div className="space-y-4">
        <h1 className="page-title">Settings</h1>
        <PasswordSection />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="page-title">Settings</h1>

      <div className="flex gap-2 overflow-x-auto no-scrollbar border-b border-stone-200 dark:border-stone-700 pb-2">
        <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')}>Users</TabButton>
        <TabButton active={activeTab === 'categories'} onClick={() => setActiveTab('categories')}>Categories</TabButton>
        <TabButton active={activeTab === 'password'} onClick={() => setActiveTab('password')}>Password</TabButton>
      </div>

      {activeTab === 'users' && <UsersSection />}
      {activeTab === 'categories' && <CategoriesSection />}
      {activeTab === 'password' && <PasswordSection />}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
        active ? 'bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800'
      }`}
    >
      {children}
    </button>
  );
}

function UsersSection() {
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deletingUser, setDeletingUser] = useState<UserInfo | null>(null);

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    try { setUsers(await api.getUsers()); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await api.createUser({
        username: form.get('username') as string,
        password: form.get('password') as string,
        role: form.get('role') as string,
        security_question: form.get('security_question') as string,
        security_answer: form.get('security_answer') as string,
      });
      toast.success('User created');
      setShowForm(false);
      loadUsers();
    } catch (e: any) { toast.error(e.message); }
  }

  async function toggleActive(user: UserInfo) {
    try {
      await api.updateUser(user.id, { is_active: !user.is_active });
      toast.success(user.is_active ? 'User deactivated' : 'User activated');
      loadUsers();
    } catch (e: any) { toast.error(e.message); }
  }

  function handleDelete(user: UserInfo) {
    setDeletingUser(user);
  }

  async function confirmDeleteUser() {
    if (!deletingUser) return;
    try {
      await api.deleteUser(deletingUser.id);
      toast.success('User deleted');
      loadUsers();
    } catch (e: any) { toast.error(e.message); }
    finally { setDeletingUser(null); }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-semibold text-stone-800 dark:text-stone-200">User Accounts</h2>
        <button onClick={() => setShowForm(true)} className="btn-primary text-xs">+ Add User</button>
      </div>

      {loading ? <div className="h-20 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse" /> : (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="card p-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-stone-900 dark:text-stone-100">{u.username}</p>
                <p className="text-xs text-stone-500 dark:text-stone-400 capitalize">{u.role} • {u.is_active ? 'Active' : 'Inactive'}</p>
                {u.last_login && <p className="text-xs text-stone-400">Last login: {new Date(u.last_login).toLocaleDateString()}</p>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => toggleActive(u)} className={`min-h-[44px] flex items-center px-2 text-xs ${u.is_active ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}>
                  {u.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button onClick={() => handleDelete(u)} className="min-h-[44px] flex items-center px-2 text-xs text-rose-600 dark:text-rose-400">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <form onSubmit={handleCreate} className="bg-white dark:bg-stone-900 rounded-2xl p-6 w-full max-w-md shadow-xl border border-stone-200 dark:border-stone-800">
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">Create User</h2>
            <div className="space-y-3">
              <div>
                <label htmlFor="create-username" className="label">Username *</label>
                <input id="create-username" name="username" required className="input w-full" />
              </div>
              <div>
                <label htmlFor="create-password" className="label">Password *</label>
                <input id="create-password" name="password" type="password" required minLength={4} className="input w-full" />
              </div>
              <div>
                <label htmlFor="create-role" className="label">Role *</label>
                <select id="create-role" name="role" className="input w-full">
                  <option value="manager">Manager</option>
                  <option value="owner">Owner</option>
                </select>
              </div>
              <div>
                <label htmlFor="create-security-question" className="label">Security Question</label>
                <input id="create-security-question" name="security_question" placeholder="e.g., Your pet's name?" className="input w-full" />
              </div>
              <div>
                <label htmlFor="create-security-answer" className="label">Security Answer</label>
                <input id="create-security-answer" name="security_answer" className="input w-full" />
              </div>
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary">Create</button>
            </div>
          </form>
        </div>
      )}
      {deletingUser && (
        <DeleteModal
          itemName={`user "${deletingUser.username}"`}
          onConfirm={confirmDeleteUser}
          onCancel={() => setDeletingUser(null)}
        />
      )}
    </div>
  );
}

function CategoriesSection() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);
  const [deletingCategoryId, setDeletingCategoryId] = useState<number | null>(null);

  useEffect(() => { loadCategories(); }, []);

  async function loadCategories() {
    try { setCategories(await api.getCategories()); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }

  async function handleAdd() {
    if (!newName.trim()) return;
    try {
      await api.createCategory({ name: newName.trim() });
      toast.success('Category added');
      setNewName('');
      loadCategories();
    } catch (err: any) { toast.error(err.message || 'Failed to add category'); }
  }

  function handleDelete(id: number) {
    setDeletingCategoryId(id);
  }

  async function confirmDeleteCategory() {
    if (deletingCategoryId === null) return;
    try {
      await api.deleteCategory(deletingCategoryId);
      toast.success('Category deleted');
      loadCategories();
    } catch (err: any) { toast.error(err.message || 'Failed to delete category'); }
    finally { setDeletingCategoryId(null); }
  }

  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-stone-800 dark:text-stone-200">Item Categories</h2>

      <div className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
          placeholder="New category name..."
          className="input flex-1"
        />
        <button type="button" onClick={handleAdd} className="btn-primary text-xs">Add</button>
      </div>

      {loading ? <div className="h-20 bg-stone-100 dark:bg-stone-800 rounded-lg animate-pulse" /> : (
        <div className="space-y-2">
          {categories.map((c) => (
            <div key={c.id} className="card p-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-stone-900 dark:text-stone-100">{c.name}</p>
                <p className="text-xs text-stone-500 dark:text-stone-400">{c.item_count || 0} items</p>
              </div>
              <button onClick={() => handleDelete(c.id)} className="min-h-[44px] flex items-center px-2 text-xs text-rose-600 dark:text-rose-400 hover:text-red-800">Delete</button>
            </div>
          ))}
          {categories.length === 0 && <p className="text-stone-400 text-sm">No categories yet</p>}
        </div>
      )}
      {deletingCategoryId !== null && (
        <DeleteModal
          itemName="this category"
          onConfirm={confirmDeleteCategory}
          onCancel={() => setDeletingCategoryId(null)}
        />
      )}
    </div>
  );
}

function PasswordSection() {
  async function handleChange(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const current = form.get('current') as string;
    const newPwd = form.get('new') as string;
    const confirm = form.get('confirm') as string;

    if (newPwd !== confirm) {
      toast.error('New passwords do not match');
      return;
    }

    try {
      await api.changePassword(current, newPwd);
      toast.success('Password changed successfully');
      (e.target as HTMLFormElement).reset();
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="max-w-md">
      <h2 className="font-semibold text-stone-800 dark:text-stone-200 mb-4">Change Password</h2>
      <form onSubmit={handleChange} className="space-y-3">
        <div>
          <label htmlFor="change-current-password" className="label">Current Password</label>
          <input id="change-current-password" name="current" type="password" required className="input w-full" />
        </div>
        <div>
          <label htmlFor="change-new-password" className="label">New Password</label>
          <input id="change-new-password" name="new" type="password" required minLength={4} className="input w-full" />
        </div>
        <div>
          <label htmlFor="change-confirm-password" className="label">Confirm New Password</label>
          <input id="change-confirm-password" name="confirm" type="password" required minLength={4} className="input w-full" />
        </div>
        <button type="submit" className="btn-primary">Update Password</button>
      </form>
    </div>
  );
}

