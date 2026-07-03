import http from "node:http";
import { createAdapter } from "@socket.io/redis-adapter";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { Server } from "socket.io";
import { corsOrigins, env } from "./config/env.js";
import { prisma } from "./db/prisma.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";
import { apiRouter } from "./routes/index.js";
import { connectRedis, closeRedis, createSocketRedisClients } from "./services/redis.service.js";
import { registerSocketHandlers } from "./sockets/index.js";
import { setIoInstance } from "./sockets/io-instance.js";

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: corsOrigins,
    credentials: true
  }
});
const socketRedisClients = createSocketRedisClients();
io.adapter(createAdapter(socketRedisClients.pubClient, socketRedisClients.subClient));
setIoInstance(io);

app.use(helmet());
app.use(
  cors({
    origin: corsOrigins,
    credentials: true
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

app.use("/api", apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);

registerSocketHandlers(io);

async function start() {
  await prisma.$connect();
  await connectRedis();

  httpServer.listen(env.PORT, () => {
    console.info(`API listening on http://localhost:${env.PORT}`);
  });
}

async function shutdown(signal: string) {
  console.info(`${signal} received. Shutting down API.`);
  httpServer.close(async () => {
    await closeRedis();
    await Promise.all([
      socketRedisClients.pubClient.quit().catch(() => undefined),
      socketRedisClients.subClient.quit().catch(() => undefined),
    ]);
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

void start().catch(async (error) => {
  console.error(error);
  await closeRedis();
  await Promise.all([
    socketRedisClients.pubClient.quit().catch(() => undefined),
    socketRedisClients.subClient.quit().catch(() => undefined),
  ]);
  await prisma.$disconnect();
  process.exit(1);
});
