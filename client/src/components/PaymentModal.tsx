import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { api, Bill } from '../services/api';

interface PaymentModalProps {
  bill: Bill;
  onClose: () => void;
  onPaymentRecorded: () => void;
}

export default function PaymentModal({ bill, onClose, onPaymentRecorded }: PaymentModalProps) {
  const remaining = bill.total - (bill.amount_paid || 0);
  const [amount, setAmount] = useState(remaining);
  const [method, setMethod] = useState('cash');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) { toast.error('Amount must be greater than 0'); return; }
    if (amount > remaining) { toast.error(`Amount exceeds remaining balance of ₹${remaining.toFixed(2)}`); return; }

    setSubmitting(true);
    try {
      await api.recordPayment(bill.id, { amount, payment_method: method, payment_date: date, notes });
      toast.success('Payment recorded');
      onPaymentRecorded();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container max-w-md mx-4 sm:mx-0" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="section-title">Record Payment</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="btn-ghost p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Bill Info */}
          <div className="bg-zinc-50 dark:bg-zinc-800/60 rounded-xl p-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500 dark:text-zinc-400">Bill</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">{bill.bill_number}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500 dark:text-zinc-400">Total</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">₹{bill.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500 dark:text-zinc-400">Paid</span>
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">₹{(bill.amount_paid || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-zinc-200 dark:border-zinc-700 pt-1">
              <span className="text-zinc-500 dark:text-zinc-400 font-semibold">Remaining</span>
              <span className="font-bold text-rose-700 dark:text-rose-400">₹{remaining.toFixed(2)}</span>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="label">Payment Amount (₹) *</label>
            <input
              type="number"
              value={amount || ''}
              onChange={e => setAmount(parseFloat(e.target.value) || 0)}
              className="input-field"
              min="0.01"
              max={remaining}
              step="0.01"
              required
            />
          </div>

          {/* Method */}
          <div>
            <label className="label">Payment Method</label>
            <select value={method} onChange={e => setMethod(e.target.value)} className="input-field">
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="credit">Credit (Add to balance)</option>
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="label">Payment Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-field" />
          </div>

          {/* Notes */}
          <div>
            <label className="label">Notes (optional)</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="input-field" placeholder="e.g., UPI Ref #12345" />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={submitting || amount <= 0} className="btn-primary flex-1">
              {submitting ? 'Recording...' : `Pay ₹${amount.toFixed(0)}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
