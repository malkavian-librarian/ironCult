import type { StyleSpecification } from 'maplibre-gl';

export const WARSAW_BOUNDS: [number, number, number, number] = [20.8, 52.09, 21.3, 52.38];

export const WARSAW_CENTER: [number, number] = [21.05, 52.23];
export const WARSAW_ZOOM = 11.35;
export const WARSAW_BASEMAP_SOURCE_ID = 'warsaw-basemap';

export function createWarsawStyle(): StyleSpecification {
  return {
    version: 8,
    sources: {
      [WARSAW_BASEMAP_SOURCE_ID]: {
        type: 'vector',
        url: 'pmtiles:///map/warsaw.pmtiles',
        bounds: WARSAW_BOUNDS,
        attribution: '<a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap</a>',
      },
    },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': '#11110f' } },
      {
        id: 'earth',
        type: 'fill',
        source: WARSAW_BASEMAP_SOURCE_ID,
        'source-layer': 'earth',
        paint: { 'fill-color': '#dedbd2' },
      },
      {
        id: 'landuse-muted',
        type: 'fill',
        source: WARSAW_BASEMAP_SOURCE_ID,
        'source-layer': 'landuse',
        paint: {
          'fill-color': [
            'match',
            ['get', 'kind'],
            ['park', 'forest', 'wood', 'grass'],
            '#c9cec5',
            ['industrial', 'commercial'],
            '#c9c4b9',
            '#d7d3ca',
          ],
          'fill-opacity': 0.78,
        },
      },
      {
        id: 'water',
        type: 'fill',
        source: WARSAW_BASEMAP_SOURCE_ID,
        'source-layer': 'water',
        paint: { 'fill-color': '#858a88', 'fill-opacity': 0.9 },
      },
      {
        id: 'boundaries',
        type: 'line',
        source: WARSAW_BASEMAP_SOURCE_ID,
        'source-layer': 'boundaries',
        paint: { 'line-color': '#232320', 'line-opacity': 0.28, 'line-width': 0.7 },
      },
      {
        id: 'minor-roads',
        type: 'line',
        source: WARSAW_BASEMAP_SOURCE_ID,
        'source-layer': 'roads',
        filter: ['!', ['in', ['get', 'kind'], ['literal', ['highway', 'major_road']]]],
        paint: {
          'line-color': '#6d6a63',
          'line-opacity': ['interpolate', ['linear'], ['zoom'], 11, 0.25, 14, 0.85],
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.4, 14, 1.35],
        },
      },
      {
        id: 'major-roads-casing',
        type: 'line',
        source: WARSAW_BASEMAP_SOURCE_ID,
        'source-layer': 'roads',
        filter: ['in', ['get', 'kind'], ['literal', ['highway', 'major_road']]],
        paint: {
          'line-color': '#25231f',
          'line-opacity': 0.78,
          'line-width': ['interpolate', ['linear'], ['zoom'], 9, 1.8, 14, 5.8],
        },
      },
      {
        id: 'major-roads',
        type: 'line',
        source: WARSAW_BASEMAP_SOURCE_ID,
        'source-layer': 'roads',
        filter: ['in', ['get', 'kind'], ['literal', ['highway', 'major_road']]],
        paint: {
          'line-color': '#4f4d47',
          'line-opacity': 0.95,
          'line-width': ['interpolate', ['linear'], ['zoom'], 9, 0.8, 14, 3.2],
        },
      },
      {
        id: 'buildings',
        type: 'fill',
        source: WARSAW_BASEMAP_SOURCE_ID,
        'source-layer': 'buildings',
        minzoom: 12,
        paint: {
          'fill-color': '#b8b3a8',
          'fill-opacity': ['interpolate', ['linear'], ['zoom'], 12, 0.28, 15, 0.74],
          'fill-outline-color': '#7b776f',
        },
      },
    ],
  };
}
