const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const app = express();

require('./config/passport');

// Middleware
const rawOrigins = process.env.FRONTEND_ORIGIN || process.env.AUTH_SUCCESS_REDIRECT || '';
const allowedOrigins = rawOrigins
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean);
app.set('trust proxy', 1);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    const cleanOrigin = origin.replace(/\/$/, '');
    if (allowedOrigins.includes(cleanOrigin)) return cb(null, true);
    return cb(new Error('CORS not allowed'));
  },
  credentials: true
}));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));
app.use(passport.initialize());
app.use(passport.session());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/eventdb', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// Routes
app.use('/api/events', require('./routes/events'));
app.use('/api/auth', require('./routes/auth'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
