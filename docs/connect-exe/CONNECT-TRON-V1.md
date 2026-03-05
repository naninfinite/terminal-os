# CONNECT.EXE Tron V1

Status: Active  
Date: 2026-03-05

## Summary

- `CONNECT.EXE` is now a deterministic Tron/light-cycles runtime shared between panel and fullscreen.
- Multiplayer v1 uses Supabase Realtime presence + broadcast only.
- No Postgres tables, migrations, or Edge Functions are required for Tron v1.

## Environment

Set these in `.env.local` for multiplayer:

```bash
VITE_CONNECT_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_CONNECT_SUPABASE_ANON_KEY=<your-anon-publishable-key>
```

If either value is missing, the app stays in CPU-only mode and disables quick match / room hosting/joining.

## Runtime contract

- Engine tick: `20 Hz` (`50ms` fixed timestep).
- Grid: `60 x 40`.
- Round start: `1s` countdown.
- Score target: first to `5`.
- Trails are solid walls and turns are 90 degrees only.
- Sync model: hybrid host-authoritative.
  - both clients run the deterministic engine,
  - local inputs are future-dated by `2` ticks,
  - host publishes snapshots every `5` ticks and on round-end/correction.

## Matchmaking

- Quick Match queue channel: `connect:queue:v1`
- Room channels: `connect:room:<ROOM_CODE>:v1`
- Queue leader is the oldest waiting client; `clientId` breaks ties.
- Invite flow: host generates a `6` character room code and waits for the guest to join that room directly.

## CPU mode

- Difficulties: `Easy`, `Medium`, `Hard`, `Expert`
- Scaling inputs:
  - reaction delay,
  - lookahead depth,
  - deterministic randomness,
  - reachable-space / trap heuristic.

## Local run / smoke test

1. Set the two Connect env vars in `.env.local`.
2. Run `npm install`.
3. Run `npm run dev`.
4. Open two browser tabs to `http://localhost:5173`.
5. Test:
   - Quick Match in both tabs.
   - Host Room in one tab and Join Room in the other.
   - Disconnect one tab mid-round and verify the remaining tab shows `Opponent disconnected`.
