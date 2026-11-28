// Theme 33, Flyleaf: the grid, the grounds and the small drawing helpers the brand guideline pages share.
// Every page is placed on the grid in px (absolute boxes): 16:9 is 1280 x 720 on 12 columns, A4 portrait is 794 x 1123 on 6 columns, and each size is its own
// arrangement (a page function branches on K.portrait). Every text colour comes from tones(ground), measured against the ground it sits on, so a palette that
// cannot carry a pair still builds. Brand copy is read through ctx.esc() only; nothing here slices or splits a brand string (a placeholder is a sentinel).
import { readableOn, ratio, hexToRgb, rgbToHex } from '../../engine/color.js';

export const SECTIONS = [
  { n: 1, name: 'Brand', open: 'open-brand', pages: [['who', 'Who we are'], ['voice', 'Voice'], ['words', 'Words']] },
  { n: 2, name: 'Logo', open: 'open-logo', pages: [['mark', 'The mark'], ['versions', 'Versions'], ['space', 'Space and size'], ['misuse', 'Misuse']] },
  { n: 3, name: 'Colour', open: 'open-colour', pages: [['palette', 'Palette'], ['tints', 'Tints'], ['pairs', 'Pairs'], ['values', 'Values']] },
  { n: 4, name: 'Type', open: 'open-type', pages: [['faces', 'Typefaces'], ['scale', 'Scale'], ['hierarchy', 'In use'], ['type-rules', 'Rules']] },
  { n: 5, name: 'Layout', open: 'open-layout', pages: [['grid', 'Grid'], ['compositions', 'Compositions']] },
  { n: 6, name: 'In use', open: 'open-use', pages: [['digital', 'Digital'], ['print', 'Print'], ['social', 'Social']] },
  { n: 7, name: 'Close', open: 'open-close', pages: [['summary', 'On one page'], ['contact', 'Contact']] },
];
export const FULL = ['cover', 'contents', ...SECTIONS.flatMap((s) => [s.open, ...s.pages.map((p) => p[0])])];
// The Free edition: a fixed shorter list, chosen from the plan in the route (ctx.skeleton), never from a request.
export const SKELETON = ['cover', 'mark', 'palette', 'faces', 'pairs', 'values', 'summary'];
const FREE_TITLES = { values: 'Tokens', summary: 'Usage' };
export const brandOrder = (ctx) => (ctx.skeleton ? SKELETON : FULL);
export const CREDIT = 'Made with UIL4B';

// Where a page sits in the book: its section, its "3.1" reference and its title.
export function refOf(ctx, id) {
  for (const s of SECTIONS) {
    if (id === s.open) return { sec: s, ref: `${s.n}.0`, title: s.name, secTitle: `${s.n}.0 ${s.name}` };
    const i = s.pages.findIndex((p) => p[0] === id);
    if (i >= 0) return { sec: s, ref: `${s.n}.${i + 1}`, title: (ctx.skeleton && FREE_TITLES[id]) || s.pages[i][1], secTitle: `${s.n}.0 ${s.name}` };
  }
  return { sec: null, ref: '', title: id === 'contents' ? 'Contents' : 'Brand guidelines', secTitle: '' };
}
export const folioOf = (ctx, id) => Math.max(1, brandOrder(ctx).indexOf(id) + 1);
// the folio of a page in the full book (the contents and the section lists count the whole book)
export const fullFolio = (id) => FULL.indexOf(id) + 1;
export const pad2 = (n) => String(n).padStart(2, '0');

