import type { PointStatus } from "@point/shared-types";
import { prisma } from "../db/prisma.js";
import { HttpError } from "../utils/http-error.js";

function pointIcon(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("library") || n.includes("engineering")) return "school";
  if (n.includes("cafe") || n.includes("cafeteria")) return "restaurant";
  if (n.includes("health") || n.includes("clinic")) return "medical_services";
  if (n.includes("union") || n.includes("plaza")) return "sports_soccer";
  return "directions_bus";
}

function etaForStatus(status: PointStatus, hasActiveTrip: boolean): string {
  if (hasActiveTrip && status !== "inactive" && status !== "signal_lost") {
    return "En route";
  }

  switch (status) {
    case "active":
      return "8 mins";
    case "delayed":
      return "12 mins";
    case "signal_lost":
      return "Signal lost";
    default:
      return "No active routes";
  }
}

function routeForStatus(status: PointStatus, code: string): string {
  if (status === "inactive" || status === "signal_lost") return "None";
  return `Route ${code.replace(/\s+/g, "")}`;
}

async function getFavoriteIds(userId?: string) {
  if (!userId) return new Set<string>();

  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
    include: { favoritePoints: { select: { id: true } } },
  });

  return new Set(profile?.favoritePoints.map((p) => p.id) ?? []);
}

function serializePoint(
  point: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    referenceStopLat: number;
    referenceStopLng: number;
    status: PointStatus;
  },
  isFavorite: boolean,
  hasActiveTrip = false,
) {
  return {
    id: point.id,
    code: point.code,
    name: point.name,
    description: point.description,
    lat: point.referenceStopLat,
    lng: point.referenceStopLng,
    status: point.status,
    eta: etaForStatus(point.status, hasActiveTrip),
    route: routeForStatus(point.status, point.code),
    icon: pointIcon(point.name),
    isFavorite,
  };
}

export async function listPoints(userId?: string) {
  const favoriteIds = await getFavoriteIds(userId);
  const [points, activeTrips] = await Promise.all([
    prisma.point.findMany({ orderBy: { code: "asc" } }),
    prisma.trip.findMany({
      where: { status: { in: ["started", "paused"] } },
      select: { pointId: true },
    }),
  ]);

  const activePointIds = new Set(activeTrips.map((trip) => trip.pointId));
  return points.map((point) =>
    serializePoint(point, favoriteIds.has(point.id), activePointIds.has(point.id)),
  );
}

export async function getPointById(pointId: string, userId?: string) {
  const [point, activeTrip] = await Promise.all([
    prisma.point.findUnique({ where: { id: pointId } }),
    prisma.trip.findFirst({
      where: { pointId, status: { in: ["started", "paused"] } },
      select: { id: true },
    }),
  ]);

  if (!point) throw new HttpError(404, "Point not found.");

  const favoriteIds = await getFavoriteIds(userId);
  return serializePoint(point, favoriteIds.has(point.id), Boolean(activeTrip));
}

export async function toggleFavorite(userId: string, pointId: string) {
  const point = await prisma.point.findUnique({ where: { id: pointId } });
  if (!point) throw new HttpError(404, "Point not found.");

  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
    include: { favoritePoints: { where: { id: pointId } } },
  });

  if (!profile) throw new HttpError(403, "Student profile required.");

  const isFavorite = profile.favoritePoints.length > 0;

  await prisma.studentProfile.update({
    where: { userId },
    data: isFavorite
      ? { favoritePoints: { disconnect: { id: pointId } } }
      : { favoritePoints: { connect: { id: pointId } } },
  });

  return { isFavorite: !isFavorite };
}
