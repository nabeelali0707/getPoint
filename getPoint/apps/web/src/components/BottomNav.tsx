"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    {
      label: "Map",
      icon: "map",
      route: "/student/map",
    },
    {
      label: "Points",
      icon: "location_on",
      route: "/student/dashboard",
    },
    {
      label: "Reports",
      icon: "flag",
      route: "/student/reports",
    },
    {
      label: "Account",
      icon: "person",
      route: "/profile",
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center h-20 px-4 pb-safe bg-glass-surface backdrop-blur-md border-t border-glass-border shadow-[0_-4px_20px_rgba(173,198,255,0.1)]">
      {navItems.map((item) => {
        const isActive = pathname === item.route;
        return (
          <button
            key={item.route}
            onClick={() => router.push(item.route)}
            className={`flex flex-col items-center justify-center transition-all duration-200 cursor-pointer ${
              isActive
                ? "text-primary font-bold bg-primary/10 rounded-xl px-3 py-1 scale-105"
                : "text-on-surface-variant hover:text-primary active:scale-90"
            }`}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
            >
              {item.icon}
            </span>
            <span className="text-xs tracking-wider">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
