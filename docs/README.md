# Terminal-OS Documentation Hub

Last updated: 2026-03-02

This folder is the human-readable documentation for Terminal-OS.

If you are trying to understand "what exists and why", start here:

- `docs/overview.md` (project overview + current direction)
- `docs/timeline.md` (chronological narrative of major milestones and decisions)
- `docs/adr/README.md` (architectural decisions, constraints, and intent records)

If you want to run or modify the repo:

- `docs/dev-quickstart.md` (run/build/test + code map)
- `docs/responsive-mobile-tablet-baseline.md` (responsiveness contract and validation matrix)

If you are working in a specific subsystem:

- ME / ME.OS:
  - `docs/me-exe-finder-reset-spec.md` (current ME desktop/window model)
  - `docs/me-exe-evolution-plan.md` (constraints for future ME iterations)
  - `docs/fileman-v2-build-spec.md` (historical architecture rules; current ME UX is Finder Reset)
- YOU.EXE:
  - `docs/you-api-v1.md` (active API contract and env variables)
  - `docs/you-exe/SUPABASE-SETUP-AND-OPS.md` (Supabase operations notes)
  - `docs/you-exe/YOU-API-SOURCE-OF-TRUTH.md` (product constraints and M6 scope)
- THIRD.EXE:
  - `docs/third-exe/THIRD-V1-RUNTIME-CONTRACT.md` (runtime contract for the 3D editor baseline)
- Program / roadmap:
  - `docs/subsystem-expansion-roadmap.md` (M6 program definition and exit criteria)

Logs and long-form history:

- `docs/conversation-log.md` (running log of decisions; not curated, but useful for deep archeology)

## Documentation authority order

When docs disagree, treat this as the escalation order:

1. Code (current runtime behavior)
2. `docs/*` "spec/contract" docs for the relevant subsystem
3. `docs/adr/README.md` (decision records and intent)
4. `docs/conversation-log.md` (historical reasoning and chat summaries)

If you change behavior or a public-facing contract:

- Update the relevant docs in the same change.
- Add a brief entry to `docs/conversation-log.md`.
