// Copy lives in assets/content.json so the page's words can change without touching markup.
// ponytail: JSON import attributes need Chrome 123+ / Safari 17.2+ / Firefox 139+. Swap for a
// fetch() if an older browser ever has to render this.
import content from "/assets/content.json" with { type: "json" };

// Inline sprite rather than an icon package: this page has no build step, and a handful of glyphs
// is not worth a dependency. It is injected from here instead of sitting in the markup because
// external `<use href="file.svg#id">` still isn't supported everywhere — the symbols have to be in
// the same document.
const ICONS = {
  "arrow-right": '<path d="M5 12h14M13 6l6 6-6 6" />',
  "arrow-up-right": '<path d="M7 17 17 7M17 17V7H7" />',
  box: '<path d="M21 8v8a2 2 0 0 1-1 1.73l-7 4a2 2 0 0 1-2 0l-7-4A2 2 0 0 1 3 16V8a2 2 0 0 1 1-1.73l7-4a2 2 0 0 1 2 0l7 4A2 2 0 0 1 21 8Z" /><path d="m3.3 7 8.7 5 8.7-5M12 22V12" />',
  target:
    '<circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" />',
  feather:
    '<path d="M20.2 3.8a5.5 5.5 0 0 0-7.8 0L4 12.2V20h7.8l8.4-8.4a5.5 5.5 0 0 0 0-7.8ZM16 8 4 20M15 9h-5" />',
  layers: '<path d="m12 2 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 17l9 5 9-5" />',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />',
  code: '<path d="m9 18-6-6 6-6M15 6l6 6-6 6" />',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />',
  check: '<path d="m4 12.5 5.5 5.5L20 7" />',
  "chevron-down": '<path d="m6 9 6 6 6-6" />',
  menu: '<path d="M3 6h18M3 12h18M3 18h18" />',
  close: '<path d="M6 6l12 12M18 6 6 18" />',
  star: '<path d="m12 3 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3.1-5.8 3.1 1.1-6.5L2.6 9.8l6.5-.9L12 3Z" />',
  github:
    '<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.9a3.4 3.4 0 0 0-1-2.6c3.1-.3 6.4-1.5 6.4-7A5.4 5.4 0 0 0 20 4.8a5 5 0 0 0-.1-3.7s-1.2-.4-4 1.5a13.4 13.4 0 0 0-7 0C6.1.7 4.9 1.1 4.9 1.1a5 5 0 0 0-.1 3.7 5.4 5.4 0 0 0-1.4 3.7c0 5.5 3.3 6.7 6.4 7a3.4 3.4 0 0 0-1 2.6V22" />',
  facebook: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3V2Z" />',
  youtube: '<rect x="2" y="5" width="20" height="14" rx="4" /><path d="m10 9 5 3-5 3V9Z" />',
};

document.body.insertAdjacentHTML(
  "afterbegin",
  `<svg class="sprite" aria-hidden="true">${Object.entries(ICONS)
    .map(([name, path]) => `<symbol id="i-${name}" viewBox="0 0 24 24">${path}</symbol>`)
    .join("")}</svg>`,
);
const { brand, nav, hero, stats, packages, usage, principles, showcase, footer } = content;

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// Extra classes append to `icon` rather than replacing it — the base class is what supplies
// stroke/fill, so dropping it renders the path as a filled blob.
const icon = (name, extra = "") =>
  `<svg class="icon${extra ? ` ${extra}` : ""}" aria-hidden="true"><use href="#i-${name}" /></svg>`;
const ext = (href) =>
  /^https?:/.test(href) ? ' target="_blank" rel="noreferrer noopener"' : "";
const link = ({ label, href }) =>
  `<a href="${esc(href)}"${ext(href)}>${esc(label)}</a>`;

