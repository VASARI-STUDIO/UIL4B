// Theme 34, Set Square: a drawing set. Every page is a sheet: a drawn 12 x 6 grid of 96 px modules (origin x 64, y 72), a tick ruler on x 64, and a title block
// at the foot (not a running head). The graphic language is the dimension line (Brick, 45 degree ticks, a true measurement in a gap) and the leader.
// Every text colour comes from tones(ground), measured against the ground it sits on, so any palette builds. Brand copy goes through ctx.esc() or ghost() only;
// nothing here slices or splits a brand string (a slot placeholder is a sentinel).
import { readableOn, ratio, hexToRgb, rgbToHex } from '../../engine/color.js';

// series letter per section: A Brand, L Logo, C Colour, T Type, G Grid (layout), U In use, Z Close
export const SECTIONS = [
  { n: 1, name: 'Brand', ser: 'A', open: 'open-brand', pages: [['who', 'Who we are'], ['voice', 'Voice'], ['words', 'Words']] },
  { n: 2, name: 'Logo', ser: 'L', open: 'open-logo', pages: [['mark', 'The mark'], ['versions', 'Versions'], ['space', 'Space and size'], ['misuse', 'Misuse']] },
  { n: 3, name: 'Colour', ser: 'C', open: 'open-colour', pages: [['palette', 'Palette'], ['tints', 'Tints'], ['pairs', 'Pairs'], ['values', 'Values']] },
  { n: 4, name: 'Type', ser: 'T', open: 'open-type', pages: [['faces', 'Typefaces'], ['scale', 'Scale'], ['hierarchy', 'In use'], ['type-rules', 'Type rules']] },
  { n: 5, name: 'Layout', ser: 'G', open: 'open-layout', pages: [['grid', 'Grid'], ['compositions', 'Compositions']] },
  { n: 6, name: 'In use', ser: 'U', open: 'open-use', pages: [['digital', 'Digital'], ['print', 'Print'], ['social', 'Social']] },
  { n: 7, name: 'Close', ser: 'Z', open: 'open-close', pages: [['summary', 'On one page'], ['contact', 'Contact']] },
];
export const FULL = ['cover', 'contents', ...SECTIONS.flatMap((s) => [s.open, ...s.pages.map((p) => p[0])])];
// The Free edition: a fixed shorter list, chosen from the plan in the route (ctx.skeleton), never from a request.
export const SKELETON = ['cover', 'mark', 'palette', 'faces', 'pairs', 'values', 'summary'];
const FREE_TITLES = { values: 'Tokens', summary: 'Usage' };
export const brandOrder = (ctx) => (ctx.skeleton ? SKELETON : FULL);
export const CREDIT = 'Made with UIL4B';
export const pad2 = (n) => String(n).padStart(2, '0');
export const fullFolio = (id) => FULL.indexOf(id) + 1;

// Where a page sits in the set: its section, its sheet code ("C-02", "A-00" on an opener) and its title.
export function refOf(ctx, id) {
  for (const s of SECTIONS) {
    if (id === s.open) return { sec: s, sheet: `${s.ser}-00`, title: s.name };
    const i = s.pages.findIndex((p) => p[0] === id);
    if (i >= 0) return { sec: s, sheet: `${s.ser}-${pad2(i + 1)}`, title: (ctx.skeleton && FREE_TITLES[id]) || s.pages[i][1] };
  }
  return id === 'contents' ? { sec: null, sheet: 'A-00', title: 'Contents' } : { sec: null, sheet: 'A-00', title: 'Brand guidelines' };
}
// the sheet codes a section lists on its opener: "A-01" and the page title
export const sheetsOf = (s) => s.pages.map((p, i) => ({ id: p[0], sheet: `${s.ser}-${pad2(i + 1)}`, title: p[1], folio: fullFolio(p[0]) }));

