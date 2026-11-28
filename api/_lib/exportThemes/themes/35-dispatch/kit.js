// Theme 35, Dispatch: a consignment. Every page is a label on a parcel: a 96 px stub at the right (page time, page of 31, a Code 128 barcode that encodes the page, the mark)
// behind a perforation, and page times that run 10:00 to 12:00 in 4 minute steps. Heavy 4 px rules carry the structure, 1 px rules the minor rows.
// Every text colour comes from tones(ground), measured against the ground it sits on, so any palette builds. Brand copy goes through ctx.esc() or ghost() only;
// nothing here slices or splits a brand string (a slot placeholder is a sentinel). Kerbside's own words live in showcase.js only.
import { ratio, hexToRgb, rgbToHex } from '../../engine/color.js';
import { barcodeRects } from './barcode.js';
import { copy } from './showcase.js';

// ---- the book ----
export const SECTIONS = [
  { n: 1, name: 'Brand', open: 'open-brand', pages: [['who', 'Who we are'], ['voice', 'Voice'], ['words', 'Words']] },
  { n: 2, name: 'Logo', open: 'open-logo', pages: [['mark', 'The mark'], ['versions', 'Versions'], ['space', 'Space and size'], ['misuse', 'Misuse']] },
  { n: 3, name: 'Colour', open: 'open-colour', pages: [['palette', 'Palette'], ['tints', 'Tints'], ['pairs', 'Pairs'], ['values', 'Values']] },
  { n: 4, name: 'Type', open: 'open-type', pages: [['faces', 'Typefaces'], ['scale', 'Scale'], ['hierarchy', 'In use'], ['type-rules', 'Type rules']] },
  { n: 5, name: 'Layout', open: 'open-layout', pages: [['grid', 'Grid'], ['compositions', 'Compositions']] },
  { n: 6, name: 'In use', open: 'open-use', pages: [['digital', 'Digital'], ['print', 'Print'], ['social', 'Social']] },
  { n: 7, name: 'Close', open: 'open-close', pages: [['summary', 'On one page'], ['contact', 'Contact']] },
];
export const FULL = ['cover', 'contents', ...SECTIONS.flatMap((s) => [s.open, ...s.pages.map((p) => p[0])])];
// The Free edition: a fixed shorter list, chosen from the plan in the route (ctx.skeleton), never from a request.
export const SKELETON = ['cover', 'mark', 'palette', 'faces', 'pairs', 'values', 'summary'];
export const brandOrder = (ctx) => (ctx.skeleton ? SKELETON : FULL);
export const fullFolio = (id) => FULL.indexOf(id) + 1;
export const pad = (n, w = 2) => String(n).padStart(w, '0');
// page n sits at 10:00 plus 4 minutes a page
export const timeOf = (n) => { const m = 600 + 4 * (n - 1); return `${Math.floor(m / 60)}:${pad(m % 60)}`; };
export const titleOf = (id) => {
  if (id === 'cover') return 'Cover'; if (id === 'contents') return 'Contents';
  for (const s of SECTIONS) { if (s.open === id) return s.name; const p = s.pages.find((q) => q[0] === id); if (p) return p[1]; }
  return id;
};
export const CREDIT = 'Made with UIL4B';

