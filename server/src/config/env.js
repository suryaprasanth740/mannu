import 'dotenv/config';

const isProd = process.env.NODE_ENV === 'production';

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

const jwtSecret = process.env.JWT_SECRET || (isProd ? undefined : 'dev-only-secret-change-me');
if (!jwtSecret) throw new Error('JWT_SECRET must be set in production');
if (isProd && jwtSecret.length < 32) throw new Error('JWT_SECRET must be at least 32 characters');

export const env = {
  isProd,
  port: Number(process.env.PORT || 5000),
  mongoUri: required('MONGODB_URI', 'mongodb://127.0.0.1:27017/mannu'),
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  cloudinaryUrl: process.env.CLOUDINARY_URL || '',
  serveClient: process.env.SERVE_CLIENT !== 'false',
  // Secure cookies need HTTPS. Set COOKIE_SECURE=false only to try a production build over plain http on localhost.
  cookieSecure: isProd && process.env.COOKIE_SECURE !== 'false',
};
