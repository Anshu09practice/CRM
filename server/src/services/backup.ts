import fs from 'fs';
import path from 'path';
import cron from 'node-cron';
import { queryAll, runQuery, DATA_DIR } from '../db';

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
 */
export function restoreBackup(jsonData: any): { restored: number; errors: string[] } {
  const errors: string[] = [];
  let restored = 0;

  if (!jsonData.tables || !jsonData.tables.items) {
    throw new Error('Invalid backup format: missing tables.items');
  }

  // Clear existing data
  runQuery('DELETE FROM items');

  // Restore items
  for (const item of jsonData.tables.items) {
    try {
      runQuery(
        `INSERT INTO items (id, item_name, package_quantity_grams, purchase_cost, selling_price, mrp, packaging_style, packets_per_bundle, bundle_weight_grams, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id, item.item_name, item.package_quantity_grams,
          item.purchase_cost, item.selling_price, item.mrp,
          item.packaging_style, item.packets_per_bundle, item.bundle_weight_grams,
          item.created_at, item.updated_at
        ]
      );
      restored++;
    } catch (err: any) {
      errors.push(`Failed to restore item ${item.id}: ${err.message}`);
    }
  }

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
