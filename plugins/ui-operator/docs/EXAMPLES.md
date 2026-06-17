# UI Operator Examples

## Capture Plan

### From Local Session

```bash
node plugins/ui-operator/scripts/session_surface_mapper.mjs \
  --session-id 019ed35e-a14b-7db3-82c6-eefcb9c37238 \
  --out artifacts/ui-operator/libera-admin-design/capture-plan.json
```

### Web

```json
{
  "schemaVersion": 1,
  "plugin": "ui-operator",
  "slug": "libera-admin-list-ui",
  "title": "Libera admin list UI consistency",
  "baselineUrl": "http://localhost:3002",
  "currentUrl": "http://localhost:3004",
  "viewports": [
    { "name": "desktop", "width": 1440, "height": 900 },
    { "name": "mobile", "width": 390, "height": 844 }
  ],
  "routes": [
    {
      "id": "admin-lectures",
      "path": "/admin/lectures",
      "label": "Admin lectures",
      "states": [
        { "id": "list", "label": "List" },
        {
          "id": "grade-dropdown",
          "label": "Grade dropdown open",
          "actions": [
            { "type": "click", "selector": "[data-testid='grade-filter']" },
            { "type": "waitForTimeout", "ms": 300 }
          ]
        },
        {
          "id": "extend-modal",
          "label": "Extend modal",
          "actions": [
            { "type": "click", "role": "button", "name": "Extend" },
            { "type": "waitForSelector", "selector": "[role='dialog']" }
          ]
        }
      ]
    }
  ]
}
```

### Native Mobile

```json
{
  "schemaVersion": 1,
  "plugin": "ui-operator",
  "platform": "native-mobile",
  "slug": "mobile-home-ui",
  "title": "Mobile home UI comparison",
  "devices": [
    { "name": "ios-simulator", "platform": "ios" },
    { "name": "android-emulator", "platform": "android" }
  ],
  "screens": [
    {
      "id": "home",
      "label": "Home screen",
      "states": [
        {
          "id": "initial",
          "label": "Initial state",
          "command": "npm run ui:open-home && cp \"$MOBILE_SCREENSHOT_SOURCE\" \"$UI_OPERATOR_SCREENSHOT_PATH\""
        },
        {
          "id": "bottom-sheet",
          "label": "Bottom sheet open",
          "baselineCommand": "npm run ui:baseline:open-sheet && cp \"$MOBILE_SCREENSHOT_SOURCE\" \"$UI_OPERATOR_SCREENSHOT_PATH\"",
          "currentCommand": "npm run ui:current:open-sheet && cp \"$MOBILE_SCREENSHOT_SOURCE\" \"$UI_OPERATOR_SCREENSHOT_PATH\""
        }
      ]
    }
  ]
}
```

## Review Finding

```md
## P1 - Consultant detail modal loses primary action on mobile

Status: confirmed
Evidence:
- Baseline: screenshots/baseline/mobile/admin-consultants__detail-modal.png
- Current: screenshots/current/mobile/admin-consultants__detail-modal.png
- Viewport: 390x844

Observed:
The current modal footer is below the visible viewport and the primary action is not reachable without extra scroll. Baseline kept the footer visible.

Impact:
Admin users may believe the modal is read-only on mobile.

Next action:
Keep footer sticky within the modal body or reduce vertical spacing above the action row.
```

## Blocker

```md
## BLOCKED - Baseline login page returns 500

Baseline URL `http://localhost:3002/login` failed before auth. Current screenshots were captured, but no before/after conclusion is possible for this run.
```
