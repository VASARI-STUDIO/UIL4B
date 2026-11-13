// Theme 32, Dieline, lane hk: the kit site's cover, contents, foundations and reference pages. Each page is the brand's pack run down the
// screen: a printed first panel with the page's lead and its main window, then board panels with the specimens, values and markup.
import { A, net, lead, rows, strip, logoOn, fit, h2 } from './lane-ht-net.js';
import { colourMap, tokenGroups } from '../../engine/tokens.js';
import { env, copyOf, shortest, mixed, note, copyBtn, code, spec, specs } from './lane-hk-parts.js';
import { win } from './lane-ht-net.js';

// one printed colour a page, round the pack's panels in turn
const ROLE = ['front', 'back', 'side', 'flap'];
export function pageHex(ctx, K) {
  const { R } = env(ctx), i = Math.max(0, K.pages.findIndex((p) => p.id === K.page.id));
  return R[ROLE[i % ROLE.length]].hex;
}
// the page's net: the first panel printed in the page's colour, the rest unprinted board; the tuck flap carries the section
export function page(ctx, K, first, rest = [], { hex } = {}) {
  const { R, P } = env(ctx), h = hex || pageHex(ctx, K), s = K.page.section;
  const flap = { n: K.page.ref || '', t: s ? s.title : 'UI kit' };
  return net(ctx, R, P, [{ html: first, hex: h }, ...rest.map((html) => ({ html }))], { flap, hex: h });
}
// the token block for a page: the real custom properties of the groups, filtered by name (K.tokensUsed reads the rules' selectors, so a name filter finds nothing)
const tokenCss = (ctx, groups, re) => {
  const g = tokenGroups(ctx), o = Object.assign({}, ...groups.map((k) => g[k])), ks = Object.keys(o).filter((k) => re.test(k));
  return { css: [':root {', ...ks.map((k) => `  --${k}: ${o[k]};`), '}'].join('\n') };
};
const ratio = (ctx, a, b) => `${ctx.fmt(ctx.ratio(a, b))}:1`;
const fBorder = (ctx) => (ctx.borders.find((b) => /focus/.test(b.token)) || ctx.borders[ctx.borders.length - 1]).px;

// what each page holds, for the contents
export const DESC = {
  'colour-light': 'The roles on the light surface, each with the ratio it reads at.',
  'colour-dark': 'The same roles on the dark surface.',
  'type-scale': 'Every text size the screens use, from caption to headline.',
  spacing: 'The steps every gap and padding is taken from.',
  'radii-borders': 'Corner radii and line widths.',
  elevation: 'How one surface sits above another.',
  states: 'Rest, hover, focus, pressed, disabled and error, side by side.',
  buttons: 'The kinds of button, their sizes and every state.',
  inputs: 'Text fields, selects and text areas.',
  choices: 'Checkboxes, radios, switches and segmented controls.',
  cards: 'Plain, raised and stat cards.',
  navigation: 'The top bar, the sidebar, tabs, breadcrumbs and the phone tab bar.',
  lists: 'Rows of things, with a status where it matters.',
  status: 'Status words in their colours, on both surfaces.',
  feedback: 'Alerts, toasts, inline messages and loading.',
  dialog: 'A question the page waits on.',
  table: 'Rows to compare, with figures that line up.',
  empty: 'What a screen says when there is nothing in it yet.',
  'screen-light': 'The parts put together on one screen, light.',
  'screen-dark': 'The same screen, dark.',
  'screen-mobile': 'The screen at phone width.',
  tokens: 'Every custom property the kit sets, ready to copy.',
  code: 'How the markup goes on a page.',
};
// the contents as strips of the net: one strip a section, one cell a page
const tile = (K, q) => ({ html: `<a class="hk-tile" href="${K.href(q.id)}"><span class="hk-tile__r m">${A(q.ref || '')}</span><span class="hk-tile__t">${A(q.title)}</span>${DESC[q.id] ? `<span class="hk-tile__d">${A(DESC[q.id])}</span>` : ''}</a>` });
export const sectionStrip = (K, s) => `<section class="hk-sec"><h2 class="hs-h2"><span class="hk-sec__n">${A(s.n)}</span> ${A(s.title)}</h2>${strip(s.pages.map((q) => tile(K, q)), 'hk-tiles')}</section>`;

