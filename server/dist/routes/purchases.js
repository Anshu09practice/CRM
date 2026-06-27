"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const router = (0, express_1.Router)();
// GET /api/purchases/template/csv - Download a CSV template for bulk purchase import
router.get('/template/csv', (_req, res) => {
    const header = 'item_name,quantity,purchase_cost,purchase_date,notes';
    const example1 = 'Jeera Powder,100,8,2026-06-25,Supplier ABC';
    const example2 = 'Haldi Powder,50,15,2026-06-25,Invoice #1234';
    const example3 = 'Chilli Premium,200,30,2026-06-25,';
    const csv = [header, example1, example2, example3].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="jalan_jyothi_purchases_template.csv"');
    res.send(csv);
});
// GET /api/purchases/export/csv - Export existing purchases as CSV
router.get('/export/csv', (_req, res) => {
    const purchases = (0, db_1.queryAll)('SELECT id, item_name, quantity, purchase_cost, purchase_date, notes FROM purchases ORDER BY purchase_date DESC, created_at DESC');
    const header = 'id,item_name,quantity,purchase_cost,purchase_date,notes';
    const rows = purchases.map((p) => `${p.id},"${(p.item_name || '').replace(/"/g, '""')}",${p.quantity},${p.purchase_cost},${p.purchase_date},"${(p.notes || '').replace(/"/g, '""')}"`);
    const csv = [header, ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="jalan_jyothi_purchases_export.csv"');
    res.send(csv);
});
// POST /api/purchases/bulk-import - Bulk import purchases from CSV data
router.post('/bulk-import', (req, res) => {
    const { purchases } = req.body;
    if (!Array.isArray(purchases) || purchases.length === 0) {
        return res.status(400).json({ error: 'Purchases array is required and must not be empty' });
    }
    let created = 0;
    const errors = [];
    const today = new Date().toISOString().split('T')[0];
    (0, db_1.runTransaction)(() => {
        for (let i = 0; i < purchases.length; i++) {
            const purchase = purchases[i];
            try {
                const itemName = String(purchase.item_name || '').trim();
                if (!itemName) {
                    errors.push(`Row ${i + 1}: Missing item_name`);
                    continue;
                }
                const quantity = parseInt(purchase.quantity);
                if (!quantity || quantity <= 0) {
                    errors.push(`Row ${i + 1} (${itemName}): Quantity must be greater than 0`);
                    continue;
                }
                // Look up item by name (case-insensitive)
                const item = (0, db_1.queryOne)('SELECT * FROM items WHERE LOWER(item_name) = LOWER(?)', [itemName]);
                if (!item) {
                    errors.push(`Row ${i + 1} (${itemName}): Item not found in inventory`);
                    continue;
                }
                const cost = purchase.purchase_cost ? parseFloat(purchase.purchase_cost) : item.purchase_cost;
                const total = cost * quantity;
                const date = purchase.purchase_date ? String(purchase.purchase_date).trim() : today;
                const notes = purchase.notes ? String(purchase.notes).trim() : '';
                (0, db_1.runQuery)(`INSERT INTO purchases (item_id, item_name, quantity, package_quantity_grams, purchase_cost, total_cost, packaging_style, purchase_date, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [item.id, item.item_name, quantity, item.package_quantity_grams, cost, total, item.packaging_style, date, notes]);
                // Auto-update stock
                (0, db_1.runQuery)('UPDATE items SET current_stock = current_stock + ? WHERE id = ?', [quantity, item.id]);
                created++;
            }
            catch (err) {
                errors.push(`Row ${i + 1} (${purchase.item_name}): ${err.message}`);
            }
        }
    });
    res.json({
        message: `Processed ${created} purchases successfully`,
        created,
        errors
    });
});
// GET /api/purchases - List purchases with optional filters
router.get('/', (req, res) => {
    const { item_id, from_date, to_date, search } = req.query;
    let query = 'SELECT * FROM purchases';
    const conditions = [];
    const params = [];
    if (item_id) {
        conditions.push('item_id = ?');
        params.push(item_id);
    }
    if (from_date && typeof from_date === 'string') {
        conditions.push('purchase_date >= ?');
        params.push(from_date);
    }
    if (to_date && typeof to_date === 'string') {
        conditions.push('purchase_date <= ?');
        params.push(to_date);
    }
    if (search && typeof search === 'string') {
        conditions.push('item_name LIKE ?');
        params.push(`%${search}%`);
    }
    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY purchase_date DESC, created_at DESC';
    const purchases = (0, db_1.queryAll)(query, params);
    // Calculate summary
    const totalCost = purchases.reduce((sum, p) => sum + (p.total_cost || 0), 0);
    const totalQty = purchases.reduce((sum, p) => sum + (p.quantity || 0), 0);
    res.json({ purchases, total: purchases.length, totalCost, totalQty });
});
// GET /api/purchases/:id - Get single purchase
router.get('/:id', (req, res) => {
    const purchase = (0, db_1.queryOne)('SELECT * FROM purchases WHERE id = ?', [req.params.id]);
    if (!purchase) {
        return res.status(404).json({ error: 'Purchase not found' });
    }
    res.json(purchase);
});
// POST /api/purchases - Create a new purchase
router.post('/', (req, res) => {
    const { item_id, quantity, purchase_cost, purchase_date, notes } = req.body;
    // Validation
    if (!item_id) {
        return res.status(400).json({ error: 'Item is required' });
    }
    if (!quantity || quantity <= 0) {
        return res.status(400).json({ error: 'Quantity must be greater than 0' });
    }
    // Get item details
    const item = (0, db_1.queryOne)('SELECT * FROM items WHERE id = ?', [item_id]);
    if (!item) {
        return res.status(404).json({ error: 'Item not found in inventory' });
    }
    const cost = purchase_cost !== undefined ? parseFloat(purchase_cost) : item.purchase_cost;
    const total = cost * quantity;
    const date = purchase_date || new Date().toISOString().split('T')[0];
    let newPurchase;
    (0, db_1.runTransaction)(() => {
        const result = (0, db_1.runQuery)(`INSERT INTO purchases (item_id, item_name, quantity, package_quantity_grams, purchase_cost, total_cost, packaging_style, purchase_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            item_id,
            item.item_name,
            quantity,
            item.package_quantity_grams,
            cost,
            total,
            item.packaging_style,
            date,
            notes || ''
        ]);
        // Auto-update stock
        (0, db_1.runQuery)('UPDATE items SET current_stock = current_stock + ? WHERE id = ?', [quantity, item_id]);
        newPurchase = (0, db_1.queryOne)('SELECT * FROM purchases WHERE id = ?', [result.lastInsertRowid]);
    });
    res.status(201).json(newPurchase);
});
// PUT /api/purchases/:id - Update a purchase
router.put('/:id', (req, res) => {
    const existing = (0, db_1.queryOne)('SELECT * FROM purchases WHERE id = ?', [req.params.id]);
    if (!existing) {
        return res.status(404).json({ error: 'Purchase not found' });
    }
    const { item_id, quantity, purchase_cost, purchase_date, notes } = req.body;
    if (!item_id) {
        return res.status(400).json({ error: 'Item is required' });
    }
    if (!quantity || quantity <= 0) {
        return res.status(400).json({ error: 'Quantity must be greater than 0' });
    }
    const item = (0, db_1.queryOne)('SELECT * FROM items WHERE id = ?', [item_id]);
    if (!item) {
        return res.status(404).json({ error: 'Item not found in inventory' });
    }
    const cost = purchase_cost !== undefined ? parseFloat(purchase_cost) : item.purchase_cost;
    const total = cost * quantity;
    const date = purchase_date || existing.purchase_date;
    let updated;
    (0, db_1.runTransaction)(() => {
        // Adjust stock: remove old quantity, add new quantity
        const oldQty = existing.quantity;
        const stockDiff = quantity - oldQty;
        if (existing.item_id !== item_id) {
            // Item changed - revert old item stock, add to new item
            (0, db_1.runQuery)('UPDATE items SET current_stock = current_stock - ? WHERE id = ?', [oldQty, existing.item_id]);
            (0, db_1.runQuery)('UPDATE items SET current_stock = current_stock + ? WHERE id = ?', [quantity, item_id]);
        }
        else if (stockDiff !== 0) {
            (0, db_1.runQuery)('UPDATE items SET current_stock = current_stock + ? WHERE id = ?', [stockDiff, item_id]);
        }
        (0, db_1.runQuery)(`UPDATE purchases SET
        item_id = ?, item_name = ?, quantity = ?, package_quantity_grams = ?,
        purchase_cost = ?, total_cost = ?, packaging_style = ?,
        purchase_date = ?, notes = ?
      WHERE id = ?`, [
            item_id,
            item.item_name,
            quantity,
            item.package_quantity_grams,
            cost,
            total,
            item.packaging_style,
            date,
            notes || '',
            req.params.id
        ]);
        updated = (0, db_1.queryOne)('SELECT * FROM purchases WHERE id = ?', [req.params.id]);
    });
    res.json(updated);
});
// DELETE /api/purchases/:id - Delete a purchase
router.delete('/:id', (req, res) => {
    const existing = (0, db_1.queryOne)('SELECT * FROM purchases WHERE id = ?', [req.params.id]);
    if (!existing) {
        return res.status(404).json({ error: 'Purchase not found' });
    }
    (0, db_1.runTransaction)(() => {
        (0, db_1.runQuery)('DELETE FROM purchases WHERE id = ?', [req.params.id]);
        // Revert stock
        (0, db_1.runQuery)('UPDATE items SET current_stock = current_stock - ? WHERE id = ?', [existing.quantity, existing.item_id]);
    });
    res.json({ message: 'Purchase deleted successfully' });
});
exports.default = router;
//# sourceMappingURL=purchases.js.map