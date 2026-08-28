import { readFileSync, writeFileSync } from 'fs';

const raw = JSON.parse(readFileSync('public/map/poland-voivodeships-raw.json', 'utf-8'));

const NAME_KEYS = ['nazwa', 'name', 'NAME_1', 'JPT_NAZWA_'];

function findName(props) {
  for (const key of NAME_KEYS) {
    if (props[key]) return props[key];
  }
  throw new Error(`No name property found among keys: ${Object.keys(props).join(', ')}`);
}

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
    .replace(/ź|ż/g, 'z');
}

const normalized = {
  type: 'FeatureCollection',
  features: raw.features.map((f) => ({
    type: 'Feature',
    properties: { name: stripDiacritics(findName(f.properties)) },
    geometry: f.geometry,
  })),
};

if (normalized.features.length !== 16) {
  throw new Error(`Expected 16 voivodeships, got ${normalized.features.length}`);
}

writeFileSync('public/map/poland-voivodeships.json', JSON.stringify(normalized));
console.log('Wrote', normalized.features.length, 'voivodeships:', normalized.features.map(f => f.properties.name).join(', '));
