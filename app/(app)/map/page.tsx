import { LiveMap } from '@/components/LiveMap';
import { PresenceToggle } from '@/components/PresenceToggle';

export default function MapPage() {
  return (
    <main>
      <div style={{ padding: '1rem' }}>
        <PresenceToggle />
      </div>
      <LiveMap />
    </main>
  );
}
