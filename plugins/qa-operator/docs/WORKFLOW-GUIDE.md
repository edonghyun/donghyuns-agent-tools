# QA Operator Workflow Guide

## 1. Start From Natural Language

User says:

```text
이 시트 31~43번 QA 맡겨줘. monitor 켜고 UI/UX 문제까지 봐줘.
```

Agent uses `/qa-operator:start`.

## 2. Plan

`plan` extracts or asks for:

- Requirement source and range
- Target project or URL
- Actors and login needs
- Test data strategy
- Browser/viewports
- Expected behavior
- Screenshot points
- UX heuristics
- Repair mode

Then it writes:

```text
artifacts/qa-operator/<slug>/qa-plan.json
artifacts/qa-operator/<slug>/manifest.json
artifacts/qa-operator/<slug>/index.html
```

## 3. Monitor

`monitor` starts the dashboard before the main run whenever possible.

```bash
python3 plugins/qa-operator/scripts/serve_qa_dashboard.py artifacts/qa-operator/<slug>
```

The dashboard polls:

- `manifest.json`
- `qa-plan.json`
- `runs/latest/qa-results.json`

## 4. Run

`run` performs browser QA and updates results after every meaningful step. It should not wait until the end to write status.

Parallel run lanes are allowed only when their data is isolated. Do not let two lanes write to the same account, student, DB row, upload, queue job, or external integration. If two items share mutable data, run them serially.

For each item:

1. Mark `server` status.
2. Mark `login` status.
3. Capture feature screenshots.
4. Run validation commands or document manual evidence.
5. Capture UX risk screenshots and notes.

## 5. Triage

For `FAIL`, `PARTIAL`, and `BLOCKED`, `triage` writes:

```text
runs/<run-id>/issues/<item>-failure.md
```

Include reproduction steps, observed vs expected behavior, evidence links, logs, root-cause candidates, user impact, and next action.

When multiple triage agents are active, claim the item first:

```bash
python3 plugins/qa-operator/scripts/update_qa_result.py artifacts/qa-operator/<slug> \
  --item <item> \
  --claim triage-agent-1 \
  --claim-phase triage
```

## 6. Repair

`repair` is opt-in or approval-gated. It only fixes verifiable defects. After a fix, rerun the affected QA item and append to `repair-log.md`.

Stop instead of editing when the issue needs product direction, production credentials, destructive data changes, or broad redesign.

Repair must happen after triage, and the repair agent must claim the item before editing. A fix is not complete until the affected item has a targeted browser retest and fresh evidence in `qa-results.json`.

## Parallel Contract

- `monitor` reads only.
- `run` writes evidence and results.
- `triage` writes issue reports and root-cause analysis.
- `repair` writes code only for claimed, triaged, repairable items.
- `retest` updates the same item after repair.
- Active item locks prevent duplicate repair work.

## 7. Final Report

End with:

- Dashboard URL
- PASS/PARTIAL/FAIL/BLOCKED/N/A counts
- Item table with evidence
- UX risk list
- Failure reports
- Repairs and retests
- Human decisions still needed
- Verification limits
