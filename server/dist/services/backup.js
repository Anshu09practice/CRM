"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportBackup = exportBackup;
exports.restoreBackup = restoreBackup;
exports.scheduleDailyBackup = scheduleDailyBackup;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const node_cron_1 = __importDefault(require("node-cron"));
const db_1 = require("../db");
const BACKUP_DIR = path_1.default.join(db_1.DATA_DIR, '..', 'backups');
// Ensure backup directory exists
if (!fs_1.default.existsSync(BACKUP_DIR)) {
    fs_1.default.mkdirSync(BACKUP_DIR, { recursive: true });
}
/**
 * Export the entire database to a JSON file
 */
function exportBackup() {
    const items = (0, db_1.queryAll)('SELECT * FROM items ORDER BY id');
    const backup = {
        version: '1.0.0',
        exported_at: new Date().toISOString(),
        tables: {
            items
        }
    };
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `backup_${timestamp}.json`;
    const filepath = path_1.default.join(BACKUP_DIR, filename);
    fs_1.default.writeFileSync(filepath, JSON.stringify(backup, null, 2), 'utf-8');
    console.log(`[Backup] Created: ${filename}`);
    // Clean up old backups (keep last 30)
    cleanOldBackups(30);
    return filepath;
}
/**
 * Remove backups older than the retention count
 */
function cleanOldBackups(keepCount) {
    const files = fs_1.default.readdirSync(BACKUP_DIR)
        .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
        .sort()
        .reverse();
    if (files.length > keepCount) {
        const toDelete = files.slice(keepCount);
        for (const file of toDelete) {
            fs_1.default.unlinkSync(path_1.default.join(BACKUP_DIR, file));
            console.log(`[Backup] Removed old backup: ${file}`);
        }
    }
}
/**
 * Restore database from a JSON backup file
 */
function restoreBackup(jsonData) {
    const errors = [];
    let restored = 0;
    if (!jsonData.tables || !jsonData.tables.items) {
        throw new Error('Invalid backup format: missing tables.items');
    }
    // Clear existing data
    (0, db_1.runQuery)('DELETE FROM items');
    // Restore items
    for (const item of jsonData.tables.items) {
        try {
            (0, db_1.runQuery)(`INSERT INTO items (id, item_name, package_quantity_grams, purchase_cost, selling_price, mrp, packaging_style, packets_per_bundle, bundle_weight_grams, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                item.id, item.item_name, item.package_quantity_grams,
                item.purchase_cost, item.selling_price, item.mrp,
                item.packaging_style, item.packets_per_bundle, item.bundle_weight_grams,
                item.created_at, item.updated_at
            ]);
            restored++;
        }
        catch (err) {
            errors.push(`Failed to restore item ${item.id}: ${err.message}`);
        }
    }
    return { restored, errors };
}
/**
 * Schedule daily backup at midnight
 */
function scheduleDailyBackup() {
    // Run daily at 00:00
    node_cron_1.default.schedule('0 0 * * *', () => {
        console.log('[Backup] Running scheduled daily backup...');
        try {
            exportBackup();
        }
        catch (err) {
            console.error('[Backup] Scheduled backup failed:', err);
        }
    });
    console.log('[Backup] Daily backup scheduled at midnight');
}
//# sourceMappingURL=backup.js.map