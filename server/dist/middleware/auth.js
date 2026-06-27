"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JWT_SECRET = void 0;
exports.blacklistToken = blacklistToken;
exports.isTokenBlacklisted = isTokenBlacklisted;
exports.recordFailedLogin = recordFailedLogin;
exports.isAccountLocked = isAccountLocked;
exports.clearLoginAttempts = clearLoginAttempts;
exports.auditLog = auditLog;
exports.generateToken = generateToken;
exports.generateRefreshToken = generateRefreshToken;
exports.verifyToken = verifyToken;
exports.authMiddleware = authMiddleware;
exports.requireRole = requireRole;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// PCI DSS 3.4.1: JWT secret MUST come from environment variable or secure vault
// Fallback file-based secret only for initial dev setup — logs a warning
const SECRET_PATH = path_1.default.join(__dirname, '..', '..', 'data', '.jwt_secret');
function getOrCreateSecret() {
    if (process.env.JWT_SECRET) {
        if (process.env.JWT_SECRET.length < 32) {
            console.error('PCI DSS VIOLATION: JWT_SECRET must be at least 32 characters');
            process.exit(1);
        }
        return process.env.JWT_SECRET;
    }
    // Warn loudly if falling back to file-based secret
    console.warn('⚠️  PCI DSS WARNING: JWT_SECRET not set in environment. Using file-based secret.');
    console.warn('   Set JWT_SECRET env var for production compliance.');
    const dir = path_1.default.dirname(SECRET_PATH);
    if (!fs_1.default.existsSync(dir))
        fs_1.default.mkdirSync(dir, { recursive: true });
    if (fs_1.default.existsSync(SECRET_PATH)) {
        // Restrict file permissions (owner-read only)
        try {
            fs_1.default.chmodSync(SECRET_PATH, 0o600);
        }
        catch { }
        return fs_1.default.readFileSync(SECRET_PATH, 'utf-8').trim();
    }
    const secret = crypto_1.default.randomBytes(64).toString('hex'); // 512-bit secret
    fs_1.default.writeFileSync(SECRET_PATH, secret, { mode: 0o600 });
    return secret;
}
const JWT_SECRET = getOrCreateSecret();
exports.JWT_SECRET = JWT_SECRET;
const ACCESS_TOKEN_EXPIRY = '1h'; // PCI DSS 8.1.8: Reduced from 24h to 1h
const REFRESH_TOKEN_EXPIRY = '7d'; // PCI DSS: Reduced from 30d to 7d
// PCI DSS 8.1.5: Token revocation blacklist (in-memory + persistence)
const TOKEN_BLACKLIST_PATH = path_1.default.join(__dirname, '..', '..', 'data', '.token_blacklist');
const tokenBlacklist = new Set();
// Load existing blacklist on startup
try {
    if (fs_1.default.existsSync(TOKEN_BLACKLIST_PATH)) {
        const entries = fs_1.default.readFileSync(TOKEN_BLACKLIST_PATH, 'utf-8').split('\n').filter(Boolean);
        entries.forEach(e => tokenBlacklist.add(e));
    }
}
catch { }
function blacklistToken(token) {
    tokenBlacklist.add(token);
    // Persist (append-only for performance)
    try {
        fs_1.default.appendFileSync(TOKEN_BLACKLIST_PATH, token + '\n', { mode: 0o600 });
    }
    catch { }
}
function isTokenBlacklisted(token) {
    return tokenBlacklist.has(token);
}
// PCI DSS 8.1.5: Periodic cleanup of expired tokens from blacklist (every hour)
// Tokens that have expired naturally don't need to remain in the blacklist
setInterval(() => {
    const validTokens = [];
    for (const token of tokenBlacklist) {
        try {
            jsonwebtoken_1.default.verify(token, JWT_SECRET);
            validTokens.push(token); // Still valid — keep in blacklist
        }
        catch {
            // Token expired naturally — remove from blacklist
            tokenBlacklist.delete(token);
        }
    }
    // Rewrite blacklist file with only still-valid tokens
    try {
        if (validTokens.length < tokenBlacklist.size + 10) { // Only rewrite if we cleaned something
            fs_1.default.writeFileSync(TOKEN_BLACKLIST_PATH, [...tokenBlacklist].join('\n') + '\n', { mode: 0o600 });
        }
    }
    catch { }
}, 60 * 60 * 1000); // Every hour
// PCI DSS 8.1.6: Account lockout after failed attempts
const LOGIN_ATTEMPTS = new Map();
const MAX_ATTEMPTS = 6;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes
function recordFailedLogin(username) {
    const entry = LOGIN_ATTEMPTS.get(username) || { count: 0, lockedUntil: 0 };
    entry.count++;
    if (entry.count >= MAX_ATTEMPTS) {
        entry.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
    }
    LOGIN_ATTEMPTS.set(username, entry);
}
function isAccountLocked(username) {
    const entry = LOGIN_ATTEMPTS.get(username);
    if (!entry)
        return false;
    if (entry.lockedUntil > Date.now())
        return true;
    // Lockout expired — reset
    if (entry.lockedUntil > 0 && entry.lockedUntil <= Date.now()) {
        LOGIN_ATTEMPTS.delete(username);
    }
    return false;
}
function clearLoginAttempts(username) {
    LOGIN_ATTEMPTS.delete(username);
}
// PCI DSS 10.2: Audit logging
const AUDIT_LOG_PATH = path_1.default.join(__dirname, '..', '..', 'data', 'audit.log');
function auditLog(event, details) {
    const entry = JSON.stringify({
        timestamp: new Date().toISOString(),
        event,
        ...details
    }) + '\n';
    try {
        const dir = path_1.default.dirname(AUDIT_LOG_PATH);
        if (!fs_1.default.existsSync(dir))
            fs_1.default.mkdirSync(dir, { recursive: true });
        fs_1.default.appendFileSync(AUDIT_LOG_PATH, entry, { mode: 0o600 });
    }
    catch { }
    // Also persist to DB audit_log table if available
    try {
        const { runQuery } = require('../db');
        runQuery('INSERT INTO audit_log (event, user_id, username, ip_address, details) VALUES (?, ?, ?, ?, ?)', [event, details.userId || null, details.username || null, details.ip || null, JSON.stringify(details)]);
    }
    catch { }
}
/**
 * Generate an access token for a user
 */
function generateToken(userId, username, role) {
    return jsonwebtoken_1.default.sign({ userId, username, role }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}
/**
 * Generate a refresh token for a user
 */
function generateRefreshToken(userId, username, role) {
    return jsonwebtoken_1.default.sign({ userId, username, role, type: 'refresh' }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
}
/**
 * Verify and decode a JWT token
 */
function verifyToken(token) {
    try {
        return jsonwebtoken_1.default.verify(token, JWT_SECRET);
    }
    catch {
        return null;
    }
}
/**
 * Express middleware to protect routes.
 * Checks for Bearer token in Authorization header.
 * PCI DSS 8.1.5: Validates token is not revoked.
 */
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    const token = authHeader.slice(7);
    // PCI DSS 8.1.5: Check if token has been revoked
    if (isTokenBlacklisted(token)) {
        return res.status(401).json({ error: 'Token has been revoked' });
    }
    const payload = verifyToken(token);
    if (!payload) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
    // Attach user info to request
    req.user = payload;
    next();
}
/**
 * Middleware factory to require specific roles.
 * Usage: requireRole('owner') or requireRole('owner', 'manager')
 */
function requireRole(...roles) {
    return (req, res, next) => {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        if (!roles.includes(user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        next();
    };
}
//# sourceMappingURL=auth.js.map