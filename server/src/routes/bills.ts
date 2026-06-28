import { Router, Request, Response } from 'express';
import { queryAll, queryOne, runQuery, runTransaction } from '../db';
import { notifyBillCreated, notifyStockUpdate, notifyPaymentReceived } from '../services/realtime';
import { auditLog } from '../middleware/auth';
import { encryptPII, decryptPII } from '../services/crypto';
import crypto from 'crypto';

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
  const { from_date, to_date, search, payment_status } = req.query;

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
  if (payment_status && typeof payment_status === 'string') {
    conditions.push('payment_status = ?');
    params.push(payment_status);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' ORDER BY created_at DESC';

  const bills = queryAll(query, params);
  const totalRevenue = bills.reduce((sum: number, b: any) => sum + (b.total || 0), 0);
  const totalPending = bills.reduce((sum: number, b: any) => sum + ((b.total || 0) - (b.amount_paid || 0)), 0);

  res.json({ bills, total: bills.length, totalRevenue, totalPending });
});

// GET /api/bills/stock/available - Get available stock
router.get('/stock/available', (_req: Request, res: Response) => {
  const stock = queryAll(`
    SELECT id as item_id, item_name, package_quantity_grams, selling_price, mrp,
           packaging_style, current_stock as available_qty
    FROM items
    WHERE current_stock > 0
    ORDER BY item_name
  `, []);
  res.json({ stock });
});

