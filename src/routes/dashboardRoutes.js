// routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { verifyToken, authorize, isSuperAdmin } = require('../middleware/auth');

/**
 * @route   GET /api/dashboard/super-admin
 * @desc    Dashboard untuk Super Admin
 * @access  Private - SUPER_ADMIN only
 */
router.get(
  '/super-admin',
  verifyToken,
  isSuperAdmin,
  dashboardController.getSuperAdminDashboard
);

/**
 * @route   GET /api/dashboard/admin/overview
 * @desc    Overview semua event untuk admin yang login
 * @access  Private - ADMIN only
 */
router.get(
  '/admin/overview',
  verifyToken,
  authorize('ADMIN'),
  dashboardController.getAdminOverview
);

/**
 * @route   GET /api/dashboard/event/:eventId
 * @desc    Dashboard detail per event
 * @access  Private - ADMIN only (owner event)
 */
router.get(
  '/event/:eventId',
  verifyToken,
  authorize('ADMIN'),
  dashboardController.getEventDashboard
);

module.exports = router;