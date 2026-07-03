"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { apiFetch, authFetch } from "@/lib/api";
import { formatRelativeTime, useRequireRole } from "@/lib/auth";

const AdminRouteMap = dynamic(() => import("@/components/AdminRouteMap"), { ssr: false });

interface PendingDriver {
  id: string;
  name: string;
  license: string;
  email: string;
  avatarInitials: string;
}

interface AdminReport {
  id: string;
  pointCode: string;
  message: string;
  createdAt: string;
  studentEmail?: string;
}

interface AdminStats {
  pointCount: number;
  activeDrivers: number;
  openReports: number;
  pendingApprovals: number;
}

interface Stop {
  id: string;
  name: string;
  sequence: number;
  scheduledTime: string;
  lat: number;
  lng: number;
}

interface RouteItem {
  id: string;
  code: string;
  provider: string;
  driverName: string | null;
  driverPhone: string | null;
  startTime: string;
  endTime: string;
  isLive: boolean;
  stops: Stop[];
}

export default function AdminDashboard() {
  const router = useRouter();
  
  // Tab control
  const [activeTab, setActiveTab] = useState<"dashboard" | "routes">("dashboard");

  // Dashboard states
  const [drivers, setDrivers] = useState<PendingDriver[]>([]);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    pointCount: 0,
    activeDrivers: 0,
    openReports: 0,
    pendingApprovals: 0,
  });

  // Routes Management states
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteItem | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Route Simulation states
  const [directionFilter, setDirectionFilter] = useState<"FORWARD" | "RETURN">("FORWARD");
  const [testTimeMinutes, setTestTimeMinutes] = useState<number>(405); // 06:45 AM default
  const [isPlayActive, setIsPlayActive] = useState(false);
  const playTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Stop Edit states
  const [isEditingStops, setIsEditingStops] = useState(false);
  const [editedStops, setEditedStops] = useState<Stop[]>([]);

  // Alert message states
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useRequireRole("admin");

  const loadDashboard = async () => {
    try {
      const [driversRes, reportsRes, statsRes] = await Promise.all([
        authFetch<{ drivers: PendingDriver[] }>("/api/admin/drivers/pending"),
        authFetch<{ reports: AdminReport[] }>("/api/reports/admin"),
        authFetch<{ stats: AdminStats }>("/api/admin/stats"),
      ]);
      setDrivers(driversRes.drivers);
      setReports(reportsRes.reports);
      setStats(statsRes.stats);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRoutes = async () => {
    try {
      const res = await authFetch<{ routes: RouteItem[] }>("/api/routes");
      setRoutes(res.routes);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadDashboard();
    loadRoutes();
  }, []);

  // Play simulation loop
  useEffect(() => {
    if (isPlayActive) {
      const activeStops = getFilteredStops();
      if (activeStops.length > 1) {
        const startMin = timeToMinutes(activeStops[0].scheduledTime);
        const endMin = timeToMinutes(activeStops[activeStops.length - 1].scheduledTime);

        // Reset to start if currently at or outside bounds
        if (testTimeMinutes >= endMin || testTimeMinutes < startMin) {
          setTestTimeMinutes(startMin);
        }

        playTimerRef.current = setInterval(() => {
          setTestTimeMinutes((prev) => {
            if (prev >= endMin) {
              setIsPlayActive(false);
              return prev;
            }
            return prev + 1; // Increment by 1 simulated minute per tick
          });
        }, 100); // Fast forward loop
      }
    } else {
      if (playTimerRef.current) {
        clearInterval(playTimerRef.current);
        playTimerRef.current = null;
      }
    }

    return () => {
      if (playTimerRef.current) {
        clearInterval(playTimerRef.current);
      }
    };
  }, [isPlayActive, selectedRoute, directionFilter]);

  // Sync test time limits when route or direction changes
  useEffect(() => {
    const activeStops = getFilteredStops();
    if (activeStops.length > 0) {
      const startMin = timeToMinutes(activeStops[0].scheduledTime);
      setTestTimeMinutes(startMin);
    }
  }, [selectedRoute, directionFilter]);

  const handleApprove = async (id: string) => {
    try {
      await authFetch(`/api/admin/drivers/${id}/approve`, { method: "POST" });
      setDrivers((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await authFetch(`/api/admin/drivers/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason: "Application rejected by admin." }),
      });
      setDrivers((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolveReport = async (id: string) => {
    try {
      await authFetch(`/api/reports/${id}/resolve`, { method: "PATCH" });
      setReports((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      await apiFetch("/api/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      });
    } catch (err) {
      console.error(err);
    } finally {
      localStorage.clear();
      sessionStorage.clear();
      router.push("/");
    }
  };

  // Route Upload Handler
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setIsUploading(true);
    setErrorMsg("");
    setSuccessMsg("");

    const formData = new FormData();
    formData.append("file", uploadFile);

    try {
      await authFetch("/api/routes/upload", {
        method: "POST",
        body: formData,
      });
      setSuccessMsg("Route parsed and forward/return timetables saved successfully!");
      setUploadFile(null);
      await loadRoutes();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to parse route.");
    } finally {
      setIsUploading(false);
    }
  };

  // Delete Route Handler
  const handleDeleteRoute = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this route and its stops?")) return;

    try {
      await authFetch(`/api/routes/${id}`, { method: "DELETE" });
      setRoutes((prev) => prev.filter((r) => r.id !== id));
      if (selectedRoute?.id === id) {
        setSelectedRoute(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Edit and Save Stops Handlers
  const startEditingStops = () => {
    if (!selectedRoute) return;
    setEditedStops([...selectedRoute.stops]);
    setIsEditingStops(true);
  };

  const handleStopFieldChange = (index: number, field: keyof Stop, value: string | number) => {
    const updated = [...editedStops];
    updated[index] = { ...updated[index], [field]: value } as Stop;
    setEditedStops(updated);
  };

  const handleSaveStops = async () => {
    if (!selectedRoute) return;
    setIsSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await authFetch<{ route: RouteItem }>(`/api/routes/${selectedRoute.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: selectedRoute.code,
          provider: selectedRoute.provider,
          driverName: selectedRoute.driverName,
          driverPhone: selectedRoute.driverPhone,
          startTime: editedStops[0]?.scheduledTime || selectedRoute.startTime,
          endTime: editedStops[editedStops.length - 1]?.scheduledTime || selectedRoute.endTime,
          stops: editedStops,
        }),
      });

      setSuccessMsg("Route stops updated successfully!");
      setSelectedRoute(res.route);
      setRoutes((prev) => prev.map((r) => (r.id === res.route.id ? res.route : r)));
      setIsEditingStops(false);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save stops.");
    } finally {
      setIsSaving(false);
    }
  };

  // Select Direction on Route Select
  const handleSelectRoute = (route: RouteItem) => {
    setSelectedRoute(route);
    setIsEditingStops(false);
    if (route.code.includes("(Return)")) {
      setDirectionFilter("RETURN");
    } else {
      setDirectionFilter("FORWARD");
    }
  };

  // Get active stops
  const getFilteredStops = (): Stop[] => {
    if (!selectedRoute) return [];
    return selectedRoute.stops;
  };

  // Helper conversions
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

  const minutesToTimeStr = (totalMin: number): string => {
    let hours = Math.floor(totalMin / 60);
    const minutes = totalMin % 60;
    const ampm = hours >= 12 ? "PM" : "AM";
    if (hours > 12) hours -= 12;
    if (hours === 0) hours = 12;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")} ${ampm}`;
  };

  // Calculate simulated coords for the map
  const getSimulatedCoords = () => {
    const stops = getFilteredStops();
    if (stops.length < 2) return null;

    const startMin = timeToMinutes(stops[0].scheduledTime);
    const endMin = timeToMinutes(stops[stops.length - 1].scheduledTime);

    if (testTimeMinutes < startMin || testTimeMinutes > endMin) return null;

    let segmentStart: Stop | null = null;
    let segmentEnd: Stop | null = null;

    for (let i = 0; i < stops.length - 1; i++) {
      const sTime = timeToMinutes(stops[i].scheduledTime);
      const eTime = timeToMinutes(stops[i + 1].scheduledTime);

      if (testTimeMinutes >= sTime && testTimeMinutes <= eTime) {
        segmentStart = stops[i];
        segmentEnd = stops[i + 1];
        break;
      }
    }

    if (segmentStart && segmentEnd) {
      const sTime = timeToMinutes(segmentStart.scheduledTime);
      const eTime = timeToMinutes(segmentEnd.scheduledTime);
      const totalDuration = eTime - sTime;
      const elapsed = testTimeMinutes - sTime;
      const ratio = totalDuration > 0 ? elapsed / totalDuration : 0;

      return {
        lat: segmentStart.lat + ratio * (segmentEnd.lat - segmentStart.lat),
        lng: segmentStart.lng + ratio * (segmentEnd.lng - segmentStart.lng),
      };
    }

    return null;
  };

  const activeStops = getFilteredStops();
  const simCoords = getSimulatedCoords();

  return (
    <div className="flex min-h-screen bg-background text-on-surface">
      {/* Side Navigation Bar */}
      <aside className="hidden md:flex h-full w-80 fixed left-0 top-0 bg-[#131b2e] border-r border-glass-border shadow-xl flex-col py-6 gap-4 z-40">
        <div className="px-6 pb-4 flex flex-col gap-1">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 text-primary text-xl font-bold">
              A
            </div>
            <div>
              <h2 className="text-md font-bold text-on-surface">Admin Central</h2>
              <p className="text-xs text-on-surface-variant">University Transit Control</p>
            </div>
          </div>
        </div>

        <div className="h-px w-full bg-glass-border"></div>

        <nav className="flex-1 px-4 flex flex-col gap-1 pt-4">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all text-left cursor-pointer ${
              activeTab === "dashboard"
                ? "bg-gradient-to-r from-secondary-container to-transparent text-white border-l-4 border-secondary"
                : "text-on-surface-variant hover:bg-surface-container-high hover:pl-2"
            }`}
          >
            <span className="material-symbols-outlined">dashboard</span>
            <span>Dashboard</span>
          </button>
          
          <button
            onClick={() => setActiveTab("routes")}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all text-left cursor-pointer ${
              activeTab === "routes"
                ? "bg-gradient-to-r from-secondary-container to-transparent text-white border-l-4 border-secondary"
                : "text-on-surface-variant hover:bg-surface-container-high hover:pl-2"
            }`}
          >
            <span className="material-symbols-outlined">map_location</span>
            <span>Route Validation</span>
          </button>

          <button className="text-on-surface-variant hover:bg-surface-container-high hover:pl-2 flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all text-left">
            <span className="material-symbols-outlined">group</span>
            <span>Manage Drivers</span>
          </button>
          <button className="text-on-surface-variant hover:bg-surface-container-high hover:pl-2 flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all text-left">
            <span className="material-symbols-outlined">hub</span>
            <span>Transit Points</span>
          </button>
        </nav>

        <div className="mt-auto px-6 pt-4 border-t border-glass-border space-y-4">
          <div>
            <h1 className="text-lg font-bold text-primary bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">GetPoint</h1>
            <p className="text-[10px] text-on-surface-variant opacity-50">v2.5.0-Validation</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full py-2.5 px-4 rounded-xl border border-error/20 flex items-center justify-center gap-2 text-error hover:bg-error/10 active:scale-[0.98] transition-all cursor-pointer text-xs font-bold"
          >
            <span className="material-symbols-outlined text-sm">logout</span>
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Panel Content */}
      <main className="flex-1 md:ml-80 min-h-screen">
        <header className="fixed top-0 right-0 w-full md:w-[calc(100%-320px)] h-16 bg-[#0b1326]/80 backdrop-blur-md border-b border-glass-border shadow-sm flex items-center justify-between px-6 z-30">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-on-surface">
              {activeTab === "dashboard" ? "System Overview" : "Route Parser & Validation System"}
            </h2>
          </div>
        </header>

        <div className="mt-16 p-6 space-y-6">
          {successMsg && (
            <div className="p-3 rounded-xl bg-success/20 border border-success/30 text-success text-sm">
              {successMsg}
            </div>
          )}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-error/10 border border-error/20 text-error text-sm">
              {errorMsg}
            </div>
          )}

          {/* VIEW 1: DASHBOARD TAB */}
          {activeTab === "dashboard" && (
            <>
              {/* Operations Header */}
              <div className="relative h-48 rounded-xl overflow-hidden mb-6 bg-gradient-to-br from-[#1e1b4b] to-[#0f172a] p-8 flex flex-col justify-end">
                <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-success/20 text-success px-3 py-1 rounded-full border border-success/30">
                  <span className="w-2 h-2 bg-success rounded-full pulse-dot"></span>
                  <span className="text-[10px] font-bold uppercase tracking-wider">Live Operations Active</span>
                </div>
                <h3 className="text-2xl font-bold text-white">Live Operations Center</h3>
                <p className="text-sm text-primary-fixed-dim">Real-time transit monitoring and fleet management</p>
              </div>

              {/* Metric Cards Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass-card p-6 rounded-xl flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="material-symbols-outlined text-primary p-2 bg-primary/10 rounded-lg">location_on</span>
                  </div>
                  <span className="text-xs text-on-surface-variant mt-2">TOTAL POINTS</span>
                  <span className="text-2xl font-bold text-on-surface">{stats.pointCount}</span>
                </div>

                <div className="glass-card p-6 rounded-xl flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="material-symbols-outlined text-secondary p-2 bg-secondary/10 rounded-lg">directions_bus</span>
                  </div>
                  <span className="text-xs text-on-surface-variant mt-2">ACTIVE DRIVERS</span>
                  <span className="text-2xl font-bold text-on-surface">{stats.activeDrivers}</span>
                </div>

                <div className="glass-card p-6 rounded-xl flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="material-symbols-outlined text-error p-2 bg-error/10 rounded-lg">flag</span>
                  </div>
                  <span className="text-xs text-on-surface-variant mt-2">OPEN REPORTS</span>
                  <span className="text-2xl font-bold text-on-surface">{stats.openReports}</span>
                </div>

                <div className="glass-card p-6 rounded-xl flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="material-symbols-outlined text-warning p-2 bg-warning/10 rounded-lg">how_to_reg</span>
                  </div>
                  <span className="text-xs text-on-surface-variant mt-2">PENDING APPROVALS</span>
                  <span className="text-2xl font-bold text-on-surface">{stats.pendingApprovals}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Pending Approvals Panel */}
                <section className="lg:col-span-6 flex flex-col gap-4">
                  <h3 className="text-lg font-bold text-on-surface">Pending Driver Approvals</h3>
                  <div className="space-y-4">
                    {isLoading ? (
                      <div className="glass-card p-6 rounded-xl text-center text-on-surface-variant">
                        Loading...
                      </div>
                    ) : drivers.length === 0 ? (
                      <div className="glass-card p-6 rounded-xl text-center text-on-surface-variant">
                        No pending driver approvals
                      </div>
                    ) : (
                      drivers.map((driver) => (
                        <div key={driver.id} className="glass-card p-4 rounded-xl flex flex-col gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-primary text-md border border-primary/20">
                              {driver.avatarInitials}
                            </div>
                            <div className="flex-1">
                              <h4 className="text-sm font-semibold text-on-surface">{driver.name}</h4>
                              <p className="text-xs text-on-surface-variant">License: {driver.license}</p>
                              <p className="text-xs text-on-surface-variant">{driver.email}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => handleReject(driver.id)}
                              className="py-2 rounded-lg bg-surface-variant hover:bg-error/20 hover:text-error text-xs font-semibold transition-all cursor-pointer"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => handleApprove(driver.id)}
                              className="py-2 rounded-lg cta-gradient text-white text-xs font-bold transition-all cursor-pointer"
                            >
                              Approve
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                {/* Reports Panel */}
                <section className="lg:col-span-6 flex flex-col gap-4">
                  <h3 className="text-lg font-bold text-on-surface">Recent User Issues</h3>
                  <div className="glass-card rounded-xl p-4 divide-y divide-glass-border">
                    {reports.length === 0 ? (
                      <div className="py-6 text-center text-on-surface-variant text-sm">No open reports</div>
                    ) : (
                      reports.map((report) => (
                        <div key={report.id} className="py-3 flex items-start justify-between first:pt-0 last:pb-0 gap-3">
                          <div>
                            <p className="text-xs font-bold text-primary">{report.studentEmail ?? "Student"}</p>
                            <p className="text-[10px] text-on-surface-variant">{report.pointCode}</p>
                            <p className="text-sm text-on-surface mt-1">{report.message}</p>
                            <p className="text-[10px] text-on-surface-variant mt-1">{formatRelativeTime(report.createdAt)}</p>
                          </div>
                          <button
                            onClick={() => handleResolveReport(report.id)}
                            className="text-[10px] font-bold uppercase text-success hover:underline cursor-pointer whitespace-nowrap"
                          >
                            Resolve
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </div>
            </>
          )}

          {/* VIEW 2: ROUTES TAB (ROUTE VALIDATION & SIMULATION SYSTEM) */}
          {activeTab === "routes" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: File upload & Route list */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* Upload Form Card */}
                <div className="glass-card p-4 rounded-xl border border-glass-border">
                  <h3 className="text-sm font-bold text-on-surface mb-3">Upload Route Schedule (PDF/XLSX)</h3>
                  <form onSubmit={handleUpload} className="space-y-3">
                    <label className="border-2 border-dashed border-glass-border rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-white/5 transition-all text-center">
                      <span className="material-symbols-outlined text-primary text-3xl">cloud_upload</span>
                      <span className="text-xs text-on-surface font-semibold">
                        {uploadFile ? uploadFile.name : "Select route file"}
                      </span>
                      <span className="text-[10px] text-on-surface-variant">Jadoon Excel or Nadeem PDF</span>
                      <input
                        type="file"
                        accept=".xlsx,.pdf"
                        className="hidden"
                        onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      />
                    </label>

                    {uploadFile && (
                      <button
                        type="submit"
                        disabled={isUploading}
                        className="w-full py-2 px-4 rounded-xl cta-gradient text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isUploading ? "Uploading & Parsing..." : "Upload and Parse Route"}
                      </button>
                    )}
                  </form>
                </div>

                {/* List of Routes */}
                <div className="glass-card p-4 rounded-xl border border-glass-border space-y-4">
                  <h3 className="text-sm font-bold text-on-surface">Transit Schedules</h3>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                    {routes.map((route) => (
                      <div
                        key={route.id}
                        onClick={() => handleSelectRoute(route)}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          selectedRoute?.id === route.id
                            ? "bg-primary-container/10 border-primary text-white"
                            : "bg-white/5 border-glass-border text-on-surface-variant hover:bg-white/10"
                        }`}
                      >
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-on-surface">{route.code}</h4>
                          <p className="text-[9px] text-on-surface-variant uppercase font-semibold">
                            {route.provider} • {route.stops.length} Stops
                          </p>
                          <p className="text-[10px] text-on-surface-variant">
                            Timings: {route.startTime} - {route.endTime}
                          </p>
                        </div>
                        <button
                          onClick={(e) => handleDeleteRoute(route.id, e)}
                          className="p-1 hover:text-error text-on-surface-variant active:scale-95 transition-all cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    ))}

                    {routes.length === 0 && (
                      <p className="text-center text-xs text-on-surface-variant py-4">
                        No routes stored. Upload a file above.
                      </p>
                    )}
                  </div>
                </div>

              </div>

              {/* Right Column: Validation map & Editor */}
              <div className="lg:col-span-8 space-y-6">
                
                {selectedRoute ? (
                  <div className="glass-card p-5 rounded-2xl border border-glass-border space-y-5 shadow-2xl">
                    
                    {/* Header Info */}
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-on-surface">{selectedRoute.code}</h3>
                          <span className="text-[9px] px-2 py-0.5 rounded bg-white/10 text-on-surface-variant uppercase font-bold">
                            {selectedRoute.provider}
                          </span>
                        </div>
                        <p className="text-xs text-on-surface-variant">
                          Driver: <span className="text-on-surface font-semibold">{selectedRoute.driverName || "Unassigned"}</span>
                          {selectedRoute.driverPhone && ` (${selectedRoute.driverPhone})`}
                        </p>
                      </div>

                      <div className="flex gap-1 bg-[#171f33] p-1 rounded-xl">
                        <button
                          onClick={() => setDirectionFilter("FORWARD")}
                          disabled={!selectedRoute.code.includes("(Forward)") && selectedRoute.code.includes("(Return)")}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase transition-all cursor-pointer ${
                            directionFilter === "FORWARD"
                              ? "bg-primary text-white shadow"
                              : "text-on-surface-variant hover:text-on-surface disabled:opacity-30"
                          }`}
                        >
                          Forward Route
                        </button>
                        <button
                          onClick={() => setDirectionFilter("RETURN")}
                          disabled={!selectedRoute.code.includes("(Return)") && selectedRoute.code.includes("(Forward)")}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase transition-all cursor-pointer ${
                            directionFilter === "RETURN"
                              ? "bg-primary text-white shadow"
                              : "text-on-surface-variant hover:text-on-surface disabled:opacity-30"
                          }`}
                        >
                          Return Route
                        </button>
                      </div>
                    </div>

                    {/* Timeline Slider simulation */}
                    {activeStops.length > 1 && (
                      <div className="bg-[#171f33] p-4 rounded-xl border border-glass-border space-y-3">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-sm">schedule</span>
                            <span className="text-xs font-bold text-on-surface">TIMETABLE SIMULATOR</span>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setIsPlayActive(!isPlayActive)}
                              className="w-8 h-8 rounded-full bg-primary/20 hover:bg-primary/30 flex items-center justify-center text-primary active:scale-95 transition-all cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-sm">
                                {isPlayActive ? "pause" : "play_arrow"}
                              </span>
                            </button>
                            <span className="text-sm font-extrabold text-primary min-w-[70px] text-right">
                              {minutesToTimeStr(testTimeMinutes)}
                            </span>
                          </div>
                        </div>

                        <input
                          type="range"
                          min={timeToMinutes(activeStops[0].scheduledTime)}
                          max={timeToMinutes(activeStops[activeStops.length - 1].scheduledTime)}
                          value={testTimeMinutes}
                          onChange={(e) => {
                            setTestTimeMinutes(parseInt(e.target.value, 10));
                            setIsPlayActive(false);
                          }}
                          className="w-full accent-primary h-1.5 rounded-lg cursor-pointer bg-glass-border"
                        />
                        <div className="flex justify-between text-[8px] text-on-surface-variant uppercase font-bold tracking-wider">
                          <span>Start Stop: {activeStops[0].name}</span>
                          <span>Destination: {activeStops[activeStops.length - 1].name}</span>
                        </div>
                      </div>
                    )}

                    {/* Map Box */}
                    <div className="w-full h-80 rounded-xl overflow-hidden relative border border-glass-border z-10">
                      <AdminRouteMap stops={activeStops} busCoords={simCoords} />
                    </div>

                    {/* Stops timing & coordinates editor */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-bold uppercase text-on-surface-variant tracking-wider">
                          Stop Sequences & Coordinates
                        </h4>
                        
                        {isEditingStops ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => setIsEditingStops(false)}
                              className="px-3 py-1 bg-surface-variant hover:bg-white/10 rounded-lg text-[10px] font-bold cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleSaveStops}
                              disabled={isSaving}
                              className="px-3 py-1 bg-success/20 hover:bg-success/30 text-success border border-success/30 rounded-lg text-[10px] font-bold cursor-pointer disabled:opacity-50"
                            >
                              {isSaving ? "Saving..." : "Save Stops"}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={startEditingStops}
                            className="px-3 py-1 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-lg text-[10px] font-bold cursor-pointer"
                          >
                            Edit Timings & Coordinates
                          </button>
                        )}
                      </div>

                      <div className="divide-y divide-glass-border max-h-80 overflow-y-auto pr-1">
                        {(isEditingStops ? editedStops : activeStops).map((stop, sIdx) => (
                          <div key={stop.id || sIdx} className="py-2.5 flex flex-col md:flex-row items-start md:items-center gap-3 first:pt-0 last:pb-0">
                            
                            <div className="flex items-center gap-2 min-w-[120px]">
                              <span className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center text-[10px] text-primary font-bold">
                                {stop.sequence + 1}
                              </span>
                              {isEditingStops ? (
                                <input
                                  type="text"
                                  value={stop.name}
                                  onChange={(e) => handleStopFieldChange(sIdx, "name", e.target.value)}
                                  className="bg-[#171f33] border border-glass-border rounded px-2 py-0.5 text-xs text-on-surface outline-none focus:border-primary"
                                />
                              ) : (
                                <span className="text-xs font-semibold text-on-surface truncate max-w-[180px]">{stop.name}</span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 ml-auto">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] text-on-surface-variant font-bold uppercase">Time</span>
                                {isEditingStops ? (
                                  <input
                                    type="text"
                                    value={stop.scheduledTime}
                                    onChange={(e) => handleStopFieldChange(sIdx, "scheduledTime", e.target.value)}
                                    className="w-16 bg-[#171f33] border border-glass-border rounded px-2 py-0.5 text-xs text-on-surface outline-none focus:border-primary text-center"
                                  />
                                ) : (
                                  <span className="text-xs text-primary font-bold">{stop.scheduledTime}</span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] text-on-surface-variant font-bold uppercase">Lat</span>
                                {isEditingStops ? (
                                  <input
                                    type="number"
                                    step="0.000001"
                                    value={stop.lat}
                                    onChange={(e) => handleStopFieldChange(sIdx, "lat", parseFloat(e.target.value))}
                                    className="w-20 bg-[#171f33] border border-glass-border rounded px-2 py-0.5 text-xs text-on-surface outline-none focus:border-primary text-center"
                                  />
                                ) : (
                                  <span className="text-xs font-mono text-on-surface-variant">{stop.lat.toFixed(5)}</span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] text-on-surface-variant font-bold uppercase">Lng</span>
                                {isEditingStops ? (
                                  <input
                                    type="number"
                                    step="0.000001"
                                    value={stop.lng}
                                    onChange={(e) => handleStopFieldChange(sIdx, "lng", parseFloat(e.target.value))}
                                    className="w-20 bg-[#171f33] border border-glass-border rounded px-2 py-0.5 text-xs text-on-surface outline-none focus:border-primary text-center"
                                  />
                                ) : (
                                  <span className="text-xs font-mono text-on-surface-variant">{stop.lng.toFixed(5)}</span>
                                )}
                              </div>
                            </div>

                          </div>
                        ))}
                      </div>

                    </div>

                  </div>
                ) : (
                  <div className="glass-card p-12 rounded-2xl border border-glass-border text-center text-on-surface-variant flex flex-col items-center justify-center gap-3">
                    <span className="material-symbols-outlined text-4xl text-on-surface-variant/30">map_location</span>
                    <p className="text-sm font-semibold">Select a route schedule on the left to start validation & simulation</p>
                  </div>
                )}

              </div>

            </div>
          )}
        </div>
      </main>
    </div>
  );
}
