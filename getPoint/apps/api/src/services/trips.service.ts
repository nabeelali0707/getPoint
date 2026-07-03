import { prisma } from "../db/prisma.js";
import { HttpError } from "../utils/http-error.js";
import { broadcastPointLocation, broadcastPointStatus, broadcastTripUpdate } from "./realtime.service.js";
import { upsertTripLocationCache } from "./trip-location-cache.service.js";

function serializeTrip(
  trip: {
    id: string;
    status: string;
    startTime: Date;
    endTime: Date | null;
    point: { id: string; code: string; name: string; description: string | null };
    locationCache: { speed: number | null; lat: number; lng: number } | null;
  },
) {
  const latestPing = trip.locationCache;
  const isLive = trip.status === "started" || trip.status === "paused";

  return {
    id: trip.id,
    status: trip.status,
    isLive,
    routeName: `Route ${trip.point.code.replace(/\s+/g, "")} — Express`,
    routeDescription: trip.point.description ?? trip.point.name,
    pointId: trip.point.id,
    pointName: trip.point.name,
    pointCode: trip.point.code,
    speed: latestPing?.speed ?? null,
    lat: latestPing?.lat ?? null,
    lng: latestPing?.lng ?? null,
    startTime: trip.startTime.toISOString(),
    endTime: trip.endTime?.toISOString() ?? null,
  };
}

async function getDriverProfile(userId: string) {
  const profile = await prisma.driverProfile.findUnique({
    where: { userId },
    include: { assignedPoint: true },
  });

  if (!profile || profile.approvalStatus !== "approved") {
    throw new HttpError(403, "Approved driver profile required.");
  }

  return profile;
}

async function findActiveTrip(driverId: string) {
  return prisma.trip.findFirst({
    where: {
      driverId,
      status: { in: ["started", "paused"] },
    },
    include: {
      point: true,
      locationCache: true,
    },
  });
}

async function syncPointStatus(pointId: string) {
  const activeTrip = await prisma.trip.findFirst({
    where: { pointId, status: { in: ["started", "paused"] } },
  });

  if (activeTrip) {
    await prisma.point.update({
      where: { id: pointId },
      data: { status: "active" },
    });
    return;
  }

  const point = await prisma.point.findUnique({ where: { id: pointId } });
  if (point && point.status === "active") {
    await prisma.point.update({
      where: { id: pointId },
      data: { status: "inactive" },
    });
  }
}

export async function getCurrentTrip(userId: string) {
  const profile = await getDriverProfile(userId);
  const trip = await findActiveTrip(userId);

  return {
    trip: trip ? serializeTrip(trip) : null,
    assignedPoint: profile.assignedPoint
      ? {
          id: profile.assignedPoint.id,
          name: profile.assignedPoint.name,
          code: profile.assignedPoint.code,
        }
      : null,
  };
}

export async function startTrip(userId: string, pointId?: string) {
  const profile = await getDriverProfile(userId);
  const existing = await findActiveTrip(userId);

  if (existing) {
    throw new HttpError(409, "You already have an active trip.");
  }

  const resolvedPointId = pointId ?? profile.assignedPointId;
  if (!resolvedPointId) {
    throw new HttpError(400, "No transit point assigned. Contact admin to assign a point.");
  }

  const point = await prisma.point.findUnique({ where: { id: resolvedPointId } });
  if (!point) throw new HttpError(404, "Transit point not found.");

  const matchedRoute = await prisma.route.findFirst({
    where: {
      OR: [
        { code: { contains: point.code, mode: "insensitive" } },
        { stops: { some: { name: { contains: point.name, mode: "insensitive" } } } }
      ]
    }
  });

  const trip = await prisma.trip.create({
    data: {
      pointId: resolvedPointId,
      driverId: userId,
      status: "started",
      routeId: matchedRoute?.id ?? null,
    },
    include: {
      point: true,
      locationCache: true,
    },
  });

  await upsertTripLocationCache({
    tripId: trip.id,
    lat: point.referenceStopLat,
    lng: point.referenceStopLng,
    speed: 0,
  });

  await syncPointStatus(resolvedPointId);

  const pointAfterSync = await prisma.point.findUnique({ where: { id: resolvedPointId } });
  if (pointAfterSync) {
    await broadcastPointStatus({
      pointId: resolvedPointId,
      status: pointAfterSync.status,
    });
  }

  await prisma.notification.create({
    data: {
      userId,
      type: "trip",
      message: `Trip started on ${point.name}. Location broadcasting is active.`,
    },
  });

  const refreshed = await prisma.trip.findUnique({
    where: { id: trip.id },
    include: {
      point: true,
      locationCache: true,
    },
  });

  return { trip: serializeTrip(refreshed!) };
}

export async function endTrip(userId: string, tripId: string) {
  const trip = await prisma.trip.findFirst({
    where: { id: tripId, driverId: userId },
    include: { point: true },
  });

  if (!trip) throw new HttpError(404, "Trip not found.");
  if (trip.status === "ended") throw new HttpError(409, "Trip is already ended.");

  const updated = await prisma.trip.update({
    where: { id: tripId },
    data: { status: "ended", endTime: new Date() },
    include: {
      point: true,
      locationCache: true,
    },
  });

  await syncPointStatus(trip.pointId);

  const pointAfterSync = await prisma.point.findUnique({ where: { id: trip.pointId } });
  if (pointAfterSync) {
    await broadcastPointStatus({
      pointId: trip.pointId,
      status: pointAfterSync.status,
    });
  }

  return { trip: serializeTrip(updated) };
}

export async function recordPing(
  userId: string,
  tripId: string,
  input: { lat: number; lng: number; speed?: number },
) {
  const trip = await prisma.trip.findFirst({
    where: { id: tripId, driverId: userId, status: { in: ["started", "paused"] } },
  });

  if (!trip) throw new HttpError(404, "Active trip not found.");

  await upsertTripLocationCache({
    tripId,
    lat: input.lat,
    lng: input.lng,
    speed: input.speed ?? null,
  });

  const refreshed = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      point: true,
      locationCache: true,
    },
  });

  const serialized = serializeTrip(refreshed!);

  await broadcastPointLocation({
    pointId: refreshed!.pointId,
    lat: input.lat,
    lng: input.lng,
    speed: input.speed ?? null,
    status: refreshed!.point.status,
  });

  await broadcastTripUpdate(tripId, serialized);

  return { trip: serialized };
}
