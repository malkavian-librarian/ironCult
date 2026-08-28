'use client';
import { useEffect, useRef, useState } from 'react';

export function PresenceToggle() {
  const [riding, setRiding] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function ping() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      fetch('/api/presence', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${localStorage.getItem('ironcult_token')}` },
        body: JSON.stringify({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      }).catch(() => {
        // transient network error — next interval tick retries
      });
    });
  }

  useEffect(() => {
    if (riding) {
      ping();
      intervalRef.current = setInterval(ping, 10000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [riding]);

  return (
    <button
      onClick={() => setRiding((r) => !r)}
      data-testid="presence-toggle"
      style={{
        position: 'fixed',
        right: '1rem',
        bottom: 'calc(var(--nav-height, 64px) + var(--safe-bottom) + 1rem)',
        zIndex: 20,
        minWidth: 'var(--touch-min)',
        minHeight: 'var(--touch-min)',
        borderRadius: '999px',
        padding: '0 1.25rem',
        background: riding ? 'var(--visor)' : 'var(--signal)',
        color: riding ? 'var(--asphalt)' : 'var(--paper)',
      }}
    >
      {riding ? "Riding \u2014 stop" : "I'm riding"}
    </button>
  );
}
