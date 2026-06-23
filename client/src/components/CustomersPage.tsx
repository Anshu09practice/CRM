import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { api, Customer } from '../services/api';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadCustomers(); }, [search]);

  async function loadCustomers() {
    try {
      const data = await api.getCustomers(search || undefined);
      setCustomers(data);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const data = {
      name: form.get('name') as string,
      phone: form.get('phone') as string,
      address: form.get('address') as string,
      notes: form.get('notes') as string,
    };

    try {
      if (editing) {
        await api.updateCustomer(editing.id, data);
        toast.success('Customer updated');
      } else {
        await api.createCustomer(data);
        toast.success('Customer added');
      }
      setShowForm(false);
      setEditing(null);
      loadCustomers();
    } catch (e: any) { toast.error(e.message); }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this customer?')) return;
    try {
      await api.deleteCustomer(id);
      toast.success('Customer deleted');
      loadCustomers();
      if (selectedCustomer?.id === id) setSelectedCustomer(null);
    } catch (e: any) { toast.error(e.message); }
  }

  async function viewDetails(customer: Customer) {
    try {
      const full = await api.getCustomer(customer.id);
      setSelectedCustomer(full);
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn-primary text-xs">
          + Add Customer
        </button>
      </div>

      <input
        type="text"
        placeholder="Search customers..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="input w-full sm:w-80"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Customer List */}
        <div className="lg:col-span-2 space-y-2">
          {loading ? (
            [...Array(4)].map((_, i) => <div key={i} className="h-16 bg-gray-200 rounded-lg animate-pulse" />)
          ) : customers.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No customers found</p>
          ) : (
            customers.map((c) => (
              <div key={c.id} className="bg-white rounded-lg border border-gray-200 p-3 flex items-center justify-between hover:border-indigo-200 transition-colors cursor-pointer" onClick={() => viewDetails(c)}>
                <div>
                  <p className="font-medium text-gray-900">{c.name}</p>
                  <p className="text-xs text-gray-500">{c.phone || 'No phone'}</p>
                </div>
                <div className="flex items-center gap-3">
                  {c.credit_balance > 0 && (
                    <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded">
                      ₹{c.credit_balance.toLocaleString()} due
                    </span>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); setEditing(c); setShowForm(true); }} className="text-gray-400 hover:text-indigo-600 text-xs">Edit</button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }} className="text-gray-400 hover:text-red-600 text-xs">Delete</button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Customer Detail */}
        {selectedCustomer && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900">{selectedCustomer.name}</h3>
            <p className="text-sm text-gray-500 mt-1">{selectedCustomer.phone}</p>
            {selectedCustomer.address && <p className="text-sm text-gray-500">{selectedCustomer.address}</p>}

            <div className="mt-4 grid grid-cols-2 gap-2 text-center">
              <div className="bg-indigo-50 rounded-lg p-2">
                <p className="text-xs text-gray-500">Total Spent</p>
                <p className="font-bold text-indigo-700">₹{(selectedCustomer.totalSpent || 0).toLocaleString()}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-2">
                <p className="text-xs text-gray-500">Credit Balance</p>
                <p className="font-bold text-red-700">₹{selectedCustomer.credit_balance.toLocaleString()}</p>
              </div>
            </div>

            {selectedCustomer.bills && selectedCustomer.bills.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Purchase History</h4>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {selectedCustomer.bills.map((b: any) => (
                    <div key={b.id} className="flex justify-between text-xs py-1 border-b border-gray-50">
                      <span className="text-gray-600">{b.bill_number}</span>
                      <span className="text-gray-500">{b.bill_date}</span>
                      <span className="font-medium">₹{b.total}</span>
                      <span className={`capitalize ${b.payment_status === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>{b.payment_status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <form onSubmit={handleSave} className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-semibold mb-4">{editing ? 'Edit Customer' : 'Add Customer'}</h2>
            <div className="space-y-3">
              <div>
                <label className="label">Name *</label>
                <input name="name" defaultValue={editing?.name} required className="input w-full" />
              </div>
              <div>
                <label className="label">Phone</label>
                <input name="phone" defaultValue={editing?.phone} className="input w-full" />
              </div>
              <div>
                <label className="label">Address</label>
                <input name="address" defaultValue={editing?.address} className="input w-full" />
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea name="notes" defaultValue={editing?.notes} className="input w-full" rows={2} />
              </div>
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary">Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
