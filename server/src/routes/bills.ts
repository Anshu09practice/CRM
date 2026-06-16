import { Router, Request, Response } from 'express';
import { queryAll, queryOne, runQuery, getDb } from '../db';

const router = Router();

// Generate next bill number (JJ-YYYYMMDD-NNN)
function generateBillNumber(): string {
  const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const prefix = `JJ-${today}-`;
  const existing = queryAll(
    `SELECT bill_number FROM bills WHERE bill_number LIKE ? ORDER BY bill_number DESC LIMIT 1`,
    [`${prefix}%`]
  );
  let seq = 1;
  if (existing.length > 0) {
    const last = existing[0].bill_number as string;
    const lastSeq = parseInt(last.split('-').pop() || '0', 10);
    seq = lastSeq + 1;
  }
  return `${prefix}${String(seq).padStart(3, '0')}`;
}

// GET /api/bills - List bills with filters
router.get('/', (req: Request, res: Response) => {
  const { from_date, to_date, search } = req.query;

  let query = 'SELECT * FROM bills';
  const conditions: string[] = [];
  const params: any[] = [];

  if (from_date && typeof from_date === 'string') {
    conditions.push('bill_date >= ?');
    params.push(from_date);
  }
  if (to_date && typeof to_date === 'string') {
    conditions.push('bill_date <= ?');
    params.push(to_date);
  }
  if (search && typeof search === 'string') {
    conditions.push('(customer_name LIKE ? OR customer_phone LIKE ? OR bill_number LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' ORDER BY created_at DESC';

  const bills = queryAll(query, params);
  const totalRevenue = bills.reduce((sum: number, b: any) => sum + (b.total || 0), 0);

  res.json({ bills, total: bills.length, totalRevenue });
});

// GET /api/bills/stock/available - Get available stock from purchases
router.get('/stock/available', (_req: Request, res: Response) => {
  // Calculate stock: purchased qty minus billed qty
  const stock = queryAll(`
    SELECT * FROM (
      SELECT
        i.id as item_id,
        i.item_name,
        i.package_quantity_grams,
        i.selling_price,
        i.mrp,
        i.packaging_style,
        COALESCE(p.purchased_qty, 0) as purchased_qty,
        COALESCE(b.billed_qty, 0) as billed_qty,
        COALESCE(p.purchased_qty, 0) - COALESCE(b.billed_qty, 0) as available_qty
      FROM items i
      LEFT JOIN (
        SELECT item_id, SUM(quantity) as purchased_qty FROM purchases GROUP BY item_id
      ) p ON p.item_id = i.id
      LEFT JOIN (
        SELECT item_id, SUM(quantity) as billed_qty FROM bill_items GROUP BY item_id
      ) b ON b.item_id = i.id
    ) WHERE available_qty > 0
    ORDER BY item_name
  `, []);
  res.json({ stock });
});

// GET /api/bills/:id - Get bill with items
router.get('/:id', (req: Request, res: Response) => {
  const bill = queryOne('SELECT * FROM bills WHERE id = ?', [req.params.id]);
  if (!bill) {
    return res.status(404).json({ error: 'Bill not found' });
  }
  const items = queryAll('SELECT * FROM bill_items WHERE bill_id = ?', [bill.id]);
  res.json({ ...bill, items });
});

// GET /api/bills/:id/print - Get printable bill data
router.get('/:id/print', (req: Request, res: Response) => {
  const bill = queryOne('SELECT * FROM bills WHERE id = ?', [req.params.id]);
  if (!bill) {
    return res.status(404).json({ error: 'Bill not found' });
  }
  const items = queryAll('SELECT * FROM bill_items WHERE bill_id = ?', [bill.id]);
  res.json({ ...bill, items });
});

// POST /api/bills - Create a new bill
router.post('/', (req: Request, res: Response) => {
  const { customer_name, customer_phone, customer_address, items, discount_percent, notes, bill_date } = req.body;

  if (!customer_name || !customer_name.trim()) {
    return res.status(400).json({ error: 'Customer name is required' });
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'At least one item is required' });
  }

  // Validate items and calculate subtotal
  let subtotal = 0;
  const validatedItems: Array<{
    item_id: number; item_name: string; quantity: number;
    package_quantity_grams: number; selling_price: number; line_total: number;
  }> = [];

  for (const lineItem of items) {
    if (!lineItem.item_id || !lineItem.quantity || lineItem.quantity <= 0) {
      return res.status(400).json({ error: 'Each item needs valid item_id and quantity > 0' });
    }

    const item = queryOne('SELECT * FROM items WHERE id = ?', [lineItem.item_id]);
    if (!item) {
      return res.status(404).json({ error: `Item with id ${lineItem.item_id} not found` });
    }

    const price = lineItem.selling_price !== undefined ? parseFloat(lineItem.selling_price) : item.selling_price;
    const lineTotal = price * lineItem.quantity;
    subtotal += lineTotal;

    validatedItems.push({
      item_id: item.id,
      item_name: item.item_name,
      quantity: lineItem.quantity,
      package_quantity_grams: item.package_quantity_grams,
      selling_price: price,
      line_total: lineTotal
    });
  }

  const discount = Math.min(Math.max(parseFloat(discount_percent) || 0, 0), 100);
  const discountAmount = (subtotal * discount) / 100;
  const total = subtotal - discountAmount;
  const billNumber = generateBillNumber();
  const date = bill_date || new Date().toISOString().split('T')[0];

  // Insert bill
  const result = runQuery(
    `INSERT INTO bills (bill_number, customer_name, customer_phone, customer_address, subtotal, discount_percent, discount_amount, total, bill_date, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [billNumber, customer_name.trim(), customer_phone || '', customer_address || '', subtotal, discount, discountAmount, total, date, notes || '']
  );

  const billId = result.lastInsertRowid;

  // Insert line items
  for (const vi of validatedItems) {
    runQuery(
      `INSERT INTO bill_items (bill_id, item_id, item_name, quantity, package_quantity_grams, selling_price, line_total)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [billId, vi.item_id, vi.item_name, vi.quantity, vi.package_quantity_grams, vi.selling_price, vi.line_total]
    );
  }

  const newBill = queryOne('SELECT * FROM bills WHERE id = ?', [billId]);
  const billItems = queryAll('SELECT * FROM bill_items WHERE bill_id = ?', [billId]);
  res.status(201).json({ ...newBill, items: billItems });
});

