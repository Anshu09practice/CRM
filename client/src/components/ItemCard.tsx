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
    <div className="card-hover overflow-hidden">
      {/* Top accent bar */}
      <div className={`h-1 w-full ${isLowStock ? 'bg-gradient-to-r from-rose-500 to-rose-400' : 'bg-gradient-to-r from-brand-500 to-violet-500'}`} />

      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="min-w-0 flex-1 pr-2">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm leading-tight truncate">{item.item_name}</h3>
            {item.sku_id && <p className="text-[10px] text-zinc-400 mt-0.5 font-mono">{item.sku_id}</p>}
          </div>
          <span className={`flex-shrink-0 badge ${
            item.packaging_style === 'packet' ? 'badge-info' : 'badge-brand'
          }`}>
            {item.packaging_style === 'packet' ? 'Packet' : 'Standing'}
          </span>
        </div>

        {/* Sizing info */}
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3 bg-zinc-50 dark:bg-zinc-800/60 px-2.5 py-1.5 rounded-lg">
          {formatSizing(item.packaging_style, item.package_quantity_grams)}
        </p>

        {/* Price grid */}
        <div className="grid grid-cols-3 gap-1.5 text-center mb-3">
          <div className="bg-zinc-50 dark:bg-zinc-800/60 rounded-xl p-2">
            <p className="text-[9px] text-zinc-400 uppercase tracking-wide font-semibold">Buy</p>
            <p className="font-bold text-xs text-zinc-700 dark:text-zinc-300 mt-0.5">₹{item.purchase_cost}</p>
          </div>
          <div className="bg-brand-50 dark:bg-brand-950/40 rounded-xl p-2 border border-brand-100 dark:border-brand-900/30">
            <p className="text-[9px] text-brand-500 uppercase tracking-wide font-semibold">Sell</p>
            <p className="font-bold text-xs text-brand-700 dark:text-brand-300 mt-0.5">₹{item.selling_price}</p>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-800/60 rounded-xl p-2">
            <p className="text-[9px] text-zinc-400 uppercase tracking-wide font-semibold">MRP</p>
            <p className="font-bold text-xs text-zinc-700 dark:text-zinc-300 mt-0.5">₹{item.mrp}</p>
          </div>
        </div>

        {/* Stock + Margin row */}
        <div className="flex items-center justify-between text-xs mb-3">
          <span className={`font-semibold px-2.5 py-1 rounded-full ${
            isLowStock ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
          }`}>
            {stock} in stock
          </span>
          <span className={`font-semibold ${profit > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {margin}% margin
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <button onClick={onEdit} className="flex-1 text-xs py-1.5 text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/40 rounded-lg font-semibold transition-colors">
            Edit
          </button>
          <button onClick={onDelete} className="flex-1 text-xs py-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg font-semibold transition-colors">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
