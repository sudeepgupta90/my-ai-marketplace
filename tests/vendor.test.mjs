// The portability contract.
//
// The whole point of this repo is that `skills/` is real files, so every agent
// can read it. These tests pin the rules that keep it that way: an upstream is
// either vendored into the tree (and then it must be legally redistributable),
// or it is a Claude-only pointer that has to say out loud why it could not be
// vendored. There is no silent third option.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';

import {
  loadCatalog,
  validateCatalog,
  vendoredSkills,
  vendoredProvenance,
  buildClaudeEntry,
  claudeOnlySkills,
  portabilityReport,
  PERMISSIVE_LICENSES,
  NO_REDISTRIBUTION_LICENSES,
} from '../scripts/lib/catalog.mjs';
import { makeCatalog, cleanup } from './helpers.mjs';

const errorsFor = (opts) => validateCatalog(loadCatalog(makeCatalog(opts)));
const has = (errs, needle) => errs.some((e) => e.includes(needle));

describe('vendoring: the license invariant', () => {
  test('a permissive upstream may be vendored', () => {
    const errs = errorsFor({
      plugins: {
        sp: { kind: 'unit', name: 'sp', description: 'd', upstream: { repo: 'o/r', license: 'MIT', vendor: { from: 'skills' } } },
      },
      skills: [{ name: 'brainstorming', provenance: { entry: 'sp', repo: 'o/r' } }],
    });
    assert.deepEqual(errs, []);
  });

  test('vendoring an unlicensed upstream is refused until the basis is recorded', () => {
    const errs = errorsFor({
      plugins: {
        k: { kind: 'unit', name: 'k', description: 'd', upstream: { repo: 'o/r', license: 'none', vendor: { from: 'skills' } } },
      },
      skills: [{ name: 'guide', provenance: { entry: 'k', repo: 'o/r' } }],
    });
    assert.ok(has(errs, 'licenseGrant'), `expected a licenseGrant error, got: ${errs.join(' | ')}`);
  });

  test('an unlicensed upstream may be vendored with a recorded grant and attribution', () => {
    const errs = errorsFor({
      plugins: {
        k: {
          kind: 'unit', name: 'k', description: 'd', attribution: 'Some Author',
          upstream: {
            repo: 'o/r', license: 'none', vendor: { from: 'skills' },
            licenseGrant: 'GitHub ToS D.5 fork rights; licence requested upstream',
          },
        },
      },
      skills: [{ name: 'guide', provenance: { entry: 'k', repo: 'o/r' } }],
    });
    assert.deepEqual(errs, []);
  });

  test('a grant without attribution is refused', () => {
    const errs = errorsFor({
      plugins: {
        k: {
          kind: 'unit', name: 'k', description: 'd',
          upstream: { repo: 'o/r', license: 'none', vendor: { from: 'skills' }, licenseGrant: 'x' },
        },
      },
      skills: [{ name: 'guide', provenance: { entry: 'k', repo: 'o/r' } }],
    });
    assert.ok(has(errs, 'attribution'));
  });

  test('a licence that forbids copying cannot be overridden by a grant', () => {
    const errs = errorsFor({
      plugins: {
        d: {
          kind: 'unit', name: 'd', description: 'd', attribution: 'Anthropic',
          upstream: {
            repo: 'anthropics/skills',
            license: 'LicenseRef-Anthropic-Services',
            vendor: { from: 'skills' },
            licenseGrant: 'we would really like to',
          },
        },
      },
      skills: [{ name: 'docx', provenance: { entry: 'd', repo: 'anthropics/skills' } }],
    });
    assert.ok(has(errs, 'explicitly forbids'), `expected a hard refusal, got: ${errs.join(' | ')}`);
  });

  test('every upstream must declare a license, vendored or not', () => {
    const errs = errorsFor({
      plugins: { x: { kind: 'unit', name: 'x', description: 'd', upstream: { repo: 'o/r' } } },
    });
    assert.ok(has(errs, 'license'));
  });

  test('the permissive set is a closed allowlist, not a guess', () => {
    assert.ok(PERMISSIVE_LICENSES.has('MIT'));
    assert.ok(PERMISSIVE_LICENSES.has('Apache-2.0'));
    assert.ok(!PERMISSIVE_LICENSES.has('none'));
    assert.ok(!PERMISSIVE_LICENSES.has('GPL-3.0'));
  });

  test('the two licence sets never overlap', () => {
    for (const l of NO_REDISTRIBUTION_LICENSES) {
      assert.ok(!PERMISSIVE_LICENSES.has(l), `${l} cannot be both permissive and forbidden`);
    }
  });
});

