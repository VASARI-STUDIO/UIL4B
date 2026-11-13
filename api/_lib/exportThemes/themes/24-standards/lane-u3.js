// Theme 24, Standards, lane u3: the UI kit's screens and code (dialog, table, empty, screen-light, screen-dark, screen-mobile, tokens, code).
// The kit chrome (running head, title, thumb tab, x-ruler, dimension lines, plates) is lane u1's, imported read-only. Each page keeps the
// theme's move, the drawing then the thing: the real component (ctx.ui, componentsCss) drawn large and dimensioned in x, or the real
// screen on the product surface it ships on. Components are never restyled. Every measure is read from the shipped componentsCss or
// the brand's ui data; every token, value and code line is read from the engine's own exports. Every class here starts u3-.
import { A, G, f2, xOf, fx, roles, adv, wrap, blk, fill, dimH, dimV, cropTicks, ruler, kitHead, kitTitle, kitPage, uiPlate, val, sc, typeOf, bodyFace, dispFace } from './lane-u1.js';
import { colourMap, tokenGroups, tokensCss, tailwindCss } from '../../engine/tokens.js';
import { componentsCss, iconSet } from '../../engine/components.js';

// ---------------------------------------------------------------- small pieces

const cssCache = new WeakMap();
function shipped(ctx, sel, prop) {
  if (!cssCache.has(ctx)) cssCache.set(ctx, componentsCss(ctx));
  const css = cssCache.get(ctx), key = `\n${sel} {`, i = css.indexOf(key);
  if (i < 0) throw new Error(`standards u3: ${sel} is not in componentsCss`);
  const m = new RegExp(`(?:^|;)\\s*${prop}:\\s*([^;]+)`).exec(css.slice(i + key.length, css.indexOf('}', i)));
  if (!m) throw new Error(`standards u3: ${sel} has no ${prop}`);
  return m[1].trim();
}
const shippedPx = (ctx, sel, prop) => parseFloat(shipped(ctx, sel, prop));
const ex = (ctx) => ({ account: 'Account', crumbs: ['Home', 'Section'], tabs: ['One', 'Two', 'Three'], links: [['One', 'map-pin'], ['Two', 'plus'], ['Three', 'clock']], ...(sc(ctx).example || {}) });
const dc = (ctx) => { const R = roles(ctx); return { col: R.ink, qcol: R.quiet }; };
const hD = (ctx, o) => dimH(ctx, { ...dc(ctx), ...o });
const vD = (ctx, o) => dimV(ctx, { ...dc(ctx), ...o });
const vChain = (ctx, y0, k, segs, x, obj) => { let a = y0, s = ''; for (const v of segs) { s += vD(ctx, { x, y1: a, y2: a + v * k, label: fx(ctx, v), obj, labelY: a + (v * k) / 2 + 4 }); a += v * k; } return s; };
const cap = (x, y, w, text, col, cls = 'c-micro nw') => blk(f2(x), f2(y), w, 16, cls, text, `color:${col}`);
// a real component on the page: light, or dark under data-theme
const at = (x, y, w, inner, mode = 'light', extra = '') => `<div class="ui a"${mode === 'dark' ? ' data-theme="dark"' : ''} style="left:${f2(x)}px;top:${f2(y)}px;${w ? `width:${f2(w)}px;` : ''}${extra}">${inner}</div>`;
// a register: name left, value right, hairline above each row
function reg(ctx, x, y, w, rows) {
  const R = roles(ctx);
  return rows.map(([n, v], i) => fill(x, y + i * 32, w, 1, i ? R.hair : R.ink) + blk(x, y + i * 32 + 6, w, 20, 'c-body u3-reg nw', `<span>${A(n)}</span><span>${v}</span>`, `color:${R.ink}`)).join('')
    + fill(x, y + rows.length * 32, w, 1, R.hair);
}
const px4 = (ctx, p) => `${f2(p)} px, ${fx(ctx, p)}`;
const logoFor = (ctx, mode, width) => {
  const cw = mode === 'dark' ? (ctx.brand.logo.colourways.reversed ? 'reversed' : 'mono-light') : undefined;
  return ctx.logo.html('horizontal', { width, colourway: cw, label: 'Logo' });
};

// ---------------------------------------------------------------- screen pieces (the shipped components, composed as the product uses them)

