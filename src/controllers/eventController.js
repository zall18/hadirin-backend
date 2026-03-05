// controllers/eventController.js
const { PrismaClient, UserRole } = require('@prisma/client');
const { validationResult } = require('express-validator');
const { generateSlug, generateShortCode, formatEventResponse } = require('../utils/eventHelpers');

const pg = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });


/**
 * CREATE EVENT
 * Membuat event pernikahan baru
 * Hanya bisa diakses oleh ADMIN
 */
const createEvent = async (req, res) => {
  try {
    // Validasi input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const userId = req.user.id;

    // Cek apakah user adalah ADMIN
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only ADMIN can create events',
      });
    }

    const {
      groomName,
      groomNickname,
      groomFatherName,
      groomMotherName,
      groomPhotoUrl,
      brideName,
      brideNickname,
      brideFatherName,
      brideMotherName,
      bridePhotoUrl,
      weddingTitle,
      religion,
      weddingDate,
      weddingDateHijri,
      venueName,
      venueType,
      venueAddress,
      venueCity,
      venueProvince,
      googleMapsUrl,
      venueLatitude,
      venueLongitude,
      primaryColor,
      secondaryColor,
      fontFamily,
      logoUrl,
      coverImageUrl,
      galleryImages,
      loveStory,
      greetingText,
      invitationType,
      enableRSVP,
      enablePhotoBoothWA,
      autoSendPhotoToWA,
      enableGuestWishes,
      enableLiveCount,
      allowWalkIn,
      requireRSVPToCheckIn,
    } = req.body;

    // Generate slug dan short code
    const slug = generateSlug(groomName, brideName);
    const shortCode = generateShortCode();

    // Buat event baru
    const event = await prisma.event.create({
      data: {
        slug,
        shortCode,
        groomName,
        groomNickname,
        groomFatherName,
        groomMotherName,
        groomPhotoUrl,
        brideName,
        brideNickname,
        brideFatherName,
        brideMotherName,
        bridePhotoUrl,
        weddingTitle: weddingTitle || `The Wedding of ${groomName} & ${brideName}`,
        religion,
        weddingDate: new Date(weddingDate),
        weddingDateHijri,
        venueName,
        venueType,
        venueAddress,
        venueCity,
        venueProvince,
        googleMapsUrl,
        venueLatitude: venueLatitude ? parseFloat(venueLatitude) : null,
        venueLongitude: venueLongitude ? parseFloat(venueLongitude) : null,
        primaryColor: primaryColor || '#7C3AED',
        secondaryColor: secondaryColor || '#F9A8D4',
        fontFamily: fontFamily || 'serif',
        logoUrl,
        coverImageUrl,
        galleryImages: galleryImages || [],
        loveStory,
        greetingText,
        invitationType: invitationType || 'PRIVATE',
        enableRSVP: enableRSVP !== undefined ? enableRSVP : true,
        enablePhotoBoothWA: enablePhotoBoothWA || false,
        autoSendPhotoToWA: autoSendPhotoToWA || false,
        enableGuestWishes: enableGuestWishes !== undefined ? enableGuestWishes : true,
        enableLiveCount: enableLiveCount !== undefined ? enableLiveCount : true,
        allowWalkIn: allowWalkIn !== undefined ? allowWalkIn : true,
        requireRSVPToCheckIn: requireRSVPToCheckIn || false,
        owner: {
          connect: { id: userId },
        },
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Buat default session untuk event
    await prisma.eventSession.createMany({
      data: [
        {
          eventId: event.id,
          name: 'Akad Nikah',
          sessionType: 'AKAD',
          date: event.weddingDate,
          startTime: event.weddingDate,
          endTime: new Date(event.weddingDate.getTime() + 2 * 60 * 60 * 1000), // +2 jam
          venueName: event.venueName,
          venueType: event.venueType,
          venueAddress: event.venueAddress,
          googleMapsUrl: event.googleMapsUrl,
          hasCheckIn: true,
          sortOrder: 1,
        },
        {
          eventId: event.id,
          name: 'Resepsi',
          sessionType: 'RESEPSI',
          date: event.weddingDate,
          startTime: new Date(event.weddingDate.getTime() + 3 * 60 * 60 * 1000), // +3 jam
          endTime: new Date(event.weddingDate.getTime() + 7 * 60 * 60 * 1000), // +7 jam
          venueName: event.venueName,
          venueType: event.venueType,
          venueAddress: event.venueAddress,
          googleMapsUrl: event.googleMapsUrl,
          hasCheckIn: true,
          sortOrder: 2,
        },
      ],
    });

    return res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: formatEventResponse(event),
    });
  } catch (error) {
    console.error('Create event error:', error);
    
    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'Event with this slug or short code already exists',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * GET MY EVENTS
 * Mendapatkan daftar event milik admin yang login
 * Support pagination, search, dan filter
 */
const getMyEvents = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const userId = req.user.id;
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      status = 'all',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (page - 1) * limit;
    const take = parseInt(limit);

    // Build where clause
    const where = {
      ownerId: userId,
      deletedAt: null, // Exclude soft deleted
    };

    // Search filter
    if (search) {
      where.OR = [
        { weddingTitle: { contains: search, mode: 'insensitive' } },
        { groomName: { contains: search, mode: 'insensitive' } },
        { brideName: { contains: search, mode: 'insensitive' } },
        { venueName: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Status filter
    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    } else if (status === 'published') {
      where.isPublished = true;
    } else if (status === 'draft') {
      where.isPublished = false;
    }

    // Get events with pagination
    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        select: {
          id: true,
          slug: true,
          shortCode: true,
          weddingTitle: true,
          groomName: true,
          brideName: true,
          weddingDate: true,
          venueName: true,
          venueType: true,
          venueCity: true,
          coverImageUrl: true,
          isActive: true,
          isPublished: true,
          totalGuests: true,
          confirmedCount: true,
          attendedCount: true,
          wishesCount: true,
          createdAt: true,
          updatedAt: true,
          // Include count of related data
          _count: {
            select: {
              guests: true,
              sessions: true,
              checkIns: true,
              photos: true,
            },
          },
          // Include upcoming sessions
          sessions: {
            where: {
              date: {
                gte: new Date(),
              },
            },
            orderBy: { date: 'asc' },
            take: 1,
            select: {
              id: true,
              name: true,
              sessionType: true,
              date: true,
              startTime: true,
            },
          },
        },
        skip: parseInt(skip),
        take: parseInt(take),
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.event.count({ where }),
    ]);

    // Format response
    const formattedEvents = events.map(event => ({
      id: event.id,
      slug: event.slug,
      shortCode: event.shortCode,
      weddingTitle: event.weddingTitle,
      couple: `${event.groomName} & ${event.brideName}`,
      weddingDate: event.weddingDate,
      venue: {
        name: event.venueName,
        type: event.venueType,
        city: event.venueCity,
      },
      coverImageUrl: event.coverImageUrl,
      status: {
        isActive: event.isActive,
        isPublished: event.isPublished,
      },
      stats: {
        totalGuests: event.totalGuests,
        confirmed: event.confirmedCount,
        attended: event.attendedCount,
        wishes: event.wishesCount,
        guestsCount: event._count.guests,
        sessionsCount: event._count.sessions,
        checkInsCount: event._count.checkIns,
      },
      nextSession: event.sessions[0] || null,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    }));

    return res.status(200).json({
      success: true,
      data: {
        events: formattedEvents,
        pagination: {
          page: parseInt(page),
          limit: parseInt(take),
          total,
          pages: Math.ceil(total / take),
          hasNext: page < Math.ceil(total / take),
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    console.error('Get my events error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * GET EVENT BY ID
 * Mendapatkan detail event berdasarkan ID
 */
const getEventById = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const userId = req.user.id;

    // Cari event
    const event = await prisma.event.findFirst({
      where: {
        id: parseInt(id),
        ownerId: userId, // Pastikan hanya owner yang bisa akses
        deletedAt: null,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        sessions: {
          orderBy: { sortOrder: 'asc' },
        },
        guests: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            phone: true,
            status: true,
            rsvpStatus: true,
            checkedInAt: true,
          },
        },
        _count: {
          select: {
            guests: true,
            sessions: true,
            checkIns: true,
            photos: true,
            guestWishes: true,
          },
        },
      },
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    // Get recent check-ins
    const recentCheckIns = await prisma.checkInLog.findMany({
      where: { eventId: event.id },
      take: 10,
      orderBy: { checkedInAt: 'desc' },
      include: {
        guest: {
          select: {
            name: true,
            phone: true,
          },
        },
        checkedInBy: {
          select: {
            name: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        ...formatEventResponse(event),
        recentCheckIns: recentCheckIns.map(checkIn => ({
          id: checkIn.id,
          guestName: checkIn.guest.name,
          guestPhone: checkIn.guest.phone,
          checkedInAt: checkIn.checkedInAt,
          checkedInBy: checkIn.checkedInBy?.name,
          method: checkIn.method,
          arrivedCount: checkIn.arrivedCount,
        })),
        stats: {
          total: event._count,
          summary: {
            totalGuests: event.totalGuests,
            confirmed: event.confirmedCount,
            attended: event.attendedCount,
            wishes: event.wishesCount,
          },
        },
      },
    });
  } catch (error) {
    console.error('Get event by id error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * GET EVENT BY SLUG
 * Untuk halaman publik (tanpa autentikasi)
 */
const getEventBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const event = await prisma.event.findFirst({
      where: {
        slug,
        isPublished: true,
        isActive: true,
        deletedAt: null,
      },
      include: {
        sessions: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    // Remove sensitive data untuk public
    const publicEvent = {
      ...formatEventResponse(event),
      // Hapus data internal
      owner: undefined,
      totalGuests: undefined,
      confirmedCount: undefined,
      attendedCount: undefined,
      settings: {
        ...event,
        // Hanya tampilkan setting yang relevan untuk publik
        enableRSVP: event.enableRSVP,
        enableGuestWishes: event.enableGuestWishes,
        enableLiveCount: event.enableLiveCount,
        invitationType: event.invitationType,
      },
    };

    return res.status(200).json({
      success: true,
      data: publicEvent,
    });
  } catch (error) {
    console.error('Get event by slug error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * UPDATE EVENT
 * Mengupdate event yang sudah ada
 */
const updateEvent = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const userId = req.user.id;

    // Cek apakah event exist dan milik user
    const existingEvent = await prisma.event.findFirst({
      where: {
        id: parseInt(id),
        ownerId: userId,
        deletedAt: null,
      },
    });

    if (!existingEvent) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    const updateData = { ...req.body };
    
    // Handle special fields
    if (updateData.weddingDate) {
      updateData.weddingDate = new Date(updateData.weddingDate);
    }
    
    if (updateData.venueLatitude) {
      updateData.venueLatitude = parseFloat(updateData.venueLatitude);
    }
    
    if (updateData.venueLongitude) {
      updateData.venueLongitude = parseFloat(updateData.venueLongitude);
    }

    // Remove fields that shouldn't be updated directly
    delete updateData.id;
    delete updateData.slug;
    delete updateData.shortCode;
    delete updateData.ownerId;
    delete updateData.createdAt;
    delete updateData.totalGuests;
    delete updateData.confirmedCount;
    delete updateData.attendedCount;

    // Update event
    const updatedEvent = await prisma.event.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        sessions: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Event updated successfully',
      data: formatEventResponse(updatedEvent),
    });
  } catch (error) {
    console.error('Update event error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * DELETE EVENT (Soft Delete)
 */
const deleteEvent = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: array(),
      });
    }

    const { id } = req.params;
    const userId = req.user.id;

    // Cek apakah event exist dan milik user
    const existingEvent = await prisma.event.findFirst({
      where: {
        id: parseInt(id),
        ownerId: userId,
        deletedAt: null,
      },
    });

    if (!existingEvent) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    // Soft delete
    await prisma.event.update({
      where: { id: parseInt(id) },
      data: {
        deletedAt: new Date(),
        isActive: false,
        isPublished: false,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Event deleted successfully',
    });
  } catch (error) {
    console.error('Delete event error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * TOGGLE EVENT PUBLISH STATUS
 * Publish/unpublish event
 */
const togglePublishEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const event = await prisma.event.findFirst({
      where: {
        id: parseInt(id),
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

    const updatedEvent = await prisma.event.update({
      where: { id: parseInt(id) },
      data: {
        isPublished: !event.isPublished,
        publishedAt: !event.isPublished ? new Date() : null,
      },
    });

    return res.status(200).json({
      success: true,
      message: `Event ${updatedEvent.isPublished ? 'published' : 'unpublished'} successfully`,
      data: {
        id: updatedEvent.id,
        isPublished: updatedEvent.isPublished,
        publishedAt: updatedEvent.publishedAt,
      },
    });
  } catch (error) {
    console.error('Toggle publish event error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * DUPLICATE EVENT
 * Membuat copy dari event yang sudah ada
 */
const duplicateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get original event
    const originalEvent = await prisma.event.findFirst({
      where: {
        id: parseInt(id),
        ownerId: userId,
        deletedAt: null,
      },
      include: {
        sessions: true,
      },
    });

    if (!originalEvent) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    // Remove fields that shouldn't be duplicated
    const {
      id: _id,
      slug: _slug,
      shortCode: _shortCode,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      deletedAt: _deletedAt,
      totalGuests: _totalGuests,
      confirmedCount: _confirmedCount,
      attendedCount: _attendedCount,
      wishesCount: _wishesCount,
      isPublished: _isPublished,
      publishedAt: _publishedAt,
      sessions,
      ...eventData
    } = originalEvent;

    // Generate new slug and short code
    const newSlug = `${eventData.slug}-copy-${Date.now().toString(36)}`;
    const newShortCode = generateShortCode();

    // Create new event
    const newEvent = await prisma.event.create({
      data: {
        ...eventData,
        slug: newSlug,
        shortCode: newShortCode,
        weddingTitle: `${eventData.weddingTitle} (Copy)`,
        isPublished: false,
        publishedAt: null,
        owner: {
          connect: { id: userId },
        },
        // Duplicate sessions
        sessions: {
          create: sessions.map(session => ({
            name: session.name,
            sessionType: session.sessionType,
            description: session.description,
            date: session.date,
            startTime: session.startTime,
            endTime: session.endTime,
            venueName: session.venueName,
            venueType: session.venueType,
            venueAddress: session.venueAddress,
            googleMapsUrl: session.googleMapsUrl,
            hasCheckIn: session.hasCheckIn,
            checkInOpenAt: session.checkInOpenAt,
            checkInCloseAt: session.checkInCloseAt,
            maxCapacity: session.maxCapacity,
            sortOrder: session.sortOrder,
          })),
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Event duplicated successfully',
      data: {
        id: newEvent.id,
        slug: newEvent.slug,
        weddingTitle: newEvent.weddingTitle,
      },
    });
  } catch (error) {
    console.error('Duplicate event error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

module.exports = {
  createEvent,
  getMyEvents,
  getEventById,
  getEventBySlug,
  updateEvent,
  deleteEvent,
  togglePublishEvent,
  duplicateEvent,
};