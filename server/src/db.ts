import initSqlJs, { Database } from 'sql.js';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'jalan_jyothi.db');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let db: Database;

/**
 * Initialize the database. Must be called before using the db.
 */
export async function initDatabase(): Promise<Database> {
  const SQL = await initSqlJs();

  // Load existing database file if it exists
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');

  // Initialize schema
  db.run(`
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
    )
  `);

  db.run('CREATE INDEX IF NOT EXISTS idx_items_name ON items(item_name)');
  db.run('CREATE INDEX IF NOT EXISTS idx_items_packaging ON items(packaging_style)');

  // Users table for authentication
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Purchases table
  db.run(`
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
    )
  `);

  db.run('CREATE INDEX IF NOT EXISTS idx_purchases_item ON purchases(item_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(purchase_date)');

  // Bills table
  db.run(`
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
    )
  `);

  // Bill items (line items)
  db.run(`
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
    )
  `);

  db.run('CREATE INDEX IF NOT EXISTS idx_bills_date ON bills(bill_date)');
  db.run('CREATE INDEX IF NOT EXISTS idx_bills_customer ON bills(customer_name)');
  db.run('CREATE INDEX IF NOT EXISTS idx_bill_items_bill ON bill_items(bill_id)');

  // Save to disk
  saveDatabase();

  return db;
}

/**
 * Persist the database to disk
 */
export function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

/**
 * Get the database instance
 */
export function getDb(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Run a query that modifies data (INSERT, UPDATE, DELETE)
 * Returns { changes, lastInsertRowid }
 */
export function runQuery(sql: string, params: any[] = []) {
  const database = getDb();
  database.run(sql, params);
  const result = database.exec('SELECT changes() as changes, last_insert_rowid() as lastId');
  saveDatabase();
  return {
    changes: result[0]?.values[0]?.[0] as number || 0,
    lastInsertRowid: result[0]?.values[0]?.[1] as number || 0
  };
}

/**
 * Run a SELECT query and return results as array of objects
 */
export function queryAll(sql: string, params: any[] = []): any[] {
  const database = getDb();
  const stmt = database.prepare(sql);
  if (params.length > 0) {
    stmt.bind(params);
  }

  const results: any[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

/**
 * Run a SELECT query and return the first result as an object
 */
export function queryOne(sql: string, params: any[] = []): any | null {
  const results = queryAll(sql, params);
  return results[0] || null;
}

export { DB_PATH, DATA_DIR };
export default { initDatabase, getDb, runQuery, queryAll, queryOne, saveDatabase };
