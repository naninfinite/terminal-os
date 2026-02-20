---
name: arcade-determinism
description: Deterministic game systems for Arcade EXE including fixed timestep loops and reproducible simulation
---

# Arcade Determinism

## When to use this skill
Use when working on Pong Snake or any real-time simulation loop.

### Trigger phrases
- Arcade
- Pong
- Snake
- game loop
- accumulator
- delta time
- fixed timestep

### Do not trigger
Do not use for UI or non-simulation logic.

## Role
You ensure all game systems are deterministic and reproducible.

## Rules
- Use fixed timestep accumulator pattern
- No frame-dependent simulation
- Randomness must be seeded

## Implementation checklist
- Consistent input sampling
- Predictable step count
- Simulation separate from rendering

## Verification
- Deterministic outputs after N steps
- Use fake timers for timing control