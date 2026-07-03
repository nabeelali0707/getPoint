"use client";

import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Stop {
  name: string;
  sequence: number;
  scheduledTime: string;
  lat: number;
  lng: number;
}

interface RouteMapProps {
  stops: Stop[];
  busCoords: { lat: number; lng: number } | null;
  busStatus: "live" | "fallback" | "offline";
}

const statusColors = {
  live: "#10b981",     // green
  fallback: "#10b981", // green (masked as live)
  offline: "#6b7280",  // gray
};

const createStopIcon = (time: string, sequence: number) => {
  return L.divIcon({
    className: "custom-stop-marker",
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; transform: translate(-50%, -50%); pointer-events: none;">
        <div style="width: 8px; height: 8px; border-radius: 50%; background-color: #3b82f6; border: 1.5px solid #ffffff; box-shadow: 0 0 4px rgba(59,130,246,0.8);"></div>
        <div style="margin-top: 2px; background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(2px); border: 1px solid rgba(255,255,255,0.1); padding: 1px 4px; border-radius: 4px; white-space: nowrap;">
          <span style="font-size: 8px; font-weight: bold; color: #dae2fd;">${time}</span>
        </div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
};

const createBusIcon = (status: "live" | "fallback") => {
  const color = statusColors[status];
  return L.divIcon({
    className: "custom-bus-marker",
    html: `
      <div class="pulse-glow" style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; transform: translate(-50%, -50%); pointer-events: none;">
        <div class="pulse-dot" style="width: 20px; height: 20px; border-radius: 50%; background-color: ${color}; box-shadow: 0 0 15px ${color}, 0 0 6px rgba(255,255,255,0.9); border: 2.5px solid #ffffff; display: flex; align-items: center; justify-content: center;">
          <span class="material-icons" style="font-size: 11px; color: #ffffff; font-family: 'Material Symbols Outlined';">directions_bus</span>
        </div>
        <div class="glass-card px-2 py-0.5 rounded border border-glass-border shadow-md" style="margin-top: 4px; white-space: nowrap; background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(255,255,255,0.2);">
          <span style="font-size: 9px; font-weight: 800; color: #f8fafc; font-family: sans-serif; text-transform: uppercase;">
            📡 LIVE
          </span>
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

export default function RouteMap({ stops, busCoords, busStatus }: RouteMapProps) {
  const validStops = stops.filter((s) => typeof s.lat === "number" && typeof s.lng === "number");
  const polylinePositions = validStops.map((s) => [s.lat, s.lng] as [number, number]);

  const mapCenter: [number, number] = busCoords
    ? [busCoords.lat, busCoords.lng]
    : validStops.length > 0
    ? [validStops[0].lat, validStops[0].lng]
    : [24.86, 67.08];

  return (
    <div className="w-full h-full dark-map">
      <MapContainer
        center={mapCenter}
        zoom={14}
        scrollWheelZoom={true}
        style={{ width: "100%", height: "100%" }}
      >
        <ChangeView center={mapCenter} />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {polylinePositions.length > 1 && (
          <Polyline
            positions={polylinePositions}
            color="#4d8eff"
            weight={4}
            opacity={0.8}
            dashArray="10, 10"
          />
        )}
        {validStops.map((stop) => (
          <Marker
            key={stop.sequence}
            position={[stop.lat, stop.lng]}
            icon={createStopIcon(stop.scheduledTime, stop.sequence)}
          />
        ))}
        {busCoords && busStatus !== "offline" && (
          <Marker position={[busCoords.lat, busCoords.lng]} icon={createBusIcon(busStatus as any)} />
        )}
      </MapContainer>
    </div>
  );
}
