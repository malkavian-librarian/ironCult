'use client';

import { useEffect, useState } from 'react';

const VOIVODESHIPS = [
  'slaskie', 'opolskie', 'wielkopolskie', 'zachodniopomorskie', 'swietokrzyskie',
  'kujawsko-pomorskie', 'podlaskie', 'dolnoslaskie', 'podkarpackie', 'malopolskie',
  'pomorskie', 'warminsko-mazurskie', 'lodzkie', 'mazowieckie', 'lubelskie', 'lubuskie',
];

type BuddyPost = {
  id: string;
  voivodeship: string;
  plannedDate: string;
  note: string | null;
  displayName: string;
  style: string | null;
  experience: string | null;
  pace: string | null;
  language: string | null;
};

export default function BuddyFinderPage() {
  const [filterVoivodeship, setFilterVoivodeship] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [postVoivodeship, setPostVoivodeship] = useState('');
  const [plannedDate, setPlannedDate] = useState('');
  const [note, setNote] = useState('');
  const [posts, setPosts] = useState<BuddyPost[]>([]);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (filterVoivodeship) params.set('voivodeship', filterVoivodeship);
    if (filterDate) params.set('date', filterDate);
    fetch(`/api/buddy-posts?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((rows: BuddyPost[]) => { if (!cancelled) setPosts(rows); });
    return () => { cancelled = true; };
  }, [filterVoivodeship, filterDate, refreshKey]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/buddy-posts', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${localStorage.getItem('ironcult_token')}`,
      },
      body: JSON.stringify({ voivodeship: postVoivodeship, plannedDate, note: note || undefined }),
    });
    if (res.status === 401) {
      setError('Log in first to post a buddy request.');
      return;
    }
    if (!res.ok) {
      setError('Could not create the post — check the fields.');
      return;
    }
    setNote('');
    setRefreshKey((k) => k + 1);
  }

  return (
    <main style={{ maxWidth: '760px', margin: '0 auto', padding: '1rem', display: 'grid', gap: '1rem' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.06em' }}>BUDDY FINDER</h1>

      <section className="panel" aria-label="Filters">
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label style={{ display: 'grid', gap: '0.25rem' }}>
            <span>Voivodeship</span>
            <select value={filterVoivodeship} onChange={(e) => setFilterVoivodeship(e.target.value)} style={{ minHeight: '42px' }}>
              <option value="">All</option>
              {VOIVODESHIPS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>
          <label style={{ display: 'grid', gap: '0.25rem' }}>
            <span>Date</span>
            <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} style={{ minHeight: '42px' }} />
          </label>
        </div>
      </section>

      <section className="panel" aria-label="Create post">
        <h2 style={{ marginTop: 0 }}>POST A REQUEST</h2>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <label style={{ display: 'grid', gap: '0.25rem', flex: '1', minWidth: '160px' }}>
              <span>Voivodeship</span>
              <select required value={postVoivodeship} onChange={(e) => setPostVoivodeship(e.target.value)} style={{ minHeight: '42px' }}>
                <option value="">Select…</option>
                {VOIVODESHIPS.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </label>
            <label style={{ display: 'grid', gap: '0.25rem', flex: '1', minWidth: '160px' }}>
              <span>Planned date</span>
              <input required type="date" value={plannedDate} onChange={(e) => setPlannedDate(e.target.value)} style={{ minHeight: '42px' }} />
            </label>
          </div>
          <label style={{ display: 'grid', gap: '0.25rem' }}>
            <span>Note (optional)</span>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} style={{ padding: '0.5rem' }} />
          </label>
          {error && <p style={{ color: 'var(--signal-strong)', margin: 0 }}>{error}</p>}
          <button type="submit">POST</button>
        </form>
      </section>

      <section aria-label="Posts" style={{ display: 'grid', gap: '0.75rem' }}>
        {posts.map((p) => (
          <article key={p.id} className="panel">
            <header style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
              <strong>{p.displayName}</strong>
              <span style={{ fontFamily: 'var(--font-data)', color: 'var(--visor)' }}>
                {p.voivodeship} · {new Date(p.plannedDate).toLocaleDateString()}
              </span>
            </header>
            <p style={{ fontFamily: 'var(--font-data)', color: 'var(--mist)', margin: '0.5rem 0' }}>
              {[p.style, p.experience, p.pace, p.language].filter(Boolean).join(' · ') || 'no ride profile set'}
            </p>
            {p.note && <p style={{ margin: 0 }}>{p.note}</p>}
          </article>
        ))}
        {posts.length === 0 && <p style={{ color: 'var(--mist)' }}>No buddy requests yet.</p>}
      </section>
    </main>
  );
}
