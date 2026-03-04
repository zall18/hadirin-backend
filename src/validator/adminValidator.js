// validators/adminValidators.js
const { body } = require('express-validator');

const createAdminValidator = [
  body('email')
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/)
    .withMessage('Password must contain at least one letter and one number'),
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .trim(),
  body('phone')
    .optional()
    .isMobilePhone('id-ID')
    .withMessage('Must be a valid Indonesian phone number'),
  body('eventData')
    .optional()
    .isObject()
    .withMessage('Event data must be an object'),
  body('eventData.weddingTitle')
    .optional()
    .isString()
    .withMessage('Wedding title must be a string'),
  body('eventData.weddingDate')
    .optional()
    .isISO8601()
    .withMessage('Wedding date must be a valid date'),
];

const createSuperAdminValidator = [
  body('email')
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/)
    .withMessage('Password must contain at least one letter and one number'),
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .trim(),
  body('secretKey')
    .notEmpty()
    .withMessage('Secret key is required'),
];

const updateAdminValidator = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .trim(),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail(),
  body('phone')
    .optional()
    .isMobilePhone('id-ID')
    .withMessage('Must be a valid Indonesian phone number'),
  body('password')
    .optional()
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/)
    .withMessage('Password must contain at least one letter and one number'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
];

module.exports = {
  createAdminValidator,
  createSuperAdminValidator,
  updateAdminValidator,
};