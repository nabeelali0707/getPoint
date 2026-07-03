import type { Server } from "socket.io";

let ioInstance: Server | null = null;

export function setIoInstance(io: Server) {
  ioInstance = io;
}

export function getIoInstance(): Server {
  if (!ioInstance) {
    throw new Error("Socket.io instance has not been initialized yet.");
  }
  return ioInstance;
}
