// Renders every export theme, both editions, with no browser: each guidelines and UI kit page (and its page document),
// the brand book, the code package, the brand kit with its zip, and the read-me and sheets pages. Fails on any throw.
//
//   node scripts/export-themes-smoke.mjs [--themes 01,04] [--editions slot,showcase] [--loaders <module>] [--report <file.json>]
//
// --loaders names a module whose default (or `loaders`) export is { fontFile, icon, logoPlugin }; the default is the
// engine's node-loaders.js. --report writes the font files and icons the run asked for.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ET = path.join(ROOT, 'api', '_lib', 'exportThemes');
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };

const toUrl = (p) => pathToFileURL(path.resolve(p)).href;
const mod = (p) => import(toUrl(p));
const loadersPath = opt('loaders', path.join(ET, 'node-loaders.js'));
const lm = await mod(loadersPath);
const base = lm.default || lm.loaders || lm.nodeLoaders;
if (!base || typeof base.fontFile !== 'function') throw new Error(`${loadersPath} does not export loaders`);

// a recording wrapper: what the run asked for
const fonts = new Set(), icons = new Set();
const loaders = {
  fontFile: (stem, ext) => { fonts.add(`${stem}.${ext}`); return base.fontFile(stem, ext); },
  icon: (name) => { icons.add(name); return base.icon(name); },
  logoPlugin: (slug) => base.logoPlugin(slug),
};

const { makeCtx, GUIDE_PAGES, UIKIT_PAGES } = await mod(path.join(ET, 'engine', 'pages.js'));
const { pageDoc } = await mod(path.join(ET, 'engine', 'doc.js'));
const { codePackageFiles, kitFiles, kitDocs, zipFiles } = await mod(path.join(ET, 'engine', 'files.js'));
const { bookFiles } = await mod(path.join(ET, 'engine', 'book.js'));

const only = opt('themes', null)?.split(',');
const editions = (opt('editions', 'slot,showcase')).split(',');
const dirs = fs.readdirSync(path.join(ET, 'themes')).filter((d) => /^\d\d-/.test(d)).filter((d) => !only || only.includes(d.slice(0, 2))).sort();

let failed = 0;
// text that means a builder printed a missing value or a swapped placeholder was left behind
const BAD = new RegExp('\\[object Object\\]|\\bundefined\\b|\\bNaN\\b|Photo: \\.|[\\uE000-\\uF8FF]');
const clean = (label, html, errs) => { const m = BAD.exec(html); if (m) errs.push(`${label}: printed ${JSON.stringify(m[0])} near ${JSON.stringify(html.slice(Math.max(0, m.index - 40), m.index + 40))}`); return !m; };
const attempt = (label, fn, errs) => { try { return fn(); } catch (e) { errs.push(`${label}: ${e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e}`); return undefined; } };

for (const dir of dirs) {
  const T = await mod(path.join(ET, 'themes', dir, 'index.js'));
  for (const edition of editions) {
    const errs = [], missing = [], n = { guidelines: 0, uikit: 0, book: 0, code: 0, kit: 0, docs: 0 };
    for (const [kind, list, impl] of [['guidelines', GUIDE_PAGES, T.guidelines], ['uikit', UIKIT_PAGES, T.uikit]]) {
      const ctx = attempt(`${kind} ctx`, () => makeCtx(T, edition, kind, loaders), errs);
      if (!ctx) continue;
      for (const p of list) {
        if (!impl || typeof impl[p.id] !== 'function') { missing.push(`${kind}/${p.id}`); continue; }
        const html = attempt(`${kind}/${p.id}`, () => impl[p.id](ctx), errs);
        if (html === undefined) continue;
        if (typeof html !== 'string' || !html.includes('<')) { errs.push(`${kind}/${p.id}: no markup`); continue; }
        const doc = attempt(`${kind}/${p.id} document`, () => pageDoc(ctx, T, { title: p.id, pages: [html], size: ctx.size }), errs);
        if (doc !== undefined && clean(`${kind}/${p.id}`, doc, errs)) n[kind]++;
      }
    }
    const ctx = attempt('book ctx', () => makeCtx(T, edition, 'guidelines', loaders), errs);
    if (ctx) {
      const kit = attempt('kitFiles', () => kitFiles(ctx, T), errs);
      if (kit) {
        n.kit = Object.keys(kit).length;
        const zip = await zipFiles(kit, 'kit').catch((e) => { errs.push('zip: ' + e.message); });
        if (zip) {
          const files = attempt('book', () => bookFiles(ctx, T, { kit, kitName: 'kit', zip }), errs);
          if (files && typeof files['index.html'] === 'string' && files['index.html'].length > 5000) { if (clean('book', files['index.html'], errs)) n.book = Object.keys(files).length; }
          else if (files) errs.push('book: index.html is missing or too short');
        }
      }
      const code = attempt('codePackageFiles', () => codePackageFiles(ctx, T), errs);
      if (code) n.code = Object.keys(code).length;
      const docs = attempt('kitDocs', () => kitDocs(ctx, T), errs);
      if (docs) { n.docs = docs.length; for (const d of docs) clean(`kitDoc ${d.name}`, d.html, errs); }
    }
    const tag = errs.length ? 'FAIL' : 'ok';
    console.log(`${tag}  ${dir} ${edition}  guidelines ${n.guidelines}/${GUIDE_PAGES.length}  uikit ${n.uikit}/${UIKIT_PAGES.length}  book ${n.book ? 'yes' : 'no'}  code ${n.code}  kit ${n.kit}  kitDocs ${n.docs}`);
    if (missing.length) console.log(`     missing builders: ${missing.join(', ')}`);
    for (const e of errs) console.log('     ' + e);
    if (errs.length) failed++;
  }
}

const report = { fonts: [...fonts].sort(), icons: [...icons].sort() };
console.log(`\nfont files asked for: ${report.fonts.length} (${report.fonts.filter((f) => f.endsWith('.ttf')).length} ttf), icons: ${report.icons.length}`);
const out = opt('report', null);
if (out) fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
if (failed) { console.log(`${failed} theme/edition run(s) failed`); process.exit(1); }
console.log('all rendered');
