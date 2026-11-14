// Theme 30, Fluted, lane u1: the UI kit's chrome and its foundation pages (cover, contents, colour-light, colour-dark, type-scale, spacing, radii-borders, elevation).
// Every kit page keeps the band at y 768 to 1152, and what the reeds bend is the page's own data, never ornament: a window (a column with a round head, the
// theme's measure) whose width or height is a value of the kit. Above the band the real components (ctx.ui, componentsCss) sit on the surface they ship on,
// flat and unrestyled; the values are printed in the key row under the band. Colours come from ctx roles only; no brand colour id, hex or name is written here.
//
// For lanes u2 and u3 (import these read-only; never copy-edit them here):
//   kitPage(ctx, id, T, { marks, flat, shape, over, html })  the whole page: chrome (kit folio line), the glass with the marks bent in it, then html
//   modeT(ctx, mode)                                       the page tokens for the product's own light or dark surface (a page printed in that mode)
//   tower(x, w, top, { r, fill, stroke, sw, foot })          a mark standing on the band's foot: straight sides, a head of radius r (default w / 2, the window)
//   box(x, y, w, h, r, { fill, stroke, sw })               a free rounded box (any y), seen flat above the band and bent inside it
//   uiAt(ctx, T, x, y, w, inner, { mode, h, style })       a .ui region (the kit's tokens, light or dark) placed on the page
//   headline, lead, keyAt, put, marksOf, snap, P, LIP, BB, KEY   small layout pieces and the band's fixed lines
// This lane's css() writes the kit tokens and componentsCss(ctx) once, for the UI kit document only (ctx.kind === 'uikit'): the other kit lanes must not add them again.
// Every class here starts u1-.
import { A, put, shell, rect, tokens, adv, fitSize, lineTop, capH, logoHtml, GX, TXT } from './helpers.js';
import { warpPath } from './glass.js';
import { colourMap, tokenGroups } from '../../engine/tokens.js';
import { componentsCss } from '../../engine/components.js';

export { put };
export const P = 12;             // the reed pitch
export const LIP = 720;          // the top of the tallest mark on a page: 48 px of it flat above the band's top edge
export const BB = 1152, KEY = 1184;
const TRACK = -0.02;
export const snap = (x) => Math.round(x / P) * P;
const pad3 = (n) => String(n).padStart(3, '0');
const longDate = (iso) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const plural = (n, one, many) => `<span class="num">${n}</span> ${n === 1 ? one : many}`;
const mono = (s) => `<span class="v num">${A(s)}</span>`;

// ---------------------------------------------------------------- chrome (exported for the other kit lanes)

// the page tokens for one of the product's modes: the page is printed on that mode's surface, in its text roles
export function modeT(ctx, mode) {
  const R = ctx.roles[mode];
  return { light: mode === 'light', R, ground: R.surface, ink: R.text, soft: R.textSoft, quiet: R.quiet, hair: R.divider, panel: R.raised, strong: R.action, strongLabel: R.actionLabel };
}
export const editionMode = (T) => (T.light ? 'light' : 'dark');

