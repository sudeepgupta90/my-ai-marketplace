#!/usr/bin/env node
// Copy upstream skills into skills/ so every agent can read them.
//
//   npm run vendor            fetch and update the tree
//   npm run vendor -- --check fail if the tree is out of date (CI)
//
// This is the mechanism the whole repo turns on. Claude Code can fetch a remote
// plugin at install time, so pointing at an upstream is tempting -- but Gemini
// and Codex have no such installer, and a pointer is invisible to them. Copying
// the files in makes skills/ true for all three, and makes updates a reviewable
// diff of the actual skill text rather than an opaque SHA bump.
//
// Only upstreams whose licence permits redistribution are vendored; the catalog
// validator enforces that, and each vendored directory carries the licence and
// the exact commit it came from.

import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, mkdirSync, readdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { loadCatalog, validateCatalog, vendoredSkills, PROVENANCE } from './lib/catalog.mjs';

const root = process.cwd();
const check = process.argv.includes('--check');

const git = (args, cwd) =>
  execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

const LICENSE_NAMES = ['LICENSE', 'LICENSE.txt', 'LICENSE.md', 'LICENCE', 'COPYING'];
const findLicense = (dir) => LICENSE_NAMES.map((n) => join(dir, n)).find(existsSync);

/**
 * Read the repository-root licence without checking it out.
 *
 * Sparse checkout in cone mode only accepts directories, so a root LICENSE file
 * cannot simply be added to the cone. Reading the blob straight out of the
 * object database sidesteps that and works whatever the checkout looks like.
 */
function rootLicenseText(dir) {
  for (const name of LICENSE_NAMES) {
    try {
      return git(['show', `HEAD:${name}`], dir);
    } catch {
      // Not present under this name; try the next spelling.
    }
  }
  return null;
}

/**
 * Fetch one upstream at a single commit.
 *
 * Blobless + sparse so a repo like anthropics/skills, which carries megabytes
 * of unrelated skills, costs only the directories actually wanted. A repo that
 * is itself one skill has nothing to narrow to, so it checks out whole.
 */
function fetchUpstream(repo, from, sha) {
  const dir = mkdtempSync(join(tmpdir(), 'ai-setup-vendor-'));
  const url = `https://github.com/${repo}.git`;

  git(['clone', '--depth', '1', '--filter=blob:none', '--sparse', url, dir]);
  if (sha) {
    git(['fetch', '--depth', '1', 'origin', sha], dir);
    git(['checkout', sha], dir);
  }
  if (from === '.') git(['sparse-checkout', 'disable'], dir);
  else git(['sparse-checkout', 'set', from], dir);

  return { dir, sha: git(['rev-parse', 'HEAD'], dir), license: rootLicenseText(dir) };
}

// Never copy an upstream's own tooling: its .git, its CI, and its per-agent
// plugin manifests, which would collide with this repo's own.
const SKIP = new Set(['.git', '.github', '.gitignore', '.gitattributes', 'node_modules']);

/**
 * Which skill directories to take from a fetched upstream.
 *
 * Two upstream shapes exist in the wild: a `skills/` tree of many skills, and a
 * repo that *is* one skill with SKILL.md at its root. Detecting which by
 * looking for a SKILL.md keeps that out of the catalog schema.
 */
function selectSkills(srcRoot, vendor, entryName) {
  if (!existsSync(srcRoot)) {
    throw new Error(`upstream has no directory "${vendor.from ?? 'skills'}"`);
  }
  if (existsSync(join(srcRoot, 'SKILL.md'))) {
    return [{ name: vendor.as ?? entryName, src: srcRoot, single: true }];
  }

  const available = readdirSync(srcRoot).filter((d) => existsSync(join(srcRoot, d, 'SKILL.md'))).sort();
  const chosen = vendor.only ?? available;

  const missing = chosen.filter((s) => !available.includes(s));
  if (missing.length) {
    throw new Error(
      `upstream no longer has: ${missing.join(', ')} (it offers ${available.join(', ')})`,
    );
  }
  return chosen.map((name) => ({ name, src: join(srcRoot, name), single: false }));
}

/** Copy a skill directory, minus the upstream's own plumbing. */
function copySkill(src, dest, include) {
  if (include) {
    for (const rel of include) {
      if (existsSync(join(src, rel))) cpSync(join(src, rel), join(dest, rel), { recursive: true });
    }
    return;
  }
  for (const name of readdirSync(src)) {
    if (SKIP.has(name) || name.startsWith('.claude') || name.startsWith('.codex')) continue;
    cpSync(join(src, name), join(dest, name), { recursive: true });
  }
}

