'use client';

import { useEffect, useState } from 'react';

type Crew = { id: string; name: string };

export function CrewPicker({ crewId, onJoined }: { crewId: string | null; onJoined: (crewId: string) => void }) {
  const [crews, setCrews] = useState<Crew[]>([]);
  const [selected, setSelected] = useState('');
  const [newCrewName, setNewCrewName] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('ironcult_token');
    if (!token) return;
    fetch('/api/crews', { headers: { authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(setCrews);
  }, []);

  async function join(id: string) {
    const token = localStorage.getItem('ironcult_token');
    const res = await fetch('/api/crews/join', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ crewId: id }),
    });
    if (res.ok) {
      const body = await res.json();
      onJoined(body.crewId);
      setStatus('Joined');
    } else {
      setStatus('Failed to join');
    }
  }

  async function handleJoinExisting() {
    if (selected) await join(selected);
  }

  async function handleCreateAndJoin() {
    if (!newCrewName) return;
    const token = localStorage.getItem('ironcult_token');
    const res = await fetch('/api/crews', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: newCrewName }),
    });
    if (res.ok) {
      const crew = await res.json();
      setCrews((prev) => [...prev, crew]);
      setNewCrewName('');
      await join(crew.id);
    } else {
      setStatus('Failed to create crew');
    }
  }

  return (
    <div className="panel" style={{ marginTop: '1rem' }}>
      <h2>Crew</h2>
      <p>Current crew: {crewId ?? 'none'}</p>
      <select value={selected} onChange={(e) => setSelected(e.target.value)}>
        <option value="">Select a crew...</option>
        {crews.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <button type="button" onClick={handleJoinExisting}>Join</button>
      <input
        placeholder="New crew name"
        value={newCrewName}
        onChange={(e) => setNewCrewName(e.target.value)}
      />
      <button type="button" onClick={handleCreateAndJoin}>Create &amp; join</button>
      {status && <p>{status}</p>}
    </div>
  );
}
