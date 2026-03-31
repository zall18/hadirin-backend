// utils/shortId.js
const { PrismaClient } = require('@prisma/client');
const pg = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Generate unique short ID untuk guest (8 karakter alfanumerik)
 */
const generateUniqueShortId = async (length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let isUnique = false;
  let shortId = '';
  
  while (!isUnique) {
    shortId = '';
    for (let i = 0; i < length; i++) {
      shortId += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Cek unique di seluruh tabel Guest
    const existing = await prisma.guest.findUnique({
      where: { shortId },
    });
    if (!existing) isUnique = true;
  }
  return shortId;
};

module.exports = { generateUniqueShortId };