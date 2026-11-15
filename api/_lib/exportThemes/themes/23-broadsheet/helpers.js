// Theme 23, Broadsheet: the paper. Every page is positioned on one four-column grid with page px (1123 x 1587, A3 portrait).
// Nothing here names a brand, a colour id or a photo id: roles, shares, logo geometry and copy come from brand data.
import { esc } from '../../engine/brand.js';
import { loadFont } from '../../engine/nodeFont.js';

// Typographic punctuation: a newspaper sets curly marks. Every string the theme prints goes through A, so the straight quotes and apostrophes in brand copy
// are turned here, once: an opening mark follows a space, a bracket or a dash (or starts the string); anything else closes, or is an apostrophe.
export const smart = (s) => String(s ?? '')
  .replace(/(^|[\s([{—–-])"/g, '$1“').replace(/"/g, '”')
  .replace(/(^|[\s([{—–“-])'/g, '$1‘').replace(/'/g, '’');
// and back: the copy guard compares what is printed with what the brand wrote
export const plain = (s) => String(s ?? '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
export const A = (s) => esc(smart(s));

// newsprint and press ink: the theme's own materials, the same for every brand
export const N = { paper: '#E4E6E9', paper2: '#D7D9DD', hair: '#AEB2B7', ink: '#1C2023', quiet: '#5A5E63' };

// the grid: four columns of 232 px with 24 px gutters, a 1000 px measure
export const G = {
  x: [61.5, 317.5, 573.5, 829.5], col: 232, gut: 24, left: 61.5, right: 1061.5, mid: 561.5, top: 112, floor: 1531,
  rule: [305.5, 561.5, 817.5],
  span: (a, b) => 232 * (b - a + 1) + 24 * (b - a),
};

export const px = (n) => `${+n.toFixed(2)}px`;
export const pad3 = (n) => String(n).padStart(3, '0');

// ---- text and layout primitives -------------------------------------------------------------------------------------------
// an absolutely placed element
export const E = (x, y, cls, html, { w = null, h = null, style = '' } = {}) =>
  `<div class="a ${cls}" style="left:${px(x)};top:${px(y)};${w != null ? `width:${px(w)};` : ''}${h != null ? `height:${px(h)};` : ''}${style}">${html}</div>`;
// a column of flowing blocks; rule 'left' draws the hairline column rule in the gutter beside it, as tall as the column's own text
export const col = (x, y, w, inner, { rule = false, cls = '' } = {}) =>
  `<div class="a colm ${cls}" style="left:${px(x)};top:${px(y)};width:${px(w)}">${rule ? '<i class="vr"></i>' : ''}${inner}</div>`;
export const hr = (x, y, w, h = 1, c = 'ink') => `<i class="a hr hr-${c}" style="left:${px(x)};top:${px(y)};width:${px(w)};height:${px(h)}"></i>`;

// ---- the brand's edition line, page numbers, jump lines --------------------------------------------------------------------
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export function editionLine(ctx) {
  const v = ctx.brand.version, m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v.date);
  return m ? `Edition ${v.number}, ${+m[3]} ${MONTHS[+m[2] - 1]} ${m[1]}` : `Edition ${v.number}`;
}
// the page number of a page in this document, "017", or null when the document has no such page
export const pageOf = (ctx, id) => { const n = ctx.pageNo(id); return n ? pad3(n) : null; };
// "continued on page 17": words in italic, number upright; not drawn when the page does not exist
export const jump = (ctx, id, words) => { const n = pageOf(ctx, id); return n ? `<p class="c-jump"><i>${A(words)}, page</i> <b>${n}</b></p>` : ''; };

// ---- colour ----------------------------------------------------------------------------------------------------------------
// --spot: the brand's action colour, stepped down in OKLCH lightness until it holds 4.5 : 1 on the paper
export function spotOf(ctx, bg = N.paper) {
  const C = ctx.C, o = C.toOklch(ctx.roles.light.action); let hex = ctx.roles.light.action;
  for (let l = o.L; C.ratio(hex, bg) < 4.5 && l > 0.2; l -= 0.02) hex = C.fromOklch(l, o.C, o.H);
  return hex;
}

// ---- brand type measuring ---------------------------------------------------------------------------------------------------
const displayFace = (ctx) => { const f = ctx.faces.filter((x) => x.role === 'display' && x.style !== 'italic'); return f.reduce((a, b) => (b.weight > a.weight ? b : a)); };
export const displayWeight = (ctx) => displayFace(ctx).weight;
// the body weight nearest a wanted one (a brand that does not load 700 gets its heaviest)
export const bodyWeight = (ctx, want) => ctx.brand.fonts.body.weights.reduce((b, w) => (Math.abs(w - want) < Math.abs(b - want) ? w : b));
// the display face's tracking: the brand's rule is -0.01 em for every sample brand; kept here as one value
export const TRACK = -0.01;

export function measure(ctx, text, size, track = TRACK) {
  const font = loadFont(displayFace(ctx).stem); let x = 0, prev = null;
  for (const ch of smart(text)) {
    const g = font.charToGlyph(ch);
    if (prev) { try { x += font.getKerningValue(prev, g) * size / font.unitsPerEm; } catch { /* no kerning table */ } }
    x += g.advanceWidth * size / font.unitsPerEm + track * size; prev = g;
  }
  return x;
}
const wrap = (ctx, words, size, w) => {
  const lines = []; let cur = '';
  for (const wd of words) { const t = cur ? cur + ' ' + wd : wd; if (!cur || measure(ctx, t, size) <= w) cur = t; else { lines.push(cur); cur = wd; } }
  if (cur) lines.push(cur);
  // a short last line (an orphan word) is evened out: the same number of lines, split so the longest line is as short as it can be
  const n = lines.length;
  if (n > 1 && n < words.length && measure(ctx, lines[n - 1], size) < 0.6 * Math.max(...lines.map((l) => measure(ctx, l, size)))) {
    const W = words.length, seg = (i, j) => measure(ctx, words.slice(i, j).join(' '), size);
    const best = Array.from({ length: n + 1 }, () => Array(W + 1).fill(Infinity)), cut = Array.from({ length: n + 1 }, () => Array(W + 1).fill(0));
    best[0][0] = 0;
    for (let k = 1; k <= n; k++) for (let j = k; j <= W; j++) for (let i = k - 1; i < j; i++) { const m = Math.max(best[k - 1][i], seg(i, j)); if (m < best[k][j]) { best[k][j] = m; cut[k][j] = i; } }
    if (best[n][W] <= w) { const out = []; for (let k = n, j = W; k > 0; k--) { const i = cut[k][j]; out.unshift(words.slice(i, j).join(' ')); j = i; } return out; }
  }
  return lines;
};
// the display size at which a short brief or quote fits a column: no word wider than the column
export const titleSize = (ctx, text, w, max = 40) => { const m = Math.max(...text.split(/\s+/).map((t) => measure(ctx, t, max))); return m <= w ? max : Math.floor(max * w / m); };
// Set a headline in the display face as explicit lines: the largest size from max down to min where the text takes at most maxLines
// and no line passes w. Sentences stay together when they can (a break at a full stop reads best); otherwise greedy wrap.
export function fitLines(ctx, text, { w, max, min, maxLines = 2, step = 2 }) {
  const sentences = text.split(/(?<=[.!?:])\s+/);
  for (let s = max; s >= min; s -= step) {
    let lines = sentences.length <= maxLines && sentences.length > 1 && sentences.every((t) => measure(ctx, t, s) <= w) ? sentences : wrap(ctx, text.split(/\s+/), s, w);
    if (lines.length <= maxLines && lines.every((t) => measure(ctx, t, s) <= w)) return { size: s, lines, ok: true };
  }
  return { size: min, lines: wrap(ctx, text.split(/\s+/), min, w), ok: false };
}
// the lines as markup, one block per line so the count that is laid out is the count that renders
export const headLines = (lines, size, lh, cls = 'b-head') =>
  `<h1 class="${cls}" style="font-size:${size}px;line-height:${px(lh)}">${lines.map((l) => `<span class="ln">${A(l)}</span>`).join('')}</h1>`;

// width that fits a logo version inside a box
export const fitLogo = (ctx, id, maxW, maxH) => { const g = ctx.logo.geos[id]; return Math.floor(Math.min(maxW, (maxH * g.w) / g.h) * 100) / 100; };

// ---- the folio line (every page but the cover) --------------------------------------------------------------------------------
export function folio(ctx, id) {
  const p = ctx.pages.find((x) => x.id === id), L = ctx.logo;
  // a logo that fits under 12 px tall in 140 x 22 gives way to its symbol
  let v = 'horizontal', w = fitLogo(ctx, v, 140, 22);
  if (w * L.geos[v].h / L.geos[v].w < 12) { v = 'symbol'; w = fitLogo(ctx, v, 140, 22); }
  const h = w * L.geos[v].h / L.geos[v].w;
  return E(G.left, 40, 'c-folio-no', pad3(p.no)) + (p.section ? E(G.left + 56, 40, 'c-folio', A(p.section.title)) : '')
    + E(G.mid - w / 2, 52 - h / 2, 'flogo', L.html(v, { width: w, colourway: 'colour', color: N.ink, label: 'Logo' }), { w, h })
    + E(G.right - 300, 40, 'c-folio c-quiet c-right', A(editionLine(ctx)), { w: 300 })
    + hr(G.left, 72, 1000, 1) + hr(G.left, 76, 1000, 3);
}

// ---- plates ----------------------------------------------------------------------------------------------------------------------
// The paper screens a brand's photographs in the press ink as halftone plates. The server holds no photographs (a shot is a brief, and its pictures
// are neutral scene plates), so no plate is drawn: every place a plate would run holds the text plate. It is a rule, a line the brand has
// written in its title size, and why; its box is as big as its text and no bigger.
export function plateInner(ctx, _key, n = 0) {
  const wt = ctx.brand.voice.writeThis, t = wt[n % wt.length];
  return `<i class="tp-rule"></i><p class="b-title tp-line">${A(t.write)}</p><p class="c-cap c-quiet">${A(t.because)}</p>`;
}
// the plate's box in page px (a text plate has none), for the pages that hang other blocks from it
export const plateBox = () => null;

// ---- more measuring ------------------------------------------------------------------------------------------------------------------
// the width of a line in the brand's body face at the loaded weight nearest to the one asked for
export function measureBody(ctx, text, size, want = 400) {
  const faces = ctx.faces.filter((x) => x.role === 'body' && x.style !== 'italic');
  const f = faces.reduce((a, b) => (Math.abs(b.weight - want) < Math.abs(a.weight - want) ? b : a)), font = loadFont(f.stem); let x = 0, prev = null;
  for (const ch of smart(text)) {
    const g = font.charToGlyph(ch);
    if (prev) { try { x += font.getKerningValue(prev, g) * size / font.unitsPerEm; } catch { /* no kerning table */ } }
    x += g.advanceWidth * size / font.unitsPerEm; prev = g;
  }
  return x;
}
// Two balanced lines in the display face: the split that keeps the longer line shortest, at the largest size from max down to min where both fit in w.
export function balance2(ctx, text, { w, max, min, step = 2 }) {
  const ws = text.split(/\s+/);
  for (let s = max; s >= min; s -= step) {
    let best = null;
    for (let i = 1; i < ws.length; i++) {
      const a = ws.slice(0, i).join(' '), b = ws.slice(i).join(' '), m = Math.max(measure(ctx, a, s), measure(ctx, b, s));
      if (!best || m < best.m) best = { m, lines: [a, b] };
    }
    if (best && best.m <= w) return { size: s, lines: best.lines, ok: true };
  }
  return { size: min, lines: [text], ok: false };
}
// the width of a line in one of the brand's faces ('body' or 'mono') at the loaded weight nearest to the one asked for
export function measureRole(ctx, role, text, size, want = 400) {
  const faces = ctx.faces.filter((x) => x.role === role && x.style !== 'italic');
  const f = faces.reduce((a, b) => (Math.abs(b.weight - want) < Math.abs(a.weight - want) ? b : a)), font = loadFont(f.stem); let x = 0, prev = null;
  for (const ch of smart(text)) {
    const g = font.charToGlyph(ch);
    if (prev) { try { x += font.getKerningValue(prev, g) * size / font.unitsPerEm; } catch { /* no kerning table */ } }
    x += g.advanceWidth * size / font.unitsPerEm; prev = g;
  }
  return x;
}

// ---- copy: nothing the brand wrote is printed twice on a page -------------------------------------------------------------------------
// The rule: no sentence of the brand's copy prints twice on one page, and no one of its lines (the primary line and the others) prints more
// than LINE_CAP times across the pages of the book. Pages choose their copy to keep it (the deck is the description, the pull quote is the
// first writeThis entry that is not a button label and not already a brief); copyGuard is the check, run on every page as it is built.
export const LINE_CAP = 3;
const sentencesOf = (s) => String(s || '').split(/(?<=[.!?])\s+/).map((t) => t.trim()).filter((t) => t.split(/\s+/).length >= 3);
// art drawn on the page as a figure (a screen or a sheet shown at a fraction of its size) sits between <!--art--> markers: it is a picture, like a photograph, so the guard reads past it
const flat = (html) => html.replace(/<!--art-->[\s\S]*?<!--\/art-->/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<svg[\s\S]*?<\/svg>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
const flatP = (html) => plain(flat(html));
const lineUse = new WeakMap(), warned = new Set();
// art: lines printed in art that is photographed (the fascia, the bag, the post), which no page's markup carries
export function copyGuard(ctx, id, html, art = []) {
  const B = ctx.brand, c = B.ui?.screen?.content || {}, pool = new Set();
  // the app fills its empty slots with one stock sentence (brandFromProject.js): a placeholder, not copy the brand wrote
  const add = (v) => { if (typeof v === 'string') sentencesOf(v).filter((t) => t !== 'Write this in your own words.').forEach((t) => pool.add(plain(t))); else if (Array.isArray(v)) v.forEach(add); else if (v && typeof v === 'object') Object.values(v).forEach(add); };
  [B.description, B.product, B.lines, B.voice, B.type?.sample, B.applications?.social, B.applications?.signage, c.deliveries, B.imagery?.shots?.map((s) => s.caption)].forEach(add);
  const text = flatP(html), count = (t, s) => text.split(s).length - 1, out = [];
  for (const s of pool) if (count(text, s) > 1) out.push(`"${s}" prints ${count(text, s)} times on ${id}`);
  // the brand's lines, counted across the pages built so far in this ctx (a page built again replaces its own count)
  const use = lineUse.get(ctx) || new Map(); lineUse.set(ctx, use);
  use.set(id, Object.fromEntries([B.lines.primary, ...B.lines.others].map((l) => [l, count(text, l) + art.filter((a) => a === l).length])));
  for (const l of [B.lines.primary, ...B.lines.others]) { const n = [...use.values()].reduce((a, u) => a + (u[l] || 0), 0); if (n > LINE_CAP) out.push(`the line "${l}" is printed ${n} times across the pages built so far, up to ${id} (cap ${LINE_CAP})`); }
  out.forEach((m) => { if (!warned.has(m)) { warned.add(m); console.warn(`[23-broadsheet] repeated copy: ${m}`); } });
  return html;
}
// A quotable sentence: short, a statement with a verb in it, not an instruction or a promise ("We name...", "Never...", "Every list says...").
const RULEISH = /^(we|you|your|never|always|use|write|say|name|keep|lead|put|make|avoid|give|if|no)\b|\b(never|always|must|every|don't|do not|should)\b|:/i;
const STATES = /\b(is|are|was|were|comes?|goes|gets?|means|runs?|reads?|stays?|lives?|starts?|ends?)\b/i;
export const quotable = (s) => s.length <= 48 && s.split(/\s+/).length >= 3 && !RULEISH.test(s) && STATES.test(s);
// The writeThis entry that tells a story: not a button label, not a sentence already on the page and not one of the brand's own lines (those are
// printed on the cover, the fascia and the post already). When none is left, a personality trait in the brand's own words.
export function pullQuote(ctx, avoid = []) {
  const B = ctx.brand, wt = B.voice.writeThis, btn = /button|press|click|label/i, nz = (t) => t.replace(/[.!?]+$/, ''), seen = new Set(avoid.flatMap(sentencesOf).map(nz));
  const own = new Set([B.lines.primary, ...B.lines.others].map(nz));
  // a quote that shares 4 or more words with one thing already on the page (the headline, the description) says it again
  const wds = (t) => new Set(String(t).toLowerCase().replace(/[^a-z0-9\s']/g, ' ').split(/\s+/).filter(Boolean)), pools = avoid.map(wds);
  const echoes = (t) => { const w = [...wds(t)]; return pools.some((p) => w.filter((x) => p.has(x)).length >= 4); };
  // or holds a whole line of the market report (three words or more) inside it
  const holds = (t) => avoid.some((a) => String(a).trim().split(/\s+/).length >= 3 && t.toLowerCase().includes(nz(String(a)).toLowerCase()));
  const clear = (t) => !sentencesOf(t).some((x) => seen.has(nz(x))) && !seen.has(nz(t)) && !echoes(t) && !holds(t);
  const ok = wt.filter((t) => !btn.test(t.because) && !own.has(nz(t.write)) && clear(t.write));
  // a short one reads as a pull quote; a sentence of three lines does not
  const short = ok.find((t) => t.write.length <= 48);
  if (short) return short;
  // else one short, quotable sentence out of a personality trait (a statement, not a rule); the rest of the trait becomes the note under it
  for (const p of B.personality || []) {
    const ss = String(p.means).split(/(?<=[.!?])\s+/), i = ss.findIndex((s) => quotable(s) && clear(s));
    if (i > -1) return { write: ss[i], because: ss.filter((_, k) => k !== i).join(' ') || `Personality: ${p.trait.toLowerCase()}.`, trait: p.trait };
  }
  if (ok.length) return ok[0];
  const tr = (B.personality || []).find((p) => clear(p.means));
  return tr ? { write: tr.means, because: `Personality: ${tr.trait.toLowerCase()}.` } : wt.find((t) => !btn.test(t.because)) || wt[0];
}
// The applications headline: something the brand wrote that the other pages do not print (not a brand line, the sign line, the typefaces headline, the
// cover brief, the pull quote q, or a sentence of the description or the type sample). It breaks only at a full stop, so it is one or two sentences,
// each on its own line, as large as 64 down to 48 allows. First choice: a written line of two sentences; then a short sentence from a personality
// trait (not the one the pull quote came from); then a written line of one. Null when nothing fits, and the page falls back to a brand line.
export function appsHead(ctx, q) {
  const B = ctx.brand, T = B.type?.sample || {}, btn = /button|press|click|label/i, sp = (t) => String(t || '').split(/(?<=[.!?])\s+/).map((x) => plain(x).replace(/[.!?]+$/, '').toLowerCase().trim()).filter(Boolean);
  const taken = new Set([B.lines.primary, ...B.lines.others, signLine(ctx), T.headline, T.paragraph, T.caption, B.description, B.voice.boilerplate25, q && q.write, B.voice.principles?.[1]?.example].flatMap(sp));
  const free = (t) => sp(t).every((x) => !taken.has(x));
  const fit = (text) => {
    const ss = text.split(/(?<=[.!?])\s+/);
    if (ss.length > 2) return null;
    for (let s = 64; s >= 48; s -= 2) if (ss.every((t) => measure(ctx, t, s) <= 1000)) return { size: s, lines: ss, ok: true };
    return null;
  };
  const written = [...B.voice.writeThis.filter((t) => !btn.test(t.because)).map((t) => t.write), ...(B.voice.principles || []).map((p) => p.example)].filter(free);
  const two = written.filter((t) => t.split(/(?<=[.!?])\s+/).length === 2), one = written.filter((t) => t.split(/(?<=[.!?])\s+/).length === 1);
  const trait = (B.personality || []).filter((p) => p.trait !== (q && q.trait)).flatMap((p) => String(p.means).split(/(?<=[.!?])\s+/)).filter((s) => s.length <= 48 && s.split(/\s+/).length >= 4 && free(s));
  for (const t of [...two, ...trait, ...one]) { const f = fit(t); if (f) return f; }
  return null;
}
// the week's list as a market report: a head, then one row per delivery (the thing, when it is there, what it costs), set on the grid.
// It hangs from the page's floor so the page ends on it, never on paper.
export function ledger(ctx, { bottom = G.floor, rows = 5, rowH = 64 } = {}) {
  const scr = ctx.brand.ui.screen, items = scr.content.deliveries.slice(0, rows), h = 40 + items.length * rowH, y = bottom - h;
  const r = items.map((d, i) => E(G.left, y + 40 + i * rowH, 'lg-row' + (i === items.length - 1 ? ' last' : ''), `<p class="b-deck lg-to">${A(d.to)}</p><p class="c-cap c-quiet lg-when">${A(i && items[i - 1].when === d.when ? 'As above' : d.when)}</p><p class="b-price lg-price">${A(d.price)}</p>`, { w: 1000, h: rowH })).join('');
  return E(G.left, y, 'c-label c-ink', A(scr.title), { w: 1000 }) + hr(G.left, y + 30, 1000, 1) + r;
}
// an alphabet block: the first set of lines (fewest lines first) that fits one size (largest from max down to min) across w
export const GLYPHS = {
  two: ['ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz', '0123456789 $%&'],
  three: ['ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz', '0123456789 $%&'],
  five: ['ABCDEFGHIJKLM', 'NOPQRSTUVWXYZ', 'abcdefghijklm', 'nopqrstuvwxyz', '0123456789 $%&'],
};
export function glyphLines(measureFn, { w, max, min, sets = [GLYPHS.three, GLYPHS.five] }) {
  for (const set of sets) for (let s = max; s >= min; s--) if (set.every((l) => measureFn(l, s) <= w)) return { size: s, lines: set };
  const last = sets[sets.length - 1]; return { size: min, lines: last };
}
// how many lines a paragraph takes in a column, set in one of the brand's faces (greedy, the way the browser breaks it)
export function linesIn(ctx, role, text, size, w, want = 400) {
  let n = 1, cur = '';
  for (const wd of text.split(/\s+/)) { const t = cur ? `${cur} ${wd}` : wd; if (!cur || measureRole(ctx, role, t, size, want) <= w) cur = t; else { n++; cur = wd; } }
  return n;
}
// the lines of brand copy the pages use, chosen so a page does not repeat what another has already said
export const signLine = (ctx) => { const B = ctx.brand, s = B.applications.signage || B.lines.primary; return s.includes(': ') ? s.slice(s.lastIndexOf(': ') + 2) : s; };
export const postLine = (ctx) => { const B = ctx.brand, soc = B.applications.social || []; return soc.find((l) => l !== B.lines.primary && l !== signLine(ctx)) || soc[1] || B.lines.primary; };
// the sheet's one story: the brand's own pick when it has one, else its second line (the intro's headline)
export const sheetLine = (ctx) => ctx.brand.lines.sheet || ctx.brand.lines.others[1];
// a price in a brief set beside the cover plate is the price of the ledger row the plate's caption names
export const plateExample = (ctx, ex) => {
  const B = ctx.brand, rows = B.ui.screen.content.deliveries, sh = plateBox(ctx, 'cover') && B.imagery.shots[(B.imagery.plates?.cover || {}).shot ?? 0];
  const pc = `${sh ? sh.caption || '' : ''} ${sh ? sh.alt || '' : ''}`.toLowerCase();
  const mine = rows.find((d) => pc.includes(d.to.split(/[,\s]/)[0].toLowerCase().replace(/s$/, '')));
  const hit = rows.find((d) => ex.includes(d.price));
  return mine && hit && mine !== hit ? ex.replace(hit.price, mine.price) : ex;
};
// the brief the sheet sets below its fold: the first written example that does not say the intro's headline again
export const foldLine = (ctx) => {
  const B = ctx.brand, words = (t) => new Set(String(t).toLowerCase().replace(/[^a-z0-9\s']/g, ' ').split(/\s+/).filter(Boolean)), h = words(B.lines.others[1]);
  const wt = B.voice.writeThis, t = wt.find((u) => [...words(u.write)].filter((x) => h.has(x)).length < 3) || wt[0];
  return t.write;
};
export const shopHead = (ctx) => [ctx.brand.lines.primary, ...ctx.brand.lines.others].find((l) => l !== signLine(ctx)) || signLine(ctx);

// a brief or quote in the display face, sized down when a word would not fit the column
// A wide display face (a stretched cut) sets at 32/36, so a long word keeps clear of the column edge.
export const ttl = (ctx, text, w, style = '') => {
  const wide = (ctx.brand.fonts.display.stretch || 100) > 100, s = titleSize(ctx, text, w - 8, wide ? 32 : 40), lh = s === 32 ? 36 : s === 40 ? 44 : Math.round(s * 1.1);
  return `<p class="b-title" style="font-size:${s}px;line-height:${lh}px;${style}">${A(text)}</p>`;
};
