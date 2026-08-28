type CrewCount = { crewId: string; crewName: string; district: string; count: number };
type Owner = { crewId: string; crewName: string; count: number };

export function pickOwner(counts: CrewCount[]): Record<string, Owner> {
  const result: Record<string, Owner> = {};
  for (const row of counts) {
    const current = result[row.district];
    if (!current || row.count > current.count) {
      result[row.district] = { crewId: row.crewId, crewName: row.crewName, count: row.count };
    }
  }
  return result;
}
