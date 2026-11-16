// The HTML UI kit site as a file map, for the server export. It follows the engine's builder (the same pages, CSS, client script and
// search index) and returns { 'index.html': ..., 'assets/kit.css': ... } instead of writing a folder, zipping, checking or shooting.
// The theme owns the markup, through T.kitSite (see the engine's kit-site.js for the contract).
//
// Where this differs from the engine's build, and why (the server has no browser):
//  1. No property scan. The engine renders every variant and state of a bench in Chromium to fill the states matrix (K.scan). Here
//     K.scan is undefined; the pages that carry a bench draw it without the scanned matrix.
//  2. Brand photos and photographed mockups are not copied or drawn: the export has no photo files, only art-directed slots.
//  3. Text goes through put(), so a slot placeholder is swapped for its words in every file.
//  4. The code package's zip, the check, the screenshots and the canvas boards are not built here. The site sits at the root of the
//     export beside the code package and shares its assets/fonts.
import { esc } from './brand.js';
import { componentsCss } from './components.js';
import { tokensCss, colourMap, tokenGroups, fontFaceCss } from './tokens.js';
import { chromeFaces, fontFiles } from './doc.js';
import { put } from './files.js';
import { placeholderCss } from './placeholders.js';
import { applyState } from './kit-site.js';
import { READER_JS, readerIndexJs, cutTitle, safeSlice } from './guide-site-build.js';

export const KIT_DIR = 'ui-kit-html';
export const kitHref = (id) => (id === 'cover' ? 'index.html' : id + '.html');

// ---- CSS helpers ----

// Split a stylesheet into flat rules. @media (hover:hover) bodies are unwrapped; other at-rules are kept whole as { at }.
export function cssRules(css) {
  const out = []; let i = 0; const s = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const block = (from) => { let d = 0; for (let j = from; j < s.length; j++) { if (s[j] === '{') d++; else if (s[j] === '}' && --d === 0) return j; } return s.length; };
  while (i < s.length) {
    const ob = s.indexOf('{', i); if (ob < 0) break;
    const sel = s.slice(i, ob).trim(); const end = block(ob);
    if (sel.startsWith('@')) {
      if (/^@media\s*\(\s*hover\s*:\s*hover\s*\)/.test(sel)) out.push(...cssRules(s.slice(ob + 1, end)));
      else out.push({ at: sel, body: s.slice(ob + 1, end) });
    } else if (sel) out.push({ sel, body: s.slice(ob + 1, end).trim() });
    i = end + 1;
  }
  return out;
}

// The forced-state CSS: every :hover, :focus-visible and :active rule in componentsCss again with .is-hover, .is-focus, .is-pressed,
// so the bench can force a state on a live component. Derived from components.css, so it stays in step with it.
export function forcedCss(ctx) {
  const map = [[/:hover\b/g, '.is-hover'], [/:focus-visible\b/g, '.is-focus'], [/:active\b/g, '.is-pressed']];
  const seen = new Set(), out = [];
  for (const r of cssRules(componentsCss(ctx))) {
    if (!r.sel || !/:(hover|focus-visible|active)\b/.test(r.sel)) continue;
    const parts = r.sel.split(/,(?![^(]*\))/).map((p) => p.trim()).filter((p) => /:(hover|focus-visible|active)\b/.test(p));
    const sel = parts.map((p) => map.reduce((a, [re, c]) => a.replace(re, c), p)).filter((p) => !seen.has(p + r.body));
    sel.forEach((p) => seen.add(p + r.body));
    if (sel.length) out.push(`${sel.join(', ')} { ${r.body} }`);
  }
  return `/* forced states, derived from the :hover, :focus-visible and :active rules above */\n${out.join('\n')}`;
}

// The real token names (colour roles in both modes, then space, radius, width, font, text, shadow), in their tokens.css order.
function tokenTable(ctx) {
  const light = colourMap(ctx, 'light'), dark = colourMap(ctx, 'dark'), g = tokenGroups(ctx), other = {};
  for (const k in g) Object.assign(other, g[k]);
  return { light, dark, other };
}

