// Catalog: load, validate, and render to each agent's manifest format.
//
// Pure and side-effect free apart from reading the catalog. Everything here is
// exercised directly by tests/; scripts/build.mjs is only a CLI wrapper.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

export const GENERATED = {
  claude: '.claude-plugin/marketplace.json',
  gemini: 'gemini-extension.json',
  settings: 'templates/settings.json',
};

const readYaml = (p) => yaml.load(readFileSync(p, 'utf8'));

/**
 * Licences that grant the right to redistribute, which is exactly what
 * vendoring does. A closed allowlist rather than a heuristic: getting this
 * wrong means shipping someone else's code without permission, so an unknown
 * licence must fail the build rather than be guessed at.
 *
 * Copyleft licences are deliberately absent -- not because they forbid
 * redistribution, but because they impose obligations on this repo that should
 * be a considered decision, not a side effect of adding a skill.
 */
export const PERMISSIVE_LICENSES = new Set([
  'MIT',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'ISC',
  'CC0-1.0',
  'Unlicense',
  '0BSD',
]);

/**
 * Licences whose text affirmatively forbids copying, so no amount of
 * justification makes vendoring legitimate. Distinct from "unlicensed", where
 * the position is merely unclear -- here the upstream has said no in writing.
 *
 * Anthropic's per-skill LICENSE.txt bars extracting the materials from the
 * Services, retaining copies outside them, reproducing them, and distributing
 * them to third parties. Verified against skills/docx/LICENSE.txt, 2026-07-28.
 */
export const NO_REDISTRIBUTION_LICENSES = new Set(['LicenseRef-Anthropic-Services']);

/** Provenance written next to every vendored skill by scripts/vendor.mjs. */
export const PROVENANCE = '.upstream.json';

/**
 * Every skill in the tree that came from an upstream, keyed by directory name.
 *
 * The filesystem is the record. A vendored skill is a real directory carrying
 * a .upstream.json, so nothing needs a separate lockfile to stay in step, and
 * a half-finished vendor run is visible rather than inferred.
 */
export function vendoredProvenance(root) {
  const dir = join(root, 'skills');
  const out = new Map();
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name, PROVENANCE);
    if (existsSync(p)) out.set(name, JSON.parse(readFileSync(p, 'utf8')));
  }
  return out;
}

/** Skill directories vendored on behalf of one catalog entry. */
export function vendoredSkills(root, entryName) {
  return [...vendoredProvenance(root)]
    .filter(([, p]) => p.entry === entryName)
    .map(([name]) => name);
}

/** Normalise a dependency, which may be a bare string or an object. */
export function normaliseDep(dep, defaultMarketplace) {
  const d = typeof dep === 'string' ? { name: dep } : { ...dep };
  d.marketplace ??= defaultMarketplace;
  return d;
}

export function loadCatalog(root) {
  const market = readYaml(join(root, 'catalog/marketplace.yaml'));
  const dir = join(root, 'catalog/plugins');
  const entries = existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => f.endsWith('.yaml'))
        .sort()
        .map((f) => ({ file: f, ...readYaml(join(dir, f)) }))
    : [];
  return { root, market, entries };
}

/** Skill directories in the portable tree (the agent-neutral source of truth). */
export function portableSkills(root) {
  const dir = join(root, 'skills');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((d) => existsSync(join(dir, d, 'SKILL.md')))
    .sort();
}

/**
 * Returns an array of human-readable error strings; empty means valid.
 *
 * The two invariants that matter most exist to make Claude Code's *quiet*
 * failure modes impossible to publish:
 *   A. a cross-marketplace dependency that is not allowlisted fails to install
 *   B. a dependency in a marketplace the user has not registered resolves to
 *      nothing and silently disables the dependent plugin
 */
