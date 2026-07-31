# 003 — Catalog as source of truth

## Decision

One catalog, expressed as YAML in [`catalog/`](../catalog/), generates every agent-specific manifest.
Nothing agent-specific is ever hand-written.

```
catalog/marketplace.yaml     identity, cross-marketplace allowlist, renames
catalog/plugins/*.yaml       one file per entry
skills/<name>/SKILL.md       the portable content
        |
        v  scripts/build.mjs
        |
  ┌─────┴──────┬──────────────────┬─────────────────┐
  v            v                  v                 v
.claude-plugin/  gemini-        templates/       README.md
marketplace.json extension.json settings.json    catalog table
```

Generated files are committed — consumers fetch this repo directly, no build step — but never edited.
`npm run check` regenerates and fails in CI if anything differs.

## Why not hand-write `marketplace.json`

It can't express the other agents — Gemini needs `gemini-extension.json`, Codex needs a skills directory
— and it has no comments, so the reasoning behind an entry (why it's a pointer, when a licence was
checked) would have nowhere to live. [006](006-making-failures-loud.md)'s checks also need a generation
step they can refuse to complete.

## Two kinds of entry

- **Unit** — contains skills, authored here or vendored from an upstream.
- **Bundle** — a `dependencies` array; installing one installs and enables everything it names. Bundles
  are a Claude Code concept and flatten for other agents, which just get the union of `skills/`.

## Why the filesystem is the record for vendored skills

Membership lives in `skills/<name>/.upstream.json`, not a central lockfile:

```json
{ "entry": "superpowers", "repo": "obra/superpowers", "sha": "3dcbd5c…", "license": "MIT" }
```

A lockfile can disagree with the directories that actually exist. With provenance files, the tree *is*
the record — a half-finished vendor run is visible, not inferred. Two failure modes fall out of this for
free: an entry with nothing on disk (`run npm run vendor`), and an orphaned directory whose entry was
deleted (files with no owner left to update them).

## Consequences

- Adding an agent means writing one generator, not restructuring content.
- `catalog/plugins/*.yaml` is the complete audit surface — every source, licence, and dependency in one
  greppable directory.
- A plugin's `name` is permanent. Renames go through an append-only `renames` map, never an edit.
