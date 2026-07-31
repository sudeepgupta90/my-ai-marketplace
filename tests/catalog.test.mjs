import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  loadCatalog,
  validateCatalog,
  buildClaudeMarketplace,
  buildClaudeEntry,
  buildGeminiExtension,
  buildReadmeCatalogTable,
  buildSettingsTemplate,
  quickstartRegistrations,
  claudeOnlySkills,
  portableSkills,
  normaliseDep,
} from '../scripts/lib/catalog.mjs';
import { makeCatalog, cleanup } from './helpers.mjs';

after(cleanup);

const validate = (opts) => validateCatalog(loadCatalog(makeCatalog(opts)));
const OFFICIAL = {
  allowCrossMarketplaceDependenciesOn: [
    { name: 'claude-plugins-official', registeredByDefault: true, why: 'official' },
  ],
};

describe('validation: structural', () => {
  test('accepts a minimal valid catalog', () => {
    const errors = validate({
      plugins: { a: { kind: 'unit', name: 'a', description: 'd', skills: ['s'] } },
      skills: ['s'],
    });
    assert.deepEqual(errors, []);
  });

  test('rejects a skill with no SKILL.md on disk', () => {
    const errors = validate({
      plugins: { a: { kind: 'unit', name: 'a', description: 'd', skills: ['ghost'] } },
    });
    assert.match(errors.join('\n'), /skill "ghost" has no skills\/ghost\/SKILL\.md/);
  });

  test('rejects duplicate plugin names', () => {
    const errors = validate({
      plugins: {
        one: { kind: 'unit', name: 'dupe', description: 'd' },
        two: { kind: 'unit', name: 'dupe', description: 'd' },
      },
    });
    assert.match(errors.join('\n'), /duplicate plugin name "dupe"/);
  });

  test('rejects an unknown kind', () => {
    const errors = validate({ plugins: { a: { kind: 'widget', name: 'a', description: 'd' } } });
    assert.match(errors.join('\n'), /"kind" must be "unit" or "bundle"/);
  });

  test('rejects a bundle that contributes nothing', () => {
    const errors = validate({ plugins: { a: { kind: 'bundle', name: 'a', description: 'd' } } });
    assert.match(errors.join('\n'), /no dependencies and no skills/);
  });

  test('rejects a short sha, since Claude Code requires all 40 characters', () => {
    const errors = validate({
      plugins: {
        a: { kind: 'unit', name: 'a', description: 'd', upstream: { repo: 'o/r', sha: 'abc123' } },
      },
    });
    assert.match(errors.join('\n'), /40-character commit SHA/);
  });

  test('accepts a full 40-character sha', () => {
    const errors = validate({
      plugins: {
        a: {
          kind: 'unit',
          name: 'a',
          description: 'd',
          upstream: { repo: 'o/r', license: 'MIT', notVendored: 'test', sha: 'a'.repeat(40) },
        },
      },
    });
    assert.deepEqual(errors, []);
  });
});

describe('validation: invariant A -- cross-marketplace allowlist', () => {
  test('rejects a dependency on a marketplace that is not allowlisted', () => {
    const errors = validate({
      plugins: {
        b: {
          kind: 'bundle',
          name: 'b',
          description: 'd',
          dependencies: [{ name: 'x', marketplace: 'sketchy' }],
        },
      },
    });
    assert.match(errors.join('\n'), /"sketchy" is not in allowCrossMarketplaceDependenciesOn/);
  });

  test('accepts a dependency on an allowlisted marketplace', () => {
    const errors = validate({
      market: OFFICIAL,
      plugins: {
        b: {
          kind: 'bundle',
          name: 'b',
          description: 'd',
          dependencies: [{ name: 'frontend-design', marketplace: 'claude-plugins-official' }],
        },
      },
    });
    assert.deepEqual(errors, []);
  });

  test('same-marketplace dependencies need no allowlisting', () => {
    const errors = validate({
      plugins: {
        a: { kind: 'unit', name: 'a', description: 'd' },
        b: { kind: 'bundle', name: 'b', description: 'd', dependencies: ['a'] },
      },
    });
    assert.deepEqual(errors, []);
  });

  test('rejects a dangling same-marketplace dependency', () => {
    const errors = validate({
      plugins: { b: { kind: 'bundle', name: 'b', description: 'd', dependencies: ['nope'] } },
    });
    assert.match(errors.join('\n'), /depends on "nope", which is not a plugin in this catalog/);
  });
});

