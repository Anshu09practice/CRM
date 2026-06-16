import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Persist JWT secret to file so tokens survive server restarts
const SECRET_PATH = path.join(__dirname, '..', '..', 'data', '.jwt_secret');

function getOrCreateSecret(): string {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;

  const dir = path.dirname(SECRET_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (fs.existsSync(SECRET_PATH)) {
    return fs.readFileSync(SECRET_PATH, 'utf-8').trim();
  }

  const secret = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(SECRET_PATH, secret, 'utf-8');
  return secret;
}

const JWT_SECRET = getOrCreateSecret();
const TOKEN_EXPIRY = '7d'; // Token valid for 7 days

export interface AuthPayload {
  username: string;
  iat?: number;
  exp?: number;
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(username: string): string {
  return jwt.sign({ username }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
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
 * Express middleware to protect routes
 * Checks for Bearer token in Authorization header
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.slice(7); // Remove 'Bearer '
  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // Attach user info to request
  (req as any).user = payload;
  next();
}

export { JWT_SECRET };
