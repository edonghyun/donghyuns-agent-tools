# wireflow 0.3 Board View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace wireflow's lane flowchart with an auto-laid-out journey board (spine + exception/decision bands, orthogonal edges, chips, log tab), and restructure the code into small, linted modules.

**Architecture:**
- **Model.** Pure model modules in `scripts/lib/` are shared by the CLI and the viewer.
- **Viewer source.** It lives in `scripts/viewer/src/`, organized as:
  - `layout/`: pure functions, unit-tested
  - `components/`: render state to HTML, dispatch actions
  - `store.mjs`: the single state owner
- **Bundling.** esbuild bundles the viewer into the committed `scripts/viewer/dist/`. The runtime `wireflow build` only inlines those files, so it has zero dependencies.

**Tech Stack:**
- Node ≥ 20 for dev; the CLI runtime is Node ≥ 18.
- Plain ES modules.
- `node:test`.
- Biome 2.x for lint and format.
- esbuild 0.28 for the bundle.

**Spec:** `docs/superpowers/specs/2026-11-25-wireflow-board-design.md`

## Global Constraints

- Runtime `wireflow.mjs` imports only `node:*` modules and repo files; `npm install` is never required to `check` or `build`.
- `dist/viewer.js` and `dist/viewer.css` are committed. CI fails if `npm run bundle` changes them.
- Biome: recommended rules, line width 100, single quotes, 2-space indent. `npm run lint` must be clean.
- Each component exports one `render(state, T) → Html` or `mount(el, store, T)`. All state changes go through `store.dispatch`.
- 0.2 files stay valid:
  - `view: "flowchart"` is read as `board`.
  - A missing `view` means `wireframe`.
- Board card width 220px. Sub-column gap 48px. Stage gap 72px.
- Severities and codes:
  - `broken-event` 🔴, `unknown-primary` 🔴
  - `orphan-exception` 🟡
  - `untracked-step` 🔵
- Event types: `normal | drop | error`. Actor color: `#RRGGBB`.
- Versions:
  - wireflow 0.3.0 in both manifests.
  - Marketplace 0.9.0 in both marketplace files.
- localStorage key `wireflow:${flow.id}:${META.output}` and the copied markdown heading are unchanged, so revise keeps working.

## Review Focus

1. **Cyclic flows (retry loops, back buttons).** Rank computation must terminate, and back edges must route around the cards. Test: `rankNodes` on a 3-cycle; `routeEdges` back-edge stays outside the card area. (Tasks 3, 5)
2. **Flows with no `primary` and no board fields (0.2 files opened as board).** These must render without throwing, with the first node of each column on the spine. Test: the 0.2 `consulting-request` structure through `layoutBoard`. (Task 4)
3. **Unreachable nodes** (no rank from the entries). They are placed in their stage's first sub-column, not dropped. Test in Task 3.
4. **Text containing `<`, `"`, or `{{var}}` in chips and events.** It must be escaped in the board card and log page. Test in Task 7.
5. **Proposals that add nodes or edges** (`--with` in the viewer toggle). The board relayouts and keeps the new node in its stage. Test: `layoutBoard(applyProposals(...))` includes the added screen. (Task 4)

---

### Task 1: Tooling and model split (no behavior change)

**Files:**
- Create: `plugins/wireflow/package.json`, `plugins/wireflow/biome.json`
- Create the model modules in `plugins/wireflow/scripts/lib/`:
  - `constants.mjs`
  - `messages.mjs`
  - `validate.mjs`
  - `scenario.mjs`
  - `proposals.mjs`
  - `graph.mjs`
  - `check.mjs`
  - `index.mjs`
- Delete: `plugins/wireflow/scripts/lib/model.mjs`
- Modify: `scripts/wireflow.mjs` (import from `./lib/index.mjs`), `scripts/test/model.test.mjs` (import path), root `.gitignore` (`node_modules/`)