// ---- colour ----
export const mix = (a, b, t) => { const A = hexToRgb(a), B = hexToRgb(b); return rgbToHex(A.map((v, i) => v + (B[i] - v) * t)); };
// the brand's colours by role: White ground, Concrete panel, Asphalt ink, Signal action
export function groundsOf(ctx) {
  const L = ctx.roles.light, cs = ctx.colours;
  const by = (role) => (cs.find((c) => c.role === role) || {}).hex;
  const primary = by('action') || cs[0].hex, ink = by('text') || L.text, surface = by('ground') || L.surface;
  // the light panel (Concrete): in the showcase it is the 'panel' role; a project's own colours may put it under another role, so take the first colour that carries the ink
  // at 7:1 or more, else a light wash of the ground
  const panel = [by('panel'), by('highlight'), L.raised].find((c) => c && ratio(c, ink) >= 7 && ratio(c, surface) < 3) || mix(surface, ink, 0.08);
  return { surface, ink, primary, panel };
}
// The tones a page draws in on one ground. ink: full text. quiet: ghost ink for small type (5.0:1 or more). soft: ghost ink for type of 24 px and up (3.4:1 or more).
// hair: a 1 px rule. perf: the perforation (ink at 40 percent).
export function tones(ctx, ground) {
  const G = groundsOf(ctx);
  const cands = [G.ink, G.panel, G.surface];
  let ink = cands.find((c) => ratio(c, ground) >= 7) || cands.slice().sort((a, b) => ratio(b, ground) - ratio(a, ground))[0];
  // a mid ground (a grey Signal) where none of the brand's three inks reaches 4.5: take pure white or black, whichever is clearer
  if (ratio(ink, ground) < 4.5) { const best = ['#ffffff', '#000000'].sort((a, b) => ratio(b, ground) - ratio(a, ground))[0]; if (ratio(best, ground) > ratio(ink, ground)) ink = best; }
  const find = (min) => { for (let f = 0.3; f <= 1.001; f += 0.02) { const c = mix(ground, ink, f); if (ratio(c, ground) >= min) return c; } return ink; };
  return { ground, ink, quiet: find(5.0), soft: find(3.4), hair: mix(ground, ink, 0.3), perf: mix(ground, ink, 0.4), wash: mix(ground, ink, 0.08), sig: G.primary, dark: ratio(ground, '#000000') < ratio(ground, '#FFFFFF') };
}
// a colour to draw type in on a ground: `fg` when it reads at `min`:1 or better, else the ground's own ink (a dark Signal on a near-black field would not)
// the colour of the UIL4B mark drawn behind a slot note: the ground nudged 12 percent toward its ink, or toward the other end when that would leave the note under 4.5:1
export function markTone(ctx, ground) {
  const ink = tones(ctx, ground).ink, c = mix(ground, ink, 0.12);
  return ratio(ink, c) >= 4.5 ? c : mix(ground, ratio(ink, "#000000") < ratio(ink, "#ffffff") ? "#ffffff" : "#000000", 0.12);
}
export const onTone = (ctx, fg, bg, min = 4.5) => (ratio(fg, bg) >= min ? fg : tones(ctx, bg).ink);
export const varsOf = (t) => `--g:${t.ground};--ink:${t.ink};--quiet:${t.quiet};--soft:${t.soft};--hair:${t.hair};--wash:${t.wash};--sig:${t.sig}`;

// ---- drawing ----
export const n1 = (v) => Math.round(v * 10) / 10;
export const at = (x, y, w, h, inner, { cls = '', style = '' } = {}) => `<div class="a ${cls}" style="left:${n1(x)}px;top:${n1(y)}px;${w != null ? `width:${n1(w)}px;` : ''}${h != null ? `height:${n1(h)}px;` : ''}${style}">${inner}</div>`;
export const hr = (x, y, w, c = 'var(--ink)', t = 4) => `<div class="a" style="left:${n1(x)}px;top:${n1(y)}px;width:${n1(w)}px;height:${t}px;background:${c}"></div>`;
export const vr = (x, y, h, c = 'var(--hair)', t = 1) => `<div class="a" style="left:${n1(x)}px;top:${n1(y)}px;width:${t}px;height:${n1(h)}px;background:${c}"></div>`;
export const fill = (x, y, w, h, c, extra = '') => `<div class="a" style="left:${n1(x)}px;top:${n1(y)}px;width:${n1(w)}px;height:${n1(h)}px;background:${c};${extra}"></div>`;
export const svgAt = (x, y, w, h, inner, cls = '') => `<svg class="a ${cls}" style="left:${n1(x)}px;top:${n1(y)}px" width="${n1(w)}" height="${n1(h)}" viewBox="0 0 ${n1(w)} ${n1(h)}" aria-hidden="true">${inner}</svg>`;
// a rectangle of colour with its own tones for the text inside it
export const field = (ctx, x, y, w, h, ground, inner = '', style = '') => `<div class="a" style="left:${n1(x)}px;top:${n1(y)}px;width:${n1(w)}px;height:${n1(h)}px;background:${ground};${varsOf(tones(ctx, ground))};color:var(--ink);overflow:hidden;${style}">${inner}</div>`;

