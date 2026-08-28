import { readFileSync, writeFileSync } from 'fs';

const raw = JSON.parse(readFileSync('public/map/warsaw-districts-raw.json', 'utf-8'));

function stripDiacritics(s) {
  return s
    .toLowerCase()
    .replace(/ł/g, 'l')
    .replace(/ą/g, 'a')
    .replace(/ć/g, 'c')
    .replace(/ę/g, 'e')
    .replace(/ń/g, 'n')
    .replace(/ó/g, 'o')
    .replace(/ś/g, 's')
    .replace(/ź|ż/g, 'z')
    .replace(/\s+/g, '-');
}

const districtFeatures = raw.features.filter((f) => f.properties.name !== 'Warszawa');

const normalized = {
  type: 'FeatureCollection',
  features: districtFeatures.map((f) => ({
    type: 'Feature',
    properties: { name: stripDiacritics(f.properties.name) },
    geometry: f.geometry,
  })),
};

if (normalized.features.length !== 18) {
  throw new Error(`Expected 18 Warsaw districts, got ${normalized.features.length}`);
}

writeFileSync('public/map/warsaw-districts.json', JSON.stringify(normalized));
console.log('Wrote', normalized.features.length, 'districts:', normalized.features.map(f => f.properties.name).join(', '));
