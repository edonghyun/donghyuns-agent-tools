# wireflow:start changelog

## 0.3.0 — 2026-11-26

- The journey board replaces the actor-lane flowchart. The board lays itself out with the `primary` path on a spine, an exception band and a decision band below it, and orthogonal edges. Cards carry chips for `state`, `metrics`, `experiments`, `notify`, and exception codes. `view: "flowchart"` still opens as the board.
- New flow fields: `primary`, `events`, `eventProps`, and the node fields `state`, `metrics`, `experiments`, `notify`, `exception`, and `dormant`. Actors may be `{name, color}`.
- `check` reports `broken-event`, `unknown-primary`, `orphan-exception`, and `untracked-step`.
- A **로그 리스트** tab lists the events and the shared properties.
- A highlighted scenario numbers its steps on the board's edges, and the step it failed at shows red on both views.
- New triggers: 유저 저니 보드, 저니 보드, 서비스 블루프린트, journey board, service blueprint. A pipeline step fills the board fields, and new flows always state `view`.
- `example --board` copies the new `trial-enrollment` sample. `--flowchart` is an alias for it.
- Internals: the model is split into modules, and the viewer is rebuilt as a store plus components, bundled by esbuild into the committed `dist/`. Biome lints the code.

## 0.2.0 — 2026-11-24

- First release. A brief becomes a flow JSON. `check` then runs: it finds broken and missing links, unreachable and trapped nodes, and failing scenarios, and it measures requirement coverage. The result is a single-file HTML viewer.
- The wireframe view draws a device frame for each node (mobile, tablet, desktop, watch, kiosk, or a custom size) plus message, email, and document cards. The flowchart view draws actor lanes by stage.
- Proposals preview in memory. Reviewers copy change requests back to the agent.