// The display face measured: width of a string at a size (tracking included), cap height, and where the baseline falls in a line box of line-height 1.
export function measure(ctx) {
  const face = ctx.faces.find((f) => f.role === 'display' && f.style !== 'italic' && f.weight === ctx.weights.heading) || ctx.faces.find((f) => f.role === 'display');
  const font = ctx.loadFont(face.stem), upm = font.unitsPerEm;
  const cap = ((font.tables.os2 && font.tables.os2.sCapHeight) || 0.7 * upm) / upm;
  const width = (s, size, track = -0.025) => [...String(s)].reduce((a, ch) => a + font.charToGlyph(ch).advanceWidth * size / upm, 0) + track * size * [...String(s)].length;
  const fit = (s, w, max) => Math.min(max, (w / Math.max(width(s, 100), 1)) * 100);
  const hh = font.tables.hhea || {}, asc = (hh.ascender ?? font.ascender) / upm, desc = Math.abs((hh.descender ?? font.descender) / upm);
  const base = (1 - (asc + desc)) / 2 + asc;
  return { cap, width, fit, base };
}
// a display word with its baseline on an exact y
export const word = (M, x, base, text, size, { w, cls = '', style = '' } = {}) =>
  at(x, base - size * M.base, w, size, text, { cls: `d ${cls}`, style: `font-size:${n1(size)}px;${style}` });

// ---- slots ----
// A slot set as the content would be set: when the project has not written the field, a ghost line (`text`) with the engine's "what, how long and an example" under it
// as one mono note. When the project has written it, its own words.
export function ghost(ctx, value, path, text, opts = {}) {
  const h = ctx.esc(value);
  if (!ctx.placeholders || ctx.placeholders.label(h) === h) return h;
  const en = ctx.placeholders.entries.find((x) => x.path === path);
  if (!en) return h;
  const E = ctx.esc;
  return `<span class="ph-b" data-ph="${path}"><span class="ph-w">${E(text || en.what)}</span><span class="ph-m">${text && text !== en.what && opts.what !== false ? `${E(en.what)} ` : ''}${E(en.length)}.${en.first && opts.example !== false ? ` Example: ${E(en.example)}` : ''}</span></span>`;
}
export const isGhost = (ctx, value) => !!ctx.placeholders && ctx.placeholders.label(ctx.esc(value)) !== ctx.esc(value);
// a line the project has no field for, set as ghost type with one mono note under it
export const ghostRule = (ctx, line, note) => `<span class="ph-b"><span class="ph-w">${ctx.esc(line)}</span><span class="ph-m">${ctx.esc(note)}</span></span>`;
export const PHOTO_NOTE = 'Your photograph. Example: your work or your place, in daylight from the left.';
// the UIL4B mark (324 x 200), as the engine's logo slot draws it
export const MARK = { w: 323.61, h: 200, paths: ['M0 0H100V123.61A123.61 123.61 0 0 0 126.43 200H76.39A76.39 76.39 0 0 1 0 123.61Z', 'M125 0H177.79A47.21 47.21 0 0 1 225 47.21V125H276.39A47.21 47.21 0 0 1 323.61 172.21V200H201.39A76.39 76.39 0 0 1 125 123.61Z'] };

