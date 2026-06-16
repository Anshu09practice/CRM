import { Item } from '../services/api';
import { formatSizing } from '../utils/sizing';

interface ItemCardProps {
  item: Item;
  onEdit: (item: Item) => void;
  onDelete: (item: Item) => void;
}

export default function ItemCard({ item, onEdit, onDelete }: ItemCardProps) {
  const profit = item.selling_price - item.purchase_cost;
  const margin = item.selling_price > 0 ? ((profit / item.selling_price) * 100).toFixed(1) : '0';

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-slate-900 text-base leading-tight">{item.item_name}</h3>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
          item.packaging_style === 'packet'
            ? 'bg-blue-100 text-blue-700'
            : 'bg-purple-100 text-purple-700'
        }`}>
          {item.packaging_style === 'packet' ? 'Packet' : 'Standing Pack'}
        </span>
      </div>

      {/* Sizing info */}
      <p className="text-sm text-slate-600 mb-3 bg-slate-50 px-2 py-1 rounded">
        📦 {formatSizing(item.packaging_style, item.package_quantity_grams)}
      </p>

      {/* Price grid */}
      <div className="grid grid-cols-3 gap-2 text-center mb-3">
        <div className="bg-slate-50 rounded p-1.5">
          <p className="text-[10px] text-slate-500 uppercase">Purchase</p>
          <p className="font-semibold text-sm">₹{item.purchase_cost}</p>
        </div>
        <div className="bg-slate-50 rounded p-1.5">
          <p className="text-[10px] text-slate-500 uppercase">Selling</p>
          <p className="font-semibold text-sm">₹{item.selling_price}</p>
        </div>
        <div className="bg-slate-50 rounded p-1.5">
          <p className="text-[10px] text-slate-500 uppercase">MRP</p>
          <p className="font-semibold text-sm">₹{item.mrp}</p>
        </div>
      </div>

      {/* Margin */}
      <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
        <span>Profit: ₹{profit.toFixed(2)}</span>
        <span className={`font-medium ${profit > 0 ? 'text-green-600' : 'text-red-600'}`}>
          {margin}% margin
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t border-slate-100">
        <button
          onClick={() => onEdit(item)}
          className="flex-1 text-sm py-1.5 text-brand-600 hover:bg-brand-50 rounded font-medium transition-colors"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(item)}
          className="flex-1 text-sm py-1.5 text-red-600 hover:bg-red-50 rounded font-medium transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
