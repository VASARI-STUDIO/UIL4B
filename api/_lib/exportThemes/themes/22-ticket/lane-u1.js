// Theme 22, Ticket, lane u1: the UI kit's chrome and its foundation pages (cover, contents, colour-light, colour-dark, type-scale, spacing,
// radii-borders, elevation). Every kit page is the same roll ticket on the bar top as the guidelines; the stub names the UI kit instead.
// The body is printed on whatever the page documents: the brand's field, its paper, or the product's own light or dark surface, so the
// real components (ctx.ui, componentsCss) sit on the ground they ship on and are never restyled.
//
// For lanes u2 and u3 (import these read-only, never copy-edit them here):
//   kitPage(ctx, R, id, { body, zone, segments, cover })  the whole page: ticket, stub with the kit's serial and barcode, body and dark zone
//   kitStub(ctx, R, id, { cover })                          only the stub
//   kitCode(ctx, id)                                        the string the stub's barcode encodes ("encore-ui005")
//   surfaceBody(ctx, mode)                                  segments that print the ticket's body on the product's light or dark surface
//   uiPlate(x, y, w, h, mode, inner, style)                 a .ui region (the kit's tokens) placed on the page; children use page-relative .a
//   PLATE                                                   the plate box that fills a body printed by surfaceBody: { x, y, w, h }
//   at, wrap, clip, ratioText, kitRoles                     small layout pieces
// This lane's css() writes the kit tokens and componentsCss(ctx) once, for the UI kit document only (ctx.kind === 'uikit'), so the other kit
// lanes must not add them again. Every class here starts u1-.
import { A, px, T, PAGE, device, roles, barcodeRects, serialOf, slugOf, longDate, fitLines, textWidth, lineTop, trackOf, sentences, listAnd, weightName } from './helpers.js';
import { colourMap, tokenGroups, statusText } from '../../engine/tokens.js';
import { componentsCss } from '../../engine/components.js';

// ---------------------------------------------------------------- chrome (exported for the other kit lanes)

export const kitRoles = roles;
export const at = (x, y, cls, html, style = '', w = null) => `<div class="a ${cls}" style="left:${px(x)};top:${px(y)};${w ? `width:${px(w)};` : ''}${style}">${html}</div>`;
export const ratioText = (ctx, a, b) => `${ctx.fmt(ctx.ratio(a, b))} : 1`;

