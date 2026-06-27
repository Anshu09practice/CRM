"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const exceljs_1 = __importDefault(require("exceljs"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const router = (0, express_1.Router)();
// Helper: convert ExcelJS worksheet to JSON array (like XLSX.utils.sheet_to_json)
function worksheetToJson(worksheet) {
    const headers = [];
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        headers[colNumber - 1] = String(cell.value ?? '');
    });
    const colCount = headers.length;
    if (colCount === 0)
        return [];
    const rows = [];
    // Use eachRow instead of rowCount to handle files with incorrect dimension metadata
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber === 1)
            return; // Skip header row
        const rowData = {};
        for (let j = 0; j < colCount; j++) {
            rowData[headers[j]] = row.getCell(j + 1).value ?? '';
        }
        rows.push(rowData);
    });
    return rows;
}
async function readWorkbook(filePath) {
    const workbook = new exceljs_1.default.Workbook();
    if (filePath.toLowerCase().endsWith('.csv')) {
        await workbook.csv.readFile(filePath);
    }
    else {
        await workbook.xlsx.readFile(filePath);
    }
    return workbook;
}
// Configure multer for file upload
const upload = (0, multer_1.default)({
    dest: path_1.default.join(__dirname, '..', '..', 'uploads'),
    fileFilter: (_req, file, cb) => {
        const allowedTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'text/csv'
        ];
        if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls|csv)$/i)) {
            cb(null, true);
        }
        else {
            cb(new Error('Only Excel and CSV files are allowed'));
        }
    },
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});
// POST /api/excel/parse - Upload and parse Excel file, return preview data
router.post('/parse', upload.single('file'), async (req, res) => {
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
        fs_1.default.unlinkSync(req.file.path);
        res.json({
            headers,
            rows: data.slice(0, 100), // Preview first 100 rows
            total_rows: data.length,
            sheet_name: sheetName
        });
    }
    catch (err) {
        // Clean up file on error
        if (req.file && fs_1.default.existsSync(req.file.path)) {
            fs_1.default.unlinkSync(req.file.path);
        }
        res.status(400).json({ error: `Failed to parse file: ${err.message}` });
    }
});
// POST /api/excel/parse-source - Parse existing source files
router.post('/parse-source', async (req, res) => {
    const { filename } = req.body;
    if (!filename) {
        return res.status(400).json({ error: 'Filename is required' });
    }
    // Sanitize filename to prevent path traversal
    const sanitized = path_1.default.basename(filename);
    const sourcePath = path_1.default.join(__dirname, '..', '..', '..', 'source', sanitized);
    if (!fs_1.default.existsSync(sourcePath)) {
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
    }
    catch (err) {
        res.status(400).json({ error: `Failed to parse file: ${err.message}` });
    }
});
// GET /api/excel/source-files - List available source Excel files
router.get('/source-files', (_req, res) => {
    const sourceDir = path_1.default.join(__dirname, '..', '..', '..', 'source');
    if (!fs_1.default.existsSync(sourceDir)) {
        return res.json({ files: [] });
    }
    const files = fs_1.default.readdirSync(sourceDir)
        .filter(f => f.match(/\.(xlsx|xls|csv)$/i))
        .map(f => ({
        name: f,
        size: fs_1.default.statSync(path_1.default.join(sourceDir, f)).size,
        modified: fs_1.default.statSync(path_1.default.join(sourceDir, f)).mtime
    }));
    res.json({ files });
});
exports.default = router;
//# sourceMappingURL=excel.js.map