import { useState, useEffect } from 'react';
import { api, DashboardSummary } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

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
    return <div className="animate-pulse space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded-xl" />)}
      </div>
    </div>;
  }

  if (!summary) return <p className="text-gray-500">Failed to load dashboard.</p>;

  const revenueChange = summary.monthly.prev_month_revenue > 0
    ? (((summary.monthly.revenue - summary.monthly.prev_month_revenue) / summary.monthly.prev_month_revenue) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Today's Sales" value={`₹${summary.today.revenue.toLocaleString()}`} subtitle={`${summary.today.sales_count} bills`} color="indigo" />
        <MetricCard title="Monthly Revenue" value={`₹${summary.monthly.revenue.toLocaleString()}`} subtitle={`${revenueChange}% vs last month`} color="emerald" />
        <MetricCard title="Pending Payments" value={`₹${summary.pending_payments.amount.toLocaleString()}`} subtitle={`${summary.pending_payments.count} bills`} color="amber" />
        <MetricCard title="Monthly Profit" value={`₹${summary.monthly.profit.toLocaleString()}`} subtitle={`Expenses: ₹${summary.monthly.expenses.toLocaleString()}`} color={summary.monthly.profit >= 0 ? 'emerald' : 'red'} />
      </div>

      {/* Second row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Items" value={String(summary.inventory.total_items)} subtitle={`Stock value: ₹${summary.inventory.stock_value.toLocaleString()}`} color="blue" />
        <MetricCard title="Low Stock" value={String(summary.inventory.low_stock_count)} subtitle="Items below threshold" color={summary.inventory.low_stock_count > 0 ? 'red' : 'gray'} />
        <MetricCard title="Customers" value={String(summary.customers.total)} subtitle="Total registered" color="purple" />
        <MetricCard title="Purchases" value={`₹${summary.monthly.purchases.toLocaleString()}`} subtitle="This month" color="orange" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Sales Trend (30 days)</h3>
          {salesTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={salesTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: any) => `₹${Number(v).toLocaleString()}`} />
                <Line type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-400 text-sm">No sales data yet</p>}
        </div>

        {/* Top Items */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Top Selling Items</h3>
          {topItems && topItems.topItems.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topItems.topItems}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="item_name" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="total_qty" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-400 text-sm">No data yet</p>}
        </div>
      </div>

      {/* Low Stock Alerts & Margins */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Low Stock Alerts</h3>
          {lowStock.length > 0 ? (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {lowStock.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between py-2 px-3 bg-red-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">{item.item_name}</span>
                  <span className="text-sm font-bold text-red-600">{item.current_stock} left</span>
                </div>
              ))}
            </div>
          ) : <p className="text-green-600 text-sm">All items adequately stocked!</p>}
        </div>

        {/* Profit Margins */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Profit Margins</h3>
          {topItems && topItems.margins.length > 0 ? (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {topItems.margins.map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-700">{item.item_name}</span>
                  <div className="text-right">
                    <span className={`text-sm font-bold ${item.margin_percent > 20 ? 'text-emerald-600' : item.margin_percent > 10 ? 'text-amber-600' : 'text-red-600'}`}>
                      {item.margin_percent}%
                    </span>
                    <span className="text-xs text-gray-400 ml-2">₹{item.selling_price - item.purchase_cost}/unit</span>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-gray-400 text-sm">No items yet</p>}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, subtitle, color }: { title: string; value: string; subtitle: string; color: string }) {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-50 border-indigo-100',
    emerald: 'bg-emerald-50 border-emerald-100',
    amber: 'bg-amber-50 border-amber-100',
    red: 'bg-red-50 border-red-100',
    blue: 'bg-blue-50 border-blue-100',
    purple: 'bg-purple-50 border-purple-100',
    orange: 'bg-orange-50 border-orange-100',
    gray: 'bg-gray-50 border-gray-100',
  };
  const textColors: Record<string, string> = {
    indigo: 'text-indigo-700', emerald: 'text-emerald-700', amber: 'text-amber-700',
    red: 'text-red-700', blue: 'text-blue-700', purple: 'text-purple-700',
    orange: 'text-orange-700', gray: 'text-gray-700',
  };

  return (
    <div className={`rounded-xl border p-4 ${colors[color] || colors.gray}`}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
      <p className={`text-xl lg:text-2xl font-bold mt-1 ${textColors[color] || textColors.gray}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
    </div>
  );
}
