// validators/eventValidators.js
const { body, param, query } = require('express-validator');

const createEventValidator = [
  body('groomName')
    .notEmpty()
    .withMessage('Groom name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Groom name must be between 2 and 100 characters')
    .trim(),
  
  body('brideName')
    .notEmpty()
    .withMessage('Bride name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Bride name must be between 2 and 100 characters')
    .trim(),
  
  body('weddingTitle')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Wedding title must not exceed 200 characters')
    .trim(),
  
  body('weddingDate')
    .notEmpty()
    .withMessage('Wedding date is required')
    .isISO8601()
    .withMessage('Wedding date must be a valid date'),
  
  body('weddingDateHijri')
    .optional()
    .isString()
    .withMessage('Hijri date must be a string'),
  
  body('religion')
    .optional()
    .isIn(['ISLAM', 'KRISTEN', 'KATOLIK', 'HINDU', 'BUDDHA', 'KONGHUCU', 'OTHER'])
    .withMessage('Invalid religion type'),
  
  body('venueName')
    .notEmpty()
    .withMessage('Venue name is required')
    .isLength({ max: 200 })
    .withMessage('Venue name must not exceed 200 characters')
    .trim(),
  
  body('venueType')
    .notEmpty()
    .withMessage('Venue type is required')
    .isIn(['INDOOR', 'OUTDOOR', 'BALLROOM', 'GARDEN', 'BEACH', 'MASJID', 
           'CHURCH', 'TEMPLE', 'GEDUNG', 'HOTEL', 'VILLA', 'OTHER'])
    .withMessage('Invalid venue type'),
  
  body('venueAddress')
    .notEmpty()
    .withMessage('Venue address is required')
    .isLength({ max: 500 })
    .withMessage('Venue address must not exceed 500 characters')
    .trim(),
  
  body('venueCity')
    .optional()
    .isLength({ max: 100 })
    .withMessage('City name must not exceed 100 characters')
    .trim(),
  
  body('venueProvince')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Province name must not exceed 100 characters')
    .trim(),
  
  body('googleMapsUrl')
    .optional()
    .isURL()
    .withMessage('Google Maps URL must be a valid URL'),
  
  body('venueLatitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  
  body('venueLongitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  
  body('primaryColor')
    .optional()
    .isHexColor()
    .withMessage('Primary color must be a valid hex color'),
  
  body('secondaryColor')
    .optional()
    .isHexColor()
    .withMessage('Secondary color must be a valid hex color'),
  
  body('invitationType')
    .optional()
    .isIn(['PUBLIC', 'PRIVATE'])
    .withMessage('Invalid invitation type'),
  
  body('groomNickname')
    .optional()
    .isLength({ max: 50 })
    .trim(),
  
  body('brideNickname')
    .optional()
    .isLength({ max: 50 })
    .trim(),
  
  body('groomFatherName')
    .optional()
    .isLength({ max: 100 })
    .trim(),
  
  body('groomMotherName')
    .optional()
    .isLength({ max: 100 })
    .trim(),
  
  body('brideFatherName')
    .optional()
    .isLength({ max: 100 })
    .trim(),
  
  body('brideMotherName')
    .optional()
    .isLength({ max: 100 })
    .trim(),
  
  body('loveStory')
    .optional()
    .isLength({ max: 5000 })
    .withMessage('Love story must not exceed 5000 characters'),
  
  body('greetingText')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Greeting text must not exceed 1000 characters'),
];

const updateEventValidator = [
  param('id')
    .isInt()
    .withMessage('Event ID must be an integer'),
  
  body('groomName')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Groom name must be between 2 and 100 characters')
    .trim(),
  
  body('brideName')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Bride name must be between 2 and 100 characters')
    .trim(),
  
  body('weddingTitle')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Wedding title must not exceed 200 characters')
    .trim(),
  
  body('weddingDate')
    .optional()
    .isISO8601()
    .withMessage('Wedding date must be a valid date'),
  
  body('religion')
    .optional()
    .isIn(['ISLAM', 'KRISTEN', 'KATOLIK', 'HINDU', 'BUDDHA', 'KONGHUCU', 'OTHER'])
    .withMessage('Invalid religion type'),
  
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
  
  body('isPublished')
    .optional()
    .isBoolean()
    .withMessage('isPublished must be a boolean'),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),

    body('clientId')
  .optional()
  .isInt()
  .withMessage('Client ID must be an integer'),
];

const eventIdValidator = [
  param('id')
    .isInt()
    .withMessage('Event ID must be an integer'),
];

const getMyEventsValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('search')
    .optional()
    .isString()
    .withMessage('Search must be a string'),
  query('status')
    .optional()
    .isIn(['active', 'inactive', 'published', 'draft'])
    .withMessage('Invalid status filter'),
];

module.exports = {
  createEventValidator,
  updateEventValidator,
  eventIdValidator,
  getMyEventsValidator,
};