**Interfaces:**
- Produces:
  - `lib/index.mjs` re-exports `DEVICES, KINDS, validate, applyAction, enabledActions, runScenario, applyProposals, check, exitCode`.
  - `graph.mjs` exports `edgesOf(flow) → {fwd: Map<id,id[]>, back: Map<id,id[]>, dangling: [{screen, action, to}]}` and `reach(starts, edges) → Set`.
  - `messages.mjs` exports `messages(flow) → MSG table`.

- [ ] **Step 1:** Write `package.json`:
  - `"private": true`, `"type": "module"`
  - Scripts:
    - `lint`: `biome check scripts`
    - `format`: `biome check --write scripts`
    - `test`: `node --test scripts/test/*.test.mjs`
    - `bundle`: `node scripts/bundle.mjs`
  - devDependencies: `@biomejs/biome` 2.6.9, `esbuild` 0.28.2
- [ ] **Step 2:** Write `biome.json` with the Global Constraints settings. Ignore `scripts/viewer/dist`.
- [ ] **Step 3:** Run `npm install`, then `npm test`. Expected: 21 pass (baseline).
- [ ] **Step 4:** Move the code out of `model.mjs` into the modules above, by responsibility.
  - Each function body is kept as-is and only reformatted. One statement per line; no single-line `if (...) { ...; continue; }` chains.
  - `check.mjs` builds its graph through `graph.edgesOf`.
- [ ] **Step 5:** Run `npm run format && npm run lint && npm test`. Expected: lint clean, 21 pass.
- [ ] **Step 6:** Run `node scripts/wireflow.mjs check examples/class-booking.flow.json --with retry-to-detail`. Expected: same output as on `main`.
- [ ] **Step 7:** Commit: `refactor(wireflow): split model into modules and add biome`.

### Task 2: Board fields in the model

**Files:**
- Modify: `lib/constants.mjs`, `lib/validate.mjs`, `lib/check.mjs`, `lib/messages.mjs`
- Create: `lib/board.mjs`
- Test: `scripts/test/board-model.test.mjs`

**Interfaces:**
- Produces, in `lib/board.mjs`:
  - `resolveView(flow) → 'board' | 'wireframe'`
  - `actorList(flow) → [{name, color}]`. Colors default from `ACTOR_PALETTE` in order.
  - `primaryPath(flow) → {nodes: Set<id>, steps: Set<'node.action'>, order: id[]}`. Empty sets if there is no `primary` or the scenario fails partway; it keeps the steps reached so far.
  - `eventLocations(event) → string[]`, which normalizes `at`.
  - `exceptionSources(flow) → Map<exceptionNodeId, sourceNodeId[]>`.
- Produces, in `constants.mjs`: `VIEWS = ['board','wireframe','flowchart']`, `EVENT_TYPES`, `ACTOR_PALETTE` (≥ 6 colors; first four from the hand-drawn board: `#8563AA`, `#B4791F`, `#148A6E`, `#2F53C4`).

- [ ] **Step 1: Write failing tests** in `board-model.test.mjs`:
  - `resolveView({view:'flowchart'}) === 'board'`; `resolveView({}) === 'wireframe'`.
  - `validate` errors on:
    - an event type `'bogus'`
    - duplicate event ids
    - duplicate exception codes
    - actor color `'red'`
  - `validate` accepts `actors: ['A', {name:'B', color:'#123ABC'}]`. Screen `actor: 'B'` is valid.
  - `check` findings:
    - `broken-event` for `at: 'nope'` and for `at: 'home.nope'` (critical)
    - `unknown-primary` for `primary: 'zzz'`
    - `orphan-exception` for an `exception` node with no incoming edge
    - `untracked-step` is info and appears only when `events.length > 0`. A step counts as tracked if the event is on either the transition or the landing node; an entry node counts as a step.
  - `exitCode` is 0 when the only finding is `untracked-step`.
  - `primaryPath` on a passing scenario lists every visited node and `node.action` step.
