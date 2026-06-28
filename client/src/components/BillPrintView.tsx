import { Bill } from '../services/api';
import { createPaymentMessage, formatISO4217, toISO20022Status } from '../services/iso20022';

interface BillPrintViewProps {
  bill: Bill;
  onClose: () => void;
}

function generateBillHtml(bill: Bill): string {
  const items = bill.items || [];
  const itemRows = items.map((item, idx) => `
    <tr style="border-bottom:1px solid #e2e8f0;">
      <td style="padding:8px 6px;">${idx + 1}</td>
      <td style="padding:8px 6px;font-weight:500;word-break:break-word;">${item.item_name}</td>
      <td style="padding:8px 6px;text-align:center;">${item.package_quantity_grams}g</td>
      <td style="padding:8px 6px;text-align:center;">${item.quantity}</td>
      <td style="padding:8px 6px;text-align:right;">₹${item.selling_price.toFixed(2)}</td>
      <td style="padding:8px 6px;text-align:right;">₹${item.line_total.toFixed(2)}</td>
    </tr>
  `).join('');

  const discountRow = bill.discount_percent > 0
    ? `<div style="display:flex;justify-content:space-between;color:#c2410c;"><span>Discount (${bill.discount_percent}%)</span><span>-₹${bill.discount_amount.toFixed(2)}</span></div>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Bill ${bill.bill_number}</title>
  <style>
    body { font-family: sans-serif; padding: 16px; margin: 0; font-size: 13px; color: #1e293b; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; table-layout: fixed; }
    th { text-align: left; padding: 8px 6px; word-break: break-word; }
    td { word-break: break-word; }
    col.col-num   { width: 5%; }
    col.col-item  { width: 40%; }
    col.col-pkg   { width: 12%; }
    col.col-qty   { width: 8%; }
    col.col-price { width: 17%; }
    col.col-amt   { width: 18%; }
    @media print {
      body { padding: 0; font-size: 12px; }
      @page { size: auto; margin: 5mm; }
    }
  </style>
</head>
<body>
  <div style="text-align:center;border-bottom:2px solid #1e293b;padding-bottom:12px;margin-bottom:12px;">
    <h1 style="margin:0;font-size:20px;letter-spacing:1px;">JALAN JYOTHI</h1>
    <p style="margin:4px 0 0;font-size:12px;color:#64748b;">Quality Spices & Masala Products</p>
  </div>
  <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between;font-size:13px;margin-bottom:12px;">
    <div>
      <p style="margin:2px 0;"><strong>Bill No:</strong> ${bill.bill_number}</p>
      <p style="margin:2px 0;"><strong>Date:</strong> ${bill.bill_date}</p>
      ${bill.transaction_ref ? `<p style="margin:2px 0;font-size:11px;color:#64748b;"><strong>Txn Ref:</strong> ${bill.transaction_ref}</p>` : ''}
    </div>
    <div style="text-align:right;">
      <p style="margin:2px 0;"><strong>Customer:</strong> ${bill.customer_name}</p>
      ${bill.customer_phone ? `<p style="margin:2px 0;"><strong>Phone:</strong> ${bill.customer_phone}</p>` : ''}
      ${bill.customer_address ? `<p style="margin:2px 0;"><strong>Address:</strong> ${bill.customer_address}</p>` : ''}
    </div>
  </div>
  <table>
    <colgroup>
      <col class="col-num"><col class="col-item"><col class="col-pkg"><col class="col-qty"><col class="col-price"><col class="col-amt">
    </colgroup>
    <thead>
      <tr style="border-top:2px solid #1e293b;border-bottom:2px solid #1e293b;">
        <th>#</th><th>Item</th><th style="text-align:center;">Pkg</th><th style="text-align:center;">Qty</th><th style="text-align:right;">Price</th><th style="text-align:right;">Amount</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>
  <div style="border-top:2px solid #1e293b;padding-top:12px;">
    <div style="margin-left:auto;width:240px;font-size:13px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>Subtotal</span><span>₹${bill.subtotal.toFixed(2)}</span></div>
      ${discountRow}
      <div style="display:flex;justify-content:space-between;font-size:18px;font-weight:bold;border-top:1px solid #cbd5e1;padding-top:6px;margin-top:6px;"><span>TOTAL</span><span>₹${bill.total.toFixed(2)}</span></div>
    </div>
  </div>
  ${bill.notes ? `<p style="margin-top:16px;font-size:11px;color:#64748b;font-style:italic;">Note: ${bill.notes}</p>` : ''}
  <div style="margin-top:32px;padding-top:12px;border-top:1px solid #cbd5e1;text-align:center;font-size:11px;color:#94a3b8;">
    <p style="margin:0;">Thank you for your purchase!</p>
    <p style="margin:4px 0 0;">Jalan Jyothi — Quality you can trust</p>
  </div>
</body>
</html>`;
}

