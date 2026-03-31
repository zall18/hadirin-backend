// controllers/staffController.js
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const pg = require('pg');

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });


/**
 * CREATE STAFF ACCOUNT
 * Admin/Client membuat akun untuk petugas di event tertentu
 */
const createStaff = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { eventId } = req.params;
    const userId = req.user.id;
    const {
      email,
      password,
      name,
      phone,
      permissions = ['checkin', 'photo'],
      isTemporary = true,
      expiresAt,
    } = req.body;

    // Verifikasi event milik user (ADMIN atau CLIENT)
    const event = await prisma.event.findFirst({
      where: {
        id: parseInt(eventId),
        deletedAt: null,
        OR: [
          { ownerId: userId },
          { clientId: userId },
        ],
      },
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found or access denied',
      });
    }

    // Cek email sudah terdaftar?
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

    // Buat user STAFF
    const staffUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone: phone || null,
        role: 'STAFF',
        isActive: true,
      },
    });

    // Buat relasi UserEventAccess
    const staffAccess = await prisma.userEventAccess.create({
      data: {
        userId: staffUser.id,
        eventId: parseInt(eventId),
        role: 'STAFF',
        permissions,
        isTemporary,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      include: {
        user: {
          select: { id: true, email: true, name: true, phone: true, role: true },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Staff account created successfully',
      data: staffAccess,
    });
  } catch (error) {
    console.error('Create staff error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * GET ALL STAFF for an event
 */
const getEventStaff = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    const event = await prisma.event.findFirst({
      where: {
        id: parseInt(eventId),
        deletedAt: null,
        OR: [
          { ownerId: userId },
          { clientId: userId },
        ],
      },
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found or access denied',
      });
    }

    const staffList = await prisma.userEventAccess.findMany({
      where: {
        eventId: parseInt(eventId),
        role: 'STAFF',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            isActive: true,
            createdAt: true,
            lastLoginAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({
      success: true,
      data: staffList,
    });
  } catch (error) {
    console.error('Get event staff error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * UPDATE STAFF (permissions, expire, status)
 */
const updateStaff = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { eventId, staffId } = req.params;
    const userId = req.user.id;
    const { name, phone, isActive, permissions, expiresAt } = req.body;

    // Verifikasi event owner
    const event = await prisma.event.findFirst({
      where: {
        id: parseInt(eventId),
        deletedAt: null,
        OR: [
          { ownerId: userId },
          { clientId: userId },
        ],
      },
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found or access denied',
      });
    }

    // Cari staff access
    const staffAccess = await prisma.userEventAccess.findFirst({
      where: {
        id: parseInt(staffId),
        eventId: parseInt(eventId),
        role: 'STAFF',
      },
      include: { user: true },
    });

    if (!staffAccess) {
      return res.status(404).json({
        success: false,
        message: 'Staff not found',
      });
    }

    // Update user data jika ada
    if (name || phone || isActive !== undefined) {
      const userUpdate = {};
      if (name) userUpdate.name = name;
      if (phone) userUpdate.phone = phone;
      if (isActive !== undefined) userUpdate.isActive = isActive;
      await prisma.user.update({
        where: { id: staffAccess.userId },
        data: userUpdate,
      });
    }

    // Update access data
    const accessUpdate = {};
    if (permissions) accessUpdate.permissions = permissions;
    if (expiresAt) accessUpdate.expiresAt = new Date(expiresAt);
    const updatedAccess = await prisma.userEventAccess.update({
      where: { id: parseInt(staffId) },
      data: accessUpdate,
      include: { user: true },
    });

    return res.status(200).json({
      success: true,
      message: 'Staff updated successfully',
      data: updatedAccess,
    });
  } catch (error) {
    console.error('Update staff error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * DELETE STAFF (revoke access)
 */
const deleteStaff = async (req, res) => {
  try {
    const { eventId, staffId } = req.params;
    const userId = req.user.id;

    const event = await prisma.event.findFirst({
      where: {
        id: parseInt(eventId),
        deletedAt: null,
        OR: [
          { ownerId: userId },
          { clientId: userId },
        ],
      },
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found or access denied',
      });
    }

    const staffAccess = await prisma.userEventAccess.findFirst({
      where: {
        id: parseInt(staffId),
        eventId: parseInt(eventId),
        role: 'STAFF',
      },
    });

    if (!staffAccess) {
      return res.status(404).json({
        success: false,
        message: 'Staff not found',
      });
    }

    // Revoke access (soft delete with revokedAt)
    await prisma.userEventAccess.update({
      where: { id: parseInt(staffId) },
      data: { revokedAt: new Date() },
    });

    // Optionally, nonaktifkan user jika tidak punya akses ke event lain
    const otherAccess = await prisma.userEventAccess.count({
      where: { userId: staffAccess.userId, revokedAt: null },
    });
    if (otherAccess === 0) {
      await prisma.user.update({
        where: { id: staffAccess.userId },
        data: { isActive: false },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Staff access revoked',
    });
  } catch (error) {
    console.error('Delete staff error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

module.exports = {
  createStaff,
  getEventStaff,
  updateStaff,
  deleteStaff,
};