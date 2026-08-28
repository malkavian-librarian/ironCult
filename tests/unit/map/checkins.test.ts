import { describe, expect, it } from 'vitest';
import { countNearbyRiders, distanceMeters } from '@/lib/map/checkins';

describe('map check-in helpers', () => {
  it('measures close Warsaw points under the event radius', () => {
    const event = { lat: 52.22769, lon: 21.00481 };
    const rider = { lat: 52.228, lon: 21.005 };
    expect(distanceMeters(event, rider)).toBeLessThan(50);
  });

  it('counts riders inside 220 meters and excludes farther riders', () => {
    const event = { lat: 52.22769, lon: 21.00481 };
    const riders = [
      { lat: 52.228, lon: 21.005 },
      { lat: 52.2271, lon: 21.0042 },
      { lat: 52.238, lon: 21.02 },
    ];
    expect(countNearbyRiders(event, riders)).toBe(2);
  });
});
