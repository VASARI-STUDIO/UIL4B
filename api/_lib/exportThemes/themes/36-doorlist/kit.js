// Theme 36, Doorlist: the book is the door list for one Saturday night. Every page is one name on it, and the list row along the foot (y 672 to 720, always Stock)
// carries the entry number, the name on a highlighter bar, whose guest it is, and the running count ("In: 14 of 31"). The grid is set by rows: fifteen of 48, ruled like a list.
// Every text colour comes from tones(ground), measured against the ground it sits on, so any palette builds. Brand copy goes through ctx.esc() or ghost() only;
// nothing here slices or splits a brand string. Encore's own words live in showcase.js only.
import { ratio, hexToRgb, rgbToHex } from '../../engine/color.js';
import { copy } from './showcase.js';

// ---- the book ----
// band: the colour of the section's wristband; ground: the opener's ground; ink: the section name's ink. Keys are roles of groundsOf: red, night, stage, stock.
export const SECTIONS = [
  { n: 1, name: 'Brand', open: 'open-brand', ground: 'night', band: 'red', ink: 'night', pages: [['who', 'Who we are'], ['voice', 'Voice'], ['words', 'Words']] },
  { n: 2, name: 'Logo', open: 'open-logo', ground: 'red', band: 'night', ink: 'stock', pages: [['mark', 'The mark'], ['versions', 'Versions'], ['space', 'Space and size'], ['misuse', 'Misuse']] },
  { n: 3, name: 'Colour', open: 'open-colour', ground: 'stock', band: 'red', ink: 'night', pages: [['palette', 'Palette'], ['tints', 'Tints'], ['pairs', 'Pairs'], ['values', 'Values']] },
  { n: 4, name: 'Type', open: 'open-type', ground: 'stage', band: 'stock', ink: 'night', pages: [['faces', 'Typefaces'], ['scale', 'Scale'], ['hierarchy', 'In use'], ['type-rules', 'Type rules']] },
  { n: 5, name: 'Layout', open: 'open-layout', ground: 'red', band: 'stock', ink: 'night', pages: [['grid', 'Grid'], ['compositions', 'Compositions']] },
  { n: 6, name: 'In use', open: 'open-use', ground: 'stock', band: 'night', ink: 'stock', pages: [['digital', 'Digital'], ['print', 'Print'], ['social', 'Social']] },
  { n: 7, name: 'Close', open: 'open-close', ground: 'night', band: 'red', ink: 'night', pages: [['summary', 'On one page'], ['contact', 'Contact']] },
];
export const FULL = ['cover', 'contents', ...SECTIONS.flatMap((s) => [s.open, ...s.pages.map((p) => p[0])])];
// The Free edition: a fixed shorter list, chosen from the plan in the route (ctx.skeleton), never from a request.
export const SKELETON = ['cover', 'mark', 'palette', 'faces', 'pairs', 'values', 'summary'];
export const brandOrder = (ctx) => (ctx.skeleton ? SKELETON : FULL);
export const fullFolio = (id) => FULL.indexOf(id) + 1;
export const pad = (n, w = 2) => String(n).padStart(w, '0');
export const sectionOf = (id) => SECTIONS.find((s) => s.open === id || s.pages.some((p) => p[0] === id));
// the name a page goes by on the list: the cover is "You", an opener is its section, a page its own title
export const titleOf = (id) => {
  if (id === 'cover') return 'You'; if (id === 'contents') return 'Contents';
  for (const s of SECTIONS) { if (s.open === id) return s.name; const p = s.pages.find((q) => q[0] === id); if (p) return p[1]; }
  return id;
};

