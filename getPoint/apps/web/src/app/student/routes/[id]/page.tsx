"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import BottomNav from "@/components/BottomNav";
import { authFetch } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";
import { realtime } from "@/lib/realtime";

const RouteMap = dynamic(() => import("@/components/RouteMap"), { ssr: false });

interface Stop {
  id: string;
  name: string;
  sequence: number;
  scheduledTime: string;
  lat: number;
  lng: number;
}

interface RouteDetail {
  id: string;
  code: string;
  provider: string;
  driverName: string | null;
  driverPhone: string | null;
  startTime: string;
  endTime: string;
  isLive: boolean;
  liveLat: number | null;
  liveLng: number | null;
  liveSpeed: number | null;
  tripId: string | null;
  stops: Stop[];
}

export default function RouteDetailPage() {
  const router = useRouter();
  const params = useParams();
  const routeId = params.id as string;

  const [route, setRoute] = useState<RouteDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Tracking state
  const [busCoords, setBusCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [busStatus, setBusStatus] = useState<"live" | "fallback" | "offline">("offline");
  const [currentSpeed, setCurrentSpeed] = useState<number | null>(null);
  const [etaText, setEtaText] = useState<string>("—");

  useRequireAuth();

  const loadRoute = async () => {
    try {
      const data = await authFetch<{ route: RouteDetail }>(`/api/routes/${routeId}`);
      setRoute(data.route);
      setErrorMsg("");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to load route.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRoute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeId]);

  // Sockets Subscription (for Live mode)
  useEffect(() => {
    const client = realtime;
    if (!route || !route.isLive || !route.tripId || !client) return;

    const handleTripUpdate = (updatedTrip: { lat?: number; lng?: number; speed?: number; status?: string }) => {
      if (updatedTrip.lat && updatedTrip.lng) {
        setBusCoords({ lat: updatedTrip.lat, lng: updatedTrip.lng });
        setCurrentSpeed(updatedTrip.speed);
        setBusStatus("live");
        setEtaText(updatedTrip.status === "started" ? "En route" : "Paused");
      }
    };

    const channel = client
      .channel(`trip:${route.tripId}`)
      .on("broadcast", { event: "trip:update" }, ({ payload }) => handleTripUpdate(payload))
      .subscribe();

    // Seed initial live coords
    if (route.liveLat && route.liveLng) {
      setBusCoords({ lat: route.liveLat, lng: route.liveLng });
      setCurrentSpeed(route.liveSpeed);
      setBusStatus("live");
      setEtaText("En route");
    }

    return () => {
      void client.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route?.isLive, route?.tripId, route?.liveLat, route?.liveLng, route?.liveSpeed]);

  // Timetable simulation loop (for Fallback mode)
  useEffect(() => {
    if (!route || route.isLive) return;

    const timeToMinutes = (timeStr: string): number => {
      const clean = timeStr.toLowerCase().trim();
      const isPm = clean.includes("pm");
      const isAm = clean.includes("am");
      const timeOnly = clean.replace(/(am|pm)/g, "").trim();
      const [hPart, mPart] = timeOnly.split(":");
      let hours = parseInt(hPart, 10);
      const minutes = parseInt(mPart, 10);
      if (isPm && hours < 12) hours += 12;
      if (isAm && hours === 12) hours = 0;
      return hours * 60 + minutes;
    };

    const getPktMinutesWithSeconds = (): number => {
      const d = new Date();
      let hours = d.getUTCHours() + 5; // PKT is UTC+5
      const minutes = d.getUTCMinutes();
      const seconds = d.getUTCSeconds();
      if (hours >= 24) hours -= 24;
      return hours * 60 + minutes + seconds / 60;
    };

    const runSimulation = () => {
      const stops = route.stops;
      if (stops.length < 2) {
        setBusStatus("offline");
        setBusCoords(null);
        return;
      }

      const nowMin = getPktMinutesWithSeconds();
      const startMin = timeToMinutes(stops[0].scheduledTime);
      const endMin = timeToMinutes(stops[stops.length - 1].scheduledTime);

      if (nowMin < startMin || nowMin > endMin) {
        // Outside scheduled runtime
        setBusStatus("offline");
        setBusCoords(null);
        setEtaText("Offline");
        return;
      }

      // We are inside the scheduled route time window! Timetable fallback active.
      setBusStatus("fallback");
      setCurrentSpeed(null);

      // Find the segment we are currently in
      let segmentStart: Stop | null = null;
      let segmentEnd: Stop | null = null;

      for (let i = 0; i < stops.length - 1; i++) {
        const sTime = timeToMinutes(stops[i].scheduledTime);
        const eTime = timeToMinutes(stops[i + 1].scheduledTime);

        if (nowMin >= sTime && nowMin <= eTime) {
          segmentStart = stops[i];
          segmentEnd = stops[i + 1];
          break;
        }
      }

      if (segmentStart && segmentEnd) {
        const sTime = timeToMinutes(segmentStart.scheduledTime);
        const eTime = timeToMinutes(segmentEnd.scheduledTime);
        const totalDuration = eTime - sTime;
        const elapsed = nowMin - sTime;

        // Ratio of completion along the segment
        const ratio = totalDuration > 0 ? elapsed / totalDuration : 0;

        const simulatedLat = segmentStart.lat + ratio * (segmentEnd.lat - segmentStart.lat);
        const simulatedLng = segmentStart.lng + ratio * (segmentEnd.lng - segmentStart.lng);

        setBusCoords({ lat: simulatedLat, lng: simulatedLng });

        // ETA to the next stop
        const etaMin = Math.ceil(eTime - nowMin);
        setEtaText(`Next stop in ${etaMin} min`);
      } else {
        setBusCoords(null);
        setEtaText("Arrived");
      }
    };

    // Run simulation immediately and then on a 1-second interval
    runSimulation();
    const interval = setInterval(runSimulation, 1000);

    return () => clearInterval(interval);
  }, [route]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!route) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-on-surface-variant">
        Route not found.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col relative">
      {/* Map Background */}
      <div className="fixed inset-0 z-0">
        <RouteMap stops={route.stops} busCoords={busCoords} busStatus={busStatus} />
      </div>

      {errorMsg && (
        <div className="fixed top-20 left-4 right-4 z-[60] max-w-lg mx-auto">
          <div className="bg-error/20 text-error p-3 rounded-xl border border-error/30 text-sm">
            {errorMsg}
          </div>
        </div>
      )}

      {/* Floating HUD Header */}
      <header className="fixed top-0 left-0 right-0 z-50 p-4">
        <div className="glass-card rounded-xl p-3 flex items-center justify-between max-w-lg mx-auto border border-glass-border">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/student/routes")}
              className="material-symbols-outlined text-primary cursor-pointer active:scale-95 transition-transform"
            >
              arrow_back
            </button>
            <div>
              <h1 className="text-sm font-bold text-on-surface">{route.code}</h1>
              <p className="text-[10px] text-on-surface-variant uppercase tracking-wide">
                {route.provider} Shuttle Route
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(busStatus === "live" || busStatus === "fallback") && (
              <div className="flex items-center gap-1.5 bg-success/20 text-success px-2 py-0.5 rounded-full border border-success/30">
                <span className="w-2 h-2 rounded-full bg-success pulse-dot"></span>
                <span className="text-[9px] font-bold uppercase">LIVE</span>
              </div>
            )}
            {busStatus === "offline" && (
              <div className="flex items-center gap-1.5 bg-muted/20 text-on-surface-variant px-2 py-0.5 rounded-full border border-glass-border">
                <span className="w-2 h-2 rounded-full bg-muted"></span>
                <span className="text-[9px] font-bold uppercase">OFFLINE</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Bottom Sheet HUD */}
      <div className="fixed bottom-20 left-0 right-0 z-40 max-w-lg mx-auto px-4">
        <div className="glass-card rounded-2xl p-4 space-y-4 border border-glass-border shadow-xl">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">
                Current Status
              </span>
              <h3 className="text-lg font-bold text-on-surface">
                {busStatus === "offline"
                  ? "Route Inactive"
                  : "Broadcasting Live GPS"}
              </h3>
              <p className="text-xs text-on-surface-variant">
                Driver: <span className="text-on-surface font-semibold">{route.driverName || "Unassigned"}</span>
                {route.driverPhone && ` (${route.driverPhone})`}
              </p>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">
                ETA
              </span>
              <p className="text-xl font-extrabold text-primary">{etaText}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-glass-border">
            <div className="text-center bg-white/5 p-2 rounded-xl border border-glass-border">
              <span className="text-[9px] text-on-surface-variant uppercase font-semibold">Speed</span>
              <p className="text-lg font-bold text-primary">
                {currentSpeed !== null ? `${Math.round(currentSpeed)} km/h` : "—"}
              </p>
            </div>
            <div className="text-center bg-white/5 p-2 rounded-xl border border-glass-border">
              <span className="text-[9px] text-on-surface-variant uppercase font-semibold">Stops</span>
              <p className="text-lg font-bold text-secondary">{route.stops.length}</p>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
