# 004 — Claude Code integration

Claude Code is the primary target and the only agent with a real distribution system. This records how
that system is used, and the two ways it fails quietly.

## Official plugins, without forking them

Several wanted capabilities already ship in Anthropic's official marketplace (`frontend-design`,
`code-simplifier`, `terraform`, `planetscale`, and others). Rather than fork them — a staler copy under a
duplicate name — bundles declare them as **cross-marketplace dependencies**:

```yaml
kind: bundle
name: frontend
dependencies:
  - plugin-doctor
  - name: frontend-design
    marketplace: claude-plugins-official
```

Installing the bundle auto-installs and enables the dependency at the same scope, and Claude Code refuses
to let it be disabled while something still needs it. These entries are necessarily Claude-only: they
carry commands and hooks, not plain skill files, so there's nothing to vendor.

## Failure mode 1 — the cross-marketplace allowlist

Claude Code refuses by default to auto-install a dependency from a marketplace other than the one
declaring it — otherwise any marketplace you add could pull in code you never reviewed. Opting in is one
field, `allowCrossMarketplaceDependenciesOn`, and it does **not** chain: only the root marketplace's
allowlist is consulted for the whole dependency tree. This field is the complete audit surface for
foreign code entering the setup; every entry carries a `why`.

## Failure mode 2 — dependencies only resolve in *registered* marketplaces

Adding a marketplace and installing a plugin are separate steps. If a dependency names a marketplace the
user hasn't registered, Claude Code doesn't guess — it disables the dependent plugin silently
(`dependency-unsatisfied`, visible only in an Errors tab nobody opens).

**Verified against the CLI:** `claude-plugins-official` is *browsable* by default but not *registered*,
despite documentation implying otherwise. An install against it fails outright until
`claude plugin marketplace add anthropics/claude-plugins-official` runs first. Fix: `registeredByDefault`
must reflect reality, every allowlisted marketplace needs the flag or an `addCommand`, and the quickstart
prints that command — enforced by a test, not just written down.

## Version resolution

Claude Code takes the first of `plugin.json` version → marketplace entry version → **git commit SHA**.
Entries here declare no version, so they float on this repository's commit SHA.

## Project-scope settings

`claude plugin install --scope project` writes `enabledPlugins` into the repo's `.claude/settings.json`
but marketplace registrations go to *user* settings — so a collaborator cloning the repo would hit
unresolved dependencies for everything. `extraKnownMarketplaces` is therefore committed too, in both
`.claude/settings.json` and the generated [`templates/settings.json`](../templates/settings.json).
