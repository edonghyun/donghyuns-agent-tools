# Flow model (`*.flow.json`)

One UTF-8 JSON object. Everything the viewer shows comes from this file; the HTML is a rebuildable output.

## Top level

| Field | Required | Meaning |
|---|---|---|
| `id` | ✓ | Stable flow id (`a-z0-9-`). Change requests and saved review state key on it. Never rename after the first build. |
| `title` | ✓ | App or feature name. |
| `goal` | | One sentence: what the user finishes. |
| `locale` | | `ko` (default) or `en`. Viewer chrome and check messages follow it. Author screen text in the same language. |
| `view` | | Initial view: `board` or `wireframe` (default when omitted). The 0.2 value `flowchart` reads as `board`. The viewer toggles between them; the file is the same. `wireflow:start` always writes it. |
| `device` | | Default device for `screen` nodes: `mobile` (390×844, default), `tablet` (820×1180), `desktop` (1280×800), `watch` (198×242), `kiosk` (1080×1920), or `{"width": 1440, "height": 900}`. |
| `actors` | | Ordered actor names (`고객`, `상담사`, `시스템`), each a string or `{"name": "강사", "color": "#148A6E"}`. Nodes name theirs in `actor`; the board colors each card's actor tag and left accent stripe with it, using a palette color when `color` is omitted. Edges are not actor-colored. |
| `source` | | Where this came from: brief file, screenshots, routes, feature-intake slug. |
| `start` | ✓ | Entry screen id. `entries` lists other entry ids (deep links, push). |
| `stages` | ✓ | Ordered task-group labels. A row in the wireframe view, a column group on the board. |
| `vars` | | Initial state (`string`/`number`/`boolean`). Used by `when`/`set`/`inc`, `{{key}}` text, and input fields. |
| `screens` | ✓ | See below. |
| `scenarios` | | Main journeys and recovery paths, replayed by `check`. |
| `requirements` | | Observable requirements from the brief. |
| `proposals` | | Fix options, applied in memory with `check --with` or the viewer checkbox. |
| `primary` | | Scenario id of the main journey. Its nodes and transitions form the board's spine and are drawn bold. |
| `events` | | Log points, listed on the **로그 리스트** tab. See [Events](#events). |
| `eventProps` | | Properties every event carries: `[{"name": "household_id", "use": "형제·중복 신청 묶기"}]`. |

## Screen

```json
{
  "id": "detail", "number": "02.01", "title": "클래스 상세", "stage": 1,
  "origin": "source", "tone": "normal",
  "brief": "날짜와 시간을 고르고 이름을 입력하면 결제로 넘어간다.",
  "notes": ["시간을 고르지 않으면 결제 버튼이 동작하지 않는다"],
  "decisions": ["한 번에 여러 명을 예약할 수 있어야 하는가?"],
  "body": "선택한 시간: {{slot}}",
  "preview": {"slot": "토 14:00"},
  "ui": {"bar": "공방", "heading": "물레 원데이", "blocks": []},
  "end": false,
  "actions": []
}
```

- `kind` — what the node is (default `screen`):

  | kind | wireframe view | use for |
  |---|---|---|
  | `screen` | device frame (`device` per node or flow) | an app/web screen |
  | `message` | chat card (`channel`, `body`) | 카카오톡·SMS·push |
  | `email` | mail card (`channel`, subject = `ui.heading` or `title`, `body`) | 이메일 |
  | `document` | paper card (`ui.blocks`) | PDF·출력물·리포트 |
  | `step` | box | a human task with no screen yet |
  | `decision` | diamond; each action is a branch (≥ 2, else 🟡 `decision-branches`) | 판단·분기 |
  | `system` | double-border box | automatic processing |
  | `wait` | dashed box | waiting for time or another party |
  | `end` | pill | terminal step (pair with `end: true`) |

  On the board every kind is a card with its kind icon. Start a planning flow with `step`/`decision`/`system` nodes; later change `kind` to `screen` and add `ui` — ids, scenarios, and change requests stay valid.
- `actor` — who performs the node; must be listed in `actors` when `actors` is set.
- `device` — per-node device for `screen` nodes, overriding the flow default (e.g. customer on `mobile`, staff on `desktop`).
- `stage` — zero-based index into `stages`. Order within a stage follows `screens` order.
- `number` — display number like `02.01`; derived from stage and order when omitted. Keep it stable once reviewed.
- `origin` — provenance of the screen itself:
  - `source`: the brief or the user asked for it.
  - `observed`: reproduced from an existing implementation (screens, routes, screenshots).
  - `inferred`: the AI added it to make the flow complete. Rendered with a dashed frame.
  - `proposed`: set automatically on screens added by a proposal.
- `tone` — `normal`, `success`, `error`, `pending`.
- `brief` — short grounded excerpt of the planning intent. `notes` — conditions and branches. `decisions` — open business questions. Do not answer decisions yourself.
- `preview` — var overrides used only when the screen is drawn on the overview, so a non-start screen shows realistic content.
- `end: true` — the task may intentionally end here. Every other screen must have a way back to `start`/`entries` or to an end screen, or `check` reports `trapped`.
- `actions` — required, `[]` when none.

### Board fields (all optional)

```json
{"state": "PAID", "metrics": ["결제 전환율"], "experiments": ["가격 A/B"], "notify": ["결제 완료 알림톡"],
 "exception": "E02", "dormant": true}
```

- `state` — the stored status after this step; a mono chip.
- `metrics`, `experiments`, `notify` — what to measure here, which variable an experiment changes here, and which notification goes out. Each is a list of nonempty strings, one chip per entry; `check` and `build` reject anything else, as they do for `notes`, `decisions`, an event's `props`, and `eventProps` entries without a string `name`.
- `exception` — a unique code (`E01`, …) that marks a drop-out or stuck node. It moves to the exception band, and every node with an action into it gets the code as a chip automatically; do not write that chip by hand.
- `dormant: true` — a branch left for later: drawn faint and kept off the spine.
- `decisions` are gathered per stage into the decision band.

### UI blocks (`ui.blocks`, in reading order)

| `type` | Fields |
|---|---|
| `text` | `label` |
| `notice` | `label`, optional `tone: "error"` |
| `visual` | `label` (what the image shows), optional `aspect` like `"16/9"` |
| `rows` | `rows: [{label, value}]` |
| `list` | `items: [string]` |
| `input` | `label`, `field` (a var), `placeholder`, `required`, `multiline` |
| `toggle` | `label`, `field` (boolean var) |

All text supports `{{var}}`. Keep blocks minimal: this is a wireframe for flow review, not a visual design.

### Action

```json
{"id": "pay", "label": "결제하기", "to": "paying", "kind": "primary", "when": {"slot": "토 14:00"}, "set": {"payFails": false}, "inc": {"paid": 1}}
```

- `to` — target screen id. `null` marks a known **missing link** (reported, rendered red). An unknown id is a **broken link**.
- `kind` — `primary` (default for the first plain action), `secondary`, `back` (header chevron), `tab` (bottom tab bar), `sim` (simulation control such as "결제 실패로 만들기", not a real UI button).
- `when` — exact var matches required for the action to work. `set` replaces vars; `inc` adds to numeric vars.
- Self-transitions (`to` = own screen) are valid for picks and toggles that change state.

## Scenario

```json
{"id": "retry", "title": "결제 실패 후 같은 정보로 재시도", "requirements": ["r-retry"],
 "start": "home", "vars": {"name": "재시도테스트"},
 "steps": [{"action": "sim-fail", "screen": "failed"}, {"action": "retry", "screen": "detail", "vars": {"name": "재시도테스트"}}]}
```

Each step clicks `action` on the current screen, then optionally asserts `screen` and a subset of `vars`. Use a distinctive input value in recovery scenarios so "값이 유지된다" is actually checked. A scenario fails on: action not on screen, unmet `when`, missing/broken link, wrong screen, wrong vars.

## Events

```json
{"id": "apply_submitted", "type": "normal", "at": "apply-form.submit", "props": ["household_id"], "note": "가구별 중복 제거"}
```

- `type` — `normal`, `drop` (someone leaves), or `error`.
- `at` — a node id or `node.action` (the transition), or an array when the same event fires in several places. Ids are unique. Actions are never events on their own; write each event.
- An event on a transition or on the node it lands on tracks that primary-path step; the entry node counts as a step too.
- `check` exits 2 on an unknown event `type`, a duplicate event id, a duplicate `exception` code, or an actor `color` that is not `#RRGGBB`.

## Board layout (what the viewer draws)

- Columns are `stages`; inside a stage, nodes fall into sub-columns by graph depth from `start`/`entries`.
- `primary` nodes sit on the centre spine. Other nodes in a sub-column stack above and below it, above first. Without `primary`, the first node of each sub-column takes the spine.
- Under the main area are two bands: **이탈했을 때 확인할 일** holds exception nodes, each under the first node that leads into it; **미정 결정** holds each stage's `decisions`.
- Cards are 220px wide; height follows title, body, and chip count. Edges are orthogonal: forward edges run through the gaps between columns, backward and column-skipping edges detour above or below the cards, edges into an exception are red dashed, and edges out of one are grey dashed. Only `decision` branches carry a label; other labels show on hover.
- The layout is deterministic: the same file always draws the same board.

## Requirement

```json
{"id": "r-retry", "title": "결제 실패 후 재시도", "expected": "실패 화면에서 입력값을 유지한 채 다시 결제할 수 있다", "origin": "source", "screen": "failed", "action": "retry"}
```

`origin`: `source` only when the brief actually requires it; otherwise `inferred`. A requirement is `passed` when every scenario listing it in `requirements` passes, `failed` if any fails, `uncovered` if none lists it.

## Proposal

```json
{"id": "retry-to-detail", "title": "실패 화면에 '다시 시도' 추가", "reason": "결제 실패 시 사용자가 갇힌다",
 "changes": [
   {"screen": "failed", "action": {"id": "retry", "label": "다시 시도", "to": "detail"}},
   {"addScreen": {"id": "help", "title": "도움말", "stage": 2, "actions": [{"id": "home", "label": "처음으로", "to": "home"}]}},
   {"screen": "detail", "removeAction": "old-link"}
 ]}
```

An action with the same id is replaced, otherwise appended. Two proposals touching the same action (or adding the same screen) are alternatives: applying both is a conflict (exit 2). The baseline file keeps the observed/broken state; proposals never edit it.

## Commands

```sh
node "$WF" check FLOW.json                 # exit 0 clean (info only), 1 findings, 2 invalid/conflict
node "$WF" check FLOW.json --with a,b      # same checks with proposals applied in memory
node "$WF" check FLOW.json --json          # machine-readable result
node "$WF" build FLOW.json OUT.html        # single self-contained HTML; exit 0 even with findings
node "$WF" example OUT.flow.json           # copy the screen sample (never overwrites)
node "$WF" example OUT.flow.json --board   # copy the journey board sample (0.2 alias: --flowchart)
```

`$WF` is `${CLAUDE_PLUGIN_ROOT}/scripts/wireflow.mjs`, or `../../scripts/wireflow.mjs` relative to this skill folder. Node 18+, no dependencies.

## Findings

| code | severity | meaning |
|---|---|---|
| `broken-link` | 🔴 | action points at a screen id that does not exist |
| `trapped` | 🔴 | reachable screen with no route to start/entries or an `end` screen |
| `scenario-failed` | 🔴 | a scenario step failed (message names the step and reason) |
| `broken-event` | 🔴 | `events[].at` names a node or transition that does not exist |
| `unknown-primary` | 🔴 | `primary` is not a scenario id |
| `missing-link` | 🟡 | action with `to: null` |
| `decision-branches` | 🟡 | `decision` node with fewer than two actions |
| `unreachable` | 🟡 | no route from start/entries |
| `orphan-exception` | 🟡 | an `exception` node has no incoming action |
| `uncovered-requirement` | 🔵 | requirement that no scenario checks |
| `untracked-step` | 🔵 | `events` exist, but a primary-path step has none on its transition or landing node |

Static reachability ignores `when` guards; scenarios are the place where guards and state are verified.
