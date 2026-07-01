import bcrypt from "bcryptjs";
import { env } from "../../config/env.js";
import { prisma } from "../prisma.js";

async function main() {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required to seed the first admin account.");
  }

  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, env.BCRYPT_ROUNDS);

  const admin = await prisma.user.upsert({
    where: { email: env.ADMIN_EMAIL.toLowerCase() },
    update: {
      role: "admin",
      passwordHash,
      status: "active",
      emailVerified: true
    },
    create: {
      role: "admin",
      email: env.ADMIN_EMAIL.toLowerCase(),
      passwordHash,
      status: "active",
      emailVerified: true
    }
  });

  console.info(`Seeded admin account: ${admin.email}`);
}

void main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
