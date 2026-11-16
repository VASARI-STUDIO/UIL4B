// The HTML guidelines site as a file map, for the server export. It follows the engine's builder (the same pages, anchors, links, outline,
// client script and CSS) and returns { 'index.html': ..., 'assets/guidelines.css': ... } instead of writing a folder, zipping, checking or shooting.
// The theme owns the markup, through T.guideSite (see the engine's guide-site.js for the contract).
//
// Where this differs from the engine's build, and why (the server has no browser):
//  1. The in-page passes (A: anchors, table labels, outline; B: links in running text) run on a small HTML tree (html-tree.js), not in Chromium.
//     Same rules, same output markup. The tree reads the markup the themes write; it is not a general HTML parser.
//  2. Fitting a figure to a narrow column is measured in the visitor's browser (the client script marks the page's elements with
//     data-gs-in at build time and sets --fit when it runs), not measured here at 390. Wide screens are unchanged.
//  3. Photographed mockups (ctx.mockup) and brand photos are not drawn or copied: the export has no photo files, only art-directed slots.
//  4. Text goes through put(), so a slot placeholder is swapped for its words in every file; a clause title is cut with the placeholder
//     kept whole (cutTitle below), as a cut through one would stop the export.
//  5. There is no check, no screenshot, no canvas board and no zip here.
import { esc } from './brand.js';
import { fontFaceCss, tokensCss } from './tokens.js';
import { componentsCss } from './components.js';
import { chromeFaces, fontFiles } from './doc.js';
import { put } from './files.js';
import { siteUnits } from './guide-site.js';
import * as H from './html-tree.js';

// narrow-screen rules sit in @media (max-width:840px), wide ones in (min-width:841px), as in the book
export const GSITE_BREAK = 840;

// ---- the client script: mode switch (kept across pages), disclosure, outline position, figure fit ----
const CLIENT_JS = `(function () {
  var root = document.documentElement, KEY = root.getAttribute('data-gs-key');
  function store(m) { try { window.localStorage.setItem(KEY, m); } catch (e) {} }
  function setMode(m, fromUser) {
    root.setAttribute('data-theme', m);
    var bs = document.querySelectorAll('[data-mode]');
    for (var i = 0; i < bs.length; i++) bs[i].setAttribute('aria-pressed', String(bs[i].getAttribute('data-mode') === m));
    if (fromUser) store(m);
  }
  setMode(root.getAttribute('data-theme') || 'light', false);
  var sw = document.querySelectorAll('[data-mode]');
  for (var i = 0; i < sw.length; i++) sw[i].addEventListener('click', function (e) { setMode(e.currentTarget.getAttribute('data-mode'), true); });
  // disclosures: a button and the panel it controls; Escape closes and returns focus to the button
  var tg = document.querySelectorAll('[data-gs-toggle]');
  for (var t = 0; t < tg.length; t++) (function (btn) {
    var panel = document.getElementById(btn.getAttribute('aria-controls'));
    function set(open, focusBtn) { btn.setAttribute('aria-expanded', String(open)); if (panel) panel.setAttribute('data-open', String(open)); if (!open && focusBtn) btn.focus(); }
    btn.addEventListener('click', function () { set(btn.getAttribute('aria-expanded') !== 'true'); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') { e.preventDefault(); set(false, true); } });
  })(tg[t]);
  // the outline marks the last entry whose target has passed the top third of the screen
  var ol = document.querySelector('[data-gs-outline]');
  if (ol) {
    var links = ol.querySelectorAll('a[href^="#"]'), targets = [];
    for (var k = 0; k < links.length; k++) { var el = document.getElementById(links[k].getAttribute('href').slice(1)); if (el) targets.push([links[k], el]); }
    var spy = function () {
      var y = window.innerHeight * 0.33, cur = null;
      for (var j = 0; j < targets.length; j++) if (targets[j][1].getBoundingClientRect().top <= y) cur = targets[j][0];
      for (var q = 0; q < targets.length; q++) { if (targets[q][0] === cur) targets[q][0].setAttribute('aria-current', 'location'); else targets[q][0].removeAttribute('aria-current'); }
    };
    window.addEventListener('scroll', spy, { passive: true }); spy();
  }
  // figures drawn at a fixed size are zoomed to the column on narrow screens. The server cannot measure them, so this does it:
  // the page's own elements carry data-gs-in (set at build time), and one wider than its column gets --fit. A [data-gs-fit] written
  // by a theme is measured the same way. Run again when the fonts load and when the window is resized.
  var narrow = window.matchMedia ? window.matchMedia('(max-width: ${GSITE_BREAK}px)') : null;
  function measure(e) {
    e.style.setProperty('--fit', '1');
    var p = e.parentElement, cs = getComputedStyle(p), avail = p.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    var ecs = getComputedStyle(e), w = e.getBoundingClientRect().width + parseFloat(ecs.marginLeft) + parseFloat(ecs.marginRight);
    return w > avail + 1 ? Math.floor((avail / w) * 1000) / 1000 : 1;
  }
  function fit() {
    var auto = document.querySelectorAll('[data-gs-auto]');
    for (var a = 0; a < auto.length; a++) { auto[a].removeAttribute('data-gs-fit'); auto[a].removeAttribute('data-gs-auto'); auto[a].style.removeProperty('--fit'); }
    if (!narrow || !narrow.matches) return;
    var fs = document.querySelectorAll('[data-gs-fit]');
    for (var i = 0; i < fs.length; i++) fs[i].style.setProperty('--fit', String(measure(fs[i])));
    var ins = document.querySelectorAll('[data-gs-in]');
    for (var j = 0; j < ins.length; j++) {
      var e = ins[j];
      if (e.closest('[data-gs-fit]') || getComputedStyle(e).position === 'absolute') continue;
      var f = measure(e);
      if (f < 1) { e.setAttribute('data-gs-fit', ''); e.setAttribute('data-gs-auto', ''); e.style.setProperty('--fit', String(f)); } else e.style.removeProperty('--fit');
    }
  }
  fit(); window.addEventListener('resize', fit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
})();`;

