// Theme 29 (Blueprint), lane u1: the UI kit's chrome and its foundation sheets (cover, contents, colour-light, colour-dark, type-scale, spacing,
// radii-borders, elevation). The kit is the same A3 drawing set as the guidelines: frame, zones and title block, with "UI kit" in the project cell.
// The product's real components (ctx.ui, componentsCss) are drawn at 1:1 on a plate of the surface they ship on; the sheet around them does the
// drafting: keys read across to a schedule, enlarged details carry true sizes in px, and a section shows the levels under a cut.
//
// For lanes u2 and u3 (import read-only, never copy-edit them here):
//   kitSheet(ctx, id, { drawing, section, scale }, inner)   the whole sheet, as lane-g1-sheet's sheet() but titled for the UI kit
//   plate(x, y, w, h, mode, inner, style)                    a .ui region (the kit's tokens, light or dark) at page px; children use .a, plate-relative
//   svgAll(svg)                                               a page-sized svg layer for drafting lines
//   keyTag(cx, cy, n)                                         a finish key: a numbered circle on the film, read across to a schedule
//   bubble(cx, cy, top, bottom, colours)                      a detail reference: the detail number over the sheet it is drawn on
//   breakLine(x1, y1, x2, y2)                                 the drafter's break: where a drawn part stops but the object runs on
//   datum(x, y)                                               a level marker: a triangle standing on its line
//   leaders(targets, opts)                                    leaders from points on a plate out to keys spread down the sheet
//   spread(ys, min, lo, hi)                                   pushes a sorted list of y apart by min, inside lo and hi
//   notes(x, y, w, items)                                     numbered general notes in the sheet's sans
//   textW(ctx, face, text, size, weight), uiT(ctx, token), sc(ctx), pickSpace(ctx, px), ratioOf(ctx, a, b), sheetNo(ctx, id), count(n)
//   reds, cloud, detailTag, PX, ZX, ZY, r1                    re-exported from lane-g1-sheet.js
// This lane's css() writes the kit tokens and componentsCss(ctx) once, for the UI kit document only (ctx.kind === 'uikit'); the other kit lanes
// must not add them again. Every class here starts u1-.
import { esc as A } from '../../engine/brand.js';
import { colourMap, tokenGroups, statusText } from '../../engine/tokens.js';
import { componentsCss } from '../../engine/components.js';
import { inkW, wrap, displayStem } from './measure.js';
import { sheet, reds, cloud, detailTag, PX, ZX, ZY, r1 } from './lane-g1-sheet.js';

export { reds, cloud, detailTag, PX, ZX, ZY, r1 };

// ---------------------------------------------------------------- chrome (exported for the other kit lanes)

// the sheet, with the project cell naming the UI kit instead of the guidelines (the only string that differs between the two sets)
export const kitSheet = (ctx, id, opts, inner) => sheet(ctx, id, opts, inner).replace('>Brand guidelines</span>', '>UI kit</span>');
export const svgAll = (s) => `<svg class="a" style="left:0;top:0" width="1587" height="1123" viewBox="0 0 1587 1123" fill="none" aria-hidden="true">${s}</svg>`;
export const plate = (x, y, w, h, mode, inner, style = '') => `<div class="ui u1-plate"${mode === 'dark' ? ' data-theme="dark"' : ''} style="left:${r1(x)}px;top:${r1(y)}px;width:${r1(w)}px;height:${r1(h)}px;${style}">${inner}</div>`;
export const at = (x, y, html, style = '') => `<div class="a" style="left:${r1(x)}px;top:${r1(y)}px;${style}">${html}</div>`;

export const sc = (ctx) => ctx.brand.ui.screen.content;
export const uiT = (ctx, token) => ctx.uiType.find((t) => t.token === token) || ctx.uiType.find((t) => t.token === 'body');
const bodyStem = (ctx, w) => (ctx.faces.find((f) => f.role === 'body' && f.weight === w && f.style !== 'italic') || ctx.faces.find((f) => f.role === 'body')).stem;
// ink width of brand text as the components set it: the display face carries the components' -0.01 em tracking
export const textW = (ctx, face, text, size, weight = 400) => (face === 'display' ? inkW(displayStem(ctx), String(text), size, -0.01) : inkW(bodyStem(ctx, weight), String(text), size));
// Slot edition: a placeholder is not measurable text. A descriptor block (label, what to write, length and example) stands about 4 body lines tall,
// a compact one is a single line, so a layout that counts lines for a brand string counts those.
const slotLines = (ctx, text) => {
  const m = ctx.placeholders && /\uE000([\uE010-\uE019]+)\uE001/.exec(String(text));
  return m ? (ctx.placeholders.entries[Number([...m[1]].map((c) => c.charCodeAt(0) - 0xE010).join(''))].form === 'block' ? 4 : 1) : 0;
};
export const linesOf = (ctx, face, text, size, w, weight = 400) => slotLines(ctx, text) || (face === 'display' ? wrap(displayStem(ctx), String(text), size, w - 6, -0.01) : wrap(bodyStem(ctx, weight), String(text), size, w - 6)).length;
// the spacing step nearest a wanted size, with its token as the code writes it
export function pickSpace(ctx, want) {
  const s = ctx.space.reduce((a, b) => (Math.abs(b.px - want) < Math.abs(a.px - want) ? b : a));
  return { px: s.px, token: '--' + s.token.replace('space-', 'sp-') };
}
export const ratioOf = (ctx, a, b) => ctx.fmt(ctx.ratio(a, b));
export const sheetNo = (ctx, id) => String(ctx.pageNo(id)).padStart(3, '0');
const WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty'];
export const count = (n) => (n < 20 ? WORDS[n] : n < 50 ? TENS[Math.floor(n / 10)] + (n % 10 ? '-' + WORDS[n % 10].toLowerCase() : '') : String(n));

export function spread(ys, min, lo, hi) {
  const o = ys.slice();
  for (let i = 0; i < o.length; i++) o[i] = Math.max(o[i], lo, i ? o[i - 1] + min : -Infinity);
  for (let i = o.length - 1; i >= 0; i--) o[i] = Math.min(o[i], hi, i < o.length - 1 ? o[i + 1] - min : Infinity);
  return o;
}

// a finish key, as the elevations sheet keys its finishes: a circle on the film with its number
export const keyTag = (cx, cy, n) => `<svg class="a" style="left:${r1(cx - 12)}px;top:${r1(cy - 12)}px" width="24" height="24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="var(--film)" stroke="var(--ink)" stroke-width="1"/></svg><span class="a c-mono" style="left:${r1(cx - 12)}px;top:${r1(cy - 8)}px;width:24px;text-align:center">${n}</span>`;

// a detail reference: a circle cut by a line, the detail's number above and the sheet it is drawn on below. On a plate, pass the plate's own colours
export function bubble(cx, cy, top, bottom, { fill = 'var(--film)', ink = 'var(--ink)', r = 22 } = {}) {
  return `<svg class="a" style="left:${r1(cx - r - 1)}px;top:${r1(cy - r - 1)}px" width="${2 * r + 2}" height="${2 * r + 2}" aria-hidden="true"><circle cx="${r + 1}" cy="${r + 1}" r="${r}" fill="${fill}" stroke="${ink}" stroke-width="1"/><path d="M1 ${r + 1.5}H${2 * r + 1}" stroke="${ink}" stroke-width="1"/></svg>`
    + `<span class="a u1-bt" style="left:${r1(cx - r)}px;top:${r1(cy - 18)}px;width:${2 * r}px;color:${ink}">${top}</span><span class="a u1-bt" style="left:${r1(cx - r)}px;top:${r1(cy + 3)}px;width:${2 * r}px;color:${ink}">${bottom}</span>`;
}