describe('vendoring: a pointer must justify itself', () => {
  test('a non-vendored upstream without a reason fails the build', () => {
    const errs = errorsFor({
      plugins: { k: { kind: 'unit', name: 'k', description: 'd', upstream: { repo: 'o/r', license: 'none' } } },
    });
    assert.ok(has(errs, 'notVendored'), `expected a notVendored error, got: ${errs.join(' | ')}`);
  });

  test('a stated reason makes it legal', () => {
    const errs = errorsFor({
      plugins: {
        k: {
          kind: 'unit', name: 'k', description: 'd',
          upstream: { repo: 'o/r', license: 'none', notVendored: 'upstream publishes no license' },
        },
      },
    });
    assert.deepEqual(errs, []);
  });
});

describe('vendoring: the tree must match the catalog', () => {
  test('a vendored entry with nothing on disk tells you to run the fetcher', () => {
    const errs = errorsFor({
      plugins: {
        sp: { kind: 'unit', name: 'sp', description: 'd', upstream: { repo: 'o/r', license: 'MIT', vendor: { from: 'skills' } } },
      },
      skills: [],
    });
    assert.ok(has(errs, 'npm run vendor'), `expected remediation, got: ${errs.join(' | ')}`);
  });

  test('a vendored skill claiming an entry that does not exist is caught', () => {
    const errs = errorsFor({
      plugins: {
        sp: { kind: 'unit', name: 'sp', description: 'd', upstream: { repo: 'o/r', license: 'MIT', vendor: { from: 'skills' } } },
      },
      skills: [
        { name: 'brainstorming', provenance: { entry: 'sp', repo: 'o/r' } },
        { name: 'orphan', provenance: { entry: 'deleted-entry', repo: 'o/r' } },
      ],
    });
    assert.ok(has(errs, 'orphan'));
  });

  test('vendored skills are discovered from provenance, grouped by entry', () => {
    const root = makeCatalog({
      plugins: {
        sp: { kind: 'unit', name: 'sp', description: 'd', upstream: { repo: 'o/r', license: 'MIT', vendor: { from: 'skills' } } },
      },
      skills: [
        { name: 'brainstorming', provenance: { entry: 'sp', repo: 'o/r' } },
        { name: 'writing-plans', provenance: { entry: 'sp', repo: 'o/r' } },
        'handoff',
      ],
    });
    assert.deepEqual(vendoredSkills(root, 'sp'), ['brainstorming', 'writing-plans']);
    assert.deepEqual(vendoredSkills(root, 'nobody'), []);
  });

  test('a hand-written skills list on a vendored entry is refused as a drift source', () => {
    const errs = errorsFor({
      plugins: {
        sp: {
          kind: 'unit', name: 'sp', description: 'd', skills: ['brainstorming'],
          upstream: { repo: 'o/r', license: 'MIT', vendor: { from: 'skills' } },
        },
      },
      skills: [{ name: 'brainstorming', provenance: { entry: 'sp', repo: 'o/r' } }],
    });
    assert.ok(has(errs, 'generated'));
  });
});

describe('vendoring: what Claude Code is handed', () => {
  test('a vendored unit becomes a local source, identical in shape to an authored one', () => {
    const root = makeCatalog({
      plugins: {
        sp: { kind: 'unit', name: 'sp', description: 'd', upstream: { repo: 'o/r', license: 'MIT', vendor: { from: 'skills' } } },
      },
      skills: [{ name: 'brainstorming', provenance: { entry: 'sp', repo: 'o/r' } }],
    });
    const { entries } = loadCatalog(root);
    const out = buildClaudeEntry(entries[0], 'ai-setup', root);

    assert.equal(out.source, './', 'vendored entries must not point at github');
    assert.deepEqual(out.skills, ['./skills/brainstorming']);
    assert.equal(out.strict, undefined, 'strict:false is only needed for remote cherry-picks');
  });

  test('a pointer unit still points at github', () => {
    const root = makeCatalog({
      plugins: {
        k: {
          kind: 'unit', name: 'k', description: 'd',
          upstream: { repo: 'o/r', license: 'none', notVendored: 'no license' },
        },
      },
    });
    const { entries } = loadCatalog(root);
    const out = buildClaudeEntry(entries[0], 'ai-setup', root);
    assert.deepEqual(out.source, { source: 'github', repo: 'o/r' });
  });
});

