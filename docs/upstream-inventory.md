# Upstream inventory

Triage of every skill on the original wishlist, resolved to a verified source. This is the input to `catalog/` — nothing enters the catalog without a row here.

Verified 2026-07-28 against live repositories.

## Legend

- **Licence** — the field that decides everything else, because vendoring means redistributing. Checked against the actual `LICENSE` file, not the GitHub API's guess, and per skill where a repo licenses per skill.
- **Vendored** — whether the skill files are copied into `skills/` and committed. Vendored skills work in every agent. A pointer works only in Claude Code, whose installer fetches it; to Codex and Gemini a pointer is an empty entry.
- **Registered** — whether the marketplace is *configured*, which is what dependency resolution searches. **No marketplace is registered by default, including `claude-plugins-official`.** Every one needs a documented `/plugin marketplace add`, or dependencies on it fail to resolve.

> **Correction, verified 2026-07-28 against the CLI.** The docs describe the official marketplace as "automatically available", and it is — for *browsing*, in the `/plugin` Discover tab. It is not a configured marketplace, and dependency resolution only searches configured ones. Installing a bundle that depends on it fails outright:
>
> ```
> ✘ Failed to install plugin "frontend@ai-setup": Dependency
>   "frontend-design@claude-plugins-official" (required by frontend@ai-setup) not found.
>   Is the "claude-plugins-official" marketplace added?
> ```
>
> After `/plugin marketplace add anthropics/claude-plugins-official` the same install succeeds and reports `+ 2 dependencies: ui-theme-designer, frontend-design`. The quickstart therefore has three commands, not two. Availability for browsing and availability for dependency resolution are different things, and only the latter matters here.

## Resolved — official marketplace (`claude-plugins-official`, must be added once)

Preferred source wherever it exists: auto-updates by default and maintained by Anthropic. These are referenced as cross-marketplace `dependencies` rather than copied — they are plugins with commands and agents, not plain skills, so there is nothing to vendor. That makes them Claude-only, which `npm run sync:codex` reports by name. Requires the one-time registration above.

| Wishlist item | Plugin | Notes |
| --- | --- | --- |
| Frontend-design | `frontend-design` | Also exists in `anthropic-agent-skills`; prefer this copy |
| Code-simplifier | `code-simplifier` | |
| Skill Creator | `skill-creator` | Also in `anthropic-agent-skills` |
| Planetscale (db) | `planetscale` | Hosted MCP server. Anthropic pins it to an exact `sha` upstream |
| HashiCorp / Terraform | `terraform` | The HashiCorp MCP server. See gap note on `terraform-search-import` |

276 plugins in this marketplace total; worth re-scanning before adding any third-party source.

## Resolved — `anthropics/skills` (licensed **per skill**, which splits it)

Official Anthropic content. The trap here is that the repository has **no top-level `LICENSE`** — each skill carries its own `LICENSE.txt`, and they do not agree. The GitHub API reports `"license": null` for the repo, which is easy to misread as "unlicensed" when the real terms are inside each directory.

| Wishlist item | Skill | Licence | Vendored? |
| --- | --- | --- | --- |
| mcp-builder | `skills/mcp-builder` | Apache-2.0 | ✅ yes |
| Doc-coauthoring | `skills/doc-coauthoring` | no `LICENSE.txt`; repo default | ❌ no |
| Document Skills | `skills/{docx,xlsx,pptx,pdf}` | © Anthropic, all rights reserved | ❌ no |

The document skills' licence is not a bare copyright notice. It states that users may not:

> Extract these materials from the Services or retain copies of these materials outside the Services · Reproduce or copy these materials · Create derivative works · Distribute, sublicense, or transfer these materials to any third party

**Decision:** split what was one `anthropic-extras` entry into three, one per licence. `mcp-builder` is Apache-2.0 and is vendored. `doc-coauthoring` and `document-skills` stay pointers with `strict: false` and an explicit `skills:` list, so only the wanted skills load rather than the 12 that `example-skills` bundles. Both are marked Claude-only, and the validator refuses to vendor them however the entry is edited.

