// validators/checkinValidators.js
const { body, param, query } = require('express-validator');

const scanQRValidator = [
  param('eventId')
    .isInt()
    .withMessage('Event ID must be integer'),
  
  body('qrCode')
    .notEmpty()
    .withMessage('QR code (UUID) is required')
    .isUUID()
    .withMessage('Invalid QR code format'),
  
  body('sessionId')
    .optional()
    .isInt()
    .withMessage('Session ID must be integer'),
  
  body('arrivedCount')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Arrived count must be at least 1'),
];

const manualCheckinValidator = [
  param('eventId')
    .isInt(),
  
  body('identifier')
    .notEmpty()
    .withMessage('Name or phone is required')
    .isString()
    .trim(),
  
  body('sessionId')
    .optional()
    .isInt(),
  
  body('arrivedCount')
    .optional()
    .isInt({ min: 1 }),
];

const getCheckinLogsValidator = [
  param('eventId').isInt(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('sessionId').optional().isInt(),
  query('method').optional().isIn(['QR_SCAN', 'MANUAL_SEARCH', 'MANUAL_ENTRY']),
  query('fromDate').optional().isISO8601(),
  query('toDate').optional().isISO8601(),
];

module.exports = {
  scanQRValidator,
  manualCheckinValidator,
  getCheckinLogsValidator,
};