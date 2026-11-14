// Theme 30, Fluted, lane u3: the UI kit's patterns and handoff pages (dialog, table, empty, screen-light, screen-dark, screen-mobile, tokens, code).
// The chrome is lane u1's, imported read-only. Every page keeps the band at y 768 to 1152, and what the glass bends is that page's own data: the scrim the
// dialog floats on and its two answers, the table's columns run on down into the glass, a screen's rows as their status colours, the phone's foot and tab
// bar, every colour token in both modes, the package's files as tall as their lines. Above the band the real components (ctx.ui, componentsCss, which u1's
// css() already writes) sit flat and unrestyled; this lane only places them. Every class here starts u3-.
import { A, adv, TXT, tokens } from './helpers.js';
import { kitPage, modeT, editionMode, tower, box, uiAt, headline, lead, keyAt, put, P, LIP, BB, KEY } from './lane-u1.js';
import { colourMap, tokenGroups, tokensCss, tokensJson, tokensTs, tailwindCss } from '../../engine/tokens.js';
import { componentsCss, exampleHtml, iconSet } from '../../engine/components.js';

const sc = (ctx) => ctx.brand.ui.screen.content;
const ex = (ctx) => sc(ctx).example || {};
const titleOf = (ctx, id) => (ctx.pages.find((p) => p.id === id) || { title: id }).title;
// a key that wraps inside its box (keyAt's runs are one line, so a long note ran on over the keys beside it)
const keyW = (ctx, x, w, html, cls = 'k', dy = 0) => put(ctx, { x, y: KEY + dy, w, cls, html, style: 'white-space:normal' });
const mono = (s, c = 'u3-m') => `<span class="${c}">${A(s)}</span>`;
// the colour a status is written in on a mode's surface (state is plain words in one colour)
function statusInk(M, s) {
  if (s.custom) return M[`status-${s.id}-text`];
  if (s.tone === 'action') return M['action-text'];
  if (s.tone === 'neutral') return M.text;
  return M[s.tone] || M.text;
}
// lines a whole run takes in w at a size (measured, never split; 6% for the browser's wider set)
const linesIn = (ctx, role, s, size, weight, w) => Math.max(1, Math.ceil(adv(ctx, role, s, size, 0, weight) * 1.06 / w));
// a button's width as componentsCss draws it: the label at the control size, sp-5 either side, the control edge both sides
function btnW(ctx, label) {
  const pad = parseFloat(tokenGroups(ctx).space['sp-5']) || 24;
  return adv(ctx, 'body', label, 16, 0, ctx.weights.medium) + 2 * pad + 2 * ctx.brand.ui.border;
}
// a fill that would vanish on the ground gets an outline in the quiet colour
const faint = (ctx, T, hex) => ctx.ratio(hex, T.ground) < 1.3;

export function css(ctx) {
  return `.pg .u3-m{font:400 ${TXT}px/20px var(--dm);color:var(--ink);font-variant-numeric:tabular-nums;white-space:nowrap}
.pg .u3-q{font:400 ${TXT}px/20px var(--dm);color:var(--quiet);font-variant-numeric:tabular-nums}
.pg .u3-pre{margin:0;font:400 ${TXT}px/22px var(--dm);color:var(--ink);white-space:pre}
.pg .u3-scrim{height:100%;box-sizing:border-box}
.pg .u3-well .ui-skeleton{background:var(--divider)}   /* the sunken fill is near-black on a dark page: the bars take the divider tone so they read */
.pg .u3-scr{display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box}
.pg .u3-main{display:grid;flex:1;min-height:0}
.pg .u3-col{display:flex;flex-direction:column;gap:var(--sp-4);padding:var(--sp-5);min-width:0}
.pg .u3-col+.u3-col{border-left:var(--w-hairline) solid var(--divider)}
.pg .u3-lbl{color:var(--quiet);font:${ctx.weights.medium} var(--fs-label)/var(--lh-label) var(--ff-body)}
.pg .u3-big{font-size:var(--fs-headline);line-height:var(--lh-headline);margin:0}
.pg .u3-eta{display:flex;flex-wrap:wrap;align-items:center;gap:var(--sp-2) var(--sp-4)}
.pg .u3-soft{color:var(--text-soft)}
.pg .u3-route{display:flex;justify-content:space-between;margin-top:var(--sp-2);color:var(--quiet);font-size:var(--fs-label);line-height:var(--lh-label)}
.pg .u3-pair{display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-3)}
.pg .u3-top{display:flex;justify-content:space-between;align-items:center;height:56px;padding:0 var(--sp-4);border-bottom:var(--w-hairline) solid var(--divider)}
.pg .u3-well{display:flex;flex-direction:column;gap:var(--sp-3);padding:var(--sp-5);background:var(--sunken);border-radius:var(--r-card)}
.pg .u3-stack{display:flex;flex-direction:column;gap:var(--sp-4)}
.pg .u3-tbl{table-layout:fixed}
.pg .u3-tbl th button svg{transform:rotate(-90deg)}
`;
}

