'use client';
import { useEffect, useRef, useState } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';

type PresenceRow = { riderId: string; displayName: string; lat: number; lon: number };
type EventRow = { id: string; title: string; type: string; lat: number; lon: number; happeningNow: boolean };
type MapLibreModule = typeof import('maplibre-gl');
type MapLibreMap = import('maplibre-gl').Map;
type MapLibreMarker = import('maplibre-gl').Marker;
type MapLibreGeoJSONSource = import('maplibre-gl').GeoJSONSource;

type GeoFeature = { properties: Record<string, unknown> & { name: string } };
type GeoCollection = { type: 'FeatureCollection'; features: GeoFeature[] };
type Owner = { crewId: string; crewName: string; count: number };
type TurfWarData = Parameters<MapLibreGeoJSONSource['setData']>[0];

function hashToHue(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) % 360;
  return hash;
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
  const [turfLoaded, setTurfLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let map: MapLibreMap | null = null;

    async function init() {
      const maplibregl: MapLibreModule = await import('maplibre-gl');
      if (cancelled || !containerRef.current) return;
      map = new maplibregl.Map({
        container: containerRef.current,
        style: {
          version: 8,
          sources: {},
          layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#10100f' } }],
        },
        center: [19.1, 52.0],
        zoom: 6,
        touchPitch: false,
        dragRotate: false,
      });
      maplibreRef.current = maplibregl;
      mapRef.current = map;
      setMapReady(true);
      map.once('load', () => setMapLoaded(true));
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
    if (!map || !maplibregl) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    for (const rider of presenceRows) {
      const el = document.createElement('div');
      el.style.cssText = 'width:16px;height:16px;border-radius:50%;background:var(--signal);border:2px solid var(--paper);';
      el.title = rider.displayName;
      markersRef.current.push(new maplibregl.Marker({ element: el }).setLngLat([rider.lon, rider.lat]).addTo(map));
    }

    for (const event of eventRows) {
      const el = document.createElement('div');
      el.style.cssText = `width:18px;height:18px;border-radius:2px;background:${event.happeningNow ? 'var(--visor)' : 'var(--concrete)'};border:2px solid var(--paper);`;
      el.title = `${event.title}${event.happeningNow ? ' (happening now)' : ''}`;
      markersRef.current.push(new maplibregl.Marker({ element: el }).setLngLat([event.lon, event.lat]).addTo(map));
    }
  }, [presenceRows, eventRows, mapReady]);

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
                fillColor: owner ? `hsl(${hashToHue(owner.crewId)}, 55%, 32%)` : '#181714',
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
          mapRef.current.addLayer({ id: 'turf-war-fill', type: 'fill', source: 'turf-war', paint: { 'fill-color': ['get', 'fillColor'], 'fill-opacity': 0.65 } });
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

  return <div ref={containerRef} style={{ width: '100%', height: '100dvh' }} data-testid="live-map" data-map-loaded={mapLoaded ? 'true' : 'false'} data-turf-loaded={turfLoaded ? 'true' : 'false'} />;
}
