import { readFileSync } from 'fs';
import path from 'path';

type Ring = [number, number][];
type Feature = { properties: { name: string }; geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown } };
type FeatureCollection = { features: Feature[] };

let cachedVoivodeships: FeatureCollection | null = null;
let cachedWarsawDistricts: FeatureCollection | null = null;

function loadFile(fileName: string): FeatureCollection {
  const filePath = path.join(process.cwd(), 'public', 'map', fileName);
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

function pointInRing(lon: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect = (yi > lat) !== (yj > lat) &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function findFeatureName(data: FeatureCollection, lat: number, lon: number): string | null {
  for (const feature of data.features) {
    const { type, coordinates } = feature.geometry;
    const polygonList = type === 'Polygon' ? [coordinates as number[][][]] : (coordinates as number[][][][]);
    for (const polygon of polygonList) {
      const outerRing = polygon[0] as unknown as Ring;
      if (pointInRing(lon, lat, outerRing)) {
        return feature.properties.name;
      }
    }
  }
  return null;
}

export function findVoivodeship(lat: number, lon: number): string | null {
  if (!cachedVoivodeships) cachedVoivodeships = loadFile('poland-voivodeships.json');
  return findFeatureName(cachedVoivodeships, lat, lon);
}

export function findWarsawDistrict(lat: number, lon: number): string | null {
  if (!cachedWarsawDistricts) cachedWarsawDistricts = loadFile('warsaw-districts.json');
  return findFeatureName(cachedWarsawDistricts, lat, lon);
}
