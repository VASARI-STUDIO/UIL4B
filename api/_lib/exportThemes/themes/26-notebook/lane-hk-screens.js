// Theme 26, Notebook, lane hk: the screens and code pages of the kit site (dialog, table, empty, three screens, tokens, code).
import { tokenGroups, tokensCss, tailwindCss, colourMap } from '../../engine/tokens.js';
import { componentsCss, iconSet } from '../../engine/components.js';
import { kitColours, modeLabel } from './lane-u1.js';
import { sc, ex, ut, E, uid, piece, says, ladder, pair, appendix, sec, note, mono, ink, name, cap, ratio, tapeTab } from './lane-hk-parts.js';

const body = (...parts) => `<div class="hk-body">${parts.join('')}</div>`;
// a value as the shipped components.css writes it, so a measurement printed on a page is the shipped one
const cache = new WeakMap();
function shipped(ctx, sel, prop) {
  if (!cache.has(ctx)) cache.set(ctx, componentsCss(ctx));
  const css = cache.get(ctx), key = `\n${sel} {`, i = css.indexOf(key);
  if (i < 0) throw new Error(`notebook hk: ${sel} is not in componentsCss`);
  const m = new RegExp(`(?:^|;)\\s*${prop}:\\s*([^;]+)`).exec(css.slice(i + key.length, css.indexOf('}', i)));
  if (!m) throw new Error(`notebook hk: ${sel} has no ${prop}`);
  return m[1].trim();
}
const shippedPx = (ctx, sel, prop) => parseFloat(shipped(ctx, sel, prop));
const logoSpan = (ctx, mode) => {
  const g = ctx.logo.geos.colour || ctx.logo.geos.primary, lw = 96, lh = g ? Math.round(lw * g.h / g.w) : 24, rev = ctx.brand.logo.colourways.reversed;
  return `<span style="display:block;width:${lw}px;min-height:${lh}px">${mode === 'dark' ? ctx.logo.html('reversed', { width: lw, color: rev.name }) : ctx.logo.html('colour', { width: lw })}</span>`;
};
const topbar = (ctx, mode, active) => `<nav class="ui-topbar" aria-label="Main ${uid('nav')}">${logoSpan(ctx, mode)}<div class="ui-topbar__links">${ctx.ui.links(ex(ctx).links.slice(0, 3), active)}</div></nav>`;
const liveStatus = (ctx) => (ctx.status.find((s) => s.label === sc(ctx).status) || {}).id || sc(ctx).deliveries[0].status;
const facts = (ctx) => { const S = sc(ctx); return `<dl class="hk-dl"><div><dt>${E(ctx, S.deliverToLabel)}</dt><dd>${E(ctx, S.deliverTo)}</dd></div><div><dt>${E(ctx, S.paidLabel)}</dt><dd class="ui-num">${E(ctx, S.paid)}</dd></div></dl>`; };
function liveBlock(ctx) {
  const S = sc(ctx), p = Math.max(0, Math.min(1, S.progress || 0)) * 100;
  const prog = `<div class="hk-prog"><div class="ui-progress" role="img" aria-label="${E(ctx, S.from)} to ${E(ctx, S.to)}"><div class="ui-progress__bar"><i style="width:${p}%"></i></div><span class="ui-progress__dot" style="left:${p}%"></span></div><div class="hk-ends ui-num"><span>${E(ctx, S.from)}</span><span>${E(ctx, S.to)}</span></div></div>`;
  const rider = `<div class="hk-rider"><span class="ui-avatar">${E(ctx, S.initials)}</span><div class="hk-who"><p>${E(ctx, S.rider)}</p><p class="ui-num">${E(ctx, S.riderNote)}</p></div>${ctx.ui.btn(S.call, { variant: 'secondary', size: 'sm' })}</div>`;
  return `<div class="hk-live">${ctx.ui.statusChip(liveStatus(ctx))}<h2 class="ui-display hk-eta">${E(ctx, S.eta)}</h2><p class="hk-soft">${E(ctx, S.pickup)}</p>${prog}${rider}</div>`;
}
const crumbTitle = (ctx) => { const c = ex(ctx).crumbs; return c[c.length - 1]; };
const listScreen = (ctx, mode) => { const X = ex(ctx), ui = ctx.ui; return `<div class="hk-scr">${topbar(ctx, mode, 0)}<div class="hk-bodyin">${ui.crumbs(X.crumbs)}<h2 class="ui-display hk-h">${E(ctx, crumbTitle(ctx))}</h2>${ui.tabs(X.tabs, 0)}${ui.deliveryRows(5)}</div></div>`; };
function formScreen(ctx, mode) {
  const S = sc(ctx), F = S.form, X = ex(ctx), ui = ctx.ui;
  return `<div class="hk-scr">${topbar(ctx, mode, -1)}<div class="hk-bodyin">${ui.crumbs([X.crumbs[0], F.title])}<h2 class="ui-display hk-h">${E(ctx, F.title)}</h2><div class="hk-form">`
    + `${ui.field({ id: uid('f1'), label: F.pickup, value: F.pickupValue || '' })}${ui.field({ id: uid('f2'), label: F.dropoff, value: F.dropoffValue || '' })}${ui.field({ id: uid('f3'), label: F.size, kind: 'select', options: F.sizes || [], value: (F.sizes || [])[1] })}${ui.btn(F.book, { block: true })}</div></div></div>`;
}
const liveScreen = (ctx, mode) => `<div class="hk-scr">${topbar(ctx, mode, 0)}<div class="hk-bodyin">${liveBlock(ctx)}${facts(ctx)}${ctx.ui.btn(sc(ctx).share, { variant: 'secondary', block: true })}</div></div>`;