export function validateCatalog({ root, market, entries }) {
  const errors = [];
  const fail = (m) => errors.push(m);

  if (!market?.name) fail('catalog/marketplace.yaml: missing "name"');
  if (!market?.owner) fail('catalog/marketplace.yaml: missing "owner"');

  const allowed = new Map(
    (market.allowCrossMarketplaceDependenciesOn ?? []).map((m) => [m.name, m]),
  );
  const names = new Set();

  for (const e of entries) {
    const where = e.file ?? e.name ?? '<entry>';
    if (!e.name) fail(`${where}: missing "name"`);
    else if (names.has(e.name)) fail(`${where}: duplicate plugin name "${e.name}"`);
    names.add(e.name);

    if (!['unit', 'bundle'].includes(e.kind)) {
      fail(`${where}: "kind" must be "unit" or "bundle", got "${e.kind}"`);
    }
    if (!e.description) fail(`${where}: missing "description"`);

    if (e.upstream && !e.upstream.repo) {
      fail(`${where}: upstream needs a "repo"`);
    }
    if (e.upstream?.sha && !/^[0-9a-f]{40}$/.test(e.upstream.sha)) {
      fail(`${where}: upstream.sha must be a full 40-character commit SHA`);
    }

    if (e.upstream) {
      const u = e.upstream;

      // Vendoring redistributes someone else's work, so the licence is not
      // documentation -- it is the thing that decides whether the skill can be
      // portable at all. Both branches below hinge on it.
      if (!u.license) {
        fail(
          `${where}: upstream needs a "license" (an SPDX id, or "none" if the ` +
            'upstream publishes none) -- it decides whether this can be vendored',
        );
      } else if (u.vendor && !PERMISSIVE_LICENSES.has(u.license)) {
        // Tier 2: the upstream has forbidden this in writing. Not overridable,
        // because no field in a YAML file can grant a right the author denied.
        if (NO_REDISTRIBUTION_LICENSES.has(u.license)) {
          fail(
            `${where}: "${u.repo}" is under "${u.license}", which explicitly forbids ` +
              'copying and redistribution. It cannot be vendored under any justification. ' +
              'Use upstream.notVendored and let Claude Code fetch it at install time.',
          );
        } else if (!u.licenseGrant) {
          // Tier 3: unlicensed or unrecognised, so the position is unclear
          // rather than settled. Allowed, but only as a decision someone
          // recorded and can be asked about later.
          fail(
            `${where}: "${u.repo}" is under "${u.license}", which does not clearly grant ` +
              'redistribution. To vendor it anyway, add upstream.licenseGrant stating the ' +
              'basis (an author permission, or GitHub ToS fork rights) -- or use ' +
              'upstream.notVendored to keep it a Claude-only pointer.',
          );
        } else if (!e.attribution) {
          fail(
            `${where}: vendoring under a licenseGrant requires "attribution" naming the ` +
              'upstream author, since credit is the only thing being offered in return',
          );
        }
      }

      if (u.vendor) {
        if (e.skills) {
          fail(`${where}: a vendored entry's skills list is generated from the tree, not hand-written`);
        }
        if (vendoredSkills(root, e.name).length === 0) {
          fail(`${where}: declares vendor but no skill in skills/ claims it -- run \`npm run vendor\``);
        }
      } else if (!u.notVendored) {
        // The failure this repo exists to prevent: an upstream quietly ending
        // up Claude-only because nobody decided it should be.
        fail(
          `${where}: not vendored, so it works in Claude Code only. Add ` +
            '"notVendored" to upstream saying why (licence, or it is a plugin ' +
            'rather than plain skills), or add "vendor" to make it portable.',
        );
      }
    }

    if (!e.upstream) {
      for (const s of e.skills ?? []) {
        if (!existsSync(join(root, 'skills', s, 'SKILL.md'))) {
          fail(`${where}: skill "${s}" has no skills/${s}/SKILL.md`);
        }
      }
    }
    // A bundle with neither dependencies nor skills contributes nothing.
    if (e.kind === 'bundle' && !e.dependencies?.length && !e.skills?.length) {
      fail(`${where}: bundle has no dependencies and no skills`);
    }
  }

  // A vendored directory outlives the catalog entry that pulled it in: delete
  // the entry and the files stay, silently shipping to every agent with nothing
  // left to update them.
  for (const [skill, p] of vendoredProvenance(root)) {
    if (!names.has(p.entry)) {
      fail(
        `skills/${skill}: vendored for entry "${p.entry}", which is no longer in the ` +
          'catalog -- delete the directory, or restore the entry',
      );
    }
  }

  for (const e of entries) {
    const where = e.file ?? e.name;
    for (const dep of e.dependencies ?? []) {
      const d = normaliseDep(dep, market.name);

      if (d.marketplace === market.name) {
        if (!names.has(d.name)) {
          fail(`${where}: depends on "${d.name}", which is not a plugin in this catalog`);
        }
        continue;
      }

      if (!allowed.has(d.marketplace)) {
        fail(
          `${where}: depends on "${d.name}@${d.marketplace}" but "${d.marketplace}" is not in ` +
            'allowCrossMarketplaceDependenciesOn in catalog/marketplace.yaml',
        );
        continue;
      }

      const m = allowed.get(d.marketplace);
      if (!m.registeredByDefault && !m.addCommand) {
        fail(
          `${where}: depends on "${d.name}@${d.marketplace}", which is not registered by ` +
            'default, so catalog/marketplace.yaml must give it an "addCommand" for the ' +
            'quickstart (otherwise this plugin silently disables itself)',
        );
      }
    }
  }

  return errors;
}

