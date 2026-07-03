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

interface AdminRouteMapProps {
  stops: Stop[];
  busCoords: { lat: number; lng: number } | null;
}

const createStopIcon = (time: string, sequence: number) => {
  return L.divIcon({
    className: "admin-stop-marker",
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; transform: translate(-50%, -50%); pointer-events: none;">
        <div style="width: 10px; height: 10px; border-radius: 50%; background-color: #3b82f6; border: 2px solid #ffffff; box-shadow: 0 0 5px rgba(59,130,246,0.8);"></div>
        <div style="margin-top: 2px; background: rgba(15, 23, 42, 0.85); border: 1.5px solid rgba(59,130,246,0.4); padding: 1px 5px; border-radius: 4px; white-space: nowrap;">
          <span style="font-size: 8px; font-weight: 800; color: #ffffff;">#${sequence + 1}: ${time}</span>
        </div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
};

const createBusIcon = () => {
  return L.divIcon({
    className: "admin-bus-marker",
    html: `
      <div class="pulse-glow" style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; transform: translate(-50%, -50%); pointer-events: none;">
        <div style="width: 24px; height: 24px; border-radius: 50%; background-color: #10b981; box-shadow: 0 0 15px #10b981, 0 0 6px rgba(255,255,255,0.9); border: 2.5px solid #ffffff; display: flex; align-items: center; justify-content: center;">
          <span class="material-icons" style="font-size: 13px; color: #ffffff; font-family: 'Material Symbols Outlined';">directions_bus</span>
        </div>
        <div class="glass-card px-2 py-0.5 rounded border border-glass-border shadow-md" style="margin-top: 4px; white-space: nowrap; background: rgba(16, 185, 129, 0.9); border: 1px solid rgba(255,255,255,0.3);">
          <span style="font-size: 8px; font-weight: 950; color: #ffffff; font-family: sans-serif; text-transform: uppercase; letter-spacing: 0.5px;">
            TEST POSITION
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

export default function AdminRouteMap({ stops, busCoords }: AdminRouteMapProps) {
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
        zoom={13}
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
            color="#3b82f6"
            weight={4}
            opacity={0.85}
            dashArray="12, 12"
          />
        )}
        {validStops.map((stop) => (
          <Marker
            key={stop.sequence}
            position={[stop.lat, stop.lng]}
            icon={createStopIcon(stop.scheduledTime, stop.sequence)}
          />
        ))}
        {busCoords && (
          <Marker position={[busCoords.lat, busCoords.lng]} icon={createBusIcon()} />
        )}
      </MapContainer>
    </div>
  );
}
