const router = require('express').Router();
const pool = require('../db/pool');
const { authenticate, requireLocal } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

// GET /api/services/:id — Public: single service detail
router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT s.*, lp.city, lp.avg_rating, u.name AS local_name, u.avatar_url AS local_avatar
       FROM services s
       JOIN local_profiles lp ON lp.id = s.local_id
       JOIN users u ON u.id = lp.user_id
       WHERE s.id = $1 AND s.is_active = TRUE`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Service not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET /api/services/my/list — Local: their own services (admin)
router.get('/my/list', authenticate, requireLocal, async (req, res, next) => {
  try {
    const { rows: [lp] } = await pool.query(
      'SELECT id FROM local_profiles WHERE user_id = $1',
      [req.user.id]
    );
    if (!lp) return res.status(404).json({ error: 'Profile not found' });

    const { rows } = await pool.query(
      'SELECT * FROM services WHERE local_id = $1 ORDER BY type, created_at DESC',
      [lp.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/services — Local: create a service
router.post('/', authenticate, requireLocal, async (req, res, next) => {
  const { type, title, description, price, duration_minutes } = req.body;
  if (!type || !title || price == null) {
    return res.status(400).json({ error: 'type, title, and price are required' });
  }

  try {
    const { rows: [lp] } = await pool.query(
      'SELECT id FROM local_profiles WHERE user_id = $1',
      [req.user.id]
    );
    if (!lp) return res.status(404).json({ error: 'Local profile not found' });

    const { rows } = await pool.query(
      `INSERT INTO services (local_id, type, title, description, price, duration_minutes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [lp.id, type, title, description || null, price, duration_minutes || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/services/:id — Local: update a service
router.put('/:id', authenticate, requireLocal, async (req, res, next) => {
  const { title, description, price, duration_minutes, is_active } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE services
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           price = COALESCE($3, price),
           duration_minutes = COALESCE($4, duration_minutes),
           is_active = COALESCE($5, is_active)
       WHERE id = $6
         AND local_id = (SELECT id FROM local_profiles WHERE user_id = $7)
       RETURNING *`,
      [title, description, price, duration_minutes, is_active, req.params.id, req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Service not found or not authorized' });
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/services/:id — Local: deactivate (soft delete) a service
router.delete('/:id', authenticate, requireLocal, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `UPDATE services SET is_active = FALSE
       WHERE id = $1
         AND local_id = (SELECT id FROM local_profiles WHERE user_id = $2)
       RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Service not found or not authorized' });
    }
    res.json({ message: 'Service deactivated' });
  } catch (err) {
    next(err);
  }
});

// POST /api/services/:id/photos — Upload photos for a service
router.post(
  '/:id/photos',
  authenticate,
  requireLocal,
  upload.array('photos', 8),
  async (req, res, next) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      const urls = req.files.map((f) => f.path);

      const { rows } = await pool.query(
        `UPDATE services
         SET photos = photos || $1::jsonb
         WHERE id = $2
           AND local_id = (SELECT id FROM local_profiles WHERE user_id = $3)
         RETURNING photos`,
        [JSON.stringify(urls), req.params.id, req.user.id]
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Service not found or not authorized' });
      }
      res.json({ photos: rows[0].photos });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
