import { Router, Request, Response } from 'express';
import { queryAll, queryOne, runQuery } from '../db';
import { encryptPII, decryptPII } from '../services/crypto';

const router = Router();

// Helper: decrypt PII fields in a customer record
function decryptCustomer(customer: any): any {
  if (!customer) return customer;
  return {
    ...customer,
    phone: decryptPII(customer.phone || ''),
    address: decryptPII(customer.address || ''),
    notes: decryptPII(customer.notes || '')
  };
}

// GET /api/customers - List customers with optional search
router.get('/', (req: Request, res: Response) => {
  const { search } = req.query;

  let query = 'SELECT * FROM customers';
  const params: any[] = [];

  // Note: search on encrypted fields requires decrypting all records
  // For large datasets, consider a search index with tokenized/hashed values
  query += ' ORDER BY name';
  let customers = queryAll(query, params);

  // Decrypt PII fields
  customers = customers.map(decryptCustomer);

  // Filter after decryption (required because encrypted values can't be LIKE-searched)
  if (search && typeof search === 'string') {
    const s = search.toLowerCase();
    customers = customers.filter((c: any) =>
      c.name.toLowerCase().includes(s) || (c.phone || '').includes(s)
    );
  }

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

  // Decrypt PII before returning
  res.json({ ...decryptCustomer(customer), bills, totalSpent, totalPaid });
});

// POST /api/customers - Create customer
router.post('/', (req: Request, res: Response) => {
  const { name, phone, address, notes } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Customer name is required' });
  }

  // Enforce uniqueness: check against decrypted phones
  if (phone && phone.trim()) {
    const allCustomers = queryAll('SELECT id, name, phone FROM customers', []);
    const existingByNamePhone = allCustomers.find((c: any) =>
      c.name.toLowerCase() === name.trim().toLowerCase() &&
      decryptPII(c.phone) === phone.trim()
    );
    if (existingByNamePhone) {
      return res.status(409).json({ error: 'A customer with this name and phone number already exists' });
    }
    const phoneExists = allCustomers.find((c: any) => decryptPII(c.phone) === phone.trim());
    if (phoneExists) {
      return res.status(409).json({ error: `Phone number already registered to "${phoneExists.name}". Each customer must have a unique phone number.` });
    }
  }

  // PCI DSS 3.4: Encrypt PII before storing
  const encPhone = encryptPII((phone || '').trim());
  const encAddress = encryptPII(address || '');
  const encNotes = encryptPII(notes || '');

  const result = runQuery(
    'INSERT INTO customers (name, phone, address, notes) VALUES (?, ?, ?, ?)',
    [name.trim(), encPhone, encAddress, encNotes]
  );

  const customer = queryOne('SELECT * FROM customers WHERE id = ?', [result.lastInsertRowid]);
  res.status(201).json(decryptCustomer(customer));
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

  // Enforce phone uniqueness (excluding current customer)
  if (phone && phone.trim()) {
    const allCustomers = queryAll('SELECT id, name, phone FROM customers WHERE id != ?', [req.params.id]);
    const phoneConflict = allCustomers.find((c: any) => decryptPII(c.phone) === phone.trim());
    if (phoneConflict) {
      return res.status(409).json({ error: `Phone number already registered to "${phoneConflict.name}". Each customer must have a unique phone number.` });
    }
  }

  // PCI DSS 3.4: Encrypt PII before storing
  const encPhone = encryptPII((phone || '').trim());
  const encAddress = encryptPII(address || '');
  const encNotes = encryptPII(notes || '');

  runQuery(
    `UPDATE customers SET name = ?, phone = ?, address = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [name.trim(), encPhone, encAddress, encNotes, req.params.id]
  );

  const updated = queryOne('SELECT * FROM customers WHERE id = ?', [req.params.id]);
  res.json(decryptCustomer(updated));
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