- [ ] **Step 2:** Run `npm test`. Expected: the new tests FAIL.
- [ ] **Step 3:** Implement. Add ko/en messages for the 4 new codes:
  - ko `broken-event`: `이벤트 "${id}"가 없는 위치 "${at}"를 가리킴`
  - ko `unknown-primary`: `기본 경로 시나리오 "${id}"가 없음`
  - ko `orphan-exception`: `예외 "${code} ${title}"로 들어오는 연결이 없음`
  - ko `untracked-step`: `기본 경로 "${title}" 단계에 이벤트가 없음`
- [ ] **Step 4:** Run `npm test && npm run lint`. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(wireflow): add board fields and event checks to the model`.

### Task 3: Node ranks

**Files:** Modify `lib/graph.mjs`; Test `scripts/test/graph.test.mjs`

**Interfaces:**
- Produces: `rankNodes(flow) → Map<id, number>`. Longest-path rank from the entries over the DAG left after removing DFS back edges.
  - Unreachable nodes get the minimum rank of their stage, or 0 if the stage has none.
  - Edges into `exception` nodes are ignored for ranking.
- Produces: `isBackEdge(flow, from, to)`, consistent with the DFS used for the ranks.

- [ ] **Step 1: Failing tests**:
  - Linear a→b→c gives 0,1,2.
  - Diamond a→{b,c}→d gives d=2.
  - Cycle a→b→c→a terminates with ranks 0,1,2, and `isBackEdge(c,a)` is true.
  - An unreachable node in stage 1 gets that stage's min rank.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement with an iterative DFS (white/grey/black colors), then relax ranks in topological order.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(wireflow): rank nodes for board columns`.

### Task 4: Board layout

**Files:** Create `scripts/viewer/src/layout/board.mjs`, `scripts/viewer/src/layout/card-size.mjs`; Test `scripts/test/layout-board.test.mjs`

**Interfaces:**
- Consumes: `rankNodes`, `primaryPath`, `exceptionSources` (Tasks 2–3).
- Produces:
  - `estimateCardHeight(node) → number`, a pure function of the title length, body length, and chip count.
  - `layoutBoard(flow) → { nodes: Map<id,{x,y,w,h,column,band:'main'|'exception'}>, columns: [{stage, sub, x}], stageHeaders: [{label,x,w}], bands: [{type:'exception'|'decision', label, x,y,w,h, cards?}], spineY, size:{w,h} }`.
  - The `decision` band's `cards` are `[{stage, items: string[], x, y, w, h}]`, built from node `decisions` grouped by stage.
- Constants exported: `CARD_W=220`, `SUB_GAP=48`, `STAGE_GAP=72`.

