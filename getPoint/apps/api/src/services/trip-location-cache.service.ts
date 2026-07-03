import { prisma } from "../db/prisma.js";

export async function upsertTripLocationCache(input: {
  tripId: string;
  lat: number;
  lng: number;
  speed?: number | null;
  lastPingAt?: Date;
}) {
  const lastPingAt = input.lastPingAt ?? new Date();

  return prisma.tripLocationCache.upsert({
    where: { tripId: input.tripId },
    create: {
      tripId: input.tripId,
      lat: input.lat,
      lng: input.lng,
      speed: input.speed ?? null,
      lastPingAt,
    },
    update: {
      lat: input.lat,
      lng: input.lng,
      speed: input.speed ?? null,
      lastPingAt,
    },
  });
}

export async function getLatestLocationForPoint(pointId: string) {
  return prisma.tripLocationCache.findFirst({
    where: {
      trip: {
        pointId,
        status: { in: ["started", "paused"] },
      },
    },
    orderBy: { lastPingAt: "desc" },
  });
}
