import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { queryAll, queryOne, runQuery } from '../db';
import { generateToken, generateRefreshToken, verifyToken, authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

/**
 * POST /api/auth/setup - First-time setup (create owner account)
 * Only works if no users exist yet
 */
router.post('/setup', async (req: Request, res: Response) => {
  const { username, password, security_question, security_answer } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  if (password.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters' });
  }

  if (!security_question || !security_answer) {
    return res.status(400).json({ error: 'Security question and answer are required for password recovery' });
  }

  // Check if any user already exists
  const existing = queryAll('SELECT id FROM users LIMIT 1');
  if (existing.length > 0) {
    return res.status(403).json({ error: 'Setup already completed. Use login instead.' });
  }

  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(password, salt);
  const answer_hash = await bcrypt.hash(security_answer.trim().toLowerCase(), salt);

  const result = runQuery(
    `INSERT INTO users (username, password_hash, role, security_question, security_answer_hash, is_active)
     VALUES (?, ?, 'owner', ?, ?, 1)`,
    [username.trim().toLowerCase(), password_hash, security_question.trim(), answer_hash]
  );

  const userId = result.lastInsertRowid;
  const token = generateToken(userId, username.trim().toLowerCase(), 'owner');
  const refreshToken = generateRefreshToken(userId, username.trim().toLowerCase(), 'owner');

  res.status(201).json({
    message: 'Owner account created',
    token,
    refreshToken,
    user: { id: userId, username: username.trim().toLowerCase(), role: 'owner' }
  });
});

/**
 * POST /api/auth/login - Login with username and password
 */
router.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const user = queryOne('SELECT * FROM users WHERE username = ? AND is_active = 1', [username.trim().toLowerCase()]);
  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  // Update last login
  runQuery('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

  const token = generateToken(user.id, user.username, user.role);
  const refreshToken = generateRefreshToken(user.id, user.username, user.role);

  res.json({
    token,
    refreshToken,
    user: { id: user.id, username: user.username, role: user.role }
  });
});

/**
 * POST /api/auth/refresh - Refresh access token using refresh token
 */
router.post('/refresh', (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token is required' });
  }

  const payload = verifyToken(refreshToken);
  if (!payload || (payload as any).type !== 'refresh') {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }

  // Verify user still exists and is active
  const user = queryOne('SELECT * FROM users WHERE id = ? AND is_active = 1', [payload.userId]);
  if (!user) {
    return res.status(401).json({ error: 'User account not found or deactivated' });
  }

  const newToken = generateToken(user.id, user.username, user.role);
  const newRefreshToken = generateRefreshToken(user.id, user.username, user.role);

  res.json({ token: newToken, refreshToken: newRefreshToken });
});

/**
 * GET /api/auth/verify - Check if current token is valid
 */
router.get('/verify', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  res.json({ valid: true, user: { id: user.userId, username: user.username, role: user.role } });
});

/**
 * POST /api/auth/change-password - Change own password (requires auth)
 */
