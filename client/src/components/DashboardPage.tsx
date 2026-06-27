import { useState, useEffect } from 'react';
import { api, DashboardSummary } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { SkeletonDashboard } from './Skeleton';

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [topItems, setTopItems] = useState<{ topItems: any[]; bottomItems: any[]; margins: any[] } | null>(null);
  const [salesTrend, setSalesTrend] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [s, t, trend, ls] = await Promise.all([
        api.getDashboardSummary(),
        api.getTopItems(),
        api.getSalesTrend(),
        api.getLowStockDashboard()
      ]);
      setSummary(s);
      setTopItems(t);
      setSalesTrend(trend);
      setLowStock(ls);
    } catch (e) {
      console.error('Dashboard load error:', e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <SkeletonDashboard />;
  }

  if (!summary) return <p className="text-zinc-500">Failed to load dashboard.</p>;

  const revenueChange = summary.monthly.prev_month_revenue > 0
    ? (((summary.monthly.revenue - summary.monthly.prev_month_revenue) / summary.monthly.prev_month_revenue) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      <h1 className="page-title">Dashboard</h1>

      {/* Metric Cards — Row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <MetricCard title="Today's Sales" value={`₹${summary.today.revenue.toLocaleString()}`} subtitle={`${summary.today.sales_count} bills`} color="indigo" />
        <MetricCard title="Monthly Revenue" value={`₹${summary.monthly.revenue.toLocaleString()}`} subtitle={`${revenueChange}% vs last month`} color="emerald" />
        <MetricCard title="Pending" value={`₹${summary.pending_payments.amount.toLocaleString()}`} subtitle={`${summary.pending_payments.count} bills`} color="amber" />
        <MetricCard title="Monthly Profit" value={`₹${summary.monthly.profit.toLocaleString()}`} subtitle={`Expenses: ₹${summary.monthly.expenses.toLocaleString()}`} color={summary.monthly.profit >= 0 ? 'emerald' : 'rose'} />
      </div>

      {/* Metric Cards — Row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <MetricCard title="Total Items" value={String(summary.inventory.total_items)} subtitle={`Stock: ₹${summary.inventory.stock_value.toLocaleString()}`} color="sky" />
        <MetricCard title="Low Stock" value={String(summary.inventory.low_stock_count)} subtitle="Below threshold" color={summary.inventory.low_stock_count > 0 ? 'rose' : 'zinc'} />
        <MetricCard title="Customers" value={String(summary.customers.total)} subtitle="Total registered" color="violet" />
        <MetricCard title="Purchases" value={`₹${summary.monthly.purchases.toLocaleString()}`} subtitle="This month" color="orange" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Sales Trend */}
        <div className="card p-4">
          <h3 className="section-title mb-4">Sales Trend (30 days)</h3>
          {salesTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={salesTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#71717a' }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: '#71717a' }} />
                <Tooltip
                  contentStyle={{ background: 'rgba(255,255,255,0.95)', border: '1px solid #e4e4e7', borderRadius: '12px', fontSize: '12px' }}
                  formatter={(v: any) => `₹${Number(v).toLocaleString()}`}
                />
                <Line type="monotone" dataKey="revenue" stroke="url(#brandGrad)" strokeWidth={2.5} dot={false} />
                <defs>
                  <linearGradient id="brandGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#4f46e5" />
                    <stop offset="100%" stopColor="#7c3aed" />
                  </linearGradient>
                </defs>
              </LineChart>
            </ResponsiveContainer>
          ) : <p className="text-zinc-400 text-sm">No sales data yet</p>}
        </div>

        {/* Top Items */}
        <div className="card p-4">
          <h3 className="section-title mb-4">Top Selling Items</h3>
          {topItems && topItems.topItems.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topItems.topItems}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="item_name" tick={{ fontSize: 9, fill: '#71717a' }} angle={-20} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 10, fill: '#71717a' }} />
                <Tooltip
                  contentStyle={{ background: 'rgba(255,255,255,0.95)', border: '1px solid #e4e4e7', borderRadius: '12px', fontSize: '12px' }}
                />
                <Bar dataKey="total_qty" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" />
                    <stop offset="100%" stopColor="#4f46e5" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-zinc-400 text-sm">No data yet</p>}
        </div>
      </div>

      {/* Low Stock Alerts & Margins */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Low Stock */}
        <div className="card p-4">
          <h3 className="section-title mb-3">Low Stock Alerts</h3>
          {lowStock.length > 0 ? (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {lowStock.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between py-2 px-3 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-100 dark:border-rose-900/40">
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{item.item_name}</span>
                  <span className="badge-danger">{item.current_stock} left</span>
                </div>
              ))}
            </div>
          ) : <p className="text-emerald-600 dark:text-emerald-400 text-sm font-medium">All items adequately stocked!</p>}
        </div>

        {/* Profit Margins */}
        <div className="card p-4">
          <h3 className="section-title mb-3">Profit Margins</h3>
          {topItems && topItems.margins.length > 0 ? (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {topItems.margins.map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-2 px-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">{item.item_name}</span>
                  <div className="text-right">
                    <span className={`text-sm font-bold ${item.margin_percent > 20 ? 'text-emerald-600' : item.margin_percent > 10 ? 'text-amber-600' : 'text-rose-600'}`}>
                      {item.margin_percent}%
                    </span>
                    <span className="text-xs text-zinc-400 ml-2">₹{item.selling_price - item.purchase_cost}/unit</span>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-zinc-400 text-sm">No items yet</p>}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, subtitle, color }: { title: string; value: string; subtitle: string; color: string }) {
  const cardClass: Record<string, string> = {
    indigo:  'metric-card-indigo',
    emerald: 'metric-card-emerald',
    amber:   'metric-card-amber',
    rose:    'metric-card-rose',
    red:     'metric-card-rose',
    sky:     'metric-card-sky',
    blue:    'metric-card-sky',
    violet:  'metric-card-violet',
    purple:  'metric-card-violet',
    orange:  'metric-card-orange',
    zinc:    'metric-card-zinc',
    gray:    'metric-card-zinc',
  };
  const valueColor: Record<string, string> = {
    indigo:  'text-brand-700 dark:text-brand-300',
    emerald: 'text-emerald-700 dark:text-emerald-400',
    amber:   'text-amber-700 dark:text-amber-400',
    rose:    'text-rose-700 dark:text-rose-400',
    red:     'text-rose-700 dark:text-rose-400',
    sky:     'text-sky-700 dark:text-sky-400',
    blue:    'text-sky-700 dark:text-sky-400',
    violet:  'text-violet-700 dark:text-violet-400',
    purple:  'text-violet-700 dark:text-violet-400',
    orange:  'text-orange-700 dark:text-orange-400',
    zinc:    'text-zinc-700 dark:text-zinc-400',
    gray:    'text-zinc-700 dark:text-zinc-400',
  };

  return (
    <div className={cardClass[color] || 'metric-card-zinc'}>
      <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-500 uppercase tracking-wider">{title}</p>
      <p className={`text-xl lg:text-2xl font-bold mt-1.5 ${valueColor[color] || valueColor.zinc}`}>{value}</p>
      <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">{subtitle}</p>
    </div>
  );
}
