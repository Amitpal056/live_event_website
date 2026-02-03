const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

const useMockAuth = process.env.USE_MOCK_AUTH === 'true';

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

if (!useMockAuth && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  const defaultCallback = process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}/api/auth/google/callback`
    : 'http://localhost:5000/api/auth/google/callback';
  const callbackUrl = process.env.GOOGLE_CALLBACK_URL || defaultCallback;

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: callbackUrl
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const existing = await User.findOne({ googleId: profile.id });
          if (existing) return done(null, existing);

          const newUser = await User.create({
            googleId: profile.id,
            displayName: profile.displayName,
            email: profile.emails?.[0]?.value || '',
            profilePicture: profile.photos?.[0]?.value || ''
          });
          return done(null, newUser);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
}
