import { describe, expect, it } from 'vitest';
import { crewColor, crewHue, UNCREWED_COLOR } from '@/lib/crew-color';

describe('crew color helper', () => {
  it('returns a stable hue for the same crew id', () => {
    expect(crewHue('crew-alpha')).toBe(crewHue('crew-alpha'));
  });

  it('spreads different crew ids across different hues', () => {
    expect(crewHue('crew-alpha')).not.toBe(crewHue('crew-bravo'));
  });

  it('returns valid CSS hsl colors and a neutral fallback', () => {
    expect(crewColor('crew-alpha')).toMatch(/^hsl\(\d+, \d+%, \d+%\)$/);
    expect(crewColor(null)).toBe(UNCREWED_COLOR);
    expect(crewColor(undefined)).toBe(UNCREWED_COLOR);
    expect(crewColor(null, 32)).toBe('hsl(0, 0%, 32%)');
  });
});
