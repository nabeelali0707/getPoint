"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { apiFetch } from "@/lib/api";

export default function ProfilePage() {
  const router = useRouter();
  const [userName, setUserName] = useState("Alex");
  const [userRole, setUserRole] = useState("Student");
  const [email, setEmail] = useState("alex@nu.edu.pk");
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed.email) {
          setEmail(parsed.email);
          const namePart = parsed.email.split("@")[0];
          setUserName(namePart.charAt(0).toUpperCase() + namePart.slice(1));
        }
        if (parsed.role) {
          setUserRole(parsed.role.charAt(0).toUpperCase() + parsed.role.slice(1));
        }
      } catch (e) {
        console.error("Error parsing user data", e);
      }
    }
  }, []);

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      await apiFetch("/api/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      });
    } catch (e) {
      console.error("Logout request failed", e);
    } finally {
      localStorage.clear();
      sessionStorage.clear();
      router.push("/");
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-surface pb-28">
      {/* Top App Bar */}
      <header className="fixed top-0 w-full z-50 bg-[#0b1326]/80 backdrop-blur-lg border-b border-glass-border shadow-sm flex items-center justify-between px-6 h-16">
        <div className="flex items-center gap-3">
          <button className="material-symbols-outlined text-primary hover:bg-glass-surface p-2 rounded-full transition-colors active:scale-95 cursor-pointer">
            menu
          </button>
          <h1 className="text-lg font-bold text-primary tracking-tight">Profile</h1>
        </div>
        <div className="w-10 h-10 rounded-full border-2 border-primary-container p-0.5">
          <div className="w-full h-full rounded-full bg-primary-container/30 flex items-center justify-center font-bold text-primary">
            {userName.charAt(0)}
          </div>
        </div>
      </header>

      <main className="pt-24 pb-28 px-4 max-w-xl mx-auto space-y-6">
        {/* Profile Hero Section */}
        <section className="flex flex-col items-center text-center space-y-4 mb-8">
          <div className="relative">
            <div className="w-24 h-24 rounded-full border-4 border-primary/20 p-1 premium-glow flex items-center justify-center bg-glass-surface text-3xl font-extrabold text-primary">
              {userName.charAt(0)}
            </div>
            <div className="absolute -bottom-1 -right-1 bg-success w-6 h-6 rounded-full border-4 border-[#0b1326] flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold text-on-surface">{userName}</h2>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="bg-primary-container/20 text-primary px-3 py-0.5 rounded-full text-xs font-semibold">
                {userRole}
              </span>
              <span className="text-on-surface-variant text-xs">University Member</span>
            </div>
            <p className="text-xs text-on-surface-variant mt-1">{email}</p>
          </div>
        </section>

        {/* Settings Groups */}
        <div className="space-y-4">
          {/* Account Settings */}
          <div className="glass-card rounded-xl p-4 hover-glow transition-all duration-300">
            <h3 className="text-sm font-bold text-primary mb-4">Account Settings</h3>
            <div className="space-y-1">
              <button className="w-full flex items-center justify-between p-3 hover:bg-glass-surface rounded-lg transition-colors group cursor-pointer">
                <div className="flex items-center gap-4">
                  <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">person</span>
                  <span className="text-sm">Personal Information</span>
                </div>
                <span className="material-symbols-outlined text-outline">chevron_right</span>
              </button>
              <button className="w-full flex items-center justify-between p-3 hover:bg-glass-surface rounded-lg transition-colors group cursor-pointer">
                <div className="flex items-center gap-4">
                  <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">payments</span>
                  <span className="text-sm">Payment Methods</span>
                </div>
                <span className="material-symbols-outlined text-outline">chevron_right</span>
              </button>
              <button className="w-full flex items-center justify-between p-3 hover:bg-glass-surface rounded-lg transition-colors group cursor-pointer">
                <div className="flex items-center gap-4">
                  <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">shield</span>
                  <span className="text-sm">Privacy & Security</span>
                </div>
                <span className="material-symbols-outlined text-outline">chevron_right</span>
              </button>
            </div>
          </div>

          {/* Notifications */}
          <div className="glass-card rounded-xl p-4 hover-glow transition-all duration-300">
            <h3 className="text-sm font-bold text-primary mb-4">Notifications</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between px-3">
                <div className="flex items-center gap-4">
                  <span className="material-symbols-outlined text-on-surface-variant">notifications_active</span>
                  <span className="text-sm">Push Notifications</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pushNotifications}
                    onChange={(e) => setPushNotifications(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#2d3449] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
              <div className="flex items-center justify-between px-3">
                <div className="flex items-center gap-4">
                  <span className="material-symbols-outlined text-on-surface-variant">mail</span>
                  <span className="text-sm">Email Alerts</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailAlerts}
                    onChange={(e) => setEmailAlerts(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#2d3449] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Theme */}
          <div className="glass-card rounded-xl p-4 hover-glow transition-all duration-300">
            <h3 className="text-sm font-bold text-primary mb-4">Theme</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setTheme("dark")}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  theme === "dark"
                    ? "border-primary bg-primary-container/10 text-primary"
                    : "border-glass-border hover:bg-glass-surface text-on-surface-variant"
                }`}
              >
                <span className="material-symbols-outlined" style={{ fontVariationSettings: theme === "dark" ? "'FILL' 1" : "'FILL' 0" }}>dark_mode</span>
                <span className="text-xs font-semibold">Dark</span>
              </button>
              <button
                onClick={() => setTheme("light")}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  theme === "light"
                    ? "border-primary bg-primary-container/10 text-primary"
                    : "border-glass-border hover:bg-glass-surface text-on-surface-variant"
                }`}
              >
                <span className="material-symbols-outlined" style={{ fontVariationSettings: theme === "light" ? "'FILL' 1" : "'FILL' 0" }}>light_mode</span>
                <span className="text-xs font-semibold">Light</span>
              </button>
            </div>
          </div>

          {/* Support */}
          <div className="glass-card rounded-xl p-4 hover-glow transition-all duration-300">
            <h3 className="text-sm font-bold text-primary mb-4">Support</h3>
            <div className="space-y-1">
              <button className="w-full flex items-center justify-between p-3 hover:bg-glass-surface rounded-lg transition-colors group cursor-pointer">
                <div className="flex items-center gap-4">
                  <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">help</span>
                  <span className="text-sm">Help Center</span>
                </div>
                <span className="material-symbols-outlined text-outline">open_in_new</span>
              </button>
              <button className="w-full flex items-center justify-between p-3 hover:bg-glass-surface rounded-lg transition-colors group cursor-pointer">
                <div className="flex items-center gap-4">
                  <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">feedback</span>
                  <span className="text-sm">Send Feedback</span>
                </div>
                <span className="material-symbols-outlined text-outline">chevron_right</span>
              </button>
            </div>
          </div>

          {/* Log Out */}
          <button
            onClick={handleLogout}
            className="w-full mt-8 py-4 px-6 rounded-xl glass-card border border-error/20 flex items-center justify-center gap-2 text-error hover:bg-error/10 active:scale-[0.98] transition-all group cursor-pointer"
          >
            <span className="material-symbols-outlined text-error">logout</span>
            <span className="text-md font-bold">Log Out</span>
          </button>

          {/* Version Info */}
          <div className="text-center pt-4 pb-8">
            <p className="text-xs text-[#64748B] font-semibold">GetPoint Transit v2.4.0</p>
            <p className="text-[10px] text-[#64748B]/50 mt-1">Made with ❤️ for the University Community</p>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