function topbar(ctx, mode, active = 0) {
  const X = ex(ctx), S = sc(ctx);
  return `<nav class="ui-topbar" aria-label="Main"><span>${logoFor(ctx, mode, 112)}</span><div class="ui-topbar__links">${ctx.ui.links(X.links, active)}</div><span class="ui-avatar" aria-label="${A(X.account)}">${A(S.initials)}</span></nav>`;
}
function progress(ctx) {
  const S = sc(ctx), p = Math.max(0, Math.min(1, S.progress || 0)) * 100;
  return `<div class="u3-prog"><div class="ui-progress" role="img" aria-label="${A(S.from)} to ${A(S.to)}"><div class="ui-progress__bar"><i style="width:${p}%"></i></div><span class="ui-progress__dot" style="left:${p}%"></span></div><div class="u3-ends"><span>${A(S.from)}</span><span>${A(S.to)}</span></div></div>`;
}
function riderRow(ctx) {
  const S = sc(ctx);
  return `<div class="u3-rider"><span class="ui-avatar">${A(S.initials)}</span><div class="u3-who"><p class="u3-b">${A(S.rider)}</p><p class="u3-q">${A(S.riderNote)}</p></div>${ctx.ui.btn(S.call, { variant: 'secondary', size: 'sm' })}</div>`;
}
function facts(ctx) {
  const S = sc(ctx);
  return `<dl class="u3-dl"><div><dt>${A(S.deliverToLabel)}</dt><dd>${A(S.deliverTo)}</dd></div><div><dt>${A(S.paidLabel)}</dt><dd>${A(S.paid)}</dd></div></dl>`;
}
const liveStatus = (ctx) => (ctx.status.find((s) => s.label === sc(ctx).status) || {}).id || sc(ctx).deliveries[0].status;
const liveTop = (ctx, cls = '') => `<div class="u3-live ${cls}">${ctx.ui.statusChip(liveStatus(ctx))}<h2 class="ui-display u3-eta">${A(sc(ctx).eta)}</h2><p class="u3-soft">${A(sc(ctx).pickup)}</p>${progress(ctx)}${riderRow(ctx)}</div>`;

// the phone: 390 x 844, a top bar, the live block at a fixed height, rows, the one action, and the tab bar
const PH = { w: 390, h: 844, live: 320 };
function phoneTop(ctx) { return `${topbar(ctx, 'light').replace(/<div class="ui-topbar__links">[\s\S]*?<\/div>/, '')}${liveTop(ctx, 'u3-live--ph')}`; }
function phone(ctx) {
  const X = ex(ctx), S = sc(ctx), tabs = [...X.links.slice(0, 3), [X.account, 'user']];
  return `<div class="ui u3-ph">${phoneTop(ctx)}<div class="u3-prows">${ctx.ui.deliveryRows(4)}</div><div class="u3-pfoot">${ctx.ui.btn(S.share || S.call, { block: true })}</div>`
    + `<nav class="ui-tabbar" aria-label="Sections">${tabs.map(([t, i], k) => `<a href="#"${k === 0 ? ' aria-current="page"' : ''}>${ctx.ui.icon(i, 20)}${A(t)}</a>`).join('')}</nav></div>`;
}

// ---------------------------------------------------------------- css

export function css(ctx) {
  const stretch = ctx.brand.fonts.display.stretch || 100;
  return `.pg .u3-reg{display:flex;justify-content:space-between;white-space:nowrap}
.pg .u3-scr{display:flex;flex-direction:column;width:100%;height:100%}
.pg .u3-main{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 240px;column-gap:32px;padding:24px 24px 0}
.pg .u3-main>div{min-width:0;display:flex;flex-direction:column}
.pg .u3-h{margin:8px 0 16px;font-size:var(--fs-title);line-height:var(--lh-title);font-stretch:${stretch}%}
.pg .u3-form{display:flex;flex-direction:column;gap:12px;margin-top:8px}
.pg .u3-side{gap:16px}
.pg .u3-live{display:flex;flex-direction:column;align-items:flex-start;gap:12px}
.pg .u3-live>*{max-width:100%}
.pg .u3-live--ph{height:${PH.live}px;padding:20px}
.pg .u3-eta{margin:0;font-size:var(--fs-headline);line-height:var(--lh-headline);font-stretch:${stretch}%}
.pg .u3-soft{margin:0;color:var(--text-soft);max-width:44ch}
.pg .u3-prog{width:100%;display:flex;flex-direction:column;gap:4px}
.pg .u3-ends{display:flex;justify-content:space-between;gap:12px;font-size:var(--fs-caption);line-height:var(--lh-caption);color:var(--quiet)}
.pg .u3-rider{width:100%;display:flex;align-items:center;gap:12px}
.pg .u3-who{flex:1;min-width:0}
.pg .u3-b{margin:0;font-weight:600;line-height:var(--lh-label)}
.pg .u3-q{margin:0;color:var(--quiet);font-size:var(--fs-label);line-height:var(--lh-label)}
.pg .u3-dl{margin:0;display:flex;flex-direction:column;gap:12px}
.pg .u3-dl dt{font-size:var(--fs-label);line-height:var(--lh-label);color:var(--quiet)}
.pg .u3-dl dd{margin:0;font-weight:600}
.pg .u3-ph{position:relative;width:${PH.w}px;height:${PH.h}px;overflow:hidden}
.pg .u3-ph .ui-topbar{padding:0 20px}
.pg .u3-prows{padding:0 20px}
.pg .u3-pfoot{position:absolute;left:20px;right:20px;bottom:80px}
.pg .u3-ph .ui-tabbar{position:absolute;left:0;right:0;bottom:0}
.pg .u3-skr{display:flex;flex-direction:column;gap:8px;flex:1}
.pg .u3-pre{position:absolute;margin:0;font-family:var(--mono);font-weight:400;white-space:pre;font-variant-numeric:tabular-nums}
.pg .u3-p15{font-size:15px;line-height:24px}
.pg .u3-p12{font-size:12px;line-height:16px}
.pg .u3-sw{position:absolute;width:12px;height:12px;box-sizing:border-box}
`;
}

