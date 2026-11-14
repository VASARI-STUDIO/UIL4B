// Theme 24, Standards, lane u1: the UI kit's chrome and its foundation pages (cover, contents, colour-light, colour-dark, type-scale,
// spacing, radii-borders, elevation). The kit is a volume of the same measured manual as the guidelines: the running head names the
// kit, one thumb tab per part (four parts), the x-ruler lights the extent of each page's one hero, and dimension lines give sizes in x.
// The theme's own move, the drawing then the thing, carries the kit: a component drawn large and dimensioned, beside the real
// component (ctx.ui, componentsCss) at 1:1 on the product surface it ships on. Components are never restyled.
//
// For lanes u2 and u3 (import these read-only):
//   kitPage(ctx, id, { bg, body, svg, inverted, tabs })   the page: body, the part's thumb tab (inverted on a dark right edge), the overlay svg
//   kitHead(ctx, id, parts?)                              the running head: "{Brand} UI kit", "{n} {part}", page title, folio
//   kitTitle(ctx, id, leadHtml, { x, y, w, ink, quiet })  the page title (c-title, h1) and a lead of at most three lines
//   uiPlate(x, y, w, h, mode, inner, style)               a .ui region (light, or dark under data-theme) on the page; children use page .a
//   modeInk(ctx, mode)                                    chrome colours over a mode's product surface { ground, ink, quiet, hair }
//   sc, kpg, ratioText, bodyFace, dispFace, typeOf, val   small pieces; plus the theme helpers re-exported below
// This lane's css() writes the dark token scope (.pg .ui[data-theme="dark"]) once; the light scope and componentsCss are in the theme base.
// Every class here starts u1-.
import { A, G, f2, pad3, xOf, fx, roles, adv, wrap, displayFont, loadFont, blk, fill, dimH, dimV, cropTicks, ruler, tab, head, page, span, dateLong } from './helpers.js';
import { colourMap, tokenGroups, statusText } from '../../engine/tokens.js';

export { A, G, f2, pad3, xOf, fx, roles, adv, wrap, displayFont, loadFont, blk, fill, dimH, dimV, cropTicks, ruler, tab, span, dateLong };

// ---------------------------------------------------------------- chrome (exported for the other kit lanes)

export const kpg = (ctx, id) => ctx.pages.find((q) => q.id === id);
export const sc = (ctx) => ctx.brand.ui.screen.content;
export const ratioText = (ctx, a, b) => `${ctx.fmt(ctx.ratio(a, b))} : 1`;
export const val = (s) => `<span class="val">${A(s)}</span>`;
export const typeOf = (ctx, token) => ctx.uiType.find((t) => t.token === token);
const nearest = (ctx, role, w) => {
  const fs = ctx.faces.filter((f) => f.role === role && f.style !== 'italic');
  return loadFont(fs.reduce((a, b) => (Math.abs(b.weight - w) < Math.abs(a.weight - w) ? b : a)).stem);
};
export const bodyFace = (ctx, w) => nearest(ctx, 'body', w);
export const dispFace = (ctx, w) => nearest(ctx, 'display', w);

// the chrome colours over a mode's product surface (the brand's own roles for that mode, all validated on the surface when it loads)
export function modeInk(ctx, mode) { const r = ctx.roles[mode]; return { ground: r.surface, ink: r.text, quiet: r.quiet, hair: r.divider }; }

// the running head: the kit's name, the part and the page; front pages print their own title in the part slot
export function kitHead(ctx, id, parts) {
  const p = kpg(ctx, id), R = roles(ctx);
  const slots = [[G.col[0], `${ctx.brand.name} UI kit`], [G.col[3], p.section ? `${p.section.n} ${p.section.title}` : p.title]];
  if (p.section) slots.push([G.col[6], p.title]);
  return head(ctx, id, parts || [{ x1: G.L, x2: G.R, col: R.ink, slots }]);
}

export function kitTitle(ctx, id, lead, { x = G.L, y = G.top, w = 380, ink, quiet } = {}) {
  const R = roles(ctx);
  return blk(x, y, w, 24, 'c-title', A(kpg(ctx, id).title), `color:${ink || R.ink}`, 'h1')
    + (lead ? blk(x, y + 32, w, 60, 'c-body', lead, `color:${quiet || R.quiet}`, 'p') : '');
}

export function kitPage(ctx, id, { bg, body = '', svg = '', inverted = false, tabs = true, cls = '' } = {}) {
  const p = kpg(ctx, id), R = roles(ctx);
  const t = tabs && p.section ? tab(ctx, p.section.n, { inverted }) : '';
  return page(ctx, id, { bg: bg || R.ground, body: body + t, svg, cls: `u1-k ${cls}`.trim() });
}

