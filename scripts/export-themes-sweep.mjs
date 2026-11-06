// Hostile-input sweep of the export themes. Every free-text field of a sample brand is set to a marker plus a payload of
// characters that break out of HTML, CSS, SVG, Markdown and comments; every page and file is rendered with validateBrand
// stubbed out (the sweep tests the sinks themselves, not the allowlist); the output is scanned for any payload that survived
// in a place where it is live. Each failure prints as theme, edition, file, location and field.
//
//   node scripts/export-themes-sweep.mjs [--themes 01,04] [--editions slot,showcase] [--dump <dir>] [--verbose]
//
// --dump <dir> writes the output of an unmodified sample brand (validation stubbed the same way) to <dir>/<theme>-<edition>/,
// so two runs can be compared byte for byte.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { register, stripTypeScriptTypes } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ET = path.join(ROOT, 'api', '_lib', 'exportThemes');
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const flag = (n) => argv.includes('--' + n);
const toUrl = (p) => pathToFileURL(path.resolve(p)).href;
const mod = (p) => import(toUrl(p));

// ---- bypass validateBrand: the engine's brand.js asks for ./validate.js, which is swapped for a pass-through deep copy ----
const STUB = `
const clone = (v) => Array.isArray(v) ? v.map(clone) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clone(x)])) : v;
export class BrandInputError extends Error {}
export const validateBrand = (d) => { globalThis.__sweepStubUsed = true; return clone(d); };
`;
const HOOKS = `
export async function resolve(specifier, context, next) {
  if (/(^|\\/)validate\\.js$/.test(specifier) && /engine\\/brand\\.js$/.test(context.parentURL || '')) return { url: 'data:text/javascript,' + encodeURIComponent(${JSON.stringify(STUB)}), shortCircuit: true };
  return next(specifier, context);
}
`;
register('data:text/javascript,' + encodeURIComponent(HOOKS));

const loaders = (await mod(path.join(ET, 'node-loaders.js'))).default;
const { makeCtx, GUIDE_PAGES, UIKIT_PAGES } = await mod(path.join(ET, 'engine', 'pages.js'));
const { pageDoc } = await mod(path.join(ET, 'engine', 'doc.js'));
const { codePackageFiles, kitFiles, kitDocs, zipFiles } = await mod(path.join(ET, 'engine', 'files.js'));
const { bookFiles } = await mod(path.join(ET, 'engine', 'book.js'));
const { BRANDS } = await mod(path.join(ET, 'brands', 'index.js'));
const { parse } = await import('parse5');
const acorn = await import('acorn');

