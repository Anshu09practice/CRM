import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { api, DashboardSummary } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { SkeletonDashboard } from './Skeleton';

function getGreeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 22) return 'Good evening';
  return 'Good night';
}

type Period = 7 | 30;

export default function DashboardPage() {
  const { resolvedTheme } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [topItems, setTopItems] = useState<{ topItems: any[]; bottomItems: any[]; margins: any[] } | null>(null);
  const [salesTrend, setSalesTrend] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>(30);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [s, t, trend, ls] = await Promise.all([
        api.getDashboardSummary(),
        api.getTopItems(),
        api.getSalesTrend(),
        api.getLowStockDashboard(),
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

  if (loading) return <SkeletonDashboard />;

  if (!summary) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950/40 flex items-center justify-center mb-4 text-2xl">⚠️</div>
        <p className="text-stone-500 dark:text-stone-400 text-sm mb-4">Couldn't load dashboard data.</p>
        <button onClick={loadData} className="btn-primary">Try again</button>
      </div>
    );
  }

  const revenueChange = summary.monthly.prev_month_revenue > 0
    ? ((summary.monthly.revenue - summary.monthly.prev_month_revenue) / summary.monthly.prev_month_revenue) * 100
    : 0;

  const chartData = period === 7 ? salesTrend.slice(-7) : salesTrend;

  const gridStroke  = resolvedTheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const tickFill    = resolvedTheme === 'dark' ? '#a8a29e' : '#78716c';
  const tooltipStyle = {
    background:   resolvedTheme === 'dark' ? 'rgba(28,25,23,0.97)' : 'rgba(255,255,255,0.97)',
    border:       resolvedTheme === 'dark' ? '1px solid #44403c' : '1px solid #e7e5e4',
    borderRadius: '14px',
    fontSize:     '12px',
    color:        resolvedTheme === 'dark' ? '#fafaf9' : '#1c1917',
    boxShadow:    '0 4px 16px rgb(0 0 0 / 0.08)',
    padding:      '8px 12px',
  };

  return (
    <div className="space-y-5">

      <div className="flex items-start justify-between pt-1">
        <div>
          <p className="text-sm font-medium text-stone-400 dark:text-stone-500">{getGreeting()},</p>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50 leading-tight capitalize">
            {user?.username ?? 'Welcome'} 👋
          </h1>
        </div>
        <p className="text-xs text-stone-400 dark:text-stone-500 mt-1.5 shrink-0">
          {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
        </p>
      </div>

      <div className="relative overflow-hidden rounded-3xl p-5 text-white shadow-brand gradient-revenue-card">
        <div className="relative z-10">
          <p className="text-sm font-medium text-white/70 mb-0.5">Today's Revenue</p>
          <p className="text-4xl font-bold tracking-tight tabular-nums">
            ₹{summary.today.revenue.toLocaleString()}
          </p>
          <div className="flex items-center gap-3 mt-2.5 flex-wrap">
            <span className="text-sm text-white/80">
              {summary.today.sales_count} {summary.today.sales_count === 1 ? 'bill' : 'bills'} today
            </span>
            {summary.monthly.prev_month_revenue > 0 && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/20">
                {revenueChange >= 0 ? '↑' : '↓'} {Math.abs(revenueChange).toFixed(1)}% vs last month
              </span>
            )}
          </div>
        </div>
        <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute right-4 -bottom-12 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
      </div>

      <div className="flex gap-2.5 overflow-x-auto pb-0.5 no-scrollbar -mx-1 px-1">
        <KpiChip label="Monthly Rev" value={`₹${(summary.monthly.revenue / 1000).toFixed(0)}K`} sub={`${revenueChange >= 0 ? '+' : ''}${revenueChange.toFixed(1)}%`} color="amber" />
        <KpiChip label="Pending" value={`₹${(summary.pending_payments.amount / 1000).toFixed(0)}K`} sub={`${summary.pending_payments.count} bills`} color={summary.pending_payments.count > 0 ? 'rose' : 'emerald'} />
        <KpiChip label="Profit" value={`₹${(Math.abs(summary.monthly.profit) / 1000).toFixed(0)}K`} sub={summary.monthly.profit >= 0 ? 'this month' : 'loss'} color={summary.monthly.profit >= 0 ? 'emerald' : 'rose'} />
        <KpiChip label="Low Stock" value={String(summary.inventory.low_stock_count)} sub="items" color={summary.inventory.low_stock_count > 0 ? 'rose' : 'emerald'} />
        <KpiChip label="Customers" value={String(summary.customers.total)} sub="total" color="stone" />
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <QuickAction icon="📄" label="New Bill"  onClick={() => navigate('/billing')} />
        <QuickAction icon="💰" label="Collect"   onClick={() => navigate('/customers')} />
        <QuickAction icon="📦" label="Add Stock" onClick={() => navigate('/inventory')} />
      </div>

      <div className="card p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title">Sales Trend</h3>
          <div className="flex bg-stone-100 dark:bg-stone-800 rounded-xl p-0.5 gap-0.5">
            {([7, 30] as Period[]).map((p) => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all duration-150 ${period === p ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm' : 'text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300'}`}>
                {p}d
              </button>
            ))}
          </div>
        </div>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#d97706" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="#d97706" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="areaLine" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%"   stopColor="#d97706" />
                  <stop offset="100%" stopColor="#0d9488" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: tickFill }} tickFormatter={(v) => v.slice(5)} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: tickFill }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`₹${Number(v).toLocaleString()}`, 'Revenue']} />
              <Area type="monotone" dataKey="revenue" stroke="url(#areaLine)" strokeWidth={2.5} fill="url(#areaFill)" dot={false} activeDot={{ r: 4, fill: '#d97706', strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 flex items-center justify-center">
            <p className="text-stone-400 text-sm">No sales data yet</p>
          </div>
        )}
      </div>

      {topItems && topItems.topItems.length > 0 && (
        <div className="card p-4">
          <h3 className="section-title mb-4">Top Selling Items</h3>
          <ResponsiveContainer width="100%" height={Math.min(topItems.topItems.length, 5) * 36 + 8}>
            <BarChart data={topItems.topItems.slice(0, 5)} layout="vertical" margin={{ top: 0, right: 12, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="barFill" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%"   stopColor="#d97706" />
                  <stop offset="100%" stopColor="#0d9488" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: tickFill }} axisLine={false} tickLine={false} />
              <YAxis dataKey="item_name" type="category" tick={{ fontSize: 10, fill: tickFill }} axisLine={false} tickLine={false} width={84} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [v, 'Units sold']} />
              <Bar dataKey="total_qty" fill="url(#barFill)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {lowStock.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="section-title text-rose-700 dark:text-rose-400">Low Stock</h3>
            <span className="ml-auto badge-danger">{lowStock.length} items</span>
          </div>
          <div className="space-y-1.5">
            {lowStock.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between py-2 px-3 bg-rose-50 dark:bg-rose-950/20 rounded-xl">
                <span className="text-sm font-medium text-stone-700 dark:text-stone-300">{item.item_name}</span>
                <span className="badge-danger">{item.current_stock} left</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {topItems && topItems.margins.length > 0 && (
        <div className="card p-4 mb-2">
          <h3 className="section-title mb-3">Profit Margins</h3>
          <div className="space-y-1.5">
            {topItems.margins.slice(0, 5).map((item: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-2 px-3 m3-surface-variant">
                <span className="text-sm text-stone-700 dark:text-stone-300 truncate mr-2">{item.item_name}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-stone-400">₹{(item.selling_price - item.purchase_cost).toFixed(0)}/unit</span>
                  <span className={`text-sm font-bold tabular-nums ${item.margin_percent > 20 ? 'text-emerald-600 dark:text-emerald-400' : item.margin_percent > 10 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {item.margin_percent}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

type KpiColor = 'amber' | 'emerald' | 'rose' | 'stone';

function KpiChip({ label, value, sub, color }: { label: string; value: string; sub: string; color: KpiColor; }) {
  const bg: Record<KpiColor, string> = {
    amber:   'bg-brand-50  dark:bg-brand-950/40  border-brand-100  dark:border-brand-900/40',
    emerald: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-900/40',
    rose:    'bg-rose-50   dark:bg-rose-950/40   border-rose-100   dark:border-rose-900/40',
    stone:   'bg-stone-100 dark:bg-stone-800/60  border-stone-200  dark:border-stone-700/40',
  };
  const val: Record<KpiColor, string> = {
    amber:   'text-brand-700   dark:text-brand-300',
    emerald: 'text-emerald-700 dark:text-emerald-400',
    rose:    'text-rose-700    dark:text-rose-400',
    stone:   'text-stone-700   dark:text-stone-300',
  };
  return (
    <div className={`shrink-0 flex flex-col gap-0.5 px-3.5 py-2.5 rounded-2xl border ${bg[color]}`}>
      <p className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wide whitespace-nowrap">{label}</p>
      <p className={`text-lg font-bold tabular-nums leading-tight ${val[color]}`}>{value}</p>
      <p className="text-[10px] text-stone-400 dark:text-stone-500 whitespace-nowrap">{sub}</p>
    </div>
  );
}

function QuickAction({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="flex flex-col items-center gap-1.5 py-3.5 px-2 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-card hover:shadow-card-hover hover:border-brand-200 dark:hover:border-brand-800/40 hover:-translate-y-0.5 active:scale-[0.96] transition-all duration-150 w-full">
      <span className="text-2xl leading-none">{icon}</span>
      <span className="text-xs font-semibold text-stone-600 dark:text-stone-400">{label}</span>
    </button>
  );
}
