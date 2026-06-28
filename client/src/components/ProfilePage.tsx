import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, isOfflineMode, getApiBase } from '../services/api';
import { localDb, localApi } from '../services/localDb';
import { toast } from 'react-hot-toast';

export default function ProfilePage() {
  const { user, isOwner, logout } = useAuth();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changing, setChanging] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [serverUrl, setServerUrl] = useState(() => localStorage.getItem('jj_server_url') || '');
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [pendingRestoreFile, setPendingRestoreFile] = useState<File | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 4) {
      toast.error('New password must be at least 4 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setChanging(true);
    try {
      const res = await fetch(`${(await import('../services/api')).getApiBase()}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('jj_token')}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change password');
      toast.success('Password changed successfully');
      setShowChangePassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setChanging(false);
    }
  };

  const handleMasterBackup = async () => {
    setBackingUp(true);
    try {
      let backupData: any;

      if (isOfflineMode()) {
        // Offline mode: read directly from local IndexedDB
        const [items, categories, customers, purchases, bills, billItems, payments, expenses] = await Promise.all([
          localDb.items.toArray(),
          localDb.categories.toArray(),
          localDb.customers.toArray(),
          localDb.purchases.toArray(),
          localDb.bills.toArray(),
          localDb.billItems.toArray(),
          localDb.payments.toArray(),
          localDb.expenses.toArray(),
        ]);
        backupData = {
          backup_date: new Date().toISOString(),
          app: 'Jalan Jyothi CRM',
          version: '1.0.0',
          data: { items, categories, customers, purchases, bills, billItems, payments, expenses }
        };
      } else {
        // Online mode: fetch from server
        const headers: Record<string, string> = { Authorization: `Bearer ${localStorage.getItem('jj_token')}` };
        const base = getApiBase();
        const [itemsRes, customersRes, purchasesRes, billsRes, expensesRes, categoriesRes] = await Promise.all([
          fetch(`${base}/items`, { headers }).then(r => r.json()),
          fetch(`${base}/customers`, { headers }).then(r => r.json()),
          fetch(`${base}/purchases`, { headers }).then(r => r.json()),
          fetch(`${base}/bills`, { headers }).then(r => r.json()),
          fetch(`${base}/expenses`, { headers }).then(r => r.json()),
          fetch(`${base}/categories`, { headers }).then(r => r.json()),
        ]);
        backupData = {
          backup_date: new Date().toISOString(),
          app: 'Jalan Jyothi CRM',
          version: '1.0.0',
          data: {
            items: itemsRes.items || itemsRes,
            categories: categoriesRes,
            customers: customersRes,
            purchases: purchasesRes.purchases || purchasesRes,
            bills: billsRes.bills || billsRes,
            expenses: expensesRes.expenses || expensesRes,
          }
        };
      }

      const jsonStr = JSON.stringify(backupData, null, 2);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `jj_crm_backup_${timestamp}.json`;

      // Save to device storage on mobile
      if ((window as any).Capacitor?.isNativePlatform?.()) {
        const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
        try {
          await Filesystem.mkdir({ path: 'Jalan Jyothi', directory: Directory.Documents, recursive: true });
        } catch (_e) { /* exists */ }
        await Filesystem.writeFile({
          path: `Jalan Jyothi/${filename}`,
          data: jsonStr,
          directory: Directory.Documents,
          encoding: Encoding.UTF8
        });
        // Also try ExternalStorage (Download folder)
        try {
          await Filesystem.mkdir({ path: 'Download/Jalan Jyothi', directory: Directory.ExternalStorage, recursive: true });
          await Filesystem.writeFile({
            path: `Download/Jalan Jyothi/${filename}`,
            data: jsonStr,
            directory: Directory.ExternalStorage,
            encoding: Encoding.UTF8
          });
        } catch (_e) { /* ExternalStorage may not be available */ }
        toast.success(`Backup saved to Jalan Jyothi/${filename}`, { duration: 5000 });
      } else {
        // Desktop: download as file
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
        toast.success('Backup downloaded!');
      }
    } catch (err: any) {
      toast.error('Backup failed: ' + err.message);
    } finally {
      setBackingUp(false);
    }
  };

  const handleRestoreBackup = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setPendingRestoreFile(file);
    };
    input.click();
  };

  async function confirmRestore() {
    if (!pendingRestoreFile) return;
    const file = pendingRestoreFile;
    setPendingRestoreFile(null);
    setRestoring(true);
    try {
      const text = await file.text();
      const backupData = JSON.parse(text);

      if (!backupData.data && !backupData.tables) {
        throw new Error('Invalid backup file format. Please select a valid Jalan Jyothi CRM backup JSON file.');
      }

      if (isOfflineMode()) {
        const dataToRestore = backupData.data || backupData.tables;
        const result = await localApi.restoreBackup(dataToRestore);
        toast.success(`Restored ${result.restored} records! Refresh the app to see updated data.`, { duration: 5000 });
      } else {
        const result = await api.restoreBackup(backupData);
        toast.success(`${result.message}`, { duration: 5000 });
      }
    } catch (err: any) {
      if (err instanceof SyntaxError) {
        toast.error('Invalid JSON file. Please select a valid backup file.');
      } else {
        toast.error('Restore failed: ' + err.message);
      }
    } finally {
      setRestoring(false);
    }
  }

  const handleSaveServerUrl = async () => {
    const url = serverUrl.trim().replace(/\/+$/, ''); // Remove trailing slashes
    if (!url) {
      // Clear server URL - switch to offline mode
      localStorage.removeItem('jj_server_url');
      localStorage.setItem('jj_offline_mode', 'true');
      toast.success('Switched to offline mode. Restart the app to apply.');
      return;
    }

    setTestingConnection(true);
    try {
      const res = await fetch(`${url}/api/auth/status`, { method: 'GET' });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      // Connection successful
      localStorage.setItem('jj_server_url', url);
      localStorage.removeItem('jj_offline_mode');
      toast.success('Connected to server! Restart the app to sync data.');
      setShowServerConfig(false);
    } catch (err: any) {
      toast.error(`Cannot connect: ${err.message}. Check the URL and ensure server is running.`);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 mb-6">Profile</h2>

      {/* User Info Card */}
      <div className="card mb-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-brand-100 dark:bg-brand-900/40 rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold text-brand-600 dark:text-brand-400">
              {user?.username?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100">{user?.username}</h3>
            <span className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${
              isOwner ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400' : 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400'
            }`}>
              {user?.role === 'owner' ? '👑 Owner' : '👤 Manager'}
            </span>
          </div>
        </div>
      </div>

      {/* Account Details */}
      <div className="card mb-4">
        <h4 className="text-sm font-semibold text-stone-700 dark:text-stone-300 mb-3">Account Details</h4>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-stone-100 dark:border-stone-800">
            <span className="text-sm text-stone-500 dark:text-stone-400">Username</span>
            <span className="text-sm font-medium text-stone-900 dark:text-stone-100">{user?.username}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-stone-100 dark:border-stone-800">
            <span className="text-sm text-stone-500 dark:text-stone-400">Role</span>
            <span className="text-sm font-medium text-stone-900 dark:text-stone-100 capitalize">{user?.role}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-stone-100 dark:border-stone-800">
            <span className="text-sm text-stone-500 dark:text-stone-400">Access Level</span>
            <span className="text-sm font-medium text-stone-900 dark:text-stone-100">
              {isOwner ? 'Full Access' : 'Limited Access'}
            </span>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="card mb-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-stone-700 dark:text-stone-300">Security</h4>
        </div>

        {!showChangePassword ? (
          <button
            onClick={() => setShowChangePassword(true)}
            className="w-full text-left flex items-center justify-between py-3 px-3 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">🔒</span>
                <div>
                  <p className="text-sm font-medium text-stone-900 dark:text-stone-100">Change Password</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">Update your account password</p>
              </div>
            </div>
            <span className="text-zinc-400">›</span>
          </button>
        ) : (
          <form onSubmit={handleChangePassword} className="space-y-3">
            <input
              type="password"
              placeholder="Current Password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className="input-field"
              required
            />
            <input
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="input-field"
              required
              minLength={4}
            />
            <input
              type="password"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="input-field"
              required
            />
            <div className="flex gap-2">
              <button type="submit" disabled={changing} className="btn-primary text-sm flex-1">
                {changing ? 'Changing...' : 'Update Password'}
              </button>
              <button
                type="button"
                onClick={() => { setShowChangePassword(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }}
                className="btn-secondary text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Server Connection */}
      <div className="card mb-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-stone-700 dark:text-stone-300">Server Connection</h4>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            localStorage.getItem('jj_server_url') ? 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400' : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
          }`}>
            {localStorage.getItem('jj_server_url') ? '🟢 Online' : '📴 Offline'}
          </span>
        </div>

        {!showServerConfig ? (
          <div>
            {localStorage.getItem('jj_server_url') && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2 break-all">
                Connected to: <span className="font-mono">{localStorage.getItem('jj_server_url')}</span>
              </p>
            )}
            <button
              onClick={() => setShowServerConfig(true)}
              className="w-full text-left flex items-center justify-between py-3 px-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">🌐</span>
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Configure Server</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Connect to central server for shared data</p>
                </div>
              </div>
              <span className="text-zinc-400">›</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-lg p-2">
              <p className="text-[11px] text-blue-700 dark:text-blue-300">
                Enter your server URL to sync data across all devices. Leave empty for offline mode.
              </p>
            </div>
            <input
              type="url"
              placeholder="https://your-server.com or https://192.168.1.5:3001"
              value={serverUrl}
              onChange={e => setServerUrl(e.target.value)}
              className="input-field text-sm font-mono"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveServerUrl}
                disabled={testingConnection}
                className="btn-primary text-sm flex-1"
              >
                {testingConnection ? 'Testing...' : serverUrl.trim() ? 'Test & Connect' : 'Switch to Offline'}
              </button>
              <button
                onClick={() => { setShowServerConfig(false); setServerUrl(localStorage.getItem('jj_server_url') || ''); }}
                className="btn-secondary text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Master Backup */}
      <div className="card mb-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Data & Backup</h4>
        </div>
        <button
          onClick={handleMasterBackup}
          disabled={backingUp}
          className="w-full text-left flex items-center justify-between py-3 px-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-lg">💾</span>
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {backingUp ? 'Creating Backup...' : 'Master Backup'}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Export all data (Inventory, Purchases, Bills, Customers, Expenses) as JSON
              </p>
            </div>
          </div>
          {backingUp ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600 shrink-0"></div>
          ) : (
            <span className="text-zinc-400 shrink-0">›</span>
          )}
        </button>
        <p className="text-[11px] text-zinc-400 mt-2 px-3">
          Saved to: Documents/Jalan Jyothi/ folder on your device
        </p>

        {/* Divider */}
        <div className="border-t border-zinc-100 dark:border-zinc-800 my-2"></div>

        {/* Restore Backup */}
        <button
          onClick={handleRestoreBackup}
          disabled={restoring}
          className="w-full text-left flex items-center justify-between py-3 px-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-lg">📂</span>
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {restoring ? 'Restoring Data...' : 'Restore Backup'}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Import a backup JSON file to restore all data (for migration)
              </p>
            </div>
          </div>
          {restoring ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600 shrink-0"></div>
          ) : (
            <span className="text-zinc-400 shrink-0">›</span>
          )}
        </button>
        <p className="text-[11px] text-zinc-400 mt-2 px-3">
          Upload a previously exported JSON backup to restore data on this device
        </p>
      </div>

      {/* App Info */}
      <div className="card mb-4">
        <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">App Info</h4>
        <div className="space-y-2">
          <div className="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-800">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">App Name</span>
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Jalan Jyothi CRM</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-800">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">Version</span>
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">1.0.0</span>
          </div>
        </div>
      </div>

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        className="w-full py-3 px-4 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-red-700 dark:text-rose-400 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
        </svg>
        Log Out
      </button>

      {pendingRestoreFile && (
        <div className="modal-overlay">
          <div className="modal-container max-w-sm mx-4 sm:mx-0">
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-amber-100 dark:bg-amber-950/50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-200 dark:border-amber-900/50">
                <span className="text-3xl">⚠️</span>
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">Restore Backup?</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                This will <strong className="text-rose-600 dark:text-rose-400">replace all existing data</strong> with <strong className="text-zinc-700 dark:text-zinc-300">{pendingRestoreFile.name}</strong>.<br />
                <span className="text-xs">This action cannot be undone.</span>
              </p>
              <div className="flex gap-3">
                <button onClick={() => setPendingRestoreFile(null)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={confirmRestore} className="btn-danger flex-1">Restore</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

