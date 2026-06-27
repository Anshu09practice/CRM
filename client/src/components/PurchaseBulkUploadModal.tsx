import { useState, useRef } from 'react';
import { api } from '../services/api';
import { toast } from 'react-hot-toast';
import ExcelJS from 'exceljs';

interface PurchaseBulkUploadModalProps {
  onClose: () => void;
  onUploaded: () => void;
}

interface ParsedPurchaseRow {
  item_name: string;
  quantity: string;
  purchase_cost: string;
  purchase_date: string;
  notes: string;
}

function parseCsv(text: string): ParsedPurchaseRow[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const rows: ParsedPurchaseRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (values.length === 0) continue;

    const row: any = {};
    headers.forEach((h, idx) => {
      row[h] = (values[idx] || '').trim();
    });

    if (row.item_name) {
      rows.push(row);
    }
  }

  return rows;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

export default function PurchaseBulkUploadModal({ onClose, onUploaded }: PurchaseBulkUploadModalProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload');
  const [rows, setRows] = useState<ParsedPurchaseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ created: number; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    const isExcel = file.name.match(/\.(xlsx|xls)$/i);

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const buffer = evt.target?.result as ArrayBuffer;
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(buffer);
          const worksheet = workbook.worksheets[0];

          const headers: string[] = [];
          const headerRow = worksheet.getRow(1);
          headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            headers[colNumber - 1] = String(cell.value ?? '');
          });

          const jsonData: any[] = [];
          for (let i = 2; i <= worksheet.rowCount; i++) {
            const row = worksheet.getRow(i);
            const rowData: any = {};
            for (let j = 0; j < headers.length; j++) {
              rowData[headers[j]] = row.getCell(j + 1).value ?? '';
            }
            jsonData.push(rowData);
          }

          if (jsonData.length === 0) {
            setError('No valid rows found in the Excel file.');
            return;
          }

          const parsed: ParsedPurchaseRow[] = jsonData.map(row => {
            const normalized: any = {};
            Object.keys(row).forEach(key => { normalized[key.toLowerCase().trim()] = String(row[key]); });
            return normalized;
          }).filter(row => row.item_name);

          if (parsed.length === 0) {
            setError('No valid rows found. Make sure the file has a column named "item_name".');
            return;
          }
          setRows(parsed);
          setStep('preview');
        } catch (err: any) {
          setError(`Failed to parse Excel: ${err.message}`);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const text = evt.target?.result as string;
          const parsed = parseCsv(text);
          if (parsed.length === 0) {
            setError('No valid rows found. Make sure the file has headers: item_name,quantity,purchase_cost,purchase_date,notes');
            return;
          }
          setRows(parsed);
          setStep('preview');
        } catch (err: any) {
          setError(`Failed to parse CSV: ${err.message}`);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleBulkImport = async () => {
    setLoading(true);
    setError('');
    try {
      const purchaseData = rows.map(row => ({
        item_name: row.item_name,
        quantity: parseInt(row.quantity) || 0,
        purchase_cost: row.purchase_cost ? parseFloat(row.purchase_cost) : undefined,
        purchase_date: row.purchase_date || undefined,
        notes: row.notes || undefined,
      }));
      const res = await api.bulkImportPurchases(purchaseData);
      setResult(res);
      setStep('done');
      onUploaded();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    setError('');
    try {
      await api.downloadWithAuth(api.getPurchaseTemplateCsvUrl(), 'jalan_jyothi_purchases_template.csv');
      toast.success('Template saved to Download/Jalan Jyothi/ folder', { duration: 4000 });
    } catch (err: any) {
      setError(`Download failed: ${err.message}`);
      toast.error('Download failed: ' + err.message);
    }
  };

  const handleExportCsv = async () => {
    setError('');
    try {
      await api.downloadWithAuth(api.getPurchaseExportCsvUrl(), 'jalan_jyothi_purchases_export.csv');
      toast.success('Export saved to Download/Jalan Jyothi/ folder', { duration: 4000 });
    } catch (err: any) {
      setError(`Export failed: ${err.message}`);
      toast.error('Export failed: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-xl rounded-t-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between rounded-t-xl z-10">
          <h2 className="text-lg font-semibold">Bulk Upload Purchases</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
        </div>

        <div className="p-4">
          {error && (
            <div className="bg-rose-50 text-red-700 text-sm px-3 py-2 rounded-lg mb-4">{error}</div>
          )}

          {/* Step: Upload */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm font-medium text-blue-800">How it works:</p>
                <ul className="text-xs text-blue-700 mt-1 space-y-1 list-disc list-inside">
                  <li>Download the template or export your current purchases</li>
                  <li>Fill in item names, quantities, cost, date, and notes</li>
                  <li>Upload the file — purchases are created and stock is updated automatically</li>
                  <li>Item names must match existing items in your inventory</li>
                </ul>
              </div>

              {/* Download buttons */}
              <div className="flex gap-2 flex-wrap">
                <button onClick={handleDownloadTemplate} className="btn-secondary text-sm">
                  📄 Download Template
                </button>
                <button onClick={handleExportCsv} className="btn-secondary text-sm">
                  📥 Export Current Purchases
                </button>
              </div>

              {/* Upload */}
              <div>
                <label htmlFor="purchase-bulk-file" className="block text-sm font-medium text-slate-700 mb-2">Upload CSV or Excel File</label>
                <input
                  id="purchase-bulk-file"
                  ref={fileRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFile}
                  className="input-field"
                />
              </div>

              {/* Template format info */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p className="text-xs font-medium text-slate-700 mb-1">Expected CSV/Excel format:</p>
                <code className="text-[11px] text-slate-600 block overflow-x-auto">
                  item_name,quantity,purchase_cost,purchase_date,notes
                </code>
                <p className="text-[11px] text-slate-500 mt-1">
                  • <strong>item_name</strong>: Must match an existing item in inventory<br />
                  • <strong>quantity</strong>: Number of units purchased (required)<br />
                  • <strong>purchase_cost</strong>: Cost per unit in ₹ (defaults to item's cost if empty)<br />
                  • <strong>purchase_date</strong>: YYYY-MM-DD format (defaults to today if empty)<br />
                  • <strong>notes</strong>: Optional (supplier name, invoice #, etc.)
                </p>
              </div>
            </div>
          )}

          {/* Step: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Found <strong>{rows.length}</strong> purchases to import. Preview:
              </p>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="text-xs w-full">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="px-2 py-1.5 text-left">Item Name</th>
                      <th className="px-2 py-1.5 text-left">Qty</th>
                      <th className="px-2 py-1.5 text-left">Cost/Unit</th>
                      <th className="px-2 py-1.5 text-left">Date</th>
                      <th className="px-2 py-1.5 text-left">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 20).map((row, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="px-2 py-1 font-medium">{row.item_name}</td>
                        <td className="px-2 py-1">{row.quantity}</td>
                        <td className="px-2 py-1">{row.purchase_cost ? `₹${row.purchase_cost}` : <span className="text-slate-400">default</span>}</td>
                        <td className="px-2 py-1">{row.purchase_date || <span className="text-slate-400">today</span>}</td>
                        <td className="px-2 py-1 truncate max-w-[120px]">{row.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 20 && (
                  <p className="text-xs text-slate-500 px-2 py-1 bg-slate-50">
                    ... and {rows.length - 20} more rows
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => { setStep('upload'); setRows([]); }} className="btn-secondary flex-1">
                  Back
                </button>
                <button onClick={handleBulkImport} disabled={loading} className="btn-primary flex-1">
                  {loading ? 'Processing...' : `Import ${rows.length} Purchases`}
                </button>
              </div>
            </div>
          )}

          {/* Step: Done */}
          {step === 'done' && result && (
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <span className="text-3xl">✅</span>
              </div>
              <h3 className="text-lg font-semibold">Bulk Import Complete!</h3>
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-green-700">{result.created}</p>
                <p className="text-xs text-green-600">Purchases Created</p>
              </div>
              {result.errors.length > 0 && (
                <div className="bg-yellow-50 text-yellow-700 text-sm p-3 rounded-lg text-left">
                  <p className="font-medium mb-1">{result.errors.length} warnings:</p>
                  {result.errors.slice(0, 10).map((e, i) => <p key={i} className="text-xs">• {e}</p>)}
                  {result.errors.length > 10 && (
                    <p className="text-xs mt-1">... and {result.errors.length - 10} more</p>
                  )}
                </div>
              )}
              <button onClick={onClose} className="btn-primary w-full mt-4">
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

