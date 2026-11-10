// Renders every export theme in Chromium and fails on any finding: text outside its page, text clipped or truncated,
// overlapping text, images and fonts that did not load, text under opacity, contrast below WCAG AA, and slots left empty
// or filled with a missing value. Views, for both editions of every theme:
//   - each guidelines page and each UI kit page, at that page's size
//   - the UI kit's example.html at 1440 and 390, light and dark
//   - the brand book at 1440 and 390, light and dark
//   - the brand kit's read-me and sheets pages, with the font files placed beside them
//
//   node scripts/export-themes-check.mjs [--themes 01,04] [--editions slot,showcase] [--only guidelines,uikit,example,book,kitdocs]
//                                        [--jobs 4] [--report <file.json>] [--verbose]
//
// Files are served from memory: each view's file map is answered through context.route, so nothing is written to disk.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ET = path.join(ROOT, 'api', '_lib', 'exportThemes');
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const flag = (n) => argv.includes('--' + n);
const mod = (p) => import(pathToFileURL(p).href);

// Finds the Chromium Playwright installed; undefined lets Playwright use its own default.
function findExe() {
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), '.cache'), 'ms-playwright');
  if (!fs.existsSync(base)) return undefined;
  const dirs = fs.readdirSync(base).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse();
  for (const d of dirs) for (const rel of ['chrome-win64/chrome.exe', 'chrome-win/chrome.exe', 'chrome-linux/chrome', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium']) {
    const p = path.join(base, d, rel); if (fs.existsSync(p)) return p;
  }
  const hs = fs.readdirSync(base).filter((d) => /^chromium_headless_shell-\d+$/.test(d)).sort().reverse();
  for (const d of hs) for (const rel of ['chrome-headless-shell-win64/chrome-headless-shell.exe', 'chrome-win/headless_shell.exe']) { const p = path.join(base, d, rel); if (fs.existsSync(p)) return p; }
  return undefined;
}

