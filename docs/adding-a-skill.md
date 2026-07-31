# Adding a skill

The catalog is the source of truth. You edit `catalog/` and `skills/`, then run `npm run build`. Never hand-edit `.claude-plugin/marketplace.json`, `gemini-extension.json`, or `templates/settings.json` — they are generated, and CI fails if they drift from the catalog. The same goes for any `skills/` directory containing a `.upstream.json`: it was vendored from an upstream and the next sync overwrites it.

## The rule that decides everything: vendor, or point?

Claude Code's installer can fetch a plugin from its source repo, so *pointing* at an upstream is much less work than copying it. Do not be tempted. A pointer is something only Claude Code can follow - to Codex and Gemini it is an empty entry, and a catalog of pointers is a Claude-only catalog wearing a portable costume.

So: **vendor whenever the licence permits, point only when it does not.** Check the licence first, because it decides which of the cases below you are in.

```bash
curl -sL https://api.github.com/repos/OWNER/REPO | grep -A2 '"license"'
```

Three tiers, all enforced by the validator:

| What you find | What to do |
| --- | --- |
| MIT, Apache-2.0, BSD, ISC, … | `upstream.vendor` — copied in, portable everywhere |
| No licence at all | `upstream.vendor` **plus** `licenseGrant` and `attribution` recording the basis |
| A licence forbidding copying | `upstream.notVendored` — a pointer, Claude Code only. Not overridable |

Beware repositories that licence **per skill**: `anthropics/skills` has no repo-wide `LICENSE`, and its skills differ — `mcp-builder` is Apache-2.0 while `docx` reserves all rights. Check the individual `LICENSE.txt`, and split into separate catalog entries when they disagree.

## Decide first: does it already exist?

**Check Anthropic's official marketplace before adding any third-party source.** It carries 276 plugins, and triage found it already covered 5 wishlist items — including two (`planetscale`, `terraform`) that looked like they needed external sources.

```bash
claude plugin marketplace add anthropics/claude-plugins-official   # once
claude plugin list --json --available | grep -i <what-you-want>
```

An official plugin is the better source: Anthropic maintains it, it auto-updates, and depending on it beats carrying a staler copy here.

## Case 1 — a skill you write yourself

Best for anything specific to how you work, and for cases where the only upstream is unproven.

1. Create `skills/<name>/SKILL.md` with `name` and `description` frontmatter. The description is what an agent matches against, so describe *when to use it*, not just what it is.
2. Add it to a unit's `skills:` list in `catalog/plugins/`, or give it a new unit:

   ```yaml
   kind: unit
   name: my-thing
   description: What it does, in a sentence that will read well in the /plugin picker
   category: workflow
   skills:
     - my-thing
   ```

3. `npm run build && npm test`

Write it agent-neutrally: describe capabilities rather than naming Claude-specific slash commands, so the same file works from Codex and Gemini, alongside the vendored ones.

## Case 2 — a third-party upstream you can vendor

The normal case. Declare the source and licence; the fetcher does the rest.

```yaml
kind: unit
name: their-plugin
description: ...
attribution: Their Name
upstream:
  repo: owner/repo
  license: MIT
  vendor:
    from: skills          # directory holding <skill>/SKILL.md; defaults to "skills"
    only: [one, two]      # optional -- omit to take everything
```

Then `npm run vendor`, which copies the skill directories into `skills/`, keeps the upstream `LICENSE` beside each one, and writes a `.upstream.json` recording the exact commit. Commit the result: those files are what Codex and Gemini read.

Two upstream shapes are handled automatically. A `skills/` tree of many skills is the common one. A repo that *is* a single skill, with `SKILL.md` at its root, is detected by looking for that file — set `from: .` and give it a name with `as`, plus `include` to avoid dragging in the repo's CI and docs:

```yaml
upstream:
  repo: LukasNiessen/terrashark
  license: MIT
  vendor:
    from: .
    as: terrashark
    include: [SKILL.md, references, assets, LICENSE]
```

**Do not** depend on the upstream's own marketplace across marketplaces: that would need both an allowlist entry and every user having registered that marketplace themselves. Vendoring keeps `my-ai-marketplace` the only marketplace anyone adds.