// the first script in <head>: the stored choice, else the system setting (no flash of the wrong mode)
const HEAD_JS = (key) => `(function(){var r=document.documentElement,m=null;try{m=window.localStorage.getItem('${key}')}catch(e){}if(m!=='light'&&m!=='dark')m=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';r.setAttribute('data-theme',m);})();`;

// ---- the reader: what the HTML guidelines and the HTML UI kit share (engine/kit-site.js loads it too) ----
// A clause's text cut to a title: its first sentence, cut at a word near 56 characters. A slot placeholder (one private-use run) stands
// for its words and is never cut: it counts as one character and goes back whole.
export function cutTitle(raw) {
  const held = [];
  let t = String(raw || '').replace(/\uE000[\uE010-\uE019]+\uE001/g, (m) => { held.push(m); return String.fromCharCode(0xE100 + held.length - 1); });
  t = t.replace(/\s+/g, ' ').trim().replace(/^[\s:.,;]+/, '');
  const s = t.match(/^.*?[.!?](?=\s|$)/); if (s) t = s[0];
  t = t.replace(/[.;:,]$/, '');
  if (t.length > 58) t = t.slice(0, 56).replace(/[\s,;:]+\S*$/, '') + '…';
  return t.replace(/[\uE100-\uE1FF]/g, (c) => held[c.charCodeAt(0) - 0xE100] ?? '');
}
// assets/reader-index.js: one part's pages and clauses for the search, as window.RD_INDEX[part]. A script (not JSON) so it
// loads from file:// too. Entries: { r: number, t: title, h: href inside the part's folder, x: text searched }.
export const readerIndexJs = (part, entries) => `window.RD_INDEX=window.RD_INDEX||{};window.RD_INDEX[${JSON.stringify(String(part))}]=${JSON.stringify(entries)};\n`;
// The client half. Markup contract (the theme writes it):
//   form[data-rd-search][data-rd-part][data-rd-other]  the search; data-rd-other is the other part's folder ("../x/")
//     input[data-rd-q], [data-rd-pop] (hidden until there is a query), [data-rd-st] (status), [data-rd-res] (an <ol>)
//   template[data-rd-tpl]   one button[data-rd-copy] with a [data-rd-done] span: cloned onto every [data-rd-doc] [data-rd-n]
// Both indexes load on the first focus of the search box, so a page that is only read never requests the other part.
export const READER_JS = `(function () {
  function fallback(text) { var t = document.createElement('textarea'); t.value = text; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.left = '-9999px'; document.body.appendChild(t); t.select(); var ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; } document.body.removeChild(t); return Promise.resolve(ok); }
  function copyText(text) { if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return fallback(text); }); return fallback(text); }
  // copy a link to a clause: added at run time, so the page markup stays the document
  var tpl = document.querySelector('template[data-rd-tpl]');
  if (tpl && tpl.content.firstElementChild) {
    var hosts = document.querySelectorAll('[data-rd-doc] [data-rd-n]');
    for (var i = 0; i < hosts.length; i++) {
      var h = hosts[i], n = h.getAttribute('data-rd-n'), b = tpl.content.firstElementChild.cloneNode(true);
      b.setAttribute('aria-label', 'Copy link to \\u00a7' + n); b.setAttribute('data-rd-href', h.id ? '#' + h.id : '');
      var at = h.querySelector('.gs-cl') || h.querySelector('.num');
      if (at && at.parentNode) at.parentNode.insertBefore(b, at.nextSibling); else h.appendChild(b);
    }
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-rd-copy]'); if (!b) return;
    var url = window.location.href.split('#')[0] + (b.getAttribute('data-rd-href') || '');
    copyText(url).then(function (ok) {
      var d = b.querySelector('[data-rd-done]');
      b.classList.add('is-done'); if (d) d.textContent = ok ? 'Link copied' : 'Copy is blocked here';
      clearTimeout(b._t); b._t = setTimeout(function () { b.classList.remove('is-done'); if (d) d.textContent = ''; }, 1800);
    });
  });
  // search both parts; a clause or page number and Enter goes straight to it
  var form = document.querySelector('[data-rd-search]'); if (!form) return;
  var q = form.querySelector('[data-rd-q]'), pop = form.querySelector('[data-rd-pop]'), st = form.querySelector('[data-rd-st]'), res = form.querySelector('[data-rd-res]');
  var me = form.getAttribute('data-rd-part'), other = form.getAttribute('data-rd-other') || '', loaded = false, hits = [];
  var NUM = /^\\u00a7?\\s*(\\d+(?:\\.\\d+){0,2}[a-z]?)$/i;
  function load() {
    if (loaded) return; loaded = true; window.RD_INDEX = window.RD_INDEX || {};
    ['assets/reader-index.js', other + 'assets/reader-index.js'].forEach(function (src, k) {
      if (k && !other) return;
      var s = document.createElement('script'); s.src = src; s.onload = function () { if (q.value) run(); }; s.onerror = function () {}; document.head.appendChild(s);
    });
  }
  function all() {
    var out = [], I = window.RD_INDEX || {};
    for (var p in I) for (var j = 0; j < I[p].length; j++) { var e = I[p][j]; out.push({ p: p, r: e.r, t: e.t, x: e.x || '', h: (p === me ? '' : other) + e.h, own: p === me, o: out.length }); }
    return out;
  }
  function find(v) {
    var list = all(), m = v.match(NUM);
    if (m) {
      var no = m[1].toLowerCase();
      return list.filter(function (e) { var r = String(e.r || '').toLowerCase(); return r === no || r.indexOf(no + '.') === 0; })
        .sort(function (a, b) { return ((a.r.toLowerCase() === no ? 0 : 2) + (a.own ? 0 : 1)) - ((b.r.toLowerCase() === no ? 0 : 2) + (b.own ? 0 : 1)) || a.o - b.o; });
    }
    var terms = v.toLowerCase().split(/\\s+/).filter(Boolean);
    return list.map(function (e) {
      var t = (e.r + ' ' + e.t).toLowerCase(), x = e.x.toLowerCase(), s = 0;
      for (var k = 0; k < terms.length; k++) { if (t.indexOf(terms[k]) >= 0) s += 3; else if (x.indexOf(terms[k]) >= 0) s += 1; else return null; }
      e.s = s + (e.own ? 0.5 : 0); return e;
    }).filter(Boolean).sort(function (a, b) { return b.s - a.s || a.o - b.o; });
  }
  function el(tag, cls, text) { var x = document.createElement(tag); if (cls) x.className = cls; if (text != null) x.textContent = text; return x; }
  function open(on) { pop.hidden = !on; q.setAttribute('aria-expanded', String(on)); }
  function run() {
    var v = q.value.trim(); res.textContent = '';
    if (!v) { open(false); st.textContent = ''; return; }
    hits = find(v).slice(0, 8);
    for (var i = 0; i < hits.length; i++) {
      var e = hits[i], li = el('li'), a = el('a', 'rd-hit'); a.href = e.h;
      a.appendChild(el('span', 'rd-hit__p', 'Part ' + e.p)); a.appendChild(el('span', 'rd-hit__r num', e.r ? e.r : ''));
      a.appendChild(el('span', 'rd-hit__t', e.t)); li.appendChild(a); res.appendChild(li);
    }
    st.textContent = hits.length ? (NUM.test(v) && hits[0].r.toLowerCase() === v.replace(/^\\u00a7\\s*/, '').toLowerCase() ? 'Press Enter to go to \\u00a7' + hits[0].r : hits.length + (hits.length === 1 ? ' match' : ' matches')) : 'Nothing in either part matches \\u201c' + v + '\\u201d';
    open(true);
  }
  function go(e) { open(false); window.location.href = e.h; }
  q.addEventListener('focus', load);
  q.addEventListener('input', run);
  form.addEventListener('submit', function (e) { e.preventDefault(); run(); if (hits.length) go(hits[0]); });
  form.addEventListener('keydown', function (e) {
    var links = res.querySelectorAll('a'), k = [].indexOf.call(links, document.activeElement);
    if (e.key === 'Escape' && !pop.hidden) { e.preventDefault(); open(false); q.focus(); return; }
    if (e.key === 'ArrowDown' && links.length) { e.preventDefault(); links[Math.min(links.length - 1, k + 1)].focus(); }
    if (e.key === 'ArrowUp' && k >= 0) { e.preventDefault(); if (k === 0) q.focus(); else links[k - 1].focus(); }
  });
  document.addEventListener('click', function (e) { if (!form.contains(e.target)) open(false); });
  form.addEventListener('focusout', function () { setTimeout(function () { if (!form.contains(document.activeElement)) open(false); }, 0); });
})();`;