// ---------------------------------------------------------------- the product's screen, built only from the shipped components and the brand's screen data

const wordmark = (ctx) => `<strong class="ui-display" style="font-size:var(--fs-title-s)">${A(ctx.brand.logo.showcase.wordmark || ctx.brand.name)}</strong>`;
const progress = (S) => (typeof S.progress !== 'number' ? '' : `<div class="ui-progress" role="progressbar" aria-label="${A(S.status)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(S.progress * 100)}"><div class="ui-progress__bar"><i style="width:${S.progress * 100}%"></i></div><span class="ui-progress__dot" style="left:${S.progress * 100}%"></span></div><div class="u3-route ui-num"><span>${A(S.from)}</span><span>${A(S.to)}</span></div>`);
// the live item: the screen's title, the time it will be done and its status, what has happened, the progress, the person and the way to share it
function liveColumn(ctx, { size = 'big' } = {}) {
  const S = sc(ctx), ui = ctx.ui, live = S.deliveries[0];
  const who = `<ul class="ui-list">${ui.row({ lead: `<span class="ui-avatar">${A(S.initials)}</span>`, title: S.rider, sub: S.riderNote, endHtml: ui.btn(S.call, { variant: 'secondary', size: 'sm' }) })}</ul>`;
  return `<p class="u3-lbl">${A(ctx.brand.ui.screen.title)}</p>`
    + `<div class="u3-eta"><h2 class="ui-display u3-big${size === 'big' ? '' : ''}">${A(S.eta)}</h2>${ui.statusChip(live.status)}</div>`
    + `<p class="u3-soft">${A(S.pickup)}</p><div>${progress(S)}</div>${who}`;
}

// ---------------------------------------------------------------- desktop screen (light and dark share one composition, so the two pages compare)

function screenPage(ctx, id, mode) {
  const T = modeT(ctx, mode), M = colourMap(ctx, mode), S = sc(ctx), X = ex(ctx), ui = ctx.ui;
  // the headline box is 540 wide: "Product screen, light" in a longer display face needs about 510 px at its 40 px floor, and ran on under the lead at 548
  const head = headline(ctx, titleOf(ctx, id), '', { w: 540 });
  const leadH = lead(ctx, `${A(ctx.brand.ui.screen.title)} at 952 px and 1:1 on the ${mode} surface. In the glass, each row as the colour its status is written in.`, { x: 620, y: 104, w: 396 });
  // the screen: a top bar, the live item on the left, the list on the right
  const links = X.links ? `<div class="ui-topbar__links">${ui.links(X.links, 0)}</div>` : '';
  const scr = `<div class="u3-scr" style="height:100%"><nav class="ui-topbar" aria-label="Main">${wordmark(ctx)}${links}<span class="ui-num u3-soft">${A(S.time)}</span></nav>`
    + `<div class="u3-main" style="grid-template-columns:432px 1fr"><section class="u3-col">${liveColumn(ctx)}${ui.btn(S.share, { variant: 'secondary', block: true })}</section>`
    + `<section class="u3-col">${X.tabs ? ui.tabs(X.tabs, 0) : ''}${ui.deliveryRows(5)}</section></div></div>`;
  const SY = 200, SH = 504;
  const html = uiAt(ctx, T, 64, SY, 952, scr, { mode, h: SH, style: `border:1px solid ${M.edge};box-sizing:border-box` });
  // the band: one window for each row, in its status colour, left to right in the list's order
  const rows = S.deliveries.slice(0, 5), n = rows.length, CW = Math.floor((960 - P * (n - 1)) / n / P) * P;
  let keys = '';
  const ms = rows.map((d, i) => {
    const s = ctx.status.find((x) => x.id === d.status), x = 60 + i * (CW + P), hex = statusInk(M, s);
    keys += keyAt(ctx, x, CW, A(s.label), 'kn') + put(ctx, { x, y: KEY + 22, w: CW, cls: 'k', style: 'white-space:normal', html: A(d.to) });
    return tower(x, CW, LIP, { fill: hex });
  });
  keys += keyAt(ctx, 64, 952, `Each window is a row of the list, in the colour its status is written in on the ${mode} surface.`, 'k', 72);
  return kitPage(ctx, id, T, { marks: ms, html: head + leadH + html + keys });
}