// The custom properties the rules matching `re` read: `:root { ... }` plus the dark colours. Internal properties (--bg) drop out.
export function tokensUsed(ctx, re) {
  const T = tokenTable(ctx), used = new Set();
  for (const r of cssRules(componentsCss(ctx))) if (r.sel && re.test(r.sel)) for (const m of r.body.matchAll(/var\(--([a-z0-9-]+)/g)) used.add(m[1]);
  const col = Object.keys(T.light).filter((k) => used.has(k)), oth = Object.keys(T.other).filter((k) => used.has(k));
  const decl = (o, ks) => ks.map((k) => `  --${k}: ${o[k]};`).join('\n');
  return { names: [...col, ...oth], css: `:root {\n${decl(T.light, col)}${col.length && oth.length ? '\n' : ''}${decl(T.other, oth)}\n}\n[data-theme="dark"] {\n${decl(T.dark, col)}\n}` };
}


const VOID = new Set(['area', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const BLOCK = new Set(['div', 'ul', 'ol', 'li', 'section', 'article', 'header', 'footer', 'nav', 'form', 'p', 'h1', 'h2', 'h3', 'h4', 'table', 'thead', 'tbody', 'tr', 'fieldset', 'figure', 'main', 'aside', 'dialog', 'label']);
// A small tree pretty-printer: a node stays on one line when it is 88 characters or less or has no block children. An svg is a leaf.
export function prettyHtml(markup) {
  const toks = markup.replace(/\s+>/g, '>').match(/<svg[\s\S]*?<\/svg>|<!--[\s\S]*?-->|<\/?[a-zA-Z][^>]*>|[^<]+/g) || [];
  const root = { kids: [] }, stack = [root];
  for (const t of toks) {
    const top = stack[stack.length - 1];
    if (t.startsWith('</')) { if (stack.length > 1) stack.pop(); continue; }
    if (t.startsWith('<svg') || t.startsWith('<!--')) { top.kids.push({ leaf: t }); continue; }
    if (t.startsWith('<')) {
      const name = /^<([a-zA-Z0-9-]+)/.exec(t)[1].toLowerCase(), node = { open: t, name, kids: [] };
      top.kids.push(node); if (!VOID.has(name) && !t.endsWith('/>')) stack.push(node); continue;
    }
    if (t.trim()) top.kids.push({ text: t.replace(/\s+/g, ' ') });
  }
  const flat = (n) => n.leaf ?? n.text ?? n.open + n.kids.map(flat).join('') + (VOID.has(n.name) ? '' : `</${n.name}>`);
  const pr = (n, ind) => {
    if (n.leaf || n.text != null) return ind + (n.leaf || n.text.trim());
    const one = flat(n);
    // a long element breaks onto its own lines when it holds a block, or only elements (a wrapper round one button); a run of
    // text with inline elements stays one line
    if (one.length + ind.length <= 88 || (!n.kids.some((c) => c.name && BLOCK.has(c.name)) && n.kids.some((c) => c.text != null))) return ind + one;
    return [ind + n.open, ...n.kids.map((c) => pr(c, ind + '  ')), ind + `</${n.name}>`].join('\n');
  };
  return root.kids.map((c) => pr(c, '')).join('\n');
}

// ---- the PDF page content, carried (not copied) from T.uikit[id](ctx), so the template copy has one source ----

const cells = (row) => [...row.matchAll(/<(t[hd])([^>]*)>([\s\S]*?)<\/\1>/g)].map((m) => ({ tag: m[1], cls: (/class="([^"]*)"/.exec(m[2]) || [])[1] || '', html: m[3] }));
export function carry(ctx, T, id) {
  const raw = T.uikit[id] ? T.uikit[id](ctx) : '';
  const one = (re) => { const m = re.exec(raw); return m ? m : null; };
  const lede = one(/<div class="ksc"><span class="num">([\s\S]*?)<\/span><p><b>Scope\.<\/b> ([\s\S]*?)<\/p><\/div>/);
  const kr = one(/<ol class="kr">([\s\S]*?)<\/ol>/);
  const note = one(/<p class="foot">([\s\S]*?)<\/p>\s*<\/section>/);
  const tables = [...raw.matchAll(/<p class="kz-l"><span class="kn">(Table [\s\S]*?)<\/span> ([\s\S]*?)<\/p>\s*<table([^>]*)>([\s\S]*?)<\/table>/g)].map((m) => {
    const head = /<thead>([\s\S]*?)<\/thead>/.exec(m[4]), body = /<tbody>([\s\S]*?)<\/tbody>/.exec(m[4]);
    return { label: m[1], name: m[2], cls: (/class="([^"]*)"/.exec(m[3]) || [])[1] || '', head: head ? cells(head[1]) : [], rows: body ? body[1].split('</tr>').filter((r) => r.includes('<t')).map(cells) : [] };
  });
  const figures = [...raw.matchAll(/<figure class="kf">([\s\S]*?)<figcaption class="cap"><b><span class="kn">(Figure [\s\S]*?)<\/span> ([\s\S]*?)<\/b>([\s\S]*?)<\/figcaption><\/figure>/g)]
    .map((m) => ({ html: m[1], label: m[2], title: m[3], cap: m[4] }));
  const defs = [...raw.matchAll(/<li><span class="num">([\s\S]*?)<\/span><span class="kdc( is-ring)?" style="background:([^"]*)"><\/span><span class="kdt"><b>([\s\S]*?)<\/b>([\s\S]*?)<br><span class="m">([\s\S]*?)<\/span> <span class="m">([\s\S]*?)<\/span><\/span><\/li>/g)]
    .map((m) => ({ ref: m[1], ring: !!m[2], bg: m[3], name: m[4].replace(/\.$/, ''), what: m[5].trim(), token: m[6], value: m[7] }));
  // the conformance matrix has no Table label: a table.kmx, its key in p.kmx-key
  const mx = one(/<table class="st kmx">([\s\S]*?)<\/table>/) || one(/<table[^>]*class="[^"]*\bkmx\b[^"]*"[^>]*>([\s\S]*?)<\/table>/);
  const matrix = mx ? (() => { const h = /<thead>([\s\S]*?)<\/thead>/.exec(mx[1]), b = /<tbody>([\s\S]*?)<\/tbody>/.exec(mx[1]); return { head: h ? cells(h[1]) : [], rows: b ? b[1].split('</tr>').filter((r) => r.includes('<t')).map(cells) : [] }; })() : null;
  const key = one(/<p class="kmx-key">([\s\S]*?)<\/p>/);
  const ctl = [...((one(/<ol class="kk-ctl">([\s\S]*?)<\/ol>/) || [])[1] || '').matchAll(/<li><span class="num">([\s\S]*?)<\/span><span>([\s\S]*?)<\/span><span>([\s\S]*?)<\/span><\/li>/g)].map((m) => ({ ref: m[1], label: m[2], html: m[3] }));
  const notes = [...((one(/<div class="notes">([\s\S]*?)<\/div>/) || [])[1] || '').matchAll(/<p>([\s\S]*?)<\/p>/g)].map((m) => m[1]);
  const cover = { kicker: (one(/<p class="kk-n">([\s\S]*?)<\/p>/) || [])[1], title: (one(/<h1 class="disp kk-t">([\s\S]*?)<\/h1>/) || [])[1], line: (one(/<p class="lede">([\s\S]*?)<\/p>/) || [])[1], ctlTitle: (one(/<h2 class="h3 kk-h">([\s\S]*?)<\/h2>/) || [])[1] };
  const empties = cutDivs(raw, '<div class="ui-empty');
  const screens = [...cutDivs(raw, '<div class="ui kscreen'), ...cutDivs(raw, '<div class="ui kphone')];
  return {
    raw, lede: lede && { ref: lede[1], html: lede[2] }, note: note && note[1], tables, figures, defs, matrix, key: key && key[1], ctl, notes, cover, empties, screens,
    rules: kr ? [...kr[1].matchAll(/<li><span class="num">([\s\S]*?)<\/span><span>([\s\S]*?)<\/span><\/li>/g)].map((m) => ({ ref: m[1], html: m[2] })) : [],
    rulesTitle: (one(/<h2 class="h3 krh">([\s\S]*?)<\/h2>/) || [])[1],
    // live components in the PDF page (labels come from brand.json through ctx.ui, so read them here, never retype them)
    buttons: [...raw.matchAll(/<button class="ui-btn([^"]*)"[^>]*>([\s\S]*?)<\/button>/g)].map((m) => ({ cls: m[1].trim(), html: m[2] })),
  };
}
// cut out every element that starts with `start`, by a balanced div walk
function cutDivs(html, start) {
  const out = []; let i = 0;
  while ((i = html.indexOf(start, i)) >= 0) {
    let d = 0, j = i; const re = /<div\b|<\/div>/g; re.lastIndex = i;
    for (let m; (m = re.exec(html));) { d += m[0] === '</div>' ? -1 : 1; if (d === 0) { j = re.lastIndex; break; } }
    out.push(html.slice(i, j)); i = j;
  }
  return out;
}

// ---- the client script: a data-attribute contract, the theme writes the markup. No dependencies, no network. ----

export const KIT_JS = `(function () {
  var root = document.documentElement, live = document.getElementById('sx-live'), liveTimer;
  function announce(msg) { if (!live) return; live.textContent = ''; setTimeout(function () { live.textContent = msg; }, 30); clearTimeout(liveTimer); liveTimer = setTimeout(function () { live.textContent = ''; }, 2600); }
  function fallback(text) { var t = document.createElement('textarea'); t.value = text; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.left = '-9999px'; document.body.appendChild(t); t.select(); var ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; } document.body.removeChild(t); return Promise.resolve(ok); }
  function copyText(text) { if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return fallback(text); }); return fallback(text); }
  document.addEventListener('click', function (e) {
    var c = e.target.closest('[data-copy]'); if (!c) return;
    var text = c.getAttribute('data-copy');
    copyText(text).then(function (ok) {
      var lab = c.querySelector('[data-copy-text]'), was = lab ? lab.textContent : '';
      c.classList.add('is-done'); if (lab) lab.textContent = ok ? 'Copied' : 'Select and copy';
      announce(ok ? 'Copied ' + (c.getAttribute('data-copy-name') || text) : 'Copy is blocked here. Select the text and copy it.');
      clearTimeout(c._t); c._t = setTimeout(function () { c.classList.remove('is-done'); if (lab) lab.textContent = was; }, 1800);
    });
  });
  // light and dark: html[data-theme], kept across pages
  function setMode(m, save) {
    root.classList.add('sx-switching'); root.setAttribute('data-theme', m);
    document.querySelectorAll('[data-mode]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-mode') === m)); });
    if (save) { try { localStorage.setItem('sx-mode', m); } catch (e) {} }
    requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.remove('sx-switching'); }); });
  }
  document.querySelectorAll('[data-mode]').forEach(function (b) { b.addEventListener('click', function () { setMode(b.getAttribute('data-mode'), true); }); });
  setMode(root.getAttribute('data-theme') || 'light', false);
  // disclosure (Contents at 390)
  document.querySelectorAll('[data-disclosure]').forEach(function (b) {
    var p = document.getElementById(b.getAttribute('aria-controls'));
    function set(open) { b.setAttribute('aria-expanded', String(open)); if (p) p.classList.toggle('is-open', open); }
    b.addEventListener('click', function () { set(b.getAttribute('aria-expanded') !== 'true'); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && b.getAttribute('aria-expanded') === 'true') { set(false); b.focus(); } });
  });
  // the bench: a variant control and a state strip drive the live figure, its label and the states matrix
  document.querySelectorAll('[data-bench]').forEach(function (bench) {
    var snap = new Map();
    bench.querySelectorAll('[data-fig] [data-target]').forEach(function (t) { var a = {}; for (var i = 0; i < t.attributes.length; i++) a[t.attributes[i].name] = t.attributes[i].value; snap.set(t, a); });
    function vis(el) { return !el.closest('[data-for-variant]') || !el.closest('[data-for-variant]').hidden; }
    function apply() {
      var v = bench.getAttribute('data-variant'), s = bench.getAttribute('data-state'), btn = null;
      bench.querySelectorAll('[data-set-state]').forEach(function (b) { var on = b.getAttribute('data-set-state') === s && vis(b); b.setAttribute('aria-pressed', String(on)); if (on) btn = b; });
      // a variant without the current state (a tab bar has no hover) falls back to its first state, its rest
      if (!btn) { var first = [].filter.call(bench.querySelectorAll('[data-set-state]'), vis)[0]; if (!first) return; bench.setAttribute('data-state', first.getAttribute('data-set-state')); return apply(); }
      var cls = btn.getAttribute('data-state-cls'), attr = JSON.parse(btn.getAttribute('data-state-attr') || '{}');
      bench.querySelectorAll('[data-fig] [data-target]').forEach(function (t) {
        var a = snap.get(t); for (var i = t.attributes.length - 1; i >= 0; i--) { var n = t.attributes[i].name; if (!(n in a)) t.removeAttribute(n); }
        for (var k in a) t.setAttribute(k, a[k]);
        if (cls) t.classList.add(cls);
        for (var j in attr) t.setAttribute(j, attr[j]);
      });
      bench.querySelectorAll('tr[data-state]').forEach(function (r) { if (r.getAttribute('data-state') === s && vis(r)) r.setAttribute('aria-current', 'true'); else r.removeAttribute('aria-current'); });
      var lab = bench.querySelector('[data-bench-label]'); if (lab) lab.textContent = btn.getAttribute('data-label');
    }
    bench.querySelectorAll('[data-set-variant]').forEach(function (b) {
      b.addEventListener('click', function () {
        var v = b.getAttribute('data-set-variant'); bench.setAttribute('data-variant', v);
        bench.querySelectorAll('[data-set-variant]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        document.querySelectorAll('[data-bench] [data-for-variant], [data-bench-code] [data-for-variant]').forEach(function (el) { el.hidden = el.getAttribute('data-for-variant') !== v; });
        apply();
      });
    });
    bench.querySelectorAll('[data-set-state]').forEach(function (b) { b.addEventListener('click', function () { bench.setAttribute('data-state', b.getAttribute('data-set-state')); apply(); }); });
  });
})();`;

// ---- build ----

const plain = (h) => h.replace(/<(script|style|template)[\s\S]*?<\/\1>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();

// The site as { 'index.html', '<page>.html', 'assets/kit.css', 'assets/kit.js', 'assets/fonts/<stem>.woff2' }. ctx is a uikit ctx
// (files mode); a page the theme cannot lay out for this brand throws, and so does the build.
export function kitSiteFiles(ctx, T) {
  const KS = T.kitSite;
  if (!KS) throw new Error('kit site: this theme has no kitSite');
  const files = {};
  const css = [
    fontFaceCss(ctx, (f) => `fonts/${f.stem}.woff2`, chromeFaces(T)), tokensCss(ctx), componentsCss(ctx), forcedCss(ctx),
    placeholderCss(ctx), KS.css(ctx),
  ].join('\n');
  put(ctx, files, 'assets/kit.css', css);
  put(ctx, files, 'assets/kit.js', `${KIT_JS}\n${READER_JS}`);
  Object.assign(files, fontFiles(ctx, T));

  const pages = ctx.pages.map((p) => ({ ...p, href: kitHref(p.id) }));
  const bodies = [];
  pages.forEach((p, i) => {
    const K = {
      ctx, T, page: p, pages, sections: ctx.sections, href: kitHref, prev: pages[i - 1] || null, next: pages[i + 1] || null,
      carry: (id = p.id) => carry(ctx, T, id), scan: undefined, bench: KS.benches?.[p.id] ? KS.benches[p.id](ctx) : null,
      prettyHtml, tokensUsed: (re) => tokensUsed(ctx, re), applyState, edition: ctx.edition,
    };
    const render = KS.pages[p.id] || KS.fallback;
    const body = KS.shell(ctx, K, render(ctx, K));
    const title = `${p.ref ? p.ref + ' ' : ''}${esc(p.title)} · ${esc(ctx.brand.name)} UI kit`;
    const doc = `<!doctype html>
<html lang="en-AU" data-theme="light">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title>
<script>(function(){var m='light';try{m=localStorage.getItem('sx-mode')||'light';}catch(e){}document.documentElement.setAttribute('data-theme',m);})();</script>
<link rel="stylesheet" href="assets/kit.css"></head>
<body>${body}
<p class="sx-live" id="sx-live" role="status" aria-live="polite"></p>
<script src="assets/kit.js"></script>
</body></html>
`;
    put(ctx, files, p.href, doc);
    bodies.push({ p, body });
  });

  // the search index for this part (KS.reader = { part }): every page with its text, then every element the theme numbered for
  // linking (id and data-rd-n) with its title
  if (KS.reader) {
    const entries = [];
    for (const { p, body } of bodies) {
      // the page's own article, to its last close (specimens hold <article> cards of their own)
      const art = (/<article class="sx-art"[^>]*>([\s\S]*)<\/article>/.exec(body) || [])[1] || '';
      entries.push({ r: p.ref || '', t: p.id === 'cover' ? 'Overview' : p.title, h: p.href, x: safeSlice(plain(art), 1600) });
      for (const m of art.matchAll(/<(li|p|h[1-3])\b[^>]*\bid="([^"]+)"[^>]*\bdata-rd-n="([^"]+)"[^>]*>([\s\S]*?)<\/\1>/g)) {
        const text = plain(m[4]), k = text.indexOf(m[3]);
        entries.push({ r: m[3], t: cutTitle(k >= 0 ? text.slice(k + m[3].length) : text), h: `${p.href}#${m[2]}` });
      }
    }
    put(ctx, files, 'assets/reader-index.js', readerIndexJs(KS.reader.part, entries));
  }
  return files;
}
