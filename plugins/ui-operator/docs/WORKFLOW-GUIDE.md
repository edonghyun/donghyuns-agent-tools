# UI Operator Workflow Guide

## 1. Start From A UI Change

Use `start` when the user gives a task, branch, PR, diff, or two server URLs.

Minimum useful inputs for web:

```text
baseline: http://localhost:3002
current: http://localhost:3004
scope: admin lecture, consultant, and student list UI consistency
account: admin / local test credentials
```

Minimum useful inputs for native mobile:

```text
platform: ios-simulator or android-emulator
baseline app/build: main branch app installed on simulator
current app/build: active branch app installed on simulator
state command: project script that opens the target screen/state
screenshot command: project script or xcrun/adb command that writes UI_OPERATOR_SCREENSHOT_PATH
```

If the baseline server is broken, record it as a blocker and still capture current states when useful.

## 2. Plan Affected Surfaces

Use `plan` or the mapper script to create a first draft:

```bash
git diff --name-only main...HEAD > /tmp/ui-files.txt

node plugins/ui-operator/scripts/affected_surface_mapper.mjs \
  --diff-name-only /tmp/ui-files.txt \
  --task "admin list toolbar and row action consistency" \
  --baseline-url http://localhost:3002 \
  --current-url http://localhost:3004 \
  --out artifacts/ui-operator/admin-list-ui/capture-plan.json
```

If the UI work happened in a previous local Codex session, start from that session id:

```bash
node plugins/ui-operator/scripts/session_surface_mapper.mjs \
  --session-id 019ed35e-a14b-7db3-82c6-eefcb9c37238 \
  --out artifacts/ui-operator/admin-list-ui/capture-plan.json
```

Then refine selectors for modal, dropdown, tab, drawer, and responsive states. Do not invent selectors; inspect the running UI when needed.

## 3. Capture And Compare

Run the capture script with the plan:

```bash
node plugins/ui-operator/scripts/visual_compare_capture.mjs \
  --baseline-url http://localhost:3002 \
  --current-url http://localhost:3004 \
  --plan artifacts/ui-operator/admin-list-ui/capture-plan.json \
  --out artifacts/ui-operator/admin-list-ui
```

Use `--setup-script` when login or tenant setup is needed:

```js
export async function setup({ page, baseURL }) {
  await page.goto(new URL("/login", baseURL).href);
  await page.getByLabel("ID").fill("admin");
  await page.getByLabel("Access code").fill("1234");
  await page.getByRole("button", { name: "Login" }).click();
}
```

For native mobile, use command recipes instead of browser routes:

```json
{
  "platform": "native-mobile",
  "devices": [{ "name": "ios-simulator", "platform": "ios" }],
  "screens": [{
    "id": "home",
    "label": "Home screen",
    "states": [{
      "id": "initial",
      "label": "Initial",
      "command": "npm run ui:open-home && xcrun simctl io booted screenshot \"$UI_OPERATOR_SCREENSHOT_PATH\""
    }]
  }]
}
```

Then run:

```bash
node plugins/ui-operator/scripts/native_mobile_capture.mjs \
  --plan artifacts/ui-operator/mobile-home-ui/capture-plan.json \
  --out artifacts/ui-operator/mobile-home-ui
```

## 4. Review Findings

Use `review` to turn screenshots and `comparison-data.json` into:

```text
artifacts/ui-operator/<slug>/review.md
```

Findings should separate:

- confirmed visual regression
- likely UX risk
- intentional design change
- missing capture coverage
- blocked state

## 5. Iterate

After code changes, rerun the same plan or an amended plan. Append notes under:

```text
artifacts/ui-operator/<slug>/iterations/<run-id>/
```

Never claim a UI issue is resolved without a fresh after screenshot for the affected state.
