# QA Operator Troubleshooting

## Dashboard shows fetch errors

Open the dashboard through the local server, not `file://`:

```bash
python3 plugins/qa-operator/scripts/serve_qa_dashboard.py artifacts/qa-operator/<slug>
```

Browsers often block JSON polling from local files.

## Dashboard is stale

Check that `manifest.json` has the correct `latestRun`, or that `runs/latest` points to the current run.

## Results never update

`run` must write incrementally after each cycle step. Use:

```bash
python3 plugins/qa-operator/scripts/update_qa_result.py artifacts/qa-operator/<slug> --item <id> --status PARTIAL --note "..."
```

## The agent says PASS without screenshots

This violates the skill contract. Mark the item `PARTIAL` or `BLOCKED` until browser evidence exists.

## Repair changes too much

Stop and switch to approval mode. `repair` should only fix scoped, verifiable defects and rerun the affected item. Product decisions and broad redesigns are not automatic repairs.

## Two agents are working the same item

Use item claims. Check the item's `lock` in `qa-results.json`. If the lock is still active, the second agent should pick another item or wait. If the lock is stale and the original owner is gone, force-release only with lead-agent/user awareness:

```bash
python3 plugins/qa-operator/scripts/update_qa_result.py artifacts/qa-operator/<slug> \
  --item <item> \
  --release-claim \
  --force-release
```

## Parallel runs contaminate data

Move shared mutable fixtures into separate lanes. Use different test accounts, students, uploads, or DB rows for each parallel item. If the product cannot isolate the data, serialize those items.

## A fix was made but status still looks failed

That is correct until targeted retest happens. The repair agent must rerun the affected item, capture fresh evidence, and update `qa-results.json`.

## Production environment is involved

Require explicit user approval and a non-destructive plan. Never use `repair` for production writes, deletion, mass messaging, or real user data mutation.