// ---- pass A, on a tree: strip print-only parts, give clauses, figures, tables and headings anchors, label table cells for stacking ----
// Returns the outline, the anchors and the page text; the tree is changed in place.
const CL = /^(\d+\.\d+\.\d+)$/, FG = /^Figure\s+(\d+(?:\.\d+)*[a-z]?)$/;
// elements the figure fit never measures (the engine's own list), and the ones that draw nothing
const NO_FIT = /^(table|thead|tbody|tfoot|tr|td|th|caption|colgroup|col|a|span|b|i|p|li|ol|ul|h2|h3|script|style|template|br|wbr|source|track|link|meta)$/;
const SECTIONS = ['thead', 'tbody', 'tfoot'];
const parentEl = (e) => (e.parent && e.parent.t === 'el' ? e.parent : null);
const rowsOf = (t) => H.children(t).flatMap((c) => (c.tag === 'tr' ? [c] : SECTIONS.includes(c.tag) ? H.children(c).filter((r) => r.tag === 'tr') : []));
const cellsOf = (r) => H.children(r).filter((c) => c.tag === 'td' || c.tag === 'th');
const spanOf = (c) => Math.max(1, parseInt(H.getAttr(c, 'colspan'), 10) || 1);
// a slice that does not end inside a slot placeholder
export const safeSlice = (s, n) => { const cut = s.slice(0, n); return cut.lastIndexOf('\uE000') > cut.lastIndexOf('\uE001') ? cut.slice(0, cut.lastIndexOf('\uE000')) : cut; };