// ---- colour ----
export const mix = (a, b, t) => { const A = hexToRgb(a), B = hexToRgb(b); return rgbToHex(A.map((v, i) => v + (B[i] - v) * t)); };
// The tones a page draws in on one ground: ink, the quiet tone (the lowest contrast that still passes 4.6:1, so labels read but recede) and a hairline.
export function tones(ctx, ground) {
  const L = ctx.roles.light;
  const ink = readableOn(ground, [L.text, L.surface], { size: 16 });
  let quiet = ink;
  if (ground === L.surface && ratio(L.quiet, ground) >= 4.6) quiet = L.quiet;
  else for (let f = 0.45; f <= 1.001; f += 0.025) { const c = mix(ground, ink, f); if (ratio(c, ground) >= 4.6) { quiet = c; break; } }
  return { ground, ink, quiet, hair: mix(ground, ink, 0.24), wash: mix(ground, ink, 0.07) };
}
export const varsOf = (t) => `--g:${t.ground};--ink:${t.ink};--quiet:${t.quiet};--hair:${t.hair};--wash:${t.wash}`;

// ---- geometry ----
export function geo(ctx) {
  const W = ctx.size.w, H = ctx.size.h, portrait = H > W;
  const m = portrait ? { L: 64, R: 72, T: 64, Bm: 88, cols: 6, gut: 14 } : { L: 64, R: 64, T: 56, Bm: 64, cols: 12, gut: 16 };
  const cw = (W - m.L - m.R - (m.cols - 1) * m.gut) / m.cols;
  const x = (n) => m.L + (n - 1) * (cw + m.gut);
  const span = (a, b) => (b - a + 1) * cw + (b - a) * m.gut;
  const y0 = m.T + 48, y1 = H - m.Bm;
  // the example area: the right two thirds of a 16:9 page, the lower part of an A4 page
  const ex = portrait ? { x: x(1), y: 300, w: W - m.L - m.R, h: y1 - 300 } : { x: x(5), y: y0, w: span(5, 12), h: y1 - y0 };
  const tx = { x: x(1), y: y0, w: portrait ? span(1, 2) : span(1, 3) };
  return { W, H, portrait, ...m, cw, x, span, y0, y1, ex, tx, ms: portrait ? 9.5 : 10, body: portrait ? 13.5 : 14, k: portrait ? 0.95 : 1 };
}

// The display face measured, so a big word can be fitted to the room it has: width of a string at a size (tracking included) and the cap height as a share of the size.
export function measure(ctx) {
  const face = ctx.faces.find((f) => f.role === 'display' && f.style !== 'italic' && f.weight === ctx.weights.heading) || ctx.faces.find((f) => f.role === 'display');
  const font = ctx.loadFont(face.stem), upm = font.unitsPerEm;
  const cap = ((font.tables.os2 && font.tables.os2.sCapHeight) || 0.7 * upm) / upm;
  const width = (s, size, track = -0.02) => [...String(s)].reduce((a, ch) => a + font.charToGlyph(ch).advanceWidth * size / upm, 0) + track * size * [...String(s)].length;
  // the largest size (up to max) at which s fits in w
  const fit = (s, w, max) => Math.min(max, (w / Math.max(width(s, 100), 1)) * 100);
  // where the baseline falls in a line box of line-height 1, as a share of the size (so a big word can sit on an exact baseline)
  const hh = font.tables.hhea || {}, asc = (hh.ascender ?? font.ascender) / upm, desc = Math.abs((hh.descender ?? font.descender) / upm);
  const base = (1 - (asc + desc)) / 2 + asc;
  // the real ink of a string as shares of the size, above and below the baseline (old-style figures drop below it and some rise above the cap height): read from the glyph outlines
  const ink = (s) => {
    let top = 0, bot = 0;
    for (const ch of String(s)) { const bb = font.charToGlyph(ch).getBoundingBox(); top = Math.max(top, bb.y2 / upm); bot = Math.min(bot, bb.y1 / upm); }
    return { top, drop: -bot };
  };
  return { cap, width, fit, base, ink };
}
// brand copy a theme has to measure (never to print): the words behind a placeholder
export const realOf = (ctx, s) => (typeof ctx.real === 'function' ? ctx.real(s) : String(s));
// The real words of a string the PROJECT supplied (its name, colour names, role words, where a colour lands, what a pair is used for). The slot edition may hold
// these as placeholder sentinels; the registry keeps the real value and ctx.real() reads it back whole (a sentinel is never sliced). Only for strings the project
// wrote: copy the user still has to write (description, traits, lines) stays a placeholder and goes through ctx.esc().
export const own = (ctx, s) => ctx.esc(realOf(ctx, s));
// no project name: the real value behind the name is the engine's stand-in
export const UNNAMED = 'Your brand';
export const standIn = (ctx) => realOf(ctx, ctx.brand.name) === UNNAMED;

