'use client';

import { useEffect, useState } from 'react';
import { decodeRiderId } from '@/lib/auth/decode-rider-id';

type Attendee = { riderId: string; displayName: string; avatarUrl: string };

type EventRow = {
  id: string;
  title: string;
  type: string;
  voivodeship: string;
  lat: number;
  lon: number;
  startsAt: string;
  happeningNow: boolean;
  description: string | null;
  attendeeCount: number;
  attendees: Attendee[];
};

export function EventsList({ filterVoivodeship, filterDate, refreshKey = 0 }: { filterVoivodeship?: string; filterDate?: string; refreshKey?: number }) {
  const [rows, setRows] = useState<EventRow[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [joined, setJoined] = useState<Record<string, boolean>>({});
  const [myRiderId, setMyRiderId] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

  useEffect(() => {
    setMyRiderId(decodeRiderId(localStorage.getItem('ironcult_token')));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (filterVoivodeship) params.set('voivodeship', filterVoivodeship);
    if (filterDate) params.set('date', filterDate);
    fetch(`/api/events?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: EventRow[]) => { if (!cancelled) setRows(data); });
    return () => { cancelled = true; };
  }, [filterVoivodeship, filterDate, refreshKey, fetchKey]);

  function isAttending(ev: EventRow) {
    if (joined[ev.id] !== undefined) return joined[ev.id];
    return myRiderId ? ev.attendees.some((a) => a.riderId === myRiderId) : false;
  }

  async function toggleAttend(ev: EventRow) {
    const token = localStorage.getItem('ironcult_token');
    if (!token) return;
    setBusyId(ev.id);
    const attending = isAttending(ev);
    const res = await fetch(`/api/events/${ev.id}/attend`, {
      method: attending ? 'DELETE' : 'POST',
      headers: { authorization: `Bearer ${token}` },
    });
    setBusyId(null);
    if (res.ok) {
      const body = await res.json();
      setJoined((prev) => ({ ...prev, [ev.id]: body.attending }));
      setFetchKey((k) => k + 1);
    }
  }

  return (
    <section aria-label="Events" style={{ display: 'grid', gap: '0.75rem' }}>
      {rows.map((ev) => {
        const expanded = expandedId === ev.id;
        return (
          <article key={ev.id} className="panel">
            <button
              type="button"
              onClick={() => setExpandedId(expanded ? null : ev.id)}
              aria-expanded={expanded}
              style={{ width: '100%', textAlign: 'left', background: 'none', border: 0, padding: 0, minHeight: 'auto', color: 'inherit', font: 'inherit' }}
            >
              <header style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <strong>{ev.title}</strong>
                {ev.happeningNow && (
                  <span style={{ fontFamily: 'var(--font-data)', background: 'var(--visor)', color: 'var(--asphalt)', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 800, fontSize: '0.8rem' }}>
                    HAPPENING NOW
                  </span>
                )}
              </header>
              <p style={{ fontFamily: 'var(--font-data)', color: 'var(--mist)', margin: '0.5rem 0 0' }}>
                {ev.type} · {ev.voivodeship} · {new Date(ev.startsAt).toLocaleString()} · {ev.attendeeCount} going
              </p>
            </button>

            {expanded && (
              <div style={{ marginTop: '0.75rem', display: 'grid', gap: '0.5rem' }}>
                {ev.description && <p style={{ margin: 0 }}>{ev.description}</p>}
                {ev.attendees.length > 0 && (
                  <div className="attendee-row">
                    {ev.attendees.map((a) => (
                      <img key={a.riderId} src={a.avatarUrl} alt={a.displayName} title={a.displayName} className="attendee-avatar" />
                    ))}
                  </div>
                )}
                <button type="button" disabled={busyId === ev.id} onClick={() => toggleAttend(ev)}>
                  {isAttending(ev) ? "I'm out" : "I'm going"}
                </button>
              </div>
            )}
          </article>
        );
      })}
      {rows.length === 0 && <p style={{ color: 'var(--mist)' }}>No events match.</p>}
    </section>
  );
}
