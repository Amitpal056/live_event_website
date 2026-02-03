const express = require('express');
const passport = require('passport');
const crypto = require('crypto');
const User = require('../models/User');

const router = express.Router();

const useMockAuth = process.env.USE_MOCK_AUTH === 'true';

const signToken = (payload) => {
  const secret = process.env.SESSION_SECRET || 'your-secret-key';
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${signature}`;
};

const verifyToken = (token) => {
  const secret = process.env.SESSION_SECRET || 'your-secret-key';
  const [data, signature] = (token || '').split('.');
  if (!data || !signature) return null;
  const expected = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  if (expected !== signature) return null;
  try {
    return JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
  } catch (err) {
    return null;
  }
};

router.get('/me', (req, res) => {
  if (req.user) return res.json(req.user);
  if (req.session && req.session.user) return res.json(req.session.user);
  if (req.headers['x-auth-token']) {
    const payload = verifyToken(req.headers['x-auth-token']);
    if (payload?.userId) {
      return User.findById(payload.userId)
        .then((user) => (user ? res.json(user) : res.status(401).json({ error: 'Not authenticated' })))
        .catch(() => res.status(401).json({ error: 'Not authenticated' }));
    }
  }
  if (useMockAuth && req.headers['x-mock-token']) {
    const email = Buffer.from(req.headers['x-mock-token'], 'base64').toString('utf8');
    return User.findOne({ email })
      .then((user) => {
        if (!user) return res.status(401).json({ error: 'Not authenticated' });
        return res.json(user);
      })
      .catch(() => res.status(401).json({ error: 'Not authenticated' }));
  }
  return res.status(401).json({ error: 'Not authenticated' });
});

if (useMockAuth) {
  router.post('/mock-login', async (req, res) => {
    try {
      const { email, displayName } = req.body;
      if (!email) return res.status(400).json({ error: 'Email is required' });

      const googleId = `mock-${email}`;
      let user = await User.findOne({ googleId });
      if (!user) {
        user = await User.create({
          googleId,
          displayName: displayName || email.split('@')[0],
          email
        });
      }

      const token = Buffer.from(email).toString('base64');
      return res.json({ user, token });
    } catch (err) {
      return res.status(500).json({ error: 'Mock login failed' });
    }
  });
} else {
  router.get(
    '/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
  );

  router.get(
    '/google/callback',
    passport.authenticate('google', { failureRedirect: '/' }),
    (req, res) => {
      const token = signToken({ userId: req.user.id, ts: Date.now() });
      const redirectBase = process.env.AUTH_SUCCESS_REDIRECT || '/';
      const joiner = redirectBase.includes('?') ? '&' : '?';
      res.redirect(`${redirectBase}${joiner}token=${token}`);
    }
  );
}

router.post('/logout', (req, res) => {
  req.logout(() => {
    if (req.session) req.session.destroy(() => res.json({ success: true }));
    else res.json({ success: true });
  });
});

module.exports = router;
