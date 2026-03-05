// validators/eventSessionValidators.js
const { body, param } = require('express-validator');

const createSessionValidator = [
  param('eventId')
    .isInt()
    .withMessage('Event ID must be an integer'),
  
  body('name')
    .notEmpty()
    .withMessage('Session name is required')
    .isLength({ max: 100 })
    .withMessage('Session name must not exceed 100 characters')
    .trim(),
  
  body('sessionType')
    .optional()
    .isIn(['AKAD', 'RESEPSI', 'PENGAJIAN', 'LAMARAN', 'OTHER'])
    .withMessage('Invalid session type'),
  
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters')
    .trim(),
  
  body('date')
    .notEmpty()
    .withMessage('Session date is required')
    .isISO8601()
    .withMessage('Date must be valid'),
  
  body('startTime')
    .notEmpty()
    .withMessage('Start time is required')
    .isISO8601()
    .withMessage('Start time must be valid'),
  
  body('endTime')
    .notEmpty()
    .withMessage('End time is required')
    .isISO8601()
    .withMessage('End time must be valid')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.startTime)) {
        throw new Error('End time must be after start time');
      }
      return true;
    }),
  
  body('venueName')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Venue name must not exceed 200 characters')
    .trim(),
  
  body('venueType')
    .optional()
    .isIn(['INDOOR', 'OUTDOOR', 'BALLROOM', 'GARDEN', 'BEACH', 'MASJID', 
           'CHURCH', 'TEMPLE', 'GEDUNG', 'HOTEL', 'VILLA', 'OTHER'])
    .withMessage('Invalid venue type'),
  
  body('venueAddress')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Venue address must not exceed 500 characters')
    .trim(),
  
  body('googleMapsUrl')
    .optional()
    .isURL()
    .withMessage('Google Maps URL must be valid'),
  
  body('hasCheckIn')
    .optional()
    .isBoolean()
    .withMessage('hasCheckIn must be boolean'),
  
  body('checkInOpenAt')
    .optional()
    .isISO8601()
    .withMessage('Check-in open time must be valid'),
  
  body('checkInCloseAt')
    .optional()
    .isISO8601()
    .withMessage('Check-in close time must be valid'),
  
  body('maxCapacity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max capacity must be a positive integer'),
  
  body('sortOrder')
    .optional()
    .isInt()
    .withMessage('Sort order must be an integer'),
];

const updateSessionValidator = [
  param('eventId')
    .isInt()
    .withMessage('Event ID must be an integer'),
  param('sessionId')
    .isInt()
    .withMessage('Session ID must be an integer'),
  
  body('name')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Session name must not exceed 100 characters')
    .trim(),
  
  body('sessionType')
    .optional()
    .isIn(['AKAD', 'RESEPSI', 'PENGAJIAN', 'LAMARAN', 'OTHER'])
    .withMessage('Invalid session type'),
  
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters')
    .trim(),
  
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Date must be valid'),
  
  body('startTime')
    .optional()
    .isISO8601()
    .withMessage('Start time must be valid'),
  
  body('endTime')
    .optional()
    .isISO8601()
    .withMessage('End time must be valid')
    .custom((value, { req }) => {
      if (req.body.startTime && new Date(value) <= new Date(req.body.startTime)) {
        throw new Error('End time must be after start time');
      }
      return true;
    }),
  
  body('venueName')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Venue name must not exceed 200 characters')
    .trim(),
  
  body('venueType')
    .optional()
    .isIn(['INDOOR', 'OUTDOOR', 'BALLROOM', 'GARDEN', 'BEACH', 'MASJID', 
           'CHURCH', 'TEMPLE', 'GEDUNG', 'HOTEL', 'VILLA', 'OTHER'])
    .withMessage('Invalid venue type'),
  
  body('venueAddress')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Venue address must not exceed 500 characters')
    .trim(),
  
  body('googleMapsUrl')
    .optional()
    .isURL()
    .withMessage('Google Maps URL must be valid'),
  
  body('hasCheckIn')
    .optional()
    .isBoolean()
    .withMessage('hasCheckIn must be boolean'),
  
  body('checkInOpenAt')
    .optional()
    .isISO8601()
    .withMessage('Check-in open time must be valid'),
  
  body('checkInCloseAt')
    .optional()
    .isISO8601()
    .withMessage('Check-in close time must be valid'),
  
  body('maxCapacity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max capacity must be a positive integer'),
  
  body('sortOrder')
    .optional()
    .isInt()
    .withMessage('Sort order must be an integer'),
];

const sessionIdValidator = [
  param('eventId')
    .isInt()
    .withMessage('Event ID must be an integer'),
  param('sessionId')
    .isInt()
    .withMessage('Session ID must be an integer'),
];

module.exports = {
  createSessionValidator,
  updateSessionValidator,
  sessionIdValidator,
};