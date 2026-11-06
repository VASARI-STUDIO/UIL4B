// HTML brand book builder. The theme supplies the section markup (brandBook) and the site CSS (bookCss);
// the engine owns the shell (skip link, section nav, menu, light/dark switch), the shared behaviour
// (copy, type tester, switch, menu), embedded fonts and the download map.
import { esc } from './brand.js';
import { fontFaceCss, tokensCss } from './tokens.js';
import { componentsCss } from './components.js';
import { chromeFaces } from './doc.js';
import { finishText } from './placeholders.js';
import { logoFileName, kitListing } from './files.js';

export const BOOK_SECTIONS = [
  { id: 'overview', title: 'Overview' }, { id: 'voice', title: 'Voice' }, { id: 'logo', title: 'Logo' }, { id: 'colour', title: 'Colour' },
  { id: 'typography', title: 'Typography' }, { id: 'imagery', title: 'Imagery' }, { id: 'layout', title: 'Layout' },
  { id: 'applications', title: 'Applications' }, { id: 'downloads', title: 'Downloads' },
];
// the widths the theme CSS switches at: rules for narrow screens sit in @media (max-width:840px), wide ones in (min-width:841px)
export const BOOK_BREAK = 840;

export const fmtSize = (n) => (n < 1024 ? `${n} B` : n < 1048576 ? `${Math.round(n / 1024)} KB` : `${(n / 1048576).toFixed(1)} MB`);
const enc = (rel) => rel.split('/').map(encodeURIComponent).join('/');

// ---- download map: what the brand kit holds, as relative links from index.html ----
const posixName = (rel) => rel.split('/').pop();
const posixExt = (rel) => { const n = posixName(rel), i = n.lastIndexOf('.'); return i > 0 ? n.slice(i) : ''; };

// ctx.book for the theme. listing is [{ rel, size }] for the kit's files (kitListing in files.js), zip is { name, size };
// every link and size is read from the listing.
export function bookData(ctx, listing, zip, base = 'assets/') {
  const kitBase = base + 'brand-kit/';
  const mk = (f) => ({ rel: f.rel, name: posixName(f.rel), ext: posixExt(f.rel).slice(1).toUpperCase(), size: f.size, sizeText: fmtSize(f.size), href: kitBase + enc(f.rel) });
  const all = listing.map(mk);
  const under = (prefix) => all.filter((f) => f.rel.startsWith(prefix));
  const find = (rel) => all.find((f) => f.rel === rel);
  const slug = ctx.slug;
  return {
    zip: { name: zip.name, href: base + enc(zip.name), size: zip.size, sizeText: fmtSize(zip.size) },
    kitBase, all, under, find,
    photosBase: kitBase + '05%20Imagery/photos/',
    // one logo version: svg, png at each width, pdf (showcase). The slot edition has the slot frame file only.
    logo(id) {
      if (ctx.edition === 'slot') return null;
      const n = `${slug}-${logoFileName(id)}`;
      return { svg: find(`01 Logo/svg/${n}.svg`), png: [512, 1024, 2048].map((w) => ({ w, ...find(`01 Logo/png/${n}-${w}.png`) })), pdf: find(`01 Logo/pdf/${n}.pdf`) };
    },
    readmePdf: find('00 Read me.pdf'), readme: find('README.md'),
    colour: under('02 Colour/'), type: under('03 Type/'), icons: under('04 Icons/svg/'), iconsLicence: find('04 Icons/LICENSE.txt'),
    imagery: under('05 Imagery/'), logoFiles: under('01 Logo/'),
  };
}

