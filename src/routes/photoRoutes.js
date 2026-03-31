// routes/photoRoutes.js
const express = require('express');
const router = express.Router({ mergeParams: true });
const photoController = require('../controllers/photoController');
const { verifyToken } = require('../middlewares/auth');
const {
  uploadPhotoValidator,
  sendWhatsAppValidator,
  resendPhotoValidator,
} = require('../validators/photoValidators');

// Semua route memerlukan autentikasi
router.use(verifyToken);

/**
 * @route   POST /api/events/:eventId/photos/upload
 * @desc    Upload photo from webcam (photo booth)
 * @access  Private (STAFF, ADMIN, CLIENT with proper access)
 */
router.post('/upload', uploadPhotoValidator, photoController.uploadPhoto);

/**
 * @route   POST /api/events/:eventId/photos/:photoId/send-wa
 * @desc    Send photo via WhatsApp manually
 * @access  Private (STAFF, ADMIN, CLIENT)
 */
router.post('/:photoId/send-wa', sendWhatsAppValidator, photoController.sendWhatsApp);

/**
 * @route   GET /api/events/:eventId/photos
 * @desc    Get all photos for event
 * @access  Private (STAFF, ADMIN, CLIENT)
 */
router.get('/', photoController.getPhotos);

/**
 * @route   GET /api/events/:eventId/photos/:photoId
 * @desc    Get photo by ID
 * @access  Private
 */
router.get('/:photoId', photoController.getPhotoById);

module.exports = router;