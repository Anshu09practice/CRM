"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const router = (0, express_1.Router)();
// GET /api/dashboard/summary - Main dashboard metrics
router.get('/summary', (_req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const monthStart = today.slice(0, 7) + '-01';
    // Today's sales
    const todaySales = (0, db_1.queryOne)(`
    SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as revenue
    FROM bills WHERE bill_date = ?
  `, [today]);
    // Monthly revenue
    const monthlySales = (0, db_1.queryOne)(`
    SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as revenue
    FROM bills WHERE bill_date >= ?
  `, [monthStart]);
    // Previous month for comparison
    const prevMonthEnd = new Date(today.slice(0, 7) + '-01');
    prevMonthEnd.setDate(prevMonthEnd.getDate() - 1);
    const prevMonthStart = prevMonthEnd.toISOString().split('T')[0].slice(0, 7) + '-01';
    const prevMonthSales = (0, db_1.queryOne)(`
    SELECT COALESCE(SUM(total), 0) as revenue
    FROM bills WHERE bill_date >= ? AND bill_date <= ?
  `, [prevMonthStart, prevMonthEnd.toISOString().split('T')[0]]);
    // Pending payments
    const pendingPayments = (0, db_1.queryOne)(`
    SELECT COUNT(*) as count, COALESCE(SUM(total - amount_paid), 0) as amount
    FROM bills WHERE payment_status IN ('pending', 'partial')
  `);
    // Low stock items
    const lowStockCount = (0, db_1.queryOne)(`
    SELECT COUNT(*) as count FROM items WHERE current_stock <= low_stock_threshold AND current_stock >= 0
  `);
    // Total items and stock value
    const inventory = (0, db_1.queryOne)(`
    SELECT COUNT(*) as total_items, COALESCE(SUM(current_stock * purchase_cost), 0) as stock_value
    FROM items
  `);
    // Total customers
    const customerCount = (0, db_1.queryOne)('SELECT COUNT(*) as count FROM customers');
    // Monthly expenses
    const monthlyExpenses = (0, db_1.queryOne)(`
    SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE expense_date >= ?
  `, [monthStart]);
    // Monthly purchases cost
    const monthlyPurchases = (0, db_1.queryOne)(`
    SELECT COALESCE(SUM(total_cost), 0) as total FROM purchases WHERE purchase_date >= ?
  `, [monthStart]);
    // Profit: revenue - purchases - expenses
    const monthlyProfit = (monthlySales?.revenue || 0) - (monthlyPurchases?.total || 0) - (monthlyExpenses?.total || 0);
    res.json({
        today: {
            sales_count: todaySales?.count || 0,
            revenue: todaySales?.revenue || 0
        },
        monthly: {
            revenue: monthlySales?.revenue || 0,
            sales_count: monthlySales?.count || 0,
            prev_month_revenue: prevMonthSales?.revenue || 0,
            expenses: monthlyExpenses?.total || 0,
            purchases: monthlyPurchases?.total || 0,
            profit: monthlyProfit
        },
        pending_payments: {
            count: pendingPayments?.count || 0,
            amount: pendingPayments?.amount || 0
        },
        inventory: {
            total_items: inventory?.total_items || 0,
            stock_value: inventory?.stock_value || 0,
            low_stock_count: lowStockCount?.count || 0
        },
        customers: {
            total: customerCount?.count || 0
        }
    });
});
// GET /api/dashboard/top-items - Top and bottom selling items
router.get('/top-items', (req, res) => {
    const { period } = req.query;
    const monthStart = new Date().toISOString().split('T')[0].slice(0, 7) + '-01';
    // Use parameterized queries to prevent SQL injection
    const params = period === 'all' ? [] : [monthStart];
    const dateCondition = period === 'all' ? '' : 'AND b.bill_date >= ?';
    const topItems = (0, db_1.queryAll)(`
    SELECT bi.item_name, SUM(bi.quantity) as total_qty, SUM(bi.line_total) as total_revenue
    FROM bill_items bi
    JOIN bills b ON b.id = bi.bill_id
    WHERE 1=1 ${dateCondition}
    GROUP BY bi.item_id
    ORDER BY total_qty DESC
    LIMIT 5
  `, params);
    const bottomItems = (0, db_1.queryAll)(`
    SELECT bi.item_name, SUM(bi.quantity) as total_qty, SUM(bi.line_total) as total_revenue
    FROM bill_items bi
    JOIN bills b ON b.id = bi.bill_id
    WHERE 1=1 ${dateCondition}
    GROUP BY bi.item_id
    ORDER BY total_qty ASC
    LIMIT 5
  `, params);
    // Profit margins by item
    const margins = (0, db_1.queryAll)(`
    SELECT item_name, selling_price, purchase_cost,
      CASE WHEN selling_price > 0 THEN ROUND(((selling_price - purchase_cost) / selling_price) * 100, 1) ELSE 0 END as margin_percent
    FROM items
    ORDER BY margin_percent DESC
    LIMIT 10
  `);
    res.json({ topItems, bottomItems, margins });
});
// GET /api/dashboard/sales-trend - Daily sales for last 30 days
router.get('/sales-trend', (_req, res) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const fromDate = thirtyDaysAgo.toISOString().split('T')[0];
    const trend = (0, db_1.queryAll)(`
    SELECT bill_date as date, COUNT(*) as count, COALESCE(SUM(total), 0) as revenue
    FROM bills
    WHERE bill_date >= ?
    GROUP BY bill_date
    ORDER BY bill_date
  `, [fromDate]);
    res.json(trend);
});
// GET /api/dashboard/low-stock - Items below threshold
router.get('/low-stock', (_req, res) => {
    const items = (0, db_1.queryAll)(`
    SELECT id, item_name, current_stock, low_stock_threshold, package_quantity_grams, packaging_style
    FROM items
    WHERE current_stock <= low_stock_threshold
    ORDER BY current_stock ASC
  `);
    res.json(items);
});
exports.default = router;
//# sourceMappingURL=dashboard.js.map