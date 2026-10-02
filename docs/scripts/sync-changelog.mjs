/**
 * Rebuilds each package's `content/docs/<slug>/changelog.mdx` from its own CHANGELOG.md.
 *
 * The changelogs are written by Changesets in `packages/`, beside this folder, so they are read from
 * disk. It runs on every build and from the monorepo's `version-packages`, which puts the refreshed
 * pages in the same Version Packages PR as the bump they describe.
 *
 * Release dates come from the npm registry: Changesets does not record them, and the git tags that
 * would carry them are not reliably pushed.
 *
 * Usage: bun run sync:changelog
 */
import { readFile, writeFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';

/**
 * Every package with a changelog page. A package earns an entry here on the day it goes to npm, the
 * same rule the rest of the site follows. The slug is the docs folder, which is the npm name without
 * the scope, exactly as `packages.service` derives it.
 */
const PACKAGES = [
  { name: '@axonpack/expo-devtools', slug: 'expo-devtools' },
  { name: '@axonpack/react-native-devtools-tab', slug: 'react-native-devtools-tab' },
  { name: '@axonpack/react-pretty-print', slug: 'react-pretty-print' },
];

const OUT_DATA = new URL('../src/lib/releases.generated.ts', import.meta.url);

const get = async (url, as = 'text') => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
  return as === 'json' ? res.json() : res.text();
};

/**
 * Pulls one file out of a gzipped tar. Forty lines against a dependency for a format that is fixed
 * 512-byte headers: a name, an octal size, then the data padded to the next block. npm prefixes
 * every path in a package tarball with `package/`.
 */
function fileFromTarball(archive, wanted) {
  const tar = gunzipSync(archive);
  let offset = 0;
  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512);
    const name = header.subarray(0, 100).toString("utf8").replace(/\0.*$/s, "");
    if (!name) return null; // Two zero blocks end the archive.
    const size = parseInt(header.subarray(124, 136).toString("utf8").replace(/\0.*$/s, "").trim(), 8) || 0;
    const start = offset + 512;
    if (name === wanted) return tar.subarray(start, start + size).toString("utf8");
    offset = start + Math.ceil(size / 512) * 512;
  }
  return null;
}

/**
 * The changelog from `packages/`, or from the published tarball when that folder is missing.
 *
 * The local file wins so a version bumped by `changeset version` shows before it is published. The
 * tarball only matters if this folder is ever built on its own, without the monorepo around it.
 * It is never `main` over raw.githubusercontent: that 404s for a package whose source has not
 * reached `main` yet, and failed the deploy when this site was a separate repository.
 */
async function readChangelog(name, registry) {
  try {
    const local = await readFile(
      new URL(`../../packages/${name}/CHANGELOG.md`, import.meta.url),
      "utf8",
    );
    console.log(`${name}: ../packages (local checkout)`);
    return local;
  } catch {
    // Built outside the monorepo. Fall back to npm.
  }

  const tarball = registry?.versions?.[registry?.["dist-tags"]?.latest]?.dist?.tarball;
  if (!tarball) {
    console.warn(`${name}: no tarball listed on npm — leaving the committed changelog alone`);
    return null;
  }

  try {
    const response = await fetch(tarball);
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const changelog = fileFromTarball(Buffer.from(await response.arrayBuffer()), "package/CHANGELOG.md");
    if (changelog) {
      console.log(`${name}: npm tarball`);
      return changelog;
    }
    console.warn(`${name}: the tarball ships no CHANGELOG.md — leaving the committed page alone`);
  } catch (error) {
    console.warn(`${name}: could not read the tarball (${error.message}) — leaving the committed page alone`);
  }
  return null;
}

/**
 * Only the release dates and the current version come from npm. Losing them costs a date on each
 * heading, which is not worth failing a local run over — offline, the page still regenerates.
 */
async function readRegistry(name) {
  try {
    return await get(`https://registry.npmjs.org/${name}`, 'json');
  } catch (error) {
    console.warn(`${name}: npm registry unavailable (${error.message}) — dates omitted`);
    return null;
  }
}

/**
 * Changesets emits `- <sha>: <text>` with any further bullets indented under it, and plain
 * `- <text>` when the changeset carried no sha. A changeset whose body is itself a list comes out
 * of the second shape as `- - <text>`, which renders as an empty bullet wrapping the real one.
 */
const stripCommitPrefix = (line) =>
  line.replace(/^- [0-9a-f]{7,40}: (?:- )?/, '- ').replace(/^- - /, '- ');
const dedent = (line) => (line.startsWith('  - ') ? line.slice(2) : line);

/**
 * Early changesets wrote their own `## ✨ Features` category headings inside the body. Left alone
 * those come out as a heading nested in a list item, at the same level as the version heading above
 * it, and fumadocs puts them in the page's table of contents as if they were releases. They still
 * carry real information (`⚠️ Breaking Changes` is not noise), so they become a bold label with a
 * blank line either side rather than being dropped.
 */
