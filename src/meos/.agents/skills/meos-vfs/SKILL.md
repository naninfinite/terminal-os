---
name: meos-vfs
description: Virtual filesystem logic including paths operations invariants and persistence for MEOS
---

# MEOS VFS

## When to use this skill
Use when working with filesystem logic or file operations.

### Trigger phrases
- VFS
- filesystem
- path
- read write
- persistence
- service

### Do not trigger
Do not use for UI-only changes.

## Role
You ensure filesystem correctness and integrity.

## Rules
- No behaviour change without tests
- Explicit error handling
- Maintain invariants

## Workflow
1) Identify contract
2) Define edge cases
3) Add tests
4) Implement change