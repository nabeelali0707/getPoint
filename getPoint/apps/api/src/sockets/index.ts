import type { Server } from "socket.io";

export function registerSocketHandlers(io: Server) {
  io.on("connection", (socket) => {
    socket.emit("connected", { socketId: socket.id });

    socket.on("join:point", (pointId: string) => {
      if (pointId) {
        void socket.join(`point:${pointId}`);
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