// ---- colour ----
export const mix = (a, b, t) => { const A = hexToRgb(a), B = hexToRgb(b); return rgbToHex(A.map((v, i) => v + (B[i] - v) * t)); };
// The brand's four colours by role of use, whatever roles the project gave them: red (the action colour), night (the darkest), stock (the lightest), stage (a second dark
// ground: the next darkest of what is left when it carries the stock at 7:1, else night lifted 8 percent toward stock).
export function groundsOf(ctx) {
  const cs = ctx.colours.map((c) => c.hex), lum = (h) => ratio(h, '#000000');
  const red = (ctx.colours.find((c) => c.role === 'action') || ctx.colours[0]).hex;
  const rest = cs.filter((h) => h !== red).sort((a, b) => lum(a) - lum(b));
  const night = rest[0] || '#111111', stock = rest[rest.length - 1] || '#eeeeee';
  const mid = rest.slice(1, -1).find((h) => ratio(h, stock) >= 7);
  const stage = mid || mix(night, stock, 0.08);
  return { red, night, stage, stock, primary: red, ink: night, surface: stock, panel: stage };
}
// The tones a page draws in on one ground. ink: full text. quiet: ghost ink for small type (5.0:1 or more). soft: ghost ink for type of 24 px and up (3.4:1 or more).
// hair: a 1 px rule. wash: a faint field.
export function tones(ctx, ground) {
  const G = groundsOf(ctx);
  const cands = [G.night, G.stock, G.stage];
  let ink = cands.find((c) => ratio(c, ground) >= 7) || cands.slice().sort((a, b) => ratio(b, ground) - ratio(a, ground))[0];
  if (ratio(ink, ground) < 4.5) { const best = ['#ffffff', '#000000'].sort((a, b) => ratio(b, ground) - ratio(a, ground))[0]; if (ratio(best, ground) > ratio(ink, ground)) ink = best; }
  const find = (min) => { for (let f = 0.3; f <= 1.001; f += 0.02) { const c = mix(ground, ink, f); if (ratio(c, ground) >= min) return c; } return ink; };
  return { ground, ink, quiet: find(5.0), soft: find(3.4), hair: mix(ground, ink, 0.3), wash: mix(ground, ink, 0.08), sig: G.red, dark: ratio(ground, '#000000') < ratio(ground, '#FFFFFF') };
}
export const onTone = (ctx, fg, bg, min = 4.5) => (ratio(fg, bg) >= min ? fg : tones(ctx, bg).ink);
export const varsOf = (t) => `--g:${t.ground};--ink:${t.ink};--quiet:${t.quiet};--soft:${t.soft};--hair:${t.hair};--wash:${t.wash};--sig:${t.sig}`;

// ---- drawing ----
export const n1 = (v) => Math.round(v * 10) / 10;
export const at = (x, y, w, h, inner, { cls = '', style = '' } = {}) => `<div class="a ${cls}" style="left:${n1(x)}px;top:${n1(y)}px;${w != null ? `width:${n1(w)}px;` : ''}${h != null ? `height:${n1(h)}px;` : ''}${style}">${inner}</div>`;
export const hr = (x, y, w, c = 'var(--ink)', t = 1) => `<div class="a" style="left:${n1(x)}px;top:${n1(y)}px;width:${n1(w)}px;height:${t}px;background:${c}"></div>`;
export const vr = (x, y, h, c = 'var(--hair)', t = 1) => `<div class="a" style="left:${n1(x)}px;top:${n1(y)}px;width:${t}px;height:${n1(h)}px;background:${c}"></div>`;
export const fill = (x, y, w, h, c, extra = '') => `<div class="a" style="left:${n1(x)}px;top:${n1(y)}px;width:${n1(w)}px;height:${n1(h)}px;background:${c};${extra}"></div>`;
export const svgAt = (x, y, w, h, inner, cls = '') => `<svg class="a ${cls}" style="left:${n1(x)}px;top:${n1(y)}px" width="${n1(w)}" height="${n1(h)}" viewBox="0 0 ${n1(w)} ${n1(h)}" aria-hidden="true">${inner}</svg>`;
// a rectangle of colour with its own tones for the text inside it
export const field = (ctx, x, y, w, h, ground, inner = '', style = '') => `<div class="a" style="left:${n1(x)}px;top:${n1(y)}px;width:${n1(w)}px;height:${n1(h)}px;background:${ground};${varsOf(tones(ctx, ground))};color:var(--ink);overflow:hidden;${style}">${inner}</div>`;
// the highlighter bar: a square-ended Door red rectangle behind a name, with Night (the bar's own ink) on it
export const hl = (ctx, text, style = '') => `<span class="hl" style="${style}">${text}</span>`;

