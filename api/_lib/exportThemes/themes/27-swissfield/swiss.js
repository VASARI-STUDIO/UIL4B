// Swiss Field: the share ruler and everything computed from the brand's own data.
// A 56 px strip runs along the foot of every page, cut into the palette by share; a colour field may rise from its segment to full height.
// Nothing here names a colour id, a hex or a photo: roles, shares, colourways and faces all come from ctx.
import { esc } from '../../engine/brand.js';
import { loadFont } from '../../engine/nodeFont.js';

export const A = esc;
// escaped text with a no-break space after a one-letter word ("A fill"), so that word never ends a line alone
export const nb = (t) => esc(t).replace(/(^|\s)([AaI]) /g, '$1$2&nbsp;');
export const PAGE_W = 1920, PAGE_H = 1080, M = 80, RULER_Y = 1024, RULER_H = 56, MIN_SEG = 84;

// The chrome faces (meta.chrome and meta.fonts in index.js). Stems are the font file names in fonts/.
export const CHROME = { 400: 'HostGrotesk-400', 500: 'HostGrotesk-500' };
export const MONO = 'DMMono-400';

// The twelve Free pages, in order. Folios count these only, whatever the engine's 33-page numbering says.
export const FREE_PAGES = ['cover', 'personality', 'write-this', 'logo', 'clear-space', 'palette', 'contrast', 'typefaces', 'hierarchy', 'business-card', 'social', 'summary'];
export const folio = (id) => String(FREE_PAGES.indexOf(id) + 1).padStart(3, '0');

