import { Router, Request, Response } from 'express';
import { queryAll, queryOne, runQuery } from '../db';
import { requireRole } from '../middleware/auth';

const router = Router();

// GET /api/expenses - List expenses with filters
router.get('/', (req: Request, res: Response) => {
  const { from_date, to_date, category } = req.query;

  let query = 'SELECT * FROM expenses';
  const conditions: string[] = [];
  const params: any[] = [];

  if (from_date && typeof from_date === 'string') {
    conditions.push('expense_date >= ?');
    params.push(from_date);
  }
  if (to_date && typeof to_date === 'string') {
    conditions.push('expense_date <= ?');
    params.push(to_date);
  }
  if (category && typeof category === 'string') {
    conditions.push('category = ?');
    params.push(category);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' ORDER BY expense_date DESC, created_at DESC';

  const expenses = queryAll(query, params);
  const totalAmount = expenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

  res.json({ expenses, total: expenses.length, totalAmount });
});

// GET /api/expenses/categories - Get unique expense categories
router.get('/categories', (_req: Request, res: Response) => {
  const categories = queryAll('SELECT DISTINCT category FROM expenses ORDER BY category');
  const defaults = ['rent', 'transport', 'utilities', 'salary', 'packaging', 'general'];
  const existing = categories.map((c: any) => c.category);
  const all = [...new Set([...defaults, ...existing])].sort();
  res.json(all);
});

// POST /api/expenses - Create expense
router.post('/', (req: Request, res: Response) => {
  const { category, amount, description, expense_date } = req.body;
  const user = (req as any).user;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Amount must be greater than 0' });
  }

  const result = runQuery(
    `INSERT INTO expenses (category, amount, description, expense_date, created_by)
     VALUES (?, ?, ?, ?, ?)`,
    [category || 'general', amount, description || '', expense_date || new Date().toISOString().split('T')[0], user.username]
  );

  const expense = queryOne('SELECT * FROM expenses WHERE id = ?', [result.lastInsertRowid]);
  res.status(201).json(expense);
});

// PUT /api/expenses/:id - Update expense
router.put('/:id', (req: Request, res: Response) => {
  const existing = queryOne('SELECT * FROM expenses WHERE id = ?', [req.params.id]);
  if (!existing) {
    return res.status(404).json({ error: 'Expense not found' });
  }

  const { category, amount, description, expense_date } = req.body;
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Amount must be greater than 0' });
  }

  runQuery(
    `UPDATE expenses SET category = ?, amount = ?, description = ?, expense_date = ? WHERE id = ?`,
    [category || 'general', amount, description || '', expense_date || existing.expense_date, req.params.id]
  );

  const updated = queryOne('SELECT * FROM expenses WHERE id = ?', [req.params.id]);
  res.json(updated);
});

// DELETE /api/expenses/:id - Delete expense (owner only)
router.delete('/:id', requireRole('owner'), (req: Request, res: Response) => {
  const existing = queryOne('SELECT * FROM expenses WHERE id = ?', [req.params.id]);
  if (!existing) {
    return res.status(404).json({ error: 'Expense not found' });
  }

  runQuery('DELETE FROM expenses WHERE id = ?', [req.params.id]);
  res.json({ message: 'Expense deleted successfully' });
});

export default router;
