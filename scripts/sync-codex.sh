#!/usr/bin/env bash
# Link this repo's portable skills into Codex's skill directory.
#
#   npm run sync:codex              link into ~/.agents/skills
#   npm run sync:codex -- --dry-run show what would happen
#   AGENTS_SKILLS_DIR=... npm run sync:codex   use a different target
#
# Symlinks rather than copies deliberately: one `git pull` in this repo then
# updates every linked skill at once, which is the cheapest auto-update
# available outside Claude Code's installer.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="${AGENTS_SKILLS_DIR:-$HOME/.agents/skills}"
DRY_RUN=false
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true

if [[ ! -d "$ROOT/skills" ]]; then
  echo "error: no skills/ directory at $ROOT" >&2
  exit 1
fi

$DRY_RUN || mkdir -p "$TARGET"

linked=0
skipped=0

for dir in "$ROOT"/skills/*/; do
  [[ -f "$dir/SKILL.md" ]] || continue
  name="$(basename "$dir")"
  dest="$TARGET/$name"

  # Already ours: nothing to do.
  if [[ -L "$dest" && "$(readlink "$dest")" == "${dir%/}" ]]; then
    skipped=$((skipped + 1))
    continue
  fi

  # Something else owns this name. Never clobber a skill we did not create.
  if [[ -e "$dest" && ! -L "$dest" ]]; then
    echo "  ! $name -- a real directory already exists at $dest, leaving it alone" >&2
    skipped=$((skipped + 1))
    continue
  fi

  if $DRY_RUN; then
    echo "  would link $name -> $dest"
  else
    ln -sfn "${dir%/}" "$dest"
    echo "  linked $name"
  fi
  linked=$((linked + 1))
done

echo
if $DRY_RUN; then
  echo "dry run: $linked to link, $skipped unchanged"
else
  echo "linked $linked skill(s) into $TARGET ($skipped already current)"
fi

# Be honest about what Codex cannot reach. Upstream-backed entries are fetched
# by Claude Code's installer, and Codex has no equivalent, so those skills are
# Claude-only until a vendoring fetcher exists.
if command -v node >/dev/null 2>&1; then
  echo
  node --input-type=module -e "
    import { loadCatalog, claudeOnlySkills } from '$ROOT/scripts/lib/catalog.mjs';
    const only = claudeOnlySkills(loadCatalog('$ROOT'));
    if (only.length) {
      console.log('Not available here (Claude Code only):');
      for (const o of only) console.log('  - ' + o.name + ' (' + o.reason + ')');
      console.log('\nThese are fetched by Claude Code\'s plugin installer, which Codex has no');
      console.log('equivalent of. Install them there, or use them through Claude Code.');
    }
  " 2>/dev/null || true
fi
