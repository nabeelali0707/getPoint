import { prisma } from "../db/prisma.js";
import { HttpError } from "../utils/http-error.js";

function serializeRoute(
  route: {
    id: string;
    code: string;
    provider: string;
    driverName: string | null;
    driverPhone: string | null;
    startTime: string;
    endTime: string;
    stops: {
      id: string;
      name: string;
      sequence: number;
      scheduledTime: string;
      lat: number;
      lng: number;
    }[];
  },
  activeTrip: any | null,
) {
  const latestPing = activeTrip?.locationPings?.[0];
  const isLive = Boolean(activeTrip && latestPing);

  return {
    id: route.id,
    code: route.code,
    provider: route.provider,
    driverName: route.driverName,
    driverPhone: route.driverPhone,
    startTime: route.startTime,
    endTime: route.endTime,
    isLive,
    liveLat: latestPing?.lat ?? null,
    liveLng: latestPing?.lng ?? null,
    liveSpeed: latestPing?.speed ?? null,
    tripId: activeTrip?.id ?? null,
    stops: route.stops.map((stop) => ({
      id: stop.id,
      name: stop.name,
      sequence: stop.sequence,
      scheduledTime: stop.scheduledTime,
      lat: stop.lat,
      lng: stop.lng,
    })),
  };
}

export async function listRoutes() {
  const routes = await prisma.route.findMany({
    include: {
      stops: { orderBy: { sequence: "asc" } },
    },
    orderBy: { code: "asc" },
  });

  const activeTrips = await prisma.trip.findMany({
    where: { status: { in: ["started", "paused"] } },
    include: {
      locationPings: { orderBy: { timestamp: "desc" }, take: 1 },
    },
  });

  const tripByRouteId = new Map<string, any>();
  for (const trip of activeTrips) {
    if (trip.routeId) {
      tripByRouteId.set(trip.routeId, trip);
    }
  }

  return routes.map((route) =>
    serializeRoute(route, tripByRouteId.get(route.id) || null),
  );
}

export async function getRouteById(routeId: string) {
  const route = await prisma.route.findUnique({
    where: { id: routeId },
    include: {
      stops: { orderBy: { sequence: "asc" } },
    },
  });

  if (!route) {
    throw new HttpError(404, "Route not found.");
  }

  const activeTrip = await prisma.trip.findFirst({
    where: { routeId, status: { in: ["started", "paused"] } },
    include: {
      locationPings: { orderBy: { timestamp: "desc" }, take: 1 },
    },
  });

  return serializeRoute(route, activeTrip);
}
