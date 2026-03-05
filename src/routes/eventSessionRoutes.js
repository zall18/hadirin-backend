// routes/eventSessionRoutes.js
const express = require('express');
const router = express.Router({ mergeParams: true }); // untuk mengakses params dari parent router
const sessionController = require('../controllers/eventSessionController');
const { verifyToken, authorize } = require('../middlewares/auth');
const {
  createSessionValidator,
  updateSessionValidator,
  sessionIdValidator,
} = require('../validators/eventSessionValidators');

// Semua route di bawah ini memerlukan auth dan role ADMIN
router.use(verifyToken, authorize('ADMIN'));

/**
 * @route   POST /api/events/:eventId/sessions
 * @desc    Create new session for event
 */
router.post('/', createSessionValidator, sessionController.createSession);

/**
 * @route   GET /api/events/:eventId/sessions
 * @desc    Get all sessions for event
 */
router.get('/', sessionController.getSessions);

/**
 * @route   GET /api/events/:eventId/sessions/:sessionId
 * @desc    Get session by ID
 */
router.get('/:sessionId', sessionIdValidator, sessionController.getSessionById);

/**
 * @route   PUT /api/events/:eventId/sessions/:sessionId
 * @desc    Update session
 */
router.put('/:sessionId', updateSessionValidator, sessionController.updateSession);

/**
 * @route   DELETE /api/events/:eventId/sessions/:sessionId
 * @desc    Delete session
 */
router.delete('/:sessionId', sessionIdValidator, sessionController.deleteSession);

module.exports = router;