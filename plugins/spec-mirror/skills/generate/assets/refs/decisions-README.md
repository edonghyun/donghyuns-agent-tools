# Decisions

Architecture Decision Records (ADRs). The spec describes **what is**; ADRs describe **why it is that way**. Critical context for the safety-net mission — without it, a future developer may "fix" something that was deliberately shaped a certain way.

## Naming convention

`NNNN-<slug>.md` — e.g. `0001-use-postgres-not-mongo.md`. Four digits so they sort cleanly.

## When to create

- A choice between alternatives where the rejected option is plausible.
- A constraint imposed by an external system, regulation, or contract.
- A trade-off where the cost will only become obvious later.

## Suggested sections

```markdown
# NNNN — <decision title>

**Status:** proposed | accepted | superseded by NNNN
**Date:** YYYY-MM-DD
**Affects spec:** `specs/layers/…`, `specs/flows/…`

## Context
## Decision
## Consequences
## Alternatives considered
```

## Files

*None yet.*