// the break line: a thin line with one zig-zag at its middle
export function breakLine(x1, y1, x2, y2, stroke = 'var(--ink)') {
  const L = Math.hypot(x2 - x1, y2 - y1), u = [(x2 - x1) / L, (y2 - y1) / L], n = [-u[1], u[0]], m = [(x1 + x2) / 2, (y1 + y2) / 2];
  const p = (a, b) => `${r1(m[0] + u[0] * a + n[0] * b)} ${r1(m[1] + u[1] * a + n[1] * b)}`;
  return `<path d="M${r1(x1)} ${r1(y1)}L${p(-6, 0)}L${p(-2, 8)}L${p(2, -8)}L${p(6, 0)}L${r1(x2)} ${r1(y2)}" stroke="${stroke}" stroke-width="1" fill="none"/>`;
}
// a level marker: a triangle standing point down on the line at (x, y)
export const datum = (x, y, stroke = 'var(--ink)') => `<path d="M${r1(x - 6)} ${r1(y - 9)}H${r1(x + 6)}L${r1(x)} ${r1(y)}Z" fill="${stroke}"/>`;

// leaders from targets on a plate, out across its right edge to keys spread down the film. targets: [{x, y}] in page px, sorted by y.
// Inside the plate the leader is drawn in the plate's own colour so it reads on light and dark; outside it is ink.
export function leaders(targets, { edgeX, keyX, lo, hi, min = 28, inside = 'var(--ink)' }) {
  const ky = spread(targets.map((t) => t.y), min, lo, hi);
  let svg = '';
  targets.forEach((t, i) => {
    svg += `<path d="M${r1(t.x)} ${r1(t.y)}H${r1(edgeX)}" stroke="${inside}" stroke-width="1"/><circle cx="${r1(t.x)}" cy="${r1(t.y)}" r="2.5" fill="${inside}"/>`;
    svg += `<path d="M${r1(edgeX)} ${r1(t.y)}H${r1(edgeX + 10)}L${r1(keyX - 12)} ${r1(ky[i])}" stroke="var(--ink)" stroke-width="1"/>`;
  });
  return { svg, ky };
}

// numbered general notes: the number in mono (a literal), the note in the sheet's sans; [x] in a note becomes a mono literal
const mixed = (t) => t.replace(/\[(.+?)\]/g, '<span class="v">$1</span>');
export const notes = (x, y, w, items, gap = 12) => `<div class="a" style="left:${r1(x)}px;top:${r1(y)}px;width:${w}px;display:flex;flex-direction:column;gap:${gap}px">${items.map((t, i) => `<div style="display:grid;grid-template-columns:24px 1fr"><span class="c-mono" style="line-height:20px">${i + 1}</span><p class="c-note">${mixed(t)}</p></div>`).join('')}</div>`;
// height of a notes block, measured with Chivo's advances (for anchoring a block to the content floor)
export const notesH = (items, w, gap = 12) => items.reduce((a, t) => a + wrap('Chivo-400', t.replace(/\[|\]/g, ''), 13, w - 24 - 8).length * 20, 0) + gap * (items.length - 1);

// a drawing's title under it, as a drafter titles a detail: the tag, the name on a heavy rule, the scale beside it
export function drawingTitle(x, y, n, name, scale, shownName = name) {
  const tw = inkW('Chivo-500', shownName, 15) + (shownName === name ? 0 : 12); // shownName: what a slot placeholder prints, measured instead of the sentinel
  return detailTag(x + 14, y + 14, n) + `<h3 class="a c-head nw" style="left:${r1(x + 40)}px;top:${r1(y + 1)}px">${A(name)}</h3>`
    + `<span class="a c-note c-quiet nw" style="left:${r1(x + 40 + tw + 16)}px;top:${r1(y + 2)}px;color:var(--quiet)">${mixed(A(scale))}</span>`
    + svgAll(`<path d="M${r1(x + 40)} ${r1(y + 27)}H${r1(x + 40 + tw + 24)}" stroke="var(--ink)" stroke-width="1.5"/>`);
}

// the kit's tokens on every .ui region (light, and dark under data-theme), and the shipped component styles, unchanged
export function kitCss(ctx) {
  const g = tokenGroups(ctx), stretch = ctx.brand.fonts.display.stretch || 100;
  const decl = (o) => Object.entries(o).map(([k, v]) => `--${k}:${v};`).join('');
  return `.pg .ui{${decl(colourMap(ctx, 'light'))}${decl(g.space)}${decl(g.radius)}${decl(g.width)}${decl(g.font)}${decl(g.text)}${decl(g.shadow)}}
.pg .ui[data-theme="dark"]{${decl(colourMap(ctx, 'dark'))}}
/* slot: a placeholder in a card title may wrap, since the heavier display faces make it wider than the card */
.pg .ui-card .ph-n{white-space:normal!important}
${componentsCss(ctx).replace(/^\/\*[^\n]*\n/, '')}
.pg .ui .ui-display{font-stretch:${stretch}%}
.pg .ui :where(h1,h2,h3,p,ul,ol,dl,dd){margin:0;padding:0}`;
}

export function css(ctx) {
  const kit = ctx.kind === 'uikit' ? kitCss(ctx) : '';
  return `${kit}
.pg .u1-plate{position:absolute;overflow:hidden;isolation:isolate}
.pg .u1-plate .a{position:absolute}
.pg .u1-bt{position:absolute;font:400 12px/16px var(--cmono);text-align:center;font-variant-numeric:tabular-nums}
.pg .u1-row{position:absolute;font:400 13px/20px var(--chrome);color:var(--ink);white-space:nowrap}
.pg .u1-row .v,.pg .u1-m{font:400 12px/20px var(--cmono)}
.pg .u1-no{position:absolute;font:400 22px/26px var(--cmono);color:var(--ink)}
.pg .u1-tl{position:absolute;font:400 15px/22px var(--chrome);color:var(--ink);white-space:nowrap}
`;
}

// ---------------------------------------------------------------- 003, 004: colour, light and dark