// ---- the stub ----
export const codeOf = (ctx, id) => `${copy(ctx, 'page.code', 'BRAND00')}-${pad(fullFolio(id), 3)}`;
function stubMark(ctx, ground) {
  const G = groundsOf(ctx), g = ctx.logo.geos.symbol, w = 32 * g.w / g.h;
  const cw = ground === G.primary ? 'on-signal' : ground === G.panel ? 'on-concrete' : ground === G.ink ? 'reversed' : 'colour';
  let html; try { html = ctx.logo.html('symbol', { width: w, colourway: cw }); } catch (e) { html = ctx.logo.html('symbol', { width: w }); }
  return at(1208, 640, w, 32, html);
}
export function stub(ctx, id, t) {
  const n = fullFolio(id), free = !!ctx.skeleton;
  const mono20 = (y, s) => at(1208, y, 72, 24, s, { cls: 'm20' });
  return `${svgAt(1183, 0, 2, 720, `<path d="M1 0V720" stroke="${t.perf}" stroke-width="2" stroke-dasharray="6 6" fill="none"/>`)}`
    + mono20(54, timeOf(n))
    + at(1208, 87, 72, 16, `${pad(n)}/31`, { cls: 'm13 q' })
    + svgAt(0, 0, 1280, 720, barcodeRects(codeOf(ctx, id), 1208, 200, 400, 48, { vertical: true, colour: t.ink }))
    + (free ? at(1208, 606, 72, 32, '<span class="lb">Made with</span><br><span class="lb">UIL4B</span>') : '')
    + stubMark(ctx, t.ground);
}

// ---- the A4 stub: the stub moves to the foot, y 1027 to 1123, under a perforation at y 1027. The page time and "n/31" on the left, the Code 128 barcode laid flat in the
// middle, the mark on the right (on Free the credit sits above it). Margins 40. ----
export const portrait = (ctx) => !!ctx.size && ctx.size.h > ctx.size.w;
export function stubA4(ctx, id, t) {
  const n = fullFolio(id), free = !!ctx.skeleton, G = groundsOf(ctx), g = ctx.logo.geos.symbol, mh = free ? 28 : 32, mw = mh * g.w / g.h;
  const cw = t.ground === G.primary ? 'on-signal' : t.ground === G.panel ? 'on-concrete' : t.ground === G.ink ? 'reversed' : 'colour';
  let html; try { html = ctx.logo.html('symbol', { width: mw, colourway: cw }); } catch (e) { html = ctx.logo.html('symbol', { width: mw }); }
  const right = 754;
  return svgAt(0, 1026, 794, 2, `<path d="M0 1H794" stroke="${t.perf}" stroke-width="2" stroke-dasharray="6 6" fill="none"/>`)
    + at(40, 1051, 120, 24, timeOf(n), { cls: 'm20' })
    + at(40, 1079, 120, 18, `${pad(n)}/31`, { cls: 'm13 q' })
    + svgAt(0, 0, 794, 1123, barcodeRects(codeOf(ctx, id), 184, 1051, 400, 48, { colour: t.ink }))
    + (free ? at(right - 100, 1040, 100, 14, '<span class="lb" style="font-size:10px;line-height:14px;display:block;text-align:right">Made with UIL4B</span>') : '')
    + at(right - mw, free ? 1067 : 1059, mw, mh, html);
}

// A page: ground, body, stub. `stub: false` drops the stub (a page that draws its own).
export function page(ctx, id, ground, body) {
  const t = tones(ctx, ground);
  return `<section class="pg ds" data-page="${id}" style="${varsOf(t)}">${body}${portrait(ctx) ? stubA4(ctx, id, t) : stub(ctx, id, t)}</section>`;
}

export const logoAr = (ctx) => (ctx.edition === 'slot' ? 1.36 : ctx.logo.geo.aspect);

