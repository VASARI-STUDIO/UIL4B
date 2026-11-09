// UI kit pages for theme 02, Ticket: screen-light, screen-dark, screen-mobile, tokens, code. Styles are in css-u-screens.js (classes start tu4-).
// Open pages on Stock (screen-dark on Night, the one page after dark in this run). The ticket's parts are edge devices here: the perforation
// as a rule between a body and a stub column or between rows, serials as running numbers, fact fields label over value. The product
// screens are Encore's ticket as shipped, drawn by the app itself in the brand's ui roles (as Trainline and Fly Delta show a booking):
// one code on the stub, the facts label over value. The components are the engine's (ctx.ui). No hex is written here.
import { A, fit } from './helpers.js';
import { page, fields, perf, serial, byRole, hexName } from './gate.js';
import { colourMap, tokenGroups } from '../../engine/tokens.js';

const sc = (ctx) => ctx.brand.ui.screen.content;
const m = (s) => `<span class="tu4-mono">${A(s)}</span>`;
// the perforation as a rule on an open page: holes in the quiet ink of the ground it sits on
const holes = (ctx, night) => (night ? ctx.roles.dark : ctx.roles.light).quiet;
const hRule = (ctx, night = false, cls = '') => `<div class="tu4-hr ${cls}" aria-hidden="true">${perf(holes(ctx, night), { d: 3, p: 9, dir: 'h' })}</div>`;
const vRule = (ctx, night = false, cls = '') => `<div class="tu4-vr ${cls}" aria-hidden="true">${perf(holes(ctx, night), { d: 3, p: 9 })}</div>`;
// the app's own tear line, in its divider role (the screen draws it, so it takes the screen's mode)
const appPerf = (ctx, dark, dir = 'v') => perf((dark ? ctx.roles.dark : ctx.roles.light).divider, { d: 4, p: 10, dir });

// the booking code on the stub: eight digits, true for any brand, drawn as an Interleaved 2 of 5 barcode
// (the symbology for an even run of digits): each pair of digits is five bars and five spaces, two of each five wide.
const CODE = '4821 0913', DIGITS = '48210913';
const I25 = ['nnwwn', 'wnnnw', 'nwnnw', 'wwnnn', 'nnwnw', 'wnwnn', 'nwwnn', 'nnnww', 'wnnwn', 'nwnwn'];
function barcode(u = 2, h = 56) {
  const W = u * 2.5, seq = ['n', 'n', 'n', 'n']; // start: bar, space, bar, space, all narrow
  for (let i = 0; i < DIGITS.length; i += 2) { const a = I25[+DIGITS[i]], b = I25[+DIGITS[i + 1]]; for (let k = 0; k < 5; k++) seq.push(a[k], b[k]); }
  seq.push('w', 'n', 'n'); // stop: wide bar, narrow space, narrow bar
  let x = 0; const bars = [];
  seq.forEach((s, i) => { const w = s === 'w' ? W : u; if (i % 2 === 0) bars.push(`<rect x="${x}" y="0" width="${w}" height="${h}"/>`); x += w; });
  return `<svg class="tu4-bc" role="img" aria-label="Barcode for ${CODE}" width="${x}" height="${h}" viewBox="0 0 ${x} ${h}" fill="currentColor">${bars.join('')}</svg>`;
}

// the run on the ticket body: where the item starts and where it ends, the brand's own two words (placeholders in the slot edition)
const route = (ctx) => { const S = sc(ctx); return `<p class="tu4-route"><span>${A(S.from)}</span><span class="tu4-route__to" aria-hidden="true">${ctx.ui.icon('arrow-right', 16)}</span><span>${A(S.to)}</span></p>`; };

// the logo in the app's top bar: the horizontal version, Night on Stock in light, the on-stage colourway after dark
const appLogo = (ctx, dark, w, h) => {
  const cw = dark ? (ctx.brand.logo.colourways['on-stage'] ? 'on-stage' : 'mono-light') : 'colour';
  return ctx.logo.html('horizontal', { width: fit(ctx, 'horizontal', w, h), colourway: cw, label: 'Logo' });
};

// a status chip for a product screen, where the one Door red is the button: the action-toned status (On sale) is drawn as plain neutral words, so the button keeps the only Door red
const calm = (ctx, id) => { const s = ctx.status.find((x) => x.id === id) || ctx.status[0]; return s.tone === 'action' ? ctx.ui.chip(s.label, 'neutral') : ctx.ui.statusChip(id); };

