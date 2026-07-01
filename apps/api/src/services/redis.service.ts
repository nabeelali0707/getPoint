import { Redis } from "ioredis";
import { env } from "../config/env.js";

export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 3
});

export async function connectRedis() {
  if (redis.status === "ready") {
    return;
  }

  await redis.connect();
}

export async function closeRedis() {
  if (redis.status !== "end") {
    await redis.quit();
  }
}
