---
name: start
description: Turns a brief, planning notes, screenshots, routes, or a feature-intake/ui-operator analysis into a clickable wireflow — a flowchart of steps, decisions, and actors before screens exist, or simple mock screens (mobile, desktop, messages, emails, documents) connected by arrows — so the user can walk one goal end to end and find missing steps, dead ends, and recovery gaps before visual design. Triggers include "wireflow", "와이어플로우", "순서도로 보여줘", "업무 흐름 시각화", "기획 단계 플로우", "와이어프레임으로 흐름 보여줘", "화면 흐름 검토", "유저 플로우 클릭해볼 수 있게", "플로우 빠진 단계 찾아줘", "실패하면 어디로 가?", "review the user flow", "clickable flow", "flowchart", "flow review". Writes only docs/wireflow/SLUG/SLUG.flow.json and docs/wireflow/SLUG/SLUG.html in the user's project and never modifies application code. Do not use for pixel-level visual design, for screenshot comparison of an implemented UI (use ui-operator), or for browser QA of a running app (use qa-operator).
---

# wireflow — build and review a clickable flow

## When to use

- Early planning, before any screen design: the user wants a **flowchart** of who does what, where it branches, and what happens on failure. Use `view: "flowchart"`, `actors`, and `step`/`decision`/`system`/`wait`/`end` nodes.
- Planning a new app or feature and the user wants to see the **structure and flow**, not the visuals.
- An existing implementation (or PoC) seems to block a journey — "결제 실패하면 갇혀요", "뒤로 가면 입력이 날아가요" — and the user wants the broken flow and the fix options side by side.
- feature-intake produced `analysis/user-flow.md` / `action-graph.md`, or ui-operator is about to change a multi-screen flow, and a clickable map would make the review faster.

Pre-conditions: some planning material (brief, notes, screenshots, routes, issue, or a feature-intake package). If there is none, ask for a short brief — do not invent a product. Node.js 18+ to build; without it, deliver the flow JSON and say the HTML needs a local run.

## Output contract

```text
docs/wireflow/<slug>/
├── <slug>.flow.json   # source of truth, hand-editable
└── <slug>.html        # self-contained viewer, rebuilt from the JSON
```

- If the user names another location, use it, and keep both files side by side.
- Never modify application source, tests, or other docs. Never overwrite an existing `*.flow.json` without reading it first; when one exists, this is a revision — use `wireflow:revise`.
- The viewer stores change requests in the browser's localStorage keyed by flow `id` and HTML filename, so keep both stable across rebuilds.

## Pipeline

1. **Collect sources.** Read the brief, notes, screenshots, routes, or `docs/feature-intake/<slug>/analysis/{action-graph,user-flow}.md` when present. Note each source in the flow's `source` field. Pick a slug (kebab-case) and confirm it only if ambiguous.

2. **Model the flow.** Read [`references/flow-model.md`](references/flow-model.md), then write `<slug>.flow.json`:
   - Pick the fidelity: no screens decided yet → `view: "flowchart"` with `actors` and non-screen kinds; screens matter → `kind: "screen"` with `device` per node (customer `mobile`, staff `desktop`). Notifications, emails, and reports are `message`/`email`/`document`, not fake screens.
   - Group nodes into `stages` by user task. Give every node a stable `id` and `number`.
   - Draw the controls a person actually needs to act. Include normal path, relevant **empty / failed / pending** states, and the **cancel, back, retry** routes around each main journey.
   - Mark provenance: `origin: "source"` for what the brief asks, `"observed"` for what an existing build does, `"inferred"` for screens you added. Put the brief excerpt in `brief`, conditions in `notes`, open policy questions in `decisions`.
   - When an existing implementation blocks a required journey, **reproduce the broken flow as the baseline** (`to: null`, no retry action, trapped screen) and put each working alternative in `proposals[].changes`. Do not fix the baseline silently.
   - Real-world side effects (payment, upload, SMS) use dummy `sim` actions with dummy values.
   - Match the user's language and set `locale`.

3. **Turn requirements into scenarios.** One `requirements` entry per observable requirement in the brief. For each main journey, write a scenario and link it (`requirements: [...]`). Before marking a goal covered, encode the source verb, object, and observable result as step assertions:
   - "save and revisit" → enter a distinct value, leave, come back, assert the value.
   - "retry after failure" → distinctive input, trigger failure, retry, assert input kept, reach the real success screen.
   - Exercise empty input where the brief implies validation (`when` guard or a separate error screen).
   Keep unspecified retention/overwrite policy as a `decision`, not an assumption.

4. **Check and build.** From the project root:
   ```sh
   WF="${CLAUDE_PLUGIN_ROOT}/scripts/wireflow.mjs"   # or <this skill>/../../scripts/wireflow.mjs
   node "$WF" check docs/wireflow/<slug>/<slug>.flow.json
   node "$WF" check docs/wireflow/<slug>/<slug>.flow.json --with <proposal-id>   # for each proposal
   node "$WF" build docs/wireflow/<slug>/<slug>.flow.json docs/wireflow/<slug>/<slug>.html
   ```
   Exit 2 means invalid JSON/model — fix and rerun. Exit 1 on the baseline is expected when it reproduces a real gap; the matching scenario should pass with `--with`. Any *unexpected* finding (typo'd id, unreachable screen you did not intend) is a modeling error: fix it.

5. **Open and walk it.** Open the HTML (`open <file>` on macOS). When browser automation is available, select one main journey and one recovery scenario in **경로**, click **직접 걸어보기**, and click through; capture one screenshot if useful.

6. **Report in chat** (short):
   - Links to the HTML and the JSON.
   - **One path to try first** (scenario title).
   - Findings that matter: trapped / missing / failing scenarios, with screen numbers.
   - Open `decisions` the user must answer.
   - Proposals and what `check --with` showed for each.
   - How to send feedback: select a screen → **수정 요청 담기** → **수정 요청 → 모두 복사** → paste into this chat (handled by `wireflow:revise`).

## Hallucination guardrails

- Every screen and action traces to a source or is marked `inferred`. Do not present inferred screens as requirements.
- Do not answer `decisions` on the user's behalf; a scenario may pick one candidate only to exercise the mockup, and say so.
- Do not claim a journey "works" unless a scenario that asserts its observable result passes. `check` verifies the model, not a real app.
- When reproducing an existing build, model what was observed (screenshots, routes, code you read). If you could not observe a state, mark it `inferred` and say so.
- Static reachability ignores `when` guards; only scenarios exercise guards and state.

## Done criteria

- [ ] `<slug>.flow.json` passes `check` without exit 2; every remaining finding is either intended (reproduced gap) or reported.
- [ ] Each required journey has a scenario with screen/var assertions, linked to its requirement.
- [ ] Each proposal was checked with `--with`, and conflicts (alternatives) are labeled as such.
- [ ] `<slug>.html` built from the current JSON and opened (or the reason it could not be).
- [ ] Chat report lists the HTML/JSON links, one path to try, findings, decisions, and the feedback loop.