// Runs inside the page. Returns { findings, stats }.
async function inPage({ rootSel, minRatio, minLarge }) {
  const findings = [];
  const stats = { textNodes: 0, contrastChecked: 0, contrastSkippedImage: 0 };
  const cv = document.createElement('canvas'); cv.width = cv.height = 1;
  const g = cv.getContext('2d', { willReadFrequently: true });
  const parse = (c) => { g.clearRect(0, 0, 1, 1); g.fillStyle = '#000'; g.fillStyle = c; g.fillRect(0, 0, 1, 1); const d = g.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const over = (top, below) => { const a = top[3]; return [top[0] * a + below[0] * (1 - a), top[1] * a + below[1] * (1 - a), top[2] * a + below[2] * (1 - a), 1]; };
  const roots = [...document.querySelectorAll(rootSel)];
  const rootName = (r) => r.dataset.page || r.id || r.tagName.toLowerCase();
  const add = (type, item, detail, extra = {}) => findings.push({ type, page: rootName(item.root), text: item.text.slice(0, 48), detail, ...extra });
  const items = [];
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = tw.nextNode());) {
    const text = n.nodeValue.trim(); if (!text) continue;
    const el = n.parentElement; if (!el || el.closest('script,style,noscript,title,head,[hidden],template')) continue;
    const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const root = el.closest(rootSel); if (!root) continue;
    const range = document.createRange(); range.selectNodeContents(n);
    const rects = [...range.getClientRects()].filter((r) => r.width > 0.5 && r.height > 0.5);
    if (!rects.length) continue;
    items.push({ n, el, cs, root, rects, text });
  }
  stats.textNodes = items.length;

  // text outside its page, and text cut by an overflow-hidden ancestor
  for (const it of items) {
    const rr = it.root.getBoundingClientRect(); const tol = 1;
    for (const r of it.rects) {
      if (r.left < rr.left - tol || r.right > rr.right + tol || r.top < rr.top - tol || r.bottom > rr.bottom + tol) { add('outside-page', it, `box ${Math.round(r.left - rr.left)},${Math.round(r.top - rr.top)} ${Math.round(r.width)}x${Math.round(r.height)} on a ${Math.round(rr.width)}x${Math.round(rr.height)} page`); break; }
    }
    for (let a = it.el; a && a !== it.root && a !== document.body; a = a.parentElement) {
      const cs = getComputedStyle(a); const ox = cs.overflowX !== 'visible', oy = cs.overflowY !== 'visible';
      if (!ox && !oy) continue;
      const ar = a.getBoundingClientRect(); let hit = null;
      for (const r of it.rects) {
        if ((ox && (r.left < ar.left - 1 || r.right > ar.right + 1)) || (oy && (r.top < ar.top - 1 || r.bottom > ar.bottom + 1))) { hit = r; break; }
      }
      if (hit) { add('clipped', it, `cut by <${a.tagName.toLowerCase()}${a.className && typeof a.className === 'string' ? '.' + a.className.split(' ')[0] : ''}>`); break; }
      if (cs.textOverflow === 'ellipsis' && a.scrollWidth > a.clientWidth + 1) { add('truncated', it, 'text-overflow ellipsis is cutting this text'); break; }
    }
  }

  // overlapping text from different elements: compare glyph-sized boxes (the middle of each line box)
  const boxes = [];
  for (const it of items) for (const r of it.rects) { const t = r.height * 0.18; boxes.push({ it, l: r.left, r: r.right, t: r.top + t, b: r.bottom - t }); }
  const seen = new Set();
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    if (a.it === b.it || a.it.root !== b.it.root) continue;
    const ox = Math.min(a.r, b.r) - Math.max(a.l, b.l), oy = Math.min(a.b, b.b) - Math.max(a.t, b.t);
    if (ox > 1 && oy > 1 && !a.it.el.closest('[data-allow-overlap]') && !b.it.el.closest('[data-allow-overlap]')) {
      const key = i + ':' + j; if (seen.has(key)) continue; seen.add(key);
      add('overlap', a.it, `overlaps "${b.it.text.slice(0, 30)}" by ${Math.round(ox)}x${Math.round(oy)}px`);
    }
  }

  // empty slots and missing values: a slot with nothing in it, a slot sentinel that was never swapped, or a builder that printed a missing value
  const BAD = /\[object Object\]|\bundefined\b|\bNaN\b|[-]/;
  for (const it of items) { const m = BAD.exec(it.text); if (m) add('bad-text', it, `prints ${JSON.stringify(m[0])}`); }
  for (const el of document.querySelectorAll('[data-ph],.ph-b,.ph-c,.photo-slot')) {
    const root = el.closest(rootSel); if (!root) continue;
    if (el.classList.contains('photo-slot') && !el.querySelector('span') && el.getAttribute('aria-label')) continue;  // a slot drawn without its note is labelled for assistive tech
    if (!el.textContent.trim()) findings.push({ type: 'empty-slot', page: rootName(root), text: '', detail: `<${el.tagName.toLowerCase()}${typeof el.className === 'string' && el.className ? '.' + el.className.split(' ')[0] : ''}> has no text` });
  }

  // images and background images
  for (const img of document.images) {
    const root = img.closest(rootSel); if (!root) continue;
    if (!(img.complete && img.naturalWidth > 0)) findings.push({ type: 'image-not-loaded', page: rootName(root), text: '', detail: img.getAttribute('src') });
  }
  const urls = new Map();
  for (const e of document.querySelectorAll(rootSel + ' *')) {
    const bi = getComputedStyle(e).backgroundImage; const m = bi.match(/url\("?([^")]+)"?\)/g);
    if (m) for (const u of m) urls.set(u.replace(/^url\("?|"?\)$/g, ''), e.closest(rootSel));
  }
  for (const [u, root] of urls) {
    const ok = await new Promise((res) => { const i = new Image(); i.onload = () => res(true); i.onerror = () => res(false); i.src = u; });
    if (!ok) findings.push({ type: 'image-not-loaded', page: rootName(root), text: '', detail: 'background ' + u.slice(0, 80) });
  }

  // fonts: every family and weight used by text must be a loaded FontFace
  const faces = [...document.fonts];
  const used = new Map();
  for (const it of items) { const fam = it.cs.fontFamily.split(',')[0].trim().replace(/^["']|["']$/g, ''); const w = parseInt(it.cs.fontWeight, 10) || 400; const st = it.cs.fontStyle === 'normal' ? 'normal' : 'italic'; const k = fam + '|' + w + '|' + st; if (!used.has(k)) used.set(k, it); }
  for (const [k, it] of used) {
    const [fam, ws, st] = k.split('|'); const w = Number(ws);
    if (/^(serif|sans-serif|monospace|system-ui|ui-monospace|cursive)$/.test(fam)) { add('font-fallback', it, `generic family "${fam}" is in use`); continue; }
    const match = faces.filter((f) => f.family.replace(/^["']|["']$/g, '') === fam);
    if (!match.length) { add('font-not-loaded', it, `no @font-face for "${fam}"`); continue; }
    // italic text must use a loaded italic face when the family declares one; a family with no italic face at all is left alone (the browser slants it)
    const wantItalic = st === 'italic' && match.some((f) => f.style !== 'normal');
    const ok = match.some((f) => { const [lo, hi] = f.weight.split(' ').map(Number); return f.status === 'loaded' && w >= lo && w <= (hi || lo) && (f.style === 'normal') === !wantItalic; });
    if (!ok) add('font-not-loaded', it, `"${fam}" weight ${w} ${st} is not loaded (${match.map((f) => f.weight + ' ' + f.style + ':' + f.status).join(', ')})`);
  }

  // contrast against the effective background
  for (const it of items) {
    const { el, cs } = it;
    let op = 1; for (let a = el; a; a = a.parentElement) op *= parseFloat(getComputedStyle(a).opacity);
    if (op < 0.99) add('text-opacity', it, `text sits under opacity ${op.toFixed(2)}; use a measured colour`);
    const isSvg = el instanceof SVGElement;
    const fgRaw = parse(isSvg ? cs.fill : cs.color); if (fgRaw[3] === 0) continue;
    const r0 = it.rects[0]; const cx = r0.left + r0.width / 2, cy = r0.top + r0.height / 2;
    const inView = cx >= 0 && cy >= 0 && cx < innerWidth && cy < innerHeight;
    // inert subtrees are skipped by hit-testing, so their real ground is read from the ancestor chain instead
    const stack = inView && !el.closest('[inert]') ? document.elementsFromPoint(cx, cy) : [];
    let start = stack.indexOf(el);
    if (start < 0) for (let a = el.parentElement; a; a = a.parentElement) { start = stack.indexOf(a); if (start >= 0) break; }
    let chain = start >= 0 ? stack.slice(start) : []; if (!chain.length) for (let a = el; a; a = a.parentElement) chain.push(a);
    const layers = []; let opaque = false, image = false;
    for (const e of chain) {
      if (e instanceof HTMLImageElement || e instanceof HTMLVideoElement || e instanceof HTMLCanvasElement) { image = true; break; }
      const ecs = getComputedStyle(e);
      if (ecs.backgroundImage !== 'none') { image = true; break; }
      const bg = parse(ecs.backgroundColor);
      if (bg[3] > 0) { layers.push(bg); if (bg[3] >= 0.999) { opaque = true; break; } }
    }
    if (image) { stats.contrastSkippedImage++; continue; }
    let bg = opaque ? layers.pop() : [255, 255, 255, 1];
    while (layers.length) bg = over(layers.pop(), bg);
    const fg = fgRaw[3] < 1 ? over(fgRaw, bg) : fgRaw;
    const size = parseFloat(cs.fontSize), weight = parseInt(cs.fontWeight, 10) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const need = large ? minLarge : minRatio;
    const rt = ratio(fg, bg); stats.contrastChecked++;
    if (rt < need) add('contrast', it, `${(Math.floor(rt * 10) / 10).toFixed(1)}:1, needs ${need}:1 (${size}px, weight ${weight})`, { fg: cs.color, bg: `rgb(${bg.slice(0, 3).map(Math.round).join(',')})` });
  }
  return { findings, stats, rootCount: roots.length };
}

// ---- serving a file map from memory ----
const HOST = 'http://export.check';
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.json': 'application/json', '.js': 'text/javascript; charset=utf-8' };
const mimeOf = (p) => MIME[path.extname(p).toLowerCase()] || 'application/octet-stream';

// Check one entry of a file map. rootSel picks the page elements. Returns { findings, stats }.
async function checkView(browser, files, entry, { w, h, rootSel = '.pg', prepare, view = '' }) {
  const context = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const missing = new Set();
  await context.route(`${HOST}/**`, (route) => {
    const rel = decodeURIComponent(new URL(route.request().url()).pathname.slice(1));
    const body = files[rel];
    if (body === undefined) { missing.add(rel); return route.fulfill({ status: 404, body: 'not found' }); }
    return route.fulfill({ status: 200, contentType: mimeOf(rel), body: typeof body === 'string' ? Buffer.from(body, 'utf8') : Buffer.from(body) });
  });
  try {
    const page = await context.newPage();
    await page.goto(`${HOST}/${entry.split('/').map(encodeURIComponent).join('/')}`, { waitUntil: 'load' });
    await settle(page);
    if (prepare) await prepare(page);
    const full = await page.evaluate(() => document.documentElement.scrollHeight);
    if (full > h) await page.setViewportSize({ width: w, height: full });
    const n = await page.evaluate((s) => document.querySelectorAll(s).length, rootSel);
    if (!n) return { findings: [{ type: 'no-pages', view, page: entry, text: '', detail: `nothing matches ${rootSel}` }], stats: {} };
    const res = await page.evaluate(inPage, { rootSel, minRatio: 4.5, minLarge: 3 });
    for (const f of res.findings) f.view = view;
    for (const rel of missing) res.findings.push({ type: 'missing-file', view, page: entry, text: '', detail: `requested ${rel}, which the export does not contain` });
    return res;
  } finally { await context.close(); }
}

async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; }))));
    await document.fonts.ready;
  });
}

