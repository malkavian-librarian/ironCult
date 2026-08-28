'use client';
import { useEffect, useRef, useState } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { crewColor } from '@/lib/crew-color';
import { DISTRICT_FILL_OPACITY, districtColor } from '@/lib/map/district-colors';
import { createWarsawStyle, WARSAW_BASEMAP_SOURCE_ID, WARSAW_CENTER, WARSAW_ZOOM } from '@/lib/map/warsaw-style';

type PresenceRow = {
  riderId: string;
  displayName: string;
  lat: number;
  lon: number;
  crewId: string | null;
  crewName: string | null;
  motorcycle?: string;
  rank?: string;
  clubName?: string;
  avatarUrl?: string;
  markerColor?: string;
  isCurrentDemoUser?: boolean;
};
type EventRow = {
  id: string;
  title: string;
  type: string;
  lat: number;
  lon: number;
  happeningNow: boolean;
  district?: string | null;
  districtColor?: string;
  checkedInCount?: number;
};
type MapLibreModule = typeof import('maplibre-gl');
type MapLibreMap = import('maplibre-gl').Map;
type MapLibreMarker = import('maplibre-gl').Marker;
type MapLibrePopup = import('maplibre-gl').Popup;
type MapLibreGeoJSONSource = import('maplibre-gl').GeoJSONSource;
type PmtilesModule = typeof import('pmtiles');
type PmtilesProtocol = InstanceType<PmtilesModule['Protocol']>;

type GeoFeature = { properties: Record<string, unknown> & { name: string } };
type GeoCollection = { type: 'FeatureCollection'; features: GeoFeature[] };
type Owner = { crewId: string; crewName: string; count: number };
type TurfWarData = Parameters<MapLibreGeoJSONSource['setData']>[0];

let pmtilesProtocol: PmtilesProtocol | null = null;

function ensurePmtilesProtocol(maplibregl: MapLibreModule, Protocol: PmtilesModule['Protocol']) {
  if (pmtilesProtocol) return;
  const protocol = new Protocol();
  try {
    maplibregl.addProtocol('pmtiles', protocol.tile);
    pmtilesProtocol = protocol;
  } catch (err) {
    if (String(err).match(/already|exist|registered/i)) return;
    throw err;
  }
}

