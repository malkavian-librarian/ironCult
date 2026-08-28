'use client';

import { useState } from 'react';

export function RatingControl({ routeId }: { routeId: string }) {
  const [status, setStatus] = useState<string | null>(null);

  async function submitRating(score: number) {
    const token = localStorage.getItem('ironcult_token');
    const res = await fetch(`/api/routes/${routeId}/ratings`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ score }),
    });
    setStatus(res.ok ? 'Rated!' : 'Failed to rate');
  }

  return (
    <div>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => submitRating(n)}>{n}</button>
      ))}
      {status && <span>{status}</span>}
    </div>
  );
}