export const uikit = {
  // ---- dialog: the product's one question over its scrim; the scrim runs on into the glass, and in it the two answers stand k times their size ----
  dialog: (ctx) => {
    const T = modeT(ctx, 'light'), M = colourMap(ctx, 'light'), D = sc(ctx).dialog || {}, ui = ctx.ui, R = ctx.radius;
    const head = headline(ctx, titleOf(ctx, 'dialog'));
    const leadH = lead(ctx, 'A dialog asks one question and holds the screen behind it on the scrim. The way out is on the left and the answer on the right; Esc and a click on the scrim close it.');
    const SX = 64, SY = 304, SW = 952;
    const dlg = ui.dialog({ title: D.title, body: D.body, confirm: D.confirm, keep: D.keep }).replace(/dlg-t/g, 'u3-dlg');
    const html = uiAt(ctx, T, SX, SY, SW, `<div class="ui-scrim u3-scrim"><div style="zoom:1.3">${dlg}</div></div>`, { mode: 'light', h: 752 - SY, style: 'background:transparent' });
    // the scrim as a flat field from the top of the dialog's layer to the band's foot: seen flat above the glass, reeded in it
    const field = box(SX, SY, SW, BB - SY, 0, { fill: M.scrim });
    // the two answers k times their size, in the order they ship (justified to the right, 12 px apart), centred in the band on the scrim
    const wk = ctx.placeholders ? 150 : btnW(ctx, D.keep), wc = ctx.placeholders ? 150 : btnW(ctx, D.confirm), gap = 12;   // slot: the labels are placeholders, so the answers take a fixed width
    const k = Math.max(1, Math.min(4, Math.floor((SW - 96) / ((wk + wc + gap) * 1.03))));
    const H = 44 * k, y = Math.round(768 + (384 - H) / 2), right = SX + SW - 48, xc = Math.round(right - wc * k), xk = Math.round(xc - gap * k - wk * k);
    const sw = Math.max(2, ctx.brand.ui.border * k);
    const keep = box(xk, y, Math.round(wk * k), H, R.button * k, { fill: M.surface, stroke: M.edge, sw });
    const conf = box(xc, y, Math.round(wc * k), H, R.button * k, { fill: M.action, ...(M['action-edge'] ? { stroke: M['action-edge'], sw } : {}) });
    const keys = keyAt(ctx, xk, Math.round(wk * k), A(D.keep), 'kn') + keyAt(ctx, xk, Math.round(wk * k), `Secondary, ${Math.round(wk)} px`, 'v num', 22)
      + keyAt(ctx, xc, Math.round(wc * k), A(D.confirm), 'kn') + keyAt(ctx, xc, Math.round(wc * k), `Primary, ${Math.round(wc)} px`, 'v num', 22)
      + keyW(ctx, 64, Math.max(200, xk - 96), `The two answers ${k} times their size, 44 px high, ${R.button} px corners.`, 'k')
      + keyAt(ctx, 64, 952, `The dialog: 440 px at most, a ${parseFloat(tokenGroups(ctx).space['sp-5'])} px padding, a ${ctx.brand.ui.border} px edge, on the scrim, ${M.scrim.toUpperCase()}. Shown at 1.3 times.`, 'k', 72);
    return kitPage(ctx, 'dialog', T, { marks: [field, keep, conf], html: head + leadH + html + keys });
  },

  // ---- table: the list as a data table, sorted by its first column; each column runs on down into the glass at its own x and width ----
  table: (ctx) => {
    const T = tokens(ctx), mode = editionMode(T), S = sc(ctx), ui = ctx.ui, W = ctx.weights;
    const heads = ['Item', 'Detail', 'Status', S.paidLabel || 'Total'];
    const rows = S.deliveries.slice().sort((a, b) => a.to.localeCompare(b.to, 'en-AU', { numeric: true }));
    const head = headline(ctx, titleOf(ctx, 'table'));
    const leadH = lead(ctx, `The list as a table, sorted by its first column. A sortable header is a button; the last column sits right in tabular figures. Rows rest, take the raised ground on hover, and carry a bar in the action colour when selected.`);
    // column widths: each column's widest cell (measured at its own size and weight) plus 24 px of padding; what is left goes to the first two
    const lab = (s) => (ctx.status.find((x) => x.id === s) || {}).label || '';
    const need = [
      Math.max(adv(ctx, 'body', heads[0], 13, 0, W.medium) + 24, ...rows.map((d) => adv(ctx, 'body', d.to, 15, 0, W.regular))),
      Math.max(adv(ctx, 'body', heads[1], 13, 0, W.medium) + 24, ...rows.map((d) => adv(ctx, 'body', d.when, 15, 0, W.regular))),
      Math.max(adv(ctx, 'body', heads[2], 13, 0, W.medium), ...rows.map((d) => adv(ctx, 'body', lab(d.status), 13, 0, W.medium))),
      Math.max(adv(ctx, 'body', heads[3], 13, 0, W.medium) + 24, ...rows.map((d) => adv(ctx, 'body', d.price, 15, 0, W.regular))),
    ].map((w) => Math.ceil(w * 1.05) + 24);
    const spare = Math.max(0, 952 - need.reduce((a, b) => a + b, 0));
    const cw = [need[0] + Math.floor(spare * 0.55), need[1] + spare - Math.floor(spare * 0.55), need[2], need[3]];
    const sortBtn = (t, on) => `<button type="button">${A(t)}${on ? ui.icon('chevron-right', 14) : ''}</button>`;
    const body = rows.map((d, i) => `<tr${i === 0 ? ' aria-selected="true"' : ''}${i === 2 ? ' class="is-hover"' : ''}><td>${A(d.to)}</td><td class="ui-num">${A(d.when)}</td><td>${ui.statusChip(d.status)}</td><td class="is-num">${A(d.price)}</td></tr>`).join('');
    const tbl = `<table class="ui-table u3-tbl"><colgroup>${cw.map((w) => `<col style="width:${w}px">`).join('')}</colgroup><thead><tr><th scope="col" aria-sort="ascending">${sortBtn(heads[0], true)}</th><th scope="col">${sortBtn(heads[1])}</th><th scope="col">${A(heads[2])}</th><th scope="col" class="is-num">${sortBtn(heads[3])}</th></tr></thead><tbody>${body}</tbody></table>`;
    const TY = 704 - 44 - 52 * rows.length;
    const html = uiAt(ctx, T, 64, TY, 952, tbl, { mode, style: 'background:transparent' });
    const notes = put(ctx, { x: 548, y: 176, w: 468, cls: 'k', style: 'white-space:normal', html: `<span class="kn">Selected</span> ${A(rows[0].to)}<br><span class="kn">Hover</span> ${A(rows[2].to)}<br><span class="kn">Sorted</span> ${A(heads[0])}, ascending` });
    // the band: each column a window at its own x, 6 px in from either edge; the sorted one solid and up to the lip, the others outlines from the band's top
    const align = ['Left', 'Left', 'Left', 'Right, tabular'];
    let x = 64, keys = '';
    const ms = cw.map((w, i) => {
      const m = i === 0 ? tower(x + 6, w - 12, LIP, { fill: T.strong }) : tower(x + 6, w - 12, 768 + 48, { stroke: T.ink, sw: 2 });
      keys += keyAt(ctx, x + 6, w - 12, A(heads[i]), 'kn') + keyAt(ctx, x + 6, w - 12, `${w} px`, 'v num', 22) + keyAt(ctx, x + 6, w - 12, align[i], 'k', 44);
      x += w;
      return m;
    });
    keys += keyAt(ctx, 64, 952, `Each column runs on into the glass at its own width. Solid: the sorted column. Rows are ${44} px under a header, then ${52} px each.`, 'k', 72);
    return kitPage(ctx, 'table', T, { marks: ms, html: head + leadH + notes + html + keys });
  },

  // ---- empty: first run in three frames, loading, empty, the first one added; each frame runs on into the glass in its own ground, a step higher in time ----
  empty: (ctx) => {
    const T = tokens(ctx), mode = editionMode(T), M = colourMap(ctx, mode), S = sc(ctx), E = S.empty || {}, ui = ctx.ui;
    const head = headline(ctx, titleOf(ctx, 'empty'));
    const leadH = lead(ctx, 'First run, in the order a new account sees it. While it loads, the shape of the list; when there is nothing, say what is missing and offer the one action that fixes it; then the first one, confirmed.');
    const FW = 300, FX = [64, 390, 716], FY = 352;
    const label = (x, t) => put(ctx, { x, y: FY - 36, w: FW, cls: 'kn', html: A(t) });
    const frames = [
      ['Loading', `<div style="zoom:1.2"><div class="u3-well">${ui.spinner()}${ui.skeleton('84%')}${ui.skeleton('56%')}${ui.skeleton('70%')}</div></div>`, 'sunken'],
      ['Empty', `<div style="zoom:1.2"><div class="ui-empty"><h3 class="ui-empty__title">${A(E.title)}</h3><p class="ui-empty__text">${A(E.body)}</p>${ui.btn(E.cta)}</div></div>`, 'raised'],
      ['The first one', `<div style="zoom:1.2"><div class="u3-stack">${ui.deliveryRows(1)}${ui.toast(S.toast)}</div></div>`, 'surface'],
    ];
    let html = '', keys = '';
    const ms = frames.map(([t, inner, tok], i) => {
      html += label(FX[i], t) + uiAt(ctx, T, FX[i], FY, FW, inner, { mode, style: 'background:transparent' });
      const hex = M[tok];
      keys += keyAt(ctx, FX[i], FW, A(t), 'kn') + keyAt(ctx, FX[i], FW, A(`--${tok} ${hex.toUpperCase()}`), 'v num', 22);
      return tower(FX[i], FW, LIP + (2 - i) * 64, { fill: hex, ...(faint(ctx, T, hex) ? { stroke: T.quiet, sw: 2 } : {}) });
    });
    keys += keyAt(ctx, 64, 952, 'Each frame runs on into the glass in the ground it sits on, each a step higher than the one before it in time.', 'k', 56);
    return kitPage(ctx, 'empty', T, { marks: ms, html: head + leadH + html + keys });
  },

  'screen-light': (ctx) => screenPage(ctx, 'screen-light', 'light'),
  'screen-dark': (ctx) => screenPage(ctx, 'screen-dark', 'dark'),

  // ---- screen-mobile: the product at 390 px and 1:1, on the light surface; the phone's screen runs on behind the glass to its foot and tab bar ----
  'screen-mobile': (ctx) => {
    const T = modeT(ctx, 'light'), M = colourMap(ctx, 'light'), S = sc(ctx), X = ex(ctx), ui = ctx.ui;
    // two lines, split at the title's comma: on one line Kerbside's "Product screen, mobile" ran on to the phone's edge at 626
    const [t1, t2 = ''] = titleOf(ctx, 'screen-mobile').split(/(?<=,) /);
    const head = headline(ctx, t1, t2, { w: 468 });
    const leadH = lead(ctx, `${A(ctx.brand.ui.screen.title)} at 390 px, the width of a phone, at 1:1 on the light surface. The same components as the desktop screen, in one column, with the list one tab away.`, { y: t2 ? 240 : 176, w: 440 });
    const PX = 626, PY = 96, PW = 390, PH = 844, TB = 64;
    // the screen's parts, top to bottom, in the empty column beside the phone
    const anatomy = [['Top bar', 'The time, and the wordmark at the right.'], ['Status', 'What is happening now, and the line under it.'], ['Progress', 'A line with its two ends named.'], ['Row', 'One item: its title, a line under it and its action.'], ['Action', 'One full-width button, the next step.']]
      .map(([n, t], i) => put(ctx, { x: 64, y: 400 + i * 64, w: 468, cls: 'body', style: 'white-space:normal;border-top:1px solid var(--hair);padding-top:8px', html: `<span class="kn">${A(n)}</span><br>${A(t)}` })).join('');
    const scr = `<div class="u3-scr" style="height:100%"><div class="u3-top"><span class="ui-num u3-soft">${A(S.time)}</span>${wordmark(ctx)}</div>`
      + `<section class="u3-col">${liveColumn(ctx)}${ui.btn(S.share, { variant: 'secondary', block: true })}</section></div>`;
    const html = uiAt(ctx, T, PX, PY, PW, scr, { mode: 'light', h: 760 - PY, style: 'background:transparent' });
    // the phone's screen as a flat field with an edge, from its top to its foot; the tab bar (64 px, a hairline and the active tab's bar) sits in the glass
    const n = 4, tw = PW / n;
    const phone = box(PX, PY, PW, PH, 0, { fill: M.surface, stroke: M.edge, sw: 2 });
    const rule = box(PX, PY + PH - TB, PW, 2, 0, { fill: M.divider });
    const on = box(PX, PY + PH - TB, Math.round(tw), 4, 0, { fill: M.action });
    const keys = keyAt(ctx, PX, PW, `${PW} px wide, ${PH} px high, 1:1`, 'v num') + keyAt(ctx, PX, PW, `The tab bar, ${TB} px, at the foot`, 'k', 22)
      + keyW(ctx, 64, 468, `In the glass, the phone's screen to its foot: the tab bar's hairline and the active tab, ${X.tabs ? A(X.tabs[0]) : 'the first'}, in the action colour.`, 'k');
    return kitPage(ctx, 'screen-mobile', T, { marks: [phone, rule, on], html: head + leadH + anatomy + html + keys });
  },

  // ---- tokens: every token name and value from ctx, in the theme's mono; in the glass every colour token, its light value above and its dark value below ----
  tokens: (ctx) => {
    const T = tokens(ctx), g = tokenGroups(ctx), L = colourMap(ctx, 'light'), D = colourMap(ctx, 'dark');
    const names = Object.keys(L), nc = names.length;
    const head = headline(ctx, titleOf(ctx, 'tokens'), '', { w: 468 });
    const total = nc + ['space', 'radius', 'width', 'font', 'text', 'shadow'].reduce((a, k) => a + Object.keys(g[k]).length, 0);
    const leadH = lead(ctx, `${total} tokens, as the code package writes them. Colour names a job and keeps its name in dark; only the value swaps.`, { x: 548, y: 104 });
    // colour: three columns, name, light, dark
    const per = Math.ceil(nc / 3), CX = [64, 386, 708], CY = 208, RH = 22;
    let html = put(ctx, { x: 64, y: CY - 30, w: 300, cls: 'kn', html: 'Colour' });
    CX.forEach((x) => { html += put(ctx, { x: x + 164, y: CY - 30, w: 64, cls: 'k', html: 'Light' }) + put(ctx, { x: x + 240, y: CY - 30, w: 64, cls: 'k', html: 'Dark' }) + `<div class="hair" style="left:${x}px;top:${CY - 6}px;width:308px"></div>`; });
    names.forEach((k, i) => {
      const x = CX[Math.floor(i / per)], y = CY + (i % per) * RH;
      html += put(ctx, { x, y, w: 160, html: mono(`--${k}`) }) + put(ctx, { x: x + 164, y, w: 72, html: mono(L[k].toUpperCase(), 'u3-q') }) + put(ctx, { x: x + 240, y, w: 72, html: mono(D[k].toUpperCase(), 'u3-q') });
    });
    // the rest: four columns of groups, each a heading and its rows; a value that runs long wraps under its name
    const GY = CY + per * RH + 32, GW = 226, GXs = [64, 306, 548, 790];
    const group = (t, rows) => ({ t, rows });
    const steps = ctx.uiType.map((s) => s.token);
    const cols = [
      [group('Space', Object.entries(g.space))],
      [group('Radius', Object.entries(g.radius)), group('Border width', Object.entries(g.width))],
      [group('Type: --fs-, --lh-, --fw-', steps.map((s) => [s, `${g.text['fs-' + s]} ${g.text['lh-' + s]} ${g.text['fw-' + s]}`]))],
      [group('Fonts', Object.entries(g.font)), group('Shadow', Object.entries(g.shadow))],
    ];
    const lh = Math.min(RH, 20);
    cols.forEach((gs, c) => {
      let y = GY;
      gs.forEach(({ t, rows }) => {
        html += put(ctx, { x: GXs[c], y, w: GW, cls: 'kn', html: A(t) }) + `<div class="hair" style="left:${GXs[c]}px;top:${y + 24}px;width:${GW}px"></div>`;
        y += 30;
        rows.forEach(([k, v]) => {
          const name = c === 2 ? k : `--${k}`, nw = adv(ctx, 'dm', name, TXT, 0, 400) * 1.03 + 12, vs = String(v);
          const inline = nw + adv(ctx, 'dm', vs, TXT, 0, 400) * 1.03 <= GW;
          if (inline) { html += put(ctx, { x: GXs[c], y, w: GW, html: `${mono(name)}<span class="u3-q" style="position:absolute;right:0;top:0">${A(vs)}</span>` }); y += lh + 2; }
          else { const ln = linesIn(ctx, 'dm', vs, TXT, 400, GW); html += put(ctx, { x: GXs[c], y, w: GW, html: mono(name) }) + put(ctx, { x: GXs[c], y: y + lh, w: GW, cls: 'u3-q', style: 'white-space:normal', html: A(vs) }); y += lh * (1 + ln) + 2; }
        });
        y += 14;
      });
    });
    // the band: one window per colour token, light value from the lip to the band's middle, dark value below it
    const CW = Math.floor((960 - P * (nc - 1)) / nc), mid = 960;
    const ms = [];
    names.forEach((k, i) => {
      const x = 60 + i * (CW + P), l = L[k], d = D[k];
      ms.push(tower(x, CW, LIP, { fill: l, ...(faint(ctx, T, l) ? { stroke: T.quiet, sw: 2 } : {}) }));
      ms.push(box(x, mid, CW, BB - mid, 0, { fill: d, ...(faint(ctx, T, d) ? { stroke: T.quiet, sw: 2 } : {}) }));
    });
    const keys = keyAt(ctx, 64, 952, `In the glass, the ${nc} colour tokens in the table's order: each window holds its light value above the band's middle and its dark value below it.`, 'k')
      + keyAt(ctx, 64, 952, 'Values in px are written as the stylesheet reads them; the type steps give size, line and weight in that order.', 'k', 22);
    return kitPage(ctx, 'tokens', T, { marks: ms, html: head + leadH + html + keys });
  },

  // ---- code: what is in the package and the three lines that install it; in the glass the files the tokens and components become, as tall as their lines ----
  code: (ctx) => {
    const T = tokens(ctx), F = sc(ctx).form || {}, fams = [...new Set(ctx.faces.map((f) => f.family))];
    const head = headline(ctx, titleOf(ctx, 'code'), '', { w: 468 });
    const leadH = lead(ctx, `Plain CSS, no framework. Copy the folder, link three stylesheets and put the class ui on the body. Colour tokens name a job; dark swaps the values and keeps the names.`, { x: 548, y: 104 });
    const files = [
      ['README.md', 'Install, use, token names, light and dark, accessibility.'],
      ['tokens.css', 'Custom properties: light on :root, dark on data-theme and the system setting.'],
      ['tokens.json', 'The same tokens in the design token format, a dark value on each colour.'],
      ['tokens.ts', 'A typed export of the same values.'],
      ['tailwind.css', 'A Tailwind v4 @theme block mapped to the tokens.'],
      ['components.css', 'A class for every component in this kit, built only on the tokens.'],
      ['example.html', 'Every component live, with a light and dark switch.'],
      ['fonts.css', `@font-face rules for ${fams.join(' and ')}.`],
      ['assets/', `The logo, ${iconSet(ctx).length} icons and the font files.`],
    ];
    let y = 232, html = put(ctx, { x: 64, y: y - 32, w: 468, cls: 'kn', html: 'In the package' }) + `<div class="hair" style="left:64px;top:${y - 8}px;width:468px"></div>`;
    files.forEach(([n, d]) => {
      const ln = linesIn(ctx, 'chrome', d, TXT, 400, 300);
      html += put(ctx, { x: 64, y, w: 156, html: mono(n) }) + put(ctx, { x: 232, y, w: 300, cls: 'k', style: 'white-space:normal', html: A(d) });
      y += Math.max(1, ln) * 20 + 10;
    });
    // the snippets, set as code in the theme's mono
    const install = `<link rel="stylesheet" href="fonts.css">\n<link rel="stylesheet" href="tokens.css">\n<link rel="stylesheet" href="components.css">\n\n<body class="ui">\n  <button class="ui-btn" type="button">\n    ${F.book || 'Save'}\n  </button>\n</body>`;
    const blocks = [['Install', install], ['Dark mode', '<html data-theme="dark">'], ['Tailwind v4', '@import "tailwindcss";\n@import "./tokens.css";\n@import "./tailwind.css";']];
    let by = 232;
    blocks.forEach(([t, c]) => {
      const n = c.split('\n').length;
      html += put(ctx, { x: 548, y: by - 32, w: 468, cls: 'kn', html: A(t) }) + `<div class="hair" style="left:548px;top:${by - 8}px;width:468px"></div>`
        + put(ctx, { x: 548, y: by, w: 468, html: `<pre class="u3-pre">${A(c)}</pre>` });
      by += n * 22 + 56;
    });
    // the band: the six files the generator writes from the tokens and components, each as tall as its line count (the longest reaches the lip)
    const out = [['tokens.css', tokensCss(ctx)], ['tokens.json', JSON.stringify(tokensJson(ctx), null, 2) + '\n'], ['tokens.ts', tokensTs(ctx)], ['tailwind.css', tailwindCss(ctx)], ['components.css', componentsCss(ctx)], ['example.html', exampleHtml(ctx)]];
    const lines = out.map(([, s]) => s.replace(/\n$/, '').split('\n').length), top = Math.max(...lines), u = (BB - LIP) / top;
    const n = out.length, CW = Math.floor((960 - P * (n - 1)) / n / P) * P;
    let keys = '';
    const ms = out.map(([nm], i) => {
      const x = 60 + i * (CW + P);
      keys += keyAt(ctx, x, CW, mono(nm)) + keyAt(ctx, x, CW, `${lines[i]} lines`, 'v num', 22);
      return tower(x, CW, Math.round(BB - lines[i] * u), { fill: T.strong });
    });
    keys += keyAt(ctx, 64, 952, 'In the glass, the six files written from the tokens and the components, each as tall as its lines for this brand.', 'k', 56);
    return kitPage(ctx, 'code', T, { marks: ms, html: head + leadH + html + keys });
  },
};
