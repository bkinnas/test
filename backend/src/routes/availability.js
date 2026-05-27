const router = require('express').Router();
const pool = require('../db/pool');
const { authenticate, requireLocal } = require('../middleware/auth');

// GET /api/availability/:localId?month=2024-08
// Public: get all availability slots for a local for a given month
router.get('/:localId', async (req, res, next) => {
  const { month } = req.query; // e.g. "2024-08"
  try {
    let query = 'SELECT * FROM availability WHERE local_id = $1';
    const params = [req.params.localId];

    if (month) {
      query += ` AND date >= $2 AND date < ($2::date + INTERVAL '1 month')`;
      params.push(`${month}-01`);
    }

    query += ' ORDER BY date, start_time';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/availability — Local: add availability slot
router.post('/', authenticate, requireLocal, async (req, res, next) => {
  const { date, start_time, end_time, is_blocked } = req.body;
  if (!date) return res.status(400).json({ error: 'date is required' });

  try {
    const { rows: [lp] } = await pool.query(
      'SELECT id FROM local_profiles WHERE user_id = $1',
      [req.user.id]
    );
    if (!lp) return res.status(404).json({ error: 'Profile not found' });

    const { rows } = await pool.query(
      `INSERT INTO availability (local_id, date, start_time, end_time, is_blocked)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [lp.id, date, start_time || null, end_time || null, is_blocked || false]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/availability/:id — Local: update a slot
router.put('/:id', authenticate, requireLocal, async (req, res, next) => {
  const { date, start_time, end_time, is_blocked } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE availability
       SET date = COALESCE($1, date),
           start_time = COALESCE($2, start_time),
           end_time = COALESCE($3, end_time),
           is_blocked = COALESCE($4, is_blocked)
       WHERE id = $5
         AND local_id = (SELECT id FROM local_profiles WHERE user_id = $6)
       RETURNING *`,
      [date, start_time, end_time, is_blocked, req.params.id, req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Slot not found or not authorized' });
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/availability/:id — Local: remove a slot
router.delete('/:id', authenticate, requireLocal, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `DELETE FROM availability
       WHERE id = $1
         AND local_id = (SELECT id FROM local_profiles WHERE user_id = $2)
       RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Slot not found or not authorized' });
    }
    res.json({ message: 'Availability slot removed' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
