// Build throwaway catalogs on disk so validation can be tested against real
// files rather than mocks -- the filesystem checks (does skills/x/SKILL.md
// exist?) are exactly the part worth testing.

import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import yaml from 'js-yaml';

const created = [];

export function makeCatalog({ market = {}, plugins = {}, skills = [] } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'ai-setup-test-'));
  created.push(root);

  mkdirSync(join(root, 'catalog/plugins'), { recursive: true });
  writeFileSync(
    join(root, 'catalog/marketplace.yaml'),
    yaml.dump({
      name: 'ai-setup',
      owner: { name: 'Test Owner' },
      description: 'test catalog',
      ...market,
    }),
  );

  for (const [name, body] of Object.entries(plugins)) {
    writeFileSync(join(root, `catalog/plugins/${name}.yaml`), yaml.dump(body));
  }

  // A skill is either a bare name (authored here) or {name, provenance} to
  // simulate one that `npm run vendor` copied in from an upstream.
  for (const s of skills) {
    const { name, provenance } = typeof s === 'string' ? { name: s } : s;
    mkdirSync(join(root, 'skills', name), { recursive: true });
    writeFileSync(
      join(root, 'skills', name, 'SKILL.md'),
      `---\nname: ${name}\ndescription: test skill ${name}\n---\n\n# ${name}\n`,
    );
    if (provenance) {
      writeFileSync(
        join(root, 'skills', name, '.upstream.json'),
        JSON.stringify({ sha: 'f'.repeat(40), license: 'MIT', ...provenance }, null, 2),
      );
    }
  }

  return root;
}

export function cleanup() {
  for (const d of created.splice(0)) rmSync(d, { recursive: true, force: true });
}
