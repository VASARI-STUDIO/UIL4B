// Theme 26, Notebook, lane u3: the UI kit's screens and code (dialog, table, empty, screen-light, screen-dark, screen-mobile, tokens, code).
// Same notebook as lanes u1 and u2 (u1's chrome is imported read-only): the product is stuck in as pieces cut from its own surfaces, and the
// notebook only writes around them, in graphite and on tape. The components are the shipped ones (ctx.ui, componentsCss), never restyled; every
// token, value and code line is read from the engine's own exports. Every class here starts u3-.
import { kitSpread, piece, ua, stemOf, ratioText, modeLabel, kitColours } from './lane-u1.js';
import { A, U, row, px, tokens, block, rightText, advance, wrap, tab, labelStripW, lineOffset, nearPaper, nb } from './helpers.js';
import { tokenGroups, tokensCss, tailwindCss, colourMap } from '../../engine/tokens.js';
import { componentsCss, iconSet } from '../../engine/components.js';

const sc = (ctx) => ctx.brand.ui.screen.content;
const ex = (ctx) => ({ account: 'Account', crumbs: ['Home', 'Section'], tabs: ['One', 'Two', 'Three'], links: [['One', 'map-pin'], ['Two', 'plus'], ['Three', 'clock']], ...(sc(ctx).example || {}) });
const ut = (ctx, token) => ctx.uiType.find((t) => t.token === token);
const units = (n) => Math.ceil(n / U - 1e-6) * U;
const level = (y) => row(Math.round((y + 4 - 17) / U));
const mono = (T, x, w, bl, text) => block(T['c-mono'], { x, w, baseline: bl, lines: [text], cls: 'c-mono' }).html;
function note(T, { x, w, bl, text, cls = 'c-note' }) { const t = T[cls]; return block(t, { x, w, baseline: bl, lines: wrap(t.stem, t.size, text, w, t.track), cls }).html; }
const noteLines = (T, text, w) => wrap(T['c-note'].stem, 13, text, w, 0).length;
function noteUp(T, { x, w, last, text }) { return note(T, { x, w, bl: last - U * (noteLines(T, text, w) - 1), text }); }
function tapeAt(T, { x, bl, text }) {
  const w = labelStripW(T, 'c-label', text);
  return `<div class="tape tab c-label" style="left:${px(x)};top:${px(bl - lineOffset(T['c-label'].stem, 11, 19))};width:${w}px;height:${U}px">${A(text)}</div>`;
}

// a value as the shipped components.css writes it, so a measurement printed on a page is the shipped one
const cache = new WeakMap();
function shipped(ctx, sel, prop) {
  if (!cache.has(ctx)) cache.set(ctx, componentsCss(ctx));
  const css = cache.get(ctx), key = `\n${sel} {`, i = css.indexOf(key);
  if (i < 0) throw new Error(`notebook u3: ${sel} is not in componentsCss`);
  const m = new RegExp(`(?:^|;)\\s*${prop}:\\s*([^;]+)`).exec(css.slice(i + key.length, css.indexOf('}', i)));
  if (!m) throw new Error(`notebook u3: ${sel} has no ${prop}`);
  return m[1].trim();
}
const shippedPx = (ctx, sel, prop) => parseFloat(shipped(ctx, sel, prop));

