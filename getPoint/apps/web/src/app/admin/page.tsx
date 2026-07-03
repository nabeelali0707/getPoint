"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, authFetch } from "@/lib/api";
import { formatRelativeTime, useRequireRole } from "@/lib/auth";

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

export default function AdminDashboard() {
  const router = useRouter();
  const [drivers, setDrivers] = useState<PendingDriver[]>([]);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    pointCount: 0,
    activeDrivers: 0,
    openReports: 0,
    pendingApprovals: 0,
  });
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

  useEffect(() => {
    loadDashboard();
  }, []);

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
          <button className="bg-gradient-to-r from-secondary-container to-transparent text-white border-l-4 border-secondary flex items-center gap-3 px-4 py-2.5 rounded-r-xl text-sm font-semibold transition-all">
            <span className="material-symbols-outlined">dashboard</span>
            <span>Dashboard</span>
          </button>
          <button className="text-on-surface-variant hover:bg-surface-container-high hover:pl-2 flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all text-left">
            <span className="material-symbols-outlined">group</span>
            <span>Manage Drivers</span>
          </button>
          <button className="text-on-surface-variant hover:bg-surface-container-high hover:pl-2 flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all text-left">
            <span className="material-symbols-outlined">hub</span>
            <span>Transit Points</span>
          </button>
          <button className="text-on-surface-variant hover:bg-surface-container-high hover:pl-2 flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all text-left">
            <span className="material-symbols-outlined">report_problem</span>
            <span>User Reports</span>
          </button>
        </nav>

        <div className="mt-auto px-6 pt-4 border-t border-glass-border space-y-4">
          <div>
            <h1 className="text-lg font-bold text-primary bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">GetPoint</h1>
            <p className="text-[10px] text-on-surface-variant opacity-50">v2.4.0-Enterprise</p>
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
            <button className="md:hidden text-primary">
              <span className="material-symbols-outlined">menu</span>
            </button>
            <h2 className="text-lg font-bold text-on-surface hidden md:block">System Overview</h2>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 rounded-full hover:bg-white/10 transition-colors">
              <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
            </button>
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 cursor-pointer">
              <span className="material-symbols-outlined text-primary">person</span>
            </div>
          </div>
        </header>

        <div className="mt-16 p-6 space-y-6">
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
                <span className="text-success text-[10px] font-bold bg-success/10 px-2 py-0.5 rounded-full">+4.2%</span>
              </div>
              <span className="text-xs text-on-surface-variant mt-2">TOTAL POINTS</span>
              <span className="text-2xl font-bold text-on-surface">{stats.pointCount}</span>
            </div>

            <div className="glass-card p-6 rounded-xl flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="material-symbols-outlined text-secondary p-2 bg-secondary/10 rounded-lg">directions_bus</span>
                <span className="text-success text-[10px] font-bold bg-success/10 px-2 py-0.5 rounded-full">Active</span>
              </div>
              <span className="text-xs text-on-surface-variant mt-2">ACTIVE DRIVERS</span>
              <span className="text-2xl font-bold text-on-surface">{stats.activeDrivers}</span>
            </div>

            <div className="glass-card p-6 rounded-xl flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="material-symbols-outlined text-error p-2 bg-error/10 rounded-lg">flag</span>
                <span className="text-error text-[10px] font-bold bg-error/10 px-2 py-0.5 rounded-full">Urgent</span>
              </div>
              <span className="text-xs text-on-surface-variant mt-2">OPEN REPORTS</span>
              <span className="text-2xl font-bold text-on-surface">{stats.openReports}</span>
            </div>

            <div className="glass-card p-6 rounded-xl flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="material-symbols-outlined text-warning p-2 bg-warning/10 rounded-lg">how_to_reg</span>
                <span className="text-warning text-[10px] font-bold bg-warning/10 px-2 py-0.5 rounded-full">Pending</span>
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
                        <div className="bg-warning/10 text-warning text-[10px] px-2 py-0.5 rounded font-bold uppercase">NEW</div>
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
        </div>
      </main>
    </div>
  );
}