export const uiPlate = (x, y, w, h, mode, inner, style = '') => `<div class="ui u1-plate"${mode === 'dark' ? ' data-theme="dark"' : ''} style="left:${f2(x)}px;top:${f2(y)}px;width:${f2(w)}px;height:${f2(h)}px;${style}">${inner}</div>`;

export function css(ctx) {
  const decl = (o) => Object.entries(o).map(([k, v]) => `--${k}:${v}`).join(';');
  const stretch = ctx.brand.fonts.display.stretch || 100;
  return `.pg .ui[data-theme="dark"]{${decl(colourMap(ctx, 'dark'))}}
.pg .u1-plate{position:absolute;isolation:isolate}
.pg .u1-ch{font-family:var(--chrome);font-variant-numeric:tabular-nums}
.pg .u1-disp{font-family:var(--display);font-stretch:${stretch}%;letter-spacing:-0.01em}
.pg .u1-bd{font-family:var(--body)}
.pg .u1-reg{display:flex;justify-content:space-between;white-space:nowrap}
.pg .u1-no{font-size:20px;line-height:24px;font-weight:600}
.pg .u1-sec{font-size:20px;line-height:24px;font-weight:400;letter-spacing:-0.005em}
.pg .u1-cap{font-family:var(--chrome);font-size:12px;line-height:16px;font-weight:400}
.pg .u1-cap .val{line-height:16px}
.pg .u1-sk{display:flex;flex-direction:column;gap:12px}
.pg .u1-sk .ui-skeleton{height:14px}
.pg .u1-row{display:flex;align-items:center;gap:16px}
`;
}

// ---------------------------------------------------------------- page pieces

const WORD = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const Word = (n) => { const w = WORD[n] || String(n); return w[0].toUpperCase() + w.slice(1); };
const swatch = (x, y, hex, R) => fill(x, y, 12, 12, hex, `box-shadow:inset 0 0 0 1px ${R.hair}`);
// the largest size in sizes at which text sets on one line inside w
const fitOne = (font, text, w, sizes, track = 0) => sizes.find((s) => adv(font, text, s, track) <= w) || sizes[sizes.length - 1];
// a box-shadow's corner radius for a spread s on a corner of radius r (CSS Backgrounds 3: the spread radius is scaled when r < s)
const spreadR = (r, s) => (r === 0 ? 0 : r >= s ? r + s : r + s * (1 + Math.pow(r / s - 1, 3)));

// ---------------------------------------------------------------- colour (light and dark share one composition so the two compare)

