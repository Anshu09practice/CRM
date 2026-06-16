import { Bill } from '../services/api';

interface BillPrintViewProps {
  bill: Bill;
  onClose: () => void;
}

export default function BillPrintView({ bill, onClose }: BillPrintViewProps) {
  const items = bill.items || [];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
      {/* Print Controls (hidden in print) */}
      <div className="print:hidden fixed top-4 right-4 flex gap-2 z-[60]">
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 shadow-lg"
        >
          🖨️ Print
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-white text-slate-700 rounded-lg font-medium hover:bg-slate-100 shadow-lg"
        >
          ✕ Close
        </button>
      </div>

      {/* Bill Content */}
      <div className="bg-white w-full max-w-[210mm] my-4 rounded-lg shadow-2xl print:shadow-none print:rounded-none print:my-0 print:max-w-full">
        <div className="p-8 print:p-6" id="bill-print-area">
          {/* Header */}
          <div className="text-center border-b-2 border-slate-800 pb-4 mb-4">
            <h1 className="text-2xl font-bold text-slate-900 tracking-wide">JALAN JYOTHI</h1>
            <p className="text-sm text-slate-600 mt-1">Quality Spices & Masala Products</p>
          </div>

          {/* Bill Info */}
          <div className="flex justify-between text-sm mb-4">
            <div>
              <p><strong>Bill No:</strong> {bill.bill_number}</p>
              <p><strong>Date:</strong> {bill.bill_date}</p>
            </div>
            <div className="text-right">
              <p><strong>Customer:</strong> {bill.customer_name}</p>
              {bill.customer_phone && <p><strong>Phone:</strong> {bill.customer_phone}</p>}
              {bill.customer_address && <p><strong>Address:</strong> {bill.customer_address}</p>}
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full text-sm border-collapse mb-4">
            <thead>
              <tr className="border-y-2 border-slate-800">
                <th className="py-2 text-left">#</th>
                <th className="py-2 text-left">Item</th>
                <th className="py-2 text-center">Pkg</th>
                <th className="py-2 text-center">Qty</th>
                <th className="py-2 text-right">Price</th>
                <th className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id || idx} className="border-b border-slate-200">
                  <td className="py-2">{idx + 1}</td>
                  <td className="py-2 font-medium">{item.item_name}</td>
                  <td className="py-2 text-center">{item.package_quantity_grams}g</td>
                  <td className="py-2 text-center">{item.quantity}</td>
                  <td className="py-2 text-right">₹{item.selling_price.toFixed(2)}</td>
                  <td className="py-2 text-right">₹{item.line_total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="border-t-2 border-slate-800 pt-3">
            <div className="flex justify-end">
              <div className="w-64 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₹{bill.subtotal.toFixed(2)}</span>
                </div>
                {bill.discount_percent > 0 && (
                  <div className="flex justify-between text-orange-700">
                    <span>Discount ({bill.discount_percent}%)</span>
                    <span>-₹{bill.discount_amount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t border-slate-300 pt-1">
                  <span>TOTAL</span>
                  <span>₹{bill.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {bill.notes && (
            <div className="mt-4 text-xs text-slate-600 italic">
              Note: {bill.notes}
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-slate-300 text-center text-xs text-slate-500">
            <p>Thank you for your purchase!</p>
            <p className="mt-1">Jalan Jyothi — Quality you can trust</p>
          </div>
        </div>
      </div>
    </div>
  );
}
