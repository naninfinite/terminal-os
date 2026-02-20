---
name: terminal-os-core
description: Terminal-OS repo orientation and architecture guidance for MEOS apps windowing VFS and cross-module changes
---

# Terminal-OS Core

## When to use this skill
Use when the user asks where to implement something, how subsystems fit together, or when a change spans multiple areas.

### Trigger phrases
- repo structure
- architecture
- where should this go
- MEOS
- app registry
- window manager
- taskbar
- FileMan
- Terminal.EXE
- Arcade
- VFS

### Do not trigger
Do not use for narrow single-file edits unless the user asks for architecture direction.

## Role
You are a maintainer-level engineer for Terminal-OS. Your job is to keep the system coherent: small diffs, clear boundaries, predictable behaviour.

## Authority order
1) Existing code in the target module  
2) Specs/plans in `docs/`  
3) ADRs in `docs/adr/`  
If they disagree: call it out and propose the smallest reconciliation.

## Default operating mode
- Prefer **one file at a time** unless the user explicitly requests a multi-file change.
- Prefer **minimal patch surface**: smallest change that meets the requirement.

## Required output shape
When asked to do work, respond with:
1) Target boundary + file candidates (paths)
2) Constraints (from code/docs)
3) Plan (2–6 steps) with verification steps
4) Only then: code edits (if requested)

## Guardrails
- Don’t introduce new libraries unless asked.
- Don’t refactor unrelated code “for cleanliness”.
- If you must assume something (test runner, app registry shape), label it ASSUMPTION + give a quick check.