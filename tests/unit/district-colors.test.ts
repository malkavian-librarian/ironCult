import { describe, expect, it } from 'vitest';
import districts from '@/public/map/warsaw-districts.json';
import { DISTRICT_COLORS, DISTRICT_FILL_OPACITY, districtColor } from '@/lib/map/district-colors';

type DistrictCollection = { features: Array<{ properties: { name: string } }> };

function hue(color: string): number {
  const match = /^hsl\((\d+), \d+%, \d+%\)$/.exec(color);
  if (!match) throw new Error(`Invalid HSL color: ${color}`);
  return Number(match[1]);
}

function circularHueDistance(a: number, b: number): number {
  const diff = Math.abs(a - b);
  return Math.min(diff, 360 - diff);
}

describe('district color palette', () => {
  it('has a named color for every Warsaw district', () => {
    const names = (districts as DistrictCollection).features.map((feature) => feature.properties.name);

    expect(Object.keys(DISTRICT_COLORS).sort()).toEqual([...names].sort());
  });

  it('uses saturated, visibly distinct district colors and a neutral fallback', () => {
    const colors = Object.values(DISTRICT_COLORS);
    const hues = colors.map(hue);

    expect(new Set(colors).size).toBe(colors.length);
    expect(colors.every((color) => /^hsl\(\d+, (7[8-9]|[89]\d)%, (4[2-9]|5\d|6[0-2])%\)$/.test(color))).toBe(true);
    for (let i = 0; i < hues.length; i++) {
      for (let j = i + 1; j < hues.length; j++) {
        expect(circularHueDistance(hues[i], hues[j])).toBeGreaterThanOrEqual(12);
      }
    }
    expect(districtColor('srodmiescie')).toBe(DISTRICT_COLORS.srodmiescie);
    expect(districtColor('missing')).toBe('hsl(0, 0%, 26%)');
    expect(districtColor(null)).toBe('hsl(0, 0%, 26%)');
    expect(districtColor(undefined)).toBe('hsl(0, 0%, 26%)');
    expect(DISTRICT_FILL_OPACITY).toBeGreaterThanOrEqual(0.84);
  });
});
