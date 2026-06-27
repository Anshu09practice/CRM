import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { api, Bill, StockItem } from '../services/api';
import BillForm from './BillForm';
import BillPrintView from './BillPrintView';

export default function BillingPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [printingBill, setPrintingBill] = useState<Bill | null>(null);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [stock, setStock] = useState<StockItem[]>([]);

  const fetchBills = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getBills({
        search: search || undefined,
        from_date: dateFrom || undefined,
        to_date: dateTo || undefined
      });
      setBills(res.bills);
      setTotalRevenue(res.totalRevenue);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, dateFrom, dateTo]);

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
          <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wide font-semibold">Total Bills</p>
        </div>
        <div className="metric-card-sky text-center p-4">
          <p className="text-2xl font-bold text-sky-700 dark:text-sky-400">₹{totalRevenue.toFixed(0)}</p>
          <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wide font-semibold">Revenue</p>
        </div>
        <div className="metric-card-violet text-center p-4 col-span-2 sm:col-span-1">
          <p className="text-2xl font-bold text-violet-700 dark:text-violet-400">{stock.length}</p>
          <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wide font-semibold">Items in Stock</p>
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
          {bills.map(b => (
            <div key={b.id} className="card p-4 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">{b.customer_name}</p>
                    <span className="text-[10px] font-mono badge-neutral">
                      {b.bill_number}
                    </span>
                    {b.whatsapp_sent === 1 && (
                      <span className="badge-success">Sent</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1 flex-wrap">
                    <span>{b.bill_date}</span>
                    {b.customer_phone && <span>{b.customer_phone}</span>}
                    {b.discount_percent > 0 && (
                      <span className="badge-warning">-{b.discount_percent}%</span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-lg text-emerald-700 dark:text-emerald-400">₹{b.total.toFixed(0)}</p>
                  <div className="flex gap-2 mt-1.5 justify-end flex-wrap">
                    <button onClick={() => handlePrint(b)} className="btn-ghost py-1 px-2 text-[11px]">Print</button>
                    <button onClick={() => handleWhatsApp(b)} className="btn-ghost py-1 px-2 text-[11px] text-emerald-600 dark:text-emerald-400">WA</button>
                    <button
                      onClick={async () => { const full = await api.getBill(b.id); setEditingBill(full); fetchStock(); }}
                      className="btn-ghost py-1 px-2 text-[11px] text-brand-600 dark:text-brand-400"
                    >
                      Edit
                    </button>
                    <button onClick={() => handleDelete(b)} className="btn-ghost py-1 px-2 text-[11px] text-rose-600 dark:text-rose-400">
                      Del
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
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
    </div>
  );
}
