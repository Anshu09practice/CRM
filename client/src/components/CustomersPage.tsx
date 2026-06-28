import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { api, Customer, Bill } from '../services/api';
import PaymentModal from './PaymentModal';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [payingBill, setPayingBill] = useState<Bill | null>(null);
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
        <h1 className="page-title">Customers</h1>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn-primary text-xs">
          + Add Customer
        </button>
      </div>

      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="text"
          placeholder="Search customers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input w-full sm:w-80 pl-9"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Customer List */}
        <div className="lg:col-span-2 space-y-2">
          {loading ? (
            [...Array(4)].map((_, i) => <div key={i} className="h-16 bg-zinc-200 dark:bg-zinc-800 rounded-xl animate-pulse" />)
          ) : customers.length === 0 ? (
            <p className="text-zinc-400 text-center py-10">No customers found</p>
          ) : (
            customers.map((c) => {
              const initials = c.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
              const avatarColors = ['from-brand-500 to-violet-600', 'from-emerald-500 to-teal-600', 'from-amber-500 to-orange-500', 'from-rose-500 to-pink-500', 'from-sky-500 to-cyan-500'];
              const av = avatarColors[c.name.charCodeAt(0) % avatarColors.length];
              return (
              <div key={c.id} className="card-hover p-3 flex items-center justify-between" onClick={() => viewDetails(c)}>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${av} flex items-center justify-center flex-shrink-0`}>
                    <span className="text-white text-xs font-bold">{initials}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">{c.name}</p>
                    <p className="text-xs text-zinc-400">{c.phone || 'No phone'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {c.credit_balance > 0 && (
                    <span className="badge-danger">
                      ₹{c.credit_balance.toLocaleString()} due
                    </span>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); setEditing(c); setShowForm(true); }} className="text-zinc-400 hover:text-brand-600 dark:hover:text-brand-400 text-xs font-medium transition-colors">Edit</button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }} className="text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 text-xs font-medium transition-colors">Delete</button>
                </div>
              </div>
              );
            })
          )}
        </div>

        {/* Customer Detail */}
        {selectedCustomer && (
          <div className="card p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center flex-shrink-0`}>
                <span className="text-white text-sm font-bold">{selectedCustomer.name.slice(0,2).toUpperCase()}</span>
              </div>
              <div>
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100">{selectedCustomer.name}</h3>
                <p className="text-sm text-zinc-400">{selectedCustomer.phone || 'No phone'}</p>
              </div>
            </div>
            {selectedCustomer.address && <p className="text-sm text-zinc-500 mb-3">{selectedCustomer.address}</p>}

            <div className="grid grid-cols-2 gap-2 text-center mb-4">
              <div className="bg-brand-50 dark:bg-brand-950/40 rounded-xl p-2.5 border border-brand-100 dark:border-brand-900/30">
                <p className="text-[11px] text-zinc-500 uppercase tracking-wide font-semibold">Total Spent</p>
                <p className="font-bold text-brand-700 dark:text-brand-300 text-sm mt-0.5">₹{(selectedCustomer.totalSpent || 0).toLocaleString()}</p>
              </div>
              <div className="bg-rose-50 dark:bg-rose-950/40 rounded-xl p-2.5 border border-rose-100 dark:border-rose-900/30">
                <p className="text-[11px] text-zinc-500 uppercase tracking-wide font-semibold">Credit Due</p>
                <p className="font-bold text-rose-700 dark:text-rose-400 text-sm mt-0.5">₹{selectedCustomer.credit_balance.toLocaleString()}</p>
              </div>
            </div>

            {selectedCustomer.bills && selectedCustomer.bills.length > 0 && (
              <div>
                <h4 className="card-title mb-2">Purchase History</h4>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {selectedCustomer.bills.map((b: any) => (
                    <div key={b.id} className="text-xs py-2 px-2 border-b border-zinc-100 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-600 dark:text-zinc-400 font-medium">{b.bill_number}</span>
                        <span className="text-zinc-400">{b.bill_date}</span>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">₹{b.total}</span>
                        <span className={`capitalize font-medium ${b.payment_status === 'paid' ? 'text-emerald-600 dark:text-emerald-400' : b.payment_status === 'overdue' ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`}>{b.payment_status}</span>
                      </div>
                      {b.payment_status !== 'paid' && (
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-zinc-400">Paid ₹{b.amount_paid || 0} / ₹{b.total}</span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setPayingBill(b as Bill)}
                              className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 font-semibold"
                            >
                              Record Payment
                            </button>
                            <select
                              value={b.payment_status}
                              onChange={async (e) => {
                                try {
                                  await api.updateBillStatus(b.id, e.target.value);
                                  toast.success('Status updated');
                                  viewDetails(selectedCustomer);
                                } catch (err: any) { toast.error(err.message); }
                              }}
                              className="bg-transparent border border-zinc-200 dark:border-zinc-700 rounded px-1 py-0.5 text-zinc-600 dark:text-zinc-300 cursor-pointer"
                            >
                              <option value="pending">Pending</option>
                              <option value="partial">Partial</option>
                              <option value="paid">Paid</option>
                              <option value="overdue">Overdue</option>
                            </select>
                          </div>
                        </div>
                      )}
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
        <div className="modal-overlay">
          <div className="modal-container max-w-md mx-4 sm:mx-0">
            <div className="modal-header">
              <h2 className="section-title">{editing ? 'Edit Customer' : 'Add Customer'}</h2>
              <button type="button" aria-label="Close" onClick={() => { setShowForm(false); setEditing(null); }} className="btn-ghost p-1">
                <svg className="w-5 h-5" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-3">
              <div>
                <label htmlFor="customer-name" className="label">Name <span className="text-rose-500">*</span></label>
                <input id="customer-name" name="name" defaultValue={editing?.name} required className="input-field" />
              </div>
              <div>
                <label htmlFor="customer-phone" className="label">Phone</label>
                <input id="customer-phone" name="phone" defaultValue={editing?.phone} className="input-field" />
              </div>
              <div>
                <label htmlFor="customer-address" className="label">Address</label>
                <input id="customer-address" name="address" defaultValue={editing?.address} className="input-field" />
              </div>
              <div>
                <label htmlFor="customer-notes" className="label">Notes</label>
                <textarea id="customer-notes" name="notes" defaultValue={editing?.notes} className="input-field" rows={2} />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {payingBill && (
        <PaymentModal
          bill={payingBill}
          onClose={() => setPayingBill(null)}
          onPaymentRecorded={() => { if (selectedCustomer) viewDetails(selectedCustomer); loadCustomers(); }}
        />
      )}
    </div>
  );
}
