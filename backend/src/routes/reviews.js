const router = require('express').Router();
const pool = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// GET /api/reviews/local/:localId — Public: all reviews for a local
router.get('/local/:localId', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.*, u.name AS reviewer_name, u.avatar_url AS reviewer_avatar
       FROM reviews r
       JOIN users u ON u.id = r.user_id
       WHERE r.local_id = $1
       ORDER BY r.created_at DESC`,
      [req.params.localId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/reviews — User: leave a review after completed booking
router.post(
  '/',
  authenticate,
  [
    body('booking_id').notEmpty(),
    body('rating').isInt({ min: 1, max: 5 }),
    body('comment').optional().trim(),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { booking_id, rating, comment } = req.body;

    try {
      // Verify booking belongs to this user and is completed
      const { rows: [booking] } = await pool.query(
        `SELECT b.*, s.local_id
         FROM bookings b
         JOIN services s ON s.id = b.service_id
         WHERE b.id = $1 AND b.user_id = $2 AND b.status = 'completed'`,
        [booking_id, req.user.id]
      );
      if (!booking) {
        return res.status(400).json({
          error: 'Booking not found, not yours, or not yet completed',
        });
      }

      const { rows } = await pool.query(
        `INSERT INTO reviews (booking_id, user_id, local_id, rating, comment)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [booking_id, req.user.id, booking.local_id, rating, comment || null]
      );

      // Update avg_rating and total_reviews on the local_profile
      await pool.query(
        `UPDATE local_profiles
         SET total_reviews = total_reviews + 1,
             avg_rating = (
               SELECT ROUND(AVG(rating)::numeric, 2)
               FROM reviews
               WHERE local_id = $1
             )
         WHERE id = $1`,
        [booking.local_id]
      );

      res.status(201).json(rows[0]);
    } catch (err) {
      // unique violation — already reviewed
      if (err.code === '23505') {
        return res.status(409).json({ error: 'You have already reviewed this booking' });
      }
      next(err);
    }
  }
);

module.exports = router;
