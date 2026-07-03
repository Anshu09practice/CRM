import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// PCI DSS 3.4.1: JWT secret MUST come from environment variable or secure vault
// Fallback file-based secret only for initial dev setup — logs a warning
const SECRET_PATH = path.join(__dirname, '..', '..', 'data', '.jwt_secret');

function getOrCreateSecret(): string {
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

  const dir = path.dirname(SECRET_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (fs.existsSync(SECRET_PATH)) {
    // Restrict file permissions (owner-read only)
    try { fs.chmodSync(SECRET_PATH, 0o600); } catch {}
    return fs.readFileSync(SECRET_PATH, 'utf-8').trim();
  }

  const secret = crypto.randomBytes(64).toString('hex'); // 512-bit secret
  fs.writeFileSync(SECRET_PATH, secret, { mode: 0o600 });
  return secret;
}

const JWT_SECRET = getOrCreateSecret();
const ACCESS_TOKEN_EXPIRY = '1h'; // PCI DSS 8.1.8: Reduced from 24h to 1h
const REFRESH_TOKEN_EXPIRY = '7d'; // PCI DSS: Reduced from 30d to 7d

// PCI DSS 8.1.5: Token revocation blacklist (in-memory + persistence)
const TOKEN_BLACKLIST_PATH = path.join(__dirname, '..', '..', 'data', '.token_blacklist');
const tokenBlacklist = new Set<string>();

// Load existing blacklist on startup
try {
  if (fs.existsSync(TOKEN_BLACKLIST_PATH)) {
    const entries = fs.readFileSync(TOKEN_BLACKLIST_PATH, 'utf-8').split('\n').filter(Boolean);
    entries.forEach(e => tokenBlacklist.add(e));
  }
} catch {}

export function blacklistToken(token: string): void {
  tokenBlacklist.add(token);
  // Persist (append-only for performance)
  try {
    fs.appendFileSync(TOKEN_BLACKLIST_PATH, token + '\n', { mode: 0o600 });
  } catch {}
}

export function isTokenBlacklisted(token: string): boolean {
  return tokenBlacklist.has(token);
}

// PCI DSS 8.1.5: Periodic cleanup of expired tokens from blacklist (every hour)
// Tokens that have expired naturally don't need to remain in the blacklist
setInterval(() => {
  const validTokens: string[] = [];
  for (const token of tokenBlacklist) {
    try {
      jwt.verify(token, JWT_SECRET);
      validTokens.push(token); // Still valid — keep in blacklist
    } catch {
      // Token expired naturally — remove from blacklist
      tokenBlacklist.delete(token);
    }
  }
  // Rewrite blacklist file with only still-valid tokens
  try {
    if (validTokens.length < tokenBlacklist.size + 10) { // Only rewrite if we cleaned something
      fs.writeFileSync(TOKEN_BLACKLIST_PATH, [...tokenBlacklist].join('\n') + '\n', { mode: 0o600 });
    }
  } catch {}
}, 60 * 60 * 1000); // Every hour

// PCI DSS 8.1.6: Account lockout after failed attempts
const LOGIN_ATTEMPTS = new Map<string, { count: number; lockedUntil: number }>();
const MAX_ATTEMPTS = 6;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes

export function recordFailedLogin(username: string): void {
  const entry = LOGIN_ATTEMPTS.get(username) || { count: 0, lockedUntil: 0 };
  entry.count++;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
  }
  LOGIN_ATTEMPTS.set(username, entry);
}

export function isAccountLocked(username: string): boolean {
  const entry = LOGIN_ATTEMPTS.get(username);
  if (!entry) return false;
  if (entry.lockedUntil > Date.now()) return true;
  // Lockout expired — reset
  if (entry.lockedUntil > 0 && entry.lockedUntil <= Date.now()) {
    LOGIN_ATTEMPTS.delete(username);
  }
  return false;
}

export function clearLoginAttempts(username: string): void {
  LOGIN_ATTEMPTS.delete(username);
}

// PCI DSS 10.2: Audit logging
const AUDIT_LOG_PATH = path.join(__dirname, '..', '..', 'data', 'audit.log');

export function auditLog(event: string, details: Record<string, any>): void {
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    event,
    ...details
  }) + '\n';
  try {
    const dir = path.dirname(AUDIT_LOG_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(AUDIT_LOG_PATH, entry, { mode: 0o600 });
  } catch {}
  // Also persist to DB audit_log table if available
  try {
    const { runQuery } = require('../db');
    runQuery(
      'INSERT INTO audit_log (event, user_id, username, ip_address, details) VALUES (?, ?, ?, ?, ?)',
      [event, details.userId || null, details.username || null, details.ip || null, JSON.stringify(details)]
    );
  } catch {}
}

export interface AuthPayload {
  userId: number;
  username: string;
  role: 'owner' | 'manager' | 'employee';
  iat?: number;
  exp?: number;
}

/**
 * Generate an access token for a user
 */
export function generateToken(userId: number, username: string, role: string): string {
  return jwt.sign({ userId, username, role }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

/**
 * Generate a refresh token for a user
 */
export function generateRefreshToken(userId: number, username: string, role: string): string {
  return jwt.sign({ userId, username, role, type: 'refresh' }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch {
    return null;
  }
}

/**
 * Express middleware to protect routes.
 * Checks for Bearer token in Authorization header.
 * PCI DSS 8.1.5: Validates token is not revoked.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
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
  (req as any).user = payload;
  next();
}

/**
 * Middleware factory to require specific roles.
 * Usage: requireRole('owner') or requireRole('owner', 'manager')
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as AuthPayload;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

export { JWT_SECRET };
