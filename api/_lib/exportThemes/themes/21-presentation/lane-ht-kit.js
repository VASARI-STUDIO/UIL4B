// Lane ht, the UI kit site: the deck's bar and fields around the live components. Every page opens as a split slide: the page title
// at display size on one of the deck's fields, the live components beside it on the page ground (which follows light and dark, so
// the components show in the mode the reader picked). Under it, the markup of every component shown, ready to copy. The components
// are the code package's own (ctx.ui, componentsCss); nothing here restyles them.
import { colourMap, tokenGroups } from '../../engine/tokens.js';
import { A, L, darkF, actF, panelF, fieldStyle, fitSize, bar, tocPanel, nextField } from './lane-ht-lib.js';
import { htCss } from './lane-ht-css.js';
import { kitCss } from './lane-ht-kcss.js';

const docName = (ctx) => `${ctx.brand.name} UI kit`;
import { screenContent as SC, deliveryRows, noPrices } from './once.js';
const EX = (ctx) => SC(ctx).example || {};
const copyBtn = (value, name) => `<button type="button" class="ht-btn hk-copy" data-copy="${A(value)}" data-copy-name="${A(name)}"><span data-copy-text>Copy</span></button>`;
const tok = (name) => `<span class="ht-m">${A(name)}</span>`;
// a live item: the component, its name under it
const item = (html, label, cls = '') => `<figure class="hk-i ${cls}"><div class="hk-i__c">${html}</div><figcaption>${A(label)}</figcaption></figure>`;