// One pass over the source, so a replacement can never be re-matched by a later rule.
const highlight = (src) =>
  esc(src).replace(
    /(\/\/[^\n]*)|('[^']*'|"[^"]*"|`[^`]*`)|\b(import|from|export|const|let|return|async|await|true|false)\b|([A-Za-z_$][\w$]*)(?=\()/g,
    (_m, com, str, kw, fn) =>
      com
        ? `<i class="c-com">${com}</i>`
        : str
          ? `<i class="c-str">${str}</i>`
          : kw
            ? `<i class="c-kw">${kw}</i>`
            : `<i class="c-fn">${fn}</i>`,
  );

const copyBtn = (text) =>
  `<button class="copy" type="button" data-copy="${esc(text)}" aria-label="Copy to clipboard">${icon("copy")}</button>`;

// The art is transparent, so the mark has to follow the theme: its neutral stroke is #32373f,
// which sits at 1.67:1 on the dark page and would all but vanish. Same <picture> swap the
// screenshot uses.
const brandMark = (size) =>
  `<picture>
    <source srcset="${esc(brand.logoDark)}" media="(prefers-color-scheme: dark)" />
    <img src="${esc(brand.logo)}" alt="" width="${size}" height="${size}" />
  </picture>`;

// A top-level item is either a plain link or a mega-menu, decided by whether it has `menu`.
const navItem = (item, i) =>
  item.menu
    ? `<div class="nav__item" data-menu>
        <button class="nav__link" type="button" id="nav-t${i}" aria-expanded="false" aria-controls="nav-p${i}">
          ${esc(item.label)}${icon("chevron-down", "chev")}
        </button>
        <div class="nav__panel" id="nav-p${i}" role="group" aria-labelledby="nav-t${i}" hidden>
          ${item.menu
            .map(
              (group) => `<div class="nav__group">
                <h3>${esc(group.title)}</h3>
                ${group.items
                  .map(
                    (entry) => `<a class="nav__entry" href="${esc(entry.href)}"${ext(entry.href)}>
                      ${esc(entry.label)}${entry.external ? icon("arrow-up-right", "nav__ext") : ""}${
                      entry.npm
                        ? `<span class="nav__badge" data-npm="${esc(entry.npm)}" hidden></span>`
                        : ""
                    }
                      ${entry.description ? `<small>${esc(entry.description)}</small>` : ""}
                    </a>`,
                  )
                  .join("")}
              </div>`,
            )
            .join("")}
        </div>
      </div>`
    : `<a class="nav__link" href="${esc(item.href)}"${ext(item.href)}>${esc(item.label)}${
        item.external ? icon("arrow-up-right", "nav__ext") : ""
      }</a>`;

document.getElementById("nav").innerHTML = `
  <a class="nav__brand" href="${esc(brand.url)}">
    ${brandMark(26)}${esc(brand.name)}
  </a>
  <div class="nav__menu" id="nav-menu">${nav.links.map(navItem).join("")}</div>
  <div class="nav__end">
    <a class="nav__star" href="${esc(nav.github.href)}" target="_blank" rel="noreferrer noopener"
       aria-label="${esc(nav.github.label)} ${esc(nav.github.repo)} on GitHub">
      ${icon("github")}<span class="nav__stars" id="nav-stars-wrap" hidden
        ><span class="nav__count" id="nav-stars"></span>${icon("star", "nav__star-icon")}</span
      >
    </a>
    <button class="nav__burger" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="nav-menu">
      ${icon("menu")}
    </button>
  </div>`;

