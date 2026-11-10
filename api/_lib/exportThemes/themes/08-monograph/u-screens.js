// UI kit pages for theme 08, Riso: screen-light, screen-dark, screen-mobile, tokens, code. Styles are in css-u-screens.js (classes ru4-).
// The page is Wall, the paper. A screen is shown as a printed sheet: the paper edged by a hairline, a registration cross at each
// corner, crop marks round the trim, and the screen printed at the trim (in light its ground is the paper itself, so only the crop
// marks show its edge; in dark its ground prints as a solid). Composites only. Every sheet carries its job line: the brand colours its
// roles print in, by drum number, then the paper. The tokens and code pages are open pages: run sheets in columns, values in mono.
import { A, nameOf } from './helpers.js';
import { corners, drums, drumNo, paper, byRole, isSurface } from './guidelines-r.js';
import { colourMap, tokenGroups } from '../../engine/tokens.js';

const m = (s) => `<span class="r-mono">${A(s)}</span>`;
const sc = (ctx) => ctx.brand.ui.screen.content;
const titleOf = (ctx, id) => ctx.pages.find((p) => p.id === id).title;
// the palette (or tone) name for a hex, else the hex itself
const all = (ctx) => [...ctx.colours, ...(ctx.tones || []).map((t) => ({ ...(ctx.byId[t.id] || t), id: t.id }))];
const colOf = (ctx, hex) => all(ctx).find((x) => x.hex && x.hex.toLowerCase() === String(hex).toLowerCase());
const nm = (ctx, hex) => { const c = colOf(ctx, hex); return c ? (c.id ? nameOf(ctx, c.id) : c.name) : hex; };

// the UI kit page: the gate's running head, titled for the UI kit. The page is not a sheet, so it has no crosses.
function page(ctx, id, inner, cls = '') {
  const head = `<div class="r-hd"><span>${A(ctx.brand.name)}, UI kit</span><span class="num">${ctx.pageNo(id)}</span></div>`;
  return `<section class="pg r-pg ru4-pg ${cls}" data-page="${id}">${head}${inner}</section>`;
}
const top = (ctx, id, lead = '') => `<header class="r-top"><h2 class="r-h1">${A(titleOf(ctx, id))}</h2>${lead ? `<p class="r-lead">${lead}</p>` : ''}</header>`;

// crop marks round the trim, in the sheet's margin: at each corner a short line out along each edge, clear of the trim by g
const crop = (L = 18, g = 6) => ['top', 'bottom'].flatMap((v) => ['left', 'right'].map((h) =>
  `<i class="ru4-cm" style="${v}:0;${h}:-${g + L}px;width:${L}px;height:1px"></i><i class="ru4-cm" style="${h}:0;${v}:-${g + L}px;width:1px;height:${L}px"></i>`)).join('');
// a printed sheet: the paper with its crosses (in the text colour's ink), crop marks, and the thing printed at the trim
const sheet = (ctx, inner, cls = '') => `<div class="r-sheet ru4-sh ${cls}">${corners(byRole(ctx, 'text').hex, 15)}<div class="ru4-trim">${crop()}${inner}</div></div>`;

