# 002 — Licence tiers

**Follows from:** [001](001-portability-over-convenience.md)

The three tiers (permissive / unlicensed-by-grant / forbidden) and why each is handled that way are
explained in the README's [Credits and licensing](../README.md#credits-and-licensing) section. Two things
worth recording here that aren't there:

- **Enforcement, not convention.** The tiers are code — `PERMISSIVE_LICENSES` and
  `NO_REDISTRIBUTION_LICENSES` in [`scripts/lib/catalog.mjs`](../scripts/lib/catalog.mjs) — checked by
  `validateCatalog` on every build, not a rule someone has to remember to apply.
- **`anthropics/skills` licenses per skill, not per repo.** Its GitHub API license field reads `null`,
  which looks unlicensed but isn't — each skill directory carries its own terms and they disagree, so the
  repo is split across all three tiers rather than treated as one entry.
