import { Router, Request, Response } from 'express';
import { queryAll, queryOne, runQuery } from '../db';
import { requireRole } from '../middleware/auth';

const router = Router();

// GET /api/categories - List all categories
router.get('/', (_req: Request, res: Response) => {
  const categories = queryAll(`
    SELECT c.*, COUNT(i.id) as item_count
    FROM categories c
    LEFT JOIN items i ON i.category_id = c.id
    GROUP BY c.id
    ORDER BY c.name
  `);
  res.json(categories);
});

// GET /api/categories/:id - Get single category with items
router.get('/:id', (req: Request, res: Response) => {
  const category = queryOne('SELECT * FROM categories WHERE id = ?', [req.params.id]);
  if (!category) {
    return res.status(404).json({ error: 'Category not found' });
  }
  const items = queryAll('SELECT * FROM items WHERE category_id = ?', [category.id]);
  res.json({ ...category, items });
});

// POST /api/categories - Create category (owner only)
router.post('/', requireRole('owner'), (req: Request, res: Response) => {
  const { name, description } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Category name is required' });
  }

  const existing = queryOne('SELECT id FROM categories WHERE LOWER(name) = LOWER(?)', [name.trim()]);
  if (existing) {
    return res.status(409).json({ error: 'Category already exists' });
  }

  const result = runQuery(
    'INSERT INTO categories (name, description) VALUES (?, ?)',
    [name.trim(), description || '']
  );

  const category = queryOne('SELECT * FROM categories WHERE id = ?', [result.lastInsertRowid]);
  res.status(201).json(category);
});

// PUT /api/categories/:id - Update category (owner only)
router.put('/:id', requireRole('owner'), (req: Request, res: Response) => {
  const existing = queryOne('SELECT * FROM categories WHERE id = ?', [req.params.id]);
  if (!existing) {
    return res.status(404).json({ error: 'Category not found' });
  }

  const { name, description } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Category name is required' });
  }

  runQuery(
    'UPDATE categories SET name = ?, description = ? WHERE id = ?',
    [name.trim(), description || '', req.params.id]
  );

  const updated = queryOne('SELECT * FROM categories WHERE id = ?', [req.params.id]);
  res.json(updated);
});

// DELETE /api/categories/:id - Delete category (owner only)
router.delete('/:id', requireRole('owner'), (req: Request, res: Response) => {
  const existing = queryOne('SELECT * FROM categories WHERE id = ?', [req.params.id]);
  if (!existing) {
    return res.status(404).json({ error: 'Category not found' });
  }

  // Unlink items from this category before deleting
  runQuery('UPDATE items SET category_id = NULL WHERE category_id = ?', [req.params.id]);
  runQuery('DELETE FROM categories WHERE id = ?', [req.params.id]);
  res.json({ message: 'Category deleted successfully' });
});

export default router;
