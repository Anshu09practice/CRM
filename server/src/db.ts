import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'jalan_jyothi.db');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let db: Database.Database;

/**
 * Initialize the database with better-sqlite3 (synchronous, disk-based).
 */
export function initDatabase(): Database.Database {
  db = new Database(DB_PATH);

  // Enable WAL mode for better concurrent read performance
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Run migrations
  runMigrations();

  return db;
}

/**
 * Get the database instance
 */
export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Run a query that modifies data (INSERT, UPDATE, DELETE)
 */
export function runQuery(sql: string, params: any[] = []) {
  const database = getDb();
  const stmt = database.prepare(sql);
  const result = stmt.run(...params);
  return {
    changes: result.changes,
    lastInsertRowid: result.lastInsertRowid as number
  };
}

/**
 * Run a SELECT query and return results as array of objects
 */
export function queryAll(sql: string, params: any[] = []): any[] {
  const database = getDb();
  const stmt = database.prepare(sql);
  return stmt.all(...params);
}

/**
 * Run a SELECT query and return the first result as an object
 */
export function queryOne(sql: string, params: any[] = []): any | null {
  const database = getDb();
  const stmt = database.prepare(sql);
  return stmt.get(...params) || null;
}

/**
 * Run multiple statements in a transaction (atomic)
 */
export function runTransaction(fn: () => void) {
  const database = getDb();
  const transaction = database.transaction(fn);
  transaction();
}

/**
 * Migration system
 */
function runMigrations() {
  const database = getDb();

  // Create migrations tracking table
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version INTEGER NOT NULL UNIQUE,
      name TEXT NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const applied = database.prepare('SELECT version FROM schema_migrations ORDER BY version').all() as { version: number }[];
  const appliedVersions = new Set(applied.map(r => r.version));

  for (const migration of migrations) {
    if (!appliedVersions.has(migration.version)) {
      console.log(`  Applying migration ${migration.version}: ${migration.name}`);
      const applyMigration = database.transaction(() => {
        database.exec(migration.sql);
        database.prepare('INSERT INTO schema_migrations (version, name) VALUES (?, ?)').run(migration.version, migration.name);
      });
      applyMigration();
    }
  }
}

interface Migration {
  version: number;
  name: string;
  sql: string;
}

