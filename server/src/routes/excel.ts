import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

const router = Router();

// Configure multer for file upload
const upload = multer({
  dest: path.join(__dirname, '..', '..', 'uploads'),
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls|csv)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel and CSV files are allowed'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

// POST /api/excel/parse - Upload and parse Excel file, return preview data
router.post('/parse', upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    // Get column headers
    const headers = data.length > 0 ? Object.keys(data[0] as object) : [];

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      headers,
      rows: data.slice(0, 100), // Preview first 100 rows
      total_rows: data.length,
      sheet_name: sheetName
    });
  } catch (err: any) {
    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(400).json({ error: `Failed to parse file: ${err.message}` });
  }
});

// POST /api/excel/parse-source - Parse existing source files
router.post('/parse-source', (req: Request, res: Response) => {
  const { filename } = req.body;

  if (!filename) {
    return res.status(400).json({ error: 'Filename is required' });
  }

  // Sanitize filename to prevent path traversal
  const sanitized = path.basename(filename);
  const sourcePath = path.join(__dirname, '..', '..', '..', 'source', sanitized);

  if (!fs.existsSync(sourcePath)) {
    return res.status(404).json({ error: 'Source file not found' });
  }

  try {
    const workbook = XLSX.readFile(sourcePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    const headers = data.length > 0 ? Object.keys(data[0] as object) : [];

    res.json({
      headers,
      rows: data.slice(0, 100),
      total_rows: data.length,
      sheet_name: sheetName,
      filename: sanitized
    });
  } catch (err: any) {
    res.status(400).json({ error: `Failed to parse file: ${err.message}` });
  }
});

// GET /api/excel/source-files - List available source Excel files
router.get('/source-files', (_req: Request, res: Response) => {
  const sourceDir = path.join(__dirname, '..', '..', '..', 'source');

  if (!fs.existsSync(sourceDir)) {
    return res.json({ files: [] });
  }

  const files = fs.readdirSync(sourceDir)
    .filter(f => f.match(/\.(xlsx|xls|csv)$/i))
    .map(f => ({
      name: f,
      size: fs.statSync(path.join(sourceDir, f)).size,
      modified: fs.statSync(path.join(sourceDir, f)).mtime
    }));

  res.json({ files });
});

export default router;