// a small run of live components, the same in every mode window
function sampler(ctx, id) {
  const u = ctx.ui, c = copyOf(ctx);
  return `<div class="hk-samp">${u.btn(c.book)}${u.btn(c.secondary, { variant: 'secondary' })}</div>${u.field({ id: `${id}-f`, label: c.F.pickup, value: c.F.pickupValue })}<div class="hk-samp">${u.statusChip('on-the-way', { label: c.st('on-the-way') })}${u.check(shortest(c.checks), { name: `${id}-c`, checked: true })}</div>`;
}
function cardSample(ctx) {
  const u = ctx.ui, c = copyOf(ctx), C = c.C;
  return `${u.card({ meta: C.status, title: C.eta, text: C.pickup })}<div class="hk-samp">${u.btn(c.book)}${u.btn(c.secondary, { variant: 'secondary' })}</div>`;
}

// ---- colour, one mode ----
function colourPage(ctx, K, mode) {
  const M = colourMap(ctx, mode), dark = mode === 'dark', r = (a, b) => ratio(ctx, a, b);
  const on = (k, g) => `On --${g} ${r(M[k], M[g])}`;
  const groups = [
    ['Surfaces', ['surface', 'raised', 'sunken'], (k) => `--text on it ${r(M.text, M[k])}`],
    ['Text', ['text', 'text-soft', 'quiet', 'quiet-sunken'], (k) => (k === 'quiet-sunken' ? on(k, 'sunken') : on(k, 'surface'))],
    ['Lines and focus', ['edge', 'divider', 'focus'], (k) => on(k, 'surface')],
    ['Action', ['action', 'action-hover', 'action-pressed', 'action-label', 'action-text'], (k) => (k === 'action-label' ? on(k, 'action') : k === 'action-text' ? on(k, 'surface') : `--action-label on it ${r(M['action-label'], M[k])}`)],
    ['Disabled and scrim', ['disabled-bg', 'disabled-text', 'scrim'], (k) => (k === 'disabled-text' ? on(k, 'disabled-bg') : k === 'scrim' ? 'Behind a dialog.' : `--disabled-text on it ${r(M['disabled-text'], M[k])}`)],
    ['Status', ['success', 'success-bg', 'warning', 'warning-bg', 'danger', 'danger-bg', 'info', 'info-bg'], (k) => (/-bg$/.test(k) ? `--${k.replace(/-bg$/, '')} on it ${r(M[k.replace(/-bg$/, '')], M[k])}` : on(k, 'surface'))],
  ];
  const cell = (k, txt) => ({ html: `<span class="hk-sw" style="background:${M[k]}" aria-hidden="true"></span><span class="m hk-tok">--${A(k)}</span><span class="hk-hexrow"><span class="m">${A(M[k])}</span>${copyBtn(M[k], `--${k} ${M[k]}`)}</span><span class="hs-q">${mixed(txt)}</span>` });
  const panels = groups.map(([t, ks, f]) => { const have = ks.filter((k) => M[k]); return have.length ? `${h2(A(t))}${strip(have.map((k) => cell(k, f(k))), 'hk-sws')}` : ''; }).filter(Boolean);
  const cssText = `${dark ? '[data-theme="dark"]' : ':root'} {\n${Object.entries(M).map(([k, v]) => `  --${k}: ${v};`).join('\n')}\n}`;
  const first = `${lead(dark ? 'The same roles on the dark surface. Each role is retuned for the dark surface, so every pair still reads.' : 'Every colour on a screen comes from these roles. The ratio beside each one is measured against the surface it sits on.')}
${win(sampler(ctx, `hk-${mode}`), { dark, label: `Components, ${mode}` })}`;
  return page(ctx, K, first, [...panels, code(K, cssText, `${mode} colour properties`, { lang: 'CSS' })]);
}