// the example page and the book start light; the view sets the mode and stops animation so colours are read at rest
const modePrepare = (dark) => async (page) => {
  await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important}' });
  await page.evaluate((d) => document.documentElement.setAttribute('data-theme', d ? 'dark' : 'light'), dark);
  await page.evaluate(() => document.fonts.ready);
};
const MODE_VIEWS = [['light-1440', 1440, 900], ['dark-1440', 1440, 900], ['light-390', 390, 800], ['dark-390', 390, 800]];

// ---- the run ----
const nodeLoaders = (await mod(path.join(ET, 'node-loaders.js'))).default;
const { makeCtx, GUIDE_PAGES, UIKIT_PAGES } = await mod(path.join(ET, 'engine', 'pages.js'));
const { pageDoc, fontFiles } = await mod(path.join(ET, 'engine', 'doc.js'));
const { codePackageFiles, kitFiles, kitDocs, zipFiles } = await mod(path.join(ET, 'engine', 'files.js'));
const { bookFiles } = await mod(path.join(ET, 'engine', 'book.js'));

const only = opt('themes', null)?.split(',');
const editions = opt('editions', 'slot,showcase').split(',');
const parts = opt('only', 'guidelines,uikit,example,book,kitdocs').split(',');
const jobCount = Math.max(1, Number(opt('jobs', 4)));
const dirs = fs.readdirSync(path.join(ET, 'themes')).filter((d) => /^\d\d-/.test(d)).filter((d) => !only || only.includes(d.slice(0, 2))).sort();

