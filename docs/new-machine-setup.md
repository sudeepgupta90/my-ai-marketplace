# Setting up on another machine

Two different things live in this repo, and they need different amounts of setup. Most of the time you only need the first.

1. **Using the catalog** — installing your skills into an agent on a machine you're sitting at. No clone required. This is what you do on a new laptop, a fresh VM, or any project you're working in.
2. **Developing the catalog** — editing `catalog/`, adding a skill, re-vendoring. This needs the repo cloned and Node installed, same as any codebase you'd hack on.

If this repo feels like "too much" for what is conceptually a list of skills, that's because it's both of these things stacked in one place: a catalog you consume, and the (small) toolchain that builds and guards it. You'll touch #2 rarely. The map at the bottom tells you which files are which.

## 1. Using the catalog on a new machine

Nothing here needs `git clone` — Claude Code fetches the marketplace itself. This is just the [Quickstart](../README.md#quickstart) again, with the reasoning:

```bash
# Register both marketplaces. Bundles depend on plugins from Anthropic's
# official marketplace, and that one is browsable by default but not
# *registered* by default -- installs fail without this line.
/plugin marketplace add sudeepgupta90/my-ai-marketplace
/plugin marketplace add anthropics/claude-plugins-official

# Install whichever bundles match what you're doing on this machine
/plugin install core-workflow@my-ai-marketplace
/plugin install meta@my-ai-marketplace

/reload-plugins
```

Then `/plugin` → **Marketplaces** → `my-ai-marketplace` → **Enable auto-update**. It's off by default for third-party marketplaces (this one included), and without it you're frozen at whatever commit was current when you added it.

That's the whole thing for Claude Code. Skills, hooks, and the plugin-doctor health check all come along with the bundle — there's nothing else to copy over.

### For other agents on that machine

```bash
# Gemini CLI -- clones the repo and auto-discovers skills/*/SKILL.md
gemini extensions install https://github.com/sudeepgupta90/my-ai-marketplace

# Codex -- needs the repo cloned locally, then symlinks skills/ into ~/.agents/skills/
git clone https://github.com/sudeepgupta90/my-ai-marketplace ~/code/my-ai-marketplace
cd ~/code/my-ai-marketplace && npm run sync:codex
```

Codex is the one exception to "no clone required" — it reads from a local symlink, not a remote fetch, so the repo has to exist on disk. `sync:codex` also prints which entries it *can't* carry (the Claude-only ones) so you're not left wondering why a skill didn't show up.

### For a project, not just yourself

If you want a repository's collaborators to get the same setup when they open it in Claude Code, copy [`templates/settings.json`](../templates/settings.json) into that repo's `.claude/settings.json`. That's a separate, generated file — not the one at the root of *this* repo (see below).

## 2. Developing the catalog on a new machine

Only needed if you're going to add a skill, change a bundle, or touch anything under `catalog/` or `scripts/`.

```bash
git clone https://github.com/sudeepgupta90/my-ai-marketplace
cd my-ai-marketplace
npm install
npm test           # confirms the clone is sane before you change anything
```

From there, [docs/adding-a-skill.md](adding-a-skill.md) is the walkthrough. The short version: edit `catalog/`, run `npm run build`, run `npm test`, commit — generated files and hand-written source are never edited independently of each other.

### About the `.claude/settings.json` at the repo root

This is easy to misread as part of the distributable catalog. It isn't — it's ordinary Claude Code project config, scoped to *this* repository, that happens to enable the bundles you use while developing here (so that when you're working *on* this repo, you also have `core-workflow` and `meta` active *in* this repo). It does not travel anywhere and a fresh clone on a new machine starts without it having any effect until Claude Code reads it in that checkout.

It is unrelated to [`templates/settings.json`](../templates/settings.json), which is generated, versioned against the catalog, and meant to be copied into *other* repositories (§1 above).

## What's what, if the repo feels big

You'll live in the left column. The right column is infrastructure that exists so the left column stays honest — you'll open it occasionally, not routinely.

| You touch often | You touch rarely |
| --- | --- |
| `catalog/plugins/*.yaml` — add/change what's installable | `scripts/` — the build, vendor, and doctor logic |
| `skills/<name>/SKILL.md` — skills you author yourself | `tests/` — pins the rules in `scripts/lib/catalog.mjs` |
| `README.md` prose (not the generated table) | `design/` — the *why* behind a rule, read before changing one |
| `docs/adding-a-skill.md` as a reference while editing | `.github/` — the daily re-vendor cron |

Everything on the right exists to answer one question honestly and automatically: *if I install this catalog on a machine, will it actually work the way the README says?* `npm test` and `npm run check` are what let you trust the answer without re-verifying it by hand each time.
