# 007 — Rejected alternatives

Considered and turned down, so they aren't re-proposed without new information.

| Alternative | Rejected because |
| --- | --- |
| Build a package manager for skills | Claude Code already has one — sources, versions, dependencies, auto-update. A worse copy adds nothing. |
| Point at upstreams instead of copying | Adopted, then reversed — a pointer only Claude Code can follow. See [001](001-portability-over-convenience.md). |
| Vendor into gitignored `.vendor/` + symlink | Makes portability conditional on a fetch step; `git clone` (how Gemini installs) yields an empty catalog. |
| Fork the official Anthropic plugins | Produces a stale duplicate under a colliding name. Cross-marketplace dependencies get the same "can't forget to enable" property for free. |
| Depend on `example-skills@anthropic-agent-skills` | Bundles 12 skills to deliver 2; every skill in an enabled plugin costs context. Cherry-picking with `strict: false` selects exactly what's wanted. |
| Group catalog entries by topic | `doc-coauthoring` and `mcp-builder` looked adjacent but have different licences — an entry can't be half-vendored. Entries are units of redistribution rights. See [002](002-licence-tiers.md). |
| Use semver ranges on dependencies | Would impose a git-tagging discipline for no benefit; bundles float on commit SHA on purpose. |
| Vendor the unlicensed Karpathy skill silently, or refuse it outright | Silent copying hides a real legal question; refusing substitutes the tool's judgement for the owner's. A recorded grant + `NOTICE` is the middle path. See [002](002-licence-tiers.md). |
| Keep a central `vendor-lock.json` | Can disagree with the directories that actually exist. Per-directory `.upstream.json` makes the tree self-describing. See [003](003-catalog-as-source-of-truth.md). |
