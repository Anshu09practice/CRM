import { useState } from 'react';
import { api, Item } from '../services/api';

interface ImportModalProps {
  onClose: () => void;
  onImported: () => void;
}

interface ColumnMapping {
  item_name: string;
  sku_id: string;
  package_quantity_grams: string;
  purchase_cost: string;
  selling_price: string;
  mrp: string;
  packaging_style: string;
}

export default function ImportModal({ onClose, onImported }: ImportModalProps) {
  const [step, setStep] = useState<'source' | 'mapping' | 'preview' | 'done'>('source');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mapping, setMapping] = useState<ColumnMapping>({
    item_name: '',
    sku_id: '',
    package_quantity_grams: '',
    purchase_cost: '',
    selling_price: '',
    mrp: '',
    packaging_style: ''
  });
  const [importResult, setImportResult] = useState<{ imported: number; errors: string[] } | null>(null);
  const [sourceFiles, setSourceFiles] = useState<{ name: string; size: number }[]>([]);

  // Load source files
  const loadSourceFiles = async () => {
    try {
      const res = await api.getSourceFiles();
      setSourceFiles(res.files);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.parseExcel(file);
      setHeaders(res.headers);
      setRows(res.rows);
      setTotalRows(res.total_rows);
      autoMapColumns(res.headers);
      setStep('mapping');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle source file selection
  const handleSourceFile = async (filename: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.parseSourceFile(filename);
      setHeaders(res.headers);
      setRows(res.rows);
      setTotalRows(res.total_rows);
      autoMapColumns(res.headers);
      setStep('mapping');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto-map columns based on header names
  const autoMapColumns = (hdrs: string[]) => {
    const lower = hdrs.map(h => h.toLowerCase());
    const newMapping: ColumnMapping = { ...mapping };

    const findMatch = (keywords: string[]) =>
      hdrs[lower.findIndex(h => keywords.some(k => h.includes(k)))] || '';

    newMapping.item_name = findMatch(['item', 'name', 'product']);
    newMapping.sku_id = findMatch(['sku', 'sku_id', 'skuid', 'code', 'barcode']);
    newMapping.package_quantity_grams = findMatch(['quantity', 'gram', 'weight', 'qty', 'pack']);
    newMapping.purchase_cost = findMatch(['purchase', 'cost', 'buy']);
    newMapping.selling_price = findMatch(['sell', 'price', 'sp']);
    newMapping.mrp = findMatch(['mrp', 'retail', 'max']);
    newMapping.packaging_style = findMatch(['style', 'type', 'packaging']);

    setMapping(newMapping);
  };

  // Execute import
  const handleImport = async () => {
    if (!mapping.item_name) {
      setError('Please map at least the Item Name column');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const items: Partial<Item>[] = rows.map(row => ({
        item_name: String(row[mapping.item_name] || ''),
        sku_id: mapping.sku_id ? String(row[mapping.sku_id] || '') || null : null,
        package_quantity_grams: parseInt(row[mapping.package_quantity_grams]) || 50,
        purchase_cost: parseFloat(row[mapping.purchase_cost]) || 0,
        selling_price: parseFloat(row[mapping.selling_price]) || 0,
        mrp: parseFloat(row[mapping.mrp]) || 0,
        packaging_style: (row[mapping.packaging_style] || 'packet').toLowerCase().includes('stand')
          ? 'standing_package' as const
          : 'packet' as const
      }));

      const result = await api.importItems(items);
      setImportResult(result);
      setStep('done');
      onImported();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Render source selection step
  useState(() => { loadSourceFiles(); });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-xl rounded-t-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between rounded-t-xl z-10">
          <h2 className="text-lg font-semibold">Import Items from Excel</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
        </div>

        <div className="p-4">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg mb-4">{error}</div>
          )}

          {/* Step: Source Selection */}
          {step === 'source' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-slate-800 mb-2">Upload Excel File</h3>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="input-field"
                  disabled={loading}
                  title="Upload Excel File"
                  aria-label="Upload Excel File"
                />
              </div>

              {sourceFiles.length > 0 && (
                <div>
                  <h3 className="font-medium text-slate-800 mb-2">Or select from existing source files</h3>
                  <div className="space-y-2">
                    {sourceFiles.map(f => (
                      <button
                        key={f.name}
                        onClick={() => handleSourceFile(f.name)}
                        disabled={loading}
                        className="w-full text-left p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <span className="font-medium">{f.name}</span>
                        <span className="text-xs text-slate-500 ml-2">({(f.size / 1024).toFixed(1)} KB)</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {loading && <p className="text-sm text-slate-500">Parsing file...</p>}
            </div>
          )}

          {/* Step: Column Mapping */}
          {step === 'mapping' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Found {totalRows} rows. Map Excel columns to inventory fields:
              </p>

              {(['item_name', 'sku_id', 'package_quantity_grams', 'purchase_cost', 'selling_price', 'mrp', 'packaging_style'] as const).map(field => (
                <div key={field} className="flex items-center gap-3">
                  <label id={`label-${field}`} className="text-sm font-medium text-slate-700 w-40 capitalize">
                    {field.replace(/_/g, ' ')}
                  </label>
                  <select
                    value={mapping[field]}
                    onChange={e => setMapping({ ...mapping, [field]: e.target.value })}
                    className="input-field flex-1"
                    aria-labelledby={`label-${field}`}
                    title={field.replace(/_/g, ' ')}
                  >
                    <option value="">-- Skip --</option>
                    {headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              ))}

              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep('source')} className="btn-secondary flex-1">Back</button>
                <button onClick={() => setStep('preview')} className="btn-primary flex-1">Preview</button>
              </div>
            </div>
          )}

          {/* Step: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">Preview (first 5 rows of {totalRows} total):</p>
              <div className="overflow-x-auto">
                <table className="text-sm w-full">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="px-2 py-1 text-left">Name</th>
                      <th className="px-2 py-1 text-left">Qty(g)</th>
                      <th className="px-2 py-1 text-left">Purchase</th>
                      <th className="px-2 py-1 text-left">Selling</th>
                      <th className="px-2 py-1 text-left">MRP</th>
                      <th className="px-2 py-1 text-left">Style</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        <td className="px-2 py-1">{row[mapping.item_name] || '-'}</td>
                        <td className="px-2 py-1">{row[mapping.package_quantity_grams] || '-'}</td>
                        <td className="px-2 py-1">{row[mapping.purchase_cost] || '-'}</td>
                        <td className="px-2 py-1">{row[mapping.selling_price] || '-'}</td>
                        <td className="px-2 py-1">{row[mapping.mrp] || '-'}</td>
                        <td className="px-2 py-1">{row[mapping.packaging_style] || 'packet'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep('mapping')} className="btn-secondary flex-1">Back</button>
                <button onClick={handleImport} disabled={loading} className="btn-primary flex-1">
                  {loading ? 'Importing...' : `Import ${totalRows} Items`}
                </button>
              </div>
            </div>
          )}

          {/* Step: Done */}
          {step === 'done' && importResult && (
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <span className="text-3xl">✅</span>
              </div>
              <h3 className="text-lg font-semibold">Import Complete!</h3>
              <p className="text-slate-600">{importResult.imported} items imported successfully.</p>
              {importResult.errors.length > 0 && (
                <div className="bg-yellow-50 text-yellow-700 text-sm p-3 rounded-lg text-left">
                  <p className="font-medium mb-1">{importResult.errors.length} warnings:</p>
                  {importResult.errors.slice(0, 5).map((e, i) => <p key={i}>• {e}</p>)}
                </div>
              )}
              <button onClick={onClose} className="btn-primary w-full">Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