// ---- small builders ----
export const n1 = (v) => Math.round(v * 10) / 10;
export const at = (x, y, w, h, inner, { cls = '', style = '' } = {}) => `<div class="a ${cls}" style="left:${n1(x)}px;top:${n1(y)}px;${w != null ? `width:${n1(w)}px;` : ''}${h != null ? `height:${n1(h)}px;` : ''}${style}">${inner}</div>`;
export const hr = (x, y, w) => `<div class="a hr" style="left:${n1(x)}px;top:${n1(y)}px;width:${n1(w)}px"></div>`;
export const vr = (x, y, h) => `<div class="a vr" style="left:${n1(x)}px;top:${n1(y)}px;height:${n1(h)}px"></div>`;
export const mono = (t, cls = '') => `<span class="m ${cls}">${t}</span>`;
// a diagonal hairline across a box (a strike): the box is positioned by the caller
export const strike = (w, h, colour) => `<svg class="a" style="left:0;top:0" width="${n1(w)}" height="${n1(h)}" viewBox="0 0 ${n1(w)} ${n1(h)}" aria-hidden="true"><line x1="0" y1="${n1(h)}" x2="${n1(w)}" y2="0" stroke="${colour}" stroke-width="1" vector-effect="non-scaling-stroke"/></svg>`;

// ---- the page frame ----
// A content page: the running head (brand name, section, page title and folio, on fixed columns, a hairline under it) and the body. No footer line.
// A4 portrait (Minimalist 14, 15): a 1 px rule runs the full page height at x 32 with a dot at its foot, drawn over the page so it reads on every ground
export function rule4(ctx, K) {
  return K.portrait ? `<div class="a" style="left:32px;top:0;height:${K.H}px;width:0;border-left:1px solid var(--hair)"></div><div class="a" style="left:28px;top:${K.H - 44}px;width:9px;height:9px;border-radius:50%;background:var(--ink)"></div>` : '';
}
export function page(ctx, id, { ground = 'surface', body = '', creditOn }) {
  const K = geo(ctx), E = ctx.esc, B = ctx.brand, R = refOf(ctx, id), L = ctx.roles.light;
  const g = ground === 'surface' ? L.surface : ground;
  const t = tones(ctx, g);
  const c1 = K.x(1), c2 = K.portrait ? K.x(3) : K.x(4), c3 = K.portrait ? K.x(5) : K.x(7);
  const head = `${at(c1, K.T, K.span(1, K.portrait ? 2 : 3), 14, `<span class="m hd">${own(ctx, B.name)}</span>`)}${at(c2, K.T, K.span(1, K.portrait ? 2 : 3), 14, `<span class="m hd">${R.secTitle ? E(R.secTitle) : ''}</span>`)}${at(c3, K.T, K.portrait ? K.span(5, 5) : K.span(7, 10), 14, `<span class="m hd">${R.ref ? `${R.ref} ${E(R.title)}` : E(R.title)}</span>`)}${at(K.W - K.R - 60, K.T, 60, 14, `<span class="m hd">${pad2(folioOf(ctx, id))}</span>`, { style: 'text-align:right' })}${hr(K.L, K.T + 22, K.W - K.L - K.R)}`;
  return `<section class="pg fl" data-page="${id}" style="${varsOf(t)}">${head}${body}${rule4(ctx, K)}${creditHtml(ctx, K, creditOn || g)}</section>`;
}
// Free only: the credit line at the foot, right margin, in the quiet tone of the ground beneath it
export function creditHtml(ctx, K, ground) {
  if (!ctx.skeleton) return '';
  const t = tones(ctx, ground);
  return at(K.W - K.R - 200, K.H - (K.portrait ? 54 : 42), 200, 14, `<span class="m" style="color:${t.quiet}">${CREDIT}</span>`, { style: 'text-align:right' });
}
// A page with no running head (the cover and the section openers)
export function bare(ctx, id, { ground, body, creditOn }) {
  const K = geo(ctx), t = tones(ctx, ground);
  return `<section class="pg fl" data-page="${id}" style="${varsOf(t)}">${body}${rule4(ctx, K)}${creditHtml(ctx, K, creditOn || ground)}</section>`;
}

