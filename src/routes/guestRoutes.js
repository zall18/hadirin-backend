// routes/guestRoutes.js
const express = require('express');
const router = express.Router({ mergeParams: true });
const guestController = require('../controllers/guestController');
const { verifyToken, authorize } = require('../middlewares/auth');
const {
  createGuestValidator,
  updateGuestValidator,
  getGuestsValidator,
  guestIdValidator,
  bulkImportValidator,
} = require('../validators/guestValidators');

// Semua route memerlukan autentikasi dan role ADMIN atau CLIENT
router.use(verifyToken, authorize('ADMIN', 'CLIENT'));

/**
 * @route   POST /api/events/:eventId/guests
 * @desc    Create single guest
 * @access  Private (ADMIN, CLIENT)
 */
router.post('/', createGuestValidator, guestController.createGuest);

/**
 * @route   POST /api/events/:eventId/guests/import
 * @desc    Bulk import guests from Excel/CSV
 * @access  Private (ADMIN, CLIENT)
 */
router.post('/import', bulkImportValidator, guestController.bulkImportGuests);

/**
 * @route   GET /api/events/:eventId/guests/export
 * @desc    Export guests to Excel
 * @access  Private (ADMIN, CLIENT)
 */
router.get('/export', guestController.exportGuests);

/**
 * @route   GET /api/events/:eventId/guests
 * @desc    Get all guests with pagination & filters
 * @access  Private (ADMIN, CLIENT)
 */
router.get('/', getGuestsValidator, guestController.getGuestsByEvent);

/**
 * @route   GET /api/events/:eventId/guests/:guestId
 * @desc    Get guest by ID
 * @access  Private (ADMIN, CLIENT)
 */
router.get('/:guestId', guestIdValidator, guestController.getGuestById);

/**
 * @route   PUT /api/events/:eventId/guests/:guestId
 * @desc    Update guest
 * @access  Private (ADMIN, CLIENT)
 */
router.put('/:guestId', updateGuestValidator, guestController.updateGuest);

/**
 * @route   DELETE /api/events/:eventId/guests/:guestId
 * @desc    Soft delete guest
 * @access  Private (ADMIN, CLIENT)
 */
router.delete('/:guestId', guestIdValidator, guestController.deleteGuest);

module.exports = router;