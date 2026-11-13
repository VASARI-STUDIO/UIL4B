// Theme 32, Dieline, lane u3: the UI kit screens and code (dialog, table, empty, screen-light, screen-dark, screen-mobile, tokens, code).
// The kit is the product in the pack: whole screens show through die-cut windows in the board, built only from the real ctx.ui components
// and the brand's ui copy. Tokens and code are the fine print on the back of the pack, printed from engine/tokens.js.
// Chrome comes from lane-u1 (read-only): KitPage, panel, kitNet, inner, reach, say, kitCopy, inkOn, textW.
import { KitPage, panel, kitNet, reach, say, kitCopy, inkOn, textW } from './lane-u1.js';
import { allocate, wrap, measure, L, r2, esc } from './geom.js';
import { colourMap, tokenGroups, tokensCss, tailwindCss } from '../../engine/tokens.js';
import { iconSet } from '../../engine/components.js';

// ---- small shared parts ----
// slot copy cannot hold its dashed frame inside an attribute, so there the marks are dropped and the descriptor label stays as plain text
const win = (P, x, y, w, h, html, o) => P.win(x, y, w, h, html, o);
const marked = (s) => String(s).includes('⟦');
// a caption with only its literal values (tokens, hex, px, ratios) in mono
const VAL = /--[a-z0-9-]+|#[0-9A-Fa-f]{6}\b|\d+(?:\.\d+)?(?::1| px)?/g;
const mixed = (s) => { s = String(s); let o = '', i = 0; for (const m of s.matchAll(VAL)) { o += esc(s.slice(i, m.index)) + `<span class="m">${esc(m[0])}</span>`; i = m.index + m[0].length; } return o + esc(s.slice(i)); };
const ratio = (ctx, a, b) => `${ctx.fmt(ctx.ratio(a, b))}:1`;
// the width of a caption line whose literal values print in the 12 px mono, the rest in the chrome face
function mixedW(ctx, s, size) {
  let x = 0, i = 0;
  for (const m of s.matchAll(VAL)) { x += measure(ctx, 'chrome', 400, s.slice(i, m.index), size) + measure(ctx, 'val', 400, m[0], 12); i = m.index + m[0].length; }
  return x + measure(ctx, 'chrome', 400, s.slice(i), size);
}
// wrap a caption at those widths (greedy, but a line never ends on a short word that holds the next)
const HOLD = /^(a|an|the|of|to|and|or|in|on|at|by|for|with|from|is)$/i;
function mwrap(ctx, s, size, w) {
  if (marked(s)) return [s];
  const words = String(s).split(' '), out = [];
  let cur = '';
  for (const wd of words) {
    const next = cur ? cur + ' ' + wd : wd;
    if (!cur || mixedW(ctx, next, size) <= w) { cur = next; continue; }
    const parts = cur.split(' '), last = parts[parts.length - 1];
    if (parts.length > 1 && HOLD.test(last) && mixedW(ctx, last + ' ' + wd, size) <= w) { out.push(parts.slice(0, -1).join(' ')); cur = last + ' ' + wd; } else { out.push(cur); cur = wd; }
  }
  if (cur) out.push(cur);
  return out;
}
// a caption in the chrome face, wrapped at its real widths; returns its height
function cap(P, x, y, w, s, col, { size = 14, lh = 20, weight } = {}) {
  const rows = mwrap(P.ctx, s, size, w);
  P.text(x, y, w, rows.length * lh, 'cap', rows.map(mixed).join('<br>'), `font-size:${size}px;line-height:${lh}px;color:${col}${weight ? `;font-weight:${weight}` : ''}`);
  return rows.length * lh;
}
const capH = (ctx, s, w, lh = 20) => mwrap(ctx, s, 14, w).length * lh;
// a row of short rules on the ground, side by side; returns the tallest
function rules(P, x, y, w, list, col, gap = 40) {
  const cw = Math.floor((w - gap * (list.length - 1)) / list.length);
  return Math.max(...list.map((s, i) => cap(P, x + i * (cw + gap), y, cw, s, col)));
}
const rulesH = (ctx, w, list, gap = 40) => { const cw = Math.floor((w - gap * (list.length - 1)) / list.length); return Math.max(...list.map((s) => capH(ctx, s, cw))); };
// the band a kind's closures keep clear inside a panel or net
const band = (kind) => ({ t: kind === 'bag' ? 88 : 48, b: kind === 'bag' ? 56 : kind === 'satchel' ? 40 : 32 });

