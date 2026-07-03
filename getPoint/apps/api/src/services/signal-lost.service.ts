import { prisma } from "../db/prisma.js";
import { broadcastPointStatus, broadcastTripUpdate } from "./realtime.service.js";

const DEFAULT_SIGNAL_LOST_AFTER_MS = 60_000;
const DEFAULT_SCAN_INTERVAL_MS = 30_000;

let scanner: NodeJS.Timeout | null = null;

export async function markSignalLostTrips(signalLostAfterMs = DEFAULT_SIGNAL_LOST_AFTER_MS) {
  const staleBefore = new Date(Date.now() - signalLostAfterMs);
  const staleLocations = await prisma.tripLocationCache.findMany({
    where: {
      lastPingAt: { lt: staleBefore },
      trip: { status: "started" },
    },
    include: {
      trip: {
        include: {
          point: true,
        },
      },
    },
  });

  let transitioned = 0;

  for (const location of staleLocations) {
    const result = await prisma.$transaction(async (tx) => {
      const tripUpdate = await tx.trip.updateMany({
        where: { id: location.tripId, status: "started" },
        data: { status: "signal_lost" },
      });

      if (tripUpdate.count === 0) {
        return null;
      }

      const point = await tx.point.update({
        where: { id: location.trip.pointId },
        data: { status: "signal_lost" },
      });

      return { point };
    });

    if (!result) {
      continue;
    }

    transitioned += 1;
    await broadcastPointStatus({
      pointId: location.trip.pointId,
      status: result.point.status,
    });
    await broadcastTripUpdate(location.tripId, {
      id: location.tripId,
      status: "signal_lost",
      isLive: false,
      pointId: location.trip.pointId,
      pointName: location.trip.point.name,
      pointCode: location.trip.point.code,
      lat: location.lat,
      lng: location.lng,
      speed: location.speed,
      startTime: location.trip.startTime.toISOString(),
      endTime: location.trip.endTime?.toISOString() ?? null,
    });
  }

  return transitioned;
}

export function startSignalLostScanner(
  scanIntervalMs = DEFAULT_SCAN_INTERVAL_MS,
  signalLostAfterMs = DEFAULT_SIGNAL_LOST_AFTER_MS,
) {
  if (scanner) {
    return;
  }

  scanner = setInterval(() => {
    void markSignalLostTrips(signalLostAfterMs).catch((error) => {
      console.warn("Signal-lost scanner failed.", error);
    });
  }, scanIntervalMs);
  scanner.unref();
}

export function stopSignalLostScanner() {
  if (!scanner) {
    return;
  }

  clearInterval(scanner);
  scanner = null;
}
