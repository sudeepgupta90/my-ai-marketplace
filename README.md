# my-ai-marketplace

A personal, self-owned catalog of AI skills — the way I want to work with AI driving execution.

Add it once and get a curated, auto-updating set of skills: a development methodology, infrastructure and document tooling, and the plumbing to keep it all current.

The setup is primarily targeted at Claude Code, but is **not locked to it**. Every skill it can legally carry is a real file in a plain [`skills/`](skills/) tree, in the cross-agent `SKILL.md` format — so the same content works from OpenAI Codex, Google's Gemini CLI / Antigravity, and anything else that reads Agent Skills. Each agent's manifest is generated from one catalog, never hand-written.

That is a deliberate choice, and the expensive one. Claude Code can fetch a third-party plugin from its source at install time, so *pointing* at an upstream is far less work than copying it. But a pointer is something only Claude Code can follow: to Codex and Gemini it is an empty entry. So upstream skills are **vendored** — copied into `skills/` and committed — whenever their licence permits it. What can't be copied is labelled Claude-only in the table below, with the reason.

## Quickstart

```bash
# 1. Register the marketplaces (both are needed -- see the note below)
/plugin marketplace add sudeepgupta90/my-ai-marketplace
/plugin marketplace add anthropics/claude-plugins-official

# 2. Install what you want
/plugin install core-workflow@my-ai-marketplace

# 3. Activate it in the current session
/reload-plugins
```

Then **turn on auto-update**: `/plugin` → **Marketplaces** → select `my-ai-marketplace` → **Enable auto-update**. This is off by default for third-party marketplaces, and without it nothing here ever updates.

> **Why two `marketplace add` commands?** Bundles depend on plugins from Anthropic's official marketplace. That marketplace is browsable by default in the `/plugin` Discover tab, but it is not a *configured* marketplace, and dependency resolution only searches configured ones. Without the second command, installs fail with `Dependency "..." not found. Is the "claude-plugins-official" marketplace added?` — verified against the CLI, see [docs/upstream-inventory.md](docs/upstream-inventory.md).

### For a whole project

Copy [`templates/settings.json`](templates/settings.json) to `.claude/settings.json` in any repository. When collaborators trust the folder, Claude Code offers to install the marketplaces and plugins for them.

## What's in it

<!-- catalog:start -->

### Bundles

| Bundle | Install | What it gives you |
| --- | --- | --- |
| **Core Workflow** | `/plugin install core-workflow@my-ai-marketplace` | The development methodology - spec to plan to execute, plus guidelines, handoff, and token-efficient output<br>Pulls in: superpowers, andrej-karpathy-skills, handoff, caveman, plugin-doctor, code-simplifier |
| **Docs & Knowledge** | `/plugin install docs-knowledge@my-ai-marketplace` | Author documents with a co-author, and read or write Office and PDF files<br>Pulls in: doc-coauthoring, document-skills, plugin-doctor |
| **Frontend** | `/plugin install frontend@my-ai-marketplace` | Build distinctive, production-grade interfaces, with theme and design system support<br>Pulls in: plugin-doctor, frontend-design, ui-theme-designer |
| **Infrastructure** | `/plugin install infra@my-ai-marketplace` | Terraform and database work - IaC grounded in HashiCorp best practices, plus official MCP servers<br>Pulls in: terrashark, plugin-doctor, terraform, planetscale |
| **Meta** | `/plugin install meta@my-ai-marketplace` | Build the setup itself - author skills, build plugins and MCP servers, review code and security<br>Pulls in: mcp-builder, plugin-doctor, skill-creator, plugin-dev, security-guidance, pr-review-toolkit |

### Individual plugins

