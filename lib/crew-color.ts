const CREW_SATURATION = 78;
const CREW_LIGHTNESS = 48;

export const UNCREWED_COLOR = 'hsl(0, 0%, 58%)';

export function crewHue(crewId: string): number {
  let hash = 2166136261;
  for (let i = 0; i < crewId.length; i++) {
    hash ^= crewId.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(Math.imul(hash, 137)) % 360;
}

export function crewColor(crewId: string | null | undefined, lightness = CREW_LIGHTNESS): string {
  if (!crewId) return lightness === CREW_LIGHTNESS ? UNCREWED_COLOR : `hsl(0, 0%, ${lightness}%)`;
  return `hsl(${crewHue(crewId)}, ${CREW_SATURATION}%, ${lightness}%)`;
}