// greedy word wrap with the theme's calibrated widths; the margin covers the heavier weights, which are measured with the regular face
export function wrap(ctx, text, size, w, { role = 'body', track = 0, margin = 0.94 } = {}) {
  const lines = []; let cur = '';
  for (const word of String(text).split(/\s+/)) {
    const t = cur ? `${cur} ${word}` : word;
    if (cur && textWidth(ctx, role, t, size, track) > w * margin) { lines.push(cur); cur = word; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}
// one line of real copy that has to fit a width: the whole text, else its first sentence, else its first clause; never an ellipsis
export function clip(ctx, text, size, w, { role = 'body', margin = 0.92 } = {}) {
  const fits = (s) => textWidth(ctx, role, s, size) <= w * margin;
  const tries = [text, sentences(text)[0], String(text).split(/[,;:]/)[0]];
  return tries.find(fits) || wrap(ctx, text, size, w, { role, margin })[0];
}

// the barcode on a kit page encodes the brand, the document and the page: "encore-ui005" is page 5 of Encore's UI kit
export const kitCode = (ctx, id) => `${slugOf(ctx)}-ui${serialOf(ctx, id)}`;

// the stub: the guidelines' fixed slots, with the kit named in the document slot. A front page with no section prints its own title there
const sameWord = (a, b) => !!a && !!b && a.toLowerCase().replace(/s$/, '') === b.toLowerCase().replace(/s$/, '');
export function kitStub(ctx, R, id, { cover = false } = {}) {
  const B = ctx.brand, p = ctx.pages.find((x) => x.id === id), serial = serialOf(ctx, id), code = kitCode(ctx, id);
  const slot = (y, cls, text) => `<div class="st ${cls}" style="top:${y}px">${A(text)}</div>`;
  let h = '';
  if (cover) h += slot(72, 'c13 b', 'UI kit') + slot(90, 'c12', B.name);
  else {
    const sec = p.section ? p.section.title : p.title;
    h += slot(72, 'c13 b', B.name) + slot(90, 'c12', `UI kit ${B.version.number}`) + slot(200, 'c13 b', sec) + (sameWord(sec, p.title) ? '' : slot(218, 'c12 two', p.title));
  }
  h += slot(330, 'c13 b', 'No.') + `<div class="st serial" style="top:348px">${serial}</div>`;
  const bc = barcodeRects(code, T.inX, 420, T.inW, 24, R.fieldInk);
  h += `<svg class="bc" role="img" aria-label="Barcode, ${A(code)}" viewBox="0 0 ${PAGE.w} ${PAGE.h}" width="${PAGE.w}" height="${PAGE.h}">${bc.svg}</svg>` + slot(444, 'mono12', code);
  return h;
}

// the page: the ticket (plates, holes, notches, edges), then the body, the stub and the dark zone
export function kitPage(ctx, R, id, { segments, body = '', zone = '', cover = false, inset = false } = {}) {
  return `<section class="pg u1-kit" data-page="${id}" style="--ink:${R.fieldInk};--field:${R.field}">${device(R, { segments, inset })}<div class="ct">${body}${kitStub(ctx, R, id, { cover })}${zone}</div></section>`;
}

// a body printed on the product's own surface for a mode; a surface as dark as the bar top gets the theme's 1 px edge (device's edge rule)
export const surfaceBody = (ctx, mode) => [{ x: T.x, w: T.bodyW, hex: ctx.roles[mode].surface }];
// the .ui region that fills such a body, 16 px inside its edges so the edge rule and the notches stay clear
export const PLATE = { x: 56, y: 48, w: 896, h: 436 };
export const uiPlate = (x, y, w, h, mode, inner, style = '') => `<div class="ui u1-plate"${mode === 'dark' ? ' data-theme="dark"' : ''} style="left:${px(x)};top:${px(y)};width:${px(w)};height:${px(h)};${style}">${inner}</div>`;

// the kit's tokens on every .ui region (light, and dark under data-theme), and the shipped component styles, unchanged
export function kitCss(ctx) {
  const g = tokenGroups(ctx), stretch = ctx.brand.fonts.display.stretch || 100;
  const decl = (o) => Object.entries(o).map(([k, v]) => `--${k}:${v};`).join('');
  return `.pg .ui{${decl(colourMap(ctx, 'light'))}${decl(g.space)}${decl(g.radius)}${decl(g.width)}${decl(g.font)}${decl(g.text)}${decl(g.shadow)}}
.pg .ui[data-theme="dark"]{${decl(colourMap(ctx, 'dark'))}}
${componentsCss(ctx).replace(/^\/\*[^\n]*\n/, '')}
.pg .ui .ui-display{font-stretch:${stretch}%}
/* a skeleton bar is the quiet text colour lifted off the ground, so it shows in the dark pages as well as the light ones (--sunken sits at about 1.1 to 1 on a dark ground) */
.pg .ui .ui-skeleton,.pg .ui .ui-row__lead:empty{background:color-mix(in srgb,var(--text) 24%,var(--surface))}
.pg .ui :where(h1,h2,h3,p,ul,ol,dl,dd){margin:0;padding:0}`;
}

export function css(ctx) {
  const kit = ctx.kind === 'uikit' ? kitCss(ctx) : '';
  return `${kit}
.pg .u1-plate{position:absolute;overflow:hidden;isolation:isolate}
.pg .u1-plate .a{position:absolute}
.pg .u1-nw{white-space:nowrap}
.pg .u1-r{text-align:right}
.pg .u1-m{font-family:var(--mono);font-size:12px;line-height:16px;font-weight:400;font-variant-numeric:tabular-nums}
.pg .u1-q{color:var(--quiet)}
.pg .u1-t{color:var(--text)}
.pg .u1-fill{position:absolute;display:flex;align-items:center;gap:12px;padding:0 12px;box-sizing:border-box}
.pg .u1-fill .u1-fn{flex:none;width:112px;font:600 13px/18px var(--body)}
.pg .u1-fill .u1-fr{margin-left:auto;font:400 12px/16px var(--body);font-variant-numeric:tabular-nums}
.pg .u1-col{position:absolute;display:flex;flex-direction:column}
.pg .u1-li{display:flex;justify-content:space-between;gap:12px}
.pg .u1-li .num{flex:none}
.pg .u1-stairs{position:absolute;display:flex;align-items:flex-end;gap:20px}
.pg .u1-step{display:flex;flex-direction:column;gap:12px;flex:none}
/* the display face runs wide: in a 184 px card the title takes a smaller step so its longest word stays inside */
.pg .u1-step .ui-card__title,.pg .u2-col .ui-card__title{font-size:19px;line-height:24px}
.pg .ph-tight .ui-card__title .ph-c{font-size:min(1em,15px);white-space:normal!important;overflow-wrap:anywhere}
.pg .u1-step .u1-cap{display:flex;flex-direction:column;gap:2px;font:400 12px/16px var(--ff-body);color:var(--quiet)}
.pg .u1-step .u1-cap b{font:600 13px/18px var(--ff-body);color:var(--text)}
.pg .u1-sk{display:flex;flex-direction:column;gap:8px;box-sizing:border-box;padding:12px;background:var(--sunken);box-shadow:inset 0 0 0 1px var(--divider)}
.pg .u1-row2{display:flex;align-items:center;gap:16px}
`;
}

// ---------------------------------------------------------------- page pieces

// the stub's own wording for a field printed on the ticket face: a label over a value, like Venue and Date on a gig ticket
const field = (x, y, w, label, value) => at(x, y, '', `<div class="c13 b ink">${A(label)}</div><div class="c15 ink" style="margin-top:4px">${A(value)}</div>`, '', w);
// a dark-zone note: the name in paper, the rule in the measured quiet colour
const note = (x, y, w, name, html) => at(x, y, 'zone', `<div class="c15 b paper">${A(name)}</div><div class="c13 qt" style="margin-top:4px">${html}</div>`, '', w);
const mono = (s) => `<span class="m">${A(s)}</span>`;
const sc = (ctx) => ctx.brand.ui.screen.content;
const lh92 = (s) => Math.round(s * 0.92 * 100) / 100;
// a display line set at a decided size, its box placed so the first baseline lands on `base`
function dispAt(ctx, x, base, size, text, colour, extra = '') {
  const lh = lh92(size), top = lineTop(ctx, 'display', size, lh, base);
  return `<div class="a disp u1-nw" style="left:${px(x)};top:${px(top)};font-size:${size}px;line-height:${lh}px;letter-spacing:${trackOf(ctx)}em;color:${colour};${extra}">${A(text)}</div>`;
}
// the largest display size, max down to min in 2 px steps, at which one line of text fits w
function fitOne(ctx, text, w, max, min) {
  for (let s = max; s >= min; s -= 2) if (textWidth(ctx, 'display', text, s, trackOf(ctx)) <= w * 0.98) return s;
  return min;
}

// ---------------------------------------------------------------- colour (light and dark share one composition, so the two pages compare)

function colourPage(ctx, id, mode) {
  const R = roles(ctx), M = colourMap(ctx, mode), S = sc(ctx), P = PLATE, ox = P.x, oy = P.y;
  const r = (a, b) => ratioText(ctx, a, b);
  // the one big thing: the product's live line, printed in --text on the surface it ships on
  const hs = fitOne(ctx, S.eta, 528, 112, 48), hBase = 72 + hs * 0.8;
  let inner = dispAt(ctx, 72 - ox, hBase - oy, hs, S.eta, 'var(--text)');
  // the ink run: every text role, each a real line of the product in that ink, with its token and its ratio on the surface
  const inks = [['text', S.rider, 600], ['text-soft', S.pickup, 400], ['quiet', S.deliverTo, 400]];
  const seen = new Set(inks.map((x) => x[0]));
  for (const s of ctx.status) {
    const t = statusText(ctx, mode, s), tok = t.token.slice(2);
    if (seen.has(tok)) continue; seen.add(tok);
    inks.push([tok, s.label, 600]);
  }
  let y = Math.round(hBase + 32);
  const rowH = Math.min(26, Math.floor((452 - y) / inks.length));
  for (const [tok, text, wt] of inks) {
    const hex = M[tok];
    inner += at(72 - ox, y - oy, `c15 u1-nw${ctx.edition === 'slot' ? ' ph-tight' : ''}`, A(clip(ctx, text, 15, 300)), `color:${hex};font-weight:${wt}`)
      + at(392 - ox, y + 3 - oy, 'u1-m u1-q u1-nw', A('--' + tok))
      + at(520 - ox, y + 3 - oy, 'c12 u1-q u1-r num', A(r(hex, M.surface)), '', 72);
    y += rowH;
  }
  // the fills: every ground, action and line role as a strip of stock, each printed with the words it carries and their ratio
  const scrimInk = ctx.ratio(M.surface, M.scrim) >= ctx.ratio(M.text, M.scrim) ? 'surface' : 'text';
  const fills = [
    ['Surface', 'surface', 'text', `box-shadow:inset 0 0 0 1px ${M.divider}`], ['Raised', 'raised', 'text'], ['Sunken', 'sunken', 'text'],
    ['Action', 'action', 'action-label'], ['Action hover', 'action-hover', 'action-label'], ['Action pressed', 'action-pressed', 'action-label'],
    ['Disabled', 'disabled-bg', 'disabled-text'], ['Scrim', 'scrim', scrimInk, '', 'Overlay'],
    ['Control edge', 'edge', 'text', `background:${M.surface};box-shadow:inset 0 0 0 ${ctx.brand.ui.border}px ${M.edge}`, r(M.edge, M.surface), 'edge'],
    ['Divider', 'divider', 'text', `background:${M.surface};box-shadow:inset 0 -1px 0 ${M.divider}`, '', 'divider'],
    ['Focus ring', 'focus', 'text', `background:${M.surface};box-shadow:inset 0 0 0 2px ${M.focus}`, r(M.focus, M.surface), 'focus'],
  ];
  const fh = 28, gap = Math.floor((388 - fills.length * fh) / (fills.length - 1));
  fills.forEach(([name, tok, fg, extra = '', ratio, line], i) => {
    const bg = line ? M.surface : M[tok];
    const rt = ratio !== undefined ? ratio : r(M[fg], bg);
    inner += `<div class="u1-fill" style="left:${640 - ox}px;top:${72 + i * (fh + gap) - oy}px;width:296px;height:${fh}px;background:${bg};color:${M[fg]};${extra}">`
      + `<span class="u1-fn u1-nw">${A(name)}</span><span class="u1-m u1-nw">${A(M[tok])}</span><span class="u1-fr u1-nw">${A(rt)}</span></div>`;
  });
  const body = uiPlate(P.x, P.y, P.w, P.h, mode, inner);
  const dark = mode === 'dark';
  const zone = note(72, 532, 400, 'Roles, not colours', `Components read ${mono('--action')}, never a palette name. ${dark ? `Dark is the same markup under ${mono('data-theme="dark"')}.` : `Light is the default, on ${mono(':root')}.`}`)
    + note(520, 532, 416, 'Measured on this ticket', 'The ink rows are measured on the surface, and each fill with the words it carries. Text under 24 px needs 4.5 : 1; edges and the focus ring need 3 : 1.');
  return kitPage(ctx, R, id, { segments: surfaceBody(ctx, mode), body, zone });
}

// ---------------------------------------------------------------- the pages

export const uikit = {
  // ---- 001: the kit's own ticket. The logo small where a promoter's name goes, the document's name as the event, the facts as printed fields ----
  cover: (ctx) => {
    const R = roles(ctx), B = ctx.brand, asp = ctx.logo.geo.aspect;
    const lw = Math.min(360, 64 * asp), lh = lw / asp;
    const logo = `<div class="a" style="left:72px;top:72px;width:${px(lw)};height:${px(lh)}">${ctx.logo.html('colour', { width: lw, colourway: R.colourwayOn(R.field), color: R.inkOn(R.field, 13, 400, '(Logo slot frame)'), label: 'Logo' })}</div>`;
    // the event line: "UI kit" as large as one line allows, its baseline 40 px above the printed fields
    const fy = 400, s = fitOne(ctx, 'UI kit', 864, 280, 72);
    const title = dispAt(ctx, 64, fy - 40, s, 'UI kit', 'var(--ink)');
    const modes = 'Light and dark', faces = listAnd([B.fonts.display.family, B.fonts.body.family].filter((f, i, a) => a.indexOf(f) === i));
    const fields = `<div class="a" style="left:72px;top:${fy - 12}px;width:864px;height:1px;background:var(--ink)"></div>`
      + field(72, fy, 144, 'Version', B.version.number) + field(240, fy, 160, 'Issued', longDate(B.version.date))
      + field(424, fy, 160, 'Modes', modes) + field(608, fy, 328, 'Faces', faces);
    const zone = at(72, 532, 'c24 paper', A(B.product), 'font-weight:400', 560);
    return kitPage(ctx, R, 'cover', { cover: true, body: logo + title + fields, zone });
  },

  // ---- 002: the kit as a strip of joined tickets, one per part, each as wide as its share of the pages (the palette page's rule, applied
  // to the document). The figure at the top of each is the serial of the page it opens on ----
  contents: (ctx) => {
    const R = roles(ctx).onPaper(), secs = ctx.sections, total = secs.reduce((t, s) => t + s.pages.length, 0);
    const serW = textWidth(ctx, 'body', '000', 13) * 1.1;
    // each ticket needs room for its longest page title and its serial; what is left is shared by page count
    const need = secs.map((s) => Math.ceil(24 + Math.max(...s.pages.map((p) => textWidth(ctx, 'body', p.title, 13))) * 1.06 + 12 + serW + 16));
    const spare = T.bodyW - 16 - need.reduce((a, b) => a + b, 0);
    const ws = need.map((n, i) => Math.floor(n + Math.max(0, spare) * secs[i].pages.length / total));
    ws[0] += T.bodyW - ws.reduce((a, b) => a + b, 0);
    let x = T.x; const segs = ws.map((w) => { const s = { x, w, hex: R.field }; x += w; return s; });
    // one shared size for the opening serials, the largest that fits the narrowest ticket
    const inW = (i) => segs[i].w - (i === 0 ? 40 : 24) - 16;
    const ns = Math.min(...secs.map((_, i) => fitOne(ctx, '000', inW(i), 120, 40)));
    const tSize = secs.every((s, i) => textWidth(ctx, 'body', s.title, 20) * 1.08 <= inW(i)) ? 20 : 15;
    let body = '';
    secs.forEach((s, i) => {
      const cx = segs[i].x + (i === 0 ? 40 : 24), w = inW(i), base = 72 + ns * 0.78;
      body += dispAt(ctx, cx - ns * 0.04, base, ns, serialOf(ctx, s.pages[0].id), 'var(--ink)');
      body += at(cx, base + 20, `c${tSize} b ink u1-nw`, A(s.title), '', w);
      const list = s.pages.map((p) => `<div class="u1-li c13 ink"><span class="u1-nw">${A(p.title)}</span><span class="num">${serialOf(ctx, p.id)}</span></div>`).join('');
      body += `<div class="u1-col" style="left:${px(cx)};width:${px(w)};bottom:${720 - 460}px">${list}</div>`;
    });
    const zone = at(72, 532, 'c15 qt', 'Each part of the kit is a ticket as wide as its share of the pages. The figure at its head is the serial on the stub of the page it opens on.', '', 520);
    return kitPage(ctx, R, 'contents', { segments: segs, body, zone });
  },

  'colour-light': (ctx) => colourPage(ctx, 'colour-light', 'light'),
  'colour-dark': (ctx) => colourPage(ctx, 'colour-dark', 'dark'),

  // ---- 005: the type scale printed on the ticket at the sizes it ships, largest first, each line real copy from the product.
  // On the field the hierarchy is size and weight only, as on every ticket in the theme ----
  'type-scale': (ctx) => {
    const R = roles(ctx), B = ctx.brand, S = sc(ctx), F = S.form || {};
    const sample = { caption: F.notesHelp, label: F.pickup, body: S.pickup, control: F.book, 'title-s': S.dialog && S.dialog.title, title: S.rider, headline: S.eta };
    const rows = [...ctx.uiType].sort((a, b) => b.size - a.size);
    const stretch = B.fonts.display.stretch || 100;
    const heights = rows.map((t) => Math.max(t.line, 18)), gap = Math.min(24, Math.floor((388 - heights.reduce((a, b) => a + b, 0)) / (rows.length - 1)));
    let y = 72, body = '';
    rows.forEach((t, i) => {
      const role = t.face === 'display' ? 'display' : 'body', text = clip(ctx, sample[t.token] || t.use, t.size, 560, { role });
      const face = role === 'display' ? `font-family:var(--display);font-stretch:${stretch}%;letter-spacing:-0.01em` : 'font-family:var(--body)';
      const base = lineTop(ctx, role, t.size, t.line, 0) * -1 + y;
      body += at(72, y, `u1-nw ink${ctx.edition === 'slot' ? ' ph-tight' : ' num'}`, A(text), `${face};font-size:${t.size}px;line-height:${t.line}px;font-weight:${t.weight}`);
      // the spec sits on the sample's baseline, in the stub's column logic: name, then the literal values
      const ly = lineTop(ctx, 'body', 13, 18, base);
      body += at(664, ly, 'c13 b ink u1-nw', A(t.token), '', 96) + at(768, ly + 1, 'm ink u1-nw', A(`${t.size} / ${t.line} / ${t.weight}`));
      y += heights[i] + gap;
    });
    const min = Math.min(...ctx.uiType.map((t) => t.size));
    const dw = B.fonts.display, bw = B.fonts.body;
    const zone = note(72, 532, 400, 'Printed at the size it ships', `Each line is set at its own size, in px, then line height, then weight. Nothing on screen is smaller than ${min} px, and figures that change are tabular.`)
      + note(520, 532, 416, 'Two faces', `${A(dw.family)} ${dw.weights.map(weightName).join(', ').toLowerCase()} for titles and the live line. ${A(bw.family)} ${listAnd(bw.weights.map(String))} for everything people read and press.`);
    return kitPage(ctx, R, 'type-scale', { body, zone });
  },

  // ---- 006: the spacing scale drawn as barcodes. Each step is printed as bars and spaces of its own width, the module of a barcode,
  // so the 4 px step reads as fine print and the largest as blocks ----
  spacing: (ctx) => {
    const R = roles(ctx).onPaper(), sp = ctx.space, x0 = 280, x1 = 936;
    const rh = 24, gap = Math.min(24, Math.floor((388 - sp.length * rh) / (sp.length - 1)));
    let svg = '', body = '';
    sp.forEach((s, i) => {
      const y = 72 + i * (rh + gap);
      for (let x = x0; x + s.px <= x1; x += s.px * 2) svg += `<rect x="${x}" y="${y}" width="${s.px}" height="${rh}"/>`;
      body += at(72, y + 4, 'm ink u1-nw', A(`--${s.token.replace('space-', 'sp-')}`)) + at(176, y + 4, 'm ink u1-nw', A(`${s.px} px`));
    });
    body += `<svg class="a" aria-hidden="true" style="left:0;top:0" width="${PAGE.w}" height="${PAGE.h}" viewBox="0 0 ${PAGE.w} ${PAGE.h}"><g fill="${R.fieldInk}">${svg}</g></svg>`;
    const base = ctx.brand.ui.spacingBase;
    const zone = note(72, 532, 400, `A ${base} px step`, `Every gap and padding in the kit is one of these ${sp.length} steps. A gap inside a group is smaller than the gap between groups, so grouping reads at a glance.`)
      + note(520, 532, 416, 'Bars and spaces', 'Each row prints its step as a bar and a space of the same width, the way a barcode prints its module.');
    return kitPage(ctx, R, 'spacing', { body, zone });
  },

  // ---- 007: one corner of an input, drawn many times its size, beside the real components at their true size ----
  'radii-borders': (ctx) => {
    const R = roles(ctx), M = colourMap(ctx, 'light'), S = sc(ctx), F = S.form || {}, ui = ctx.ui, P = PLATE, ox = P.x, oy = P.y;
    const rIn = ctx.radius.input, bw = ctx.brand.ui.border, [bh, bc, bf] = ctx.borders, rk = ctx.radius.card;
    // the magnification: the largest whole number that keeps the radius under 160 px and the edge under 32 px
    const k = Math.max(4, Math.min(24, Math.floor(160 / Math.max(rIn, 1)), Math.floor(32 / bw)));
    const ro = rIn * k, ri = Math.max(0, rIn - bw) * k, e = bw * k, bx = 104, by = 104, W = 240, H = 280;
    const rr = (x, y, w, h, rad) => `M${x + rad} ${y}H${x + w}V${y + h}H${x}V${y + rad}${rad ? `A${rad} ${rad} 0 0 1 ${x + rad} ${y}` : ''}Z`;
    // an L of edge cut square at both ends; dimension marks in the quiet ink: the radius along the top, the edge's thickness at the cut end
    const corner = `<svg class="a" aria-hidden="true" style="left:0;top:0" width="${P.w}" height="${P.h}" viewBox="0 0 ${P.w} ${P.h}">`
      + `<clipPath id="u1-cc"><rect x="${bx - 1}" y="${by - 1}" width="${W + 1}" height="${H + 1}"/></clipPath>`
      + `<path clip-path="url(#u1-cc)" fill="${M.edge}" fill-rule="evenodd" d="${rr(bx, by, 900, 900, ro)} ${rr(bx + e, by + e, 900, 900, ri)}"/>`
      + `<g fill="${M.quiet}"><rect x="${bx}" y="${by - 16}" width="${Math.max(ro, 1)}" height="1"/><rect x="${bx}" y="${by - 20}" width="1" height="9"/><rect x="${bx + Math.max(ro, 1) - 1}" y="${by - 20}" width="1" height="9"/>`
      + `<rect x="${bx + W + 12}" y="${by}" width="1" height="${e}"/><rect x="${bx + W + 8}" y="${by}" width="9" height="1"/><rect x="${bx + W + 8}" y="${by + e - 1}" width="9" height="1"/></g></svg>`;
    let inner = corner
      + at(bx, by - 40, 'c12 u1-q u1-nw', `Radius ${mono(`${rIn} px`)}`)
      + at(bx + W + 24, by + e / 2 - 8, 'c12 u1-q u1-nw', `Edge ${mono(`${bw} px`)}`)
      + at(bx, by + H + 12, 'c13 b u1-t u1-nw', A(`An input's corner, ${k} times its size`));
    // the real components at 1:1, two columns, each with what it takes
    const cap = (t, v) => `<div class="c12 u1-q" style="margin-top:8px">${A(t)} ${v}</div>`;
    const c1 = 552 - ox, c2 = 760 - ox, cw = 176;
    inner += at(c1, 72 - oy, '', ui.field({ id: 'u1-rb1', label: F.dropoff || 'Name', value: F.dropoffValue || '', state: 'focus' }) + cap('Input', `${mono(`${rIn} px`)}, edge ${mono(`${bc.px} px`)}, focus ${mono(`${bf.px} px`)}`), '', cw)
      + at(c1, 208 - oy, '', `${ui.btn(F.book || 'Continue')}` + cap('Button', mono(`${ctx.radius.button} px`)), '', cw + 40)
      + at(c1, 320 - oy, '', `<div class="u1-row2"><span class="ui-avatar">${A(S.initials || '')}</span>${ui.switch('Text me', { checked: true })}</div>` + cap('Round', 'for avatars and switches only'), '', cw + 20)
      + at(c2, 72 - oy, '', ui.card({ meta: S.status, title: S.rider, text: S.riderNote }) + cap('Card', `${mono(`${rk} px`)}, divider ${mono(`${bh.px} px`)}`), '', cw);
    const body = uiPlate(P.x, P.y, P.w, P.h, 'light', ctx.edition === 'slot' ? `<div class="ph-tight">${inner}</div>` : inner);   // slot: compact placeholders inside the card
    const zone = note(72, 532, 400, 'Corners belong to the product', `Controls take ${ctx.radius.control} px and cards ${rk} px. The ticket around them is square, so the brand's corners show only where it ships.`)
      + note(520, 532, 416, 'Three widths of line', `Dividers ${mono(`${bh.px} px`)}, control edges ${mono(`${bc.px} px`)}, the focus ring ${mono(`${bf.px} px`)} on a gap of the ground, so it shows on any fill.`);
    return kitPage(ctx, R, 'radii-borders', { segments: surfaceBody(ctx, 'light'), body, zone });
  },

  // ---- 008: depth as steps, low to high, left to right: a sunken well, a card on the surface, a raised card, and a dialog on its edge.
  // The silhouette rises like a staircase; nothing casts a shadow ----
  elevation: (ctx) => {
    const R = roles(ctx), M = colourMap(ctx, 'dark'), S = sc(ctx), ui = ctx.ui, P = PLATE, D = S.dialog || {};
    const L = (h) => ctx.C.toOklch(h).L.toFixed(2);
    const capOf = (name, tok, how) => `<div class="u1-cap"><b>${A(name)}</b><span>${mono('--' + tok)} ${mono(M[tok])}, L ${L(M[tok])}</span><span>${A(how)}</span></div>`;
    const dlg = ui.dialog({ title: D.title || S.share, body: D.body || S.pickup, confirm: D.confirm || S.share, keep: D.keep || 'Cancel' }).replace(/dlg-t/g, 'u1-dlg');
    const steps = [
      [112, `<div class="u1-sk">${ui.skeleton('88px')}${ui.skeleton('60px')}${ui.skeleton('72px')}</div>`, capOf('Sunken', 'sunken', 'Skeletons and wells')],
      [184, ui.card({ meta: S.status, title: S.rider, text: S.riderNote }), capOf('Surface', 'surface', `A ${ctx.borders[0].px} px divider`)],
      [184, ui.card({ meta: S.deliverToLabel, title: S.deliverTo, text: S.paid, raised: true }), capOf('Raised', 'raised', 'A step in the ground')],
      [324, dlg, capOf('Floating', 'surface', `A ${ctx.brand.ui.border} px edge in --text`)],
    ];
    const inner = `<div class="u1-stairs" style="left:${72 - P.x}px;bottom:${P.y + P.h - 460}px">${steps.map(([w, c, cp]) => `<div class="u1-step" style="width:${w}px">${c}${cp}</div>`).join('')}</div>`;
    const body = uiPlate(P.x, P.y, P.w, P.h, 'dark', ctx.edition === 'slot' ? `<div class="ph-tight">${inner}</div>` : inner);   // slot: compact placeholders inside the cards
    const shadow = tokenGroups(ctx).shadow['shadow-float'];
    const zone = note(72, 532, 520, 'Steps and edges', A(ctx.brand.ui.elevationNote || ''))
      + note(664, 532, 272, 'Shadow', `${mono('--shadow-float')} is ${mono(String(shadow))}. The ticket is lifted the same way, one step above the page.`);
    return kitPage(ctx, R, 'elevation', { segments: surfaceBody(ctx, 'dark'), body, zone });
  },
};