/** Marketplace registrations the quickstart must tell users to run. */
export function quickstartRegistrations({ market, entries }) {
  const allowed = new Map(
    (market.allowCrossMarketplaceDependenciesOn ?? []).map((m) => [m.name, m]),
  );
  const cmds = new Set();
  for (const e of entries) {
    for (const dep of e.dependencies ?? []) {
      const d = normaliseDep(dep, market.name);
      const m = allowed.get(d.marketplace);
      if (m && !m.registeredByDefault && m.addCommand) cmds.add(m.addCommand);
    }
  }
  return [...cmds];
}

export function buildClaudeEntry(e, marketName, root) {
  const out = { name: e.name };
  if (e.displayName) out.displayName = e.displayName;
  if (e.description) out.description = e.description;

  // Vendored upstreams are indistinguishable from skills authored here: the
  // files are in the tree, so Claude Code loads them the same way Gemini and
  // Codex do. That sameness is the point -- one source shape, three agents.
  const skills = e.upstream?.vendor ? vendoredSkills(root, e.name) : (e.skills ?? []);

  if (e.upstream && !e.upstream.vendor) {
    // Not redistributable, so it stays a pointer and Claude Code's installer
    // fetches it at install time. Claude-only by necessity, not by choice.
    const u = e.upstream;
    out.source = u.path
      ? { source: 'git-subdir', url: `https://github.com/${u.repo}.git`, path: u.path }
      : { source: 'github', repo: u.repo };
    if (u.ref) out.source.ref = u.ref;
    if (u.sha) out.source.sha = u.sha; // freeze-a-bad-upstream escape hatch
    if (u.strict === false) out.strict = false;
    if (u.skills) out.skills = u.skills;
  } else {
    // Marketplace-root source plus an explicit skills list: the documented way
    // for several entries to share one root skills/ folder, each loading only
    // its own. Listing paths here replaces the default skills/ scan.
    out.source = './';
    if (skills.length) out.skills = skills.map((s) => `./skills/${s}`);
  }

  if (e.category) out.category = e.category;
  if (e.tags) out.tags = e.tags;
  if (e.hooks) out.hooks = e.hooks;

  if (e.dependencies?.length) {
    out.dependencies = e.dependencies.map((dep) => {
      const d = normaliseDep(dep, marketName);
      // Bare string means same marketplace; qualify only when it differs, to
      // keep the generated JSON readable.
      return d.marketplace === marketName ? d.name : { name: d.name, marketplace: d.marketplace };
    });
  }
  return out;
}

export function buildClaudeMarketplace({ root, market, entries }) {
  const allowed = (market.allowCrossMarketplaceDependenciesOn ?? []).map((m) => m.name);
  return {
    name: market.name,
    owner: market.owner,
    ...(market.description ? { description: market.description } : {}),
    ...(allowed.length ? { allowCrossMarketplaceDependenciesOn: allowed } : {}),
    plugins: entries.map((e) => buildClaudeEntry(e, market.name, root)),
    // Append-only history so renames migrate instead of erroring. Claude Code
    // follows chains, so never edit an existing entry -- add another.
    ...(market.renames ? { renames: market.renames } : {}),
  };
}

/**
 * Gemini CLI has no marketplace, dependency, or bundle concept: it clones the
 * extension and auto-discovers skills/<name>/SKILL.md from its root. So bundles
 * flatten away entirely and the portable tree is offered wholesale.
 *
 * Upstream pointers cannot be represented -- they are fetched by Claude Code's
 * installer, and Gemini has no equivalent. Those skills are Claude-only until
 * the deferred vendoring fetcher exists.
 */
export function buildGeminiExtension({ market }) {
  return {
    name: market.name,
    version: market.version ?? '0.1.0',
    description: market.description,
    contextFileName: 'AGENTS.md',
  };
}

/**
 * A drop-in .claude/settings.json for any project.
 *
 * Declares only bundles under enabledPlugins -- their dependencies fan out
 * automatically -- so the template stays short and cannot drift as bundle
 * contents change. Every marketplace anything depends on is declared too:
 * a dependency in an unregistered marketplace resolves to nothing and silently
 * disables the plugin that wanted it.
 */
