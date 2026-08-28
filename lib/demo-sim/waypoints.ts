export type LatLon = { lat: number; lon: number };
export type Bounds = { north: number; south: number; east: number; west: number };
export type DistrictFeature = {
  properties: { name: string };
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown };
};

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRandom(seed: number): () => number {
  return mulberry32(seed);
}

export function randomPointInBounds(bounds: Bounds, random: () => number = Math.random): LatLon {
  return {
    lat: bounds.south + random() * (bounds.north - bounds.south),
    lon: bounds.west + random() * (bounds.east - bounds.west),
  };
}

function pointInRing(lon: number, lat: number, ring: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect = yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function isPointInDistrict(point: LatLon, feature: DistrictFeature): boolean {
  const { type, coordinates } = feature.geometry;
  const polygons = type === 'Polygon' ? [coordinates as number[][][]] : (coordinates as number[][][][]);
  for (const polygon of polygons) {
    const outerRing = polygon[0] as unknown as [number, number][];
    if (pointInRing(point.lon, point.lat, outerRing)) return true;
  }
  return false;
}

export function districtBounds(feature: DistrictFeature): Bounds {
  const { type, coordinates } = feature.geometry;
  const polygons = type === 'Polygon' ? [coordinates as number[][][]] : (coordinates as number[][][][]);
  let north = -Infinity;
  let south = Infinity;
  let east = -Infinity;
  let west = Infinity;
  for (const polygon of polygons) {
    for (const ring of polygon) {
      for (const [lon, lat] of ring as unknown as [number, number][]) {
        if (lat > north) north = lat;
        if (lat < south) south = lat;
        if (lon > east) east = lon;
        if (lon < west) west = lon;
      }
    }
  }
  return { north, south, east, west };
}

export function randomPointInDistrict(feature: DistrictFeature, random: () => number = Math.random): LatLon {
  const bounds = districtBounds(feature);
  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = randomPointInBounds(bounds, random);
    if (isPointInDistrict(candidate, feature)) return candidate;
  }
  return { lat: (bounds.north + bounds.south) / 2, lon: (bounds.east + bounds.west) / 2 };
}

const METERS_PER_DEGREE_LAT = 111_000;

/** Small nearby point (city-riding pace) — NOT a random point anywhere in a district. */
export function randomNearbyPoint(current: LatLon, maxMeters: number, random: () => number = Math.random): LatLon {
  const metersPerDegreeLon = METERS_PER_DEGREE_LAT * Math.cos((current.lat * Math.PI) / 180);
  const distanceMeters = random() * maxMeters;
  const bearing = random() * 2 * Math.PI;
  return {
    lat: current.lat + (Math.cos(bearing) * distanceMeters) / METERS_PER_DEGREE_LAT,
    lon: current.lon + (Math.sin(bearing) * distanceMeters) / metersPerDegreeLon,
  };
}

export function lerpLatLon(a: LatLon, b: LatLon, t: number): LatLon {
  const clamped = Math.max(0, Math.min(1, t));
  return {
    lat: a.lat + (b.lat - a.lat) * clamped,
    lon: a.lon + (b.lon - a.lon) * clamped,
  };
}