const logoSpan = (ctx, mode) => {
  const g = ctx.logo.geos.colour || ctx.logo.geos.primary, lw = 96, lh = g ? Math.round(lw * g.h / g.w) : 24, rev = ctx.brand.logo.colourways.reversed;
  const html = mode === 'dark' ? ctx.logo.html('reversed', { width: lw, color: rev.name }) : ctx.logo.html('colour', { width: lw });
  return `<span style="display:block;width:${lw}px;height:${lh}px">${html}</span>`;
};
const topbar = (ctx, mode, active) => `<nav class="ui-topbar" aria-label="Main">${logoSpan(ctx, mode)}<div class="ui-topbar__links">${ctx.ui.links(ex(ctx).links.slice(0, 3), active)}</div></nav>`;
const liveStatus = (ctx) => (ctx.status.find((s) => s.label === sc(ctx).status) || {}).id || sc(ctx).deliveries[0].status;
const facts = (ctx) => { const S = sc(ctx); return `<dl class="u3-dl"><div><dt>${A(S.deliverToLabel)}</dt><dd>${A(S.deliverTo)}</dd></div><div><dt>${A(S.paidLabel)}</dt><dd class="ui-num">${A(S.paid)}</dd></div></dl>`; };
function liveBlock(ctx) {
  const S = sc(ctx), p = Math.max(0, Math.min(1, S.progress || 0)) * 100;
  const prog = `<div class="u3-prog"><div class="ui-progress" role="img" aria-label="${A(S.from)} to ${A(S.to)}"><div class="ui-progress__bar"><i style="width:${p}%"></i></div><span class="ui-progress__dot" style="left:${p}%"></span></div><div class="u3-ends ui-num"><span>${A(S.from)}</span><span>${A(S.to)}</span></div></div>`;
  const rider = `<div class="u3-rider"><span class="ui-avatar">${A(S.initials)}</span><div class="u3-who"><p class="u3-b">${A(S.rider)}</p><p class="u3-q ui-num">${A(S.riderNote)}</p></div>${ctx.ui.btn(S.call, { variant: 'secondary', size: 'sm' })}</div>`;
  return `<div class="u3-live">${ctx.ui.statusChip(liveStatus(ctx))}<h2 class="ui-display u3-eta">${A(S.eta)}</h2><p class="u3-soft">${A(S.pickup)}</p>${prog}${rider}</div>`;
}
const crumbTitle = (ctx) => { const c = ex(ctx).crumbs; return c[c.length - 1]; };
function listScreen(ctx, mode) {
  const X = ex(ctx), ui = ctx.ui;
  return `<div class="u3-scr">${topbar(ctx, mode, 0)}<div class="u3-body">${ui.crumbs(X.crumbs)}<h2 class="ui-display u3-h">${A(crumbTitle(ctx))}</h2>${ui.tabs(X.tabs, 0)}${ui.deliveryRows(5)}</div></div>`;
}
function formScreen(ctx, mode) {
  const S = sc(ctx), F = S.form, X = ex(ctx), ui = ctx.ui;
  return `<div class="u3-scr">${topbar(ctx, mode, -1)}<div class="u3-body">${ui.crumbs([X.crumbs[0], F.title])}<h2 class="ui-display u3-h">${A(F.title)}</h2><div class="u3-form">`
    + `${ui.field({ id: `u3-f1-${mode}`, label: F.pickup, value: F.pickupValue || '' })}${ui.field({ id: `u3-f2-${mode}`, label: F.dropoff, value: F.dropoffValue || '' })}`
    + `${ui.field({ id: `u3-f3-${mode}`, label: F.size, kind: 'select', options: F.sizes || [], value: (F.sizes || [])[1] })}${ui.btn(F.book, { block: true })}</div></div></div>`;
}
function liveScreen(ctx, mode) {
  return `<div class="u3-scr">${topbar(ctx, mode, 0)}<div class="u3-body">${liveBlock(ctx)}<div class="u3-gap">${facts(ctx)}</div>${ctx.ui.btn(sc(ctx).share, { variant: 'secondary', block: true })}</div></div>`;
}

