// Discovers every published @axonpack package from npm and writes src/generated/packages.json.
//
// Nothing here is hand-listed: publish a package and the next build picks it up; unpublish one and
// it disappears. That also enforces the repo rule that only shipped packages appear on the site,
// because npm is the only source consulted.
//
// Two sources are unioned on purpose:
//   * search?text=@axonpack   carries description/keywords/date, but its index lags a fresh publish
//   * /-/org/axonpack/package is immediate, but lists everything the account can write, so it needs
//                               filtering to the scope
// GitHub's contents API is deliberately NOT used: it reflects the default branch, so a package
// merged but unpublished would appear, and one published from a branch would not.
//
// No dependencies. Node 20+ has fetch.

import { access, mkdir, readFile, writeFile } from "node:fs/promises";

const SCOPE = "@axonpack/";

const json = async (url, init) => {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
};
const encode = (name) => name.replace("/", "%2f");

// --- releases, parsed out of each library's Changesets CHANGELOG.md ------------------------------
//
// Changesets writes a stable shape: "## <version>" per release, then "### Patch|Minor|Major
// Changes", then bullets. That is regular enough to parse without a markdown dependency, and the
// changelog is the only place the release prose exists. npm carries versions and dates but no
// notes, so the two get joined below.

// Served straight out of the published npm tarball, pinned to the exact version, not from the
// GitHub repo. That is both npm-only and more correct: it is the changelog that actually shipped,
// rather than whatever the default branch happens to hold. It also works for a package published
// from a branch, which the repo route could not see at all.
const NPM_FILES = "https://cdn.jsdelivr.net/npm";