### Vendoring an unlicensed upstream

No licence means all rights reserved — attribution is a courtesy, not a grant. The validator therefore refuses to vendor it until you record the basis you are relying on and credit the author:

```yaml
attribution: Their Name
upstream:
  repo: owner/repo
  license: none
  licenseGrant: >-
    GitHub ToS D.5 grants all GitHub users the right to view and fork public
    repositories; this copy stays on GitHub, keeps authorship intact, and is
    removed on request. A licence has been requested upstream. Reviewed <date>.
  vendor:
    from: skills
```

The fetcher writes a `NOTICE` into each copied directory naming the author and stating that basis, so it travels with the files. The durable fix is upstream adding a `LICENSE`; ask.

## Case 3 — an upstream you may not copy

Some licences forbid it outright. Anthropic's per-skill terms bar retaining copies outside their Services, reproducing them, or distributing them. There is no override — say so and take the pointer:

```yaml
upstream:
  repo: anthropics/skills
  license: LicenseRef-Anthropic-Services
  notVendored: >-
    Anthropic's licence forbids retaining copies outside the Services.
    Claude Code fetches it at install time instead. Verified <date>.
  strict: false
  skills:
    - ./skills/doc-coauthoring
```

`strict: false` makes the marketplace entry the whole plugin definition, so only the listed skills load rather than the 12 that `example-skills` bundles — each of which would cost context every session.

Such an entry is Claude Code only, and `npm run sync:codex` says so by name. Keep the set small.

## Case 4 — a bundle

A bundle is a dependency manifest. Installing it installs and enables everything it names.

```yaml
kind: bundle
name: my-domain
description: ...
dependencies:
  - some-unit                 # bare string = this marketplace
  - plugin-doctor             # required: every bundle must depend on it
  - name: frontend-design     # qualified = another marketplace
    marketplace: claude-plugins-official
```

Every bundle must depend on `plugin-doctor`. A plugin whose dependency fails to resolve is disabled *silently*, and the doctor is what turns that into a visible warning. A test enforces this.

## Adding a new marketplace to depend on

Only if a plugin genuinely cannot be re-listed as a unit. Add it to `allowCrossMarketplaceDependenciesOn` in `catalog/marketplace.yaml` with a real justification:

```yaml
  - name: some-marketplace
    registeredByDefault: false
    addCommand: /plugin marketplace add owner/repo
    why: >-
      Why this source is trusted and why a unit pointer will not do.
```

`registeredByDefault` must reflect reality. **No marketplace is registered by default, including `claude-plugins-official`** — it is browsable in the Discover tab but is not configured, and dependency resolution only searches configured marketplaces. Getting this flag wrong produces a plugin that silently disables itself for everyone but you. The generator refuses to build without an `addCommand` for anything not registered by default, and that command is printed into the quickstart.

## Renaming or removing

A plugin's `name` is permanent — users reference it in `enabledPlugins` and install commands. To rename, add to the `renames` map in `catalog/marketplace.yaml`:

```yaml
renames:
  old-name: new-name
  removed-thing: null
```

Treat it as append-only. Claude Code follows chains, so a later rename adds a second entry rather than editing the first. Keep old entries forever, even once you think everyone has migrated.

## Freezing a bad upstream

The daily re-vendor PR is the review gate, but a merged bad change reaches every agent at once. To hold an upstream at a known-good commit:

```yaml
upstream:
  repo: owner/repo
  sha: <full 40-character commit SHA>
```

That pins it exactly until you remove the line. The validator rejects a short SHA, since Claude Code requires all 40 characters.

## Before you push

```bash
npm run vendor        # re-fetch upstream skills
npm run build         # regenerate every manifest
npm test              # catalog rules and emission
npm run check         # confirm nothing generated is stale
npm run vendor:check  # confirm vendored skills match upstream
claude plugin validate ./ --strict
```

Then test the install for real, which catches things no schema can:

```bash
claude plugin marketplace add ./
claude plugin marketplace update my-ai-marketplace     # after any catalog change
claude plugin install <your-bundle>@my-ai-marketplace --scope local
```