- [ ] **Step 1: Failing tests** (positions only, no DOM):
  - Primary nodes share `y + h/2 === spineY`.
  - In a column with one primary node plus two others, the others sit one above and one below the spine (above first).
  - A column with two primary-visited nodes has none centered on the spine; the stack is centered on the spine.
  - Same-stage sequential nodes a→b get different `sub` and `b.x === a.x + CARD_W + SUB_GAP`.
  - Stage boundary gap equals `STAGE_GAP`.
  - Exception node: `band === 'exception'`, `y` below every main card, and `x` equal to its first source's x. Two exceptions with the same source x are offset by `CARD_W + SUB_GAP`.
  - No two boxes overlap (pairwise check) on a 20-node fixture built like the hakwon2 shape: two entries, a stage with a subject/project loop, 4 exceptions, and 3 stages with decisions.
  - A 0.2-style flow (no primary, no exceptions) lays out without throwing.
  - A flow after `applyProposals` with `addScreen` includes the added node.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement per spec rules 1–5. Card height = 64 + 18×min(2, title lines) + 16×min(2, body lines) + 22×chip rows, using ~13 chars per line at 220px for Korean.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(wireflow): board layout`.

### Task 5: Orthogonal edge routes

**Files:** Create `scripts/viewer/src/layout/routes.mjs`; Test `scripts/test/layout-routes.test.mjs`

**Interfaces:**
- Consumes: `layoutBoard` output, `isBackEdge`, `primaryPath`.
- Produces: `routeEdges(flow, layout) → [{ id:'node.action', from, to, points:[[x,y],...], kind:'forward'|'back'|'exception'|'from-exception', primary:boolean, dormant:boolean, label?:string, labelAt?:[x,y] }]` and `toPathD(points) → string` (M/L/H/V only).
  - A label is set only when the source node is `kind: 'decision'`.

- [ ] **Step 1: Failing tests**:
  - Every segment is horizontal or vertical.
  - A forward edge's first point is on the source's right-middle and its last on the target's left-middle.
  - Two forward edges through the same channel get x values 6px apart.
  - A column-skipping edge whose straight run would cross a middle card is routed outside the main area (all intermediate y < min main y or > max main y). An unobstructed skip stays direct.
  - A back edge never passes through any card box (segment–rect intersection helper in the test).
  - An exception edge starts at the source's bottom-center when the cell below is empty; otherwise it goes via the right channel. It ends at the exception's top-center.
  - A `from-exception` edge starts at the exception's top.
  - Over the 20-node fixture from Task 4, no segment passes through a card other than its own endpoints.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement. Pick the bypass side by comparing the mean y of the two cards to `spineY`. Stack bypass lanes 14px apart.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(wireflow): orthogonal edge routing`.

### Task 6: Viewer skeleton, store, bundle, wireframe parity

**Files:**
- Create in `scripts/viewer/src/`:
  - `main.mjs`, `store.mjs`, `html.mjs`, `i18n.mjs` (moved from `viewer/i18n.mjs`)
  - `layout/wireframe.mjs`: 0.2 `stageRowLayout` plus `nodeSize`/`nodeStyle`/`deviceSize`
  - `components/camera.mjs`, `canvas.mjs`, `toolbar.mjs`, `tabs.mjs`
  - `components/frame-node.mjs`: 0.2 frame/card/box bodies from `render.mjs`
  - `components/edges.mjs`: 0.2 wireframe curve edges kept for the wireframe view only
  - `components/player.mjs`, `requests.mjs`, `node-panel.mjs`, `review-page.mjs`
- Create in `scripts/viewer/src/styles/`: `base.css`, `toolbar.css`, `canvas.css`, `frame.css`, `panel.css`, `player.css`
- Create: `scripts/bundle.mjs`, `scripts/viewer/dist/viewer.js`, `scripts/viewer/dist/viewer.css`
- Delete: `viewer/app.js`, `viewer/geometry.mjs`, `viewer/render.mjs`, `viewer/viewer.css`, `viewer/i18n.mjs`
- Modify: `viewer/viewer.html`, `scripts/wireflow.mjs` (build inlines dist), `scripts/test/viewer.test.mjs` (new paths; drop lane/flowchart tests)

**Interfaces:**
- `store.mjs`: `createStore(FLOW, META) → { getState(), dispatch(action), subscribe(fn) }`. State:
  - `flow`, `result`, `applied`, `view`
  - `tab: 'canvas'|'log'|'review'`, `mode: 'overview'|'play'`
  - `scenario`, `selected`, `camera`, `play`, `requests`
- Action types (exhaustive):
  - `setView`, `setTab`, `select`, `setScenario`, `toggleProposal`
  - `startPlay`, `press`, `stopPlay`
  - `addRequest`, `clearRequests`
  - `camera`