function passA(root, { strip, tableStart, minStack, noLink }) {
  const kept = (e) => noLink && H.closest(e, noLink); // placeholder text and the like: never anchored, linked or zoomed
  for (const s of strip) for (const e of H.querySelectorAll(root, s)) H.detach(e);
  const ids = new Set();
  const own = (e) => H.children(e).length === 0;
  const link = (leaf, id, cls) => { const a = H.createElement('a', { href: '#' + id, class: cls }, [H.createText(H.escText(H.textContent(leaf)))]); H.replaceKids(leaf, [a]); };
  // tables: a number each, a caption, and a label on every cell from its column head (for the stacked narrow view)
  let tn = tableStart;
  for (const t of H.querySelectorAll(root, 'table')) {
    tn++; H.setAttr(t, 'id', 't-' + tn); H.setAttr(t, 'data-gs-kind', 'table'); H.setAttr(t, 'data-gs-n', String(tn));
    const cap = H.createElement('caption', { class: 'gs-tc' }, [H.createElement('a', { href: '#t-' + tn }, [H.createText('Table ' + tn)])]);
    const old = H.children(t).find((c) => c.tag === 'caption'); if (old) H.detach(old);
    H.prepend(t, cap);
    const thead = H.children(t).find((c) => c.tag === 'thead'), head = thead && H.children(thead).find((r) => r.tag === 'tr');
    const labels = [];
    if (head) for (const c of cellsOf(head)) { const txt = H.textContent(c).trim(); for (let i = 0; i < spanOf(c); i++) labels.push(txt); }
    const cols = Math.max(0, ...rowsOf(t).map((r) => cellsOf(r).reduce((n, c) => n + spanOf(c), 0)));
    if (cols >= minStack) H.addClass(t, 'gs-stk');
    for (const tb of H.children(t).filter((c) => c.tag === 'tbody')) for (const r of H.children(tb).filter((x) => x.tag === 'tr')) {
      let i = 0;
      for (const c of cellsOf(r)) {
        // an empty cell has nothing to label: it is marked so the stacked view can leave it out
        if (!H.textContent(c).trim() && !H.querySelector(c, 'svg,img,[style]')) H.setAttr(c, 'data-gs-empty', '');
        else if (labels[i]) H.setAttr(c, 'data-label', labels[i]);
        i += spanOf(c);
      }
    }
  }
  // a clause's title for "On this page" and the search: in a table row the first cell after the number that is not a number itself
  // (a bold name in the cell is the name), else the text after the number
  const titles = new Map();
  const after = (x, no) => { const k = x.indexOf(no); return (k >= 0 ? x.slice(k + no.length) : x).trim(); };
  const titleOf = (host, leaf, no) => {
    if (host.tag !== 'tr') return after(H.flat(host), no);
    const cells = cellsOf(host); if (!cells.length) return '';
    const from = Math.max(0, cells.findIndex((c) => H.contains(c, leaf)));
    let t = after(H.flat(cells[from]), no);
    if (!t) for (const c of cells.slice(from + 1)) { const b = H.querySelector(c, 'b,strong'), x = b ? H.flat(b) : H.flat(c); if (x && !CL.test(x)) { t = x; break; } }
    return t; // cut to a title by cutTitle
  };
  // clause numbers and figure labels: the first of each is the anchor, later ones link to it
  for (const e of H.elements(root)) {
    if (!own(e) || H.closest(e, 'a') || kept(e)) continue;
    const txt = H.textContent(e).trim();
    let m = CL.exec(txt);
    if (m) {
      const id = 'c-' + m[1].replace(/\./g, '-');
      if (ids.has(id)) { link(e, id, 'gs-ref'); continue; }
      const pe = parentEl(e);
      const host = pe && /^h[23]$/.test(pe.tag) ? pe : (H.closest(e, 'tr,li,.a-cl,.b-rr') || e);
      // a second clause in a row (or a heading) that already has an anchor anchors on its own number
      const at = H.getAttr(host, 'id') ? e : host;
      H.setAttr(at, 'id', id); ids.add(id); H.setAttr(at, 'data-gs-kind', 'clause'); H.setAttr(at, 'data-gs-n', m[1]);
      titles.set(id, titleOf(host, e, m[1])); H.setAttr(at, 'data-rd-n', m[1]);
      link(e, id, 'gs-cl'); continue;
    }
    m = FG.exec(txt);
    if (m) {
      const id = 'f-' + m[1].replace(/\./g, '-');
      if (ids.has(id)) { link(e, id, 'gs-ref'); continue; }
      const host = H.closest(e, 'figure') || H.closest(e, 'td,.b-rr__c,li') || parentEl(e);
      if (!host) continue;
      if (!H.getAttr(host, 'id')) { H.setAttr(host, 'id', id); H.setAttr(host, 'data-gs-kind', 'figure'); H.setAttr(host, 'data-gs-n', m[1]); ids.add(id); }
      link(e, H.getAttr(host, 'id'), 'gs-fl');
    }
  }
  let hn = 0;
  for (const h of H.querySelectorAll(root, 'h2,h3')) if (!H.getAttr(h, 'id')) { H.setAttr(h, 'id', 'h-' + (++hn)); H.setAttr(h, 'data-gs-kind', 'heading'); }
  // the outline, in document order: headings, tables (with the clauses inside them), figures, free clauses
  const outline = [], headText = (e) => H.textContent(e).replace(/\s+/g, ' ').trim();
  let lastTable = null;
  for (const e of H.querySelectorAll(root, '[data-gs-kind]')) {
    const k = H.getAttr(e, 'data-gs-kind'), id = H.getAttr(e, 'id');
    if (k === 'table') { lastTable = { kind: 'table', id, n: H.getAttr(e, 'data-gs-n'), clauses: [] }; outline.push(lastTable); continue; }
    if (k === 'clause') {
      const t = H.closest(e, 'table');
      const c = { id, n: H.getAttr(e, 'data-gs-n'), t: titles.get(id) || '' };
      if (t && lastTable && H.getAttr(t, 'id') === lastTable.id) { lastTable.clauses.push(c); continue; }
      if (/^h[23]$/.test(e.tag)) { outline.push({ kind: 'heading', id, text: headText(e) }); continue; }
      const prev = outline[outline.length - 1];
      if (prev && prev.kind === 'clauses') prev.clauses.push(c);
      else outline.push({ kind: 'clauses', clauses: [c] });
      continue;
    }
    if (k === 'figure') { outline.push({ kind: 'figure', id, n: H.getAttr(e, 'data-gs-n') }); continue; }
    if (k === 'heading') outline.push({ kind: 'heading', id, text: headText(e) });
  }
  // fit: the elements a block wider than its column could be (the client script measures them on narrow screens); not the
  // inside of a drawing, a table part or a text run
  for (const e of H.elements(root)) {
    if (NO_FIT.test(e.tag) || kept(e) || H.closest(e, '[data-gs-fit]')) continue;
    const svg = H.closest(e, 'svg'); if (svg && svg !== e) continue;
    H.setAttr(e, 'data-gs-in', '');
  }
  for (const e of H.querySelectorAll(root, '[id]')) ids.add(H.getAttr(e, 'id'));
  return { outline, ids: [...ids], tables: tn, text: safeSlice(H.flat(root), 1600) };
}

