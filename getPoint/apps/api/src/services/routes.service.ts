import { exec } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "../db/prisma.js";
import { HttpError } from "../utils/http-error.js";

const execPromise = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface StopInput {
  name: string;
  sequence: number;
  scheduledTime: string;
  lat: number;
  lng: number;
}

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

export async function deleteRoute(routeId: string) {
  const route = await prisma.route.findUnique({ where: { id: routeId } });
  if (!route) {
    throw new HttpError(404, "Route not found.");
  }
  await prisma.route.delete({ where: { id: routeId } });
}

export async function updateRoute(
  routeId: string,
  data: {
    code: string;
    provider: string;
    driverName: string | null;
    driverPhone: string | null;
    startTime: string;
    endTime: string;
    stops: StopInput[];
  },
) {
  const route = await prisma.route.findUnique({ where: { id: routeId } });
  if (!route) {
    throw new HttpError(404, "Route not found.");
  }

  // Update Route master info
  const updatedRoute = await prisma.route.update({
    where: { id: routeId },
    data: {
      code: data.code,
      provider: data.provider,
      driverName: data.driverName,
      driverPhone: data.driverPhone,
      startTime: data.startTime,
      endTime: data.endTime,
    },
  });

  // Re-create stops
  await prisma.routeStop.deleteMany({ where: { routeId } });
  for (const stop of data.stops) {
    await prisma.routeStop.create({
      data: {
        routeId,
        name: stop.name,
        sequence: stop.sequence,
        scheduledTime: stop.scheduledTime,
        lat: stop.lat,
        lng: stop.lng,
      },
    });
  }

  return getRouteById(routeId);
}

export function generateReturnRoute(forwardStops: any[]): any[] {
  if (forwardStops.length < 2) return [];

  const timeToMinutes = (timeStr: string): number => {
    const clean = timeStr.toLowerCase().trim();
    const isPm = clean.includes("pm");
    const isAm = clean.includes("am");
    const timeOnly = clean.replace(/(am|pm)/g, "").trim();
    const [hPart, mPart] = timeOnly.split(":");
    let hours = parseInt(hPart, 10);
    const minutes = parseInt(mPart, 10);
    if (isPm && hours < 12) hours += 12;
    if (isAm && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  const minutesToTimeStr = (totalMin: number): string => {
    let hours = Math.floor(totalMin / 60);
    const minutes = totalMin % 60;
    const ampm = hours >= 12 ? "pm" : "am";
    if (hours > 12) hours -= 12;
    if (hours === 0) hours = 12;
    const mStr = minutes.toString().padStart(2, "0");
    const hStr = hours.toString().padStart(2, "0");
    return `${hStr}:${mStr} ${ampm}`;
  };

  const diffs: number[] = [];
  for (let i = 0; i < forwardStops.length - 1; i++) {
    const t1 = timeToMinutes(forwardStops[i].scheduledTime);
    const t2 = timeToMinutes(forwardStops[i + 1].scheduledTime);
    diffs.push(t2 - t1);
  }

  const reversedStops = [...forwardStops].reverse();

  const returnStops: any[] = [];
  let currentMinutes = 16 * 60 + 15; // 4:15 PM = 975 minutes

  returnStops.push({
    name: reversedStops[0].name,
    sequence: 0,
    scheduledTime: minutesToTimeStr(currentMinutes),
    lat: reversedStops[0].lat,
    lng: reversedStops[0].lng,
  });

  for (let i = 0; i < reversedStops.length - 1; i++) {
    const diff = diffs[diffs.length - 1 - i];
    currentMinutes += diff;
    returnStops.push({
      name: reversedStops[i + 1].name,
      sequence: i + 1,
      scheduledTime: minutesToTimeStr(currentMinutes),
      lat: reversedStops[i + 1].lat,
      lng: reversedStops[i + 1].lng,
    });
  }

  return returnStops;
}

export async function processRouteUpload(filePath: string) {
  const parserScriptPath = path.join(__dirname, "../db/seeds/parse_uploaded_file.py");
  const escapedPath = filePath.replace(/\\/g, "/");
  const command = `python "${parserScriptPath}" "${escapedPath}"`;

  const { stdout } = await execPromise(command);
  const parsedRoutes = JSON.parse(stdout);

  if (parsedRoutes.error) {
    throw new HttpError(400, parsedRoutes.error);
  }

  const results: any[] = [];

  for (const forwardRoute of parsedRoutes) {
    // 1. Process Forward Route
    const forwardCode = `${forwardRoute.code} (Forward)`;
    const forwardRecord = await prisma.route.upsert({
      where: { code: forwardCode },
      update: {
        provider: forwardRoute.provider,
        driverName: forwardRoute.driverName,
        driverPhone: forwardRoute.driverPhone,
        startTime: forwardRoute.startTime,
        endTime: forwardRoute.endTime,
      },
      create: {
        code: forwardCode,
        provider: forwardRoute.provider,
        driverName: forwardRoute.driverName,
        driverPhone: forwardRoute.driverPhone,
        startTime: forwardRoute.startTime,
        endTime: forwardRoute.endTime,
      },
    });

    await prisma.routeStop.deleteMany({ where: { routeId: forwardRecord.id } });
    for (const stop of forwardRoute.stops) {
      await prisma.routeStop.create({
        data: {
          routeId: forwardRecord.id,
          name: stop.name,
          sequence: stop.sequence,
          scheduledTime: stop.scheduledTime,
          lat: stop.lat,
          lng: stop.lng,
        },
      });
    }

    // 2. Generate Return Route (using the algorithm)
    const returnStops = generateReturnRoute(forwardRoute.stops);
    const returnCode = `${forwardRoute.code} (Return)`;
    
    const returnRecord = await prisma.route.upsert({
      where: { code: returnCode },
      update: {
        provider: forwardRoute.provider,
        driverName: forwardRoute.driverName,
        driverPhone: forwardRoute.driverPhone,
        startTime: returnStops[0]?.scheduledTime || "16:15",
        endTime: returnStops[returnStops.length - 1]?.scheduledTime || "17:15",
      },
      create: {
        code: returnCode,
        provider: forwardRoute.provider,
        driverName: forwardRoute.driverName,
        driverPhone: forwardRoute.driverPhone,
        startTime: returnStops[0]?.scheduledTime || "16:15",
        endTime: returnStops[returnStops.length - 1]?.scheduledTime || "17:15",
      },
    });

    await prisma.routeStop.deleteMany({ where: { routeId: returnRecord.id } });
    for (const stop of returnStops) {
      await prisma.routeStop.create({
        data: {
          routeId: returnRecord.id,
          name: stop.name,
          sequence: stop.sequence,
          scheduledTime: stop.scheduledTime,
          lat: stop.lat,
          lng: stop.lng,
        },
      });
    }

    results.push({
      forward: await getRouteById(forwardRecord.id),
      return: await getRouteById(returnRecord.id),
    });
  }

  return results;
}
