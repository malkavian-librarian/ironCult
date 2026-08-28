'use client';

import { useState } from 'react';

export function RatingControl({ routeId }: { routeId: string }) {
  const [status, setStatus] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);

  async function submitRating(score: number) {
    const token = localStorage.getItem('ironcult_token');
    const res = await fetch(`/api/routes/${routeId}/ratings`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ score }),
    });
    if (res.ok) setSelected(score);
    setStatus(res.ok ? 'Rated!' : 'Failed to rate');
  }

  const filledUpTo = hovered ?? selected ?? 0;

  return (
    <div>
      <div className="rating-stars" role="group" aria-label="Rate this route">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className={n <= filledUpTo ? 'rating-star rating-star-filled' : 'rating-star'}
            aria-label={`Rate ${n} of 5`}
            aria-pressed={selected === n}
            onClick={() => submitRating(n)}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(null)}
          >
            {n <= filledUpTo ? '★' : '☆'}
          </button>
        ))}
      </div>
      {status && <span>{status}</span>}
    </div>
  );
}
