// Lane ht, the UI kit site: the deck's bar and fields around the live components. Every page opens as a split slide: the page title
// at display size on one of the deck's fields, the live components beside it on the page ground (which follows light and dark, so
// the components show in the mode the reader picked). Under it, the markup of every component shown, ready to copy. The components
// are the code package's own (ctx.ui, componentsCss); nothing here restyles them.
import { colourMap, tokenGroups } from '../../engine/tokens.js';
import { cssIdent } from '../../engine/escape.js';
import { A, darkF, actF, panelF, fieldStyle, fitSize, bar, tocPanel, nextField, skipLink, contentsGrid } from './lane-ht-lib.js';
import { distinctColours } from './helpers.js';
import { htCss } from './lane-ht-css.js';
import { kitCss } from './lane-ht-kcss.js';
import { docOf, siteCtx, servedCtx } from './lane-ht-clean.js';

import { screenContent as SC, deliveryRows, noPrices, tally } from './once.js';

const docName = (ctx) => docOf(ctx, 'UI kit');
// the engine writes a trailing space where a class list is empty (`ui-input `, `type="button" >`): the pages show the markup without it
// (and an empty class attribute, which the shipped components leave on a bare checkbox)
const tidy = (h) => String(h).replace(/class="([^"]*?) +"/g, 'class="$1"').replace(/ class=""/g, '').replace(/"\s+>/g, '">');
// the type step the guide sets its titles in, so the kit's titles match it
const stepPx = (ctx, token, d) => (ctx.brand.type.scale.find((x) => x.token === token) || {}).size || d;
const VOID_TAGS = 'area|br|col|embed|hr|img|input|link|meta|source|track|wbr';
// the engine's printer closes a long void element (`</input>`) and splits an empty textarea over two lines: the markup shown has neither
const settle = (s) => s.replace(new RegExp(`\\n\\s*</(?:${VOID_TAGS})>`, 'g'), '').replace(/(<textarea\b[^>\n]*>)\n\s*(<\/textarea>)/g, '$1$2');
const EX = (ctx) => SC(ctx).example || {};
// the label a row's status carries
const stateLabel = (ctx, id) => (ctx.status.find((x) => x.id === id) || ctx.status[0]).label;
// what each status tone says, so the caption under a status adds to its word
const TONE_SAYS = { action: 'Needs a first look', success: 'Going to plan', warning: 'Needs attention', danger: 'Has failed', info: 'For your information', neutral: 'Finished, nothing to do' };
// the card's one action: the brand's own secondary label, unless that is the generic "Back" (a card is not a way back)
const cardAction = (ctx) => { const s = EX(ctx).secondary; return !s || /^back$/i.test(s) ? 'View order' : s; };
const copyBtn = (value, name) => `<button type="button" class="ht-btn hk-copy" data-copy="${A(value)}" data-copy-name="${A(name)}"><span data-copy-text>Copy</span></button>`;
const tok = (name) => `<span class="ht-m">${A(name)}</span>`;
// a live item: the component, its name under it
const item = (html, label, cls = '') => `<figure class="hk-i ${cls}"><div class="hk-i__c">${html}</div><figcaption>${A(label)}</figcaption></figure>`;

