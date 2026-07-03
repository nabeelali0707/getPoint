import { createClient, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "../config/env.js";

type BroadcastPayload = Record<string, unknown>;

const realtimeKey = env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_ANON_KEY;
const supabase: SupabaseClient | null =
  env.SUPABASE_URL && realtimeKey
    ? createClient(env.SUPABASE_URL, realtimeKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
    : null;

const channels = new Map<string, Promise<RealtimeChannel>>();
let warnedMissingConfig = false;

function getChannel(name: string) {
  if (!supabase) {
    if (!warnedMissingConfig) {
      warnedMissingConfig = true;
      console.warn("Supabase Realtime is not configured; live broadcasts are disabled.");
    }

    return Promise.reject(new Error("Supabase Realtime is not configured."));
  }

  const existing = channels.get(name);
  if (existing) {
    return existing;
  }

  const channelPromise = new Promise<RealtimeChannel>((resolve, reject) => {
    const channel = supabase.channel(name, {
      config: {
        broadcast: { self: false },
      },
    });

    const timeout = setTimeout(() => {
      channels.delete(name);
      reject(new Error(`Realtime channel ${name} subscription timed out.`));
    }, 5_000);

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        clearTimeout(timeout);
        resolve(channel);
      }

      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        clearTimeout(timeout);
        channels.delete(name);
        reject(new Error(`Realtime channel ${name} failed with status ${status}.`));
      }
    });
  });

  channels.set(name, channelPromise);
  return channelPromise;
}

async function broadcast(channelName: string, event: string, payload: BroadcastPayload) {
  try {
    const channel = await getChannel(channelName);
    await channel.send({
      type: "broadcast",
      event,
      payload,
    });
  } catch (error) {
    console.warn(`Supabase Realtime broadcast failed for ${channelName}:${event}.`, error);
  }
}

export async function broadcastPointLocation(payload: BroadcastPayload & { pointId: string }) {
  await Promise.all([
    broadcast(`point:${payload.pointId}`, "point:location", payload),
    broadcast("points:all", "point:location", payload),
  ]);
}

export async function broadcastPointStatus(payload: BroadcastPayload & { pointId: string }) {
  await Promise.all([
    broadcast(`point:${payload.pointId}`, "point:status", payload),
    broadcast("points:all", "point:status", payload),
  ]);
}

export async function broadcastTripUpdate(tripId: string, payload: BroadcastPayload) {
  await broadcast(`trip:${tripId}`, "trip:update", payload);
}

export async function closeRealtimeChannels() {
  if (!supabase) {
    channels.clear();
    return;
  }

  const settledChannels = await Promise.allSettled(Array.from(channels.values()));
  await Promise.all(
    settledChannels.map((result) =>
      result.status === "fulfilled" ? supabase.removeChannel(result.value) : Promise.resolve(),
    ),
  );
  channels.clear();
}