// ---- the live part and the markup notes of each page ----
function swatches(ctx, mode) {
  const map = colourMap(ctx, mode), keys = ['surface', 'raised', 'sunken', 'text', 'text-soft', 'quiet', 'edge', 'divider', 'action', 'action-hover', 'action-pressed', 'action-label', 'focus'].filter((k) => map[k]);
  return { live: `<ul class="hk-sw"${mode === 'dark' ? ' data-theme="dark"' : ''}>${keys.map((k) => `<li><span class="hk-sw__c" style="background:${map[k]}"></span><b>${A(ctx.cap ? ctx.cap(k.replace(/-/g, ' ')) : k)}</b>${tok(`--${k}`)}<span class="ht-m">${A(map[k])}</span></li>`).join('')}</ul>`, dark: mode === 'dark', code: [[mode === 'dark' ? 'Dark mode roles' : 'Light mode roles', keys.map((k) => `--${k}: ${map[k]};`).join(String.fromCharCode(10))]] };
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
    const S = SC(ctx), a = ctx.ui.card({ meta: S.status, title: S.rider, text: S.riderNote }), b = ctx.ui.card({ meta: S.deliverToLabel, title: S.deliverTo, text: S.eta, raised: true });
    return { lede: ctx.brand.ui.elevationNote, live: `<div class="hk-row hk-row--2">${item(a, 'Card')}${item(b, 'Raised card')}</div>`, code: [['Card', a], ['Raised card', b]] };
  },
  states: (ctx) => {
    const F = SC(ctx).form, E = EX(ctx), u = ctx.ui;
    const all = [['Rest', u.btn(F.book)], ['Hover', u.btn(F.book, { state: 'hover' })], ['Focus', u.btn(F.book, { state: 'focus' })], ['Pressed', u.btn(F.book, { state: 'active' })], ['Disabled', u.btn(E.secondary || F.book, { variant: 'secondary', state: 'disabled' })]];
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
    return { lede: 'Checkboxes for any number, radios for one of a set, switches for what takes effect at once.', live: `<div class="hk-row hk-row--2">${all.map(([l, h]) => item(`<div class="hk-stack">${h}</div>`, l, 'hk-i--w')).join('')}</div>`, code: all };
  },
  cards: (ctx) => {
    const S = SC(ctx), u = ctx.ui, E = EX(ctx);
    const all = [['Card', u.card({ meta: S.status, title: S.eta, text: S.pickup, action: `<div>${u.btn(E.secondary || S.call, { variant: 'secondary', size: 'sm' })}</div>` })], ['Stat', u.stat(S.paid, S.paidLabel)]];
    return { lede: 'A card holds one delivery; a stat holds one number.', live: `<div class="hk-row hk-row--2">${all.map(([l, h]) => item(h, l, 'hk-i--w')).join('')}</div>`, code: all };
  },
  navigation: (ctx) => {
    const S = SC(ctx), u = ctx.ui, E = EX(ctx);
    const all = [['Tabs', u.tabs(E.tabs || [S.status], 0)], ['Breadcrumb', u.crumbs([...(E.crumbs || []), S.deliverTo])], ['Links', `<nav class="hk-links" aria-label="Example">${u.links(E.links || [[S.call, 'phone']], 0)}</nav>`]];
    return { lede: 'Tabs switch a view, a breadcrumb shows the way back, links move between screens.', live: `<div class="hk-col">${all.map(([l, h]) => item(h, l, 'hk-i--w')).join('')}</div>`, code: all };
  },
  lists: (ctx) => { const h = deliveryRows(ctx, 4); return { lede: 'A row for each delivery, its status in plain words.', live: `<div class="hk-col">${item(h, 'Delivery rows', 'hk-i--w')}</div>`, code: [['Delivery rows', h]] }; },
  status: (ctx) => { const all = ctx.status.map((s) => [s.label, ctx.ui.statusChip(s.id)]); return { lede: 'Status is said in words, in one colour that reads on the ground.', live: `<div class="hk-row">${all.map(([l, h]) => item(h, l)).join('')}</div>`, code: all }; },
  feedback: (ctx) => {
    const S = SC(ctx), u = ctx.ui;
    const all = [['Information', u.alert('info', S.pickup)], ['Success', u.alert('success', S.toast)], ['Warning', u.alert('warning', S.alert)], ['Toast', u.toast(S.toast)], ['Loading', `<div class="hk-stack">${u.spinner()}${u.skeleton('220px')}${u.skeleton('150px')}</div>`]];
    return { lede: 'What happened, said where it happened.', live: `<div class="hk-col">${all.map(([l, h]) => item(h, l, 'hk-i--w')).join('')}</div>`, code: all };
  },
  dialog: (ctx) => { const D = SC(ctx).dialog, h = ctx.ui.dialog({ title: D.title, body: D.body, confirm: D.confirm, keep: D.keep, danger: true }); return { lede: 'A dialog asks one question and names both answers.', live: `<div class="hk-col">${item(h, 'Dialog', 'hk-i--w')}</div>`, code: [['Dialog', h]] }; },
  table: (ctx) => {
    const S = SC(ctx), u = ctx.ui, d = S.deliveries;
    const h = `<table class="hk-tbl"><thead><tr><th scope="col">${A(S.deliverToLabel)}</th><th scope="col">${A(S.status)}</th>${noPrices(ctx) ? '' : `<th scope="col" class="is-num">${A(S.paidLabel)}</th>`}</tr></thead><tbody>${d.map((x) => `<tr><td>${A(x.to)}<span>${A(x.when)}</span></td><td>${u.statusChip(x.status)}</td>${noPrices(ctx) ? '' : `<td class="is-num ui-num">${A(x.price)}</td>`}</tr>`).join('')}</tbody></table>`;
    return { lede: 'Rows of deliveries, numbers aligned to the right.', live: `<div class="hk-col">${item(h, 'Table', 'hk-i--w')}</div>`, code: [['Table', h]] };
  },
  empty: (ctx) => { const E = SC(ctx).empty, h = `<div class="hk-empty"><h3>${A(E.title)}</h3><p>${A(E.body)}</p>${ctx.ui.btn(E.cta)}</div>`; return { lede: 'An empty screen says what goes here and how to start.', live: `<div class="hk-col">${item(h, 'Empty state', 'hk-i--w')}</div>`, code: [['Empty state', h]] }; },
  'screen-light': (ctx) => screen(ctx, false, false),
  'screen-dark': (ctx) => screen(ctx, true, false),
  'screen-mobile': (ctx) => screen(ctx, false, true),
  tokens: (ctx) => {
    const g = tokenGroups(ctx), map = colourMap(ctx, 'light'), rows = [...Object.entries(map), ...Object.entries(g.space), ...Object.entries(g.radius), ...Object.entries(g.width), ...Object.entries(g.text)];
    return { lede: 'Every token the components read, as CSS custom properties.', live: `<dl class="hk-tok">${rows.map(([k, v]) => `<div><dt>${tok(`--${k}`)}</dt><dd><span class="ht-m">${A(v)}</span>${copyBtn(`var(--${k})`, `--${k}`)}</dd></div>`).join('')}</dl>`, code: [] };
  },
  code: (ctx) => {
    const F = SC(ctx).form, h = ctx.ui.btn(F.book);
    return { lede: 'The kit ships as plain HTML and CSS: the tokens, the components and an example page.', live: `<div class="hk-col">${item(h, 'A button, as shipped')}</div>`, code: [['Button', h], ['Tokens', `:root { --action: ${colourMap(ctx, 'light').action}; }`]] };
  },
};
// a product screen: the brand's own screen title and content, built from the components
function screen(ctx, dark, mobile) {
  const S = SC(ctx), u = ctx.ui, E = EX(ctx), title = ctx.brand.ui.screen.title;
  const h = `<div class="ui hk-scr${mobile ? ' hk-scr--m' : ''}"${dark ? ' data-theme="dark"' : ''}><header class="hk-scr__h"><p class="hk-scr__t">${A(title)}</p>${u.statusChip(S.deliveries[0].status)}</header>
${u.card({ meta: S.status, title: S.eta, text: S.pickup, action: `<div>${u.btn(E.secondary || S.call, { variant: 'secondary', size: 'sm' })}</div>` })}
${deliveryRows(ctx, mobile ? 3 : 4)}<div>${u.btn(S.form.book, { iconRight: 'arrow-right', block: mobile })}</div></div>`;
  return { lede: mobile ? `${title}, at phone width.` : `${title}, built from the kit's components only.`, live: `<div class="hk-col">${h}</div>`, code: [] };
}

