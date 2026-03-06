# CONNECT.EXE Tron V1

Status: Active  
Date: 2026-03-06

## Summary

- `CONNECT.EXE` is now a deterministic Tron/light-cycles runtime shared between panel and fullscreen.
- The runtime is four-seat aware and supports mixed `local`, `online`, `cpu`, and `closed` seats.
- Multiplayer v1 uses Supabase Realtime presence + broadcast only.
- No Postgres tables, migrations, or Edge Functions are required for Tron v1.

## Environment

Set these in `.env.local` for multiplayer:

```bash
VITE_CONNECT_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_CONNECT_SUPABASE_ANON_KEY=<your-anon-publishable-key>
```

If either value is missing, the app disables online quick match / room flows and continues to support local/custom CPU play.

## Runtime contract

- Engine tick: `20 Hz` (`50ms` fixed timestep).
- Grid: `60 x 40`.
- Round start: `1s` countdown.
- Score target: first to `5`.
- Seats: `p1`, `p2`, `p3`, `p4`.
- Trails are solid walls and turns are 90 degrees only.
- A match can start with `2` to `4` active seats.
- Seat modes:
  - `local`: human controlled on the current browser
  - `online`: human controlled by a claimed room participant
  - `cpu`: host-simulated bot seat
  - `closed`: inactive seat
- Control rules:
  - one owned human seat: `WASD` and arrow keys both steer it
  - two owned human seats on one browser: first owned seat uses `WASD`, second uses arrow keys
- Sync model: hybrid host-authoritative.
  - all clients run the deterministic engine,
  - local inputs are future-dated by `2` ticks,
  - host publishes snapshots every `5` ticks and on round-end/correction.

## Matchmaking

- Quick Match queue channel: `connect:queue:v1`
- Room channels: `connect:room:<ROOM_CODE>:v1`
- Quick Match supports `2P` and `4P` queues.
- Queue leader is the oldest waiting client within that queue size; `clientId` breaks ties.
- Quick Match assigns one human seat per browser.
- Host Room / Join Room uses a `6` character room code and an authoritative shared lobby.
- Custom room lobbies support mixed seat setups such as `2 local + 2 cpu`, `1 local + 1 online + 2 cpu`, and `3 online + 1 cpu`.

## CPU mode

- Difficulties: `Easy`, `Medium`, `Hard`, `Expert`
- Scaling inputs:
  - reaction delay,
  - lookahead depth,
  - deterministic randomness,
  - reachable-space / multi-opponent pressure / trap heuristic.

## Disconnect handling

- If a non-host client leaves during lobby setup, the host releases that client’s claimed online seats and the lobby remains open.
- If a non-host client leaves during an active match, the host waits `2s` and then hands those seats to CPU takeover for the rest of the match.
- If the host disconnects, the room ends; host migration is intentionally out of scope for v1.

## Local run / smoke test

1. Set the two Connect env vars in `.env.local`.
2. Run `npm install`.
3. Run `npm run dev`.
4. Open two to four browser tabs to `http://localhost:5173`.
5. Test:
   - `2P` Quick Match in two tabs.
   - `4P` Quick Match in four tabs.
   - Host Room in one tab and Join Room in the others.
   - Local custom lobby with `2 local + 2 cpu`.
   - Disconnect one non-host tab mid-round and verify the host promotes that seat to CPU takeover after the grace period.
