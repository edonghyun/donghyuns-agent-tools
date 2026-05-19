# Lessons

Failure modes, non-obvious patterns, and safety-net rationale captured **after the fact**. Each lesson exists because something broke or almost broke.

Lessons are the highest-leverage refs/ content for the safety-net mission: they encode tribal knowledge that no codebase scan can recover.

## Naming convention

`NNNN-<slug>.md` — e.g. `0001-double-write-on-retry.md`.

## When to create

- A bug that took >1 hour to diagnose.
- A near-miss in production caught by the spec / tests / a teammate.
- A pattern in the codebase that exists for a specific reason a newcomer would not guess.
- Anything you would otherwise write in a Slack message and lose.

## Suggested sections

```markdown
# NNNN — <one-line lesson>

**Date:** YYYY-MM-DD
**Severity:** info | warning | critical
**Related spec:** `specs/…`
**Related decisions:** `refs/decisions/NNNN-…`

## What happened
## Why the obvious approach was wrong
## What we do instead
## How to detect this failure mode in the future
   - Test that guards against it
   - Lint/check that flags it
```

## Files

*None yet.*