export default function BillPrintView({ bill, onClose }: BillPrintViewProps) {
  const items = bill.items || [];

  const handlePrint = async () => {
    const html = generateBillHtml(bill);

    // On native mobile (Capacitor), open HTML in a new window which triggers Android print
    if ((window as any).Capacitor?.isNativePlatform?.()) {
      try {
        // Create a blob URL and open it — Android WebView supports window.print()
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(html);
          printWindow.document.close();
          // Small delay to ensure content is rendered before print dialog
          setTimeout(() => {
            printWindow.print();
          }, 500);
        } else {
          // Fallback: use an iframe for printing
          const iframe = document.createElement('iframe');
          iframe.style.position = 'fixed';
          iframe.style.top = '-10000px';
          iframe.style.left = '-10000px';
          iframe.style.width = '210mm';
          iframe.style.height = '297mm';
          document.body.appendChild(iframe);
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (iframeDoc) {
            iframeDoc.open();
            iframeDoc.write(html);
            iframeDoc.close();
            setTimeout(() => {
              iframe.contentWindow?.print();
              setTimeout(() => document.body.removeChild(iframe), 1000);
            }, 500);
          }
        }
      } catch (err) {
        // Ultimate fallback: direct window.print() on current page
        window.print();
      }
    } else {
      // Desktop: use iframe approach for clean print without UI controls
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.top = '-10000px';
      iframe.style.left = '-10000px';
      iframe.style.width = '210mm';
      iframe.style.height = '297mm';
      document.body.appendChild(iframe);
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(html);
        iframeDoc.close();
        setTimeout(() => {
          iframe.contentWindow?.print();
          setTimeout(() => document.body.removeChild(iframe), 1000);
        }, 300);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex flex-col z-50">
      {/* Fixed Action Bar at top - always visible */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shrink-0 print:hidden">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 text-sm"
        >
          ← Back
        </button>
        <h3 className="font-semibold text-slate-900 text-sm">Bill #{bill.bill_number}</h3>
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-brand-600 text-white rounded-lg font-semibold hover:bg-brand-700 text-sm shadow-md"
        >
          🖨️ Print
        </button>
      </div>

      {/* Scrollable Bill Content */}
      <div className="flex-1 overflow-y-auto p-4 print:p-0 print:overflow-visible">
        <div className="bg-white w-full max-w-[210mm] mx-auto rounded-lg shadow-2xl print:shadow-none print:rounded-none print:max-w-full">
          <div className="p-6 print:p-6" id="bill-print-area">
          {/* Header */}
          <div className="text-center border-b-2 border-slate-800 pb-4 mb-4">
            <h1 className="text-2xl font-bold text-slate-900 tracking-wide">JALAN JYOTHI</h1>
            <p className="text-sm text-slate-600 mt-1">Quality Spices & Masala Products</p>
          </div>

          {/* Bill Info */}
          <div className="flex flex-col sm:flex-row sm:justify-between gap-3 text-sm mb-4">
            <div>
              <p><strong>Bill No:</strong> {bill.bill_number}</p>
              <p><strong>Date:</strong> {bill.bill_date}</p>
              {bill.transaction_ref && (
                <p className="text-xs text-slate-500"><strong>Txn Ref:</strong> {bill.transaction_ref}</p>
              )}
            </div>
            <div className="text-right">
              <p><strong>Customer:</strong> {bill.customer_name}</p>
              {bill.customer_phone && <p><strong>Phone:</strong> {bill.customer_phone}</p>}
              {bill.customer_address && <p><strong>Address:</strong> {bill.customer_address}</p>}
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full text-sm border-collapse mb-4" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '5%' }} />
              <col style={{ width: '40%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '17%' }} />
              <col style={{ width: '18%' }} />
            </colgroup>
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
                  <td className="py-2 font-medium break-words">{item.item_name}</td>
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

          {/* ISO 20022 Compliance Footer */}
          {bill.transaction_ref && (
            <div className="mt-4 text-xs text-slate-400 border-t border-dashed border-slate-200 pt-2">
              <p>Transaction Reference (UETR): {bill.transaction_ref}</p>
              <p>Currency: {bill.currency_code || 'INR'} (ISO 4217) | Status: {toISO20022Status(bill.payment_status)}</p>
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
    </div>
  );
}
