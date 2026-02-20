---
name: skill-authoring
description: Create or modify Codex Agent Skills for this repo including correct SKILL.md front matter routing and safe YAML formatting
---

# Skill Authoring

## When to use this skill
Use when creating, validating, or refactoring Codex Agent Skills in this repository.

### Trigger phrases
- skill
- SKILL.md
- agent skills
- Codex skills
- .agents/skills
- routing
- implicit invocation
- openai.yaml

### Do not trigger
Do not use for general repo architecture unless the task is specifically about skills.

## Role
You are the repository’s skill system maintainer. Your goal is to produce skills that:
- load without errors
- route correctly
- remain modular and low-noise
- enforce project architecture and verification discipline

## Non-negotiables

### 1) Front matter must be YAML-safe
- Use only these keys: `name`, `description`
- `description` must be a single line string (no `|`, no multiline blocks)
- No tabs in front matter
- No trailing spaces
- File must be named `SKILL.md` (uppercase)

### 2) Name rules
- lowercase letters numbers hyphens only
- no spaces underscores or uppercase
- unique within the repo

### 3) Skill discovery rules
- Skills live under `.agents/skills/<skill-name>/SKILL.md`
- Optional scoped skills can live under module subtrees, e.g. `src/meos/.agents/skills/...`
- Repo-root skills are global; subtree skills reduce accidental triggers

### 4) Progressive disclosure design
- `description` is for routing only (short and specific)
- Put all detail in the markdown body:
  - when to use
  - trigger phrases
  - do not trigger
  - rules
  - verification
  - workflow checklist

## Default skill template (use this pattern)

---
name: <kebab-case-skill-name>
description: <single line routing description under ~200 chars>
---

# <Human Title>

## When to use this skill
<one sentence>

### Trigger phrases
- ...
- ...

### Do not trigger
- ...

## Role
<one sentence>

## Rules
- ...

## Workflow
1) ...
2) ...

## Verification
- ...

## Routing design guidance

### Keep descriptions short and discriminative
Bad (too broad):
- Terminal OS help
- Frontend development

Good (high-signal):
- MEOS window manager focus z index drag resize and taskbar behaviour
- Virtual filesystem operations path rules invariants and tests

### Avoid routing collisions
- Avoid skill names/descriptions that contain overly common repo terms if they will misfire (e.g. “terminal”)
- For ambiguous skills, disable implicit invocation via `agents/openai.yaml`

## Explicit-only skills
If a skill is risky or frequently misroutes, include:

`<skill-folder>/agents/openai.yaml`

```yaml
policy:
  allow_implicit_invocation: false
```

Use explicit-only for:
- CI/release
- migrations
- security-sensitive tasks
- Terminal.EXE (if the repo name causes collisions)

## Validation checklist (before committing a skill)
- [ ] File path is correct: `.agents/skills/<name>/SKILL.md`
- [ ] Filename is `SKILL.md`
- [ ] Front matter has only `name` and `description`
- [ ] `description` is single-line and short
- [ ] Body contains triggers and do-not-trigger guidance
- [ ] Skill scope (repo-root vs subtree) is intentional
- [ ] Optional `agents/openai.yaml` included for explicit-only skills

## When asked to create new skills
Always:
1) Propose the skill set + file tree
2) Write skills one-by-one
3) Keep descriptions short
4) Put thorough guidance in the body
5) Include explicit-only config when appropriate
