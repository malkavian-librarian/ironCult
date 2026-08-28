import { describe, expect, it } from 'vitest';
import districts from '@/public/map/warsaw-districts.json';
import { DISTRICT_COLORS, DISTRICT_FILL_OPACITY, districtColor } from '@/lib/map/district-colors';

type DistrictCollection = { features: Array<{ properties: { name: string } }> };

function parseHsl(color: string): { hue: number; saturation: number; lightness: number } {
  const match = /^hsl\((\d+), (\d+)%, (\d+)%\)$/.exec(color);
  if (!match) throw new Error(`Invalid HSL color: ${color}`);
  return {
    hue: Number(match[1]),
    saturation: Number(match[2]),
    lightness: Number(match[3]),
  };
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

  it('uses dark cyberpunk HUD district colors with low fill opacity (streets/bikers visible) and a neutral fallback', () => {
    const colors = Object.values(DISTRICT_COLORS);
    const parsedColors = colors.map(parseHsl);
    const hues = parsedColors.map((color) => color.hue);

    expect(new Set(colors).size).toBe(colors.length);
    expect(parsedColors.every((color) => color.saturation >= 82)).toBe(true);
    expect(parsedColors.every((color) => color.lightness >= 32 && color.lightness <= 48)).toBe(true);
    expect(hues.some((hueValue) => hueValue >= 172 && hueValue <= 196)).toBe(true);
    expect(hues.some((hueValue) => hueValue >= 292 && hueValue <= 320)).toBe(true);
    expect(hues.some((hueValue) => hueValue >= 52 && hueValue <= 84)).toBe(true);
    expect(hues.some((hueValue) => hueValue >= 108 && hueValue <= 150)).toBe(true);
    for (let i = 0; i < hues.length; i++) {
      for (let j = i + 1; j < hues.length; j++) {
        expect(circularHueDistance(hues[i], hues[j])).toBeGreaterThanOrEqual(12);
      }
    }
    expect(districtColor('srodmiescie')).toBe(DISTRICT_COLORS.srodmiescie);
    expect(districtColor('missing')).toBe('hsl(0, 0%, 26%)');
    expect(districtColor(null)).toBe('hsl(0, 0%, 26%)');
    expect(districtColor(undefined)).toBe('hsl(0, 0%, 26%)');
    expect(DISTRICT_FILL_OPACITY).toBeLessThanOrEqual(0.35);
  });
});