document.getElementById("main").innerHTML = `
  <header class="hero">
    <div class="container">
      <p class="eyebrow" style="margin:0"><span class="dot"></span>${esc(hero.eyebrow)}</p>
      <h1>${esc(hero.title)} <span class="accent">${esc(hero.titleAccent)}</span></h1>
      <p class="hero__lead">${esc(hero.lead)}</p>
      <div class="hero__actions">
        ${hero.actions
          .map(
            (a) =>
              `<a class="btn${a.variant === "outline" ? " btn--outline" : ""}" href="${esc(a.href)}"${ext(a.href)}>${esc(a.label)}${icon(a.icon)}</a>`,
          )
          .join("")}
      </div>
      <div class="install">
        <span class="prompt">$</span><code>${esc(hero.install)}</code>${copyBtn(hero.install)}
      </div>
      <ul class="stats" style="list-style:none;padding:0">
        ${stats.map((s) => `<li><b>${esc(s.value)}</b><span>${esc(s.label)}</span></li>`).join("")}
      </ul>
    </div>
  </header>

  <section class="section section--tint">
    <div class="container">
      <div class="measure">
        <h2>${esc(packages.title)}</h2>
        <p class="section__body">${esc(packages.body)}</p>
      </div>
      <div class="pkgs">
        ${packages.items
          .map(
            (p) => `
          <a class="card pkg" href="${esc(p.href)}"${ext(p.href)}>
            <div class="pkg__head">
              ${icon("box")}<span class="pkg__name">${esc(p.name)}</span>
              ${
                      p.npm ? `<span class="pkg__version" data-npm="${esc(p.npm)}" hidden></span>` : ""
                    }
            </div>
            <p>${esc(p.description)}</p>
            ${p.tags?.length ? `<div class="pkg__tags">${p.tags.map((t) => `<span>${esc(t)}</span>`).join("")}</div>` : ""}
          </a>`,
          )
          .join("")}
      </div>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="measure">
        <h2>${esc(usage.title)}</h2>
        <p class="section__body">${esc(usage.body)}</p>
      </div>
      <div class="code">
        <div class="code__bar">
          ${icon("code")}<span class="code__file">${esc(usage.filename)}</span>${copyBtn(usage.code)}
        </div>
        <pre><code>${highlight(usage.code)}</code></pre>
      </div>
      ${usage.note ? `<p class="code__note">${esc(usage.note)}</p>` : ""}
    </div>
  </section>

  <section class="section section--tint">
    <div class="container">
      <div class="measure">
        <h2>${esc(principles.title)}</h2>
        <p class="section__body">${esc(principles.body)}</p>
      </div>
      <div class="grid">
        ${principles.items
          .map(
            (p) =>
              `<div class="card">${icon(p.icon)}<strong>${esc(p.title)}</strong><p>${esc(p.body)}</p></div>`,
          )
          .join("")}
      </div>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="measure">
        <h2>${esc(showcase.title)}</h2>
        <p class="section__body">${esc(showcase.body)}</p>
      </div>
      <figure class="shot">
        <picture>
          <source srcset="${esc(showcase.imageDark)}" media="(prefers-color-scheme: dark)" />
          <img src="${esc(showcase.imageLight)}" alt="${esc(showcase.alt)}"
               width="${esc(showcase.width)}" height="${esc(showcase.height)}" />
        </picture>
        <figcaption>${esc(showcase.caption)}</figcaption>
      </figure>
    </div>
  </section>`;

document.getElementById("footer").innerHTML = `
  <div class="footer__grid">
    <div>
      <div class="footer__brand">
        ${brandMark(24)}${esc(brand.name)}
      </div>
      <p class="footer__blurb">${esc(footer.blurb)}</p>
    </div>
    ${footer.columns
      .map(
        (c) =>
          `<div class="footer__col"><h3>${esc(c.title)}</h3>${c.links.map(link).join("")}</div>`,
      )
      .join("")}
  </div>
  <div class="footer__legal">${esc(footer.legal)}</div>`;

document.title = `${brand.name} Open Source — ${hero.title} ${hero.titleAccent}`;
document.body.dataset.ready = "";

document.addEventListener("click", async (event) => {
  const button = event.target.closest(".copy");
  if (!button) return;
  try {
    await navigator.clipboard.writeText(button.dataset.copy);
  } catch {
    return; // No clipboard permission (or no https) — leave the button alone.
  }
  button.dataset.copied = "";
  button.innerHTML = `<svg class="icon" aria-hidden="true"><use href="#i-check" /></svg>`;
  setTimeout(() => {
    delete button.dataset.copied;
    button.innerHTML = `<svg class="icon" aria-hidden="true"><use href="#i-copy" /></svg>`;
  }, 1500);
});

