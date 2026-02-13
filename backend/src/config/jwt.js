/**
 * JWT Configuration
 */
require('dotenv').config();

if (!process.env.JWT_SECRET) {
  console.error('⚠️  ERROR: JWT_SECRET environment variable is required!');
  console.error('   Please set JWT_SECRET in your .env file');
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

module.exports = {
  secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
  expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  algorithm: 'HS256'
};