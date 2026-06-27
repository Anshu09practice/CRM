import Dexie, { Table } from 'dexie';
import ExcelJS from 'exceljs';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { encryptCustomerPII, decryptCustomerPII } from './encryption';

// ===== Database Schema =====

export interface LocalItem {
  id?: number;
  item_name: string;
  package_quantity_grams: number;
  purchase_cost: number;
  selling_price: number;
  mrp: number;
  packaging_style: 'packet' | 'standing_package';
  packets_per_bundle: number;
  bundle_weight_grams: number;
  sku_id?: string | null;
  category_id?: number | null;
  current_stock: number;
  low_stock_threshold: number;
  default_tax_percent: number;
  created_at: string;
  updated_at: string;
}

export interface LocalCategory {
  id?: number;
  name: string;
  description: string;
  created_at: string;
}

export interface LocalCustomer {
  id?: number;
  name: string;
  phone: string;
  address: string;
  credit_balance: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface LocalPurchase {
  id?: number;
  item_id: number;
  item_name: string;
  quantity: number;
  package_quantity_grams: number;
  purchase_cost: number;
  total_cost: number;
  packaging_style: string;
  purchase_date: string;
  notes: string;
  created_at: string;
}

export interface LocalBill {
  id?: number;
  bill_number: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_id?: number | null;
  subtotal: number;
  discount_percent: number;
  discount_amount: number;
  tax_percent: number;
  cgst_amount: number;
  sgst_amount: number;
  tax_total: number;
  total: number;
  payment_status: 'pending' | 'partial' | 'paid' | 'overdue';
  amount_paid: number;
  bill_date: string;
  notes: string;
  whatsapp_sent: number;
  created_at: string;
}

export interface LocalBillItem {
  id?: number;
  bill_id: number;
  item_id: number;
  item_name: string;
  quantity: number;
  package_quantity_grams: number;
  selling_price: number;
  line_total: number;
}

export interface LocalPayment {
  id?: number;
  bill_id: number;
  amount: number;
  payment_method: string;
  payment_date: string;
  notes: string;
  created_at: string;
}

export interface LocalExpense {
  id?: number;
  category: string;
  amount: number;
  description: string;
  expense_date: string;
  created_by: string;
  created_at: string;
}

export interface LocalUser {
  id?: number;
  username: string;
  password_hash: string;
  role: 'owner' | 'manager';
  security_question: string;
  security_answer_hash: string;
  is_active: number;
  last_login: string;
  created_at: string;
}

export interface LocalSettings {
  key: string;
  value: string;
}

// ===== Database Class =====

class LocalCRMDatabase extends Dexie {
  items!: Table<LocalItem, number>;
  categories!: Table<LocalCategory, number>;
  customers!: Table<LocalCustomer, number>;
  purchases!: Table<LocalPurchase, number>;
  bills!: Table<LocalBill, number>;
  billItems!: Table<LocalBillItem, number>;
  payments!: Table<LocalPayment, number>;
  expenses!: Table<LocalExpense, number>;
  users!: Table<LocalUser, number>;
  settings!: Table<LocalSettings, string>;

  constructor() {
    super('JalanJyothiCRM_Local');

    this.version(1).stores({
      items: '++id, item_name, packaging_style, category_id, current_stock, sku_id',
      categories: '++id, &name',
      customers: '++id, name, phone',
      purchases: '++id, item_id, purchase_date',
      bills: '++id, &bill_number, customer_name, customer_id, bill_date, payment_status',
      billItems: '++id, bill_id, item_id',
      payments: '++id, bill_id, payment_date',
      expenses: '++id, category, expense_date',
      users: '++id, &username',
      settings: 'key'
    });
  }
}

export const localDb = new LocalCRMDatabase();

// Seed default categories if the table is empty
localDb.on('ready', async () => {
  const count = await localDb.categories.count();
  if (count === 0) {
    const ts = new Date().toISOString();
    await localDb.categories.bulkAdd([
      { name: 'Sugar', description: '', created_at: ts },
      { name: 'Spices', description: '', created_at: ts },
      { name: 'Dry Fruit', description: '', created_at: ts },
      { name: 'Super Food', description: '', created_at: ts },
    ]);
  }
});

// ===== Helper Functions =====

function now(): string {
  return new Date().toISOString();
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function generateBillNumber(): string {
  const date = new Date();
  const y = date.getFullYear().toString().slice(-2);
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  const h = date.getHours().toString().padStart(2, '0');
  const min = date.getMinutes().toString().padStart(2, '0');
  const s = date.getSeconds().toString().padStart(2, '0');
  return `JJ-${y}${m}${d}-${h}${min}${s}`;
}

// PCI DSS 8.2.1: Use PBKDF2 with high iteration count (not plain SHA-256)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 310000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  const hashArray = Array.from(new Uint8Array(derivedBits));
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `pbkdf2:310000:${saltHex}:${hashHex}`;
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (storedHash.startsWith('pbkdf2:')) {
    const [, iterations, saltHex, expectedHash] = storedHash.split(':');
    const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']
    );
    const derivedBits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: parseInt(iterations), hash: 'SHA-256' },
      keyMaterial, 256
    );
    const hashHex = Array.from(new Uint8Array(derivedBits)).map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex === expectedHash;
  }
  // Legacy SHA-256 fallback for existing accounts (will be upgraded on next login)
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const legacyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return legacyHash === storedHash;
}

// ===== Local API Implementation =====

