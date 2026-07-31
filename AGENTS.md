# my-ai-marketplace

A catalog of AI skills, authored in the cross-agent `SKILL.md` format.

Every skill lives in `skills/<name>/SKILL.md`. That tree is the portable source of truth and is what non-Claude agents read. Everything else in this repository is either the catalog that describes those skills or a generated manifest for a specific agent.

Skills in that tree come from two places. Some were authored here. The rest were **vendored** — copied in from an upstream repository by `npm run vendor` — and carry a `.upstream.json` recording their source repo, exact commit, licence and author. Vendored directories are generated output: edit the upstream, or pin a `sha` in the catalog, but never edit the files in place, because the next sync overwrites them.

## Working in this repository

The catalog is the single source of truth:

- `catalog/marketplace.yaml` — marketplace identity and the cross-marketplace dependency allowlist
- `catalog/plugins/*.yaml` — one file per catalog entry
- `skills/<name>/SKILL.md` — the portable skills themselves

These files are **generated** and must never be hand-edited:

- `.claude-plugin/marketplace.json` (Claude Code)
- `gemini-extension.json` (Gemini CLI)
- `templates/settings.json` (drop-in project settings)
- the catalog table in `README.md`, between the `<!-- catalog:start -->` markers
- every `skills/<name>/` directory containing a `.upstream.json`

After changing anything under `catalog/` or `skills/`:

```bash
npm run vendor        # re-fetch upstream skills (needed after touching upstream.vendor)
npm run build         # regenerate manifests
npm test              # validate
npm run check         # confirm nothing generated is stale
npm run vendor:check  # confirm vendored skills match their upstreams
```

`npm run check` and `npm run vendor:check` are the CI gates. A pull request whose generated files do not match its catalog, or whose vendored skills have drifted from upstream, fails.

Before changing a rule here, read the decision behind it in [`design/`](design/). Each document states what the decision trades away, so you can judge whether the trade still holds.

## Conventions

- A plugin's `name` is a permanent identifier. Renaming one breaks every existing install, so route renames through the `renames` map in `catalog/marketplace.yaml` and treat that map as append-only.
- Third-party skills are **vendored whenever their licence permits**, because a source pointer only works in Claude Code and is invisible to every other agent. Pointers are a last resort and must state why via `upstream.notVendored`.
- Never vendor something the licence does not allow. Permissive licences are vendored freely; an unlicensed upstream needs a recorded `licenseGrant` plus `attribution`; a licence that forbids copying cannot be vendored at all, whatever the justification. The validator enforces all three.
- Prefer a plugin from Anthropic's official marketplace over a third-party equivalent, and check the official catalog before adding any new external source.
- Skills must not assume Claude Code. Describe capabilities rather than naming slash commands, so the same `SKILL.md` reads correctly from Codex or Gemini.
