"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const crypto_1 = require("../services/crypto");
const router = (0, express_1.Router)();
// Helper: decrypt PII fields in a customer record
function decryptCustomer(customer) {
    if (!customer)
        return customer;
    return {
        ...customer,
        phone: (0, crypto_1.decryptPII)(customer.phone || ''),
        address: (0, crypto_1.decryptPII)(customer.address || ''),
        notes: (0, crypto_1.decryptPII)(customer.notes || '')
    };
}
// GET /api/customers - List customers with optional search
router.get('/', (req, res) => {
    const { search } = req.query;
    let query = 'SELECT * FROM customers';
    const params = [];
    // Note: search on encrypted fields requires decrypting all records
    // For large datasets, consider a search index with tokenized/hashed values
    query += ' ORDER BY name';
    let customers = (0, db_1.queryAll)(query, params);
    // Decrypt PII fields
    customers = customers.map(decryptCustomer);
    // Filter after decryption (required because encrypted values can't be LIKE-searched)
    if (search && typeof search === 'string') {
        const s = search.toLowerCase();
        customers = customers.filter((c) => c.name.toLowerCase().includes(s) || (c.phone || '').includes(s));
    }
    res.json(customers);
});
// GET /api/customers/:id - Get customer with purchase history
router.get('/:id', (req, res) => {
    const customer = (0, db_1.queryOne)('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
    }
    // Get purchase history (bills linked to this customer)
    const bills = (0, db_1.queryAll)(`SELECT id, bill_number, total, amount_paid, payment_status, bill_date
     FROM bills WHERE customer_id = ? ORDER BY bill_date DESC`, [customer.id]);
    const totalSpent = bills.reduce((sum, b) => sum + (b.total || 0), 0);
    const totalPaid = bills.reduce((sum, b) => sum + (b.amount_paid || 0), 0);
    // Decrypt PII before returning
    res.json({ ...decryptCustomer(customer), bills, totalSpent, totalPaid });
});
// POST /api/customers - Create customer
router.post('/', (req, res) => {
    const { name, phone, address, notes } = req.body;
    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Customer name is required' });
    }
    // Enforce uniqueness: check against decrypted phones
    if (phone && phone.trim()) {
        const allCustomers = (0, db_1.queryAll)('SELECT id, name, phone FROM customers', []);
        const existingByNamePhone = allCustomers.find((c) => c.name.toLowerCase() === name.trim().toLowerCase() &&
            (0, crypto_1.decryptPII)(c.phone) === phone.trim());
        if (existingByNamePhone) {
            return res.status(409).json({ error: 'A customer with this name and phone number already exists' });
        }
        const phoneExists = allCustomers.find((c) => (0, crypto_1.decryptPII)(c.phone) === phone.trim());
        if (phoneExists) {
            return res.status(409).json({ error: `Phone number already registered to "${phoneExists.name}". Each customer must have a unique phone number.` });
        }
    }
    // PCI DSS 3.4: Encrypt PII before storing
    const encPhone = (0, crypto_1.encryptPII)((phone || '').trim());
    const encAddress = (0, crypto_1.encryptPII)(address || '');
    const encNotes = (0, crypto_1.encryptPII)(notes || '');
    const result = (0, db_1.runQuery)('INSERT INTO customers (name, phone, address, notes) VALUES (?, ?, ?, ?)', [name.trim(), encPhone, encAddress, encNotes]);
    const customer = (0, db_1.queryOne)('SELECT * FROM customers WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(decryptCustomer(customer));
});
// PUT /api/customers/:id - Update customer
router.put('/:id', (req, res) => {
    const existing = (0, db_1.queryOne)('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    if (!existing) {
        return res.status(404).json({ error: 'Customer not found' });
    }
    const { name, phone, address, notes } = req.body;
    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Customer name is required' });
    }
    // Enforce phone uniqueness (excluding current customer)
    if (phone && phone.trim()) {
        const allCustomers = (0, db_1.queryAll)('SELECT id, name, phone FROM customers WHERE id != ?', [req.params.id]);
        const phoneConflict = allCustomers.find((c) => (0, crypto_1.decryptPII)(c.phone) === phone.trim());
        if (phoneConflict) {
            return res.status(409).json({ error: `Phone number already registered to "${phoneConflict.name}". Each customer must have a unique phone number.` });
        }
    }
    // PCI DSS 3.4: Encrypt PII before storing
    const encPhone = (0, crypto_1.encryptPII)((phone || '').trim());
    const encAddress = (0, crypto_1.encryptPII)(address || '');
    const encNotes = (0, crypto_1.encryptPII)(notes || '');
    (0, db_1.runQuery)(`UPDATE customers SET name = ?, phone = ?, address = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [name.trim(), encPhone, encAddress, encNotes, req.params.id]);
    const updated = (0, db_1.queryOne)('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    res.json(decryptCustomer(updated));
});
// DELETE /api/customers/:id - Delete customer
router.delete('/:id', (req, res) => {
    const existing = (0, db_1.queryOne)('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    if (!existing) {
        return res.status(404).json({ error: 'Customer not found' });
    }
    // Unlink from bills but don't delete bills
    (0, db_1.runQuery)('UPDATE bills SET customer_id = NULL WHERE customer_id = ?', [req.params.id]);
    (0, db_1.runQuery)('DELETE FROM customers WHERE id = ?', [req.params.id]);
    res.json({ message: 'Customer deleted successfully' });
});
exports.default = router;
//# sourceMappingURL=customers.js.map