// ---------------------------------------------------------------- css
export function css() {
  return `.pg .u3-scr{position:absolute;left:0;top:0;width:100%}
.pg .u3-body{display:flex;flex-direction:column;padding:19px;gap:0}
.pg .u3-body>.ui-btn--block{margin-top:19px}
.pg .u3-h{margin:8px 0 19px;font-size:var(--fs-title);line-height:var(--lh-title)}
.pg .u3-form{display:flex;flex-direction:column;gap:16px}
.pg .u3-live{display:flex;flex-direction:column;align-items:flex-start;gap:12px}
.pg .u3-live>*{max-width:100%}
.pg .u3-eta{margin:0;font-size:var(--fs-headline);line-height:var(--lh-headline)}
.pg .u3-soft{margin:0;color:var(--text-soft);max-width:44ch}
.pg .u3-prog{width:100%;display:flex;flex-direction:column;gap:4px}
.pg .u3-ends{display:flex;justify-content:space-between;gap:12px;font-size:var(--fs-caption);line-height:var(--lh-caption);color:var(--quiet)}
.pg .u3-rider{width:100%;display:flex;align-items:center;gap:12px}
.pg .u3-who{flex:1;min-width:0}
.pg .u3-b{margin:0;font-weight:600;line-height:var(--lh-label)}
.pg .u3-q{margin:0;color:var(--quiet);font-size:var(--fs-label);line-height:var(--lh-label)}
.pg .u3-gap{margin-top:19px}
.pg .u3-dl{margin:0;display:flex;flex-direction:column;gap:12px}
.pg .u3-dl dt{font-size:var(--fs-label);line-height:var(--lh-label);color:var(--quiet)}
.pg .u3-dl dd{margin:0;font-weight:600}
.pg .u3-ph{position:absolute;left:0;top:0;width:390px;display:flex;flex-direction:column}
.pg .u3-sb{height:44px;display:flex;align-items:center;justify-content:center;padding:0 20px;font-weight:600}
.pg .u3-pbar{height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 20px;border-bottom:var(--w-hairline) solid var(--divider)}
.pg .u3-pad{padding:20px}
.pg .u3-pfoot{display:flex;flex-direction:column;gap:20px;padding:0 20px}
.pg .u3-tabs-at{position:absolute;left:0;right:0}
.pg .u3-zoom{position:absolute;left:0;top:0}
.pg .u3-skr{display:flex;flex-direction:column;gap:8px;flex:1}
.pg .u3-sq{position:absolute;z-index:2;width:19px;height:19px;box-sizing:border-box}
.pg .u3-code{position:absolute;margin:0;font:400 12px/19px var(--ff-mono);white-space:pre;color:var(--text);font-variant-numeric:tabular-nums}
`;
}

// a piece of one surface holding one shipped component, with its tab
const put = (ctx, T, o, tabLabel) => piece(ctx, o) + (tabLabel ? tab(T, { x: o.x + U, y: o.y, label: tabLabel }) : '');
// notes across the fold, one per part, each level with the middle of the part it names and never closer than its own height to the last
function sideNotes(T, parts, x = 42, w = 475) {
  let out = '', end = 0;
  for (const [mid, name, words, val] of parts) {
    const bl = Math.max(level(mid), end), k = noteLines(T, words, w - 114);
    out += tapeAt(T, { x, bl, text: name }) + note(T, { x: x + 114, w: w - 114, bl, text: words });
    let e = bl + k * U;
    if (val) { out += mono(T, x + 114, w - 114, bl + k * U, val); e += U; }
    end = e + U;
  }
  return out;
}

