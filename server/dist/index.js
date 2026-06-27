"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const crypto_1 = __importDefault(require("crypto"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const https_1 = __importDefault(require("https"));
const http_1 = __importDefault(require("http"));
const fs_1 = __importDefault(require("fs"));
const db_1 = require("./db");
const items_1 = __importDefault(require("./routes/items"));
const excel_1 = __importDefault(require("./routes/excel"));
const backup_1 = __importDefault(require("./routes/backup"));
const purchases_1 = __importDefault(require("./routes/purchases"));
const bills_1 = __importDefault(require("./routes/bills"));
const auth_1 = __importDefault(require("./routes/auth"));
const categories_1 = __importDefault(require("./routes/categories"));
const customers_1 = __importDefault(require("./routes/customers"));
const expenses_1 = __importDefault(require("./routes/expenses"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const auth_2 = require("./middleware/auth");
const backup_2 = require("./services/backup");
const realtime_1 = require("./services/realtime");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Security headers
app.use((0, helmet_1.default)({
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
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, server-to-server)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin))
            return callback(null, true);
        // PCI DSS 6.5.9: No wildcard private IP access — whitelist specific origins only
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
}));
// PCI DSS 4.1: Cookie security settings
app.use((0, cookie_parser_1.default)());
// Rate limiting - general API
const generalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // 200 requests per 15 min per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later' },
});
app.use('/api', generalLimiter);
// Rate limiting - strict for auth endpoints (brute-force protection)
const authLimiter = (0, express_rate_limit_1.default)({
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
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// PCI DSS 6.5.9: CSRF protection (double-submit cookie pattern)
app.use((req, res, next) => {
    // Skip CSRF for GET/HEAD/OPTIONS and API auth endpoints (token-based)
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        // Set CSRF token cookie on safe requests
        if (!req.cookies['_csrf']) {
            const csrfToken = crypto_1.default.randomBytes(32).toString('hex');
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
app.use('/api/v1/auth', auth_1.default);
app.use('/api/auth', auth_1.default); // backward compat
// Protected routes (require valid JWT)
app.use('/api/v1/items', auth_2.authMiddleware, items_1.default);
app.use('/api/v1/purchases', auth_2.authMiddleware, purchases_1.default);
app.use('/api/v1/bills', auth_2.authMiddleware, bills_1.default);
app.use('/api/v1/categories', auth_2.authMiddleware, categories_1.default);
app.use('/api/v1/customers', auth_2.authMiddleware, customers_1.default);
app.use('/api/v1/expenses', auth_2.authMiddleware, expenses_1.default);
app.use('/api/v1/dashboard', auth_2.authMiddleware, dashboard_1.default);
app.use('/api/v1/excel', auth_2.authMiddleware, excel_1.default);
app.use('/api/v1/backup', auth_2.authMiddleware, backup_1.default);
// Backward-compatible routes (map /api/* to same handlers)
app.use('/api/items', auth_2.authMiddleware, items_1.default);
app.use('/api/purchases', auth_2.authMiddleware, purchases_1.default);
app.use('/api/bills', auth_2.authMiddleware, bills_1.default);
app.use('/api/categories', auth_2.authMiddleware, categories_1.default);
app.use('/api/customers', auth_2.authMiddleware, customers_1.default);
app.use('/api/expenses', auth_2.authMiddleware, expenses_1.default);
app.use('/api/dashboard', auth_2.authMiddleware, dashboard_1.default);
app.use('/api/excel', auth_2.authMiddleware, excel_1.default);
app.use('/api/backup', auth_2.authMiddleware, backup_1.default);
// Serve static client build in production
const clientBuild = path_1.default.join(__dirname, '..', '..', 'client', 'dist');
app.use(express_1.default.static(clientBuild));
// SPA fallback - serve index.html for non-API routes
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path_1.default.join(clientBuild, 'index.html'));
    }
});
// Get local network IP
function getLocalIP() {
    const interfaces = os_1.default.networkInterfaces();
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
    (0, db_1.initDatabase)();
    // Load SSL certificates
    const certDir = path_1.default.join(__dirname, '..', 'certs');
    const keyPath = path_1.default.join(certDir, 'key.pem');
    const certPath = path_1.default.join(certDir, 'cert.pem');
    const localIP = getLocalIP();
    // PCI DSS 4.1: HTTP mode ONLY allowed behind a verified reverse proxy (e.g., nginx with TLS termination)
    if (process.env.HTTP_MODE === 'true' && process.env.TRUSTED_PROXY === 'true') {
        app.set('trust proxy', 1); // Trust first proxy
        // Enforce HTTPS via Strict-Transport-Security even behind proxy
        app.use((_req, _res, next) => {
            _res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
            next();
        });
        const httpServer = http_1.default.createServer(app);
        (0, realtime_1.initWebSocket)(httpServer);
        httpServer.listen(Number(PORT), '127.0.0.1', () => {
            console.log('\n=========================================');
            console.log('   Jalan Jyothi CRM - Server Ready (Proxy Mode)');
            console.log('=========================================');
            console.log(`   Listening: http://127.0.0.1:${PORT} (behind TLS-terminating proxy)`);
            console.log('   ⚠️  Ensure reverse proxy enforces TLS 1.2+');
            console.log('=========================================\n');
            (0, backup_2.scheduleDailyBackup)();
        });
        return;
    }
    // PCI DSS 4.1: Reject plain HTTP without proxy
    if (process.env.HTTP_MODE === 'true' && !process.env.TRUSTED_PROXY) {
        console.error('\n✗ PCI DSS VIOLATION: HTTP_MODE requires TRUSTED_PROXY=true');
        console.error('  Plain HTTP is not permitted. Use TLS or a TLS-terminating reverse proxy.');
        process.exit(1);
    }
    if (!fs_1.default.existsSync(keyPath) || !fs_1.default.existsSync(certPath)) {
        console.error('\n✗ SSL certificates not found!');
        console.error('  Run: npm run generate-cert');
        console.error('  Or set HTTP_MODE=true for HTTP (cloud deployment behind proxy)');
        process.exit(1);
    }
    const options = {
        key: fs_1.default.readFileSync(keyPath),
        cert: fs_1.default.readFileSync(certPath)
    };
    // PCI DSS 4.1: Enforce HSTS on direct HTTPS connections
    app.use((_req, _res, next) => {
        _res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
        next();
    });
    const server = https_1.default.createServer(options, app);
    (0, realtime_1.initWebSocket)(server);
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
        (0, backup_2.scheduleDailyBackup)();
    });
    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`\n  ERROR: Port ${PORT} is already in use.`);
            console.error(`  Kill the other process or set a different port: PORT=3002 npm start\n`);
        }
        else {
            console.error('Server error:', err);
        }
        process.exit(1);
    });
}
start();
exports.default = app;
//# sourceMappingURL=index.js.map