const browser = await chromium.launch({ executablePath: findExe(), args: ['--disable-lcd-text'] });

// Runs the tasks (functions returning promises) with at most jobCount at once.
async function pool(tasks) {
  const results = new Array(tasks.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(jobCount, tasks.length) }, async () => {
    for (let i; (i = next++) < tasks.length;) results[i] = await tasks[i]();
  }));
  return results;
}

const summary = [];
const all = [];
for (const dir of dirs) {
  const T = await mod(path.join(ET, 'themes', dir, 'index.js'));
  for (const edition of editions) {
    const tasks = [];
    const task = (label, files, entry, o) => tasks.push(async () => {
      try { return { label, ...(await checkView(browser, files, entry, { ...o, view: label })) }; }
      catch (e) { return { label, findings: [{ type: 'check-error', view: label, page: entry, text: '', detail: String(e && e.message || e).split('\n')[0] }], stats: {} }; }
    });

    // the two page documents: every page on its own, fonts beside the pages. Markup is built in one go after makeCtx,
    // because the slot edition's placeholder registry belongs to the ctx made last.
    for (const [kind, list, impl] of [['guidelines', GUIDE_PAGES, T.guidelines], ['uikit', UIKIT_PAGES, T.uikit]]) {
      if (!parts.includes(kind)) continue;
      const ctx = makeCtx(T, edition, kind, nodeLoaders);
      const files = { ...fontFiles(ctx, T) };
      const ids = [];
      for (const p of list) {
        if (!impl || typeof impl[p.id] !== 'function') { all.push({ theme: dir, edition, view: `${kind}/${p.id}`, type: 'missing-builder', page: p.id, text: '', detail: `${kind} has no builder for ${p.id}` }); continue; }
        files[`${p.id}.html`] = pageDoc(ctx, T, { title: p.id, pages: [impl[p.id](ctx)], size: ctx.size });
        ids.push(p.id);
      }
      for (const id of ids) task(`${kind}/${id}`, files, `${id}.html`, { w: ctx.sizeOf(id).w, h: ctx.sizeOf(id).h });
    }

    // the UI kit's example page
    if (parts.includes('example')) {
      const files = codePackageFiles(makeCtx(T, edition, 'uikit', nodeLoaders), T);
      for (const [v, w, h] of MODE_VIEWS) task(`example/${v}`, files, 'example.html', { w, h, rootSel: 'body', prepare: modePrepare(v.startsWith('dark')) });
    }

    // the brand book, built over the brand kit and its zip
    if (parts.includes('book') && T.brandBook) {
      const ctx = makeCtx(T, edition, 'guidelines', nodeLoaders);
      const kit = kitFiles(ctx, T);
      const zip = await zipFiles(kit, 'kit');
      const files = bookFiles(ctx, T, { kit, kitName: 'kit', zip });
      for (const [v, w, h] of MODE_VIEWS) task(`book/${v}`, files, 'index.html', { w, h, rootSel: '.bk-sec', prepare: modePrepare(v.startsWith('dark')) });
    }

    // the brand kit's read-me and sheets pages, with the font files beside them
    if (parts.includes('kitdocs')) {
      const ctx = makeCtx(T, edition, 'guidelines', nodeLoaders);
      const fonts = fontFiles(ctx, T);
      for (const d of kitDocs(ctx, T)) task(`kitdoc/${d.name}`, { ...fonts, 'doc.html': d.html }, 'doc.html', { w: d.size.w, h: d.size.h });
    }

    const results = await pool(tasks);
    const found = [];
    let nodes = 0, contrast = 0;
    for (const r of results) { nodes += r.stats.textNodes || 0; contrast += r.stats.contrastChecked || 0; for (const f of r.findings) found.push({ theme: dir, edition, ...f }); }
    for (const f of all.filter((x) => x.theme === dir && x.edition === edition)) found.push(f);
    summary.push({ theme: dir, edition, views: results.length, textNodes: nodes, contrastChecked: contrast, findings: found.length });
    const byType = {};
    for (const f of found) byType[f.type] = (byType[f.type] || 0) + 1;
    console.log(`${found.length ? 'FAIL' : 'ok  '}  ${dir} ${edition.padEnd(8)} ${String(results.length).padStart(3)} views  ${nodes} text nodes  ${contrast} contrast checks  ${found.length} findings${found.length ? '  ' + JSON.stringify(byType) : ''}`);
    if (found.length) {
      const shown = flag('verbose') ? found : found.slice(0, 6);
      for (const f of shown) console.log(`      ${f.view} ${f.type} [${f.page}] ${f.text ? JSON.stringify(f.text) + ' ' : ''}${f.detail}`);
      if (shown.length < found.length) console.log(`      ... ${found.length - shown.length} more (--verbose lists them all)`);
    }
    all.push(...found.filter((f) => f.type !== 'missing-builder'));
  }
}
await browser.close();

// per theme totals over both editions
const total = new Map();
for (const s of summary) total.set(s.theme, (total.get(s.theme) || 0) + s.findings);
console.log('\nfindings per theme: ' + [...total].map(([t, n]) => `${t.slice(0, 2)}=${n}`).join(' '));
const out = opt('report', null);
if (out) fs.writeFileSync(out, JSON.stringify({ summary, findings: all }, null, 2) + '\n');
const count = [...total.values()].reduce((a, b) => a + b, 0);
console.log(count ? `${count} findings` : 'no findings');
process.exit(count ? 1 : 0);