// ---------------------------------------------------------------- dialog
function dialog(ctx) {
  const T = tokens(ctx), D = sc(ctx).dialog, M = kitColours(ctx, 'light'), Dk = kitColours(ctx, 'dark'), r = (a, b) => ratioText(ctx, a, b);
  const maxW = shippedPx(ctx, '.ui-dialog', 'max-width'), pad = shippedPx(ctx, '.ui-dialog', 'padding'), gap = shippedPx(ctx, '.ui-dialog', 'gap');
  const actTop = shippedPx(ctx, '.ui-dialog__actions', 'margin-top'), btnH = shippedPx(ctx, '.ui-btn', 'height'), sp = shippedPx(ctx, '.ui-scrim', 'padding'), bw = ctx.brand.ui.border;
  const tt = ut(ctx, 'title-s'), bt = ut(ctx, 'body'), dw = Math.min(maxW, 475 - 2 * sp), cw = dw - 2 * pad - 2 * bw;
  const tl = wrap(stemOf(ctx, 'display', ctx.weights.heading), tt.size, D.title, cw * 0.92, -0.01).length;
  const xl = wrap(stemOf(ctx, 'body', ctx.weights.regular), bt.size, D.body, cw).length;
  const dh = 2 * bw + 2 * pad + tl * tt.line + gap + xl * bt.line + gap + actTop + btnH;
  const h = units(dh + 2 * sp);
  const scrim = (id) => `<div class="ui-scrim" style="width:475px;height:${h}px">${ctx.ui.dialog({ ...D, danger: true }).replace(/dlg-t/g, id)}</div>`;
  const P = { x: 42, y: 112, w: 475, h }, Q = { x: 42, y: units(112 + h + 2 * U - 17) + 17, w: 475, h };
  if (Q.y + Q.h > 739) throw new Error(`dialog: the dark piece runs to ${Q.y + Q.h}`);
  const vc = put(ctx, T, { ...P, mode: 'light', bg: 'scrim', inner: ua(0, 0, scrim('u3-dlg-l')) }, 'Scrim, light')
    + put(ctx, T, { ...Q, mode: 'dark', bg: 'scrim', inner: ua(0, 0, scrim('u3-dlg-d')) }, 'Scrim, dark');
  const top = P.y + (h - dh) / 2, shadow = tokenGroups(ctx).shadow['shadow-float'];
  let rc = sideNotes(T, [
    [top + 12, 'Box', `${maxW} px wide at most, ${pad} px inside, a ${bw} px edge in the text colour, ${shadow === 'none' ? 'and no shadow' : 'and a floating shadow'}.`, `--shadow-float ${shadow}`],
    [top + bw + pad + tl * tt.line / 2, 'Question', `The title asks it, in the display face at ${tt.size} / ${tt.line}.`],
    [top + bw + pad + tl * tt.line + gap + xl * bt.line / 2, 'Next', 'One or two sentences in the soft text colour, read before anyone chooses.', `--text-soft ${M['text-soft']}, ${r(M['text-soft'], M.surface)}`],
    [top + dh - bw - pad - btnH / 2, 'Answers', `The way out first, ${D.keep}, then the one that does it, ${D.confirm}, on the right.`, `--danger ${M.danger}, label ${r(M.surface, M.danger)}`],
  ]);
  rc += tapeAt(T, { x: 42, bl: level(Q.y + h / 2), text: 'Dark' })
    + note(T, { x: 156, w: 361, bl: level(Q.y + h / 2), text: 'The scrim and the box step to their dark values. Nothing is redrawn.' })
    + mono(T, 156, 361, level(Q.y + h / 2) + 2 * U, `--scrim ${Dk.scrim}, --surface ${Dk.surface}`);
  return kitSpread(ctx, 'dialog', { verso: vc, recto: rc });
}

// ---------------------------------------------------------------- table
function table(ctx) {
  const T = tokens(ctx), S = sc(ctx), ui = ctx.ui, M = kitColours(ctx, 'light');
  const thH = shippedPx(ctx, '.ui-table th', 'height'), tdH = shippedPx(ctx, '.ui-table td', 'height');
  const bar = /inset (\d+(?:\.\d+)?)px 0 0/.exec(shipped(ctx, '.ui-table tbody tr[aria-selected="true"]', 'box-shadow'))[1];
  const heads = [S.deliverToLabel, 'Status', S.paidLabel], rowH = tdH + 1;
  const tbl = (n, mode) => {
    const rows = S.deliveries.slice(0, n).map((d, i) => `<tr${i === 0 ? ' aria-selected="true"' : ''}${i === 2 ? ' class="is-hover"' : ''}><td>${A(d.to)}</td><td>${ui.statusChip(d.status)}</td><td class="is-num">${A(d.price)}</td></tr>`).join('');
    return `<table class="ui-table"><thead><tr><th scope="col" aria-sort="ascending"><button type="button">${A(heads[0])}${ui.icon('arrow-up', 14)}</button></th><th scope="col">${A(heads[1])}</th><th scope="col" class="is-num">${A(heads[2])}</th></tr></thead><tbody>${rows}</tbody></table>`;
  };
  const P = { x: 42, y: 112, w: 475, h: units(19 + thH + 4 * rowH + 19) }, Q = { x: 42, y: units(112 + P.h + 2 * U - 17) + 17, w: 475, h: units(19 + thH + 3 * rowH + 19) };
  if (Q.y + Q.h > 739) throw new Error(`table: the dark piece runs to ${Q.y + Q.h}`);
  const vc = put(ctx, T, { ...P, mode: 'light', inner: ua(19, 19, tbl(4), { w: 437 }) }, 'Table, light')
    + put(ctx, T, { ...Q, mode: 'dark', inner: ua(19, 19, tbl(3), { w: 437 }) }, 'Table, dark');
  const rowMid = (i) => P.y + 19 + thH + i * rowH + tdH / 2;
  let rc = sideNotes(T, [
    [P.y + 19 + thH / 2, 'Sorted', `${heads[0]}, A to Z. A header that sorts is a button and shows its arrow.`],
    [rowMid(0), 'Selected', `The raised ground and a ${bar} px bar in the action colour.`, `--raised ${M.raised}, --action ${M.action}`],
    [rowMid(2), 'Hover', 'The raised ground, on a pointer only.'],
  ]);
  rc += note(T, { x: 42, w: 475, bl: P.y + P.h + U + 19, text: `Rows are ${tdH} px and the header ${thH} px, with a 1 px divider between rows. Status is in words, never a colour alone. Totals sit right in tabular figures.` });
  return kitSpread(ctx, 'table', { verso: vc, recto: rc });
}

