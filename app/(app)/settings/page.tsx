'use client';

import { useEffect, useState } from 'react';
import { CrewPicker } from './crew-picker';

type Profile = {
  id: string;
  email: string;
  displayName: string;
  bio: string | null;
  motorcycle: string | null;
  style: string | null;
  experience: string | null;
  pace: string | null;
  language: string | null;
  crewId: string | null;
};

const EDITABLE_FIELDS = ['displayName', 'bio', 'motorcycle', 'style', 'experience', 'pace', 'language'] as const;

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('ironcult_token');
    if (!token) return;
    fetch('/api/profile', { headers: { authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(setProfile);
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!profile) return;
    const token = localStorage.getItem('ironcult_token');
    const formData = new FormData(e.currentTarget);
    const patch: Record<string, string> = {};
    for (const field of EDITABLE_FIELDS) {
      const value = formData.get(field);
      if (typeof value === 'string') patch[field] = value;
    }
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      setProfile(await res.json());
      setStatus('Saved');
    } else {
      setStatus('Failed to save');
    }
  }

  return (
    <div className="panel" style={{ maxWidth: 480, margin: '1rem' }}>
      <h1>Settings</h1>
      {!profile && <p>Sign in to load your profile.</p>}
      <form onSubmit={handleSubmit}>
        <label>
          Display name
          <input name="displayName" defaultValue={profile?.displayName ?? ''} />
        </label>
        <label>
          Bio
          <input name="bio" defaultValue={profile?.bio ?? ''} />
        </label>
        <label>
          Motorcycle
          <input name="motorcycle" defaultValue={profile?.motorcycle ?? ''} />
        </label>
        <label>
          Style
          <input name="style" defaultValue={profile?.style ?? ''} />
        </label>
        <label>
          Experience
          <input name="experience" defaultValue={profile?.experience ?? ''} />
        </label>
        <label>
          Pace
          <input name="pace" defaultValue={profile?.pace ?? ''} />
        </label>
        <label>
          Language
          <input name="language" defaultValue={profile?.language ?? ''} />
        </label>
        <button type="submit">Save</button>
        {status && <p>{status}</p>}
      </form>
      <CrewPicker crewId={profile?.crewId ?? null} onJoined={(crewId) => setProfile((p) => (p ? { ...p, crewId } : p))} />
    </div>
  );
}