// PUT /api/bills/:id - Update bill
router.put('/:id', (req: Request, res: Response) => {
  const existing = queryOne('SELECT * FROM bills WHERE id = ?', [req.params.id]);
  if (!existing) {
    return res.status(404).json({ error: 'Bill not found' });
  }

  const { customer_name, customer_phone, customer_address, items, discount_percent, notes, bill_date } = req.body;

  if (!customer_name || !customer_name.trim()) {
    return res.status(400).json({ error: 'Customer name is required' });
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'At least one item is required' });
  }

  let subtotal = 0;
  const validatedItems: Array<{
    item_id: number; item_name: string; quantity: number;
    package_quantity_grams: number; selling_price: number; line_total: number;
  }> = [];

  for (const lineItem of items) {
    if (!lineItem.item_id || !lineItem.quantity || lineItem.quantity <= 0) {
      return res.status(400).json({ error: 'Each item needs valid item_id and quantity > 0' });
    }
    const item = queryOne('SELECT * FROM items WHERE id = ?', [lineItem.item_id]);
    if (!item) {
      return res.status(404).json({ error: `Item with id ${lineItem.item_id} not found` });
    }
    const price = lineItem.selling_price !== undefined ? parseFloat(lineItem.selling_price) : item.selling_price;
    const lineTotal = price * lineItem.quantity;
    subtotal += lineTotal;
    validatedItems.push({
      item_id: item.id, item_name: item.item_name, quantity: lineItem.quantity,
      package_quantity_grams: item.package_quantity_grams, selling_price: price, line_total: lineTotal
    });
  }

  const discount = Math.min(Math.max(parseFloat(discount_percent) || 0, 0), 100);
  const discountAmount = (subtotal * discount) / 100;
  const total = subtotal - discountAmount;
  const date = bill_date || existing.bill_date;

  runQuery(
    `UPDATE bills SET customer_name=?, customer_phone=?, customer_address=?, subtotal=?, discount_percent=?, discount_amount=?, total=?, bill_date=?, notes=? WHERE id=?`,
    [customer_name.trim(), customer_phone || '', customer_address || '', subtotal, discount, discountAmount, total, date, notes || '', req.params.id]
  );

  // Delete old items and insert new
  runQuery('DELETE FROM bill_items WHERE bill_id = ?', [req.params.id]);
  for (const vi of validatedItems) {
    runQuery(
      `INSERT INTO bill_items (bill_id, item_id, item_name, quantity, package_quantity_grams, selling_price, line_total)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.params.id, vi.item_id, vi.item_name, vi.quantity, vi.package_quantity_grams, vi.selling_price, vi.line_total]
    );
  }

  const updated = queryOne('SELECT * FROM bills WHERE id = ?', [req.params.id]);
  const billItems = queryAll('SELECT * FROM bill_items WHERE bill_id = ?', [req.params.id]);
  res.json({ ...updated, items: billItems });
});

// PATCH /api/bills/:id/whatsapp - Mark WhatsApp as sent
router.patch('/:id/whatsapp', (req: Request, res: Response) => {
  const existing = queryOne('SELECT * FROM bills WHERE id = ?', [req.params.id]);
  if (!existing) {
    return res.status(404).json({ error: 'Bill not found' });
  }
  runQuery('UPDATE bills SET whatsapp_sent = 1 WHERE id = ?', [req.params.id]);
  res.json({ message: 'WhatsApp status updated' });
});

// DELETE /api/bills/:id - Delete bill
router.delete('/:id', (req: Request, res: Response) => {
  const existing = queryOne('SELECT * FROM bills WHERE id = ?', [req.params.id]);
  if (!existing) {
    return res.status(404).json({ error: 'Bill not found' });
  }
  runQuery('DELETE FROM bill_items WHERE bill_id = ?', [req.params.id]);
  runQuery('DELETE FROM bills WHERE id = ?', [req.params.id]);
  res.json({ message: 'Bill deleted successfully' });
});

export default router;