// ---------------------------------------------------------------- empty
function empty(ctx) {
  const T = tokens(ctx), S = sc(ctx), E = S.empty, ui = ctx.ui, hd = ut(ctx, 'headline'), bd = ut(ctx, 'body');
  const emp = `<div class="ui-empty"><h3 class="ui-empty__title">${A(E.title)}</h3><p class="ui-empty__text">${A(E.body)}</p>${ui.btn(E.cta)}</div>`;
  const tl = wrap(stemOf(ctx, 'display', ctx.weights.heading), hd.size, E.title, 437 - 64, -0.01).length;
  const xl = wrap(stemOf(ctx, 'body', ctx.weights.regular), bd.size, E.body, Math.min(437 - 64, 36 * bd.size * 0.5)).length;
  const eh = 64 + tl * hd.line + 12 + xl * bd.line + 12 + 44;
  const P = { x: 42, y: 112, w: 475, h: units(eh + 38) };
  const sk = (a, b) => `<li><div class="ui-row"><span class="ui-row__lead"></span><div class="u3-skr">${ui.skeleton(a)}${ui.skeleton(b)}</div></div></li>`;
  const loading = `<ul class="ui-list" aria-busy="true">${sk('62%', '38%')}${sk('48%', '30%')}${sk('56%', '42%')}</ul>`;
  const vc = put(ctx, T, { ...P, mode: 'light', inner: ua(19, 19, emp, { w: 437 }) }, 'Empty')
    + noteUp(T, { x: 42, w: 380, last: 739, text: `The title is the headline size, ${hd.size} / ${hd.line}, on the raised ground with no edge, so it never reads as a card. It always offers the next step as a button.` });
  const L = { x: 42, y: 112, w: 475, h: units(3 * 65 + 38) }, Q = { x: 42, y: units(112 + L.h + 4 * U - 17) + 17, w: 475, h: P.h };
  let rc = put(ctx, T, { ...L, mode: 'light', inner: ua(19, 19, loading, { w: 437 }) }, 'Loading')
    + note(T, { x: 42, w: 380, bl: L.y + L.h + U + 19, text: 'The list keeps its shape while it loads, so nothing jumps.' });
  if (Q.y + Q.h > 739) throw new Error(`empty: the dark piece runs to ${Q.y + Q.h}`);
  rc += put(ctx, T, { ...Q, mode: 'dark', inner: ua(19, 19, emp, { w: 437 }) }, 'Empty, dark');
  return kitSpread(ctx, 'empty', { verso: vc, recto: rc });
}

// ---------------------------------------------------------------- screens
function screens(ctx, id, mode, left, right, notes) {
  const T = tokens(ctx), Y = 93, H = 31 * U;
  const vc = put(ctx, T, { x: 42, y: Y, w: 475, h: H, mode, inner: ua(0, 0, left[1], { w: 475 }) }, left[0]) + noteUp(T, { x: 42, w: 475, last: 739, text: notes[0] });
  const rc = put(ctx, T, { x: 42, y: Y, w: 475, h: H, mode, inner: ua(0, 0, right[1], { w: 475 }) }, right[0]) + noteUp(T, { x: 42, w: 475, last: 739, text: notes[1] });
  return kitSpread(ctx, id, { verso: vc, recto: rc });
}
const screenLight = (ctx) => screens(ctx, 'screen-light', 'light', [`${ex(ctx).crumbs.join(', ')}`, listScreen(ctx, 'light')], [sc(ctx).form.title, formScreen(ctx, 'light')],
  ['The list: top bar, links, crumbs, tabs and list rows. Cut at 475 px wide, at 1:1.', `The form: fields stacked, labels above, and one filled button. ${sc(ctx).form.book} is the only action fill on the screen.`]);
