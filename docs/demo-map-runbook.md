# Live Map Demo Runbook

## Seed

Run after deploying the Phase 5 map demo branch and after explicit user approval:

```powershell
npm.cmd run seed:map-demo
```

## Expected State

- Production homepage uses the dark Warsaw basemap.
- District turf fills are low-opacity (0.28) so streets and biker dots are visible.
- Five happening-now event markers are visible in Warsaw.
- Each event has 3-10 blinking biker dots nearby.
- FlyerOne is the larger red biker dot at IronCult Hackathon Checkpoint.
- Clicking an event opens title/type/district/checked-in riders.
- Clicking a rider opens image, rank, club name, motorcycle, name, and id.

## Rollback

Run the previous production deployment rollback in Vercel, then restore data from Neon if demo seed data must be removed. The seeder deletes all events by design. To remove demo riders:

```sql
DELETE FROM presence WHERE rider_id IN (SELECT id FROM riders WHERE email LIKE '%@demo.ironcult.local');
DELETE FROM riders WHERE email LIKE '%@demo.ironcult.local';
```