// A rounded outline as a dense polyline: corners of radius rt at the top and rb at the bottom (each clamped to half the box). Returned as a path d.
function outlineD(x, y, w, h, rt, rb, closed) {
  const q = (cx, cy, r, a0, a1) => { const out = []; for (let a = a0; a <= a1 + 1e-9; a += 3) out.push([cx + r * Math.cos(a * Math.PI / 180), cy + r * Math.sin(a * Math.PI / 180)]); return out; };
  const t = Math.min(rt, w / 2, h), b = Math.min(rb, w / 2, h / 2);
  const pts = [[x, y + h - b], [x, y + t], ...(t ? q(x + t, y + t, t, 180, 270) : [[x, y]]), [x + w - t, y], ...(t ? q(x + w - t, y + t, t, 270, 360) : [[x + w, y]]), [x + w, y + h - b],
    ...(b ? q(x + w - b, y + h - b, b, 0, 90) : [[x + w, y + h]]), [x + b, y + h], ...(b ? q(x + b, y + h - b, b, 90, 180) : [[x, y + h]])];
  return `M${pts.map(([a, c]) => `${a.toFixed(2)} ${c.toFixed(2)}`).join('L')}${closed ? 'Z' : ''}`;
}
// one mark: its flat drawing (seen above the band), the same outline bent by the reeds (drawn over them, see warpPath), and a rect of its body for the glass to sample
function mark(x, top, w, foot, solid, ring, { fill = null, stroke = null } = {}) {
  const both = (d, paint) => { if (!d) return ['', '']; const wd = warpPath(d, 0, 0, {}); return [`<path d="${d}" ${paint}/>`, `<path d="${wd || d}" ${paint}/>`]; };
  const a = both(solid, `fill="${fill}"`), b = both(ring, `fill="${stroke}" fill-rule="evenodd"`);
  return { flat: a[0] + b[0], over: a[1] + b[1], body: fill ? rect(x, Math.round(Math.max(top, 768)), w, Math.max(0, foot - Math.max(top, 768)), fill) : '' };
}
// a tower standing on the band's foot (the theme's window when r is w / 2); a hollow one's line sits wholly inside its box
export function tower(x, w, top, { r = null, fill = null, stroke = null, sw = 2, foot = BB } = {}) {
  const rr = r == null ? w / 2 : r, h = foot - top;
  const ring = stroke ? outlineD(x, top, w, h, rr, 0, true) + outlineD(x + sw, top + sw, w - 2 * sw, h - sw, Math.max(0, rr - sw), 0, true) : '';
  return mark(x, top, w, foot, fill ? outlineD(x, top, w, h, rr, 0, true) : '', ring, { fill, stroke });
}
export function box(x, y, w, h, r, { fill = null, stroke = null, sw = 2 } = {}) {
  const ring = stroke ? outlineD(x, y, w, h, r, r, true) + outlineD(x + sw, y + sw, w - 2 * sw, h - 2 * sw, Math.max(0, r - sw), Math.max(0, r - sw), true) : '';
  return mark(x, y, w, y + h, fill ? outlineD(x, y, w, h, r, r, true) : '', ring, { fill, stroke });
}

// the page: the glass with its marks, the kit's folio line, and the html; the section carries the page tokens so a mode page reads its own roles
export function kitPage(ctx, id, T, { marks = [], flat = '', shape = '', over = '', html = '' } = {}) {
  const fl = flat + marks.map((m) => m.flat).join(''), sh = shape + marks.map((m) => m.body).join(''), ov = marks.map((m) => m.over).join('') + over;
  const out = shell(ctx, id, T, { flat: fl, shape: sh, fields: false, band: { over: ov }, html, left: `UI kit, version ${ctx.brand.version.number}` });
  const vars = `--ground:${T.ground};--ink:${T.ink};--soft:${T.soft};--quiet:${T.quiet};--hair:${T.hair};--panel:${T.panel};--strong:${T.strong};background:${T.ground};color:${T.ink}`;
  return out.replace('<section class="pg" ', `<section class="pg u1-pg" style="${vars}" `);
}

// the colours a page's marks take: the strong colour, then the brand's others by share, each kept only if it stands 0.12 OKLCH L off the ground
export function marksOf(ctx, T) {
  const L = (h) => ctx.C.toOklch(h).L, g = L(T.ground), lo = (h) => h.toLowerCase();
  const cs = ctx.colours.slice().sort((a, b) => b.share - a.share).map((c) => c.hex).filter((h) => lo(h) !== lo(T.ground) && lo(h) !== lo(T.strong));
  return [T.strong, ...cs].filter((h) => Math.abs(L(h) - g) >= 0.12);
}

export const headline = (ctx, l1, l2 = '', { y = 96, w = 777 } = {}) => {
  const s = Math.min(64, fitSize(ctx, 'display', l2 && l2.length > l1.length ? l2 : l1, 64, w / 1.03, TRACK, ctx.weights.heading, 40));
  return put(ctx, { x: 64, y, w, cls: 'disp', html: `<div style="font-size:${s}px;line-height:64px;color:var(--ink)">${A(l1)}</div>${l2 ? `<div style="font-size:${s}px;line-height:64px;color:var(--quiet)">${A(l2)}</div>` : ''}` });
};
export const lead = (ctx, html, { x = 64, y = 176, w = 468 } = {}) => put(ctx, { x, y, w, cls: 'body', style: 'white-space:normal', html });
export const keyAt = (ctx, x, w, html, cls = 'k', dy = 0) => put(ctx, { x, y: KEY + dy, w, cls, html });