const screenDark = (ctx) => screens(ctx, 'screen-dark', 'dark', [sc(ctx).eta, liveScreen(ctx, 'dark')], [`${ex(ctx).crumbs.join(', ')}`, listScreen(ctx, 'dark')],
  ['The live screen after dark: the status word, the live line at the largest size the kit sets, the progress and the facts.', 'The same list as the light page, under data-theme="dark". Only the token values change, so nothing is restyled for the night.']);

function mobile(ctx) {
  const T = tokens(ctx), S = sc(ctx), ui = ctx.ui, X = ex(ctx), k = 304 / 390, tabs = [...X.links.slice(0, 3), [X.account, 'user']];
  const tabbar = `<nav class="ui-tabbar" aria-label="Sections">${tabs.map(([t, i], n) => `<a href="#"${n === 0 ? ' aria-current="page"' : ''}>${ui.icon(i, 20)}${A(t)}</a>`).join('')}</nav>`;
  const head = `<div class="u3-sb ui-num"><span>${A(S.time)}</span></div><div class="u3-pbar">${logoSpan(ctx, 'dark')}<span class="ui-avatar">${A(S.initials)}</span></div>`;
  const foot = `<div class="u3-pfoot">${facts(ctx)}${ui.btn(S.share, { variant: 'secondary', block: true })}</div>`;
  const ph = `<div class="u3-ph" style="height:${Math.round(35 * U / k)}px">${head}<div class="u3-pad">${liveBlock(ctx)}</div>${foot}<div class="u3-tabs-at" style="bottom:0">${tabbar}</div></div>`;
  const vc = put(ctx, T, { x: 42, y: 74, w: 304, h: 35 * U, mode: 'dark', inner: `<div class="u3-zoom" style="zoom:${k};width:390px;height:${Math.round(35 * U / k)}px">${ph}</div>` }, 'Whole screen')
    + noteUp(T, { x: 365, w: 152, last: 739, text: 'The whole screen at 78%. Everything stacks in one column and the live line stays the largest type on it.' });
  // the live block as it draws at 350 px, measured at 213 px for one line of title and one of sentence: chip 17, 40 a title line, 24 a sentence line, progress 44, rider 40, four gaps of 12
  const hd = ut(ctx, 'headline'), bd = ut(ctx, 'body'), regular = stemOf(ctx, 'body', ctx.weights.regular);
  const etaN = wrap(stemOf(ctx, 'display', ctx.weights.heading), hd.size, S.eta, 350, -0.01).length, pickN = wrap(regular, bd.size, S.pickup, 350).length;
  const riderN = Math.max(wrap(regular, bd.size, S.rider, 200).length + wrap(regular, 13, S.riderNote, 200).length - 1, 1);
  const eta = etaN * hd.line + pickN * bd.line;
  const live = 17 + (ctx.placeholders ? Math.max(eta, hd.line + 3 * bd.line) : eta) + 44 + Math.max(40, riderN * 20) + 4 * 12;
  const A1 = { x: 42, y: 112, w: 399, h: units(44 + 56 + 20 + live + 19) }, B1 = { x: 42, y: units(112 + A1.h + 2 * U - 17) + 17, w: 399, h: 8 * U };
  const cutTop = `<div class="u3-ph" style="left:4px">${head}<div class="u3-pad">${liveBlock(ctx)}</div></div>`;
  const cutFoot = `<div class="u3-ph" style="left:4px;top:19px;height:${B1.h - 19}px"><div class="u3-pfoot" style="padding-top:0">${ui.btn(S.share, { variant: 'secondary', block: true })}</div><div class="u3-tabs-at" style="bottom:0">${tabbar}</div></div>`;
  let rc = put(ctx, T, { ...A1, mode: 'dark', inner: cutTop }, 'Top, at 1:1');
  if (B1.y + B1.h > 739) throw new Error(`mobile: the foot cut runs to ${B1.y + B1.h}`);
  rc += put(ctx, T, { ...B1, mode: 'dark', inner: cutFoot }, 'Foot, at 1:1')
    + note(T, { x: 42, w: 475, bl: B1.y + B1.h + U + 19, text: 'Cut at 399 px, a phone a little over 390 px wide. The action and the tab bar sit in the lower half, where a thumb reaches, and every target is at least 44 px tall.' });
  return kitSpread(ctx, 'screen-mobile', { verso: vc, recto: rc });
}