// ---- colour ----
export const mix = (a, b, t) => { const A = hexToRgb(a), B = hexToRgb(b); return rgbToHex(A.map((v, i) => v + (B[i] - v) * t)); };
// The tones a page draws in on one ground. ink: the readable ink. quiet: ghost ink, the lowest contrast that still passes 4.6:1 (Bluestone 70% over Plaster is about 4.8).
// grid: the drawn grid, 8% ink on a light ground and 10% on a dark one. hair: a drawn rule. dim: the colour of a dimension (Brick where it passes 4.5:1, else the accent, else ink).
export function tones(ctx, ground) {
  const L = ctx.roles.light, G = groundsOf(ctx);
  const ink = readableOn(ground, [L.text, L.surface], { size: 16 });
  let quiet = ink;
  // quiet text also sits on the drawn grid and on a wash (up to about 14% of ink over the ground), so it has to hold 4.6:1 there as well
  const under = mix(ground, ink, 0.14), ok = (c) => ratio(c, ground) >= 5.3 && ratio(c, under) >= 4.6;
  if (ground === L.surface && ok(L.quiet)) quiet = L.quiet;
  else for (let f = 0.45; f <= 1.001; f += 0.025) { const c = mix(ground, ink, f); if (ok(c)) { quiet = c; break; } }
  const dark = ratio(ground, '#000000') < ratio(ground, '#FFFFFF');
  const dim = [G.primary, G.accent, ink].find((c) => ratio(c, ground) >= 4.5) || ink;
  return { ground, ink, quiet, dim, dark, hair: mix(ground, ink, 0.3), grid: mix(ground, ink, dark ? 0.1 : 0.08), wash: mix(ground, ink, 0.07) };
}
export const varsOf = (t) => `--g:${t.ground};--ink:${t.ink};--quiet:${t.quiet};--hair:${t.hair};--wash:${t.wash};--dim:${t.dim};--grid:${t.grid}`;
// the brand's colours by role: Plaster ground, White paper, Bluestone ink, Brick action, Timber accent
export function groundsOf(ctx) {
  const L = ctx.roles.light, cs = ctx.colours;
  const by = (role) => (cs.find((c) => c.role === role) || {}).hex;
  const primary = by('action') || cs[0].hex, ink = by('text') || L.text, panel = by('panel') || L.raised || L.surface;
  const accent = by('highlight') || by('accent fill') || (cs.find((c) => /accent/.test(c.role || '')) || {}).hex || primary;
  return { surface: by('ground') || L.surface, ink, primary, panel, accent, raised: L.raised || L.surface, sunken: L.sunken || L.surface };
}

// ---- geometry: the sheet ----
export function geo(ctx) {
  const W = ctx.size.w, H = ctx.size.h, portrait = H > W;
  // A4 portrait (794 x 1123): 7 x 10 modules from x 61, y 60 (the spec says y 72; the two-row title block needs the 12 px), the title block in two rows at the foot
  if (portrait) return { W, H, portrait, gx: 61, gy: 60, mod: 96, cols: 7, rows: 10, gx1: 61 + 7 * 96, gy1: 60 + 10 * 96, tb: 1030, ms: 11 };
  return { W, H, portrait, gx: 64, gy: 72, mod: 96, cols: 12, rows: 6, gx1: 64 + 12 * 96, gy1: 72 + 6 * 96, tb: 664, ms: 11 };
}
export const n1 = (v) => Math.round(v * 10) / 10;
export const at = (x, y, w, h, inner, { cls = '', style = '' } = {}) => `<div class="a ${cls}" style="left:${n1(x)}px;top:${n1(y)}px;${w != null ? `width:${n1(w)}px;` : ''}${h != null ? `height:${n1(h)}px;` : ''}${style}">${inner}</div>`;
export const hr = (x, y, w, c = 'var(--hair)', t = 1) => `<div class="a" style="left:${n1(x)}px;top:${n1(y)}px;width:${n1(w)}px;height:0;border-top:${t}px solid ${c}"></div>`;
export const vr = (x, y, h, c = 'var(--hair)', t = 1) => `<div class="a" style="left:${n1(x)}px;top:${n1(y)}px;width:0;height:${n1(h)}px;border-left:${t}px solid ${c}"></div>`;
export const mono = (t, cls = '') => `<span class="m ${cls}">${t}</span>`;
export const fill = (x, y, w, h, c, extra = '') => `<div class="a" style="left:${n1(x)}px;top:${n1(y)}px;width:${n1(w)}px;height:${n1(h)}px;background:${c};${extra}"></div>`;
export const svgAt = (x, y, w, h, inner) => `<svg class="a" style="left:${n1(x)}px;top:${n1(y)}px" width="${n1(w)}" height="${n1(h)}" viewBox="0 0 ${n1(w)} ${n1(h)}" aria-hidden="true">${inner}</svg>`;

