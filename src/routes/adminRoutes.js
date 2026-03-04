// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, isSuperAdmin } = require('../middleware/auth');
const {
  createAdminValidator,
  createSuperAdminValidator,
  updateAdminValidator,
} = require('../validators/adminValidators');

/**
 * @route   POST /api/admin/create-super-admin
 * @desc    Create Super Admin (initial setup only)
 * @access  Public (with secret key)
 */
router.post('/create-super-admin', createSuperAdminValidator, adminController.createSuperAdmin);

/**
 * @route   POST /api/admin
 * @desc    Create new Admin (client)
 * @access  Private - Super Admin only
 */
router.post(
  '/',
  verifyToken,
  isSuperAdmin,
  createAdminValidator,
  adminController.createAdmin
);

/**
 * @route   GET /api/admin
 * @desc    Get all Admins with pagination
 * @access  Private - Super Admin only
 */
router.get('/', verifyToken, isSuperAdmin, adminController.getAllAdmins);

/**
 * @route   GET /api/admin/:id
 * @desc    Get Admin by ID with details
 * @access  Private - Super Admin only
 */
router.get('/:id', verifyToken, isSuperAdmin, adminController.getAdminById);

/**
 * @route   PUT /api/admin/:id
 * @desc    Update Admin
 * @access  Private - Super Admin only
 */
router.put(
  '/:id',
  verifyToken,
  isSuperAdmin,
  updateAdminValidator,
  adminController.updateAdmin
);

/**
 * @route   DELETE /api/admin/:id
 * @desc    Soft delete Admin
 * @access  Private - Super Admin only
 */
router.delete('/:id', verifyToken, isSuperAdmin, adminController.deleteAdmin);

/**
 * @route   PATCH /api/admin/:id/toggle-status
 * @desc    Toggle Admin active status
 * @access  Private - Super Admin only
 */
router.patch('/:id/toggle-status', verifyToken, isSuperAdmin, adminController.toggleAdminStatus);

module.exports = router;