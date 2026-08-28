export type LatLon = { lat: number; lon: number };

export function distanceMeters(a: LatLon, b: LatLon): number {
  const earthMeters = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * earthMeters * Math.asin(Math.sqrt(h));
}

export function countNearbyRiders(event: LatLon, riders: LatLon[], radiusMeters = 220): number {
  return riders.filter((rider) => distanceMeters(event, rider) <= radiusMeters).length;
}