// ---- type ----
const SAMPLE = (c) => ({ caption: c.C.riderNote, label: c.F.pickup, body: c.C.pickup, control: c.F.book, 'title-s': c.D.title || c.F.title, title: c.C.eta, headline: c.M.title || c.C.eta });
function typeStyle(t) {
  const face = t.face === 'display' ? 'display' : 'body';
  return `font-family:var(--ff-${face});font-size:var(--fs-${t.token},${t.size}px);line-height:var(--lh-${t.token},${t.line}px);font-weight:${t.weight};color:var(--text)`;
}

export const found = {
  cover(ctx, K) {
    const { R } = env(ctx), B = ctx.brand, hex = R.front.hex, title = `${B.name} UI kit`;
    const first = `${logoOn(ctx, R, 'horizontal', hex, 200)}
<h1 class="disp hs-fit hk-title" style="${fit(ctx, title, { max: 120, min: 40, lines: 2 }, { max: 56, min: 28, lines: 3 })}">${A(title)}</h1>
${lead(A(B.lines.primary))}<p class="hk-meta m">${A(ctx.versionLine)}</p>`;
    const both = `${h2('Light and dark')}${note('The same components on the two surfaces. The switch at the top of every page sets the whole kit.')}
<div class="hs-two"><div>${win(cardSample(ctx), { label: 'Light' })}</div><div>${win(cardSample(ctx), { dark: true, label: 'Dark' })}</div></div>`;
    const contents = `${h2('Contents')}${K.sections.map((s) => sectionStrip(K, s)).join('')}`;
    return page(ctx, K, first, [both, contents], { hex });
  },
  contents(ctx, K) {
    const first = `${lead(`The kit runs in ${K.sections.length} parts: ${K.sections.map((s) => s.title).join(', ').replace(/, ([^,]*)$/, ' and $1')}. Each page shows the live components, their values and the markup to copy.`)}`;
    return page(ctx, K, first, K.sections.map((s) => sectionStrip(K, s)));
  },
  'colour-light': (ctx, K) => colourPage(ctx, K, 'light'),
  'colour-dark': (ctx, K) => colourPage(ctx, K, 'dark'),

  'type-scale'(ctx, K) {
    const c = copyOf(ctx), S = SAMPLE(c), fam = (t) => (t.face === 'display' ? ctx.brand.fonts.display : ctx.brand.fonts.body).family;
    const big = [...ctx.uiType].reverse().map((t) => `<p class="hk-ty" style="${typeStyle(t)}">${A(S[t.token] || t.use)}</p>`).join('');
    const first = `${lead(`${ctx.uiType.length} sizes in two faces: ${ctx.brand.fonts.display.family} for titles, ${ctx.brand.fonts.body.family} for everything read or pressed.`)}${win(`<div class="hk-tys">${big}</div>`, { label: 'The scale in use' })}`;
    const list = rows(ctx.uiType.map((t) => [`<span class="m">${A(t.token)}</span>`, `<span class="hk-tyv">${mixed(`${t.size} px on ${t.line} px, weight ${t.weight}, ${fam(t)}`)}</span><span class="hs-q">${A(t.use)}</span>`]));
    const tk = tokenCss(ctx, ['font', 'text'], /^(ff|fs|lh|fw)-/);
    return page(ctx, K, first, [`${h2('Values')}${list}`, code(K, tk.css, 'type properties', { lang: 'CSS' })]);
  },

  spacing(ctx, K) {
    const bars = ctx.space.map((s) => `<div class="hk-sp"><span class="m">${A(s.token)}</span><span class="m hk-sp__px">${s.px} px</span><span class="hk-sp__bar" style="width:${s.px}px"></span></div>`).join('');
    const first = `${lead(`One scale on a ${ctx.brand.ui.spacingBase || ctx.space[0].px} px base. The gap inside a group is always smaller than the gap between groups.`)}${win(`<div class="hk-sps">${bars}</div>`, { label: 'Spacing scale' })}`;
    const tk = tokenCss(ctx, ['space'], /^sp-/);
    return page(ctx, K, first, [spec(K, { title: 'In use', text: 'A card and the actions under it: the card pads its own content; the actions sit one step further away.', live: cardSample(ctx), html: cardSample(ctx), name: 'card with actions' }), code(K, tk.css, 'spacing properties', { lang: 'CSS' })]);
  },

  'radii-borders'(ctx, K) {
    const u = ctx.ui, c = copyOf(ctx);
    const rs = ctx.radii.map((r) => `<div class="hk-rd"><span class="hk-rd__box" style="border-radius:${Math.min(r.px, 48)}px" aria-hidden="true"></span><span class="m">${A(r.token)}</span><span class="m">${r.px > 999 ? 'Round' : `${r.px} px`}</span><span class="hk-rd__u">${A(r.use || '')}</span></div>`).join('');
    const bs = ctx.borders.map((b) => `<div class="hk-bd"><span class="hk-bd__ln" style="height:${b.px}px" aria-hidden="true"></span><span class="m">${A(b.token)}</span><span class="m">${b.px} px</span><span class="hk-rd__u">${A(b.use || '')}</span></div>`).join('');
    const live = `<div class="hk-samp">${u.btn(c.book)}${u.switch(shortest(c.switches), { checked: true })}</div>${u.field({ id: 'hk-rb-f', label: c.F.pickup, value: c.F.pickupValue })}`;
    const first = `${lead('Small radii on everything pressed or typed into, a slightly larger one on what holds them, and a full round only where the shape is the meaning.')}${win(`<div class="hk-rds">${rs}</div>`, { label: 'Radii' })}`;
    return page(ctx, K, first, [`${h2('Line widths')}${win(`<div class="hk-bds">${bs}</div>`, { label: 'Line widths' })}`, spec(K, { title: 'In use', live, html: live, name: 'button, switch and field' }), code(K, tokenCss(ctx, ['radius', 'width'], /^(r|w)-/).css, 'radius and line properties', { lang: 'CSS' })]);
  },

  elevation(ctx, K) {
    const u = ctx.ui, c = copyOf(ctx), C = c.C, L = colourMap(ctx, 'light'), D = colourMap(ctx, 'dark');
    const flat = ctx.brand.ui.shadows === 'none';
    const sh = flat ? '' : (tokenCss(ctx, ['shadow'], /^shadow-/).css.match(/--shadow-float:\s*([^;]+);/) || [])[1];
    const stack = `<div class="hk-el"><div class="hk-el__well"><span class="hk-el__k">--sunken</span>${u.card({ meta: C.status, title: C.rider, text: C.riderNote })}${u.card({ meta: C.deliverToLabel, title: C.deliverTo, text: C.eta, raised: true })}</div>${u.toast(C.toast)}</div>`;
    const first = `${lead(flat ? 'Surfaces step in tone, not in shadow. A well sits a step down on --sunken, a card rests on --surface with a hairline, and a raised card steps up to --raised with no edge.' : 'Cards rest on hairlines. Only what floats over the page takes the float shadow.')}
<div class="hs-two"><div>${win(stack, { label: 'Light' })}</div><div>${win(stack, { dark: true, label: 'Dark' })}</div></div>`;
    const list = rows([['--sunken', mixed(`${L.sunken} light, ${D.sunken} dark`)], ['--surface', mixed(`${L.surface} light, ${D.surface} dark`)], ['--raised', mixed(`${L.raised} light, ${D.raised} dark`)], ...(sh ? [['--shadow-float', `<span class="m">${A(sh.trim())}</span>`]] : [])]);
    return page(ctx, K, first, [`${h2('Values')}${list}`, code(K, stack, 'surfaces, cards and toast')]);
  },

  states(ctx, K) {
    const u = ctx.ui, c = copyOf(ctx), M = colourMap(ctx, 'light'), go = c.small, ck = shortest(c.checks), F = c.F;
    const fl = { label: F.ready || F.pickup, value: F.readyValue || F.pickupValue };
    const cols = [
      ['Rest', [u.btn(go), u.btn(c.secondary, { variant: 'secondary' }), u.check(ck, { name: 'hk-s1' }), u.field({ id: 'hk-s1', ...fl })], 'Before anyone touches it.'],
      ['Hover', [u.btn(go, { state: 'hover' }), u.btn(c.secondary, { variant: 'secondary', state: 'hover' })], `The fill steps to --action-hover ${M['action-hover']}.`],
      ['Focus', [u.btn(go, { state: 'focus' }), u.btn(c.secondary, { variant: 'secondary', state: 'focus' }), u.check(ck, { name: 'hk-s3', state: 'focus' }), u.field({ id: 'hk-s3', ...fl, state: 'focus' })], `A ${fBorder(ctx)} px ring in --focus, on every control the keyboard reaches.`],
      ['Pressed', [u.btn(go, { state: 'pressed' }), u.btn(c.secondary, { variant: 'secondary', state: 'pressed' })], `The fill goes to --action-pressed ${M['action-pressed']}.`],
      ['Disabled', [u.btn(c.secondary, { variant: 'secondary', disabled: true }), u.check(ck, { name: 'hk-s5', disabled: true }), u.field({ id: 'hk-s5', ...fl, disabled: true })], '--disabled-bg and --disabled-text.'],
      ['Error', [u.field({ id: 'hk-s6', ...fl, error: F.readyError || F.bookWhy || F.notesHelp })], 'A --danger edge, and a message under the field that says what to enter.'],
    ];
    const cells = cols.map(([n, xs, t]) => ({ html: `<p class="hk-stn">${A(n)}</p>${win(`<div class="hk-stc">${xs.join('')}</div>`, { label: n })}<span class="hs-q">${mixed(t)}</span>` }));
    const first = `${lead('The same controls in each state, at their real size. Every state is drawn; none is left to the browser.')}`;
    return page(ctx, K, first, [`${h2('Side by side')}${strip(cells, 'hk-sts')}`, code(K, cols[2][1].join(''), 'controls in focus')]);
  },

  tokens(ctx, K) {
    const all = K.tokensUsed(/./), D = colourMap(ctx, 'dark');
    const dark = `[data-theme="dark"] {\n${Object.entries(D).map(([k, v]) => `  --${k}: ${v};`).join('\n')}\n}`;
    const first = `${lead(`${all.names.length} custom properties: colour, space, radius, line, type and the float shadow. The dark block overrides the colours only.`)}<div class="hk-samp">${copyBtn(all.css, 'every property, light', 'Copy the light set')}${copyBtn(dark, 'the dark colours', 'Copy the dark set')}</div>`;
    return page(ctx, K, first, [code(K, all.css, 'every property, light', { lang: 'CSS' }), code(K, dark, 'the dark colours', { lang: 'CSS' })]);
  },

  code(ctx, K) {
    const u = ctx.ui, c = copyOf(ctx), F = c.F;
    const region = `<div class="ui">\n${u.btn(c.book)}\n</div>`, regionD = `<div class="ui" data-theme="dark">\n${u.btn(c.book)}\n</div>`;
    const form = `${u.field({ id: 'hk-c-f', label: F.pickup, value: F.pickupValue })}${u.field({ id: 'hk-c-s', label: F.size, kind: 'select', options: F.sizes || [], value: (F.sizes || [])[0] })}${u.btn(F.book)}`;
    const first = `${lead('Each component is plain HTML. It takes its look from the ui- classes inside an element with the class ui, and turns dark when that element, or the page, carries data-theme="dark".')}`;
    return page(ctx, K, first, [
      spec(K, { title: 'A region', text: 'Wrap a screen, or one part of it, in the region.', live: u.btn(c.book), html: region, name: 'a light region' }),
      spec(K, { title: 'A dark region', text: 'The same markup with data-theme on the region.', live: u.btn(c.book), dark: true, html: regionD, name: 'a dark region' }),
      spec(K, { title: 'A form', text: 'Labels sit above their fields and are tied to them by id.', live: `<div class="hk-form">${form}</div>`, html: form, name: 'a form' }),
    ]);
  },
};
