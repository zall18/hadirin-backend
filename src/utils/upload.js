// utils/upload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Pastikan folder uploads ada
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Konfigurasi storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Tentukan folder berdasarkan tipe file
    let dest = uploadDir;
    if (file.fieldname === 'coverImage') {
      dest = path.join(uploadDir, 'covers');
    } else if (file.fieldname === 'logo') {
      dest = path.join(uploadDir, 'logos');
    } else if (file.fieldname === 'gallery') {
      dest = path.join(uploadDir, 'gallery');
    } else if (file.fieldname === 'groomPhoto' || file.fieldname === 'bridePhoto') {
      dest = path.join(uploadDir, 'profiles');
    } else {
      dest = path.join(uploadDir, 'others');
    }
    
    // Buat folder jika belum ada
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    // Generate nama file unik
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// Filter file (hanya gambar)
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mime = allowedTypes.test(file.mimetype);
  
  if (ext && mime) {
    cb(null, true);
  } else {
    cb(new Error('Only images are allowed'), false);
  }
};

// Batasan ukuran file (5MB)
const limits = {
  fileSize: 5 * 1024 * 1024 // 5MB
};

const upload = multer({
  storage,
  fileFilter,
  limits
});

module.exports = upload;