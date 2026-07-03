import type { Server } from "socket.io";
import { getLatestLocationForPoint } from "../services/trip-location-cache.service.js";

export function registerSocketHandlers(io: Server) {
  io.on("connection", (socket) => {
    socket.emit("connected", { socketId: socket.id });

    socket.on("join:point", (pointId: string) => {
      if (pointId) {
        void socket.join(`point:${pointId}`);
        void getLatestLocationForPoint(pointId)
          .then((latestLocation) => {
            if (latestLocation) {
              socket.emit("point:location", {
                pointId,
                lat: latestLocation.lat,
                lng: latestLocation.lng,
                speed: latestLocation.speed,
              });
            }
          })
          .catch(() => {
            socket.emit("point:warning", {
              pointId,
              message: "Subscribed to point updates, but the latest location is temporarily unavailable.",
            });
          });
      }
    });

    socket.on("leave:point", (pointId: string) => {
      if (pointId) {
        void socket.leave(`point:${pointId}`);
      }
    });

    socket.on("join:trip", (tripId: string) => {
      if (tripId) {
        void socket.join(`trip:${tripId}`);
      }
    });

    socket.on("leave:trip", (tripId: string) => {
      if (tripId) {
        void socket.leave(`trip:${tripId}`);
      }
    });
  });
}
