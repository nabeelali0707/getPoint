"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { authFetch } from "@/lib/api";
import { formatRelativeTime, useRequireAuth } from "@/lib/auth";

interface Notification {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  isRead: boolean;
}

const iconConfig: Record<string, { icon: string; bg: string; color: string }> = {
  info: { icon: "info", bg: "bg-primary/20", color: "text-primary" },
  alert: { icon: "warning", bg: "bg-error/20", color: "text-error" },
  update: { icon: "check_circle", bg: "bg-success/20", color: "text-success" },
  trip: { icon: "directions_bus", bg: "bg-secondary/20", color: "text-secondary" },
};

function getIconConfig(type: string) {
  return iconConfig[type] ?? iconConfig.info;
}

function groupNotifications(notifications: Notification[]) {
  const today: Notification[] = [];
  const yesterday: Notification[] = [];
  const earlier: Notification[] = [];

  for (const notification of notifications) {
    const label = formatRelativeTime(notification.createdAt);
    if (label.includes("minute") || label.includes("hour") || label === "Just now") {
      today.push(notification);
    } else if (label.startsWith("Yesterday")) {
      yesterday.push(notification);
    } else {
      earlier.push(notification);
    }
  }

  return { today, yesterday, earlier };
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useRequireAuth();

  const loadNotifications = () => {
    authFetch<{ notifications: Notification[] }>("/api/notifications")
      .then((data) => setNotifications(data.notifications))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const groups = useMemo(() => groupNotifications(notifications), [notifications]);

  const handleMarkAllRead = async () => {
    try {
      await authFetch("/api/notifications/read-all", { method: "PATCH" });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const renderNotification = (notification: Notification) => {
    const cfg = getIconConfig(notification.type);
    return (
      <div
        key={notification.id}
        className={`flex items-start gap-3 p-4 rounded-xl transition-all cursor-pointer ${
          notification.isRead ? "hover:bg-white/5" : "bg-primary/5 hover:bg-primary/10"
        }`}
      >
        <div className={`w-10 h-10 rounded-full ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
          <span className={`material-symbols-outlined text-sm ${cfg.color}`}>{cfg.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm leading-relaxed ${notification.isRead ? "text-on-surface-variant" : "text-on-surface font-medium"}`}>
            {notification.message}
          </p>
          <p className="text-xs text-muted mt-1">{formatRelativeTime(notification.createdAt)}</p>
        </div>
        {!notification.isRead && <div className="w-2.5 h-2.5 rounded-full bg-primary mt-2 flex-shrink-0"></div>}
      </div>
    );
  };

  const renderSection = (title: string, items: Notification[]) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-6">
        <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-3 px-1">{title}</h3>
        <div className="space-y-1">{items.map(renderNotification)}</div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background text-on-surface pb-28">
      <header className="fixed top-0 w-full backdrop-blur-md bg-glass-surface border-b border-glass-border shadow-sm z-50 flex items-center justify-between px-6 h-16">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="material-symbols-outlined text-primary cursor-pointer active:scale-95 transition-transform">arrow_back</button>
          <h1 className="text-lg font-semibold">Notifications</h1>
        </div>
        <button onClick={handleMarkAllRead} className="text-xs text-primary font-semibold hover:underline cursor-pointer">
          Mark all read
        </button>
      </header>

      <main className="pt-20 px-4 max-w-lg mx-auto">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {renderSection("Today", groups.today)}
            {renderSection("Yesterday", groups.yesterday)}
            {renderSection("Earlier", groups.earlier)}

            {notifications.length === 0 && (
              <div className="text-center py-16">
                <span className="material-symbols-outlined text-on-surface-variant/30 text-[64px] block mb-4">notifications_off</span>
                <p className="text-sm text-on-surface-variant">No notifications</p>
              </div>
            )}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
