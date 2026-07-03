"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import BottomNav from "@/components/BottomNav";
import { authFetch } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";
import { realtime } from "@/lib/realtime";

const PointMap = dynamic(() => import("@/components/PointMap"), { ssr: false });

interface PointDetail {
  id: string;
  code: string;
  name: string;
  status: "active" | "inactive" | "delayed" | "signal_lost";
  eta: string;
  route: string;
  isFavorite: boolean;
  lat: number;
  lng: number;
}

export default function PointDetailPage() {
  const router = useRouter();
  const params = useParams();
  const pointId = params.id as string;

  const [point, setPoint] = useState<PointDetail | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [reportMessage, setReportMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useRequireAuth();

  useEffect(() => {
    authFetch<{ point: PointDetail }>(`/api/points/${pointId}`)
      .then((data) => {
        setPoint(data.point);
        setIsFavorite(data.point.isFavorite);
      })
      .catch((err) => setErrorMsg(err.message || "Failed to load point."))
      .finally(() => setIsLoading(false));
  }, [pointId]);

  useEffect(() => {
    const client = realtime;
    if (!client) return;

    const handleLocationUpdate = (data: { pointId: string; lat: number; lng: number; speed: number | null; status: string }) => {
      setPoint((prev) => {
        if (!prev || prev.id !== data.pointId) return prev;
        const hasActiveTrip = data.status === "active" || data.status === "delayed";
        const eta = hasActiveTrip ? "En route" : (data.status === "delayed" ? "12 mins" : "No active routes");
        return {
          ...prev,
          lat: data.lat,
          lng: data.lng,
          status: data.status as PointDetail["status"],
          eta,
        };
      });
    };

    const handleStatusUpdate = (data: { pointId: string; status: string }) => {
      setPoint((prev) => {
        if (!prev || prev.id !== data.pointId) return prev;
        const hasActiveTrip = data.status === "active" || data.status === "delayed";
        let eta = "No active routes";
        if (hasActiveTrip) {
          eta = "En route";
        } else if (data.status === "signal_lost") {
          eta = "Signal lost";
        }
        return {
          ...prev,
          status: data.status as PointDetail["status"],
          eta,
        };
      });
    };

    const channel = client
      .channel(`point:${pointId}`)
      .on("broadcast", { event: "point:location" }, ({ payload }) =>
        handleLocationUpdate(payload as { pointId: string; lat: number; lng: number; speed: number | null; status: string }),
      )
      .on("broadcast", { event: "point:status" }, ({ payload }) =>
        handleStatusUpdate(payload as { pointId: string; status: string }),
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [pointId]);

  const toggleFavorite = async () => {
    try {
      const result = await authFetch<{ isFavorite: boolean }>(`/api/points/${pointId}/favorite`, {
        method: "POST",
      });
      setIsFavorite(result.isFavorite);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to update favorite.");
    }
  };

  const submitReport = async () => {
    if (reportMessage.trim().length < 5) {
      setErrorMsg("Report message must be at least 5 characters.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      await authFetch("/api/reports", {
        method: "POST",
        body: JSON.stringify({ pointId, message: reportMessage }),
      });
      setReportMessage("");
      setSuccessMsg("Report submitted successfully.");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to submit report.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!point) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-on-surface-variant">
        Point not found.
      </div>
    );
  }

  const isActive = point.status === "active" || point.status === "delayed";

  return (
    <div className="min-h-screen bg-background text-on-surface pb-28">
      <header className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-lg border-b border-glass-border shadow-sm flex items-center justify-between px-4 h-16">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="active:scale-95 transition-transform hover:bg-glass-surface p-2 rounded-full cursor-pointer">
            <span className="material-symbols-outlined text-primary">arrow_back</span>
          </button>
          <h1 className="text-lg font-semibold text-on-surface">{point.name}</h1>
        </div>
        <button onClick={toggleFavorite} className="p-2 cursor-pointer">
          <span
            className="material-symbols-outlined text-primary"
            style={{ fontVariationSettings: isFavorite ? "'FILL' 1" : "'FILL' 0" }}
          >
            favorite
          </span>
        </button>
      </header>

      <main className="pt-20 pb-24 px-4 max-w-lg mx-auto space-y-6">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-error/10 border border-error/20 text-error text-sm">{errorMsg}</div>
        )}
        {successMsg && (
          <div className="p-3 rounded-xl bg-success/10 border border-success/20 text-success text-sm">{successMsg}</div>
        )}

        <section className="relative h-64 rounded-xl overflow-hidden glass-card">
          <div className="absolute inset-0">
            <PointMap lat={point.lat} lng={point.lng} code={point.code} status={point.status} />
          </div>
          <div className="absolute top-4 left-4 z-10">
            <div className="bg-surface/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-glass-border flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isActive ? "bg-success pulse-dot" : "bg-warning"}`}></span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-on-surface">
                {point.status.replace("_", " ")}
              </span>
            </div>
          </div>
          <div className="absolute bottom-4 right-4 left-4 z-10 glass-card p-4 rounded-xl">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-xs text-on-surface-variant">{point.code}</p>
                <h3 className="text-lg font-semibold text-on-surface">{point.name}</h3>
              </div>
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                directions_bus
              </span>
            </div>
            <div className={`flex items-center gap-2 px-2 py-1 rounded-lg w-fit ${isActive ? "bg-success/20 text-success" : "bg-warning/20 text-warning"}`}>
              <span className="material-symbols-outlined text-[16px]">schedule</span>
              <span className="text-[10px] font-semibold">Next bus in {point.eta}</span>
            </div>
          </div>
        </section>

        <div className={`${isActive ? "bg-success/10 border-success/20 text-success" : "bg-warning/10 border-warning/20 text-warning"} border rounded-xl p-4 flex items-center gap-3`}>
          <span className={`w-3 h-3 rounded-full ${isActive ? "bg-success pulse-dot" : "bg-warning"}`}></span>
          <span className="text-sm font-medium">
            {isActive ? "Shuttle is ACTIVE — Driver is en route" : `Shuttle status: ${point.status.replace("_", " ")}`}
          </span>
        </div>

        <div className="glass-card p-6 rounded-xl">
          <p className="text-xs text-on-surface-variant uppercase tracking-widest mb-1">Arrival Status</p>
          <div className="text-5xl text-primary font-bold">
            {point.eta.replace(/[^\d]/g, "") || "—"}
            <span className="text-2xl font-medium ml-1">{point.eta.includes("min") ? "min" : ""}</span>
          </div>
          <div className="pt-4 border-t border-glass-border mt-4">
            <div className="flex items-center justify-between text-on-surface-variant">
              <span className="text-xs">Route</span>
              <span className="text-xs font-semibold text-on-surface">{point.route}</span>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-error/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-error">flag</span>
            </div>
            <h2 className="text-lg font-semibold">Report an Issue</h2>
          </div>
          <textarea
            className="w-full bg-surface-container-low border border-glass-border rounded-xl p-4 text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all outline-none resize-none"
            rows={3}
            placeholder="Describe the issue..."
            value={reportMessage}
            onChange={(e) => setReportMessage(e.target.value)}
          />
          <button
            onClick={submitReport}
            disabled={isSubmitting}
            className="cta-gradient w-full mt-4 py-3 rounded-xl text-sm font-semibold text-white active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60"
          >
            {isSubmitting ? "Submitting..." : "Submit Report"}
          </button>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
