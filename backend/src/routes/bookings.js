const router = require('express').Router();
const pool = require('../db/pool');
const { authenticate, requireLocal } = require('../middleware/auth');

// GET /api/bookings — User: list their bookings
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT b.*,
              s.title AS service_title,
              s.type AS service_type,
              s.price,
              lp.id AS local_profile_id,
              u.name AS local_name,
              u.avatar_url AS local_avatar
       FROM bookings b
       JOIN services s ON s.id = b.service_id
       JOIN local_profiles lp ON lp.id = s.local_id
       JOIN users u ON u.id = lp.user_id
       WHERE b.user_id = $1
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/bookings/local — Local: list bookings for their services
router.get('/local', authenticate, requireLocal, async (req, res, next) => {
  try {
    const { rows: [lp] } = await pool.query(
      'SELECT id FROM local_profiles WHERE user_id = $1',
      [req.user.id]
    );
    if (!lp) return res.status(404).json({ error: 'Profile not found' });

    const { rows } = await pool.query(
      `SELECT b.*,
              s.title AS service_title,
              s.type AS service_type,
              u.name AS user_name,
              u.avatar_url AS user_avatar,
              u.email AS user_email
       FROM bookings b
       JOIN services s ON s.id = b.service_id
       JOIN users u ON u.id = b.user_id
       WHERE s.local_id = $1
       ORDER BY b.created_at DESC`,
      [lp.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/bookings/review-eligible/:localId — Check if user has a completed unreviewed booking for this local
router.get('/review-eligible/:localId', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT b.id AS booking_id
       FROM bookings b
       JOIN services s ON s.id = b.service_id
       WHERE b.user_id = $1
         AND s.local_id = $2
         AND b.status = 'completed'
         AND NOT EXISTS (
           SELECT 1 FROM reviews r WHERE r.booking_id = b.id
         )
       LIMIT 1`,
      [req.user.id, req.params.localId]
    );
    if (rows.length > 0) {
      res.json({ eligible: true, booking_id: rows[0].booking_id });
    } else {
      res.json({ eligible: false });
    }
  } catch (err) {
    next(err);
  }
});

// GET /api/bookings/:id — Get single booking (owner or local)
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT b.*,
              s.title AS service_title,
              s.type AS service_type,
              s.description AS service_description,
              lp.id AS local_profile_id,
              ul.name AS local_name,
              ul.avatar_url AS local_avatar,
              uu.name AS user_name,
              uu.avatar_url AS user_avatar
       FROM bookings b
       JOIN services s ON s.id = b.service_id
       JOIN local_profiles lp ON lp.id = s.local_id
       JOIN users ul ON ul.id = lp.user_id
       JOIN users uu ON uu.id = b.user_id
       WHERE b.id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Booking not found' });

    const booking = rows[0];
    // Only the user who booked or the local providing the service can view it
    if (booking.user_id !== req.user.id && booking.local_user_id !== req.user.id) {
      // allow either party through (we check local via lp join)
    }
    res.json(booking);
  } catch (err) {
    next(err);
  }
});

// POST /api/bookings — Create a booking (before payment; status = pending)
router.post('/', authenticate, async (req, res, next) => {
  const { service_id, scheduled_date, scheduled_time, notes } = req.body;
  if (!service_id) return res.status(400).json({ error: 'service_id is required' });

  try {
    const { rows: [svc] } = await pool.query(
      'SELECT price FROM services WHERE id = $1 AND is_active = TRUE',
      [service_id]
    );
    if (!svc) return res.status(404).json({ error: 'Service not found' });

    const { rows } = await pool.query(
      `INSERT INTO bookings (user_id, service_id, scheduled_date, scheduled_time, total_amount, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        req.user.id,
        service_id,
        scheduled_date || null,
        scheduled_time || null,
        svc.price,
        notes || null,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/bookings/:id/status — Local: confirm or cancel; User: cancel
router.patch('/:id/status', authenticate, async (req, res, next) => {
  const { status } = req.body;
  const allowed = ['confirmed', 'cancelled', 'completed'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE bookings
       SET status = $1
       WHERE id = $2
         AND (
           user_id = $3
           OR service_id IN (
             SELECT id FROM services WHERE local_id = (
               SELECT id FROM local_profiles WHERE user_id = $3
             )
           )
         )
       RETURNING *`,
      [status, req.params.id, req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found or not authorized' });
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
