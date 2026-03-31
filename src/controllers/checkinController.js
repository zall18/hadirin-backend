// controllers/checkinController.js
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const pg = require('pg');

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });


/**
 * SCAN QR CHECK-IN
 * Menerima UUID, validasi, update status, catat log
 */
const scanQRCheckin = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { eventId } = req.params;
    const { qrCode, sessionId, arrivedCount = 1 } = req.body;
    const staffId = req.user.id;

    // Verifikasi bahwa staff memiliki akses ke event ini
    const staffAccess = await prisma.userEventAccess.findFirst({
      where: {
        userId: staffId,
        eventId: parseInt(eventId),
        role: 'STAFF',
        revokedAt: null,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });

    if (!staffAccess) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to check-in for this event',
      });
    }

    // Cari guest berdasarkan qrCode (uuid)
    const guest = await prisma.guest.findFirst({
      where: {
        qrCode: qrCode,
        eventId: parseInt(eventId),
        deletedAt: null,
      },
    });

    if (!guest) {
      return res.status(404).json({
        success: false,
        message: 'Invalid QR Code or guest not found',
      });
    }

    // Cek apakah sudah check-in
    if (guest.status === 'ATTENDED') {
      return res.status(409).json({
        success: false,
        message: 'Guest already checked in',
        data: {
          checkedInAt: guest.checkedInAt,
          checkedInBy: guest.checkedInBy,
        },
      });
    }

    // Cek setting event: apakah wajib RSVP dulu?
    const event = await prisma.event.findUnique({
      where: { id: parseInt(eventId) },
    });
    if (event.requireRSVPToCheckIn && guest.rsvpStatus !== 'CONFIRMED') {
      return res.status(400).json({
        success: false,
        message: 'Guest must confirm RSVP before check-in',
      });
    }

    // Siapkan data update guest
    const updateData = {
      status: 'ATTENDED',
      checkedInAt: new Date(),
      checkedInBy: req.user.name || `Staff ID: ${staffId}`,
      actualCount: arrivedCount,
    };

    // Update guest
    const updatedGuest = await prisma.guest.update({
      where: { id: guest.id },
      data: updateData,
    });

    // Catat log check-in
    const checkinLog = await prisma.checkInLog.create({
      data: {
        guestId: guest.id,
        eventId: parseInt(eventId),
        sessionId: sessionId ? parseInt(sessionId) : null,
        arrivedCount: arrivedCount,
        method: 'QR_SCAN',
        checkedInById: staffId,
        deviceType: req.headers['user-agent'] || null,
        ipAddress: req.ip || null,
        note: 'QR Scan check-in',
      },
    });

    // Update event counters (attendedCount)
    await prisma.event.update({
      where: { id: parseInt(eventId) },
      data: { attendedCount: { increment: 1 } },
    });

    return res.status(200).json({
      success: true,
      message: 'Check-in successful',
      data: {
        guest: {
          id: updatedGuest.id,
          name: updatedGuest.name,
          status: updatedGuest.status,
          checkedInAt: updatedGuest.checkedInAt,
        },
        checkinLog,
      },
    });
  } catch (error) {
    console.error('QR check-in error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * MANUAL CHECK-IN
 * Cari tamu berdasarkan nama atau nomor telepon, lalu check-in
 */
const manualCheckin = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { eventId } = req.params;
    const { identifier, sessionId, arrivedCount = 1 } = req.body;
    const staffId = req.user.id;

    // Verifikasi staff access
    const staffAccess = await prisma.userEventAccess.findFirst({
      where: {
        userId: staffId,
        eventId: parseInt(eventId),
        role: 'STAFF',
        revokedAt: null,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });

    if (!staffAccess) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to check-in for this event',
      });
    }

    // Cari guest by name or phone (case insensitive, partial match)
    const guest = await prisma.guest.findFirst({
      where: {
        eventId: parseInt(eventId),
        deletedAt: null,
        OR: [
          { name: { contains: identifier, mode: 'insensitive' } },
          { phone: { contains: identifier, mode: 'insensitive' } },
        ],
      },
    });

    if (!guest) {
      return res.status(404).json({
        success: false,
        message: 'Guest not found with given name/phone',
      });
    }

    // Cek sudah check-in?
    if (guest.status === 'ATTENDED') {
      return res.status(409).json({
        success: false,
        message: 'Guest already checked in',
        data: { checkedInAt: guest.checkedInAt },
      });
    }

    // Cek RSVP requirement
    const event = await prisma.event.findUnique({
      where: { id: parseInt(eventId) },
    });
    if (event.requireRSVPToCheckIn && guest.rsvpStatus !== 'CONFIRMED') {
      return res.status(400).json({
        success: false,
        message: 'Guest must confirm RSVP before check-in',
      });
    }

    // Update guest
    const updatedGuest = await prisma.guest.update({
      where: { id: guest.id },
      data: {
        status: 'ATTENDED',
        checkedInAt: new Date(),
        checkedInBy: req.user.name || `Staff ID: ${staffId}`,
        actualCount: arrivedCount,
      },
    });

    // Log check-in
    const checkinLog = await prisma.checkInLog.create({
      data: {
        guestId: guest.id,
        eventId: parseInt(eventId),
        sessionId: sessionId ? parseInt(sessionId) : null,
        arrivedCount: arrivedCount,
        method: 'MANUAL_SEARCH',
        checkedInById: staffId,
        deviceType: req.headers['user-agent'] || null,
        ipAddress: req.ip || null,
        note: `Manual check-in by search: ${identifier}`,
      },
    });

    // Update event counter
    await prisma.event.update({
      where: { id: parseInt(eventId) },
      data: { attendedCount: { increment: 1 } },
    });

    return res.status(200).json({
      success: true,
      message: 'Manual check-in successful',
      data: {
        guest: {
          id: updatedGuest.id,
          name: updatedGuest.name,
          status: updatedGuest.status,
          checkedInAt: updatedGuest.checkedInAt,
        },
        checkinLog,
      },
    });
  } catch (error) {
    console.error('Manual check-in error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * GET CHECK-IN LOGS
 * Untuk real-time dashboard admin
 */
const getCheckinLogs = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { eventId } = req.params;
    const userId = req.user.id;
    const {
      page = 1,
      limit = 20,
      sessionId,
      method,
      fromDate,
      toDate,
    } = req.query;

    // Verifikasi akses: ADMIN, CLIENT, atau STAFF yang memiliki akses ke event ini
    let hasAccess = false;
    if (req.user.role === 'SUPER_ADMIN') {
      hasAccess = true;
    } else if (req.user.role === 'ADMIN' || req.user.role === 'CLIENT') {
      const event = await prisma.event.findFirst({
        where: {
          id: parseInt(eventId),
          OR: [
            { ownerId: userId },
            { clientId: userId },
          ],
        },
      });
      if (event) hasAccess = true;
    } else if (req.user.role === 'STAFF') {
      const staffAccess = await prisma.userEventAccess.findFirst({
        where: {
          userId: userId,
          eventId: parseInt(eventId),
          revokedAt: null,
        },
      });
      if (staffAccess) hasAccess = true;
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Build where clause
    const where = { eventId: parseInt(eventId) };
    if (sessionId) where.sessionId = parseInt(sessionId);
    if (method) where.method = method;
    if (fromDate || toDate) {
      where.checkedInAt = {};
      if (fromDate) where.checkedInAt.gte = new Date(fromDate);
      if (toDate) where.checkedInAt.lte = new Date(toDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [logs, total] = await Promise.all([
      prisma.checkInLog.findMany({
        where,
        skip,
        take,
        orderBy: { checkedInAt: 'desc' },
        include: {
          guest: {
            select: {
              id: true,
              name: true,
              phone: true,
              category: true,
            },
          },
          checkedInBy: {
            select: {
              id: true,
              name: true,
            },
          },
          session: {
            select: {
              id: true,
              name: true,
              sessionType: true,
            },
          },
        },
      }),
      prisma.checkInLog.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        logs,
        pagination: {
          page: parseInt(page),
          limit: take,
          total,
          totalPages: Math.ceil(total / take),
        },
      },
    });
  } catch (error) {
    console.error('Get check-in logs error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * GET CHECK-IN SUMMARY for an event (for dashboard)
 */
const getCheckinSummary = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    // Verifikasi akses
    let hasAccess = false;
    if (req.user.role === 'SUPER_ADMIN') {
      hasAccess = true;
    } else if (['ADMIN', 'CLIENT'].includes(req.user.role)) {
      const event = await prisma.event.findFirst({
        where: {
          id: parseInt(eventId),
          OR: [
            { ownerId: userId },
            { clientId: userId },
          ],
        },
      });
      if (event) hasAccess = true;
    } else if (req.user.role === 'STAFF') {
      const staffAccess = await prisma.userEventAccess.findFirst({
        where: { userId, eventId: parseInt(eventId), revokedAt: null },
      });
      if (staffAccess) hasAccess = true;
    }

    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Get stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [totalCheckedIn, todayCheckedIn, byMethod, recentLogs] = await Promise.all([
      prisma.checkInLog.count({ where: { eventId: parseInt(eventId) } }),
      prisma.checkInLog.count({
        where: {
          eventId: parseInt(eventId),
          checkedInAt: { gte: today, lt: tomorrow },
        },
      }),
      prisma.checkInLog.groupBy({
        by: ['method'],
        where: { eventId: parseInt(eventId) },
        _count: true,
      }),
      prisma.checkInLog.findMany({
        where: { eventId: parseInt(eventId) },
        orderBy: { checkedInAt: 'desc' },
        take: 10,
        include: {
          guest: { select: { name: true, phone: true } },
          checkedInBy: { select: { name: true } },
        },
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalCheckedIn,
        todayCheckedIn,
        byMethod: byMethod.map(m => ({ method: m.method, count: m._count })),
        recentLogs: recentLogs.map(log => ({
          id: log.id,
          guestName: log.guest.name,
          guestPhone: log.guest.phone,
          checkedInAt: log.checkedInAt,
          checkedInBy: log.checkedInBy?.name,
          method: log.method,
          arrivedCount: log.arrivedCount,
        })),
      },
    });
  } catch (error) {
    console.error('Check-in summary error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

module.exports = {
  scanQRCheckin,
  manualCheckin,
  getCheckinLogs,
  getCheckinSummary,
};