| Plugin | Source | Licence | Works in | Updates |
| --- | --- | --- | --- | --- |
| `andrej-karpathy-skills` | [sudeepgupta90/extended-andrej-karpathy-skill](https://github.com/sudeepgupta90/extended-andrej-karpathy-skill) | MIT | any agent | daily re-vendor PR |
| `caveman` | [JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman) | MIT | any agent | daily re-vendor PR |
| `doc-coauthoring` | [anthropics/skills](https://github.com/anthropics/skills) | LicenseRef-Anthropic-Services | Claude Code only | every upstream commit |
| `document-skills` | [anthropics/skills](https://github.com/anthropics/skills) | LicenseRef-Anthropic-Services | Claude Code only | every upstream commit |
| `handoff` | this repo | MIT | any agent | every commit here |
| `mcp-builder` | [anthropics/skills](https://github.com/anthropics/skills) | Apache-2.0 | any agent | daily re-vendor PR |
| `plugin-doctor` | this repo | MIT | any agent | every commit here |
| `superpowers` | [obra/superpowers](https://github.com/obra/superpowers) | MIT | any agent | daily re-vendor PR |
| `terrashark` | [LukasNiessen/terrashark](https://github.com/LukasNiessen/terrashark) | MIT | any agent | daily re-vendor PR |

<!-- catalog:end -->

## How it stays current

Two layers, and the first is the one that matters.

**Daily re-vendor.** [`vendor-sync.yml`](.github/workflows/vendor-sync.yml) re-fetches every vendored upstream each morning and opens a pull request if anything moved. The diff is the changelog: you read the skill text that actually changed rather than a version bump you have to go and look up. Merging it updates every agent at once, because they all read the same files.

This is also the review gate. Vendored skills reach your sessions the moment they land, so a PR is what stops an upstream having a bad day from reaching you unreviewed. To hold one back, pin a 40-character `sha` on its entry in [`catalog/plugins/`](catalog/plugins/) and rebuild.

**Claude Code's background auto-update**, for the marketplace itself and for the Claude-only pointers. It refreshes shortly after a session starts and prompts you to `/reload-plugins`. A plugin's version is the first of `version` in `plugin.json`, `version` in the marketplace entry, or **the git commit SHA**; entries here declare no version, so they float on the SHA and every commit is a new version.

Vendored skills are committed, so they can also be edited by hand — which the next sync would silently revert. CI runs `npm run vendor:check` to catch that while it is still in review.

## Adding or changing a skill

The catalog is the single source of truth. **Never edit the generated files** — `.claude-plugin/marketplace.json`, `gemini-extension.json`, and `templates/settings.json` are all output.

```bash
npm install
npm run build     # regenerate every manifest
npm test          # tests over catalog validation and manifest emission
npm run check     # CI gate: fails if generated files are stale
```

See [docs/adding-a-skill.md](docs/adding-a-skill.md) for the walkthrough, and [docs/upstream-inventory.md](docs/upstream-inventory.md) for why each source was chosen or rejected. Setting this up on a machine you haven't used it on yet? See [docs/new-machine-setup.md](docs/new-machine-setup.md).

For *why* the repository is built this way — the vendoring decision, the licence tiers, the Claude Code failure modes, and the alternatives that were rejected — see [design/](design/).

## Using it with other agents

```bash
# Gemini CLI -- clones this repo and auto-discovers skills/*/SKILL.md
gemini extensions install https://github.com/sudeepgupta90/my-ai-marketplace

# Codex -- symlinks skills/ into ~/.agents/skills/, so one `git pull` updates everything
npm run sync:codex
```

Both see every skill in [`skills/`](skills/), vendored ones included. The only exceptions are the entries marked *Claude Code only* above, whose licences forbid copying, plus plugins that live in Anthropic's marketplace. `npm run sync:codex` prints exactly which ones and why.

## Credits and licensing

Most of what is here was written by other people, and vendoring means this repo redistributes their work. That is only done where the licence allows it:

- **Permissive upstreams** (MIT, Apache-2.0) are vendored outright. Each copied directory keeps the upstream `LICENSE` alongside the skill, so the terms travel with the files into other agents.
- **Unlicensed upstreams** are vendored only on a recorded basis. `karpathy-guidelines` publishes no licence, so it is carried under GitHub's ToS §D.5 fork rights, with a `NOTICE` naming the author and an open offer to remove it on request. The build refuses to vendor these without both a stated `licenseGrant` and an `attribution`.
- **Upstreams that forbid copying** are never vendored. Anthropic's document skills and `doc-coauthoring` bar retaining copies outside their Services, so they stay pointers that Claude Code fetches for you. No justification overrides this — the validator rejects it outright.

Every vendored skill carries a `.upstream.json` recording its source repo, exact commit, licence and author. Authors who would prefer their work not be carried here should open an issue; it will be removed.

## License

MIT for the contents of this repository. Vendored skills remain under their own licences, included in each skill's directory.
