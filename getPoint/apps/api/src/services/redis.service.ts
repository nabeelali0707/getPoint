import { Redis } from "ioredis";
import { env } from "../config/env.js";

const realRedis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
});

// A local in-memory store for fallback when Redis is offline or not installed
const memoryStore = new Map<string, { value: string; expiresAt: number }>();

// Mute process-level unhandled rejection crashes by catching events
realRedis.on("error", (err) => {
  // Silent warning in dev
  if (env.NODE_ENV !== "production") {
    // Only warn occasionally or suppress to avoid spamming terminal
  }
});

export const redis = {
  status: "wait",

  async connect() {
    try {
      await realRedis.connect();
      this.status = realRedis.status;
      console.info("Redis connected successfully.");
    } catch (err) {
      this.status = "fallback";
      console.warn("Redis connection failed. Switched to in-memory fallback store.");
    }
  },

  async quit() {
    if (realRedis.status !== "end") {
      try {
        await realRedis.quit();
      } catch {}
    }
  },

  async set(key: string, value: string, option?: string, seconds?: number) {
    if (realRedis.status === "ready") {
      try {
        if (option === "EX" && typeof seconds === "number") {
          return await realRedis.set(key, value, "EX", seconds);
        }
        return await realRedis.set(key, value);
      } catch (err) {
        // Fall back to memory
      }
    }

    const expiresAt = option === "EX" && typeof seconds === "number"
      ? Date.now() + seconds * 1000
      : Infinity;
    memoryStore.set(key, { value, expiresAt });
    return "OK";
  },

  async get(key: string): Promise<string | null> {
    if (realRedis.status === "ready") {
      try {
        return await realRedis.get(key);
      } catch (err) {
        // Fall back to memory
      }
    }

    const entry = memoryStore.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      memoryStore.delete(key);
      return null;
    }
    return entry.value;
  },

  async del(key: string): Promise<number> {
    if (realRedis.status === "ready") {
      try {
        return await realRedis.del(key);
      } catch (err) {
        // Fall back to memory
      }
    }

    const deleted = memoryStore.delete(key);
    return deleted ? 1 : 0;
  },
};

export async function connectRedis() {
  await redis.connect();
}

export async function closeRedis() {
  await redis.quit();
}
