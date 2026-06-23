import { Item } from '../services/api';
import { formatSizing } from '../utils/sizing';

interface ItemCardProps {
  item: Item;
  onEdit: () => void;
  onDelete: () => void;
}

export default function ItemCard({ item, onEdit, onDelete }: ItemCardProps) {
  const profit = item.selling_price - item.purchase_cost;
  const margin = item.selling_price > 0 ? ((profit / item.selling_price) * 100).toFixed(1) : '0';
  const stock = item.current_stock || 0;
  const threshold = item.low_stock_threshold || 10;
  const isLowStock = stock <= threshold;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-indigo-200 transition-all">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm leading-tight">{item.item_name}</h3>
          {item.sku_id && <p className="text-[10px] text-gray-400 mt-0.5">{item.sku_id}</p>}
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
            item.packaging_style === 'packet' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
          }`}>
            {item.packaging_style === 'packet' ? 'Packet' : 'Standing'}
          </span>
        </div>
      </div>

      {/* Sizing info */}
      <p className="text-xs text-gray-500 mb-3 bg-gray-50 px-2 py-1 rounded">
        📦 {formatSizing(item.packaging_style, item.package_quantity_grams)}
      </p>

      {/* Price grid */}
      <div className="grid grid-cols-3 gap-1.5 text-center mb-3">
        <div className="bg-gray-50 rounded p-1.5">
          <p className="text-[9px] text-gray-400 uppercase">Purchase</p>
          <p className="font-semibold text-xs">₹{item.purchase_cost}</p>
        </div>
        <div className="bg-gray-50 rounded p-1.5">
          <p className="text-[9px] text-gray-400 uppercase">Selling</p>
          <p className="font-semibold text-xs text-indigo-700">₹{item.selling_price}</p>
        </div>
        <div className="bg-gray-50 rounded p-1.5">
          <p className="text-[9px] text-gray-400 uppercase">MRP</p>
          <p className="font-semibold text-xs">₹{item.mrp}</p>
        </div>
      </div>

      {/* Stock + Margin row */}
      <div className="flex items-center justify-between text-xs mb-3">
        <span className={`font-medium px-2 py-0.5 rounded-full ${
          isLowStock ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
        }`}>
          Stock: {stock}
        </span>
        <span className={`font-medium ${profit > 0 ? 'text-green-600' : 'text-red-600'}`}>
          {margin}% margin
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t border-gray-100">
        <button onClick={onEdit} className="flex-1 text-xs py-1.5 text-indigo-600 hover:bg-indigo-50 rounded font-medium transition-colors">
          Edit
        </button>
        <button onClick={onDelete} className="flex-1 text-xs py-1.5 text-red-600 hover:bg-red-50 rounded font-medium transition-colors">
          Delete
        </button>
      </div>
    </div>
  );
}