describe('validation: invariant B -- unregistered marketplaces', () => {
  const unregistered = (extra = {}) => ({
    market: {
      allowCrossMarketplaceDependenciesOn: [
        { name: 'anthropic-agent-skills', registeredByDefault: false, why: 'test', ...extra },
      ],
    },
    plugins: {
      b: {
        kind: 'bundle',
        name: 'b',
        description: 'd',
        dependencies: [{ name: 'document-skills', marketplace: 'anthropic-agent-skills' }],
      },
    },
  });

  test('rejects when the marketplace is not registered by default and has no addCommand', () => {
    const errors = validateCatalog(loadCatalog(makeCatalog(unregistered())));
    assert.match(errors.join('\n'), /must give it an "addCommand"/);
  });

  test('accepts once an addCommand is supplied', () => {
    const errors = validateCatalog(
      loadCatalog(makeCatalog(unregistered({ addCommand: '/plugin marketplace add anthropics/skills' }))),
    );
    assert.deepEqual(errors, []);
  });

  test('surfaces the addCommand for the quickstart', () => {
    const cat = loadCatalog(
      makeCatalog(unregistered({ addCommand: '/plugin marketplace add anthropics/skills' })),
    );
    assert.deepEqual(quickstartRegistrations(cat), ['/plugin marketplace add anthropics/skills']);
  });

  test('a registered-by-default marketplace needs no quickstart line', () => {
    const cat = loadCatalog(
      makeCatalog({
        market: OFFICIAL,
        plugins: {
          b: {
            kind: 'bundle',
            name: 'b',
            description: 'd',
            dependencies: [{ name: 'x', marketplace: 'claude-plugins-official' }],
          },
        },
      }),
    );
    assert.deepEqual(quickstartRegistrations(cat), []);
  });
});

describe('emit: Claude Code marketplace', () => {
  test('own skills use a marketplace-root source with explicit paths', () => {
    const e = buildClaudeEntry(
      { kind: 'unit', name: 'a', description: 'd', skills: ['one', 'two'] },
      'ai-setup',
    );
    assert.equal(e.source, './');
    assert.deepEqual(e.skills, ['./skills/one', './skills/two']);
  });

  test('upstream entries become a github source', () => {
    const e = buildClaudeEntry(
      { kind: 'unit', name: 'a', description: 'd', upstream: { repo: 'obra/superpowers' } },
      'ai-setup',
    );
    assert.deepEqual(e.source, { source: 'github', repo: 'obra/superpowers' });
  });

  test('a subdirectory upstream becomes git-subdir, which clones sparsely', () => {
    const e = buildClaudeEntry(
      { kind: 'unit', name: 'a', description: 'd', upstream: { repo: 'o/r', path: 'plugins/x' } },
      'ai-setup',
    );
    assert.equal(e.source.source, 'git-subdir');
    assert.equal(e.source.url, 'https://github.com/o/r.git');
    assert.equal(e.source.path, 'plugins/x');
  });

  test('a sha pin is carried through -- the escape hatch for a bad upstream', () => {
    const sha = 'b'.repeat(40);
    const e = buildClaudeEntry(
      { kind: 'unit', name: 'a', description: 'd', upstream: { repo: 'o/r', sha } },
      'ai-setup',
    );
    assert.equal(e.source.sha, sha);
  });

  test('cherry-picking uses strict:false so the entry defines the whole plugin', () => {
    const e = buildClaudeEntry(
      {
        kind: 'unit',
        name: 'a',
        description: 'd',
        upstream: { repo: 'anthropics/skills', strict: false, skills: ['./skills/mcp-builder'] },
      },
      'ai-setup',
    );
    assert.equal(e.strict, false);
    assert.deepEqual(e.skills, ['./skills/mcp-builder']);
  });

  test('same-marketplace dependencies stay bare strings, foreign ones get qualified', () => {
    const e = buildClaudeEntry(
      {
        kind: 'bundle',
        name: 'b',
        description: 'd',
        dependencies: ['local-one', { name: 'far', marketplace: 'claude-plugins-official' }],
      },
      'ai-setup',
    );
    assert.deepEqual(e.dependencies, [
      'local-one',
      { name: 'far', marketplace: 'claude-plugins-official' },
    ]);
  });

  test('an explicit same-marketplace qualifier is collapsed to a bare string', () => {
    const e = buildClaudeEntry(
      {
        kind: 'bundle',
        name: 'b',
        description: 'd',
        dependencies: [{ name: 'x', marketplace: 'ai-setup' }],
      },
      'ai-setup',
    );
    assert.deepEqual(e.dependencies, ['x']);
  });

  test('the allowlist is flattened to the string array Claude Code expects', () => {
    const cat = loadCatalog(makeCatalog({ market: OFFICIAL }));
    const m = buildClaudeMarketplace(cat);
    assert.deepEqual(m.allowCrossMarketplaceDependenciesOn, ['claude-plugins-official']);
  });

  test('renames are emitted so existing installs migrate instead of erroring', () => {
    const cat = loadCatalog(makeCatalog({ market: { renames: { old: 'new', gone: null } } }));
    assert.deepEqual(buildClaudeMarketplace(cat).renames, { old: 'new', gone: null });
  });
});

