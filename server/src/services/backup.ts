import fs from 'fs';
import path from 'path';
import cron from 'node-cron';
import { queryAll, runQuery, runTransaction, DATA_DIR } from '../db';

const BACKUP_DIR = path.join(DATA_DIR, '..', 'backups');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * Export the entire database to a JSON file
 */
export function exportBackup(): string {
  const items = queryAll('SELECT * FROM items ORDER BY id');

  const backup = {
    version: '1.0.0',
    exported_at: new Date().toISOString(),
    tables: {
      items
    }
  };

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `backup_${timestamp}.json`;
  const filepath = path.join(BACKUP_DIR, filename);

  fs.writeFileSync(filepath, JSON.stringify(backup, null, 2), 'utf-8');
  console.log(`[Backup] Created: ${filename}`);

  // Clean up old backups (keep last 30)
  cleanOldBackups(30);

  return filepath;
}

/**
 * Remove backups older than the retention count
 */
function cleanOldBackups(keepCount: number) {
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
    .sort()
    .reverse();

  if (files.length > keepCount) {
    const toDelete = files.slice(keepCount);
    for (const file of toDelete) {
      fs.unlinkSync(path.join(BACKUP_DIR, file));
      console.log(`[Backup] Removed old backup: ${file}`);
    }
  }
}

/**
 * Restore database from a JSON backup file
 * Supports both formats:
 *   - Legacy server format: { tables: { items: [...] } }
 *   - Client master backup format: { data: { items, categories, customers, purchases, bills, expenses } }
 */
