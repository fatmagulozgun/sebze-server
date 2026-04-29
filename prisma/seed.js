const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash("admin123", 10);
  const customerPassword = await bcrypt.hash("123456", 10);

  await prisma.user.upsert({
    where: { email: "admin@manav.com" },
    update: {
      name: "Admin",
      password: adminPassword,
      role: "ADMIN",
    },
    create: {
      name: "Admin",
      email: "admin@manav.com",
      password: adminPassword,
      role: "ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { email: "musteri@test.com" },
    update: {
      name: "Test Müşteri",
      password: customerPassword,
      role: "CUSTOMER",
    },
    create: {
      name: "Test Müşteri",
      email: "musteri@test.com",
      password: customerPassword,
      role: "CUSTOMER",
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });