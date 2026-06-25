import { Router, Request, Response } from 'express';
import { queryAll, queryOne, runQuery } from '../db';
import { CreateItemInput, calculateSizing } from '../services/sizing';
import { requireRole } from '../middleware/auth';

const router = Router();

// GET /api/items - List all items with optional search
router.get('/', (req: Request, res: Response) => {
  const { search, packaging_style, category_id } = req.query;

  let query = 'SELECT * FROM items';
  const conditions: string[] = [];
  const params: any[] = [];

  if (search && typeof search === 'string') {
    conditions.push('item_name LIKE ?');
    params.push(`%${search}%`);
  }

  if (packaging_style && typeof packaging_style === 'string') {
    conditions.push('packaging_style = ?');
    params.push(packaging_style);
  }

  if (category_id && typeof category_id === 'string') {
    conditions.push('category_id = ?');
    params.push(category_id);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY updated_at DESC';

  const items = queryAll(query, params);
  res.json({ items, total: items.length });
});

// GET /api/items/export/json - Export all items as JSON (must be before /:id)
router.get('/export/json', (_req: Request, res: Response) => {
  const items = queryAll('SELECT * FROM items ORDER BY item_name');
  res.json({ items, exported_at: new Date().toISOString(), total: items.length });
});

// GET /api/items/low-stock - Get items below stock threshold
router.get('/low-stock', (_req: Request, res: Response) => {
  const items = queryAll(`
    SELECT * FROM items WHERE current_stock <= low_stock_threshold ORDER BY current_stock ASC
  `);
  res.json({ items, total: items.length });
});

// GET /api/items/template/csv - Download a CSV template for bulk import/update
router.get('/template/csv', (_req: Request, res: Response) => {
  const header = 'id,sku_id,item_name,package_quantity_grams,purchase_cost,selling_price,mrp,packaging_style,category';
  const example1 = ',SKU-0001,Jeera Powder,50,8,10,12,packet,Spices';
  const example2 = ',SKU-0002,Haldi Powder,100,15,20,25,packet,Spices';
  const example3 = ',SKU-0003,Chilli Premium,100,30,45,50,standing_package,Premium';
  const csv = [header, example1, example2, example3].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="jalan_jyothi_items_template.csv"');
  res.send(csv);
});

// GET /api/items/export/csv - Export all items as CSV
router.get('/export/csv', (_req: Request, res: Response) => {
  const items = queryAll(`SELECT i.id, i.sku_id, i.item_name, i.package_quantity_grams, i.purchase_cost, i.selling_price, i.mrp, i.packaging_style, c.name as category_name
    FROM items i LEFT JOIN categories c ON i.category_id = c.id ORDER BY i.item_name`);
  const header = 'id,sku_id,item_name,package_quantity_grams,purchase_cost,selling_price,mrp,packaging_style,category';
  const rows = items.map((item: any) =>
    `${item.id},${item.sku_id || ''},"${(item.item_name || '').replace(/"/g, '""')}",${item.package_quantity_grams},${item.purchase_cost},${item.selling_price},${item.mrp},${item.packaging_style},"${(item.category_name || '').replace(/"/g, '""')}"`
  );
  const csv = [header, ...rows].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="jalan_jyothi_items_export.csv"');
  res.send(csv);
});

// POST /api/items/bulk-update - Bulk update items from CSV data
// If id is provided and matches an existing item, it updates it.
// If id is empty but item_name matches an existing item, it updates it.
// If neither matches, it inserts a new item.
router.post('/bulk-update', (req: Request, res: Response) => {
  const { items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Items array is required and must not be empty' });
  }

  let updated = 0;
  let created = 0;
  const errors: string[] = [];

  for (const item of items) {
    try {
      if (!item.item_name || !String(item.item_name).trim()) {
        errors.push('Skipped row with empty item name');
        continue;
      }

      const name = String(item.item_name).trim();
      const packaging = (item.packaging_style || 'packet').toLowerCase().includes('stand') ? 'standing_package' : 'packet';
      const qty = parseInt(item.package_quantity_grams) || 0;
      const purchase = parseFloat(item.purchase_cost) || 0;
      const selling = parseFloat(item.selling_price) || 0;
      const mrp = parseFloat(item.mrp) || 0;
      const skuId = item.sku_id ? String(item.sku_id).trim() : null;
      const { packets_per_bundle, bundle_weight_grams } = calculateSizing(packaging, qty);

      // Resolve category by name if provided
      let categoryId: number | null = null;
      if (item.category && String(item.category).trim()) {
        const catName = String(item.category).trim();
        const existingCat = queryOne('SELECT id FROM categories WHERE LOWER(name) = LOWER(?)', [catName]);
        if (existingCat) {
          categoryId = existingCat.id;
        } else {
          // Auto-create category
          const catResult = runQuery('INSERT INTO categories (name, description) VALUES (?, ?)', [catName, '']);
          categoryId = catResult.lastInsertRowid as number;
        }
      } else if (item.category_id) {
        categoryId = parseInt(item.category_id) || null;
      }

      // Try to find existing item by id or name
      let existing: any = null;
      if (item.id && String(item.id).trim()) {
        existing = queryOne('SELECT * FROM items WHERE id = ?', [parseInt(item.id)]);
      }
      if (!existing) {
        existing = queryOne('SELECT * FROM items WHERE LOWER(item_name) = LOWER(?)', [name]);
      }

      if (existing) {
        // Update existing item
        runQuery(
          `UPDATE items SET
            item_name = ?, package_quantity_grams = ?, purchase_cost = ?,
            selling_price = ?, mrp = ?, packaging_style = ?,
            packets_per_bundle = ?, bundle_weight_grams = ?, sku_id = ?,
            category_id = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
          [name, qty, purchase, selling, mrp, packaging, packets_per_bundle, bundle_weight_grams, skuId || existing.sku_id, categoryId ?? existing.category_id, existing.id]
        );
        updated++;
      } else {
        // Insert new item
        runQuery(
          `INSERT INTO items (item_name, package_quantity_grams, purchase_cost, selling_price, mrp, packaging_style, packets_per_bundle, bundle_weight_grams, sku_id, category_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [name, qty, purchase, selling, mrp, packaging, packets_per_bundle, bundle_weight_grams, skuId, categoryId]
        );
        created++;
      }
    } catch (err: any) {
      errors.push(`Failed to process "${item.item_name}": ${err.message}`);
    }
  }

  res.json({
    message: `Processed ${updated + created} items: ${updated} updated, ${created} created`,
    updated,
    created,
    errors
  });
});

// GET /api/items/:id - Get single item
router.get('/:id', (req: Request, res: Response) => {
  const item = queryOne('SELECT * FROM items WHERE id = ?', [req.params.id]);
  if (!item) {
    return res.status(404).json({ error: 'Item not found' });
  }
  res.json(item);
});

// POST /api/items/import - Bulk import items (must be before generic POST)
router.post('/import', (req: Request, res: Response) => {
  const { items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Items array is required and must not be empty' });
  }

  let imported = 0;
  const errors: string[] = [];

  for (const item of items as CreateItemInput[]) {
    try {
      if (!item.item_name || !item.item_name.trim()) {
        errors.push('Skipped item with empty name');
        continue;
      }

      const packaging = item.packaging_style || 'packet';
      const qty = item.package_quantity_grams || 0;
      const { packets_per_bundle, bundle_weight_grams } = calculateSizing(packaging, qty);
      const skuId = item.sku_id ? String(item.sku_id).trim() : null;

      runQuery(
        `INSERT INTO items (item_name, package_quantity_grams, purchase_cost, selling_price, mrp, packaging_style, packets_per_bundle, bundle_weight_grams, sku_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.item_name.trim(),
          qty,
          item.purchase_cost || 0,
          item.selling_price || 0,
          item.mrp || 0,
          packaging,
          packets_per_bundle,
          bundle_weight_grams,
          skuId
        ]
      );
      imported++;
    } catch (err: any) {
      errors.push(`Failed to import "${item.item_name}": ${err.message}`);
    }
  }

  res.json({ message: `Imported ${imported} items`, imported, errors });
});

// POST /api/items - Create item
router.post('/', (req: Request, res: Response) => {
  const { item_name, package_quantity_grams, purchase_cost, selling_price, mrp, packaging_style, category_id, sku_id } = req.body;

  // Validation
  if (!item_name || !item_name.trim()) {
    return res.status(400).json({ error: 'Item name is required' });
  }
  if (!package_quantity_grams || package_quantity_grams <= 0) {
    return res.status(400).json({ error: 'Package quantity must be greater than 0' });
  }
  if (!['packet', 'standing_package'].includes(packaging_style)) {
    return res.status(400).json({ error: 'Packaging style must be "packet" or "standing_package"' });
  }
  if (purchase_cost < 0 || selling_price < 0 || mrp < 0) {
    return res.status(400).json({ error: 'Prices cannot be negative' });
  }

  // Auto-calculate sizing
  const { packets_per_bundle, bundle_weight_grams } = calculateSizing(packaging_style, package_quantity_grams);

  // Auto-generate SKU if not provided
  let finalSkuId = sku_id ? String(sku_id).trim() : null;
  if (!finalSkuId) {
    const maxSku = queryOne("SELECT sku_id FROM items WHERE sku_id LIKE 'SKU-%' ORDER BY sku_id DESC LIMIT 1");
    const match = maxSku?.sku_id?.match(/SKU-(\d+)/);
    const nextNum = match ? parseInt(match[1]) + 1 : 1;
    finalSkuId = `SKU-${String(nextNum).padStart(4, '0')}`;
  }

  const result = runQuery(
    `INSERT INTO items (item_name, package_quantity_grams, purchase_cost, selling_price, mrp, packaging_style, packets_per_bundle, bundle_weight_grams, category_id, sku_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      item_name.trim(),
      package_quantity_grams,
      purchase_cost || 0,
      selling_price || 0,
      mrp || 0,
      packaging_style,
      packets_per_bundle,
      bundle_weight_grams,
      category_id || null,
      finalSkuId
    ]
  );

  const newItem = queryOne('SELECT * FROM items WHERE id = ?', [result.lastInsertRowid]);
  res.status(201).json(newItem);
});

// PUT /api/items/:id - Update item
router.put('/:id', (req: Request, res: Response) => {
  const existing = queryOne('SELECT * FROM items WHERE id = ?', [req.params.id]);
  if (!existing) {
    return res.status(404).json({ error: 'Item not found' });
  }

  const { item_name, package_quantity_grams, purchase_cost, selling_price, mrp, packaging_style, category_id, sku_id } = req.body;

  // Validation
  if (!item_name || !item_name.trim()) {
    return res.status(400).json({ error: 'Item name is required' });
  }
  if (!package_quantity_grams || package_quantity_grams <= 0) {
    return res.status(400).json({ error: 'Package quantity must be greater than 0' });
  }
  if (!['packet', 'standing_package'].includes(packaging_style)) {
    return res.status(400).json({ error: 'Packaging style must be "packet" or "standing_package"' });
  }
  if (purchase_cost < 0 || selling_price < 0 || mrp < 0) {
    return res.status(400).json({ error: 'Prices cannot be negative' });
  }

  // Auto-calculate sizing
  const { packets_per_bundle, bundle_weight_grams } = calculateSizing(packaging_style, package_quantity_grams);

  runQuery(
    `UPDATE items SET
      item_name = ?, package_quantity_grams = ?, purchase_cost = ?,
      selling_price = ?, mrp = ?, packaging_style = ?,
      packets_per_bundle = ?, bundle_weight_grams = ?, category_id = ?, sku_id = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`,
    [
      item_name.trim(),
      package_quantity_grams,
      purchase_cost || 0,
      selling_price || 0,
      mrp || 0,
      packaging_style,
      packets_per_bundle,
      bundle_weight_grams,
      category_id || null,
      sku_id ? String(sku_id).trim() : null,
      req.params.id
    ]
  );

  const updated = queryOne('SELECT * FROM items WHERE id = ?', [req.params.id]);
  res.json(updated);
});

// DELETE /api/items/:id - Delete item (owner only)
router.delete('/:id', requireRole('owner'), (req: Request, res: Response) => {
  const existing = queryOne('SELECT * FROM items WHERE id = ?', [req.params.id]);
  if (!existing) {
    return res.status(404).json({ error: 'Item not found' });
  }

  runQuery('DELETE FROM items WHERE id = ?', [req.params.id]);
  res.json({ message: 'Item deleted successfully' });
});

export default router;
