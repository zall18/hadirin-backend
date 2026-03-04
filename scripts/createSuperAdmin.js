// scripts/createSuperAdmin.js
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');
const bcrypt = require('bcryptjs');
const readline = require('readline');
require('dotenv').config();

// ✅ Prisma v7: wajib passing adapter ke PrismaClient
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function createSuperAdmin() {
  try {
    console.log('🚀 Create Super Admin Account\n');

    // Cek apakah sudah ada super admin
    const existingSuperAdmin = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' },
    });

    if (existingSuperAdmin) {
      console.log('❌ Super Admin already exists!');
      console.log(`Email: ${existingSuperAdmin.email}`);
      console.log(`Name: ${existingSuperAdmin.name}`);

      const answer = await question('\nDo you want to create another Super Admin? (yes/no): ');
      if (answer.toLowerCase() !== 'yes') {
        process.exit(0);
      }
    }

    // Input data
    const email = await question('Email: ');
    const name = await question('Full Name: ');
    const phone = await question('Phone Number (optional, tekan Enter untuk skip): ');
    const password = await question('Password (min 8 chars): ');

    // Validasi
    if (!email || !name || !password) {
      console.log('❌ Email, name, and password are required!');
      process.exit(1);
    }

    if (password.length < 8) {
      console.log('❌ Password must be at least 8 characters!');
      process.exit(1);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create super admin
    const superAdmin = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone: phone || null,
        role: 'SUPER_ADMIN',
        isActive: true,
        emailVerifiedAt: new Date(),
      },
    });

    console.log('\n✅ Super Admin created successfully!');
    console.log('ID    :', superAdmin.id);
    console.log('Email :', superAdmin.email);
    console.log('Name  :', superAdmin.name);
    console.log('Role  :', superAdmin.role);

  } catch (error) {
    if (error.code === 'P2002') {
      console.error('❌ Email already registered!');
    } else {
      console.error('❌ Error:', error.message);
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
    rl.close();
  }
}

createSuperAdmin();