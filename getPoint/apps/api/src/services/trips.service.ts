import { prisma } from "../db/prisma.js";
import { HttpError } from "../utils/http-error.js";

function serializeTrip(
  trip: {
    id: string;
    status: string;
    startTime: Date;
    endTime: Date | null;
    point: { id: string; code: string; name: string; description: string | null };
    locationPings: { speed: number | null; lat: number; lng: number }[];
  },
) {
  const latestPing = trip.locationPings[0];
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
      locationPings: { orderBy: { timestamp: "desc" }, take: 1 },
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

  const trip = await prisma.trip.create({
    data: {
      pointId: resolvedPointId,
      driverId: userId,
      status: "started",
    },
    include: {
      point: true,
      locationPings: true,
    },
  });

  await prisma.locationPing.create({
    data: {
      tripId: trip.id,
      lat: point.referenceStopLat,
      lng: point.referenceStopLng,
      speed: 0,
    },
  });

  await syncPointStatus(resolvedPointId);

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
      locationPings: { orderBy: { timestamp: "desc" }, take: 1 },
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
      locationPings: { orderBy: { timestamp: "desc" }, take: 1 },
    },
  });

  await syncPointStatus(trip.pointId);

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

  await prisma.locationPing.create({
    data: {
      tripId,
      lat: input.lat,
      lng: input.lng,
      speed: input.speed ?? null,
    },
  });

  const refreshed = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      point: true,
      locationPings: { orderBy: { timestamp: "desc" }, take: 1 },
    },
  });

  return { trip: serializeTrip(refreshed!) };
}