export function css(ctx, photoCss) {
  const B = ctx.brand, d = B.fonts.display, b = B.fonts.body, W = ctx.weights;
  return `.pg.ds{--mono:'IBM Plex Mono',monospace;--display:'${d.family}',sans-serif;--body:'${b.family}',sans-serif;
background:var(--g);color:var(--ink);font-family:var(--body);font-size:15px;line-height:22px;-webkit-font-smoothing:antialiased;font-kerning:normal;isolation:isolate;overflow:hidden}
.pg.ds :where(h1,h2,h3,p,div,span){margin:0;padding:0}
.pg.ds .a{position:absolute;box-sizing:border-box;min-width:0}
.pg.ds svg{display:block;overflow:visible}
.pg.ds .m{font:400 11px/16px var(--mono);letter-spacing:.02em;color:var(--ink);font-variant-numeric:tabular-nums;white-space:nowrap}
.pg.ds .m13{font:400 13px/18px var(--mono);letter-spacing:.02em;color:var(--ink);font-variant-numeric:tabular-nums;white-space:nowrap}
.pg.ds .m20{font:400 20px/24px var(--mono);letter-spacing:0;color:var(--ink);font-variant-numeric:tabular-nums;white-space:nowrap}
.pg.ds .q{color:var(--quiet)}
.pg.ds .lb{font:600 11px/16px var(--body);letter-spacing:.08em;text-transform:uppercase;color:var(--ink);white-space:nowrap}
.pg.ds .lb.q{color:var(--quiet)}
.pg.ds .d{font-family:var(--display);font-weight:${W.heading};color:var(--ink);line-height:1;white-space:nowrap;letter-spacing:-.025em;font-variant-numeric:tabular-nums}
.pg.ds .h1{font-family:var(--display);font-weight:${W.heading};font-size:44px;line-height:1.06;letter-spacing:-.02em;color:var(--ink);white-space:normal}
.pg.ds .h2{font-family:var(--display);font-weight:${W.heading};font-size:21px;line-height:1.2;letter-spacing:-.01em;color:var(--ink);white-space:normal}
.pg.ds .b{font:${W.regular || 400} 15px/22px var(--body);color:var(--ink);text-wrap:pretty;max-width:60ch}
.pg.ds .cap{font:400 13px/18px var(--body);color:var(--ink)}
.pg.ds .big{font-family:var(--display);font-weight:${W.heading};letter-spacing:-.02em;color:var(--ink);white-space:normal;text-wrap:balance}
.pg.ds .rl:not(:has(.ph-b)),.pg.ds .rl .ph-w{text-decoration:line-through;text-decoration-color:var(--ink);text-decoration-thickness:2px}
.pg.ds .ph-b{display:block;width:auto;border:0;padding:0;text-align:inherit}
.pg.ds .ph-w{display:block;color:var(--quiet);font:inherit;letter-spacing:inherit;text-wrap:pretty;margin:0}
.pg.ds .h1 .ph-w,.pg.ds .big .ph-w{color:var(--soft)}
.pg.ds .ph-m{display:block;margin-top:8px;font:400 11px/16px var(--mono);letter-spacing:.02em;color:var(--ink);white-space:normal;text-transform:none;font-weight:400;text-decoration:none;max-width:60ch}
.pg.ds .nt{font:400 11px/16px var(--mono);color:var(--ink);white-space:normal}
.pg.ds .u{text-decoration:underline;text-decoration-color:var(--sig);text-decoration-thickness:6px;text-underline-offset:9px;text-decoration-skip-ink:none;white-space:nowrap}
.pg.ds .dn{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:var(--ink);color:var(--g);font:600 12px/1 var(--body);letter-spacing:0;vertical-align:top;flex:none}
.pg.ds .ex-ol path{fill:none;stroke:currentColor;stroke-width:1.5;vector-effect:non-scaling-stroke}
@keyframes ds-draw{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}
@media screen and (prefers-reduced-motion:no-preference){.pg.ds .draw{animation:ds-draw 700ms cubic-bezier(.23,1,.32,1) both}}
${photoCss}`;
}
