// UI kit pages for theme 06, Studio (25 ids, engine/pages.js UIKIT_PAGES). Every component is the engine's own (ctx.ui), so a page shows what
// components.css ships; states are forced with the .is-* classes. The page is the Studio standard page (running head, title, lead, body, hairline
// foot) with a .ui body, and the brand's real UI sits on Steel panels. Two pages are 1280 x 760 kit sheets (meta.pageSizes). Styles: css-kit.js.
import { A, ratioText, std } from './helpers.js';
import { colourMap, tokenGroups, statusText } from '../../engine/tokens.js';

const m = (s) => `<span class="mono">${A(s)}</span>`;
const rt = (ctx, a, b) => ratioText(ctx.fmt(ctx.ratio(a, b)));
const sc = (ctx) => ctx.brand.ui.screen.content;
const role = (ctx, r) => ctx.colours.find((c) => c.role === r);
const house = (ctx, t) => ctx.houseRoles.includes(t);
const HOUSE = 'house default, not a brand colour';
// the page: std frame with a .ui body so the document reads the kit's own tokens
const kp = (ctx, id, inner, { lead, cls = '' } = {}) => std(ctx, id, `<div class="ui kb ${cls}">${inner}</div>`, { lead, cls: `pg--k ${cls}` });
const grp = (title, inner, cls = '') => `<div class="kg ${cls}"><h3 class="kh">${A(title)}</h3>${inner}</div>`;
const cap = (head, sub) => `<span class="kcap">${head ? `<b>${head}</b>` : ''}${sub || ''}</span>`;
const cell = (inner, head, sub) => `<div class="kcell">${inner}${head ? cap(A(head), sub) : ''}</div>`;
const panel = (inner, cls = '') => `<div class="kpn ${cls}">${inner}</div>`;
const uniq = (html, tag) => html.replace(/dlg-t/g, tag);

// ---- Studio's drawing devices: a Steel stage with a figure bar, numbered badges on a stem, dimension marks, leader callouts, and the key
const ref = (ctx, id) => ctx.pages.find((x) => x.id === id).ref;
const stage = (ctx, id, inner, { cls = '', note = 'Dimensions in px', fig = '', title } = {}) => `<div class="kpn kfg ${cls}"><div class="kfg-bar"><span><b class="num">${ref(ctx, id) ? `Fig. ${ref(ctx, id)}${fig}` : ''}</b> ${A(title || ctx.pages.find((x) => x.id === id).title)}</span><span>${A(note)}</span></div><div class="kfg-in">${inner}</div></div>`;
// a free-standing vertical dimension of a given height (beside something it measures)
const dv = (h, label) => `<span class="dm-v" style="height:${h}px"><span class="dm-l"><u>${A(label)}</u></span></span>`;
const nb = (k, inner, cls = '') => `<span class="an-n ${cls}">${inner}${[].concat(k).map((x, i) => `<i class="an-b" style="right:${6 + i * 24}px">${x}</i>`).join('')}</span>`;
// a badge on a stem to the left of a list or table, at a given height
const nl = (k, y, side = 'l') => `<i class="an-b an-b--h an-b--${side}" style="top:${y}px">${k}</i>`;
// the key, for sentences: a number and one line
const keyS = (rows, start = 1) => `<ol class="kkey">${rows.map((t, i) => `<li class="kkey-s"><i class="an-b an-b--k">${start + i}</i><span>${t}</span></li>`).join('')}</ol>`;
const dx = (inner, label, cls = '') => `<span class="dm-x ${cls}">${inner}<span class="dm-l"><u>${A(label)}</u></span></span>`;
const dy = (inner, label, cls = '') => `<span class="dm-y ${cls}">${inner}<span class="dm-l"><u>${A(label)}</u></span></span>`;
// a leader callout: lives in a static block, so it lines up with the part it opens; `reach` is the leader's length in px
const co = (side, y, reach, name, tok, val, ratio) => `<i class="an-co an-co--${side}" style="--rc:${reach}px;margin-top:${y}px"><span class="an-cn"><b>${A(name)}</b>${ratio ? `<em class="num">${ratio}</em>` : ''}</span><span class="mono">${A(tok)} ${A(val)}</span></i>`;
// the key: each number on a stage, named
const key = (rows, start = 1) => `<ol class="kkey">${rows.map(([a, b], i) => `<li><i class="an-b an-b--k">${start + i}</i><span class="kkl">${A(a)}</span><span class="kkv num">${b}</span></li>`).join('')}</ol>`;

// ---- colour roles: [label, token, swatch bg, swatch fg, ring, ratio, note]
function roleRows(ctx, mode) {
  const M = colourMap(ctx, mode), R = (a, b) => rt(ctx, M[a], M[b]);
  const g = (label, tok) => [label, tok, M[tok], M.text, '', R('text', tok), 'Text on it'];
  const t = (label, tok, bgTok, note) => [label, tok, M[bgTok], M[tok], '', R(tok, bgTok), note];
  const st = (label, tok) => [label, tok, M.surface, M[tok], '', R(tok, 'surface'), 'Words on the page ground', house(ctx, tok) ? HOUSE : ''];
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
  ].map(([label, tok, bg, fg, ring, ratio, note, flag]) => ({ label, tok, val: M[tok], bg, fg, ring, ratio, note, flag }));
}
// the inspector: the dev-tools pane. A row is a swatch (the ground, with the text colour as a dot), the role, the token, the value, the ratio, the use.
const insRow = (r) => `<div class="kins-r${r.flag ? " kins-r--f" : ""}"><span class="kisw" style="background:${r.bg};${r.ring}"><b style="background:${r.fg}"></b></span><span class="kin">${A(r.label)}</span>${m('--' + r.tok)}${m(r.val)}<b class="kir num">${r.ratio || 'Overlay'}</b><span class="kiu">${A(r.note)}${r.flag ? ` <i>${A(r.flag)}</i>` : ''}</span></div>`;

// the annotated screen: a real quote card, with a leader from each coloured part to a callout naming the colour, its value and its measured ratio
function annotated(ctx, mode) {
  const M = colourMap(ctx, mode), S = sc(ctx), ui = ctx.ui, F = S.form;
  const R = (a, b) => rt(ctx, M[a], M[b]);
  const C = (side, y, reach, name, t, a, b) => co(side, y, reach, name, '--' + t, M[t], b ? R(a, b) : '');
  const byId = (id, tone) => ctx.status.find((x) => x.id === id) || ctx.status.find((x) => x.tone === tone) || ctx.status[0];
  const sent = byId('sent', 'info'), over = byId('overdue', 'danger'), paid = byId('paid', 'success'), draft = byId('draft', 'neutral');
  const chip = (s) => ui.statusChip(s.id);
  return `<div class="an-st"><div class="an-card">
<div class="an-pt">${C('l', 7, 20, 'Info', 'info', 'info', 'surface')}${C('r', 7, 20, 'Quiet text', 'quiet', 'quiet', 'surface')}<div class="an-head">${chip(sent)}<span class="an-q num">${A(S.time)}</span></div></div>
<div class="an-pt">${C('l', 2, 14, 'Surface', 'surface', 'text', 'surface')}${C('r', 10, 87, 'Text', 'text', 'text', 'surface')}<h2 class="ui-display an-h">${A(S.eta)}</h2></div>
<div class="an-pt">${C('l', 4, 20, 'Soft text', 'text-soft', 'text-soft', 'surface')}<p class="an-p">${A(S.pickup)}</p></div>
<div class="an-pt an-rider">${C('l', -4, 20, 'Divider', 'divider', 'divider', 'surface')}${C('r', 10, 36, 'Control edge', 'edge', 'edge', 'surface')}<div class="an-rr"><span class="ui-avatar">${A(S.initials)}</span><span class="an-rn">${A(S.rider.split(',')[0])}</span>${ui.btn(S.call, { variant: 'secondary', size: 'sm' })}</div></div>
<div class="an-pt">${C('l', 22, 102, 'Action label', 'action-label', 'action-label', 'action')}${C('r', 8, 36, 'Action', 'action', 'action', 'surface')}${ui.btn(F.book, { block: true, iconRight: 'arrow-right' })}</div>
<div class="an-pt an-chips">${C('l', 7, 20, 'Danger', 'danger', 'danger', 'surface')}${C('r', 7, 58, 'Success', 'success', 'success', 'surface')}<div class="an-cr">${chip(over)}${chip(paid)}</div></div>
<div class="an-pt"><div class="an-cr">${chip(draft)}</div></div>
</div></div>`;
}