// the live ticket as the app shows it: the body (the name, the place, the start and end, the update line), the app's tear line,
// and the stub (the one code, what was paid, the stub's button). `tall` stacks the stub under the body for the phone.
function appTicket(ctx, dark, tall = false) {
  const S = sc(ctx), ui = ctx.ui;
  const body = `<div class="tu4-tix__body"><div class="tu4-tix__top">${ui.statusChip('doors-open', { label: S.status })}<span class="tu4-tix__eta">${A(S.eta)}</span></div>
<h2 class="ui-display tu4-tix__act">${A(S.rider)}</h2>
${fields([[S.deliverToLabel, A(S.deliverTo)]], 'tu4-venue')}${route(ctx)}<p class="tu4-tix__adm">${A(S.pickup)}</p></div>`;
  const stub = `<div class="tu4-tix__stub">${appPerf(ctx, dark, tall ? 'h' : 'v')}<div class="tu4-tix__code">${barcode(tall ? 2.4 : 2, tall ? 52 : 56)}${m(CODE)}</div>
${fields([[S.paidLabel, `<span class="num">${A(S.paid)}</span>`]], 'tu4-paid')}${ui.btn(S.call, { variant: 'secondary', iconLeft: 'clock', size: tall ? undefined : 'sm' })}</div>`;
  // the slot edition's act is a descriptor box, wider than a two-word act: there it steps down a size so it stays on the body
  return `<article class="tu4-tix${tall ? ' tu4-tix--tall' : ''}${ctx.edition === 'slot' ? ' tu4-tix--slot' : ''}" aria-label="${A(ctx.brand.ui.screen.title)}">${body}${stub}</article>`;
}

// the desktop screen, the same in both modes: top bar, the live ticket, what is coming up and the one lit button
function appScreen(ctx, dark) {
  const S = sc(ctx), ui = ctx.ui, X = S.example;
  // the one lit button names the gig it buys: the first row with the action status (else the second row)
  const buy = S.deliveries.slice(1, 4).find((d) => { const st = ctx.status.find((x) => x.id === d.status); return st && st.tone === 'action'; }) || S.deliveries[1];
  const buyLabel = ctx.edition === 'slot' ? S.form.book : `${S.form.book} for ${buy.to}`;
  const later =`<ul class="ui-list">${S.deliveries.slice(1, 4).map((d) => ui.row({ title: d.to, sub: d.when, end: d.price, chip: calm(ctx, d.status) })).join('')}</ul>`;
  return `<div class="ui tu4-win"${dark ? ' data-theme="dark"' : ''}>
<nav class="ui-topbar" aria-label="Main"><span class="tu4-win__logo">${appLogo(ctx, dark, 132, 26)}</span><div class="ui-topbar__links">${ui.links(X.links, 0)}</div><span class="tu4-win__clock num">${A(S.time)}</span></nav>
<div class="tu4-win__main">${appTicket(ctx, dark)}
<section class="tu4-more" aria-label="Coming up"><h3 class="tu4-more__h">Coming up</h3>${later}${ui.btn(buyLabel, { iconRight: 'arrow-right', block: true })}</section></div></div>`;
}