export function restoreBackup(jsonData: any): { restored: number; errors: string[] } {
  const errors: string[] = [];
  let restored = 0;

  // Determine format
  const data = jsonData.data || jsonData.tables;
  if (!data) {
    throw new Error('Invalid backup format: missing "data" or "tables" key');
  }

  // Must have at least items
  if (!data.items || !Array.isArray(data.items)) {
    throw new Error('Invalid backup format: missing items array');
  }

  // Run everything in a transaction for atomicity
  runTransaction(() => {
    // Clear tables in correct order (respect foreign keys)
    runQuery('DELETE FROM bill_items');
    runQuery('DELETE FROM payments');
    runQuery('DELETE FROM credit_notes');
    runQuery('DELETE FROM bills');
    runQuery('DELETE FROM purchases');
    runQuery('DELETE FROM expenses');
    runQuery('DELETE FROM items');
    runQuery('DELETE FROM categories');
    runQuery('DELETE FROM customers');

    // Restore categories
    if (data.categories && Array.isArray(data.categories)) {
      for (const cat of data.categories) {
        try {
          runQuery(
            `INSERT INTO categories (id, name, description, created_at) VALUES (?, ?, ?, ?)`,
            [cat.id, cat.name, cat.description || '', cat.created_at || new Date().toISOString()]
          );
          restored++;
        } catch (err: any) {
          errors.push(`Category ${cat.id}: ${err.message}`);
        }
      }
    }

    // Restore customers
    if (data.customers && Array.isArray(data.customers)) {
      for (const cust of data.customers) {
        try {
          runQuery(
            `INSERT INTO customers (id, name, phone, address, credit_balance, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [cust.id, cust.name, cust.phone || '', cust.address || '', cust.credit_balance || 0, cust.notes || '', cust.created_at || new Date().toISOString(), cust.updated_at || new Date().toISOString()]
          );
          restored++;
        } catch (err: any) {
          errors.push(`Customer ${cust.id}: ${err.message}`);
        }
      }
    }

    // Restore items
    for (const item of data.items) {
      try {
        runQuery(
          `INSERT INTO items (id, item_name, package_quantity_grams, purchase_cost, selling_price, mrp, packaging_style, packets_per_bundle, bundle_weight_grams, created_at, updated_at, category_id, current_stock, low_stock_threshold, default_tax_percent, sku_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.id, item.item_name, item.package_quantity_grams,
            item.purchase_cost, item.selling_price, item.mrp || 0,
            item.packaging_style, item.packets_per_bundle, item.bundle_weight_grams,
            item.created_at, item.updated_at,
            item.category_id || null, item.current_stock || 0,
            item.low_stock_threshold || 10, item.default_tax_percent || 0,
            item.sku_id || null
          ]
        );
        restored++;
      } catch (err: any) {
        errors.push(`Item ${item.id}: ${err.message}`);
      }
    }

    // Restore purchases
    if (data.purchases && Array.isArray(data.purchases)) {
      for (const p of data.purchases) {
        try {
          runQuery(
            `INSERT INTO purchases (id, item_id, item_name, quantity, package_quantity_grams, purchase_cost, total_cost, packaging_style, purchase_date, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [p.id, p.item_id, p.item_name, p.quantity, p.package_quantity_grams, p.purchase_cost, p.total_cost, p.packaging_style, p.purchase_date, p.notes || '', p.created_at || new Date().toISOString()]
          );
          restored++;
        } catch (err: any) {
          errors.push(`Purchase ${p.id}: ${err.message}`);
        }
      }
    }

    // Restore bills
    if (data.bills && Array.isArray(data.bills)) {
      for (const b of data.bills) {
        try {
          runQuery(
            `INSERT INTO bills (id, bill_number, customer_name, customer_phone, customer_address, subtotal, discount_percent, discount_amount, total, bill_date, notes, whatsapp_sent, created_at, customer_id, tax_percent, cgst_amount, sgst_amount, tax_total, payment_status, amount_paid, transaction_ref, currency_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [b.id, b.bill_number, b.customer_name, b.customer_phone || '', b.customer_address || '', b.subtotal || 0, b.discount_percent || 0, b.discount_amount || 0, b.total || 0, b.bill_date, b.notes || '', b.whatsapp_sent || 0, b.created_at || new Date().toISOString(), b.customer_id || null, b.tax_percent || 0, b.cgst_amount || 0, b.sgst_amount || 0, b.tax_total || 0, b.payment_status || 'pending', b.amount_paid || 0, b.transaction_ref || null, b.currency_code || 'INR']
          );
          restored++;
        } catch (err: any) {
          errors.push(`Bill ${b.id}: ${err.message}`);
        }
      }
    }

    // Restore bill items
    if (data.billItems && Array.isArray(data.billItems)) {
      for (const bi of data.billItems) {
        try {
          runQuery(
            `INSERT INTO bill_items (id, bill_id, item_id, item_name, quantity, package_quantity_grams, selling_price, line_total) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [bi.id, bi.bill_id, bi.item_id, bi.item_name, bi.quantity, bi.package_quantity_grams, bi.selling_price, bi.line_total]
          );
          restored++;
        } catch (err: any) {
          errors.push(`BillItem ${bi.id}: ${err.message}`);
        }
      }
    }

    // Restore payments
    if (data.payments && Array.isArray(data.payments)) {
      for (const pay of data.payments) {
        try {
          runQuery(
            `INSERT INTO payments (id, bill_id, amount, payment_method, payment_date, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [pay.id, pay.bill_id, pay.amount, pay.payment_method || 'cash', pay.payment_date, pay.notes || '', pay.created_at || new Date().toISOString()]
          );
          restored++;
        } catch (err: any) {
          errors.push(`Payment ${pay.id}: ${err.message}`);
        }
      }
    }

    // Restore expenses
    if (data.expenses && Array.isArray(data.expenses)) {
      for (const exp of data.expenses) {
        try {
          runQuery(
            `INSERT INTO expenses (id, category, amount, description, expense_date, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [exp.id, exp.category || 'general', exp.amount, exp.description || '', exp.expense_date, exp.created_by || '', exp.created_at || new Date().toISOString()]
          );
          restored++;
        } catch (err: any) {
          errors.push(`Expense ${exp.id}: ${err.message}`);
        }
      }
    }
  });

  return { restored, errors };
}

/**
 * Schedule daily backup at midnight
 */
export function scheduleDailyBackup() {
  // Run daily at 00:00
  cron.schedule('0 0 * * *', () => {
    console.log('[Backup] Running scheduled daily backup...');
    try {
      exportBackup();
    } catch (err) {
      console.error('[Backup] Scheduled backup failed:', err);
    }
  });

  console.log('[Backup] Daily backup scheduled at midnight');
}
