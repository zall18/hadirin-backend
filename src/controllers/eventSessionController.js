// controllers/eventSessionController.js
const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');

const pg = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * CREATE SESSION
 * Menambahkan sesi baru ke event
 */
const createSession = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { eventId } = req.params;
    const userId = req.user.id;

    // Verifikasi event milik user
    const event = await prisma.event.findFirst({
      where: {
        id: parseInt(eventId),
        ownerId: userId,
        deletedAt: null,
      },
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    const {
      name,
      sessionType,
      description,
      date,
      startTime,
      endTime,
      venueName,
      venueType,
      venueAddress,
      googleMapsUrl,
      hasCheckIn,
      checkInOpenAt,
      checkInCloseAt,
      maxCapacity,
      sortOrder,
    } = req.body;

    const session = await prisma.eventSession.create({
      data: {
        eventId: parseInt(eventId),
        name,
        sessionType: sessionType || 'RESEPSI',
        description,
        date: new Date(date),
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        venueName: venueName || event.venueName,
        venueType: venueType || event.venueType,
        venueAddress: venueAddress || event.venueAddress,
        googleMapsUrl: googleMapsUrl || event.googleMapsUrl,
        hasCheckIn: hasCheckIn !== undefined ? hasCheckIn : true,
        checkInOpenAt: checkInOpenAt ? new Date(checkInOpenAt) : null,
        checkInCloseAt: checkInCloseAt ? new Date(checkInCloseAt) : null,
        maxCapacity: maxCapacity ? parseInt(maxCapacity) : null,
        sortOrder: sortOrder || 0,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Session created successfully',
      data: session,
    });
  } catch (error) {
    console.error('Create session error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * GET ALL SESSIONS for an event
 */
const getSessions = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    // Verifikasi event milik user
    const event = await prisma.event.findFirst({
      where: {
        id: parseInt(eventId),
        ownerId: userId,
        deletedAt: null,
      },
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    const sessions = await prisma.eventSession.findMany({
      where: { eventId: parseInt(eventId) },
      orderBy: { sortOrder: 'asc' },
    });

    return res.status(200).json({
      success: true,
      data: sessions,
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * GET SESSION BY ID
 */
const getSessionById = async (req, res) => {
  try {
    const { eventId, sessionId } = req.params;
    const userId = req.user.id;

    // Verifikasi event milik user
    const event = await prisma.event.findFirst({
      where: {
        id: parseInt(eventId),
        ownerId: userId,
        deletedAt: null,
      },
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    const session = await prisma.eventSession.findFirst({
      where: {
        id: parseInt(sessionId),
        eventId: parseInt(eventId),
      },
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error('Get session by id error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * UPDATE SESSION
 */
const updateSession = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { eventId, sessionId } = req.params;
    const userId = req.user.id;

    // Verifikasi event milik user
    const event = await prisma.event.findFirst({
      where: {
        id: parseInt(eventId),
        ownerId: userId,
        deletedAt: null,
      },
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    // Cek session ada
    const existingSession = await prisma.eventSession.findFirst({
      where: {
        id: parseInt(sessionId),
        eventId: parseInt(eventId),
      },
    });

    if (!existingSession) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    const updateData = { ...req.body };

    // Konversi date/time jika ada
    if (updateData.date) updateData.date = new Date(updateData.date);
    if (updateData.startTime) updateData.startTime = new Date(updateData.startTime);
    if (updateData.endTime) updateData.endTime = new Date(updateData.endTime);
    if (updateData.checkInOpenAt) updateData.checkInOpenAt = new Date(updateData.checkInOpenAt);
    if (updateData.checkInCloseAt) updateData.checkInCloseAt = new Date(updateData.checkInCloseAt);
    if (updateData.maxCapacity) updateData.maxCapacity = parseInt(updateData.maxCapacity);

    const updatedSession = await prisma.eventSession.update({
      where: { id: parseInt(sessionId) },
      data: updateData,
    });

    return res.status(200).json({
      success: true,
      message: 'Session updated successfully',
      data: updatedSession,
    });
  } catch (error) {
    console.error('Update session error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * DELETE SESSION
 */
const deleteSession = async (req, res) => {
  try {
    const { eventId, sessionId } = req.params;
    const userId = req.user.id;

    // Verifikasi event milik user
    const event = await prisma.event.findFirst({
      where: {
        id: parseInt(eventId),
        ownerId: userId,
        deletedAt: null,
      },
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    // Cek session ada
    const session = await prisma.eventSession.findFirst({
      where: {
        id: parseInt(sessionId),
        eventId: parseInt(eventId),
      },
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    // Hapus (hard delete karena session tidak memiliki soft delete)
    await prisma.eventSession.delete({
      where: { id: parseInt(sessionId) },
    });

    return res.status(200).json({
      success: true,
      message: 'Session deleted successfully',
    });
  } catch (error) {
    console.error('Delete session error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

module.exports = {
  createSession,
  getSessions,
  getSessionById,
  updateSession,
  deleteSession,
};