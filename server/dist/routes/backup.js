"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const backup_1 = require("../services/backup");
const router = (0, express_1.Router)();
// POST /api/backup/export - Trigger manual backup
router.post('/export', (_req, res) => {
    try {
        const filepath = (0, backup_1.exportBackup)();
        res.json({ message: 'Backup created successfully', filepath });
    }
    catch (err) {
        res.status(500).json({ error: `Backup failed: ${err.message}` });
    }
});
// POST /api/backup/restore - Restore from uploaded JSON
router.post('/restore', (req, res) => {
    try {
        const result = (0, backup_1.restoreBackup)(req.body);
        res.json({ message: `Restored ${result.restored} items`, ...result });
    }
    catch (err) {
        res.status(400).json({ error: `Restore failed: ${err.message}` });
    }
});
// GET /api/backup/download - Download current data as JSON
router.get('/download', (_req, res) => {
    try {
        const filepath = (0, backup_1.exportBackup)();
        res.download(filepath);
    }
    catch (err) {
        res.status(500).json({ error: `Export failed: ${err.message}` });
    }
});
exports.default = router;
//# sourceMappingURL=backup.js.map