---
name: later
description: Saves a side question for later without leaving the current line of work — one row in the "나중에 볼 것" list. Triggers include "/thread-keeper:later", "park this", "save for later", "나중에 보자", "나중에 볼 것에 넣어줘", "이건 나중에", "주차장에 넣어줘". Writes only `.threads/MAIN.md` (main session) or the current capsule's Later notes (branch session) and never modifies other files.
---

# later — save a side question for later

## When to use
- A question comes up that is worth keeping but would derail the current step.
- Argument: the question, e.g. `/thread-keeper:later implementation vs testImplementation`. Without an argument, use the most recent side question and quote it.

## Output contract
- Main session: appends one row to `## Later` in `.threads/MAIN.md` (date, question, origin = current step).
- Branch session: appends one bullet under `Later:` in its own capsule's `## Result` notes (created if missing); it reaches MAIN.md when merged.
- Chat reply: one line + breadcrumb. Never modifies files outside `.threads/`.

## Pipeline
1. Normalize the question to one line; keep the user's wording.
2. Append it (main → MAIN.md `## Later`; branch → capsule).
3. Reply: "나중에 볼 것에 넣었어요: <question>" and continue the current step.
4. Breadcrumb: `---` then the 📍 or 🌿 line with the updated count.

## Hallucination guardrails
- Do not answer the parked question in the same reply unless the user asks.
- Do not merge two different questions into one row.

## Done criteria
- [ ] One row/bullet added in the right file.
- [ ] Reply is one line + breadcrumb; the current step continues.