describe('emit: portability', () => {
  test('the Gemini extension points at AGENTS.md and needs no skill list', () => {
    const cat = loadCatalog(makeCatalog({}));
    const g = buildGeminiExtension(cat);
    assert.equal(g.contextFileName, 'AGENTS.md');
    assert.equal(g.name, 'ai-setup');
  });

  test('portableSkills finds every skill in the agent-neutral tree', () => {
    const root = makeCatalog({ skills: ['alpha', 'beta'] });
    assert.deepEqual(portableSkills(root), ['alpha', 'beta']);
  });

  test('claudeOnlySkills names what other agents cannot reach, and why', () => {
    const cat = loadCatalog(
      makeCatalog({
        market: OFFICIAL,
        plugins: {
          up: { kind: 'unit', name: 'up', description: 'd', upstream: { repo: 'obra/superpowers' } },
          b: {
            kind: 'bundle',
            name: 'b',
            description: 'd',
            dependencies: [{ name: 'frontend-design', marketplace: 'claude-plugins-official' }],
          },
        },
      }),
    );
    const only = claudeOnlySkills(cat);
    assert.deepEqual(
      only.map((o) => o.name),
      ['frontend-design', 'up'],
    );
    assert.match(only.find((o) => o.name === 'up').reason, /obra\/superpowers/);
  });
});

describe('emit: README table', () => {
  test('lists bundles with their install command and what they pull in', () => {
    const cat = loadCatalog(
      makeCatalog({
        plugins: {
          a: { kind: 'unit', name: 'a', description: 'unit desc' },
          b: {
            kind: 'bundle',
            name: 'core',
            displayName: 'Core',
            description: 'bundle desc',
            dependencies: ['a'],
          },
        },
      }),
    );
    const table = buildReadmeCatalogTable(cat);
    assert.match(table, /\/plugin install core@ai-setup/);
    assert.match(table, /Pulls in: a/);
  });

  test('states each unit cadence honestly, and which agents can use it', () => {
    const cat = loadCatalog(
      makeCatalog({
        plugins: {
          vend: {
            kind: 'unit', name: 'vend', description: 'd',
            upstream: { repo: 'o/r', license: 'MIT', vendor: { from: 'skills' } },
          },
          ptr: {
            kind: 'unit', name: 'ptr', description: 'd',
            upstream: { repo: 'o/r2', license: 'none', notVendored: 'no licence' },
          },
          frozen: {
            kind: 'unit', name: 'frozen', description: 'd',
            upstream: { repo: 'o/r3', license: 'MIT', sha: 'a'.repeat(40), vendor: { from: 'skills' } },
          },
          mine: { kind: 'unit', name: 'mine', description: 'd' },
        },
        skills: [
          { name: 's1', provenance: { entry: 'vend', repo: 'o/r' } },
          { name: 's2', provenance: { entry: 'frozen', repo: 'o/r3' } },
        ],
      }),
    );
    const table = buildReadmeCatalogTable(cat);
    assert.match(table, /daily re-vendor PR/);
    assert.match(table, /every upstream commit/);
    assert.match(table, /pinned to a commit/);
    assert.match(table, /every commit here/);

    // The column that stops the old failure mode recurring quietly: a pointer
    // has to announce that it works in one agent only.
    const ptrRow = table.split('\n').find((l) => l.startsWith('| `ptr`'));
    assert.match(ptrRow, /Claude Code only/);
    const vendRow = table.split('\n').find((l) => l.startsWith('| `vend`'));
    assert.match(vendRow, /any agent/);
  });
});

describe('emit: settings template', () => {
  const cat = () =>
    loadCatalog(
      makeCatalog({
        market: { repo: 'owner/repo', ...OFFICIAL },
        plugins: {
          u: { kind: 'unit', name: 'a-unit', description: 'd' },
          b: {
            kind: 'bundle',
            name: 'core',
            description: 'd',
            dependencies: ['a-unit', { name: 'far', marketplace: 'claude-plugins-official' }],
          },
        },
      }),
    );

  test('registers this marketplace from its github repo', () => {
    const s = buildSettingsTemplate(cat());
    assert.deepEqual(s.extraKnownMarketplaces['ai-setup'].source, {
      source: 'github',
      repo: 'owner/repo',
    });
  });

  test('also registers every marketplace our dependencies live in', () => {
    // Otherwise the dependency resolves to nothing and silently disables the bundle.
    const s = buildSettingsTemplate(cat());
    assert.ok(
      s.extraKnownMarketplaces['claude-plugins-official'],
      'a marketplace we depend on must be declared, or dependent plugins disable themselves',
    );
  });

  test('enables bundles only, letting dependencies fan out from them', () => {
    const s = buildSettingsTemplate(cat());
    assert.deepEqual(Object.keys(s.enabledPlugins), ['core@ai-setup']);
  });
});

describe('normaliseDep', () => {
  test('defaults a bare string to the local marketplace', () => {
    assert.deepEqual(normaliseDep('x', 'ai-setup'), { name: 'x', marketplace: 'ai-setup' });
  });

  test('preserves an explicit marketplace', () => {
    assert.deepEqual(normaliseDep({ name: 'x', marketplace: 'other' }, 'ai-setup'), {
      name: 'x',
      marketplace: 'other',
    });
  });
});
