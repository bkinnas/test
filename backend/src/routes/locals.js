const router = require('express').Router();
const pool = require('../db/pool');
const { authenticate, requireLocal } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

// GET /api/locals/search?city=Austin&lat=30.2&lng=-97.7&page=1&limit=20
// Returns a summary list of locals in a city/area with avg_rating and top services
router.get('/search', async (req, res, next) => {
  const { city, lat, lng, page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  try {
    let query;
    let params;

    if (lat && lng) {
      // Sort by distance using Haversine approximation
      query = `
        SELECT
          lp.id,
          lp.city,
          lp.location_text,
          lp.tagline,
          lp.cover_photo_url,
          lp.avg_rating,
          lp.total_reviews,
          lp.lat,
          lp.lng,
          u.name,
          u.avatar_url,
          (
            3959 * acos(
              cos(radians($1)) * cos(radians(lp.lat)) *
              cos(radians(lp.lng) - radians($2)) +
              sin(radians($1)) * sin(radians(lp.lat))
            )
          ) AS distance_miles,
          (
            SELECT json_agg(json_build_object('type', s.type, 'title', s.title, 'price', s.price))
            FROM services s
            WHERE s.local_id = lp.id AND s.is_active = TRUE
            LIMIT 3
          ) AS services_preview
        FROM local_profiles lp
        JOIN users u ON u.id = lp.user_id
        WHERE lp.is_active = TRUE
        ORDER BY distance_miles ASC NULLS LAST
        LIMIT $3 OFFSET $4
      `;
      params = [lat, lng, limit, offset];
    } else {
      query = `
        SELECT
          lp.id,
          lp.city,
          lp.location_text,
          lp.tagline,
          lp.cover_photo_url,
          lp.avg_rating,
          lp.total_reviews,
          u.name,
          u.avatar_url,
          (
            SELECT json_agg(json_build_object('type', s.type, 'title', s.title, 'price', s.price))
            FROM services s
            WHERE s.local_id = lp.id AND s.is_active = TRUE
            LIMIT 3
          ) AS services_preview
        FROM local_profiles lp
        JOIN users u ON u.id = lp.user_id
        WHERE lp.is_active = TRUE
          AND ($1::text IS NULL OR LOWER(lp.city) = LOWER($1))
        ORDER BY lp.avg_rating DESC
        LIMIT $2 OFFSET $3
      `;
      params = [city || null, limit, offset];
    }

    const { rows } = await pool.query(query, params);
    res.json({ locals: rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/locals/:id — Full profile with services and reviews
router.get('/:id', async (req, res, next) => {
  try {
    const { rows: profiles } = await pool.query(
      `SELECT lp.*, u.name, u.email, u.avatar_url
       FROM local_profiles lp
       JOIN users u ON u.id = lp.user_id
       WHERE lp.id = $1`,
      [req.params.id]
    );
    if (profiles.length === 0) return res.status(404).json({ error: 'Local not found' });
    const profile = profiles[0];

    const { rows: services } = await pool.query(
      `SELECT * FROM services WHERE local_id = $1 AND is_active = TRUE ORDER BY type, price`,
      [req.params.id]
    );

    const { rows: reviews } = await pool.query(
      `SELECT r.*, u.name AS reviewer_name, u.avatar_url AS reviewer_avatar
       FROM reviews r
       JOIN users u ON u.id = r.user_id
       WHERE r.local_id = $1
       ORDER BY r.created_at DESC
       LIMIT 50`,
      [req.params.id]
    );

    res.json({ profile, services, reviews });
  } catch (err) {
    next(err);
  }
});

// GET /api/locals/my/profile — Authenticated local's own profile
router.get('/my/profile', authenticate, requireLocal, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT lp.*, u.name, u.email, u.avatar_url
       FROM local_profiles lp
       JOIN users u ON u.id = lp.user_id
       WHERE lp.user_id = $1`,
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Profile not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/locals/my/profile — Update own profile
router.put('/my/profile', authenticate, requireLocal, async (req, res, next) => {
  const { bio, tagline, city, location_text, lat, lng, payout_method, paypal_email, venmo_handle } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE local_profiles
       SET bio           = COALESCE($1,  bio),
           tagline       = COALESCE($2,  tagline),
           city          = COALESCE($3,  city),
           location_text = COALESCE($4,  location_text),
           lat           = COALESCE($5,  lat),
           lng           = COALESCE($6,  lng),
           payout_method = COALESCE($8,  payout_method),
           paypal_email  = COALESCE($9,  paypal_email),
           venmo_handle  = COALESCE($10, venmo_handle)
       WHERE user_id = $7
       RETURNING *`,
      [bio, tagline, city, location_text, lat, lng, req.user.id, payout_method, paypal_email, venmo_handle]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Profile not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /api/locals/my/cover-photo — Upload cover photo
router.post(
  '/my/cover-photo',
  authenticate,
  requireLocal,
  upload.single('photo'),
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      const url = req.file.path;
      await pool.query(
        'UPDATE local_profiles SET cover_photo_url = $1 WHERE user_id = $2',
        [url, req.user.id]
      );
      res.json({ cover_photo_url: url });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/locals/my/dashboard — Summary stats for local's admin dashboard
router.get('/my/dashboard', authenticate, requireLocal, async (req, res, next) => {
  try {
    const { rows: [lp] } = await pool.query(
      'SELECT id, payout_method, paypal_email, venmo_handle FROM local_profiles WHERE user_id = $1',
      [req.user.id]
    );
    if (!lp) return res.status(404).json({ error: 'Profile not found' });

    const localId = lp.id;

    const [bookingsResult, earningsResult, unreadResult, reviewsResult] = await Promise.all([
      pool.query(
        `SELECT b.*, s.title AS service_title, s.type AS service_type, u.name AS user_name
         FROM bookings b
         JOIN services s ON s.id = b.service_id
         JOIN users u ON u.id = b.user_id
         WHERE s.local_id = $1 AND b.status IN ('pending','confirmed')
         ORDER BY b.scheduled_date ASC NULLS LAST
         LIMIT 10`,
        [localId]
      ),
      pool.query(
        `SELECT COALESCE(SUM(b.total_amount), 0) AS total_earnings
         FROM bookings b
         JOIN services s ON s.id = b.service_id
         WHERE s.local_id = $1 AND b.status = 'completed'`,
        [localId]
      ),
      pool.query(
        `SELECT COUNT(*) AS unread_count
         FROM messages m
         JOIN bookings b ON b.id = m.booking_id
         JOIN services s ON s.id = b.service_id
         WHERE s.local_id = $1 AND m.receiver_id = $2 AND m.is_read = FALSE`,
        [localId, req.user.id]
      ),
      pool.query(
        `SELECT r.*, u.name AS reviewer_name
         FROM reviews r
         JOIN users u ON u.id = r.user_id
         WHERE r.local_id = $1
         ORDER BY r.created_at DESC LIMIT 5`,
        [localId]
      ),
    ]);

    const grossEarnings = Number(earningsResult.rows[0].total_earnings) || 0;
    res.json({
      upcoming_bookings: bookingsResult.rows,
      total_earnings: grossEarnings,
      net_earnings: (grossEarnings * 0.85).toFixed(2),
      unread_messages: unreadResult.rows[0].unread_count,
      recent_reviews: reviewsResult.rows,
      payout_method: lp.payout_method,
      paypal_email: lp.paypal_email,
      venmo_handle: lp.venmo_handle,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