router.post('/change-password', authMiddleware, async (req: Request, res: Response) => {
  const { current_password, new_password } = req.body;
  const authUser = (req as any).user;

  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Current and new password are required' });
  }

  if (new_password.length < 4) {
    return res.status(400).json({ error: 'New password must be at least 4 characters' });
  }

  const dbUser = queryOne('SELECT * FROM users WHERE id = ?', [authUser.userId]);
  if (!dbUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  const valid = await bcrypt.compare(current_password, dbUser.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(new_password, salt);

  runQuery('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, authUser.userId]);
  res.json({ message: 'Password changed successfully' });
});

/**
 * POST /api/auth/forgot-password - Reset password via security question
 */
router.post('/forgot-password', async (req: Request, res: Response) => {
  const { username, security_answer, new_password } = req.body;

  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  const user = queryOne('SELECT * FROM users WHERE username = ? AND is_active = 1', [username.trim().toLowerCase()]);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // If only username provided, return the security question
  if (!security_answer && !new_password) {
    return res.json({ security_question: user.security_question });
  }

  // Verify security answer
  if (!security_answer || !new_password) {
    return res.status(400).json({ error: 'Security answer and new password are required' });
  }

  if (new_password.length < 4) {
    return res.status(400).json({ error: 'New password must be at least 4 characters' });
  }

  const answerValid = await bcrypt.compare(security_answer.trim().toLowerCase(), user.security_answer_hash);
  if (!answerValid) {
    return res.status(401).json({ error: 'Security answer is incorrect' });
  }

  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(new_password, salt);

  runQuery('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, user.id]);
  res.json({ message: 'Password reset successfully. You can now login with your new password.' });
});

/**
 * GET /api/auth/status - Check if setup is needed (no auth required)
 */
router.get('/status', (_req: Request, res: Response) => {
  const users = queryAll('SELECT id FROM users LIMIT 1');
  res.json({ setup_required: users.length === 0 });
});

// ===== User Management (Owner only) =====

/**
 * GET /api/auth/users - List all users (owner only)
 */
router.get('/users', authMiddleware, requireRole('owner'), (_req: Request, res: Response) => {
  const users = queryAll('SELECT id, username, role, is_active, last_login, created_at FROM users ORDER BY created_at');
  res.json(users);
});

/**
 * POST /api/auth/users - Create a new user (owner only)
 */
router.post('/users', authMiddleware, requireRole('owner'), async (req: Request, res: Response) => {
  const { username, password, role, security_question, security_answer } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  if (password.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters' });
  }

  if (!['owner', 'manager'].includes(role)) {
    return res.status(400).json({ error: 'Role must be owner or manager' });
  }

  // Check if username already exists
  const existing = queryOne('SELECT id FROM users WHERE username = ?', [username.trim().toLowerCase()]);
  if (existing) {
    return res.status(409).json({ error: 'Username already exists' });
  }

  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(password, salt);
  const answer_hash = security_answer
    ? await bcrypt.hash(security_answer.trim().toLowerCase(), salt)
    : '';

  const result = runQuery(
    `INSERT INTO users (username, password_hash, role, security_question, security_answer_hash, is_active)
     VALUES (?, ?, ?, ?, ?, 1)`,
    [username.trim().toLowerCase(), password_hash, role, security_question?.trim() || '', answer_hash]
  );

  res.status(201).json({
    message: 'User created',
    user: { id: result.lastInsertRowid, username: username.trim().toLowerCase(), role }
  });
});

/**
 * PUT /api/auth/users/:id - Update user (owner only)
 */
router.put('/users/:id', authMiddleware, requireRole('owner'), async (req: Request, res: Response) => {
  const { role, is_active, password } = req.body;
  const userId = parseInt(req.params.id as string);

  const user = queryOne('SELECT * FROM users WHERE id = ?', [userId]);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (role && ['owner', 'manager'].includes(role)) {
    runQuery('UPDATE users SET role = ? WHERE id = ?', [role, userId]);
  }

  if (is_active !== undefined) {
    runQuery('UPDATE users SET is_active = ? WHERE id = ?', [is_active ? 1 : 0, userId]);
  }

  if (password && password.length >= 4) {
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    runQuery('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, userId]);
  }

  res.json({ message: 'User updated' });
});

/**
 * DELETE /api/auth/users/:id - Delete user (owner only, cannot delete self)
 */
router.delete('/users/:id', authMiddleware, requireRole('owner'), (req: Request, res: Response) => {
  const userId = parseInt(req.params.id as string);
  const authUser = (req as any).user;

  if (userId === authUser.userId) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  const user = queryOne('SELECT * FROM users WHERE id = ?', [userId]);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  runQuery('DELETE FROM users WHERE id = ?', [userId]);
  res.json({ message: 'User deleted' });
});

export default router;