// the job line, one form for the whole book (copied as it stands from p-image.js): each drum the sheet prints, in drum order, then what it
// prints. Whatever is in the paper's colour is the paper showing through and closes the line; a tone that is no drum is named as it is.
function job(ctx, uses) {
  const D = drums(ctx), p = paper(ctx), by = new Map(), through = [], other = [];
  const hex_ = (h) => String(h).toLowerCase();
  for (const [hex, what] of uses) {
    const c = D.find((d) => hex_(d.hex) === hex_(hex));
    const t = ctx.colours.find((x) => hex_(x.hex) === hex_(hex)) || ctx.tones.find((x) => hex_(x.hex) === hex_(hex));
    if (c) { if (!by.has(c)) by.set(c, []); if (!by.get(c).includes(what)) by.get(c).push(what); } else if (isSurface(ctx, hex) || hex_(hex) === hex_(p.hex)) { if (!through.includes(what)) through.push(what); } else other.push([t ? t.name : '', what]);
  }
  const parts = D.filter((c) => by.has(c)).map((c) => `<span class="ru4-jd"><i class="ru4-sw" style="background:${c.hex}"></i>Drum ${drumNo(ctx, c)} ${A(c.name)}: ${by.get(c).join(', ')}.</span>`);
  const rest = other.map(([nm, what]) => `<span class="ru4-jd">${A(nm)}: ${what}.</span>`);
  const show = through.length ? [`<span class="ru4-jd">Paper ${A(p.name)}: ${through.join(', ')}.</span>`] : [];
  return `<p class="ru4-job">${[...parts, ...rest, ...show].join(' ')}</p>`;
}
// what the screen prints, for the job line: the ground, the text and edges, the action (and, on light, the field behind the screen)
// (dark text is a near-white that is no ink: it is the paper knocked out of the ground, so it prints as the paper)
const screenUses = (ctx, mode, field) => { const M = colourMap(ctx, mode); return [[M.surface, 'the ground'], [colOf(ctx, M.text) ? M.text : paper(ctx).hex, 'text and edges'], [M.action, 'the action'], ...(field ? [[field.hex, 'the field behind the screen']] : [])]; };

// the parts of the product screen, read from the brand's own screen content
const wordmark = (ctx) => `<strong class="ui-display">${A(ctx.brand.logo.showcase.wordmark)}</strong>`;
const progress = (S) => `<div class="ui-progress" role="progressbar" aria-label="Progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(S.progress * 100)}"><div class="ui-progress__bar"><i style="width:${S.progress * 100}%"></i></div><span class="ui-progress__dot" style="left:${S.progress * 100}%"></span></div><div class="ru4-route"><span>${A(S.from)}</span><span>${A(S.to)}</span></div>`;
// the person on the job: avatar and words on one line, the button under the words so a long name never runs into it
const riderRow = (ctx, S) => `<div class="ru4-rider"><span class="ui-avatar">${A(S.initials)}</span><div class="ru4-rmain"><p class="ru4-rname">${A(S.rider)}</p><p class="ru4-rsub">${A(S.riderNote)}</p></div><div class="ru4-rbtn">${ctx.ui.btn(S.call, { variant: 'secondary', size: 'sm' })}</div></div>`;
// a status chip whose label is a placeholder in the slot edition: the state names are the sample brand's own words
const stateOf = (ctx, id) => (ctx.status.find((s) => s.id === id) || { label: '' }).label;
const chip = (ctx, id) => ctx.ui.statusChip(id, { label: ctx.ph('ui.screen.content.status', stateOf(ctx, id)) });
// a word from the brand set inside a note: the compact form of a placeholder, so a note never grows a block
const tt = (s) => `<span class="ph-tight">${s}</span>`;
const detailRows = (S) => `<dl class="ru4-detail"><div><dt>${A(S.deliverToLabel)}</dt><dd>${A(S.deliverTo)}</dd></div><div><dt>${A(S.paidLabel)}</dt><dd class="ui-num">${A(S.paid)}</dd></div></dl>`;