function vendorEntry(entry, repoRoot, market) {
  const { repo, vendor, license } = entry.upstream;
  const from = vendor.from ?? 'skills';
  const { dir, sha, license: repoLicenseText } = fetchUpstream(repo, from, entry.upstream.sha);

  try {
    const srcRoot = from === '.' ? dir : join(dir, from);
    const wanted = selectSkills(srcRoot, vendor, entry.name);
    const names = wanted.map((w) => w.name);

    // Drop anything we vendored for this entry last time but no longer want,
    // so a narrowed `only` list does not leave stale skills behind.
    for (const stale of vendoredSkills(repoRoot, entry.name)) {
      if (!names.includes(stale)) {
        rmSync(join(repoRoot, 'skills', stale), { recursive: true, force: true });
      }
    }

    for (const { name, src, single } of wanted) {
      const dest = join(repoRoot, 'skills', name);
      rmSync(dest, { recursive: true, force: true });
      mkdirSync(dest, { recursive: true });
      copySkill(src, dest, vendor.include);

      // Ship the licence with the code -- a vendored skill that travels into
      // ~/.agents/skills must carry its terms with it. A per-skill licence wins,
      // since anthropics/skills licenses each skill separately.
      if (!findLicense(dest) && repoLicenseText) {
        writeFileSync(join(dest, 'LICENSE'), repoLicenseText + '\n');
      }

      // Vendored under a grant rather than a licence, so there is no licence
      // text to carry. Attribution is the whole basis of the arrangement, which
      // makes writing it into the directory the substantive part, not a
      // formality -- the file travels with the skill into other agents.
      if (entry.upstream.licenseGrant) {
        writeFileSync(
          join(dest, 'NOTICE'),
          [
            `This skill was authored by ${entry.attribution}.`,
            `Source: https://github.com/${repo} (${from}/${name}) at commit ${sha}.`,
            '',
            'The upstream repository publishes no licence. This copy is redistributed',
            'on the following recorded basis:',
            '',
            `  ${entry.upstream.licenseGrant.trim().replace(/\n/g, '\n  ')}`,
            '',
            'All rights remain with the original author, who may request removal at',
            `any time via an issue on ${market.repo ?? 'this repository'}.`,
            '',
          ].join('\n'),
        );
      }

      writeFileSync(
        join(dest, PROVENANCE),
        JSON.stringify(
          {
            entry: entry.name,
            repo,
            path: single ? from : `${from}/${name}`,
            sha,
            license,
            ...(entry.upstream.licenseGrant ? { licenseGrant: entry.upstream.licenseGrant.trim() } : {}),
            attribution: entry.attribution ?? repo,
            fetchedAt: new Date().toISOString().slice(0, 10),
          },
          null,
          2,
        ) + '\n',
      );
    }

    return { skills: names, sha };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const catalog = loadCatalog(root);
const targets = catalog.entries.filter((e) => e.upstream?.vendor);

if (!targets.length) {
  console.log('nothing to vendor');
  process.exit(0);
}

let failed = 0;
for (const entry of targets) {
  try {
    const { skills, sha } = vendorEntry(entry, root, catalog.market);
    console.log(`✔ ${entry.name}  ${entry.upstream.repo}@${sha.slice(0, 12)}  (${skills.length} skills)`);
  } catch (err) {
    // One unreachable upstream must not wipe the others' vendored files.
    failed++;
    console.error(`✘ ${entry.name}  ${entry.upstream.repo}: ${err.message.split('\n')[0]}`);
  }
}

// Vendoring rewrites the tree the validator reads, so re-check afterwards --
// this is where "upstream deleted the skill we listed" surfaces.
const errors = validateCatalog(loadCatalog(root));
if (errors.length) {
  console.error('\ncatalog is invalid after vendoring:');
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

if (check) {
  // Before the first commit every vendored file is untracked, which is not
  // drift -- there is nothing to have drifted from. Only compare once there is
  // history, which is always the case in CI.
  let hasCommits = true;
  try {
    git(['rev-parse', 'HEAD'], root);
  } catch {
    hasCommits = false;
  }

  const dirty = hasCommits ? git(['status', '--porcelain', '--', 'skills'], root) : '';
  if (!hasCommits) {
    console.log('\n✔ vendored skills are current (repository has no commits yet to compare against)');
  } else if (dirty) {
    console.error('\nvendored skills are out of date. Run `npm run vendor` and commit:\n');
    console.error(dirty);
    process.exit(1);
  } else {
    console.log('\n✔ vendored skills match their upstreams');
  }
}

process.exit(failed ? 1 : 0);
