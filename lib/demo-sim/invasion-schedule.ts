import { districtColor } from '@/lib/map/district-colors';
import { createRandom, randomPointInDistrict, type DistrictFeature, type LatLon } from './waypoints';

export const CYCLE_MS = 15 * 60 * 1000;
export const SPAWN_WINDOW_MS = 20 * 1000;
export const DWELL_MS = 60 * 1000;
export const INVADER_COUNT = 20;

export type InvasionPhase = 'spawning' | 'dwelling' | 'flipped';

export type InvasionState = {
  districtName: string;
  invaderColor: string;
  phase: InvasionPhase;
  visibleInvaderCount: number;
  flipped: boolean;
};

function shuffled(names: string[], random: () => number): string[] {
  const arr = [...names];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function pickNextDistrict(history: string[], allDistrictNames: string[], randomSeed: number): string {
  const random = createRandom(randomSeed);
  const remaining = allDistrictNames.filter((name) => !history.includes(name));
  const pool = remaining.length > 0 ? remaining : allDistrictNames;
  const order = shuffled(pool, random);
  return order[0];
}

export function pickInvaderColor(districtName: string, allDistrictNames: string[], randomSeed: number): string {
  const random = createRandom(randomSeed + 1);
  const others = allDistrictNames.filter((name) => name !== districtName);
  const pick = others[Math.floor(random() * others.length)] ?? districtName;
  return districtColor(pick);
}

export function getInvasionState(
  cycleStartedAt: number,
  now: number,
  districtName: string,
  invaderColor: string
): InvasionState {
  const elapsed = Math.max(0, now - cycleStartedAt);
  const flipAt = SPAWN_WINDOW_MS + DWELL_MS;

  let phase: InvasionPhase;
  let visibleInvaderCount: number;
  if (elapsed < SPAWN_WINDOW_MS) {
    phase = 'spawning';
    visibleInvaderCount = Math.floor((elapsed / SPAWN_WINDOW_MS) * INVADER_COUNT);
  } else if (elapsed < flipAt) {
    phase = 'dwelling';
    visibleInvaderCount = INVADER_COUNT;
  } else {
    phase = 'flipped';
    visibleInvaderCount = INVADER_COUNT;
  }

  return {
    districtName,
    invaderColor,
    phase,
    visibleInvaderCount,
    flipped: phase === 'flipped',
  };
}

export function invaderPositions(
  districtName: string,
  districts: DistrictFeature[],
  count: number,
  cycleSeed: number
): LatLon[] {
  const feature = districts.find((d) => d.properties.name === districtName);
  if (!feature) return [];
  const random = createRandom(cycleSeed + 7);
  const positions: LatLon[] = [];
  for (let i = 0; i < count; i++) {
    positions.push(randomPointInDistrict(feature, random));
  }
  return positions;
}
