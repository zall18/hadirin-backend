// controllers/uploadController.js
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const { getImageUrl } = require('../utils/imageUrl');

const pg = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Upload cover image untuk event
 */
const uploadCoverImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
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
      // Hapus file yang sudah terupload
      fs.unlinkSync(req.file.path);
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    // Generate URL
    const imageUrl = getImageUrl(req.file.path, req);

    // Update event dengan cover image baru
    const updatedEvent = await prisma.event.update({
      where: { id: parseInt(eventId) },
      data: {
        coverImageUrl: imageUrl,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Cover image uploaded successfully',
      data: {
        coverImageUrl: imageUrl,
      },
    });
  } catch (error) {
    console.error('Upload cover image error:', error);
    // Hapus file jika error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Upload logo untuk event
 */
const uploadLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    const { eventId } = req.params;
    const userId = req.user.id;

    const event = await prisma.event.findFirst({
      where: {
        id: parseInt(eventId),
        ownerId: userId,
        deletedAt: null,
      },
    });

    if (!event) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    const imageUrl = getImageUrl(req.file.path, req);

    const updatedEvent = await prisma.event.update({
      where: { id: parseInt(eventId) },
      data: {
        logoUrl: imageUrl,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Logo uploaded successfully',
      data: {
        logoUrl: imageUrl,
      },
    });
  } catch (error) {
    console.error('Upload logo error:', error);
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Upload gallery images (multiple)
 */
const uploadGalleryImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded',
      });
    }

    const { eventId } = req.params;
    const userId = req.user.id;

    const event = await prisma.event.findFirst({
      where: {
        id: parseInt(eventId),
        ownerId: userId,
        deletedAt: null,
      },
    });

    if (!event) {
      // Hapus semua file yang sudah diupload
      req.files.forEach(file => fs.unlinkSync(file.path));
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    // Generate URLs
    const imageUrls = req.files.map(file => getImageUrl(file.path, req));

    // Gabungkan dengan gallery existing
    const currentGallery = event.galleryImages || [];
    const newGallery = [...currentGallery, ...imageUrls];

    // Update event
    const updatedEvent = await prisma.event.update({
      where: { id: parseInt(eventId) },
      data: {
        galleryImages: newGallery,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Gallery images uploaded successfully',
      data: {
        galleryImages: imageUrls,
        allGalleryImages: newGallery,
      },
    });
  } catch (error) {
    console.error('Upload gallery error:', error);
    if (req.files) {
      req.files.forEach(file => fs.unlinkSync(file.path));
    }
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Upload foto mempelai (groom/bride)
 */
const uploadCouplePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    const { eventId, type } = req.params; // type = 'groom' atau 'bride'
    const userId = req.user.id;

    if (!['groom', 'bride'].includes(type)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Invalid photo type. Must be "groom" or "bride"',
      });
    }

    const event = await prisma.event.findFirst({
      where: {
        id: parseInt(eventId),
        ownerId: userId,
        deletedAt: null,
      },
    });

    if (!event) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    const imageUrl = getImageUrl(req.file.path, req);

    // Update field yang sesuai
    const updateData = type === 'groom' 
      ? { groomPhotoUrl: imageUrl } 
      : { bridePhotoUrl: imageUrl };

    const updatedEvent = await prisma.event.update({
      where: { id: parseInt(eventId) },
      data: updateData,
    });

    return res.status(200).json({
      success: true,
      message: `${type} photo uploaded successfully`,
      data: {
        photoUrl: imageUrl,
      },
    });
  } catch (error) {
    console.error('Upload couple photo error:', error);
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

module.exports = {
  uploadCoverImage,
  uploadLogo,
  uploadGalleryImages,
  uploadCouplePhoto,
};