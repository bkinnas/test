const router = require('express').Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const pool = require('../db/pool');
const { authenticate } = require('../middleware/auth');

// POST /api/payments/create-intent — Create Stripe PaymentIntent for a booking
router.post('/create-intent', authenticate, async (req, res, next) => {
  const { booking_id } = req.body;
  if (!booking_id) return res.status(400).json({ error: 'booking_id is required' });

  try {
    const { rows: [booking] } = await pool.query(
      `SELECT b.*, s.title, u.email AS user_email, u.name AS user_name
       FROM bookings b
       JOIN services s ON s.id = b.service_id
       JOIN users u ON u.id = b.user_id
       WHERE b.id = $1 AND b.user_id = $2`,
      [booking_id, req.user.id]
    );
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const amount = Math.round(Number(booking.total_amount) * 100); // cents

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      automatic_payment_methods: { enabled: true }, // enables Apple Pay, Google Pay, cards
      metadata: {
        booking_id: booking.id,
        user_id: req.user.id,
        service_title: booking.title,
      },
      receipt_email: booking.user_email,
      description: `LOCALS — ${booking.title}`,
    });

    // Save payment intent ID to booking
    await pool.query(
      'UPDATE bookings SET stripe_payment_intent_id = $1 WHERE id = $2',
      [paymentIntent.id, booking_id]
    );

    res.json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      amount,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/payments/webhook — Stripe webhook (raw body required)
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object;
      const bookingId = pi.metadata.booking_id;

      if (bookingId) {
        await pool.query(
          `UPDATE bookings SET status = 'confirmed' WHERE id = $1 AND stripe_payment_intent_id = $2`,
          [bookingId, pi.id]
        );
        console.log(`Booking ${bookingId} confirmed after payment`);
      }
    }

    if (event.type === 'payment_intent.payment_failed') {
      const pi = event.data.object;
      console.warn(`Payment failed for booking ${pi.metadata.booking_id}`);
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
  }

  res.json({ received: true });
});

module.exports = router;
