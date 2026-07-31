---
name: plugin-doctor
description: Diagnose plugin problems - plugins disabled by unresolved dependencies, missing marketplaces, or cache misses. Use when a skill that should be available is missing, when a plugin appears disabled unexpectedly, when the /plugin Errors tab shows something, or when the user asks to check or verify their AI setup.
---

# Plugin doctor

Reports plugins that loaded with errors, and the exact command to fix each one.

## Why this exists

A plugin whose dependency fails to resolve is disabled **quietly**. The reason is recorded in the `/plugin` Errors tab, which nobody opens, so the usual symptom is "a skill I installed just isn't there".

The most common cause is a dependency living in a marketplace the user never registered. Dependency resolution only searches marketplaces that have been added, so an unregistered one produces no error at install time — the dependency is simply left unresolved and the dependent plugin is switched off.

## Run it

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/doctor.mjs"
```

Report the output to the user. If it lists problems, each one comes with a `fix:` line — offer to run it.

## Interpreting the common errors

| Error | Meaning | Fix |
| --- | --- | --- |
| `dependency-unsatisfied` | A declared dependency is not installed, or is installed but disabled | Install it. If its marketplace is not registered, `claude plugin marketplace add <source>` first — Claude Code then resolves the dependency automatically, with no reinstall needed |
| `cross-marketplace` | A plugin depends on another marketplace that is not in the root marketplace's `allowCrossMarketplaceDependenciesOn` | Add it to `catalog/marketplace.yaml` and rebuild, or install the dependency manually first (an already-installed dependency satisfies the constraint) |
| `plugin-cache-miss` | Usually follows a rename; the plugin must be re-fetched under its new name | `claude plugin install <name>@<marketplace>` |
| `range-conflict` | Two plugins demand incompatible versions of the same dependency | Widen or drop one constraint; `my-ai-marketplace` uses unconstrained dependencies precisely to avoid this |

After any fix, run `/reload-plugins` — installing or enabling a plugin does not activate it in the current session.

## Note on scope

`dependency-unsatisfied` can also mean the dependency is installed but *disabled*, which reads as a missing-plugin problem but needs `claude plugin enable` rather than an install. The doctor output distinguishes these: anything merely disabled is listed separately, under "Also disabled".