export const localApi = {
  // ===== Items =====
  async getItems(search?: string, packaging_style?: string, category_id?: string) {
    let collection = localDb.items.toCollection();
    let items = await collection.toArray();

    if (search) {
      const s = search.toLowerCase();
      items = items.filter(i => i.item_name.toLowerCase().includes(s));
    }
    if (packaging_style) {
      items = items.filter(i => i.packaging_style === packaging_style);
    }
    if (category_id) {
      items = items.filter(i => i.category_id === Number(category_id));
    }

    return { items, total: items.length };
  },

  async getItem(id: number) {
    const item = await localDb.items.get(id);
    if (!item) throw new Error('Item not found');
    return item;
  },

  async createItem(item: Partial<LocalItem>) {
    // Auto-generate SKU if not provided
    let skuId = item.sku_id || null;
    if (!skuId) {
      const allItems = await localDb.items.toArray();
      const skuNumbers = allItems
        .map(i => i.sku_id)
        .filter(Boolean)
        .map(s => {
          const match = s!.match(/SKU-(\d+)/);
          return match ? parseInt(match[1]) : 0;
        });
      const maxNum = skuNumbers.length > 0 ? Math.max(...skuNumbers) : 0;
      skuId = `SKU-${String(maxNum + 1).padStart(4, '0')}`;
    }

    const newItem: LocalItem = {
      item_name: item.item_name || '',
      package_quantity_grams: item.package_quantity_grams || 0,
      purchase_cost: item.purchase_cost || 0,
      selling_price: item.selling_price || 0,
      mrp: item.mrp || 0,
      packaging_style: item.packaging_style || 'packet',
      packets_per_bundle: item.packets_per_bundle || 0,
      bundle_weight_grams: item.bundle_weight_grams || 0,
      sku_id: skuId,
      category_id: item.category_id || null,
      current_stock: item.current_stock || 0,
      low_stock_threshold: item.low_stock_threshold || 10,
      default_tax_percent: item.default_tax_percent || 0,
      created_at: now(),
      updated_at: now()
    };
    const id = await localDb.items.add(newItem);
    return { ...newItem, id };
  },

  async updateItem(id: number, item: Partial<LocalItem>) {
    await localDb.items.update(id, { ...item, updated_at: now() });
    return this.getItem(id);
  },

  async deleteItem(id: number) {
    await localDb.items.delete(id);
  },

  async importItems(items: Partial<LocalItem>[]) {
    let imported = 0;
    const errors: string[] = [];
    for (const item of items) {
      try {
        await this.createItem(item);
        imported++;
      } catch (e: any) {
        errors.push(e.message);
      }
    }
    return { imported, errors };
  },

  async bulkUpdate(items: Partial<LocalItem>[]) {
    let updated = 0, created = 0;
    const errors: string[] = [];
    const allItems = await localDb.items.toArray();

    for (const item of items) {
      try {
        const name = String(item.item_name || '').trim();
        if (!name) {
          errors.push('Skipped row with empty item name');
          continue;
        }

        // Parse numeric values (handles string values from Excel/CSV parsing)
        const packaging = String(item.packaging_style || 'packet').toLowerCase().includes('stand') ? 'standing_package' as const : 'packet' as const;
        const qty = parseInt(String(item.package_quantity_grams)) || 0;
        const purchase = parseFloat(String(item.purchase_cost)) || 0;
        const selling = parseFloat(String(item.selling_price)) || 0;
        const mrp = parseFloat(String(item.mrp)) || 0;
        const skuId = item.sku_id ? String(item.sku_id).trim() : null;
        const categoryId = item.category_id ? Number(item.category_id) : null;

        // Match by id first, then by name (case-insensitive)
        let existing: LocalItem | undefined;
        if (item.id && String(item.id).trim()) {
          existing = allItems.find(i => i.id === parseInt(String(item.id)));
        }
        if (!existing) {
          existing = allItems.find(i => i.item_name.toLowerCase() === name.toLowerCase());
        }

        if (existing) {
          await localDb.items.update(existing.id!, {
            item_name: name,
            package_quantity_grams: qty,
            purchase_cost: purchase,
            selling_price: selling,
            mrp: mrp,
            packaging_style: packaging,
            sku_id: skuId || existing.sku_id,
            category_id: categoryId ?? existing.category_id,
            updated_at: now()
          });
          updated++;
        } else {
          // Generate SKU for new items
          const skuNumbers = allItems.map(i => i.sku_id).filter(Boolean).map(s => {
            const match = s!.match(/SKU-(\d+)/);
            return match ? parseInt(match[1]) : 0;
          });
          const maxNum = skuNumbers.length > 0 ? Math.max(...skuNumbers) : 0;
          const newSkuId = skuId || `SKU-${String(maxNum + created + 1).padStart(4, '0')}`;

          const newItem: LocalItem = {
            item_name: name,
            package_quantity_grams: qty,
            purchase_cost: purchase,
            selling_price: selling,
            mrp: mrp,
            packaging_style: packaging,
            packets_per_bundle: 0,
            bundle_weight_grams: 0,
            sku_id: newSkuId,
            category_id: categoryId,
            current_stock: 0,
            low_stock_threshold: 10,
            default_tax_percent: 0,
            created_at: now(),
            updated_at: now()
          };
          const newId = await localDb.items.add(newItem);
          allItems.push({ ...newItem, id: newId as number });
          created++;
        }
      } catch (e: any) {
        errors.push(`Failed "${item.item_name}": ${e.message}`);
      }
    }
    return { updated, created, errors };
  },

  async getLowStockItems() {
    const items = await localDb.items.toArray();
    const lowStock = items.filter(i => i.current_stock <= i.low_stock_threshold);
    return { items: lowStock, total: lowStock.length };
  },

  // ===== Categories =====
  async getCategories() {
    const categories = await localDb.categories.toArray();
    const items = await localDb.items.toArray();
    return categories.map(cat => ({
      ...cat,
      item_count: items.filter(i => i.category_id === cat.id).length
    }));
  },

  async createCategory(data: { name: string; description?: string }) {
    const cat: LocalCategory = {
      name: data.name,
      description: data.description || '',
      created_at: now()
    };
    const id = await localDb.categories.add(cat);
    return { ...cat, id };
  },

  async updateCategory(id: number, data: { name: string; description?: string }) {
    await localDb.categories.update(id, data);
    const cat = await localDb.categories.get(id);
    if (!cat) throw new Error('Category not found');
    return cat;
  },

  async deleteCategory(id: number) {
    await localDb.categories.delete(id);
    // Remove category_id from items
    const items = await localDb.items.where('category_id').equals(id).toArray();
    for (const item of items) {
      await localDb.items.update(item.id!, { category_id: null });
    }
  },

  // ===== Customers =====
  async getCustomers(search?: string) {
    let customers = await localDb.customers.toArray();
    // PCI DSS 3.4: Decrypt PII fields after retrieval
    const decrypted = await Promise.all(customers.map(async c => {
      const d = await decryptCustomerPII(c);
      return { ...c, ...d };
    }));
    if (search) {
      const s = search.toLowerCase();
      return decrypted.filter(c =>
        c.name.toLowerCase().includes(s) ||
        c.phone.includes(s)
      );
    }
    return decrypted;
  },

  async getCustomer(id: number) {
    const customer = await localDb.customers.get(id);
    if (!customer) throw new Error('Customer not found');
    // PCI DSS 3.4: Decrypt PII
    const decrypted = await decryptCustomerPII(customer);
    const decryptedCustomer = { ...customer, ...decrypted };
    const bills = await localDb.bills.where('customer_id').equals(id).toArray();
    const totalSpent = bills.reduce((sum, b) => sum + b.total, 0);
    const totalPaid = bills.reduce((sum, b) => sum + b.amount_paid, 0);
    return { ...decryptedCustomer, bills, totalSpent, totalPaid };
  },

  async createCustomer(data: { name: string; phone?: string; address?: string; notes?: string }) {
    // PCI DSS 3.4: Encrypt PII before storage
    const encrypted = await encryptCustomerPII({
      phone: data.phone || '',
      address: data.address || '',
      notes: data.notes || ''
    });
    const customer: LocalCustomer = {
      name: data.name,
      phone: encrypted.phone || '',
      address: encrypted.address || '',
      credit_balance: 0,
      notes: encrypted.notes || '',
      created_at: now(),
      updated_at: now()
    };
    const id = await localDb.customers.add(customer);
    // Return decrypted for display
    return { ...customer, phone: data.phone || '', address: data.address || '', notes: data.notes || '', id };
  },

  async updateCustomer(id: number, data: { name: string; phone?: string; address?: string; notes?: string }) {
    // PCI DSS 3.4: Encrypt PII before storage
    const encrypted = await encryptCustomerPII({
      phone: data.phone,
      address: data.address,
      notes: data.notes
    });
    await localDb.customers.update(id, { name: data.name, ...encrypted, updated_at: now() });
    const customer = await localDb.customers.get(id);
    if (!customer) throw new Error('Customer not found');
    // Return decrypted
    const decrypted = await decryptCustomerPII(customer);
    return { ...customer, ...decrypted };
  },

  async deleteCustomer(id: number) {
    await localDb.customers.delete(id);
  },

  // ===== Purchases =====
  async getPurchases(params?: { item_id?: number; from_date?: string; to_date?: string; search?: string }) {
    let purchases = await localDb.purchases.toArray();

    if (params?.item_id) {
      purchases = purchases.filter(p => p.item_id === params.item_id);
    }
    if (params?.from_date) {
      purchases = purchases.filter(p => p.purchase_date >= params.from_date!);
    }
    if (params?.to_date) {
      purchases = purchases.filter(p => p.purchase_date <= params.to_date!);
    }
    if (params?.search) {
      const s = params.search.toLowerCase();
      purchases = purchases.filter(p => p.item_name.toLowerCase().includes(s));
    }

    purchases.sort((a, b) => b.purchase_date.localeCompare(a.purchase_date));
    const totalCost = purchases.reduce((sum, p) => sum + p.total_cost, 0);
    const totalQty = purchases.reduce((sum, p) => sum + p.quantity, 0);

    return { purchases, total: purchases.length, totalCost, totalQty };
  },

  async createPurchase(data: { item_id: number; quantity: number; purchase_cost?: number; purchase_date?: string; notes?: string }) {
    const item = await localDb.items.get(data.item_id);
    if (!item) throw new Error('Item not found');

    const cost = data.purchase_cost ?? item.purchase_cost;
    const purchase: LocalPurchase = {
      item_id: data.item_id,
      item_name: item.item_name,
      quantity: data.quantity,
      package_quantity_grams: item.package_quantity_grams,
      purchase_cost: cost,
      total_cost: cost * data.quantity,
      packaging_style: item.packaging_style,
      purchase_date: data.purchase_date || today(),
      notes: data.notes || '',
      created_at: now()
    };

    const id = await localDb.purchases.add(purchase);

    // Update stock
    await localDb.items.update(data.item_id, {
      current_stock: item.current_stock + data.quantity,
      purchase_cost: cost,
      updated_at: now()
    });

    return { ...purchase, id };
  },

  async updatePurchase(id: number, data: { item_id: number; quantity: number; purchase_cost?: number; purchase_date?: string; notes?: string }) {
    const oldPurchase = await localDb.purchases.get(id);
    if (!oldPurchase) throw new Error('Purchase not found');

    const item = await localDb.items.get(data.item_id);
    if (!item) throw new Error('Item not found');

    // Reverse old stock
    await localDb.items.update(oldPurchase.item_id, {
      current_stock: (await localDb.items.get(oldPurchase.item_id))!.current_stock - oldPurchase.quantity
    });

    const cost = data.purchase_cost ?? item.purchase_cost;
    const updated: Partial<LocalPurchase> = {
      item_id: data.item_id,
      item_name: item.item_name,
      quantity: data.quantity,
      package_quantity_grams: item.package_quantity_grams,
      purchase_cost: cost,
      total_cost: cost * data.quantity,
      packaging_style: item.packaging_style,
      purchase_date: data.purchase_date || today(),
      notes: data.notes || ''
    };

    await localDb.purchases.update(id, updated);

    // Apply new stock
    await localDb.items.update(data.item_id, {
      current_stock: item.current_stock + data.quantity,
      updated_at: now()
    });

    return { ...oldPurchase, ...updated, id };
  },

  async deletePurchase(id: number) {
    const purchase = await localDb.purchases.get(id);
    if (!purchase) throw new Error('Purchase not found');

    const item = await localDb.items.get(purchase.item_id);
    if (item) {
      await localDb.items.update(purchase.item_id, {
        current_stock: Math.max(0, item.current_stock - purchase.quantity),
        updated_at: now()
      });
    }

    await localDb.purchases.delete(id);
  },

  // ===== Bills =====
  async getBills(params?: { from_date?: string; to_date?: string; search?: string; payment_status?: string }) {
    let bills = await localDb.bills.toArray();

    if (params?.from_date) {
      bills = bills.filter(b => b.bill_date >= params.from_date!);
    }
    if (params?.to_date) {
      bills = bills.filter(b => b.bill_date <= params.to_date!);
    }
    if (params?.search) {
      const s = params.search.toLowerCase();
      bills = bills.filter(b =>
        b.customer_name.toLowerCase().includes(s) ||
        b.bill_number.toLowerCase().includes(s)
      );
    }
    if (params?.payment_status) {
      bills = bills.filter(b => b.payment_status === params.payment_status);
    }

    bills.sort((a, b) => b.created_at.localeCompare(a.created_at));
    const totalRevenue = bills.reduce((sum, b) => sum + b.total, 0);
    const totalPending = bills.filter(b => b.payment_status !== 'paid').reduce((sum, b) => sum + (b.total - b.amount_paid), 0);

    // Attach items to each bill
    for (const bill of bills) {
      (bill as any).items = await localDb.billItems.where('bill_id').equals(bill.id!).toArray();
    }

    return { bills, total: bills.length, totalRevenue, totalPending };
  },

  async getBill(id: number) {
    const bill = await localDb.bills.get(id);
    if (!bill) throw new Error('Bill not found');
    const items = await localDb.billItems.where('bill_id').equals(id).toArray();
    const payments = await localDb.payments.where('bill_id').equals(id).toArray();
    return { ...bill, items, payments };
  },

  async getAvailableStock() {
    const items = await localDb.items.toArray();
    const stock = items
      .filter(i => i.current_stock > 0)
      .map(i => ({
        item_id: i.id!,
        item_name: i.item_name,
        package_quantity_grams: i.package_quantity_grams,
        selling_price: i.selling_price,
        mrp: i.mrp,
        packaging_style: i.packaging_style,
        available_qty: i.current_stock
      }));
    return { stock };
  },

  async createBill(data: {
    customer_name: string; customer_phone: string; customer_address: string; customer_id?: number | null;
    items: { item_id: number; quantity: number; selling_price?: number }[];
    discount_percent: number; tax_percent?: number; notes?: string; bill_date?: string;
    payment_method?: string; amount_paid?: number;
  }) {
    const billNumber = generateBillNumber();

    // Calculate totals
    let subtotal = 0;
    const billItems: Omit<LocalBillItem, 'id' | 'bill_id'>[] = [];

    for (const itemInput of data.items) {
      const item = await localDb.items.get(itemInput.item_id);
      if (!item) throw new Error(`Item ${itemInput.item_id} not found`);

      const price = itemInput.selling_price ?? item.selling_price;
      const lineTotal = price * itemInput.quantity;
      subtotal += lineTotal;

      billItems.push({
        item_id: itemInput.item_id,
        item_name: item.item_name,
        quantity: itemInput.quantity,
        package_quantity_grams: item.package_quantity_grams,
        selling_price: price,
        line_total: lineTotal
      });

      // Deduct stock
      await localDb.items.update(itemInput.item_id, {
        current_stock: Math.max(0, item.current_stock - itemInput.quantity),
        updated_at: now()
      });
    }

    const discountPercent = data.discount_percent || 0;
    const discountAmount = (subtotal * discountPercent) / 100;
    const afterDiscount = subtotal - discountAmount;
    const taxPercent = data.tax_percent || 0;
    const taxTotal = (afterDiscount * taxPercent) / 100;
    const cgst = taxTotal / 2;
    const sgst = taxTotal / 2;
    const total = afterDiscount + taxTotal;
    const amountPaid = data.amount_paid || 0;

    let paymentStatus: 'pending' | 'partial' | 'paid' = 'pending';
    if (amountPaid >= total) paymentStatus = 'paid';
    else if (amountPaid > 0) paymentStatus = 'partial';

    const bill: LocalBill = {
      bill_number: billNumber,
      customer_name: data.customer_name,
      customer_phone: data.customer_phone || '',
      customer_address: data.customer_address || '',
      customer_id: data.customer_id || null,
      subtotal,
      discount_percent: discountPercent,
      discount_amount: discountAmount,
      tax_percent: taxPercent,
      cgst_amount: cgst,
      sgst_amount: sgst,
      tax_total: taxTotal,
      total,
      payment_status: paymentStatus,
      amount_paid: amountPaid,
      bill_date: data.bill_date || today(),
      notes: data.notes || '',
      whatsapp_sent: 0,
      created_at: now()
    };

    const billId = await localDb.bills.add(bill);

    // Add bill items
    for (const bi of billItems) {
      await localDb.billItems.add({ ...bi, bill_id: billId as number });
    }

    // Add payment if paid
    if (amountPaid > 0) {
      await localDb.payments.add({
        bill_id: billId as number,
        amount: amountPaid,
        payment_method: data.payment_method || 'cash',
        payment_date: today(),
        notes: '',
        created_at: now()
      });
    }

    // Update customer credit
    if (data.customer_id && paymentStatus !== 'paid') {
      const customer = await localDb.customers.get(data.customer_id);
      if (customer) {
        await localDb.customers.update(data.customer_id, {
          credit_balance: customer.credit_balance + (total - amountPaid),
          updated_at: now()
        });
      }
    }

    const items = await localDb.billItems.where('bill_id').equals(billId as number).toArray();
    return { ...bill, id: billId as number, items };
  },

  async updateBill(id: number, data: {
    customer_name: string; customer_phone: string; customer_address: string; customer_id?: number | null;
    items: { item_id: number; quantity: number; selling_price?: number }[];
    discount_percent: number; tax_percent?: number; notes?: string; bill_date?: string;
    payment_method?: string; amount_paid?: number;
  }) {
    // Restore stock from old bill
    const oldItems = await localDb.billItems.where('bill_id').equals(id).toArray();
    for (const oi of oldItems) {
      const item = await localDb.items.get(oi.item_id);
      if (item) {
        await localDb.items.update(oi.item_id, { current_stock: item.current_stock + oi.quantity });
      }
    }
    await localDb.billItems.where('bill_id').equals(id).delete();

    // Recalculate
    let subtotal = 0;
    const billItems: Omit<LocalBillItem, 'id' | 'bill_id'>[] = [];

    for (const itemInput of data.items) {
      const item = await localDb.items.get(itemInput.item_id);
      if (!item) throw new Error(`Item ${itemInput.item_id} not found`);

      const price = itemInput.selling_price ?? item.selling_price;
      const lineTotal = price * itemInput.quantity;
      subtotal += lineTotal;

      billItems.push({
        item_id: itemInput.item_id,
        item_name: item.item_name,
        quantity: itemInput.quantity,
        package_quantity_grams: item.package_quantity_grams,
        selling_price: price,
        line_total: lineTotal
      });

      await localDb.items.update(itemInput.item_id, {
        current_stock: Math.max(0, item.current_stock - itemInput.quantity),
        updated_at: now()
      });
    }

    const discountPercent = data.discount_percent || 0;
    const discountAmount = (subtotal * discountPercent) / 100;
    const afterDiscount = subtotal - discountAmount;
    const taxPercent = data.tax_percent || 0;
    const taxTotal = (afterDiscount * taxPercent) / 100;
    const total = afterDiscount + taxTotal;

    const existingBill = await localDb.bills.get(id);
    const amountPaid = existingBill?.amount_paid || 0;
    let paymentStatus: 'pending' | 'partial' | 'paid' = 'pending';
    if (amountPaid >= total) paymentStatus = 'paid';
    else if (amountPaid > 0) paymentStatus = 'partial';

    await localDb.bills.update(id, {
      customer_name: data.customer_name,
      customer_phone: data.customer_phone || '',
      customer_address: data.customer_address || '',
      customer_id: data.customer_id || null,
      subtotal,
      discount_percent: discountPercent,
      discount_amount: discountAmount,
      tax_percent: taxPercent,
      cgst_amount: taxTotal / 2,
      sgst_amount: taxTotal / 2,
      tax_total: taxTotal,
      total,
      payment_status: paymentStatus,
      bill_date: data.bill_date || today(),
      notes: data.notes || ''
    });

    for (const bi of billItems) {
      await localDb.billItems.add({ ...bi, bill_id: id });
    }

    return this.getBill(id);
  },

  async recordPayment(billId: number, data: { amount: number; payment_method: string; payment_date?: string; notes?: string }) {
    const bill = await localDb.bills.get(billId);
    if (!bill) throw new Error('Bill not found');

    await localDb.payments.add({
      bill_id: billId,
      amount: data.amount,
      payment_method: data.payment_method,
      payment_date: data.payment_date || today(),
      notes: data.notes || '',
      created_at: now()
    });

    const newPaid = bill.amount_paid + data.amount;
    let paymentStatus: 'pending' | 'partial' | 'paid' = 'pending';
    if (newPaid >= bill.total) paymentStatus = 'paid';
    else if (newPaid > 0) paymentStatus = 'partial';

    await localDb.bills.update(billId, {
      amount_paid: newPaid,
      payment_status: paymentStatus
    });

    // Update customer credit
    if (bill.customer_id) {
      const customer = await localDb.customers.get(bill.customer_id);
      if (customer) {
        await localDb.customers.update(bill.customer_id, {
          credit_balance: Math.max(0, customer.credit_balance - data.amount),
          updated_at: now()
        });
      }
    }

    return this.getBill(billId);
  },

  async markWhatsAppSent(id: number) {
    await localDb.bills.update(id, { whatsapp_sent: 1 });
  },

  async deleteBill(id: number) {
    // Restore stock
    const items = await localDb.billItems.where('bill_id').equals(id).toArray();
    for (const bi of items) {
      const item = await localDb.items.get(bi.item_id);
      if (item) {
        await localDb.items.update(bi.item_id, {
          current_stock: item.current_stock + bi.quantity,
          updated_at: now()
        });
      }
    }

    await localDb.billItems.where('bill_id').equals(id).delete();
    await localDb.payments.where('bill_id').equals(id).delete();
    await localDb.bills.delete(id);
  },

  // ===== Dashboard =====
  async getDashboardSummary() {
    const todayStr = today();
    const bills = await localDb.bills.toArray();
    const expenses = await localDb.expenses.toArray();
    const purchases = await localDb.purchases.toArray();
    const items = await localDb.items.toArray();
    const customers = await localDb.customers.toArray();

    const todayBills = bills.filter(b => b.bill_date === todayStr);

    const now_ = new Date();
    const monthStart = `${now_.getFullYear()}-${(now_.getMonth() + 1).toString().padStart(2, '0')}-01`;
    const prevMonthStart = new Date(now_.getFullYear(), now_.getMonth() - 1, 1).toISOString().split('T')[0];
    const prevMonthEnd = new Date(now_.getFullYear(), now_.getMonth(), 0).toISOString().split('T')[0];

    const monthBills = bills.filter(b => b.bill_date >= monthStart);
    const prevMonthBills = bills.filter(b => b.bill_date >= prevMonthStart && b.bill_date <= prevMonthEnd);
    const monthExpenses = expenses.filter(e => e.expense_date >= monthStart);
    const monthPurchases = purchases.filter(p => p.purchase_date >= monthStart);

    const monthRevenue = monthBills.reduce((s, b) => s + b.total, 0);
    const prevMonthRevenue = prevMonthBills.reduce((s, b) => s + b.total, 0);
    const monthExpTotal = monthExpenses.reduce((s, e) => s + e.amount, 0);
    const monthPurTotal = monthPurchases.reduce((s, p) => s + p.total_cost, 0);

    const pendingBills = bills.filter(b => b.payment_status !== 'paid');
    const pendingAmount = pendingBills.reduce((s, b) => s + (b.total - b.amount_paid), 0);

    const stockValue = items.reduce((s, i) => s + (i.current_stock * i.purchase_cost), 0);
    const lowStockCount = items.filter(i => i.current_stock <= i.low_stock_threshold).length;

    return {
      today: { sales_count: todayBills.length, revenue: todayBills.reduce((s, b) => s + b.total, 0) },
      monthly: {
        revenue: monthRevenue,
        sales_count: monthBills.length,
        prev_month_revenue: prevMonthRevenue,
        expenses: monthExpTotal,
        purchases: monthPurTotal,
        profit: monthRevenue - monthExpTotal - monthPurTotal
      },
      pending_payments: { count: pendingBills.length, amount: pendingAmount },
      inventory: { total_items: items.length, stock_value: stockValue, low_stock_count: lowStockCount },
      customers: { total: customers.length }
    };
  },

  async getTopItems(period?: string) {
    const bills = await localDb.bills.toArray();
    const billItems = await localDb.billItems.toArray();
    const items = await localDb.items.toArray();

    let dateFilter = '';
    if (period === 'week') {
      const d = new Date(); d.setDate(d.getDate() - 7);
      dateFilter = d.toISOString().split('T')[0];
    } else {
      const d = new Date(); d.setDate(1);
      dateFilter = d.toISOString().split('T')[0];
    }

    const relevantBillIds = new Set(bills.filter(b => b.bill_date >= dateFilter).map(b => b.id));
    const relevantItems = billItems.filter(bi => relevantBillIds.has(bi.bill_id));

    // Aggregate by item
    const itemSales: Record<number, { name: string; qty: number; revenue: number }> = {};
    for (const bi of relevantItems) {
      if (!itemSales[bi.item_id]) {
        itemSales[bi.item_id] = { name: bi.item_name, qty: 0, revenue: 0 };
      }
      itemSales[bi.item_id].qty += bi.quantity;
      itemSales[bi.item_id].revenue += bi.line_total;
    }

    const sorted = Object.entries(itemSales).sort((a, b) => b[1].revenue - a[1].revenue);
    const topItems = sorted.slice(0, 10).map(([id, d]) => ({ item_id: Number(id), item_name: d.name, total_qty: d.qty, total_revenue: d.revenue }));
    const bottomItems = sorted.slice(-5).map(([id, d]) => ({ item_id: Number(id), item_name: d.name, total_qty: d.qty, total_revenue: d.revenue }));

    // Margins
    const margins = items.slice(0, 10).map(i => ({
      item_name: i.item_name,
      purchase_cost: i.purchase_cost,
      selling_price: i.selling_price,
      margin: i.selling_price - i.purchase_cost,
      margin_percent: i.purchase_cost > 0 ? ((i.selling_price - i.purchase_cost) / i.purchase_cost * 100) : 0
    }));

    return { topItems, bottomItems, margins };
  },

  async getSalesTrend() {
    const bills = await localDb.bills.toArray();
    const last30 = new Date(); last30.setDate(last30.getDate() - 30);
    const dateStr = last30.toISOString().split('T')[0];

    const recent = bills.filter(b => b.bill_date >= dateStr);
    const byDate: Record<string, { count: number; revenue: number }> = {};

    for (const b of recent) {
      if (!byDate[b.bill_date]) byDate[b.bill_date] = { count: 0, revenue: 0 };
      byDate[b.bill_date].count++;
      byDate[b.bill_date].revenue += b.total;
    }

    return Object.entries(byDate)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, data]) => ({ date, count: data.count, revenue: data.revenue }));
  },

  async getLowStockDashboard() {
    const items = await localDb.items.toArray();
    return items
      .filter(i => i.current_stock <= i.low_stock_threshold)
      .map(i => ({
        id: i.id,
        item_name: i.item_name,
        current_stock: i.current_stock,
        low_stock_threshold: i.low_stock_threshold,
        packaging_style: i.packaging_style
      }));
  },

  // ===== Expenses =====
  async getExpenses(params?: { from_date?: string; to_date?: string; category?: string }) {
    let expenses = await localDb.expenses.toArray();

    if (params?.from_date) expenses = expenses.filter(e => e.expense_date >= params.from_date!);
    if (params?.to_date) expenses = expenses.filter(e => e.expense_date <= params.to_date!);
    if (params?.category) expenses = expenses.filter(e => e.category === params.category);

    expenses.sort((a, b) => b.expense_date.localeCompare(a.expense_date));
    const totalAmount = expenses.reduce((s, e) => s + e.amount, 0);

    return { expenses, total: expenses.length, totalAmount };
  },

  async getExpenseCategories() {
    const expenses = await localDb.expenses.toArray();
    const cats = new Set(expenses.map(e => e.category));
    return Array.from(cats);
  },

  async createExpense(data: { category: string; amount: number; description?: string; expense_date?: string }) {
    const expense: LocalExpense = {
      category: data.category,
      amount: data.amount,
      description: data.description || '',
      expense_date: data.expense_date || today(),
      created_by: 'owner',
      created_at: now()
    };
    const id = await localDb.expenses.add(expense);
    return { ...expense, id };
  },

  async updateExpense(id: number, data: { category: string; amount: number; description?: string; expense_date?: string }) {
    await localDb.expenses.update(id, data);
    const expense = await localDb.expenses.get(id);
    if (!expense) throw new Error('Expense not found');
    return expense;
  },

  async deleteExpense(id: number) {
    await localDb.expenses.delete(id);
  },

  // ===== Auth (local - simplified) =====
  async checkSetupRequired() {
    const count = await localDb.users.count();
    return count === 0;
  },

  async setup(username: string, password: string, security_question: string, security_answer: string) {
    const hash = await hashPassword(password);
    const answerHash = await hashPassword(security_answer.toLowerCase().trim());
    await localDb.users.add({
      username,
      password_hash: hash,
      role: 'owner',
      security_question,
      security_answer_hash: answerHash,
      is_active: 1,
      last_login: now(),
      created_at: now()
    });
    return { token: 'local-token', user: { id: 1, username, role: 'owner' as const } };
  },

  async login(username: string, password: string) {
    const user = await localDb.users.where('username').equals(username).first();
    if (!user) throw new Error('Invalid credentials');
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) throw new Error('Invalid credentials');
    if (!user.is_active) throw new Error('Account is disabled');

    // Upgrade legacy SHA-256 hash to PBKDF2 on successful login
    if (!user.password_hash.startsWith('pbkdf2:')) {
      const upgradedHash = await hashPassword(password);
      await localDb.users.update(user.id!, { password_hash: upgradedHash });
    }

    await localDb.users.update(user.id!, { last_login: now() });
    return { token: 'local-token', refreshToken: 'local-refresh', user: { id: user.id!, username: user.username, role: user.role } };
  },

  async getUsers() {
    const users = await localDb.users.toArray();
    return users.map(u => ({
      id: u.id!,
      username: u.username,
      role: u.role,
      is_active: u.is_active,
      last_login: u.last_login,
      created_at: u.created_at
    }));
  },

  async createUser(data: { username: string; password: string; role: string; security_question?: string; security_answer?: string }) {
    const hash = await hashPassword(data.password);
    const answerHash = data.security_answer ? await hashPassword(data.security_answer.toLowerCase().trim()) : '';
    const id = await localDb.users.add({
      username: data.username,
      password_hash: hash,
      role: data.role as 'owner' | 'manager',
      security_question: data.security_question || '',
      security_answer_hash: answerHash,
      is_active: 1,
      last_login: '',
      created_at: now()
    });
    return { id, username: data.username, role: data.role };
  },

  async updateUser(id: number, data: { role?: string; is_active?: boolean; password?: string }) {
    const updates: any = {};
    if (data.role) updates.role = data.role;
    if (data.is_active !== undefined) updates.is_active = data.is_active ? 1 : 0;
    if (data.password) updates.password_hash = await hashPassword(data.password);
    await localDb.users.update(id, updates);
    return { success: true };
  },

  async deleteUser(id: number) {
    await localDb.users.delete(id);
  },

  async changePassword(current_password: string, new_password: string) {
    const users = await localDb.users.toArray();
    let matchedUser = null;
    for (const u of users) {
      if (await verifyPassword(current_password, u.password_hash)) {
        matchedUser = u;
        break;
      }
    }
    if (!matchedUser) throw new Error('Current password is incorrect');
    const newHash = await hashPassword(new_password);
    await localDb.users.update(matchedUser.id!, { password_hash: newHash });
    return { success: true };
  },

  async forgotPassword(username: string, security_answer?: string, new_password?: string) {
    const user = await localDb.users.where('username').equals(username).first();
    if (!user) throw new Error('User not found');

    if (!security_answer) {
      return { security_question: user.security_question };
    }

    const answerValid = await verifyPassword(security_answer.toLowerCase().trim(), user.security_answer_hash);
    if (!answerValid) {
      throw new Error('Security answer is incorrect');
    }

    if (new_password) {
      const newHash = await hashPassword(new_password);
      await localDb.users.update(user.id!, { password_hash: newHash });
      return { success: true, message: 'Password reset successfully' };
    }

    return { verified: true };
  },

  // ===== Backup =====
  async createBackup() {
    const data = {
      version: 1,
      timestamp: now(),
      items: await localDb.items.toArray(),
      categories: await localDb.categories.toArray(),
      customers: await localDb.customers.toArray(),
      purchases: await localDb.purchases.toArray(),
      bills: await localDb.bills.toArray(),
      billItems: await localDb.billItems.toArray(),
      payments: await localDb.payments.toArray(),
      expenses: await localDb.expenses.toArray(),
      users: await localDb.users.toArray()
    };

    // Save as downloadable file
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `backup_${today()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);

    return { message: 'Backup created and downloaded' };
  },

  async restoreBackup(data: any) {
    let restored = 0;

    if (data.items) { await localDb.items.clear(); await localDb.items.bulkAdd(data.items); restored += data.items.length; }
    if (data.categories) { await localDb.categories.clear(); await localDb.categories.bulkAdd(data.categories); restored += data.categories.length; }
    if (data.customers) { await localDb.customers.clear(); await localDb.customers.bulkAdd(data.customers); restored += data.customers.length; }
    if (data.purchases) { await localDb.purchases.clear(); await localDb.purchases.bulkAdd(data.purchases); restored += data.purchases.length; }
    if (data.bills) { await localDb.bills.clear(); await localDb.bills.bulkAdd(data.bills); restored += data.bills.length; }
    if (data.billItems) { await localDb.billItems.clear(); await localDb.billItems.bulkAdd(data.billItems); restored += data.billItems.length; }
    if (data.payments) { await localDb.payments.clear(); await localDb.payments.bulkAdd(data.payments); restored += data.payments.length; }
    if (data.expenses) { await localDb.expenses.clear(); await localDb.expenses.bulkAdd(data.expenses); restored += data.expenses.length; }
    if (data.users) { await localDb.users.clear(); await localDb.users.bulkAdd(data.users); restored += data.users.length; }

    return { message: 'Backup restored successfully', restored };
  },

  // ===== Excel (client-side parsing with exceljs) =====
  async parseExcel(file: File): Promise<{ headers: string[]; rows: any[]; total_rows: number }> {
    const buffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.worksheets[0];

    const headers: string[] = [];
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      headers[colNumber - 1] = String(cell.value ?? '');
    });

    const rows: any[] = [];
    for (let i = 2; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);
      const rowData: any = {};
      for (let j = 0; j < headers.length; j++) {
        rowData[headers[j]] = row.getCell(j + 1).value ?? '';
      }
      rows.push(rowData);
    }

    return {
      headers,
      rows: rows.slice(0, 100),
      total_rows: rows.length
    };
  },

  async getSourceFiles(): Promise<{ files: { name: string; size: number; modified: string }[] }> {
    return { files: [] };
  },

  async parseSourceFile(_filename: string): Promise<{ headers: string[]; rows: any[]; total_rows: number }> {
    throw new Error('Source file parsing is not available in local mode. Please upload a file directly.');
  },

  getTemplateCsvUrl() { return 'local://template'; },
  getExportCsvUrl() { return 'local://export'; },

  async downloadWithAuth(url: string, filename: string) {
    let csv = '';

    if (url === 'local://template' || url.includes('template')) {
      // Generate template CSV with headers and example row
      const headers = ['id', 'sku_id', 'item_name', 'package_quantity_grams', 'purchase_cost', 'selling_price', 'mrp', 'packaging_style'];
      const exampleRow = ['', 'SKU-0001', 'Example Item', '100', '50', '80', '100', 'packet'];
      csv = [headers.join(','), exampleRow.join(',')].join('\n');
    } else {
      // Export current items as CSV
      const items = await localDb.items.toArray();
      const headers = ['id', 'sku_id', 'item_name', 'package_quantity_grams', 'purchase_cost', 'selling_price', 'mrp', 'packaging_style', 'packets_per_bundle', 'bundle_weight_grams'];
      const csvRows = items.map(i => headers.map(h => {
        const val = (i as any)[h] ?? '';
        const str = String(val);
        return str.includes(',') ? `"${str}"` : str;
      }).join(','));
      csv = [headers.join(','), ...csvRows].join('\n');
    }

    const finalFilename = filename || 'download.csv';

    // Use Capacitor Filesystem on mobile
    if ((window as any).Capacitor?.isNativePlatform?.()) {
      // Use Directory.External — always works without permissions on all Android versions
      // Files are stored at: /storage/emulated/0/Android/data/com.jalanjyothi.crm/files/
      try {
        // Create Jalan Jyothi folder
        await Filesystem.mkdir({
          path: 'Jalan Jyothi',
          directory: Directory.External,
          recursive: true
        }).catch(() => {}); // ignore if exists

        // Write file
        const result = await Filesystem.writeFile({
          path: `Jalan Jyothi/${finalFilename}`,
          data: csv,
          directory: Directory.External,
          encoding: Encoding.UTF8
        });

        // Bonus: also try to write to public Downloads (may work on some devices)
        try {
          const permStatus = await Filesystem.checkPermissions();
          if (permStatus.publicStorage === 'granted') {
            await Filesystem.mkdir({
              path: 'Download/Jalan Jyothi',
              directory: Directory.ExternalStorage,
              recursive: true
            }).catch(() => {});
            await Filesystem.writeFile({
              path: `Download/Jalan Jyothi/${finalFilename}`,
              data: csv,
              directory: Directory.ExternalStorage,
              encoding: Encoding.UTF8
            });
          }
        } catch (_e) {
          // Public downloads not available, that's fine - External write succeeded
        }

        console.log('[Download] File saved:', result.uri);
        return;
      } catch (err: any) {
        console.error('[Download] Failed:', err);
        throw new Error(`Failed to save file: ${err.message || 'Unknown error'}`);
      }
    } else {
      // Web fallback: blob download
      const blob = new Blob([csv], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = finalFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    }
  }
};
