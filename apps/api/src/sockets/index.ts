import { z } from "zod";
import type { Server, Socket } from "socket.io";
import { prisma } from "../db/prisma.js";
import { verifyAccessToken } from "../services/token.service.js";
import { broadcastLocationPing, getLatestLocationForPoint } from "../services/live-location.service.js";

type SocketUser = {
  id: string;
  role: "student" | "driver" | "admin";
  email: string;
};

type AuthenticatedSocket = Socket & {
  data: {
    user: SocketUser;
  };
};

const subscribeSchema = z.object({
  pointId: z.string().uuid()
});

const locationPingSchema = z.object({
  tripId: z.string().uuid(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  speed: z.number().nonnegative().optional(),
  timestamp: z.string().datetime().optional()
});

function pointRoom(pointCode: string) {
  return `point:${pointCode}`;
}

function readHandshakeToken(socket: Socket) {
  const authToken = socket.handshake.auth.token;
  if (typeof authToken === "string" && authToken.length > 0) {
    return authToken;
  }

  const header = socket.handshake.headers.authorization;
  if (typeof header === "string" && header.startsWith("Bearer ")) {
    return header.slice("Bearer ".length);
  }

  return null;
}

async function authenticateSocket(socket: Socket, next: (error?: Error) => void) {
  try {
    const token = readHandshakeToken(socket);
    if (!token) {
      throw new Error("Missing socket auth token.");
    }

    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { driverProfile: true }
    });

    if (!user || user.status !== "active") {
      throw new Error("Socket user is not active.");
    }

    if (user.role === "driver" && user.driverProfile?.approvalStatus !== "approved") {
      throw new Error("Driver account is not approved.");
    }

    socket.data.user = {
      id: user.id,
      role: user.role,
      email: user.email
    };

    next();
  } catch (error) {
    next(error instanceof Error ? error : new Error("Socket authentication failed."));
  }
}

export function registerSocketHandlers(io: Server) {
  io.use(authenticateSocket);

  io.on("connection", (socket: AuthenticatedSocket) => {
    socket.emit("connected", {
      socketId: socket.id,
      user: socket.data.user
    });

    socket.on("point:subscribe", (payload, ack?: (response: unknown) => void) => {
      void handlePointSubscribe(socket, payload)
        .then((response) => ack?.({ ok: true, ...response }))
        .catch((error) => ack?.({ ok: false, error: error instanceof Error ? error.message : "Subscribe failed." }));
    });

    socket.on("point:unsubscribe", (payload, ack?: (response: unknown) => void) => {
      void handlePointUnsubscribe(socket, payload)
        .then((response) => ack?.({ ok: true, ...response }))
        .catch((error) => ack?.({ ok: false, error: error instanceof Error ? error.message : "Unsubscribe failed." }));
    });

    socket.on("trip:location", (payload, ack?: (response: unknown) => void) => {
      void handleTripLocation(io, socket, payload)
        .then((response) => ack?.({ ok: true, location: response }))
        .catch((error) => ack?.({ ok: false, error: error instanceof Error ? error.message : "Location ping failed." }));
    });
  });
}

async function handlePointSubscribe(socket: AuthenticatedSocket, payload: unknown) {
  const { pointId } = subscribeSchema.parse(payload);
  const point = await prisma.point.findUnique({ where: { id: pointId } });

  if (!point) {
    throw new Error("Point not found.");
  }

  const room = pointRoom(point.code);
  await socket.join(room);

  try {
    const latestLocation = await getLatestLocationForPoint(pointId);
    if (latestLocation) {
      socket.emit("point:location", latestLocation);
    }
  } catch {
    socket.emit("point:warning", {
      pointId,
      pointCode: point.code,
      message: "Subscribed to point updates, but the latest location is temporarily unavailable."
    });
  }

  return { room, pointId, pointCode: point.code };
}

async function handlePointUnsubscribe(socket: AuthenticatedSocket, payload: unknown) {
  const { pointId } = subscribeSchema.parse(payload);
  const point = await prisma.point.findUnique({ where: { id: pointId } });

  if (!point) {
    throw new Error("Point not found.");
  }

  const room = pointRoom(point.code);
  await socket.leave(room);
  return { room, pointId, pointCode: point.code };
}

async function handleTripLocation(io: Server, socket: AuthenticatedSocket, payload: unknown) {
  if (socket.data.user.role !== "driver") {
    throw new Error("Only drivers can broadcast trip locations.");
  }

  const ping = locationPingSchema.parse(payload);
  return broadcastLocationPing(io, ping, socket.data.user.id);
}
