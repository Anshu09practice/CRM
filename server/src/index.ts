import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import path from 'path';
import os from 'os';
import https from 'https';
import http from 'http';
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
import { initWebSocket } from './services/realtime';

const app = express();
const PORT = process.env.PORT || 3001;

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "https://wa.me"],
    }
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS - restrict to known origins (configure via ALLOWED_ORIGINS env var)
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'https://localhost:3001', 'capacitor://localhost', 'https://localhost'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // PCI DSS 6.5.9: No wildcard private IP access — whitelist specific origins only
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// PCI DSS 4.1: Cookie security settings
app.use(cookieParser());

// Rate limiting - general API
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requests per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});
app.use('/api', generalLimiter);

// Rate limiting - strict for auth endpoints (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/setup', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);

// Body parsing with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// PCI DSS 6.5.9: CSRF protection (double-submit cookie pattern)
app.use((req, res, next) => {
  // Skip CSRF for GET/HEAD/OPTIONS and API auth endpoints (token-based)
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    // Set CSRF token cookie on safe requests
    if (!req.cookies['_csrf']) {
      const csrfToken = crypto.randomBytes(32).toString('hex');
      res.cookie('_csrf', csrfToken, {
        httpOnly: false, // Client needs to read this
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 3600000 // 1 hour
      });
    }
    return next();
  }
  // For state-changing requests from browser (non-API mobile clients skip via no-origin)
  const origin = req.headers.origin;
  if (origin && !req.path.startsWith('/api/auth/')) {
    const cookieToken = req.cookies['_csrf'];
    const headerToken = req.headers['x-csrf-token'];
    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      return res.status(403).json({ error: 'CSRF token mismatch' });
    }
  }
  next();
});

// Health check endpoint (no auth)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// === API v1 Routes (current) ===
// Public routes (no auth required)
app.use('/api/v1/auth', authRouter);
app.use('/api/auth', authRouter); // backward compat

// Protected routes (require valid JWT)
app.use('/api/v1/items', authMiddleware, itemsRouter);
app.use('/api/v1/purchases', authMiddleware, purchasesRouter);
app.use('/api/v1/bills', authMiddleware, billsRouter);
app.use('/api/v1/categories', authMiddleware, categoriesRouter);
app.use('/api/v1/customers', authMiddleware, customersRouter);
app.use('/api/v1/expenses', authMiddleware, expensesRouter);
app.use('/api/v1/dashboard', authMiddleware, dashboardRouter);
app.use('/api/v1/excel', authMiddleware, excelRouter);
app.use('/api/v1/backup', authMiddleware, backupRouter);

// Backward-compatible routes (map /api/* to same handlers)
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

  // PCI DSS 4.1: HTTP mode ONLY allowed behind a verified reverse proxy (e.g., nginx with TLS termination)
  if (process.env.HTTP_MODE === 'true' && process.env.TRUSTED_PROXY === 'true') {
    app.set('trust proxy', 1); // Trust first proxy
    // Enforce HTTPS via Strict-Transport-Security even behind proxy
    app.use((_req, _res, next) => {
      _res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
      next();
    });
    const httpServer = http.createServer(app);
    initWebSocket(httpServer);
    httpServer.listen(Number(PORT), '127.0.0.1', () => {
      console.log('\n=========================================');
      console.log('   Jalan Jyothi CRM - Server Ready (Proxy Mode)');
      console.log('=========================================');
      console.log(`   Listening: http://127.0.0.1:${PORT} (behind TLS-terminating proxy)`);
      console.log('   ⚠️  Ensure reverse proxy enforces TLS 1.2+');
      console.log('=========================================\n');
      scheduleDailyBackup();
    });
    return;
  }

  // PCI DSS 4.1: Reject plain HTTP without proxy
  if (process.env.HTTP_MODE === 'true' && !process.env.TRUSTED_PROXY) {
    console.error('\n✗ PCI DSS VIOLATION: HTTP_MODE requires TRUSTED_PROXY=true');
    console.error('  Plain HTTP is not permitted. Use TLS or a TLS-terminating reverse proxy.');
    process.exit(1);
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

  // PCI DSS 4.1: Enforce HSTS on direct HTTPS connections
  app.use((_req, _res, next) => {
    _res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    next();
  });

  const server = https.createServer(options, app);
  initWebSocket(server);
  server.listen(Number(PORT), '0.0.0.0', () => {
    console.log('\n=========================================');
    console.log('   Jalan Jyothi CRM - Server Ready');
    console.log('=========================================');
    console.log(`   Local:   https://localhost:${PORT}`);
    console.log(`   Network: https://${localIP}:${PORT}`);
    console.log(`   (Use the Network URL on your phone)`);
    console.log('=========================================');
    console.log('   ⚠️  Note: Certificate is self-signed');
    console.log('   Accept the warning on your phone browser');
    console.log(`   WebSocket: wss://localhost:${PORT}`);
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
