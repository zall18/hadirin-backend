// validators/staffValidators.js
const { body, param, query } = require('express-validator');

const createStaffValidator = [
  param('eventId')
    .isInt()
    .withMessage('Event ID must be integer'),
  
  body('email')
    .isEmail()
    .withMessage('Valid email required')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password min 6 characters'),
  
  body('name')
    .notEmpty()
    .withMessage('Name required')
    .trim(),
  
  body('phone')
    .optional()
    .isMobilePhone('id-ID')
    .withMessage('Valid Indonesian phone number'),
  
  body('permissions')
    .optional()
    .isArray()
    .withMessage('Permissions must be array'),
  
  body('isTemporary')
    .optional()
    .isBoolean(),
  
  body('expiresAt')
    .optional()
    .isISO8601()
    .withMessage('Expires at must be valid date'),
];

const updateStaffValidator = [
  param('eventId').isInt(),
  param('staffId').isInt(),
  body('name').optional().trim(),
  body('phone').optional().isMobilePhone('id-ID'),
  body('isActive').optional().isBoolean(),
  body('permissions').optional().isArray(),
  body('expiresAt').optional().isISO8601(),
];

const staffIdValidator = [
  param('eventId').isInt(),
  param('staffId').isInt(),
];

module.exports = {
  createStaffValidator,
  updateStaffValidator,
  staffIdValidator,
};