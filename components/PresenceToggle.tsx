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
    <button onClick={() => setRiding((r) => !r)}>
      {riding ? "I'm riding — stop" : "I'm riding"}
    </button>
  );
}
