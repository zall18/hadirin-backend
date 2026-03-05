// controllers/adminController.js
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const pg = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Membuat akun Admin baru (hanya oleh Super Admin)
 * Admin ini adalah client / calon pengantin yang memiliki event
 */
const createAdmin = async (req, res) => {
  try {
    // Validasi input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { email, password, name, phone, eventData } = req.body;

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

    // Buat user dengan role ADMIN
    const admin = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone,
        role: 'ADMIN',
        isActive: true,
        // Jika ada data event, buat event sekaligus
        ...(eventData && {
          ownedEvents: {
            create: {
              slug: eventData.slug || generateSlug(name),
              shortCode: generateShortCode(),
              groomName: eventData.groomName || '',
              brideName: eventData.brideName || '',
              weddingTitle: eventData.weddingTitle || `Wedding of ${name}`,
              weddingDate: eventData.weddingDate || new Date(),
              venueName: eventData.venueName || '',
              venueType: eventData.venueType || 'OTHER',
              venueAddress: eventData.venueAddress || '',
              invitationType: eventData.invitationType || 'PRIVATE',
              // Data lainnya
            },
          },
        }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        createdAt: true,
        ownedEvents: {
          select: {
            id: true,
            slug: true,
            weddingTitle: true,
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Admin account created successfully',
      data: admin,
    });
  } catch (error) {
    console.error('Create admin error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

/**
 * Membuat akun Super Admin baru (hanya untuk initial setup)
 * Sebaiknya hanya bisa dipanggil sekali atau via CLI
 */
const createSuperAdmin = async (req, res) => {
  try {
    // Validasi input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { email, password, name, phone, secretKey } = req.body;

    // Verifikasi secret key untuk keamanan (agar tidak sembarang orang bisa bikin super admin)
    const validSecretKey = process.env.SUPER_ADMIN_SECRET_KEY || 'super-secret-key-change-this';
    
    if (secretKey !== validSecretKey) {
      return res.status(403).json({
        success: false,
        message: 'Invalid secret key',
      });
    }

    // Cek apakah sudah ada Super Admin
    const existingSuperAdmin = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' },
    });

    if (existingSuperAdmin) {
      return res.status(409).json({
        success: false,
        message: 'Super Admin already exists. Use update instead.',
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Buat Super Admin
    const superAdmin = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone,
        role: 'SUPER_ADMIN',
        isActive: true,
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

    return res.status(201).json({
      success: true,
      message: 'Super Admin created successfully',
      data: superAdmin,
    });
  } catch (error) {
    console.error('Create super admin error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

/**
 * Mendapatkan daftar semua Admin (hanya Super Admin)
 */
const getAllAdmins = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const skip = (page - 1) * limit;

    // Build where clause
    const where = {
      role: 'ADMIN',
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    // Get admins with pagination
    const [admins, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
          lastLoginAt: true,
          // Include event count
          _count: {
            select: {
              ownedEvents: true,
            },
          },
          // Include recent events
          ownedEvents: {
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              slug: true,
              weddingTitle: true,
              weddingDate: true,
              totalGuests: true,
            },
          },
        },
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        admins,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Get all admins error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

/**
 * Mendapatkan detail Admin berdasarkan ID
 */
const getAdminById = async (req, res) => {
  try {
    const { id } = req.params;

    const admin = await prisma.user.findFirst({
      where: {
        id: parseInt(id),
        role: 'ADMIN',
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        emailVerifiedAt: true,
        // Include all owned events with stats
        ownedEvents: {
          select: {
            id: true,
            slug: true,
            shortCode: true,
            weddingTitle: true,
            groomName: true,
            brideName: true,
            weddingDate: true,
            venueName: true,
            totalGuests: true,
            confirmedCount: true,
            attendedCount: true,
            isActive: true,
            isPublished: true,
            createdAt: true,
          },
          orderBy: { weddingDate: 'desc' },
        },
      },
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: admin,
    });
  } catch (error) {
    console.error('Get admin by id error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

/**
 * Update Admin (hanya Super Admin)
 */
const updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, isActive, email, password } = req.body;

    // Cek apakah admin exist
    const admin = await prisma.user.findFirst({
      where: {
        id: parseInt(id),
        role: 'ADMIN',
      },
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found',
      });
    }

    // Prepare update data
    const updateData = {};
    
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    // Update email (cek duplikat)
    if (email && email !== admin.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });
      
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Email already registered',
        });
      }
      
      updateData.email = email;
    }
    
    // Update password
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
      updateData.passwordChangedAt = new Date();
    }

    // Update admin
    const updatedAdmin = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Admin updated successfully',
      data: updatedAdmin,
    });
  } catch (error) {
    console.error('Update admin error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

/**
 * Delete Admin (soft delete)
 */
const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    // Cek apakah admin exist
    const admin = await prisma.user.findFirst({
      where: {
        id: parseInt(id),
        role: 'ADMIN',
      },
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found',
      });
    }

    // Soft delete (set deletedAt)
    await prisma.user.update({
      where: { id: parseInt(id) },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Admin deleted successfully',
    });
  } catch (error) {
    console.error('Delete admin error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

/**
 * Toggle Admin status (activate/deactivate)
 */
const toggleAdminStatus = async (req, res) => {
  try {
    const { id } = req.params;

    // Cek admin
    const admin = await prisma.user.findFirst({
      where: {
        id: parseInt(id),
        role: 'ADMIN',
      },
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found',
      });
    }

    // Toggle status
    const updatedAdmin = await prisma.user.update({
      where: { id: parseInt(id) },
      data: {
        isActive: !admin.isActive,
      },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: `Admin ${updatedAdmin.isActive ? 'activated' : 'deactivated'} successfully`,
      data: updatedAdmin,
    });
  } catch (error) {
    console.error('Toggle admin status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

/**
 * Helper function: Generate unique slug
 */
const generateSlug = (name) => {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  
  return `${base}-${Date.now().toString(36)}`;
};

/**
 * Helper function: Generate short code (6 karakter)
 */
const generateShortCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

module.exports = {
  createAdmin,
  createSuperAdmin,
  getAllAdmins,
  getAdminById,
  updateAdmin,
  deleteAdmin,
  toggleAdminStatus,
};