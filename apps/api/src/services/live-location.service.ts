import type { LiveLocationUpdate, LocationPingDto } from "@point/shared-types";
import type { Server } from "socket.io";
import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import { HttpError } from "../utils/http-error.js";
import { estimateEtaSeconds } from "./eta.service.js";
import { redis } from "./redis.service.js";

function activeTripsKey() {
  return "live:active-trips";
}

function tripPointKey(tripId: string) {
  return `live:trip:${tripId}:point`;
}

function latestLocationKey(tripId: string) {
  return `live:trip:${tripId}:latest-location`;
}

function lastPingKey(tripId: string) {
  return `live:trip:${tripId}:last-ping`;
}

function pingCountKey(tripId: string) {
  return `live:trip:${tripId}:ping-count`;
}

function pointActiveTripKey(pointId: string) {
  return `live:point:${pointId}:active-trip`;
}

function pointRoom(pointCode: string) {
  return `point:${pointCode}`;
}

function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || "Driver";
}

export async function markTripLive(tripId: string, pointId: string) {
  await redis.sadd(activeTripsKey(), tripId);
  await redis.set(tripPointKey(tripId), pointId);
  await redis.set(pointActiveTripKey(pointId), tripId);
}

export async function clearTripLiveState(tripId: string, pointId: string) {
  await redis.srem(activeTripsKey(), tripId);
  await redis.del(
    tripPointKey(tripId),
    latestLocationKey(tripId),
    lastPingKey(tripId),
    pingCountKey(tripId),
    pointActiveTripKey(pointId)
  );
}

export async function handleLocationPing(input: LocationPingDto, driverId: string) {
  const trip = await prisma.trip.findUnique({
    where: { id: input.tripId },
    include: {
      point: true,
      driver: true
    }
  });

  if (!trip || trip.status !== "started") {
    throw new HttpError(409, "Location pings are only accepted for started trips.");
  }

  if (trip.driverId !== driverId) {
    throw new HttpError(403, "You can only broadcast locations for your own trip.");
  }

  if (!Number.isFinite(input.lat) || !Number.isFinite(input.lng)) {
    throw new HttpError(400, "Latitude and longitude must be valid numbers.");
  }

  const timestamp = input.timestamp ? new Date(input.timestamp) : new Date();
  if (Number.isNaN(timestamp.getTime())) {
    throw new HttpError(400, "Timestamp must be a valid ISO date.");
  }

  const speed = input.speed !== undefined && Number.isFinite(input.speed) ? input.speed : null;
  const etaSeconds = estimateEtaSeconds({
    lat: input.lat,
    lng: input.lng,
    speed,
    referenceStopLat: trip.point.referenceStopLat,
    referenceStopLng: trip.point.referenceStopLng
  });

  const update: LiveLocationUpdate = {
    tripId: trip.id,
    pointId: trip.pointId,
    pointCode: trip.point.code,
    lat: input.lat,
    lng: input.lng,
    speed,
    timestamp: timestamp.toISOString(),
    etaSeconds,
    driver: {
      firstName: firstName(trip.driver.fullName),
      vehicleNo: trip.driver.vehicleNo
    }
  };

  await markTripLive(trip.id, trip.pointId);
  await redis.set(latestLocationKey(trip.id), JSON.stringify(update));
  await redis.set(lastPingKey(trip.id), Date.now().toString());

  const pingCount = await redis.incr(pingCountKey(trip.id));
  if (pingCount % env.LOCATION_PING_SAMPLE_RATE === 0) {
    await prisma.locationPing.create({
      data: {
        tripId: trip.id,
        lat: input.lat,
        lng: input.lng,
        speed,
        timestamp
      }
    });
  }

  if (trip.point.status === "signal_lost") {
    await prisma.point.update({
      where: { id: trip.pointId },
      data: { status: "active" }
    });
  }

  return update;
}

export async function broadcastLocationPing(io: Server, input: LocationPingDto, driverId: string) {
  const update = await handleLocationPing(input, driverId);
  io.to(pointRoom(update.pointCode)).emit("point:location", update);
  return update;
}

export async function getLatestLocationForPoint(pointId: string) {
  const tripId = await redis.get(pointActiveTripKey(pointId));
  if (!tripId) {
    return null;
  }

  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip || trip.status !== "started") {
    await clearTripLiveState(tripId, pointId);
    return null;
  }

  const location = await redis.get(latestLocationKey(tripId));
  return location ? (JSON.parse(location) as LiveLocationUpdate) : null;
}

export function startSignalLostScanner(io: Server) {
  const interval = setInterval(() => {
    void scanForSignalLost(io).catch((error) => {
      console.error("Signal-lost scanner failed", error);
    });
  }, env.SIGNAL_LOST_SCAN_INTERVAL_SECONDS * 1000);

  return () => clearInterval(interval);
}

async function scanForSignalLost(io: Server) {
  const tripIds = await redis.smembers(activeTripsKey());
  const now = Date.now();
  const timeoutMs = env.SIGNAL_LOST_TIMEOUT_SECONDS * 1000;

  for (const tripId of tripIds) {
    const lastPingValue = await redis.get(lastPingKey(tripId));
    if (!lastPingValue || now - Number(lastPingValue) <= timeoutMs) {
      continue;
    }

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { point: true }
    });

    if (!trip || trip.status !== "started") {
      const pointId = await redis.get(tripPointKey(tripId));
      await redis.srem(activeTripsKey(), tripId);
      if (pointId) {
        await clearTripLiveState(tripId, pointId);
      }
      continue;
    }

    await prisma.point.update({
      where: { id: trip.pointId },
      data: { status: "signal_lost" }
    });

    io.to(pointRoom(trip.point.code)).emit("point:status", {
      pointId: trip.pointId,
      pointCode: trip.point.code,
      status: "signal_lost",
      tripId: trip.id
    });
  }
}
