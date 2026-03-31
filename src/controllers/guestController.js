// controllers/guestController.js
const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const XLSX = require('xlsx');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { generateUniqueShortId } = require('../utils/shortId');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });


// Konfigurasi multer untuk upload file sementara
const upload = multer({ 
  dest: 'uploads/temp/',
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.xlsx' || ext === '.xls' || ext === '.csv') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel/CSV files are allowed'), false);
    }
  }
});

/**
 * CREATE GUEST (Single)
 * Auto-generate QR Code (UUID via Prisma) dan ShortId
 */
const createGuest = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { eventId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Verifikasi event: user harus owner (ADMIN) atau client (CLIENT)
    const event = await prisma.event.findFirst({
      where: {
        id: parseInt(eventId),
        deletedAt: null,
        OR: [
          { ownerId: userId },
          { clientId: userId },
        ],
      },
    });

    if (!event) {
      return res.status(404).json({ 
        success: false, 
        message: 'Event not found or you do not have access' 
      });
    }

    const {
      name,
      phone,
      email,
      title,
      category,
      groupName,
      invitedCount,
      plusOneAllowed,
      notes,
      seatNumber,
      tags,
    } = req.body;

    // Cek duplikasi phone dalam event yang sama
    const existingGuest = await prisma.guest.findFirst({
      where: {
        eventId: parseInt(eventId),
        phone: phone,
        deletedAt: null,
      },
    });

    if (existingGuest) {
      return res.status(409).json({
        success: false,
        message: 'Phone number already registered for this event',
      });
    }

    // Generate shortId unik
    const shortId = await generateUniqueShortId(8);

    // Create guest (qrCode akan otomatis terisi UUID dari Prisma)
    const guest = await prisma.guest.create({
      data: {
        name: name.trim(),
        phone,
        email: email || null,
        title: title || null,
        category: category || 'REGULAR',
        groupName: groupName || null,
        invitedCount: invitedCount || 1,
        plusOneAllowed: plusOneAllowed || 0,
        notes: notes || null,
        seatNumber: seatNumber || null,
        tags: tags || [],
        shortId,
        eventId: parseInt(eventId),
        status: 'INVITED',
        rsvpStatus: 'PENDING',
      },
    });

    // Update totalGuests di Event
    await prisma.event.update({
      where: { id: parseInt(eventId) },
      data: { totalGuests: { increment: 1 } },
    });

    return res.status(201).json({
      success: true,
      message: 'Guest created successfully',
      data: guest,
    });
  } catch (error) {
    console.error('Create guest error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * BULK IMPORT GUESTS from Excel/CSV
 * Endpoint: POST /api/events/:eventId/guests/import
 * Body: form-data dengan key 'file'
 */
const bulkImportGuests = (req, res) => {
  // Gunakan multer untuk handle file upload
  const uploadSingle = upload.single('file');
  
  uploadSingle(req, res, async (err) => {
    try {
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }

      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }

      const { eventId } = req.params;
      const userId = req.user.id;

      // Verifikasi event
      const event = await prisma.event.findFirst({
        where: {
          id: parseInt(eventId),
          deletedAt: null,
          OR: [
            { ownerId: userId },
            { clientId: userId },
          ],
        },
      });

      if (!event) {
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ 
          success: false, 
          message: 'Event not found or you do not have access' 
        });
      }

      // Baca file Excel
      let rows = [];
      const fileExt = path.extname(req.file.originalname).toLowerCase();
      
      if (fileExt === '.csv') {
        // Untuk CSV, gunakan XLSX juga bisa
        const workbook = XLSX.readFile(req.file.path, { type: 'file', raw: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        rows = XLSX.utils.sheet_to_json(worksheet);
      } else {
        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        rows = XLSX.utils.sheet_to_json(worksheet);
      }

      if (!rows || rows.length === 0) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ 
          success: false, 
          message: 'File is empty or has no valid data' 
        });
      }

      // Mapping kolom yang diharapkan (support multiple naming)
      const results = {
        total: rows.length,
        success: 0,
        failed: 0,
        errors: [],
        duplicates: [],
      };

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          // Ambil name (support berbagai format kolom)
          let name = row['name'] || row['Nama'] || row['NAME'] || row['fullName'] || row['Full Name'];
          let phone = row['phone'] || row['Telepon'] || row['PHONE'] || row['no_hp'] || row['No HP'];
          
          if (!name || !phone) {
            results.failed++;
            results.errors.push({ row: i + 2, error: 'Name or phone missing', data: row });
            continue;
          }

          name = String(name).trim();
          phone = String(phone).trim();

          // Validasi phone number (basic)
          if (!/^[0-9]{10,13}$/.test(phone.replace(/\D/g, ''))) {
            results.failed++;
            results.errors.push({ row: i + 2, error: 'Invalid phone number format', data: row });
            continue;
          }

          // Cek duplikat dalam event
          const existing = await prisma.guest.findFirst({
            where: {
              eventId: parseInt(eventId),
              phone: phone,
              deletedAt: null,
            },
          });

          if (existing) {
            results.failed++;
            results.duplicates.push({ row: i + 2, phone, existingName: existing.name });
            continue;
          }

          // Generate shortId
          const shortId = await generateUniqueShortId(8);

          // Parse optional fields
          const email = row['email'] || row['Email'] || null;
          const title = row['title'] || row['Title'] || null;
          let category = row['category'] || row['Category'] || 'REGULAR';
          const groupName = row['groupName'] || row['Group'] || row['group'] || null;
          let invitedCount = row['invitedCount'] || row['Jumlah Undangan'] || 1;
          let plusOneAllowed = row['plusOneAllowed'] || row['Plus One'] || 0;
          const notes = row['notes'] || row['Catatan'] || null;
          const seatNumber = row['seatNumber'] || row['Kursi'] || row['Meja'] || null;

          // Validasi enum category
          const validCategories = ['FAMILY', 'RELATIVE', 'FRIEND', 'COLLEAGUE', 'VVIP', 'VIP', 'VENDOR', 'MEDIA', 'REGULAR'];
          if (!validCategories.includes(category)) {
            category = 'REGULAR';
          }

          invitedCount = parseInt(invitedCount) || 1;
          plusOneAllowed = parseInt(plusOneAllowed) || 0;

          await prisma.guest.create({
            data: {
              name,
              phone,
              email: email ? String(email).trim() : null,
              title: title ? String(title).trim() : null,
              category,
              groupName: groupName ? String(groupName).trim() : null,
              invitedCount: Math.min(invitedCount, 20),
              plusOneAllowed: Math.min(plusOneAllowed, 10),
              notes: notes ? String(notes).trim() : null,
              seatNumber: seatNumber ? String(seatNumber).trim() : null,
              shortId,
              eventId: parseInt(eventId),
              status: 'INVITED',
              rsvpStatus: 'PENDING',
            },
          });
          results.success++;
        } catch (rowError) {
          results.failed++;
          results.errors.push({ row: i + 2, error: rowError.message, data: row });
        }
      }

      // Update totalGuests di event
      if (results.success > 0) {
        await prisma.event.update({
          where: { id: parseInt(eventId) },
          data: { totalGuests: { increment: results.success } },
        });
      }

      // Hapus file temporary
      fs.unlinkSync(req.file.path);

      return res.status(200).json({
        success: true,
        message: `Import completed: ${results.success} success, ${results.failed} failed`,
        data: results,
      });
    } catch (error) {
      console.error('Bulk import error:', error);
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  });
};