// ---- the live part and the markup notes of each page ----
// the roles in groups of three and four (no short last row, no empty cell), then the brand's own palette, whose second colour is the kit's accent
const SW_GROUPS = [['Surfaces', ['surface', 'raised', 'sunken']], ['Text', ['text', 'text-soft', 'quiet']], ['Edges and focus', ['edge', 'divider', 'focus']], ['Action', ['action', 'action-hover', 'action-pressed', 'action-label']]];
const accentOf = (ctx) => (ctx.colours.find((c) => c.id === 'support') || ctx.colours[1] || ctx.colours[0]).hex;
function swatches(ctx, mode) {
  const map = colourMap(ctx, mode), keys = SW_GROUPS.flatMap(([, ks]) => ks).filter((k) => map[k]);
  const cell = (c, name, token, value) => `<li><span class="hk-sw__c" style="background:${c}"></span><b>${A(name)}</b>${tok(token)}<span class="ht-m">${A(value)}</span></li>`;
  const group = (t, cells, n) => `<section class="hk-sg" aria-label="${A(t)}"><h2 class="hk-sg__t">${A(t)}</h2><ul class="hk-sw" style="--n:${n}"${mode === 'dark' ? ' data-theme="dark"' : ''}>${cells.join('')}</ul></section>`;
  const roles = SW_GROUPS.map(([t, ks]) => [t, ks.filter((k) => map[k])]).filter(([, ks]) => ks.length).map(([t, ks]) => group(t, ks.map((k) => cell(map[k], ctx.cap ? ctx.cap(k.replace(/-/g, ' ')) : k, `--${k}`, map[k])), ks.length));
  const brand = distinctColours(ctx);
  const own = brand.length ? [group('Brand palette', brand.map((c) => cell(c.hex, c.name, `--palette-${cssIdent(c.id)}`, c.hex)), Math.min(brand.length, 5))] : [];
  return { live: roles.concat(own).join(''), dark: mode === 'dark', code: [[mode === 'dark' ? 'Dark mode roles' : 'Light mode roles', keys.map((k) => `--${k}: ${map[k]};`).join(String.fromCharCode(10))]] };
}
const PAGES = {
  'colour-light': (ctx) => ({ lede: 'The roles every component reads in light mode.', ...swatches(ctx, 'light') }),
  'colour-dark': (ctx) => ({ lede: 'The same roles, tuned for dark mode.', ...swatches(ctx, 'dark') }),
  'type-scale': (ctx) => ({
    lede: 'The type sizes the components are set in.',
    live: `<ol class="hk-ts">${ctx.uiType.map((t) => `<li><span class="ht-k">${A(t.token)}<span class="num">${t.size} / ${t.line} px, ${t.weight}</span></span><span class="hk-ts__s" style="font-family:var(--ff-${t.face === 'display' ? 'display' : t.face === 'mono' ? 'mono' : 'body'});font-size:var(--fs-${t.token});line-height:var(--lh-${t.token});font-weight:var(--fw-${t.token})">${A(SC(ctx).eta)}</span></li>`).join('')}</ol>`,
    code: ctx.uiType.map((t) => [t.token, `font-size: var(--fs-${t.token}); line-height: var(--lh-${t.token}); font-weight: var(--fw-${t.token});`]),
  }),
  spacing: (ctx) => ({
    lede: `Every gap is a step of ${ctx.brand.ui.spacingBase} px.`,
    live: `<ol class="hk-sp">${ctx.space.map((s) => `<li><span class="ht-m">${A(s.token)}</span><span class="hk-sp__b" style="width:${s.px}px"></span><span class="num">${s.px} px</span></li>`).join('')}</ol>`,
    code: [['Spacing tokens', ctx.space.map((s) => `--${s.token.replace('space-', 'sp-')}: ${s.px}px;`).join(String.fromCharCode(10))]],
  }),
  'radii-borders': (ctx) => {
    const g = tokenGroups(ctx), r = Object.entries(g.radius).filter(([k]) => k !== 'r-round'), w = Object.entries(g.width);
    return { lede: 'Corners and edges, as the components draw them.', live: `<ul class="hk-rd">${r.map(([k, v]) => `<li><span class="hk-rd__b" style="border-radius:var(--${k})"></span>${tok(`--${k}`)}<span class="num">${A(v)}</span></li>`).join('')}${w.map(([k, v]) => `<li><span class="hk-rd__b" style="border-width:var(--${k})"></span>${tok(`--${k}`)}<span class="num">${A(v)}</span></li>`).join('')}</ul>`, code: [['Radius and border tokens', [...r, ...w].map(([k, v]) => `--${k}: ${v};`).join(String.fromCharCode(10))]] };
  },
  elevation: (ctx) => {
    const S = SC(ctx), a = ctx.ui.card({ meta: ctx.edition === 'slot' ? 'Packed by' : S.status, title: S.rider, text: S.riderNote }), b = ctx.ui.card({ meta: S.deliverToLabel, title: S.deliverTo, text: S.eta, raised: true });
    return { lede: ctx.brand.ui.elevationNote, live: `<div class="hk-row hk-row--2">${item(a, 'Card')}${item(b, 'Raised card')}</div>`, code: [['Card', a], ['Raised card', b]] };
  },
  states: (ctx) => {
    const F = SC(ctx).form, E = EX(ctx), u = ctx.ui;
    const all = [['Rest', u.btn(F.book)], ['Hover', u.btn(F.book, { state: 'hover' })], ['Focus', u.btn(F.book, { state: 'focus' })], ['Pressed', u.btn(F.book, { state: 'pressed' })], ['Disabled', u.btn(F.book, { state: 'disabled' })]];
    return { lede: 'Every control has its rest, hover, focus, pressed and disabled look.', live: `<div class="hk-row">${all.map(([l, h]) => item(h, l)).join('')}</div>`, code: all };
  },
  buttons: (ctx) => {
    const F = SC(ctx).form, E = EX(ctx), u = ctx.ui;
    const all = [['Primary', u.btn(F.book)], ['Secondary', u.btn(E.secondary || F.book, { variant: 'secondary' })], ['Quiet', u.btn(E.quiet || F.book, { variant: 'quiet' })], ['Danger', u.btn(E.danger || F.book, { variant: 'danger' })], ['Small', u.btn(E.small || F.book, { variant: 'secondary', size: 'sm' })], ['Large', u.btn(F.book, { size: 'lg', iconRight: 'arrow-right' })]];
    return { lede: 'One primary button a screen, for the step that moves things on.', live: `<div class="hk-row">${all.map(([l, h]) => item(h, l)).join('')}</div>`, code: all };
  },
  inputs: (ctx) => {
    const F = SC(ctx).form, u = ctx.ui;
    const all = [['Text', u.field({ id: 'hk-i1', label: F.pickup, value: F.pickupValue })], ['With help', u.field({ id: 'hk-i2', label: F.notes, kind: 'textarea', help: F.notesHelp })], ['Error', u.field({ id: 'hk-i3', label: F.ready, value: F.readyValue, error: F.readyError })], ['Select', u.field({ id: 'hk-i4', label: F.size, kind: 'select', options: F.sizes, value: F.sizes[1] })]];
    return { lede: 'A label above every field, and a message under it when one is needed.', live: `<div class="hk-row hk-row--2">${all.map(([l, h]) => item(h, l, 'hk-i--w')).join('')}</div>`, code: all };
  },
  choices: (ctx) => {
    const E = EX(ctx), u = ctx.ui, F = SC(ctx).form, ch = E.checks || [F.notes], rd = E.radios || F.sizes, sw = E.switches || [F.notes];
    const all = [['Checkbox', ch.map((t, i) => u.check(t, { checked: i === 0 })).join('')], ['Radio', rd.map((t, i) => u.check(t, { type: 'radio', name: 'hk-r', checked: i === 0 })).join('')], ['Switch', sw.map((t, i) => u.switch(t, { checked: i === 0 })).join('')], ['Segmented', u.segmented(F.sizes, 1)]];
    return { lede: 'Checkboxes for any number, radios for one of a set, switches for what takes effect at once.', live: `<div class="hk-row hk-row--2">${all.map(([l, h]) => item(h, l, 'hk-i--w hk-i--stack')).join('')}</div>`, code: all };
  },
  cards: (ctx) => {
    const S = SC(ctx), u = ctx.ui, E = EX(ctx);
    // each card is one of the shared orders: the first (packing) and the third (late)
    const o = (d) => u.card({ meta: stateLabel(ctx, d.status), title: d.to, text: d.when, action: `<div>${u.btn(cardAction(ctx), { variant: 'secondary', size: 'sm' })}</div>` });
    const ds = S.deliveries, late = ds[2] || ds[ds.length - 1];
    const all = [['Card', o(ds[0])], ['Card, late order', o(late)], ['Stat', u.stat(S.paid, S.paidLabel)], ['Stat, a count', u.stat(String(ds.length), E.statLabel || S.paidLabel)]];
    return { lede: 'A card holds one order; a stat holds one number.', live: `<div class="hk-row hk-row--2">${all.map(([l, h]) => item(h, l, 'hk-i--w')).join('')}</div>`, code: all };
  },
  navigation: (ctx) => {
    const S = SC(ctx), u = ctx.ui, E = EX(ctx);
    const all = [['Tabs', u.tabs(E.tabs || [S.status], 0)], ['Breadcrumb', u.crumbs(E.crumbs && E.crumbs.length ? E.crumbs : [S.deliverTo])], ['Links', `<nav class="ui-topbar" aria-label="Main"><strong class="ui-display">${A(ctx.brand.logo.showcase.wordmark)}</strong><div class="ui-topbar__links">${u.links(E.links || [[S.call, 'phone']], 0)}</div></nav>`]];
    return { lede: 'Tabs switch a view, a breadcrumb shows the way back, links move between screens.', live: `<div class="hk-col">${all.map(([l, h]) => item(h, l, 'hk-i--w')).join('')}</div>`, code: all };
  },
  lists: (ctx) => { const h = deliveryRows(ctx, 6); return { lede: 'A row for each order, its status in plain words.', live: `<div class="hk-col">${item(h, 'Order rows', 'hk-i--w')}</div>`, code: [['Order rows', h]] }; },
  // the caption says what the status means; the word itself is the chip
  status: (ctx) => { const all = ctx.status.map((s) => [TONE_SAYS[s.tone] || s.tone, ctx.ui.statusChip(s.id)]); return { lede: 'Status is said in words, in one colour that reads on the ground.', live: `<div class="hk-row">${all.map(([l, h]) => item(h, l)).join('')}</div>`, code: all }; },
  feedback: (ctx) => {
    const S = SC(ctx), u = ctx.ui;
    const all = [['Information', u.alert('info', S.pickup)], ['Success', u.alert('success', S.toast)], ['Warning', u.alert('warning', S.alert)], ['Error', u.alert('danger', "Payment didn't go through. Check the card details and try again.")], ['Toast', u.toast(S.toast)], ['Loading', `${u.spinner()}${u.skeleton('220px')}${u.skeleton('150px')}`]];
    return { lede: 'What happened, said where it happened.', live: `<div class="hk-col">${all.map(([l, h]) => item(h, l, l === 'Loading' ? 'hk-i--w hk-i--stack' : 'hk-i--w')).join('')}</div>`, code: all };
  },
  // a dialog's confirm is the primary button; the danger button is kept for the one that cannot be undone (cancelling the order)
  dialog: (ctx) => {
    const S = SC(ctx), D = S.dialog, u = ctx.ui;
    const danger = u.dialog({ title: D.title, body: D.body, confirm: D.confirm, keep: D.keep, danger: true });
    // the primary dialog moves the order named in the danger one; a brand with other words gets its own copy as a primary dialog
    const move = /order 1042/.test(D.title) ? u.dialog({ title: 'Move order 1042?', body: `It will be due at 1:30 pm instead of 11:40 am. ${S.deliverTo} is told straight away.`, confirm: 'Move', keep: 'Keep 11:40 am' }) : u.dialog({ title: D.title, body: D.body, confirm: D.confirm, keep: D.keep });
    // the two share one title id; a page holds each id once
    const second = danger.replace(/dlg-t/g, 'dlg-t2');
    return { lede: 'A dialog asks one question and names both answers.', live: `<div class="hk-row hk-row--2">${item(move, 'Confirm', 'hk-i--w')}${item(second, 'Cannot be undone', 'hk-i--w')}</div>`, code: [['Confirm', move], ['Cannot be undone', second]] };
  },
  table: (ctx) => {
    const S = SC(ctx), u = ctx.ui, d = S.deliveries;
    const h = `<table class="ui-table"><thead><tr><th scope="col">Order</th><th scope="col">Status</th>${noPrices(ctx) ? '' : `<th scope="col" class="is-num">${A(S.paidLabel)}</th>`}</tr></thead><tbody>${d.map((x) => `<tr><td><strong>${A(x.to)}</strong><br>${A(x.when)}</td><td>${u.statusChip(x.status)}</td>${noPrices(ctx) ? '' : `<td class="is-num ui-num">${A(x.price)}</td>`}</tr>`).join('')}</tbody></table>`;
    return { lede: 'Rows of orders, numbers aligned to the right.', live: `<div class="hk-col">${item(h, 'Table', 'hk-i--w')}</div>`, code: [['Table', h]] };
  },
  empty: (ctx) => { const E = SC(ctx).empty, h = `<div class="ui-empty"><h3 class="ui-empty__title">${A(E.title)}</h3><p class="ui-empty__text">${A(E.body)}</p>${ctx.ui.btn(E.cta)}</div>`; return { lede: 'An empty screen says what goes here and how to start.', live: `<div class="hk-col">${item(h, 'Empty state', 'hk-i--w')}</div>`, code: [['Empty state', h]] }; },
  // the light screen on its own page and the dark on its own: each is read whole, at the width it is used at
  'screen-light': (ctx) => screen(ctx, false, false),
  'screen-dark': (ctx) => ({ ...screen(ctx, true, false), dark: true }),
  'screen-mobile': (ctx) => screen(ctx, false, true),
  tokens: (ctx) => {
    // one group to a row, each under its own heading with one Copy for the group (the declarations as they sit in tokens.css); a colour carries a 16 px chip
    const g = tokenGroups(ctx), groups = [['Colour', Object.entries(colourMap(ctx, 'light')), true], ['Space', Object.entries(g.space)], ['Radius', Object.entries(g.radius)], ['Border width', Object.entries(g.width)], ['Text', Object.entries(g.text)]].filter(([, r]) => r.length);
    const live = groups.map(([t, rows, chip], i) => `<section class="hk-tg" aria-labelledby="hk-tg-${i}"><div class="hk-tg__h"><h2 class="ht-d hk-tg__t" id="hk-tg-${i}">${A(t)}</h2>${copyBtn(rows.map(([k, v]) => `--${k}: ${v};`).join(String.fromCharCode(10)), `${t} tokens`)}</div><dl class="hk-tok">${rows.map(([k, v]) => `<div><dt>${chip ? `<span class="hk-tok__c" style="background:${A(v)}"></span>` : ''}${tok(`--${k}`)}</dt><dd><span class="ht-m">${A(v)}</span></dd></div>`).join('')}</dl></section>`).join('');
    return { lede: 'Every token the components read, as CSS custom properties.', live, code: [] };
  },
  code: (ctx) => {
    const F = SC(ctx).form, h = ctx.ui.btn(F.book);
    // the zip's folder as it opens, then the three steps that put it to work
    const tree = ['ui-kit/', '  tokens.css       custom properties, light and dark', '  tokens.json      the same tokens, W3C format', '  tokens.ts        the same tokens, typed', '  tailwind.css     a Tailwind v4 theme block', '  components.css   every component, on the tokens', '  example.html     every component live', '  fonts.css        @font-face for assets/fonts', '  assets/          logo, icons and font files', '  README.md        the install, in short'].join(String.fromCharCode(10));
    const links = '<link rel="stylesheet" href="fonts.css">\n<link rel="stylesheet" href="tokens.css">\n<link rel="stylesheet" href="components.css">';
    const steps = ['Copy the ui-kit folder into your project.', 'Link the three stylesheets in this order: fonts, tokens, components.', 'Put class="ui" on body, or on any wrapper, so the base type and colours apply.'];
    const live = `<div class="hk-col">${item(`<pre class="hk-tree" tabindex="0" role="region" aria-label="The zip folder"><code>${A(tree)}</code></pre>`, 'The zip folder', 'hk-i--w')}${item(`<ol class="hk-steps">${steps.map((t) => `<li>${A(t)}</li>`).join('')}</ol>`, 'Install in three steps', 'hk-i--w')}${item(h, 'A button, as shipped', 'hk-i--w')}</div>`;
    return { lede: 'The kit ships as plain HTML and CSS: the tokens, the components and an example page.', live, code: [['Step 2: the stylesheets', links], ['Step 3: the wrapper', '<body class="ui">\n  <!-- your page -->\n</body>'], ['A button', h]] };
  },
};
// a product screen: the brand's own screen title and content, built from the components. A top bar with the main links, the title over
// its tabs, the order that is being worked on (a card and its one action) beside the day's orders, all of them
function screen(ctx, dark, mobile) {
  const S = SC(ctx), u = ctx.ui, E = EX(ctx), title = ctx.brand.ui.screen.title;
  // the shop's two jobs on the order that is open (the card says what it is; the same card as the example page's)
  const [done, second] = ctx.edition === 'slot' ? ['Mark packed', 'Print label'] : [S.form.book, cardAction(ctx)];
  const bar = E.links && E.links.length ? `<nav class="ui-topbar" aria-label="Main"><strong class="ui-display">${A(ctx.brand.logo.showcase.wordmark)}</strong><div class="ui-topbar__links">${u.links(E.links, 0)}</div></nav>` : '';
  const tabs = E.tabs && E.tabs.length ? u.tabs(E.tabs, 0) : '';
  const act = `<div class="hk-scr__x">${u.btn(done, { iconLeft: ctx.edition === 'slot' ? 'check' : undefined, block: mobile })}${u.btn(second, { variant: 'secondary', iconLeft: ctx.edition === 'slot' ? 'printer' : undefined, block: mobile })}</div>`;
  const scr = `<div class="ui hk-scr${mobile ? ' hk-scr--m' : ''}"${dark ? ' data-theme="dark"' : ''}>${bar}<div class="hk-scr__body"><h2 class="hk-scr__t">${A(title)}</h2>
<div class="hk-scr__a">${u.card({ meta: S.status, title: S.eta, text: S.pickup })}${act}</div>
<div class="hk-scr__b">${tabs}${deliveryRows(ctx, mobile ? 4 : 6, tally(ctx).open)}</div></div></div>`;
  const h = mobile ? `<div class="hk-phone">${scr}</div>` : scr;
  return { lede: mobile ? `${title}, at phone width.` : `${title}, built from the kit's components only.`, live: `<div class="hk-col">${h}</div>`, code: [] };
}

