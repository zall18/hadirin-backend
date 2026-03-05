// utils/imageUrl.js
const path = require('path');

/**
 * Mendapatkan URL publik untuk file yang diupload
 * Asumsi: file disimpan di folder 'uploads' dan diakses via static route
 */
const getImageUrl = (filePath, req) => {
  if (!filePath) return null;
  
  // Ambil path relatif dari folder uploads
  const relativePath = path.relative(path.join(__dirname, '../uploads'), filePath);
  
  // Buat URL
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  return `${baseUrl}/uploads/${relativePath.replace(/\\/g, '/')}`;
};

module.exports = { getImageUrl };