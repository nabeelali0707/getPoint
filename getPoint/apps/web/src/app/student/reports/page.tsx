"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { authFetch } from "@/lib/api";
import { formatDateTime, useRequireAuth } from "@/lib/auth";

interface Report {
  id: string;
  pointCode: string;
  pointName?: string;
  message: string;
  status: "open" | "resolved";
  createdAt: string;
  resolvedAt?: string | null;
}

interface PointOption {
  id: string;
  code: string;
  name: string;
}

export default function ReportsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"open" | "resolved">("open");
  const [showNewReport, setShowNewReport] = useState(false);
  const [newPointId, setNewPointId] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [reports, setReports] = useState<Report[]>([]);
  const [points, setPoints] = useState<PointOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useRequireAuth();

  const loadReports = () => {
    authFetch<{ reports: Report[] }>("/api/reports")
      .then((data) => setReports(data.reports))
      .catch((err) => setErrorMsg(err.message || "Failed to load reports."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadReports();
    authFetch<{ points: PointOption[] }>("/api/points")
      .then((data) => setPoints(data.points))
      .catch(console.error);
  }, []);

  const filteredReports = reports.filter((r) => r.status === tab);

  const handleSubmitReport = async () => {
    if (!newPointId || newMessage.trim().length < 5) {
      setErrorMsg("Select a point and enter at least 5 characters.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      await authFetch("/api/reports", {
        method: "POST",
        body: JSON.stringify({ pointId: newPointId, message: newMessage }),
      });
      setShowNewReport(false);
      setNewMessage("");
      setNewPointId("");
      loadReports();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to submit report.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-surface pb-28">
      <header className="fixed top-0 w-full backdrop-blur-md bg-glass-surface border-b border-glass-border shadow-sm z-50 flex items-center justify-between px-6 h-16">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="material-symbols-outlined text-primary cursor-pointer active:scale-95 transition-transform">
            arrow_back
          </button>
          <h1 className="text-lg font-semibold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">My Reports</h1>
        </div>
        <button
          onClick={() => setShowNewReport(true)}
          className="w-10 h-10 rounded-full cta-gradient flex items-center justify-center text-white active:scale-95 transition-transform cursor-pointer"
        >
          <span className="material-symbols-outlined text-sm">add</span>
        </button>
      </header>

      <main className="pt-20 px-4 max-w-lg mx-auto">
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-error/10 border border-error/20 text-error text-sm">
            {errorMsg}
          </div>
        )}

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab("open")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              tab === "open" ? "cta-gradient text-white" : "glass-card text-on-surface-variant border border-glass-border"
            }`}
          >
            Open ({reports.filter((r) => r.status === "open").length})
          </button>
          <button
            onClick={() => setTab("resolved")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              tab === "resolved" ? "cta-gradient text-white" : "glass-card text-on-surface-variant border border-glass-border"
            }`}
          >
            Resolved ({reports.filter((r) => r.status === "resolved").length})
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReports.length === 0 ? (
              <div className="text-center py-16">
                <span className="material-symbols-outlined text-on-surface-variant/30 text-[64px] block mb-4">inbox</span>
                <p className="text-sm text-on-surface-variant">No {tab} reports</p>
              </div>
            ) : (
              filteredReports.map((report) => (
                <div key={report.id} className={`glass-card rounded-xl p-4 border-l-4 ${report.status === "open" ? "border-l-warning" : "border-l-success"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        report.status === "open" ? "bg-warning/20 text-warning" : "bg-success/20 text-success"
                      }`}>
                        {report.status === "open" ? "OPEN" : "RESOLVED"}
                      </span>
                      <span className="text-xs font-semibold text-primary">{report.pointCode}</span>
                    </div>
                  </div>
                  <p className="text-sm text-on-surface leading-relaxed mb-3">{report.message}</p>
                  <div className="flex items-center justify-between text-xs text-on-surface-variant">
                    <span>{formatDateTime(report.createdAt)}</span>
                    {report.resolvedAt && <span className="text-success">Resolved: {formatDateTime(report.resolvedAt)}</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {showNewReport && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowNewReport(false)}></div>
          <div className="relative z-10 w-full max-w-md mx-4 glass-card rounded-2xl p-6 space-y-4 mb-4 sm:mb-0">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-on-surface">Report an Issue</h2>
              <button onClick={() => setShowNewReport(false)} className="material-symbols-outlined text-on-surface-variant hover:text-on-surface cursor-pointer">close</button>
            </div>

            <div>
              <label className="text-xs text-on-surface-variant font-semibold mb-1 block">Point</label>
              <select
                className="w-full bg-surface-container-low border border-glass-border rounded-xl px-4 py-3 text-on-surface outline-none focus:border-primary transition-colors cursor-pointer"
                value={newPointId}
                onChange={(e) => setNewPointId(e.target.value)}
              >
                <option value="">Select a point...</option>
                {points.map((point) => (
                  <option key={point.id} value={point.id}>
                    {point.code} — {point.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-on-surface-variant font-semibold mb-1 block">Message</label>
              <textarea
                className="w-full bg-surface-container-low border border-glass-border rounded-xl p-4 text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all outline-none resize-none"
                rows={4}
                placeholder="Describe the issue..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
              />
            </div>

            <button
              onClick={handleSubmitReport}
              disabled={isSubmitting}
              className="cta-gradient w-full py-3 rounded-xl text-sm font-semibold text-white active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? "Submitting..." : "Submit Report"}
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