const parseChangelog = (markdown) => {
  const releases = [];
  // Split on version headings, keeping the version captured.
  const sections = markdown.split(/^## +(?=\d)/m).slice(1);
  for (const section of sections) {
    const [heading, ...rest] = section.split("\n");
    const version = heading.trim();
    const body = rest.join("\n");
    const bump = body.match(/^### +(Major|Minor|Patch) Changes/m)?.[1]?.toLowerCase() ?? null;
    // Bullets are written at two indent levels by Changesets; take the text of each.
    const items = [...body.matchAll(/^\s*-\s+(.*(?:\n(?!\s*-|###|##)\s+.*)*)/gm)]
      .map((match) => match[1].replace(/\s*\n\s+/g, " ").replace(/^(?:-\s+)+/, "").trim())
      .filter((text) => text.length > 0);
    if (version) releases.push({ version, bump, items });
  }
  return releases;
};

const fetchReleases = async (name, version, publishedAt) => {
  const res = await fetch(`${NPM_FILES}/${name}@${version}/CHANGELOG.md`);
  if (!res.ok) {
    // A package that ships no CHANGELOG.md in its `files` simply contributes no blog entries.
    console.warn(`  ! ${name}: no CHANGELOG.md in the published tarball (${res.status})`);
    return [];
  }
  return parseChangelog(await res.text()).map((release) => ({
    ...release,
    date: publishedAt[release.version] ?? null,
  }));
};

const names = new Set();

try {
  const found = await json("https://registry.npmjs.org/-/v1/search?text=%40axonpack&size=250");
  for (const { package: p } of found.objects) if (p.name.startsWith(SCOPE)) names.add(p.name);
  console.log(`  search:   ${names.size} in scope (of ${found.total})`);
} catch (error) {
  console.warn(`! search failed: ${error.message}`);
}

try {
  const owned = await json("https://registry.npmjs.org/-/org/axonpack/package");
  const before = names.size;
  for (const name of Object.keys(owned)) if (name.startsWith(SCOPE)) names.add(name);
  console.log(`  org list: +${names.size - before} the search index had not caught up on`);
} catch (error) {
  console.warn(`! org listing failed: ${error.message}`);
}

if (names.size === 0) {
  // Better to fail the build than publish a page whose library grid is silently empty.
  throw new Error("no @axonpack packages found, refusing to build an empty catalogue");
}

const exists = async (relative) => {
  try {
    await access(new URL(relative, import.meta.url));
    return true;
  } catch {
    return false;
  }
};

const DAY = 86_400_000;
/**
 * 500, not 549. npm serves at most ~18 months of history and says nothing when it truncates: ask it
 * for everything since 2022 and it answers for the last year and a half with a `start` you have to
 * read to notice. 500 leaves room rather than sitting on the edge of a limit nobody documents.
 */
const CHUNK_DAYS = 500;
const iso = (date) => date.toISOString().slice(0, 10);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Every download since the package was published.
 *
 * The silent truncation above is the whole reason this is a loop. Measured against
 * `@tanstack/react-query`, one request for all of time answers 2.00bn and the chunked walk answers
 * 2.33bn, so the naive version drops 330m downloads and looks perfectly plausible doing it.
 *
 * The range endpoint rather than the point one: it returns a day at a time, so the total is a sum of
 * values that can be inspected instead of a single number to take on trust. Requests go one at a
 * time with a pause between, because this runs once per package on every build and npm's API is
 * free.
 *
 * Credit: https://tanstack.com/blog/npm-stats-the-right-way
 */
async function countDownloads(name, publishedAt) {
  const stamps = Object.entries(publishedAt)
    .filter(([key]) => key !== "modified")
    .map(([, value]) => new Date(value).getTime())
    .filter((time) => Number.isFinite(time));
  if (stamps.length === 0) return null;

  let from = new Date(Math.min(...stamps));
  const today = new Date();
  let total = 0;
  let answered = false;

  while (from <= today) {
    const to = new Date(Math.min(from.getTime() + CHUNK_DAYS * DAY, today.getTime()));
    const url = `https://api.npmjs.org/downloads/range/${iso(from)}:${iso(to)}/${encode(name)}`;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const window = await json(url);
        total += (window.downloads ?? []).reduce((sum, day) => sum + day.downloads, 0);
        answered = true;
        break;
      } catch {
        // A window before npm began counting is a legitimate miss, not a failure, so the last
        // attempt gives up quietly. Anything earlier waits and tries again, since a rate limit and
        // an empty range look identical from here.
        if (attempt < 2) await sleep(500 * (attempt + 1));
      }
    }

    from = new Date(to.getTime() + DAY);
    if (from <= today) await sleep(200);
  }

  return answered ? total : null;
}

// --- repository stars ---------------------------------------------------------------------------
//
// Read at build time like everything else here, so the page ships as static HTML and no visitor
// pays for a request to GitHub. It goes stale between builds, which the nightly deploy keeps short.
//
// Never fatal. GitHub allows 60 unauthenticated calls an hour per IP and Actions runners share
// addresses, so a rate limit here is normal rather than exceptional. A missing count hides the
// number; it must not take the build down, because the build is also the deploy.
const fetchStars = async (repo) => {
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}`, {
      headers: {
        Accept: "application/vnd.github+json",
        // Actions sets this. It lifts the limit to 1,000 an hour and is not needed locally.
        ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
      },
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return (await res.json()).stargazers_count ?? null;
  } catch (error) {
    console.warn(`  stars unavailable for ${repo}: ${error.message}`);
    return null;
  }
};

// The repo name lives in content.json already, so the count follows whatever that names rather than
// being pinned again here.
const content = JSON.parse(
  await readFile(new URL("../src/content.json", import.meta.url), "utf8"),
);
const repo = { name: content.nav.github.repo, stars: await fetchStars(content.nav.github.repo) };
console.log(`  ${repo.name} -> ${repo.stars ?? "?"} stars`);

const packages = [];
for (const name of [...names].sort()) {
  const manifest = await json(`https://registry.npmjs.org/${encode(name)}/latest`);
  const slug = name.slice(SCOPE.length);

  // The registry's full document is the only place per-version publish times live; the changelog
  // has notes but no dates, so the two are joined here. It also gives the first publish, which is
  // where the download count has to start from.
  let publishedAt = {};
  try {
    publishedAt = (await json(`https://registry.npmjs.org/${encode(name)}`)).time ?? {};
  } catch {
    // Dates are decoration; releases still render without them.
  }

  const totalDownloads = await countDownloads(name, publishedAt);
  const releases = await fetchReleases(name, manifest.version, publishedAt);

  packages.push({
    name,
    slug,
    releases,
    publishedAt: publishedAt[manifest.version] ?? null,
    version: manifest.version,
    description: manifest.description ?? "",
    keywords: manifest.keywords ?? [],
    license: manifest.license ?? null,
    totalDownloads,
    // Flat, derived from the package name. This is the same shape /docs/expo-devtools/ already uses, so a
    // new package needs no routing entry anywhere.
    docsHref: `/docs/${slug}/`,
    npmHref: `https://www.npmjs.com/package/${name}`,
    // Publishing to npm puts a package in this catalogue, but writing its docs is a separate job.
    // Until those pages exist every /docs/<slug>/ link 404s, so anything that links there has to
    // check first rather than assume the two happen together.
    hasDocs: await exists(`../content/docs/${slug}`),
    hasChangelog: await exists(`../content/docs/${slug}/changelog.mdx`),
  });
  console.log(`  ${name} -> v${manifest.version}  /docs/${slug}/  ${releases.length} releases`);
}


await mkdir(new URL("../src/generated/", import.meta.url), { recursive: true });
await writeFile(
  new URL("../src/generated/packages.json", import.meta.url),
  JSON.stringify({ builtAt: new Date().toISOString(), repo, packages }, null, 2) + "\n",
);
console.log(`wrote src/generated/packages.json (${packages.length} packages)`);
