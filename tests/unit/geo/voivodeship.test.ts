import { describe, it, expect } from 'vitest';
import { findVoivodeship, findWarsawDistrict } from '@/lib/geo/voivodeship';

describe('findVoivodeship', () => {
  it('finds Mazowieckie for Warsaw coordinates', () => {
    expect(findVoivodeship(52.2297, 21.0122)).toBe('mazowieckie');
  });

  it('finds Malopolskie for Krakow coordinates', () => {
    expect(findVoivodeship(50.0647, 19.9450)).toBe('malopolskie');
  });

  it('returns null for coordinates outside Poland', () => {
    expect(findVoivodeship(48.8566, 2.3522)).toBeNull(); // Paris
  });
});

describe('findWarsawDistrict', () => {
  it('finds Srodmiescie for central Warsaw coordinates', () => {
    expect(findWarsawDistrict(52.2297, 21.0122)).toBe('srodmiescie');
  });

  it('returns null for coordinates outside Warsaw', () => {
    expect(findWarsawDistrict(50.0647, 19.9450)).toBeNull(); // Krakow
  });
});
