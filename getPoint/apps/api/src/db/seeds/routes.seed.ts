import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../prisma.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface RouteJson {
  code: string;
  provider: string;
  driverName: string | null;
  driverPhone: string | null;
  startTime: string;
  endTime: string;
  stops: {
    name: string;
    sequence: number;
    scheduledTime: string;
    lat: number;
    lng: number;
  }[];
}

export async function main() {
  const jsonPath = path.join(__dirname, "routes_data.json");
  if (!fs.existsSync(jsonPath)) {
    console.error("routes_data.json not found! Please run parser script first.");
    return;
  }

  const raw = fs.readFileSync(jsonPath, "utf-8");
  const routesData = JSON.parse(raw) as RouteJson[];

  console.info(`Found ${routesData.length} routes to seed.`);

  for (const route of routesData) {
    // 1. Upsert Route
    const routeRecord = await prisma.route.upsert({
      where: { code: route.code },
      update: {
        provider: route.provider,
        driverName: route.driverName,
        driverPhone: route.driverPhone,
        startTime: route.startTime,
        endTime: route.endTime,
      },
      create: {
        code: route.code,
        provider: route.provider,
        driverName: route.driverName,
        driverPhone: route.driverPhone,
        startTime: route.startTime,
        endTime: route.endTime,
      },
    });

    // 2. Clear old stops
    await prisma.routeStop.deleteMany({
      where: { routeId: routeRecord.id },
    });

    // 3. Insert stops
    for (const stop of route.stops) {
      await prisma.routeStop.create({
        data: {
          routeId: routeRecord.id,
          name: stop.name,
          sequence: stop.sequence,
          scheduledTime: stop.scheduledTime,
          lat: stop.lat,
          lng: stop.lng,
        },
      });
    }
  }

  console.info("Seeded all routes and stops successfully.");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void main()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
