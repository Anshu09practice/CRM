import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { api, UserInfo, Category } from '../services/api';

export default function SettingsPage() {
  const { isOwner, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'categories' | 'password'>('users');

  if (!isOwner) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <PasswordSection />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      <div className="flex gap-2 border-b border-gray-200 pb-2">
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
        active ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
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

  async function handleDelete(user: UserInfo) {
    if (!confirm(`Delete user "${user.username}"?`)) return;
    try {
      await api.deleteUser(user.id);
      toast.success('User deleted');
      loadUsers();
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-semibold text-gray-800">User Accounts</h2>
        <button onClick={() => setShowForm(true)} className="btn-primary text-xs">+ Add User</button>
      </div>

      {loading ? <div className="h-20 bg-gray-200 rounded-lg animate-pulse" /> : (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="bg-white rounded-lg border border-gray-200 p-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{u.username}</p>
                <p className="text-xs text-gray-500 capitalize">{u.role} • {u.is_active ? 'Active' : 'Inactive'}</p>
                {u.last_login && <p className="text-xs text-gray-400">Last login: {new Date(u.last_login).toLocaleDateString()}</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => toggleActive(u)} className={`text-xs ${u.is_active ? 'text-amber-600' : 'text-green-600'}`}>
                  {u.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button onClick={() => handleDelete(u)} className="text-xs text-red-600">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <form onSubmit={handleCreate} className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-semibold mb-4">Create User</h2>
            <div className="space-y-3">
              <div>
                <label className="label">Username *</label>
                <input name="username" required className="input w-full" />
              </div>
              <div>
                <label className="label">Password *</label>
                <input name="password" type="password" required minLength={4} className="input w-full" />
              </div>
              <div>
                <label className="label">Role *</label>
                <select name="role" className="input w-full">
                  <option value="manager">Manager</option>
                  <option value="owner">Owner</option>
                </select>
              </div>
              <div>
                <label className="label">Security Question</label>
                <input name="security_question" placeholder="e.g., Your pet's name?" className="input w-full" />
              </div>
              <div>
                <label className="label">Security Answer</label>
                <input name="security_answer" className="input w-full" />
              </div>
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary">Create</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function CategoriesSection() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadCategories(); }, []);

  async function loadCategories() {
    try { setCategories(await api.getCategories()); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await api.createCategory({ name: newName.trim() });
      toast.success('Category added');
      setNewName('');
      loadCategories();
    } catch (e: any) { toast.error(e.message); }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this category? Items in this category will be uncategorized.')) return;
    try {
      await api.deleteCategory(id);
      toast.success('Category deleted');
      loadCategories();
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-gray-800">Item Categories</h2>

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New category name..."
          className="input flex-1"
        />
        <button type="submit" className="btn-primary text-xs">Add</button>
      </form>

      {loading ? <div className="h-20 bg-gray-200 rounded-lg animate-pulse" /> : (
        <div className="space-y-2">
          {categories.map((c) => (
            <div key={c.id} className="bg-white rounded-lg border border-gray-200 p-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{c.name}</p>
                <p className="text-xs text-gray-500">{c.item_count || 0} items</p>
              </div>
              <button onClick={() => handleDelete(c.id)} className="text-xs text-red-600 hover:text-red-800">Delete</button>
            </div>
          ))}
          {categories.length === 0 && <p className="text-gray-400 text-sm">No categories yet</p>}
        </div>
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
      <h2 className="font-semibold text-gray-800 mb-4">Change Password</h2>
      <form onSubmit={handleChange} className="space-y-3">
        <div>
          <label className="label">Current Password</label>
          <input name="current" type="password" required className="input w-full" />
        </div>
        <div>
          <label className="label">New Password</label>
          <input name="new" type="password" required minLength={4} className="input w-full" />
        </div>
        <div>
          <label className="label">Confirm New Password</label>
          <input name="confirm" type="password" required minLength={4} className="input w-full" />
        </div>
        <button type="submit" className="btn-primary">Update Password</button>
      </form>
    </div>
  );
}
