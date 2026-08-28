export const DISTRICT_FILL_OPACITY = 0.28;

// Dark neon fills are intentional: the map should read like a cyberpunk HUD, not pastel zones.
export const DISTRICT_COLORS: Record<string, string> = {
  bemowo: 'hsl(176, 96%, 38%)',
  bialoleka: 'hsl(194, 98%, 42%)',
  bielany: 'hsl(212, 96%, 44%)',
  mokotow: 'hsl(232, 92%, 46%)',
  ochota: 'hsl(252, 94%, 45%)',
  'praga-polnoc': 'hsl(274, 96%, 43%)',
  'praga-poludnie': 'hsl(296, 98%, 44%)',
  rembertow: 'hsl(316, 96%, 42%)',
  srodmiescie: 'hsl(336, 98%, 43%)',
  targowek: 'hsl(356, 94%, 44%)',
  ursus: 'hsl(18, 96%, 42%)',
  ursynow: 'hsl(38, 98%, 43%)',
  wawer: 'hsl(58, 100%, 42%)',
  wesola: 'hsl(78, 98%, 40%)',
  wilanow: 'hsl(100, 96%, 38%)',
  wlochy: 'hsl(122, 96%, 37%)',
  wola: 'hsl(144, 94%, 38%)',
  zoliborz: 'hsl(164, 96%, 37%)',
};

export function districtColor(name: string | null | undefined): string {
  if (!name) return 'hsl(0, 0%, 26%)';
  return DISTRICT_COLORS[name] ?? 'hsl(0, 0%, 26%)';
}