const HEADING_IN_BODY = /^\s*(?:- )?#{1,6}\s+(.+?)\s*$/;
function promoteHeadings(lines) {
  const out = [];
  let fenced = false;
  for (const line of lines) {
    if (/^\s*```/.test(line)) fenced = !fenced;
    const heading = fenced ? null : line.match(HEADING_IN_BODY);
    if (!heading) {
      out.push(line);
      continue;
    }
    if (out.at(-1)?.trim() !== '') out.push('');
    out.push(`**${heading[1]}**`, '');
  }
  // The source often left its own blank line under the heading, which would now be a second one.
  return out.filter((line, i) => line.trim() !== '' || out[i - 1]?.trim() !== '');
}

function parse(markdown) {
  const releases = [];
  let current = null;
  for (const raw of markdown.split('\n')) {
    const version = raw.match(/^## (\d+\.\d+\.\d+.*)$/);
    if (version) {
      current = { version: version[1].trim(), sections: [] };
      releases.push(current);
      continue;
    }
    if (!current) continue; // the file's own H1
    const section = raw.match(/^### (Major|Minor|Patch) Changes$/);
    if (section) {
      current.sections.push({ bump: section[1], lines: [] });
      continue;
    }
    const open = current.sections.at(-1);
    if (open) open.lines.push(dedent(stripCommitPrefix(raw)));
  }
  for (const release of releases) {
    for (const section of release.sections) section.lines = promoteHeadings(section.lines);
  }
  return releases;
}

/**
 * A version that never reached npm but sits below one that did will never be published: the
 * release above it went out and carried its changes. Left alone it shows as "Not yet published"
 * forever. So its sections move into the nearest published release above it, which is the one a
 * user actually installs to get them. Only unpublished versions above every published one stay
 * pending. Without `dates` (npm unreachable) nothing is known, so nothing moves.
 */
function foldSkipped(releases, dates) {
  if (!dates) return releases;
  const out = [];
  for (const release of releases) {
    const carrier = out.findLast((r) => dates[r.version]);
    if (dates[release.version] || !carrier) {
      out.push(release);
      continue;
    }
    for (const section of release.sections) {
      const same = carrier.sections.find((s) => s.bump === section.bump);
      if (same) same.lines.push(...section.lines);
      else carrier.sections.push(section);
    }
  }
  return out;
}

async function sync({ name, slug }) {
  // The registry doc has to come first: it is where the tarball URL lives.
  const registry = await readRegistry(name);
  const markdown = await readChangelog(name, registry);

  // `null` means we could not reach npm, which is not the same as a version being absent from it —
  // saying "not yet published" because the network was down would put a false claim on the page.
  const known = registry !== null;
  const dates = registry?.time ?? {};
  const fmtDate = (v) =>
    dates[v]
      ? new Date(dates[v]).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : null;

  const latest = registry?.['dist-tags']?.latest;

  // Nothing to regenerate from. The page on disk is committed, so it stays as it was rather than
  // being emptied, and the version still reaches releases.generated.ts if npm answered.
  if (markdown === null) {
    return { slug, latest, date: latest ? fmtDate(latest) : null };
  }

  const releases = foldSkipped(parse(markdown), known ? dates : null);

  const body = releases
    .map((r) => {
      const date = fmtDate(r.version);
      const bumps = r.sections.map((s) => s.bump.toLowerCase());
      // A version can be in CHANGELOG.md before it reaches npm: `changeset version` writes the
      // entry, `changeset publish` does the publishing. Until then there is no date and no page to
      // link to, so say that rather than linking somewhere that 404s.
      const published = Boolean(dates[r.version]);
      // A release can carry more than one kind of change. The badge shows the largest, which is the
      // one that decides the version bump, so it cannot disagree with the number in the heading.
      const rank = { major: 3, minor: 2, patch: 1 };
      const bump = bumps.sort((a, b) => rank[b] - rank[a])[0] ?? null;
      // Three states, not two. `pending` is only truthful when npm answered and did not list the
      // version; when npm was unreachable we know nothing, so neither attribute is written.
      const attrs = [
        published ? `date="${date}"` : known ? 'pending' : '',
        bump ? `bump="${bump}"` : '',
        published ? `npm="https://www.npmjs.com/package/${name}/v/${r.version}"` : '',
      ]
        .filter(Boolean)
        .join(' ');

      // The bump is already on the meta line; repeating it as a heading only adds noise when a
      // release has one kind of change, which nearly all of them do.
      const showHeadings = r.sections.length > 1;
      const sections = r.sections
        .map((s) => {
          const text = s.lines.join('\n').trim();
          return showHeadings ? `### ${s.bump} changes\n\n${text}` : text;
        })
        .join('\n\n');

      return `## ${r.version}\n\n<ReleaseMeta ${attrs} />\n\n${sections}`;
    })
    .join('\n\n');

  const page = `---
title: Changelog
description: Every published release of ${name}, newest first.
---

{/* Generated by scripts/sync-changelog.mjs from the package's CHANGELOG.md — do not edit by hand. */}

Every published release, newest first.${latest ? ` The current version is **${latest}**.` : ''}

${body}
`;

  await writeFile(new URL(`../content/docs/${slug}/changelog.mdx`, import.meta.url), page);
  console.log(
    `  wrote ${releases.length} releases to content/docs/${slug}/changelog.mdx` +
      (latest ? ` (latest ${latest})` : ''),
  );

  return { slug, latest, date: latest ? fmtDate(latest) : null };
}

const results = await Promise.all(PACKAGES.map(sync));

// The pages that advertise a current version read it from here, so a badge cannot drift from the
// changelog it links to — both come out of the same sync. A package npm could not answer for is left
// out rather than written with a hole in it, and the file is only rewritten if at least one answered:
// without that, a run made offline would wipe every version the site knows.
const found = results.filter((r) => r.latest);
if (found.length === 0) {
  console.warn('no versions from npm — leaving releases.generated.ts untouched');
} else {
  if (found.length < results.length) {
    const missing = results.filter((r) => !r.latest).map((r) => r.slug);
    console.warn(`no version from npm for ${missing.join(', ')} — omitted from releases.generated.ts`);
  }
  await writeFile(
    OUT_DATA,
    `// Generated by scripts/sync-changelog.mjs — do not edit by hand.
export const releases: Record<string, { version: string; date: string }> = {
${found.map((r) => `  '${r.slug}': { version: '${r.latest}', date: '${r.date}' },`).join('\n')}
};
`,
  );
}