const migrations: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    sql: `
      CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_name TEXT NOT NULL,
        package_quantity_grams INTEGER NOT NULL DEFAULT 0,
        purchase_cost REAL NOT NULL DEFAULT 0,
        selling_price REAL NOT NULL DEFAULT 0,
        mrp REAL NOT NULL DEFAULT 0,
        packaging_style TEXT NOT NULL DEFAULT 'packet' CHECK(packaging_style IN ('packet', 'standing_package')),
        packets_per_bundle INTEGER NOT NULL DEFAULT 0,
        bundle_weight_grams INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_items_name ON items(item_name);
      CREATE INDEX IF NOT EXISTS idx_items_packaging ON items(packaging_style);

      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS purchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id INTEGER NOT NULL,
        item_name TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        package_quantity_grams INTEGER NOT NULL DEFAULT 0,
        purchase_cost REAL NOT NULL DEFAULT 0,
        total_cost REAL NOT NULL DEFAULT 0,
        packaging_style TEXT NOT NULL DEFAULT 'packet',
        purchase_date TEXT NOT NULL DEFAULT (date('now')),
        notes TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (item_id) REFERENCES items(id)
      );

      CREATE INDEX IF NOT EXISTS idx_purchases_item ON purchases(item_id);
      CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(purchase_date);

      CREATE TABLE IF NOT EXISTS bills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bill_number TEXT NOT NULL UNIQUE,
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL DEFAULT '',
        customer_address TEXT NOT NULL DEFAULT '',
        subtotal REAL NOT NULL DEFAULT 0,
        discount_percent REAL NOT NULL DEFAULT 0,
        discount_amount REAL NOT NULL DEFAULT 0,
        total REAL NOT NULL DEFAULT 0,
        bill_date TEXT NOT NULL DEFAULT (date('now')),
        notes TEXT DEFAULT '',
        whatsapp_sent INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS bill_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bill_id INTEGER NOT NULL,
        item_id INTEGER NOT NULL,
        item_name TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        package_quantity_grams INTEGER NOT NULL DEFAULT 0,
        selling_price REAL NOT NULL DEFAULT 0,
        line_total REAL NOT NULL DEFAULT 0,
        FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
        FOREIGN KEY (item_id) REFERENCES items(id)
      );

      CREATE INDEX IF NOT EXISTS idx_bills_date ON bills(bill_date);
      CREATE INDEX IF NOT EXISTS idx_bills_customer ON bills(customer_name);
      CREATE INDEX IF NOT EXISTS idx_bill_items_bill ON bill_items(bill_id);
    `
  },
  {
    version: 2,
    name: 'roles_and_security_questions',
    sql: `
      ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'owner' CHECK(role IN ('owner', 'manager'));
      ALTER TABLE users ADD COLUMN security_question TEXT DEFAULT '';
      ALTER TABLE users ADD COLUMN security_answer_hash TEXT DEFAULT '';
      ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;
      ALTER TABLE users ADD COLUMN last_login DATETIME;
    `
  },
  {
    version: 3,
    name: 'categories',
    sql: `
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE items ADD COLUMN category_id INTEGER REFERENCES categories(id);
      CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_id);

      INSERT OR IGNORE INTO categories (name) VALUES ('Sugar');
      INSERT OR IGNORE INTO categories (name) VALUES ('Spices');
      INSERT OR IGNORE INTO categories (name) VALUES ('Dry Fruit');
      INSERT OR IGNORE INTO categories (name) VALUES ('Super Food');
    `
  },
  {
    version: 4,
    name: 'customers',
    sql: `
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT DEFAULT '',
        address TEXT DEFAULT '',
        credit_balance REAL NOT NULL DEFAULT 0,
        notes TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
      CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

      ALTER TABLE bills ADD COLUMN customer_id INTEGER REFERENCES customers(id);
    `
  },
  {
    version: 5,
    name: 'stock_tracking',
    sql: `
      ALTER TABLE items ADD COLUMN current_stock INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE items ADD COLUMN low_stock_threshold INTEGER NOT NULL DEFAULT 10;
    `
  },
  {
    version: 6,
    name: 'billing_enhancements',
    sql: `
      ALTER TABLE items ADD COLUMN default_tax_percent REAL NOT NULL DEFAULT 0;

      ALTER TABLE bills ADD COLUMN tax_percent REAL NOT NULL DEFAULT 0;
      ALTER TABLE bills ADD COLUMN cgst_amount REAL NOT NULL DEFAULT 0;
      ALTER TABLE bills ADD COLUMN sgst_amount REAL NOT NULL DEFAULT 0;
      ALTER TABLE bills ADD COLUMN tax_total REAL NOT NULL DEFAULT 0;
      ALTER TABLE bills ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'pending' CHECK(payment_status IN ('pending', 'partial', 'paid', 'overdue'));
      ALTER TABLE bills ADD COLUMN amount_paid REAL NOT NULL DEFAULT 0;

      CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bill_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        payment_method TEXT NOT NULL DEFAULT 'cash' CHECK(payment_method IN ('cash', 'upi', 'card', 'credit')),
        payment_date TEXT NOT NULL DEFAULT (date('now')),
        notes TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_payments_bill ON payments(bill_id);
    `
  },
  {
    version: 7,
    name: 'expenses',
    sql: `
      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL DEFAULT 'general',
        amount REAL NOT NULL,
        description TEXT DEFAULT '',
        expense_date TEXT NOT NULL DEFAULT (date('now')),
        created_by TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
      CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
    `
  },
  {
    version: 8,
    name: 'credit_notes',
    sql: `
      CREATE TABLE IF NOT EXISTS credit_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bill_id INTEGER,
        customer_id INTEGER,
        amount REAL NOT NULL,
        reason TEXT DEFAULT '',
        type TEXT NOT NULL DEFAULT 'credit' CHECK(type IN ('credit', 'debit')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bill_id) REFERENCES bills(id),
        FOREIGN KEY (customer_id) REFERENCES customers(id)
      );
    `
  },
  {
    version: 9,
    name: 'backfill_stock',
    sql: `
      UPDATE items SET current_stock = (
        COALESCE((SELECT SUM(quantity) FROM purchases WHERE purchases.item_id = items.id), 0) -
        COALESCE((SELECT SUM(quantity) FROM bill_items WHERE bill_items.item_id = items.id), 0)
      );
    `
  },
  {
    version: 10,
    name: 'add_sku_id',
    sql: `
      ALTER TABLE items ADD COLUMN sku_id TEXT DEFAULT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_items_sku ON items(sku_id) WHERE sku_id IS NOT NULL;
    `
  }
];

export { DB_PATH, DATA_DIR };
export default { initDatabase, getDb, runQuery, queryAll, queryOne, runTransaction };
