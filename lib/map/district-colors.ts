export const DISTRICT_FILL_OPACITY = 0.94;

export const DISTRICT_COLORS: Record<string, string> = {
  bemowo: 'hsl(4, 46%, 72%)',
  bialoleka: 'hsl(24, 52%, 74%)',
  bielany: 'hsl(44, 54%, 76%)',
  mokotow: 'hsl(64, 48%, 74%)',
  ochota: 'hsl(84, 44%, 72%)',
  'praga-polnoc': 'hsl(104, 42%, 72%)',
  'praga-poludnie': 'hsl(124, 40%, 70%)',
  rembertow: 'hsl(144, 42%, 70%)',
  srodmiescie: 'hsl(164, 44%, 72%)',
  targowek: 'hsl(184, 46%, 74%)',
  ursus: 'hsl(204, 50%, 76%)',
  ursynow: 'hsl(224, 48%, 76%)',
  wawer: 'hsl(244, 46%, 78%)',
  wesola: 'hsl(264, 44%, 78%)',
  wilanow: 'hsl(284, 46%, 76%)',
  wlochy: 'hsl(304, 48%, 76%)',
  wola: 'hsl(324, 52%, 76%)',
  zoliborz: 'hsl(344, 50%, 74%)',
};

export function districtColor(name: string | null | undefined): string {
  if (!name) return 'hsl(0, 0%, 26%)';
  return DISTRICT_COLORS[name] ?? 'hsl(0, 0%, 26%)';
}
