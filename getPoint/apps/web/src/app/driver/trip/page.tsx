"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/api";
import { useRequireRole } from "@/lib/auth";

interface TripData {
  id: string;
  status: string;
  isLive: boolean;
  routeName: string;
  routeDescription: string;
  pointName: string;
  pointCode: string;
  speed: number | null;
  lat: number | null;
  lng: number | null;
  startTime: string;
}

interface CurrentTripResponse {
  trip: TripData | null;
  assignedPoint: { id: string; name: string; code: string } | null;
}

export default function ActiveTripPage() {
  const router = useRouter();
  const [trip, setTrip] = useState<TripData | null>(null);
  const [assignedPoint, setAssignedPoint] = useState<CurrentTripResponse["assignedPoint"]>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [passengers, setPassengers] = useState(24);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useRequireRole("driver");

  const loadTrip = useCallback(async () => {
    try {
      const data = await authFetch<CurrentTripResponse>("/api/trips/current");
      setTrip(data.trip);
      setAssignedPoint(data.assignedPoint);
      setErrorMsg("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load trip.";
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrip();
  }, [loadTrip]);

  const sendPing = useCallback(async (activeTrip: TripData) => {
    const baseLat = activeTrip.lat ?? 24.86;
    const baseLng = activeTrip.lng ?? 67.08;
    const speed = Math.floor(Math.random() * 20 + 25);

    try {
      const result = await authFetch<{ trip: TripData }>(`/api/trips/${activeTrip.id}/ping`, {
        method: "POST",
        body: JSON.stringify({
          lat: baseLat + (Math.random() - 0.5) * 0.002,
          lng: baseLng + (Math.random() - 0.5) * 0.002,
          speed,
        }),
      });
      setTrip(result.trip);
    } catch {
      // Keep UI responsive even if a ping fails.
    }
  }, []);

  useEffect(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }

    if (!trip?.isLive) return;

    pingIntervalRef.current = setInterval(() => {
      void sendPing(trip);
      setPassengers((prev) => Math.max(0, prev + Math.floor(Math.random() * 3 - 1)));
    }, 3000);

    return () => {
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    };
  }, [trip?.id, trip?.isLive, sendPing]);

  const handleToggleTrip = async () => {
    setIsSubmitting(true);
    setErrorMsg("");

    try {
      if (trip?.isLive) {
        const result = await authFetch<{ trip: TripData }>(`/api/trips/${trip.id}/end`, {
          method: "POST",
        });
        setTrip(result.trip);
      } else {
        const result = await authFetch<{ trip: TripData }>("/api/trips/start", {
          method: "POST",
          body: JSON.stringify(
            assignedPoint?.id ? { pointId: assignedPoint.id } : {},
          ),
        });
        setTrip(result.trip);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update trip.";
      setErrorMsg(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLive = trip?.isLive ?? false;
  const speed = trip?.speed ?? 0;
  const routeName = trip?.routeName ?? (assignedPoint ? `Route ${assignedPoint.code.replace(/\s+/g, "")} — Express` : "No route assigned");
  const routeDescription = trip?.routeDescription ?? assignedPoint?.name ?? "Assign a transit point to begin";
  const nextStop = trip?.pointName ?? assignedPoint?.name ?? "No stop assigned";
  const totalStops = 8;
  const completedStops = isLive ? 5 : 0;
  const eta = isLive ? "En route" : "—";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col relative">
      <div className="fixed inset-0 bg-gradient-to-br from-[#060e20] to-[#131b2e] z-0">
        <div className="w-full h-full flex items-center justify-center">
          <span className="material-symbols-outlined text-primary/10 text-[200px]">map</span>
        </div>
      </div>

      {errorMsg && (
        <div className="fixed top-20 left-4 right-4 z-[60] max-w-lg mx-auto">
          <div className="bg-error/20 text-error p-3 rounded-xl border border-error/30 text-sm">
            {errorMsg}
          </div>
        </div>
      )}

      <header className="fixed top-0 left-0 right-0 z-50 p-4">
        <div className="glass-card rounded-xl p-3 flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="material-symbols-outlined text-primary cursor-pointer active:scale-95">
              arrow_back
            </button>
            <div>
              <h1 className="text-sm font-semibold text-on-surface">{routeName}</h1>
              <p className="text-xs text-on-surface-variant">{routeDescription}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isLive ? "bg-success pulse-dot" : "bg-error"}`}></span>
            <span className={`text-[10px] font-bold uppercase ${isLive ? "text-success" : "text-error"}`}>
              {isLive ? "BROADCASTING" : "OFFLINE"}
            </span>
          </div>
        </div>
      </header>

      <div className="fixed bottom-0 left-0 right-0 z-40 max-w-lg mx-auto px-4 pb-4 space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="glass-card rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1">
              <span className="material-symbols-outlined text-primary text-sm">speed</span>
            </div>
            <p className="text-2xl font-bold text-primary">{Math.round(speed)}</p>
            <p className="text-[10px] text-on-surface-variant">km/h</p>
          </div>
          <div className="glass-card rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1">
              <span className="material-symbols-outlined text-secondary text-sm">group</span>
            </div>
            <p className="text-2xl font-bold text-secondary">{passengers}</p>
            <p className="text-[10px] text-on-surface-variant">Passengers</p>
          </div>
          <div className="glass-card rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1">
              <span className="material-symbols-outlined text-tertiary text-sm">pin_drop</span>
            </div>
            <p className="text-2xl font-bold text-tertiary">{completedStops}/{totalStops}</p>
            <p className="text-[10px] text-on-surface-variant">Stops</p>
          </div>
        </div>

        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-on-surface-variant uppercase tracking-wider">Next Stop</p>
              <h2 className="text-lg font-bold text-on-surface">{nextStop}</h2>
            </div>
            <div className="text-right">
              <p className="text-xs text-on-surface-variant">ETA</p>
              <p className="text-2xl font-bold text-primary">{eta}</p>
            </div>
          </div>
          <div className="mt-3 w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-1000"
              style={{ width: `${(completedStops / totalStops) * 100}%` }}
            ></div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleToggleTrip}
            disabled={isSubmitting || (!isLive && !assignedPoint)}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 ${
              isLive
                ? "bg-error/20 text-error border border-error/30 hover:bg-error/30"
                : "cta-gradient text-white"
            }`}
          >
            <span className="material-symbols-outlined text-sm">
              {isSubmitting ? "hourglass_empty" : isLive ? "stop_circle" : "play_circle"}
            </span>
            {isSubmitting ? "Updating..." : isLive ? "End Trip" : "Start Trip"}
          </button>
          <button className="glass-card py-3 px-4 rounded-xl text-sm font-semibold text-on-surface-variant flex items-center justify-center gap-2 hover:bg-white/5 transition-all cursor-pointer border border-glass-border">
            <span className="material-symbols-outlined text-sm">report_problem</span>
            SOS
          </button>
        </div>
      </div>
    </div>
  );
}
