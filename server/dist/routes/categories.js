"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /api/categories - List all categories
router.get('/', (_req, res) => {
    const categories = (0, db_1.queryAll)(`
    SELECT c.*, COUNT(i.id) as item_count
    FROM categories c
    LEFT JOIN items i ON i.category_id = c.id
    GROUP BY c.id
    ORDER BY c.name
  `);
    res.json(categories);
});
// GET /api/categories/:id - Get single category with items
router.get('/:id', (req, res) => {
    const category = (0, db_1.queryOne)('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    if (!category) {
        return res.status(404).json({ error: 'Category not found' });
    }
    const items = (0, db_1.queryAll)('SELECT * FROM items WHERE category_id = ?', [category.id]);
    res.json({ ...category, items });
});
// POST /api/categories - Create category (owner only)
router.post('/', (0, auth_1.requireRole)('owner'), (req, res) => {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Category name is required' });
    }
    const existing = (0, db_1.queryOne)('SELECT id FROM categories WHERE LOWER(name) = LOWER(?)', [name.trim()]);
    if (existing) {
        return res.status(409).json({ error: 'Category already exists' });
    }
    const result = (0, db_1.runQuery)('INSERT INTO categories (name, description) VALUES (?, ?)', [name.trim(), description || '']);
    const category = (0, db_1.queryOne)('SELECT * FROM categories WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(category);
});
// PUT /api/categories/:id - Update category (owner only)
router.put('/:id', (0, auth_1.requireRole)('owner'), (req, res) => {
    const existing = (0, db_1.queryOne)('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    if (!existing) {
        return res.status(404).json({ error: 'Category not found' });
    }
    const { name, description } = req.body;
    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Category name is required' });
    }
    (0, db_1.runQuery)('UPDATE categories SET name = ?, description = ? WHERE id = ?', [name.trim(), description || '', req.params.id]);
    const updated = (0, db_1.queryOne)('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    res.json(updated);
});
// DELETE /api/categories/:id - Delete category (owner only)
router.delete('/:id', (0, auth_1.requireRole)('owner'), (req, res) => {
    const existing = (0, db_1.queryOne)('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    if (!existing) {
        return res.status(404).json({ error: 'Category not found' });
    }
    // Unlink items from this category before deleting
    (0, db_1.runQuery)('UPDATE items SET category_id = NULL WHERE category_id = ?', [req.params.id]);
    (0, db_1.runQuery)('DELETE FROM categories WHERE id = ?', [req.params.id]);
    res.json({ message: 'Category deleted successfully' });
});
exports.default = router;
//# sourceMappingURL=categories.js.map