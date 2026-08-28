import { describe, expect, it } from 'vitest';
import { createSimulatedRiders, renderPosition, stepSimulatedRiders } from '@/lib/demo-sim/simulated-riders';
import { isPointInDistrict, type DistrictFeature } from '@/lib/demo-sim/waypoints';

function square(name: string, offset: number): DistrictFeature {
  return {
    properties: { name },
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [21.0 + offset, 52.2],
          [21.1 + offset, 52.2],
          [21.1 + offset, 52.3],
          [21.0 + offset, 52.3],
          [21.0 + offset, 52.2],
        ],
      ],
    },
  };
}

const DISTRICTS = [square('alpha', 0), square('beta', 0.2), square('gamma', 0.4)];

describe('createSimulatedRiders', () => {
  it('produces exactly count riders with valid colors and in-bounds waypoints', () => {
    const now = 1000;
    const riders = createSimulatedRiders(50, 1, DISTRICTS, now);
    expect(riders).toHaveLength(50);
    for (const rider of riders) {
      expect(typeof rider.color).toBe('string');
      expect(rider.color).toMatch(/^hsl/);
      const inSomeDistrict = DISTRICTS.some((d) => isPointInDistrict(rider.to, d));
      expect(inSomeDistrict).toBe(true);
      expect(rider.waypointChosenAt).toBe(now);
    }
  });

  it('is deterministic for a fixed seed', () => {
    const a = createSimulatedRiders(20, 99, DISTRICTS, 0);
    const b = createSimulatedRiders(20, 99, DISTRICTS, 0);
    expect(a).toEqual(b);
  });
});

function distanceMeters(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const metersPerDegreeLat = 111_000;
  const metersPerDegreeLon = metersPerDegreeLat * Math.cos((a.lat * Math.PI) / 180);
  const dLat = (b.lat - a.lat) * metersPerDegreeLat;
  const dLon = (b.lon - a.lon) * metersPerDegreeLon;
  return Math.sqrt(dLat * dLat + dLon * dLon);
}

describe('stepSimulatedRiders', () => {
  it('only advances riders past their 3-second window', () => {
    const riders = createSimulatedRiders(10, 1, DISTRICTS, 0);
    const stepped = stepSimulatedRiders(riders, 1000, 3000);
    expect(stepped).toEqual(riders);
  });

  it('moves riders a small realistic-riding-pace step, not a teleport, once their window elapses', () => {
    const riders = createSimulatedRiders(10, 1, DISTRICTS, 0);
    const stepped = stepSimulatedRiders(riders, 3500, 3000);
    for (let i = 0; i < riders.length; i++) {
      expect(stepped[i].waypointChosenAt).toBe(3500);
      const traveled = distanceMeters(riders[i].to, stepped[i].to);
      expect(traveled).toBeLessThanOrEqual(70);
    }
  });
});

describe('renderPosition', () => {
  it('matches the lerp progress within the waypoint window and clamps beyond it', () => {
    const rider = { id: 'x', color: 'hsl(0,0%,0%)', from: { lat: 52.2, lon: 21.0 }, to: { lat: 52.3, lon: 21.1 }, waypointChosenAt: 0 };
    expect(renderPosition(rider, 0, 3000)).toEqual({ lat: 52.2, lon: 21.0 });
    expect(renderPosition(rider, 1500, 3000)).toEqual({ lat: 52.25, lon: 21.05 });
    expect(renderPosition(rider, 3000, 3000)).toEqual({ lat: 52.3, lon: 21.1 });
    expect(renderPosition(rider, 9000, 3000)).toEqual({ lat: 52.3, lon: 21.1 });
  });
});
