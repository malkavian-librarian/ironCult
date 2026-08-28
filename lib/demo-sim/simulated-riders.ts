import { districtColor } from '@/lib/map/district-colors';
import {
  createRandom,
  lerpLatLon,
  randomNearbyPoint,
  randomPointInDistrict,
  type DistrictFeature,
  type LatLon,
} from './waypoints';

export type SimRider = {
  id: string;
  color: string;
  from: LatLon;
  to: LatLon;
  waypointChosenAt: number;
};

const GUEST_FRACTION = 0.15;
// City-riding pace: a real bike in Warsaw traffic covers well under 100m in 3 seconds.
// Average ~30-35m per 3s step reads as normal riding speed at map scale, not a teleport.
const MAX_STEP_METERS = 70;

export function createSimulatedRiders(count: number, seed: number, districts: DistrictFeature[], now = Date.now()): SimRider[] {
  const random = createRandom(seed);
  const riders: SimRider[] = [];
  for (let i = 0; i < count; i++) {
    const homeDistrict = districts[Math.floor(random() * districts.length)];
    const isGuest = random() < GUEST_FRACTION;
    const colorDistrict = isGuest ? districts[Math.floor(random() * districts.length)] : homeDistrict;
    const color = districtColor(colorDistrict.properties.name);
    const point = randomPointInDistrict(homeDistrict, random);
    riders.push({
      id: `sim-${i}`,
      color,
      from: point,
      to: point,
      waypointChosenAt: now,
    });
  }
  return riders;
}

export function stepSimulatedRiders(
  riders: SimRider[],
  now: number,
  waypointIntervalMs = 3000,
  random: () => number = Math.random,
  maxStepMeters = MAX_STEP_METERS
): SimRider[] {
  return riders.map((rider) => {
    if (now - rider.waypointChosenAt < waypointIntervalMs) return rider;
    const currentPosition = renderPosition(rider, rider.waypointChosenAt + waypointIntervalMs, waypointIntervalMs);
    return {
      ...rider,
      from: currentPosition,
      to: randomNearbyPoint(currentPosition, maxStepMeters, random),
      waypointChosenAt: now,
    };
  });
}

export function renderPosition(rider: SimRider, now: number, waypointIntervalMs = 3000): LatLon {
  const t = (now - rider.waypointChosenAt) / waypointIntervalMs;
  return lerpLatLon(rider.from, rider.to, t);
}