// a .ui region: the kit's tokens for a mode, the real components inside, placed in page coordinates (its background is that mode's surface)
export const uiAt = (ctx, T, x, y, w, inner, { mode = editionMode(T), h = null, style = '' } = {}) =>
  `<div class="ui u1-ui"${mode === 'dark' ? ' data-theme="dark"' : ''} style="left:${x}px;top:${y}px;width:${w}px;${h ? `height:${h}px;` : ''}${style}">${inner}</div>`;

// the kit's tokens on every .ui region (light, and dark under data-theme), and the shipped component styles, unchanged
export function kitCss(ctx) {
  const g = tokenGroups(ctx), stretch = ctx.brand.fonts.display.stretch || 100;
  const decl = (o) => Object.entries(o).map(([k, v]) => `--${k}:${v};`).join('');
  return `.pg .ui{${decl(colourMap(ctx, 'light'))}${decl(g.space)}${decl(g.radius)}${decl(g.width)}${decl(g.font)}${decl(g.text)}${decl(g.shadow)}}
.pg .ui[data-theme="dark"]{${decl(colourMap(ctx, 'dark'))}}
${componentsCss(ctx).replace(/^\/\*[^\n]*\n/, '')}
.pg .ui .ui-display{font-stretch:${stretch}%}
.pg .ui :where(h1,h2,h3,p,ul,ol,dl,dd){margin:0;padding:0}`;
}

export function css(ctx) {
  return `${ctx.kind === 'uikit' ? kitCss(ctx) : ''}
.pg .u1-ui{position:absolute;isolation:isolate;white-space:normal}
.pg .u1-row{display:flex;flex-wrap:wrap;align-items:center;gap:12px}
.pg .u1-sw{position:absolute;width:32px;height:32px;box-sizing:border-box}
.pg .u1-col{display:flex;flex-direction:column;gap:8px}
.pg .u1-gap{position:relative;flex:none}
.pg .u1-gap i{position:absolute;left:-24px;top:0;bottom:0;width:9px;border:1px solid var(--quiet);border-left:0;box-sizing:border-box}
.pg .u1-gap span{position:absolute;left:-72px;top:50%;width:40px;margin-top:-10px;text-align:right;font:400 15px/20px var(--dm);color:var(--quiet);white-space:nowrap}
.pg .u1-well{display:flex;flex-direction:column;gap:12px;padding:20px;background:var(--sunken);border-radius:var(--r-card)}
`;
}

// ---------------------------------------------------------------- page pieces

const sc = (ctx) => ctx.brand.ui.screen.content;
// the first of the candidates that fits w whole at a size (measured, with the 3% the browser sets wider); else the last one, which then wraps
function fitting(ctx, role, list, size, weight, w) {
  const xs = list.filter((s) => typeof s === 'string' && s.length);
  return xs.find((s) => adv(ctx, role, s, size, 0, weight) * 1.03 <= w) || xs[xs.length - 1];
}
// lines a whole run takes in w (measured, never split)
const linesIn = (ctx, role, s, size, weight, w) => Math.max(1, Math.ceil(adv(ctx, role, s, size, 0, weight) * 1.06 / w));

// ---------------------------------------------------------------- colour (light and dark share one composition, so the two pages compare)