// markup is laid out by the engine; CSS lines are shown as written, a line each
// A long opening tag has its attributes one to a line, so no line of markup runs past what a reader can take in at once
const WRAP_AT = 72;
const TAG_LINE = /^(\s*)<([a-z][a-z0-9-]*)((?:\s+[^\s=>"]+(?:="[^"]*")?)+)\s*(\/?>)(.*)$/;
function breakAttrs(s) {
  return String(s).split('\n').map((line) => {
    const m = line.length > WRAP_AT && TAG_LINE.exec(line);
    const attrs = m && m[3].match(/[^\s=>"]+(?:="[^"]*")?/g);
    if (!attrs || attrs.length < 2) return line;
    const [, ind, tag, , end, rest] = m, pad = `${ind}  `;
    return `${ind}<${tag}\n${attrs.map((a, i) => `${pad}${a}${i === attrs.length - 1 ? end + rest : ''}`).join('\n')}`;
  }).join('\n');
}
const pretty = (K, h) => (String(h).trim().startsWith('<') ? breakAttrs(settle(K.prettyHtml(tidy(h)))) : h);
// ---- the page: a split slide (the title on a field, the live components on the ground), then the markup ----
const grounds = (ctx) => [panelF(ctx), actF(ctx), darkF(ctx), panelF(ctx)];
function body(ctx0, K) {
  const ctx = siteCtx(ctx0);
  const p = K.page, d = PAGES[p.id](ctx), sec = p.section ? p.section.n : 1, hex = grounds(ctx)[(sec - 1) % 4];
  const ts = fitSize(ctx, K.pages.filter((q) => q.section).map((q) => q.title), 0.94, stepPx(ctx, 'display', 48), 32);
  const top = `<section class="hk-top"><div class="hk-title" style="${fieldStyle(ctx, hex, 'kit title field', 32)}"><div class="hk-title__in"><p class="ht-k">${A(p.section.title)} <b class="num">${A(p.ref)}</b></p><h1 class="ht-d hk-title__h" style="--bs:${ts}">${A(p.title)}</h1><p class="hk-title__l">${A(d.lede)}</p></div></div>
<div class="hk-rule" style="background:${accentOf(ctx)}" aria-hidden="true"></div>
<div class="ui hk-live"${d.dark ? ' data-theme="dark"' : ''}>${d.live}</div></section>`;
  const code = d.code.length ? `<section class="hk-code" aria-labelledby="hk-code-h"><h2 class="ht-d hk-code__h" id="hk-code-h">The markup</h2><ol>${d.code.map(([l, h], i) => `<li id="m-${i + 1}" data-rd-n="${p.ref}.${i + 1}"><p class="ht-k"><span class="num">${p.ref}.${i + 1}</span> ${A(l)}</p><pre tabindex="0" role="region" aria-label="${A(l)} markup"><code>${A(pretty(K, h))}</code></pre>${copyBtn(pretty(K, h), l)}</li>`).join('')}</ol></section>` : '';
  return top + code;
}
// index.html: the kit's title slide (the logo on its dark ground, a live set of components), then the contents stripes
function cover(ctx0, K) {
  const ctx = siteCtx(ctx0), B = ctx.brand, rev = B.logo.colourways.reversed, S = SC(ctx), F = S.form, u = ctx.ui, dk = darkF(ctx);
  const live = `<div class="hk-row">${item(u.btn(F.book), 'Primary')}${item(u.btn(cardAction(ctx), { variant: 'secondary' }), 'Secondary')}${item(`${u.statusChip(S.deliveries[0].status)} <span class="ui-badge">${S.deliveries.filter((d) => d.status === S.deliveries[0].status).length}</span>`, 'Status and count')}</div>${item(u.field({ id: 'hk-c1', label: F.pickup, value: F.pickupValue }), 'Field', 'hk-i--w')}${item(u.card({ meta: S.status, title: S.eta, text: S.pickup }), 'Card', 'hk-i--w')}`;
  const top = `<section class="hk-top hk-top--cover"><div class="hk-title" style="${fieldStyle(ctx, rev.ground || dk, 'kit cover field', 32)}"><div class="hk-logo">${ctx.logo.html('reversed', { width: 320 })}</div><h1 class="ht-d hk-title__h" style="--bs:${fitSize(ctx, ['UI kit'], 0.94, stepPx(ctx, 'display', 48), 32)}">UI kit</h1>${B.product ? `<p class="hk-title__l">${A(B.product)}</p>` : ''}<p class="hk-title__v">${A(ctx.versionLine)}</p></div>
<div class="hk-rule" style="background:${accentOf(ctx)}" aria-hidden="true"></div>
<div class="ui hk-live">${live}</div></section>`;
  // the cover names the sections, each a link into it; the contents page lists every page
  return top + contentsGrid(ctx, K.sections.map((x) => ({ n: x.n, title: x.title, href: K.href(x.pages[0].id), pages: x.pages.map((q) => ({ ref: K.pages.find((y) => y.id === q.id).ref })) })), { brief: true });
}
function contents(ctx0, K) {
  const ctx = siteCtx(ctx0);
  return contentsGrid(ctx, K.sections.map((x) => ({ n: x.n, title: x.title, pages: x.pages.map((q) => { const r = K.pages.find((y) => y.id === q.id); return { href: K.href(q.id), ref: r.ref, title: r.title }; }) })));
}

function shell(ctx0, K, inner) {
  const ctx = siteCtx(ctx0);
  const p = K.page, toggle = `<button class="ht-btn" type="button" data-disclosure aria-expanded="false" aria-controls="ht-toc">Contents</button>`;
  const sections = K.sections.map((s) => ({ n: s.n, title: s.title, pages: s.pages.map((q) => K.pages.find((x) => x.id === q.id)) }));
  const toc = tocPanel(ctx, { id: 'ht-toc', sections, href: K.href, current: p.id, front: 'Cover and contents' });
  const nx = (q) => q && { href: K.href(q.id), ref: q.ref, title: q.id === 'cover' ? 'Cover' : q.id === 'contents' ? 'Contents' : q.title };
  const next = K.next && K.next.id === 'contents' ? K.pages[K.pages.indexOf(K.next) + 1] : K.next;
  return `<div class="sx ht ht--kit" data-page="${p.id}">
${skipLink()}
${bar(ctx, { home: 'index.html', doc: docName(ctx), ref: p.ref, title: p.section ? p.title : p.id === 'contents' ? 'Contents' : 'Cover', no: ctx.pageNo(p.id), toggle })}
${toc}
<main id="ht-main" tabindex="-1"><article class="sx-art" data-rd-doc>
${tidy(inner)}
</article></main>
${nextField(ctx, { next: nx(next), prev: nx(K.prev) })}
<footer class="ht-foot"><span>${A(docName(ctx))}</span><span>${A(ctx.versionLine)}</span></footer>
</div>`;
}

export const kitSite = {
  prepare: servedCtx, css: (ctx) => htCss(ctx) + kitCss(ctx), shell, unscroll: '.ht-bar{position:static!important}',
  fallback: (ctx, K) => (PAGES[K.page.id] ? body(ctx, K) : `<section class="hk-code"><p class="ht-p">${A(K.page.title)}</p></section>`),
  pages: { cover, contents: (ctx, K) => contents(ctx, K) },
};
