/**
 * DecodeFXGroup — Backend API
 * Node.js + Express + MongoDB
 * ============================
 * Start: node server.js
 * Dev:   npm run dev  (uses nodemon)
 */

const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const path       = require('path');
require('dotenv').config();

const app = express();

// ─────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // we serve inline HTML — disable CSP for now
}));

// CORS — allow frontend origin
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:5500',   // Live Server (VSCode)
  'http://127.0.0.1:5500',
];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('CORS not allowed from: ' + origin));
  },
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// ─────────────────────────────────────────
// RATE LIMITING
// ─────────────────────────────────────────

// Global limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests — please try again later.' },
});
app.use('/api', globalLimiter);

// Strict limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // max 10 login attempts per 15 mins per IP
  message: { success: false, message: 'Too many login attempts — please wait 15 minutes.' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Contact form limiter
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { success: false, message: 'Too many messages sent — please wait an hour.' },
});
app.use('/api/contact', contactLimiter);

// ─────────────────────────────────────────
// SERVE STATIC FRONTEND
// ─────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../frontend')));

// ─────────────────────────────────────────
// MONGODB CONNECTION
// ─────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
})
.then(() => console.log('✅  MongoDB connected'))
.catch(err => {
  console.error('❌  MongoDB connection error:', err.message);
  process.exit(1);
});

// ─────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/payments',      require('./routes/payments'));
app.use('/api/contact',       require('./routes/contact'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
  });
});

// ─────────────────────────────────────────
// CATCH-ALL — serve frontend for SPA routing
// ─────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

// ─────────────────────────────────────────
// GLOBAL ERROR HANDLER
// ─────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('🔥 Unhandled error:', err.message);
  const status = err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
});

// ─────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀  Server running on port ${PORT}`);
  console.log(`    Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`    Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