export const uScreens = {
  // the screen as the body, a perforation, and the stub column carrying the page's line at lead size, so the screen is the large
  // thing. Above the screen, its facts as fields.
  'screen-light'(ctx) {
    const red = byRole(ctx, 'action'), L = ctx.roles.light;
    const facts = fields([['Screen', A(ctx.brand.ui.screen.title)], ['Mode', 'Light'], ['Ground', A(hexName(ctx, L.surface))], ['The one lit control', A(red.name)]], 'tu4-facts tk-ff--stub');
    const lead = `${A(ctx.brand.ui.screen.title)}: what is live now, where it starts and ends, and the one thing to do next.`;
    const stub = `<div class="tu4-sl__stub tu4-stub"><h1 class="disp tu4-lh">Your tickets. In the light.</h1><p class="tk-lead">${lead}</p>${facts}</div>`;
    return page(ctx, 'screen-light', `<div class="tu4-sl"><div class="tu4-sl__body">${appScreen(ctx, false)}</div>${vRule(ctx)}${stub}</div>`, 'tu4--sl');
  },

  // after dark: a stub column (the page's line at lead size, then a run of what swapped, one serial per role), a perforation,
  // and the same screen as the body
  'screen-dark'(ctx) {
    const L = ctx.roles.light, D = ctx.roles.dark, red = byRole(ctx, 'action');
    const lead = `The roles swap values and the layout does not move. The one lit button is still the only ${A(red.name)} on the page.`;
    const swaps = [['Surface', 'surface'], ['Raised', 'raised'], ['Text', 'text'], ['Action', 'action']];
    const val = (hex) => `<span class="tu4-sw" style="background:${hex}"></span><span>${A(hexName(ctx, hex))}</span> ${m(hex)}`;
    const run = swaps.map(([t, k], i) => `<li>${i ? hRule(ctx, true) : ''}<div class="tu4-swap__hd"><span class="tk-sn">${serial(i + 1)}</span><b>${t}</b></div>${fields([['Light', val(L[k])], ['Dark', val(D[k])]], 'tu4-swap__ff')}</li>`).join('');
    const stub = `<div class="tu4-sd__stub"><div class="tu4-stub"><h1 class="disp tu4-lh">The same screen. After dark.</h1><p class="tk-lead">${lead}</p></div><ol class="tu4-swaps">${run}</ol></div>`;
    return page(ctx, 'screen-dark', `<div class="tu4-sd">${stub}${vRule(ctx, true)}${appScreen(ctx, true)}</div>`, 'tu4--night tu4--sd');
  },

  // the phone at 390 in the light, between the page's line and the run of the headline state by state, one serial each
  'screen-mobile'(ctx) {
    const S = sc(ctx), ui = ctx.ui, X = S.example;
    const tabs = [...X.links, [X.account, 'user']];
    const phone = `<div class="ui tu4-ph"><div class="tu4-ph__bar"><span class="num">${A(S.time)}</span>${appLogo(ctx, false, 104, 22)}</div>
<div class="tu4-ph__body">${appTicket(ctx, false, true)}${ui.btn(ctx.ph('ui.screen.content.form.book', 'Show at the door'), { block: true })}</div>
<nav class="ui-tabbar" aria-label="Sections">${tabs.map(([t, i], k) => `<a href="#"${k === 0 ? ' aria-current="page"' : ''}>${ui.icon(i, 20)}${A(t)}</a>`).join('')}</nav></div>`;
    const lead = `${A(ctx.brand.ui.screen.title)} at 390, in the light. The name is the headline in every state, and the status beside it is in plain words. The one action stays in reach of the thumb, above a 64 px tab bar of four.`;
    const states = S.deliveries.slice(0, 5).map((d, i) => `<li class="tu4-st">${i ? hRule(ctx) : ''}<div class="tu4-st__hd"><span class="tk-sn">${serial(i + 1)}</span>${calm(ctx, d.status)}</div><p class="disp tu4-st__act">${A(d.to)}</p><p class="tu4-st__when">${A(d.when)}</p></li>`).join('');
    const left = `<div class="tu4-sm__l tu4-stub"><h1 class="disp tu4-lh">The same ticket. In a pocket.</h1><p class="tk-lead">${lead}</p></div>`;
    const right = `<div class="tu4-sm__r"><h3 class="tk-h3">The headline, state by state</h3><ol class="tu4-sts ui">${states}</ol></div>`;
    return page(ctx, 'screen-mobile', `<div class="tu4-sm">${left}<div class="tu4-sm__ph">${phone}</div>${vRule(ctx)}${right}</div>`, 'tu4--sm');
  },

  // a stub column (the line, type and fonts) beside the body: every colour role as a field, light value over dark, then
  // the small scales along the foot under a perforation
  tokens(ctx) {
    const g = tokenGroups(ctx), L = colourMap(ctx, 'light'), D = colourMap(ctx, 'dark');
    const sw = (c) => `<span class="tu4-sw" style="background:${c}"></span>`;
    const name = (k) => `<span class="tu4-tk__n">--${A(k)}</span>`;
    const col = Object.keys(L).map((k) => `<li class="tu4-tk">${name(k)}<span class="tu4-tk__v">${sw(L[k])}${m(L[k])}</span><span class="tu4-tk__v">${sw(D[k])}${m(D[k])}</span></li>`).join('');
    const one = (k, v) => `<li class="tu4-tk">${name(k)}<span class="tu4-tk__v">${m(v)}</span></li>`;
    const grp = (t, items, cls = '') => `<div class="tu4-tg ${cls}"><h3 class="tk-h3">${A(t)}</h3><ul>${items}</ul></div>`;
    const ent = (o) => Object.entries(o).map(([k, v]) => one(k, v)).join('');
    const fam = (id) => ctx.brand.fonts[id].family;
    const ff = [['ff-display', fam('display')], ['ff-body', fam('body')], ['ff-mono', fam('mono')]].map(([k, v]) => `<li class="tu4-tk">${name(k)}<span class="tu4-tk__v">${A(v)}</span></li>`).join('');
    const tx = ctx.uiType.map((t) => `<li class="tu4-tk"><span class="tu4-tk__n">${A(t.token)}</span><span class="tu4-tk__v">${m(`${t.size} / ${t.line} / ${t.weight}`)}</span></li>`).join('');
    // slot: the brand's colour names are the brand's own, so the slot prints them as Colour 1 to 4 like every other slot page
    const pal = ctx.colours.map((c, i) => `<li class="tu4-tk"><span class="tu4-tk__n">--palette-${ctx.edition === 'slot' ? `colour-${i + 1}` : A(c.id)}</span><span class="tu4-tk__v">${sw(c.hex)}${m(c.hex)}</span></li>`).join('');
    const lead = 'Every token in the kit, as the code package names it. Colour tokens name a job and dark swaps the values, not the names. The -bg tints are for highlights and charts, never under text. Space is in steps of 4, type is size, line height and weight in px.';
    const stub = `<div class="tu4-tok__stub"><h1 class="disp tu4-tok__h">Named for the job.</h1><p class="tk-lead">${lead}</p>${grp('Type, size / line / weight', tx, 'tu4-tg--type')}${grp('Fonts', ff, 'tu4-tg--ff')}</div>`;
    const colour = `<div class="tu4-tg tu4-tg--col"><div class="tu4-tg__hd"><h3 class="tk-h3">Colour</h3><span class="tu4-tg__key">Light value, then dark</span></div><ul>${col}</ul></div>`;
    const foot = `<div class="tu4-tok__foot">${grp('Space', ent(g.space), 'tu4-tg--sp')}${grp('Radius', ent(g.radius), 'tu4-tg--rd')}${grp('Border width', ent(g.width))}${grp('Palette', pal)}${grp('Shadow', one('shadow-float', g.shadow['shadow-float']))}</div>`;
    return page(ctx, 'tokens', `<div class="tu4-tok">${stub}${vRule(ctx)}<div class="tu4-tok__body">${colour}${hRule(ctx)}${foot}</div></div>`, 'tu4--tok');
  },

  // the package: the line across the top over a perforation, the install snippet large, the two short ones beside it, and the files
  // as a run of serials in the stub column
  code(ctx) {
    const F = sc(ctx).form;
    const files = [
      ['README.md', 'Install, use, token naming, light and dark, accessibility notes.'], ['tokens.css', 'Custom properties. Light on :root, dark on [data-theme="dark"] and the system setting.'],
      ['tokens.json', 'The same tokens in the W3C design token format, with a dark value on each colour.'], ['tokens.ts', 'A typed export of the same values.'], ['tailwind.css', 'A Tailwind CSS v4 @theme block mapped to the tokens.'],
      ['components.css', 'Classes for every component in this kit, built only on the tokens.'], ['example.html', 'Every component live, with a light and dark switch.'], ['fonts.css', `@font-face rules for ${[...new Set(ctx.faces.map((f) => f.family))].join(', ')}.`],
      ['assets/', 'The logo, 16 icons and the font files.'],
    ].map(([n, d], i) => `<li>${i % 5 ? hRule(ctx) : ''}<p class="tu4-file__hd"><span class="tk-sn">${serial(i + 1)}</span><span class="tu4-file__n">${m(n)}</span></p><p class="tu4-file__d">${A(d)}</p></li>`).join('');
    const install = `<link rel="stylesheet" href="fonts.css">
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
    const block = (t, c, cls = '') => `<figure class="tu4-cb ${cls}"><figcaption class="tk-h3">${A(t)}</figcaption><pre class="ui tu4-pre" data-theme="dark"><code>${A(c)}</code></pre></figure>`;
    const lead = `Plain CSS, no framework. Copy the folder and link three stylesheets. Put class ${m('ui')} on the body. State is carried by ${m('disabled')}, ${m('aria-invalid')}, ${m('aria-pressed')} and ${m('aria-current')}.`;
    const top = `<div class="tu4-cd__top"><h1 class="disp tu4-cd__h">Three links. Then ship.</h1><p class="tk-lead">${lead}</p></div>`;
    const snippets = `<div class="tu4-cd__body">${block('Install', install, 'tu4-cb--lead')}<div class="tu4-cd__pair">${block('Dark mode', '<html data-theme="dark">')}${block('Tailwind v4', tw)}</div></div>`;
    const pkg = `<div class="tu4-cd__stub"><h3 class="tk-h3">In the package</h3><ol class="tu4-files">${files}</ol></div>`;
    return page(ctx, 'code', `${top}${hRule(ctx)}<div class="tu4-cd">${snippets}${vRule(ctx)}${pkg}</div>`, 'tu4--cd');
  },
};