/**
 * GET ALL GUESTS by Event
 * Support pagination, search, filter, sorting
 */
const getGuestsByEvent = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { eventId } = req.params;
    const userId = req.user.id;
    const {
      page = 1,
      limit = 20,
      search = '',
      status,
      rsvpStatus,
      category,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    // Verifikasi akses event
    const event = await prisma.event.findFirst({
      where: {
        id: parseInt(eventId),
        deletedAt: null,
        
        OR: [
          { ownerId: userId },
          { clientId: userId },
        ],
      },
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found or you do not have access',
      });
    }

    // Build where clause
    const where = {
      eventId: parseInt(eventId),
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { groupName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) where.status = status;
    if (rsvpStatus) where.rsvpStatus = rsvpStatus;
    if (category) where.category = category;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Get guests with pagination
    const [guests, total] = await Promise.all([
      prisma.guest.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: {
          checkIns: {
            take: 1,
            orderBy: { checkedInAt: 'desc' },
            select: {
              checkedInAt: true,
              method: true,
              arrivedCount: true,
            },
          },
          whatsAppLogs: {
            take: 1,
            orderBy: { sentAt: 'desc' },
            select: {
              status: true,
              sentAt: true,
            },
          },
        },
      }),
      prisma.guest.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        guests,
        pagination: {
          page: parseInt(page),
          limit: take,
          total,
          totalPages: Math.ceil(total / take),
          hasNext: parseInt(page) < Math.ceil(total / take),
          hasPrev: parseInt(page) > 1,
        },
        filters: {
          status,
          rsvpStatus,
          category,
          search: search || null,
        },
      },
    });
  } catch (error) {
    console.error('Get guests error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * GET GUEST BY ID
 */
const getGuestById = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { eventId, guestId } = req.params;
    const userId = req.user.id;

    // Verifikasi akses event
    const event = await prisma.event.findFirst({
      where: {
        id: parseInt(eventId),
        deletedAt: null,
        OR: [
          { ownerId: userId },
          { clientId: userId },
        ],
      },
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found or you do not have access',
      });
    }

    const guest = await prisma.guest.findFirst({
      where: {
        id: parseInt(guestId),
        eventId: parseInt(eventId),
        deletedAt: null,
      },
      include: {
        checkIns: {
          orderBy: { checkedInAt: 'desc' },
          include: {
            checkedInBy: {
              select: { name: true, id: true },
            },
            session: {
              select: { name: true, sessionType: true },
            },
          },
        },
        whatsAppLogs: {
          orderBy: { sentAt: 'desc' },
        },
        guestWishes: {
          orderBy: { createdAt: 'desc' },
        },
        photos: {
          orderBy: { takenAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!guest) {
      return res.status(404).json({
        success: false,
        message: 'Guest not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: guest,
    });
  } catch (error) {
    console.error('Get guest by id error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * UPDATE GUEST
 */
const updateGuest = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { eventId, guestId } = req.params;
    const userId = req.user.id;

    // Verifikasi event
    const event = await prisma.event.findFirst({
      where: {
        id: parseInt(eventId),
        deletedAt: null,
        OR: [
          { ownerId: userId },
          { clientId: userId },
        ],
      },
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found or you do not have access',
      });
    }

    // Cek guest exists
    const existingGuest = await prisma.guest.findFirst({
      where: {
        id: parseInt(guestId),
        eventId: parseInt(eventId),
        deletedAt: null,
      },
    });

    if (!existingGuest) {
      return res.status(404).json({
        success: false,
        message: 'Guest not found',
      });
    }

    // Jika update phone, cek duplikat
    if (req.body.phone && req.body.phone !== existingGuest.phone) {
      const duplicate = await prisma.guest.findFirst({
        where: {
          eventId: parseInt(eventId),
          phone: req.body.phone,
          deletedAt: null,
          id: { not: parseInt(guestId) },
        },
      });
      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: 'Phone number already used by another guest in this event',
        });
      }
    }

    // Prepare update data (tidak boleh update qrCode, shortId, eventId)
    const updateData = { ...req.body };
    delete updateData.id;
    delete updateData.qrCode;
    delete updateData.shortId;
    delete updateData.eventId;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    // Convert types jika perlu
    if (updateData.invitedCount) updateData.invitedCount = parseInt(updateData.invitedCount);
    if (updateData.plusOneAllowed) updateData.plusOneAllowed = parseInt(updateData.plusOneAllowed);
    if (updateData.actualCount) updateData.actualCount = parseInt(updateData.actualCount);

    const updatedGuest = await prisma.guest.update({
      where: { id: parseInt(guestId) },
      data: updateData,
    });

    return res.status(200).json({
      success: true,
      message: 'Guest updated successfully',
      data: updatedGuest,
    });
  } catch (error) {
    console.error('Update guest error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * DELETE GUEST (Soft Delete)
 */
const deleteGuest = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { eventId, guestId } = req.params;
    const userId = req.user.id;

    // Verifikasi event
    const event = await prisma.event.findFirst({
      where: {
        id: parseInt(eventId),
        deletedAt: null,
        OR: [
          { ownerId: userId },
          { clientId: userId },
        ],
      },
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found or you do not have access',
      });
    }

    const guest = await prisma.guest.findFirst({
      where: {
        id: parseInt(guestId),
        eventId: parseInt(eventId),
        deletedAt: null,
      },
    });

    if (!guest) {
      return res.status(404).json({
        success: false,
        message: 'Guest not found',
      });
    }

    // Soft delete
    await prisma.guest.update({
      where: { id: parseInt(guestId) },
      data: { deletedAt: new Date() },
    });

    // Kurangi totalGuests di event
    await prisma.event.update({
      where: { id: parseInt(eventId) },
      data: { totalGuests: { decrement: 1 } },
    });

    return res.status(200).json({
      success: true,
      message: 'Guest deleted successfully',
    });
  } catch (error) {
    console.error('Delete guest error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * EXPORT GUESTS to Excel
 * Endpoint: GET /api/events/:eventId/guests/export
 */
const exportGuests = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    // Verifikasi event
    const event = await prisma.event.findFirst({
      where: {
        id: parseInt(eventId),
        deletedAt: null,
        OR: [
          { ownerId: userId },
          { clientId: userId },
        ],
      },
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found or you do not have access',
      });
    }

    const guests = await prisma.guest.findMany({
      where: {
        eventId: parseInt(eventId),
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Prepare data for Excel
    const excelData = guests.map(guest => ({
      'No': guest.id,
      'Nama Lengkap': guest.name,
      'Nomor Telepon': guest.phone,
      'Email': guest.email || '-',
      'Gelar': guest.title || '-',
      'Kategori': guest.category,
      'Group': guest.groupName || '-',
      'Jumlah Undangan': guest.invitedCount,
      'Plus One': guest.plusOneAllowed,
      'Status': guest.status,
      'RSVP': guest.rsvpStatus,
      'Nomor Kursi': guest.seatNumber || '-',
      'Catatan': guest.notes || '-',
      'Check-in Time': guest.checkedInAt ? new Date(guest.checkedInAt).toLocaleString('id-ID') : '-',
      'Dibuat Pada': new Date(guest.createdAt).toLocaleString('id-ID'),
    }));

    // Create workbook
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Guests');
    
    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=guests_${event.slug}_${Date.now()}.xlsx`);
    
    return res.send(buffer);
  } catch (error) {
    console.error('Export guests error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

module.exports = {
  createGuest,
  bulkImportGuests,
  getGuestsByEvent,
  getGuestById,
  updateGuest,
  deleteGuest,
  exportGuests,
};