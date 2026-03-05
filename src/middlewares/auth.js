// middleware/auth.js
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/jwt');
const { PrismaClient } = require('@prisma/client');

const pg = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Middleware untuk verifikasi token JWT
 */
const verifyToken = async (req, res, next) => {
  try {
    // Ambil token dari header Authorization
    const authHeader = req.headers.authorization;
    const authCookies = req.cookies?.token;
    if ((!authHeader || !authHeader.startsWith('Bearer ')) && !authCookies) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      });
    }

    const token = authCookies || authHeader.split(' ')[1];
    
    // Verifikasi token
    const decoded = jwt.verify(token, jwtSecret);
    
    // Cek apakah user masih ada di database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lockedUntil: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    // Cek apakah user aktif
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated',
      });
    }

    // Cek apakah akun terkunci
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      return res.status(403).json({
        success: false,
        message: 'Account is locked. Please try again later.',
      });
    }

    // Simpan user ke request object
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Authentication error',
      error: error.message,
    });
  }
};

/**
 * Middleware untuk role-based access control
 * @param  {...UserRole} allowedRoles - Roles yang diizinkan
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Insufficient permissions',
      });
    }

    next();
  };
};

/**
 * Middleware untuk memastikan user adalah SUPER_ADMIN
 */
const isSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized',
    });
  }

  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Only Super Admin can perform this action',
    });
  }

  next();
};

module.exports = {
  verifyToken,
  authorize,
  isSuperAdmin
};