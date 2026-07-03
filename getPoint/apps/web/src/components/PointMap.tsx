"use client";

import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface PointMapProps {
  lat: number;
  lng: number;
  code: string;
  status: "active" | "delayed" | "inactive" | "signal_lost";
}

const statusColors = {
  active: "#10b981",
  delayed: "#f59e0b",
  inactive: "#6b7280",
  signal_lost: "#ef4444",
};

const createCustomIcon = (status: PointMapProps["status"], code: string) => {
  const color = statusColors[status] || statusColors.inactive;
  const isPulse = status === "active" || status === "delayed";
  
  return L.divIcon({
    className: "custom-leaflet-marker",
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; transform: translate(-50%, -50%); pointer-events: none;">
        <div class="${isPulse ? 'pulse-dot' : ''}" style="width: 16px; height: 16px; border-radius: 50%; background-color: ${color}; box-shadow: 0 0 10px ${color}, 0 0 4px rgba(255,255,255,0.8); border: 2px solid #ffffff;"></div>
        <div class="glass-card px-2 py-0.5 rounded border border-glass-border shadow-md" style="margin-top: 4px; white-space: nowrap; background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(4px); border: 1px solid rgba(255,255,255,0.15);">
          <span style="font-size: 10px; font-weight: 800; color: #f8fafc; font-family: sans-serif;">${code}</span>
        </div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
};

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export default function PointMap({ lat, lng, code, status }: PointMapProps) {
  const center: [number, number] = [lat, lng];

  return (
    <div className="w-full h-full dark-map">
      <MapContainer
        center={center}
        zoom={15}
        scrollWheelZoom={false}
        zoomControl={false}
        attributionControl={false}
        style={{ width: "100%", height: "100%" }}
      >
        <ChangeView center={center} />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={center} icon={createCustomIcon(status, code)} />
      </MapContainer>
    </div>
  );
}
