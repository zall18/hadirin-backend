// utils/imageProcessor.js
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const uploadDir = path.join(__dirname, '../uploads/photos');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * Proses dan simpan foto
 * - Kompres gambar
 * - Buat thumbnail
 * - Simpan ke disk
 * @param {Buffer} buffer - Buffer gambar
 * @param {string} originalName - Nama asli file
 * @param {Object} options - Opsi resize dll
 * @returns {Promise<Object>} - Path file dan thumbnail
 */
const processAndSavePhoto = async (buffer, originalName, options = {}) => {
  const {
    width = 800,
    quality = 80,
    thumbnailWidth = 200,
    thumbnailQuality = 60,
  } = options;

  const fileId = uuidv4();
  const ext = path.extname(originalName) || '.jpg';
  const filename = `${fileId}${ext}`;
  const thumbnailFilename = `${fileId}_thumb${ext}`;
  const filePath = path.join(uploadDir, filename);
  const thumbnailPath = path.join(uploadDir, thumbnailFilename);

  // Proses gambar utama
  await sharp(buffer)
    .resize(width, null, { withoutEnlargement: true })
    .jpeg({ quality })
    .toFile(filePath);

  // Proses thumbnail
  await sharp(buffer)
    .resize(thumbnailWidth, null, { withoutEnlargement: true })
    .jpeg({ quality: thumbnailQuality })
    .toFile(thumbnailPath);

  return {
    filename,
    filePath,
    thumbnailPath,
    fileSize: fs.statSync(filePath).size,
  };
};

module.exports = { processAndSavePhoto };