function escapeHtml(text: string | null | undefined): string {
  return (text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function createRiderMarkerElement(rider: PresenceRow): HTMLButtonElement {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = rider.isCurrentDemoUser ? 'presence-dot presence-dot-self' : 'presence-dot';
  el.dataset.riderId = rider.riderId;
  el.dataset.crewId = rider.crewId ?? 'guest';
  el.dataset.currentDemoUser = rider.isCurrentDemoUser ? 'true' : 'false';
  el.style.setProperty('--presence-color', rider.markerColor || crewColor(rider.crewId));
  el.setAttribute('aria-label', `Open rider details for ${rider.displayName}`);
  return el;
}

function createEventMarkerElement(event: EventRow): HTMLButtonElement {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = event.happeningNow ? 'event-marker event-marker-live' : 'event-marker';
  el.dataset.eventId = event.id;
  el.style.setProperty('--event-color', event.districtColor || 'var(--visor)');
  el.setAttribute('aria-label', `Open event details for ${event.title}`);
  return el;
}

function riderPopupHtml(rider: PresenceRow): string {
  const rank = rider.rank ?? 'Rider';
  const club = rider.clubName ?? rider.crewName ?? 'Guest rider';
  const motorcycle = rider.motorcycle ?? 'Motorcycle not set';
  const avatar = rider.avatarUrl
    ? `<img alt="" src="${escapeHtml(rider.avatarUrl)}" />`
    : '';
  return `<article data-testid="rider-card" class="map-card rider-card">
    ${avatar}
    <p class="map-card-kicker">${escapeHtml(rank)} - ${escapeHtml(club)}</p>
    <h3>${escapeHtml(rider.displayName)}</h3>
    <dl>
      <dt>ID</dt><dd>${escapeHtml(rider.riderId)}</dd>
      <dt>Motorcycle</dt><dd>${escapeHtml(motorcycle)}</dd>
    </dl>
  </article>`;
}

function eventPopupHtml(event: EventRow): string {
  const district = event.district ?? 'Unknown';
  const kicker = `${district}${event.happeningNow ? ' - happening now' : ''}`;
  const checkedIn = event.checkedInCount ?? 0;
  return `<article data-testid="event-card" class="map-card event-card">
    <p class="map-card-kicker">${escapeHtml(kicker)}</p>
    <h3>${escapeHtml(event.title)}</h3>
    <dl>
      <dt>Type</dt><dd>${escapeHtml(event.type)}</dd>
      <dt>Checked in</dt><dd>${checkedIn} riders</dd>
    </dl>
  </article>`;
}

export function LiveMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const maplibreRef = useRef<MapLibreModule | null>(null);
  const markersRef = useRef<MapLibreMarker[]>([]);
  const [presenceRows, setPresenceRows] = useState<PresenceRow[]>([]);
  const [eventRows, setEventRows] = useState<EventRow[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [basemapLoaded, setBasemapLoaded] = useState(false);
  const [turfLoaded, setTurfLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let map: MapLibreMap | null = null;

    async function init() {
      const [maplibregl, { Protocol }]: [MapLibreModule, PmtilesModule] = await Promise.all([
        import('maplibre-gl'),
        import('pmtiles'),
      ]);
      if (cancelled || !containerRef.current) return;
      maplibregl.setWorkerUrl('/maplibre-gl-worker.mjs');
      ensurePmtilesProtocol(maplibregl, Protocol);
      map = new maplibregl.Map({
        container: containerRef.current,
        style: createWarsawStyle(),
        center: WARSAW_CENTER,
        zoom: WARSAW_ZOOM,
        touchPitch: false,
        dragRotate: false,
      });
      maplibreRef.current = maplibregl;
      mapRef.current = map;
      setMapReady(true);
      map.once('load', () => {
        setMapLoaded(true);
        setBasemapLoaded(map?.isSourceLoaded(WARSAW_BASEMAP_SOURCE_ID) ?? false);
      });
      map.on('sourcedata', (event) => {
        if (event.sourceId === WARSAW_BASEMAP_SOURCE_ID) {
          setBasemapLoaded(map?.isSourceLoaded(WARSAW_BASEMAP_SOURCE_ID) ?? false);
        }
      });
    }

    init().catch(() => {
      // maplibre failed to load — map stays absent rather than crashing the page
    });

    return () => {
      cancelled = true;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map?.remove();
      mapRef.current = null;
      maplibreRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch('/api/presence');
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) setPresenceRows(data);
      } catch {
        // transient network error — next poll retries
      }
    }
    poll();
    const interval = setInterval(poll, 10000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/events')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => { if (!cancelled && Array.isArray(data)) setEventRows(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const maplibregl = maplibreRef.current;
    if (!map || !maplibregl || !mapLoaded) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    for (const rider of presenceRows) {
      const el = createRiderMarkerElement(rider);
      const popup = new maplibregl.Popup({ maxWidth: '320px', closeButton: true }).setHTML(riderPopupHtml(rider));
      markersRef.current.push(
        new maplibregl.Marker({ element: el }).setLngLat([rider.lon, rider.lat]).setPopup(popup).addTo(map)
      );
    }

    for (const event of eventRows) {
      const el = createEventMarkerElement(event);
      const popup = new maplibregl.Popup({ maxWidth: '320px', closeButton: true }).setHTML(eventPopupHtml(event));
      markersRef.current.push(
        new maplibregl.Marker({ element: el }).setLngLat([event.lon, event.lat]).setPopup(popup).addTo(map)
      );
    }
  }, [presenceRows, eventRows, mapReady, mapLoaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    let cancelled = false;

    async function refreshTurfWar() {
      try {
        const m = mapRef.current;
        if (!m || cancelled) return;
        const [geoRes, ownersRes] = await Promise.all([
          fetch('/map/warsaw-districts.json'),
          fetch('/api/turf-war'),
        ]);
        if (!geoRes.ok || !ownersRes.ok) return;
        const geo = (await geoRes.json()) as GeoCollection;
        const owners = (await ownersRes.json()) as Record<string, Owner>;
        if (cancelled || !mapRef.current) return;

        const colored = {
          ...geo,
          features: geo.features.map((f) => {
            const owner = owners[f.properties.name as string];
            return {
              ...f,
              properties: {
                ...f.properties,
                fillColor: districtColor(f.properties.name as string),
                ownerName: owner?.crewName ?? '',
              },
            };
          }),
        } as unknown as TurfWarData;

        const source = mapRef.current.getSource('turf-war') as MapLibreGeoJSONSource | undefined;
        if (source) {
          source.setData(colored);
        } else {
          mapRef.current.addSource('turf-war', { type: 'geojson', data: colored });
          mapRef.current.addLayer({ id: 'turf-war-fill', type: 'fill', source: 'turf-war', paint: { 'fill-color': ['get', 'fillColor'], 'fill-opacity': DISTRICT_FILL_OPACITY } });
          mapRef.current.addLayer({ id: 'turf-war-outline', type: 'line', source: 'turf-war', paint: { 'line-color': 'rgba(243,239,230,0.4)', 'line-width': 1 } });
        }
        setTurfLoaded(true);
      } catch {
        // transient fetch error or map disposed — next interval tick retries
      }
    }

    if (mapLoaded) refreshTurfWar();
    const interval = setInterval(refreshTurfWar, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [mapLoaded]);

  return (
    <div
      ref={containerRef}
      className="live-map-shell"
      data-testid="live-map"
      data-map-loaded={mapLoaded ? 'true' : 'false'}
      data-basemap-loaded={basemapLoaded ? 'true' : 'false'}
      data-turf-loaded={turfLoaded ? 'true' : 'false'}
    />
  );
}