// markup is laid out by the engine; CSS lines are shown as written, a line each
const pretty = (K, h) => (String(h).trim().startsWith('<') ? K.prettyHtml(h) : h);
// ---- the page: a split slide (the title on a field, the live components on the ground), then the markup ----
const grounds = (ctx) => [panelF(ctx), actF(ctx), darkF(ctx), panelF(ctx)];
function body(ctx, K) {
  const p = K.page, d = PAGES[p.id](ctx), sec = p.section ? p.section.n : 1, hex = grounds(ctx)[(sec - 1) % 4];
  const ts = fitSize(ctx, K.pages.filter((q) => q.section).map((q) => q.title), 0.94, 72, 32);
  const top = `<section class="hk-top"><div class="hk-title" style="${fieldStyle(ctx, hex, 'kit title field', 32)}"><p class="ht-k">${A(p.section.title)} <b class="num">${A(p.ref)}</b></p><h1 class="ht-d hk-title__h" style="--bs:${ts}">${A(p.title)}</h1><p class="hk-title__l">${A(d.lede)}</p></div>
<div class="ui hk-live"${d.dark ? ' data-theme="dark"' : ''}>${d.live}</div></section>`;
  const code = d.code.length ? `<section class="hk-code" aria-labelledby="hk-code-h"><h2 class="ht-d hk-code__h" id="hk-code-h">The markup</h2><ol>${d.code.map(([l, h], i) => `<li id="m-${i + 1}" data-rd-n="${p.ref}.${i + 1}"><p class="ht-k"><span class="num">${p.ref}.${i + 1}</span> ${A(l)}</p><pre><code>${A(pretty(K, h))}</code></pre>${copyBtn(pretty(K, h), l)}</li>`).join('')}</ol></section>` : '';
  return top + code;
}
// index.html: the kit's title slide (the logo on its dark ground, a live set of components), then the contents stripes
function cover(ctx, K) {
  const B = ctx.brand, rev = B.logo.colourways.reversed, F = SC(ctx).form, E = EX(ctx), u = ctx.ui, dk = darkF(ctx);
  const live = `<div class="hk-row">${item(u.btn(F.book), 'Primary')}${item(u.btn(E.secondary || F.book, { variant: 'secondary' }), 'Secondary')}${item(u.statusChip(SC(ctx).deliveries[0].status), 'Status')}</div>${item(u.field({ id: 'hk-c1', label: F.pickup, value: F.pickupValue }), 'Field', 'hk-i--w')}`;
  const top = `<section class="hk-top hk-top--cover"><div class="hk-title" style="${fieldStyle(ctx, rev.ground || dk, 'kit cover field', 32)}"><div class="hk-logo">${ctx.logo.html('reversed', { width: 320, label: 'Your logo goes here' })}</div><h1 class="ht-d hk-title__h" style="--bs:${fitSize(ctx, [docName(ctx)], 0.94, 72, 32)}">${A(docName(ctx))}</h1><p class="hk-title__l">${A(B.product)}</p><p class="hk-title__v">${A(ctx.versionLine)}</p></div>
<div class="ui hk-live">${live}</div></section>`;
  return top + contents(ctx, K);
}
function contents(ctx, K) {
  const g = [darkF(ctx), actF(ctx), panelF(ctx)], hs = fitSize(ctx, K.sections.map((s) => s.title), 0.9, 72, 32);
  return `<ol class="ht-ix" id="contents" aria-label="Contents">${K.sections.map((s, i) => `<li style="${fieldStyle(ctx, g[i % 3], 'kit contents section', 32)}"><h2 class="ht-d ht-ix__h" style="--bs:${hs}"><b class="num">${s.n}</b>${A(s.title)}</h2><ol>${s.pages.map((q) => { const r = K.pages.find((x) => x.id === q.id); return `<li><a href="${K.href(q.id)}"><span class="num">${r.ref}</span><span>${A(r.title)}</span></a></li>`; }).join('')}</ol></li>`).join('')}</ol>`;
}