/* ---------- header behaviour ---------- */

const navEl = document.querySelector(".nav");
const burger = navEl.querySelector(".nav__burger");
const triggers = [...navEl.querySelectorAll("[data-menu] > .nav__link")];
const desktop = matchMedia("(min-width: 901px)");

const setMenu = (trigger, open) => {
  trigger.setAttribute("aria-expanded", String(open));
  document.getElementById(trigger.getAttribute("aria-controls")).hidden = !open;
};
const closeMenus = (keep) => {
  for (const t of triggers) if (t !== keep) setMenu(t, false);
};
const setDrawer = (open) => {
  burger.setAttribute("aria-expanded", String(open));
  burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  burger.innerHTML = icon(open ? "close" : "menu");
  document.body.toggleAttribute("data-nav-open", open);
};

navEl.addEventListener("click", (event) => {
  const trigger = event.target.closest("[data-menu] > .nav__link");
  if (!trigger) return;
  const open = trigger.getAttribute("aria-expanded") === "false";
  closeMenus(trigger);
  setMenu(trigger, open);
});

// Desktop opens on hover the way expo.dev's does; in the drawer the same panels are accordions,
// so the click handler above is the only thing driving them on a phone.
navEl.addEventListener("pointerover", (event) => {
  if (!desktop.matches || event.pointerType === "touch") return;
  const trigger = event.target.closest("[data-menu]")?.querySelector(".nav__link");
  closeMenus(trigger);
  if (trigger) setMenu(trigger, true);
});
navEl.addEventListener("pointerleave", () => {
  if (desktop.matches) closeMenus();
});

burger.addEventListener("click", () =>
  setDrawer(burger.getAttribute("aria-expanded") === "false"),
);
// Crossing the breakpoint with the drawer open would strand the body scroll lock.
desktop.addEventListener("change", () => {
  setDrawer(false);
  closeMenus();
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".nav")) closeMenus();
});
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  closeMenus();
  setDrawer(false);
});

const markScrolled = () => {
  navEl.dataset.scrolled = String(scrollY > 4);
};
addEventListener("scroll", markScrolled, { passive: true });
markScrolled();

// Live star count, like theirs. Unauthenticated GitHub API is rate-limited per IP, so a miss just
// leaves the chip as a plain "Star" link rather than showing a stale or wrong number.
fetch(`https://api.github.com/repos/${nav.github.repo}`)
  .then((response) => (response.ok ? response.json() : null))
  .then((repo) => {
    const count = repo?.stargazers_count;
    if (!count) return;
    document.getElementById("nav-stars").textContent =
      count >= 1000 ? `${(count / 1000).toFixed(1).replace(/\.0$/, "")}K` : count;
    document.getElementById("nav-stars-wrap").hidden = false;
  })
  .catch(() => {});

// Version badges come only from the npm registry, which is CORS-open. `/latest` is ~3KB against
// ~98KB for a package's full metadata doc, so never fetch the latter just to read one field.
// Nothing is hardcoded, so a chip stays hidden until it has a real version — an empty pill is
// worse than no pill, and a stale number is worse than both.
const versionTargets = new Map();
for (const el of document.querySelectorAll("[data-npm]")) {
  const targets = versionTargets.get(el.dataset.npm) ?? [];
  targets.push(el);
  versionTargets.set(el.dataset.npm, targets);
}
for (const [pkg, targets] of versionTargets) {
  fetch(`https://registry.npmjs.org/${pkg.replace("/", "%2f")}/latest`)
    .then((response) => (response.ok ? response.json() : null))
    .then((manifest) => {
      if (!manifest?.version) return;
      for (const el of targets) {
        el.textContent = `v${manifest.version}`;
        el.hidden = false;
      }
    })
    .catch(() => {});
}