function colourPage(ctx, id, mode) {
  const T = modeT(ctx, mode), M = colourMap(ctx, mode), S = sc(ctx), F = S.form || {}, X = S.example || {};
  const r = (a, b) => ctx.fmt(ctx.ratio(a, b));
  const head = headline(ctx, mode === 'light' ? 'Colour, light' : 'Colour, dark');
  const leadH = lead(ctx, `Every role the components read, printed on the ${mode} surface itself. In the glass, each colour that carries text or a control edge, as tall as its contrast on this surface; the lines across it mark 4.5 : 1 and 3 : 1.`);
  // the fills, in two groups: a swatch, its name, its token, its value
  const row = (x, y, name, tok, hex) => `<div class="u1-sw a" style="left:${x}px;top:${y}px;background:${hex};border:1px solid ${ctx.ratio(hex, T.ground) < 1.5 ? T.quiet : hex}"></div>`
    + put(ctx, { x: x + 48, y: y + 6, w: 160, cls: 'kn', html: A(name) })
    + put(ctx, { x: x + 216, y: y + 6, w: 152, cls: 'v', html: A('--' + tok) })
    + put(ctx, { x: x + 376, y: y + 6, w: 92, cls: 'v num', align: 'right', html: A(hex.toUpperCase()) });
  const G1 = [['Surface', 'surface'], ['Raised', 'raised'], ['Sunken', 'sunken'], ['Scrim', 'scrim'], ['Control edge', 'edge'], ['Divider', 'divider'], ['Focus ring', 'focus']];
  const G2 = [['Action', 'action'], ['Action hover', 'action-hover'], ['Action pressed', 'action-pressed'], ['Action label', 'action-label'], ['Disabled', 'disabled-bg'], ['Disabled text', 'disabled-text']];
  const RY = 312, ST = 40;
  let html = put(ctx, { x: 64, y: 272, w: 468, cls: 'kn', html: 'Grounds and lines' }) + put(ctx, { x: 548, y: 272, w: 468, cls: 'kn', html: 'Action and states' });
  G1.forEach(([n, t], i) => { html += row(64, RY + i * ST, n, t, M[t]); });
  G2.forEach(([n, t], i) => { html += row(548, RY + i * ST, n, t, M[t]); });
  // at work: the real buttons, and every status chip, on this mode's surface
  const ui = ctx.ui, by = RY + G2.length * ST + 16, cy = RY + G1.length * ST + 16;
  html += uiAt(ctx, T, 548, by, 468, `<div class="u1-row">${ui.btn(F.book || 'Save')}${ui.btn(X.secondary || 'Edit', { variant: 'secondary' })}${ui.btn(F.book || 'Save', { disabled: true })}</div>`, { mode, style: 'background:transparent' })
    + uiAt(ctx, T, 64, cy, 468, `<div class="u1-row" style="gap:8px">${ctx.status.map((s) => ui.statusChip(s.id)).join('')}</div>`, { mode, style: 'background:transparent' });
  // the band: one column for each colour that carries text or an edge, as tall as its ratio on the surface (the tallest reaches the lip); lines at 4.5 and 3 : 1
  const inks = [['Text', 'text'], ['Soft', 'text-soft'], ['Quiet', 'quiet'], ['Action', 'action-text'], ['Edge', 'edge'], ['Focus', 'focus'], ['Success', 'success'], ['Warning', 'warning'], ['Danger', 'danger'], ['Info', 'info']];
  // a colour two roles share is one column, named for both
  const cols = [];
  for (const [nm, t] of inks) { if (!M[t]) continue; const same = cols.find((c) => M[c[1]].toLowerCase() === M[t].toLowerCase()); if (same) same[0] += `, ${nm.toLowerCase()}`; else cols.push([nm, t]); }
  const k = cols.length, CW = Math.floor((960 - P * (k - 1)) / k / P) * P, rs = cols.map(([, t]) => ctx.ratio(M[t], M.surface)), u = (BB - LIP) / Math.max(...rs);
  let keys = '';
  const ms = cols.map(([n, t], i) => {
    const x = 60 + i * (CW + P);
    keys += keyAt(ctx, x, CW, `${r(M[t], M.surface)} : 1`, 'v num') + put(ctx, { x, y: KEY + 22, w: CW, cls: 'kn', style: 'white-space:normal', html: A(n) });
    return tower(x, CW, BB - rs[i] * u, { fill: M[t] });
  });
  const line = (v) => `<rect x="0" y="${(BB - v * u - 0.5).toFixed(1)}" width="1080" height="1" fill="${T.quiet}"/>`;
  return kitPage(ctx, id, T, { marks: ms, over: line(4.5) + line(3), html: head + leadH + html + keys });
}

// ---------------------------------------------------------------- the pages

