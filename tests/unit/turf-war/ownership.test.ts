import { describe, it, expect } from 'vitest';
import { pickOwner } from '@/lib/turf-war/ownership';

describe('pickOwner', () => {
  it('picks the crew with the highest count per district', () => {
    const result = pickOwner([
      { crewId: 'a', crewName: 'Alpha', district: 'srodmiescie', count: 3 },
      { crewId: 'b', crewName: 'Beta', district: 'srodmiescie', count: 7 },
      { crewId: 'a', crewName: 'Alpha', district: 'mokotow', count: 2 },
    ]);
    expect(result.srodmiescie).toEqual({ crewId: 'b', crewName: 'Beta', count: 7 });
    expect(result.mokotow).toEqual({ crewId: 'a', crewName: 'Alpha', count: 2 });
  });

  it('omits districts with no entries', () => {
    const result = pickOwner([{ crewId: 'a', crewName: 'Alpha', district: 'wola', count: 1 }]);
    expect(result.srodmiescie).toBeUndefined();
  });

  it('breaks ties by keeping the first entry seen', () => {
    const result = pickOwner([
      { crewId: 'a', crewName: 'Alpha', district: 'praga-polnoc', count: 4 },
      { crewId: 'b', crewName: 'Beta', district: 'praga-polnoc', count: 4 },
    ]);
    expect(result['praga-polnoc'].crewId).toBe('a');
  });
});
