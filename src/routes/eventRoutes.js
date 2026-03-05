// routes/eventRoutes.js
const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { verifyToken, authorize } = require('../middlewares/auth');
const {
  createEventValidator,
  updateEventValidator,
  eventIdValidator,
  getMyEventsValidator,
} = require('../validators/eventValidators');

/**
 * Public Routes (No Auth Required)
 */
router.get('/slug/:slug', eventController.getEventBySlug);

/**
 * Protected Routes (Auth Required)
 * Semua route di bawah ini memerlukan token
 */
router.use(verifyToken);

/**
 * @route   POST /api/events
 * @desc    Create new wedding event
 * @access  Private - ADMIN only
 */
router.post(
  '/',
  authorize('ADMIN'),
  createEventValidator,
  eventController.createEvent
);

/**
 * @route   GET /api/events/my-events
 * @desc    Get all events belonging to logged in admin
 * @access  Private - ADMIN only
 */
router.get(
  '/my-events',
  authorize('ADMIN'),
  getMyEventsValidator,
  eventController.getMyEvents
);

/**
 * @route   GET /api/events/:id
 * @desc    Get event details by ID
 * @access  Private - ADMIN only
 */
router.get(
  '/:id',
  authorize('ADMIN'),
  eventIdValidator,
  eventController.getEventById
);

/**
 * @route   PUT /api/events/:id
 * @desc    Update event
 * @access  Private - ADMIN only
 */
router.put(
  '/:id',
  authorize('ADMIN'),
  updateEventValidator,
  eventController.updateEvent
);

/**
 * @route   DELETE /api/events/:id
 * @desc    Soft delete event
 * @access  Private - ADMIN only
 */
router.delete(
  '/:id',
  authorize('ADMIN'),
  eventIdValidator,
  eventController.deleteEvent
);

/**
 * @route   PATCH /api/events/:id/toggle-publish
 * @desc    Publish/unpublish event
 * @access  Private - ADMIN only
 */
router.patch(
  '/:id/toggle-publish',
  authorize('ADMIN'),
  eventIdValidator,
  eventController.togglePublishEvent
);

/**
 * @route   POST /api/events/:id/duplicate
 * @desc    Duplicate event
 * @access  Private - ADMIN only
 */
router.post(
  '/:id/duplicate',
  authorize('ADMIN'),
  eventIdValidator,
  eventController.duplicateEvent
);

module.exports = router;