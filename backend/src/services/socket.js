const jwt = require('jsonwebtoken');

function initSocket(io) {
  // Authenticate socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = payload;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.user.id}`);

    // Join a booking conversation room
    socket.on('join_booking', (bookingId) => {
      socket.join(`booking:${bookingId}`);
    });

    // Leave a booking room
    socket.on('leave_booking', (bookingId) => {
      socket.leave(`booking:${bookingId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.user.id}`);
    });
  });
}

module.exports = { initSocket };