// One composition for both modes, so the two sheets compare: the plate is the product's surface across zones 1 to 4, the full height of the
// drawing area; every role is keyed where it lands on a real component, and the keys read across to the schedule.
function colourPage(ctx, id, mode) {
  const M = colourMap(ctx, mode), S = sc(ctx), F = S.form || {}, ui = ctx.ui;
  const P = { x: 40, y: 40, w: 753.5, h: 931 }, X = 24, W = 416, BW = 288;
  const tL = uiT(ctx, 'label'), tB = uiT(ctx, 'body'), tS = uiT(ctx, 'title-s'), tC = uiT(ctx, 'control'), bw = ctx.brand.ui.border;
  const blocks = [];
  const T = []; // targets in plate px: { x, y, name, token, hex, fg, bg, against, need }
  const role = (name, tok, extra) => ({ name, token: '--' + tok, hex: M[tok], ...extra });

  // the card on the surface: its divider, its meta, title and text
  const cardText = S.deliverTo, cin = W - 34, cl = linesOf(ctx, 'body', cardText, tB.size, cin);
  const cardH = 2 + 32 + tB.line + 6 + tS.line + 6 + cl * tB.size * 1.5;
  blocks.push({ h: cardH, html: (y) => at(X, y, ui.card({ meta: S.paidLabel, title: S.paid, text: cardText }), `width:${W}px`), t: (y) => {
    const m = y + 17 + tB.line / 2, ti = y + 17 + tB.line + 6 + tS.line / 2, tx = ti + tS.line / 2 + 6 + tB.size * 0.75;
    return [
      { x: X + 17 + textW(ctx, 'body', S.paidLabel, tL.size) + 8, y: m, ...role('Quiet', 'quiet', { fg: M.quiet, bg: M.surface, against: 'Surface', need: 4.5 }) },
      { x: X + 17 + textW(ctx, 'display', S.paid, tS.size) + 8, y: ti, ...role('Text', 'text', { fg: M.text, bg: M.surface, against: 'Surface', need: 4.5 }) },
      { x: X + 17 + Math.min(cin, textW(ctx, 'body', cardText, tB.size)) + 8, y: tx, ...role('Text, soft', 'text-soft', { fg: M['text-soft'], bg: M.surface, against: 'Surface', need: 4.5 }) },
      { x: X + W - 0.5, y: y + cardH - 12, ...role('Divider', 'divider', { fg: M.divider, bg: M.surface, against: 'Surface', need: 0 }) },
    ];
  } });
  // the progress track: the sunken ground of a bar that has not filled
  const p = typeof S.progress !== 'number' ? null : Math.round(S.progress * 100);
  blocks.push({ h: 24, html: (y) => p === null ? '' : at(X, y, `<div class="ui-progress"><div class="ui-progress__bar"><i style="width:${p}%"></i></div><span class="ui-progress__dot" style="left:${p}%"></span></div>`, `width:${W}px`),
    t: (y) => [{ x: X + W - 8, y: y + 21, ...role('Sunken', 'sunken', { fg: M['quiet-sunken'], bg: M.sunken, against: 'Quiet', need: 4.5 }) }] });
  // a raised card: a step in the ground
  blocks.push({ h: 2 + 32 + tS.line, html: (y) => at(X, y, ui.card({ title: S.rider, raised: true }), `width:${W}px`),
    t: (y) => [{ x: X + W - 12, y: y + 17 + tS.line / 2, ...role('Raised', 'raised', { fg: M.text, bg: M.raised, against: 'Text', need: 4.5 }) }] });
  // three fields: at rest (its edge), focused (the ring), disabled (its fill and words)
  const fH = tL.line + 6 + 44, inMid = (y) => y + tL.line + 6 + 22;
  blocks.push({ h: fH, html: (y) => at(X, y, ui.field({ id: `u1-${mode}-f1`, label: F.dropoff, value: F.dropoffValue }), `width:${W}px`),
    t: (y) => [{ x: X + W - 0.5, y: inMid(y), ...role('Control edge', 'edge', { fg: M.edge, bg: M.surface, against: 'Surface', need: 3 }) }] });
  blocks.push({ h: fH, html: (y) => at(X, y, ui.field({ id: `u1-${mode}-f2`, label: F.pickup, value: F.pickupValue, state: 'focus' }), `width:${W}px`),
    t: (y) => [{ x: X + W + 3, y: inMid(y), ...role('Focus ring', 'focus', { fg: M.focus, bg: M.surface, against: 'Surface', need: 3 }) }] });
  blocks.push({ h: fH, html: (y) => at(X, y, ui.field({ id: `u1-${mode}-f3`, label: F.ready, value: F.readyValue, disabled: true }), `width:${W}px`),
    t: (y) => [
      { x: X + W - 10, y: inMid(y) - 13, ...role('Disabled', 'disabled-bg', { fg: M['disabled-text'], bg: M['disabled-bg'], against: 'Its words', need: 0 }) },
      { x: X + bw + 12 + textW(ctx, 'body', F.readyValue, tC.size) + 8, y: inMid(y) + 2, ...role('Disabled words', 'disabled-text', { fg: M['disabled-text'], bg: M['disabled-bg'], against: 'Disabled', need: 0 }) },
    ] });
  // the primary at rest, hovered and pressed (never disabled); 12 px apart, one group
  const lab = F.book, lw = textW(ctx, 'body', lab, tC.size, tC.weight), exempt = ctx.roles[mode].actionExempt;
  blocks.push({ h: 44 * 3 + 24, html: (y) => [undefined, 'hover', 'pressed'].map((st, i) => at(X, y + i * 56, ui.btn(lab, { block: true, state: st }), `width:${BW}px`)).join(''),
    t: (y) => [
      { x: X + BW - 0.5, y: y + 8, ...role('Action', 'action', { fg: M.action, bg: M.surface, against: 'Surface', need: exempt ? 0 : 3 }) },
      { x: X + BW / 2 + lw / 2 + 8, y: y + 23, ...role('Action words', 'action-label', { fg: M['action-label'], bg: M.action, against: 'Action', need: 4.5 }) },
      { x: X + BW - 0.5, y: y + 56 + 22, ...role('Action, hover', 'action-hover', { fg: M['action-label'], bg: M['action-hover'], against: 'Its words', need: 4.5 }) },
      { x: X + BW - BW * 0.015 - 1, y: y + 112 + 22, ...role('Action, pressed', 'action-pressed', { fg: M['action-label'], bg: M['action-pressed'], against: 'Its words', need: 4.5 }) },
    ] });
  // the status words, one a line, each in the colour it prints in
  const chipH = Math.round(tL.size * 1.3);
  blocks.push({ h: (ctx.status.length - 1) * 26 + chipH, html: (y) => ctx.status.map((s, i) => at(X, y + i * 26, ui.statusChip(s.id))).join(''),
    t: (y) => ctx.status.map((s, i) => { const st = statusText(ctx, mode, s); return { x: X + textW(ctx, 'body', s.label, tL.size, ctx.weights.medium) + 8, y: y + i * 26 + chipH / 2, name: s.label, token: st.token, hex: st.hex, fg: st.hex, bg: M.surface, against: 'Surface', need: 4.5 }; }) });
  // the scrim: the ground a dialog is lifted over
  blocks.push({ h: 32, html: (y) => at(X, y, '', `width:${W}px;height:32px;background:var(--scrim);border-radius:var(--r-card)`),
    t: (y) => [{ x: X + W - 12, y: y + 16, ...role('Scrim', 'scrim', { fg: M.surface, bg: M.scrim, against: 'Surface', need: 0 }) }] });

  // share the plate's height between the blocks; the buttons and the status words keep their own inner steps
  const top = 72, bottom = P.h - 40, sum = blocks.reduce((a, b) => a + b.h, 0), gap = Math.max(12, Math.min(40, (bottom - top - sum) / (blocks.length - 1)));
  let y = top, inner = '';
  T.push({ x: X + W + 48, y: 40, ...role('Surface', 'surface', { fg: M.text, bg: M.surface, against: 'Text', need: 4.5 }) });
  for (const b of blocks) { inner += b.html(y); T.push(...b.t(y)); y += b.h + gap; }
  T.sort((a, b) => a.y - b.y);
  const pts = T.map((t) => ({ x: P.x + t.x, y: P.y + t.y }));
  const { svg, ky } = leaders(pts, { edgeX: P.x + P.w, keyX: 826, lo: 112, hi: 936, min: 28, inside: M.text });

  // the schedule: every key read across, measured in the pair it is used in
  const C = { key: 826, name: 852, token: 996, hex: 1180, ratio: 1252, against: 1322, need: 1460 };
  let html = [['Key', C.key - 12], ['Role', C.name], ['Token', C.token], ['Hex', C.hex], ['Ratio', C.ratio], ['Against', C.against], ['Needs', C.need]].map(([h, x]) => `<span class="a c-label" style="left:${x}px;top:64px">${h}</span>`).join('');
  html += `<div class="hl" style="left:${C.key - 12}px;top:88px;width:${1523 - C.key + 12}px;background:var(--ink)"></div>`;
  T.forEach((t, i) => {
    const yy = ky[i] - 10;
    html += keyTag(C.key, ky[i], i + 1)
      + `<span class="u1-row" style="left:${C.name}px;top:${yy}px;max-width:${C.token - C.name - 8}px">${A(t.name)}</span>`
      + `<span class="u1-row u1-m" style="left:${C.token}px;top:${yy}px">${A(t.token)}</span>`
      + `<span class="u1-row u1-m" style="left:${C.hex}px;top:${yy}px">${A(t.hex.toUpperCase())}</span>`
      + `<span class="u1-row u1-m" style="left:${C.ratio}px;top:${yy}px">${ratioOf(ctx, t.fg, t.bg)} : 1</span>`
      + `<span class="u1-row" style="left:${C.against}px;top:${yy}px">${A(t.against)}</span>`
      + `<span class="u1-row${t.need ? ' u1-m' : ''}" style="left:${C.need}px;top:${yy}px${t.need ? '' : ';color:var(--quiet)'}">${t.need ? `${t.need} : 1` : 'None'}</span>`;
  });
  const edge = `<path d="M${P.x + P.w + 0.5} ${P.y}V${P.y + P.h}" stroke="var(--ink)" stroke-width="1"/>`;
  const body = plate(P.x, P.y, P.w, P.h, mode, inner) + svgAll(edge + svg) + html;
  const pg = ctx.pages.find((x) => x.id === id);
  return kitSheet(ctx, id, { drawing: pg.title, scale: '[1:1], sizes in px' }, body);
}