function colourPage(ctx, id, mode) {
  const R = roles(ctx), M = colourMap(ctx, mode), S = sc(ctx), F = S.form || {}, ui = ctx.ui, W = ctx.weights;
  const r = (a, b) => ratioText(ctx, a, b);
  const P = { x: G.col[3], y: G.top, w: G.R - G.col[3], h: G.bottom - G.top }, PAD = 40, IW = P.w - 2 * PAD;
  // the hero: the product's live line in --text on the surface it ships on, as large as one line allows
  const dfont = dispFace(ctx, ctx.weights.heading), hs = fitOne(dfont, S.eta, IW, [96, 88, 80, 72, 64, 56, 48, 40], -0.01), hw = adv(dfont, S.eta, hs, -0.01);
  let inner = blk(PAD, PAD, IW, hs, 'u1-disp nw', A(S.eta), `font-size:${hs}px;line-height:${hs}px;font-weight:${ctx.weights.heading};color:${M.text}`, 'p')
    + blk(PAD, PAD + hs + 12, IW, 16, 'u1-cap nw', `${val('--text')} ${val(M.text)} on ${val('--surface')} ${val(M.surface)}, ${r(M.text, M.surface)}`, `color:${M.quiet}`);
  // the inks: real lines and the real status words, each with its token, its hex and its ratio on the surface
  const cw = Math.floor((IW - 3 * 24) / 4), cx = (i) => PAD + (i % 4) * (cw + 24);
  const inks = [['text-soft', `<p style="font-weight:${W.medium};color:${M['text-soft']}">${A(S.rider)}</p>`], ['quiet', `<p style="color:${M.quiet}">${A(S.riderNote)}</p>`]];
  if (M['action-text'] !== M.text) inks.push(['action-text', `<p style="font-weight:${W.medium};color:${M['action-text']}">${A(S.call)}</p>`]);
  const seen = new Set(inks.map((k) => k[0]));
  for (const s of ctx.status) { const t = statusText(ctx, mode, s), tok = t.token.slice(2); if (seen.has(tok)) continue; seen.add(tok); inks.push([tok, ui.statusChip(s.id)]); }
  const IY = PAD + hs + 64, rows = Math.ceil(inks.length / 4);
  inner += fill(PAD, IY, IW, 1, M.divider) + blk(PAD, IY + 12, IW, 16, 'u1-cap nw', 'Text and status on the surface', `font-weight:600;color:${M.text}`);
  inks.forEach(([tok, html], i) => {
    const y = IY + 44 + Math.floor(i / 4) * 92;
    inner += blk(cx(i), y, cw, 48, '', html) + blk(cx(i), y + 52, cw, 32, 'u1-cap', `${val('--' + tok)}<br>${val(M[tok])} ${r(M[tok], M.surface)}`, `color:${M.quiet}`);
  });
  // the action and the ring: the real button in each state it ships with, each with its fill and the label's ratio on it
  const CY = IY + 44 + rows * 92 + 8;
  inner += fill(PAD, CY, IW, 1, M.divider) + blk(PAD, CY + 12, IW, 16, 'u1-cap nw', 'The action, and the focus ring', `font-weight:600;color:${M.text}`);
  const states = [['action', null, r(M['action-label'], M.action)], ['action-hover', 'hover', r(M['action-label'], M['action-hover'])], ['action-pressed', 'pressed', r(M['action-label'], M['action-pressed'])], ['focus', 'focus', r(M.focus, M.surface)]];
  states.forEach(([tok, st], i) => {
    inner += blk(cx(i), CY + 44, cw, 44, '', ui.btn(F.book, { block: true, state: st || undefined }))
      + blk(cx(i), CY + 100, cw, 32, 'u1-cap', `${val('--' + tok)}<br>${val(M[tok])} ${r(...(tok === 'focus' ? [M.focus, M.surface] : [M['action-label'], M[tok]]))}`, `color:${M.quiet}`);
  });
  // the grounds and lines that are not the surface, as a register on the page
  const reg = [['Raised', 'raised', r(M.text, M.raised)], ['Sunken', 'sunken', r(M.text, M.sunken)], ['Divider', 'divider', r(M.divider, M.surface)], ['Control edge', 'edge', r(M.edge, M.surface)], ['Disabled', 'disabled-bg', r(M['disabled-text'], M['disabled-bg'])], ['Scrim', 'scrim', '']];
  const TY = G.bottom - reg.length * 32, TW = G.col[3] - 24 - G.L;
  let body = kitHead(ctx, id)
    + kitTitle(ctx, id, mode === 'dark'
      ? `The same roles under ${val('data-theme="dark"')}, measured again on the dark surface. Each ratio is the words on their fill, or the line on the surface.`
      : `The product's light roles, each measured where it is used. Components read a role such as ${val('--action')}, never a palette name.`, { w: TW })
    + blk(G.L, TY - 28, TW, 16, 'c-head nw', 'Grounds and lines', `color:${R.ink}`)
    + reg.map(([name, tok, rt], i) => {
      const y = TY + i * 32;
      return fill(G.L, y, TW, 1, i ? R.hair : R.ink) + swatch(G.L, y + 10, M[tok], R)
        + blk(G.L + 20, y + 6, 92, 20, 'c-body nw', A(name), `color:${R.ink}`)
        + blk(G.L + 116, y + 6, TW - 116, 20, 'c-body u1-reg', `<span class="val">${A(M[tok])}</span><span>${rt}</span>`, `color:${R.ink}`);
    }).join('') + fill(G.L, G.bottom, TW, 1, R.hair)
    + uiPlate(P.x, P.y, P.w, P.h, mode, inner);
  const svg = cropTicks(P.x, P.y, P.w, P.h, R.ink)
    + ruler(ctx, { uid: `u1${mode[0]}`, live: [P.x + PAD, P.x + PAD + hw] });
  return kitPage(ctx, id, { body, svg });
}

// ---------------------------------------------------------------- the pages

