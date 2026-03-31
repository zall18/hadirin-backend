// routes/checkinRoutes.js
const express = require('express');
const router = express.Router({ mergeParams: true });
const checkinController = require('../controllers/checkinController');
const { verifyToken } = require('../middlewares/auth');
const {
  scanQRValidator,
  manualCheckinValidator,
  getCheckinLogsValidator,
} = require('../validators/checkinValidators');

// Semua route memerlukan autentikasi
router.use(verifyToken);

/**
 * @route   POST /api/events/:eventId/checkin/scan
 * @desc    Scan QR code check-in (Staff only, dicek di controller)
 */
router.post('/scan', scanQRValidator, checkinController.scanQRCheckin);

/**
 * @route   POST /api/events/:eventId/checkin/manual
 * @desc    Manual check-in by name/phone (Staff only)
 */
router.post('/manual', manualCheckinValidator, checkinController.manualCheckin);

/**
 * @route   GET /api/events/:eventId/checkin/logs
 * @desc    Get check-in logs with pagination (Admin/Client/Staff with access)
 */
router.get('/logs', getCheckinLogsValidator, checkinController.getCheckinLogs);

/**
 * @route   GET /api/events/:eventId/checkin/summary
 * @desc    Get check-in summary for dashboard
 */
router.get('/summary', checkinController.getCheckinSummary);

module.exports = router;