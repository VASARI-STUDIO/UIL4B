// UI kit document pages for theme 04 (25 ids, engine/pages.js UIKIT_PAGES), as the interface half of the standards manual: the same running head,
// the same 250 px column of numbered clauses, the work to its right. Components are the real engine components (ctx.ui) inside a .ui region,
// states forced with the .is-* classes. Departure rows and status words follow the T04 kit boards. Styles are in css-kit.js.
import { A, ratioText, nameOf, fit, clauses, crop, VIEWS } from './helpers.js';
import { colourMap, tokenGroups, statusText } from '../../engine/tokens.js';
import { ramp } from '../../engine/color.js';

const m = (s) => `<span class="mono">${A(s)}</span>`;
const rt = (ctx, a, b) => ratioText(ctx.fmt(ctx.ratio(a, b)));
const sc = (ctx) => ctx.brand.ui.screen.content;
const byRole = (ctx, r) => ctx.colours.find((c) => c.role === r);
const base = (ctx) => ctx.brand.ui.spacingBase;
const uniq = (html, tag) => html.replace(/dlg-t/g, tag);
const na = (t = 'Not used') => `<span class="kna">${A(t)}</span>`;
const cell = (inner, cap, sub) => `<div class="kcell">${inner}${cap ? `<span class="kcap"><b>${A(cap)}</b>${sub || ''}</span>` : ''}</div>`;
// a clause head: the number is filled in by kstd (continuing after the page's own clauses), the ruler is the manual's x scale, a tick every x and a long one every 4x
const kru = () => `<svg class="kru" width="100%" height="6" aria-hidden="true"><rect width="100%" height="6" fill="url(#kr-@)"/></svg>`;
const grp = (title, inner, cls = '') => `<div class="kg ${cls}">${kru()}<h3><i class="kn"></i>${A(title)}</h3>${inner}</div>`;
const mixHex = (a, b, t) => { const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); const u = p(a), w = p(b); return '#' + u.map((v, i) => Math.round(v + (w[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
// x: the kit's one unit, 4 px on screen. Sizes are printed in x as well as px.
const fx = (px, b = 4) => `${+(px / b).toFixed(2)}x`;
// a dimension drawn on a component at actual size: v is a height drawn down its left edge, h a length drawn over its left edge with a guide down from its end
const dmk = (ctx, inner, { v, h } = {}) => {
  const b = base(ctx), vs = [].concat(v || []);
  let top = 0;
  const vm = vs.map((n) => { const t = top; top += n; return `<span class="kv" style="top:${t}px;height:${n}px"><b>${fx(n, b)}</b><small>${n} px</small></span>`; }).join('');
  const hm = h ? `<span class="kh" style="width:${h}px"><b>${fx(h, b)}, ${h} px</b></span>` : '';
  return `<div class="kdm${vs.length ? ' kdm--v' : ''}${h ? ' kdm--h' : ''}">${vm}<div class="kdm-i">${hm}${inner}${h ? `<i class="kg-l" style="left:${h}px"></i>` : ''}</div></div>`;
};

// the kit page: running head, title column, work area (a .ui region, so the chrome reads the same tokens as the components)
function kstd(ctx, id, { lead, rules = [], work, cls = '', dark = false }) {
  const p = ctx.pages.find((x) => x.id === id), sec = p.section ? `${p.section.n} ${p.section.title}` : p.title;
  let n = rules.length; work = work.replace(/<i class="kn"><\/i>/g, () => `<i class="kn num">${p.ref}.${++n}</i>`).replace(/#kr-@/g, `#kr-${id}`);
  return `<section class="pg pg--std pg--kit ${cls}" data-page="${id}"><svg class="kru-d" width="0" height="0" aria-hidden="true"><defs><pattern id="kr-${id}" width="16" height="6" patternUnits="userSpaceOnUse"><path d="M0.5 0V6M4.5 0V3M8.5 0V3M12.5 0V3" stroke="currentColor" fill="none"/></pattern></defs></svg><div class="hd"><span>${A(ctx.brand.name)} interface standards</span><span>${A(sec)}</span><span class="fo num">${ctx.pageNo(id)}</span></div>
<div class="side"><h2>${A(p.title)}</h2><p class="lead">${lead}</p>${rules.length ? clauses(p.ref, rules) : ''}</div><div class="work ui ${dark ? 'is-dark' : ''}" ${dark ? 'data-theme="dark"' : ''}>${work}</div></section>`;
}

// ---- colour roles, one list for light and dark
function roleRows(ctx, mode) {
  const M = colourMap(ctx, mode), R = (a, b) => rt(ctx, M[a], M[b]);
  const g = (label, tok) => [label, tok, M[tok], M.text, '', R('text', tok), 'Text on it'];
  const t = (label, tok, bgTok, note) => [label, tok, M[bgTok], M[tok], '', R(tok, bgTok), note];
  const st = (label, tok) => [label, tok, M.surface, M[tok], `box-shadow:inset 0 0 0 1px ${M.divider}`, R(tok, 'surface'), 'Words on surface'];
  return [
    g('Surface', 'surface'), g('Raised', 'raised'), g('Sunken', 'sunken'),
    t('Text', 'text', 'surface', 'On surface'), t('Soft text', 'text-soft', 'surface', 'On surface'), t('Quiet text', 'quiet', 'surface', 'On surface'), t('Quiet on sunken', 'quiet-sunken', 'sunken', 'On sunken'),
    ['Control edge', 'edge', M.surface, M.text, `box-shadow:inset 0 0 0 var(--w-control) ${M.edge}`, R('edge', 'surface'), 'On surface'],
    ['Divider', 'divider', M.surface, M.text, `box-shadow:inset 0 -1px 0 ${M.divider}`, R('divider', 'surface'), 'Decoration'],
    ['Focus ring', 'focus', M.surface, M.text, `box-shadow:inset 0 0 0 2px ${M.focus}`, R('focus', 'surface'), 'On surface'],
    ['Action', 'action', M.action, M['action-label'], '', R('action', 'surface'), 'Fill on surface'],
    ['Action hover', 'action-hover', M['action-hover'], M['action-label'], '', R('action-label', 'action-hover'), 'Label on it'],
    ['Action pressed', 'action-pressed', M['action-pressed'], M['action-label'], '', R('action-label', 'action-pressed'), 'Label on it'],
    ['Action label', 'action-label', M.action, M['action-label'], '', R('action-label', 'action'), 'On action'],
    ['Disabled text', 'disabled-text', M['disabled-bg'], M['disabled-text'], '', R('disabled-text', 'disabled-bg'), 'On --disabled-bg'],
    ['Scrim', 'scrim', M.scrim, M.scrim, '', null, 'Behind dialogs'],
    st('Success', 'success'), st('Warning', 'warning'), st('Danger', 'danger'), st('Info', 'info'),
  ].map(([label, tok, bg, fg, ring, ratio, note]) => ({ label, tok, val: M[tok], bg, fg, ring, ratio, note, scrimInk: mode === 'dark' ? M.text : M.surface }));
}

// the chip sheet: a square chip per role, set in its own pair, its tint table under it (the role's value in ten steps, 50 to 900, light to dark) and its spec block under that
const isHex = (v) => /^#[0-9a-f]{6}$/i.test(v);
function chip(ctx, r, no) {
  const steps = isHex(r.val) ? Object.values(ramp(r.val)).map((c) => `<i style="background:${c}"></i>`).join('') : '';
  const scrim = r.tok === 'scrim', fg = scrim ? r.scrimInk : r.fg;
  return `<div class="kq"><div class="kq-f" style="background:${r.bg};color:${fg};${r.ring}"><span class="kq-n num">${no}</span>${scrim ? '' : '<span class="kq-a">Aa</span><span class="kq-s">3x, 12 px</span>'}</div>
<div class="kq-t" role="img" aria-label="Tint table of ${A(r.label)}, ten steps from light to dark">${steps}</div>
<div class="kq-d"><b>${A(r.label)}</b>${m('--' + r.tok)}${m(r.val)}<span class="kq-r"><b>${r.ratio || 'Overlay'}</b> ${A(r.note)}</span></div></div>`;
}

function colourPage(ctx, id, mode) {
  const dark = mode === 'dark', act = byRole(ctx, 'action'), hl = byRole(ctx, 'highlight'), txt = byRole(ctx, 'text'), gnd = byRole(ctx, 'ground');
  const rules = dark
    ? ['The roles and their names stay. Only the values change, so nothing in the markup does.', `${hl.name} is the action in dark. The label stays ${txt.name}, so a button reads the same in both.`, 'The page follows the system setting on first load. The switch in the code package overrides it.', `The ${m('-bg')} tints (${m('--success-bg')} and the rest) are for highlights and charts, never under text.`]
    : [`Components read ${m('--action')}, never a colour name, so dark changes the values and not the markup.`, `The ${m('-bg')} tints (${m('--success-bg')} and the rest) are for highlights and charts, never under text.`, 'Every text pair is measured. Text under 24 px needs 4.5 : 1. Edges, the focus ring and fills against their ground need 3 : 1.', `${act.name} is the one action on a screen. ${hl.name} is fill only, never type.`];
  const rows = roleRows(ctx, mode), p = ctx.pages.find((x) => x.id === id);
  return kstd(ctx, id, { lead: `${dark ? `The same roles on ${txt.name}.` : `Roles name a job, not a colour. ${gnd.name} is the ground.`} Each chip is set in its pair at the smallest size, 3x. The strip under it is its tint table, ten steps from light to dark.`, rules, dark, cls: 'pg--kroles',
    work: families(ctx, rows, (i) => `${p.ref}.${rules.length + i + 1}`) });
}
// the roles in four families of unequal size: the grounds, the text and lines, the action, the states. Numbering follows the role order.
const FAM = [['Ground', ['surface', 'raised', 'sunken', 'scrim'], 'kf--g'], ['Action', ['action', 'action-hover', 'action-pressed', 'action-label'], 'kf--a'], ['Text and lines', ['text', 'text-soft', 'quiet', 'quiet-sunken', 'edge', 'divider', 'focus', 'disabled-text'], 'kf--t'], ['State', ['success', 'warning', 'danger', 'info'], 'kf--s']];
function families(ctx, rows, no) {
  const at = (tok) => rows.findIndex((r) => r.tok === tok);
  return `<div class="kfams">${FAM.map(([t, toks, cls]) => `<div class="kf ${cls}"><h3 class="kf-h">${A(t)}</h3><div class="kqs">${toks.map((k) => at(k)).filter((i) => i >= 0).map((i) => chip(ctx, rows[i], no(i))).join('')}</div></div>`).join('')}</div>`;
}

// ---- departure row and chips, as drawn on the T04 kit boards
const split = (when) => { const i = when.indexOf(', '); return i < 0 ? [when, ''] : [when.slice(0, i), when.slice(i + 2)]; };
function depRow(ctx, d, { gone } = {}) {
  const [t, rest] = split(d.when), strike = d.status === 'cancelled' ? ' is-struck' : '';
  const chip = gone ? `<span class="ui-chip kchip--gone">Departed</span>` : ctx.ui.statusChip(d.status);
  // a late sailing: "08:00, now 08:05" draws as the scheduled time struck through, then the new time in the warning colour
  const now = d.status === 'late' && /^now /.test(rest) ? rest.slice(4) : '';
  const tt = now ? `<span class="kdep-late"><s>${A(t)}</s><b>${A(now)}</b></span>` : A(t);
  return `<div class="kdep${gone ? ' is-gone' : ''}"><span class="kdep-t num${strike}">${tt}</span><span class="kdep-m"><b>${A(d.to)}</b><span>${A(now ? `Scheduled ${t}` : rest)}</span></span>${chip}</div>`;
}
const wm = (ctx, w, dark) => (ctx.edition === 'slot' ? `<strong class="ui-display">${A(ctx.brand.name)}</strong>` : ctx.logo.html('colour', { width: fit(ctx, 'colour', w, 28), colourway: dark ? 'reversed' : undefined }));

// ---- screens
const navItems = (ctx) => [...sc(ctx).example.links, [sc(ctx).example.account, 'user']];
const progress = (S) => `<div class="ui-progress" role="progressbar" aria-label="Crossing progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(S.progress * 100)}"><div class="ui-progress__bar"><i style="width:${S.progress * 100}%"></i></div><span class="ui-progress__dot" style="left:${S.progress * 100}%"></span></div><div class="ks-route"><span>${A(S.from)}</span><span>${A(S.to)}</span></div>`;
const riderRow = (ctx, S) => `<div class="ks-rider"><span class="ui-avatar">${A(S.initials)}</span><div class="ks-rmain"><p class="ks-rname">${A(S.rider)}</p><p class="ks-rsub">${A(S.riderNote)}</p></div>${ctx.ui.btn(S.call, { variant: 'secondary', size: 'sm', iconLeft: 'phone' })}</div>`;
const nextFerry = (ctx, S) => `<p class="ks-q">${A(sc(ctx).example.tabs[0])} ferry</p><div class="ks-next"><span class="ks-time num">${A(split(S.deliveries[0].when)[0])}</span>${ctx.ui.statusChip('boarding')}</div><p class="ks-pickup">${A(S.pickup)}</p>`;

function screenPage(ctx, id, dark) {
  const p = ctx.pages.find((x) => x.id === id), S = sc(ctx), ui = ctx.ui, F = S.form, sec = `${p.section.n} ${p.section.title}`;
  const seg = `<span class="ks-q">${A(F.pickup)}</span>${ui.segmented([F.pickupValue, F.dropoffValue], 0)}`;
  const later = S.deliveries.slice(1, 4).map((d) => depRow(ctx, d)).join('');
  const frame = `<div class="ui kscreen" ${dark ? 'data-theme="dark"' : ''}>
<nav class="ui-topbar" aria-label="Main">${wm(ctx, 150, dark)}<div class="ui-topbar__links">${ui.links(S.example.links, 0)}</div><span class="ks-clock num">${A(S.time)}</span></nav>
<div class="ks-main"><section class="ks-track" aria-label="${A(ctx.brand.ui.screen.title)}"><div class="ks-seg">${seg}</div>${nextFerry(ctx, S)}<div class="ks-prog">${progress(S)}</div>${riderRow(ctx, S)}</section>
<section class="ks-later" aria-label="Later departures"><p class="ks-q">Later</p>${dmk(ctx, `<div class="kdeps">${later}</div>`, { v: [72, 72, 72] })}<div class="ks-buy">${dmk(ctx, ui.btn(F.book, { iconRight: 'arrow-right' }), { v: 44 })}</div></section></div></div>`;
  return `<section class="pg pg--std pg--kit pg--kscreen" data-page="${id}"><div class="hd"><span>${A(ctx.brand.name)} interface standards</span><span>${A(sec)}</span><span class="fo num">${ctx.pageNo(id)}</span></div>
<div class="ks-band"><h2>${A(p.title)}</h2><p class="lead">${dark ? 'The same screen on Hull. The roles swap values, the layout does not move. Every height is the same as in light.' : `${A(ctx.brand.ui.screen.title)}: the next ferry, the ones after it, and one action. The top bar is 56 px, 14x. A row is 72 px, 18x. The button is 44 px, 11x.`}</p></div><div class="ks-wrap">${dmk(ctx, frame, { v: 56 })}</div></section>`;
}

const kvb = (ctx, bottom, h) => `<span class="kv" style="top:auto;bottom:${bottom}px;height:${h}px"><b>${fx(h, base(ctx))}</b><small>${h} px</small></span>`;
// the phone at 390, board first: top bar 48 px, the wharf 40 px, four departure rows of 72 px, then the one action above the tab bar.
// PH holds those heights so the dimension marks and the clause keys on the drawing are placed from the same numbers the CSS uses.
const PH = { top: 48, head: 40, row: 72, rows: 4, btnBottom: 85, btn: 44, tab: 64 };
function phoneScreen(ctx) {
  const S = sc(ctx), ui = ctx.ui, F = S.form;
  const board = S.deliveries.slice(0, PH.rows).map((d) => depRow(ctx, d)).join('');
  return `<div class="ui kphone"><div class="kph-top"><span class="num">${A(S.time)}</span>${wm(ctx, 110)}</div>
<div class="kph-body"><p class="kph-head">${A(F.pickup)} ${A(F.pickupValue)}</p><section class="kdeps kph-board" aria-label="Departures">${board}</section><p class="kph-note">${A(S.pickup)}</p><div class="ks-buy">${ui.btn(F.book, { block: true })}</div></div>
<nav class="ui-tabbar" aria-label="Sections">${navItems(ctx).map(([t, i], k) => `<a href="#"${k === 0 ? ' aria-current="page"' : ''}>${ui.icon(i, 20)}${A(t)}</a>`).join('')}</nav></div>`;
}
// a late or cancelled time drawn the same way on the board and in the headline list
const whenHtml = (d) => { const [t, rest] = split(d.when), now = d.status === 'late' && /^now /.test(rest) ? rest.slice(4) : '';
  return now ? `<span class="kdep-late"><s>${A(t)}</s><b>${A(now)}</b></span>` : d.status === 'cancelled' && rest ? `<s>${A(t)}</s> ${A(rest)}` : A(d.when); };

// ---- status words: light and dark pairs, measured. The ratio is the words on the page ground
const chipPairs = (ctx, mode) => { const M = colourMap(ctx, mode); const o = Object.fromEntries(ctx.status.map((s) => [s.id, [statusText(ctx, mode, s).hex, M.surface]])); o.departed = [M.quiet, M.surface]; return o; };

export const uikit = {
  // the construction sheet: the logo on a drawn grid of x (one cell per x, a heavier line every 4x), its clear space dimensioned in x
  cover(ctx) {
    const B = ctx.brand, S = sc(ctx), rev = B.logo.colourways.reversed, slot = ctx.edition === 'slot', d = S.deliveries[0], L = ctx.logo, g = L.geos.reversed, mn = L.minSize;
    const sections = ctx.sections.map((s) => `<li><span>${s.n}</span>${A(s.title)}</li>`).join('');
    const xs = 8, ux = L.geo.x || L.geo.cap / 10, s = xs / ux, lw = g.w * s, lh = g.h * s, X = L.geo.unit * s, zw = lw + 2 * X, zh = lh + 2 * X;
    const SW = 700, SH = 252, ox = 64, oy = 46, minor = mixHex(rev.ground, rev.name, 0.1), major = mixHex(rev.ground, rev.name, 0.26);
    const mk = (n) => `${+(n / xs).toFixed(1)}x`, f1 = (n) => +(n).toFixed(1);
    const hm = (x1, x2, y, t) => `<path d="M${f1(x1)} ${y - 4}v8M${f1(x2)} ${y - 4}v8M${f1(x1)} ${y}H${f1(x2)}"/><text x="${f1((x1 + x2) / 2)}" y="${y - 8}" text-anchor="middle">${t}</text>`;
    const vm = (y1, y2, x, t, anchor = 'end') => `<path d="M${x - 4} ${f1(y1)}h8M${x - 4} ${f1(y2)}h8M${x} ${f1(y1)}V${f1(y2)}"/><text x="${anchor === 'end' ? x - 8 : x + 8}" y="${f1((y1 + y2) / 2 + 4)}" text-anchor="${anchor}">${t}</text>`;
    const grid = (id, k, c) => `<pattern id="${id}" x="${ox}" y="${oy}" width="${xs * k}" height="${xs * k}" patternUnits="userSpaceOnUse"><path d="M${xs * k - 0.5} 0V${xs * k}M0 ${xs * k - 0.5}H${xs * k}" fill="none" stroke="${c}" stroke-width="1"/></pattern>`;
    const marks = hm(ox, ox + X, oy - 18, mk(X)) + hm(ox + X, ox + X + lw, oy - 18, mk(lw)) + hm(ox + X + lw, ox + zw, oy - 18, mk(X)) + hm(ox, ox + zw, oy + zh + 20, mk(zw))
      + vm(oy, oy + X, ox - 18, mk(X)) + vm(oy + X, oy + X + lh, ox - 18, mk(lh)) + vm(oy + X + lh, oy + zh, ox - 18, mk(X)) + vm(oy, oy + zh, ox + zw + 18, mk(zh), 'start');
    const sheet = `<div class="kc-sheet" style="width:${SW}px;height:${SH}px"><svg class="kc-svg" width="${SW}" height="${SH}" viewBox="0 0 ${SW} ${SH}" aria-hidden="true"><defs>${grid('kc-g1', 1, minor)}${grid('kc-g4', 4, major)}</defs><rect width="${SW}" height="${SH}" fill="url(#kc-g1)"/><rect width="${SW}" height="${SH}" fill="url(#kc-g4)"/>
<rect x="${ox}" y="${oy}" width="${f1(zw)}" height="${f1(zh)}" class="kc-zone"/><rect x="${f1(ox + X)}" y="${f1(oy + X)}" width="${f1(lw)}" height="${f1(lh)}" class="kc-prot"/><g class="kc-dim">${marks}</g></svg><div class="kc-logo" style="left:${f1(ox + X)}px;top:${f1(oy + X)}px;width:${f1(lw)}px">${slot ? L.html('reversed', { width: Math.floor(lw), color: rev.name, label: 'Your logo goes here' }) : L.html('reversed', { width: Math.floor(lw) })}</div></div>`;
    const unit = slot ? `x is ${L.clearShare}% of the logo's height.` : `x is the stroke of the wake, ${L.clearShare}% of the logo's height.`;
    const spec = `<ol class="kc-spec"><li><span>1</span><p>Keep a clear zone round the logo, ${+(L.geo.unit / ux).toFixed(1)}x on every side. ${A(unit)}</p></li><li><span>2</span><p>Measure from the edge of the logo, on all four sides.</p></li><li><span>3</span><p>On screen, ${mn.screenPx} px wide. The wake is ${f1(ux * mn.screenPx / g.w)} px thick.</p></li></ol>`;
    return `<section class="pg pg--kcover" data-page="cover"><div class="cv-top"><div><h1>Interface standards manual</h1><p>${A(B.name)}, river ferry, ${A(B.city)}. ${A(B.product)}<br>${A(ctx.versionLine)}.</p></div><ul class="sec">${sections}</ul></div>
<div class="kc-row">${sheet}${spec}</div>
<div class="kc-band"><span class="disp num">${A(split(d.when)[0])}</span><span class="disp kc-to">${A(d.to)}</span><span class="kc-chip">${A(ctx.status.find((x) => x.id === d.status).label)}</span></div>
<div class="cv-bot"><p>On screen, x is fixed at ${base(ctx)} px.<br>Every space and height is a whole number of x.</p></div></section>`;
  },

  contents(ctx) {
    const sec = (s) => `<div class="kt-s">${kru()}<div class="kt-h"><span class="n num">${s.n}</span><span class="t">${A(s.title)}</span><span class="p num">${s.pages[0].no}</span></div><ul>${s.pages.map((p) => `<li><span class="r num">${p.ref}</span><span class="t">${A(p.title)}</span><span class="d" aria-hidden="true"></span><span class="num">${p.no}</span></li>`).join('')}</ul></div>`;
    const [a, b, c, d] = ctx.sections;
    return kstd(ctx, 'contents', { lead: `Four sections. Every size in this manual is a whole number of x, and x is ${base(ctx)} px on screen.`, work: `<div class="kt"><div class="kt-c">${sec(a)}${sec(c)}${sec(d)}</div><div class="kt-c">${sec(b)}</div></div>` });
  },

  'colour-light': (ctx) => colourPage(ctx, 'colour-light', 'light'),
  'colour-dark': (ctx) => colourPage(ctx, 'colour-dark', 'dark'),

  // each style is a clause: the sample on its own baseline, x-height and cap-height guides, the two heights dimensioned beside it, sizes in px and in x
  'type-scale'(ctx) {
    const S = sc(ctx), F = S.form, B = ctx.brand, b = base(ctx), p = ctx.pages.find((x) => x.id === 'type-scale');
    const sample = { caption: F.notesHelp, label: F.pickup, body: S.pickup, control: F.book, time: S.time, 'title-s': S.dialog.title, title: S.rider, headline: S.eta };
    const rules = ['Sizes are in px and in x, then line height, then weight.', 'Every time and fare uses tabular figures, so a column never shifts.', 'Nothing on screen is smaller than 12 px, which is 3x.'];
    const met = (t) => {
      const fam = B.fonts[t.face].family, fc = ctx.faces.find((f) => f.family === fam && f.weight === t.weight) || ctx.faces.find((f) => f.family === fam);
      const font = fc && ctx.loadFont(fc.stem), o = font && font.tables.os2;
      return o ? { cap: o.sCapHeight / font.unitsPerEm, xh: o.sxHeight / font.unitsPerEm } : { cap: 0.7, xh: 0.5 };
    };
    const f1 = (n) => +(n).toFixed(1);
    const rows = [...ctx.uiType].reverse().map((t, i) => {
      const face = t.face === 'display' ? 'font-family:var(--ff-display);letter-spacing:0;' : 'font-family:var(--ff-body);';
      const { cap, xh } = met(t), H = f1(t.size * 1.2), base0 = t.size, c = f1(cap * t.size), x = f1(xh * t.size);
      const W = 56, dim = (xx, h) => `<path d="M${xx - 4} ${f1(base0 - h)}h8M${xx - 4} ${base0}h8M${xx} ${f1(base0 - h)}V${base0}"/>`;
      const svg = `<svg class="kts-svg" width="100%" height="${H}" aria-hidden="true"><g class="kts-g"><path d="M${W} ${f1(base0 - c)}H2000" class="kts-d"/><path d="M${W} ${f1(base0 - x)}H2000" class="kts-d"/><path d="M${W} ${base0}H2000" class="kts-b"/></g><g class="kts-m">${dim(14, c)}${dim(38, x)}</g></svg>`;
      return `<div class="ktr2"><span class="ktn"><i class="num">${p.ref}.${rules.length + i + 1}</i><span class="mono">${A(t.token)}</span></span><div class="ktb"><div class="ktb-s" style="height:${H}px">${svg.replace('</svg>', `<text class="kts" x="64" y="${base0}" style="${face}font-size:${t.size}px;font-weight:${t.weight}">${A(sample[t.token] || t.use)}</text></svg>`)}</div><span class="kcap kcap--use">${A(t.use)}</span></div>
<span class="kto"><span class="mono">${t.size} / ${t.line} / ${t.weight}</span><span>${fx(t.size, b)} size, ${fx(t.line, b)} line</span><span>Cap height ${fx(cap * t.size, b)}, x-height ${fx(xh * t.size, b)}</span></span></div>`;
    }).join('');
    return kstd(ctx, 'type-scale', { lead: `${A(B.fonts.display.family)} for times and titles. ${A(B.fonts.body.family)} for everything people read.`, rules, work: `<div class="ktype2">${rows}</div>` });
  },

  spacing(ctx) {
    const b = base(ctx), uses = ['Inside a tight pair', 'Icon to label', 'Gaps in a row, field padding', 'Card padding', 'Button sides', 'Between groups', 'Empty state padding', 'Between sections'];
    const rows = ctx.space.map((s, i) => `<div class="ktr kts-sp"><span class="mono">--${s.token.replace('space-', 'sp-')}</span><span class="mono ktm">${s.px} px, ${s.px / b}x</span><span class="ksq"><span class="kh kh--s" style="width:${s.px}px"><b>${s.px / b}x</b></span><i style="width:${s.px}px;height:${s.px}px"></i></span><span class="kcap">${A(uses[i] || '')}</span></div>`).join('');
    return kstd(ctx, 'spacing', { lead: `One step, x, is ${b} px. Every space is a whole number of x.`,
      rules: ['A gap inside a group is smaller than the gap between groups, so grouping reads at a glance.', `Controls are 44 px tall, ${44 / b}x. Small buttons are 36 px, ${36 / b}x.`, `A departure row is 72 px, ${72 / b}x, with ${16 / b}x at each end.`], work: `<div class="ktype ksp">${rows}</div>` });
  },

  'radii-borders'(ctx) {
    const S = sc(ctx), ui = ctx.ui, [rc, rk, rr] = ctx.radii, [bh, bc, bf] = ctx.borders;
    const rad = [
      cell(dmk(ctx, ui.btn(S.form.book), { v: 44 }), `${rc.token}, ${rc.px} px, ${fx(rc.px)}`, rc.use),
      cell(dmk(ctx, `<div class="ksp-card">${ui.card({ meta: S.status, title: S.eta, text: S.pickup })}</div>`, { h: 16 }), `${rk.token}, ${rk.px} px, ${fx(rk.px)}`, `${rk.use}. Padding 16 px, 4x.`),
      cell(dmk(ctx, `<div class="krow2"><span class="ui-avatar">${A(S.initials)}</span>${ui.switch('Text me', { checked: true })}</div>`, { v: 40 }), `${rr.token}, round`, rr.use),
    ].join('');
    const bw = (w) => `<i class="kbw" style="height:${w}px"></i>`;
    const bor = [
      cell(dmk(ctx, `<div class="kdeps kdeps--one">${depRow(ctx, S.deliveries[0])}</div>`, { v: 72 }), `${bh.token}, ${bh.px} px, ${fx(bh.px)}`, `${bh.use}${bw(bh.px)}`),
      cell(ui.field({ id: 'rb1', label: S.form.pickup, value: S.form.pickupValue }), `${bc.token}, ${bc.px} px, ${fx(bc.px)}`, `${bc.use}${bw(bc.px)}`),
      cell(ui.field({ id: 'rb2', label: S.form.dropoff, value: S.form.dropoffValue, state: 'focus' }), `${bf.token}, ${bf.px} px, ${fx(bf.px)}`, `${bf.use}${bw(bf.px)}`),
    ].join('');
    return kstd(ctx, 'radii-borders', { lead: `Radius is ${rc.px} px on controls and ${rk.px} px on cards. Round is for avatars and switches.`,
      rules: [`Control edges are ${bc.px} px so they hold against the ground. Dividers stay at ${bh.px} px.`, 'The focus ring sits outside the edge, on a 2 px gap of the ground colour, so it shows on any fill.', 'Nothing else is round, and nothing is more than 2 px.'.replace('2 px', `${rk.px} px`)],
      work: `<div class="kstack">${grp('Radius', `<div class="k3">${rad}</div>`)}${grp('Border width', `<div class="k3 k3--w">${bor}</div>`)}</div>` });
  },

  elevation(ctx) {
    const S = sc(ctx), ui = ctx.ui, R = ctx.roles.light;
    const steps = [['Surface', 'surface', 'The page and every card on it'], ['Raised', 'raised', 'A second level: sidebars, table headers'], ['Sunken', 'sunken', 'Chips, avatars, skeletons']]
      .map(([n, t, u]) => `<div class="kstep">${dmk(ctx, `<span class="kstep-sw" style="background:var(--${t})"></span>`, { v: 44 })}<span class="kcap"><b>${A(n)}</b>${m('--' + t)}<br>${A(u)}</span></div>`).join('');
    const dlg = uniq(ui.dialog({ title: S.dialog.title, body: S.dialog.body, confirm: S.dialog.confirm, keep: S.dialog.keep, danger: true }), 'dlg-el');
    const g1 = grp('Ground steps', `<div class="kstepl">${steps}</div>`);
    const g2 = grp('Hairline', `<div class="kcell">${dmk(ctx, ui.card({ meta: S.status, title: S.eta, text: S.pickup }), { h: 16 })}<span class="kcap"><b>Card</b>${m('--divider')} at ${ctx.borders[0].px} px, ${fx(ctx.borders[0].px)}. Padding 4x. A raised card drops the line.</span></div>`);
    const g3 = grp('Floating', `<div class="kcell">${dmk(ctx, dlg, { h: 24 })}<span class="kcap"><b>Dialog</b>${ctx.borders[1].px} px edge, ${fx(ctx.borders[1].px)}, in ${m('--text')}. Padding 6x. No shadow.</span></div>`);
    return kstd(ctx, 'elevation', { lead: A(ctx.brand.ui.elevationNote),
      rules: [`${m('--shadow-float')} is ${m(String(tokenGroups(ctx).shadow['shadow-float']))}. There is no blur, no spread and no glow anywhere in the kit.`, 'Depth is three things only: a step in the ground, a hairline, or a control edge.', 'A floating piece takes a solid edge in the text colour.'],
      work: `<div class="kelev">${g1}${g2}${g3}</div>` });
  },

  states(ctx) {
    const S = sc(ctx), ui = ctx.ui, F = S.form, X = S.example;
    const cols = [['Rest', ''], ['Hover', `Action steps to ${m('--action-hover')}.`], ['Focus', `${ctx.borders[2].px} px ring in ${m('--focus')}.`], ['Pressed', `Scales to 0.97.`], ['Disabled', `${m('--disabled-bg')} fill.`]];
    const head = `<div class="kmx-h"></div>${cols.map(([n, r]) => `<div class="kmx-h"><b>${A(n)}</b><span class="kcap">${r}</span></div>`).join('')}`;
    const btn = (variant, label) => (st) => (st ? ui.btn(label, { variant, state: st, size: 'sm' }) : dmk(ctx, ui.btn(label, { variant, size: 'sm' }), { v: 36 }));
    const pv = F.pickupValue.split(' ')[0];
    const field = (st, id) => ui.field({ id, label: F.pickup, value: pv, state: st });
    const row = (name, cells) => `<div class="kmx-r">${name}</div>${cells.map((c) => `<div class="kmx-c">${c}</div>`).join('')}`;
    const rows = [
      row('Primary button', [undefined, 'hover', 'focus', 'pressed', 'disabled'].map(btn('primary', X.small))),
      row('Secondary button', [undefined, 'hover', 'focus', 'pressed', 'disabled'].map(btn('secondary', X.secondary))),
      row('Text field', [field(undefined, 'st-r'), na('No change'), field('focus', 'st-f'), na(), ui.field({ id: 'st-d', label: F.pickup, value: pv, disabled: true })]),
      row('Checkbox', [dmk(ctx, ui.check(X.checks[0]), { v: 44 }), na('No change'), ui.check(X.checks[0], { state: 'focus' }), na(), ui.check(X.checks[0], { disabled: true })]),
      row('Switch', [dmk(ctx, ui.switch('Text me', { checked: true }), { v: 44 }), na('No change'), ui.switch('Text me', { checked: true, state: 'focus' }), na(), ui.switch('Text me', { disabled: true })]),
    ].join('');
    const err = `<div class="kerr">${ui.field({ id: 'st-e', label: F.ready, value: F.readyValue, error: F.readyError })}<p class="kcap"><b>Error</b>${m('--danger')} edge and a message under the field. The message says what to enter.</p></div>`;
    return kstd(ctx, 'states', { lead: 'Every control has the same states. Hover is for pointers only.',
      rules: [`The focus ring is ${ctx.borders[2].px} px in ${m('--focus')}, outside the edge, on a ${ctx.borders[2].px} px gap.`, `A disabled control says why, beside it: ${A(F.bookWhy)}`, 'Touch screens get no hover state. Press is the only feedback there.'],
      work: `${grp('Every control, every state', `<div class="kmx">${head}${rows}</div>`)}${err}` });
  },

  buttons(ctx) {
    const S = sc(ctx), F = S.form, ui = ctx.ui, R = ctx.roles.light, X = S.example;
    const act = byRole(ctx, 'action'), lab = byRole(ctx, 'label'), ctl = ctx.uiType.find((t) => t.token === 'control');
    const padPx = ctx.space[4].px, H = 44, rad = ctx.radius.button, Z = 2;
    const draw = `<div class="kdraw">${dmk(ctx, ui.btn(F.book), { v: H, h: padPx })}<span class="kcap">Drawn at actual size. The label sits ${fx(padPx, base(ctx))} from each edge.</span></div>`;
    const spec = `<div class="kspec"><span>Height ${m(H)}, ${fx(H, base(ctx))}. Padding ${m(padPx)}, ${fx(padPx, base(ctx))}. Radius ${m(rad)}, ${fx(rad, base(ctx))}</span><span>${A(ctx.brand.fonts.body.family)} ${ctl.weight}, ${m(ctl.size)} px</span><span>${A(act.name)} ${m(act.hex)}, ${A(lab.name)} type ${rt(ctx, R.actionLabel, R.action)}</span><span>Width follows the label</span></div>`;
    const states = [
      [ui.btn(F.book), 'Default', `${A(act.name)} fill, ${A(lab.name)} type.`], [ui.btn(F.book, { state: 'hover' }), 'Hover', `${m(R.actionHover)}, ${A(lab.name)} type ${rt(ctx, R.actionLabel, R.actionHover)}.`],
      [ui.btn(F.book, { state: 'focus' }), 'Focus', '2 px ring on a 2 px gap.'], [ui.btn(F.book, { state: 'pressed' }), 'Pressed', `${m(R.actionPressed)}, scaled to 0.97.`],
      [ui.btn(F.book, { state: 'disabled' }), 'Disabled', `${m('--disabled-bg')} fill, quiet type.`],
    ].map(([b, n, d]) => `<div class="kst">${b}<b>${n}</b><p>${d}</p></div>`).join('');
    const variants = [
      cell(dmk(ctx, ui.btn(X.secondary, { variant: 'secondary' }), { v: 44 }), 'Secondary', `${ctx.borders[1].px} px edge in the text colour.`), cell(dmk(ctx, ui.btn(X.quiet, { variant: 'quiet' }), { v: 44 }), 'Quiet', 'Underlined, no fill.'), cell(dmk(ctx, ui.btn(X.danger, { variant: 'danger' }), { v: 44 }), 'Danger', 'Only for what cannot be undone.'),
      cell(dmk(ctx, ui.btn(X.small, { size: 'sm' }), { v: 36 }), 'Small, 36, 9x', 'Inside rows and cards.'), cell(dmk(ctx, ui.btn(F.book, { size: 'lg', iconRight: 'arrow-right' }), { v: 52 }), 'Large, 52, 13x', 'One per screen, at most.'),
    ].join('');
    return kstd(ctx, 'buttons', { lead: `The buttons, measured at ${base(ctx)} px to x.`,
      rules: [`One ${A(act.name)} button per screen. It buys a fare, and its label says so.`, `Labels are verbs: ${A(F.book)}, ${A(X.secondary)}, ${A(X.danger)}. Never Submit or OK.`, `A disabled button says why beside it: ${A(F.bookWhy)}`, `Hover steps to ${m('--action-hover')}. Pressed scales to 0.97.`],
      work: `<div class="kstack kstack--btn">${grp('Construction', `<div class="kbtn-top">${draw}${spec}</div>`)}<div class="k5">${states}</div><div class="k3 k3--v">${variants}</div></div>` });
  },

  inputs(ctx) {
    const S = sc(ctx), F = S.form, ui = ctx.ui;
    const sel = (id, o) => ui.field({ id, label: F.size, kind: 'select', options: F.sizes, value: F.sizes[1], ...o });
    const txt = (id, o) => ui.field({ id, label: F.pickup, value: F.pickupValue, ...o });
    const ta = (id, o) => ui.field({ id, label: F.notes, kind: 'textarea', value: 'A bike and a pram.', ...o });
    const rows = [
      ['Rest', txt('in-t1', { value: '', placeholder: 'Wharf name' }), sel('in-s1'), ui.field({ id: 'in-a1', label: F.notes, kind: 'textarea', help: F.notesHelp })],
      ['Focus', txt('in-t2', { state: 'focus', value: 'Queens' }), sel('in-s2', { state: 'focus' }), ta('in-a2', { state: 'focus' })],
      ['Filled', txt('in-t3'), sel('in-s3', { value: F.sizes[2] }), ta('in-a3')],
      ['Error', ui.field({ id: 'in-t4', label: F.ready, value: F.readyValue, error: F.readyError }), sel('in-s4', { error: 'Choose a fare type.' }), ta('in-a4', { error: 'Keep notes under 200 characters.' })],
      ['Disabled', txt('in-t5', { disabled: true }), sel('in-s5', { disabled: true }), ta('in-a5', { disabled: true })],
    ];
    const grid = `<div class="kin"><div class="kmx-h"></div>${['Text field', 'Select', 'Textarea'].map((h) => `<div class="kmx-h"><b>${h}</b></div>`).join('')}${rows.map(([n, a, b, c]) => `<div class="kmx-r">${n}</div><div>${a}</div><div>${b}</div><div>${c}</div>`).join('')}</div>`;
    const b4 = base(ctx), fake = (t, extra = '') => `<div class="ui-input kfake" aria-hidden="true">${A(t)}${extra}</div>`;
    const cons = grp('Construction', `<div class="kcons">${dmk(ctx, fake(F.pickupValue), { v: 44, h: 12 })}<p class="kcap"><b>Field</b>Height 44 px, ${fx(44, b4)}. Text starts 12 px, ${fx(12, b4)}, in. The edge is ${ctx.borders[1].px} px. The label is above it with a ${fx(6, b4)} gap. A select takes ${fx(40, b4)} on the right for its arrow.</p></div>`);
    return kstd(ctx, 'inputs', { lead: 'The label is always visible and sits above the field.',
      rules: ['A hint sits under the field and turns into the error when there is one.', `An error says what to enter, not what went wrong: ${A(F.readyError)}`, 'Placeholders are a hint only. They never stand in for the label.'], work: `<div class="kstack">${cons}${grid}</div>` });
  },

  choices(ctx) {
    const ui = ctx.ui, S = sc(ctx), X = S.example, F = S.form;
    const rowsDef = [['Off', {}], ['On', { checked: true }], ['Focus', { state: 'focus', checked: true }], ['Disabled', { disabled: true }], ['Disabled, on', { disabled: true, checked: true }]];
    const dm44 = (i, h) => (i === 0 ? dmk(ctx, h, { v: 44 }) : h);
    const grid = rowsDef.map(([n, o], i) => `<div class="kmx-r">${n}</div><div class="kmx-c">${dm44(i, ui.check(X.checks[0], { ...o, name: 'cb' + i }))}</div><div class="kmx-c">${dm44(i, ui.check(X.radios[0], { ...o, type: 'radio', name: 'rd' + i }))}</div><div class="kmx-c">${dm44(i, ui.switch(X.switches[0], o))}</div>`).join('');
    const seg = `<div class="kseg">${cell(dmk(ctx, ui.segmented(F.sizes, 1), { v: 40 }), 'Segmented, 40, 10x', 'One choice, always one selected. The selected segment fills with the text colour.')}${cell(ui.segmented(F.sizes, 0, { disabled: true }), 'Segmented, disabled', 'All segments grey together.')}</div>`;
    return kstd(ctx, 'choices', { lead: 'Checkbox, radio, switch and segmented control. The box is 22 px, 5.5x. The switch is 44 by 26 px, 11x by 6.5x.',
      rules: ['A checkbox is for a list of yes or no. A radio is for one of a few. A switch acts at once.', 'The whole label is the target, 44 px tall.', 'On is a fill in the text colour, so it reads without colour.'],
      work: `${grp('Checkbox, radio and switch', `<div class="kmx kmx--3"><div class="kmx-h"></div>${['Checkbox', 'Radio', 'Switch'].map((h) => `<div class="kmx-h"><b>${h}</b></div>`).join('')}${grid}</div>`)}${seg}` });
  },

  cards(ctx) {
    const S = sc(ctx), ui = ctx.ui;
    // no photograph is licensed yet: the media is the manual's own line drawing of the crossing, said to be one in the caption
    const media = `<div class="ui-card__media kmedia">${crop(ctx, VIEWS.crossing, { label: 'Illustration: the ferry on the crossing' })}</div>`;
    const cards = [
      cell(dmk(ctx, ui.card({ media, meta: S.status, title: S.eta, text: S.pickup }), { h: 16 }), 'With media', 'The media takes 16 : 9. Padding 16 px, 4x. The card keeps its hairline. No photographs ship yet, so this one is an illustration.'),
      cell(dmk(ctx, ui.card({ meta: S.status, title: S.rider, text: S.riderNote }), { h: 16 }), 'Without media', 'Meta, title, one line. Padding 4x, gaps 1.5x.'),
      cell(dmk(ctx, ui.card({ meta: S.deliverToLabel, title: S.deliverTo, text: S.eta, raised: true }), { h: 16 }), 'Raised', `${m('--raised')} ground and no edge, for a second level.`),
      cell(dmk(ctx, `<div class="kstats">${ui.stat(S.paid, S.paidLabel)}${ui.stat(split(S.deliveries[0].when)[0], 'Leaves')}</div>`, { h: 16 }), 'Stat', 'One number, one label. Padding 4x.'),
    ].join('');
    return kstd(ctx, 'cards', { lead: 'A card holds one thing: a sailing, a fare, a number.',
      rules: ['A card is a hairline, not a shadow. A raised card drops the line and steps the ground.', 'No card holds another card.', 'A photo, when there is one, sits on top at 16 : 9.'], work: grp('Four cards, measured', `<div class="kcards">${cards}</div>`) });
  },

  navigation(ctx) {
    const ui = ctx.ui, S = sc(ctx), X = S.example, act = byRole(ctx, 'action');
    const top = `<nav class="ui-topbar ktop" aria-label="Main">${wm(ctx, 150)}<div class="ui-topbar__links">${ui.links(X.links, 0)}</div></nav>`;
    const side = `<nav class="ui-sidebar" aria-label="Sections">${ui.links(navItems(ctx), 0)}</nav>`;
    const bar = `<nav class="ui-tabbar" aria-label="Sections">${navItems(ctx).map(([t, i], k) => `<a href="#"${k === 0 ? ' aria-current="page"' : ''}>${ui.icon(i, 20)}${A(t)}</a>`).join('')}</nav>`;
    const g = (t, inner, cap) => grp(t, `${inner}<span class="kcap kcap--after">${cap}</span>`);
    return kstd(ctx, 'navigation', { lead: 'Where you are is always marked, and always by more than colour.',
      rules: [`The current page has a 3 px bar in ${A(act.name)}. Links are 44 px tall.`, 'Tabs switch views of the same list. They do not change the page.', 'The mobile tab bar holds four destinations at most, 64 px tall.'],
      work: `<div class="knav">${g('Top bar', dmk(ctx, top, { v: 56 }), 'Wordmark left, links right. 56 px, 14x.')}<div class="knav-2"><div class="kstack">${g('Tabs', dmk(ctx, ui.tabs(X.tabs, 0), { v: 44 }), 'Same list, other view. 44 px, 11x.')}${g('Breadcrumbs', ui.crumbs([...X.crumbs, S.deliverTo]), 'Quiet, with the current page in full ink.')}${g('Mobile tab bar', dmk(ctx, `<div class="kbar">${bar}</div>`, { v: 64 }), 'Four destinations. 64 px, 16x.')}</div>${g('Sidebar', dmk(ctx, side, { h: 12 }), 'A bar on the left marks the current page. Links 44 px, 11x. Padding 3x.')}</div></div>` });
  },

  lists(ctx) {
    const ui = ctx.ui, S = sc(ctx), d = S.deliveries;
    const dep = grp('Departure row', `${dmk(ctx, `<div class="kdeps">${depRow(ctx, d[0])}</div>`, { v: 72, h: 16 })}<span class="kcap kcap--after">Actual size, 72 px, 18x. The time comes first, then the wharf and the wait, then the status.</span>`);
    const states = grp('States', `<div class="k2"><div class="kcell">${dmk(ctx, `<div class="kdeps kdeps--one">${depRow(ctx, { to: d[0].to, when: '06:40, 6 min ago', status: 'boarding' }, { gone: true })}</div>`, { v: 72 })}<span class="kcap"><b>Departed</b>The whole row drops to quiet and leaves the list after two minutes.</span></div><div class="kcell">${dmk(ctx, `<div class="kdeps kdeps--one">${depRow(ctx, d[3])}</div>`, { v: 72 })}<span class="kcap"><b>Cancelled</b>The time is struck through and stays readable. The next sailing is named.</span></div></div>`);
    // the late sailing: the engine row escapes its sub line, so the plain time is swapped for the drawn delay (struck scheduled time, new time in the warning colour)
    const lateRow = ui.row({ lead: ui.icon('ship', 18), title: d[2].to, sub: d[2].when, end: d[2].price, chip: ui.statusChip(d[2].status) }).replace(`<p class="ui-row__sub">${A(d[2].when)}</p>`, () => `<p class="ui-row__sub num">${whenHtml(d[2])}</p>`);
    const lead = grp('With a leading icon', `${dmk(ctx, `<ul class="ui-list">${lateRow}</ul>`, { v: 64 })}<span class="kcap kcap--after">Icon disc 40 px, 10x. Row 64 px, 16x.</span>`);
    const link = grp('As a link', `${dmk(ctx, `<ul class="ui-list">${ui.row({ lead: ui.icon('ticket', 18), title: d[4].to, sub: d[4].when, end: d[4].price, href: '#' })}</ul>`, { v: 64 })}<span class="kcap kcap--after">The whole row is the link.</span>`);
    return kstd(ctx, 'lists', { lead: 'One row is one sailing. The time comes first.',
      rules: ['A row is 72 px, 18x. 16 px, 4x, at each end.', 'Boarding is the only row with a fill, and it is the only row that uses Buoy.', 'The whole row is the target. It opens the fare for that sailing.', 'One hairline between rows. No cards, no shadows.'],
      work: `<div class="kstack">${dep}${states}<div class="k2">${lead}${link}</div></div>` });
  },

  status(ctx) {
    const tk = (id) => m(statusText(ctx, 'light', ctx.status.find((x) => x.id === id)).token);
    const meaning = { boarding: `The one sailing boarding now. Words in ${tk('boarding')}.`, 'on-time': `Leaves when the timetable says. Words in ${tk('on-time')}.`, late: `Behind the time we gave. The words name the minutes, in ${tk('late')}.`, cancelled: `Not sailing. Words in ${tk('cancelled')}. The next sailing is named beside it.`, 'fare-bought': `Your fare is bought. Words in ${tk('fare-bought')}.`, departed: 'Gone. The row drops to quiet.' };
    const L = chipPairs(ctx, 'light'), D = chipPairs(ctx, 'dark');
    const ids = [...ctx.status.map((s) => s.id), 'departed'];
    const chip = (id) => (id === 'departed' ? '<span class="ui-chip kchip--gone">Departed</span>' : ctx.ui.statusChip(id));
    const rows = ids.map((id, i) => `<div class="kstat"><span>${chip(id)}</span><span class="ui kdk" data-theme="dark">${chip(id)}</span><span class="krr"><b>${rt(ctx, ...L[id])}</b>Light</span><span class="krr"><b>${rt(ctx, ...D[id])}</b>Dark</span><span class="kcap kcap--ink">${meaning[id]}</span></div>`).join('');
    return kstd(ctx, 'status', { lead: 'Status is words first. Colour is the second cue.',
      rules: ['A status is words in one colour, a 6 px dot before them. The ratio is the words on the page ground. Five states, with a time or a count where it helps.', 'A status is never colour alone: Boarding, 5 min late and Cancelled are read, not matched.', `A count badge sits on a tab or an icon: ${'<span class="ui-badge">3</span>'}`],
      work: grp('Six states, light and dark', `<div class="kstats-list"><div class="kstat kstat--h"><b>Light</b><b>Dark</b><b>Ratio</b><b>Ratio</b><b>When</b></div>${rows}</div>`) });
  },

  feedback(ctx) {
    const ui = ctx.ui, S = sc(ctx);
    const alerts = grp('Alert banners', `<div class="kalerts">${ui.alert('info', S.pickup)}${ui.alert('success', S.toast)}${ui.alert('warning', S.alert)}${ui.alert('danger', S.form.readyError)}</div>`);
    const toast = grp('Toast', `<div class="kcell">${dmk(ctx, ui.toast(S.toast), { h: 16 })}<span class="kcap">Padding 4x. Bottom of the screen, gone in five seconds. Undo stays reachable by keyboard.</span></div>`);
    const inline = grp('Inline message', `<div class="kcell"><p class="ui-inline-msg">${ui.icon('info', 16)}${A(S.inline)}</p></div>`);
    const load = grp('Loading', `<div class="kload">${dmk(ctx, ui.spinner(), { v: 24 })}<div class="kskel">${ui.skeleton('150px')}${ui.skeleton('100px')}${ui.skeleton('120px')}</div></div><span class="kcap kcap--after">A spinner is 24 px, 6x. A skeleton line is 14 px. A spinner for a short wait. Longer lists get skeleton lines in the shape of the rows.</span>`);
    return kstd(ctx, 'feedback', { lead: 'Say what happened and what to do, in one or two sentences.',
      rules: ['A banner stays until it is dealt with. A toast leaves by itself.', 'The icon and the words carry the meaning. Colour is the second cue.', 'Delays say the minutes and when the ferry now leaves.'],
      work: `<div class="kfeed">${alerts}<div class="kstack">${toast}${inline}${load}</div></div>` });
  },

  dialog(ctx) {
    const ui = ctx.ui, S = sc(ctx);
    const a = uniq(ui.dialog({ title: S.share, body: `Anyone with the link sees where ${S.rider} is.`, confirm: 'Copy link', keep: 'Close' }), 'dlg-a');
    const b = uniq(ui.dialog({ title: S.dialog.title, body: S.dialog.body, confirm: S.dialog.confirm, keep: S.dialog.keep, danger: true }), 'dlg-b');
    return kstd(ctx, 'dialog', { lead: 'A dialog asks one thing. The title is the question and the buttons answer it.',
      rules: ['The safe answer sits on the left, and it is the one the focus lands on.', 'Danger is for what cannot be undone. The button names what it does.', 'Esc and a press on the scrim close it.'],
      work: grp('Two dialogs, measured', `<div class="kdlg">${cell(`<div class="ui-scrim">${dmk(ctx, a, { h: 24 })}</div>`, 'Modal', 'One action and a way out. Padding 24 px, 6x.')}${cell(`<div class="ui-scrim">${dmk(ctx, b, { h: 24 })}</div>`, 'Confirmation', 'The danger button names the action. Buttons 36 px, 9x.')}</div>`) });
  },

  table(ctx) {
    const ui = ctx.ui, S = sc(ctx), act = byRole(ctx, 'action');
    const sortBtn = (t, dir) => `<button type="button">${A(t)}${dir ? ui.icon(dir === 'asc' ? 'arrow-up' : 'arrow-down', 14) : ''}</button>`;
    const rows = S.deliveries.slice(0, 4).map((d, i) => `<tr${i === 0 ? ' aria-selected="true"' : ''}${i === 2 ? ' class="is-hover"' : ''}><td>${A(d.to)}</td><td class="num">${A(d.when)}</td><td>${ui.statusChip(d.status)}</td><td class="is-num">${A(d.price)}</td></tr>`).join('');
    const table = `<table class="ui-table"><thead><tr><th scope="col" aria-sort="ascending">${sortBtn(S.deliverToLabel, 'asc')}</th><th scope="col">${sortBtn('Leaves')}</th><th scope="col">Status</th><th scope="col" class="is-num">${sortBtn(S.paidLabel)}</th></tr></thead><tbody>${rows}</tbody></table>`;
    return kstd(ctx, 'table', { lead: 'A table is for comparing. A list is for choosing.',
      rules: ['The header row is 44 px, 11x. A body row is 52 px, 13x. A sortable header is a button, and the sorted one shows its direction.', 'Numbers sit right and use tabular figures.', `Row states: rest, hover on pointer devices, and selected with a 3 px ${A(act.name)} bar on the left.`],
      work: `<div class="kstack">${grp('Construction', dmk(ctx, table, { v: [44, 52, 52, 52, 52] }))}<div class="kkeys"><span class="kcap"><b>Selected</b>First row</span><span class="kcap"><b>Hover</b>Third row</span><span class="kcap"><b>Sorted</b>${A(S.deliverToLabel)}, ascending</span></div></div>` });
  },

  empty(ctx) {
    const S = sc(ctx), F = S.form, ui = ctx.ui, E = S.empty;
    const none = `<div class="ui-empty"><h3 class="ui-empty__title">${A(E.title)}</h3><p class="ui-empty__text">${A(E.body)}</p>${ui.btn(E.cta)}</div>`;
    const first = `<div class="ui-empty"><h3 class="ui-empty__title">${A(F.title)}</h3><ol class="ksteps"><li><span>1</span>${A(F.pickup)}</li><li><span>2</span>${A(F.dropoff)}</li><li><span>3</span>${A(F.ready)}</li></ol>${ui.btn(F.book, { disabled: true })}<p class="ui-help">${A(F.bookWhy)}</p></div>`;
    return kstd(ctx, 'empty', { lead: 'Say what is missing and offer the one action that fixes it.',
      rules: ['First run lists what is needed, in the order it is asked.', 'The empty state sits on a raised ground with no edge, so it does not read as a card.', 'The disabled button says why.'],
      work: grp('Two empty states, measured', `<div class="k2">${cell(dmk(ctx, none, { h: 32 }), 'Empty', 'No fares yet. Padding 32 px, 8x.')}${cell(dmk(ctx, first, { h: 32 }), 'First run', 'Before the first fare. Gaps 12 px, 3x.')}</div>`) });
  },

  'screen-light': (ctx) => screenPage(ctx, 'screen-light', false),
  'screen-dark': (ctx) => screenPage(ctx, 'screen-dark', true),

  'screen-mobile'(ctx) {
    const S = sc(ctx), b = base(ctx), p = ctx.pages.find((x) => x.id === 'screen-mobile');
    const states = S.deliveries.slice(0, 5).map((d) => `<li class="kstate"><span class="kstate-chip">${ctx.ui.statusChip(d.status)}</span><span class="kstate-line num">${whenHtml(d)}</span></li>`).join('');
    const rules = [
      `The departure board comes first, under the wharf it leaves from. Four rows of ${PH.row} px, ${fx(PH.row, b)}, the time first at 24 px, 6x.`,
      'A late sailing keeps its scheduled time, struck through, and sets the new time beside it in the warning colour. The words name the minutes.',
      'A cancelled sailing is struck through and names the next one.',
      `The one action sits above the tab bar, ${PH.btn} px, ${fx(PH.btn, b)}, with 20 px, 5x, round it, in reach of the thumb.`,
      `The tab bar is ${PH.tab} px, ${fx(PH.tab, b)}, and holds four destinations.`,
    ];
    // dimension marks down the left of the phone, clause keys down its right, both from PH (the phone's 1 px edge is the first pixel)
    const y0 = 1 + PH.top + PH.head, rowTop = (i) => y0 + i * PH.row;
    const kvt = (top, h) => `<span class="kv" style="top:${top}px;height:${h}px"><b>${fx(h, b)}</b><small>${h} px</small></span>`;
    const marks = kvt(1, PH.top) + Array.from({ length: PH.rows }, (_, i) => kvt(rowTop(i), PH.row)).join('') + kvb(ctx, PH.btnBottom, PH.btn) + kvb(ctx, 1, PH.tab);
    const key = (n, pos) => `<span class="kph-k num" style="${pos}">${p.ref}.${n}</span>`;
    const keys = key(1, `top:${rowTop(0) + 26}px`) + key(2, `top:${rowTop(2) + 26}px`) + key(3, `top:${rowTop(3) + 26}px`) + key(4, `bottom:${PH.btnBottom + 14}px`) + key(5, `bottom:${1 + 24}px`);
    return kstd(ctx, 'screen-mobile', { lead: `${A(ctx.brand.ui.screen.title)} at 390, light. The numbers on the right of the screen key it to the clauses.`, rules,
      cls: 'pg--kphone', work: `<div class="kph-cols"><div class="kph-wrap">${marks}${phoneScreen(ctx)}${keys}</div>${grp('The headline, state by state', `<ul class="kstates">${states}</ul>`)}</div>` });
  },

  tokens(ctx) {
    const g = tokenGroups(ctx), L = colourMap(ctx, 'light'), D = colourMap(ctx, 'dark');
    const sw = (c) => `<i class="ktsw" style="background:${c}"></i>`;
    const col = Object.keys(L).map((k) => `<div class="ktk"><span class="mono">--${k}</span><span class="ktv">${sw(L[k])}${m(L[k])}</span><span class="ktv">${sw(D[k])}${m(D[k])}</span></div>`).join('');
    const line = (k, v) => `<div class="ktk ktk--2"><span class="mono">--${k}</span>${m(v)}</div>`;
    const fam = (id) => ctx.brand.fonts[id].family;
    const sp = Object.entries(g.space).map(([k, v]) => line(k, `${v}, ${fx(parseFloat(v), base(ctx))}`)).join('');
    const rd = Object.entries(g.radius).map(([k, v]) => line(k, v)).join('');
    const wd = Object.entries(g.width).map(([k, v]) => line(k, v)).join('');
    const ff = [['ff-display', fam('display')], ['ff-body', fam('body')], ['ff-mono', fam('mono')]].map(([k, v]) => `<div class="ktk ktk--f"><span class="mono">--${k}</span><span>${A(v)}</span></div>`).join('');
    const tx = ctx.uiType.map((t) => `<div class="ktk ktk--2"><span class="mono">${A(t.token)}</span>${m(`${t.size} / ${t.line} / ${t.weight}`)}</div>`).join('');
    const pal = ctx.colours.map((c) => `<div class="ktk ktk--2"><span class="mono">--palette-${A(c.id)}</span><span class="ktv">${sw(c.hex)}${m(c.hex)}</span></div>`).join('');
    const G = (t, inner) => `<div class="ktg">${kru()}<h3><i class="kn"></i>${A(t)}</h3>${inner}</div>`;
    return kstd(ctx, 'tokens', { lead: 'Every token in the kit, as the code package names it.',
      rules: ['Colour tokens name a job. Dark swaps the values and leaves the names.', 'Space is in steps of x. Radius is 2 px on everything but avatars and switches.', 'Type is size, line height, weight, all in px.'],
      work: `<div class="ktokens"><div>${G('Colour, light then dark', `<div class="ktk ktk--h"><span></span><span>Light</span><span>Dark</span></div>${col}`)}</div><div>${G('Space', sp)}${G('Radius', rd)}${G('Border width', wd)}${G('Shadow', line('shadow-float', g.shadow['shadow-float']))}</div><div>${G('Type, size / line / weight', tx)}${G('Fonts', ff)}${G('Palette', pal)}</div></div>` });
  },

  code(ctx) {
    const F = sc(ctx).form;
    const files = [
      ['README.md', 'Install, use, token naming, light and dark, accessibility notes.'], ['tokens.css', 'Custom properties. Light on :root, dark on [data-theme="dark"] and the system setting.'],
      ['tokens.json', 'The same tokens in the W3C design token format, with a dark value on each colour.'], ['tokens.ts', 'A typed export of the same values.'], ['tailwind.css', 'A Tailwind CSS v4 @theme block mapped to the tokens.'],
      ['components.css', 'Classes for every component in this kit, built only on the tokens.'], ['example.html', 'Every component live, with a light and dark switch.'], ['fonts.css', `@font-face rules for ${[...new Set(ctx.faces.map((f) => f.family))].join(', ')}.`],
      ['assets/', 'The logo, 16 icons and the font files.'],
    ].map(([n, d]) => `<div class="kfile"><span class="mono">${A(n)}</span><span>${A(d)}</span></div>`).join('');
    const code = `<link rel="stylesheet" href="fonts.css">
<link rel="stylesheet" href="tokens.css">
<link rel="stylesheet" href="components.css">

<body class="ui">
  <button class="ui-btn" type="button">
    ${F.book}
  </button>
</body>`;
    const tw = `@import "tailwindcss";
@import "./tokens.css";
@import "./tailwind.css";`;
    const block = (t, c) => grp(t, `<pre class="ui kcode" data-theme="dark"><code>${A(c)}</code></pre>`);
    return kstd(ctx, 'code', { lead: 'Plain CSS, no framework. Copy the folder and link three stylesheets.',
      rules: [`Put class ${m('ui')} on the body. Colour tokens name a job: ${m('--surface')}, ${m('--text')}, ${m('--action')}.`, `Controls are real elements. State is carried by ${m('disabled')}, ${m('aria-invalid')}, ${m('aria-pressed')} and ${m('aria-current')}.`],
      work: `<div class="kcode-cols"><div class="kfiles">${grp('In the package', files)}</div><div class="kstack">${block('Install', code)}${block('Dark mode', '<html data-theme="dark">')}${block('Tailwind v4', tw)}</div></div>` });
  },
};
