// controllers/dashboardController.js
const { PrismaClient } = require('@prisma/client');

const pg = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Dashboard untuk Super Admin
 * Menampilkan statistik global semua event
 */
const getSuperAdminDashboard = async (req, res) => {
  try {
    // Total counts
    const [
      totalEvents,
      totalAdmins,
      totalStaff,
      totalGuests,
      totalAttended,
      totalConfirmed,
      recentEvents,
      topEvents,
    ] = await Promise.all([
      prisma.event.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { role: 'ADMIN', isActive: true, deletedAt: null } }),
      prisma.user.count({ where: { role: 'STAFF', isActive: true, deletedAt: null } }),
      prisma.guest.count({ where: { deletedAt: null } }),
      prisma.guest.count({ where: { status: 'ATTENDED', deletedAt: null } }),
      prisma.guest.count({ where: { status: 'CONFIRMED', deletedAt: null } }),
      // 5 event terbaru
      prisma.event.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          slug: true,
          weddingTitle: true,
          groomName: true,
          brideName: true,
          weddingDate: true,
          totalGuests: true,
          attendedCount: true,
          createdAt: true,
          owner: {
            select: { name: true, email: true }
          }
        }
      }),
      // Top events berdasarkan kehadiran
      prisma.event.findMany({
        where: { deletedAt: null, attendedCount: { gt: 0 } },
        orderBy: { attendedCount: 'desc' },
        take: 5,
        select: {
          id: true,
          weddingTitle: true,
          totalGuests: true,
          attendedCount: true,
          confirmedCount: true,
        }
      }),
    ]);

    // Statistik tambahan
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const eventsToday = await prisma.event.count({
      where: {
        deletedAt: null,
        weddingDate: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    const upcomingEvents = await prisma.event.count({
      where: {
        deletedAt: null,
        weddingDate: { gt: new Date() },
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalEvents,
          totalAdmins,
          totalStaff,
          totalGuests,
          totalAttended,
          totalConfirmed,
          attendanceRate: totalGuests > 0 ? ((totalAttended / totalGuests) * 100).toFixed(2) : 0,
          eventsToday,
          upcomingEvents,
        },
        recentEvents,
        topEvents,
      },
    });
  } catch (error) {
    console.error('Super admin dashboard error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Dashboard untuk Admin (per event)
 * Menampilkan statistik detail untuk event tertentu
 */
const getEventDashboard = async (req, res) => {
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
      include: {
        _count: {
          select: {
            guests: true,
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

    // Ambil data tamu berdasarkan status
    const guestsByStatus = await prisma.guest.groupBy({
      by: ['status'],
      where: { eventId: parseInt(eventId), deletedAt: null },
      _count: true,
    });

    const guestsByRSVP = await prisma.guest.groupBy({
      by: ['rsvpStatus'],
      where: { eventId: parseInt(eventId), deletedAt: null },
      _count: true,
    });

    // Check-in hari ini
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const checkInsToday = await prisma.checkInLog.count({
      where: {
        eventId: parseInt(eventId),
        checkedInAt: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    // Check-in per jam (untuk chart)
    const checkInsLast24Hours = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('hour', "checkedInAt") as hour,
        COUNT(*) as count
      FROM "CheckInLog"
      WHERE "eventId" = ${parseInt(eventId)}
        AND "checkedInAt" >= NOW() - INTERVAL '24 hours'
      GROUP BY hour
      ORDER BY hour ASC
    `;

    // Tamu terbaru
    const recentGuests = await prisma.guest.findMany({
      where: { eventId: parseInt(eventId), deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        name: true,
        phone: true,
        status: true,
        rsvpStatus: true,
        createdAt: true,
      },
    });

    // Check-in terbaru
    const recentCheckIns = await prisma.checkInLog.findMany({
      where: { eventId: parseInt(eventId) },
      orderBy: { checkedInAt: 'desc' },
      take: 10,
      include: {
        guest: {
          select: { name: true, phone: true }
        },
        checkedInBy: {
          select: { name: true }
        }
      },
    });

    // Statistik tamu berdasarkan kategori
    const guestsByCategory = await prisma.guest.groupBy({
      by: ['category'],
      where: { eventId: parseInt(eventId), deletedAt: null },
      _count: true,
    });

    // Progress undangan (sudah dikirim via WA)
    const waSentCount = await prisma.guest.count({
      where: {
        eventId: parseInt(eventId),
        waInvitationSentAt: { not: null },
      },
    });

    // Wish terbaru
    const recentWishes = await prisma.guestWish.findMany({
      where: { eventId: parseInt(eventId), isApproved: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        message: true,
        fromName: true,
        createdAt: true,
      },
    });

    // Format response
    const dashboardData = {
      event: {
        id: event.id,
        title: event.weddingTitle,
        slug: event.slug,
        weddingDate: event.weddingDate,
        isPublished: event.isPublished,
        totalGuests: event.totalGuests,
        confirmedCount: event.confirmedCount,
        attendedCount: event.attendedCount,
        wishesCount: event.wishesCount,
      },
      summary: {
        totalGuests: event._count.guests,
        totalCheckIns: event._count.checkIns,
        totalPhotos: event._count.photos,
        totalWishes: event._count.guestWishes,
        checkInsToday,
        waSentCount,
        attendanceRate: event.totalGuests > 0 
          ? ((event.attendedCount / event.totalGuests) * 100).toFixed(2) 
          : 0,
        confirmedRate: event.totalGuests > 0 
          ? ((event.confirmedCount / event.totalGuests) * 100).toFixed(2) 
          : 0,
      },
      guestsByStatus: guestsByStatus.map(g => ({
        status: g.status,
        count: g._count,
      })),
      guestsByRSVP: guestsByRSVP.map(g => ({
        status: g.rsvpStatus,
        count: g._count,
      })),
      guestsByCategory: guestsByCategory.map(g => ({
        category: g.category,
        count: g._count,
      })),
      checkInsPerHour: checkInsLast24Hours.map(item => ({
        hour: item.hour,
        count: Number(item.count) // <-- Ubah BigInt jadi Number biasa
      })),
      recentGuests,
      recentCheckIns: recentCheckIns.map(c => ({
        id: c.id,
        guestName: c.guest.name,
        guestPhone: c.guest.phone,
        checkedInAt: c.checkedInAt,
        checkedInBy: c.checkedInBy?.name,
        method: c.method,
        arrivedCount: c.arrivedCount,
      })),
      recentWishes,
    };

    return res.status(200).json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    console.error('Event dashboard error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Ringkasan semua event milik admin yang login
 */
const getAdminOverview = async (req, res) => {
  try {
    const userId = req.user.id;

    // Ambil semua event milik admin
    const events = await prisma.event.findMany({
      where: {
        ownerId: userId,
        deletedAt: null,
      },
      select: {
        id: true,
        weddingTitle: true,
        slug: true,
        weddingDate: true,
        totalGuests: true,
        confirmedCount: true,
        attendedCount: true,
        wishesCount: true,
        isPublished: true,
        createdAt: true,
      },
      orderBy: { weddingDate: 'desc' },
    });

    // Statistik agregat
    const totalEvents = events.length;
    const totalGuests = events.reduce((acc, e) => acc + e.totalGuests, 0);
    const totalConfirmed = events.reduce((acc, e) => acc + e.confirmedCount, 0);
    const totalAttended = events.reduce((acc, e) => acc + e.attendedCount, 0);
    const totalWishes = events.reduce((acc, e) => acc + e.wishesCount, 0);
    const publishedEvents = events.filter(e => e.isPublished).length;

    // Event terdekat (selanjutnya)
    const upcomingEvents = events
      .filter(e => new Date(e.weddingDate) > new Date())
      .sort((a, b) => new Date(a.weddingDate) - new Date(b.weddingDate))
      .slice(0, 3);

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalEvents,
          totalGuests,
          totalConfirmed,
          totalAttended,
          totalWishes,
          publishedEvents,
          overallAttendanceRate: totalGuests > 0 
            ? ((totalAttended / totalGuests) * 100).toFixed(2) 
            : 0,
          overallConfirmedRate: totalGuests > 0 
            ? ((totalConfirmed / totalGuests) * 100).toFixed(2) 
            : 0,
        },
        events: events,
        upcomingEvents,
      },
    });
  } catch (error) {
    console.error('Admin overview error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

module.exports = {
  getSuperAdminDashboard,
  getEventDashboard,
  getAdminOverview,
};