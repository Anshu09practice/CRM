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
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-900">Billing</h2>
        <button onClick={() => { fetchStock(); setShowForm(true); }} className="btn-primary text-sm">
          + New Bill
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap mb-4">
        <input
          type="text"
          placeholder="Search customer / bill no..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field flex-1 min-w-[150px]"
        />
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
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        <div className="card text-center bg-gradient-to-br from-emerald-50 to-white">
          <p className="text-2xl font-bold text-emerald-600">{bills.length}</p>
          <p className="text-xs text-slate-500">Total Bills</p>
        </div>
        <div className="card text-center bg-gradient-to-br from-blue-50 to-white">
          <p className="text-2xl font-bold text-blue-600">₹{totalRevenue.toFixed(0)}</p>
          <p className="text-xs text-slate-500">Revenue</p>
        </div>
        <div className="card text-center bg-gradient-to-br from-purple-50 to-white col-span-2 sm:col-span-1">
          <p className="text-2xl font-bold text-purple-600">{stock.length}</p>
          <p className="text-xs text-slate-500">Items in Stock</p>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
        </div>
      )}

      {/* Empty State */}
      {!loading && bills.length === 0 && (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">🧾</p>
          <p className="text-slate-600 font-medium">No bills created yet</p>
          <p className="text-sm text-slate-500 mt-1">Create your first bill to start selling</p>
          <button onClick={() => { fetchStock(); setShowForm(true); }} className="btn-primary text-sm mt-4">
            + New Bill
          </button>
        </div>
      )}

      {/* Bills List */}
      {!loading && bills.length > 0 && (
        <div className="space-y-2">
          {bills.map(b => (
            <div key={b.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-900">{b.customer_name}</p>
                    <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                      {b.bill_number}
                    </span>
                    {b.whatsapp_sent === 1 && (
                      <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">✓ Sent</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                    <span>📅 {b.bill_date}</span>
                    {b.customer_phone && <span>📱 {b.customer_phone}</span>}
                    {b.discount_percent > 0 && (
                      <span className="text-orange-600">-{b.discount_percent}%</span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-lg text-emerald-700">₹{b.total.toFixed(0)}</p>
                  <div className="flex gap-1.5 mt-1 justify-end flex-wrap">
                    <button onClick={() => handlePrint(b)} className="text-[11px] text-slate-600 hover:text-slate-900 font-medium">
                      🖨️
                    </button>
                    <button onClick={() => handleWhatsApp(b)} className="text-[11px] text-green-600 hover:text-green-800 font-medium">
                      📲
                    </button>
                    <button
                      onClick={async () => { const full = await api.getBill(b.id); setEditingBill(full); fetchStock(); }}
                      className="text-[11px] text-brand-600 hover:text-brand-800 font-medium"
                    >
                      Edit
                    </button>
                    <button onClick={() => handleDelete(b)} className="text-[11px] text-red-600 hover:text-red-800 font-medium">
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