function colourPage(ctx, id, mode) {
  const dark = mode === 'dark', act = role(ctx, 'action'), txt = role(ctx, 'text');
  const lead = dark
    ? `Dark swaps the values and keeps the names. ${act.name} stays the action and its label stays ${txt.name === 'Ink' ? 'White' : 'light'}, so a button reads the same in both.`
    : `Roles name a job, not a colour. Components read --action, never a palette name. Text pairs are measured at 4.5 : 1, edges and the focus ring at 3 : 1.`;
  const rows = roleRows(ctx, mode);
  const ins = `<div class="kins"><div class="kins-h"><span>${dark ? 'Dark values' : 'Light values'}</span><span class="num">${rows.length} roles</span></div>${rows.map(insRow).join('')}</div>`;
  return kp(ctx, id, `<div class="${dark ? 'ui kdark' : 'kcol'}" ${dark ? 'data-theme="dark"' : ''}>${stage(ctx, id, annotated(ctx, mode), { note: 'Leaders point at the part; ratios are measured' })}${ins}</div>`, { lead, cls: dark ? 'pg--dark' : '' });
}

// ---- foundations
const typeCell = (t) => {
  const face = t.face === 'display' ? 'font-family:var(--ff-display);letter-spacing:-0.01em;' : 'font-family:var(--ff-body);';
  return `${face}font-size:${t.size}px;line-height:${t.line}px;font-weight:${t.weight}`;
};

// a colour's brand name from its hex (the palette first, then the tones), else the hex
const nm = (ctx, hex) => { const h = String(hex).toLowerCase(); const c = [...ctx.colours, ...ctx.tones].find((x) => x.hex.toLowerCase() === h); return c ? c.name : hex; };
const btnWord = (ctx) => sc(ctx).form.book.split(' ')[0];
const rules = (items) => `<ul class="krules">${items.map((t) => `<li>${t}</li>`).join('')}</ul>`;
const noChange = (t = 'No change') => `<span class="kna">${A(t)}</span>`;
const mx = (cols) => `<div class="kmx-h"></div>${cols.map((c) => `<div class="kmx-h">${A(c)}</div>`).join('')}`;
const mrow = (name, cells) => `<div class="kmx-r">${String(name).startsWith('<span') ? name : A(name)}</div>${cells.map((c) => `<div class="kmx-c">${c}</div>`).join('')}`;
const wordmark = (ctx) => `<strong class="ui-display">${A(ctx.brand.logo.showcase.wordmark)}</strong>`;
// ---- product screens (the same markup serves the desktop sheets and the phone)
const navItems = (ctx) => [...sc(ctx).example.links, [sc(ctx).example.account, 'menu']];
const progress = (S) => `<div class="ui-progress" role="progressbar" aria-label="Progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(S.progress * 100)}"><div class="ui-progress__bar"><i style="width:${S.progress * 100}%"></i></div><span class="ui-progress__dot" style="left:${S.progress * 100}%"></span></div><div class="ks-route"><span>${A(S.from)}</span><span>${A(S.to)}</span></div>`;
const riderRow = (ctx, S) => `<div class="ks-rider"><span class="ui-avatar">${A(S.initials)}</span><div class="ks-rmain"><p class="ks-rname">${A(S.rider)}</p><p class="ks-rsub">${A(S.riderNote)}</p></div>${ctx.ui.btn(S.call, { variant: 'secondary', size: 'sm' })}</div>`;
const detailRows = (S) => `<dl class="ks-detail"><div><dt>${A(S.deliverToLabel)}</dt><dd>${A(S.deliverTo)}</dd></div><div><dt>${A(S.paidLabel)}</dt><dd class="ui-num">${A(S.paid)}</dd></div></dl>`;
function desktopWindow(ctx) {
  const S = sc(ctx), ui = ctx.ui, items = navItems(ctx).slice(0, 3);
  return `<div class="kscreen">
<nav class="ui-topbar" aria-label="Main">${wordmark(ctx)}<div class="ui-topbar__links">${ui.links(items, 1)}</div><span class="ks-clock ui-num">${A(S.time)}</span><i class="an-b an-b--in">1</i></nav>
<div class="ks-main">
<section class="ks-track" aria-label="${A(ctx.brand.ui.screen.title)}">
<p class="ks-title">${A(ctx.brand.ui.screen.title)}</p>
<div class="ks-eta"><h2 class="ui-display ks-time">${A(S.eta)}</h2>${ui.statusChip(ctx.status[1].id)}<i class="an-b an-b--in">2</i></div>
<p class="ks-pickup">${A(S.pickup)}</p>
<div class="ks-prog">${progress(S)}</div>
${riderRow(ctx, S)}${detailRows(S)}${ui.btn(S.share, { variant: 'secondary', block: true })}
</section>
<section class="ks-deliv" aria-label="List"><p class="ks-title">${A(items[1][0])}<i class="an-b an-b--in">3</i></p>${ui.deliveryRows(5)}<div class="ks-book">${ui.btn(S.form.book, { iconRight: "arrow-right" })}<i class="an-b an-b--in">4</i></div></section>
</div></div>`;
}
function phoneWindow(ctx) {
  const S = sc(ctx), ui = ctx.ui;
  return `<div class="kphone">
<div class="kph-top"><span class="ui-num">${A(S.time)}</span>${wordmark(ctx)}</div>
<div class="kph-body">
<span class="kph-chip">${ui.statusChip(ctx.status[1].id)}</span>
<h2 class="ui-display kph-time">${A(S.eta)}</h2>
<p class="ks-pickup">${A(S.pickup)}</p>
<div class="ks-prog">${progress(S)}</div>
${riderRow(ctx, S)}${ui.btn(S.share, { variant: 'secondary', block: true })}
</div>
<nav class="ui-tabbar" aria-label="Sections">${navItems(ctx).map(([t, i], k) => `<a href="#"${k === 1 ? ' aria-current="page"' : ''}>${ui.icon(i, 20)}${A(t)}</a>`).join('')}</nav>
</div>`;
}
// a 1280 x 760 kit sheet: Steel ground, the window on it, a head and a foot in the page's own voice
const sheet = (ctx, id, dark) => {
  const p = ctx.pages.find((x) => x.id === id);
  return `<section class="pg pg--sheet" data-page="${id}"><div class="ui ksh" ${dark ? 'data-theme="dark"' : ''}>
<header class="ksh-hd"><span class="ksh-t"><b>${A(ctx.brand.name)} UI kit</b></span><span class="ksh-p">${p.ref ? `<span class="num">${p.ref}</span> ` : ''}${A(p.title)}</span><span class="num">${ctx.pageNo(id)}</span></header>
${desktopWindow(ctx)}
<footer class="ksh-fo"><span>${A(ctx.brand.ui.screen.title)}. ${A(role(ctx, "action").name)} marks the live state and the primary action. <b class="num">1</b> Top bar, 56 px. <b class="num">2</b> The live status. <b class="num">3</b> The list. <b class="num">4</b> The primary action.</span><span class="num">${A(ctx.versionLine)}</span></footer>
</div></section>`;
};
// @@next

