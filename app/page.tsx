import { LiveMap } from '@/components/LiveMap';
import { PresenceToggle } from '@/components/PresenceToggle';

export default function HomePage() {
  return (
    <div style={{ position: 'relative' }}>
      <LiveMap />
      <PresenceToggle />
    </div>
  );
}
