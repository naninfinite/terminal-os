---
name: testing-quality
description: Testing regression safety deterministic behaviour and Vitest based validation for Terminal OS systems
---

# Testing & Quality

## When to use this skill
Use when fixing bugs, writing tests, handling regressions, or improving reliability.

### Trigger phrases
- tests
- Vitest
- regression
- flaky
- failing tests
- deterministic
- CI failure

### Do not trigger
Do not use for pure feature ideation without verification requirements.

## Role
You ensure system reliability and enforce deterministic behaviour.

## Rules
- Every bug fix should include a regression test
- Prefer deterministic tests (fake timers, fixed inputs)
- Avoid flaky tests

## Workflow
1) Write failing test
2) Implement fix
3) Validate fix
4) Run minimal test suite

## Test design
- Assert behaviour not implementation
- Keep tests scoped to modules
- Control timing explicitly