// ---- the client script: shared behaviour. No dependencies, no network. ----
const CLIENT_JS = `(function () {
  var root = document.documentElement;
  var live = document.getElementById('bk-live');
  var timer, liveTimer;
  function announce(msg) {
    if (!live) return;
    live.textContent = '';
    window.setTimeout(function () { live.textContent = msg; live.classList.add('is-on'); }, 30);
    window.clearTimeout(liveTimer);
    liveTimer = window.setTimeout(function () { live.classList.remove('is-on'); live.textContent = ''; }, 2600);
  }
  // copy
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return fallback(text); });
    }
    return Promise.resolve(fallback(text));
  }
  function fallback(text) {
    var t = document.createElement('textarea');
    t.value = text; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.top = '0'; t.style.left = '-9999px';
    document.body.appendChild(t); t.select();
    var ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(t); return ok;
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-copy]') : null;
    if (!b) return;
    var what = b.getAttribute('data-copy-label') || b.getAttribute('data-copy');
    copyText(b.getAttribute('data-copy')).then(function (ok) {
      if (!ok) { announce('Could not copy. Select the text and copy it by hand.'); return; }
      announce('Copied ' + what);
      var t = b.querySelector('.bk-btn__t');
      if (t) {
        if (!b.hasAttribute('data-was')) b.setAttribute('data-was', t.textContent);
        t.textContent = 'Copied'; b.classList.add('is-copied');
        window.clearTimeout(b._timer);
        b._timer = window.setTimeout(function () { t.textContent = b.getAttribute('data-was'); b.classList.remove('is-copied'); b.removeAttribute('data-was'); }, 1600);
      }
    });
  });
  // light and dark: first load follows the system, the switch overrides it
  var chosen = false;
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function setMode(m, fromUser) {
    if (fromUser) chosen = true;
    root.setAttribute('data-theme', m);
    var bs = document.querySelectorAll('[data-mode]');
    for (var i = 0; i < bs.length; i++) bs[i].setAttribute('aria-pressed', String(bs[i].getAttribute('data-mode') === m));
  }
  setMode(root.getAttribute('data-theme') || 'light', false);
  var sw = document.querySelectorAll('[data-mode]');
  for (var i = 0; i < sw.length; i++) sw[i].addEventListener('click', function (e) { setMode(e.currentTarget.getAttribute('data-mode'), true); });
  if (mq && mq.addEventListener) mq.addEventListener('change', function (e) { if (!chosen) setMode(e.matches ? 'dark' : 'light', false); });
  // menu (narrow screens): a disclosure that closes on Escape, on a link, and when focus leaves it
  var head = document.querySelector('.bk-top'), btn = document.getElementById('bk-menu-btn'), nav = document.getElementById('bk-nav');
  function menu(open, focusBtn) {
    if (!btn) return;
    btn.setAttribute('aria-expanded', String(open)); head.setAttribute('data-open', String(open));
    if (!open && focusBtn) btn.focus();
  }
  if (btn) {
    btn.addEventListener('click', function () { menu(btn.getAttribute('aria-expanded') !== 'true'); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') { e.preventDefault(); menu(false, true); } });
    // choosing a section closes the menu; the link is hidden then, so focus goes to the section heading (after the browser has scrolled)
    nav.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a') : null; if (!a) return;
      var wasOpen = btn.getAttribute('aria-expanded') === 'true';
      menu(false);
      if (!wasOpen) return;
      var s = document.getElementById(a.getAttribute('data-sec')), h = s && s.querySelector('h1,h2');
      if (h) window.setTimeout(function () { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }, 0);
    });
    head.addEventListener('focusout', function (e) { var n = e.relatedTarget; if (btn.getAttribute('aria-expanded') === 'true' && n && !nav.contains(n) && n !== btn) menu(false); });
  }
  // current section
  var links = nav ? nav.querySelectorAll('a[data-sec]') : [];
  function current(id) { for (var i = 0; i < links.length; i++) { if (links[i].getAttribute('data-sec') === id) links[i].setAttribute('aria-current', 'true'); else links[i].removeAttribute('aria-current'); } }
  var secs = document.querySelectorAll('main > section[id]');
  if (secs.length) current(secs[0].id);
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) { for (var i = 0; i < entries.length; i++) if (entries[i].isIntersecting) current(entries[i].target.id); }, { rootMargin: '-25% 0px -65% 0px' });
    for (var j = 0; j < secs.length; j++) io.observe(secs[j]);
  }
  for (var k = 0; k < links.length; k++) links[k].addEventListener('click', function (e) { current(e.currentTarget.getAttribute('data-sec')); });
  // type tester
  var testers = document.querySelectorAll('[data-tester]');
  for (var t = 0; t < testers.length; t++) (function (box) {
    var text = box.querySelector('[data-tester-text]'), size = box.querySelector('[data-tester-size]'), val = box.querySelector('[data-tester-value]');
    var outs = box.querySelectorAll('[data-tester-out]');
    function paint() {
      var s = text.value.length ? text.value : text.getAttribute('data-default');
      for (var i = 0; i < outs.length; i++) outs[i].textContent = s;
      box.style.setProperty('--tester-size', size.value + 'px');
      if (val) val.textContent = size.value + ' px';
    }
    text.addEventListener('input', paint); size.addEventListener('input', paint); paint();
  })(testers[t]);
})();`;

