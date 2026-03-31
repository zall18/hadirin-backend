// validators/photoValidators.js
const { body, param } = require('express-validator');

const uploadPhotoValidator = [
  param('eventId').isInt(),
  param('guestId').optional().isInt(),
  body('guestId').optional().isInt(),
  body('phone').optional().isMobilePhone('id-ID'),
  body('sendWhatsApp').optional().isBoolean(),
];

const sendWhatsAppValidator = [
  param('eventId').isInt(),
  param('photoId').isInt(),
  body('phone')
    .optional()
    .isMobilePhone('id-ID'),
  body('guestId')
    .optional()
    .isInt(),
];

const resendPhotoValidator = [
  param('eventId').isInt(),
  param('photoId').isInt(),
];

module.exports = {
  uploadPhotoValidator,
  sendWhatsAppValidator,
  resendPhotoValidator,
};