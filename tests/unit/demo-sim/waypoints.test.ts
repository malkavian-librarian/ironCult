import { describe, expect, it } from 'vitest';
import {
  createRandom,
  districtBounds,
  isPointInDistrict,
  lerpLatLon,
  randomNearbyPoint,
  randomPointInBounds,
  randomPointInDistrict,
  type DistrictFeature,
} from '@/lib/demo-sim/waypoints';

const BOUNDS = { north: 52.3, south: 52.1, east: 21.2, west: 20.9 };

const SQUARE_DISTRICT: DistrictFeature = {
  properties: { name: 'test-square' },
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [21.0, 52.2],
        [21.1, 52.2],
        [21.1, 52.3],
        [21.0, 52.3],
        [21.0, 52.2],
      ],
    ],
  },
};

describe('randomPointInBounds', () => {
  it('always returns a point within the given bounds', () => {
    const random = createRandom(42);
    for (let i = 0; i < 200; i++) {
      const point = randomPointInBounds(BOUNDS, random);
      expect(point.lat).toBeGreaterThanOrEqual(BOUNDS.south);
      expect(point.lat).toBeLessThanOrEqual(BOUNDS.north);
      expect(point.lon).toBeGreaterThanOrEqual(BOUNDS.west);
      expect(point.lon).toBeLessThanOrEqual(BOUNDS.east);
    }
  });
});

describe('randomPointInDistrict', () => {
  it('always returns a point inside the district polygon', () => {
    const random = createRandom(7);
    for (let i = 0; i < 200; i++) {
      const point = randomPointInDistrict(SQUARE_DISTRICT, random);
      expect(isPointInDistrict(point, SQUARE_DISTRICT)).toBe(true);
    }
  });

  it('districtBounds matches the polygon extent', () => {
    const bounds = districtBounds(SQUARE_DISTRICT);
    expect(bounds).toEqual({ north: 52.3, south: 52.2, east: 21.1, west: 21.0 });
  });
});

describe('randomNearbyPoint', () => {
  it('never moves further than maxMeters (realistic riding-pace step, not a teleport)', () => {
    const random = createRandom(3);
    const current = { lat: 52.23, lon: 21.0 };
    const metersPerDegreeLat = 111_000;
    const metersPerDegreeLon = metersPerDegreeLat * Math.cos((current.lat * Math.PI) / 180);
    for (let i = 0; i < 200; i++) {
      const point = randomNearbyPoint(current, 70, random);
      const dLat = (point.lat - current.lat) * metersPerDegreeLat;
      const dLon = (point.lon - current.lon) * metersPerDegreeLon;
      const distance = Math.sqrt(dLat * dLat + dLon * dLon);
      expect(distance).toBeLessThanOrEqual(70 + 1e-6);
    }
  });
});

describe('lerpLatLon', () => {
  const a = { lat: 52.2, lon: 21.0 };
  const b = { lat: 52.3, lon: 21.1 };

  it('returns a at t=0 and b at t=1', () => {
    expect(lerpLatLon(a, b, 0)).toEqual(a);
    expect(lerpLatLon(a, b, 1)).toEqual(b);
  });

  it('returns the midpoint at t=0.5', () => {
    expect(lerpLatLon(a, b, 0.5)).toEqual({ lat: 52.25, lon: 21.05 });
  });

  it('clamps out-of-range t', () => {
    expect(lerpLatLon(a, b, -1)).toEqual(a);
    expect(lerpLatLon(a, b, 2)).toEqual(b);
  });
});
