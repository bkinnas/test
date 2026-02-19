const router = require('express').Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { body, validationResult } = require('express-validator');
const pool = require('../db/pool');
const { authenticate } = require('../middleware/auth');

// POST /api/auth/register
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('name').trim().notEmpty(),
    body('role').isIn(['user', 'local']),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name, role } = req.body;

    try {
      const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rowCount > 0) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      const password_hash = await bcrypt.hash(password, 12);
      const { rows } = await pool.query(
        `INSERT INTO users (email, password_hash, name, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, name, role, avatar_url, created_at`,
        [email, password_hash, name, role]
      );
      const user = rows[0];

      // If registering as a local, create empty profile
      if (role === 'local') {
        const city = req.body.city || '';
        await pool.query(
          'INSERT INTO local_profiles (user_id, city) VALUES ($1, $2)',
          [user.id, city]
        );
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      res.status(201).json({ user, token });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  [body('email').isEmail().normalizeEmail(), body('password').notEmpty()],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    try {
      const { rows } = await pool.query(
        'SELECT id, email, password_hash, name, role, avatar_url FROM users WHERE email = $1',
        [email]
      );
      if (rows.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      const user = rows[0];

      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      delete user.password_hash;

      // If local, attach their profile id
      let localProfileId = null;
      if (user.role === 'local') {
        const lp = await pool.query(
          'SELECT id FROM local_profiles WHERE user_id = $1',
          [user.id]
        );
        if (lp.rowCount > 0) localProfileId = lp.rows[0].id;
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      res.json({ user: { ...user, localProfileId }, token });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/forgot-password
router.post(
  '/forgot-password',
  [body('email').isEmail().normalizeEmail()],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { email } = req.body;
    try {
      const { rows } = await pool.query(
        'SELECT id, email, name, password_hash FROM users WHERE email = $1',
        [email]
      );

      // Always respond with success to prevent email enumeration
      if (rows.length === 0) {
        return res.json({ message: 'If that email is registered, a reset link has been sent.' });
      }
      const user = rows[0];

      // Sign token with JWT_SECRET + password_hash so it invalidates once password changes
      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET + user.password_hash,
        { expiresIn: '1h' }
      );

      const resetLink = `locals://reset-password?token=${encodeURIComponent(token)}`;

      if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || process.env.EMAIL_USER === 'your_email@gmail.com') {
        // Development fallback: print link to console so it can be tested without SMTP
        console.log('\n[DEV] Password reset link for', user.email);
        console.log(resetLink);
        console.log('Token:', token, '\n');
      } else {
        const transporter = nodemailer.createTransport({
          host: process.env.EMAIL_HOST,
          port: Number(process.env.EMAIL_PORT) || 587,
          secure: process.env.EMAIL_PORT === '465',
          auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
        });
        await transporter.sendMail({
          from: process.env.EMAIL_FROM || `"LOCALS App" <${process.env.EMAIL_USER}>`,
          to: user.email,
          subject: 'Reset your LOCALS password',
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;">
              <h2 style="color:#1A3C5E;">Reset your password</h2>
              <p>Hi ${user.name},</p>
              <p>You requested a password reset for your LOCALS account. Tap the button below to set a new password. The link expires in <strong>1 hour</strong>.</p>
              <a href="${resetLink}" style="display:inline-block;background:#1A3C5E;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:bold;margin:20px 0;">Reset Password</a>
              <p style="color:#666;font-size:14px;">If the button doesn't open the app, copy and paste this link:</p>
              <p style="color:#888;font-size:13px;word-break:break-all;">${resetLink}</p>
              <hr style="margin:24px 0;border:none;border-top:1px solid #eee;">
              <p style="color:#aaa;font-size:12px;">If you didn't request this, you can safely ignore this email.</p>
            </div>
          `,
        });
      }

      res.json({ message: 'If that email is registered, a reset link has been sent.' });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/reset-password
router.post(
  '/reset-password',
  [body('token').notEmpty(), body('password').isLength({ min: 8 })],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { token, password } = req.body;
    try {
      // Decode without verifying to extract user id
      const decoded = jwt.decode(token);
      if (!decoded?.id) {
        return res.status(400).json({ error: 'Invalid reset token.' });
      }

      // Fetch user's current password_hash (also used as part of the signing secret)
      const { rows } = await pool.query(
        'SELECT id, password_hash FROM users WHERE id = $1',
        [decoded.id]
      );
      if (rows.length === 0) {
        return res.status(400).json({ error: 'Invalid reset token.' });
      }
      const user = rows[0];

      // Verify token — will throw if expired or tampered
      try {
        jwt.verify(token, process.env.JWT_SECRET + user.password_hash);
      } catch {
        return res.status(400).json({
          error: 'Reset link has expired or is invalid. Please request a new one.',
        });
      }

      const password_hash = await bcrypt.hash(password, 12);
      await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [
        password_hash,
        user.id,
      ]);

      res.json({ message: 'Password updated. You can now sign in with your new password.' });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/auth/me
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, email, name, role, avatar_url, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