// GET /api/bills/:id - Get bill with items and payments
router.get('/:id', (req: Request, res: Response) => {
  const bill = queryOne('SELECT * FROM bills WHERE id = ?', [req.params.id]);
  if (!bill) {
    return res.status(404).json({ error: 'Bill not found' });
  }
  const items = queryAll('SELECT * FROM bill_items WHERE bill_id = ?', [bill.id]);
  const payments = queryAll('SELECT * FROM payments WHERE bill_id = ? ORDER BY payment_date DESC', [bill.id]);
  res.json({ ...bill, items, payments });
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

// POST /api/bills - Create a new bill with GST and stock validation
router.post('/', (req: Request, res: Response) => {
  const {
    customer_name, customer_phone, customer_address, customer_id,
    items, discount_percent, tax_percent, notes, bill_date,
    payment_method, amount_paid
  } = req.body;

  // Auto-link or create customer
  let resolvedCustomerId = customer_id || null;
  if (!resolvedCustomerId && customer_name && customer_name.trim()) {
    // Try to find existing customer by phone (scan-decrypt, handles both encrypted and legacy plaintext)
    if (customer_phone && customer_phone.trim()) {
      const allCustomers = queryAll('SELECT * FROM customers') as any[];
      const existingByPhone = allCustomers.find(
        c => decryptPII(c.phone || '') === customer_phone.trim()
      );
      if (existingByPhone) {
        resolvedCustomerId = existingByPhone.id;
        // Update name/address if changed (re-encrypt address)
        const decryptedAddress = decryptPII(existingByPhone.address || '');
        if (existingByPhone.name !== customer_name.trim() || (customer_address && decryptedAddress !== customer_address)) {
          runQuery(
            'UPDATE customers SET name = ?, address = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [customer_name.trim(), encryptPII(customer_address || decryptedAddress), existingByPhone.id]
          );
        }
      } else {
        // Create new customer with encrypted PII
        const newCust = runQuery(
          'INSERT INTO customers (name, phone, address, notes) VALUES (?, ?, ?, ?)',
          [customer_name.trim(), encryptPII(customer_phone.trim()), encryptPII(customer_address || ''), '']
        );
        resolvedCustomerId = newCust.lastInsertRowid;
      }
    } else {
      // No phone - try matching by name only
      const existingByName = queryOne('SELECT * FROM customers WHERE LOWER(name) = LOWER(?)', [customer_name.trim()]);
      if (existingByName) {
        resolvedCustomerId = existingByName.id;
      } else {
        // Create new customer with name only (prevents orphan bills)
        const newCust = runQuery(
          'INSERT INTO customers (name, phone, address, notes) VALUES (?, ?, ?, ?)',
          [customer_name.trim(), '', encryptPII(customer_address || ''), '']
        );
        resolvedCustomerId = newCust.lastInsertRowid;
      }
    }
  }

  if (!customer_name || !customer_name.trim()) {
    return res.status(400).json({ error: 'Customer name is required' });
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'At least one item is required' });
  }

  // Validate items and check stock
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

    // Stock validation
    if (item.current_stock < lineItem.quantity) {
      return res.status(400).json({
        error: `Insufficient stock for "${item.item_name}". Available: ${item.current_stock}, Requested: ${lineItem.quantity}`
      });
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

  // Calculate discount
  const discount = Math.min(Math.max(parseFloat(discount_percent) || 0, 0), 100);
  const discountAmount = (subtotal * discount) / 100;
  const afterDiscount = subtotal - discountAmount;

  // Calculate GST (split equally into CGST + SGST)
  const tax = parseFloat(tax_percent) || 0;
  const taxTotal = (afterDiscount * tax) / 100;
  const cgst = taxTotal / 2;
  const sgst = taxTotal / 2;

  const total = afterDiscount + taxTotal;
  const billNumber = generateBillNumber();
  const date = bill_date || new Date().toISOString().split('T')[0];

  // Determine payment status
  const paid = parseFloat(amount_paid) || 0;
  let paymentStatus = 'pending';
  if (paid >= total) paymentStatus = 'paid';
  else if (paid > 0) paymentStatus = 'partial';

  let newBill: any;
  let billItems: any[];

  // ISO 20022: Generate Unique End-to-End Transaction Reference (UETR)
  const transactionRef = crypto.randomUUID();

  runTransaction(() => {
    // Insert bill with ISO 20022 transaction reference
    const result = runQuery(
      `INSERT INTO bills (bill_number, customer_name, customer_phone, customer_address, customer_id,
        subtotal, discount_percent, discount_amount, tax_percent, cgst_amount, sgst_amount, tax_total,
        total, payment_status, amount_paid, bill_date, notes, transaction_ref, currency_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'INR')`,
      [billNumber, customer_name.trim(), customer_phone || '', customer_address || '', resolvedCustomerId || null,
        subtotal, discount, discountAmount, tax, cgst, sgst, taxTotal,
        total, paymentStatus, paid, date, notes || '', transactionRef]
    );

    const billId = result.lastInsertRowid;

    // Insert line items and deduct stock
    for (const vi of validatedItems) {
      runQuery(
        `INSERT INTO bill_items (bill_id, item_id, item_name, quantity, package_quantity_grams, selling_price, line_total)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [billId, vi.item_id, vi.item_name, vi.quantity, vi.package_quantity_grams, vi.selling_price, vi.line_total]
      );
      // Deduct stock
      runQuery('UPDATE items SET current_stock = current_stock - ? WHERE id = ?', [vi.quantity, vi.item_id]);
    }

    // Record payment if amount paid
    if (paid > 0) {
      runQuery(
        `INSERT INTO payments (bill_id, amount, payment_method, payment_date, notes)
         VALUES (?, ?, ?, ?, '')`,
        [billId, paid, payment_method || 'cash', date]
      );
    }

    // Update customer credit balance if credit payment
    if (resolvedCustomerId && payment_method === 'credit') {
      runQuery('UPDATE customers SET credit_balance = credit_balance + ? WHERE id = ?', [total - paid, resolvedCustomerId]);
    }

    newBill = queryOne('SELECT * FROM bills WHERE id = ?', [billId]);
    billItems = queryAll('SELECT * FROM bill_items WHERE bill_id = ?', [billId]);
  });

  // Emit real-time notifications
  const user = (req as any).user;
  if (newBill) {
    // PCI DSS 10.2: Audit log financial transaction
    auditLog('BILL_CREATED', {
      userId: user.userId,
      username: user.username,
      billNumber: newBill.bill_number,
      transactionRef,
      total: newBill.total,
      currency: 'INR',
      ip: req.ip
    });

    notifyBillCreated(newBill.id, newBill.bill_number, newBill.total, customer_name, user.userId, user.username);
    // Notify stock updates for each item
    for (const vi of validatedItems) {
      const updatedItem = queryOne('SELECT current_stock FROM items WHERE id = ?', [vi.item_id]);
      if (updatedItem) {
        notifyStockUpdate(vi.item_id, vi.item_name, updatedItem.current_stock, user.userId, user.username);
      }
    }
    if (paid > 0) {
      notifyPaymentReceived(newBill.id, newBill.bill_number, paid, user.userId, user.username);
    }
  }

  res.status(201).json({ ...newBill, items: billItems! });
});

// PUT /api/bills/:id - Update bill
router.put('/:id', (req: Request, res: Response) => {
  const existing = queryOne('SELECT * FROM bills WHERE id = ?', [req.params.id]);
  if (!existing) {
    return res.status(404).json({ error: 'Bill not found' });
  }

  const {
    customer_name, customer_phone, customer_address, customer_id,
    items, discount_percent, tax_percent, notes, bill_date
  } = req.body;

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

  // Get old bill items to restore stock
  const oldItems = queryAll('SELECT * FROM bill_items WHERE bill_id = ?', [req.params.id]);

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
  const afterDiscount = subtotal - discountAmount;

  const tax = parseFloat(tax_percent) || 0;
  const taxTotal = (afterDiscount * tax) / 100;
  const cgst = taxTotal / 2;
  const sgst = taxTotal / 2;
  const total = afterDiscount + taxTotal;
  const date = bill_date || existing.bill_date;

  let updated: any;
  let billItems: any[];

  runTransaction(() => {
    // Restore stock from old bill items
    for (const old of oldItems) {
      runQuery('UPDATE items SET current_stock = current_stock + ? WHERE id = ?', [old.quantity, old.item_id]);
    }

    // Delete old items
    runQuery('DELETE FROM bill_items WHERE bill_id = ?', [req.params.id]);

    // Insert new items and deduct stock
    for (const vi of validatedItems) {
      runQuery(
        `INSERT INTO bill_items (bill_id, item_id, item_name, quantity, package_quantity_grams, selling_price, line_total)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [req.params.id, vi.item_id, vi.item_name, vi.quantity, vi.package_quantity_grams, vi.selling_price, vi.line_total]
      );
      runQuery('UPDATE items SET current_stock = current_stock - ? WHERE id = ?', [vi.quantity, vi.item_id]);
    }

    // Update bill
    runQuery(
      `UPDATE bills SET customer_name=?, customer_phone=?, customer_address=?, customer_id=?,
        subtotal=?, discount_percent=?, discount_amount=?, tax_percent=?, cgst_amount=?, sgst_amount=?, tax_total=?,
        total=?, bill_date=?, notes=?
      WHERE id=?`,
      [customer_name.trim(), customer_phone || '', customer_address || '', customer_id || null,
        subtotal, discount, discountAmount, tax, cgst, sgst, taxTotal,
        total, date, notes || '', req.params.id]
    );

    updated = queryOne('SELECT * FROM bills WHERE id = ?', [req.params.id]);
    billItems = queryAll('SELECT * FROM bill_items WHERE bill_id = ?', [req.params.id]);
  });

  res.json({ ...updated, items: billItems! });
});

// POST /api/bills/:id/payment - Record a payment for a bill
router.post('/:id/payment', (req: Request, res: Response) => {
  const bill = queryOne('SELECT * FROM bills WHERE id = ?', [req.params.id]);
  if (!bill) {
    return res.status(404).json({ error: 'Bill not found' });
  }

  const { amount, payment_method, payment_date, notes } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Payment amount must be greater than 0' });
  }

  const remaining = bill.total - bill.amount_paid;
  if (amount > remaining) {
    return res.status(400).json({ error: `Payment exceeds remaining balance of ₹${remaining.toFixed(2)}` });
  }

  runTransaction(() => {
    runQuery(
      `INSERT INTO payments (bill_id, amount, payment_method, payment_date, notes)
       VALUES (?, ?, ?, ?, ?)`,
      [bill.id, amount, payment_method || 'cash', payment_date || new Date().toISOString().split('T')[0], notes || '']
    );

    const newPaid = bill.amount_paid + amount;
    const newStatus = newPaid >= bill.total ? 'paid' : 'partial';
    runQuery(
      'UPDATE bills SET amount_paid = ?, payment_status = ? WHERE id = ?',
      [newPaid, newStatus, bill.id]
    );

    // If customer has credit, reduce it on payment
    if (bill.customer_id && payment_method !== 'credit') {
      runQuery('UPDATE customers SET credit_balance = MAX(0, credit_balance - ?) WHERE id = ?', [amount, bill.customer_id]);
    }
  });

  const updatedBill = queryOne('SELECT * FROM bills WHERE id = ?', [bill.id]);
  const payments = queryAll('SELECT * FROM payments WHERE bill_id = ?', [bill.id]);

  // PCI DSS 10.2: Audit log payment
  const user = (req as any).user;
  auditLog('PAYMENT_RECORDED', {
    userId: user.userId,
    username: user.username,
    billId: bill.id,
    billNumber: bill.bill_number,
    transactionRef: bill.transaction_ref,
    amount,
    paymentMethod: payment_method || 'cash',
    currency: 'INR',
    ip: req.ip
  });

  res.json({ ...updatedBill, payments });
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

// PATCH /api/bills/:id/status - Manually update payment status
router.patch('/:id/status', (req: Request, res: Response) => {
  const existing = queryOne('SELECT * FROM bills WHERE id = ?', [req.params.id]);
  if (!existing) {
    return res.status(404).json({ error: 'Bill not found' });
  }

  const { payment_status } = req.body;
  const validStatuses = ['pending', 'partial', 'paid', 'overdue'];
  if (!payment_status || !validStatuses.includes(payment_status)) {
    return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
  }

  runQuery('UPDATE bills SET payment_status = ? WHERE id = ?', [payment_status, req.params.id]);
  const updated = queryOne('SELECT * FROM bills WHERE id = ?', [req.params.id]);
  res.json(updated);
});

// DELETE /api/bills/:id - Delete bill and restore stock
router.delete('/:id', (req: Request, res: Response) => {
  const existing = queryOne('SELECT * FROM bills WHERE id = ?', [req.params.id]);
  if (!existing) {
    return res.status(404).json({ error: 'Bill not found' });
  }

  const billItems = queryAll('SELECT * FROM bill_items WHERE bill_id = ?', [req.params.id]);

  runTransaction(() => {
    // Restore stock
    for (const item of billItems) {
      runQuery('UPDATE items SET current_stock = current_stock + ? WHERE id = ?', [item.quantity, item.item_id]);
    }
    // Restore customer credit if applicable
    if (existing.customer_id && existing.payment_status !== 'paid') {
      const unpaid = existing.total - existing.amount_paid;
      runQuery('UPDATE customers SET credit_balance = MAX(0, credit_balance - ?) WHERE id = ?', [unpaid, existing.customer_id]);
    }
    runQuery('DELETE FROM payments WHERE bill_id = ?', [req.params.id]);
    runQuery('DELETE FROM bill_items WHERE bill_id = ?', [req.params.id]);
    runQuery('DELETE FROM bills WHERE id = ?', [req.params.id]);
  });

  res.json({ message: 'Bill deleted successfully' });
});

// GET /api/bills/:id/iso20022 - Export bill as ISO 20022 payment message
router.get('/:id/iso20022', (req: Request, res: Response) => {
  const bill = queryOne('SELECT * FROM bills WHERE id = ?', [req.params.id]);
  if (!bill) {
    return res.status(404).json({ error: 'Bill not found' });
  }

  const iso20022Message = {
    messageId: `MSG-${bill.id}-${Date.now()}`,
    creationDateTime: new Date().toISOString(),
    transactionReference: bill.transaction_ref || crypto.randomUUID(),
    numberOfTransactions: 1,
    paymentInformation: {
      paymentInformationId: bill.bill_number,
      paymentMethod: 'TRF',
      debtorParty: {
        name: bill.customer_name,
        postalAddress: bill.customer_address ? {
          streetName: bill.customer_address,
          country: 'IN'
        } : undefined,
        contactDetails: bill.customer_phone ? {
          phoneNumber: bill.customer_phone
        } : undefined
      },
      creditorParty: {
        name: 'Jalan Jyothi',
        postalAddress: { country: 'IN' }
      },
      instructedAmount: {
        value: bill.total,
        currency: bill.currency_code || 'INR'
      },
      remittanceInformation: {
        unstructured: bill.notes || undefined,
        structured: {
          referredDocumentType: 'CINV',
          referredDocumentNumber: bill.bill_number,
          referredDocumentDate: bill.bill_date
        }
      },
      paymentStatus: bill.payment_status === 'paid' ? 'ACSC'
        : bill.payment_status === 'partial' ? 'ACSP' : 'PDNG',
      amountPaid: bill.amount_paid,
      amountRemaining: bill.total - bill.amount_paid
    }
  };

  res.json(iso20022Message);
});

// GET /api/bills/export/iso20022 - Bulk export all bills as ISO 20022 messages
router.get('/export/iso20022', (req: Request, res: Response) => {
  const { from_date, to_date } = req.query;
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
  if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY bill_date DESC';

  const bills = queryAll(query, params);
  const messages = bills.map((bill: any) => ({
    transactionReference: bill.transaction_ref || `LEGACY-${bill.id}`,
    billNumber: bill.bill_number,
    date: bill.bill_date,
    debtorName: bill.customer_name,
    instructedAmount: { value: bill.total, currency: bill.currency_code || 'INR' },
    paymentStatus: bill.payment_status === 'paid' ? 'ACSC'
      : bill.payment_status === 'partial' ? 'ACSP' : 'PDNG',
    amountPaid: bill.amount_paid
  }));

  res.json({
    messageId: `BULK-${Date.now()}`,
    creationDateTime: new Date().toISOString(),
    numberOfTransactions: messages.length,
    transactions: messages
  });
});

export default router;
