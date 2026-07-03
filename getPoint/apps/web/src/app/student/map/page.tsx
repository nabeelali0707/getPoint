"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import BottomNav from "@/components/BottomNav";
import { authFetch } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";
import { realtime } from "@/lib/realtime";

const LiveMap = dynamic(() => import("@/components/LiveMap"), { ssr: false });

const statusConfig = {
  active: { color: "bg-success", text: "text-success", label: "Active", pulse: true },
  delayed: { color: "bg-warning", text: "text-warning", label: "Delayed", pulse: true },
  inactive: { color: "bg-muted", text: "text-muted", label: "Inactive", pulse: false },
  signal_lost: { color: "bg-error", text: "text-error", label: "Signal Lost", pulse: false },
};

interface MapPoint {
  id: string;
  code: string;
  name: string;
  status: keyof typeof statusConfig;
  lat: number;
  lng: number;
}

export default function LiveMapPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useRequireAuth();

  useEffect(() => {
    authFetch<{ points: MapPoint[] }>("/api/points")
      .then((data) => {
        setPoints(data.points);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));

    const handleLocationUpdate = (data: { pointId: string; lat: number; lng: number; speed: number | null; status: keyof typeof statusConfig }) => {
      setPoints((prevPoints) =>
        prevPoints.map((p) =>
          p.id === data.pointId
            ? { ...p, lat: data.lat, lng: data.lng, status: data.status }
            : p
        )
      );
    };

    const handleStatusUpdate = (data: { pointId: string; status: keyof typeof statusConfig }) => {
      setPoints((prevPoints) =>
        prevPoints.map((p) =>
          p.id === data.pointId
            ? { ...p, status: data.status }
            : p
        )
      );
    };

    const client = realtime;
    if (!client) return;

    const channel = client
      .channel("points:all")
      .on("broadcast", { event: "point:location" }, ({ payload }) =>
        handleLocationUpdate(payload as { pointId: string; lat: number; lng: number; speed: number | null; status: keyof typeof statusConfig }),
      )
      .on("broadcast", { event: "point:status" }, ({ payload }) =>
        handleStatusUpdate(payload as { pointId: string; status: keyof typeof statusConfig }),
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, []);

  const filters = ["all", "active", "inactive", "delayed", "signal_lost"];

  const filteredPoints = points.filter((p) => {
    const matchesFilter = filter === "all" || p.status === filter;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col relative">
      <div className="fixed inset-0 z-0">
        {!isLoading && (
          <LiveMap
            points={filteredPoints}
            onMarkerClick={(id) => router.push(`/student/points/${id}`)}
          />
        )}
      </div>

      <div className="fixed top-0 left-0 right-0 z-40 p-4 space-y-3">
        <div className="glass-card rounded-xl p-3 flex items-center gap-3 max-w-lg mx-auto">
          <span className="material-symbols-outlined text-on-surface-variant">search</span>
          <input
            className="flex-1 bg-transparent text-on-surface placeholder:text-on-surface-variant text-sm outline-none"
            placeholder="Search points..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto hide-scrollbar max-w-lg mx-auto">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                filter === f
                  ? "cta-gradient text-white"
                  : "glass-card text-on-surface-variant border border-glass-border hover:bg-white/5"
              }`}
            >
              {f === "signal_lost" ? "Signal Lost" : f}
            </button>
          ))}
        </div>
      </div>

      <div className="fixed bottom-20 left-0 right-0 z-40 max-w-lg mx-auto px-4">
        <div className="glass-card rounded-t-2xl p-4 max-h-[40vh] overflow-y-auto space-y-2">
          <div className="w-10 h-1 bg-on-surface-variant/30 rounded-full mx-auto mb-3"></div>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            </div>
          ) : (
            filteredPoints.map((point) => {
              const cfg = statusConfig[point.status];
              return (
                <div
                  key={point.id}
                  onClick={() => router.push(`/student/points/${point.id}`)}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <div className={`w-3 h-3 rounded-full ${cfg.color} ${cfg.pulse ? "pulse-dot" : ""}`}></div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-on-surface">{point.name}</p>
                    <p className="text-xs text-on-surface-variant">{point.code}</p>
                  </div>
                  <span className={`text-[10px] font-bold uppercase ${cfg.text}`}>{cfg.label}</span>
                  <span className="material-symbols-outlined text-on-surface-variant text-sm">chevron_right</span>
                </div>
              );
            })
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