// the desktop screen: the top bar, then the visit (headline time, status, route, the person, the details, share) beside the account's list
function desk(ctx, dark) {
  const S = sc(ctx), ui = ctx.ui, X = S.example, T = ctx.brand.ui.screen.title;
  const links = (X.links || []).map(([t]) => [t, null]);
  const rows = S.deliveries.slice(0, 4).map((d) => ui.row({ title: d.to, sub: d.when, end: d.price, chip: chip(ctx, d.status) })).join('');
  return `<div class="ui ru4-scr"${dark ? ' data-theme="dark"' : ''}>
<nav class="ui-topbar" aria-label="Main">${wordmark(ctx)}<div class="ui-topbar__links">${ui.links(links, 0)}</div></nav>
<div class="ru4-main"><section class="ru4-track" aria-label="${A(T)}"><p class="ru4-lbl">${A(T)}</p>
<div class="ru4-eta"><h3 class="ui-display ru4-time">${A(S.eta)}</h3>${chip(ctx, 'booked')}</div><p class="ru4-pickup ph-tight">${A(S.pickup)}</p>
<div class="ru4-prog">${progress(S)}</div>${riderRow(ctx, S)}${detailRows(S)}${ui.btn(S.share, { variant: 'secondary', block: true })}</section>
<section class="ru4-list" aria-label="${A(X.links[0][0])}"><p class="ru4-lbl">${A(X.links[0][0])}</p><ul class="ui-list">${rows}</ul><div class="ru4-book">${ui.btn(S.form.book)}</div></section></div></div>`;
}
// the page's one plain paragraph: sentences, no run-in labels, no grid
const para = (...s) => `<p class="ru4-np">${s.join(' ')}</p>`;
// the screen's rules as plain words. Dark runs them as sentences; light folds the same three into one sentence by its title.
const screenText = (ctx, dark) => {
  // in the slot the button's label is a placeholder, and its hint would break the sentence: say it in plain words there
  const act = byRole(ctx, 'action'), L = ctx.roles.light, book = ctx.edition === 'slot' ? 'the main action' : tt(A(sc(ctx).form.book)), edge = tt(A(nm(ctx, L.text)));
  if (dark) return `The time promise is the headline in every state. The status beside it says where things stand. ${tt(A(act.name))} is spent once: ${book}. Sharing takes an edge in ${edge}. The same screen and the same markup. Only the roles change; the button reads the same.`;
  return `The time promise is the headline in every state and the status beside it says where things stand; ${tt(A(act.name))} is spent once, on ${book}, and sharing takes an edge in ${edge}; the ground is ${tt(A(nm(ctx, L.surface)))}, and every colour is a role, none a palette name.`;
};

