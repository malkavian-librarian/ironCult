import { describe, expect, it } from 'vitest';
import {
  CYCLE_MS,
  getInvasionState,
  invaderPositions,
  pickNextDistrict,
  type InvasionPhase,
} from '@/lib/demo-sim/invasion-schedule';
import { isPointInDistrict, type DistrictFeature } from '@/lib/demo-sim/waypoints';

const DISTRICT_NAMES = ['alpha', 'beta', 'gamma', 'delta'];

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

const DISTRICTS = DISTRICT_NAMES.map((name, i) => square(name, i * 0.2));

describe('pickNextDistrict', () => {
  it('never repeats a district before every district has appeared once', () => {
    const history: string[] = [];
    for (let i = 0; i < DISTRICT_NAMES.length; i++) {
      const next = pickNextDistrict(history, DISTRICT_NAMES, i);
      expect(history).not.toContain(next);
      history.push(next);
    }
    expect(new Set(history).size).toBe(DISTRICT_NAMES.length);
  });

  it('can repeat only after every district has appeared', () => {
    const next = pickNextDistrict(DISTRICT_NAMES, DISTRICT_NAMES, 42);
    expect(DISTRICT_NAMES).toContain(next);
  });
});

describe('getInvasionState', () => {
  const start = 1_000_000;
  const color = 'hsl(0, 0%, 0%)';

  it('starts spawning with 0 visible invaders', () => {
    const state = getInvasionState(start, start, 'alpha', color);
    expect(state.phase).toBe('spawning');
    expect(state.visibleInvaderCount).toBe(0);
    expect(state.flipped).toBe(false);
  });

  it('has ramped up roughly half the invaders at 10s', () => {
    const state = getInvasionState(start, start + 10_000, 'alpha', color);
    expect(state.phase).toBe('spawning');
    expect(state.visibleInvaderCount).toBeGreaterThanOrEqual(9);
    expect(state.visibleInvaderCount).toBeLessThanOrEqual(11);
  });

  it('is dwelling with all 20 visible right after the spawn window', () => {
    const state = getInvasionState(start, start + 20_000, 'alpha', color);
    expect(state.phase).toBe('dwelling');
    expect(state.visibleInvaderCount).toBe(20);
    expect(state.flipped).toBe(false);
  });

  it('is still dwelling, not flipped, at 79s', () => {
    const state = getInvasionState(start, start + 79_000, 'alpha', color);
    expect(state.phase).toBe('dwelling');
    expect(state.flipped).toBe(false);
  });

  it('flips at 80s and stays flipped for the rest of the cycle', () => {
    const at80 = getInvasionState(start, start + 80_000, 'alpha', color);
    expect(at80.phase).toBe<InvasionPhase>('flipped');
    expect(at80.flipped).toBe(true);

    const nearCycleEnd = getInvasionState(start, start + CYCLE_MS - 1, 'alpha', color);
    expect(nearCycleEnd.phase).toBe('flipped');
    expect(nearCycleEnd.flipped).toBe(true);
  });
});

describe('invaderPositions', () => {
  it('returns count points inside the target district', () => {
    const points = invaderPositions('beta', DISTRICTS, 20, 5);
    expect(points).toHaveLength(20);
    const betaFeature = DISTRICTS.find((d) => d.properties.name === 'beta')!;
    for (const point of points) {
      expect(isPointInDistrict(point, betaFeature)).toBe(true);
    }
  });

  it('is deterministic for a fixed cycle seed', () => {
    const a = invaderPositions('gamma', DISTRICTS, 20, 11);
    const b = invaderPositions('gamma', DISTRICTS, 20, 11);
    expect(a).toEqual(b);
  });
});
