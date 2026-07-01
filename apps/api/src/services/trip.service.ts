import { prisma } from "../db/prisma.js";
import { HttpError } from "../utils/http-error.js";
import { clearTripLiveState, markTripLive } from "./live-location.service.js";

export async function startTrip(driverId: string, requestedPointId?: string) {
  const driver = await prisma.driverProfile.findUnique({
    where: { userId: driverId },
    include: { assignedPoint: true }
  });

  if (!driver || driver.approvalStatus !== "approved") {
    throw new HttpError(403, "Driver account is not approved.");
  }

  const pointId = requestedPointId ?? driver.assignedPointId;
  if (!pointId) {
    throw new HttpError(400, "Driver is not assigned to a point.");
  }

  if (driver.assignedPointId && pointId !== driver.assignedPointId) {
    throw new HttpError(403, "Driver can only start a trip for the assigned point.");
  }

  const activeTrip = await prisma.trip.findFirst({
    where: {
      status: "started",
      OR: [{ driverId }, { pointId }]
    }
  });

  if (activeTrip) {
    throw new HttpError(409, "An active trip already exists for this driver or point.");
  }

  const trip = await prisma.$transaction(async (tx) => {
    const createdTrip = await tx.trip.create({
      data: {
        driverId,
        pointId,
        status: "started"
      },
      include: {
        point: true
      }
    });

    await tx.point.update({
      where: { id: pointId },
      data: { status: "active" }
    });

    return createdTrip;
  });

  await markTripLive(trip.id, pointId);
  return trip;
}

export async function endTrip(driverId: string, tripId: string) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { point: true }
  });

  if (!trip) {
    throw new HttpError(404, "Trip not found.");
  }

  if (trip.driverId !== driverId) {
    throw new HttpError(403, "You can only end your own trip.");
  }

  if (trip.status !== "started") {
    throw new HttpError(409, "Trip is not currently started.");
  }

  const endedTrip = await prisma.$transaction(async (tx) => {
    const updatedTrip = await tx.trip.update({
      where: { id: tripId },
      data: {
        status: "ended",
        endTime: new Date()
      },
      include: { point: true }
    });

    await tx.point.update({
      where: { id: trip.pointId },
      data: { status: "inactive" }
    });

    return updatedTrip;
  });

  await clearTripLiveState(trip.id, trip.pointId);
  return endedTrip;
}
