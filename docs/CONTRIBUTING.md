# Contributing

How to add a new plugin or a new skill to `donghyuns-claude`. The conventions in [`CONVENTIONS.md`](CONVENTIONS.md) are normative; this doc is the recipe.

---

## Adding a new plugin

### 1. Decide it belongs here

Re-read [`PHILOSOPHY.md`](PHILOSOPHY.md). A plugin earns its place by **reducing a kind of loss** — shared understanding, institutional knowledge, regression coverage, or refactor visibility. If the plugin generates features or "does more things", it belongs in a different marketplace.

### 2. Scaffold the directory

```
plugins/<plugin-name>/
├── .claude-plugin/
│   └── plugin.json
├── README.md
├── docs/
│   ├── CONCEPTS.md
│   ├── WORKFLOW-GUIDE.md
│   ├── EXAMPLES.md
│   └── TROUBLESHOOTING.md
└── skills/
    └── <first-skill>/
        └── SKILL.md
```

Single-skill plugins may omit `docs/` until they grow.

### 3. Write `plugin.json`

```json
{
  "name": "<kebab-case>",
  "version": "0.1.0",
  "description": "<one sentence: what it does AND who benefits>",
  "author": { "name": "Donghyun", "email": "edonghyun@hankyopa.com" }
}
```

### 4. Register in the marketplace

Add an entry to `.claude-plugin/marketplace.json`:

```json
{
  "name": "<plugin-name>",
  "description": "<one sentence>",
  "version": "0.1.0",
  "source": "./plugins/<plugin-name>",
  "category": "productivity"
}
```

Bump the marketplace's own version (minor for new plugin, patch for description tweaks).

### 5. Update the marketplace README

Add a section under "Plugins" mirroring the spec-mirror entry: mission paragraph, skills table, triggers, generated structure. Match the **depth**, not just the format — a one-line description doesn't help users decide whether to install.

### 6. Commit

```
<plugin-name>: scaffold plugin with <first-skill> skill

<2-3 sentences describing the mission and how it reduces loss>
```

---

## Adding a new skill to an existing plugin

### 1. Check it fits the plugin's mission

Each plugin has a single mission stated in its `docs/CONCEPTS.md`. A new skill must extend that mission, not branch into a new one. If it doesn't fit, it's a new plugin.

### 2. Scaffold the directory

```
plugins/<plugin>/skills/<new-skill>/
├── SKILL.md
├── assets/        (only if the skill copies files into projects)
└── CHANGELOG.md   (only if the skill will have multiple versions)
```

### 3. Write `SKILL.md`

Use the section structure required by [`CONVENTIONS.md`](CONVENTIONS.md) §4:

1. When to use (triggers + pre-conditions)
2. Output contract (one section listing every file written)
3. Pipeline (numbered phases)
4. Hallucination guardrails
5. Done criteria

The frontmatter `description` must be precise enough that Claude's skill router will fire it on the right user phrases (and only those). Include Korean triggers.

### 4. Update the plugin README

Add the skill to the skills table. Mention it in `docs/WORKFLOW-GUIDE.md` if it composes with existing skills (it usually does — that's the point).

### 5. Bump the plugin version

- New skill → minor bump (e.g. 0.2.0 → 0.3.0).
- Bug fix in an existing skill → patch.
- Output contract change to an existing skill → major.

Also update the version in `marketplace.json`.

### 6. Commit

```
<plugin>: add <new-skill> skill for <what it does>

Bumps <plugin> to <new-version>. <2-3 sentences on the mission and
how it composes with existing skills.>
```

---

## Style guidelines (taste, not rules)

- **Korean + English everywhere.** Triggers, docs, comments where helpful. Korean is the primary language of this marketplace.
- **Output contract over output quality.** A skill that always writes a small, predictable file is more useful than one that sometimes writes a perfect file.
- **Composability over completeness.** It's fine for a skill to do one thing imperfectly if the next skill in the workflow picks up the slack. `gen-tests` writes stubs, not finished tests — that's a feature.
- **Show, don't tell in docs.** `EXAMPLES.md` should contain real output samples. `CONCEPTS.md` should define terms used by name in `SKILL.md` files. Avoid prose that doesn't pay rent.
- **Korean comments in code-style blocks are encouraged** where they sharpen meaning (e.g. trigger lists, lesson titles).

---

## What gets rejected

- Plugins that generate net-new code or content as their primary purpose (no LLM creativity layers).
- Plugins that depend on external paid APIs by default.
- Skills without an output contract.
- Skills whose `description` is too vague to route reliably ("does helpful stuff with code").
- Anything that prompts the user during an audit run.

---

## Releasing

This is a personal marketplace; releases happen by pushing to `main`. Once the repo has a GitHub remote, users add it with:

```bash
/plugin marketplace add donghyuns-claude https://github.com/<owner>/donghyuns-claude
```

Tag major versions (`v1.0.0`, `v2.0.0`) for milestone snapshots; everything else lives on `main`.
