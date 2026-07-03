import type { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma.js";

export async function setEphemeralState(
  key: string,
  value: Prisma.InputJsonValue,
  ttlSeconds: number
) {
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

  await prisma.ephemeralState.upsert({
    where: { key },
    create: {
      key,
      value,
      expiresAt,
    },
    update: {
      value,
      expiresAt,
    },
  });
}

export async function getEphemeralState<T>(key: string) {
  const row = await prisma.ephemeralState.findFirst({
    where: {
      key,
      expiresAt: {
        gt: new Date(),
      },
    },
  });

  return row?.value as T | undefined;
}

export async function updateEphemeralStateValue(
  key: string,
  value: Prisma.InputJsonValue
) {
  await prisma.ephemeralState.updateMany({
    where: {
      key,
      expiresAt: {
        gt: new Date(),
      },
    },
    data: { value },
  });
}

export async function deleteEphemeralState(key: string) {
  await prisma.ephemeralState.deleteMany({
    where: { key },
  });
}

export async function incrementEphemeralCounter(key: string, ttlSeconds: number) {
  const current = await getEphemeralState<{ count?: number }>(key);
  const count = (current?.count ?? 0) + 1;
  await setEphemeralState(key, { count }, ttlSeconds);
  return count;
}
