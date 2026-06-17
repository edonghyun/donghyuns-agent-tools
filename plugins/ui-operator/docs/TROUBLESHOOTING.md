# UI Operator Troubleshooting

## Playwright Is Missing

Install Playwright in the target project or run from an environment that already provides it:

```bash
pnpm add -D playwright
pnpm exec playwright install chromium
```

The bundled scripts also look near the active Node runtime for `playwright` or `@playwright/test`.

## Local Session Id Is Not Found

`session_surface_mapper.mjs` searches under:

```bash
~/.codex/sessions
```

Use `--session-file` when the session lives somewhere else:

```bash
node plugins/ui-operator/scripts/session_surface_mapper.mjs \
  --session-file /absolute/path/to/rollout.jsonl \
  --out artifacts/ui-operator/from-session/capture-plan.json
```

If the session contains large tool logs, the mapper still only drafts routes and states. Confirm selectors in the running app before capture.

## Native Mobile Command Does Not Produce A Screenshot

`native_mobile_capture.mjs` expects each command to write an image to:

```bash
$UI_OPERATOR_SCREENSHOT_PATH
```

Debug steps:

1. Run the same command outside the plugin.
2. Confirm the simulator/device is booted and the target app is installed.
3. Confirm the command can reach `UI_OPERATOR_SCREENSHOT_PATH`.
4. Prefer an explicit copy or screenshot command at the end of the recipe, such as `xcrun simctl io booted screenshot "$UI_OPERATOR_SCREENSHOT_PATH"` or an `adb`/project-specific equivalent.

If the state setup succeeds but screenshot export fails, mark the state as blocked rather than using stale images.

## Baseline Server Fails

Do not compare against a broken baseline. Record:

- URL
- status code or console output
- whether current capture still ran
- what conclusion is blocked

## Login Works In One Server But Not The Other

Use separate setup scripts:

```bash
--baseline-setup-script ./scripts/login-baseline.mjs \
--current-setup-script ./scripts/login-current.mjs
```

Keep credentials out of committed plans when they are real. Prefer local test credentials or environment variables in setup scripts.

## Selector Fails

Treat selector failure as a state coverage gap, not as visual evidence.

Actions:

1. Capture the plain page state.
2. Inspect the DOM or use browser accessibility selectors.
3. Update the state recipe.
4. Rerun only the affected route/state.

## Screenshots Are Different Because Data Changed

Use the same database snapshot, tenant, account, and filters for baseline and current. If that is not possible, mark the comparison as partial.

## The Report Shows Many Intentional Changes

Move intentional changes into `review.md` as accepted context. Keep the report focused on regressions, UX risks, and missing coverage.
