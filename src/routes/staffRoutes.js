// routes/staffRoutes.js
const express = require('express');
const router = express.Router({ mergeParams: true });
const staffController = require('../controllers/staffController');
const { verifyToken, authorize } = require('../middlewares/auth');
const {
  createStaffValidator,
  updateStaffValidator,
  staffIdValidator,
} = require('../validators/staffValidators');

// Hanya ADMIN dan CLIENT yang bisa manage staff
router.use(verifyToken, authorize('ADMIN', 'CLIENT'));

/**
 * @route   POST /api/events/:eventId/staff
 * @desc    Create staff account
 */
router.post('/', createStaffValidator, staffController.createStaff);

/**
 * @route   GET /api/events/:eventId/staff
 * @desc    Get all staff for event
 */
router.get('/', staffController.getEventStaff);

/**
 * @route   PUT /api/events/:eventId/staff/:staffId
 * @desc    Update staff
 */
router.put('/:staffId', updateStaffValidator, staffController.updateStaff);

/**
 * @route   DELETE /api/events/:eventId/staff/:staffId
 * @desc    Delete/revoke staff
 */
router.delete('/:staffId', staffIdValidator, staffController.deleteStaff);

module.exports = router;