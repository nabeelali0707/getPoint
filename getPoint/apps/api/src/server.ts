import http from "node:http";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { corsOrigins, env } from "./config/env.js";
import { prisma } from "./db/prisma.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";
import { apiRouter } from "./routes/index.js";
import { closeRealtimeChannels } from "./services/realtime.service.js";
import { startSignalLostScanner, stopSignalLostScanner } from "./services/signal-lost.service.js";

const app = express();
const httpServer = http.createServer(app);

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

async function start() {
  await prisma.$connect();
  startSignalLostScanner();

  httpServer.listen(env.PORT, () => {
    console.info(`API listening on http://localhost:${env.PORT}`);
  });
}

async function shutdown(signal: string) {
  console.info(`${signal} received. Shutting down API.`);
  stopSignalLostScanner();
  httpServer.close(async () => {
    await closeRealtimeChannels();
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

void start().catch(async (error) => {
  console.error(error);
  stopSignalLostScanner();
  await closeRealtimeChannels();
  await prisma.$disconnect();
  process.exit(1);
});