// ---- pass B: § references and "Figure n" mentions in running text become links (given every anchor in the site) ----
// Read on the source text, so an entity (&sect;, &nbsp;) in the markup is matched and kept as written.
const REF = /(?:§|&sect;|&#167;|&#xa7;)(\d+(?:\.\d+){0,2})|Figure(?:\s|&nbsp;|&#160;|&#xa0;)+(\d+\.\d+(?:\.\d+)?[a-z]?)/g;
function passB(root, map, noLink) {
  for (const n of H.textNodes(root)) {
    if (n.raw || !n.parent) continue;
    if (H.closest(n.parent, 'a,script,style') || (noLink && H.closest(n.parent, noLink))) continue;
    const s = n.v, out = []; let last = 0, m;
    REF.lastIndex = 0;
    while ((m = REF.exec(s))) {
      const href = map[m[1] ? '§' + m[1] : 'F' + m[2]];
      if (!href) continue;
      out.push(H.createText(s.slice(last, m.index)), H.createElement('a', { href, class: 'gs-ref' }, [H.createText(m[0])]));
      last = m.index + m[0].length;
    }
    if (!out.length) continue;
    out.push(H.createText(s.slice(last)));
    H.replaceNode(n, out);
  }
}

// ---- documents ----
function siteCss(ctx, T) {
  return `*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;text-size-adjust:100%}
body{margin:0}
${tokensCss(ctx)}
${componentsCss(ctx)}
${T.css(ctx)}
${T.guideSite.css(ctx)}
[data-gs-fit]{transform-origin:0 0}
@media (max-width:${GSITE_BREAK}px){[data-gs-fit]{zoom:var(--fit,1)}}`;
}
function docHtml(title, markup, key) {
  return `<!doctype html>
<html lang="en-AU" data-theme="light" data-gs-key="${key}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light dark">
<title>${title}</title>
<script>${HEAD_JS(key)}</script>
<link rel="stylesheet" href="assets/guidelines.css">
</head>
<body>
${markup}
<script src="assets/guidelines.js"></script>
</body></html>
`;
}

// The site as { 'index.html', '<page>.html', 'assets/guidelines.css', 'assets/guidelines.js', 'assets/fonts/<stem>.woff2' }. ctx is a
// guidelines ctx (files mode); a page the theme cannot lay out for this brand throws, and so does the build.
export function guideSiteFiles(ctx, T) {
  const G = T.guideSite;
  if (!G) throw new Error('guide site: this theme has no guideSite');
  const adapt = G.adapt || {};
  const files = {};
  put(ctx, files, 'assets/guidelines.css', `${fontFaceCss(ctx, (f) => `fonts/${f.stem}.woff2`, chromeFaces(T))}\n${siteCss(ctx, T)}`);
  put(ctx, files, 'assets/guidelines.js', `${CLIENT_JS}\n${READER_JS}`);
  Object.assign(files, fontFiles(ctx, T));
  const key = `gs-mode-${ctx.slug}`;
  const nav = siteUnits(ctx), { units } = nav;
  const docTitle = (u) => esc(`${u.ref ? `${u.ref} ${u.title}` : 'Cover and contents'}: ${ctx.brand.name} brand guidelines`);
  const bodyOf = (u) => (u.front ? G.front(ctx, { ...nav, unit: u }) : G.page(ctx, u.id));

  // pass A on every page (table numbers run on from page to page), then the references, then pass B
  let tables = 0;
  const out = units.map((u) => {
    const root = H.parse(bodyOf(u));
    const r = passA(root, { strip: adapt.strip || [], tableStart: tables, minStack: adapt.minStack || 3, noLink: adapt.noLink || '' });
    for (const e of r.outline) for (const c of e.clauses || []) c.t = cutTitle(c.t);
    tables = r.tables;
    return { ...r, root };
  });
  // every reference a page can make: section n, page n.m, clause n.m.k, Figure n.m(.k)
  const map = {};
  for (const s of nav.sections) map['§' + s.n] = s.units[0].file;
  units.forEach((u, i) => {
    if (u.ref) map['§' + u.ref] = u.file;
    for (const id of out[i].ids) {
      const m = id.match(/^([cf])-(\d+(?:-\d+)*[a-z]?)$/); if (!m) continue;
      map[(m[1] === 'c' ? '§' : 'F') + m[2].replace(/-/g, '.')] = `${u.file}#${id}`;
    }
  });
  units.forEach((u, i) => {
    const own = u.file;
    const local = Object.fromEntries(Object.entries(map).map(([k, v]) => [k, v.startsWith(own + '#') ? v.slice(own.length) : v === own ? '#gs-top' : v]));
    passB(out[i].root, local, adapt.noLink || '');
    out[i].html = H.innerHTML(out[i].root);
  });

  // the search index for this part (G.reader = { part }): every page, then every clause with its title
  if (G.reader) {
    const entries = [];
    units.forEach((u, i) => {
      entries.push({ r: u.ref || '', t: u.title, h: u.file, x: out[i].text });
      for (const e of out[i].outline) for (const c of e.clauses || []) entries.push({ r: c.n, t: c.t, h: `${u.file}#${c.id}` });
    });
    put(ctx, files, 'assets/reader-index.js', readerIndexJs(G.reader.part, entries));
  }

  units.forEach((u, i) => {
    const S = { ...nav, unit: u, prev: units[i - 1] || null, next: units[i + 1] || null, body: out[i].html, outline: out[i].outline, isFront: u.front, board: false };
    put(ctx, files, u.file, docHtml(docTitle(u), G.shell(ctx, S), key));
  });
  return files;
}
