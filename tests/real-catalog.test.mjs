// Tests against the ACTUAL catalog in this repo, not fixtures.
//
// These encode the decisions from docs/upstream-inventory.md so that a future
// edit which quietly violates one fails the build rather than shipping.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadCatalog,
  validateCatalog,
  buildClaudeMarketplace,
  quickstartRegistrations,
  portableSkills,
  normaliseDep,
  vendoredProvenance,
  PERMISSIVE_LICENSES,
} from '../scripts/lib/catalog.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const catalog = loadCatalog(ROOT);
const byName = (n) => catalog.entries.find((e) => e.name === n);

describe('the real catalog', () => {
  test('validates', () => {
    assert.deepEqual(validateCatalog(catalog), []);
  });

  test('every entry has a description, so the /plugin picker is usable', () => {
    for (const e of catalog.entries) {
      assert.ok(e.description?.length > 10, `${e.name} needs a real description`);
    }
  });

  test('every skill in the portable tree is claimed by some unit', () => {
    // Authored skills are listed by hand; vendored ones claim their entry via
    // provenance. Either way an unclaimed directory is dead weight that ships
    // to Gemini and Codex but never loads in Claude Code.
    const claimed = new Set([
      ...catalog.entries.filter((e) => !e.upstream).flatMap((e) => e.skills ?? []),
      ...vendoredProvenance(ROOT).keys(),
    ]);
    for (const s of portableSkills(ROOT)) {
      assert.ok(claimed.has(s), `skills/${s} is not listed by any catalog entry, so it never loads`);
    }
  });

  test('every skill file has name and description frontmatter', () => {
    for (const s of portableSkills(ROOT)) {
      const body = readFileSync(join(ROOT, 'skills', s, 'SKILL.md'), 'utf8');
      assert.match(body, /^---\n/, `skills/${s}/SKILL.md must open with frontmatter`);
      assert.match(body, /\nname:\s*\S+/, `skills/${s}/SKILL.md needs a name`);
      assert.match(body, /\ndescription:\s*\S+/, `skills/${s}/SKILL.md needs a description`);
    }
  });
});

describe('bundles', () => {
  const bundles = () => catalog.entries.filter((e) => e.kind === 'bundle');

  test('there is at least one bundle', () => {
    assert.ok(bundles().length > 0);
  });

  test('every bundle depends on plugin-doctor, so failures are never silent', () => {
    for (const b of bundles()) {
      const deps = (b.dependencies ?? []).map((d) => normaliseDep(d, catalog.market.name).name);
      assert.ok(
        deps.includes('plugin-doctor'),
        `bundle "${b.name}" must depend on plugin-doctor`,
      );
    }
  });

  test('core-workflow exists and carries the development methodology', () => {
    const b = byName('core-workflow');
    assert.ok(b, 'core-workflow bundle is missing');
    const deps = (b.dependencies ?? []).map((d) => normaliseDep(d, catalog.market.name).name);
    assert.ok(deps.includes('superpowers'));
    assert.ok(deps.includes('handoff'));
  });
});

describe('decisions recorded in docs/upstream-inventory.md', () => {
  test('only claude-plugins-official is allowlisted; third parties are re-listed as units', () => {
    const allowed = (catalog.market.allowCrossMarketplaceDependenciesOn ?? []).map((m) => m.name);
    assert.deepEqual(allowed, ['claude-plugins-official']);
  });

  test('every allowlist entry is justified', () => {
    for (const m of catalog.market.allowCrossMarketplaceDependenciesOn ?? []) {
      assert.ok(m.why?.length > 20, `allowlist entry "${m.name}" needs a "why"`);
      assert.equal(typeof m.registeredByDefault, 'boolean');
    }
  });

  test('the quickstart registers the official marketplace, which is NOT automatic', () => {
    // Verified against the real CLI on 2026-07-28: claude-plugins-official is
    // browsable by default but is not a *configured* marketplace, and dependency
    // resolution only searches configured ones. Installing a bundle without it
    // fails outright. Onboarding must therefore add it explicitly.
    assert.deepEqual(quickstartRegistrations(catalog), [
      '/plugin marketplace add anthropics/claude-plugins-official',
    ]);
  });

  test('any marketplace we depend on is either registered by default or has an addCommand', () => {
    for (const m of catalog.market.allowCrossMarketplaceDependenciesOn ?? []) {
      assert.ok(
        m.registeredByDefault || m.addCommand,
        `"${m.name}" would silently disable dependent plugins for anyone who has not added it`,
      );
    }
  });

  test('anthropics/skills is split by licence, not by topic', () => {
    // The single most load-bearing triage decision here. anthropics/skills has
    // no repo-wide licence -- each skill carries its own, and they differ. So
    // one entry per licence, never one entry for "the Anthropic stuff".
    const mcp = byName('mcp-builder');
    assert.equal(mcp.upstream.repo, 'anthropics/skills');
    assert.equal(mcp.upstream.license, 'Apache-2.0');
    assert.ok(mcp.upstream.vendor, 'Apache-2.0 permits redistribution, so vendor it');
    assert.deepEqual(mcp.upstream.vendor.only, ['mcp-builder'], 'must not sweep in its neighbours');

    for (const name of ['doc-coauthoring', 'document-skills']) {
      const e = byName(name);
      assert.equal(e.upstream.repo, 'anthropics/skills');
      assert.ok(!e.upstream.vendor, `${name} may not be vendored`);
      assert.match(e.upstream.notVendored, /licence|license/i);
    }
  });

  test('everything redistributable is actually vendored', () => {
    // Guards the regression this design was written to fix: an upstream quietly
    // becoming a Claude-only pointer when nothing stopped it being portable.
    for (const e of catalog.entries.filter((x) => x.upstream)) {
      if (e.upstream.vendor) continue;
      assert.ok(
        e.upstream.notVendored,
        `${e.name} is a pointer with no stated reason -- vendor it or justify it`,
      );
      assert.ok(
        !PERMISSIVE_LICENSES.has(e.upstream.license),
        `${e.name} is under ${e.upstream.license}, which permits vendoring, so it should be vendored`,
      );
    }
  });

  test('dropped items never reappear in the catalog without a real source', () => {
    const dropped = ['spartan-ai-toolkit', 'tapestry', 'web-design-guidelines'];
    for (const d of dropped) {
      assert.equal(byName(d), undefined, `${d} was dropped in triage as unresolvable`);
    }
  });
});

describe('generated artifacts', () => {
  test('the committed marketplace.json matches the catalog', () => {
    const path = join(ROOT, '.claude-plugin/marketplace.json');
    assert.ok(existsSync(path), 'run npm run build');
    const onDisk = JSON.parse(readFileSync(path, 'utf8'));
    assert.deepEqual(onDisk, buildClaudeMarketplace(catalog));
  });

  test('hook commands reference CLAUDE_PLUGIN_ROOT, since plugins run from a cache copy', () => {
    for (const e of catalog.entries) {
      for (const matchers of Object.values(e.hooks ?? {})) {
        for (const m of matchers) {
          for (const h of m.hooks ?? []) {
            assert.match(
              h.command,
              /\$\{CLAUDE_PLUGIN_ROOT\}/,
              `${e.name}: hook must use \${CLAUDE_PLUGIN_ROOT}, not a relative path`,
            );
          }
        }
      }
    }
  });
});
