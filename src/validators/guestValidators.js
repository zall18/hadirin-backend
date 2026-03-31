// validators/guestValidators.js
const { body, param, query } = require('express-validator');

const createGuestValidator = [
  param('eventId')
    .isInt()
    .withMessage('Event ID must be an integer'),
  
  body('name')
    .notEmpty()
    .withMessage('Guest name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .trim(),
  
  body('phone')
    .notEmpty()
    .withMessage('Phone number is required')
    .isMobilePhone('id-ID')
    .withMessage('Must be a valid Indonesian phone number (e.g., 081234567890)'),
  
  body('email')
    .optional()
    .isEmail()
    .withMessage('Must be a valid email address'),
  
  body('title')
    .optional()
    .isIn(['Bpk.', 'Ibu', 'Dr.', 'Prof.', 'Sdr.', 'Sdri.'])
    .withMessage('Invalid title'),
  
  body('category')
    .optional()
    .isIn(['FAMILY', 'RELATIVE', 'FRIEND', 'COLLEAGUE', 'VVIP', 'VIP', 'VENDOR', 'MEDIA', 'REGULAR'])
    .withMessage('Invalid category'),
  
  body('groupName')
    .optional()
    .isString()
    .trim(),
  
  body('invitedCount')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Invited count must be between 1 and 20'),
  
  body('plusOneAllowed')
    .optional()
    .isInt({ min: 0, max: 10 })
    .withMessage('Plus one allowed must be between 0 and 10'),
  
  body('notes')
    .optional()
    .isString()
    .trim(),
  
  body('seatNumber')
    .optional()
    .isString()
    .trim(),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
];

const updateGuestValidator = [
  param('eventId').isInt().withMessage('Event ID must be an integer'),
  param('guestId').isInt().withMessage('Guest ID must be an integer'),
  
  body('name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .trim(),
  
  body('phone')
    .optional()
    .isMobilePhone('id-ID'),
  
  body('email')
    .optional()
    .isEmail(),
  
  body('title')
    .optional()
    .isIn(['Bpk.', 'Ibu', 'Dr.', 'Prof.', 'Sdr.', 'Sdri.']),
  
  body('category')
    .optional()
    .isIn(['FAMILY', 'RELATIVE', 'FRIEND', 'COLLEAGUE', 'VVIP', 'VIP', 'VENDOR', 'MEDIA', 'REGULAR']),
  
  body('groupName')
    .optional()
    .isString()
    .trim(),
  
  body('invitedCount')
    .optional()
    .isInt({ min: 1, max: 20 }),
  
  body('plusOneAllowed')
    .optional()
    .isInt({ min: 0, max: 10 }),
  
  body('status')
    .optional()
    .isIn(['INVITED', 'CONFIRMED', 'ATTENDED', 'CANCELLED', 'NO_SHOW']),
  
  body('rsvpStatus')
    .optional()
    .isIn(['PENDING', 'CONFIRMED', 'DECLINED', 'MAYBE']),
  
  body('notes')
    .optional()
    .isString()
    .trim(),
  
  body('seatNumber')
    .optional()
    .isString()
    .trim(),
];

const getGuestsValidator = [
  param('eventId').isInt().withMessage('Event ID must be an integer'),
  
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 200 })
    .withMessage('Limit must be between 1 and 200'),
  
  query('search')
    .optional()
    .isString()
    .withMessage('Search must be a string'),
  
  query('status')
    .optional()
    .isIn(['INVITED', 'CONFIRMED', 'ATTENDED', 'CANCELLED', 'NO_SHOW'])
    .withMessage('Invalid status'),
  
  query('rsvpStatus')
    .optional()
    .isIn(['PENDING', 'CONFIRMED', 'DECLINED', 'MAYBE'])
    .withMessage('Invalid RSVP status'),
  
  query('category')
    .optional()
    .isIn(['FAMILY', 'RELATIVE', 'FRIEND', 'COLLEAGUE', 'VVIP', 'VIP', 'VENDOR', 'MEDIA', 'REGULAR'])
    .withMessage('Invalid category'),
  
  query('sortBy')
    .optional()
    .isIn(['name', 'createdAt', 'status', 'rsvpStatus', 'phone'])
    .withMessage('Invalid sort field'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
];

const guestIdValidator = [
  param('eventId').isInt().withMessage('Event ID must be an integer'),
  param('guestId').isInt().withMessage('Guest ID must be an integer'),
];

const bulkImportValidator = [
  param('eventId').isInt().withMessage('Event ID must be an integer'),
];

module.exports = {
  createGuestValidator,
  updateGuestValidator,
  getGuestsValidator,
  guestIdValidator,
  bulkImportValidator,
};