// ---------------------------------------------------------------- tokens
function tokensPage(ctx) {
  const T = tokens(ctx), N = nb(ctx), L = colourMap(ctx, 'light'), D = colourMap(ctx, 'dark'), g = tokenGroups(ctx);
  const keys = Object.keys(L), off = lineOffset(T['c-mono'].stem, 11, 19);
  const sq = (x, bl, hex) => `<div class="u3-sq" style="left:${x}px;top:${px(bl - off)};background:${hex};box-shadow:inset 0 0 0 1px ${nearPaper(ctx, hex) ? 'var(--fold)' : 'var(--paper)'}"></div>`;
  const hdr = (x, bl, t) => mono(T, x, 76, bl, t);
  let vc = tapeAt(T, { x: 42, bl: 93, text: 'Colour, light and dark' }) + hdr(99, 112, 'Role') + hdr(270, 112, 'Light') + hdr(346, 112, 'Dark');
  keys.forEach((k, i) => { const bl = 131 + i * U; vc += sq(42, bl, L[k]) + sq(61, bl, D[k]) + mono(T, 99, 165, bl, '--' + k) + mono(T, 270, 70, bl, L[k]) + mono(T, 346, 70, bl, D[k]); });
  if (131 + (keys.length - 1) * U > 682) throw new Error(`tokens: ${keys.length} colour roles run to ${131 + keys.length * U}`);
  vc += noteUp(T, { x: 42, w: 475, last: 739, text: 'Light is on :root. Dark is on [data-theme="dark"], and on prefers-color-scheme when no theme is set. Each swatch is the value the package ships.' });
  const col = (x, y0, title, list, vx) => {
    let out = tapeAt(T, { x, bl: y0, text: title });
    list.forEach(([k, v], i) => { out += mono(T, x, vx - 8, y0 + (i + 1) * U, k) + mono(T, x + vx, 228 - vx, y0 + (i + 1) * U, v); });
    return { html: out, end: y0 + (list.length + 1) * U };
  };
  const sp = col(42, 93, 'Space', Object.entries(g.space).map(([k, v]) => ['--' + k, v]), 114);
  const rd = col(42, sp.end + 2 * U, 'Radius', Object.entries(g.radius).map(([k, v]) => ['--' + k, v]), 114);
  const ln = col(42, rd.end + 2 * U, 'Lines', [...Object.entries(g.width), ['shadow-float', g.shadow['shadow-float']]].map(([k, v]) => ['--' + k, v]), 114);
  const pal = col(289, 93, 'Palette', ctx.colours.map((c) => ['--palette-' + c.id, c.hex]), 133);
  const ty = col(289, pal.end + 2 * U, 'Type, size line weight', ctx.uiType.map((t) => [t.token, `${t.size}px ${t.line}px ${t.weight}`]), 95);
  const fy = Math.max(ln.end, ty.end) + 2 * U;
  const ff = Object.entries(g.font);
  if (fy + ff.length * U > 739 - 3 * U) throw new Error(`tokens: fonts start at ${fy}`);
  let rc = sp.html + rd.html + ln.html + pal.html + ty.html + tapeAt(T, { x: 42, bl: fy, text: 'Fonts' });
  ff.forEach(([k, v], i) => { rc += mono(T, 42, 106, fy + (i + 1) * U, '--' + k) + mono(T, 156, 361, fy + (i + 1) * U, v); });
  rc += noteUp(T, { x: 42, w: 475, last: 739, text: 'Type tokens are --fs-, --lh- and --fw- followed by the name. Every value here is read from tokens.css as the package ships it.' });
  return kitSpread(ctx, 'tokens', { verso: vc, recto: rc });
}