- The reducer recomputes `flow`/`result` on `toggleProposal` and persists requests on `addRequest`/`clearRequests`.
- `html.mjs`: `html`, `escapeHtml`, `fillVars` (moved unchanged).
- `bundle.mjs` runs:
  - `esbuild.build({entryPoints:['scripts/viewer/src/main.mjs'], bundle:true, format:'iife', target:'es2020', minify:false, outfile:'scripts/viewer/dist/viewer.js'})`
  - CSS files concatenated in a fixed order into `dist/viewer.css`
- `main.mjs` reads the globals `FLOW`, `META`.
- `wireflow.mjs build`:
  - Replaces `/*CSS*/` with `dist/viewer.css`, `/*DATA*/` as before, and `/*APP*/` with `dist/viewer.js`.
  - The `/*MODULES*/` placeholder and the regex inlining are removed.

- [ ] **Step 1: Failing tests**:
  - Store reducer: `toggleProposal('retry-to-detail')` on class-booking makes `result.findings` lose `trapped`.
  - `addRequest` adds to `requests`.
  - `setView('board')` updates `view`.
  - Wireframe layout tests ported from 0.2 (size by device, stage rows, no overlap).
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement the modules.
  - Port 0.2 behavior for the wireframe view, walk-through, requests, and proposal toggle, split by component.
  - The review page replaces the old sidebar summary.
  - The node panel is a collapsible right drawer.
- [ ] **Step 4:** Run `npm run bundle && npm test && npm run lint`. Expected: PASS.
- [ ] **Step 5:** Run `node scripts/wireflow.mjs build examples/class-booking.flow.json /tmp/cb.html`, then a Playwright smoke test (scratchpad `pw/` setup):
  - The wireframe renders 6 nodes.
  - Walk-through reaches `done`.
  - Toggling the proposal clears the trapped finding.
  - Copying requests gives text that starts with `## Wireflow 수정 요청`.
  - No console errors.
- [ ] **Step 6:** Commit: `refactor(wireflow): component viewer with store and esbuild bundle`.

### Task 7: Board components and log page

**Files:**
- Create in `scripts/viewer/src/components/`: `board-card.mjs`, `chips.mjs`, `board-edges.mjs`, `bands.mjs`, `legend.mjs`, `log-page.mjs`
- Create: `scripts/viewer/src/styles/board.css`, `scripts/viewer/src/styles/log.css`
- Modify: `components/canvas.mjs` (choose the board or wireframe layout by `state.view`), `components/node-panel.mjs` (add a section listing the events whose `at` includes this node or its actions, plus all chips), `components/toolbar.mjs` (stage-jump select that focuses the camera on a stage header), `i18n.mjs`, `scripts/bundle.mjs` (CSS list), `dist/*`
- Test: `scripts/test/board-render.test.mjs`

**Interfaces:**
- Consumes: `layoutBoard`, `routeEdges`, `toPathD`, `actorList`, `primaryPath`.
- Produces:
  - `renderBoardCard(node, ctx, T) → Html`
  - `renderChips(node, exceptionCodes, T) → Html`
  - `renderLogPage(flow, T) → Html`
  - `renderLegend(flow, T) → Html`
- Copy (ko):
  - Tabs: `보드`, `와이어프레임`, `로그 리스트`, `검토`
  - Exception band: `이탈했을 때 확인할 일`
  - Decision band: `미정 결정`
  - Event types: `정상` / `이탈` / `에러`
  - Log page heading: `로그 심을 지점 & 공통 속성`
  - Legend: `기본 경로`, `예외`, `문만 열어둠`

- [ ] **Step 1: Failing tests**:
  - A card for a node with `metrics:['<x>']` and title `a "b"` contains `&lt;x&gt;` and `a &quot;b&quot;`.
  - The chip order is state, metrics, experiments, notify, exception codes.
  - A source node of an exception edge shows that exception's code chip without the author writing it.
  - A `dormant` node card has class `dormant`; a primary node has class `primary`.
  - The log page shows:
    - one row per event
    - the joined locations for an array `at`
    - a type badge with `정상`/`이탈`/`에러`
    - the common props table first
    - events grouped under stage headings by their first location's stage
  - The legend lists every actor with its color.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement. Styling follows the hand-drawn board's palette and type scale:
  - Pretendard falls back to the system font; no external font links.
  - The actor tag color comes from `actorList`.
  - Exception cards are red; the decision band is grey dashed.
