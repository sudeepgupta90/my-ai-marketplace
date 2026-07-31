#!/usr/bin/env node
// plugin doctor: report plugins that loaded with errors.
//
// Two entry points:
//   node doctor.mjs           -> full report, always runs (the /plugin-doctor:doctor skill)
//   node doctor.mjs --hook    -> silent unless something is wrong, throttled to once/day
//
// Exists because a plugin whose dependency failed to resolve is disabled QUIETLY:
// the reason sits in the /plugin Errors tab, which nobody opens. The most likely
// cause is a dependency in a marketplace the user never registered.

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const HOOK_MODE = process.argv.includes('--hook');
const THROTTLE_MS = 24 * 60 * 60 * 1000;

function stampPath() {
  const dir = process.env.CLAUDE_PLUGIN_DATA;
  return dir ? join(dir, 'doctor-last-run') : null;
}

// Throttle only the hook. An explicit /plugin-doctor:doctor must always run.
function throttled() {
  const p = stampPath();
  if (!p) return false;
  try {
    const last = Number(readFileSync(p, 'utf8').trim());
    return Number.isFinite(last) && Date.now() - last < THROTTLE_MS;
  } catch {
    return false;
  }
}

function recordRun() {
  const p = stampPath();
  if (!p) return;
  try {
    mkdirSync(process.env.CLAUDE_PLUGIN_DATA, { recursive: true });
    writeFileSync(p, String(Date.now()));
  } catch {
    // A throttle we cannot persist is not worth failing a session over.
  }
}

function listPlugins() {
  try {
    const out = execFileSync('claude', ['plugin', 'list', '--json'], {
      encoding: 'utf8',
      timeout: 30_000,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const parsed = JSON.parse(out);
    return Array.isArray(parsed) ? parsed : (parsed.plugins ?? []);
  } catch {
    return null; // CLI missing, timed out, or output shape changed: stay silent.
  }
}

// `claude plugin list --json` reports an `id` of "name@marketplace" and omits
// `errors` entirely for plugins that loaded cleanly.
function idOf(p) {
  return p.id ?? `${p.name}@${p.marketplace ?? 'my-ai-marketplace'}`;
}

function remediation(errors, id) {
  const text = JSON.stringify(errors).toLowerCase();

  if (text.includes('cross-marketplace')) {
    return `add the dependency's marketplace to allowCrossMarketplaceDependenciesOn in the catalog, or install it manually first`;
  }
  if (text.includes('dependency-unsatisfied') || text.includes('not installed')) {
    return `a dependency is missing or disabled -> claude plugin install ${id}  (add its marketplace first if it is not registered)`;
  }
  if (text.includes('cache-miss') || text.includes('not found')) {
    return `claude plugin install ${id}`;
  }
  return `claude plugin details ${id}`;
}

const plugins = listPlugins();

if (plugins === null) {
  if (!HOOK_MODE) console.log('plugin doctor: could not run `claude plugin list --json`.');
  process.exit(0);
}

const broken = plugins.filter((p) => Array.isArray(p.errors) && p.errors.length > 0);

if (HOOK_MODE) {
  if (broken.length === 0 || throttled()) process.exit(0);
  recordRun();
  const names = broken.map(idOf).join(', ');
  console.log(
    `⚠ plugin-doctor: ${broken.length} plugin(s) loaded with errors: ${names}. ` +
      `Run /plugin-doctor:doctor for details.`,
  );
  process.exit(0);
}

// Full report.
console.log(`Checked ${plugins.length} installed plugin(s).\n`);

if (broken.length === 0) {
  console.log('✔ No plugin errors. Every installed plugin resolved its dependencies.');
} else {
  console.log(`✘ ${broken.length} plugin(s) need attention:\n`);
  for (const p of broken) {
    console.log(`  ${idOf(p)}`);
    for (const e of p.errors) {
      console.log(`    - ${typeof e === 'string' ? e : (e.message ?? JSON.stringify(e))}`);
    }
    console.log(`    fix: ${remediation(p.errors, idOf(p))}\n`);
  }
}

const disabled = plugins.filter((p) => p.enabled === false);
if (disabled.length > 0) {
  console.log(`\nAlso disabled (not an error, just inactive): ${disabled.map(idOf).join(', ')}`);
}
