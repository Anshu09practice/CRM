import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { api, Expense } from '../services/api';
import DeleteModal from './DeleteModal';

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
  const [deletingId, setDeletingId] = useState<number | null>(null);

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

  function handleDelete(id: number) {
    setDeletingId(id);
  }

  async function confirmDelete() {
    if (deletingId === null) return;
    try {
      await api.deleteExpense(deletingId);
      toast.success('Expense deleted');
      loadExpenses();
    } catch (e: any) { toast.error(e.message); }
    finally { setDeletingId(null); }
  }

  return (
    <div className="space-y-4">
      {/* Summary hero */}
      <div className="rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 p-4 text-white">
        <p className="text-xs font-medium text-white/80">Total Expenses</p>
        <p className="text-3xl font-bold tabular-nums mt-0.5">₹{totalAmount.toLocaleString()}</p>
        <p className="text-xs text-white/70 mt-1">{fromDate} → {toDate}</p>
      </div>

      {/* Date + Category chips */}
      <div className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar -mx-1 px-1">
        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
          aria-label="From date"
          className="shrink-0 text-xs px-3 py-1.5 rounded-full border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-500 dark:text-stone-400" />
        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
          aria-label="To date"
          className="shrink-0 text-xs px-3 py-1.5 rounded-full border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-500 dark:text-stone-400" />
        {categories.length > 0 && <>
          <div className="w-px bg-stone-200 dark:bg-stone-700 shrink-0 self-stretch my-0.5" />
          <button onClick={() => setFilterCategory('')}
            className={`shrink-0 ${!filterCategory ? 'm3-chip-active' : 'm3-chip'}`}>All</button>
          {categories.map(c => (
            <button key={c}
              onClick={() => setFilterCategory(filterCategory === c ? '' : c)}
              className={`shrink-0 ${filterCategory === c ? 'm3-chip-active' : 'm3-chip'}`}>{c}</button>
          ))}
        </>}
      </div>

      {/* Expense List */}
      <div className="space-y-2">
        {loading ? (
          [...Array(4)].map((_, i) => <div key={i} className="h-14 bg-stone-100 dark:bg-stone-800 rounded-lg animate-pulse" />)
        ) : expenses.length === 0 ? (
          <p className="text-stone-400 text-center py-8">No expenses for this period</p>
        ) : (
          expenses.map((exp) => (
            <div key={exp.id} className="card p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded-full capitalize">{exp.category}</span>
                  <span className="text-xs text-stone-400">{exp.expense_date}</span>
                </div>
                {exp.description && <p className="text-sm text-stone-600 dark:text-stone-400 mt-0.5 truncate">{exp.description}</p>}
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <span className="font-bold text-stone-900 dark:text-stone-100 mr-1">₹{exp.amount.toLocaleString()}</span>
                <button onClick={() => { setEditing(exp); setShowForm(true); }}
                  className="p-2 rounded-xl text-stone-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/30 transition-colors"
                  title="Edit">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" /></svg>
                </button>
                <button onClick={() => handleDelete(exp.id)}
                  className="p-2 rounded-xl text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                  title="Delete">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* FAB — Add Expense */}
      <button
        onClick={() => { setEditing(null); setShowForm(true); }}
        className="m3-fab"
        aria-label="Add new expense"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>

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
                <input id="expense-amount" name="amount" type="number" step="0.01" min="0.01" inputMode="decimal" defaultValue={editing?.amount} required className="input w-full" />
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
      {deletingId !== null && (
        <DeleteModal
          itemName="this expense"
          onConfirm={confirmDelete}
          onCancel={() => setDeletingId(null)}
        />
      )}
    </div>
  );
}