// ---- text measuring (opentype, the same files the browser loads) ----
export function textWidth(stem, text, size, track = 0) {
  const font = loadFont(stem);
  let x = 0, prev = null;
  for (const ch of String(text)) {
    const g = font.charToGlyph(ch);
    if (prev) { try { x += (font.getKerningValue(prev, g) * size) / font.unitsPerEm; } catch { /* no kerning data */ } }
    x += (g.advanceWidth * size) / font.unitsPerEm + track * size;
    prev = g;
  }
  return x;
}
// Greedy word wrap. The browser's balance keeps the line count, so this counts the lines it will set. A 1% margin covers rounding in the browser.
export function wrap(stem, text, size, maxW, track = 0) {
  const lines = []; let cur = '';
  for (const w of String(text).split(/\s+/).filter(Boolean)) {
    const next = cur ? `${cur} ${w}` : w;
    if (cur && textWidth(stem, next, size, track) > maxW * 0.99) { lines.push(cur); cur = w; } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}
export const faceStem = (ctx, role, weight) => (ctx.faces.find((f) => f.role === role && f.style !== 'italic' && f.weight === weight) || ctx.faces.find((f) => f.role === role)).stem;

// ---- colour ----
const lab = (hex, C) => { const o = C.toOklch(hex); return [o.L, o.C * Math.cos((o.H * Math.PI) / 180), o.C * Math.sin((o.H * Math.PI) / 180)]; };
// An OKLab mix from one colour toward another; t = 0 is `from`.
function mixHex(C, from, to, t) {
  const a = lab(from, C), b = lab(to, C);
  const L = a[0] + (b[0] - a[0]) * t, x = a[1] + (b[1] - a[1]) * t, y = a[2] + (b[2] - a[2]) * t;
  return C.fromOklch(L, Math.hypot(x, y), ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360);
}
// The largest mix toward `to` that still holds `min` : 1 against `bg`.
function mixAtLeast(C, from, to, bg, min) {
  for (let t = 1; t > 0; t -= 0.005) { const h = mixHex(C, from, to, t); if (C.ratio(h, bg) >= min) return h; }
  return from;
}

const cache = new WeakMap();
export function model(ctx) {
  if (cache.has(ctx)) return cache.get(ctx);
  const C = ctx.C, L = ctx.roles.light, up = (h) => h.toUpperCase();
  const cols = ctx.colours;
  const lum = (c) => C.luminance(c.hex);
  const ground = cols.find((c) => up(c.hex) === up(L.surface)) || cols.find((c) => c.role === 'ground') || [...cols].sort((a, b) => lum(b) - lum(a))[0];
  const text = cols.find((c) => up(c.hex) === up(L.text)) || [...cols].sort((a, b) => lum(a) - lum(b))[0];
  const action = cols.find((c) => up(c.hex) === up(L.action)) || cols.find((c) => c.role === 'action') || cols.find((c) => c !== ground && c !== text) || text;
  const others = cols.filter((c) => c !== ground).map((c, i) => ({ c, i })).sort((a, b) => ((b.c.share ?? 0) - (a.c.share ?? 0)) || a.i - b.i).map((o) => o.c);

  // ruler widths: share x 1920, the ground clamped to 45 to 70%, every colour at least 84 px (the shortfall comes off the ground), rounded by largest remainder to exactly 1920
  const gShare = typeof ground.share === 'number' ? ground.share : 0.5;
  let wG = gShare * PAGE_W;
  let wc = others.every((c) => typeof c.share === 'number') ? others.map((c) => c.share * PAGE_W) : others.map(() => ((1 - gShare) * PAGE_W) / others.length);
  const gMin = 0.45 * PAGE_W, gMax = 0.7 * PAGE_W;
  if (wG < gMin || wG > gMax) { wG = Math.min(gMax, Math.max(gMin, wG)); const rest = PAGE_W - wG, s = wc.reduce((a, b) => a + b, 0); wc = wc.map((w) => (w * rest) / s); }
  wc = wc.map((w) => Math.max(MIN_SEG, w));
  wG = PAGE_W - wc.reduce((a, b) => a + b, 0);
  const raw = [wG, ...wc], base = raw.map(Math.floor);
  let left = PAGE_W - base.reduce((a, b) => a + b, 0);
  raw.map((w, i) => ({ i, f: w - Math.floor(w) })).sort((a, b) => b.f - a.f || a.i - b.i).slice(0, left).forEach((o) => { base[o.i] += 1; });
  let x = 0;
  const segs = [ground, ...others].map((c, i) => { const s = { c, x, w: base[i], isGround: i === 0 }; x += base[i]; return s; });
  const groundW = segs[0].w, R = groundW - M;

  // the label colour on each field: the page's ink or its ground, whichever reads better; the build fails below 4.5 : 1
  const label = {}, tone2On = {}, quietOn = {};
  for (const c of cols) {
    const ink = C.ratio(L.text, c.hex), gr = C.ratio(L.surface, c.hex);
    const l = ink >= gr ? L.text : L.surface;
    if (Math.max(ink, gr) < 4.5) throw new Error(`Swiss Field: no label colour reaches 4.5 : 1 on ${c.name} (${c.hex})`);
    label[c.id] = l;
    tone2On[c.id] = mixAtLeast(C, l, c.hex, c.hex, 3.1);
    quietOn[c.id] = mixAtLeast(C, l, c.hex, c.hex, 4.6);
  }
  // the second tone on the ground: the quiet colour with its lightness raised until it first falls to 3.3 : 1 or less (never below 3.1), for type of 32 px and over
  const q = C.toOklch(L.quiet);
  let tone2 = L.quiet, lastGood = L.quiet;
  for (let l = q.L; l <= 1; l += 0.002) {
    const h = C.fromOklch(l, q.C, q.H), r = C.ratio(h, L.surface);
    if (r >= 3.1) lastGood = h;
    if (r <= 3.3) { tone2 = r >= 3.1 ? h : lastGood; break; }
  }
  const m = { C, L, ground, text, action, others, segs, groundW, R, label, tone2On, quietOn, tone2, segOf: (c) => segs.find((s) => s.c === c) };
  cache.set(ctx, m);
  return m;
}

// ---- small copy helpers ----
const NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
export const spell = (n) => (n >= 1 && n <= 12 ? NUM[n] : String(n));
export const fmtShare = (s) => `${+(s * 100).toFixed(1)}%`;
export const hexOf = (c) => c.hex.replace('#', '').toUpperCase();
export const cap1 = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const WEIGHT_NAMES = { 100: 'Thin', 200: 'ExtraLight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black' };
export const weightName = (w) => WEIGHT_NAMES[w] || String(w);
export const longDate = (iso) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
// "A sentence. The rest." -> the first sentence and what follows it
export function firstSentence(s) {
  const m = /^(.+?[.!?])(?:\s+(.*))?$/s.exec(String(s).trim());
  return m ? { first: m[1], rest: m[2] || '' } : { first: s, rest: '' };
}
// The two tones of a display statement (rule 4): two sentences split where they are; one sentence takes the brand's next line as its second tone.
export function twoTone(ctx, line, fallback) {
  const { first, rest } = firstSentence(line);
  return rest ? { t1: first, t2: rest } : { t1: first, t2: fallback || '' };
}

// ---- markup ----
// Everything on a page is placed with absolute coordinates, as the spec gives them. `a` makes a positioned box.
export const box = (style, inner = '', cls = '') => `<div class="a ${cls}" style="${style}">${inner}</div>`;
const px = (n) => `${Math.round(n * 100) / 100}px`;
export const at = (x, y, inner, { w, cls = '', style = '' } = {}) => box(`left:${px(x)};top:${px(y)};${w ? `width:${px(w)};` : ''}${style}`, inner, cls);

// the values a risen field carries, top-left: compact (name, share, hex) or full and stacked (adds HEX and RGB, and CMYK only when the data has it)
// Every line is the field's full label colour: group names are told from values by face (sans against mono), not by a dimmer tone.
export function valuesBlock(ctx, seg, mode, x0 = 12) {
  const m = model(ctx), C = m.C, c = seg.c, ink = m.label[c.id];
  const nameW = (sz) => textWidth(CHROME[500], c.name, sz);
  // a field too narrow for its name at 17 px with 12 px sides sets it at 16/20 (then 15/20) with 10 px sides; only if that fails too does the share take the name's line
  const fits = nameW(17) <= seg.w - 24 - 2;
  const small = !fits && [16, 15].find((sz) => nameW(sz) <= seg.w - 20 - 1);
  if (small) x0 = 10;
  const head = fits ? `<div class="c-head">${A(c.name)}</div><div class="c-value">${fmtShare(c.share ?? 0)}</div>`
    : small ? `<div class="c-head" style="font-size:${small}px;line-height:20px;margin:2px 0">${A(c.name)}</div><div class="c-value">${fmtShare(c.share ?? 0)}</div>`
      : `<div class="c-head">${fmtShare(c.share ?? 0)}</div><div class="c-value" style="visibility:hidden">0</div>`;
  // a turned ground fills most of the page, so its width is not its share: name and hex only, no percentage
  if (mode === 'turned') return at(x0, 48, `<div class="c-head">${A(c.name)}</div><div class="c-value">${hexOf(c)}</div>`, { style: `color:${ink}` });
  if (mode === 'compact') return at(x0, 48, `${head}<div class="c-value">${hexOf(c)}</div>`, { style: `color:${ink}` });
  const [r, g, b] = C.hexToRgb(c.hex);
  const grp = (name, lines, gap) => `<div style="margin-top:${gap}px"><div class="c-note">${name}</div>${lines.map((l) => `<div class="c-value">${A(l)}</div>`).join('')}</div>`;
  const cmyk = c.cmyk ? grp('CMYK', Array.isArray(c.cmyk) ? c.cmyk.map(String) : [String(c.cmyk)], 8) : '';
  return at(x0, 48, `${head}${grp('HEX', [hexOf(c)], 12)}${grp('RGB', [r, g, b].map(String), 8)}${cmyk}`, { style: `color:${ink}` });
}

// The ruler is an object: 1 px ticks every 10% of the page width hang from the strip's top edge, and 0 and 100% are printed at its two ends, just above it.
const TICK_H = 8, SCALE_Y = RULER_Y - 24;
export function ticksHtml(ctx, turned) {
  const m = model(ctx);
  const col = (x) => {
    if (x < m.groundW) return turned ? m.label[turned.id] : 'var(--quiet)';
    return m.label[(m.segs.find((s) => x >= s.x && x < s.x + s.w) || m.segs[m.segs.length - 1]).c.id];
  };
  let h = '';
  for (let k = 0; k <= 10; k++) { const x = Math.min(PAGE_W - 1, (PAGE_W / 10) * k); h += box(`left:${x}px;top:${RULER_Y}px;width:1px;height:${TICK_H}px;background:${col(x)}`); }
  return h;
}
export const scaleZero = (color) => at(6, SCALE_Y, '<span class="c-value">0</span>', { style: `color:${color}` });
export const scaleEnd = (color) => at(0, SCALE_Y, '<span class="c-value">100%</span>', { style: `left:auto;right:6px;color:${color}` });

// one colour segment of the ruler; risen, it runs the full page height and keeps its x and width, and a 1 px rule in the page ground cuts it at the strip's top edge
function segmentHtml(ctx, seg, mode, extra = '') {
  const m = model(ctx), c = seg.c, ink = m.label[c.id], risen = !!mode;
  const share = fmtShare(c.share ?? 0);
  const both = `${c.name} ${share}`;
  const l1 = textWidth(CHROME[500], both, 17) <= seg.w - 24 - 2 ? both : share;
  const foot = at(12, risen ? RULER_Y + 10 : 10, `<div class="c-head rl">${A(l1)}</div><div class="c-value">${hexOf(c)}</div>`, { style: `color:${ink}` });
  const cut = risen ? box(`left:0;top:${RULER_Y}px;width:100%;height:1px;background:var(--ground)`) : '';
  const end = risen && seg === m.segs[m.segs.length - 1] ? scaleEnd(ink) : '';
  return box(`left:${seg.x}px;top:${risen ? 0 : RULER_Y}px;width:${seg.w}px;height:${risen ? PAGE_H : RULER_H}px;background:${c.hex};color:${ink}`, `${risen ? valuesBlock(ctx, seg, mode) : ''}${extra}${cut}${end}${foot}`, 'seg');
}

// the ground's part of the strip: a hairline top edge, the ground's name and share, and the folio at the right margin
function groundSegmentHtml(ctx, id, turned) {
  const m = model(ctx), g = m.ground, seg = m.segs[0];
  const bg = turned ? turned.hex : g.hex, ink = turned ? m.label[turned.id] : null;
  const edge = box(`left:0;top:0;width:${seg.w}px;height:1px;background:${turned ? ink : 'var(--hair)'}`);
  const name = turned ? '' : at(M, 10, `<div class="c-head rl" style="color:var(--ink)">${A(g.name)} ${fmtShare(g.share ?? 0)}</div><div class="c-value" style="color:var(--quiet)">${hexOf(g)}</div>`);
  const fo = at(0, 10, `<span class="c-head rl fo">${folio(id)}</span>`, { style: `right:${seg.w - m.R}px;left:auto;color:${turned ? ink : 'var(--quiet)'}` });
  return box(`left:0;top:${RULER_Y}px;width:${seg.w}px;height:${RULER_H}px;background:${bg}`, `${edge}${name}${fo}`);
}

// where page content may run to: the left edge of the leftmost risen field, less the margin (the page's right margin when nothing rises)
export function contentR(ctx, rise = new Map()) {
  const s = model(ctx).segs.slice(1).find((g) => rise.get(g.c.id));
  return (s ? s.x : PAGE_W) - M;
}

// The running head. Standard: the brand at the left margin, the section at the middle of the ground, the version at the right margin.
// Cover: one line. Turned ground: three stacked lines on the white beside the turned ground.
function headHtml(ctx, id, kind) {
  const m = model(ctx), B = ctx.brand;
  const section = (ctx.pages.find((p) => p.id === id) || {}).section;
  if (kind === 'cover') return at(M, 48, `<span class="c-head" style="color:var(--ink)">Brand guidelines</span><span class="c-head" style="color:var(--quiet)">Version ${A(B.version.number)}, ${A(longDate(B.version.date)).replace(/ /g, '&nbsp;')}</span>`, { cls: 'rh-cover' });
  if (kind === 'turned') {
    const x = m.groundW + 48;
    return at(x, 48, `<div class="c-head" style="color:var(--ink)">${A(B.name)} brand guidelines</div>`) + at(x, 72, `<div class="c-head" style="color:var(--quiet)">${A(section ? section.title : '')}</div>`) + at(x, 96, `<div class="c-value" style="color:var(--quiet)">${A(B.version.number)}</div>`);
  }
  return at(M, 48, `<span class="c-head" style="color:var(--ink)">${A(B.name)} brand guidelines</span>`)
    + at(Math.round(m.groundW / 2), 48, `<span class="c-head" style="color:var(--quiet)">${A(section ? section.title : '')}</span>`)
    + at(0, 48, `<span class="c-value" style="color:var(--quiet)">${A(B.version.number)}</span>`, { style: `left:auto;right:${PAGE_W - m.R}px` });
}

// A whole page: the turned ground (if any), the ruler with its risen fields, the running head, then the page's own markup.
// rise: Map of colour id -> 'compact' | 'full'. Text that sits on a field goes inside it (turnedBody, fieldBody; coordinates are the field's own),
// so the checker measures it against the field's colour and not the page's.
export function page(ctx, id, { rise = new Map(), turned = null, turnedBody = '', fieldBody = new Map(), head = 'std', body = '' } = {}) {
  const m = model(ctx);
  const turnedDiv = turned ? box(`left:0;top:0;width:${m.groundW}px;height:${PAGE_H}px;background:${turned.hex};color:${m.label[turned.id]}`, turnedBody + scaleZero(m.label[turned.id])) : '';
  const segs = m.segs.slice(1).map((s) => segmentHtml(ctx, s, rise.get(s.c.id), fieldBody.get(s.c.id) || '')).join('');
  // the scale's two ends: on the ground side, and on the last field (inside it when it has risen, else on the page above it)
  const lastRisen = !!rise.get(m.segs[m.segs.length - 1].c.id);
  const ends = (turned ? '' : scaleZero('var(--quiet)')) + (lastRisen ? '' : scaleEnd('var(--quiet)'));
  return `<section class="pg" data-page="${id}">${turnedDiv}${segs}${groundSegmentHtml(ctx, id, turned)}${ticksHtml(ctx, turned)}${headHtml(ctx, id, head)}${ends}${body}</section>`;
}

// The two-tone page title (rule 4): the page name in ink, then one sentence in the second tone, set as one run.
// `sentences` lists candidates, longest first; the first that sets in two lines wins, else the last.
export function titleHtml(ctx, name, sentences, { x = M, y = 144, w } = {}) {
  const m = model(ctx), width = w || Math.min(1000, m.R - 80);
  const list = Array.isArray(sentences) ? sentences : [sentences];
  const pick = list.find((s) => wrap(CHROME[500], `${name}. ${s}`, 48, width, -0.02).length <= 2) || list[list.length - 1];
  return at(x, y, `<h1 class="c-title"><span style="color:var(--ink)">${A(name)}.</span> <span style="color:var(--tone2)">${A(pick)}</span></h1>`, { w: width });
}

// The tallest size from `sizes` at which both tones set within `maxLines`
export function pickSize(ctx, parts, sizes, maxW, maxLines, track = -0.01) {
  const stem = faceStem(ctx, 'display', ctx.weights.heading);
  for (const s of sizes) {
    const n = parts.reduce((a, t) => a + (t ? wrap(stem, t, s, maxW, track).length : 0), 0);
    if (n <= maxLines) return { size: s, lines: n };
  }
  const s = sizes[sizes.length - 1];
  return { size: s, lines: parts.reduce((a, t) => a + (t ? wrap(stem, t, s, maxW, track).length : 0), 0) };
}

// A display statement in two blocks, tone 1 then tone 2, its last line's bottom at `bottom`.
export function statementHtml(ctx, { t1, t2, size, x = M, maxW, bottom, c1, c2 }) {
  const lh = size >= 56 ? 0.95 : 1;
  return box(`left:${x}px;bottom:${PAGE_H - bottom}px;width:${maxW}px;font-size:${size}px;line-height:${lh}`, `<div class="disp" style="color:${c1}">${A(t1)}</div>${t2 ? `<div class="disp" style="color:${c2}">${A(t2)}</div>` : ''}`);
}

// which colourway of the logo sits on a given ground: the one whose ground is that hex, preferring the named order
export function colourwayOn(ctx, hex, prefer = []) {
  const cws = ctx.brand.logo.colourways, up = (h) => h.toUpperCase();
  const keys = Object.keys(cws).filter((k) => up(cws[k].ground) === up(hex));
  return prefer.find((k) => keys.includes(k)) || keys[0] || null;
}
export const logoH = (ctx, id, w) => (w * ctx.logo.geos[id].h) / ctx.logo.geos[id].w;
