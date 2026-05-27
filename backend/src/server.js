require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const authRoutes = require('./routes/auth');
const localsRoutes = require('./routes/locals');
const servicesRoutes = require('./routes/services');
const bookingsRoutes = require('./routes/bookings');
const reviewsRoutes = require('./routes/reviews');
const messagesRoutes = require('./routes/messages');
const availabilityRoutes = require('./routes/availability');
const paymentRoutes = require('./routes/payments');
const { errorHandler } = require('./middleware/errorHandler');
const { initSocket } = require('./services/socket');

const app = express();
const server = http.createServer(app);

// Socket.io for real-time messaging
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST'],
  },
});
initSocket(io);

app.use(cors({ origin: process.env.CLIENT_URL || '*' }));

// Stripe webhook needs raw body — must be before express.json()
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/locals', localsRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/payments', paymentRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`LOCALS API running on port ${PORT}`);
});

module.exports = { app, server };