// The drawn grid: 12 x 6 modules, 1 px hairlines; a tick ruler on x 64 (a tick every 24 px, longer every module); optional clip so a photo page draws only the part it leaves bare.
export function grid(ctx, { y0, y1, ruler = true } = {}) {
  const K = geo(ctx), a = y0 ?? K.gy, b = y1 ?? K.gy1;
  let p = '';
  for (let i = 0; i <= K.cols; i++) p += `<path d="M${K.gx + i * K.mod + 0.5} ${a}V${b}" />`;
  for (let j = 0; j <= K.rows; j++) { const y = K.gy + j * K.mod; if (y >= a && y <= b) p += `<path d="M${K.gx} ${y + 0.5}H${K.gx1}" />`; }
  let r = '';
  if (ruler) for (let y = K.gy; y <= K.gy1; y += 24) { if (y < a || y > b) continue; const long = (y - K.gy) % K.mod === 0; r += `<path d="M${K.gx - (long ? 14 : 8)} ${y + 0.5}H${K.gx}" />`; }
  return svgAt(0, 0, K.W, K.H, `<g stroke="var(--grid)" stroke-width="1" fill="none">${p}</g><g stroke="var(--quiet)" stroke-width="1" fill="none">${r}</g>`);
}

// A dimension line: 1 px in the dimension colour, 8 px ticks at 45 degrees (never arrows), the value in mono in a gap that takes the ground behind it.
// It only states a true measurement: the caller passes what it read from the layout. dir 'h' runs from (x, y) to (x + len, y); 'v' from (x, y) down to (x, y + len).
export function dim(ctx, dir, x, y, len, value, { ground, ext = 0 } = {}) {
  const t = tones(ctx, ground || ctx.roles.light.surface), c = t.dim, v = String(value), gapW = v.length * 7 + 14;
  const tick = (px, py) => `<path d="M${n1(px - 4)} ${n1(py + 4)}L${n1(px + 4)} ${n1(py - 4)}" />`;
  if (dir === 'h') {
    const mid = x + len / 2;
    return svgAt(x - 10, y - 10, len + 20, 20, `<g stroke="${c}" stroke-width="1" fill="none"><path d="M10 10H${n1(len / 2 + 10 - gapW / 2)}M${n1(len / 2 + 10 + gapW / 2)} 10H${len + 10}"/>${tick(10, 10)}${tick(len + 10, 10)}${ext ? `<path d="M10 ${10 - ext}V${10 + ext}M${len + 10} ${10 - ext}V${10 + ext}"/>` : ''}</g>`)
      + at(mid - gapW / 2, y - 8, gapW, 16, `<span class="m dm">${v}</span>`, { style: 'text-align:center;line-height:16px' });
  }
  const mid = y + len / 2;
  return svgAt(x - 10, y - 10, 20, len + 20, `<g stroke="${c}" stroke-width="1" fill="none"><path d="M10 10V${n1(len / 2 + 10 - 9)}M10 ${n1(len / 2 + 10 + 9)}V${len + 10}"/>${tick(10, 10)}${tick(10, len + 10)}${ext ? `<path d="M${10 - ext} 10H${10 + ext}M${10 - ext} ${len + 10}H${10 + ext}"/>` : ''}</g>`)
    + at(x - 24, mid - 8, 48, 16, `<span class="m dm" style="writing-mode:vertical-rl;transform:rotate(180deg);display:block;margin:-16px auto 0;height:48px;line-height:16px;text-align:center">${v}</span>`, { style: 'overflow:visible' });
}
// a dimension whose value sits on a fill (a band, a tint) rather than the sheet: the gap takes that colour, so a drawn line under it cannot lower the contrast
export const dimBg = (ctx, dir, x, y, len, value, bg, ext = 5) => dim(ctx, dir, x, y, len, value, { ground: bg, ext }).replace(/class="m dm" style="/g, `class="m dm" style="background:${bg};color:${tones(ctx, bg).dim};`).replace(/class="m dm">/g, `class="m dm" style="background:${bg};color:${tones(ctx, bg).dim}">`);
// A leader: a 1 px line in the ink-quiet tone ending in a 4 px dot, label 13 px at its far end.
export function leader(ctx, x1, y1, x2, y2, label, { align = 'left' } = {}) {
  const w = Math.abs(x2 - x1) + 8, h = Math.abs(y2 - y1) + 8, ox = Math.min(x1, x2) - 4, oy = Math.min(y1, y2) - 4;
  return svgAt(ox, oy, w, h, `<path d="M${x1 - ox} ${y1 - oy}L${x2 - ox} ${y2 - oy}" stroke="var(--quiet)" stroke-width="1" fill="none"/><circle cx="${x1 - ox}" cy="${y1 - oy}" r="2" fill="var(--ink)"/>`)
    + at(align === 'left' ? x2 + 8 : x2 - 208, y2 - 9, 200, 18, `<span class="lb" style="display:block;text-align:${align === 'left' ? 'left' : 'right'}">${label}</span>`);
}

// ---- the page frame ----
// The title block, not a running head: a hairline at y 664, values on the baseline at y 696, cells at x 64, 448, 736, 928 and 1216 (right aligned).
// Labels are Commissioner 11, values IBM Plex Mono 11. Free: the credit takes the last cell's place.
export function titleBlock(ctx, id) {
  const K = geo(ctx), R = refOf(ctx, id);
  const rev = String(ctx.versionLine || 'Version 1.0, November 2026').replace(/^Version/, 'Rev').replace(/([A-Z][a-z]{2})[a-z]* (\d{4})/, '$1 $2');
  const cell = (x, label, val, right = false, y = K.tb + 6) => at(right ? x - 200 : x, y, 200, 34, `<div class="lb" style="text-align:${right ? 'right' : 'left'}">${label}</div><div class="m i" style="margin-top:${K.portrait ? 0 : 3}px;text-align:${right ? 'right' : 'left'}">${val}</div>`);
  if (K.portrait) {
    // two rows: project, sheet and sheet no. over scale, issue and size (the credit on the Free edition)
    const y1 = K.tb + 4, y2 = K.tb + 47, last = ctx.skeleton ? cell(K.gx1, 'Made with', 'UIL4B', true, y2) : cell(K.gx1, 'Size', 'A4 portrait', true, y2);
    return `${hr(K.gx, K.tb, K.gx1 - K.gx, 'var(--ink)')}${cell(K.gx, 'Project', `${ownName(ctx)} brand guidelines`, false, y1)}${cell(K.gx + 336, 'Sheet', ctx.esc(R.title), false, y1)}${cell(K.gx1, 'Sheet no.', R.sheet, true, y1)}`
      + `${hr(K.gx, K.tb + 43, K.gx1 - K.gx)}${cell(K.gx, 'Scale', '1:1', false, y2)}${cell(K.gx + 336, 'Issue', rev, false, y2)}${last}`;
  }
  const last = ctx.skeleton ? cell(K.gx1, 'Made with', 'UIL4B', true) : cell(K.gx1, 'Issue', rev, true);
  return `${hr(K.gx, K.tb, K.gx1 - K.gx, 'var(--ink)')}${cell(64, 'Project', `${ownName(ctx)} brand guidelines`)}${cell(448, 'Sheet', ctx.esc(R.title))}${cell(736, 'Sheet no.', R.sheet)}${cell(928, 'Scale', '1:1')}${last}`;
}
const ownName = (ctx) => (typeof ctx.real === 'function' ? ctx.esc(ctx.real(ctx.brand.name)) : ctx.esc(ctx.brand.name));
export const realOf = (ctx, s) => (typeof ctx.real === 'function' ? ctx.real(s) : String(s));
export const own = (ctx, s) => ctx.esc(realOf(ctx, s));
export const UNNAMED = 'Your brand';
export const standIn = (ctx) => realOf(ctx, ctx.brand.name) === UNNAMED;

// A sheet: ground, the grid, the body, the title block. `grid: false` leaves the grid out (a photo page draws its own part of it); `block: false` drops the title block.
export function sheet(ctx, id, { ground, body = '', grid: g = true, gridOpts, block = true }) {
  const K = geo(ctx), t = tones(ctx, ground);
  return `<section class="pg ss" data-page="${id}" style="${varsOf(t)}">${g ? grid(ctx, gridOpts) : ''}${body}${block ? titleBlock(ctx, id) : ''}</section>`;
}

// the leaf an opener or a field takes: Bluestone, Brick or Timber (never grey)
export function leaf(ctx, n) {
  const G = groundsOf(ctx);
  const order = [G.ink, G.primary, G.ink, G.accent, G.primary, G.ink, G.accent];
  return order[(n - 1) % order.length];
}

// a rectangle of colour with its own tones for the text inside it
export const field = (ctx, x, y, w, h, ground, inner = '', style = '') => {
  const t = tones(ctx, ground);
  return `<div class="a" style="left:${n1(x)}px;top:${n1(y)}px;width:${n1(w)}px;height:${n1(h)}px;background:${ground};${varsOf(t)};color:var(--ink);${style}">${inner}</div>`;
};

// The display face measured: width of a string at a size (tracking included), cap height, and where the baseline falls in a line box of line-height 1.
export function measure(ctx) {
  const face = ctx.faces.find((f) => f.role === 'display' && f.style !== 'italic' && f.weight === ctx.weights.heading) || ctx.faces.find((f) => f.role === 'display');
  const font = ctx.loadFont(face.stem), upm = font.unitsPerEm;
  const cap = ((font.tables.os2 && font.tables.os2.sCapHeight) || 0.7 * upm) / upm;
  const width = (s, size, track = -0.035) => [...String(s)].reduce((a, ch) => a + font.charToGlyph(ch).advanceWidth * size / upm, 0) + track * size * [...String(s)].length;
  const fit = (s, w, max) => Math.min(max, (w / Math.max(width(s, 100), 1)) * 100);
  const hh = font.tables.hhea || {}, asc = (hh.ascender ?? font.ascender) / upm, desc = Math.abs((hh.descender ?? font.descender) / upm);
  const base = (1 - (asc + desc)) / 2 + asc;
  return { cap, width, fit, base };
}
// a display word with its baseline on an exact y
export const word = (M, x, base, text, size, { w, cls = '', style = '', track = -0.035 } = {}) =>
  at(x, base - size * M.base, w, size, text, { cls: `d ${cls}`, style: `font-size:${n1(size)}px;letter-spacing:${track}em;${style}` });

// ---- mockups and showcase switch ----
export const logoAr = (ctx) => (ctx.edition === 'slot' ? 1.36 : ctx.logo.geo.aspect);
export const mockupsOn = (ctx) => !!(ctx.theme && ctx.theme.mockups === true);

// A slot set as the content would be set: when the project has not written the field, a ghost line (`text`, in the quiet tone) with the engine's "what, how long and an
// example" under it as one mono note. When the project has written it, its own words.
export function ghost(ctx, value, path, text, opts = {}) {
  const h = ctx.esc(value);
  if (!ctx.placeholders || ctx.placeholders.label(h) === h) return h;
  const en = ctx.placeholders.entries.find((x) => x.path === path);
  if (!en) return h;
  const E = ctx.esc;
  return `<span class="ph-b" data-ph="${path}"><span class="ph-w">${E(text || en.what)}</span><span class="ph-m">${text && text !== en.what && opts.what !== false ? `${E(en.what)} ` : ''}${E(en.length)}.${en.first && opts.example !== false ? ` Example: ${E(en.example)}` : ''}</span></span>`;
}
// is this field still a placeholder (so the page lays out the ghost instead)
export const isGhost = (ctx, value) => !!ctx.placeholders && ctx.placeholders.label(ctx.esc(value)) !== ctx.esc(value);

// The slot photo: a field in the page's own colour, two diagonals in ghost ink, one mono note; cropped as the photo would be. Dimensions are drawn by the caller on the ground.
export function voidField(ctx, x, y, w, h, ground, note, { noteY } = {}) {
  const t = tones(ctx, ground), diag = `<svg class="a" style="left:0;top:0" width="${n1(w)}" height="${n1(h)}" viewBox="0 0 ${n1(w)} ${n1(h)}" preserveAspectRatio="none" aria-hidden="true"><path d="M0 0L${n1(w)} ${n1(h)}M${n1(w)} 0L0 ${n1(h)}" stroke="var(--quiet)" stroke-width="1" fill="none" vector-effect="non-scaling-stroke"/></svg>`;
  return field(ctx, x, y, w, h, ground, `${diag}${at(24, noteY ?? h - 44, w - 48, 20, `<span class="m nt">${note}</span>`)}`);
}
export const PHOTO_NOTE = 'Your photograph. Example: your work or your place, in daylight from the left.';
export const PHONE_NOTE = 'Your photograph. Example: a hand holding a phone, your work behind.';
// a rule the user has still to write, set as ghost type with one mono note under it (the slot edition of the Compositions page)
export const ghostRule = (ctx, line, note) => `<span class="ph-b"><span class="ph-w">${ctx.esc(line)}</span><span class="ph-m">${ctx.esc(note)}</span></span>`;

export function css(ctx, photoCss) {
  const B = ctx.brand, d = B.fonts.display, b = B.fonts.body, W = ctx.weights;
  return `.pg.ss{--mono:'IBM Plex Mono',monospace;--display:'${d.family}',sans-serif;--body:'${b.family}',sans-serif;
background:var(--g);color:var(--ink);font-family:var(--body);font-size:15px;line-height:22px;-webkit-font-smoothing:antialiased;font-kerning:normal;isolation:isolate;overflow:hidden}
.pg.ss :where(h1,h2,h3,p,div,span){margin:0;padding:0}
.pg.ss .a{position:absolute;box-sizing:border-box;min-width:0}
.pg.ss svg{display:block;overflow:visible}
.pg.ss .m{font:400 11px/16px var(--mono);letter-spacing:.02em;color:var(--quiet);font-variant-numeric:tabular-nums;white-space:nowrap}
.pg.ss .m.i{color:var(--ink)}
.pg.ss .m.w{white-space:normal}
.pg.ss .dm{font:400 11px/16px var(--mono);color:var(--dim);font-variant-numeric:tabular-nums;white-space:nowrap}
.pg.ss .nt{font:400 11px/16px var(--mono);color:var(--ink);white-space:normal}
.pg.ss .lb{font:400 11px/16px var(--body);color:var(--quiet);letter-spacing:.01em;white-space:nowrap}
.pg.ss .lb.i{color:var(--ink)}
.pg.ss .d{font-family:var(--display);font-weight:${W.heading};color:var(--ink);line-height:.9;white-space:nowrap;letter-spacing:-.035em}
.pg.ss .h1{font-size:48px;line-height:1.05;letter-spacing:-.025em;white-space:normal}
.pg.ss .h2{font-size:24px;line-height:1.2;letter-spacing:-.01em;white-space:normal}
.pg.ss .b{font-family:var(--body);font-weight:${W.regular};font-size:15px;line-height:22px;color:var(--ink);text-wrap:pretty;max-width:60ch}
.pg.ss .clip{overflow:hidden}
.pg.ss .rl:not(:has(.ph-b)),.pg.ss .rl .ph-w{text-decoration:line-through;text-decoration-color:var(--dim);text-decoration-thickness:2px}
.pg.ss .ph-b{display:block;width:auto;border:0;padding:0;text-align:inherit}
.pg.ss .ph-l{display:block;font:400 11px/16px var(--body);letter-spacing:.01em;color:var(--ink);font-style:normal;text-transform:none;margin:4px 0 0}
.pg.ss .ph-w{display:block;color:var(--quiet);font:inherit;letter-spacing:inherit;text-wrap:pretty;margin:0}
.pg.ss .ph-m{display:block;margin-top:8px;font:400 11px/16px var(--mono);letter-spacing:.02em;color:var(--quiet);white-space:normal;text-transform:none;font-weight:400;text-decoration:none;max-width:60ch}
.pg.ss .logo-slot svg{height:84%!important;width:auto!important;max-width:100%}
${photoCss}`;
}

// A finished sheet drawn small inside another: the section becomes a div (the harness and the contrast run read one section.pg per page), under its own data-page,
// with no page break of its own. The caller scales and positions it.
export const asArt = (html, name) => html.replace(/^<section class="pg ss" data-page="[^"]*" style="/, `<div class="pg ss" data-page="${name}" style="break-after:auto;break-inside:auto;`).replace(/<\/section>$/, '</div>');
