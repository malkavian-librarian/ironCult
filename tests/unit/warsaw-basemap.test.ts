import { open } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { PMTiles, type RangeResponse, type Source } from 'pmtiles';
import districts from '@/public/map/warsaw-districts.json';
import { createWarsawStyle, WARSAW_BASEMAP_SOURCE_ID, WARSAW_BOUNDS } from '@/lib/map/warsaw-style';

type Position = [number, number];
type Geometry = { coordinates: unknown };
type DistrictFeature = { geometry: Geometry };
type DistrictCollection = { features: DistrictFeature[] };
type Bounds = [number, number, number, number];

class LocalPmtilesSource implements Source {
  constructor(private readonly filename: string) {}

  getKey() {
    return this.filename;
  }

  async getBytes(offset: number, length: number): Promise<RangeResponse> {
    const file = await open(this.filename, 'r');
    try {
      const buffer = Buffer.alloc(length);
      const { bytesRead } = await file.read(buffer, 0, length, offset);
      const bytes = buffer.subarray(0, bytesRead);
      return { data: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) };
    } finally {
      await file.close();
    }
  }
}

function walkPositions(input: unknown, visit: (position: Position) => void) {
  if (!Array.isArray(input)) return;
  if (typeof input[0] === 'number' && typeof input[1] === 'number') {
    visit(input as Position);
    return;
  }
  for (const item of input) walkPositions(item, visit);
}

function districtBounds(): Bounds {
  const bounds: Bounds = [Infinity, Infinity, -Infinity, -Infinity];
  for (const feature of (districts as DistrictCollection).features) {
    walkPositions(feature.geometry.coordinates, ([lon, lat]) => {
      bounds[0] = Math.min(bounds[0], lon);
      bounds[1] = Math.min(bounds[1], lat);
      bounds[2] = Math.max(bounds[2], lon);
      bounds[3] = Math.max(bounds[3], lat);
    });
  }
  return bounds;
}

function expectCovers(outer: Bounds, inner: Bounds) {
  expect(outer[0]).toBeLessThanOrEqual(inner[0]);
  expect(outer[1]).toBeLessThanOrEqual(inner[1]);
  expect(outer[2]).toBeGreaterThanOrEqual(inner[2]);
  expect(outer[3]).toBeGreaterThanOrEqual(inner[3]);
}

describe('Warsaw basemap archive', () => {
  it('uses the local PMTiles source in the MapLibre style', () => {
    const source = createWarsawStyle().sources[WARSAW_BASEMAP_SOURCE_ID];
    expect(source).toMatchObject({
      type: 'vector',
      url: 'pmtiles:///map/warsaw.pmtiles',
      bounds: WARSAW_BOUNDS,
    });
  });

  it('covers the full Warsaw district GeoJSON extent', async () => {
    const archive = new PMTiles(new LocalPmtilesSource(path.join(process.cwd(), 'public/map/warsaw.pmtiles')));
    const header = await archive.getHeader();
    const archiveBounds: Bounds = [header.minLon, header.minLat, header.maxLon, header.maxLat];

    expectCovers(WARSAW_BOUNDS, districtBounds());
    expectCovers(archiveBounds, districtBounds());
  });
});