// ---------------------------------------------------------------- the sheets

export const uikit = {
  // 001: the kit's key plan. The product's phone screen at 1:1, dimensioned in px, with a detail reference on each part pointing to the sheet
  // that draws it. The logo and the product's own line hold the left half; the general notes sit on the content floor.
  cover(ctx) {
    const B = ctx.brand, S = sc(ctx), ui = ctx.ui, g = ctx.logo.geos.colour;
    const LW = Math.floor(Math.min(600, (128 * g.w) / g.h)), LH = (LW * g.h) / g.w, LX = 64, LY = 120;
    const lead = B.type.scale.find((t) => t.token === 'lead') || { size: 24, line: 32 }, ll = Math.round(lead.line < 4 ? lead.line * lead.size : lead.line);
    let html = `<div class="a" style="left:${LX}px;top:${LY}px;width:${LW}px">${ctx.logo.html('colour', { width: LW, colourway: 'colour', label: 'Your logo goes here' })}</div>`;
    html += `<p class="a bn" style="left:${LX}px;top:${Math.round(LY + LH + 40)}px;width:640px;font:500 ${lead.size}px/${ll}px var(--body);color:var(--b-text)">${A(B.product)}</p>`;

    // the screen, 390 by 844 px, every block placed where the sheet can point at it
    const SX = 916, SY = 100, SW = 390, SH = 844, IX = 16, IW = SW - 32;
    const tL = uiT(ctx, 'label'), tB = uiT(ctx, 'body'), tS = uiT(ctx, 'title-s'), tT = uiT(ctx, 'title'), tC = uiT(ctx, 'caption');
    const first = S.deliveries[0], chipH = Math.round(tL.size * 1.3);
    let y = 76, scr = `<header class="ui-topbar a" style="left:0;top:0;width:${SW}px"><span style="font:var(--fw-label) var(--fs-control)/1 var(--ff-body)">${A(B.ui.screen.title)}</span><span class="ui-avatar">${A(S.initials || '')}</span></header>`;
    const tg = { nav: 28 };
    scr += at(IX, y, ui.statusChip(first.status)); tg.status = [IX + textW(ctx, 'body', ctx.status.find((s) => s.id === first.status).label, tL.size, ctx.weights.medium) + 8, y + chipH / 2];
    y += chipH + 8;
    const hl = wrap(displayStem(ctx), S.eta, tT.size, IW - 6, -0.01);
    scr += at(IX, y, `<p class="ui-display ui-num" style="font-size:var(--fs-title);line-height:var(--lh-title)">${A(S.eta)}</p>`, `width:${IW}px`);
    tg.type = [IX + textW(ctx, 'display', hl[0], tT.size) + 8, y + tT.line / 2];
    y += hl.length * tT.line + 8;
    scr += at(IX, y, `<p style="color:var(--text-soft)">${A(S.pickup)}</p>`, `width:${IW}px`);
    y += linesOf(ctx, 'body', S.pickup, tB.size, IW) * tB.line + 24;
    const p = typeof S.progress !== 'number' ? null : Math.round(S.progress * 100);
    if (p !== null) scr += at(IX, y, `<div class="ui-progress"><div class="ui-progress__bar"><i style="width:${p}%"></i></div><span class="ui-progress__dot" style="left:${p}%"></span></div>`, `width:${IW}px`);
    scr += at(IX, y + 32, `<span>${A(S.from)}</span><span>${A(S.to)}</span>`, `width:${IW}px;display:flex;justify-content:space-between;font-size:var(--fs-caption);line-height:var(--lh-caption);color:var(--quiet)`);
    y += 32 + tC.line + 24;
    const cl = linesOf(ctx, 'body', S.deliverTo, tB.size, IW - 34), cardH = 2 + 32 + tB.line + 6 + tS.line + 6 + cl * tB.size * 1.5;
    scr += at(IX, y, ui.card({ meta: S.paidLabel, title: S.paid, text: S.deliverTo }), `width:${IW}px`);
    tg.card = [IX + IW - 0.5, y + 14];
    y += cardH + 24;
    const btnY = SH - 24 - 44, rows = Math.max(1, Math.min(3, Math.floor((btnY - 24 - y) / 72)));
    scr += at(IX, y, ui.deliveryRows(rows), `width:${IW}px`);
    tg.list = [IX + IW - 0.5, y + 36];
    scr += at(IX, btnY, ui.btn(S.share, { block: true }), `width:${IW}px`);
    tg.btn = [IX + IW - 0.5, btnY + 22];

    // the references: each part's detail number over the sheet that draws it, spread down the right of the screen
    const refs = [['nav', 'navigation', [SW - 8, tg.nav]], ['status', 'status', tg.status], ['type', 'type-scale', tg.type], ['card', 'cards', tg.card], ['list', 'lists', tg.list], ['btn', 'buttons', tg.btn]]
      .map(([, id, t]) => ({ id, x: SX + t[0], y: SY + t[1] })).sort((a, b) => a.y - b.y);
    const BX = SX + SW + 80, by = spread(refs.map((r) => r.y), 56, SY + 24, SY + SH - 24);
    let svg = `<rect x="${SX - 0.5}" y="${SY - 0.5}" width="${SW + 1}" height="${SH + 1}" stroke="var(--ink)" stroke-width="1"/>`;
    refs.forEach((r, i) => {
      svg += `<path d="M${r1(r.x)} ${r1(r.y)}H${SX + SW + 12}L${BX - 22} ${r1(by[i])}" stroke="var(--ink)" stroke-width="1"/><circle cx="${r1(r.x)}" cy="${r1(r.y)}" r="2.5" fill="var(--ink)"/>`;
      html += bubble(BX, by[i], i + 1, sheetNo(ctx, r.id)) + `<span class="a c-note nw" style="left:${BX + 32}px;top:${r1(by[i] - 10)}px">${A(ctx.pages.find((x) => x.id === r.id).title)}</span>`;
    });
    const R = reds();
    R.dim([SX, SY], [SX + SW, SY], [0, -1], { d: 28, value: `${SW} px` });
    R.dim([SX, SY], [SX, SY + SH], [-1, 0], { d: 24, value: `${SH} px`, place: 'left' });

    const secs = ctx.sections, total = ctx.pages.length;
    const items = [
      `${count(total)} sheets in ${count(secs.length).toLowerCase()} parts: ${secs.map((s) => s.title.toLowerCase()).join(', ').replace(/, ([^,]*)$/, ' and $1')}.`,
      'Every component is drawn from the shipped code at [1:1], so a size read off a sheet is its size on screen.',
      `Light and dark are the same markup; dark is [data-theme="dark"]. Each part of the screen is referenced to the sheet that draws it.`,
    ];
    const nh = notesH(items, 420);
    html += `<h3 class="a c-head" style="left:64px;top:${947 - nh - 38}px">General notes</h3>` + notes(64, 947 - nh, 420, items);
    const body = plate(SX, SY, SW, SH, 'light', scr) + svgAll(svg) + html + R.svg();
    return kitSheet(ctx, 'cover', { drawing: 'UI kit', section: 'Cover', scale: '[1:1], sizes in px' }, body);
  },

  // 002: the drawing list, as it heads a real set: each part's sheets under its number, this sheet shaded, and the symbols the set draws with.
  contents(ctx) {
    const front = ctx.pages.filter((p) => !p.section), groups = [{ n: null, title: 'Front matter', pages: front }, ...ctx.sections];
    // groups fill three columns in order; a column takes the next group while it stays no longer than the longest group
    const cap = Math.max(...groups.map((g) => g.pages.length)), cols = [[]];
    let used = 0;
    for (const g of groups) { if (used && used + g.pages.length > cap && cols.length < 3) { cols.push([]); used = 0; } cols.at(-1).push(g); used += g.pages.length; }
    const RH = 44, HEAD = 40, GG = 32, CX = [ZX[0] + 24, ZX[2] + 24, ZX[4] + 24], CW = 329;
    const colH = (c) => c.reduce((a, g) => a + HEAD + g.pages.length * RH, 0) + (c.length - 1) * GG;
    const top = 923 - Math.max(...cols.map(colH));
    let html = '', svg = '';
    cols.forEach((c, ci) => {
      let y = top; const x = CX[ci];
      c.forEach((g) => {
        if (g.n) html += `<span class="a c-mono" style="left:${x}px;top:${y + 3}px;color:var(--quiet)">${String(g.n).padStart(2, '0')}</span>`;
        html += `<h3 class="a c-head nw" style="left:${g.n ? x + 32 : x}px;top:${y}px">${A(g.title)}</h3>`;
        svg += `<path d="M${x} ${y + HEAD - 8.5}H${x + CW}" stroke="var(--ink)" stroke-width="1.5"/>`;
        y += HEAD - 8;
        g.pages.forEach((p) => {
          if (p.id === 'contents') html += `<div class="a" style="left:${x - 12}px;top:${y + 1}px;width:${CW + 12}px;height:${RH - 1}px;background:var(--film2)"></div>`;
          html += `<span class="u1-no" style="left:${x}px;top:${y + 9}px">${sheetNo(ctx, p.id)}</span><span class="u1-tl" style="left:${x + 72}px;top:${y + 11}px">${A(p.title)}</span>`;
          y += RH;
          svg += `<path d="M${x} ${y + 0.5}H${x + CW}" stroke="var(--hair)" stroke-width="1"/>`;
        });
        y += GG + 8;
      });
    });

    // the symbols: each drawn as the set draws it, with where to find it at work
    const LX = ZX[6] + 24, LW = 1523 - LX, R = reds();
    html += `<h3 class="a c-head" style="left:${LX}px;top:${top}px">Symbols</h3>`;
    svg += `<path d="M${LX} ${top + HEAD - 8.5}H${1523}" stroke="var(--ink)" stroke-width="1.5"/>`;
    const sym = [
      ['Dimension', 'A true size in px, whatever the scale of the drawing it sits on.', (x, y) => R.dim([x, y + 34], [x + 48, y + 34], [0, -1], { d: 6, value: '48 px' })],
      ['Detail reference', `The detail number over the sheet it is drawn on: detail 1 is on sheet ${sheetNo(ctx, 'radii-borders')}.`, (x, y) => { html += bubble(x + 24, y + 22, 1, sheetNo(ctx, 'radii-borders')); }],
      ['Key', `A colour role where it lands, read across to the schedule on sheet ${sheetNo(ctx, 'colour-light')}.`, (x, y) => { html += keyTag(x + 24, y + 22, 1); }],
      ['Section', `A cut through the product, drawn below it to show the levels, as on sheet ${sheetNo(ctx, 'elevation')}.`, (x, y) => { svg += `<path d="M${x} ${y + 22}H${x + 56}" stroke="var(--ink)" stroke-width="1.5" stroke-dasharray="12 3 2 3"/><path d="M${x + 0.75} ${y + 14}V${y + 30}M${x + 55.25} ${y + 14}V${y + 30}" stroke="var(--ink)" stroke-width="2.5"/><path d="M${x + 4} ${y + 32}L${x + 1} ${y + 40}M${x + 1} ${y + 40}L${x - 2} ${y + 32}" stroke="var(--ink)" stroke-width="1"/>`; html += `<span class="a c-mono" style="left:${x + 8}px;top:${y + 26}px">A</span>`; }],
      ['Level', 'A step of depth, standing on the line of the ground it names.', (x, y) => { svg += datum(x + 16, y + 26) + `<path d="M${x} ${y + 26.5}H${x + 56}" stroke="var(--ink)" stroke-width="1"/>`; }],
      ['Break', 'The drawing stops here; the part it shows runs on.', (x, y) => { svg += breakLine(x, y + 22, x + 56, y + 22); }],
    ];
    // each symbol's row is as tall as its wrapped note, so a three-line note never meets the next name
    let sy = top + HEAD;
    sym.forEach(([name, text, draw]) => {
      const y = sy;
      sy += Math.max(56, 24 + wrap('Chivo-400', text, 13, LW - 88 - 6).length * 20) + 20;
      draw(LX, y);
      html += `<p class="a c-head nw" style="left:${LX + 88}px;top:${y + 4}px;font-size:13px;line-height:20px">${name}</p><p class="a c-note" style="left:${LX + 88}px;top:${y + 24}px;width:${LW - 88}px">${A(text)}</p>`;
    });
    return kitSheet(ctx, 'contents', { drawing: 'Drawing list', scale: 'Not to scale' }, svgAll(svg) + html + R.svg());
  },

  'colour-light': (ctx) => colourPage(ctx, 'colour-light', 'light'),
  'colour-dark': (ctx) => colourPage(ctx, 'colour-dark', 'dark'),

  // 005: the type levels drawn at 2:1, largest first, each line real copy from the product inside its line box. The line height is dimensioned
  // at its true size in px; the token and its values read across on the right.
  'type-scale'(ctx) {
    const B = ctx.brand, S = sc(ctx), F = S.form || {}, D = S.dialog || {}, E = S.empty || {}, K = 2, stretch = B.fonts.display.stretch || 100;
    const cand = { headline: [E.title, S.eta, F.title], title: [S.eta, S.paid, S.rider], 'title-s': [D.title, S.rider, F.title], control: [F.book, S.share], body: [S.pickup, S.deliverTo, S.riderNote], label: [F.pickup, F.notes, S.paidLabel], caption: [F.notesHelp, S.riderNote, S.paidLabel] };
    const rows = [...ctx.uiType].sort((a, b) => b.size - a.size || b.line - a.line), X = 160, MAXW = 820, used = new Set();
    const pick = (t) => {
      const list = [...(cand[t.token] || []), S.riderNote, S.status, S.paid].filter(Boolean);
      const ok = (s) => textW(ctx, t.face, s, t.size * K, t.weight) <= MAXW;
      const s = list.find((x) => !used.has(x) && ok(x)) || list.find(ok) || S.status;
      used.add(s); return s;
    };
    // the rows share the height above the notes, which keep the content floor
    const min = Math.min(...ctx.uiType.map((t) => t.size));
    const items = [`Drawn at [2:1]. The values are true sizes: size, line height and weight, in px.`, `Nothing on screen is set smaller than [${min} px].`], nh = notesH(items, 329);
    const total = rows.reduce((a, t) => a + t.line * K, 0), gap = Math.min(64, (947 - nh - 48 - 96 - total) / (rows.length - 1));
    let y = 96, html = '', svg = '';
    const R = reds();
    rows.forEach((t) => {
      const h = t.line * K, text = pick(t), disp = t.face === 'display';
      const face = disp ? `font-family:var(--display);font-stretch:${stretch}%;letter-spacing:-.01em` : 'font-family:var(--body)';
      html += `<p class="a nw" style="left:${X}px;top:${r1(y)}px;${face};font-size:${t.size * K}px;line-height:${h}px;font-weight:${t.weight};color:var(--b-text)">${A(text)}</p>`;
      // the line box: its top and foot as lettering guidelines
      svg += `<path d="M${X} ${r1(y) + 0.5}H${X + MAXW}M${X} ${r1(y + h) - 0.5}H${X + MAXW}" stroke="var(--hair)" stroke-width="1"/>`;
      R.dim([X, y], [X, y + h], [-1, 0], { d: 24, value: `${t.line} px`, place: 'left' });
      // the schedule: the token's name, its values as the code writes them, the face, what it is for
      const fam = disp ? B.fonts.display.family : B.fonts.body.family;
      html += `<h3 class="a c-head nw" style="left:${ZX[5] + 24}px;top:${r1(y - 1)}px">${A(t.token)}</h3>`
        + `<p class="a c-note nw" style="left:${ZX[5] + 24}px;top:${r1(y + 21)}px"><span class="v">${t.size} / ${t.line} / ${t.weight}</span>  ${A(fam)}</p>`
        + `<p class="a c-note c-quiet nw" style="left:${ZX[5] + 24}px;top:${r1(y + 41)}px;color:var(--quiet)">${A(t.use)}</p>`;
      y += h + gap;
    });
    html += notes(ZX[0] + 24, 947 - nh, 329, items);
    return kitSheet(ctx, 'type-scale', { drawing: 'Type scale', scale: '[2:1], sizes in px' }, svgAll(svg) + html + R.svg());
  },

  // 006: spacing as dimensioned drawings at 2:1. Detail 1 is the scale itself, each step a dimension of its own length; detail 2 is a real form
  // spaced from that scale, every gap dimensioned with its true size and the token that sets it.
  spacing(ctx) {
    const S = sc(ctx), F = S.form || {}, ui = ctx.ui, K = 2, R = reds();
    let html = '', svg = '';
    // detail 1: the ladder
    const LY = 168, pitch = Math.min(56, (600 - LY) / Math.max(1, ctx.space.length - 1) + 8);
    ctx.space.forEach((s, i) => {
      const y = LY + i * pitch;
      html += `<span class="a c-mono nw" style="left:64px;top:${r1(y - 8)}px">--${A(s.token.replace('space-', 'sp-'))}</span>`;
      R.dim([168, y], [168 + s.px * K, y], [0, -1], { d: 0, value: `${s.px} px` });
    });
    const ladEnd = LY + (ctx.space.length - 1) * pitch;
    html += drawingTitle(64, ladEnd + 40, 1, 'Spacing scale', '[2:1]');
    const inG = pickSpace(ctx, 16), outG = pickSpace(ctx, 32), pad = pickSpace(ctx, 24);
    const items = [`${count(ctx.space.length)} steps on a [${ctx.brand.ui.spacingBase} px] base, written [--sp-1] to [--sp-${ctx.space.length}].`, `In the form, [${inG.px} px] holds a group together and [${outG.px} px] sets the groups apart.`];
    html += notes(64, ladEnd + 104, 329, items);

    // detail 2: the form, true size inside a 2:1 zoom; every block placed by the scale so each gap can be dimensioned
    const tS = uiT(ctx, 'title-s'), tL = uiT(ctx, 'label'), FW = 320, fH = tL.line + 6 + 44;
    const tl = linesOf(ctx, 'display', F.title, tS.size, FW);
    const y0 = pad.px, y1 = y0 + tl * tS.line, y2 = y1 + outG.px, y3 = y2 + fH, y4 = y3 + inG.px, y5 = y4 + fH, y6 = y5 + outG.px, y7 = y6 + 44, H0 = y7 + pad.px, W0 = 2 * pad.px + FW;
    let form = at(pad.px, y0, `<p class="ui-display" style="font-size:var(--fs-title-s);line-height:var(--lh-title-s)">${A(F.title)}</p>`, `width:${FW}px`);
    form += at(pad.px, y2, ui.field({ id: 'u1-sp1', label: F.pickup, value: F.pickupValue }), `width:${FW}px`);
    form += at(pad.px, y4, ui.field({ id: 'u1-sp2', label: F.dropoff, value: F.dropoffValue }), `width:${FW}px`);
    form += at(pad.px, y6, ui.btn(F.book, { block: true }), `width:${FW}px`);
    const FX = ZX[3] - 48, FY = 136;
    html += `<div class="a" style="left:${FX}px;top:${FY}px;width:${W0 * K}px;height:${H0 * K}px"><div class="ui u1-plate" style="position:relative;width:${W0}px;height:${H0}px;zoom:${K}">${form}</div></div>`;
    svg += `<rect x="${FX - 0.5}" y="${FY - 0.5}" width="${W0 * K + 1}" height="${H0 * K + 1}" stroke="var(--ink)" stroke-width="1"/>`;
    // the gaps, down the right: extension lines leave the content's right edge and cross the padding to the dimension line
    const ex = FX + (pad.px + FW) * K, d = pad.px * K + 28, tokX = FX + W0 * K + 28 + 12 + 48;
    for (const [a, b, s] of [[0, y0, pad], [y1, y2, outG], [y3, y4, inG], [y5, y6, outG], [y7, H0, pad]]) {
      R.dim([ex, FY + a * K], [ex, FY + b * K], [1, 0], { d, value: `${s.px} px`, place: 'side' });
      html += `<span class="a c-mono c-quiet nw" style="left:${tokX}px;top:${r1(FY + ((a + b) / 2) * K - 8)}px;color:var(--quiet)">${A(s.token)}</span>`;
    }
    R.dim([FX, FY], [FX + pad.px * K, FY], [0, -1], { d: 20, value: `${pad.px} px` });
    R.dim([FX + (pad.px + FW) * K, FY], [FX + W0 * K, FY], [0, -1], { d: 20, value: `${pad.px} px` });
    html += drawingTitle(FX, FY + H0 * K + 40, 2, ctx.brand.ui.screen.content.form ? 'A form, spaced' : 'A panel, spaced', '[2:1]');
    return kitSheet(ctx, 'spacing', { drawing: 'Spacing', scale: '[2:1], sizes in px' }, svgAll(svg) + html + R.svg());
  },

  // 007: corners and lines as enlarged details. Three corners at one scale (an input's, a button's, a card's), a section through a focused edge,
  // and the real components at 1:1 on their surface with a reference at each corner the details draw.
  'radii-borders'(ctx) {
    const M = colourMap(ctx, 'light'), S = sc(ctx), F = S.form || {}, ui = ctx.ui, bw = ctx.brand.ui.border, Rd = ctx.radius;
    const round = (r) => (r >= 999 ? 22 : r);
    const rIn = round(Rd.input), rBt = round(Rd.button), rCd = round(Rd.card), [hair, ctl, foc] = ctx.borders;
    const k = Math.max(4, Math.min(24, Math.floor(176 / Math.max(rIn, rBt, rCd, 1)))), R = reds(), no = sheetNo(ctx, 'radii-borders');
    let svg = '', html = '';
    const Wd = 232, Hd = 216, y0 = 128;
    // a top-right corner: the shape from the arc to the cut ends, its band (edge) and interior, outlined; its radius dimensioned through the corner
    const corner = (n, xr, r, e, band, fill, name, rTxt, eTxt) => {
      const Ro = r * k, ri = Math.max(0, Ro - e), xl = xr - Wd, yb = y0 + Hd;
      const outer = `M${xl} ${y0}H${r1(xr - Ro)}${Ro ? `A${r1(Ro)} ${r1(Ro)} 0 0 1 ${xr} ${r1(y0 + Ro)}` : ''}V${yb}H${xl}Z`;
      const inner = `M${xl} ${r1(y0 + e)}H${r1(xr - e - ri)}${ri ? `A${r1(ri)} ${r1(ri)} 0 0 1 ${r1(xr - e)} ${r1(y0 + e + ri)}` : ''}V${yb}H${xl}Z`;
      svg += e ? `<path d="${outer} ${inner}" fill="${band}" fill-rule="evenodd"/><path d="${inner}" fill="${fill}"/>` : `<path d="${outer}" fill="${fill}"/>`;
      svg += `<path d="M${xl} ${y0 + 0.5}H${r1(xr - Ro)}${Ro ? `A${r1(Ro)} ${r1(Ro)} 0 0 1 ${xr - 0.5} ${r1(y0 + Ro)}` : ''}V${yb}" stroke="var(--ink)" stroke-width="1"/>`;
      if (e) svg += `<path d="M${xl} ${r1(y0 + e)}H${r1(xr - e - ri)}${ri ? `A${r1(ri)} ${r1(ri)} 0 0 1 ${r1(xr - e)} ${r1(y0 + e + ri)}` : ''}V${yb}" stroke="var(--ink)" stroke-width=".75"/>`;
      svg += breakLine(xl, y0 - 10, xl, yb) + breakLine(xl, yb, xr + 10, yb);
      if (Ro) {
        // the radius: from the centre (marked with a cross) through the arc and out past the corner, a tick at the arc, the value on a shoulder
        const c = Math.SQRT1_2, C = [xr - Ro, y0 + Ro], Pt = [C[0] + Ro * c, C[1] - Ro * c], E = [xr + 14, y0 - 14];
        svg += `<path d="M${r1(C[0] - 6)} ${r1(C[1])}H${r1(C[0] + 6)}M${r1(C[0])} ${r1(C[1] - 6)}V${r1(C[1] + 6)}" stroke="var(--ink)" stroke-width=".75"/>`;
        svg += `<path d="M${r1(C[0])} ${r1(C[1])}L${r1(E[0])} ${r1(E[1])}H${r1(E[0] + 12)}" stroke="var(--red)" stroke-width="1.5"/><path d="M${r1(Pt[0] - 5)} ${r1(Pt[1])}H${r1(Pt[0] + 5)}" stroke="var(--red)" stroke-width="1.5"/>`;
        html += `<span class="rv" style="left:${r1(E[0] + 18)}px;top:${r1(E[1] - 6)}px">${A(rTxt)}</span>`;
      }
      if (e) R.dim([xr - e, yb], [xr, yb], [0, 1], { d: 22, value: eTxt });
      html += drawingTitle(xl, yb + 48, n, name, `[${k}:1]`);
    };
    const rTxt = (r, raw) => (raw >= 999 ? 'Round' : `R ${r} px`);
    const D = [ZX[2] - 72, ZX[4] - 72, ZX[6] - 96];
    corner(1, D[0], rIn, ctl.px * k, M.edge, M.surface, 'Input corner', rTxt(rIn, Rd.input), `${ctl.px} px`);
    const aEdge = ctx.roles.light.actionEdge ? ctl.px * k : 0;
    corner(2, D[1], rBt, aEdge, M['action-edge'] || M.action, M.action, 'Button corner', rTxt(rBt, Rd.button), `${ctl.px} px`);
    corner(3, D[2], rCd, hair.px * k, M.divider, M.surface, 'Card corner', rTxt(rCd, Rd.card), `${hair.px} px`);

    // detail 4: a section through a focused input's edge, outside to inside: surface, ring, gap, edge, the input's own surface
    const Y4 = 560, H4 = 96, X4 = 88, bands = [['Surface', 64, M.surface], ['Focus ring', foc.px * k, M.focus], ['Gap', 2 * k, M.surface], ['Edge', ctl.px * k, M.text], ['Input', 168, M.surface]];
    let x = X4; const xs = [];
    for (const [nm, w, c] of bands) { svg += `<rect x="${r1(x)}" y="${Y4}" width="${r1(w)}" height="${H4}" fill="${c}"/>`; xs.push([x, w, nm]); x += w; }
    svg += `<path d="M${X4} ${Y4 + 0.5}H${r1(x)}M${X4} ${Y4 + H4 - 0.5}H${r1(x)}" stroke="var(--ink)" stroke-width="1"/>` + breakLine(X4, Y4 - 10, X4, Y4 + H4 + 10) + breakLine(x, Y4 - 10, x, Y4 + H4 + 10);
    [[xs[1][0], xs[1][1], foc.px], [xs[2][0], xs[2][1], 2], [xs[3][0], xs[3][1], ctl.px]].forEach(([bx, w, v], i) => R.dim([bx, Y4], [bx + w, Y4], [0, -1], { d: i === 1 ? 46 : 24, value: `${v} px` }));
    // each band named under it, the names stepped down so narrow bands never crowd their neighbours
    xs.slice(1, 4).forEach(([bx, w, nm], i) => {
      const cx = bx + w / 2, ly = Y4 + H4 + 16 + i * 22;
      svg += `<path d="M${r1(cx)} ${Y4 + H4 - 8}V${ly + 9}H${r1(cx + 8)}" stroke="var(--ink)" stroke-width="1"/>`;
      html += `<span class="a c-note nw" style="left:${r1(cx + 14)}px;top:${ly}px">${nm}</span>`;
    });
    html += drawingTitle(X4, Y4 + H4 + 104, 4, 'Focused edge, section', `[${k}:1]`);

    const items = [
      `Inputs take [${rIn} px], buttons ${Rd.button >= 999 ? 'a round end' : `[${rBt} px]`} and cards [${rCd} px]. ${A(ctx.radii.find((r) => r.px >= 999)?.use || '')}${ctx.radii.find((r) => r.px >= 999) ? ' take round.' : ''}`,
      `Three widths of line: [${hair.px} px] dividers, [${ctl.px} px] control edges and a [${foc.px} px] focus ring, set [2 px] off the edge so it shows on any fill.`,
      `The details are drawn at [${k}:1]; their dimensions are the true sizes. The sheet itself stays square.`,
    ];
    // the notes sit on the content floor in zones 5 and 6, clear of the plate that starts at zone 7
    const NW = ZX[6] - 48 - (ZX[4] + 24), ny = 947 - notesH(items, NW);
    html += `<h3 class="a c-head" style="left:${ZX[4] + 24}px;top:${r1(ny - 38)}px">General notes</h3>` + notes(ZX[4] + 24, r1(ny), NW, items);

    // the components at 1:1 on their surface, a reference circle on each corner a detail draws
    const P = { x: ZX[6], y: 40, w: 1547 - ZX[6], h: 931 }, CX = 24, CW = 224, tL = uiT(ctx, 'label'), tB = uiT(ctx, 'body'), tS = uiT(ctx, 'title-s');
    const fH = tL.line + 6 + 44, cl = linesOf(ctx, 'body', S.riderNote, tB.size, CW - 34), tlc = linesOf(ctx, 'display', S.rider, tS.size, CW - 34);
    const cardH = 2 + 32 + tB.line + 6 + tlc * tS.line + 6 + cl * tB.size * 1.5;
    let py = 72, pin = ''; const calls = [];
    pin += at(CX, py, ui.field({ id: 'u1-rb1', label: F.dropoff, value: F.dropoffValue }), `width:${CW}px`); calls.push([1, CX + CW, py + tL.line + 6]); py += fH + 48;
    pin += at(CX, py, ui.btn(F.book, { block: true }), `width:${CW}px`); calls.push([2, CX + CW, py]); py += 44 + 48;
    pin += at(CX, py, ui.card({ meta: S.status, title: S.rider, text: S.riderNote }), `width:${CW}px`); calls.push([3, CX + CW, py]); py += cardH + 48;
    pin += at(CX, py, ui.field({ id: 'u1-rb2', label: F.pickup, value: F.pickupValue, state: 'focus' }), `width:${CW}px`); calls.push([4, CX + CW + 4, py + tL.line + 6 + 22]); py += fH + 48;
    pin += at(CX, py, `<div style="display:flex;align-items:center;gap:16px"><span class="ui-avatar">${A(S.initials || '')}</span>${ui.switch((S.example && S.example.switches && S.example.switches[0]) || S.share, { checked: true })}</div>`, `width:${P.w - 48}px`);
    let ps = '';
    for (const [n, cx, cy] of calls) {
      const bx = P.w - 24 - 22;
      ps += `<circle cx="${r1(cx)}" cy="${r1(cy)}" r="10" stroke="${M.text}" stroke-width="1" fill="none"/><path d="M${r1(cx + 10)} ${r1(cy)}H${r1(bx - 22)}" stroke="${M.text}" stroke-width="1"/>`;
      pin += bubble(bx, cy, n, no, { fill: M.surface, ink: M.text });
    }
    pin += `<svg class="a" style="left:0;top:0" width="${r1(P.w)}" height="${P.h}" fill="none" aria-hidden="true">${ps}</svg>`;
    svg += `<path d="M${P.x - 0.5} ${P.y}V${P.y + P.h}" stroke="var(--ink)" stroke-width="1"/>`;
    const body = svgAll(svg) + plate(P.x, P.y, P.w, P.h, 'light', pin) + html + R.svg();
    return kitSheet(ctx, 'radii-borders', { drawing: 'Radii and borders', scale: `As noted, sizes in px` }, body);
  },

  // 008: depth as a section. The product's levels in plan at 1:1 (a sunken well, a card, a raised card, a dialog), cut along A-A; under the plan
  // the same cut is drawn as a section in light and in dark, each level on its datum with the lightness of its ground.
  elevation(ctx) {
    const B = ctx.brand, S = sc(ctx), ui = ctx.ui, D = S.dialog || {}, tS = uiT(ctx, 'title-s'), tB = uiT(ctx, 'body'), tL = uiT(ctx, 'label'), bw = B.ui.border;
    const Wd = { sk: 160, card: 220, raised: 220, dlg: 380 }, G = 44, X0 = 24, CT = 56;
    const xs = { sk: X0 }; xs.card = xs.sk + Wd.sk + G; xs.raised = xs.card + Wd.card + G; xs.dlg = xs.raised + Wd.raised + G;
    const dl = linesOf(ctx, 'body', D.body || S.pickup, tB.size, Wd.dlg - 48 - 2 * bw), dtl = linesOf(ctx, 'display', D.title || S.share, tS.size, Wd.dlg - 48 - 2 * bw);
    const dlgH = 2 * bw + 48 + dtl * tS.line + 12 + dl * tB.line + 24 + 44;
    const P = { x: 40, y: 40, w: 1507, h: CT + Math.max(dlgH, 200) + 48 };
    let pin = at(xs.sk, CT, `<div style="display:flex;flex-direction:column;gap:12px">${ui.skeleton('100%')}${ui.skeleton('72%')}${ui.skeleton('86%')}${ui.skeleton('64%')}</div>`, `width:${Wd.sk}px`);
    pin += at(xs.card, CT, ui.card({ meta: S.status, title: S.rider, text: S.riderNote }), `width:${Wd.card}px`);
    pin += at(xs.raised, CT, ui.card({ meta: S.deliverToLabel, title: S.deliverTo, text: S.paid, raised: true }), `width:${Wd.raised}px`);
    pin += at(xs.dlg, CT, ui.dialog({ title: D.title || S.share, body: D.body || S.pickup, confirm: D.confirm || S.share, keep: D.keep || S.call }), `width:${Wd.dlg}px`);
    // the cutting plane A-A, through the top of every level, its ends turned down to the view
    const cy = CT + 7, cx1 = 8, cx2 = xs.dlg + Wd.dlg + 24, T = 'var(--text)';
    let cut = `<path d="M${cx1} ${cy}H${cx2}" stroke="${T}" stroke-width="1.5" stroke-dasharray="16 4 2 4"/>`;
    for (const x of [cx1, cx2]) cut += `<path d="M${x} ${cy - 8}V${cy + 8}" stroke="${T}" stroke-width="2.5"/><path d="M${x - 4} ${cy + 18}L${x} ${cy + 28}L${x + 4} ${cy + 18}" stroke="${T}" stroke-width="1.5"/>`;
    pin += `<svg class="a" style="left:0;top:0" width="${P.w}" height="${P.h}" fill="none" aria-hidden="true">${cut}</svg>`;
    pin += `<span class="a" style="left:${cx1 + 8}px;top:${cy + 14}px;font:400 12px/16px var(--ff-mono);color:var(--text)">A</span><span class="a" style="left:${cx2 - 18}px;top:${cy + 14}px;font:400 12px/16px var(--ff-mono);color:var(--text)">A</span>`;

    // the sections: one slab per level, aligned under the plan; datum lines carry each level out to its marker and its values
    let svg = '', html = '';
    const px = (k) => P.x + xs[k], pw = (k) => Wd[k], right = P.x + xs.dlg + Wd.dlg + 16;
    const section = (S0, mode, title) => {
      const M = colourMap(ctx, mode), L = (h) => ctx.C.toOklch(h).L.toFixed(2), K = mode === 'dark' ? M.edge : 'var(--ink)';
      svg += `<rect x="${P.x + 8}" y="${S0}" width="${r1(right - P.x - 8)}" height="24" fill="${M.surface}" stroke="${K}" stroke-width="1"/>`;
      svg += `<rect x="${px('sk')}" y="${S0}" width="${pw('sk')}" height="10" fill="${M.sunken}" stroke="${K}" stroke-width="1"/>`;
      svg += `<rect x="${px('card')}" y="${S0 - 6}" width="${pw('card')}" height="6" fill="${M.surface}" stroke="${K}" stroke-width="1"/>`;
      svg += `<rect x="${px('raised')}" y="${S0 - 12}" width="${pw('raised')}" height="12" fill="${M.raised}" stroke="${K}" stroke-width="1"/>`;
      svg += `<rect x="${px('dlg')}" y="${S0 - 40}" width="${pw('dlg')}" height="10" fill="${M.surface}" stroke="${K}" stroke-width="1"/>`;
      const lv = [['Floating', 'surface', S0 - 40, px('dlg') + pw('dlg')], ['Raised', 'raised', S0 - 12, px('raised') + pw('raised')], ['Surface', 'surface', S0 - 6, px('card') + pw('card')], ['Sunken', 'sunken', S0 + 10, px('sk') + pw('sk')]];
      const ly = spread(lv.map((l) => l[2]), 24, S0 - 64, S0 + 60);
      lv.forEach(([nm, tok, y, x], i) => {
        svg += `<path d="M${r1(x + 4)} ${y + 0.5}H${right + 24}L${right + 44} ${r1(ly[i]) + 0.5}H${right + 56}" stroke="var(--ink)" stroke-width="1" stroke-dasharray="${x + 4 < right ? '3 3' : 'none'}"/>` + datum(right + 66, ly[i] + 0.5);
        html += `<span class="u1-row" style="left:${right + 80}px;top:${r1(ly[i] - 16)}px">${nm}</span><span class="u1-row u1-m" style="left:${right + 160}px;top:${r1(ly[i] - 16)}px">--${tok}</span><span class="u1-row u1-m" style="left:${right + 256}px;top:${r1(ly[i] - 16)}px">L ${L(M[tok])}</span>`;
      });
      html += `<h3 class="a c-head nw" style="left:64px;top:${S0 + 48}px">${title}</h3><span class="a c-note c-quiet nw" style="left:${64 + inkW('Chivo-500', title, 15) + 16}px;top:${S0 + 49}px;color:var(--quiet)">Not to scale</span>`;
    };
    // projection lines carry each level's edges down from the plan to the first section
    const S1 = P.y + P.h + 128, S2 = S1 + 176;
    for (const k of ['sk', 'card', 'raised', 'dlg']) for (const x of [px(k), px(k) + pw(k)]) svg += `<path d="M${x + 0.5} ${P.y + P.h + 8}V${S1 - 52}" stroke="var(--hair)" stroke-width="1" stroke-dasharray="4 4"/>`;
    section(S1, 'light', 'Section A-A, light');
    section(S2, 'dark', 'Section A-A, dark');

    const shadow = tokenGroups(ctx).shadow['shadow-float'];
    const items = [A(B.ui.elevationNote || ''), `The shadow token [--shadow-float] is [${A(String(shadow))}]. A dialog is lifted by its [${bw} px] edge.`, 'Each level is drawn on its datum with the lightness L of its ground, so a raised card that is darker than the surface reads as a step, not as light.'].filter(Boolean);
    const ny = Math.max(S2 + 96, 947 - notesH(items.slice(0, 2), 520));
    html += notes(64, ny, 520, items.slice(0, 2)) + `<div class="a" style="left:${ZX[4] + 24}px;top:${ny}px">${notes(0, 0, 520, [items[2]]).replace('<span class="c-mono" style="line-height:20px">1</span>', '<span class="c-mono" style="line-height:20px">3</span>')}</div>`;
    const body = plate(P.x, P.y, P.w, P.h, 'light', pin) + svgAll(`<path d="M40 ${P.y + P.h + 0.5}H1547" stroke="var(--ink)" stroke-width="1"/>` + svg) + html;
    return kitSheet(ctx, 'elevation', { drawing: 'Elevation', scale: 'As noted, sizes in px' }, body);
  },
};