export const uikit = {
  cover(ctx) {
    const B = ctx.brand, S = sc(ctx), F = S.form, ui = ctx.ui;
    // the logo in its real contexts, each dimensioned: the app header over the new-quote form, the app icon, an invoice head, the favicon
    const lg = (id, w, o = {}) => ctx.logo.html(id, { width: w, label: 'Your logo goes here', ...o });
    const g = ctx.logo.geos, lh = (id, w) => Math.round(w * g[id].h / g[id].w);
    const iconW = 56, favW = 16, minW = B.logo.showcase.minScreenPx;
    const win = `<div class="cv-win"><div class="cv-bar">${nb(1, dx(lg('colour', minW, { label: 'Your logo' }), `${minW}`, 'dm--s'), 'an-n--e')}<span class="cv-time num">${A(S.time)}</span></div>
<div class="cv-form"><h2 class="ui-display kcv-h">${A(F.title)}</h2>
<div class="cv-two">${ui.field({ id: 'cv-1', label: F.pickup, value: F.pickupValue })}${ui.field({ id: 'cv-2', label: F.dropoff, value: F.dropoffValue })}</div>
<div class="cv-act"><div class="ui-field"><span class="ui-label">${A(F.size)}</span>${ui.segmented(F.sizes, 0)}</div>${ui.btn(F.book, { iconRight: 'arrow-right' })}</div></div></div>`;
    const head = stage(ctx, 'cover', `<div class="cv-hd">${win}${dv(56, '56')}</div>`, { title: 'The app header', note: `Height 56 px, logo ${minW} px wide at its minimum` });
    const icon = `<div class="cv-ic">${dx(dy(`<span class="cv-tile">${lg('symbol', iconW, { colourway: 'reversed', label: '' })}</span>`, `${iconW}`, 'dm--p'), '96', 'dm--p')}</div>`;
    const inv = `<div class="cv-inv">${dx(`<div class="cv-doc"><div class="cv-doc-h">${lg('colour', 72, { colourway: 'mono-dark', label: '' })}<span class="num">${A(S.paid)}</span></div><p class="cv-doc-t">${A(S.rider)}</p><p class="cv-doc-s">${A(S.riderNote)}</p></div>`, '72', 'dm--p')}</div>`;
    const fav = `<div class="cv-fav"><span class="cv-tab">${lg('symbol', favW, { label: '' })}<span>${A(B.logo.showcase.wordmark)}</span></span>${dx(`<span class="cv-big">${lg('symbol', favW * 4, { label: '' })}</span>`, `${favW * 4}`, 'dm--p')}</div>`;
    const small = [['App icon', icon, 'A 96 px tile. The symbol alone, reversed, at 56.'], ['Invoice', inv, 'The logo at 72 px, one colour, over the job and the total.'], ['Favicon', fav, `The symbol at ${favW} px in the tab, drawn again at 4 times.`]]
      .map(([t, x, c], i) => `<div class="cv-c"><div class="kpn cv-p">${x}</div>${cap(`${nb(i + 2, A(t), 'an-n--t')}`, A(c))}</div>`).join('');
    return std(ctx, 'cover', `<div class="ui kb">${head}<div class="cv-row">${small}</div></div>`, { title: `${B.name} UI kit`, lead: `${B.product.slice(0, -1)}. These are its colours, type and components, and the code that builds them.`, cls: 'pg--k pg--kcover' });
  },

  contents(ctx) {
    const folder = (s) => `<li class="kc-g"><div class="kc-s"><span class="n num">${s.n}</span><span class="t">${A(s.title)}</span><span class="kc-ct num">${s.pages.length}</span></div><ol class="kc-pg">${s.pages.map((p) => `<li><span class="n num">${p.ref}</span><span class="t">${A(p.title)}</span><span class="p num">${p.no}</span></li>`).join('')}</ol></li>`;
    const total = ctx.sections.reduce((a, s) => a + s.pages.length, 0);
    // how to read a figure: the four marks the pages use, drawn once
    const leg = [
      ['<i class="an-b an-b--k">1</i>', 'Numbered badge. It names a part, and the same number is in the key under the figure.'],
      ['<span class="kl-d"><u class="num">16</u></span>', 'Dimension. A drawn length in px, with a tick at each end.'],
      ['<span class="kl-l"></span>', 'Leader. It runs from a callout to the part, with its value and measured ratio.'],
      ['<span class="kl-p"></span>', "Steel panel. The brand's real UI sits on it, so everything inside is live."],
    ].map(([d, t]) => `<li><span class="kl-g">${d}</span><span>${A(t)}</span></li>`).join('');
    const legend = `<div class="kc-leg"><div class="kc-s"><span class="t">How to read a figure</span></div><ul>${leg}</ul></div>`;
    const [first, ...rest] = ctx.sections;
    return kp(ctx, 'contents', `<div class="kpn kfg kc-tree"><div class="kfg-bar"><span><b>Contents</b> Pages by section</span><span class="num">${total} pages</span></div><div class="kc-toc kfg-in"><div class="kc-col"><ol>${folder(first)}</ol>${legend}</div><ol class="kc-col">${rest.map(folder).join('')}</ol></div></div>`, { cls: 'pg--kcont' });
  },

  'colour-light': (ctx) => colourPage(ctx, 'colour-light', 'light'),
  'colour-dark': (ctx) => colourPage(ctx, 'colour-dark', 'dark'),

  'type-scale'(ctx) {
    const S = sc(ctx), F = S.form, B = ctx.brand, d = B.fonts.display, b = B.fonts.body;
    const sample = { caption: F.notesHelp, label: F.pickup, body: S.pickup, control: F.book, 'title-s': S.dialog.title, title: S.rider, headline: S.eta };
    // the live text on a stage: every style sits in its own line box, so the box height is the line height, drawn; the gap between rows is dimensioned too
    const face = (cls, f, w, use) => `<div class="ty-f"><span class="ty-spec"><b>${A(f.family)}</b><span>${w}</span><span>${use}</span></span>${dy(`<span class="ty-box ty-box--aa"><span class="${cls}">Aa</span></span>`, '72', 'dm-y--b dm--s')}</div>`;
    const faces = `<div class="ty-faces">${face('ui-display ty-aa', d, `${d.weights.join(' and ')}`, 'Titles and the live status.')}${face('ty-aa ty-aa--b', b, `${b.weights.join(', ')}`, 'Everything people read.')}</div>`;
    const gap = ctx.space[4].px;
    const rows = [...ctx.uiType].reverse().map((t, i, all) => `<div class="ty-r"><span class="ty-spec"><b class="mono">${A(t.token)}</b><span class="mono">${t.size} / ${t.line} / ${t.weight}</span><span>${A(t.use)}</span></span>${dy(`<span class="ty-box" style="height:${t.line}px"><span class="kts" style="${typeCell(t)}">${A(sample[t.token] || t.use)}</span></span>`, String(t.line), 'dm-y--b dm--s')}${i < all.length - 1 ? `<span class="ty-gap" style="height:${gap}px"><u class="num">${gap}</u></span>` : ''}</div>`).join('');
    return kp(ctx, 'type-scale', stage(ctx, 'type-scale', `${faces}<div class="ty-rows">${rows}</div>`, { note: 'Line height and the gap between rows, in px' }), { lead: 'Sizes are px, then line height in px, then weight. Numbers that change use tabular figures, and nothing on screen is under 12 px.' });
  },

  spacing(ctx) {
    const base = ctx.brand.ui.spacingBase, Z = 4;
    const uses = ['Inside a tight pair', 'Icon to label', 'Gaps in a row, field padding', 'Card padding', 'Dialog padding, button sides', 'Empty state padding', 'Between groups', 'Between sections'];
    const rows = ctx.space.map((s, i) => `<div class="ksr"><span class="mono">--${s.token.replace('space-', 'sp-')}</span><span class="mono ksr-n">${s.px} px</span><span class="kdm" style="width:${s.px * Z}px"></span>${cap('', A(uses[i] || ''))}</div>`).join('');
    const gaps = [[ctx.space[1].px, 'Label to field'], [ctx.space[3].px, 'Between fields'], [ctx.space[5].px, 'Between groups']];
    const ex = gaps.map(([g], i) => `<div class="kgp">${nb(i + 1, `<div class="kgp-s" style="--g:${g}px"><i></i><i></i><b class="kgp-d num"><u>${g}</u></b></div>`, 'an-n--b')}</div>`).join('');
    const k = key(gaps.map(([g, t]) => [t, `${g} px`]));
    return kp(ctx, 'spacing', `${stage(ctx, 'spacing', `<h3 class="kh">Drawn at ${Z} times</h3><div class="ksp">${rows}</div><h3 class="kh kh--g">In use</h3><div class="kgps">${ex}</div>`, { note: `The ${base} px step, drawn at ${Z} times` })}<div class="kg2">${grp('Key', k)}${grp('Rules', rules(['Space comes from the scale. A one-off value is a bug, not a style.', 'Inside a group is always smaller than between groups.']))}</div>`, { lead: `Everything sits on a ${base} px step. A gap inside a group is smaller than the gap between groups, so grouping reads at a glance. Controls are 44 px tall, eleven steps.` });
  },

  'radii-borders'(ctx) {
    const S = sc(ctx), F = S.form, ui = ctx.ui, [rc, rk, rr] = ctx.radii, [bh, bc, bf] = ctx.borders;
    const rad = [
      nb(1, dy(ui.btn(F.book), `${ctx.uiHeight || 44}`, 'dm--s')),
      nb(2, `<div class="krc">${ui.card({ meta: S.status, title: S.rider, text: S.riderNote })}</div>`, 'an-n--b'),
      nb(3, `<div class="krow2"><span class="ui-avatar">${A(S.initials)}</span>${ui.switch('Text me', { checked: true })}</div>`),
    ].join('');
    const bor = [
      nb(4, `<ul class="ui-list">${ui.row({ title: S.deliverTo, sub: S.pickup.split(' sent')[0], end: S.paid })}</ul>`, 'an-n--b'),
      nb(5, ui.field({ id: 'rb1', label: F.pickup, value: F.pickupValue }), 'an-n--b'),
      nb(6, ui.field({ id: 'rb2', label: F.dropoff, value: F.dropoffValue, state: 'focus' }), 'an-n--b'),
    ].join('');
    const k = key([[A(rc.use), `${m(rc.token)} ${rc.px} px`], [A(rk.use), `${m(rk.token)} ${rk.px} px`], [A(rr.use), `${m(rr.token)} round`], [A(bh.use), `${m(bh.token)} ${bh.px} px`], [A(bc.use), `${m(bc.token)} ${bc.px} px`], [A(bf.use), `${m(bf.token)} ${bf.px} px`]]);
    return kp(ctx, 'radii-borders', `${stage(ctx, 'radii-borders', `<h3 class="kh">Radius</h3><div class="k3 k3--n">${rad}</div><h3 class="kh kh--g">Border width</h3><div class="k3 k3--n">${bor}</div>`)}<div class="kg2">${grp('Key', k)}${grp('Rules', rules([`Controls take ${rc.px} px and cards ${rk.px}. Round is for avatars and switches only.`, `Control edges are ${bc.px} px so they hold against the ground. Dividers stay at ${bh.px} px.`]))}</div>`, { lead: 'Radii and border widths, drawn on the real controls.' });
  },

  elevation(ctx) {
    const S = sc(ctx), ui = ctx.ui;
    const steps = [['Sunken', 'sunken', 'The app ground'], ['Surface', 'surface', 'Cards and every page'], ['Raised', 'raised', 'A second level inside a card']]
      .map(([n, t], i) => `<div class="kstep">${nb(i + 1, dy(`<span class="kstep-sw" style="background:var(--${t})"></span>`, '44', 'dm--s'))}<span class="kstep-n">${A(n)}</span></div>`).join('');
    const dlg = uniq(ui.dialog({ title: S.dialog.title, body: S.dialog.body, confirm: S.dialog.confirm, keep: S.dialog.keep, danger: true }), 'dlg-el');
    const card = `<div class="krc">${nb(4, ui.card({ meta: S.status, title: S.eta, text: S.pickup }), 'an-n--b')}</div>`;
    const k = key([
      ['Sunken. The app ground.', m('--sunken')], ['Surface. Cards and every page.', m('--surface')], ['Raised. A second level inside a card.', m('--raised')],
      ['Card hairline', `${m('--divider')} at ${ctx.borders[0].px} px on a ${m('--sunken')} ground`],
      ['Dialog edge', `${ctx.borders[1].px} px in ${m('--text')}, on a ${m('--scrim')} ground`],
      ['Dialog shadow', `${m('--shadow-float')} is ${m(String(tokenGroups(ctx).shadow['shadow-float']))}`],
    ]);
    return kp(ctx, 'elevation', `${stage(ctx, 'elevation', `<div class="kel-2"><div><h3 class="kh">Ground steps</h3><div class="kstepl">${steps}</div></div><div><h3 class="kh">Hairline</h3>${card}</div></div><h3 class="kh kh--g">Floating</h3>${nb([5, 6], `<div class="ui-scrim kel-scrim">${dlg}</div>`, 'an-n--b')}`)}${grp('Key', k)}`, { lead: ctx.brand.ui.elevationNote });
  },

  states(ctx) {
    const S = sc(ctx), F = S.form, ui = ctx.ui, w = btnWord(ctx);
    const btn = (variant) => [undefined, 'hover', 'focus', 'pressed', 'disabled'].map((st) => ui.btn(w, { variant, state: st }));
    const chk = [ui.check('Tick'), noChange(), ui.check('Tick', { state: 'focus' }), noChange(), ui.check('Tick', { disabled: true })];
    const swt = [ui.switch('On', { checked: true }), noChange(), ui.switch('On', { checked: true, state: 'focus' }), noChange(), ui.switch('Off', { disabled: true })];
    const heads = [['Rest', ''], ['Hover', 1], ['Focus', 2], ['Pressed', 3], ['Disabled', 4]];
    const mxh = `<div class="kmx-h"></div>${heads.map(([c, k]) => `<div class="kmx-h">${k ? nb(k, A(c), 'an-n--b') : A(c)}</div>`).join('')}`;
    const grid = `<div class="kmx">${mxh}${mrow('Primary', btn('primary'))}${mrow('Secondary', btn('secondary'))}${mrow('Checkbox', chk)}${mrow('Switch', swt)}</div>`;
    const f = (id, label, o, k) => `<div class="kcell">${k ? nb(k, ui.field({ id, label: F.ready, value: F.readyValue, ...o }), 'an-n--b') : ui.field({ id, label: F.ready, value: F.readyValue, ...o })}${cap(label)}</div>`;
    const fields = `<div class="kg4 kg4--n">${f('st-r', 'Rest', {})}${f('st-f', 'Focus', { state: 'focus' }, 2)}${f('st-e', 'Error', { error: 'Add an email.' }, 5)}${f('st-d', 'Disabled', { disabled: true }, 4)}</div>`;
    const k = keyS([`Hover: ${m('--action-hover')}. Outlined controls fill ${m('--sunken')}.`, `Focus: ${ctx.borders[2].px} px ring in ${m('--focus')} on a ${ctx.borders[2].px} px gap.`, `Pressed: ${m('--action-pressed')} and the control scales to 0.97.`, `Disabled: ${m('--disabled-bg')} fill, ${m('--disabled-text')} type, and the reason sits beside it.`, `Error: ${m('--danger')} edge and a message under the field.`]);
    return kp(ctx, 'states', `${stage(ctx, 'states', `${grid}${fields}`)}${grp('Key', k)}`, { lead: 'Every control has the same five states, so one rule covers all of them.' });
  },

  buttons(ctx) {
    const S = sc(ctx), F = S.form, ui = ctx.ui, R = ctx.roles.light, ex = S.example;
    const act = role(ctx, 'action'), pnl = role(ctx, 'panel');
    const ctl = ctx.uiType.find((t) => t.token === 'control'), w = btnWord(ctx);
    const states = ['undefined', 'hover', 'focus', 'pressed', 'disabled'];
    const rowOf = (name, variant, label, marks = {}) => mrow(name, [undefined, 'hover', 'focus', 'pressed', 'disabled'].map((st, i) => { const b = ui.btn(label, { variant, state: st }); return marks[i] ? nb(marks[i], b) : b; }));
    const matrix = `<div class="kmx">${mx(['Default', 'Hover', 'Focus', 'Pressed', 'Disabled'])}${rowOf('Primary', 'primary', w, { 0: [1, 2], 1: 3, 2: 8 })}${rowOf('Secondary', 'secondary', ex.secondary)}${rowOf('Quiet', 'quiet', ex.quiet)}${rowOf('Danger', 'danger', 'Delete')}</div>`;
    const sizes = `<div class="ksz ksz--n">${[[ui.btn(ex.small, { size: 'sm', variant: 'secondary' }), '36', 'Small. Inside rows and cards.'], [nb([4, 5, 6, 7], ui.btn(F.book)), '44', 'Medium. The default.'], [ui.btn(F.book, { size: 'lg', iconRight: 'arrow-right' }), '52', 'Large. One per screen, at most.']].map(([b, h, t]) => `<div class="kcell">${dy(b, h, 'dm--s')}${cap('', A(t))}</div>`).join('')}</div>`;
    const k = key([['Fill', A(`${act.name} ${act.hex}`)], ['Label', A(`${nm(ctx, R.actionLabel)}, ${rt(ctx, R.actionLabel, R.action)}`)], ['Hover fill', A(`${nm(ctx, R.actionHover)} ${R.actionHover}, ${rt(ctx, R.actionLabel, R.actionHover)}`)], ['Height', '44 px'], ['Padding', `0 ${ctx.space[4].px} px`], ['Radius', `${ctx.radius.button} px`], ['Label type', A(`${ctx.brand.fonts.body.family} ${ctl.size} / ${ctl.weight}`)], ['Focus', A(`${ctx.borders[2].px} px ${nm(ctx, R.focus)}, ${ctx.borders[2].px} px offset`)]]);
    const ru = rules([`Hover turns ${A(nm(ctx, R.actionHover))}. A second, darker ${A(act.name)} would be one more colour to keep straight.`, `Disabled moves to ${A(pnl.name)}, so nobody reads a faded ${A(act.name)} as live.`, `Labels are verbs with the thing: ${A(F.book)}. Never OK or Submit.`, 'Two buttons side by side: primary on the right.']);
    return kp(ctx, 'buttons', `${stage(ctx, 'buttons', `${matrix}<h3 class="kh kh--g">Sizes</h3>${sizes}`)}<div class="kg2">${grp('Primary, measured', k)}${grp('Rules', ru)}</div>`, { lead: `Every screen has one primary button, and it says what happens next. ${F.book}, not Submit.` });
  },

  inputs(ctx) {
    const S = sc(ctx), F = S.form, ui = ctx.ui;
    const heads = ['Rest', 'Focus', 'Filled', 'Error', 'Disabled'];
    const st = (kind, extra = {}) => heads.map((h, i) => {
      const o = [{}, { state: 'focus' }, { value: kind === 'select' ? F.sizes[1] : F.pickupValue }, { error: kind === 'select' ? 'Choose how to send it.' : 'Add a client.' }, { disabled: true, value: kind === 'select' ? F.sizes[1] : F.pickupValue }][i];
      const fld = ui.field({ id: `in-${kind}${i}`, label: kind === 'select' ? F.size : F.pickup, kind, options: F.sizes, value: kind === 'select' ? F.sizes[0] : '', ...extra, ...o });
      return `<div class="kcell">${cap('', h)}${i === 0 ? `<div class="kfld">${fld}${dv(44, '44')}</div>` : fld}</div>`;
    }).join('');
    const ta = [['Rest', { help: F.notesHelp }], ['Filled', { value: 'Access via the side gate.' }], ['Error', { value: 'Access via the side gate.', error: 'Keep notes under 200 characters.' }]]
      .map(([h, o], i) => `<div class="kcell">${cap('', h)}${ui.field({ id: `in-ta${i}`, label: F.notes, kind: 'textarea', ...o })}</div>`).join('');
    return kp(ctx, 'inputs', stage(ctx, 'inputs', `<div class="kg2 kg2--f"><div class="kstack">${grp('Text field', st('input'))}</div><div class="kstack">${grp('Select', st('select'))}</div></div><div class="kgx">${grp('Textarea', `<div class="kg3">${ta}</div>`)}</div>`), { lead: 'A visible label sits above the field. A hint becomes the error.' });
  },

  choices(ctx) {
    const ui = ctx.ui, F = sc(ctx).form, X = sc(ctx).example;
    const heads = ['Off', 'On', 'Focus', 'Disabled', 'Disabled, on'];
    const last = (t) => t.split(' ').pop().replace(/^./, (c) => c.toUpperCase());
    const chk = (label, type, name) => [ui.check(label, { type, name: name + 1 }), ui.check(label, { type, name: name + 2, checked: true }), ui.check(label, { type, name: name + 3, state: 'focus', checked: true }), ui.check(label, { type, name: name + 4, disabled: true }), ui.check(label, { type, name: name + 5, disabled: true, checked: true })];
    const sw = (l) => [ui.switch(l), ui.switch(l, { checked: true }), ui.switch(l, { state: 'focus', checked: true }), ui.switch(l, { disabled: true }), ui.switch(l, { disabled: true, checked: true })];
    const mxh = `<div class="kmx-h"></div>${heads.map((c) => `<div class="kmx-h">${c === 'On' ? nb(3, A(c), 'an-n--b') : A(c)}</div>`).join('')}`;
    const grid = `<div class="kmx kmx--c">${mxh}${mrow(nb(1, 'Checkbox'), chk(last(X.checks[0]), 'checkbox', 'cb'))}${mrow('Radio', chk(X.radios[0], 'radio', 'rd'))}${mrow('Switch', sw(last(X.switches[1])))}</div>`;
    const seg = `<div class="k2">${cell(nb(2, ui.segmented(F.sizes, 1)), 'Segmented', 'One choice, and one is always selected. The selected segment fills with the text colour.')}${cell(ui.segmented(F.sizes, 0, { disabled: true }), 'Segmented, disabled', 'All the segments go grey together.')}</div>`;
    const form = grp('In a form', `<div class="kg2"><div class="kstack"><span class="ui-label">Choose any that apply</span>${X.checks.map((c, i) => ui.check(c, { name: 'fc' + i, checked: i === 0 })).join('')}</div><div class="kstack"><span class="ui-label">Take effect at once</span>${X.switches.map((c, i) => ui.switch(c, { checked: i === 0 })).join('')}</div></div>`);
    const k = keyS(['Checkbox for any number of options, radio for exactly one, switch for something that takes effect at once.', 'Two or three short options make a segmented control, not a dropdown.', `Selected fills with ${m('--action')}, and the tick is ${m('--action-label')}.`]);
    return kp(ctx, 'choices', `${stage(ctx, 'choices', `${grid}<h3 class="kh kh--g">Segmented</h3>${seg}`)}${form}${grp('Key', k)}`, { lead: 'Four ways to choose, each with the same five states.' });
  },

  cards(ctx) {
    const S = sc(ctx), ui = ctx.ui, X = S.example;
    const media = ctx.photo('ladder', { cls: 'ui-card__media' });
    const a = cell(`<div class="krc kwide">${ui.card({ media, meta: S.status, title: S.eta, text: S.pickup, action: `<div class="kcard-act">${ui.btn(X.small, { variant: 'secondary', size: 'sm' })}</div>` })}</div>`, 'With media', 'The photo takes 16 : 9 and the card keeps its hairline.');
    const b = cell(nb([1, 2], `<div class="krc kwide">${ui.card({ meta: S.status, title: S.rider, text: S.riderNote })}</div>`, 'an-n--b'), 'Without media', 'Meta, title, one line.');
    const c = cell(nb(3, `<div class="krc kwide">${ui.card({ meta: S.deliverToLabel, title: S.deliverTo, text: S.eta, raised: true })}</div>`, 'an-n--b'), 'Raised', `${m('--raised')} ground and no edge, for a second level.`);
    const d = cell(`<div class="kstats">${ui.stat(S.paid, S.paidLabel)}</div>`, 'Stat', 'One number and one label.');
    const T = (t) => ctx.uiType.find((x) => x.token === t);
    const k = key([['Padding', `${ctx.space[3].px} px`], ['Radius', `${ctx.radius.card} px`], ['Title type', A(`${ctx.brand.fonts.display.family} ${T('title-s').size} / ${T('title-s').weight}`)]]);
    const ru = rules([`A card holds one thing: a title, one line, and at most one small button.`, `Cards sit on ${m('--sunken')} with a ${ctx.borders[0].px} px ${m('--divider')} edge. Raised swaps the edge for a lighter ground.`]);
    return kp(ctx, 'cards', `${stage(ctx, 'cards', `<div class="kcards"><div class="kstack">${a}${c}</div><div class="kstack">${b}${d}</div></div>`)}<div class="kg2">${grp('Anatomy', k)}${grp('Rules', ru)}</div>`, { lead: 'The one container in the kit. Meta, then a title, then a line of detail.' });
  },

  navigation(ctx) {
    const ui = ctx.ui, S = sc(ctx), X = S.example, act = role(ctx, 'action');
    const items = [['Quotes', 'file-text'], ['Invoices', 'dollar-sign'], ['Clients', 'user']].map((x, i) => X.links[i] || x);
    const top = `<nav class="ui-topbar ktop" aria-label="Main">${wordmark(ctx)}<div class="ui-topbar__links">${ui.links(items, 0)}</div></nav>`;
    const side = `<nav class="ui-sidebar" aria-label="Sections">${ui.links(items, 0)}</nav>`;
    const bar = `<nav class="ui-tabbar" aria-label="Sections">${items.map(([t, i], k) => `<a href="#"${k === 0 ? ' aria-current="page"' : ''}>${ui.icon(i, 20)}${A(t)}</a>`).join('')}</nav>`;
    const g = (t, inner, c) => grp(t, `${inner}<span class="kcap kcap--after">${c}</span>`);
    const k = key([['Link height', '44 px'], ['Current marker', `3 px bar, ${A(act.name)}`], ['Current text', `${m('--text')}, others ${m('--text-soft')}`], ['Hover', `${m('--sunken')} fill`], ['Top bar', '56 px, hairline under'], ['Tab bar', '64 px, four columns']]);
    const ru = rules(['Mark the current place with a bar and heavier text, not colour alone.', 'Three or four destinations in the bar. More than that, group them.', 'Tabs change the view of one list. A link changes the page.']);
    const row1 = dy(nb([1, 3, 5], top, 'an-n--b'), '56', 'dm-y--b dm--s');
    return kp(ctx, 'navigation', `${stage(ctx, 'navigation', `${g('Top bar', row1, `The current page has a 3 px bar in ${A(act.name)} under it. Links are 44 px tall.`)}
<div class="kg2 kg2--n">${g('Tabs', ui.tabs(X.tabs, 0), 'Tabs switch views of the same list. They do not change the page.')}${g('Breadcrumbs', ui.crumbs([...X.crumbs, S.deliverTo]), 'Quiet, with the current page in full ink.')}</div>
<div class="kg2 kg2--n">${g('Sidebar', nb([2, 4], side, 'an-n--b'), 'A bar on the left marks the current page.')}${g('Mobile tab bar', dy(nb(6, `<div class="kbar">${bar}</div>`, 'an-n--b'), '64', 'dm-y--b dm--s'), 'Three or four destinations, 64 px tall.')}</div>`)}<div class="kg2">${grp('Measured', k)}${grp('Rules', ru)}</div>`, { lead: 'Where you are is always marked with the action colour and the word, never colour alone.' });
  },

  lists(ctx) {
    const ui = ctx.ui, S = sc(ctx), d = S.deliveries;
    const main = grp('With a leading icon and a status', `<div class="kls">${nl(1, 14)}${nl(2, 40)}${ui.deliveryRows(5)}</div>`);
    const second = grp('Without a lead', `<ul class="ui-list">${d.slice(0, 2).map((x) => ui.row({ title: x.to, sub: x.when, end: x.price })).join('')}</ul>`);
    const third = grp('As a link', `<div class="kls">${nl(3, 14)}<ul class="ui-list">${ui.row({ lead: ui.icon('file-text', 18), title: d[1].to, sub: d[1].when, end: d[1].price, href: '#' })}</ul></div>`);
    const k = keyS(['One row is one quote. The client is the title, the job and due date are the detail, and the status is the only coloured word.', 'Prices and dates use tabular figures, so a column lines up.', 'A row that opens is a link, and the whole row is the target.']);
    return kp(ctx, 'lists', `${stage(ctx, 'lists', `${main}<div class="kg2 kg2--n">${second}${third}</div>`)}${grp('Key', k)}`, { lead: 'A row says who, what and where it stands. Nothing else is allowed in it.' });
  },

  status(ctx) {
    // a status is words in one colour: the ratio is the words on the page ground, light and dark
    const meaning = { neutral: 'Not started, or not live yet.', info: 'With someone else, waiting on a reply.', danger: 'Needs action now. The label says how long.', success: 'Finished. The label says when.', warning: 'Worth a look soon. Nothing is broken.', action: 'The live state.' };
    const words = (tone, custom) => { const s = custom || { tone }; return [statusText(ctx, 'light', s), statusText(ctx, 'dark', s)]; };
    const ratios = (tone, custom) => { const [l, d] = words(tone, custom); return [rt(ctx, l.hex, ctx.roles.light.surface), rt(ctx, d.hex, ctx.roles.dark.surface)]; };
    const chipOf = (tone, label, mode) => `<span class="${mode === 'dark' ? 'ui kdk' : ''}" ${mode === 'dark' ? 'data-theme="dark"' : ''}><span class="ui-chip ui-chip--${tone}">${A(label)}</span></span>`;
    const row = (tone, label, chips, flag, custom) => { const [l, d] = words(tone, custom), [rl, rd] = ratios(tone, custom), tok = l.token === d.token ? m(l.token) : `${m(l.token)} light, ${m(d.token)} dark`;
      return `<div class="kst"><span class="kst-c">${chips}</span><span class="kst-t"><b>${A(meaning[tone])}${flag ? ` <i>${A(flag)}</i>` : ''}</b><span class="kcap">${tok} on the page ground. ${rl} light, ${rd} dark.</span></span></div>`; };
    const states = ctx.status.map((s) => row(s.tone || 'info', s.label, s.custom ? ctx.ui.statusChip(s.id) + `<span class="ui kdk" data-theme="dark">${ctx.ui.statusChip(s.id)}</span>` : chipOf(s.tone, s.label, 'light') + chipOf(s.tone, s.label, 'dark'), '', s.custom ? s : undefined)).join('');
    const tones = ['success', 'warning', 'danger', 'info'].filter((t) => !ctx.status.some((s) => s.tone === t)).map((t) => row(t, t[0].toUpperCase() + t.slice(1), chipOf(t, t[0].toUpperCase() + t.slice(1), 'light') + chipOf(t, t[0].toUpperCase() + t.slice(1), 'dark'), t === 'warning' && house(ctx, 'warning') ? HOUSE : '')).join('');
    const badges = `<div class="ui-tabs" role="tablist">${sc(ctx).example.tabs.map((t, i) => `<button role="tab" type="button" aria-selected="${i === 0}">${A(t)}${i ? ' <span class="ui-badge">' + (i === 1 ? 3 : 1) + '</span>' : ''}</button>`).join('')}</div>`;
    const k = keyS(['A status is words in one colour, with no fill. The ratio is the words on the page ground.', `A count badge sits on a tab or an icon: <span class="ui-badge">3</span>`, 'Every status is measured at 4.5 : 1 on the page ground, in light and in dark.']);
    const sheet = `<div class="kshe">${nb(1, `<h3 class="kh">${A(ctx.brand.name)}'s states</h3>`, 'an-n--b an-n--h')}<div class="ksl">${states}<div class="kst kst--g"><span class="kst-c"><h3 class="kh">Also in the kit</h3><span class="ui kdk" data-theme="dark"></span></span><span></span></div>${tones}</div><h3 class="kh kh--g">A count on a tab</h3>${nb(2, badges, 'an-n--b')}</div>`;
    return kp(ctx, 'status', `${stage(ctx, 'status', sheet.replace('<div class="kshe">', '<div class="kshe">'), { note: 'Light ground, then one dark panel' })}${grp('Key', k)}`, { lead: 'Each state is plain words in one colour, and a time or a count where it helps.' });
  },

  feedback(ctx) {
    const ui = ctx.ui, S = sc(ctx);
    const alerts = grp('Alert banners', `${nb(1, `<div class="kalerts">${ui.alert('info', S.pickup)}${ui.alert('success', S.toast)}${ui.alert('warning', S.alert)}${ui.alert('danger', S.form.readyError)}</div>`, 'an-n--b')}${house(ctx, 'warning') ? `<span class="kcap kcap--after">Warning is a ${A(HOUSE)}.</span>` : ''}`);
    const toast = grp('Toast', `<div class="kcell">${nb(2, ui.toast(S.toast))}<span class="kcap">Bottom of the screen, gone in five seconds. Undo stays reachable by keyboard.</span></div>`);
    const inline = grp('Inline message', `<div class="kcell">${nb(3, `<p class="ui-inline-msg">${ui.icon('info', 16)}${A(S.inline)}</p>`)}</div>`);
    const load = grp('Loading', `<div class="kload">${ui.spinner()}<div class="kskel">${ui.skeleton('180px')}${ui.skeleton('120px')}${ui.skeleton('150px')}</div></div><span class="kcap kcap--after">A spinner for a wait under a few seconds. A longer list gets skeleton lines in the shape of its rows.</span>`);
    const k = keyS(['Say what happened and what to do, in one or two sentences.', 'A banner stays until it is dealt with. A toast leaves by itself.', 'A banner has a 2 px edge and an icon in the tone colour. The words stay in the text colour.']);
    return kp(ctx, 'feedback', `${stage(ctx, 'feedback', `${alerts}<div class="kg2 kg2--n"><div class="kstack kstack--n">${toast}${inline}</div>${load}</div>`)}${grp('Key', k)}`, { lead: 'Four ways to say something happened, from the loudest to the quietest.' });
  },

  dialog(ctx) {
    const ui = ctx.ui, S = sc(ctx);
    const a = uniq(ui.dialog({ title: S.share, body: `Anyone with the link can see this quote: ${S.riderNote}.`, confirm: 'Copy link', keep: 'Close' }), 'dlg-a');
    const b = uniq(ui.dialog({ title: S.dialog.title, body: S.dialog.body, confirm: S.dialog.confirm, keep: S.dialog.keep, danger: true }), 'dlg-b');
    const dl = `<div class="k2 kdlg k2--n">${cell(nb([1, 2, 3, 4], `<div class="ui-scrim">${a}</div>`, 'an-n--b'), 'Modal', 'One action and a way out.')}${cell(nb(5, `<div class="ui-scrim">${b}</div>`, 'an-n--b'), 'Confirmation', 'The danger button names the action.')}</div>`;
    const ru = rules(['A dialog asks one thing. The title is the question, and the buttons answer it.', 'The safe answer is on the left, and it is the one the cursor lands on.', 'Danger is for what cannot be undone. The button says what it does: Delete draft, not Yes.', 'Esc and a click on the scrim close it.']);
    const k = key([['Width', '420 px at most'], ['Padding', `${ctx.space[5].px} px, shown at 20`], ['Edge', `${ctx.borders[1].px} px, ${m('--text')}`], ['Behind', `${m('--scrim')} ${m(colourMap(ctx, 'light').scrim)}`], ['Buttons', '44 px, safe first']]);
    return kp(ctx, 'dialog', `${stage(ctx, 'dialog', dl)}<div class="kg2">${grp('Measured', k)}${grp('Rules', ru)}</div>`, { lead: 'A dialog stops everything to ask one question. Use it rarely.' });
  },

  table(ctx) {
    const ui = ctx.ui, S = sc(ctx), act = role(ctx, 'action');
    const sortBtn = (t, dir) => `<button type="button">${A(t)}${dir ? ui.icon(dir === 'asc' ? 'arrow-up' : 'arrow-down', 14) : ''}</button>`;
    const rows = S.deliveries.map((d, i) => `<tr${i === 0 ? ' aria-selected="true"' : ''}${i === 2 ? ' class="is-hover"' : ''}><td>${A(d.to)}</td><td class="ui-num">${A(d.when)}</td><td>${ui.statusChip(d.status)}</td><td class="is-num">${A(d.price)}</td></tr>`).join('');
    const table = `<table class="ui-table"><thead><tr><th scope="col" aria-sort="ascending">${sortBtn(S.deliverToLabel, 'asc')}</th><th scope="col">${sortBtn('Job')}</th><th scope="col">Status</th><th scope="col" class="is-num">${sortBtn(S.paidLabel)}</th></tr></thead><tbody>${rows}</tbody></table>`;
    const keys = `<div class="k3 kkeys">${cap('Selected', 'First row')}${cap('Hover', 'Third row')}${cap('Sorted', `${A(S.deliverToLabel)}, ascending`)}</div>`;
    const ru = rules(['A sortable header is a button, and the sorted one shows its direction.', 'Numbers sit right and use tabular figures.', `Row states: rest, hover on pointer devices, and selected with a 3 px ${A(act.name)} bar on the left.`]);
    const k = key([['Header', '44 px, medium, 2 px rule below'], ['Row', '52 px, hairline between'], ['Selected', `${m('--raised')} and a 3 px ${m('--action')} bar`], ['Numbers', 'Right-aligned, tabular']]);
    const tw = `<div class="kls kls--t">${nl(1, 12)}${nl(2, 70)}${nl(3, 116)}${nl(4, 12, 'r')}<div class="ktbl">${table}</div></div>`;
    return kp(ctx, 'table', `${stage(ctx, 'table', `<h3 class="kh">Table</h3>${tw}${keys}`)}<div class="kg2">${grp('Measured', k)}${grp('Rules', ru)}</div>`, { lead: 'For comparing the same facts across many rows. For a short list of things, use a list.' });
  },

  empty(ctx) {
    const S = sc(ctx), F = S.form, ui = ctx.ui, E = S.empty;
    const none = `<div class="ui-empty"><h3 class="ui-empty__title">${A(E.title)}</h3><p class="ui-empty__text">${A(E.body)}</p>${ui.btn(E.cta)}</div>`;
    const first = `<div class="ui-empty kfirst"><h3 class="ui-empty__title">${A(F.title)}</h3><ol class="ksteps"><li><span>1</span>${A(F.pickup)}</li><li><span>2</span>${A(F.dropoff)}</li><li><span>3</span>${A(F.ready)}</li></ol>${ui.btn(F.book, { disabled: true })}<p class="ui-help">${A(F.bookWhy)}</p></div>`;
    const fail = `<div class="ui-empty"><h3 class="ui-empty__title">Could not load</h3><p class="ui-empty__text">Check your connection, then try again. Nothing you entered has been lost.</p>${ui.btn('Try again', { variant: 'secondary' })}</div>`;
    const k = keyS(['Say what is missing and offer the one action that fixes it.', 'First run lists what is needed, in the order it is asked.', 'A failure says what to do and that nothing is lost.', 'The empty state sits on a raised ground with no edge, so it does not read as a card.']);
    return kp(ctx, 'empty', `${stage(ctx, 'empty', `<div class="k2 kemp k2--n">${cell(nb([1, 4], none, 'an-n--b'), 'Empty', 'Nothing here yet.')}${cell(nb(2, first, 'an-n--b'), 'First run', 'Before the first quote.')}</div><div class="kgx">${cell(nb(3, fail, 'an-n--b'), 'Failed to load', 'The list could not be fetched.')}</div>`)}${grp('Key', k)}`, { lead: 'What a list says when it has nothing to show, or fails to load.' });
  },

  'screen-light': (ctx) => sheet(ctx, 'screen-light', false),
  'screen-dark': (ctx) => sheet(ctx, 'screen-dark', true),

  'screen-mobile'(ctx) {
    const S = sc(ctx), ui = ctx.ui;
    const cap1 = (t) => t.charAt(0).toUpperCase() + t.slice(1);
    const states = ctx.status.map((s) => {
      const d = S.deliveries.find((x) => x.status === s.id) || {};
      const tail = (d.when || '').split(', ').slice(1).join(', ');
      return `<li class="kstate"><span class="kstate-chip">${ui.statusChip(s.id)}</span><span class="ui-display kstate-line">${A(tail ? cap1(tail) : s.label)}</span></li>`;
    }).join('');
    const ph = dx(dy(phoneWindow(ctx), '520', 'dm--s'), '390', 'dm--s');
    return kp(ctx, 'screen-mobile', `${stage(ctx, 'screen-mobile', `<div class="kph-wrap">${ph}</div>`, { note: 'Drawn at 390 by 520. The client and the Call button stay in reach of the thumb.' })}${grp('The headline, state by state', `<ul class="kstates">${states}</ul>`)}`, { lead: 'The same screen at 390 px. The headline and the chip are all that changes between states.' });
  },

  tokens(ctx) {
    const g = tokenGroups(ctx), L = colourMap(ctx, 'light'), D = colourMap(ctx, 'dark');
    const sw = (c) => `<i class="kqsw" style="background:${c}"></i>`;
    const flag = (k) => (house(ctx, 'warning') && /^warning/.test(k) ? ' <sup>†</sup>' : '');
    const col = Object.keys(L).map((k) => `<div class="kq kq--3"><span class="mono">--${k}${flag(k)}</span><span class="kqv">${sw(L[k])}${m(L[k])}</span><span class="kqv">${sw(D[k])}${m(D[k])}</span></div>`).join('');
    const line = (k, v) => `<div class="kq kq--2"><span class="mono">--${k}</span>${m(v)}</div>`;
    const fam = (id) => ctx.brand.fonts[id].family;
    const sp = Object.entries(g.space).map(([k, v]) => line(k, v)).join('');
    const rd = Object.entries(g.radius).map(([k, v]) => line(k, v)).join('');
    const wd = Object.entries(g.width).map(([k, v]) => line(k, v)).join('');
    const ff = [['ff-display', fam('display')], ['ff-body', fam('body')], ['ff-mono', fam('mono')]].map(([k, v]) => `<div class="kq kq--2"><span class="mono">--${k}</span><span>${A(v)}</span></div>`).join('');
    const tx = ctx.uiType.map((t) => `<div class="kq kq--2"><span class="mono">${A(t.token)}</span>${m(`${t.size} / ${t.line} / ${t.weight}`)}</div>`).join('');
    const pal = ctx.colours.map((c) => `<div class="kq kq--2"><span class="mono">--palette-${A(c.id)}</span><span class="kqv">${sw(c.hex)}${m(c.hex)}</span></div>`).join('');
    const G = (t, inner, n) => `<div class="kqg kins"><div class="kins-h"><span>${A(t)}</span>${n ? `<span class="num">${n}</span>` : ''}</div><div class="kqb">${inner}</div></div>`;
    const note = house(ctx, 'warning') ? `<p class="kqn">† Warning is a ${A(HOUSE)}.</p>` : '';
    const cnt = (o) => Object.keys(o).length;
    return kp(ctx, 'tokens', `<div class="kqs"><div class="kqc">${G('Colour, light then dark', `<div class="kq kq--3 kq--h"><span></span><span>Light</span><span>Dark</span></div>${col}${note}`, cnt(L))}${G('Palette', pal, ctx.colours.length)}${G('Shadow', line('shadow-float', g.shadow['shadow-float']), 1)}</div><div class="kqc">${G('Space', sp, cnt(g.space))}${G('Radius', rd, cnt(g.radius))}${G('Border width', wd, cnt(g.width))}${G('Fonts', ff, 3)}${G('Type, size / line / weight', tx, ctx.uiType.length)}</div></div>`, { lead: 'Every value the kit ships, by name. The package has them as CSS, JSON and TypeScript.' });
  },

  code(ctx) {
    const F = sc(ctx).form;
    const files = [
      ['README.md', 'Install, use, token naming, light and dark, accessibility notes.'], ['tokens.css', 'Custom properties. Light on :root, dark on [data-theme="dark"] and the system setting.'],
      ['tokens.json', 'The same tokens in the W3C design token format, with a dark value on each colour.'], ['tokens.ts', 'A typed export of the same values.'], ['tailwind.css', 'A Tailwind CSS v4 @theme block mapped to the tokens.'],
      ['components.css', 'Classes for every component in this kit, built only on the tokens.'], ['example.html', 'Every component live, with a light and dark switch.'], ['fonts.css', `@font-face rules for ${[...new Set(ctx.faces.map((f) => f.family))].join(', ')}.`],
      ['assets/', 'The logo, 16 icons and the font files.'],
    ].map(([n, d]) => `<div class="kfile${n.endsWith('/') ? ' kfile--d' : ''}"><span class="mono">${A(n)}</span><span>${A(d)}</span></div>`).join('');
    const code = `<link rel="stylesheet" href="fonts.css">
<link rel="stylesheet" href="tokens.css">
<link rel="stylesheet" href="components.css">

<body class="ui">
  <button class="ui-btn" type="button">${F.book}</button>
</body>`;
    const tw = `@import "tailwindcss";
@import "./tokens.css";
@import "./tailwind.css";`;
    const block = (t, c) => `<div class="kins kcb"><div class="kins-h"><span>${A(t)}</span></div><pre class="ui kcode" data-theme="dark"><code>${A(c)}</code></pre></div>`;
    const ru = rules([`Plain CSS, no framework. Tokens name a job (${m('--surface')}, ${m('--action')}), so dark swaps the values and leaves the names.`]);
    return kp(ctx, 'code', `<div class="kins kfl"><div class="kins-h"><span>In the package</span><span class="num">${9} items</span></div><div class="kfiles">${files}</div></div>${block('Install', code)}<div class="kg2">${block('Dark mode', '<html data-theme="dark">')}${block('Tailwind v4', tw)}</div>${ru}`, { lead: 'One folder of plain files. Link three stylesheets and every component in this kit works.' });
  },
};
