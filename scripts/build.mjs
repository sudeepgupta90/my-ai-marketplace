#!/usr/bin/env node
// Generate every agent-specific manifest from catalog/.
//
//   npm run build     write the generated files
//   npm run check     verify they are up to date (CI gate), write nothing
//
// All logic lives in scripts/lib/catalog.mjs and is covered by tests/.
// This file only does I/O.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  GENERATED,
  loadCatalog,
  validateCatalog,
  buildClaudeMarketplace,
  buildGeminiExtension,
  buildReadmeCatalogTable,
  buildSettingsTemplate,
  quickstartRegistrations,
  portableSkills,
} from './lib/catalog.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');

const catalog = loadCatalog(ROOT);
const errors = validateCatalog(catalog);

if (errors.length) {
  console.error('Catalog validation failed:\n');
  for (const e of errors) console.error(`  ✘ ${e}`);
  console.error('');
  process.exit(1);
}

const json = (o) => JSON.stringify(o, null, 2) + '\n';

const outputs = [
  [GENERATED.claude, json(buildClaudeMarketplace(catalog))],
  [GENERATED.gemini, json(buildGeminiExtension(catalog))],
  [GENERATED.settings, json(buildSettingsTemplate(catalog))],
];

// The README catalog table is generated between markers so the surrounding
// prose stays hand-written.
const README = join(ROOT, 'README.md');
const START = '<!-- catalog:start -->';
const END = '<!-- catalog:end -->';
if (existsSync(README)) {
  const current = readFileSync(README, 'utf8');
  const s = current.indexOf(START);
  const e = current.indexOf(END);
  if (s !== -1 && e !== -1 && e > s) {
    const replaced =
      current.slice(0, s + START.length) +
      '\n\n' +
      buildReadmeCatalogTable(catalog) +
      '\n' +
      current.slice(e);
    outputs.push(['README.md', replaced]);
  } else if (!CHECK) {
    console.warn(`note: README.md has no ${START} / ${END} markers, skipping catalog table`);
  }
}

let stale = false;
for (const [rel, content] of outputs) {
  const abs = join(ROOT, rel);
  const current = existsSync(abs) ? readFileSync(abs, 'utf8') : null;
  if (current === content) continue;
  if (CHECK) {
    console.error(`✘ ${rel} is out of date. Run \`npm run build\` and commit the result.`);
    stale = true;
  } else {
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content);
    console.log(`wrote ${rel}`);
  }
}

if (CHECK) {
  if (stale) process.exit(1);
  console.log('✔ generated files are up to date');
} else {
  const units = catalog.entries.filter((e) => e.kind === 'unit').length;
  const bundles = catalog.entries.filter((e) => e.kind === 'bundle').length;
  console.log(
    `✔ ${catalog.entries.length} entries (${units} units, ${bundles} bundles), ` +
      `${portableSkills(ROOT).length} portable skills`,
  );
  const adds = quickstartRegistrations(catalog);
  if (adds.length) {
    console.log('\nQuickstart must include these marketplace registrations:');
    for (const c of adds) console.log(`  ${c}`);
  }
}
