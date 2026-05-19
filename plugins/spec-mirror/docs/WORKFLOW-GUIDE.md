# spec-mirror — Workflow Guide

How to use the six skills together. Each section is a real scenario.

---

## A — Bootstrapping on a legacy codebase

You inherited a codebase with no spec, no docs, and patchy tests. You want a safety net before changing anything.

```
1. /spec-mirror:generate
   → Skill scans, asks you to confirm the detected architecture, writes specs/ + refs/ scaffolds.

2. /spec-mirror:lint
   → Verify specs/ is internally clean. Fix any 🔴 findings (usually broken cross-refs from the first generate).

3. /spec-mirror:coverage
   → See what % of the spec your current tests cover. Likely low.

4. /spec-mirror:gen-tests
   → Scaffold stubs for everything uncovered. Fill them in over time.

5. /spec-mirror:coverage  (again)
   → Verify the stubs were detected, watch the % climb.
```

After step 1, fill `refs/decisions/` with at least the top 5 ADRs you can recover from team memory. Without those, the spec is descriptive but missing the **why**.

---

## B — Making a planned change safely

You have a spec, and you're about to add OAuth login.

```
1. Write refs/designs/01-oauth-login.md
   → Captures intent before any code or spec changes.

2. /spec-mirror:scope "auth"
   → Produces specs/scope/auth.md showing every dependent. Use this to size the change.

3. Implement.

4. /spec-mirror:generate (update mode)
   → Refresh the spec. <!-- KEEP --> blocks stay; auto sections refresh.

5. /spec-mirror:compare
   → Confirm no unintended drift outside the planned change.

6. /spec-mirror:coverage
   → Confirm new code is covered (after writing/filling tests).

7. Move refs/designs/01-oauth-login.md → refs/decisions/NNNN-oauth-login.md
   → Lock in the **why**.
```

---

## C — CI safety net (no human in the loop)

Add to your PR pipeline. Both skills are non-interactive and produce single-file reports easy to attach as PR artifacts.

```
- run: /spec-mirror:compare   # writes specs/DRIFT.md
- run: /spec-mirror:lint      # writes specs/LINT.md
- run: /spec-mirror:coverage  # writes specs/COVERAGE.md

# Gate:
- if specs/DRIFT.md verdict is DRIFT → fail
- if specs/LINT.md verdict is DIRTY → fail
- if specs/COVERAGE.md verdict is LOW → warn
```

`compare` and `lint` should always pass on `main`. If they don't, you have a real drift problem.

---

## D — Capturing a near-miss

A bug almost shipped because the spec didn't mention an invariant.

```
1. Write refs/lessons/NNNN-<one-line-lesson>.md
   → What happened, why the obvious approach was wrong, what we do instead.

2. Edit specs/layers/<file>.md to add the invariant under the right element,
   wrapped in <!-- KEEP --> if it's a nuance the auto-extractor wouldn't infer.

3. /spec-mirror:lint
   → Confirm the edit didn't break any cross-references.

4. /spec-mirror:gen-tests --target "<invariant>"
   → Optionally scaffold a unit test for the new invariant.

5. /spec-mirror:coverage
   → Confirm the new test is detected.
```

---

## E — Investigating drift you didn't cause

`compare` flagged something as 🟡 but you didn't change that file.

```
1. Read specs/DRIFT.md to see both quoted sides.

2. git log -- <source-file> --since=<spec generated timestamp>
   → Find the commits that introduced the drift.

3. Read the commit messages. If unclear:
   - Open refs/decisions/ — was there a decision that justified it?
   - Open refs/lessons/ — was there a lesson about this code path?

4. Decide:
   - Drift is intentional → /spec-mirror:generate (update mode) to absorb it.
     Optionally write a decisions/ ADR to record why.
   - Drift is accidental → revert the code OR open a ticket.
```

The point of cross-referencing `refs/decisions/` here: drift without a decision behind it is almost always a bug.

---

## F — Onboarding a teammate

Hand them:

1. `specs/README.md` — the index.
2. `refs/decisions/` — read in order, takes ~30 min.
3. `/spec-mirror:scope <a-feature-they'll-touch>` — focused mini-spec for their first task.

The decisions are usually the highest-information-per-minute artifact for a new team member.
