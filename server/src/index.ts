import express from 'express';
import cors from 'cors';
import path from 'path';
import os from 'os';
import https from 'https';
import fs from 'fs';
import { initDatabase } from './db';
import itemsRouter from './routes/items';
import excelRouter from './routes/excel';
import backupRouter from './routes/backup';
import purchasesRouter from './routes/purchases';
import billsRouter from './routes/bills';
import authRouter from './routes/auth';
import categoriesRouter from './routes/categories';
import customersRouter from './routes/customers';
import expensesRouter from './routes/expenses';
import dashboardRouter from './routes/dashboard';
import { authMiddleware } from './middleware/auth';
import { scheduleDailyBackup } from './services/backup';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Public routes (no auth required)
app.use('/api/auth', authRouter);

// Protected routes (require valid JWT)
app.use('/api/items', authMiddleware, itemsRouter);
app.use('/api/purchases', authMiddleware, purchasesRouter);
app.use('/api/bills', authMiddleware, billsRouter);
app.use('/api/categories', authMiddleware, categoriesRouter);
app.use('/api/customers', authMiddleware, customersRouter);
app.use('/api/expenses', authMiddleware, expensesRouter);
app.use('/api/dashboard', authMiddleware, dashboardRouter);
app.use('/api/excel', authMiddleware, excelRouter);
app.use('/api/backup', authMiddleware, backupRouter);

// Serve static client build in production
const clientBuild = path.join(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientBuild));

// SPA fallback - serve index.html for non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(clientBuild, 'index.html'));
  }
});

// Get local network IP
function getLocalIP(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Start server (async to init database)
function start() {
  initDatabase();

  // Load SSL certificates
  const certDir = path.join(__dirname, '..', 'certs');
  const keyPath = path.join(certDir, 'key.pem');
  const certPath = path.join(certDir, 'cert.pem');

  const localIP = getLocalIP();

  // Support HTTP mode for cloud deployment (behind reverse proxy)
  if (process.env.HTTP_MODE === 'true' || (!fs.existsSync(keyPath) && process.env.NO_SSL === 'true')) {
    app.listen(Number(PORT), '0.0.0.0', () => {
      console.log('\n=========================================');
      console.log('   Jalan Jyothi CRM - Server Ready (HTTP)');
      console.log('=========================================');
      console.log(`   Local:   http://localhost:${PORT}`);
      console.log(`   Network: http://${localIP}:${PORT}`);
      console.log('=========================================');
      console.log('   ⚠️  Running in HTTP mode (use reverse proxy for HTTPS in production)');
      console.log('=========================================\n');
      scheduleDailyBackup();
    });
    return;
  }

  if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
    console.error('\n✗ SSL certificates not found!');
    console.error('  Run: npm run generate-cert');
    console.error('  Or set HTTP_MODE=true for HTTP (cloud deployment behind proxy)');
    process.exit(1);
  }

  const options = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
  };

  const server = https.createServer(options, app).listen(Number(PORT), '0.0.0.0', () => {
    console.log('\n=========================================');
    console.log('   Jalan Jyothi CRM - Server Ready');
    console.log('=========================================');
    console.log(`   Local:   https://localhost:${PORT}`);
    console.log(`   Network: https://${localIP}:${PORT}`);
    console.log(`   (Use the Network URL on your phone)`);
    console.log('=========================================');
    console.log('   ⚠️  Note: Certificate is self-signed');
    console.log('   Accept the warning on your phone browser');
    console.log('=========================================\n');

    // Schedule daily backup
    scheduleDailyBackup();
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n  ERROR: Port ${PORT} is already in use.`);
      console.error(`  Kill the other process or set a different port: PORT=3002 npm start\n`);
    } else {
      console.error('Server error:', err);
    }
    process.exit(1);
  });
}

start();

export default app;
