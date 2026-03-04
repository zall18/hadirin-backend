// config/jwt.js
module.exports = {
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  jwtExpiresIn: '7d', // token berlaku 7 hari
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
  jwtRefreshExpiresIn: '30d', // refresh token berlaku 30 hari
};