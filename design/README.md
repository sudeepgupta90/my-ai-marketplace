# Design

Why this repository is shaped the way it is. Not a tutorial — see
[docs/adding-a-skill.md](../docs/adding-a-skill.md) for that.

**The thesis:** a skill is a Markdown file, readable by any agent. So a personal skill catalog should be a directory of files, plus a thin generated adapter per agent — not a distribution mechanism owned by
one vendor.

| # | Document | Settles |
| --- | --- | --- |
| 001 | [Portability over convenience](001-portability-over-convenience.md) | Vendor upstream skills instead of pointing at them |
| 002 | [Licence tiers](002-licence-tiers.md) | What may be copied, what may not |
| 003 | [Catalog as source of truth](003-catalog-as-source-of-truth.md) | One YAML catalog, many generated manifests |
| 004 | [Claude Code integration](004-claude-code-integration.md) | Marketplaces and cross-marketplace dependencies |
| 005 | [Updates and automation](005-updates-and-automation.md) | How skills stay current |
| 006 | [Making failures loud](006-making-failures-loud.md) | Build-time checks and the runtime doctor |
| 007 | [Rejected alternatives](007-rejected-alternatives.md) | Approaches considered and turned down |
| — | [Architecture](architecture.md) | The flow, end to end, with diagrams |

Decisions state what they trade away, so a future reader can judge whether the trade still holds.