- [ ] **Step 4:** Run `npm run bundle && npm test && npm run lint`. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(wireflow): journey board view and log list`.

### Task 8: Examples, skills, docs, versions, CI

**Files:**
- Modify: `examples/consulting-request.flow.json` (`view: board`, `primary`, `events`, `eventProps`, chips, ≥ 1 exception)
- Create: `examples/trial-enrollment.flow.json`
  - A fictional ~20-node parent-signup / student-trial / payment journey.
  - 2 entries, 4 exceptions with codes E01–E04, decisions in 3 stages, ≥ 5 scenarios all passing, `primary` set, and events covering every primary step.
- Modify `class-booking.flow.json` to add `"view": "wireframe"`.
- Modify `scripts/wireflow.mjs` `example` to support `--board` (trial-enrollment); keep `--flowchart` as an alias for `--board`.
- Modify skills and docs:
  - `skills/start/SKILL.md`: triggers `유저 저니 보드`, `저니 보드`, `서비스 블루프린트`, `journey board`, `service blueprint`, plus a pipeline step for board fields; always write `view`.
  - `skills/start/references/flow-model.md`: new fields and a layout summary.
  - `skills/revise/SKILL.md`: requests may target events and chips.
  - `plugins/wireflow/README.md` and root `README.md` wireflow section.
- Modify manifests and CI:
  - Both plugin manifests to 0.3.0.
  - `.claude-plugin/marketplace.json` and `.agents/plugins/marketplace.json` to 0.9.0 (wireflow entry 0.3.0).
  - `.github/workflows/runtime-checks.yml`: `wireflow-model` job runs, with `working-directory: plugins/wireflow`:
    - `npm ci`
    - `npm run lint`
    - `npm test`
    - `npm run bundle && git diff --exit-code scripts/viewer/dist`
    - check every example (`--with` each proposal)
    - build every example
- Create: `plugins/wireflow/package-lock.json` (from `npm install`)

- [ ] **Step 1:** Write the examples. Run `node scripts/wireflow.mjs check` on each. Expected:
  - `trial-enrollment`: OK with no 🔴/🟡.
  - `consulting-request`: no 🔴.
- [ ] **Step 2:** Update skills, docs, and versions. Run `grep -rn "flowchart" plugins/wireflow --include=*.md`. Expected: mentioned only as the 0.2 alias.
- [ ] **Step 3:** Update CI, then run the same commands locally. Expected: all pass, and `git diff --exit-code` is clean after the bundle.
- [ ] **Step 4:** Commit:
  - `feat(wireflow): board examples, skill triggers, docs`
  - `chore(marketplace): release wireflow 0.3.0 and bump to 0.9.0`

### Task 9: Real-world verification

**Files:** none in the repo (scratchpad only).

- [ ] **Step 1:** Copy the nalgae hakwon2 flow to the scratchpad and annotate it:
  - `view: board`, `primary: exam`
  - `exception` codes on `absent`, `unit-stop`, `stage-stop`, `hold`
  - events for the primary steps
- [ ] **Step 2:** Build the annotated copy, the untouched original, and both board examples. Take Playwright 1600×1000 screenshots after clicking fit. Expected, verified by reading the images:
  - card titles are legible
  - no edge crosses a card
  - exceptions sit in the red band
  - the untouched original renders without errors
- [ ] **Step 3:** Run the Task 6 smoke test steps on `trial-enrollment` in the board view, plus:
  - the log tab lists the events
  - the review tab count matches `check`
- [ ] **Step 4:** Fix any defects found in the owning module, with a regression test, and commit.
