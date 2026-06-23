import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { api, Expense } from '../services/api';

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState('');
  const [fromDate, setFromDate] = useState(() => new Date().toISOString().slice(0, 7) + '-01');
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadExpenses(); }, [fromDate, toDate, filterCategory]);
  useEffect(() => { loadCategories(); }, []);

  async function loadExpenses() {
    try {
      const res = await api.getExpenses({ from_date: fromDate, to_date: toDate, category: filterCategory || undefined });
      setExpenses(res.expenses);
      setTotalAmount(res.totalAmount);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }

  async function loadCategories() {
    try {
      const cats = await api.getExpenseCategories();
      setCategories(cats);
    } catch {}
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const data = {
      category: form.get('category') as string,
      amount: parseFloat(form.get('amount') as string),
      description: form.get('description') as string,
      expense_date: form.get('expense_date') as string,
    };

    try {
      if (editing) {
        await api.updateExpense(editing.id, data);
        toast.success('Expense updated');
      } else {
        await api.createExpense(data);
        toast.success('Expense added');
      }
      setShowForm(false);
      setEditing(null);
      loadExpenses();
    } catch (e: any) { toast.error(e.message); }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this expense?')) return;
    try {
      await api.deleteExpense(id);
      toast.success('Expense deleted');
      loadExpenses();
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn-primary text-xs">
          + Add Expense
        </button>
      </div>

      {/* Summary */}
      <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
        <p className="text-sm text-orange-700">Total expenses ({fromDate} to {toDate})</p>
        <p className="text-2xl font-bold text-orange-800">₹{totalAmount.toLocaleString()}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="input" />
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="input" />
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="input">
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Expense List */}
      <div className="space-y-2">
        {loading ? (
          [...Array(4)].map((_, i) => <div key={i} className="h-14 bg-gray-200 rounded-lg animate-pulse" />)
        ) : expenses.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No expenses for this period</p>
        ) : (
          expenses.map((exp) => (
            <div key={exp.id} className="bg-white rounded-lg border border-gray-200 p-3 flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded capitalize">{exp.category}</span>
                  <span className="text-xs text-gray-400">{exp.expense_date}</span>
                </div>
                {exp.description && <p className="text-sm text-gray-600 mt-1">{exp.description}</p>}
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-gray-900">₹{exp.amount.toLocaleString()}</span>
                <button onClick={() => { setEditing(exp); setShowForm(true); }} className="text-gray-400 hover:text-indigo-600 text-xs">Edit</button>
                <button onClick={() => handleDelete(exp.id)} className="text-gray-400 hover:text-red-600 text-xs">Delete</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <form onSubmit={handleSave} className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-semibold mb-4">{editing ? 'Edit Expense' : 'Add Expense'}</h2>
            <div className="space-y-3">
              <div>
                <label className="label">Category</label>
                <select name="category" defaultValue={editing?.category || 'general'} className="input w-full">
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Amount (₹) *</label>
                <input name="amount" type="number" step="0.01" min="0.01" defaultValue={editing?.amount} required className="input w-full" />
              </div>
              <div>
                <label className="label">Description</label>
                <input name="description" defaultValue={editing?.description} className="input w-full" />
              </div>
              <div>
                <label className="label">Date</label>
                <input name="expense_date" type="date" defaultValue={editing?.expense_date || new Date().toISOString().split('T')[0]} className="input w-full" />
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
