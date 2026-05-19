# Designs

Design documents for upcoming changes that will modify the spec.

## Naming convention

`NN-<slug>.md` — e.g. `01-oauth-login.md`, `02-bulk-export.md`.

## When to create

- Before implementing a non-trivial feature.
- When the change touches multiple layers (cross-layer impact = design doc).
- When more than one engineer needs to agree on shape before code.

## Suggested sections

```markdown
# <Feature name>

**Status:** draft | accepted | implemented | superseded
**Spec sections this will change:**
- `specs/layers/backend.md#…`
- `specs/flows/NN-…md`

## Problem
## Proposed shape
## Alternatives considered
## Risks & open questions
## Test surface (what tests will be added/changed)
```

## Files

*None yet.*
