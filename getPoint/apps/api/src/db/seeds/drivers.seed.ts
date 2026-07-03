import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { env } from "../../config/env.js";
import { prisma } from "../prisma.js";
import { points } from "./points.seed.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const credentialsPath = join(__dirname, "output", "drivers-credentials.csv");

function slugifyPointCode(code: string) {
  return code.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function csvEscape(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

async function main() {
  if (!env.DRIVER_DEFAULT_PASSWORD) {
    throw new Error("DRIVER_DEFAULT_PASSWORD is required to seed driver accounts.");
  }

  const passwordHash = await bcrypt.hash(env.DRIVER_DEFAULT_PASSWORD, env.BCRYPT_ROUNDS);
  const csvRows = ["email,password,assignedPoint,pointCode"];

  for (const [index, pointSeed] of points.entries()) {
    const point = await prisma.point.upsert({
      where: { code: pointSeed.code },
      update: {
        name: pointSeed.name,
        description: pointSeed.description,
        referenceStopLat: pointSeed.referenceStopLat,
        referenceStopLng: pointSeed.referenceStopLng,
        status: pointSeed.status,
      },
      create: pointSeed,
    });

    const sequence = String(index + 1).padStart(3, "0");
    const pointSlug = slugifyPointCode(point.code);
    const email = `driver${pointSlug}@nu.edu.pk`;

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        role: "driver",
        passwordHash,
        status: "active",
        emailVerified: true,
      },
      create: {
        role: "driver",
        email,
        passwordHash,
        status: "active",
        emailVerified: true,
      },
    });

    await prisma.driverProfile.upsert({
      where: { userId: user.id },
      update: {
        fullName: `Driver ${point.code}`,
        licenseNo: `GPL-${sequence}-${pointSlug.toUpperCase().replace(/-/g, "")}`,
        vehicleNo: `GP-${sequence}`,
        phone: "+920000000000",
        approvalStatus: "approved",
        rejectionReason: null,
        assignedPointId: point.id,
      },
      create: {
        userId: user.id,
        fullName: `Driver ${point.code}`,
        licenseNo: `GPL-${sequence}-${pointSlug.toUpperCase().replace(/-/g, "")}`,
        vehicleNo: `GP-${sequence}`,
        phone: "+920000000000",
        approvalStatus: "approved",
        assignedPointId: point.id,
      },
    });

    csvRows.push(
      [
        csvEscape(email),
        csvEscape(env.DRIVER_DEFAULT_PASSWORD),
        csvEscape(point.name),
        csvEscape(point.code),
      ].join(","),
    );
  }

  await mkdir(dirname(credentialsPath), { recursive: true });
  await writeFile(credentialsPath, `${csvRows.join("\n")}\n`, "utf8");

  console.info(`Seeded ${points.length} approved driver accounts.`);
  console.info(`Wrote driver credentials to ${credentialsPath}`);
}

void main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