// ---- dialog: the scrim and the box, light then dark, with each part named ----
function dialog(ctx) {
  const D = sc(ctx).dialog, M = kitColours(ctx, 'light'), Dk = kitColours(ctx, 'dark'), r = (a, b) => ratio(ctx, a, b);
  const maxW = shippedPx(ctx, '.ui-dialog', 'max-width'), pad = shippedPx(ctx, '.ui-dialog', 'padding'), bw = ctx.brand.ui.border, tt = ut(ctx, 'title-s'), shadow = tokenGroups(ctx).shadow['shadow-float'];
  const scrim = (mode) => piece(ctx, mode, `<div class="hk-scrim"><div class="ui-scrim">${ctx.ui.dialog({ ...D, danger: true }).replace(/dlg-t/g, uid('dlg'))}</div></div>`, { label: `Scrim, ${modeLabel(mode).toLowerCase()}`, cls: 'hk-flush' });
  const parts = [
    ['Box', `${maxW} px wide at most, ${pad} px inside, a ${bw} px edge in the text colour, ${shadow === 'none' ? 'and no shadow' : 'and a floating shadow'}.`, `--shadow-float ${shadow}`],
    ['Question', `The title asks it, in the display face at ${tt.size} / ${tt.line}.`],
    ['Next', 'One or two sentences in the soft text colour, read before anyone chooses.', `--text-soft ${M['text-soft']}, ${r(M['text-soft'], M.surface)}`],
    ['Answers', `The way out first, ${D.keep}, then the one that does it, ${D.confirm}, on the right.`, `--danger ${M.danger}, label ${r(M.surface, M.danger)}`],
  ];
  return body(ladder([[scrim('light'), `<div class="hk-sec">${parts.map(([n, w, v]) => says(ctx, n, w, v)).join('')}</div>`], [scrim('dark'), says(ctx, 'Dark', 'The scrim and the box step to their dark values. Nothing is redrawn.', `--scrim ${Dk.scrim}, --surface ${Dk.surface}`)]]));
}

// ---- table ----
function table(ctx) {
  const S = sc(ctx), ui = ctx.ui, M = kitColours(ctx, 'light');
  const thH = shippedPx(ctx, '.ui-table th', 'height'), tdH = shippedPx(ctx, '.ui-table td', 'height');
  const bar = /inset (\d+(?:\.\d+)?)px 0 0/.exec(shipped(ctx, '.ui-table tbody tr[aria-selected="true"]', 'box-shadow'))[1];
  const heads = [S.deliverToLabel, 'Status', S.paidLabel];
  const tbl = (n) => `<div class="hk-tbl"><table class="ui-table"><thead><tr><th scope="col" aria-sort="ascending"><button type="button">${E(ctx, heads[0])}${ui.icon('arrow-up', 14)}</button></th><th scope="col">${E(ctx, heads[1])}</th><th scope="col" class="is-num">${E(ctx, heads[2])}</th></tr></thead><tbody>${S.deliveries.slice(0, n).map((d, i) => `<tr${i === 0 ? ' aria-selected="true"' : ''}${i === 2 ? ' class="is-hover"' : ''}><td>${E(ctx, d.to)}</td><td>${ui.statusChip(d.status)}</td><td class="is-num">${E(ctx, d.price)}</td></tr>`).join('')}</tbody></table></div>`;
  return body(
    ladder([[piece(ctx, 'light', tbl(4), { label: 'Table, light' }), `<div class="hk-sec">${says(ctx, 'Sorted', `${heads[0]}, A to Z. A header that sorts is a button and shows its arrow.`)}${says(ctx, 'Selected', `The raised ground and a ${bar} px bar in the action colour.`, `--raised ${M.raised}, --action ${M.action}`)}${says(ctx, 'Hover', 'The raised ground, on a pointer only.')}</div>`]]),
    piece(ctx, 'dark', tbl(3), { label: 'Table, dark' }),
    note(ctx, `Rows are ${tdH} px and the header ${thH} px, with a 1 px divider between rows. Status is in words, never a colour alone. Totals sit right in tabular figures.`),
  );
}