function shell(ctx, K, inner) {
  const p = K.page, toggle = `<button class="ht-btn" type="button" data-disclosure aria-expanded="false" aria-controls="ht-toc">Contents</button>`;
  const mode = `<div class="ht-mode" role="group" aria-label="Colour mode"><button type="button" data-mode="light" aria-pressed="true">Light</button><button type="button" data-mode="dark" aria-pressed="false">Dark</button></div>`;
  const sections = K.sections.map((s) => ({ n: s.n, title: s.title, pages: s.pages.map((q) => K.pages.find((x) => x.id === q.id)) }));
  const toc = tocPanel(ctx, { id: 'ht-toc', sections, href: K.href, current: p.id, front: 'Cover and contents' }).replace('<ol class="ht-toc__l">', `${mode}<ol class="ht-toc__l">`);
  const nx = (q) => q && { href: K.href(q.id), ref: q.ref, title: q.id === 'cover' ? 'Cover and contents' : q.title };
  const next = K.next && K.next.id === 'contents' ? K.pages[K.pages.indexOf(K.next) + 1] : K.next;
  return `<div class="sx ht ht--kit" data-page="${p.id}">

${bar(ctx, { home: 'index.html', doc: docName(ctx), ref: p.ref, title: p.section ? p.title : 'Cover and contents', no: ctx.pageNo(p.id), toggle })}
${toc}
<main id="ht-main" tabindex="-1"><article class="sx-art" data-rd-doc>
${inner}
</article></main>
${nextField(ctx, { next: nx(next), prev: nx(K.prev) })}
<footer class="ht-foot"><span>${A(docName(ctx))}</span><span>${A(ctx.versionLine)}</span></footer>
</div>`;
}

export const kitSite = {
  css: (ctx) => htCss(ctx) + kitCss(ctx), shell, unscroll: '.ht-bar{position:static!important}',
  fallback: (ctx, K) => (PAGES[K.page.id] ? body(ctx, K) : `<section class="hk-code"><p class="ht-p">${A(K.page.title)}</p></section>`),
  pages: { cover, contents: (ctx, K) => contents(ctx, K) },
};