// ---- the hostile text ----
// A marker (QZ<n>Q) names the field; the payload follows it. A line break is followed by ``` and NLX, so a surviving break
// is findable and, in Markdown, would open or close a code fence.
const BREAK = '\n```NLX';
const PAYLOAD = '"\'><b x=1></style></title></textarea></script>*/`${);}{' + String.fromCharCode(92) + BREAK + '../';
const MARK = /QZ(\d+)Q/g;
const TOKENS_IN_CODE = /\$\{|`|x=1|\.\.\/|<|NLX/;

// Strings that must keep their shape or the build refuses them (the allowlist's leaf rules): left alone, and named here
// so a new field is hostile by default. Paths use [] for an array index.
const SHAPED = [
  /^(slug|theme|edition)$/, /^version\./, /^(colours|tones)\[\]\.(id|hex|role)$/, /^pairs\[\]\.(fg|bg)$/,
  /^fonts\.(display|body|mono)\.(file|css|italicCss|axes)$/, /^type\.scale\[\]\.(token|face)$/, /^ui\.type\[\]\.(token|face)$/,
  /^ui\.(light|dark)\./, /^logo\.colourways\./, /^ui\.shadows$/, /^ui\.icons\[\]$/, /^ui\.rowIcon$/, /^ui\.houseRoles\[\]$/,
  /^ui\.status\[\]\.(id|tone|fg|bg|edge|dark\.fg|dark\.bg|dark\.edge)$/, /^imagery\.shots\[\]\.id$/,
  /^ui\.screen\.content\.deliveries\[\]\.status$/, /^ui\.screen\.content\.example\.links\.\d+\.1$/,
];
// Fields whose text a theme parses (a size, a time, a date) keep their original at the start, so the parse still works.
const PARSED = [/^applications\.(signage|social\[\])$/, /^ui\.screen\.content\.(eta|time)$/,/^ui\.screen\.content\.deliveries\[\]\.when$/, /^guideB\.email\.time$/];

// A deep copy of the brand with every free-text string hostile. mode: 'suffix' (original + marker + payload) or 'prefix' (marker + payload + original).
function hostileBrand(data, mode) {
  const fields = [];
  const walk = (v, parts) => {
    const pat = parts.map((p) => (/^\d+$/.test(p) ? '[]' : p)).join('.').replace(/\.\[\]/g, '[]');
    if (typeof v === 'string') {
      if (SHAPED.some((r) => r.test(pat) || r.test(parts.join('.')))) return v;
      const id = fields.length; fields.push(parts.join('.'));
      if (PARSED.some((r) => r.test(pat))) return `${v}QZ${id}Q${PAYLOAD.replace(BREAK, ' ```NLX')}`;  // no line break: a parse that reads to the end of the line keeps working
      return mode === 'prefix' ? `QZ${id}Q${PAYLOAD}${v}` : `${v}QZ${id}Q${PAYLOAD}`;
    }
    if (Array.isArray(v)) return v.map((x, i) => walk(x, [...parts, String(i)]));
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x, [...parts, k])]));
    return v;
  };
  return { data: walk(data, []), fields };
}

// ---- rendering: every page and file a theme makes, as { file, text } ----
async function renderAll(T, edition, data, errs) {
  const out = [];
  const attempt = (label, fn) => { try { return fn(); } catch (e) { errs.push(`${label}: ${e && e.message ? e.message.split('\n')[0] : e}`); return undefined; } };
  for (const [kind, list, impl] of [['guidelines', GUIDE_PAGES, T.guidelines], ['uikit', UIKIT_PAGES, T.uikit]]) {
    const ctx = attempt(`${kind} ctx`, () => makeCtx(T, edition, kind, loaders, data));
    if (!ctx) continue;
    for (const p of list) {
      if (!impl || typeof impl[p.id] !== 'function') continue;
      const html = attempt(`${kind}/${p.id}`, () => impl[p.id](ctx));
      if (typeof html !== 'string') continue;
      const doc = attempt(`${kind}/${p.id} document`, () => pageDoc(ctx, T, { title: p.id, pages: [html], size: ctx.size }));
      if (doc !== undefined) out.push({ file: `${kind}/${p.id}.html`, text: doc });
    }
  }
  const ctx = attempt('book ctx', () => makeCtx(T, edition, 'guidelines', loaders, data));
  if (ctx) {
    const kit = attempt('kitFiles', () => kitFiles(ctx, T));
    if (kit) {
      for (const [f, v] of Object.entries(kit)) if (typeof v === 'string') out.push({ file: `kit/${f}`, text: v });
      const zip = await zipFiles(kit, 'kit').catch((e) => { errs.push('zip: ' + e.message); });
      if (zip) {
        const files = attempt('book', () => bookFiles(ctx, T, { kit, kitName: 'kit', zip }));
        if (files) for (const [f, v] of Object.entries(files)) if (typeof v === 'string') out.push({ file: `book/${f}`, text: v });
      }
    }
    const code = attempt('codePackageFiles', () => codePackageFiles(ctx, T));
    if (code) for (const [f, v] of Object.entries(code)) if (typeof v === 'string') out.push({ file: `code/${f}`, text: v });
    const docs = attempt('kitDocs', () => kitDocs(ctx, T));
    if (docs) for (const d of docs) out.push({ file: `kitdoc/${d.name}.html`, text: d.html });
  }
  return out;
}

// ---- scanning ----
// Every scanner returns [{ at, what }]: an offset in the text it was given and what is wrong.

// CSS: strings, comments and unquoted url() are read the way a browser reads them; payload that ends up in the code between them is a failure.
function scanCss(text) {
  const bad = [], mask = [...text];
  const blank = (a, b) => { for (let k = a; k < b && k < mask.length; k++) if (mask[k] !== '\n') mask[k] = ' '; };
  let i = 0, depth = 0;
  while (i < text.length) {
    const c = text[i], n = text[i + 1];
    if (c === '/' && n === '*') { const e = text.indexOf('*/', i + 2); const end = e < 0 ? text.length : e + 2; if (e < 0) bad.push({ at: i, what: 'unterminated comment' }); blank(i, end); i = end; continue; }
    if (c === '"' || c === "'") {
      let j = i + 1, closed = false;
      while (j < text.length) {
        const d = text[j];
        if (d === '\\') { j += 2; continue; }
        if (d === c) { closed = true; j++; break; }
        if (d === '\n' || d === '\r') { bad.push({ at: j, what: 'string broken by a line break' }); break; }
        j++;
      }
      if (!closed && j >= text.length) bad.push({ at: i, what: 'unterminated string' });
      blank(i, j); i = j; continue;
    }
    if (/^url\(/i.test(text.slice(i, i + 4)) && (c === 'u' || c === 'U')) {
      let j = i + 4; while (/\s/.test(text[j] || '')) j++;
      if (text[j] !== '"' && text[j] !== "'") {
        const start = j; let ok = true;
        while (j < text.length && text[j] !== ')') {
          if (/["'(\s]/.test(text[j])) ok = false;
          if (text[j] === '\\') j++;
          j++;
        }
        if (!ok) bad.push({ at: start, what: 'unquoted url() broken' });
        blank(i, j + 1); i = j + 1; continue;
      }
    }
    if (c === '\\') { blank(i, i + 2); i += 2; continue; }
    if (c === '{') depth++;
    else if (c === '}' && --depth < 0) { bad.push({ at: i, what: 'unbalanced }' }); depth = 0; }
    i++;
  }
  if (depth !== 0) bad.push({ at: text.length, what: 'unbalanced {' });
  const code = mask.join('');
  const m = TOKENS_IN_CODE.exec(code);
  if (m) bad.push({ at: m.index, what: `payload ${JSON.stringify(m[0])} in CSS code` });
  return bad;
}

// JS or TS: it must parse, and a marker may sit only inside a string, template or comment.
function scanScript(text, ts) {
  const bad = [];
  let src = text;
  try { if (ts) src = stripTypeScriptTypes(text); } catch (e) { return [{ at: 0, what: 'TypeScript does not parse: ' + e.message.split('\n')[0] }]; }
  try {
    const comments = [];
    const toks = [...acorn.tokenizer(src, { ecmaVersion: 'latest', sourceType: 'module', onComment: (b, t, s, e) => comments.push({ s, e }) })];
    for (const t of toks) {
      const type = t.type.label;
      if (type === 'string' || type === 'template' || type === '`' || type === '${') continue;
      if (/QZ\d+Q|NLX/.test(src.slice(t.start, t.end))) bad.push({ at: t.start, what: 'payload in script code' });
    }
    acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'module' });
  } catch (e) { bad.push({ at: e.pos ?? 0, what: 'script does not parse: ' + e.message }); }
  // a line comment that was ended by a payload line break
  const re = /^```NLX/m.exec(src); if (re) bad.push({ at: re.index, what: 'line break carried into a script' });
  return bad;
}

// HTML or SVG: the parse tree must hold no element or attribute the payload made, and every style block and attribute must scan clean.
function scanHtml(text) {
  const bad = [];
  const doc = parse(text, { sourceCodeLocationInfo: true });
  const walk = (n) => {
    if (n.tagName) {
      const loc = n.sourceCodeLocation || {};
      if (n.tagName === 'b' && n.attrs.some((a) => a.name === 'x')) bad.push({ at: loc.startOffset ?? 0, what: 'element made by the payload: <b x=1>' });
      for (const a of n.attrs) {
        if (!/^[a-zA-Z_:][-a-zA-Z0-9_:.]*$/.test(a.name)) bad.push({ at: (loc.attrs && loc.attrs[a.name] ? loc.attrs[a.name].startOffset : loc.startOffset) ?? 0, what: `attribute made by the payload: ${JSON.stringify(a.name)} on <${n.tagName}>` });
        if (a.name === 'style') for (const b of scanCss(a.value)) bad.push({ at: loc.attrs && loc.attrs.style ? loc.attrs.style.startOffset : loc.startOffset ?? 0, what: 'style attribute: ' + b.what });
        if (/^on/i.test(a.name) && /QZ\d+Q/.test(a.value)) bad.push({ at: loc.startOffset ?? 0, what: `event attribute ${a.name}` });
      }
      if (n.tagName === 'style') {
        const t = (n.childNodes || []).map((c) => c.value || '').join(''), base = n.childNodes && n.childNodes[0] && n.childNodes[0].sourceCodeLocation ? n.childNodes[0].sourceCodeLocation.startOffset : loc.startOffset ?? 0;
        for (const b of scanCss(t)) bad.push({ at: base + Math.min(b.at, t.length), what: 'style element: ' + b.what });
      }
      if (n.tagName === 'script') {
        const t = (n.childNodes || []).map((c) => c.value || '').join('');
        if (/QZ\d+Q/.test(t)) bad.push({ at: loc.startOffset ?? 0, what: 'brand text inside a script element' });
      }
    }
    for (const c of n.childNodes || []) walk(c);
    if (n.content) walk(n.content);
  };
  walk(doc);
  // a style, title or textarea end tag the payload wrote leaves its own end tag behind
  const left = text.replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, '').replace(/<(title|textarea|script)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
  const m = /<\/(style|title|textarea|script)\s*>/i.exec(left);
  if (m) bad.push({ at: text.indexOf(m[0]), what: `stray </${m[1]}>` });
  return bad;
}

// Markdown: no raw HTML or break-out characters in the payload, and no line break carried through. Fenced code is checked only for a fence.
function scanMarkdown(text) {
  const bad = [];
  let fenced = false, off = 0;
  for (const line of text.split('\n')) {
    if (/^\s*```NLX/.test(line)) bad.push({ at: off, what: 'line break carried into markdown (it can close or open a code fence)' });
    else if (/^\s*```/.test(line)) fenced = !fenced;
    else {
      for (const m of line.matchAll(/QZ\d+Q(.{0,80})/g)) {
        const zone = m[1];
        if (fenced ? zone.includes('```') : /(^|[^\\])[`<>*|[\]]/.test(zone)) bad.push({ at: off + m.index, what: `markdown not neutralised: ${JSON.stringify(zone.slice(0, 24))}` });
      }
    }
    off += line.length + 1;
  }
  return bad;
}