// ---- empty ----
function empty(ctx) {
  const S = sc(ctx), E_ = S.empty, ui = ctx.ui, hd = ut(ctx, 'headline');
  const emp = `<div class="ui-empty"><h3 class="ui-empty__title">${E(ctx, E_.title)}</h3><p class="ui-empty__text">${E(ctx, E_.body)}</p>${ui.btn(E_.cta)}</div>`;
  const sk = (a, b) => `<li><div class="ui-row"><span class="ui-row__lead"></span><div class="hk-skr">${ui.skeleton(a)}${ui.skeleton(b)}</div></div></li>`;
  const loading = `<ul class="ui-list" aria-busy="true">${sk('62%', '38%')}${sk('48%', '30%')}${sk('56%', '42%')}</ul>`;
  return body(
    sec(ctx, '', `${piece(ctx, 'light', emp, { label: 'Empty' })}${note(ctx, `The title is the headline size, ${hd.size} / ${hd.line}, on the raised ground with no edge, so it never reads as a card. It always offers the next step as a button.`)}`),
    sec(ctx, '', `${piece(ctx, 'light', loading, { label: 'Loading' })}${note(ctx, 'The list keeps its shape while it loads, so nothing jumps.')}`),
    piece(ctx, 'dark', emp, { label: 'Empty, dark' }),
  );
}

// ---- screens ----
const screens = (ctx, mode, a, b, notes) => body(pair(`<div class="hk-sec">${piece(ctx, mode, a[1], { label: a[0], cls: 'hk-flush' })}${note(ctx, notes[0])}</div>`, `<div class="hk-sec">${piece(ctx, mode, b[1], { label: b[0], cls: 'hk-flush' })}${note(ctx, notes[1])}</div>`));
const screenLight = (ctx) => screens(ctx, 'light', [ex(ctx).crumbs.join(', '), listScreen(ctx, 'light')], [sc(ctx).form.title, formScreen(ctx, 'light')],
  ['The list: top bar, links, crumbs, tabs and list rows.', `The form: fields stacked, labels above, and one filled button. ${sc(ctx).form.book} is the only action fill on the screen.`]);
const screenDark = (ctx) => screens(ctx, 'dark', [sc(ctx).eta, liveScreen(ctx, 'dark')], [ex(ctx).crumbs.join(', '), listScreen(ctx, 'dark')],
  ['The live screen after dark: the status word, the live line at the largest size the kit sets, the progress and the facts.', 'The same list as the light page, under data-theme="dark". Only the token values change, so nothing is restyled for the night.']);
function mobile(ctx) {
  const S = sc(ctx), ui = ctx.ui, X = ex(ctx), tabs = [...X.links.slice(0, 3), [X.account, 'user']];
  const tabbar = `<nav class="ui-tabbar" aria-label="Sections">${tabs.map(([t, i], n) => `<a href="#"${n === 0 ? ' aria-current="page"' : ''}>${ui.icon(i, 20)}${E(ctx, t)}</a>`).join('')}</nav>`;
  const phone = `<div class="hk-phone"><div class="hk-sbar ui-num"><span>${E(ctx, S.time)}</span></div><div class="hk-pbar">${logoSpan(ctx, 'dark')}<span class="ui-avatar">${E(ctx, S.initials)}</span></div><div class="hk-pad">${liveBlock(ctx)}</div><div class="hk-pfoot">${facts(ctx)}${ui.btn(S.share, { variant: 'secondary', block: true })}</div>${tabbar}</div>`;
  return body(sec(ctx, '', `${piece(ctx, 'dark', phone, { label: 'Whole screen', cls: 'hk-flush' })}${note(ctx, 'A phone a little over 390 px wide. Everything stacks in one column and the live line stays the largest type on it.')}${note(ctx, 'The action and the tab bar sit in the lower half, where a thumb reaches, and every target is at least 44 px tall.')}`));
}

