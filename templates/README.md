# `templates/`

`settings.json` here is **generated** from `catalog/` — never hand-edit it, run `npm run build` instead.

It's not config for *this* repo (that's the separate, hand-maintained `.claude/settings.json` at the repo root, used for dogfooding while developing the catalog). It's a drop-in file meant to be **copied into another repository**, so that repo's collaborators get this marketplace's bundles automatically.

## How to use it

Copy this file to `.claude/settings.json` in the target repository:

```bash
cp templates/settings.json /path/to/other-repo/.claude/settings.json
```

When collaborators open that repository in Claude Code and trust the folder, Claude Code offers to register `my-ai-marketplace` and `claude-plugins-official` and install every bundle listed under `enabledPlugins`. Individual plugins are deliberately left out — bundles pull in their dependencies transitively, so listing bundles alone is enough and can't drift out of sync as bundle contents change.

To enable only some bundles, delete the ones you don't want from `enabledPlugins` after copying.