// The display face measured: width of a string at a size (tracking included), cap height, and where the baseline falls in a line box of line-height 1.
export function measure(ctx) {
  const face = ctx.faces.find((f) => f.role === 'display' && f.style !== 'italic' && f.weight === ctx.weights.heading) || ctx.faces.find((f) => f.role === 'display');
  const font = ctx.loadFont(face.stem), upm = font.unitsPerEm;
  const cap = ((font.tables.os2 && font.tables.os2.sCapHeight) || 0.7 * upm) / upm;
  const width = (s, size, track = -0.01) => [...String(s)].reduce((a, ch) => a + font.charToGlyph(ch).advanceWidth * size / upm, 0) + track * size * [...String(s)].length;
  const fit = (s, w, max) => Math.min(max, (w / Math.max(width(s, 100), 1)) * 100);
  const hh = font.tables.hhea || {}, asc = (hh.ascender ?? font.ascender) / upm, desc = Math.abs((hh.descender ?? font.descender) / upm);
  const base = (1 - (asc + desc)) / 2 + asc;
  return { cap, width, fit, base };
}
// a display word with its baseline on an exact y
export const word = (M, x, base, text, size, { w, cls = '', style = '' } = {}) =>
  at(x, base - size * M.base, w, size, text, { cls: `d ${cls}`, style: `font-size:${n1(size)}px;${style}` });
// a body or H1 line box whose first baseline sits on y: line-height lh, size px (Work Sans / Anybody sit about 0.8 of the line box below its top)
export const baseTop = (base, size, lh) => base - (lh - size) / 2 - size * 0.8;

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
export const ghostRule = (ctx, line, note) => `<span class="ph-b"><span class="ph-w">${ctx.esc(line)}</span>${note ? `<span class="ph-m">${ctx.esc(note)}</span>` : ''}</span>`;
export const PHOTO_NOTE = 'Your photograph. Example: the back of the room from the door, red light, people mid-song.';
// the customer's own name, or the showcase's: the cover and the list rows set it where the logo will go
export const nameOf = (ctx) => String((typeof ctx.real === 'function' ? ctx.real(ctx.brand.name) : ctx.brand.name) || '');

// ---- the list row ----
// y 672 to 720, always Stock. Entry number (mono) at x 48, the name on its bar at x 104, "Guest of" the section at x 648, the venue cell at x 948, the count right-aligned at 1232.
export const CREDIT = 'Made with UIL4B';
// A page on Stock gets a 2 px Night rule at its top. The Free 7 print "Made with UIL4B" (CREDIT) in the venue cell and keep the full-book count.
export function listRow(ctx, id) {
  const G = groundsOf(ctx), t = tones(ctx, G.stock), n = fullFolio(id), sec = sectionOf(id), free = !!ctx.skeleton;
  const E = ctx.esc, guest = sec && id !== 'cover' && id !== 'contents' ? sec.name : nameOf(ctx);
  const bar = tones(ctx, G.red).ink;
  // the last page closes the list: its venue cell says so
  const venue = free ? CREDIT : id === 'contact' ? 'List closed.' : copy(ctx, 'page.row.venue', nameOf(ctx));
  // A4 portrait: y 1075 to 1123 over 794. The number at x 40, the name at x 88, the venue cell at column 3 (x 406), the count right-aligned at 754. "Guest of" drops.
  if (portrait(ctx)) {
    return `<div class="a lr" style="left:0;top:1075px;width:794px;height:48px;background:${G.stock};${varsOf(t)}">`
      + `<div class="a" style="left:0;top:0;width:794px;height:2px;background:${G.night}"></div>`
      + `<div class="a mono13" style="left:40px;top:9px;width:48px;height:22px;line-height:22px">${pad(n)}</div>`
      + `<div class="a" style="left:88px;top:13px;height:22px;line-height:22px;white-space:nowrap"><span class="hlbar" style="background:${G.red};color:${bar}">${E(titleOf(id))}</span></div>`
      + `<div class="a cap" style="left:406px;top:10px;width:230px;line-height:22px;color:var(--ink);white-space:nowrap">${E(venue)}</div>`
      + `<div class="a mono13" style="left:554px;top:9px;width:200px;line-height:22px;text-align:right">In: ${n} of 31</div>`
      + '</div>';
  }
  return `<div class="a lr" style="left:0;top:672px;width:1280px;height:48px;background:${G.stock};${varsOf(t)}">`
    + `<div class="a" style="left:0;top:0;width:1280px;height:2px;background:${G.night}"></div>`
    + `<div class="a mono13" style="left:48px;top:9px;width:48px;height:22px;line-height:22px">${pad(n)}</div>`
    + `<div class="a" style="left:104px;top:13px;height:22px;line-height:22px;white-space:nowrap"><span class="hlbar" style="background:${G.red};color:${bar}">${E(titleOf(id))}</span></div>`
    + `<div class="a cap" style="left:648px;top:10px;width:280px;line-height:22px;color:var(--quiet);white-space:nowrap">Guest of ${E(guest)}</div>`
    + `<div class="a cap" style="left:948px;top:10px;width:240px;line-height:22px;color:var(--ink);white-space:nowrap">${E(venue)}</div>`
    + `<div class="a mono13" style="left:1032px;top:9px;width:200px;line-height:22px;text-align:right">In: ${n} of 31</div>`
    + '</div>';
}