// ---- the screen copy: every brand string through say(), so the slot edition shows a descriptor frame in its place ----
function copy(ctx) {
  const C = ctx.brand.ui.screen.content, X = C.example || {}, s = (p, v, n) => say(ctx, 'ui.screen.content.' + p, v, n), K = kitCopy(ctx);
  return {
    ...K, C,
    title: say(ctx, 'ui.screen.title', ctx.brand.ui.screen.title), time: s('time', C.time), from: s('from', C.from), to: s('to', C.to), initials: s('initials', C.initials),
    call: s('call', C.call), deliverToLabel: s('deliverToLabel', C.deliverToLabel), paidLabel: s('paidLabel', C.paidLabel), share: s('share', C.share),
    rows: C.deliveries.map((d, i) => ({ to: s('deliveries.*.to', d.to, i + 1), when: s('deliveries.*.when', d.when, i + 1), price: s('deliveries.*.price', d.price, i + 1), status: d.status, icon: d.icon })),
    emptyBody: s('empty.body', C.empty.body), emptyCta: s('empty.cta', C.empty.cta), formTitle: s('form.title', C.form.title), bookWhy: s('form.bookWhy', C.form.bookWhy),
    tabs: (X.tabs || []).map((t, i) => s('example.tabs.*', t, i + 1)),
    links: (X.links || []).map(([t, ic], i) => [s('example.links.*.0', t, i + 1), ic]),
    account: s('example.account', X.account || 'Account'),
  };
}

// ---- screen parts, real components only ----
const rowsHtml = (ctx, S, n, from = 0) => `<ul class="ui-list">${S.rows.slice(from, from + n).map((d) => ctx.ui.row({ lead: ctx.ui.icon(d.icon || ctx.brand.ui.rowIcon || 'package', 18), title: d.to, sub: d.when, end: d.price, chip: ctx.ui.statusChip(d.status, { label: S.st(d.status) }) })).join('')}</ul>`;
const progress = (S) => { const p = Math.round(S.progress * 100); return `<div class="ui-progress" role="progressbar" aria-label="Progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${p}"><div class="ui-progress__bar"><i style="width:${p}%"></i></div><span class="ui-progress__dot" style="left:${p}%"></span></div><div class="u3-route"><span>${esc(S.from)}</span><span>${esc(S.to)}</span></div>`; };
const person = (ctx, S) => `<div class="u3-person"><span class="ui-avatar">${esc(S.initials)}</span><div class="u3-pm"><p class="u3-pn">${esc(S.rider)}</p><p class="u3-ps">${esc(S.riderNote)}</p></div>${ctx.ui.btn(S.call, { variant: 'secondary', size: 'sm' })}</div>`;
const details = (S) => `<dl class="u3-dl"><div><dt>${esc(S.deliverToLabel)}</dt><dd>${esc(S.deliverTo)}</dd></div><div><dt>${esc(S.paidLabel)}</dt><dd class="ui-num">${esc(S.paid)}</dd></div></dl>`;
// the logo on a UI surface: the colourway whose name reads best on it, inked in the mode's text colour, at most 28 tall
function logoOn(P, M, maxW = 132) {
  const { ctx, R } = P, asp = ctx.logo.geo.aspect, w = Math.min(maxW, 28 * asp);
  return `<span class="u3-logo" style="width:${r2(w)}px;height:${r2(w / asp)}px">${ctx.logo.html('colour', { width: w, colourway: R.colourwayOn(M.surface), color: M.text })}</span>`;
}
// the desktop screen: top bar, the live job on the left, the list and the one main action on the right
function desktop(P, M) {
  const { ctx } = P, ui = ctx.ui, S = copy(ctx);
  return `<div class="u3-scr">
<nav class="ui-topbar" aria-label="Main">${logoOn(P, M)}<div class="ui-topbar__links">${ui.links(S.links, 0)}</div><span class="ui-num u3-clock">${esc(S.time)}</span></nav>
<div class="u3-main">
<section class="u3-track"><p class="u3-k">${esc(S.title)}</p><div class="u3-eta"><h2 class="ui-display u3-big">${esc(S.eta)}</h2>${ui.statusChip('on-the-way', { label: S.st('on-the-way') })}</div>
<p class="u3-soft">${esc(S.pickup)}</p><div>${progress(S)}</div>${person(ctx, S)}${details(S)}${ui.btn(S.share, { variant: 'secondary', block: true })}</section>
<section class="u3-side">${ui.tabs(S.tabs, 0)}${rowsHtml(ctx, S, 3, 1)}<div class="u3-go">${ui.btn(S.form.book, { iconRight: 'arrow-right' })}</div></section>
</div></div>`;
}