function scanFile(file, text) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.html' || ext === '.htm' || ext === '.svg' || ext === '.xml') return scanHtml(text);
  if (ext === '.css') return scanCss(text);
  if (ext === '.js' || ext === '.mjs') return scanScript(text, false);
  if (ext === '.ts') return scanScript(text, true);
  if (ext === '.md') return scanMarkdown(text);
  if (ext === '.json') { try { JSON.parse(text); return []; } catch (e) { return [{ at: 0, what: 'JSON does not parse' }]; } }
  return [];
}

// ---- run ----
const only = opt('themes', null)?.split(',');
const editions = opt('editions', 'slot,showcase').split(',');
const dirs = fs.readdirSync(path.join(ET, 'themes')).filter((d) => /^\d\d-/.test(d)).filter((d) => !only || only.includes(d.slice(0, 2))).sort();
const dump = opt('dump', null);
const verbose = flag('verbose');
let failures = 0, crashes = 0;

for (const dir of dirs) {
  const T = await mod(path.join(ET, 'themes', dir, 'index.js'));
  const sample = BRANDS[T.meta.brand].data;
  for (const edition of editions) {
    if (dump) {
      const errs = [], files = await renderAll(T, edition, sample, errs);
      const base = path.join(dump, `${dir}-${edition}`);
      for (const f of files) { const p = path.join(base, f.file); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, f.text); }
      for (const e of errs) console.log(`dump ${dir} ${edition}: ${e}`);
      console.log(`dumped ${dir} ${edition}: ${files.length} files`);
      continue;
    }
    for (const mode of ['suffix', 'prefix']) {
      const { data, fields } = hostileBrand(sample, mode);
      const errs = [], files = await renderAll(T, edition, data, errs);
      if (!globalThis.__sweepStubUsed) { console.log('the validateBrand stub was not used: the sweep cannot run'); process.exit(2); }
      const seen = new Set(), seenFails = new Set();
      for (const f of files) {
        for (const m of f.text.matchAll(MARK)) seen.add(Number(m[1]));
        for (const b of scanFile(f.file, f.text)) {
          let nearest = null;
          for (const m of f.text.slice(0, b.at + 1).matchAll(MARK)) nearest = m;
          const field = nearest ? fields[Number(nearest[1])] : '(no marker before it)';
          const line = f.text.slice(0, b.at).split('\n').length;
          const key = `${f.file}|${b.what}|${field}`;
          if (seenFails.has(key)) continue;
          seenFails.add(key); failures++;
          console.log(`FAIL ${dir} ${edition} ${mode}  ${f.file}:${line}  ${b.what}  field ${field}\n       near ${JSON.stringify(f.text.slice(Math.max(0, b.at - 50), b.at + 30))}`);
        }
      }
      for (const e of errs) {
        crashes++;
        const m = /QZ(\d+)Q/.exec(e);
        console.log(`CRASH ${dir} ${edition} ${mode}  ${e.replace(/QZ\d+Q[^]*$/, '').slice(0, 160)}${m ? `  field ${fields[Number(m[1])]}` : ''}`);
      }
      if (verbose) console.log(`  ${dir} ${edition} ${mode}: ${files.length} files, ${seen.size}/${fields.length} fields reached the output`);
    }
  }
}
if (dump) process.exit(0);
console.log(`\nsweep: ${failures} failure(s), ${crashes} render crash(es)`);
process.exit(failures || crashes ? 1 : 0);