export const uikit = {
  // ---- cover: the volume on the product's dark surface. The primary button drawn at 4:1 and dimensioned, the real one at 1:1 beside
  // it; the logo as the maker's mark; the four parts indexed beside their tabs ----
  cover(ctx) {
    const B = ctx.brand, K = modeInk(ctx, 'dark'), x = xOf(ctx), S = sc(ctx), F = S.form || {}, ui = ctx.ui;
    const label = F.book || S.call, ct = typeOf(ctx, 'control') || { size: 16, weight: 500 };
    const pad = parseFloat(tokenGroups(ctx).space['sp-5'] || '20px'), bw = B.ui.border;
    // the button's width rounded up to a whole x, so its drawing measures in whole steps; the real one is set to the same width
    const w1 = Math.ceil((adv(bodyFace(ctx, ct.weight), label, ct.size) + 2 * pad + 2 * bw) / x) * x, h1 = 44;
    const k = Math.max(2, Math.min(4, Math.floor((820 - 64 - w1) / w1))), DW = w1 * k, DH = h1 * k, X0 = G.L, Y0 = 296;
    const RX = X0 + DW + 64, RY = Y0 + DH - h1;
    // the logo: the colourway whose ground is nearest the dark surface, the reversed one on a tie
    const cws = B.logo.colourways, L = (h) => ctx.C.toOklch(h).L, dL = (k2) => Math.round(Math.abs(L(cws[k2].ground) - L(K.ground)) * 50);
    const cw = Object.keys(cws).sort((a, b) => dL(a) - dL(b) || (b === 'reversed') - (a === 'reversed'))[0];
    const asp = ctx.logo.geo.aspect; let lh = 40, lw = lh * asp; if (lw > 280) { lw = 280; lh = lw / asp; }
    const logo = `<div class="a" style="left:${G.L}px;top:48px;width:${f2(lw)}px;height:${f2(lh)}px">${ctx.logo.html('colour', { width: f2(lw), colourway: cw, color: K.ink, label: 'Logo' })}</div>`;
    const TY = Math.round(48 + lh + 24);
    const index = ctx.sections.map((s) => {
      const y = G.top + (s.n - 1) * G.tabPitch + 4;
      return blk(900, y, 120, 16, 'c-head nw', A(s.title), `color:${K.ink}`) + blk(1023, y, 60, 16, 'c-micro nw', pad3(ctx.pageNo(s.pages[0].id)), `text-align:right;font-weight:600;color:${K.ink}`)
        + tab(ctx, s.n, { inverted: true });
    }).join('');
    const body = logo
      + blk(G.L, TY, 400, 24, 'c-title nw', 'UI kit', `color:${K.ink}`, 'h1')
      + blk(G.L, TY + 28, 400, 40, 'c-body', `${A(B.name)}, version ${A(B.version.number)}. ${A(dateLong(B.version.date))}.`, `color:${K.quiet}`, 'p')
      + index
      + `<div class="a" style="left:${X0}px;top:${Y0}px;width:${DW}px;height:${DH}px"><div class="ui" data-theme="dark" style="zoom:${k};width:${w1}px">${ui.btn(label, { block: true })}</div></div>`
      + blk(X0, Y0 + DH + 16, DW, 16, 'c-micro nw', `Primary button, drawn at ${k}:1`, `color:${K.quiet}`)
      + `<div class="ui a" data-theme="dark" style="left:${RX}px;top:${RY}px;width:${w1}px">${ui.btn(label, { block: true })}</div>`
      + blk(RX, Y0 + DH + 16, 160, 16, 'c-micro nw', 'At size', `color:${K.quiet}`)
      + blk(G.L, 668, 440, 40, 'c-body', `Sizes are given in px, the unit the code uses, and in x. One x is ${x} px, the step of the spacing scale.`, `color:${K.ink}`, 'p');
    const svg = dimH(ctx, { x1: X0, x2: X0 + DW, y: Y0 - 20, label: fx(ctx, w1), col: K.ink, qcol: K.quiet, obj: Y0 })
      + dimV(ctx, { x: 40, y1: Y0, y2: Y0 + DH, label: fx(ctx, h1), col: K.ink, qcol: K.quiet, obj: X0, labelAt: 34 })
      + dimH(ctx, { x1: RX, x2: RX + w1, y: RY - 20, label: fx(ctx, w1), col: K.ink, qcol: K.quiet, obj: RY })
      + dimV(ctx, { x: RX + w1 + 16, y1: RY, y2: RY + h1, label: fx(ctx, h1), col: K.ink, qcol: K.quiet, obj: RX + w1, right: true })
      + ruler(ctx, { uid: 'u1cv', pieces: [{ x1: G.L, x2: G.R, ink: K.ink, quiet: K.quiet, hair: K.quiet }], live: [X0, X0 + DW] });
    return page(ctx, 'cover', { bg: K.ground, body, svg, cls: 'u1-k' });
  },

  // ---- contents: the four parts as rows level with their tabs; under them the whole kit as one bar of cells, a cell a page, each part's
  // run dimensioned with its page count and this page shaded in the brand's highlight ----
  contents(ctx) {
    const R = roles(ctx), N = ctx.pages.length, secs = ctx.sections, BY = 568, BH = 64, cw = G.W / N, X = (i) => G.L + i * cw;
    let body = '', svg = '';
    ctx.pages.forEach((q, i) => {
      const x0 = f2(X(i)), w = f2(i === N - 1 ? G.R - X(i) : cw - 2), here = q.id === 'contents';
      const bg = here ? R.field : q.section ? R.dark : null, fg = here ? R.fieldInk : q.section ? R.darkInk : R.ink;
      body += (bg ? fill(x0, BY, w, BH, bg) : `<div class="a" style="left:${x0}px;top:${BY}px;width:${w}px;height:${BH}px;box-shadow:inset 0 0 0 1px ${R.ink}"></div>`)
        + blk(x0, BY + BH - 24, w, 16, 'c-micro nw', pad3(ctx.pageNo(q.id)), `text-align:center;font-weight:600;color:${fg}`);
    });
    const RX = G.col[3], LX = G.col[6], FX = G.col[10];
    for (const s of secs) {
      const first = ctx.pageNo(s.pages[0].id), last = ctx.pageNo(s.pages[s.pages.length - 1].id), n = s.pages.length;
      const x1 = X(first - 1), x2 = last === N ? G.R : X(last) - 2, y = G.top + (s.n - 1) * G.tabPitch;
      svg += dimH(ctx, { x1, x2, y: BY - 20, label: `${n} ${n === 1 ? 'page' : 'pages'}`, col: R.ink, qcol: R.quiet, obj: BY });
      body += blk(f2(x1), BY + BH + 8, 40, 16, 'c-head nw', String(s.n), `color:${R.ink}`)
        + fill(RX, y, G.R - RX, 1, s.n === 1 ? R.ink : R.hair)
        + blk(RX, y + 8, 32, 24, 'u1-no nw', String(s.n), `color:${R.ink}`)
        + blk(RX + 38, y + 8, LX - RX - 62, 24, 'u1-sec nw', A(s.title), `color:${R.ink}`, 'h2')
        + blk(LX, y + 10, span(4), 56, 'c-body', A(s.pages.map((q) => kpg(ctx, q.id).title).join('; ')), `color:${R.quiet}`, 'p')
        + blk(FX, y + 12, G.R - FX, 16, 'c-micro nw', `${pad3(first)}${n > 1 ? ` to ${pad3(last)}` : ''}`, `text-align:right;font-weight:600;color:${R.ink}`)
        + tab(ctx, s.n);
    }
    const TW = RX - 24 - G.L, spec = [['Pages', String(N)], ['Parts', String(secs.length)], ['Page', `${Math.round((ctx.size.w * 25.4) / 96)} × ${Math.round((ctx.size.h * 25.4) / 96)} mm`], ['Unit', `1x = ${xOf(ctx)} px`]];
    const SY = 248;
    body += kitHead(ctx, 'contents')
      + kitTitle(ctx, 'contents', `${Word(N)} pages in ${WORD[secs.length] || secs.length} parts. The bar is the kit at one cell a page, each run a part; the shaded cell is this page.`, { w: TW })
      + spec.map(([a, b], i) => fill(G.L, SY + i * 32, TW, 1, i ? R.hair : R.ink) + blk(G.L, SY + i * 32 + 6, TW, 20, 'c-body u1-reg', `<span>${a}</span><span>${A(b)}</span>`, `color:${R.ink}`)).join('')
      + fill(G.L, SY + spec.length * 32, TW, 1, R.hair);
    svg += ruler(ctx, { uid: 'u1t', live: [G.L, G.R], edgeAnchor: true });
    return page(ctx, 'contents', { bg: R.ground, body, svg, cls: 'u1-k' });
  },

  'colour-light': (ctx) => colourPage(ctx, 'colour-light', 'light'),
  'colour-dark': (ctx) => colourPage(ctx, 'colour-dark', 'dark'),

  // ---- type-scale: every text style, largest first, set in a line of the product at the size it ships; each line box measured in x
  // at the left, the token and its literal values at the right ----
  'type-scale'(ctx) {
    const R = roles(ctx), B = ctx.brand, S = sc(ctx), F = S.form || {}, D = S.dialog || {}, E = S.empty || {};
    const cand = { headline: [S.eta, E.title], title: [S.rider, B.ui.screen.title], time: [S.time], 'title-s': [D.title, F.title], control: [F.book], body: [S.pickup, S.riderNote], label: [F.pickup, F.dropoff], caption: [F.notesHelp, F.bookWhy] };
    const rows = [...ctx.uiType].sort((a, b) => b.size - a.size || b.line - a.line);
    const SX = G.col[1], SW = G.col[7] - 24 - SX, CT = G.col[7], CV = 772, CW = 900, CF = 964;
    const disp = (t) => t.face === 'display';
    const pick = (t) => {
      const f = disp(t) ? dispFace(ctx, t.weight) : bodyFace(ctx, t.weight), tr = disp(t) ? -0.01 : 0;
      const text = [...(cand[t.token] || []), S.status, S.eta].filter(Boolean).find((s) => adv(f, s, t.size, tr) <= SW) || t.use;
      return { text, w: Math.min(SW, adv(f, text, t.size, tr)) };
    };
    const HY = 200, top = HY + 24, total = rows.reduce((a, t) => a + t.line, 0);
    const gap = Math.min(48, Math.floor((G.bottom - top - total) / rows.length));
    let y = top, body = '', svg = '', widest = 0;
    rows.forEach((t, i) => {
      const yy = y + gap / 2, s = pick(t), ty = Math.round(yy + (t.line - 20) / 2);
      widest = Math.max(widest, s.w);
      body += fill(G.L, y, G.W, 1, i ? R.hair : R.ink)
        + blk(SX, yy, SW, t.line, `nw ${disp(t) ? 'u1-disp' : 'u1-bd'}`, A(s.text), `font-size:${t.size}px;line-height:${t.line}px;font-weight:${t.weight};color:${R.ink}`, 'p')
        + blk(CT, ty, CV - CT - 12, 20, 'c-name nw', A(t.token), `color:${R.ink}`)
        + blk(CV, ty, CW - CV - 12, 20, 'nw', val(`${t.size} / ${t.line} px`), `color:${R.ink}`)
        + blk(CW, ty, CF - CW - 12, 20, 'nw', val(String(t.weight)), `color:${R.ink}`)
        + blk(CF, ty, G.R - CF, 20, 'c-body nw', disp(t) ? 'Display' : 'Body', `color:${R.quiet}`);
      svg += dimV(ctx, { x: 120, y1: yy, y2: yy + t.line, label: fx(ctx, t.line), col: R.ink, qcol: R.quiet, obj: SX, labelY: yy + t.line / 2 + 4 });
      y += t.line + gap;
    });
    body += fill(G.L, y, G.W, 1, R.hair);
    const heads = [[G.L, 'Line'], [SX, 'Set at its size'], [CT, 'Token'], [CV, 'Size / line'], [CW, 'Weight'], [CF, 'Face']];
    const d = B.fonts.display, b = B.fonts.body, min = Math.min(...rows.map((t) => t.size));
    body = kitHead(ctx, 'type-scale')
      + kitTitle(ctx, 'type-scale', `${Word(rows.length)} styles in two faces, ${A(d.family)} and ${A(b.family)}, largest first. Each line is the product's own, at the size it ships; nothing is smaller than ${min} px.`)
      + heads.map(([hx, h]) => blk(hx, HY, 140, 16, 'c-head nw', h, `color:${R.ink}`)).join('') + body;
    svg += ruler(ctx, { uid: 'u1y', live: [SX, SX + widest] });
    return kitPage(ctx, 'type-scale', { body, svg });
  },

  // ---- spacing: the steps drawn at 4:1 in the brand's highlight, side by side and bottom-aligned, each dimensioned in x with its
  // token and px under it, and at true size under that ----
  spacing(ctx) {
    const R = roles(ctx), sp = ctx.space, keys = Object.keys(tokenGroups(ctx).space), n = sp.length, GAP = 16, MINW = 56;
    let k = 4; while (k > 1 && sp.reduce((a, s) => a + Math.max(k * s.px, MINW), 0) + (n - 1) * GAP > G.W) k--;
    const B0 = 528;
    let x = G.L, body = '', svg = '', right = G.L;
    sp.forEach((s, i) => {
      const d = s.px * k;
      body += fill(x, B0 - d, d, d, R.field)
        + blk(x, B0 + 40, MINW + 8, 16, 'nw', val(`--${keys[i]}`), `color:${R.ink}`)
        + blk(x, B0 + 58, MINW, 16, 'c-micro nw', `${s.px} px`, `color:${R.quiet}`)
        + fill(x, B0 + 96, s.px, s.px, R.ink);
      svg += dimH(ctx, { x1: x, x2: x + d, y: B0 + 28, label: fx(ctx, s.px), col: R.ink, qcol: R.quiet, obj: B0, above: true });
      right = x + d; x += Math.max(d, MINW) + GAP;
    });
    body = kitHead(ctx, 'spacing')
      + kitTitle(ctx, 'spacing', `${Word(n)} steps, each a whole number of x. Each is drawn at ${k}:1 over its token, and at true size under it. Every gap and padding in the kit is one of these.`)
      + body;
    svg += ruler(ctx, { uid: 'u1s', live: [G.L, right] });
    return kitPage(ctx, 'spacing', { body, svg });
  },

  // ---- radii-borders: detail A, the top-left corner of a focused input drawn at 16:1 (the ring, the gap of surface, the edge, the
  // radius), beside the real input it is taken from, the button, an avatar and a card; the radii and widths as one register ----
  'radii-borders'(ctx) {
    const R = roles(ctx), M = colourMap(ctx, 'light'), S = sc(ctx), F = S.form || {}, ui = ctx.ui;
    const r = ctx.radius.input, b = ctx.brand.ui.border, k = 16, RX0 = -6, RY0 = -6, RW = 30, RH = 22, DX = 72, DY = 264, W = RW * k, H = RH * k;
    const px = (v) => DX + (v - RX0) * k, py = (v) => DY + (v - RY0) * k, FAR = 2000;
    // a rectangle whose top-left corner is at offset o (real px) with radius rad, running off the detail to the right and down
    const rr = (o, rad) => { const x0 = px(o), y0 = py(o), q = rad * k; return `M${f2(x0 + q)} ${f2(y0)}H${FAR}V${FAR}H${f2(x0)}V${f2(y0 + q)}${q ? `A${f2(q)} ${f2(q)} 0 0 1 ${f2(x0 + q)} ${f2(y0)}` : ''}Z`; };
    const detail = `<clipPath id="u1-rc"><rect x="${DX}" y="${DY}" width="${W}" height="${H}"/></clipPath><g clip-path="url(#u1-rc)">`
      + `<rect x="${DX}" y="${DY}" width="${W}" height="${H}" fill="${M.surface}"/>`
      + `<path fill="${M.focus}" fill-rule="evenodd" d="${rr(-4, spreadR(r, 4))} ${rr(-2, spreadR(r, 2))}"/>`
      + `<path fill="${M.edge}" fill-rule="evenodd" d="${rr(0, r)} ${rr(b, Math.max(0, r - b))}"/></g>`
      + cropTicks(DX, DY, W, H, R.ink);
    const bands = [[-4, -2, '2 px focus ring'], [-2, 0, '2 px gap'], [0, b, `${b} px edge`]];
    let svg = detail + dimH(ctx, { x1: px(0), x2: px(r), y: DY - 20, label: `${r} px radius`, col: R.ink, qcol: R.quiet, obj: py(0), outside: true })
      + bands.map(([a, z, l], i) => dimH(ctx, { x1: px(a), x2: px(z), y: DY + H + 20 + i * 16, label: l, col: R.ink, qcol: R.quiet, obj: DY + H, outside: true, labelAt: px(b) + 12 })).join('');
    // the real components at 1:1; the marker on the input is the region detail A draws
    const CX = G.col[6] + 44, CY = 248, lab = typeOf(ctx, 'label') || { line: 20 }, ctop = CY + lab.line + 6;
    let body = `<div class="ui a" style="left:${CX}px;top:${CY}px;width:240px">${ui.field({ id: 'u1-rbf', label: F.dropoff, value: F.dropoffValue, state: 'focus' })}</div>`
      + `<div class="ui a" style="left:${CX + 264}px;top:${ctop}px">${ui.btn(F.book)}</div>`
      + `<div class="ui a" style="left:${G.R - 40}px;top:${ctop + 2}px"><span class="ui-avatar">${A(S.initials || '')}</span></div>`
      + `<div class="ui a" style="left:${CX}px;top:360px;width:272px">${ui.card({ meta: S.status, title: S.rider, text: S.riderNote })}</div>`
      + blk(CX - 26, ctop - 10, 14, 16, 'c-head nw', 'A', `color:${R.ink}`)
      + blk(DX, DY - 64, W, 16, 'c-head nw', `Detail A, drawn at ${k}:1`, `color:${R.ink}`);
    svg += `<rect x="${CX - 6.5}" y="${ctop - 6.5}" width="${RW}" height="${RH}" fill="none" stroke="${R.ink}" stroke-width="1"/>`;
    // the register: every radius and line width the kit ships, by its css name
    const reg = [...ctx.radii.map((q) => [q.token.replace('radius-', 'r-'), q.px, q.use]), ...ctx.borders.map((q) => [q.token.replace('border-', 'w-'), q.px, q.use])].slice(0, 6);
    const TY = G.bottom - reg.length * 32, TX = CX, VX = TX + 128, UX = VX + 64;
    body += reg.map(([t, v, u], i) => fill(TX, TY + i * 32, G.R - TX, 1, i ? R.hair : R.ink)
      + blk(TX, TY + i * 32 + 6, VX - TX - 8, 20, 'nw', val(`--${t}`), `color:${R.ink}`)
      + blk(VX, TY + i * 32 + 6, UX - VX - 8, 20, 'c-body nw', `${v} px`, `color:${R.ink}`)
      + blk(UX, TY + i * 32 + 6, G.R - UX, 20, 'c-body nw', A(u), `color:${R.quiet}`)).join('') + fill(TX, G.bottom, G.R - TX, 1, R.hair);
    body = kitHead(ctx, 'radii-borders')
      + kitTitle(ctx, 'radii-borders', `Corners and line widths. Detail A is the top-left corner of a focused input, drawn at ${k}:1: the focus ring, a gap of surface, the edge and its radius.`)
      + body;
    svg += ruler(ctx, { uid: 'u1r', live: [DX, DX + W] });
    return kitPage(ctx, 'radii-borders', { body, svg });
  },

  // ---- elevation: plan and elevation, as a drawing has them. The real components on the surface above (a loading well, a card, a raised
  // card, a dialog); under each, projected down, its section: below the surface, on it, a step up, or floating on its edge ----
  elevation(ctx) {
    const R = roles(ctx), M = colourMap(ctx, 'light'), S = sc(ctx), D = S.dialog || {}, ui = ctx.ui, bw = ctx.brand.ui.border;
    const shadow = tokenGroups(ctx).shadow['shadow-float'];
    const ws = [192, 192, 192, 360], gap = (G.W - ws.reduce((a, c) => a + c, 0)) / (ws.length - 1);
    const xs = ws.map((_, i) => G.L + ws.slice(0, i).reduce((a, c) => a + c + gap, 0));
    const PB = 464, SY = 576, hgt = ctx.size.h;
    const plan = [
      `<div class="u1-sk">${ui.skeleton('100%')}${ui.skeleton('72%')}${ui.skeleton('86%')}</div>`,
      ui.card({ meta: S.status, title: S.rider, text: S.riderNote }),
      ui.card({ meta: S.deliverToLabel, title: S.deliverTo, text: S.paid, raised: true }),
      ui.dialog({ title: D.title || S.share, body: D.body || S.pickup, confirm: D.confirm || S.share, keep: D.keep || S.call }).replace(/dlg-t/g, 'u1-dlg'),
    ];
    // each section: [top of the slab, its depth, fill, edge colour, edge width]
    const sect = [[SY, 16, M.sunken, R.ink, 1], [SY - 16, 16, M.surface, R.ink, 1], [SY - 32, 32, M.raised, R.ink, 1], [SY - 88, 16, M.surface, M.text, bw]];
    const labels = [
      ['Sunken', 'sunken', 'Below the surface: wells and loading bars.'],
      ['Surface', 'surface', `On the surface, a ${ctx.borders[0].px} px divider round it.`],
      ['Raised', 'raised', 'A step up in the ground, no line.'],
      ['Floating', 'surface', `A ${bw} px edge in ${'--text'}; the shadow token is ${shadow}.`],
    ];
    let body = '', svg = '';
    xs.forEach((x, i) => {
      const w = ws[i], [top, dep, fc, ec, ew] = sect[i];
      body += `<div class="ui a" style="left:${f2(x)}px;bottom:${hgt - PB}px;width:${w}px">${plan[i]}</div>`
        + blk(f2(x), SY + 32, w, 20, 'c-name nw', A(labels[i][0]), `color:${R.ink}`, 'h2')
        + blk(f2(x), SY + 54, w, 20, 'nw', `${val('--' + labels[i][1])} ${val(M[labels[i][1]])}`, `color:${R.ink}`)
        + blk(f2(x), SY + 78, w, 40, 'c-body', labels[i][2], `color:${R.quiet}`, 'p');
      // the projection lines from the plan down to the section, and the slab
      for (const X of [x + 0.5, x + w - 0.5]) svg += `<path d="M${f2(X)} ${PB + 8}V${top - 6}" stroke="${R.quiet}" stroke-width="1" stroke-dasharray="2 3" fill="none"/>`;
      const h = ew / 2;
      svg += i === 0
        ? `<rect x="${f2(x)}" y="${SY}" width="${w}" height="${dep}" fill="${fc}"/><path d="M${f2(x + 0.5)} ${SY}V${SY + dep - 0.5}H${f2(x + w - 0.5)}V${SY}" stroke="${ec}" stroke-width="1" fill="none"/>`
        : `<rect x="${f2(x + h)}" y="${f2(top + h)}" width="${f2(w - ew)}" height="${f2(dep - ew)}" fill="${fc}" stroke="${ec}" stroke-width="${ew}"/>`;
    });
    // the surface line, broken where the well goes down into it
    svg += `<rect x="${G.L}" y="${SY}" width="${f2(xs[0] - G.L)}" height="1" fill="${R.ink}"/><rect x="${f2(xs[0] + ws[0])}" y="${SY}" width="${f2(G.R - xs[0] - ws[0])}" height="1" fill="${R.ink}"/>`;
    const lead = ctx.brand.ui.elevationNote ? A(ctx.brand.ui.elevationNote) : 'Depth is shown by the ground a component sits on and by its edge.';
    body = kitHead(ctx, 'elevation') + kitTitle(ctx, 'elevation', lead, { w: 440 }) + body;
    svg += ruler(ctx, { uid: 'u1e', live: [G.L, G.R], edgeAnchor: true });
    return kitPage(ctx, 'elevation', { body, svg });
  },
};
