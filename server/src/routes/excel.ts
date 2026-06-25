import { Router, Request, Response } from 'express';
import multer from 'multer';
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

const router = Router();

// Helper: convert ExcelJS worksheet to JSON array (like XLSX.utils.sheet_to_json)
function worksheetToJson(worksheet: ExcelJS.Worksheet): Record<string, any>[] {
  const headers: string[] = [];
  const headerRow = worksheet.getRow(1);
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber - 1] = String(cell.value ?? '');
  });
  const colCount = headers.length;
  if (colCount === 0) return [];

  const rows: Record<string, any>[] = [];
  // Use eachRow instead of rowCount to handle files with incorrect dimension metadata
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header row
    const rowData: Record<string, any> = {};
    for (let j = 0; j < colCount; j++) {
      rowData[headers[j]] = row.getCell(j + 1).value ?? '';
    }
    rows.push(rowData);
  });
  return rows;
}

async function readWorkbook(filePath: string): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  if (filePath.toLowerCase().endsWith('.csv')) {
    await workbook.csv.readFile(filePath);
  } else {
    await workbook.xlsx.readFile(filePath);
  }
  return workbook;
}

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
router.post('/parse', upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const workbook = await readWorkbook(req.file.path);
    const worksheet = workbook.worksheets[0];
    const sheetName = worksheet.name;
    const data = worksheetToJson(worksheet);

    // Get column headers
    const headers = data.length > 0 ? Object.keys(data[0]) : [];

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
router.post('/parse-source', async (req: Request, res: Response) => {
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
    const workbook = await readWorkbook(sourcePath);
    const worksheet = workbook.worksheets[0];
    const sheetName = worksheet.name;
    const data = worksheetToJson(worksheet);

    const headers = data.length > 0 ? Object.keys(data[0]) : [];

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