export const uikit = {
  // ---- 001 cover: the logo, the name of the document, and the product's own primary button many times its size, standing into the glass ----
  cover: (ctx) => {
    const T = tokens(ctx), B = ctx.brand, F = sc(ctx).form || {}, W = ctx.weights, label = F.book || 'Continue';
    const logo = `<div class="a" style="left:64px;top:96px">${logoHtml(ctx, T, 'colour', { width: 280 })}</div>`;
    const hs = Math.min(96, fitSize(ctx, 'display', 'UI kit', 96, 440 / 1.03, TRACK, W.heading, 48));
    const head = put(ctx, { x: 64, y: 224, w: 460, cls: 'disp', html: `<div style="font-size:${hs}px;line-height:96px;color:var(--ink)">UI kit</div><div style="font-size:${hs}px;line-height:96px;color:var(--quiet)">${A(`Version ${B.version.number}`)}</div>` });
    const prod = lead(ctx, A(B.product), { x: 548, y: 240, w: 468 });
    // the button: 44 px high, its label at the control size with 24 px either side (componentsCss), drawn k times its size, k the largest whole number up to 8 that fits 952 px
    const fs = 16, lw = adv(ctx, 'body', label, fs, 0, W.medium), bw1 = lw + 48, k = Math.max(3, Math.min(8, Math.floor(952 / (bw1 * 1.03))));
    const BW = snap(bw1 * k), BH = 44 * k, rad = ctx.radius.button * k, size = fs * k, line = size;
    // the label's line box ends above the band (it is page text, not glass); the button's lower part runs on into the reeds
    let cy = 768 - 8 - size / 2 + 4, base = cy + capH(ctx, 'body', size, W.medium) / 2, top = lineTop(ctx, 'body', size, line, base, W.medium);
    if (top + line > 764) { const d = top + line - 764; cy -= d; top -= d; }
    const bx = 60, by = Math.round(cy - BH / 2);
    const btn = box(bx, by, BW, BH, rad, { fill: T.strong });
    const fg = T.strongLabel;
    ctx.pair(fg, T.strong, { size, weight: W.medium, what: '(Button label on the cover)' });
    const lab = put(ctx, { x: bx, y: top, w: BW, h: line, align: 'center', plate: T.strong, fg, style: `font:${W.medium} ${size}px/${line}px var(--body);white-space:nowrap`, html: A(label) });
    const keys = keyAt(ctx, 64, 600, `The primary button, ${k} times its size: 44 px high, a radius of ${ctx.radius.button} px.`)
      + keyAt(ctx, 790, 226, A(longDate(B.version.date)), 'v num');
    return kitPage(ctx, 'cover', T, { marks: [btn], html: logo + head + prod + lab + keys });
  },

  // ---- 002 contents: the parts in columns, each page with its folio; in the band one window for each part, as wide as its pages ----
  contents: (ctx) => {
    const T = tokens(ctx), S = ctx.sections, n = S.length, M = marksOf(ctx, T), total = ctx.pages.length;
    const pitch = Math.floor(960 / n / P) * P, CW = pitch - 16, cx = (i) => 64 + i * pitch;
    const maxP = Math.max(...S.map((s) => s.pages.length)), unit = Math.max(6, Math.floor(CW / maxP / 6) * 6);
    const ws = S.map((s) => s.pages.length * unit), ys = LIP + Math.max(...ws) / 2;
    const head = headline(ctx, 'Contents');
    const leadH = lead(ctx, `${total} pages: the cover, these contents and ${n} parts. In the glass, one window for each part, ${unit} px wide for each of its pages.`);
    const ts = Math.min(...S.map((s) => fitSize(ctx, 'display', s.title, 28, CW / 1.03, TRACK, ctx.weights.heading, 18)));
    const fs = S.every((s) => s.pages.every((p) => adv(ctx, 'body', p.title, 16, 0, ctx.weights.regular) * 1.03 <= CW - 44)) ? 16 : 15;
    const RY = 360, RL = Math.min(28, Math.floor((LIP - 24 - RY) / maxP));
    let cols = '', keys = '';
    const ms = S.map((s, i) => {
      const x = cx(i);
      cols += `<div class="hair" style="left:${x}px;top:272px;width:${CW}px"></div>`
        + put(ctx, { x, y: 284, w: CW, cls: 'v num', html: String(s.n).padStart(2, '0') })
        + put(ctx, { x, y: 308, w: CW, cls: 'disp', html: `<span style="font-size:${ts}px;line-height:32px">${A(s.title)}</span>` })
        + s.pages.map((p, j) => put(ctx, { x, y: RY + j * RL, w: CW, h: RL, html: `<span style="font:400 ${fs}px/${RL}px var(--body);color:var(--soft)">${A(p.title)}</span><span class="num" style="position:absolute;right:0;top:0;font:400 ${TXT}px/${RL}px var(--dm);color:var(--quiet)">${pad3(p.no)}</span>` })).join('');
      keys += keyAt(ctx, x, CW, plural(s.pages.length, 'page', 'pages'));
      return tower(x - 4, ws[i], ys - ws[i] / 2, { fill: M[i % M.length] });
    });
    return kitPage(ctx, 'contents', T, { marks: ms, html: head + leadH + cols + keys });
  },

  'colour-light': (ctx) => colourPage(ctx, 'colour-light', 'light'),
  'colour-dark': (ctx) => colourPage(ctx, 'colour-dark', 'dark'),

  // ---- 005 type scale: each step set at its size in the product's own words, largest first; in the band one window per step, 6 px wide for each px of type ----
  'type-scale': (ctx) => {
    const T = tokens(ctx), B = ctx.brand, S = sc(ctx), F = S.form || {}, D = S.dialog || {}, E = S.empty || {};
    const cand = { headline: [S.eta, S.time, E.title], title: [S.rider, F.title, S.time], 'title-s': [D.title, E.title, F.title], control: [F.book, (S.example || {}).secondary],
      body: [S.pickup, S.riderNote, E.body], label: [F.pickup, F.dropoff], caption: [F.notesHelp, F.bookWhy] };
    const steps = [...ctx.uiType].sort((a, b) => b.size - a.size), n = steps.length, SW = 580, stretch = B.fonts.display.stretch || 100;
    const rows = steps.map((t) => {
      const role = t.face === 'display' ? 'display' : 'body', text = fitting(ctx, role, [...(cand[t.token] || []), t.use], t.size, t.weight, SW);
      return { t, role, text, h: linesIn(ctx, role, text, t.size, t.weight, SW) * t.line };
    });
    const top = 288, room = LIP - 48 - top, gap = Math.min(40, Math.floor((room - rows.reduce((a, r) => a + r.h, 0)) / (n - 1)));
    const fam = [B.fonts.display.family, B.fonts.body.family], one = fam[0] === fam[1];
    const head = headline(ctx, 'Type scale');
    const leadH = lead(ctx, `${n} sizes, each set here at the size it ships, in the product's own words. ${one ? `One face, ${A(fam[0])}: titles in ${ctx.weights.heading}, everything people read and press in ${ctx.weights.regular} and ${ctx.weights.medium}.` : `${A(fam[0])} for titles, ${A(fam[1])} for everything people read and press.`}`);
    let y = top, html = '';
    rows.forEach(({ t, role, text, h }) => {
      const face = role === 'display' ? `font-family:var(--display);font-stretch:${stretch}%` : 'font-family:var(--body)';
      html += `<div class="hair" style="left:64px;top:${y - Math.round(gap / 2)}px;width:952px"></div>`
        + put(ctx, { x: 64, y, w: SW, style: `${face};font-size:${t.size}px;line-height:${t.line}px;font-weight:${t.weight};color:var(--ink);white-space:normal`, html: A(text) })
        + put(ctx, { x: 669, y: y + Math.max(0, (t.line - 20) / 2), w: 105, cls: 'kn', html: A(t.token) })
        + put(ctx, { x: 790, y: y + Math.max(0, (t.line - 20) / 2), w: 226, cls: 'v num', html: A(`${t.size} / ${t.line} / ${t.weight}`) });
      y += h + gap;
    });
    // the windows: width 6 px per px of type (less if the row would overrun), solid for the display face, an outline for the body face
    const sum = steps.reduce((a, t) => a + t.size, 0), u = Math.min(6, Math.floor((960 - P * (n - 1)) / sum / 0.5) * 0.5);
    const ws = steps.map((t) => Math.round(t.size * u)), ys = LIP + Math.max(...ws) / 2;
    let x = 60, keys = '';
    const ms = steps.map((t, i) => {
      const m = tower(x, ws[i], ys - ws[i] / 2, t.face === 'display' ? { fill: T.strong } : { stroke: T.ink });
      keys += keyAt(ctx, x, Math.max(ws[i], 64), A(t.token), 'kn') + keyAt(ctx, x, Math.max(ws[i], 64), `${t.size} px`, 'v num', 22);
      x += ws[i] + P;
      return m;
    });
    keys += keyAt(ctx, 64, 952, `${u} px of window for each px of type. Solid: ${one ? 'the title steps' : A(fam[0])}. Outline: ${one ? 'the reading steps' : A(fam[1])}.`, 'k', 56);
    return kitPage(ctx, 'type-scale', T, { marks: ms, html: head + leadH + html + keys });
  },

  // ---- 006 spacing: the steps as a list, a real form group measured in them; in the band a row of windows whose gaps are the steps, three times their size ----
  spacing: (ctx) => {
    const T = tokens(ctx), sp = ctx.space, n = sp.length, base = ctx.brand.ui.spacingBase, F = sc(ctx).form || {}, ui = ctx.ui;
    const names = Object.keys(tokenGroups(ctx).space);
    const head = headline(ctx, 'Spacing');
    const sum = sp.reduce((a, s) => a + s.px, 0), WW = 36, k = Math.min(3, Math.floor((960 - (n + 1) * WW) / sum * 4) / 4);
    const leadH = lead(ctx, `A ${base} px step. Every gap and padding in the kit is one of these ${n}, A gap inside a group is smaller than the gap between groups.`);
    // the list: token and value, one row a step
    const LY = 296, LS = Math.min(40, Math.floor((LIP - 48 - LY) / n));
    let html = sp.map((s, i) => `<div class="hair" style="left:64px;top:${LY + i * LS - 8}px;width:468px"></div>`
      + put(ctx, { x: 64, y: LY + i * LS, w: 180, cls: 'v', html: A(`--${names[i] || s.token}`) })
      + put(ctx, { x: 306, y: LY + i * LS, w: 105, cls: 'kn num', html: `${s.px} px` })).join('');
    // the form group: two fields 16 apart inside the group, the button 32 below it, each gap marked with its value
    const pick = (px) => (sp.find((s) => s.px === px) || sp[Math.min(n - 1, 3)]).px;
    const gIn = pick(16), gOut = pick(32);
    const gapEl = (px) => `<div class="u1-gap" style="height:${px}px"><i></i><span>${px}</span></div>`;
    const form = `<div style="display:flex;flex-direction:column;width:360px">${ui.field({ id: 'u1-sp1', label: F.pickup || 'Name', value: F.pickupValue || '' })}${gapEl(gIn)}`
      + `${ui.field({ id: 'u1-sp2', label: F.dropoff || 'Email', value: F.dropoffValue || '' })}${gapEl(gOut)}<div>${ui.btn(F.book || 'Save')}</div></div>`;
    html += put(ctx, { x: 656, y: 264, w: 360, cls: 'kn', html: 'Inside a group, then between groups' }) + uiAt(ctx, T, 656, 296, 360, form, { style: 'background:transparent' });
    // the band: n + 1 windows WW wide, the gap after each the next step times k
    let x = 60, keys = '';
    const ms = [];
    for (let i = 0; i <= n; i++) {
      ms.push(tower(x, WW, LIP, { fill: T.strong }));
      if (i < n) { const g = snap(sp[i].px * k) || P; keys += put(ctx, { x: x + WW + g / 2 - 24, y: KEY, w: 48, cls: 'v num', align: 'center', html: String(sp[i].px) }); x += WW + g; }
    }
    keys += keyAt(ctx, 64, 952, `Each gap is a step in px, ${k} times its size: at ${base} px a step, ${k === 3 && base === 4 ? 'one reed is one step' : `${base * k} px of glass is one step`}.`, 'k', 32);
    return kitPage(ctx, 'spacing', T, { marks: ms, html: head + leadH + html + keys });
  },

  // ---- 007 radii and borders: the real components at 1:1 with their corners and edges; in the band each radius on a tower and each line width as an outline, k times its size ----
  'radii-borders': (ctx) => {
    const T = tokens(ctx), S = sc(ctx), F = S.form || {}, ui = ctx.ui, Rd = ctx.radius, [bh, bc, bf] = ctx.borders;
    const head = headline(ctx, 'Radii and borders');
    const leadH = lead(ctx, `Corners belong to the product: controls take ${Rd.control} px and cards ${Rd.card} px, and only avatars and switches go round. The pages around them are square.`);
    const cap = (t, v) => `<div class="kn" style="margin-top:16px">${A(t)}</div><div class="v" style="margin-top:2px">${v}</div>`;
    const cell = (x, inner, w = 226) => uiAt(ctx, T, x, 304, w, inner, { style: 'background:transparent' });
    const html = cell(GX[0], `<div>${ui.btn(F.book || 'Save')}</div>${cap('Button', `${Rd.button} px`)}`)
      + cell(GX[2], `${ui.field({ id: 'u1-rb', label: F.dropoff || 'Name', value: F.dropoffValue || '', state: 'focus' })}${cap('Input, focused', `${Rd.input} px, edge ${bc.px} px, ring ${bf.px} px`)}`)
      + cell(GX[4], `${ui.card({ meta: S.status, title: S.rider, text: S.riderNote })}${cap('Card', `${Rd.card} px, edge ${bh.px} px`)}`)
      + cell(GX[6], `<div class="u1-row"><span class="ui-avatar">${A(S.initials || '')}</span>${ui.switch((S.example || {}).switches ? S.example.switches[0] : 'On', { checked: true })}</div>${cap('Round', 'Avatars and switches')}`);
    // the towers: three radii (solid) and three line widths (outlines), 6 columns, magnified by k so the card's corner fills a third of its tower
    const cols = [['Control', Rd.control, null], ['Card', Rd.card, null], ['Round', null, null], ['Divider', Rd.card, bh.px], ['Control edge', Rd.control, bc.px], ['Focus ring', Rd.control, bf.px]];
    const CW = Math.floor((960 - P * 5) / 6 / P) * P, kk = Math.max(2, Math.min(8, Math.floor(CW / 3 / Math.max(Rd.card, 1))));
    let keys = '';
    const ms = cols.map(([name, rad, line], i) => {
      const x = 60 + i * (CW + P), top = LIP;
      keys += keyAt(ctx, x, CW, A(name), 'kn') + keyAt(ctx, x, CW, rad == null && !line ? 'Fully round' : line ? `${line} px` : `${rad} px`, 'v num', 22);
      return line ? tower(x, CW, top, { r: rad * kk, stroke: T.ink, sw: line * kk }) : tower(x, CW, top, { r: rad == null ? CW / 2 : rad * kk, fill: T.strong });
    });
    keys += keyAt(ctx, 64, 952, `In the glass, every corner and line ${kk} times its size: solid for the radii, an outline for the widths.`, 'k', 56);
    return kitPage(ctx, 'radii-borders', T, { marks: ms, html: head + leadH + html + keys });
  },

  // ---- 008 elevation: the four levels as the real components; in the band a stair of windows in the levels' own colours, each a step higher ----
  elevation: (ctx) => {
    const T = tokens(ctx), mode = editionMode(T), M = colourMap(ctx, mode), S = sc(ctx), ui = ctx.ui, D = S.dialog || {}, B = ctx.brand;
    const head = headline(ctx, 'Elevation');
    const leadH = lead(ctx, A(B.ui.elevationNote || ''));
    const label = (x, y, t) => put(ctx, { x, y, w: 226, cls: 'kn', html: A(t) });
    const html = label(64, 280, 'Surface') + uiAt(ctx, T, 64, 312, 226, ui.card({ meta: S.status, title: S.rider, text: S.riderNote }), { style: 'background:transparent' })
      + label(306, 280, 'Raised') + uiAt(ctx, T, 306, 312, 226, ui.card({ meta: S.deliverToLabel, title: S.deliverTo, text: S.paid, raised: true }), { style: 'background:transparent' })
      + label(64, 520, 'Sunken') + uiAt(ctx, T, 64, 552, 468, `<div class="u1-well">${ui.skeleton('72%')}${ui.skeleton('48%')}${ui.skeleton('60%')}</div>`, { style: 'background:transparent' })
      + label(548, 280, 'Floating') + uiAt(ctx, T, 548, 312, 468, ui.dialog({ title: D.title || S.share, body: D.body || S.pickup, confirm: D.confirm || 'OK', keep: D.keep || 'Cancel' }).replace(/dlg-t/g, 'u1-dlg'), { style: 'background:transparent' });
    // the stair: sunken, surface, raised, floating; each window a quarter of the band's height taller than the last, in the level's colour, outlined where it would vanish on the ground
    const lv = [['Sunken', 'sunken'], ['Surface', 'surface'], ['Raised', 'raised'], ['Floating', 'surface']];
    const CW = Math.floor((960 - 24 * 3) / 4 / P) * P, step = (BB - LIP) / 4;
    let keys = '';
    const ms = lv.map(([name, tok], i) => {
      const x = 60 + i * (CW + 24), hex = M[tok], float = i === 3, faint = ctx.ratio(hex, T.ground) < 1.3;
      keys += keyAt(ctx, x, CW, A(name), 'kn') + keyAt(ctx, x, CW, A(`--${tok} ${hex.toUpperCase()}`), 'v num', 22);
      return tower(x, CW, BB - step * (i + 1), { fill: hex, stroke: float ? T.ink : faint ? T.quiet : null, sw: float ? Math.max(2, B.ui.border * 2) : 2 });
    });
    const sh = tokenGroups(ctx).shadow['shadow-float'];
    keys += keyAt(ctx, 64, 952, `Each window stands a step higher than the one before. The floating one carries the dialog's edge; its shadow token is ${A(String(sh))}.`, 'k', 56);
    return kitPage(ctx, 'elevation', T, { marks: ms, html: head + leadH + html + keys });
  },
};
