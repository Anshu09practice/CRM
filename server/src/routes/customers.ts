import { Router, Request, Response } from 'express';
import { queryAll, queryOne, runQuery } from '../db';

const router = Router();

// GET /api/customers - List customers with optional search
router.get('/', (req: Request, res: Response) => {
  const { search } = req.query;

  let query = 'SELECT * FROM customers';
  const params: any[] = [];

  if (search && typeof search === 'string') {
    query += ' WHERE name LIKE ? OR phone LIKE ?';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY name';
  const customers = queryAll(query, params);
  res.json(customers);
});

// GET /api/customers/:id - Get customer with purchase history
router.get('/:id', (req: Request, res: Response) => {
  const customer = queryOne('SELECT * FROM customers WHERE id = ?', [req.params.id]);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  // Get purchase history (bills linked to this customer)
  const bills = queryAll(
    `SELECT id, bill_number, total, amount_paid, payment_status, bill_date
     FROM bills WHERE customer_id = ? ORDER BY bill_date DESC`,
    [customer.id]
  );

  const totalSpent = bills.reduce((sum: number, b: any) => sum + (b.total || 0), 0);
  const totalPaid = bills.reduce((sum: number, b: any) => sum + (b.amount_paid || 0), 0);

  res.json({ ...customer, bills, totalSpent, totalPaid });
});

// POST /api/customers - Create customer
router.post('/', (req: Request, res: Response) => {
  const { name, phone, address, notes } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Customer name is required' });
  }

  const result = runQuery(
    'INSERT INTO customers (name, phone, address, notes) VALUES (?, ?, ?, ?)',
    [name.trim(), phone || '', address || '', notes || '']
  );

  const customer = queryOne('SELECT * FROM customers WHERE id = ?', [result.lastInsertRowid]);
  res.status(201).json(customer);
});

// PUT /api/customers/:id - Update customer
router.put('/:id', (req: Request, res: Response) => {
  const existing = queryOne('SELECT * FROM customers WHERE id = ?', [req.params.id]);
  if (!existing) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  const { name, phone, address, notes } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Customer name is required' });
  }

  runQuery(
    `UPDATE customers SET name = ?, phone = ?, address = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [name.trim(), phone || '', address || '', notes || '', req.params.id]
  );

  const updated = queryOne('SELECT * FROM customers WHERE id = ?', [req.params.id]);
  res.json(updated);
});

// DELETE /api/customers/:id - Delete customer
router.delete('/:id', (req: Request, res: Response) => {
  const existing = queryOne('SELECT * FROM customers WHERE id = ?', [req.params.id]);
  if (!existing) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  // Unlink from bills but don't delete bills
  runQuery('UPDATE bills SET customer_id = NULL WHERE customer_id = ?', [req.params.id]);
  runQuery('DELETE FROM customers WHERE id = ?', [req.params.id]);
  res.json({ message: 'Customer deleted successfully' });
});

export default router;