// ---------------------------------------------------------------- code
function code(ctx) {
  const T = tokens(ctx), F = sc(ctx).form;
  const install = `<link rel="stylesheet" href="fonts.css">\n<link rel="stylesheet" href="tokens.css">\n<link rel="stylesheet" href="components.css">\n\n<body class="ui">\n  <button class="ui-btn" type="button">\n    ${F.book}\n  </button>\n</body>`;
  const want = ['surface', 'text', 'action', 'action-label'], blocks = tokensCss(ctx).split('\n');
  const cut = (open) => {
    const i = blocks.indexOf(open), out = [open];
    for (let j = i + 1; j < blocks.length && blocks[j] !== '}'; j++) if (want.some((w) => blocks[j].startsWith(`  --${w}:`))) out.push(blocks[j]);
    if (i < 0 || out.length !== want.length + 1) throw new Error(`notebook u3: tokens.css has no ${open} block with ${want.join(', ')}`);
    return [...out, '}'].join('\n');
  };
  const cssCut = `${cut(':root {')}\n${cut('[data-theme="dark"] {')}`;
  const tw = tailwindCss(ctx).split('\n'), ti = tw.indexOf('@theme inline {');
  const twCut = [tw[ti], ...tw.slice(ti + 1).filter((l) => ['surface', 'text', 'action'].some((w) => l.startsWith(`  --color-${w}:`))), '}'].join('\n');
  const pre = (txt) => txt.split('\n').map((l, i) => `<pre class="u3-code" style="left:19px;top:${19 + i * U - 2}px">${A(l)}</pre>`).join('');
  const box = (y, txt, label) => ({ html: put(ctx, T, { x: 42, y, w: 475, h: units((txt.split('\n').length) * U + 38), mode: 'light', inner: pre(txt) }, label), end: y + units(txt.split('\n').length * U + 38) });
  const a = box(112, install, 'Install'), b = box(a.end + 2 * U - 2, '<html data-theme="dark">', 'Dark mode');
  const fams = [...new Set(ctx.faces.map((f) => f.family))];
  const files = [['README.md', 'How to install and use the kit.'], ['tokens.css', 'Custom properties, light and dark.'], ['tokens.json', 'The same tokens in the W3C format.'],
    ['tokens.ts', 'A typed export of the same values.'], ['tailwind.css', 'A Tailwind CSS v4 @theme block.'], ['components.css', 'Every component, built on the tokens.'],
    ['example.html', 'Every component live, light and dark.'], ['fonts.css', `@font-face rules for ${fams.length} families.`], ['assets/', `The logo, ${iconSet(ctx).length} icons and the fonts.`]];
  let vc = a.html + b.html;
  const fy = row(Math.ceil((b.end + 3 * U - 17) / U));
  if (fy + files.length * U > 739) throw new Error(`code: the file list runs to ${fy + files.length * U}`);
  vc += tapeAt(T, { x: 42, bl: fy, text: 'In the package' });
  files.forEach(([n, d], i) => { vc += mono(T, 42, 114, fy + (i + 1) * U, n) + note(T, { x: 156, w: 361, bl: fy + (i + 1) * U, text: d }); });
  const c = box(112, cssCut, 'From tokens.css'), d = box(c.end + 2 * U - 2, twCut, 'From tailwind.css');
  if (d.end > 739) throw new Error(`code: the tailwind piece runs to ${d.end}`);
  const rc = c.html + d.html + noteUp(T, { x: 42, w: 475, last: 739, text: 'Four colour roles are cut from the file the package ships, light then dark. The rest follow the same pattern.' });
  return kitSpread(ctx, 'code', { verso: vc, recto: rc });
}

export const uikit = { dialog, table, empty, 'screen-light': screenLight, 'screen-dark': screenDark, 'screen-mobile': mobile, tokens: tokensPage, code };
