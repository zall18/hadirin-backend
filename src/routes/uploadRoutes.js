// routes/uploadRoutes.js
const express = require('express');
const router = express.Router({ mergeParams: true });
const uploadController = require('../controllers/uploadController');
const { verifyToken, authorize } = require('../middleware/auth');
const upload = require('../utils/upload');

// Semua route memerlukan auth dan role ADMIN
router.use(verifyToken, authorize('ADMIN'));

/**
 * @route   POST /api/events/:eventId/upload/cover
 * @desc    Upload cover image
 */
router.post('/cover', upload.single('coverImage'), uploadController.uploadCoverImage);

/**
 * @route   POST /api/events/:eventId/upload/logo
 * @desc    Upload logo
 */
router.post('/logo', upload.single('logo'), uploadController.uploadLogo);

/**
 * @route   POST /api/events/:eventId/upload/gallery
 * @desc    Upload multiple gallery images
 */
router.post('/gallery', upload.array('gallery', 10), uploadController.uploadGalleryImages);

/**
 * @route   POST /api/events/:eventId/upload/photo/:type
 * @desc    Upload groom or bride photo
 */
router.post('/photo/:type', upload.single('photo'), uploadController.uploadCouplePhoto);

module.exports = router;