export const uScreens = {
  // light: the same placement as dark, the screen first and the title under it. The screen is printed on a full-bleed field of the accent
  // drum (the field is a plate of colour with the crosses at its corners; no text sits on it); the job line and the notes run under it
  'screen-light'(ctx) {
    const fld = byRole(ctx, 'accent') || paper(ctx);
    const band = `<div class="ru4-band" style="background:${fld.hex}">${corners(byRole(ctx, 'text').hex, 15)}<div class="ru4-trim">${crop()}${desk(ctx, false)}</div></div>`;
    const body = `<div class="ru4-sd ru4-sd--l">${band}<div class="ru4-sd__u">${job(ctx, screenUses(ctx, 'light', byRole(ctx, 'accent')))}
<div class="ru4-sd__foot"><h2 class="r-h1">${A(titleOf(ctx, 'screen-light'))}</h2>${para(screenText(ctx, false))}</div></div></div>`;
    return page(ctx, 'screen-light', body, 'ru4-pg--sd');
  },

  // dark: not light's layout. The title and the page's paragraph come first, above the figure; the sheet follows, its ground a solid
  // (its own edge, so the sheet has no hairline), the job line under it
  'screen-dark'(ctx) {
    const body = `<div class="ru4-sd ru4-sd--d">${sheet(ctx, desk(ctx, true), 'ru4-sh--desk')}${job(ctx, screenUses(ctx, 'dark'))}</div>`;
    return page(ctx, 'screen-dark', top(ctx, 'screen-dark', screenText(ctx, true)) + body, 'ru4-pg--sd ru4-pg--sdd');
  },

  // mobile: the phone printed tall at the left of the open page, its notes in a narrow column at the right, the job line at their foot
  'screen-mobile'(ctx) {
    const S = sc(ctx), ui = ctx.ui, act = byRole(ctx, 'action');
    // the tab bar: neutral words true for any brand, with the product screen's own title for the current tab
    const X = S.example, tb = [[X.links[0][1] || 'calendar', A(X.links[0][0])], [X.links[1][1] || 'ticket', A(X.links[1][0])], [X.links[2][1] || 'clock', A(X.links[2][0])], ['menu', 'More']];
    const phone = `<div class="ui ru4-ph"><div class="ru4-ph__top"><span class="ui-num">${A(S.time)}</span>${wordmark(ctx)}</div>
<div class="ru4-ph__body"><span class="ru4-ph__chip">${chip(ctx, 'booked')}</span><h3 class="ui-display ru4-ph__time">${A(S.eta)}</h3><p class="ru4-pickup ph-tight">${A(S.pickup)}</p>
<div class="ru4-prog">${progress(S)}</div>${riderRow(ctx, S)}${detailRows(S)}${ui.btn(S.share, { variant: 'secondary', block: true })}</div>
<nav class="ui-tabbar" aria-label="Main">${tb.map(([i, t], k) => `<a href="#"${k === 2 ? ' aria-current="page"' : ''}>${ui.icon(i, 20)}${t}</a>`).join('')}</nav></div>`;
    const text = para('Drawn at 390 px, light. It is one column, in the order a person needs it.', 'The time is the headline, with its status above it.',
      `The share button and the tab bar sit in the lower half, within reach. ${tt(A(act.name))} marks the current tab only.`, 'Every target is 44 px or more. The tab bar is 64 px.');
    const body = `<div class="r-body ru4-sm">${sheet(ctx, phone, 'ru4-sh--ph')}<div class="ru4-sm__side">${text}${job(ctx, screenUses(ctx, 'light'))}</div></div>`;
    return page(ctx, 'screen-mobile', top(ctx, 'screen-mobile') + body, 'ru4-pg--sm');
  },

  // the tokens as the press's run sheets: the colour roles in three columns (each a split field, light left and dark right, with both
  // values), then the other groups side by side; space is drawn to length
  tokens(ctx) {
    const g = tokenGroups(ctx), L = colourMap(ctx, 'light'), D = colourMap(ctx, 'dark');
    const col = Object.keys(L).map((k) => `<li class="ru4-ct"><span class="ru4-ct__f r-hair"><i style="background:${L[k]}"></i><i style="background:${D[k]}"></i></span><span class="ru4-ct__t"><span class="r-mono ru4-ct__n">--${k}</span><span class="ru4-ct__v">${m(L[k])}${m(D[k])}</span></span></li>`).join('');
    const fam = (id) => ctx.brand.fonts[id].family;
    const ent = (k, v, mono = true) => `<div><dt class="r-mono">${A(k)}</dt><dd>${mono ? m(v) : A(v)}</dd></div>`;
    const of = (o) => Object.entries(o).map(([k, v]) => ent('--' + k, v)).join('');
    const grp = (title, note, inner, cls = '') => `<section class="ru4-tg ${cls}"><h3 class="r-tg__h">${A(title)}</h3><p class="ru4-tg__n">${note}</p>${inner}</section>`;
    const sp = Object.entries(g.space), maxPx = Math.max(...ctx.space.map((s) => s.px));
    const space = `<dl class="ru4-sp">${sp.map(([k, v], i) => `<div><dt class="r-mono">--${A(k)}</dt><dd><i style="width:${Math.round((ctx.space[i].px / maxPx) * 96)}px"></i>${m(v)}</dd></div>`).join('')}</dl>`;
    const ff = [['ff-display', fam('display')], ['ff-body', fam('body')], ['ff-mono', fam('mono')]].map(([k, v]) => ent('--' + k, v, false)).join('');
    const tx = ctx.uiType.map((t) => ent(t.token, `${t.size} / ${t.line} / ${t.weight}`)).join('');
    // the radius note reads the corners from the brand (square for Long Room; the old note hard-coded square for any brand)
    const R = ctx.radius, rs = [...new Set(['control', 'button', 'input', 'chip', 'card'].map((k) => R[k]))].sort((a, b) => a - b);
    const corner = rs.length === 1 ? (rs[0] === 0 ? 'Corners are square.' : `Corners are ${rs[0]} px.`) : `Corners run from ${rs[0]} to ${rs[rs.length - 1]} px.`;
    const key = '<p class="ru4-tk">Each field is split: light on the left, dark on the right, with the two values under it.</p>';
    return page(ctx, 'tokens', `${top(ctx, 'tokens', 'Every colour is a role that names a job, never a palette name.')}
<div class="r-body ru4-tok"><h3 class="r-tg__h">Colour</h3><ul class="ru4-cts">${col}</ul>${key}
<div class="ru4-tgs">${grp('Space', `A ${ctx.space[0].px} px base, ${m('--' + sp[0][0])} to ${m('--' + sp[sp.length - 1][0])}.`, space)}
<div class="ru4-tgc">${grp('Radius', `${corner} Only ${m('--r-round')} is a pill.`, `<dl class="ru4-te">${of(g.radius)}</dl>`)}${grp('Line and depth', 'Border widths, then the one shadow.', `<dl class="ru4-te">${of(g.width) + of(g.shadow)}</dl>`)}</div>
<div class="ru4-tgc">${grp('Fonts', 'Titles, reading, and values.', `<dl class="ru4-te ru4-te--st">${ff}</dl>`)}${grp('Type', 'Size, line height and weight, in px.', `<dl class="ru4-te">${tx}</dl>`)}</div></div></div>`, 'ru4-pg--tk');
  },

  // code: the install lines as a full-width Ink block (the one large thing, its own edge), then the Tailwind lines as a smaller block with the
  // notes beside it; the package's files run across the foot as a run sheet in three columns
  code(ctx) {
    const F = sc(ctx).form;
    const files = [
      ['README.md', 'Install, use, token names, dark mode.'], ['tokens.css', 'Custom properties, light and dark.'],
      ['tokens.json', 'The same, in the W3C token format.'], ['tokens.ts', 'A typed export of the same values.'], ['tailwind.css', 'A Tailwind v4 @theme block.'],
      ['components.css', 'A class for every component here.'], ['example.html', 'Every component live, light and dark.'], ['fonts.css', `@font-face for ${[...new Set(ctx.faces.map((f) => f.family))].join(' and ')}.`],
      ['assets/', 'The logo, icons and font files.'],
    ].map(([n, d]) => `<li><span class="r-mono ru4-fn">${A(n)}</span><span class="ru4-fd">${A(d)}</span></li>`).join('');
    const code = `<link rel="stylesheet" href="fonts.css">
<link rel="stylesheet" href="tokens.css">
<link rel="stylesheet" href="components.css">

<body class="ui">
  <button class="ui-btn" type="button">${F.book}</button>
</body>`;
    const tw = `@import "tailwindcss";
@import "./tokens.css";
@import "./tailwind.css";`;
    const pre = (c) => `<pre class="ui ru4-code" data-theme="dark"><code>${A(c)}</code></pre>`;
    const fig = (h, n, c) => `<figure class="ru4-cf"><figcaption><h3 class="r-tg__h">${A(h)}</h3>${n ? `<p class="ru4-tg__n">${A(n)}</p>` : ''}</figcaption>${pre(c)}</figure>`;
    const text = para(`Plain CSS, no framework. Copy the folder, link three stylesheets, and put class ${m('ui')} on the body.`,
      `Colour tokens name a job: ${m('--surface')}, ${m('--text')}, ${m('--action')}. Dark swaps the values and leaves the names.`,
      `Controls are real elements. State is carried by ${m('disabled')}, ${m('aria-invalid')}, ${m('aria-pressed')} and ${m('aria-current')}.`,
      `Set ${m('data-theme="dark"')} on the html element.`);
    return page(ctx, 'code', `${top(ctx, 'code')}
<div class="r-body ru4-cd">${fig('Install', 'Three stylesheets, one class.', code).replace('ru4-cf', 'ru4-cf ru4-cf--wide')}${fig('Tailwind v4', null, tw)}<div class="ru4-cd__text">${text}</div>

<section class="ru4-pk"><h3 class="r-tg__h">In the package</h3><ul class="ru4-files">${files}</ul></section></div>`, 'ru4-pg--cd');
  },
};
