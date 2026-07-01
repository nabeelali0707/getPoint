const EARTH_RADIUS_METERS = 6_371_000;
const FALLBACK_SPEED_MPS = 6.7;
const MIN_SPEED_MPS = 1;

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

export function haversineMeters(fromLat: number, fromLng: number, toLat: number, toLng: number) {
  const dLat = toRadians(toLat - fromLat);
  const dLng = toRadians(toLng - fromLng);
  const lat1 = toRadians(fromLat);
  const lat2 = toRadians(toLat);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function estimateEtaSeconds(input: {
  lat: number;
  lng: number;
  speed?: number | null;
  referenceStopLat: number;
  referenceStopLng: number;
}) {
  const distanceMeters = haversineMeters(
    input.lat,
    input.lng,
    input.referenceStopLat,
    input.referenceStopLng
  );

  if (!Number.isFinite(distanceMeters)) {
    return null;
  }

  const speed = input.speed && input.speed > MIN_SPEED_MPS ? input.speed : FALLBACK_SPEED_MPS;
  return Math.max(0, Math.round(distanceMeters / speed));
}
