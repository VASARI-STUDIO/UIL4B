// Build a theme's premium guide and kit sites through the export route, unpack them, and (optionally) shoot every page.
//
//   node scripts/premium-site-check.mjs <theme> <outDir> [--empty] [--shots] [--widths=390,768,1440] [--dark=guide-index,kit-example]
//
// <theme>   a theme folder name, e.g. 21-presentation
// <outDir>  where to unpack: <outDir>/guide, <outDir>/kit, and with --shots <outDir>/shots and <outDir>/widths.txt.
//           It must be outside the repository: shots are review material and are never committed.
// --empty   build for a project with no design and no name (the default content), instead of the fixture brand
// --shots   shoot each page full-length at each width with Playwright's Chromium, and record each page's scroll width at 390
//
// The fixture brand is a small orders business with a five-colour palette and two Google faces, so a theme's real-copy and font labels
// are exercised. The route runs in-process with a stubbed Pro user; nothing is sent over the network.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import JSZip from 'jszip';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [theme, outArg] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const flag = (k) => process.argv.includes(`--${k}`);
const opt = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').slice(k.length + 3) || d;
if (!theme || !outArg) {
  console.error('usage: node scripts/premium-site-check.mjs <theme> <outDir> [--empty] [--shots] [--widths=390,768,1440] [--dark=a,b]');
  process.exit(2);
}
const OUT = path.resolve(outArg);
if (!path.relative(ROOT, OUT).startsWith('..') && !path.isAbsolute(path.relative(ROOT, OUT))) {
  console.error(`outDir must be outside the repository (${ROOT})`);
  process.exit(2);
}

const DESIGN = {
  palette: { base: '#2F6F5E', harmony: 'auto', colors: ['#2F6F5E', '#F2C14E', '#8FB8A8', '#F4F1EA', '#1D2B27'] },
  fonts: { heading: { family: 'Barlow Condensed', weight: 700, category: 'sans-serif' }, body: { family: 'Roboto', weight: 400, category: 'sans-serif' } },
};
const deps = () => ({
  verifyIdToken: async () => ({ uid: 'pro-1' }),
  readUser: async () => ({ subscription: { status: 'active', currentPeriodEnd: Date.now() + 10 * 86400000 } }),
  consume: async () => ({ allowed: true, remaining: 10, retryAfter: 0 }),
});

const { serveExportDocument } = await import(pathToFileURL(path.join(ROOT, 'api/_lib/exportDocument.js')).href);
const body = flag('empty') ? { design: {} } : { projectName: 'Tide & Co.', design: DESIGN };
for (const [row, dir] of [['slides', 'guide'], ['ui-kit', 'kit']]) {
  const res = { headers: {}, setHeader(k, v) { res.headers[k] = v; }, status(c) { res.code = c; return res; }, json(b) { res.body = b; return res; }, send(b) { res.buffer = b; return res; } };
  await serveExportDocument({ headers: { authorization: 'Bearer tok' }, body: { theme, row, format: row === 'slides' ? 'html' : 'zip', ...body } }, res, deps());
  if (res.code !== 200) { console.log(theme, row, 'FAILED', res.code, JSON.stringify(res.body)); process.exitCode = 1; continue; }
  const zip = await JSZip.loadAsync(res.buffer);
  let n = 0;
  for (const [name, f] of Object.entries(zip.files)) {
    if (f.dir) continue;
    const dest = path.join(OUT, dir, name.slice(name.indexOf('/') + 1));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, await f.async('nodebuffer'));
    n++;
  }
  console.log(theme, row, 'ok', n, 'files');
}

if (flag('shots') && !process.exitCode) {
  const { chromium } = await import('playwright');
  const widths = opt('widths', '390,768,1440').split(',').map(Number);
  const dark = opt('dark', '').split(',').filter(Boolean);
  const pages = [];
  for (const part of ['guide', 'kit']) {
    const d = path.join(OUT, part);
    if (fs.existsSync(d)) for (const f of fs.readdirSync(d).filter((x) => x.endsWith('.html'))) pages.push([`${part}-${f.replace(/\.html$/, '')}`, path.join(d, f)]);
  }
  fs.mkdirSync(path.join(OUT, 'shots'), { recursive: true });
  const lines = [];
  const browser = await chromium.launch();
  const shoot = async (name, file, w, scheme) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, colorScheme: scheme });
    // dark shots must really be dark: the kit reads localStorage 'sx-mode', the guide falls back to the colour scheme
    if (scheme === 'dark') await ctx.addInitScript(() => { try { localStorage.setItem('sx-mode', 'dark'); } catch (e) {} });
    const pg = await ctx.newPage();
    await pg.goto(pathToFileURL(file).href);
    await pg.waitForTimeout(250);
    // the engine's example page has a Light/Dark switch of its own and starts light
    if (scheme === 'dark') { const sw = pg.locator('[data-mode="dark"]'); if (await sw.count()) { await sw.first().click(); await pg.waitForTimeout(150); } }
    if (scheme === 'dark') {
      const m = await pg.evaluate(() => document.documentElement.getAttribute('data-theme'));
      if (m !== 'dark') { lines.push(`${name} dark shot is data-theme=${m} NOT DARK`); process.exitCode = 1; }
    }
    if (w === 390 && scheme === 'light') {
      const sw = await pg.evaluate(() => document.documentElement.scrollWidth);
      lines.push(`${name} scrollWidth=${sw}${sw > 390 ? ' OVERFLOW' : ''}`);
    }
    await pg.screenshot({ path: path.join(OUT, 'shots', `${name}-${w}${scheme === 'dark' ? '-dark' : ''}.png`), fullPage: true });
    await ctx.close();
  };
  for (const [name, file] of pages) for (const w of widths) await shoot(name, file, w, 'light');
  for (const [name, file] of pages.filter(([n]) => dark.includes(n))) await shoot(name, file, 1440, 'dark');
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'widths.txt'), lines.join('\n') + '\n');
  const over = lines.filter((l) => l.endsWith('OVERFLOW'));
  console.log(pages.length, 'pages shot at', widths.join('/'), over.length ? `; ${over.length} overflow at 390` : '; none overflow at 390');
  if (over.length) process.exitCode = 1;
}
