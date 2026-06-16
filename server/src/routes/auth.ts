import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { queryAll, queryOne, runQuery } from '../db';
import { generateToken, verifyToken, authMiddleware } from '../middleware/auth';

const router = Router();

/**
 * POST /api/auth/setup - First-time setup (create admin account)
 * Only works if no users exist yet
 */
router.post('/setup', async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  if (password.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters' });
  }

  // Check if any user already exists
  const existing = queryAll('SELECT id FROM users LIMIT 1');
  if (existing.length > 0) {
    return res.status(403).json({ error: 'Admin account already exists. Use /api/auth/login instead.' });
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(password, salt);

  runQuery(
    'INSERT INTO users (username, password_hash) VALUES (?, ?)',
    [username.trim().toLowerCase(), password_hash]
  );

  const token = generateToken(username.trim().toLowerCase());
  res.status(201).json({ message: 'Admin account created', token, username: username.trim().toLowerCase() });
});

/**
 * POST /api/auth/login - Login with username and password
 */
router.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const user = queryOne('SELECT * FROM users WHERE username = ?', [username.trim().toLowerCase()]);
  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = generateToken(user.username);
  res.json({ token, username: user.username });
});

/**
 * GET /api/auth/verify - Check if current token is valid
 */
router.get('/verify', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  res.json({ valid: true, username: user.username });
});

/**
 * POST /api/auth/change-password - Change password (requires auth)
 */
router.post('/change-password', authMiddleware, async (req: Request, res: Response) => {
  const { current_password, new_password } = req.body;
  const user = (req as any).user;

  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Current and new password are required' });
  }

  if (new_password.length < 4) {
    return res.status(400).json({ error: 'New password must be at least 4 characters' });
  }

  const dbUser = queryOne('SELECT * FROM users WHERE username = ?', [user.username]);
  if (!dbUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  const valid = await bcrypt.compare(current_password, dbUser.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(new_password, salt);

  runQuery('UPDATE users SET password_hash = ? WHERE username = ?', [password_hash, user.username]);
  res.json({ message: 'Password changed successfully' });
});

/**
 * GET /api/auth/status - Check if setup is needed (no auth required)
 */
router.get('/status', (_req: Request, res: Response) => {
  const users = queryAll('SELECT id FROM users LIMIT 1');
  res.json({ setup_required: users.length === 0 });
});

export default router;
