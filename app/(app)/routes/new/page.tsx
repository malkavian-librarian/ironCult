'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function NewRoutePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const token = localStorage.getItem('ironcult_token');
    const formData = new FormData(e.currentTarget);
    const body = {
      title: formData.get('title'),
      startLat: Number(formData.get('startLat')),
      startLon: Number(formData.get('startLon')),
      endLat: Number(formData.get('endLat')),
      endLon: Number(formData.get('endLon')),
      difficulty: formData.get('difficulty'),
      bikeType: formData.get('bikeType'),
      sceneryTags: formData.get('sceneryTags'),
    };
    const res = await fetch('/api/routes', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      router.push('/routes');
    } else {
      const data = await res.json();
      setError(data.error ?? 'Failed to create route');
    }
  }

  return (
    <div className="panel" style={{ maxWidth: 480, margin: '1rem' }}>
      <h1>New Route</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Title
          <input name="title" required />
        </label>
        <label>
          Start latitude
          <input name="startLat" type="number" step="any" required />
        </label>
        <label>
          Start longitude
          <input name="startLon" type="number" step="any" required />
        </label>
        <label>
          End latitude
          <input name="endLat" type="number" step="any" required />
        </label>
        <label>
          End longitude
          <input name="endLon" type="number" step="any" required />
        </label>
        <label>
          Difficulty
          <select name="difficulty" defaultValue="easy">
            <option value="easy">Easy</option>
            <option value="moderate">Moderate</option>
            <option value="hard">Hard</option>
          </select>
        </label>
        <label>
          Bike type
          <select name="bikeType" defaultValue="adventure">
            <option value="adventure">Adventure</option>
            <option value="sport">Sport</option>
            <option value="cruiser">Cruiser</option>
            <option value="naked">Naked</option>
            <option value="touring">Touring</option>
          </select>
        </label>
        <label>
          Scenery tags (comma-separated)
          <input name="sceneryTags" placeholder="forest,mountains" />
        </label>
        <button type="submit">Create route</button>
        {error && <p>{error}</p>}
      </form>
    </div>
  );
}
