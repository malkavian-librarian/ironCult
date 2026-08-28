'use client';

import { useState } from 'react';
import { EventsList } from '@/components/EventsList';

const VOIVODESHIPS = [
  'slaskie', 'opolskie', 'wielkopolskie', 'zachodniopomorskie', 'swietokrzyskie',
  'kujawsko-pomorskie', 'podlaskie', 'dolnoslaskie', 'podkarpackie', 'malopolskie',
  'pomorskie', 'warminsko-mazurskie', 'lodzkie', 'mazowieckie', 'lubelskie', 'lubuskie',
];

const EVENT_TYPES = ['rally', 'trackday', 'bikenight', 'swapmeet'];

export default function EventsPage() {
  const [filterVoivodeship, setFilterVoivodeship] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState('');
  const [voivodeship, setVoivodeship] = useState('');
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${localStorage.getItem('ironcult_token')}`,
      },
      body: JSON.stringify({ title, type, voivodeship, lat: Number(lat), lon: Number(lon), startsAt: new Date(startsAt).toISOString(), description: description || undefined }),
    });
    if (res.status === 401) {
      setError('Log in first to create an event.');
      return;
    }
    if (!res.ok) {
      setError('Could not create the event — check the fields.');
      return;
    }
    setTitle(''); setType(''); setVoivodeship(''); setLat(''); setLon(''); setStartsAt(''); setDescription('');
    setRefreshKey((k) => k + 1);
  }

  return (
    <main style={{ maxWidth: '760px', margin: '0 auto', padding: '1rem', display: 'grid', gap: '1rem' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.06em' }}>EVENTS</h1>

      <section className="panel" aria-label="Filters">
        <div className="filter-row">
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

      <section className="panel" aria-label="Create event">
        <h2 style={{ marginTop: 0 }}>CREATE EVENT</h2>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.75rem' }}>
          <label style={{ display: 'grid', gap: '0.25rem' }}>
            <span>Title</span>
            <input required value={title} onChange={(e) => setTitle(e.target.value)} style={{ minHeight: '42px', padding: '0 0.5rem' }} />
          </label>
          <div className="filter-row">
            <label style={{ display: 'grid', gap: '0.25rem', flex: '1' }}>
              <span>Type</span>
              <select required value={type} onChange={(e) => setType(e.target.value)} style={{ minHeight: '42px' }}>
                <option value="">Select…</option>
                {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label style={{ display: 'grid', gap: '0.25rem', flex: '1' }}>
              <span>Voivodeship</span>
              <select required value={voivodeship} onChange={(e) => setVoivodeship(e.target.value)} style={{ minHeight: '42px' }}>
                <option value="">Select…</option>
                {VOIVODESHIPS.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </label>
          </div>
          <div className="filter-row">
            <label style={{ display: 'grid', gap: '0.25rem', flex: '1' }}>
              <span>Lat</span>
              <input required type="number" step="any" value={lat} onChange={(e) => setLat(e.target.value)} style={{ minHeight: '42px', padding: '0 0.5rem' }} />
            </label>
            <label style={{ display: 'grid', gap: '0.25rem', flex: '1' }}>
              <span>Lon</span>
              <input required type="number" step="any" value={lon} onChange={(e) => setLon(e.target.value)} style={{ minHeight: '42px', padding: '0 0.5rem' }} />
            </label>
            <label style={{ display: 'grid', gap: '0.25rem', flex: '1.4' }}>
              <span>Starts at</span>
              <input required type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} style={{ minHeight: '42px', padding: '0 0.5rem' }} />
            </label>
          </div>
          <label>
            <span>Description (optional)</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} style={{ padding: '0.5rem' }} />
          </label>
          {error && <p style={{ color: 'var(--signal-strong)', margin: 0 }}>{error}</p>}
          <button type="submit">CREATE</button>
        </form>
      </section>

      <EventsList filterVoivodeship={filterVoivodeship} filterDate={filterDate} refreshKey={refreshKey} />
    </main>
  );
}
