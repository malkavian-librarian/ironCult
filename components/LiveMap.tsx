'use client';
import { useEffect, useRef, useState } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';

type PresenceRow = { riderId: string; displayName: string; lat: number; lon: number };
type EventRow = { id: string; title: string; type: string; lat: number; lon: number; happeningNow: boolean };
type MapLibreModule = typeof import('maplibre-gl');
type MapLibreMap = import('maplibre-gl').Map;
type MapLibreMarker = import('maplibre-gl').Marker;

export function LiveMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const maplibreRef = useRef<MapLibreModule | null>(null);
  const markersRef = useRef<MapLibreMarker[]>([]);
  const [presenceRows, setPresenceRows] = useState<PresenceRow[]>([]);
  const [eventRows, setEventRows] = useState<EventRow[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

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
      el.style.cssText = 'width:12px;height:12px;border-radius:50%;background:var(--signal);border:2px solid var(--paper);';
      el.title = rider.displayName;
      markersRef.current.push(new maplibregl.Marker({ element: el }).setLngLat([rider.lon, rider.lat]).addTo(map));
    }

    for (const event of eventRows) {
      const el = document.createElement('div');
      el.style.cssText = `width:14px;height:14px;border-radius:2px;background:${event.happeningNow ? 'var(--visor)' : 'var(--concrete)'};border:2px solid var(--paper);`;
      el.title = `${event.title}${event.happeningNow ? ' (happening now)' : ''}`;
      markersRef.current.push(new maplibregl.Marker({ element: el }).setLngLat([event.lon, event.lat]).addTo(map));
    }
  }, [presenceRows, eventRows, mapReady]);

  return <div ref={containerRef} style={{ width: '100%', height: '70vh' }} data-testid="live-map" data-map-loaded={mapLoaded ? 'true' : 'false'} />;
}