// ---------------------------------------------------------------- the pages

export const uikit = {
  // ---- dialog: the shipped dialog on its scrim, drawn at 1.5:1, its box and its run of paddings dimensioned in x ----
  dialog(ctx) {
    const R = roles(ctx), S = sc(ctx), D = S.dialog, bw = ctx.brand.ui.border, k = 1.5, TW = G.col[3] - 24 - G.L;
    const maxW = shippedPx(ctx, '.ui-dialog', 'max-width'), pad = shippedPx(ctx, '.ui-dialog', 'padding'), gap = shippedPx(ctx, '.ui-dialog', 'gap');
    const actTop = shippedPx(ctx, '.ui-dialog__actions', 'margin-top'), btnH = shippedPx(ctx, '.ui-btn', 'height'), sp = shippedPx(ctx, '.ui-scrim', 'padding');
    const tt = typeOf(ctx, 'title-s'), bt = typeOf(ctx, 'body'), cw = maxW - 2 * bw - 2 * pad;
    const tl = wrap(dispFace(ctx, ctx.weights.heading), D.title, tt.size, cw, -0.01).length, xl = wrap(bodyFace(ctx, ctx.weights.regular), D.body, bt.size, cw).length;
    const dh = 2 * bw + 2 * pad + tl * tt.line + gap + xl * bt.line + gap + actTop + btnH;
    const pw = (maxW + 2 * sp) * k, ph = (dh + 2 * sp) * k, PX = G.R - pw, PY = 136, DX = PX + sp * k, DY = PY + sp * k;
    const dlg = ctx.ui.dialog(D).replace(/dlg-t/g, 'u3-dlg-t');
    const plate = uiPlate(PX, PY, pw, ph, 'light', `<div class="ui-scrim" style="zoom:${k};width:${maxW + 2 * sp}px;height:${dh + 2 * sp}px">${dlg}</div>`);
    let svg = cropTicks(PX, PY, pw, ph, R.ink) + hD(ctx, { x1: DX, x2: DX + maxW * k, y: PY - 24, label: fx(ctx, maxW), obj: DY })
      + vChain(ctx, DY, k, [bw + pad, tl * tt.line, gap, xl * bt.line, gap + actTop, btnH, pad + bw], PX - 14, DX)
      + ruler(ctx, { uid: 'u3dl', live: [DX, DX + maxW * k] });
    const rows = [['Width', px4(ctx, maxW)], ['Padding', px4(ctx, pad)], ['Edge', px4(ctx, bw)], ['Gap', px4(ctx, gap)], ['Buttons', px4(ctx, btnH)]];
    const body = kitHead(ctx, 'dialog')
      + kitTitle(ctx, 'dialog', `A dialog stops the screen to ask one thing. The title asks it; ${A(D.keep)} and ${A(D.confirm)} answer it, the action on the right.`, { w: TW })
      + reg(ctx, G.L, G.bottom - rows.length * 32 - 1, TW, rows) + plate
      + cap(PX, PY + ph + 16, pw, `Dialog on its ${'--scrim'} ground, drawn at ${k}:1`, R.quiet);
    return kitPage(ctx, 'dialog', { body, svg });
  },

  // ---- table: the shipped table at true size across the measure; its header and a row dimensioned, its three row states read in a register ----
  table(ctx) {
    const R = roles(ctx), S = sc(ctx), ui = ctx.ui, TW = G.col[3] - 24 - G.L, bw = ctx.brand.ui.border;
    const thH = shippedPx(ctx, '.ui-table th', 'height'), tdH = shippedPx(ctx, '.ui-table td', 'height');
    const bar = /inset (\d+(?:\.\d+)?)px 0 0/.exec(shipped(ctx, '.ui-table tbody tr[aria-selected="true"]', 'box-shadow'))[1];
    const heads = [S.deliverToLabel, 'When', 'Status', S.paidLabel], TX = G.col[3] + 32, TWD = G.R - TX, TY = 128;
    const sortBtn = (t, dir) => `<button type="button">${A(t)}${dir ? ui.icon('arrow-up', 14) : ''}</button>`;
    const rows = S.deliveries.slice(0, 5).map((d, i) => `<tr${i === 0 ? ' aria-selected="true"' : ''}${i === 2 ? ' class="is-hover"' : ''}><td>${A(d.to)}</td><td>${A(d.when)}</td><td>${ui.statusChip(d.status)}</td><td class="is-num">${A(d.price)}</td></tr>`).join('');
    const table = `<table class="ui-table"><thead><tr><th scope="col" aria-sort="ascending">${sortBtn(heads[0], true)}</th><th scope="col">${A(heads[1])}</th><th scope="col">${A(heads[2])}</th><th scope="col" class="is-num">${sortBtn(heads[3])}</th></tr></thead><tbody>${rows}</tbody></table>`;
    const svg = hD(ctx, { x1: TX, x2: G.R, y: TY - 24, label: fx(ctx, TWD), obj: TY })
      + vD(ctx, { x: TX - 14, y1: TY, y2: TY + thH, label: fx(ctx, thH), obj: TX, labelY: TY + thH / 2 + 4 })
      + vD(ctx, { x: TX - 14, y1: TY + thH, y2: TY + thH + tdH, label: fx(ctx, tdH), obj: TX, labelY: TY + thH + tdH / 2 + 4 })
      + ruler(ctx, { uid: 'u3tb', live: [TX, G.R], edgeAnchor: true });
    const RY = G.bottom - 4 * 32 - 1, c2 = TX + 112, c3 = TX + 232;
    const notes = [['Header', px4(ctx, thH), `On ${'--raised'}, a ${bw} px rule in ${'--text'} under it.`], ['Row', px4(ctx, tdH), `A ${'--divider'} hairline between rows. Status in words, never colour alone.`], ['Selected', `${bar} px bar`, `The first row: ${'--raised'} ground and a bar in ${'--action'}.`], ['Hover', '', `The third row: ${'--raised'} ground, on a pointer only.`]];
    const rg = notes.map(([n, v, t], i) => fill(TX, RY + i * 32, TWD, 1, i ? R.hair : R.ink) + blk(TX, RY + i * 32 + 6, 112, 20, 'c-name nw', A(n), `color:${R.ink}`)
      + blk(c2, RY + i * 32 + 6, 112, 20, 'c-body nw', v, `color:${R.ink}`) + blk(c3, RY + i * 32 + 6, G.R - c3, 20, 'c-body nw', t.replace(/--(\w+)/g, (m) => `</span>${val(m)}<span>`).replace(/^/, '<span>') + '</span>', `color:${R.quiet}`)).join('') + fill(TX, G.bottom, TWD, 1, R.hair);
    const body = kitHead(ctx, 'table')
      + kitTitle(ctx, 'table', 'Read across, then down. Figures sit right in tabular numerals, so a column of totals lines up. A header that sorts is a button.', { w: TW })
      + at(TX, TY, TWD, table) + rg;
    return kitPage(ctx, 'table', { body, svg });
  },

  // ---- empty: the shipped empty state on the dark surface, drawn at 1.5:1 with its paddings in x; the same list while it loads, at true size ----
  empty(ctx) {
    const R = roles(ctx), S = sc(ctx), E = S.empty, ui = ctx.ui, k = 1.5, TW = G.col[3] - 24 - G.L, wd = 440;
    const pad = shippedPx(ctx, '.ui-empty', 'padding'), gap = shippedPx(ctx, '.ui-empty', 'gap'), btnH = shippedPx(ctx, '.ui-btn', 'height');
    const hd = typeOf(ctx, 'headline'), bt = typeOf(ctx, 'body'), bf = bodyFace(ctx, ctx.weights.regular);
    const tl = wrap(dispFace(ctx, ctx.weights.heading), E.title, hd.size, wd - 2 * pad, -0.01).length;
    const xl = wrap(bf, E.body, bt.size, Math.min(wd - 2 * pad, 36 * adv(bf, '0', bt.size))).length;
    const eh = 2 * pad + tl * hd.line + gap + xl * bt.line + gap + btnH, EX = G.col[3] + 32, EY = 136;
    const empty = `<div class="ui-empty${ctx.edition === 'slot' ? ' ph-tight' : ''}"><h3 class="ui-empty__title">${A(E.title)}</h3><p class="ui-empty__text">${A(E.body)}</p>${ui.btn(E.cta)}</div>`;
    const sk = (a, b) => `<li><div class="ui-row"><span class="ui-row__lead"></span><div class="u3-skr">${ui.skeleton(a)}${ui.skeleton(b)}</div></div></li>`;
    const loading = `<ul class="ui-list" aria-busy="true">${sk('62%', '38%')}${sk('48%', '30%')}${sk('56%', '42%')}</ul>`;
    const LY = 478;
    const body = kitHead(ctx, 'empty')
      + kitTitle(ctx, 'empty', 'What is missing, and the one action that fills it. While a list loads it keeps its shape, so nothing jumps.', { w: TW })
      + at(EX, EY, wd * k, `<div style="zoom:${k};width:${wd}px">${empty}</div>`, 'dark')
      + cap(EX, EY + eh * k + (ctx.edition === 'slot' ? 28 : 16), 520, `Empty state, drawn at ${k}:1 on the dark surface`, R.quiet)
      + cap(G.L, LY - 24, TW, 'Loading, at true size', R.quiet)
      + uiPlate(G.L, LY, TW, 220, 'dark', `<div style="position:absolute;left:12px;right:12px;top:12px">${loading}</div>`);
    const svg = cropTicks(G.L, LY, TW, 220, R.ink) + hD(ctx, { x1: EX, x2: EX + wd * k, y: EY - 24, label: fx(ctx, wd), obj: EY })
      + vChain(ctx, EY, k, [pad, tl * hd.line, gap, xl * bt.line, gap, btnH, pad], EX - 14, EX)
      + ruler(ctx, { uid: 'u3em', live: [EX, EX + wd * k] });
    return kitPage(ctx, 'empty', { body, svg });
  },

  // ---- screen-light: the product's list screen in daylight at true size on its surface ----
  'screen-light'(ctx) {
    const R = roles(ctx), S = sc(ctx), F = S.form, X = ex(ctx), ui = ctx.ui, TW = G.col[3] - 24 - G.L;
    const P = { x: G.col[3] + 24, y: 120, w: G.R - G.col[3] - 24, h: G.bottom - 120 };
    const form = `<div class="u3-form">${ui.field({ id: 'u3-f1', label: F.size, kind: 'select', options: F.sizes, value: F.sizes[1] })}${ui.field({ id: 'u3-f2', label: F.dropoff, value: F.dropoffValue })}${ui.btn(F.book, { block: true })}</div>`;
    const scr = `<div class="u3-scr">${topbar(ctx, 'light', 0)}<div class="u3-main"><div>${ui.crumbs(X.crumbs)}<h2 class="ui-display u3-h">${A(ctx.brand.ui.screen.title)}</h2>${ui.tabs(X.tabs, 0)}${ui.deliveryRows(4)}</div><div>${ui.card({ title: F.title, raised: true, action: form })}</div></div></div>`;
    const tb = shippedPx(ctx, '.ui-topbar', 'height'), tab = shippedPx(ctx, '.ui-tabs [role="tab"]', 'height'), row = shippedPx(ctx, '.ui-row', 'min-height'), btn = shippedPx(ctx, '.ui-btn', 'height');
    const rows = [['Top bar', px4(ctx, tb)], ['Tab', px4(ctx, tab)], ['Row, at least', px4(ctx, row)], ['Button', px4(ctx, btn)]];
    const body = kitHead(ctx, 'screen-light')
      + kitTitle(ctx, 'screen-light', `${A(ctx.brand.ui.screen.title)}, built from the kit at true size. Nothing on the screen is drawn for this page. The filled button is the only ${val('--action')} fill.`, { w: TW })
      + reg(ctx, G.L, G.bottom - rows.length * 32 - 1, TW, rows) + uiPlate(P.x, P.y, P.w, P.h, 'light', scr);
    const svg = cropTicks(P.x, P.y, P.w, P.h, R.ink) + hD(ctx, { x1: P.x, x2: P.x + P.w, y: P.y - 24, label: fx(ctx, P.w), obj: P.y })
      + vD(ctx, { x: P.x - 16, y1: P.y, y2: P.y + tb, label: fx(ctx, tb), obj: P.x, labelY: P.y + tb / 2 + 4 })
      + ruler(ctx, { uid: 'u3sl', live: [P.x, P.x + P.w], edgeAnchor: true });
    return kitPage(ctx, 'screen-light', { body, svg });
  },

  // ---- screen-dark: the live screen after dark, mirrored: the plate on the left, the register on the right ----
  'screen-dark'(ctx) {
    const R = roles(ctx), S = sc(ctx), ui = ctx.ui, TW = G.col[3] - 24 - G.L, RX = G.R - TW;
    const P = { x: G.L, y: 120, w: G.col[3] + 24 - G.L + (RX - 24 - (G.col[3] + 24)) - 0, h: G.bottom - 120 };
    P.w = RX - 40 - G.L; P.h = 372;
    const scr = `<div class="u3-scr">${topbar(ctx, 'dark', 0)}<div class="u3-main"><div>${liveTop(ctx)}</div><div class="u3-side">${ui.alert('warning', S.alert)}${facts(ctx)}${ui.btn(S.share, { variant: 'secondary', block: true })}</div></div></div>`;
    const tb = shippedPx(ctx, '.ui-topbar', 'height'), hd = typeOf(ctx, 'headline'), pg = shippedPx(ctx, '.ui-progress', 'height'), btn = shippedPx(ctx, '.ui-btn', 'height');
    const rows = [['Top bar', px4(ctx, tb)], ['Live line', px4(ctx, hd.size)], ['Progress', px4(ctx, pg)], ['Button', px4(ctx, btn)]];
    const body = kitHead(ctx, 'screen-dark')
      + kitTitle(ctx, 'screen-dark', `The same markup under ${val('data-theme="dark"')}. Only the token values change. The status says where things stand, in words, and the live line is the largest type in the kit.`, { x: RX, w: TW })
      + reg(ctx, RX, G.bottom - rows.length * 32 - 1, TW, rows) + uiPlate(P.x, P.y, P.w, P.h, 'dark', scr);
    const svg = cropTicks(P.x, P.y, P.w, P.h, R.ink) + hD(ctx, { x1: P.x, x2: P.x + P.w, y: P.y - 24, label: fx(ctx, P.w), obj: P.y })
      + vD(ctx, { x: 40, y1: P.y, y2: P.y + tb, label: fx(ctx, tb), obj: P.x, labelAt: 34, labelY: P.y + tb / 2 + 4 })
      + ruler(ctx, { uid: 'u3sd', live: [P.x, P.x + P.w], edgeAnchor: true });
    return kitPage(ctx, 'screen-dark', { body, svg });
  },

  // ---- screen-mobile: the whole phone screen at 70%; its top at true size beside it, joined by projection lines as in a drawing ----
  'screen-mobile'(ctx) {
    const R = roles(ctx), k = 0.7, TW = G.col[3] - 24 - G.L, pw = PH.w * k, ph = PH.h * k, X0 = 330, Y0 = 112;
    const tb = shippedPx(ctx, '.ui-topbar', 'height'), tabbar = shippedPx(ctx, '.ui-tabbar', 'height'), btn = shippedPx(ctx, '.ui-btn', 'height');
    const topH = tb + PH.live, DX = G.R - PH.w, DY = Y0, e = X0 + pw;
    const small = `<div class="a" role="img" aria-label="${A(ctx.brand.ui.screen.title)}, the whole phone screen" style="left:${X0}px;top:${Y0}px;width:${f2(pw)}px;height:${f2(ph)}px;overflow:hidden;box-shadow:inset 0 0 0 1px ${R.hair}"><div style="zoom:${k};width:${PH.w}px;height:${PH.h}px">${phone(ctx)}</div></div>`;
    const detail = uiPlate(DX, DY, PH.w, topH, 'light', `<div style="position:absolute;left:0;top:0;width:${PH.w}px">${phoneTop(ctx)}</div>`);
    const rows = [['Top bar', px4(ctx, tb)], ['Tab bar', px4(ctx, tabbar)], ['Button', px4(ctx, btn)], ['Side margin', px4(ctx, 20)]];
    const dash = (a, b, c, d) => `<path d="M${f2(a)} ${f2(b)}L${f2(c)} ${f2(d)}" stroke="${R.quiet}" stroke-width="1" stroke-dasharray="2 3" fill="none"/>`;
    const svg = cropTicks(DX, DY, PH.w, topH, R.ink)
      + dash(e + 8, Y0, DX - 8, DY) + dash(e + 8, Y0 + topH * k, DX - 8, DY + topH)
      + hD(ctx, { x1: X0, x2: X0 + pw, y: Y0 - 20, label: fx(ctx, PH.w), obj: Y0 })
      + vD(ctx, { x: X0 - 14, y1: Y0, y2: Y0 + ph, label: fx(ctx, PH.h), obj: X0, labelY: Y0 + ph / 2 + 4 })
      + vD(ctx, { x: e + 14, y1: Y0 + (PH.h - tabbar) * k, y2: Y0 + ph, label: fx(ctx, tabbar), obj: e, right: true, labelY: Y0 + ph - (tabbar * k) / 2 + 4 })
      + ruler(ctx, { uid: 'u3sm', live: [X0, X0 + pw] });
    const body = kitHead(ctx, 'screen-mobile')
      + kitTitle(ctx, 'screen-mobile', `The whole screen at ${Math.round(k * 100)}%, and its top at true size. One column, with the live line the largest thing on it, and the action and tab bar in reach of a thumb.`, { w: TW })
      + reg(ctx, G.L, G.bottom - rows.length * 32 - 1, TW, rows) + small + detail
      + cap(DX, DY + topH + 16, PH.w, `Top of the screen, ${PH.w} px wide, true size`, R.quiet);
    return kitPage(ctx, 'screen-mobile', { body, svg });
  },

  // ---- tokens: the reference as a register, every name and value read from the engine's token export; space drawn as bars at true length ----
  tokens(ctx) {
    const R = roles(ctx), g = tokenGroups(ctx), L = colourMap(ctx, 'light'), D = colourMap(ctx, 'dark'), B = ctx.brand, TW = G.col[3] - 24 - G.L;
    const keys = Object.keys(L).filter((q) => !q.startsWith('status-')), per = Math.ceil(keys.length / 2), nSt = ctx.status.filter((s) => s.custom).length;
    const CX = [G.col[3], G.col[3] + 400], CWD = 350, RH = 20, CY = 114;
    let body = kitHead(ctx, 'tokens')
      + kitTitle(ctx, 'tokens', `Every value the code package ships, read from ${val('tokens.css')}. Colour roles in light and dark; the font stacks are ${val('--ff-display')}, ${val('--ff-body')} and ${val('--ff-mono')}.`, { w: TW });
    CX.forEach((cx, c) => {
      body += blk(cx, 88, 120, 16, 'c-head nw', c === 0 ? 'Colour' : '', `color:${R.ink}`) + blk(cx + 190, 88, 60, 16, 'c-head nw', 'Light', `color:${R.ink}`) + blk(cx + 260, 88, 60, 16, 'c-head nw', 'Dark', `color:${R.ink}`) + fill(cx, 108, CWD, 1, R.ink);
      keys.slice(c * per, (c + 1) * per).forEach((q, i) => {
        const y = CY + i * RH;
        body += `<div class="u3-sw" style="left:${cx}px;top:${y + 4}px;background:${L[q]};box-shadow:inset 0 0 0 1px ${R.ink}"></div><div class="u3-sw" style="left:${cx + 14}px;top:${y + 4}px;background:${D[q]};box-shadow:inset 0 0 0 1px ${R.ink}"></div>`
          + blk(cx + 34, y, 154, 20, 'nw', val('--' + q), `color:${R.ink}`) + blk(cx + 190, y, 66, 20, 'nw', val(L[q]), `color:${R.ink}`) + blk(cx + 260, y, 66, 20, 'nw', val(D[q]), `color:${R.ink}`);
      });
    });
    const endY = CY + per * RH + 8;
    body += blk(CX[0], endY, 700, 20, 'c-body', nSt ? `And ${nSt} status ${nSt === 1 ? 'colour' : 'colours'}, each as ${val('--status-id')}, ${val('-bg')}, ${val('-edge')} and ${val('-text')}.` : '', `color:${R.quiet}`);
    // radius, lines and type
    const GY = Math.max(endY + 56, 470), grp = (x, name) => blk(x, GY, 200, 16, 'c-head nw', name, `color:${R.ink}`) + fill(x, GY + 20, 200, 1, R.ink);
    const radii = Object.entries(g.radius), lines = [...Object.entries(g.width), ['shadow-float', g.shadow['shadow-float']]];
    body += grp(CX[0], 'Radius') + radii.map(([n, v], i) => blk(CX[0], GY + 26 + i * RH, 110, 20, 'nw', val('--' + n), `color:${R.ink}`) + blk(CX[0] + 120, GY + 26 + i * RH, 80, 20, 'c-body nw', A(v), `color:${R.ink}`)).join('')
      + grp(CX[0] + 230, 'Lines') + lines.map(([n, v], i) => blk(CX[0] + 230, GY + 26 + i * RH, 110, 20, 'nw', val('--' + n), `color:${R.ink}`) + blk(CX[0] + 350, GY + 26 + i * RH, 80, 20, 'c-body nw', A(v), `color:${R.ink}`)).join('')
      + blk(CX[0] + 470, GY, 280, 16, 'c-head nw', 'Type, size / line px, weight', `color:${R.ink}`) + fill(CX[0] + 470, GY + 20, G.R - CX[0] - 470, 1, R.ink)
      + ctx.uiType.map((t, i) => blk(CX[0] + 470, GY + 26 + i * RH, 100, 20, 'nw', val(t.token), `color:${R.ink}`) + blk(CX[0] + 580, GY + 26 + i * RH, 170, 20, 'c-body nw', `${t.size} / ${t.line}, ${t.weight}`, `color:${R.ink}`)).join('');
    // space, drawn at true length; then the font stacks by role
    const SY = 276, sps = ctx.space;
    body += blk(G.L, SY - 28, TW, 16, 'c-head nw', 'Space', `color:${R.ink}`)
      + sps.map((s, i) => { const y = SY + i * 28; return fill(G.L, y - 4, TW, 1, i ? R.hair : R.ink) + blk(G.L, y, 68, 20, 'nw', val(`--sp-${i + 1}`), `color:${R.ink}`) + fill(G.L + 76, y + 6, s.px, 8, R.ink) + blk(G.L + 148, y, 86, 20, 'c-body nw', px4(ctx, s.px), `color:${R.ink}`); }).join('') + fill(G.L, SY + sps.length * 28 - 4, TW, 1, R.hair);
    const FY = SY + sps.length * 28 + 40;
    body += blk(G.L, FY, TW, 16, 'c-head nw', 'Fonts', `color:${R.ink}`)
      + [['--ff-display', B.fonts.display.family], ['--ff-body', B.fonts.body.family], ['--ff-mono', B.fonts.mono.family]].map(([n, f], i) => blk(G.L, FY + 24 + i * 28, 100, 20, 'nw', val(n), `color:${R.ink}`) + blk(G.L + 108, FY + 24 + i * 28, TW - 108, 20, 'c-body nw', A(f), `color:${R.ink}`)).join('');
    const svg = ruler(ctx, { uid: 'u3tk', live: [CX[0], CX[1] + CWD], edgeAnchor: false });
    return kitPage(ctx, 'tokens', { body, svg });
  },

  // ---- code: the install and the shipped tokens, printed on the brand's dark field at the size they are typed; the files beside ----
  code(ctx) {
    const R = roles(ctx), F = sc(ctx).form || {}, TW = G.col[3] - 24 - G.L, P = { x: G.col[3], y: G.top, w: G.R - G.col[3], h: G.bottom - G.top };
    const install = `<link rel="stylesheet" href="fonts.css">\n<link rel="stylesheet" href="tokens.css">\n<link rel="stylesheet" href="components.css">\n\n<body class="ui">\n  <button class="ui-btn" type="button">\n    ${F.book || sc(ctx).call}\n  </button>\n</body>`;
    const want = ['surface', 'text', 'action', 'action-label'], all = tokensCss(ctx).split('\n');
    const block = (open) => {
      const i = all.indexOf(open), out = [open];
      for (let j = i + 1; j < all.length && all[j] !== '}'; j++) if (want.some((w) => all[j].startsWith(`  --${w}:`))) out.push(all[j]);
      if (i < 0 || out.length !== want.length + 1) throw new Error(`standards u3: tokens.css has no ${open} block with ${want.join(', ')}`);
      return [...out, '}'].join('\n');
    };
    const cssCut = `${block(':root {')}\n${block('[data-theme="dark"] {')}`;
    const tw = tailwindCss(ctx).split('\n'), ti = tw.indexOf('@theme inline {');
    const twCut = [tw[ti], ...tw.slice(ti + 1).filter((l) => ['surface', 'text', 'action'].some((w) => l.startsWith(`  --color-${w}:`))), '}'].join('\n');
    const ink = R.darkInk, q = R.darkQuiet, ox = P.x + 32, rx = P.x + 32 + 400 + 24;
    const head = (x, y, t) => blk(x, y, 300, 16, 'c-head nw', A(t), `color:${ink}`);
    const pre = (x, y, cls, code) => `<pre class="u3-pre ${cls}" style="left:${x}px;top:${y}px;color:${ink}">${A(code)}</pre>`;
    const nIn = install.split('\n').length, dmY = P.y + 32 + 26 + nIn * 24 + 32, cssN = cssCut.split('\n').length, twY = P.y + 32 + 26 + cssN * 16 + 32;
    const inner = fill(P.x, P.y, P.w, P.h, R.dark) + head(ox, P.y + 32, 'Install') + pre(ox, P.y + 58, 'u3-p15', install)
      + head(ox, dmY, 'Dark mode') + pre(ox, dmY + 26, 'u3-p15', '<html data-theme="dark">')
      + head(rx, P.y + 32, 'From tokens.css') + pre(rx, P.y + 58, 'u3-p12', cssCut)
      + head(rx, twY, 'From tailwind.css') + pre(rx, twY + 26, 'u3-p12', twCut)
      + blk(ox, P.y + P.h - 40, 600, 16, 'c-micro nw', 'Light on :root, dark on [data-theme="dark"], as the package ships them.', `color:${q}`);
    const fams = new Set(ctx.faces.map((f) => f.family)).size;
    const files = [['README.md', 'How to install and use the kit.'], ['tokens.css', 'Custom properties, light and dark.'], ['tokens.json', 'The same tokens in W3C format.'], ['tokens.ts', 'A typed export of the same values.'], ['tailwind.css', 'A Tailwind v4 @theme block.'], ['components.css', 'Every component, built on tokens.'], ['example.html', 'Every component, light and dark.'], ['fonts.css', `@font-face rules, ${fams} families.`], ['assets/', `The logo, ${iconSet(ctx).length} icons, the fonts.`]];
    const FY = 262;
    const body = kitHead(ctx, 'code')
      + kitTitle(ctx, 'code', 'Three stylesheets and a class. The tokens are plain custom properties, so there is no framework to install.', { w: TW })
      + files.map(([n, d], i) => fill(G.L, FY + i * 44, TW, 1, i ? R.hair : R.ink) + blk(G.L, FY + i * 44 + 2, TW, 20, 'nw', val(n), `color:${R.ink}`) + blk(G.L, FY + i * 44 + 22, TW, 16, 'c-micro nw', A(d), `color:${R.quiet}`)).join('') + fill(G.L, FY + files.length * 44, TW, 1, R.hair)
      + inner;
    const svg = ruler(ctx, { uid: 'u3cd', live: [P.x, P.x + P.w], edgeAnchor: true });
    return kitPage(ctx, 'code', { body, svg });
  },
};
