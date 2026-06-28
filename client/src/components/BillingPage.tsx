import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { api, Bill, StockItem } from '../services/api';
import BillForm from './BillForm';
import BillPrintView from './BillPrintView';
import PaymentModal from './PaymentModal';

export default function BillingPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [printingBill, setPrintingBill] = useState<Bill | null>(null);
  const [payingBill, setPayingBill] = useState<Bill | null>(null);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [stock, setStock] = useState<StockItem[]>([]);

  const fetchBills = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getBills({
        search: search || undefined,
        from_date: dateFrom || undefined,
        to_date: dateTo || undefined,
        payment_status: statusFilter || undefined
      });
      setBills(res.bills);
      setTotalRevenue(res.totalRevenue);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, dateFrom, dateTo, statusFilter]);

  const fetchStock = useCallback(async () => {
    try {
      const res = await api.getAvailableStock();
      setStock(res.stock);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchBills(); }, [fetchBills]);
  useEffect(() => { fetchStock(); }, [fetchStock]);

  const handleCreate = async (data: any) => {
    const bill = await api.createBill(data);
    toast.success(`Bill ${bill.bill_number} created!`);
    setShowForm(false);
    fetchBills();
    fetchStock();
    return bill;
  };

  const handleUpdate = async (data: any) => {
    if (!editingBill) return;
    await api.updateBill(editingBill.id, data);
    toast.success('Bill updated');
    setEditingBill(null);
    fetchBills();
    fetchStock();
  };

  const handleDelete = async (bill: Bill) => {
    if (!confirm(`Delete bill ${bill.bill_number} for ${bill.customer_name}?`)) return;
    await api.deleteBill(bill.id);
    toast.success('Bill deleted');
    fetchBills();
    fetchStock();
  };

  const handlePrint = async (bill: Bill) => {
    try {
      const fullBill = await api.getBill(bill.id);
      setPrintingBill(fullBill);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleWhatsApp = async (bill: Bill) => {
    const fullBill = bill.items ? bill : await api.getBill(bill.id);
    const items = fullBill.items || [];

    // Build WhatsApp message
    // cSpell:ignore JALAN JYOTHI
    let msg = `🧾 *JALAN JYOTHI*\n`;
    msg += `Bill No: ${bill.bill_number}\n`;
    msg += `Date: ${bill.bill_date}\n\n`;
    msg += `*Customer:* ${bill.customer_name}\n`;
    if (bill.customer_address) msg += `Address: ${bill.customer_address}\n`;
    msg += `\n*Items:*\n`;
    items.forEach((item, i) => {
      msg += `${i + 1}. ${item.item_name} (${item.package_quantity_grams}g) × ${item.quantity} = ₹${item.line_total}\n`;
    });
    msg += `\n*Subtotal:* ₹${bill.subtotal}`;
    if (bill.discount_percent > 0) {
      msg += `\n*Discount:* ${bill.discount_percent}% (-₹${bill.discount_amount})`;
    }
    msg += `\n*Total:* ₹${bill.total}`;
    msg += `\n\nThank you for your purchase! 🙏`;

    const phone = bill.customer_phone.replace(/[^0-9]/g, '');
    const whatsappUrl = phone
      ? `https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;

    window.open(whatsappUrl, '_blank');

    // Mark as sent
    try {
      await api.markWhatsAppSent(bill.id);
      fetchBills();
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="page-title">Billing</h1>
        <button onClick={() => { fetchStock(); setShowForm(true); }} className="btn-primary text-sm">
          + New Bill
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[150px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Search customer / bill no..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="input-field w-auto"
          title="Payment status"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          className="input-field w-auto"
          title="From date"
        />
        <input
          type="date"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          className="input-field w-auto"
          title="To date"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="metric-card-emerald text-center p-4">
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{bills.length}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 uppercase tracking-wide font-semibold">Total Bills</p>
        </div>
        <div className="metric-card-sky text-center p-4">
          <p className="text-2xl font-bold text-sky-700 dark:text-sky-400">₹{totalRevenue.toFixed(0)}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 uppercase tracking-wide font-semibold">Revenue</p>
        </div>
        <div className="metric-card-violet text-center p-4 col-span-2 sm:col-span-1">
          <p className="text-2xl font-bold text-violet-700 dark:text-violet-400">{stock.length}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 uppercase tracking-wide font-semibold">Items in Stock</p>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-zinc-200 border-t-brand-600"></div>
        </div>
      )}

      {/* Empty State */}
      {!loading && bills.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z" />
            </svg>
          </div>
          <p className="text-zinc-700 dark:text-zinc-300 font-semibold">No bills created yet</p>
          <p className="text-sm text-zinc-400 mt-1">Create your first bill to start selling</p>
          <button onClick={() => { fetchStock(); setShowForm(true); }} className="btn-primary text-sm mt-4">
            + New Bill
          </button>
        </div>
      )}

      {/* Bills List */}
      {!loading && bills.length > 0 && (
        <div className="space-y-2">
          {bills.map(b => {
            const statusColors: Record<string, string> = {
              paid: 'badge-success',
              partial: 'badge-warning',
              pending: 'badge-neutral',
              overdue: 'badge-danger'
            };
            return (
            <div key={b.id} className="card p-4 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">{b.customer_name}</p>
                    <span className="text-[10px] font-mono badge-neutral">
                      {b.bill_number}
                    </span>
                    <span className={`${statusColors[b.payment_status] || 'badge-neutral'} capitalize`}>
                      {b.payment_status}
                    </span>
                    {b.whatsapp_sent === 1 && (
                      <span className="badge-success">Sent</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 mt-1 flex-wrap">
                    <span>{b.bill_date}</span>
                    {b.customer_phone && <span>{b.customer_phone}</span>}
                    {b.discount_percent > 0 && (
                      <span className="badge-warning">-{b.discount_percent}%</span>
                    )}
                    {b.amount_paid > 0 && b.payment_status !== 'paid' && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">Paid ₹{b.amount_paid.toFixed(0)} / ₹{b.total.toFixed(0)}</span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-lg text-emerald-700 dark:text-emerald-400">₹{b.total.toFixed(0)}</p>
                </div>
              </div>

              {/* Full-width action bar */}
              <div className="border-t border-zinc-100 dark:border-zinc-700/50 mt-3 pt-2.5 flex items-center justify-between gap-2">
                {/* Left: status quick-change */}
                <select
                  aria-label="Payment status"
                  value={b.payment_status}
                  onClick={e => e.stopPropagation()}
                  onChange={async (e) => {
                    try {
                      await api.updateBillStatus(b.id, e.target.value);
                      toast.success('Status updated');
                      fetchBills();
                    } catch (err: any) { toast.error(err.message); }
                  }}
                  className="text-xs bg-transparent border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1.5 text-zinc-600 dark:text-zinc-300 cursor-pointer"
                >
                  <option value="pending">Pending</option>
                  <option value="partial">Partial</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>

                {/* Right: action buttons */}
                <div className="flex items-center gap-1">
                  {b.payment_status !== 'paid' && (
                    <button onClick={() => setPayingBill(b)} className="btn-ghost py-1.5 px-2.5 text-xs text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Pay
                    </button>
                  )}
                  <button onClick={() => handleWhatsApp(b)} className="btn-ghost py-1.5 px-2.5 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    WA
                  </button>
                  <button onClick={() => handlePrint(b)} className="btn-ghost py-1.5 px-2.5 text-xs flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" /></svg>
                    Print
                  </button>
                  <button
                    onClick={async () => { const full = await api.getBill(b.id); setEditingBill(full); fetchStock(); }}
                    className="btn-ghost py-1.5 px-2.5 text-xs text-brand-600 dark:text-brand-400 flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" /></svg>
                    Edit
                  </button>
                  <button onClick={() => handleDelete(b)} className="btn-ghost py-1.5 px-2.5 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                    Del
                  </button>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {showForm && (
        <BillForm
          stock={stock}
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
          onWhatsApp={handleWhatsApp}
        />
      )}
      {editingBill && (
        <BillForm
          stock={stock}
          bill={editingBill}
          onSubmit={handleUpdate}
          onCancel={() => setEditingBill(null)}
        />
      )}
      {printingBill && (
        <BillPrintView bill={printingBill} onClose={() => setPrintingBill(null)} />
      )}
      {payingBill && (
        <PaymentModal
          bill={payingBill}
          onClose={() => setPayingBill(null)}
          onPaymentRecorded={() => { fetchBills(); }}
        />
      )}
    </div>
  );
}
