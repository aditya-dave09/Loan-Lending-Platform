const prisma = require('../src/config/database');
const bcrypt = require('bcrypt');

/**
 * Seed script — creates initial data for development.
 *
 * Run: npm run db:seed
 */
async function main() {
  console.log('🌱 Seeding database...\n');

  // Create admin user
  const adminPassword = await bcrypt.hash('Admin@123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@loanforge.com' },
    update: {},
    create: {
      email: 'admin@loanforge.com',
      phone: '+919999999999',
      passwordHash: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      kycStatus: 'VERIFIED',
    },
  });
  console.log(`✅ Admin user: ${admin.email}`);

  // Create test lender
  const lenderPassword = await bcrypt.hash('Lender@123', 12);
  const lender = await prisma.user.upsert({
    where: { email: 'lender@example.com' },
    update: {},
    create: {
      email: 'lender@example.com',
      phone: '+919876543210',
      passwordHash: lenderPassword,
      firstName: 'John',
      lastName: 'Doe',
      role: 'USER',
      kycStatus: 'VERIFIED',
    },
  });
  console.log(`✅ Test lender: ${lender.email}`);

  // Create test borrower
  const borrowerPassword = await bcrypt.hash('Borrower@123', 12);
  const borrower = await prisma.user.upsert({
    where: { email: 'borrower@example.com' },
    update: {},
    create: {
      email: 'borrower@example.com',
      phone: '+919876543211',
      passwordHash: borrowerPassword,
      firstName: 'Jane',
      lastName: 'Smith',
      role: 'USER',
      kycStatus: 'VERIFIED',
    },
  });
  console.log(`✅ Test borrower: ${borrower.email}`);

  console.log('\n🎉 Seeding complete!');
  console.log('\nTest credentials:');
  console.log('  Admin:    admin@loanforge.com / Admin@123');
  console.log('  Lender:   lender@example.com / Lender@123');
  console.log('  Borrower: borrower@example.com / Borrower@123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
