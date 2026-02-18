const router = require('express').Router();
const pool = require('../db/pool');
const { authenticate } = require('../middleware/auth');

// GET /api/messages/:bookingId — Get all messages for a booking thread
router.get('/:bookingId', authenticate, async (req, res, next) => {
  try {
    // Mark messages to this user as read
    await pool.query(
      `UPDATE messages SET is_read = TRUE
       WHERE booking_id = $1 AND receiver_id = $2`,
      [req.params.bookingId, req.user.id]
    );

    const { rows } = await pool.query(
      `SELECT m.*, u.name AS sender_name, u.avatar_url AS sender_avatar
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.booking_id = $1
       ORDER BY m.created_at ASC`,
      [req.params.bookingId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/messages — Send a message in a booking thread
router.post('/', authenticate, async (req, res, next) => {
  const { booking_id, content } = req.body;
  if (!booking_id || !content?.trim()) {
    return res.status(400).json({ error: 'booking_id and content are required' });
  }

  try {
    // Verify the sender is part of this booking (user or local)
    const { rows: [booking] } = await pool.query(
      `SELECT b.user_id, s.local_id, lp.user_id AS local_user_id
       FROM bookings b
       JOIN services s ON s.id = b.service_id
       JOIN local_profiles lp ON lp.id = s.local_id
       WHERE b.id = $1`,
      [booking_id]
    );
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const isUser = booking.user_id === req.user.id;
    const isLocal = booking.local_user_id === req.user.id;
    if (!isUser && !isLocal) {
      return res.status(403).json({ error: 'Not authorized for this booking' });
    }

    const receiver_id = isUser ? booking.local_user_id : booking.user_id;

    const { rows } = await pool.query(
      `INSERT INTO messages (booking_id, sender_id, receiver_id, content)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [booking_id, req.user.id, receiver_id, content.trim()]
    );

    const message = rows[0];

    // Emit real-time event via Socket.io (if available)
    const io = req.app.get('io');
    if (io) {
      io.to(`booking:${booking_id}`).emit('new_message', message);
    }

    res.status(201).json(message);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
