import { Router, Request, Response } from 'express';
import { exportBackup, restoreBackup } from '../services/backup';

const router = Router();

// POST /api/backup/export - Trigger manual backup
router.post('/export', (_req: Request, res: Response) => {
  try {
    const filepath = exportBackup();
    res.json({ message: 'Backup created successfully', filepath });
  } catch (err: any) {
    res.status(500).json({ error: `Backup failed: ${err.message}` });
  }
});

// POST /api/backup/restore - Restore from uploaded JSON
router.post('/restore', (req: Request, res: Response) => {
  try {
    const result = restoreBackup(req.body);
    res.json({ message: `Restored ${result.restored} items`, ...result });
  } catch (err: any) {
    res.status(400).json({ error: `Restore failed: ${err.message}` });
  }
});

// GET /api/backup/download - Download current data as JSON
router.get('/download', (_req: Request, res: Response) => {
  try {
    const filepath = exportBackup();
    res.download(filepath);
  } catch (err: any) {
    res.status(500).json({ error: `Export failed: ${err.message}` });
  }
});

export default router;
