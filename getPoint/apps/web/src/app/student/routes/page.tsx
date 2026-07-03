"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { authFetch } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";

interface RouteItem {
  id: string;
  code: string;
  provider: string;
  driverName: string | null;
  driverPhone: string | null;
  startTime: string;
  endTime: string;
  isLive: boolean;
}

export default function RoutesPage() {
  const router = useRouter();
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [providerFilter, setProviderFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useRequireAuth();

  useEffect(() => {
    authFetch<{ routes: RouteItem[] }>("/api/routes")
      .then((data) => setRoutes(data.routes))
      .catch((err) => setErrorMsg(err.message || "Failed to load routes."))
      .finally(() => setIsLoading(false));
  }, []);

  // Time conversion helpers
  const getCurrentPktTime = (): string => {
    const d = new Date();
    let hours = d.getUTCHours() + 5; // PKT is UTC+5
    const minutes = d.getUTCMinutes();
    if (hours >= 24) hours -= 24;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  };

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

  const getRouteStatus = (route: RouteItem) => {
    if (route.isLive) return "live";

    const currentPkt = getCurrentPktTime();
    const nowMin = timeToMinutes(currentPkt);
    const startMin = timeToMinutes(route.startTime);
    const endMin = timeToMinutes(route.endTime);

    if (nowMin >= startMin && nowMin <= endMin) {
      return "scheduled";
    }
    return "offline";
  };

  const filteredRoutes = routes.filter((r) => {
    const matchesProvider = providerFilter === "all" || r.provider.toLowerCase() === providerFilter.toLowerCase();
    const matchesSearch =
      r.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.driverName?.toLowerCase() || "").includes(searchQuery.toLowerCase());
    return matchesProvider && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background text-on-surface pb-28">
      <header className="fixed top-0 left-0 w-full backdrop-blur-md bg-glass-surface border-b border-glass-border shadow-sm z-50 flex items-center justify-between px-6 h-16">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/student/dashboard")}
            className="material-symbols-outlined text-primary p-2 active:scale-95 transition-transform cursor-pointer"
          >
            arrow_back
          </button>
          <h1 className="text-lg font-bold text-on-surface">Shuttle Routes</h1>
        </div>
      </header>

      <main className="pt-20 px-4 max-w-lg mx-auto space-y-6">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-error/10 border border-error/20 text-error text-sm">
            {errorMsg}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
              search
            </span>
            <input
              className="w-full bg-[#171f33] border-none rounded-xl py-3 pl-12 pr-4 text-on-surface placeholder:text-on-surface-variant focus:ring-2 focus:ring-primary transition-all outline-none"
              placeholder="Search by route code or driver..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            {["all", "jadoon", "nadeem"].map((p) => (
              <button
                key={p}
                onClick={() => setProviderFilter(p)}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  providerFilter === p
                    ? "cta-gradient text-white"
                    : "glass-card text-on-surface-variant border border-glass-border hover:bg-white/5"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRoutes.map((route) => {
              const status = getRouteStatus(route);
              return (
                <div
                  key={route.id}
                  onClick={() => router.push(`/student/routes/${route.id}`)}
                  className="glass-card p-4 rounded-xl flex items-center justify-between hover:bg-white/5 transition-all cursor-pointer border border-glass-border"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-md font-bold text-primary">{route.code}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-on-surface-variant uppercase font-semibold">
                        {route.provider}
                      </span>
                    </div>
                    <p className="text-xs text-on-surface-variant">
                      Driver: <span className="text-on-surface font-medium">{route.driverName || "Unassigned"}</span>
                    </p>
                    <p className="text-[10px] text-on-surface-variant">
                      Schedule: {route.startTime} — {route.endTime}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {status === "live" && (
                      <div className="bg-success/20 text-success px-2 py-1 rounded-lg flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-success pulse-dot"></span>
                        <span className="text-[9px] font-bold uppercase">LIVE</span>
                      </div>
                    )}
                    {status === "scheduled" && (
                      <div className="bg-warning/20 text-warning px-2 py-1 rounded-lg flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-warning pulse-dot"></span>
                        <span className="text-[9px] font-bold uppercase">FALLBACK</span>
                      </div>
                    )}
                    {status === "offline" && (
                      <div className="bg-muted/20 text-on-surface-variant px-2 py-1 rounded-lg flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-muted"></span>
                        <span className="text-[9px] font-bold uppercase">OFFLINE</span>
                      </div>
                    )}
                    <span className="material-symbols-outlined text-on-surface-variant text-sm">
                      chevron_right
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredRoutes.length === 0 && (
              <p className="text-center text-sm text-on-surface-variant py-8">
                No routes found.
              </p>
            )}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
