"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Capacitor, registerPlugin } from "@capacitor/core";
import type { BackgroundGeolocationPlugin } from "@capacitor-community/background-geolocation";
import { authFetch } from "@/lib/api";
import { useRequireRole } from "@/lib/auth";

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>("BackgroundGeolocation");

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
  pointId: string;
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
  const [successMsg, setSuccessMsg] = useState("");
  const [isSosSubmitting, setIsSosSubmitting] = useState(false);
  const [passengers, setPassengers] = useState(24);
  const browserWatchIdRef = useRef<number | null>(null);
  const nativeWatchIdRef = useRef<string | null>(null);
  const lastPingTimeRef = useRef<number>(0);

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

  const sendPing = useCallback(async (activeTripId: string, lat: number, lng: number, speed: number | null) => {
    try {
      const result = await authFetch<{ trip: TripData }>(`/api/trips/${activeTripId}/ping`, {
        method: "POST",
        body: JSON.stringify({ lat, lng, speed }),
      });
      setTrip(result.trip);
    } catch {
      // Keep UI responsive even if a ping fails.
    }
  }, []);

  const stopLocationWatcher = useCallback(async () => {
    if (browserWatchIdRef.current !== null) {
      navigator.geolocation.clearWatch(browserWatchIdRef.current);
      browserWatchIdRef.current = null;
    }

    if (nativeWatchIdRef.current !== null) {
      const id = nativeWatchIdRef.current;
      nativeWatchIdRef.current = null;
      await BackgroundGeolocation.removeWatcher({ id });
    }
  }, []);

  useEffect(() => {
    void stopLocationWatcher();

    if (!trip?.isLive) return;

    let isCancelled = false;

    if (Capacitor.isNativePlatform()) {
      void BackgroundGeolocation.addWatcher(
        {
          backgroundTitle: "getPoint - Sharing your live location",
          backgroundMessage: "Your trip stays visible while getPoint Driver is minimized.",
          requestPermissions: true,
          stale: false,
          distanceFilter: 10,
        },
        (location, error) => {
          if (error) {
            console.error("BackgroundGeolocation error:", error);
            setErrorMsg(
              error.code === "NOT_AUTHORIZED"
                ? "Always-on location access is required to broadcast this trip in the background."
                : "Location access is required to broadcast this trip.",
            );
            return;
          }

          if (!location) return;

          const speedVal =
            typeof location.speed === "number" && location.speed >= 0 ? location.speed * 3.6 : null;
          void sendPing(trip.id, location.latitude, location.longitude, speedVal);
        },
      )
        .then((id) => {
          if (isCancelled) {
            void BackgroundGeolocation.removeWatcher({ id });
            return;
          }

          nativeWatchIdRef.current = id;
        })
        .catch((error: unknown) => {
          console.error("BackgroundGeolocation addWatcher error:", error);
          setErrorMsg("Location access is required to broadcast this trip.");
        });

      return () => {
        isCancelled = true;
        void stopLocationWatcher();
      };
    }

    if (!navigator.geolocation) {
      setErrorMsg("Geolocation is not supported by this browser.");
      return;
    }

    browserWatchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const now = Date.now();
        if (now - lastPingTimeRef.current >= 3000) {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          let speedVal: number | null = null;
          if (typeof position.coords.speed === "number" && position.coords.speed >= 0) {
            speedVal = position.coords.speed * 3.6;
          }

          lastPingTimeRef.current = now;
          void sendPing(trip.id, lat, lng, speedVal);
        }
      },
      (error) => {
        console.error("watchPosition error:", error);
        setErrorMsg("Location access is required to broadcast this trip.");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      }
    );

    return () => {
      void stopLocationWatcher();
    };
  }, [trip?.id, trip?.isLive, sendPing, stopLocationWatcher]);

  const handleToggleTrip = async () => {
    setIsSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      if (trip?.isLive) {
        await stopLocationWatcher();
        const result = await authFetch<{ trip: TripData }>(`/api/trips/${trip.id}/end`, {
          method: "POST",
        });
        setTrip(result.trip);
      } else {
        if (!Capacitor.isNativePlatform() && !navigator.geolocation) {
          throw new Error("Geolocation is not supported by this browser.");
        }

        const hasPermission = Capacitor.isNativePlatform()
          ? true
          : await new Promise<boolean>((resolve) => {
              navigator.geolocation.getCurrentPosition(
                () => resolve(true),
                () => resolve(false),
                { enableHighAccuracy: true }
              );
            });

        if (!hasPermission) {
          setErrorMsg("Location access is required to broadcast this trip.");
          setIsSubmitting(false);
          return;
        }

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

  const handleSOS = async () => {
    if (!trip || !trip.isLive) {
      setErrorMsg("SOS can only be triggered during an active live trip.");
      return;
    }

    setIsSosSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      await authFetch("/api/reports", {
        method: "POST",
        body: JSON.stringify({
          pointId: trip.pointId,
          message: `SOS triggered by driver on trip ${trip.id}`,
        }),
      });
      setSuccessMsg("SOS report sent to admin successfully!");
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to trigger SOS.";
      setErrorMsg(message);
    } finally {
      setIsSosSubmitting(false);
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

      {successMsg && (
        <div className="fixed top-20 left-4 right-4 z-[60] max-w-lg mx-auto">
          <div className="bg-success/20 text-success p-3 rounded-xl border border-success/30 text-sm font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">check_circle</span>
            {successMsg}
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
          <div className="glass-card rounded-xl p-3 text-center flex flex-col justify-between">
            <div className="flex items-center justify-center gap-1">
              <span className="material-symbols-outlined text-secondary text-sm">group</span>
            </div>
            <p className="text-2xl font-bold text-secondary">{passengers}</p>
            <div className="flex justify-center gap-2 mt-1">
              <button 
                onClick={() => setPassengers(p => Math.max(0, p - 1))}
                className="w-5 h-5 bg-white/10 rounded flex items-center justify-center text-xs hover:bg-white/20 select-none cursor-pointer"
              >
                -
              </button>
              <button 
                onClick={() => setPassengers(p => p + 1)}
                className="w-5 h-5 bg-white/10 rounded flex items-center justify-center text-xs hover:bg-white/20 select-none cursor-pointer"
              >
                +
              </button>
            </div>
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
          <button
            onClick={handleSOS}
            disabled={isSosSubmitting || !isLive}
            className="glass-card py-3 px-4 rounded-xl text-sm font-semibold text-on-surface-variant flex items-center justify-center gap-2 hover:bg-white/5 transition-all cursor-pointer border border-glass-border disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-sm">
              {isSosSubmitting ? "hourglass_empty" : "report_problem"}
            </span>
            {isSosSubmitting ? "Sending..." : "SOS"}
          </button>
        </div>
      </div>
    </div>
  );
}
