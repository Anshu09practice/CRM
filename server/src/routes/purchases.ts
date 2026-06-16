import { Router, Request, Response } from 'express';
import { queryAll, queryOne, runQuery } from '../db';

const router = Router();

// GET /api/purchases - List purchases with optional filters
router.get('/', (req: Request, res: Response) => {
  const { item_id, from_date, to_date, search } = req.query;

  let query = 'SELECT * FROM purchases';
  const conditions: string[] = [];
  const params: any[] = [];

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

  const purchases = queryAll(query, params);

  // Calculate summary
  const totalCost = purchases.reduce((sum: number, p: any) => sum + (p.total_cost || 0), 0);
  const totalQty = purchases.reduce((sum: number, p: any) => sum + (p.quantity || 0), 0);

  res.json({ purchases, total: purchases.length, totalCost, totalQty });
});

// GET /api/purchases/:id - Get single purchase
router.get('/:id', (req: Request, res: Response) => {
  const purchase = queryOne('SELECT * FROM purchases WHERE id = ?', [req.params.id]);
  if (!purchase) {
    return res.status(404).json({ error: 'Purchase not found' });
  }
  res.json(purchase);
});

// POST /api/purchases - Create a new purchase
router.post('/', (req: Request, res: Response) => {
  const { item_id, quantity, purchase_cost, purchase_date, notes } = req.body;

  // Validation
  if (!item_id) {
    return res.status(400).json({ error: 'Item is required' });
  }
  if (!quantity || quantity <= 0) {
    return res.status(400).json({ error: 'Quantity must be greater than 0' });
  }

  // Get item details
  const item = queryOne('SELECT * FROM items WHERE id = ?', [item_id]);
  if (!item) {
    return res.status(404).json({ error: 'Item not found in inventory' });
  }

  const cost = purchase_cost !== undefined ? parseFloat(purchase_cost) : item.purchase_cost;
  const total = cost * quantity;
  const date = purchase_date || new Date().toISOString().split('T')[0];

  const result = runQuery(
    `INSERT INTO purchases (item_id, item_name, quantity, package_quantity_grams, purchase_cost, total_cost, packaging_style, purchase_date, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      item_id,
      item.item_name,
      quantity,
      item.package_quantity_grams,
      cost,
      total,
      item.packaging_style,
      date,
      notes || ''
    ]
  );

  const newPurchase = queryOne('SELECT * FROM purchases WHERE id = ?', [result.lastInsertRowid]);
  res.status(201).json(newPurchase);
});

// PUT /api/purchases/:id - Update a purchase
router.put('/:id', (req: Request, res: Response) => {
  const existing = queryOne('SELECT * FROM purchases WHERE id = ?', [req.params.id]);
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

  const item = queryOne('SELECT * FROM items WHERE id = ?', [item_id]);
  if (!item) {
    return res.status(404).json({ error: 'Item not found in inventory' });
  }

  const cost = purchase_cost !== undefined ? parseFloat(purchase_cost) : item.purchase_cost;
  const total = cost * quantity;
  const date = purchase_date || existing.purchase_date;

  runQuery(
    `UPDATE purchases SET
      item_id = ?, item_name = ?, quantity = ?, package_quantity_grams = ?,
      purchase_cost = ?, total_cost = ?, packaging_style = ?,
      purchase_date = ?, notes = ?
    WHERE id = ?`,
    [
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
    ]
  );

  const updated = queryOne('SELECT * FROM purchases WHERE id = ?', [req.params.id]);
  res.json(updated);
});

// DELETE /api/purchases/:id - Delete a purchase
router.delete('/:id', (req: Request, res: Response) => {
  const existing = queryOne('SELECT * FROM purchases WHERE id = ?', [req.params.id]);
  if (!existing) {
    return res.status(404).json({ error: 'Purchase not found' });
  }

  runQuery('DELETE FROM purchases WHERE id = ?', [req.params.id]);
  res.json({ message: 'Purchase deleted successfully' });
});

export default router;
