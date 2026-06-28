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
        <h1 className="page-title">Expenses</h1>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn-primary text-xs">
          + Add Expense
        </button>
      </div>

      {/* Summary */}
      <div className="bg-orange-50 dark:bg-orange-950/40 border border-orange-100 dark:border-orange-900/50 rounded-xl p-4">
        <p className="text-sm text-orange-700 dark:text-orange-300">Total expenses ({fromDate} to {toDate})</p>
        <p className="text-2xl font-bold text-orange-800 dark:text-orange-200">₹{totalAmount.toLocaleString()}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} aria-label="From date" className="input" />
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} aria-label="To date" className="input" />
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} aria-label="Filter by category" className="input">
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Expense List */}
      <div className="space-y-2">
        {loading ? (
          [...Array(4)].map((_, i) => <div key={i} className="h-14 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse" />)
        ) : expenses.length === 0 ? (
          <p className="text-zinc-400 text-center py-8">No expenses for this period</p>
        ) : (
          expenses.map((exp) => (
            <div key={exp.id} className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded capitalize">{exp.category}</span>
                  <span className="text-xs text-zinc-400">{exp.expense_date}</span>
                </div>
                {exp.description && <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">{exp.description}</p>}
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">₹{exp.amount.toLocaleString()}</span>
                <button onClick={() => { setEditing(exp); setShowForm(true); }} className="text-zinc-400 hover:text-brand-600 dark:hover:text-brand-400 text-xs">Edit</button>
                <button onClick={() => handleDelete(exp.id)} className="text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 text-xs">Delete</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <form onSubmit={handleSave} className="card rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-semibold mb-4">{editing ? 'Edit Expense' : 'Add Expense'}</h2>
            <div className="space-y-3">
              <div>
                <label htmlFor="expense-category" className="label">Category</label>
                <select id="expense-category" name="category" defaultValue={editing?.category || 'general'} className="input w-full">
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="expense-amount" className="label">Amount (₹) *</label>
                <input id="expense-amount" name="amount" type="number" step="0.01" min="0.01" defaultValue={editing?.amount} required className="input w-full" />
              </div>
              <div>
                <label htmlFor="expense-description" className="label">Description</label>
                <input id="expense-description" name="description" defaultValue={editing?.description} className="input w-full" />
              </div>
              <div>
                <label htmlFor="expense-date" className="label">Date</label>
                <input id="expense-date" name="expense_date" type="date" defaultValue={editing?.expense_date || new Date().toISOString().split('T')[0]} className="input w-full" />
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

