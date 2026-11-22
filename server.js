const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const db = require('./src/config/db');
const authRoutes = require('./src/routes/authRoutes');
const roomRoutes = require('./src/routes/roomRoutes');
const bookingRoutes = require('./src/routes/bookingRoutes');
const userRoutes = require('./src/routes/userRoutes');
const reportRoutes = require('./src/routes/reportRoutes');
const paymentRoutes = require('./src/routes/paymentRoutes');
const errorHandler = require('./src/middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Static Frontend Assets (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/payments', paymentRoutes);

// Health check / API status endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    uptime: process.uptime(),
    db_client: db.getDbType(),
    timestamp: new Date().toISOString(),
  });
});

// Fallback route for Single Page Application & 404 handler
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'API Endpoint ไม่ถูกต้อง' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global Error Handler
app.use(errorHandler);

// Start Server and Database initialization
async function startServer() {
  try {
    await db.initDatabase();
    app.listen(PORT, () => {
      console.log('====================================================');
      console.log(`🚀 Meeting Room Booking System is running!`);
      console.log(`🌐 Local URL: http://localhost:${PORT}`);
      console.log(`📊 API Health: http://localhost:${PORT}/api/health`);
      console.log(`🗄️ Database Type: ${db.getDbType().toUpperCase()}`);
      console.log('====================================================');
    });
  } catch (err) {
    console.error('❌ Failed to start application:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
