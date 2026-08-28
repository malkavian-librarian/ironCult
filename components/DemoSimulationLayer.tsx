'use client';
import { useEffect, useRef } from 'react';
import {
  createSimulatedRiders,
  renderPosition,
  stepSimulatedRiders,
  type SimRider,
} from '@/lib/demo-sim/simulated-riders';
import {
  CYCLE_MS,
  getInvasionState,
  invaderPositions,
  pickInvaderColor,
  pickNextDistrict,
} from '@/lib/demo-sim/invasion-schedule';
import type { DistrictFeature } from '@/lib/demo-sim/waypoints';

type MapLibreModule = typeof import('maplibre-gl');
type MapLibreMap = import('maplibre-gl').Map;
type MapLibreMarker = import('maplibre-gl').Marker;

const RIDER_COUNT = 500;
const INVADER_COUNT = 20;
const WAYPOINT_INTERVAL_MS = 3000;

function createDotMarker(maplibregl: MapLibreModule, map: MapLibreMap, color: string): MapLibreMarker {
  const el = document.createElement('div');
  el.className = 'presence-dot presence-dot-sim';
  el.style.setProperty('--presence-color', color);
  return new maplibregl.Marker({ element: el }).setLngLat([0, 0]).addTo(map);
}

export function DemoSimulationLayer({
  map,
  maplibregl,
  districts,
  cycleMs = CYCLE_MS,
  onDistrictFlip,
}: {
  map: MapLibreMap;
  maplibregl: MapLibreModule;
  districts: DistrictFeature[];
  cycleMs?: number;
  onDistrictFlip: (districtName: string, color: string) => void;
}) {
  const districtsRef = useRef(districts);
  districtsRef.current = districts;
  const onDistrictFlipRef = useRef(onDistrictFlip);
  onDistrictFlipRef.current = onDistrictFlip;

  useEffect(() => {
    if (districts.length === 0) return;

    // cycleMs only controls how soon the NEXT cycle rolls over (rehearsal: pass a short
    // override so you don't wait 15 real minutes between cycles). The spawn (20s) and dwell
    // (60s) durations inside getInvasionState always run at real speed regardless of cycleMs,
    // so the appear-one-by-one and flip beats always look and time out the same as they will
    // during the actual pitch.
    const districtNames = districts.map((d) => d.properties.name);

    let riders: SimRider[] = createSimulatedRiders(RIDER_COUNT, 1, districts, performance.now());
    const riderMarkers: MapLibreMarker[] = riders.map((r) => createDotMarker(maplibregl, map, r.color));

    let cycleIndex = 0;
    let cycleStartedAt = performance.now();
    let history: string[] = [];
    let districtName = pickNextDistrict(history, districtNames, cycleIndex);
    let invaderColor = pickInvaderColor(districtName, districtNames, cycleIndex);
    history = [...history, districtName];
    let cyclePositions = invaderPositions(districtName, districts, INVADER_COUNT, cycleIndex);

    const invaderMarkers: MapLibreMarker[] = Array.from({ length: INVADER_COUNT }, () =>
      createDotMarker(maplibregl, map, invaderColor)
    );
    invaderMarkers.forEach((m) => m.getElement().style.setProperty('opacity', '0'));

    let rafId: number;

    function tick() {
      const now = performance.now();

      riders = stepSimulatedRiders(riders, now, WAYPOINT_INTERVAL_MS);
      for (let i = 0; i < riders.length; i++) {
        const pos = renderPosition(riders[i], now, WAYPOINT_INTERVAL_MS);
        riderMarkers[i].setLngLat([pos.lon, pos.lat]);
      }

      if (now - cycleStartedAt >= cycleMs) {
        cycleIndex += 1;
        cycleStartedAt = now;
        districtName = pickNextDistrict(history, districtNames, cycleIndex);
        invaderColor = pickInvaderColor(districtName, districtNames, cycleIndex);
        history = history.length >= districtNames.length ? [districtName] : [...history, districtName];
        cyclePositions = invaderPositions(districtName, districtsRef.current, INVADER_COUNT, cycleIndex);
        invaderMarkers.forEach((m) => {
          const el = m.getElement();
          el.style.setProperty('opacity', '0');
          el.style.setProperty('--presence-color', invaderColor);
        });
      }

      const state = getInvasionState(cycleStartedAt, now, districtName, invaderColor);

      for (let i = 0; i < invaderMarkers.length; i++) {
        const visible = i < state.visibleInvaderCount;
        const el = invaderMarkers[i].getElement();
        el.style.setProperty('opacity', visible ? '1' : '0');
        if (visible) {
          const pos = cyclePositions[i];
          if (pos) invaderMarkers[i].setLngLat([pos.lon, pos.lat]);
        }
      }

      if (state.flipped) {
        onDistrictFlipRef.current(districtName, invaderColor);
      }

      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      riderMarkers.forEach((m) => m.remove());
      invaderMarkers.forEach((m) => m.remove());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, maplibregl, districts.length, cycleMs]);

  return null;
}
