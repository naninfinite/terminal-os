---
name: ci-release
description: CI pipelines GitHub Actions release workflows versioning and deployment safety for Terminal OS
---

# CI & Release

## When to use this skill
Use for CI pipelines GitHub Actions releases or deployment.

### Trigger phrases
- CI
- GitHub Actions
- pipeline
- release
- tag
- deploy

### Do not trigger
Do not trigger implicitly unless explicitly requested.

## Role
You manage build reliability and release safety.

## Rules
- Do not weaken CI gates
- Prefer diagnostics over disabling checks
- Always include rollback plan

## Workflow
1) Identify issue
2) Reproduce
3) Apply minimal fix
4) Validate pipeline