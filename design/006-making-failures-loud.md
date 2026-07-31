# 006 — Making failures loud

## The problem

Both Claude Code failure modes in [004](004-claude-code-integration.md) are quiet by default. A plugin
whose dependency can't resolve is disabled, and the reason sits in an Errors tab nobody opens — the
user's experience isn't an error message, it's a skill that never triggers. Two layers, because
prevention and detection catch different things.

## Layer 1 — build time (prevention)

`validateCatalog` refuses to emit a manifest when a misconfiguration would be publishable:

| Invariant | Prevents |
| --- | --- |
| Dependency's marketplace must be in the allowlist | Install refused with a `cross-marketplace` error |
| Non-default marketplace must have an `addCommand` | Dependency silently resolves to nothing |
| Every `upstream` must declare a `license` | Vendoring something that can't be redistributed |
| Vendoring needs a permissive licence, or grant + attribution | Redistribution without a basis |
| Forbidden licences can never be vendored | — no override |
| Non-vendored upstreams must state `notVendored` | An upstream quietly becoming Claude-only |
| Vendored entry with nothing on disk / orphaned directory | Dead entries and unowned files |
| Every bundle must depend on `plugin-doctor` | Layer 2 not being installed |

A build failure happens to the person who can fix it, at the moment they caused it — the same generator
runs in CI.

## Layer 2 — runtime (detection)

Build-time checks can't see the user's machine: a dependency can go missing after install, a marketplace
add can be skipped, an upstream can be deleted. [`plugin-doctor`](../skills/plugin-doctor/) is a unit
every bundle depends on, contributing a `SessionStart` hook that runs `claude plugin list --json`,
surfaces any plugin with `errors`, and prints the exact remediation command — silent when healthy,
throttled to once a day — plus an on-demand skill for the unthrottled version.

Two gotchas: `errors` is *omitted* entirely on a healthy plugin rather than an empty array, and hook
commands must reference `${CLAUDE_PLUGIN_ROOT}` since plugins run from a cache copy, not the repository —
a test enforces the latter across every entry.

## Layer 3 — honest reporting

`portabilityReport()` counts portable skills against Claude-only entries, and a test asserts the majority
stays portable — a regression fails the build instead of becoming a caveat in the README.