export function buildSettingsTemplate({ market, entries }) {
  const marketplaces = {};
  if (market.repo) {
    marketplaces[market.name] = { source: { source: 'github', repo: market.repo } };
  }

  const byName = new Map(
    (market.allowCrossMarketplaceDependenciesOn ?? []).map((m) => [m.name, m]),
  );
  for (const e of entries) {
    for (const dep of e.dependencies ?? []) {
      const d = normaliseDep(dep, market.name);
      if (d.marketplace === market.name) continue;
      const m = byName.get(d.marketplace);
      if (m?.repo) marketplaces[d.marketplace] = { source: { source: 'github', repo: m.repo } };
      else if (m) marketplaces[d.marketplace] = { source: { source: 'github', repo: repoFromAdd(m) } };
    }
  }

  const enabledPlugins = {};
  for (const e of entries.filter((x) => x.kind === 'bundle')) {
    enabledPlugins[`${e.name}@${market.name}`] = true;
  }

  return { extraKnownMarketplaces: marketplaces, enabledPlugins };
}

/** Recover "owner/repo" from an addCommand like "/plugin marketplace add owner/repo". */
function repoFromAdd(m) {
  const match = /add\s+(\S+)\s*$/.exec(m.addCommand ?? '');
  return match ? match[1] : m.name;
}

/**
 * Skills reachable only through Claude Code.
 *
 * Vendored upstreams are absent by construction: their files are in the tree,
 * so every agent has them. What remains is the irreducible set -- upstreams
 * whose licence forbids redistribution, and plugins that live in someone
 * else's marketplace.
 */
export function claudeOnlySkills({ market, entries }) {
  const out = [];
  for (const e of entries) {
    if (e.upstream && !e.upstream.vendor) {
      out.push({
        name: e.name,
        reason: e.upstream.notVendored ?? `fetched from ${e.upstream.repo}`,
      });
    }
    for (const dep of e.dependencies ?? []) {
      const d = normaliseDep(dep, market.name);
      if (d.marketplace !== market.name) {
        out.push({ name: d.name, reason: `lives in ${d.marketplace}` });
      }
    }
  }
  // Dedupe by name, first reason wins.
  const seen = new Map();
  for (const o of out) if (!seen.has(o.name)) seen.set(o.name, o);
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * How much of the catalog actually clears the bar the repo sets for itself.
 *
 * Kept as a number rather than prose because prose was how the last version
 * hid the fact that only two skills were portable. A test asserts the majority
 * stays portable, so a regression fails the build instead of becoming a
 * paragraph in the README.
 */
export function portabilityReport(catalog) {
  const portable = portableSkills(catalog.root);
  const claudeOnly = claudeOnlySkills(catalog);
  return {
    portable,
    claudeOnly,
    total: portable.length + claudeOnly.length,
    ratio: portable.length / (portable.length + claudeOnly.length || 1),
  };
}

export function buildReadmeCatalogTable({ market, entries }) {
  const lines = [];
  const bundles = entries.filter((e) => e.kind === 'bundle');
  const units = entries.filter((e) => e.kind === 'unit');

  if (bundles.length) {
    lines.push('### Bundles', '');
    lines.push('| Bundle | Install | What it gives you |');
    lines.push('| --- | --- | --- |');
    for (const b of bundles) {
      const deps = (b.dependencies ?? [])
        .map((d) => normaliseDep(d, market.name).name)
        .join(', ');
      lines.push(
        `| **${b.displayName ?? b.name}** | \`/plugin install ${b.name}@${market.name}\` | ${b.description}${deps ? `<br>Pulls in: ${deps}` : ''} |`,
      );
    }
    lines.push('');
  }

  if (units.length) {
    lines.push('### Individual plugins', '');
    lines.push('| Plugin | Source | Licence | Works in | Updates |');
    lines.push('| --- | --- | --- | --- | --- |');
    for (const u of units) {
      const src = u.upstream ? `[${u.upstream.repo}](https://github.com/${u.upstream.repo})` : 'this repo';
      const licence = u.upstream ? (u.upstream.licenseGrant ? `${u.upstream.license} *(by grant)*` : u.upstream.license) : 'MIT';
      const portable = !u.upstream || u.upstream.vendor;
      const updates = u.upstream
        ? u.upstream.sha
          ? 'pinned to a commit'
          : u.upstream.vendor
            ? 'daily re-vendor PR'
            : 'every upstream commit'
        : 'every commit here';
      lines.push(
        `| \`${u.name}\` | ${src} | ${licence} | ${portable ? 'any agent' : 'Claude Code only'} | ${updates} |`,
      );
    }
    lines.push('');
  }

  return lines.join('\n');
}