// The text column of a content page: the reference, a small title and a short line saying what the page shows.
export function textCol(ctx, id, line, { dy = 0 } = {}) {
  const K = geo(ctx), R = refOf(ctx, id), E = ctx.esc;
  return at(K.tx.x, K.tx.y + dy, K.tx.w, null, `<div class="m">${R.ref}</div><h2 class="d ti">${E(R.title)}</h2>${line ? `<p class="b tp">${line}</p>` : ''}`);
}

// ---- fields on other grounds ----
// a rectangle of colour with its own tones for the text inside it
export const field = (ctx, x, y, w, h, ground, inner = '', style = '') => {
  const t = tones(ctx, ground);
  return `<div class="a" style="left:${n1(x)}px;top:${n1(y)}px;width:${n1(w)}px;height:${n1(h)}px;background:${ground};${varsOf(t)};color:var(--ink);${style}">${inner}</div>`;
};

// ---- the brand's colours by role ----
export function groundsOf(ctx) {
  const L = ctx.roles.light, cs = ctx.colours;
  const by = (role) => (cs.find((c) => c.role === role) || {}).hex;
  const primary = by('action') || cs[0].hex, ink = by('text') || L.text, panel = by('panel') || L.sunken, accent = by('highlight') || primary;
  return { surface: L.surface, ink, primary, panel, accent, raised: L.raised || L.surface, sunken: L.sunken || L.surface };
}
// hex to "H S L" in degrees and percent
export function hslOf(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  let h = 0, s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}
// ---- mockups ----
// The theme-level switch for the photo scenes on the mockup pages (24, 26, 27 and the phone shot on 28). meta.mockups is set by the harness for the
// showcase and is never set for a real export, so a download always gets the flat pages on Graphite from the user's own content (Dylan's rule: mockups stay out of downloads).
// The aspect a logo box is laid out at. The slot placeholder draws the UIL4B mark at 84% of its box height (index.js), so a wide wordmark box leaves a tiny mark;
// at 1.36 the mark is as wide as the box, so a width asked for is the width seen. A real logo (showcase, or the user's own) keeps its own proportion.
export const logoAr = (ctx) => (ctx.edition === 'slot' ? 1.36 : ctx.logo.geo.aspect);
export const mockupsOn = (ctx) => !!(ctx.theme && ctx.theme.mockups === true);

// A slot set as the content would be set: when the project has not written this field, a ghost line (`text`, in the quiet tone, at the size of the surrounding
// copy) with the engine's "what, how long and an example" under it as one mono note. When the project has written it, its own words.
export function ghost(ctx, value, path, text) {
  const h = ctx.esc(value);
  // an unwritten field is a sentinel until the document is finished: the placeholders' label() changes it, and leaves written words alone
  if (!ctx.placeholders || ctx.placeholders.label(h) === h) return h;
  const en = ctx.placeholders && ctx.placeholders.entries.find((x) => x.path === path);
  if (!en) return h;
  const E = ctx.esc;
  return `<span class="ph-b ph-b--real" data-ph="${path}"><span class="ph-w">${E(text || en.what)}</span><span class="ph-m">${text && text !== en.what ? `${E(en.what)} ` : ''}${E(en.length)}.${en.first ? ` e.g. &quot;${E(en.example)}&quot;` : ''}</span></span>`;
}
