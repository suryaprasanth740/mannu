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

/**
 * Clean up common copy-paste mistakes in the MongoDB connection string
 * (spaces, line breaks, quotes, a leading "MONGODB_URI=") and fail with a
 * hint that never prints the password.
 */
function mongoUri() {
  let uri = String(process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/mannu').trim();
  uri = uri.replace(/^MONGODB_URI\s*=\s*/i, '').trim();
  uri = uri.replace(/^["'`]+|["'`]+$/g, '').trim();
  uri = uri.replace(/\s+/g, '');
  if (!/^mongodb(\+srv)?:\/\//.test(uri)) {
    const start = uri.slice(0, 12).replace(/[^\w:/.+-]/g, '?');
    throw new Error(
      `MONGODB_URI must start with "mongodb+srv://" (yours starts with "${start || '(empty)'}"). ` +
        'Paste the full Atlas connection string with nothing before it.'
    );
  }
  if (/<db_(username|password)>|<password>/i.test(uri)) {
    throw new Error('MONGODB_URI still contains <db_username> or <db_password>. Replace them with your database user and password.');
  }
  return uri;
}

export const env = {
  isProd,
  port: Number(process.env.PORT || 5000),
  mongoUri: mongoUri(),
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  cloudinaryUrl: process.env.CLOUDINARY_URL || '',
  serveClient: process.env.SERVE_CLIENT !== 'false',
  // Secure cookies need HTTPS. Set COOKIE_SECURE=false only to try a production build over plain http on localhost.
  cookieSecure: isProd && process.env.COOKIE_SECURE !== 'false',
};
