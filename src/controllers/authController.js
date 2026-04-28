// controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { jwtSecret, jwtExpiresIn, jwtRefreshSecret, jwtRefreshExpiresIn } = require('../config/jwt');
const pg = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Generate JWT tokens
 */
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
    },
    jwtSecret,
    { expiresIn: jwtExpiresIn }
  );

  const refreshToken = jwt.sign(
    {
      userId: user.id,
      tokenType: 'refresh',
    },
    jwtRefreshSecret,
    { expiresIn: jwtRefreshExpiresIn }
  );

  return { accessToken, refreshToken };
};

/**
 * Register User Baru
 * Hanya bisa register sebagai STAFF (untuk flow normal)
 * SUPER_ADMIN dan ADMIN harus dibuat oleh SUPER_ADMIN
 */
const register = async (req, res) => {
  try {
    // Validasi input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { email, password, name, phone } = req.body;

    // Cek apakah email sudah terdaftar
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered',
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Buat user baru (default role: STAFF)
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone,
        role: 'STAFF', // Default role
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user,
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: jwtExpiresIn,
        },
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

/**
 * Login User
 */
const login = async (req, res) => {
  try {
    // Validasi input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { email, password, ipAddress } = req.body;re
    // Cari user berdasarkan email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        lockedUntil: true,
        loginAttempts: true,
      },
    });

    // Cek apakah user ada
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Cek apakah akun aktif
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact administrator.',
      });
    }

    // Cek apakah akun terkunci
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      return res.status(403).json({
        success: false,
        message: `Account is locked until ${user.lockedUntil}. Please try again later.`,
      });
    }
    // Verifikasi password
    const isValidPassword = await bcrypt.compare(password , user.password);
    // console.log("is valid password " + isValidPassword);
    if (!isValidPassword) {
      // Increment login attempts
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          loginAttempts: {
            increment: 1,
          },
          // Lock account after 5 failed attempts
          ...(user.loginAttempts + 1 >= 5 && {
            lockedUntil: new Date(Date.now() + 30 * 60 * 1000), // Lock for 30 minutes
          }),
        },
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        attemptsLeft: 5 - (user.loginAttempts + 1),
      });
    }

    // Reset login attempts dan update last login
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        loginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress || req.ip,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        lastLoginAt: true,
      },
    });

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(updatedUser);

    res.cookie('token', accessToken, {
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          maxAge: 24 * 60 * 60 * 1000
      });
    res.cookie('refreshToken', refreshToken, {
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          maxAge: 24 * 60 * 60 * 1000
      });


    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: updatedUser,
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: jwtExpiresIn,
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

/**
 * Refresh Token
 * Mendapatkan access token baru menggunakan refresh token
 */
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const refreshTokenCookie = req.cookies?.refreshToken;
    console.log(refreshTokenCookie);

    if (!refreshTokenCookie && !refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required',
      });
    }

    // Verifikasi refresh token
    const decoded = jwt.verify(refreshToken ? refreshToken : refreshTokenCookie, jwtRefreshSecret);

    // Cari user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
      });
    }

    // Generate new tokens
    const tokens = generateTokens(user);

      res.cookie('token', tokens.accessToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000
    });
    res.cookie('refreshToken', tokens.refreshToken, {
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          maxAge: 24 * 60 * 60 * 1000
      });

    return res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: jwtExpiresIn,
        },
      },
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Refresh token expired',
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

/**
 * Logout
 * Client-side: hapus tokens
 * Server-side: bisa implementasi token blacklist jika diperlukan
 */
const logout = async (req, res) => {
  try {
    // Untuk stateless JWT, logout cukup di-handle di client
    // Tapi kita bisa log aktivitas logout jika diperlukan
    
    
    // Update last activity atau log logout
    if (req.user) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: {
          lastLoginAt: new Date(), // Update sebagai aktivitas terakhir
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

/**
 * Get Current User Profile
 */
const getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
        lastLoginAt: true,
        emailVerifiedAt: true,
        // Include event access jika user adalah STAFF
        eventAccess: req.user.role === 'STAFF' ? {
          include: {
            event: {
              select: {
                id: true,
                slug: true,
                weddingTitle: true,
              },
            },
          },
        } : false,
        // Include owned events jika user adalah ADMIN
        ownedEvents: req.user.role === 'ADMIN' ? {
          select: {
            id: true,
            slug: true,
            weddingTitle: true,
            weddingDate: true,
            totalGuests: true,
            attendedCount: true,
          },
        } : false,
      },
    });

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

/**
 * Change Password
 */
const changePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        password: true,
      },
    });

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        password: hashedPassword,
        passwordChangedAt: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

/**
 * Forgot Password Request
 * Mengirim email reset password (implementasi dengan email service)
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Cari user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Untuk keamanan, selalu kembalikan success meskipun email tidak ditemukan
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If your email is registered, you will receive a password reset link',
      });
    }

    // Generate reset token (implementasi dengan JWT atau random string)
    const resetToken = jwt.sign(
      { userId: user.id, type: 'reset' },
      jwtSecret,
      { expiresIn: '1h' }
    );

    // TODO: Kirim email dengan reset link
    // resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`
    
    console.log(`Reset token for ${email}: ${resetToken}`); // Untuk development

    return res.status(200).json({
      success: true,
      message: 'If your email is registered, you will receive a password reset link',
      // Hanya kirim token di development
      ...(process.env.NODE_ENV === 'development' && { resetToken }),
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

/**
 * Reset Password
 */
const resetPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { token, newPassword } = req.body;

    // Verifikasi token
    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired reset token',
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: decoded.userId },
      data: {
        password: hashedPassword,
        passwordChangedAt: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  changePassword,
  forgotPassword,
  resetPassword,
};