Splitting by licence rather than by topic is the general rule this forced: an entry is the unit of redistribution rights, not the unit of subject matter.

## Resolved — third-party

| Wishlist item | Source | Licence | Skills | Vendored? |
| --- | --- | --- | --- | --- |
| Superpowers | `obra/superpowers` | MIT | 14 | ✅ yes |
| Caveman | `JuliusBrussee/caveman` | MIT | 7 | ✅ yes |
| TerraShark | `LukasNiessen/terrashark` | MIT | 1 | ✅ yes |
| Karpathy's Guidelines | `sudeepgupta90/extended-andrej-karpathy-skill` | MIT | 1 | ✅ yes |
| awesome-skills | `maxvaega/awesome-skills` | — | 4 plugins | not adopted |

**Vendoring made the upstreams' own versioning irrelevant, which removed a whole problem.** Three of these pin their own `version` (`6.2.0`, `1.0.0`, `2.3.0`) and so would never have floated on commit SHA — the earlier design needed a daily SHA-watch workflow purely to notice releases that pinning hid. Serving the files from this repo makes the daily re-vendor PR the update mechanism *and* the changelog, and `scripts/check-upstream.mjs` was deleted along with its state file and tests.

**Karpathy's Guidelines switched source on 2026-07-31**, from `forrestchang/andrej-karpathy-skills` to `sudeepgupta90/extended-andrej-karpathy-skill`. The original publishes no licence at all, so it was vendored only on a recorded basis (GitHub ToS §D.5 fork rights) with an `attribution` field and a `NOTICE` naming the author — the tier-3 grant path in `design/002-licence-tiers.md`, kept here as the example of what that path looks like in practice. The replacement is a merge of the same four principles with a fifth ("Signal Uncertainty") under a real MIT licence, which resolves the unlicensed-upstream problem outright: no grant, no `NOTICE`, vendored the same way as `superpowers` or `caveman`.

`TerraShark` also proved the second upstream shape: `SKILL.md` at the repository root rather than a `skills/` tree. The fetcher detects that by looking for the file instead of taking it as a schema flag.

`maxvaega/awesome-skills` turned out to be a real marketplace with 4 plugins (`startup-advisor`, `cost`, `technical-roles`, `developer-productivity`), all floating — not the curated index it appeared to be. Note `gmh5225/awesome-skills` is a different repo and *is* just an index; mine it for sources, don't depend on it.

## Unresolved — dropped from v1

| Item | Finding |
| --- | --- |
| Spartan-ai-toolkit | No GitHub match under this or related names. Need a real URL |
| Tapestry | No GitHub match. The knowledge-graph tool described isn't findable |
| Web-design-guidelines | Not official. Only low-signal third-party repos (≤2 stars) reproduce it |
| `hashicorp/skills/terraform-search-import` | `hashicorp/skills` returns 404. Use official `terraform` instead |
| Handoff | Only `Rishiidev/handoff-pro` (0 stars): bare `SKILL.md`, no manifest, unproven |

## Decisions this triage forces

1. **Write `handoff` myself** rather than depend on an unproven 0-star repo. It was already slated as one of my own skills; this confirms it.
2. **Split catalog entries by licence, not by topic.** `anthropics/skills` licenses per skill, so one entry per licence: `mcp-builder` vendored, the rest pointers. An entry is a unit of redistribution rights.
3. **Vendor by default; a pointer must justify itself.** A pointer is invisible to every agent but Claude Code, so `upstream.notVendored` is required and the reason appears in the README table and in `npm run sync:codex` output. 24 of 26 skills are now portable, against 2 before.
4. **Re-check the official marketplace before adding any third-party source.** It already covers 5 wishlist items including two (`planetscale`, `terraform`) that looked like they needed external sources.