export const portrait = (ctx) => !!ctx.size && ctx.size.h > ctx.size.w;

// A page: ground, body, list row. `over` is drawn after the list row (the grid page marks row 15 on it).
export function page(ctx, id, ground, body, over = '') {
  const t = tones(ctx, ground);
  return `<section class="pg dl" data-page="${id}" style="${varsOf(t)}">${body}${listRow(ctx, id)}${over}</section>`;
}

export function css(ctx, photoCss) {
  const B = ctx.brand, d = B.fonts.display, b = B.fonts.body, W = ctx.weights;
  return `.pg.dl{--mono:'DM Mono',monospace;--display:'${d.family}',sans-serif;--body:'${b.family}',sans-serif;
background:var(--g);color:var(--ink);font-family:var(--body);font-size:16px;line-height:24px;-webkit-font-smoothing:antialiased;font-kerning:normal;isolation:isolate;overflow:hidden}
.pg.dl :where(h1,h2,h3,p,div,span){margin:0;padding:0}
.pg.dl .a{position:absolute;box-sizing:border-box;min-width:0}
.pg.dl svg{display:block;overflow:visible}
.pg.dl .m{font:400 12px/16px var(--mono);letter-spacing:.02em;color:var(--ink);font-variant-numeric:tabular-nums;white-space:nowrap}
.pg.dl .m13,.pg.dl .mono13{font:400 13px/18px var(--mono);letter-spacing:.02em;color:var(--ink);font-variant-numeric:tabular-nums;white-space:nowrap}
.pg.dl .q{color:var(--quiet)}
.pg.dl .lb{font:600 11px/16px var(--body);letter-spacing:.08em;text-transform:uppercase;color:var(--ink);white-space:nowrap}
.pg.dl .lb.q{color:var(--quiet)}
.pg.dl .d{font-family:var(--display);font-weight:${W.heading};color:var(--ink);line-height:1;white-space:nowrap;letter-spacing:-.01em}
.pg.dl .h1{font-family:var(--display);font-weight:${W.heading};font-size:40px;line-height:1.1;letter-spacing:-.01em;color:var(--ink);white-space:normal}
.pg.dl .h2{font-family:var(--display);font-weight:${W.heading};font-size:22px;line-height:1.2;letter-spacing:0;color:var(--ink);white-space:normal}
.pg.dl .b{font:${W.regular || 400} 16px/24px var(--body);color:var(--ink);text-wrap:pretty;max-width:60ch}
.pg.dl .cap{font:400 13px/18px var(--body);color:var(--ink)}
.pg.dl .big{font-family:var(--display);font-weight:${W.heading};letter-spacing:-.01em;color:var(--ink);white-space:normal;text-wrap:balance}
.pg.dl .hlbar{display:inline-block;padding:0 6px;margin-left:-6px;height:22px;line-height:22px;font:600 15px/22px var(--body);letter-spacing:0;white-space:nowrap}
.pg.dl .hl{background:${groundsOf(ctx).red};color:${tones(ctx, groundsOf(ctx).red).ink};padding:0 6px;margin:0 -6px;-webkit-box-decoration-break:clone;box-decoration-break:clone}
.pg.dl .ph-b{display:block;width:auto;border:0;padding:0;text-align:inherit}
.pg.dl .ph-w{display:block;color:var(--quiet);font:inherit;letter-spacing:inherit;text-wrap:pretty;margin:0}
.pg.dl .h1 .ph-w,.pg.dl .big .ph-w,.pg.dl .d .ph-w{color:var(--soft)}
.pg.dl .h1.whog .ph-w{color:var(--quiet)}
.pg.dl .ph-m{display:block;margin-top:8px;font:400 12px/16px var(--mono);letter-spacing:.02em;color:var(--ink);white-space:normal;text-transform:none;font-weight:400;text-decoration:none;max-width:60ch}
.pg.dl .nt{font:400 12px/16px var(--mono);color:var(--ink);white-space:normal}
.pg.dl .lr .a{white-space:nowrap}
@keyframes dl-draw{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}
@media screen and (prefers-reduced-motion:no-preference){.pg.dl .draw{animation:dl-draw 600ms cubic-bezier(.23,1,.32,1) both}}
${photoCss}`;
}
