"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { authFetch } from "@/lib/api";
import { displayNameFromEmail, getStoredUser, useRequireAuth } from "@/lib/auth";

interface Point {
  id: string;
  code: string;
  name: string;
  eta: string;
  route: string;
  status: "active" | "inactive" | "delayed" | "signal_lost";
  isFavorite: boolean;
  icon: string;
}

export default function StudentDashboard() {
  const router = useRouter();
  const [userName, setUserName] = useState("Student");
  const [searchQuery, setSearchQuery] = useState("");
  const [points, setPoints] = useState<Point[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useRequireAuth();

  useEffect(() => {
    const user = getStoredUser();
    if (user?.email) {
      setUserName(displayNameFromEmail(user.email));
    }

    authFetch<{ points: Point[] }>("/api/points")
      .then((data) => setPoints(data.points))
      .catch((err) => setErrorMsg(err.message || "Failed to load points."))
      .finally(() => setIsLoading(false));
  }, []);

  const toggleFavorite = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const result = await authFetch<{ isFavorite: boolean }>(`/api/points/${id}/favorite`, {
        method: "POST",
      });
      setPoints((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isFavorite: result.isFavorite } : p)),
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update favorite.";
      setErrorMsg(message);
    }
  };

  const filteredPoints = points.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const favoritePoints = points.filter((p) => p.isFavorite);

  return (
    <div className="min-h-screen bg-background text-on-surface pb-28">
      <header className="fixed top-0 left-0 w-full backdrop-blur-md bg-glass-surface border-b border-glass-border shadow-sm z-50 flex items-center justify-between px-6 h-16">
        <div className="flex items-center gap-4">
          <button className="material-symbols-outlined text-primary p-2 active:scale-95 transition-transform">
            menu
          </button>
          <h1 className="text-xl font-bold text-primary bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            GetPoint
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/notifications")}
            className="relative p-2 text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <div
            onClick={() => router.push("/profile")}
            className="w-10 h-10 rounded-full border-2 border-primary/20 overflow-hidden cursor-pointer active:scale-95 transition-transform"
          >
            <div className="w-full h-full bg-primary-container/30 flex items-center justify-center font-bold text-primary">
              {userName.charAt(0)}
            </div>
          </div>
        </div>
      </header>

      <main className="pt-20 px-4 max-w-lg mx-auto">
        <section className="mt-4 mb-8">
          <h2 className="text-2xl font-bold text-on-surface">Hello, {userName}</h2>
          <p className="text-sm text-on-surface-variant">Your transit is on track today.</p>
        </section>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-error/10 border border-error/20 text-error text-sm">
            {errorMsg}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {favoritePoints.length > 0 && (
              <section className="mb-8">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-on-surface">Favorite Points</h3>
                </div>
                <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2">
                  {favoritePoints.map((point) => (
                    <div
                      key={point.id}
                      onClick={() => router.push(`/student/points/${point.id}`)}
                      className="glass-card flex-shrink-0 w-64 p-4 rounded-xl flex flex-col gap-3 cursor-pointer"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-primary tracking-widest uppercase">
                            {point.code}
                          </span>
                          <h4 className="text-md font-bold text-on-surface truncate max-w-[150px]">
                            {point.name}
                          </h4>
                        </div>
                        <div
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${
                            point.status === "active"
                              ? "bg-success/20 text-success"
                              : "bg-warning/20 text-warning"
                          }`}
                        >
                          <div
                            className={`w-2 h-2 rounded-full pulse-indicator ${
                              point.status === "active" ? "bg-success" : "bg-warning"
                            }`}
                          ></div>
                          <span className="text-[10px] font-bold uppercase">
                            {point.status === "active" ? "LIVE" : point.status}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="material-symbols-outlined text-primary">directions_bus</span>
                        <span className="text-2xl font-semibold text-on-surface">{point.eta}</span>
                        <span className="text-xs text-on-surface-variant ml-auto">{point.route}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="mb-8">
              <h3 className="text-lg font-semibold text-on-surface mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => router.push("/student/map")}
                  className="glass-card p-4 rounded-xl flex flex-col items-center justify-center gap-2 group bloom-button cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-all">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                      my_location
                    </span>
                  </div>
                  <span className="text-xs font-semibold">Track Bus</span>
                </button>

                <button
                  onClick={() => router.push("/student/reports")}
                  className="glass-card p-4 rounded-xl flex flex-col items-center justify-center gap-2 group bloom-button cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center text-secondary group-hover:bg-secondary group-hover:text-on-secondary transition-all">
                    <span className="material-symbols-outlined">article</span>
                  </div>
                  <span className="text-xs font-semibold">Reports</span>
                </button>

                <button
                  onClick={() => router.push("/notifications")}
                  className="glass-card p-4 rounded-xl flex flex-col items-center justify-center gap-2 group bloom-button cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-full bg-tertiary/10 flex items-center justify-center text-tertiary group-hover:bg-tertiary group-hover:text-on-tertiary transition-all">
                    <span className="material-symbols-outlined">notifications_active</span>
                  </div>
                  <span className="text-xs font-semibold">Alerts</span>
                </button>

                <button
                  onClick={() => router.push("/profile")}
                  className="glass-card p-4 rounded-xl flex flex-col items-center justify-center gap-2 group bloom-button cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-full bg-surface-variant flex items-center justify-center text-on-surface-variant group-hover:bg-on-surface-variant group-hover:text-surface transition-all">
                    <span className="material-symbols-outlined">account_circle</span>
                  </div>
                  <span className="text-xs font-semibold">Profile</span>
                </button>
              </div>
            </section>

            <section className="mb-12">
              <h3 className="text-lg font-semibold text-on-surface mb-4">All Points</h3>
              <div className="relative mb-6">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
                  search
                </span>
                <input
                  className="w-full bg-[#171f33] border-none rounded-xl py-3 pl-12 pr-4 text-on-surface placeholder:text-on-surface-variant focus:ring-2 focus:ring-primary transition-all outline-none"
                  placeholder="Search transit points..."
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-3">
                {filteredPoints.map((point) => (
                  <div
                    key={point.id}
                    onClick={() => router.push(`/student/points/${point.id}`)}
                    className="glass-card p-4 rounded-xl flex items-center gap-4 cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-lg bg-primary-container/20 flex items-center justify-center text-primary-container">
                      <span className="material-symbols-outlined">{point.icon}</span>
                    </div>
                    <div className="flex flex-col flex-1">
                      <h5 className="text-sm font-semibold text-on-surface">{point.name}</h5>
                      <span className="text-xs text-on-surface-variant">
                        {point.status === "active" ? `Next bus in ${point.eta}` : point.eta}
                      </span>
                    </div>
                    <button
                      onClick={(e) => toggleFavorite(point.id, e)}
                      className={`material-symbols-outlined hover:text-primary transition-colors cursor-pointer ${
                        point.isFavorite ? "text-primary" : "text-on-surface-variant"
                      }`}
                      style={{ fontVariationSettings: point.isFavorite ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      favorite
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
