---
name: repair
description: Fix scoped, verifiable local defects found by qa-operator and rerun affected QA items. Use when the user explicitly allows repair, asks to "고치고 재검증", "명백한 버그는 수정", "auto repair local bugs", "fix failed QA", or "repair and retest". May modify application code only for narrow defects, writes repair-log.md, updates qa-results.json, and reruns affected items. Do not use for product decisions, production writes, destructive data actions, broad redesign, or ambiguous UX preferences.
---

# QA Operator - Repair

Repair is the optional fixing loop after QA triage.

## When to use

Use only when the user permits code changes or asks for automatic local fixes. Default mode from `start` is `propose-only`.

## Output contract

May modify target project files only for the approved or explicitly allowed defect. Also writes:

```text
runs/<run-id>/repair-log.md
runs/<run-id>/qa-results.json
runs/<run-id>/qa-summary.md
runs/<run-id>/screenshots/<item>/
runs/<run-id>/traces/<item>/
```

Never modify production data, delete user data, send real messages, or change deployment state.

## Pipeline

1. Confirm repair mode
   - `propose-only`: write fix proposal, do not edit code.
   - `auto-local`: fix scoped local bugs, then retest.
   - If unclear, ask before editing.

2. Select repairable items
   - Only repair items with reproducible failure and clear expected behavior.
   - Exclude `needs-product-decision`, destructive actions, credentials, data migration, and broad redesign.
   - Require existing triage notes or an issue report before editing.
   - Claim the item before inspecting or editing:

```bash
python3 plugins/qa-operator/scripts/update_qa_result.py <audit-root> \
  --item <id> \
  --claim repair-agent-1 \
  --claim-phase repair \
  --repair-status in-progress
```

3. Inspect code
   - Locate the smallest relevant files.
   - Prefer existing patterns and tests.
   - Do not revert unrelated user changes.

4. Patch
   - Make the minimum safe code change.
   - Add or update focused tests when risk justifies it.
   - Log changed files and rationale in `repair-log.md`.

5. Retest
   - Rerun the affected QA item in browser.
   - Capture after screenshots.
   - Update `qa-results.json` with new status and evidence.
   - Release the claim only after targeted retest evidence is recorded.

6. Report
   - Summarize before/after behavior, tests run, remaining risks, and any human decisions.

## Hallucination guardrails

- Do not repair without a reproduced failure or explicit user instruction.
- Do not repair before triage.
- Do not edit an item locked by another owner.
- Do not broaden scope into unrelated refactors.
- Do not mark repaired until the affected QA item is rerun.
- Do not claim product alignment for ambiguous UX changes; stop for decision.

## Done criteria

- Repair mode is documented.
- Changed files are listed in `repair-log.md`.
- Affected item has after evidence.
- Tests or browser retest results are recorded.
- Item claim was released after retest or left with a documented blocker.
- Remaining failures or blockers are explicit.