describe('portability is reported honestly', () => {
  test('vendored skills are portable; pointers and foreign marketplaces are not', () => {
    const root = makeCatalog({
      market: {
        allowCrossMarketplaceDependenciesOn: [
          { name: 'official', registeredByDefault: false, addCommand: '/plugin marketplace add a/b' },
        ],
      },
      plugins: {
        sp: { kind: 'unit', name: 'sp', description: 'd', upstream: { repo: 'o/r', license: 'MIT', vendor: { from: 'skills' } } },
        k: { kind: 'unit', name: 'k', description: 'd', upstream: { repo: 'o/k', license: 'none', notVendored: 'no license' } },
        b: {
          kind: 'bundle', name: 'b', description: 'd',
          dependencies: ['sp', { name: 'thing', marketplace: 'official' }],
        },
      },
      skills: [{ name: 'brainstorming', provenance: { entry: 'sp', repo: 'o/r' } }, 'handoff'],
    });
    const catalog = loadCatalog(root);

    const only = claudeOnlySkills(catalog).map((o) => o.name);
    assert.ok(only.includes('k'), 'an unvendorable pointer is Claude-only');
    assert.ok(only.includes('thing'), 'a foreign-marketplace plugin is Claude-only');
    assert.ok(!only.includes('sp'), 'a vendored upstream must NOT be reported as Claude-only');

    const report = portabilityReport(catalog);
    assert.deepEqual(report.portable.sort(), ['brainstorming', 'handoff']);
    assert.equal(report.total, report.portable.length + report.claudeOnly.length);
  });

  test('most skills are portable in the real catalog', () => {
    const catalog = loadCatalog(process.cwd());
    const { portable, claudeOnly } = portabilityReport(catalog);
    assert.ok(
      portable.length > claudeOnly.length,
      `portability regressed: ${portable.length} portable vs ${claudeOnly.length} Claude-only`,
    );
  });
});

describe('vendored files carry their provenance and licence', () => {
  test('every vendored skill in this repo records repo, sha and license', () => {
    const catalog = loadCatalog(process.cwd());
    const vendored = catalog.entries.filter((e) => e.upstream?.vendor);
    assert.ok(vendored.length > 0, 'expected at least one vendored upstream');

    for (const e of vendored) {
      for (const s of vendoredSkills(process.cwd(), e.name)) {
        const p = JSON.parse(readFileSync(join(process.cwd(), 'skills', s, '.upstream.json'), 'utf8'));
        assert.equal(p.entry, e.name);
        assert.equal(p.repo, e.upstream.repo);
        assert.match(p.sha, /^[0-9a-f]{40}$/, `${s}: provenance sha must be a full commit SHA`);
        assert.ok(
          PERMISSIVE_LICENSES.has(p.license) || p.licenseGrant,
          `${s}: vendored under "${p.license}" with no recorded grant`,
        );
        assert.ok(p.attribution, `${s}: no attribution recorded`);
      }
    }
  });

  test('a skill vendored under a grant ships a NOTICE naming its author', () => {
    // No assertion that a grant-based entry must exist -- the catalog may
    // currently vendor everything under a real licence. This only checks the
    // mechanism holds for whichever entries (if any) rely on a grant.
    const root = process.cwd();
    const catalog = loadCatalog(root);
    const granted = catalog.entries.filter((e) => e.upstream?.vendor && e.upstream.licenseGrant);

    for (const e of granted) {
      for (const s of vendoredSkills(root, e.name)) {
        const notice = readFileSync(join(root, 'skills', s, 'NOTICE'), 'utf8');
        assert.ok(notice.includes(e.attribution), `${s}: NOTICE must name ${e.attribution}`);
        assert.ok(notice.includes(e.upstream.repo), `${s}: NOTICE must cite the source repo`);
      }
    }
  });

  test('nothing under a no-redistribution licence made it into the tree', () => {
    const root = process.cwd();
    for (const [skill, p] of vendoredProvenance(root)) {
      assert.ok(
        !NO_REDISTRIBUTION_LICENSES.has(p.license),
        `skills/${skill} was vendored under ${p.license}, which forbids copying`,
      );
    }
  });
});

process.on('exit', cleanup);
