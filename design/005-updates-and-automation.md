# 005 — Updates and automation

## Decision

A daily job re-fetches every vendored upstream and **opens a pull request** if anything changed:
[`vendor-sync.yml`](../.github/workflows/vendor-sync.yml). A bot proposes a reviewable change, a human
merges it, and merging updates every agent at once because they all read the same files. See the update
flow diagram in [architecture.md](architecture.md#update-flow).

## Why not just float on commit SHA

Omitting `version` from an entry makes the git commit SHA the version, and Claude Code's background
auto-update would deliver each new commit on its own. Two things rule this out as the whole mechanism:
most upstreams pin their own `version` in `plugin.json`, which beats the SHA in resolution order and
stops it floating at all; and it only ever reaches Claude Code — Codex and Gemini get nothing from it.
Vendoring sidesteps both, since this repo's own commits become the version regardless of what upstream
does.

## Why a pull request rather than a direct commit

Vendored skills reach every agent the moment they land — there's no per-user staging. A pull request is
the only point at which a bad upstream release can be stopped, and the diff shows the skill text that
actually changed rather than a version bump that has to be looked up elsewhere. To hold an upstream back,
pin a full 40-character `sha` on its catalog entry.

## The second layer

Claude Code's background auto-update still handles two things directly: the marketplace itself (new or
changed catalog entries), and the Claude-only pointers that float on their upstream's commits. It's off
by default for third-party marketplaces, so onboarding has to say to enable it.

## Guarding against hand-edits

Vendored files are committed, so they *can* be hand-edited — and the next sync would silently revert
that. `npm run vendor:check` re-fetches and diffs in CI to catch it while still in review.

## Fetch mechanics

- **Blobless sparse clone** (`--filter=blob:none --sparse`) so a repo like `anthropics/skills`, which
  carries megabytes of unrelated content, costs only the directory actually wanted.
- **Licence read via `git show HEAD:LICENSE`**, not the checkout — cone-mode sparse checkout only accepts
  directories, so a root `LICENSE` file can't be added to the cone.
- **Single-skill repos** (`SKILL.md` at the root) are detected by presence of that file, not a schema
  flag; `include` trims the copy so a repo's own CI config isn't vendored along with it.
- **One unreachable upstream doesn't block the others** — failures are collected and reported per entry.
