---
name: branch
description: Opens a branch from the current conversation — writes a small capsule file with only the context needed to continue one point in another window, session, or agent, and prints a one-line command to start it. Triggers include "/thread-keeper:branch", "branch this", "fork this point", "continue this in another session", "가지:", "가지 쳐줘", "이거 다른 세션에서 이어갈래", "이 내용 다른 창에서 파고들래". Writes only `.threads/<date>-<slug>.md` and `.threads/MAIN.md` in the project root and never modifies other files. Do not use to archive a whole session or for a single quick question that can be answered inline.
---

# branch — open a branch with a capsule

## When to use
- The user wants to dig into one point (a quoted message, a list item, a question) without losing the main line, usually in another window or agent.
- Argument: the topic, e.g. `/thread-keeper:branch toolchain vs JAVA_HOME`. If no topic and the starting point is unclear ("이거"), ask one short question.
- Pre-condition: a writable project root (nearest git root or current directory). If not writable, print the capsule in chat and say so.

## Output contract
- Writes `.threads/<YYYY-MM-DD>-<slug>.md` (new capsule, `status: open`).
- Creates or updates `.threads/MAIN.md` (adds the branch row). Only the **main** session writes MAIN.md. If this command runs inside a branch session (nested branch), do not touch MAIN.md; set `return-to` to the parent branch and name the file `<date>-<parent-slug>--<child-slug>.md`.
- Chat reply: at most 3 lines plus one copy-paste command, then the breadcrumb. Never paste the capsule body into chat.
- Never copies secrets or credentials into a capsule; reference file paths instead. Never modifies any other file.

## Pipeline
1. **Starting point.** Use the user's quoted text, or the most recent message that the topic refers to. Keep it verbatim (≤ 5 lines).
2. **Collect context from the conversation only.**
   - Decided so far: only what the user said or explicitly accepted.
   - Open questions: what the branch should resolve, plus assistant proposals the user has not confirmed.
   - Files: relative paths that matter, one-line purpose each.
   - Constraints: user rules still in force (language, tone, coaching style, do/don't).
   - Return-to: the main step and next action (or the parent branch for nested branches).
3. **Write the capsule:**
   ```markdown
   # Thread: <topic>
   - status: open
   - created: <ISO datetime> · project: <project root>
   - return-to: <main step and next action | parent branch>

   ## Start here
   > <verbatim starting point>

   ## Decided so far
   - …

   ## Open questions
   - …

   ## Files
   - <path> — <purpose>

   ## Constraints
   - …

   ## Instructions for the branch session
   - Continue from "Start here". Do not redo decided items. Keep to this topic; offer `/thread-keeper:later` for drift.
   - End every reply with `---` and one line: `🌿 지금: 가지 <topic> · 메인 복귀: <return-to>`.
   - When the user runs `/thread-keeper:merge` or says "합쳐", fill `## Result` below, set `status: closed`, and say: "기록했어요. 메인 창에서 /thread-keeper:merge 하세요."

   ## Result
   _(branch session fills this)_
   ```
4. **Update MAIN.md** (main session only):
   ```markdown
   # Main thread
   - updated: <ISO datetime>
   - position: <current main step>
   - next: <next action>

   ## Branches
   | file | topic | status | return-to |

   ## Later
   | date | question | origin |
   ```
5. **Reply** (≤ 3 lines): what was created, then the command for the other window:
   `claude "Read .threads/<file> and continue from its Start here section."`
   and one line: "다른 AI라면 이 파일 내용을 붙여 넣으세요."
6. **Breadcrumb:** `---` then `📍 지금: <main step> · 다음: <next action> (가지 <n>개, 나중에 볼 것 <n>개)` — omit zero counts.

## Hallucination guardrails
- Quote the starting point verbatim; never paraphrase it into a stronger claim.
- Do not put unconfirmed assistant suggestions under "Decided so far".
- If the conversation was compacted and a detail is unknown, write `[unknown after compaction]`.
- If the project root is ambiguous (several repos discussed), ask which one.

## Done criteria
- [ ] Capsule exists with every section, `status: open`, starting point verbatim.
- [ ] MAIN.md lists the branch (main session) or the capsule records its parent (nested).
- [ ] Reply ≤ 3 lines + command + breadcrumb.
- [ ] No file outside `.threads/` modified.