// ---- tokens ----
function tokensPage(ctx) {
  const L = colourMap(ctx, 'light'), D = colourMap(ctx, 'dark'), g = tokenGroups(ctx);
  const roles = `<div class="hk-roles"><span class="hk-r" style="grid-column:1/3">Swatch</span><span class="hk-r">Role</span><span class="hk-r hk-x">Light</span><span class="hk-r hk-x">Dark</span>`
    + Object.keys(L).map((k) => `<i style="background:${L[k]}"></i><i style="background:${D[k]}"></i><span class="hk-r">--${E(ctx, k)}</span><span class="hk-x">${E(ctx, L[k])}</span><span class="hk-x">${E(ctx, D[k])}</span>`).join('') + '</div>';
  const kv = (title, list) => sec(ctx, title, `<dl class="hk-kv">${list.map(([k, v]) => `<dt>${E(ctx, k)}</dt><dd>${E(ctx, v)}</dd>`).join('')}</dl>`);
  return body(
    sec(ctx, 'Colour, light and dark', `${roles}${note(ctx, 'Light is on :root. Dark is on [data-theme="dark"], and on prefers-color-scheme when no theme is set. Each swatch is the value the package ships.')}`),
    pair(`<div class="hk-sec">${kv('Space', Object.entries(g.space).map(([k, v]) => ['--' + k, v]))}${kv('Radius', Object.entries(g.radius).map(([k, v]) => ['--' + k, v]))}${kv('Lines', [...Object.entries(g.width), ['shadow-float', g.shadow['shadow-float']]].map(([k, v]) => ['--' + k, v]))}</div>`,
      `<div class="hk-sec">${kv('Palette', ctx.colours.map((c) => ['--palette-' + c.id, c.hex]))}${kv('Type, size line weight', ctx.uiType.map((t) => [t.token, `${t.size}px ${t.line}px ${t.weight}`]))}</div>`),
    kv('Fonts', Object.entries(g.font).map(([k, v]) => ['--' + k, v])),
    note(ctx, 'Type tokens are --fs-, --lh- and --fw- followed by the name. Every value here is read from tokens.css as the package ships it.'),
  );
}

// ---- code ----
function code(ctx) {
  const F = sc(ctx).form;
  const install = `<link rel="stylesheet" href="fonts.css">\n<link rel="stylesheet" href="tokens.css">\n<link rel="stylesheet" href="components.css">\n\n<body class="ui">\n  <button class="ui-btn" type="button">\n    ${F.book}\n  </button>\n</body>`;
  const want = ['surface', 'text', 'action', 'action-label'], blocks = tokensCss(ctx).split('\n');
  const cut = (open) => {
    const i = blocks.indexOf(open), out = [open];
    for (let j = i + 1; j < blocks.length && blocks[j] !== '}'; j++) if (want.some((w) => blocks[j].startsWith(`  --${w}:`))) out.push(blocks[j]);
    if (i < 0 || out.length !== want.length + 1) throw new Error(`notebook hk: tokens.css has no ${open} block with ${want.join(', ')}`);
    return [...out, '}'].join('\n');
  };
  const cssCut = `${cut(':root {')}\n${cut('[data-theme="dark"] {')}`;
  const tw = tailwindCss(ctx).split('\n'), ti = tw.indexOf('@theme inline {');
  const twCut = [tw[ti], ...tw.slice(ti + 1).filter((l) => ['surface', 'text', 'action'].some((w) => l.startsWith(`  --color-${w}:`))), '}'].join('\n');
  const box = (label, txt) => `<div class="hk-pc hk-code hk-lt">${tapeTab(ctx, label)}<button type="button" class="hk-btn" data-copy="${E(ctx, txt)}" data-copy-name="${E(ctx, label)}"><span data-copy-text>Copy</span></button><pre>${E(ctx, txt)}</pre></div>`;
  const fams = [...new Set(ctx.faces.map((f) => f.family))];
  const files = [['README.md', 'How to install and use the kit.'], ['tokens.css', 'Custom properties, light and dark.'], ['tokens.json', 'The same tokens in the W3C format.'], ['tokens.ts', 'A typed export of the same values.'], ['tailwind.css', 'A Tailwind CSS v4 @theme block.'], ['components.css', 'Every component, built on the tokens.'], ['example.html', 'Every component live, light and dark.'], ['fonts.css', `@font-face rules for ${fams.length} families.`], ['assets/', `The logo, ${iconSet(ctx).length} icons and the fonts.`]];
  return body(
    pair(`<div class="hk-sec">${box('Install', install)}${box('Dark mode', '<html data-theme="dark">')}</div>`, `<div class="hk-sec">${box('From tokens.css', cssCut)}${box('From tailwind.css', twCut)}</div>`),
    note(ctx, 'Four colour roles are cut from the file the package ships, light then dark. The rest follow the same pattern.'),
    sec(ctx, 'In the package', `<dl class="hk-files">${files.map(([n, d]) => `<dt>${E(ctx, n)}</dt><dd>${E(ctx, d)}</dd>`).join('')}</dl>`),
  );
}

export const screensPages = { dialog, table, empty, 'screen-light': screenLight, 'screen-dark': screenDark, 'screen-mobile': mobile, tokens: tokensPage, code };
