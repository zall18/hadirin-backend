// controllers/photoController.js
const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { processAndSavePhoto } = require('../utils/imageProcessor');
const { getWhatsAppService } = require('../services/whatsappService');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });


// Konfigurasi multer untuk upload foto (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedTypes.test(file.mimetype);
    if (ext && mime) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'), false);
    }
  },
});

/**
 * UPLOAD PHOTO (Photo Booth)
 * Menerima file gambar dari webcam frontend
 * Bisa langsung dikirim via WhatsApp jika autoSendPhotoToWA di event aktif
 */
const uploadPhoto = (req, res) => {
  const uploadSingle = upload.single('photo');
  
  uploadSingle(req, res, async (err) => {
    try {
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }

      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No photo uploaded' });
      }

      const { eventId } = req.params;
      let { guestId, phone, sendWhatsApp = false } = req.body;
      const userId = req.user.id;
      const userRole = req.user.role;

      // Verifikasi event akses (untuk STAFF, ADMIN, CLIENT)
      let hasAccess = false;
      let event = null;
      
      if (userRole === 'SUPER_ADMIN') {
        hasAccess = true;
        event = await prisma.event.findFirst({
          where: { id: parseInt(eventId), deletedAt: null },
        });
      } else if (userRole === 'ADMIN' || userRole === 'CLIENT') {
        event = await prisma.event.findFirst({
          where: {
            id: parseInt(eventId),
            deletedAt: null,
            OR: [
              { ownerId: userId },
              { clientId: userId },
            ],
          },
        });
        if (event) hasAccess = true;
      } else if (userRole === 'STAFF') {
        const staffAccess = await prisma.userEventAccess.findFirst({
          where: {
            userId: userId,
            eventId: parseInt(eventId),
            revokedAt: null,
            permissions: { has: 'photo' },
          },
        });
        if (staffAccess) {
          hasAccess = true;
          event = await prisma.event.findUnique({ where: { id: parseInt(eventId) } });
        }
      }

      if (!hasAccess || !event) {
        return res.status(403).json({
          success: false,
          message: 'Access denied or event not found',
        });
      }

      // Jika guestId tidak diberikan, cari berdasarkan phone atau nama
      let targetGuestId = guestId ? parseInt(guestId) : null;
      if (!targetGuestId && phone) {
        const guest = await prisma.guest.findFirst({
          where: {
            eventId: parseInt(eventId),
            phone: phone,
            deletedAt: null,
          },
        });
        if (guest) targetGuestId = guest.id;
      }

      // Proses dan simpan foto
      const { filename, filePath, thumbnailPath, fileSize } = await processAndSavePhoto(
        req.file.buffer,
        req.file.originalname,
        { width: 1024, quality: 80 }
      );

      // Simpan record ke database
      const photo = await prisma.eventPhoto.create({
        data: {
          filename,
          filePath,
          thumbnailPath,
          fileSize,
          mimeType: req.file.mimetype,
          eventId: parseInt(eventId),
          guestId: targetGuestId,
          takenById: userId,
          takenAt: new Date(),
          waStatus: 'PENDING',
        },
      });

      // Jika event punya autoSendPhotoToWA dan ada nomor telepon target, kirim otomatis
      const shouldSend = sendWhatsApp === true || sendWhatsApp === 'true' || event.autoSendPhotoToWA;
      let whatsappResult = null;

      if (shouldSend && (targetGuestId || phone)) {
        // Dapatkan nomor telepon
        let targetPhone = phone;
        if (!targetPhone && targetGuestId) {
          const guest = await prisma.guest.findUnique({ where: { id: targetGuestId } });
          if (guest) targetPhone = guest.phone;
        }
        
        if (targetPhone) {
          whatsappResult = await sendPhotoToWhatsApp(photo.id, targetPhone, eventId);
        }
      }

      return res.status(201).json({
        success: true,
        message: 'Photo uploaded successfully',
        data: {
          photo: {
            id: photo.id,
            filename: photo.filename,
            thumbnailUrl: photo.thumbnailPath ? `/uploads/photos/${path.basename(photo.thumbnailPath)}` : null,
            takenAt: photo.takenAt,
          },
          whatsapp: whatsappResult,
        },
      });
    } catch (error) {
      console.error('Upload photo error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  });
};

/**
 * Helper: Kirim foto via WhatsApp dan update status
 */
const sendPhotoToWhatsApp = async (photoId, phone, eventId) => {
  try {
    const photo = await prisma.eventPhoto.findUnique({
      where: { id: photoId },
      include: { event: true },
    });
    if (!photo) throw new Error('Photo not found');

    // Update status menjadi PROCESSING
    await prisma.eventPhoto.update({
      where: { id: photoId },
      data: { waStatus: 'PROCESSING' },
    });

    // Generate public URL untuk foto (asumsikan ada static serve)
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const photoUrl = `${baseUrl}/uploads/photos/${path.basename(photo.filePath)}`;
    
    // Caption
    const caption = `Terima kasih telah hadir di pernikahan ${photo.event.weddingTitle}! 
Berikut foto kenangan Anda. 
Semoga hari bahagia selalu menyertai. 🎉💐`;

    // Kirim via WhatsApp service
    const waService = getWhatsAppService();
    const result = await waService.sendImage(phone, photoUrl, caption);

    // Update status berdasarkan hasil
    const newStatus = result.success ? 'DELIVERED' : 'FAILED';
    await prisma.eventPhoto.update({
      where: { id: photoId },
      data: {
        waStatus: newStatus,
        waMessageId: result.messageId,
        waSentAt: result.success ? new Date() : null,
        waError: result.success ? null : result.error || 'Unknown error',
        retryCount: result.success ? 0 : { increment: 1 },
        nextRetryAt: result.success ? null : new Date(Date.now() + 5 * 60 * 1000), // retry after 5 min
      },
    });

    // Catat log WhatsApp
    await prisma.whatsAppLog.create({
      data: {
        messageId: result.messageId || `failed_${Date.now()}`,
        templateId: 'photo_booth',
        toPhone: phone,
        toName: null,
        messageType: 'PHOTO',
        caption,
        photoId: photoId,
        eventId: eventId,
        status: result.success ? 'SENT' : 'FAILED',
        error: result.success ? null : result.error,
        sentAt: new Date(),
      },
    });

    return {
      success: result.success,
      messageId: result.messageId,
      status: newStatus,
    };
  } catch (error) {
    console.error('Send photo to WhatsApp error:', error);
    // Update status failed
    await prisma.eventPhoto.update({
      where: { id: photoId },
      data: {
        waStatus: 'FAILED',
        waError: error.message,
        retryCount: { increment: 1 },
        nextRetryAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });
    return { success: false, error: error.message };
  }
};

/**
 * SEND WHATSAPP MANUALLY (untuk resend atau kirim ulang)
 */
const sendWhatsApp = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { eventId, photoId } = req.params;
    let { phone, guestId } = req.body;
    const userId = req.user.id;

    // Verifikasi akses (hanya ADMIN, CLIENT, atau STAFF dengan permission photo)
    let hasAccess = false;
    if (req.user.role === 'SUPER_ADMIN') {
      hasAccess = true;
    } else if (req.user.role === 'ADMIN' || req.user.role === 'CLIENT') {
      const event = await prisma.event.findFirst({
        where: {
          id: parseInt(eventId),
          OR: [{ ownerId: userId }, { clientId: userId }],
        },
      });
      if (event) hasAccess = true;
    } else if (req.user.role === 'STAFF') {
      const staffAccess = await prisma.userEventAccess.findFirst({
        where: { userId, eventId: parseInt(eventId), permissions: { has: 'photo' } },
      });
      if (staffAccess) hasAccess = true;
    }

    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Dapatkan foto
    const photo = await prisma.eventPhoto.findUnique({
      where: { id: parseInt(photoId) },
      include: { event: true, guest: true },
    });
    if (!photo || photo.eventId !== parseInt(eventId)) {
      return res.status(404).json({ success: false, message: 'Photo not found' });
    }

    // Tentukan nomor tujuan
    let targetPhone = phone;
    if (!targetPhone && guestId) {
      const guest = await prisma.guest.findUnique({ where: { id: parseInt(guestId) } });
      if (guest) targetPhone = guest.phone;
    }
    if (!targetPhone && photo.guestId) {
      const guest = await prisma.guest.findUnique({ where: { id: photo.guestId } });
      if (guest) targetPhone = guest.phone;
    }
    if (!targetPhone) {
      return res.status(400).json({ success: false, message: 'No phone number provided or associated' });
    }

    // Kirim ulang
    const result = await sendPhotoToWhatsApp(photo.id, targetPhone, parseInt(eventId));

    return res.status(200).json({
      success: result.success,
      message: result.success ? 'WhatsApp sent successfully' : 'Failed to send WhatsApp',
      data: result,
    });
  } catch (error) {
    console.error('Send WhatsApp error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * GET PHOTOS for an event or guest
 */
const getPhotos = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { guestId, page = 1, limit = 20 } = req.query;
    const userId = req.user.id;

    // Verifikasi akses
    let hasAccess = false;
    if (req.user.role === 'SUPER_ADMIN') hasAccess = true;
    else if (req.user.role === 'ADMIN' || req.user.role === 'CLIENT') {
      const event = await prisma.event.findFirst({
        where: { id: parseInt(eventId), OR: [{ ownerId: userId }, { clientId: userId }] },
      });
      if (event) hasAccess = true;
    } else if (req.user.role === 'STAFF') {
      const staffAccess = await prisma.userEventAccess.findFirst({
        where: { userId, eventId: parseInt(eventId) },
      });
      if (staffAccess) hasAccess = true;
    }

    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const where = { eventId: parseInt(eventId) };
    if (guestId) where.guestId = parseInt(guestId);

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [photos, total] = await Promise.all([
      prisma.eventPhoto.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { takenAt: 'desc' },
        include: {
          guest: { select: { id: true, name: true, phone: true } },
          takenBy: { select: { id: true, name: true } },
        },
      }),
      prisma.eventPhoto.count({ where }),
    ]);

    // Tambahkan URL
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const photosWithUrl = photos.map(photo => ({
      ...photo,
      url: `${baseUrl}/uploads/photos/${path.basename(photo.filePath)}`,
      thumbnailUrl: photo.thumbnailPath ? `${baseUrl}/uploads/photos/${path.basename(photo.thumbnailPath)}` : null,
    }));

    return res.status(200).json({
      success: true,
      data: {
        photos: photosWithUrl,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Get photos error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * GET PHOTO BY ID
 */
const getPhotoById = async (req, res) => {
  try {
    const { eventId, photoId } = req.params;
    const userId = req.user.id;

    // Verifikasi akses sama seperti di atas
    let hasAccess = false;
    if (req.user.role === 'SUPER_ADMIN') hasAccess = true;
    else if (req.user.role === 'ADMIN' || req.user.role === 'CLIENT') {
      const event = await prisma.event.findFirst({
        where: { id: parseInt(eventId), OR: [{ ownerId: userId }, { clientId: userId }] },
      });
      if (event) hasAccess = true;
    } else if (req.user.role === 'STAFF') {
      const staffAccess = await prisma.userEventAccess.findFirst({
        where: { userId, eventId: parseInt(eventId) },
      });
      if (staffAccess) hasAccess = true;
    }

    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const photo = await prisma.eventPhoto.findFirst({
      where: { id: parseInt(photoId), eventId: parseInt(eventId) },
      include: {
        guest: true,
        takenBy: true,
        whatsAppLogs: true,
        checkInLog: true,
      },
    });

    if (!photo) {
      return res.status(404).json({ success: false, message: 'Photo not found' });
    }

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const photoWithUrl = {
      ...photo,
      url: `${baseUrl}/uploads/photos/${path.basename(photo.filePath)}`,
      thumbnailUrl: photo.thumbnailPath ? `${baseUrl}/uploads/photos/${path.basename(photo.thumbnailPath)}` : null,
    };

    return res.status(200).json({
      success: true,
      data: photoWithUrl,
    });
  } catch (error) {
    console.error('Get photo by id error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = {
  uploadPhoto,
  sendWhatsApp,
  getPhotos,
  getPhotoById,
};