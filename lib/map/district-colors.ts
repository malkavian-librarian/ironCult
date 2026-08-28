export const DISTRICT_FILL_OPACITY = 0.84;

export const DISTRICT_COLORS: Record<string, string> = {
  bemowo: 'hsl(5, 88%, 52%)',
  bialoleka: 'hsl(25, 92%, 50%)',
  bielany: 'hsl(45, 94%, 50%)',
  mokotow: 'hsl(65, 86%, 48%)',
  ochota: 'hsl(85, 82%, 46%)',
  'praga-polnoc': 'hsl(105, 80%, 44%)',
  'praga-poludnie': 'hsl(125, 78%, 44%)',
  rembertow: 'hsl(145, 80%, 42%)',
  srodmiescie: 'hsl(165, 84%, 44%)',
  targowek: 'hsl(185, 88%, 48%)',
  ursus: 'hsl(205, 90%, 52%)',
  ursynow: 'hsl(225, 88%, 56%)',
  wawer: 'hsl(245, 86%, 60%)',
  wesola: 'hsl(265, 84%, 60%)',
  wilanow: 'hsl(285, 84%, 58%)',
  wlochy: 'hsl(305, 86%, 56%)',
  wola: 'hsl(325, 90%, 56%)',
  zoliborz: 'hsl(345, 88%, 54%)',
};

export function districtColor(name: string | null | undefined): string {
  if (!name) return 'hsl(0, 0%, 26%)';
  return DISTRICT_COLORS[name] ?? 'hsl(0, 0%, 26%)';
}