// ---- the shell ----
export function bookSlot(ctx) {
  // brand mark for the header, in both modes
  const B = ctx.brand;
  if (ctx.edition === 'slot') return `<span class="bk-name">${esc(B.name)}</span>`;
  return `<span class="bk-for-light">${ctx.logo.html('colour', { width: 132 })}</span><span class="bk-for-dark">${ctx.logo.html('reversed', { width: 132 })}</span>`;
}

export function bookMarkup(ctx, T, { board = false, scripts = true } = {}) {
  const B = ctx.brand;
  const body = T.brandBook(ctx);
  for (const s of BOOK_SECTIONS) if (!new RegExp(`<section[^>]*\\bid="${s.id}"`).test(body)) throw new Error(`brandBook is missing section #${s.id}`);
  const nav = BOOK_SECTIONS.map((s, i) => `<li><a href="#${s.id}" data-sec="${s.id}"><span class="bk-n">${i + 1}</span>${esc(s.title)}</a></li>`).join('');
  const mode = (m, label) => `<button type="button" data-mode="${m}" aria-pressed="${m === 'light'}">${label}</button>`;
  return `<div class="bk${board ? ' bk--board' : ''}">
<a class="bk-skip" href="#main">Skip to content</a>
<header class="bk-top">
<a class="bk-brand" href="#overview" aria-label="${esc(B.name)} brand book, back to the top">${bookSlot(ctx)}</a>
<button type="button" class="bk-menu" id="bk-menu-btn" aria-expanded="false" aria-controls="bk-nav"><span>Sections</span></button>
<nav class="bk-nav" id="bk-nav" aria-label="Brand book sections"><ol>${nav}</ol></nav>
<div class="bk-mode" role="group" aria-label="Colour preview">${mode('light', 'Light')}${mode('dark', 'Dark')}</div>
</header>
<main id="main" tabindex="-1">
${body}
<footer class="bk-foot"><span>${esc(B.name)} brand book</span><span>${esc(ctx.versionLine)}</span></footer>
</main>
<div class="bk-live" id="bk-live" role="status" aria-live="polite" aria-atomic="true"></div>
</div>${scripts ? `\n<script>${CLIENT_JS}</script>` : ''}`;
}

export function bookCssAll(ctx, T) {
  return T.bookCss(ctx);
}

// the full document: fonts embedded as base64 woff2, all css inline. Opens from disk with no network.
export function bookDoc(ctx, T) {
  const faces = fontFaceCss(ctx, (f) => `data:font/woff2;base64,${Buffer.from(ctx.loaders.fontFile(f.stem, 'woff2')).toString('base64')}`, chromeFaces(T));
  return finishText(`<!doctype html>
<html lang="en-AU" data-theme="light">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light dark">
<title>${esc(ctx.brand.name)} brand book</title>
<script>(function(){var m=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.setAttribute('data-theme',m?'dark':'light');})();</script>
<style>
${faces}
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;text-size-adjust:100%}
body{margin:0}
${tokensCss(ctx)}
${componentsCss(ctx)}
${bookCssAll(ctx, T)}
</style></head>
<body>
${bookMarkup(ctx, T)}
</body></html>
`, 'index.html', ctx);
}

// The brand book as a file map: index.html plus assets/ (the brand kit's files and its zip, by relative link).
// kit is the kit's file map, kitName its folder name, zip the zipped kit as a Buffer. outside: false when the PNG and PDF files made
// outside the engine are not in that zip (the route's), so the book does not list them.
export function bookFiles(ctx, T, { kit, kitName, zip, outside = true }) {
  const listing = kitListing(ctx, T, kit, { outside });
  ctx.book = bookData(ctx, listing, { name: `${kitName}.zip`, size: zip.length });
  ctx.mode = { kind: 'files', photoBase: ctx.book.photosBase, fontBase: '' };
  const files = { 'index.html': bookDoc(ctx, T), [`assets/${kitName}.zip`]: zip };
  for (const [rel, data] of Object.entries(kit)) files[`assets/brand-kit/${rel}`] = data;
  return files;
}