// ---- the pages ----
export const uikit = {
  // the screen in light: the front panel hangs from the top of the sheet with the screen at 1:1 in its window, the light values under it
  'screen-light'(ctx) {
    const P = new KitPage(ctx, 'screen-light'), { R, kind } = P, M = colourMap(ctx, 'light'), gi = R.groundText, hex = R.front.hex, { t, b } = band(kind);
    const notes = screenNotes(ctx, M, 'light');
    const nh = rulesH(ctx, 1000, notes), down = reach(kind, true).down;
    const wy = P.y0 + t, wh = Math.min(560, 996 - nh - 40 - down - b - 16 - wy);
    P.y1 = wy + wh + 16 + b;
    panel(P, 'base', hex, { x0: 40, x1: 1080, l: 'cut', r: 'bleed' });
    win(P, 80, wy, 920, wh, desktop(P, M), { on: hex, pad: 0 });
    rules(P, 40, P.y1 + down + 40, 1000, notes, gi.ink);
    return P.html(hex);
  },

  // the same markup with data-theme="dark": the back panel stands on the foot of the sheet, bleeding off the left, the dark values above it
  'screen-dark'(ctx) {
    const P = new KitPage(ctx, 'screen-dark'), { R, kind } = P, M = colourMap(ctx, 'dark'), gi = R.groundText, hex = R.back.hex, { t, b } = band(kind);
    const notes = screenNotes(ctx, M, 'dark');
    const nh = rulesH(ctx, 1000, notes), r = reach(kind, true);
    P.y1 = 912 - r.down;
    const top = 96 + nh + 40 + r.up, wh = Math.min(560, P.y1 - b - 16 - top - t);
    P.y0 = P.y1 - (t + wh + 16 + b);
    panel(P, 'back', hex, { x0: 0, x1: 1040, l: 'bleed', r: 'cut', near: [], far: [] });
    win(P, 80, P.y0 + t, 920, wh, desktop(P, M), { on: hex, pad: 0, dark: true });
    rules(P, 40, 96, 1000, notes, gi.ink);
    return P.html(hex);
  },

  // the table is the fine print on the back of the pack: a wide back panel and its gusset, the row states named on the gusset
  table(ctx) {
    const P = new KitPage(ctx, 'table'), { R, kind } = P, ui = ctx.ui, S = copy(ctx), M = colourMap(ctx, 'light'), gi = R.groundText, { t, b } = band(kind);
    const sort = (s, dir) => `<button type="button">${esc(s)}${dir ? ui.icon(dir, 14) : ''}</button>`;
    const body = S.rows.map((d, i) => `<tr${i === 0 ? ' aria-selected="true"' : ''}${i === 2 ? ' class="is-hover"' : ''}><td>${esc(d.to)}</td><td class="ui-num">${esc(d.when)}</td><td>${ui.statusChip(d.status, { label: S.st(d.status) })}</td><td class="is-num">${esc(d.price)}</td></tr>`).join('');
    const table = `<table class="ui-table"><thead><tr><th scope="col" aria-sort="ascending">${sort('Item', 'arrow-up')}</th><th scope="col">${sort('When')}</th><th scope="col">Status</th><th scope="col" class="is-num">${sort(S.paidLabel)}</th></tr></thead><tbody>${body}</tbody></table>`;
    const th = 44 + S.rows.length * 52, wh = th + 48;
    const sx = kind === 'box' ? 72 : 56, gw = 248, bw = 1040 - sx - gw;
    const r = reach(kind, true);
    P.y1 = 912 - r.down; P.y0 = P.y1 - (t + wh + 24 + b);
    const { xs } = kitNet(P, [{ w: bw, hex: R.back.hex, role: 'back' }, { w: gw, hex: R.side.hex, role: 'side' }], P.y0, P.y1);
    win(P, xs[0] + 24, P.y0 + t, bw - 48, wh, `<div class="u3-tb">${table}</div>`, { on: R.back.hex, pad: 24 });
    // the gusset names the three row states, each beside nothing but its own words
    const ink = inkOn(P, R.side.hex), gx = xs[1] + 24, gww = gw - 48;
    let y = P.y0 + t + 24 + 44 + 16;
    for (const [n, s] of [['Selected', `The first row: --raised and a 3 px --action bar.`], ['Hover', 'The third row: --raised, on pointer devices only.'], ['Sorted', 'Item, ascending. The header is a button.']]) {
      P.text(gx, y, gww, 20, 'cap', `<span style="font-weight:500">${esc(n)}</span>`, `color:${ink}`);
      y += 20 + cap(P, gx, y + 20, gww, s, ink) + 24;
    }
    // the rules on the ground, just above the net
    const list = ['A header names the data under it. A sortable header is a button, and the sorted one shows its direction.', `Numbers sit right in tabular figures. Rows are 52 px, the header 44 px on --raised with a ${ctx.borders[1].px} px --text rule.`, `Text in a row reads ${ratio(ctx, M.text, M.surface)} on --surface and ${ratio(ctx, M.text, M.raised)} on --raised.`];
    rules(P, 40, P.y0 - r.up - 40 - rulesH(ctx, 1000, list), 1000, list, gi.ink);
    return P.html(R.back.hex);
  },

  // the dialog across a fold: the screen at rest in the front panel, the same moment opened in the back panel, with focus on the safe answer
  dialog(ctx) {
    const P = new KitPage(ctx, 'dialog'), { R, kind } = P, ui = ctx.ui, S = copy(ctx), M = colourMap(ctx, 'light'), gi = R.groundText, { t, b } = band(kind);
    const sx = kind === 'box' ? 72 : 56, ws = allocate([1, 1], 1040 - sx, 400), wh = 352;
    P.y1 = P.y0 + t + wh + 16 + b;
    const panels = [{ w: ws[0], hex: R.front.hex, role: 'front' }, { w: ws[1], hex: R.back.hex, role: 'back' }];
    const { xs } = kitNet(P, panels, P.y0, P.y1);
    const rest = `<div class="u3-dr"><p class="u3-k">${esc(S.title)}</p><div class="u3-eta"><h2 class="ui-display u3-big">${esc(S.eta)}</h2>${ui.statusChip('on-the-way', { label: S.st('on-the-way') })}</div><p class="u3-soft">${esc(S.pickup)}</p>${person(ctx, S)}<div class="u3-go">${ui.btn(S.dialog.confirm, { variant: 'secondary' })}</div></div>`;
    // the keep button carries the components' own focus state: focus lands on the answer that changes nothing
    const dlg = ui.dialog({ title: S.dialog.title, body: S.dialog.body, confirm: S.dialog.confirm, keep: S.dialog.keep }).replace(/dlg-t/g, 'u3-dlg').replace('ui-btn ui-btn--secondary"', 'ui-btn ui-btn--secondary is-focus"');
    win(P, xs[0] + 24, P.y0 + t, ws[0] - 48, wh, rest, { on: R.front.hex, pad: 24 });
    win(P, xs[1] + 24, P.y0 + t, ws[1] - 48, wh, `<div class="ui-scrim u3-fill">${dlg}</div>`, { on: R.back.hex, pad: 0 });
    // what each window shows, on the ground under its panel, then the rules
    const cy = P.y1 + reach(kind, true).down + 32;
    const c1 = cap(P, xs[0] + 24, cy, ws[0] - 48, `At rest. ${S.dialog.confirm} asks before it acts.`, gi.ink);
    const c2 = cap(P, xs[1] + 24, cy, ws[1] - 48, `Open. --scrim covers the screen; focus is on ${S.dialog.keep}.`, gi.ink);
    const list = ['A dialog asks one thing. The title is the question and the two buttons answer it.', 'The answer that changes nothing comes first, and it is where the focus lands. Esc and a click on the scrim do the same.', `The dialog is --surface with a ${ctx.borders[1].px} px --text edge, on --scrim. Danger red is kept for what cannot be undone.`];
    rules(P, xs[0] + 24, cy + Math.max(c1, c2) + 48, 1040 - xs[0] - 24, list, gi.ink);
    return P.html(R.front.hex);
  },

  // nothing to show yet: one gusset of the pack, two windows down it, the rest of the sheet left as unprinted board
  empty(ctx) {
    const P = new KitPage(ctx, 'empty'), { R } = P, ui = ctx.ui, S = copy(ctx), gi = R.groundText, inn = P.inn, hex = R.side.hex;
    panel(P, 'side', hex, { x0: 520, x1: 1040, l: 'fold', r: 'cut', near: [[40, 520]], far: [40] });
    const none = `<div class="ui-empty u3-em"><h3 class="ui-empty__title">${esc(S.empty.title)}</h3><p class="ui-empty__text">${esc(S.emptyBody)}</p>${ui.btn(S.emptyCta)}</div>`;
    const first = `<div class="ui-empty u3-em"><h3 class="ui-empty__title">${esc(S.formTitle)}</h3>${ui.btn(S.form.book, { disabled: true })}<p class="ui-help">${esc(S.bookWhy)}</p></div>`;
    const gap = 40, h1 = Math.round((inn.bot - inn.top - gap) * 0.54), h2 = inn.bot - inn.top - gap - h1;
    win(P, 560, inn.top, 440, h1, none, { on: hex, pad: 24 });
    win(P, 560, inn.top + h1 + gap, 440, h2, first, { on: hex, pad: 24 });
    // each window's rule beside it on the board, level with its top
    const ink = gi.ink;
    let y = inn.top + 24;
    y += cap(P, 80, y, 360, 'Empty', ink, { weight: 500 });
    cap(P, 80, y + 4, 360, 'Say what is missing, then offer the one action that fills it. The empty state sits on --raised with no edge, so it never reads as a card.', ink);
    y = inn.top + h1 + gap + 24;
    y += cap(P, 80, y, 360, 'First run', ink, { weight: 500 });
    cap(P, 80, y + 4, 360, `Before the first order the main action waits, disabled, and the reason sits under it in --text-soft.`, ink);
    return P.html(hex);
  },

  // the phone: a gusset is the shape of a phone, so the screen stands in the back panel at 1:1; the time promise, state by state, on the board
  'screen-mobile'(ctx) {
    const P = new KitPage(ctx, 'screen-mobile'), { R, kind } = P, ui = ctx.ui, S = copy(ctx), M = colourMap(ctx, 'light'), gi = R.groundText, inn = P.inn, hex = R.back.hex;
    const g = panel(P, 'back', hex, { x0: 0, x1: 480, l: 'bleed', r: 'fold', near: [[494, 760]], far: [760] });
    const nav = [...S.links, [S.account, 'user']].slice(0, 4);
    const phone = `<div class="u3-ph"><div class="u3-ph-top"><span class="ui-num">${esc(S.time)}</span>${logoOn(P, M, 112)}</div>
<div class="u3-ph-body">${ui.statusChip('on-the-way', { label: S.st('on-the-way') })}<h2 class="ui-display u3-big">${esc(S.eta)}</h2><p class="u3-soft">${esc(S.pickup)}</p><div>${progress(S)}</div>${person(ctx, S)}${details(S)}${ui.btn(S.share, { variant: 'secondary', block: true })}</div>
<nav class="ui-tabbar" aria-label="Sections">${nav.map(([n, i], k) => `<a href="#"${k === 0 ? ' aria-current="page"' : ''}>${ui.icon(i, 20)}${esc(n)}</a>`).join('')}</nav></div>`;
    win(P, 80, inn.top, 360, inn.bot - inn.top, phone, { on: hex, pad: 0 });
    // the board beside the fold: every status the list can hold, its chip over its own time line, as the screen's headline would read
    const rx = g.x1 + (g.fin ? 14 : 0) + 96, rw = 1000 - rx;
    const states = S.rows.map((d) => `<li>${ui.statusChip(d.status, { label: S.st(d.status) })}<span class="ui-display u3-when">${esc(d.when)}</span></li>`).join('');
    let y = inn.top;
    y += cap(P, rx, y, rw, 'The headline, state by state', gi.ink, { weight: 500 }) + 16;
    const sh = S.rows.length * 72 + 24;
    win(P, rx, y, rw, sh, `<ul class="u3-states">${states}</ul>`, { pad: 20 });
    y += sh + 32;
    const list = [`The time promise is the headline in every state, set in the display face at ${uiT(ctx, 'headline').size} px. The chip above it says where the order is.`, 'The person on the job and their button stay low, in reach of the thumb.', `Four places in the tab bar. The one open carries a 3 px --action rule.`];
    for (const s of list) y += cap(P, rx, y, rw, s, gi.ink) + 16;
    return P.html(hex);
  },

  // the tokens are the fine print of the pack: every value from engine/tokens.js printed on one full-width panel
  tokens(ctx) {
    const P = new KitPage(ctx, 'tokens'), { R, kind } = P, g = tokenGroups(ctx), Lm = colourMap(ctx, 'light'), Dm = colourMap(ctx, 'dark'), hex = R.flap.hex;
    if (kind === 'box') P.y1 = 880;
    panel(P, 'base', hex, { x0: 40, x1: 1040, l: 'cut', r: 'cut' });
    const inn = P.inn, ink = inkOn(P, hex), keys = Object.keys(Lm), half = Math.ceil(keys.length / 2);
    const head = (x, y, w, s) => { P.text(x, y, w, 20, 'cap', `<span style="font-weight:500">${esc(s)}</span>`, `color:${ink}`); P.line(L('cut', x, y + 26, x + w, y + 26, ink, 1)); return 36; };
    const sw = (x, y, c) => { P.field(x, y + 2, 12, 12, c); P.line(`<rect x="${r2(x + 0.5)}" y="${r2(y + 2.5)}" width="11" height="11" fill="none" stroke="${ink}" stroke-width="1"/>`); };
    const val = (x, y, w, s) => P.text(x, y, w, 16, 'm', esc(s), `color:${ink}`);
    // colour, light then dark, in two columns
    const avail = inn.bot - inn.top - 36, pitch = Math.max(17, Math.min(20, Math.floor((avail - 3 * 36 - 8 * 20) / half)));
    const colCol = (x, list, y) => {
      y += head(x, y, 296, 'Colour, light and dark');
      for (const k of list) { val(x, y, 168, `--${k}`); sw(x + 172, y, Lm[k]); val(x + 190, y, 56, Lm[k]); sw(x + 248, y, Dm[k]); val(x + 266, y, 56, Dm[k]); y += pitch; }
      return y;
    };
    const top = inn.top;
    let ya = colCol(80, keys.slice(0, half), top), yb = colCol(408, keys.slice(half), top);
    // palette under the first column, fonts and widths under the second
    ya += 20; ya += head(80, ya, 296, 'Palette');
    for (const c of ctx.colours) { val(80, ya, 168, `--palette-${c.id}`); sw(80 + 172, ya, c.hex); val(80 + 190, ya, 80, c.hex); ya += pitch; }
    yb += 20; yb += head(408, yb, 296, 'Fonts and line widths');
    const fam = (v) => v.split(',')[0].replace(/"/g, '');
    for (const [k, v] of [...Object.entries(g.font).map(([k, v]) => [k, fam(v)]), ...Object.entries(g.width), ['shadow-float', g.shadow['shadow-float']]]) { val(408, yb, 140, `--${k}`); val(408 + 148, yb, 148, v); yb += pitch; }
    // space, radius and type down the third column
    let yc = top;
    const pair = (k, v) => { val(736, yc, 136, `--${k}`); val(736 + 140, yc, 124, v); yc += pitch; };
    yc += head(736, yc, 264, 'Space'); for (const [k, v] of Object.entries(g.space)) pair(k, v);
    yc += 20; yc += head(736, yc, 264, 'Radius'); for (const [k, v] of Object.entries(g.radius)) pair(k, v);
    yc += 20; yc += head(736, yc, 264, 'Type, size / line / weight'); for (const tt of ctx.uiType) pair(`fs-${tt.token}`, `${tt.size} / ${tt.line} / ${tt.weight}`);
    P.boxes.push({ x: 80, y: top, w: 920, h: Math.max(ya, yb, yc) - top });
    return P.html(hex);
  },

  // the code: three die-cut windows in the back panel, each a real file from the package; the package's contents down the board beside it
  code(ctx) {
    const P = new KitPage(ctx, 'code'), { R } = P, S = copy(ctx), gi = R.groundText, inn = P.inn, hex = R.back.hex, ink = inkOn(P, hex);
    const g = panel(P, 'back', hex);
    const ww = g.x1 - 80, cw = ww - 48, fits = (l) => measure(ctx, 'val', 400, l.replace(/⟦|⟧/g, ''), 13) <= cw;
    const html = ['<link rel="stylesheet" href="fonts.css">', '<link rel="stylesheet" href="tokens.css">', '<link rel="stylesheet" href="components.css">', '', '<body class="ui">', `  <button class="ui-btn" type="button">${S.form.book}</button>`, '</body>'];
    const css = tokensCss(ctx).split('\n'), from = css.indexOf(':root {');
    const tw = tailwindCss(ctx).split('\n'), tfrom = tw.indexOf('@theme inline {');
    const block = (lines) => `<pre class="u3-code"><code>${lines.map(esc).join('\n')}</code></pre>`;
    const lineH = 20, wpad = 20, label = 28, gap = 24;
    const used = 3 * label + 2 * gap + (html.length + 4) * lineH + 6 * wpad;
    const n = Math.max(4, Math.floor((inn.bot - inn.top - used) / lineH));
    const cssLines = css.slice(from, from + n).filter(fits), twLines = tw.slice(tfrom, tfrom + 4).filter(fits);
    const files = [['index.html, the three links and a button', html], [`tokens.css, lines ${from + 1} to ${from + cssLines.length} of ${css.length - 1}`, cssLines], [`tailwind.css, lines ${tfrom + 1} to ${tfrom + twLines.length}`, twLines]];
    let y = inn.top;
    for (const [name, lines] of files) {
      P.text(40, y, ww, 20, 'cap', mixed(name), `color:${ink}`);
      y += label;
      const h = lines.length * lineH + 2 * wpad;
      win(P, 40, y, ww, h, block(lines), { on: hex, pad: wpad, dark: true });
      y += h + gap;
    }
    // the package, file by file, on the board right of the fold
    const rx = g.x1 + (g.fin ? 14 : 0) + 40, rw = 1040 - rx;
    const fams = [...new Set(ctx.faces.map((f) => f.family))].join(', ');
    const list = [['README.md', 'Install, use and token names.'], ['tokens.css', 'Light on :root, dark on data-theme.'], ['tokens.json', 'The same, as W3C design tokens.'], ['tokens.ts', 'A typed export of the same.'], ['tailwind.css', 'A Tailwind v4 @theme block.'], ['components.css', 'Every component, on the tokens only.'], ['example.html', 'Every component live, light and dark.'], ['fonts.css', `@font-face for ${fams}.`], ['assets/', `The logo, ${iconSet(ctx).length} icons and the font files.`]];
    let fy = inn.top;
    fy += cap(P, rx, fy, rw, 'In the package', gi.ink, { weight: 500 }) + 12;
    for (const [f, d] of list) {
      P.text(rx, fy, rw, 16, 'm', esc(f), `color:${gi.ink}`);
      fy += 18 + cap(P, rx, fy + 18, rw, d, gi.quiet) + 14;
    }
    return P.html(hex);
  },
};

const uiT = (ctx, tok) => ctx.uiType.find((t) => t.token === tok) || { size: 32, line: 36, weight: ctx.weights.heading };

// three computed notes for a screen page
function screenNotes(ctx, M, mode) {
  const other = mode === 'dark' ? 'light' : 'dark';
  return [
    mode === 'dark' ? `The light screen's markup with data-theme="dark" on its root. Nothing else changes.` : `The whole screen at 1:1, built only from the kit's components on the light tokens.`,
    `--surface ${M.surface} and --text ${M.text} read ${ratio(ctx, M.text, M.surface)}. Secondary words take --text-soft at ${ratio(ctx, M['text-soft'], M.surface)}.`,
    `--action ${M.action} fills the one main button; its label reads ${ratio(ctx, M['action-label'], M.action)} on it.`,
  ];
}

// ---- css: this lane's parts only (u1 carries the kit tokens and componentsCss), all under .pg with the u3- prefix ----
export function css(ctx) {
  return `
.pg .u3-scr{display:flex;flex-direction:column;height:100%;background:var(--surface);color:var(--text)}
.pg .u3-scr>.ui-topbar{flex:none}
.pg .u3-logo{display:block;flex:none;position:relative}
.pg .u3-logo>*{position:absolute;left:0;top:0}
.pg .u3-clock{font-size:var(--fs-label);color:var(--text-soft)}
.pg .u3-main{flex:1;display:grid;grid-template-columns:1fr 1fr;min-height:0}
.pg .u3-track{display:flex;flex-direction:column;gap:16px;padding:24px;border-right:var(--w-hairline) solid var(--divider)}
.pg .u3-side{display:flex;flex-direction:column;gap:16px;padding:24px;background:var(--raised)}
.pg .u3-side .ui-list{border-top:0}
.pg .u3-go{margin-top:auto;display:flex;justify-content:flex-end}
.pg .u3-k{font:${ctx.weights.medium} var(--fs-label)/var(--lh-label) var(--ff-body);color:var(--text-soft)}
.pg .u3-eta{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.pg .u3-big{font-size:var(--fs-headline);line-height:var(--lh-headline);letter-spacing:-.01em}
.pg .u3-soft{color:var(--text-soft);max-width:36ch}
.pg .u3-route{display:flex;justify-content:space-between;margin-top:8px;font-size:var(--fs-caption);line-height:var(--lh-caption);color:var(--quiet)}
.pg .u3-person{display:flex;align-items:center;gap:12px}
.pg .u3-pm{flex:1;min-width:0}
.pg .u3-pn{font-weight:${ctx.weights.medium}}
.pg .u3-ps{font-size:var(--fs-label);color:var(--quiet)}
.pg .u3-dl{display:grid;grid-template-columns:1fr auto;gap:16px;margin:0;padding:12px 0;border-top:var(--w-hairline) solid var(--divider);border-bottom:var(--w-hairline) solid var(--divider)}
.pg .u3-dl dt{font-size:var(--fs-label);color:var(--quiet)}
.pg .u3-dl dd{margin:0;font-weight:${ctx.weights.medium}}
.pg .u3-tb{height:100%}
.pg .u3-scr .ui-avatar .u1-ph,.pg .u3-ph .ui-avatar .u1-ph{font-size:9px;padding:0 2px}
.pg .u3-fill{height:100%;width:100%}
.pg .u3-dr{display:flex;flex-direction:column;gap:16px;height:100%}
.pg .u3-em{height:100%}
.pg .u3-ph{display:flex;flex-direction:column;height:100%;background:var(--surface);color:var(--text)}
.pg .u3-ph-top{flex:none;display:flex;align-items:center;justify-content:space-between;height:48px;padding:0 20px;font-size:var(--fs-label);color:var(--text-soft);border-bottom:var(--w-hairline) solid var(--divider)}
.pg .u3-ph-body{flex:1;min-height:0;display:flex;flex-direction:column;align-items:flex-start;gap:14px;padding:20px}
.pg .u3-ph-body>*:not(.ui-chip){align-self:stretch}
.pg .u3-ph>.ui-tabbar{flex:none}
.pg .u3-states{list-style:none;margin:0;padding:0;border-top:var(--w-hairline) solid var(--divider)}
.pg .u3-states li{display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:6px;height:72px;border-bottom:var(--w-hairline) solid var(--divider)}
.pg .u3-when{font-size:var(--fs-title);line-height:var(--lh-title);letter-spacing:-.01em}
.pg .u3-code{margin:0;font:400 13px/20px var(--val);color:var(--text);white-space:pre}
.pg .u3-code code{font:inherit}
.pg .u3-code .u1-ph{font-size:12px}
`;
}
