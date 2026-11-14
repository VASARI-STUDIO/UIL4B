// Theme 31, Contact sheet, lane hk: what each kit page shows. A page is { lede, enl, enlCap, dark, lt, flush, parts: [html], code } where enl
// is the enlargement (the page's component, live), and parts are bands (cuts of bracketed exposures) and rows. Copy is the brand's own
// (ctx.brand.ui.screen.content), falling back as lane u2 does; the theme's words are about how a component behaves, never about the brand.
import { A, cwOn } from './helpers.js';
import { colourMap, tokenGroups } from '../../engine/tokens.js';
import { applyState } from '../../engine/kit-site.js';
import { cut, row, band, codeBlock } from './lane-hk-sheet.js';

const NB = String.fromCharCode(160);
const sc = (ctx) => ctx.brand.ui.screen.content;
const ex = (ctx) => sc(ctx).example || {};
const pxOf = (list, token) => (list.find((t) => t.token === token) || {}).px;
const typeOf = (ctx, token) => ctx.uiType.find((t) => t.token === token) || {};
const ratioText = (ctx, a, b) => `${ctx.fmt(ctx.ratio(a, b))}${NB}:${NB}1`;
const mono = (t) => `<span class="hk-mono">${A(t)}</span>`;
const p = (t, cls = 'hk-p') => `<p class="${cls}">${A(t)}</p>`;
const note = (t) => p(t, 'hk-note');
const w = (h) => `<div class="hk-w">${h}</div>`;
// name and literal value pairs, as a list (never a table)
const vals = (rows) => `<dl class="hk-vals">${rows.map(([k, v]) => `<div><dt>${A(k)}</dt><dd>${mono(v)}</dd></div>`).join('')}</dl>`;
const tgt = (html, tag) => html.replace(new RegExp(`<${tag}\\b`), `<${tag} data-target`);
const unid = (html, i) => html.replace(/\bhk-b-([a-z]+)\b/g, `hk-b-$1-${i}`);

// ---- benches: every variant x state, scanned in a real browser by the engine. The cuts below show the same matrix as exposures ----
const BTN_STATES = [{ id: 'rest', label: 'Rest' }, { id: 'hover', label: 'Hover', cls: 'is-hover' }, { id: 'focus', label: 'Focus', cls: 'is-focus' }, { id: 'pressed', label: 'Pressed', cls: 'is-pressed' }, { id: 'disabled', label: 'Disabled', attr: { disabled: '' } }];
const IN_STATES = [{ id: 'rest', label: 'Rest' }, { id: 'hover', label: 'Hover', cls: 'is-hover' }, { id: 'focus', label: 'Focus', cls: 'is-focus' }, { id: 'disabled', label: 'Disabled', attr: { disabled: '' } }];
const CH_STATES = [{ id: 'rest', label: 'Rest' }, { id: 'checked', label: 'Checked', attr: { checked: '' } }, { id: 'focus', label: 'Focus', cls: 'is-focus' }, { id: 'disabled', label: 'Disabled', attr: { disabled: '' } }];
export const benches = {
  buttons: (ctx) => {
    const F = sc(ctx).form, E = ex(ctx);
    return { target: '.ui-btn', states: BTN_STATES, variants: [['primary', 'Primary', F.book], ['secondary', 'Secondary', E.secondary], ['quiet', 'Quiet', E.quiet], ['danger', 'Danger', E.danger]]
      .map(([id, label, t]) => ({ id, label, html: tgt(ctx.ui.btn(t || F.book, id === 'primary' ? {} : { variant: id }), 'button') })) };
  },
  inputs: (ctx) => {
    const F = sc(ctx).form;
    return { target: '.ui-input', states: IN_STATES, variants: [
      { id: 'text', label: 'Text field', html: tgt(ctx.ui.field({ id: 'hk-b-tx', label: F.pickup, value: F.pickupValue }), 'input') },
      { id: 'error', label: 'With an error', html: tgt(ctx.ui.field({ id: 'hk-b-er', label: F.ready, value: F.readyValue, error: F.readyError }), 'input') },
    ] };
  },
  choices: (ctx) => {
    const E = ex(ctx), c = E.checks || [], r = E.radios || [], s = E.switches || [];
    return { target: 'input', states: CH_STATES, variants: [
      { id: 'checkbox', label: 'Checkbox', html: tgt(ctx.ui.check(c[0] || r[0] || s[0], { name: 'hk-b-c' }), 'input') },
      { id: 'radio', label: 'Radio', html: tgt(ctx.ui.check(r[0] || c[0], { type: 'radio', name: 'hk-b-r' }), 'input') },
      { id: 'switch', label: 'Switch', html: tgt(ctx.ui.switch(s[0] || c[0]), 'input') },
    ] };
  },
};
// a bench's states as a cut: one exposure per state of one variant
function benchCut(ctx, b, vId, { skip = [], wrap = false } = {}) {
  const v = b.variants.find((x) => x.id === vId);
  const fr = b.states.filter((s) => !skip.includes(s.id)).map((s, i) => ({ label: s.label, html: (wrap ? w : (x) => x)(unid(applyState(v.html, s), i).replace(/ data-target/, '')) }));
  return cut(`${v.label}, bracketed`, fr);
}
// the scan the engine read from the CSS: per state, the ground, the label, the edge, the ring and the scale, light and dark
function scanList(ctx, K, b, vId, skip = []) {
  const S = K.scan && K.scan[vId];
  if (!S) return '';
  const tv = (x) => (x && (x.light || x.dark) ? `${x.token ? '--' + x.token + ' ' : ''}${x.light || 'none'} / ${x.dark || 'none'}` : 'none');
  const items = b.states.filter((s) => !skip.includes(s.id) && S[s.id]).map((s) => {
    const r = S[s.id], rows = [['Ground', tv(r.bg)], ['Text', tv(r.fg)], ['Edge', r.border && r.border.width ? `${r.border.width} px, ${tv(r.border)}` : 'none'], ['Ring', tv(r.outline)]];
    if (r.scale) rows.push(['Scale', `${r.scale}%`]);
    return `<li><h3 class="hk-scan__s">${A(s.label)}</h3>${vals(rows)}</li>`;
  }).join('');
  return `<ul class="hk-scan">${items}</ul>`;
}
// the markup and the tokens it reads
function code(K, name, markup, re, key) {
  const used = K.tokensUsed ? K.tokensUsed(re) : { names: [] };
  return codeBlock(`${name}: markup`, K.prettyHtml ? K.prettyHtml(markup) : markup, `${name} markup`, `hk-c-${key}`)
    + (used.names && used.names.length ? codeBlock('Tokens it reads', used.css, `${name} tokens`, `hk-t-${key}`) : '');
}

// ---- the thumbnails on the strip: each page drawn in flat shapes of the kit's own colours, no words ----
const FILL = { t: 'background:var(--text)', a: 'background:var(--action)', e: 'box-shadow:inset 0 0 0 1px var(--edge)', d: 'background:var(--divider)', r: 'background:var(--raised);box-shadow:inset 0 0 0 1px var(--divider)', k: 'background:var(--sunken)', q: 'background:var(--quiet)', s: 'background:var(--success)', w: 'background:var(--warning)', x: 'background:var(--danger)', i: 'background:var(--info)', f: 'background:var(--focus)' };
const sh = (x, y, wd, h, f, r = 1) => `<i class="hk-th__i" style="left:${x}%;top:${y}%;width:${wd}%;height:${h}%;${FILL[f]};border-radius:${r}px"></i>`;
const many = (list) => list.map((a) => sh(...a)).join('');
const aa = (cls = '') => `<b class="hk-th__aa ${cls}">Aa</b>`;
const bands = () => many([[0, 0, 34, 100, 'r', 0], [34, 0, 18, 100, 'k', 0], [52, 0, 16, 100, 'q', 0], [68, 0, 16, 100, 't', 0], [84, 0, 16, 100, 'a', 0]]);
const THUMB = {
  cover: () => aa() + sh(30, 76, 40, 8, 'a'),
  contents: () => many([0, 1, 2].flatMap((c) => [0, 1].map((r) => [10 + c * 28, 16 + r * 38, 24, 30, 'k']))),
  'colour-light': bands, 'colour-dark': bands,
  'type-scale': () => aa('hk-th__aa--l') + many([[58, 30, 30, 6, 't'], [58, 46, 26, 4, 'q'], [58, 56, 30, 4, 'q'], [58, 66, 18, 4, 'q']]),
  spacing: () => many([4, 8, 12, 16, 24, 32].map((s, i) => [16, 14 + i * 12, s * 2, 6, i > 3 ? 'a' : 'q'])),
  'radii-borders': () => sh(10, 28, 22, 34, 'e', 2) + sh(39, 28, 22, 34, 'e', 6) + sh(68, 28, 22, 34, 'e', 9999),
  elevation: () => many([[12, 20, 56, 54, 'k', 2], [24, 30, 56, 54, 'r', 2]]),
  states: () => many([[8, 40, 18, 18, 'a', 2], [30, 40, 18, 18, 'a', 2], [74, 40, 18, 18, 'k', 2]]) + sh(50, 38, 22, 22, 'e', 3) + sh(52.5, 42, 17, 14, 'a', 2),
  buttons: () => many([[12, 36, 36, 24, 'a', 2], [54, 36, 34, 24, 'e', 2]]),
  inputs: () => many([[14, 18, 30, 6, 'q'], [14, 28, 72, 18, 'e', 2], [14, 56, 22, 6, 'q'], [14, 66, 72, 18, 'e', 2]]),
  choices: () => many([[14, 24, 9, 14, 't', 2], [28, 28, 40, 6, 'q'], [14, 46, 9, 14, 'e', 2], [28, 50, 34, 6, 'q'], [14, 68, 18, 14, 'a', 9999], [36, 72, 30, 6, 'q']]),
  cards: () => many([[18, 14, 64, 72, 'r', 3], [24, 52, 30, 7, 't'], [24, 64, 44, 4, 'q'], [24, 72, 36, 4, 'q'], [18, 14, 64, 32, 'k', 3]]),
  navigation: () => many([[0, 0, 100, 24, 'r', 0], [8, 9, 14, 6, 't'], [46, 9, 12, 6, 'q'], [62, 9, 12, 6, 'q'], [78, 9, 12, 6, 'q'], [46, 20, 12, 4, 'a', 0], [8, 40, 40, 10, 't']]),
  lists: () => many([0, 1, 2, 3].flatMap((i) => [[10, 12 + i * 21, 40, 6, 't'], [10, 21 + i * 21, 28, 4, 'q'], [72, 13 + i * 21, 18, 5, ['i', 'a', 'w', 's'][i]], [10, 29 + i * 21, 80, 1, 'd', 0]])),
  status: () => many([[14, 26, 44, 8, 'i'], [14, 44, 34, 8, 'w'], [14, 62, 50, 8, 's']]),
  feedback: () => many([[10, 24, 80, 26, 'k', 2], [10, 24, 2, 26, 'x', 0], [16, 33, 50, 6, 't'], [10, 62, 80, 22, 't', 2], [16, 70, 40, 6, 'r']]),
  dialog: () => many([[0, 0, 100, 100, 'k', 0], [20, 16, 60, 68, 'r', 3], [28, 26, 36, 8, 't'], [28, 40, 44, 4, 'q'], [52, 64, 22, 12, 'a', 2]]),
  table: () => many([[8, 14, 84, 14, 'k', 0], ...[0, 1, 2, 3].flatMap((i) => [[12, 36 + i * 15, 28, 4, 't'], [70, 36 + i * 15, 18, 4, 'q'], [8, 44 + i * 15, 84, 1, 'd', 0]])]),
  empty: () => sh(42, 14, 16, 24, 'e', 9999) + many([[26, 48, 48, 7, 't'], [32, 60, 36, 4, 'q'], [36, 72, 28, 12, 'a', 2]]),
  'screen-light': () => THUMB.lists(),
  'screen-dark': () => THUMB.lists(),
  'screen-mobile': () => many([[36, 6, 28, 88, 'e', 6], [40, 14, 18, 5, 't'], [40, 26, 20, 3, 'q'], [40, 36, 20, 3, 'q'], [40, 46, 20, 3, 'q'], [40, 80, 20, 8, 'a', 2]]),
  tokens: () => many([0, 1, 2, 3].flatMap((i) => [[12, 14 + i * 19, 12, 12, ['t', 'a', 'k', 'q'][i], 2], [30, 17 + i * 19, 34, 5, 'q']])),
  code: () => many([[12, 18, 40, 5, 'q'], [20, 30, 52, 5, 'q'], [28, 42, 30, 5, 'a'], [28, 54, 44, 5, 'q'], [20, 66, 24, 5, 'q'], [12, 78, 18, 5, 'q']]),
};
export const thumb = {
  html: (id) => `<span class="hk-th">${(THUMB[id] || THUMB.cover)()}</span>`,
  dark: (id) => id === 'colour-dark' || id === 'screen-dark',
  light: (id) => id === 'colour-light' || id === 'screen-light',
};

// ---- shared pieces ----
const heading = (ctx, t, size = 'title') => `<p class="ui-display hk-disp" style="font-size:var(--fs-${size});line-height:var(--lh-${size})">${A(t)}</p>`;
const logoOn = (ctx, ground, wd) => `<span class="hk-logo" style="width:${wd}px" aria-hidden="true">${ctx.logo.html('horizontal', { width: wd, colourway: cwOn(ctx, ground), label: '' })}</span>`;
function screen(ctx, mode, { phone = false } = {}) {
  const ui = ctx.ui, B = ctx.brand, S = sc(ctx), E = ex(ctx), R = ctx.roles[mode === 'dark' ? 'dark' : 'light'];
  const links = (E.links || []).slice(0, 3);
  const top = `<nav class="ui-topbar hk-top-ui" aria-label="Product, ${mode}">${logoOn(ctx, R.surface, phone ? 96 : 112)}${phone ? '' : `<div class="ui-topbar__links">${ui.links(links, 0)}</div>`}</nav>`;
  const n = Math.min(phone ? 3 : 4, S.deliveries.length);
  const body = `<div class="hk-scr__b">${ui.crumbs(E.crumbs || [B.ui.screen.title])}${heading(ctx, B.ui.screen.title, phone ? 'title' : 'headline')}${ui.tabs(E.tabs || [B.ui.screen.title], 0)}<div class="hk-scr__l">${ui.deliveryRows(n)}</div>${ui.btn(S.form.book)}</div>`;
  return `<div class="hk-scr${phone ? ' hk-scr--p' : ''}">${top}${body}</div>`;
}

// ---- the pages ----
export const PAGES = {
  cover: (ctx) => {
    const S = sc(ctx), F = S.form;
    return {
      lede: `The ${ctx.brand.name} interface as a contact sheet: every component live, light and dark, each state a frame of its own, with the markup to copy.`,
      enl: `<div class="hk-stack hk-stack--l">${heading(ctx, ctx.brand.ui.screen.title)}${ctx.ui.deliveryRows(Math.min(3, S.deliveries.length))}<div class="hk-acts">${ctx.ui.btn(F.book)}${ctx.ui.btn(ex(ctx).secondary || F.book, { variant: 'secondary' })}</div></div>`,
      enlCap: 'Live components, as the product ships them.',
    };
  },
  contents: (ctx, K) => ({ lede: `${K.sections.length} sections, ${K.pages.filter((q) => q.section).length} pages. Every frame on the roll opens its page.` }),

  'colour-light': (ctx) => colourPage(ctx, 'light'),
  'colour-dark': (ctx) => colourPage(ctx, 'dark'),

  'type-scale': (ctx) => {
    const B = ctx.brand, T = B.type;
    const sample = (t) => (t.face === 'display' ? T.sample.headline : t.token === 'caption' ? T.sample.caption : t.token === 'label' || t.token === 'control' ? sc(ctx).form.title : T.sample.paragraph);
    const list = `<ol class="hk-scale">${ctx.uiType.map((t) => `<li><div class="hk-scale__k"><p class="hk-scale__t">${A(t.token)}</p><p class="hk-note">${mono(`${t.size}/${t.line} ${t.weight}`)}, ${A(t.use)}</p></div><p class="ui hk-scale__s${t.face === 'display' ? ' hk-disp' : ''}" style="font-size:var(--fs-${t.token});line-height:var(--lh-${t.token});font-weight:var(--fw-${t.token})">${A(sample(t))}</p></li>`).join('')}</ol>`;
    return {
      lede: `${B.fonts.display.family} for titles, ${B.fonts.body.family} for everything you read and press, ${B.fonts.mono.family} for literal values.`,
      enl: `<div class="hk-stack">${heading(ctx, T.sample.headline, 'headline')}<p class="hk-ui-body">${A(T.sample.paragraph)}</p><p class="hk-ui-cap">${A(T.sample.caption)}</p></div>`,
      enlCap: 'The headline, the body and the caption at their sizes.',
      parts: [row('The scale', list, '', { wide: true }), row('Faces', vals([['Display', B.fonts.display.family], ['Text', B.fonts.body.family], ['Mono', B.fonts.mono.family]]), note('Numbers that line up in a column use tabular figures.'))],
    };
  },

  spacing: (ctx) => {
    const ui = ctx.ui, F = sc(ctx).form, gap = ctx.brand.ui.spacingBase || 4;
    const steps = ctx.space.map((s) => ({ label: `${s.token}, ${s.px} px`, html: `<span class="hk-sp" style="width:${s.px}px;height:${s.px}px" aria-hidden="true"></span>` }));
    return {
      lede: `Every gap is a step of ${gap} px. Space inside a group is always smaller than the space between groups.`,
      enl: `<div class="hk-stack hk-stack--l">${ui.field({ id: 'hk-sp-1', label: F.pickup, value: F.pickupValue })}${ui.field({ id: 'hk-sp-2', label: F.dropoff, value: F.dropoffValue })}<div class="hk-acts">${ui.btn(F.book)}</div></div>`,
      enlCap: 'Two fields and a button: a small gap inside each field, a larger one between them.',
      parts: [band('The steps', cut('Spacing steps', steps)), row('Values', vals(ctx.space.map((s) => [s.token, `${s.px} px`])))],
    };
  },

  'radii-borders': (ctx) => {
    const radii = ctx.radii.map((r) => ({ label: `${r.token}, ${r.px > 999 ? 'round' : r.px + ' px'}`, html: `<span class="hk-rad" style="border-radius:${Math.min(r.px, 9999)}px" aria-hidden="true"></span>` }));
    const borders = ctx.borders.map((b) => ({ label: `${b.token}, ${b.px} px`, html: `<span class="hk-bd" style="box-shadow:inset 0 0 0 ${b.px}px var(${b.token === 'border-focus' ? '--focus' : b.token === 'border-hairline' ? '--divider' : '--edge'})" aria-hidden="true"></span>` }));
    return {
      lede: 'Corners stay small and edges stay thin, so the frame does the holding.',
      enl: `<div class="hk-stack hk-stack--l">${ctx.ui.card({ meta: sc(ctx).status, title: sc(ctx).eta, text: sc(ctx).pickup })}<div class="hk-acts">${ctx.ui.btn(sc(ctx).form.book)}</div></div>`,
      parts: [band('Corners', cut('Radii', radii)), band('Edges', cut('Borders', borders)),
        row('Values', vals([...ctx.radii.map((r) => [r.token, r.px > 999 ? `${r.px} px, round` : `${r.px} px`]), ...ctx.borders.map((b) => [b.token, `${b.px} px`])]), `<ul class="hk-uses">${[...ctx.radii, ...ctx.borders].map((r) => `<li>${mono(r.token)} ${A(r.use || '')}</li>`).join('')}</ul>`)],
    };
  },

  elevation: (ctx) => {
    const ui = ctx.ui, S = sc(ctx), d = S.deliveries, sh0 = (tokenGroups(ctx).shadow || {})['shadow-float'] || 'none', flat = !sh0 || sh0 === 'none';
    const M = colourMap(ctx, 'light'), D = colourMap(ctx, 'dark');
    const grounds = [['sunken', 'Sunken'], ['surface', 'Surface'], ['raised', 'Raised']].map(([k, l]) => ({ label: l, html: `<span class="hk-gr" style="background:var(--${k})" aria-hidden="true"></span>` }));
    return {
      lede: flat ? 'Nothing floats on a shadow. A raised card drops its edge and steps up one ground instead.' : 'Grounds step up for structure; only what floats over the page, a menu, a dialog or a toast, takes the shadow.',
      enl: `<div class="hk-two">${ui.card({ meta: d[0].price, title: d[0].to })}${ui.card({ meta: d[1 % d.length].price, title: d[1 % d.length].to, raised: true })}</div>`,
      enlCap: 'A card at rest, then raised.',
      parts: [band('Grounds', cut('Three grounds', grounds)), row('Values', vals([['sunken', `${M.sunken} / ${D.sunken}`], ['surface', `${M.surface} / ${D.surface}`], ['raised', `${M.raised} / ${D.raised}`], ['shadow-float', sh0]]), note('Light, then dark.'))],
    };
  },

  states: (ctx) => {
    const ui = ctx.ui, F = sc(ctx).form, E = ex(ctx), M = colourMap(ctx, 'light'), bFoc = pxOf(ctx.borders, 'border-focus');
    const b = benches.buttons(ctx), i = benches.inputs(ctx);
    return {
      lede: 'Every control is shot at rest, under the pointer, with keyboard focus, pressed and disabled: one frame a state.',
      enl: `<div class="hk-z"><div class="hk-acts hk-acts--c">${ui.btn(F.book, { state: 'focus' })}<p class="ui-help hk-why">${A(F.bookWhy)}</p></div></div>`,
      enlCap: 'The primary button with keyboard focus. When the form is not ready, the reason sits beside it.',
      parts: [band('Primary button', benchCut(ctx, b, 'primary', { skip: ['disabled'] }), 'The primary button is never shown disabled.'),
        band('Secondary button', benchCut(ctx, b, 'secondary')), band('Text field', benchCut(ctx, i, 'text', { wrap: true })),
        row('What changes, light', vals([['Hover', M['action-hover']], ['Pressed', M['action-pressed']], [`Focus ring, ${bFoc} px`, M.focus], ['Disabled', M['disabled-bg']]]), note(`${E.secondary ? 'Outlined buttons fill with the sunken ground on hover. ' : ''}A field shows focus with the same ring.`))],
    };
  },

  buttons: (ctx, K) => {
    const ui = ctx.ui, F = sc(ctx).form, E = ex(ctx), M = colourMap(ctx, 'light'), b = benches.buttons(ctx);
    const kinds = [{ label: 'Primary', html: ui.btn(F.book) }, { label: 'Secondary', html: ui.btn(E.secondary || F.book, { variant: 'secondary' }) }, { label: 'Quiet', html: ui.btn(E.quiet || F.book, { variant: 'quiet' }) }, { label: 'Danger', html: ui.btn(E.danger || F.book, { variant: 'danger' }) }, { label: 'Small', html: ui.btn(E.small || F.book, { size: 'sm' }) }];
    return {
      lede: `One primary button a screen. Its label is a verb that says what happens: ${F.book}.`,
      enl: `<div class="hk-z"><div class="hk-bset">${ui.btn(F.book)}${ui.btn(E.secondary || F.book, { variant: 'secondary' })}${ui.btn(E.quiet || F.book, { variant: 'quiet' })}${ui.btn(E.danger || F.book, { variant: 'danger' })}</div></div>`,
      enlCap: 'The four kinds of button, drawn at twice their size: primary, secondary, quiet and danger.',
      parts: [band('The kinds', cut('Buttons', kinds)), band('Primary, bracketed', benchCut(ctx, b, 'primary', { skip: ['disabled'] })), band('Secondary, bracketed', benchCut(ctx, b, 'secondary')),
        row('Read from the CSS', scanList(ctx, K, b, 'primary', ['disabled']), note('The primary button, light / dark, as the browser draws it.')),
        row('Measures', vals([['Height', '44 px'], ['Small', '36 px'], ['Label on action', ratioText(ctx, M['action-label'], M.action)], ['Corner', `${ctx.brand.ui.radius.button ?? ctx.brand.ui.radius.control} px`]]), note('Danger is only for what cannot be undone.')),
        row('Code', code(K, 'Button', ui.btn(F.book), /^\.ui-btn(?![-\w])/, 'btn'), '', { wide: true })],
    };
  },

  inputs: (ctx, K) => {
    const ui = ctx.ui, F = sc(ctx).form, M = colourMap(ctx, 'light'), b = benches.inputs(ctx);
    const kinds = [
      { label: 'With help', html: w(ui.field({ id: 'hk-in-1', label: F.notes, help: F.notesHelp })) },
      { label: 'Select', html: w(ui.field({ id: 'hk-in-2', label: F.size, kind: 'select', options: F.sizes, value: F.sizes[1] })) },
      { label: 'Text area', html: w(ui.field({ id: 'hk-in-3', label: F.notes, kind: 'textarea' })) },
    ];
    return {
      lede: 'The label sits above the field and stays visible. Help sits under it and gives way to the error when there is one.',
      enl: `<div class="hk-stack hk-stack--l">${ui.field({ id: 'hk-in-e', label: F.ready, value: F.readyValue, error: F.readyError })}</div>`,
      enlCap: 'A field with an error: the edge and the message carry the danger colour.',
      parts: [band('The kinds', cut('Fields', kinds)), band('Text field, bracketed', benchCut(ctx, b, 'text', { wrap: true })),
        row('Read from the CSS', scanList(ctx, K, b, 'text'), note('The text field, light / dark.')),
        row('Measures', vals([['Field height', '44 px'], ['Edge on surface', ratioText(ctx, M.edge, M.surface)], ['Error on surface', ratioText(ctx, M.danger, M.surface)]]), note(`An error says what to do next: ${F.readyError}`)),
        row('Code', code(K, 'Field', ui.field({ id: 'pickup', label: F.pickup, value: F.pickupValue }), /^\.ui-(field|label|input|error|help)/, 'in'), '', { wide: true })],
    };
  },

  choices: (ctx, K) => {
    const ui = ctx.ui, F = sc(ctx).form, E = ex(ctx), b = benches.choices(ctx);
    const checks = E.checks || [], radios = E.radios || [], sws = E.switches || [];
    const col = (head, items) => `<div class="hk-col"><p class="hk-ui-lab">${A(head)}</p>${items}</div>`;
    return {
      lede: 'A checkbox is a yes or no that waits for the form. A switch acts at once. A segmented control picks one of a few, and one is always picked.',
      enl: `<div class="hk-cols">${col('Checkbox', checks.map((t, i) => ui.check(t, { checked: i === 0, name: 'hk-ch-c' + i })).join(''))}${col('Radio', radios.map((t, i) => ui.check(t, { type: 'radio', name: 'hk-ch-r', checked: i === 0 })).join(''))}${col('Switch', sws.map((t, i) => ui.switch(t, { checked: i === 0 })).join(''))}<div class="ui-field hk-col${ctx.placeholders ? ' hk-col--w' : ''}">${`<span class="ui-label">${A(F.size)}</span>`}${ui.segmented(F.sizes, 1)}</div></div>`,
      enlCap: 'The whole set, at true size.',
      parts: [band('Checkbox, bracketed', benchCut(ctx, b, 'checkbox', { wrap: true })), band('Switch, bracketed', benchCut(ctx, b, 'switch', { wrap: true })),
        row('Read from the CSS', scanList(ctx, K, b, 'checkbox'), note('The checkbox, light / dark.')),
        row('Measures', vals([['Box', `22 px, ${pxOf(ctx.radii, 'radius-control')} px corner`], ['Switch', '44 x 26 px'], ['Target height', '44 px']]), note('Checked marks fill with the text colour; the switch takes the action colour when it is on.')),
        row('Code', code(K, 'Checkbox', ui.check(checks[0] || radios[0] || 'Option', { checked: true }), /^\.ui-(choice|switch)/, 'ch'), '', { wide: true })],
    };
  },

  cards: (ctx, K) => {
    const ui = ctx.ui, S = sc(ctx), E = ex(ctx), d = S.deliveries;
    const kinds = [
      { label: 'Card', html: w(ui.card({ meta: d[0].price, title: d[0].to })) },
      { label: 'Raised', html: w(ui.card({ meta: d[1 % d.length].price, title: d[1 % d.length].to, raised: true })) },
      { label: 'Stat', html: w(ui.stat(S.paid, E.statLabel || S.paidLabel)) },
    ];
    return {
      lede: 'A card holds one thing someone can open or act on. It rests on the ground with a hairline edge.',
      enl: `<div class="hk-zz"><div class="hk-stack hk-stack--l">${ui.card({ meta: S.status, title: S.eta, text: S.pickup })}${ui.card({ meta: d[0].price, title: d[0].to, raised: true })}</div></div>`,
      enlCap: 'A card at rest, and a raised card beneath it.',
      parts: [band('The kinds', cut('Cards', kinds)),
        row('Measures', vals([['Corner', `${pxOf(ctx.radii, 'radius-card')} px`], ['Edge', `${pxOf(ctx.borders, 'border-hairline')} px`], ['Title', `${typeOf(ctx, 'title-s').size}/${typeOf(ctx, 'title-s').line}`]]), note('A stat is one number and one label, in tabular figures.')),
        row('Code', code(K, 'Card', ui.card({ meta: S.status, title: S.eta, text: S.pickup }), /^\.ui-card/, 'cd'), '', { wide: true })],
    };
  },

  navigation: (ctx, K) => {
    const ui = ctx.ui, B = ctx.brand, E = ex(ctx), L = ctx.roles.light;
    const links = (E.links || []).slice(0, 3), all = [...links, [E.account || 'Account', 'user']];
    const kinds = [
      { label: 'Breadcrumbs', html: w(ui.crumbs(E.crumbs || [B.ui.screen.title])) },
      { label: 'Tabs', wide: true, html: w(ui.tabs(E.tabs || [B.ui.screen.title], 0)) },
      { label: 'Sidebar, dark', dark: true, wide: true, html: w(`<nav class="ui-sidebar" aria-label="Sections, sidebar">${ui.links(all, 0)}</nav>`) },
      { label: 'Tab bar, dark', dark: true, wide: true, html: w(`<nav class="ui-tabbar" aria-label="Sections, tab bar">${all.map(([t, i], k) => `<a href="#"${k === 0 ? ' aria-current="page"' : ''}>${ui.icon(i, 20)}${A(t)}</a>`).join('')}</nav>`) },
    ];
    return {
      lede: 'The current page carries a bar in the action colour. Tabs change the view of one list; they never change the page.',
      enl: `<div class="hk-scr"><nav class="ui-topbar hk-top-ui" aria-label="Main">${logoOn(ctx, L.surface, 112)}<div class="ui-topbar__links">${ui.links(links, 0)}</div></nav><div class="hk-scr__b">${heading(ctx, B.ui.screen.title)}${ui.tabs(E.tabs || [B.ui.screen.title], 0)}</div></div>`,
      enlCap: 'The top bar at desktop width, and the tabs under the page title.',
      flush: true,
      parts: [band('The kinds', cut('Navigation', kinds)),
        row('Measures', vals([['Link height', '44 px'], ['Tab bar height', '64 px'], ['Sidebar width', '220 px'], ['Tab bar items', `${all.length}`]])),
        row('Code', code(K, 'Tabs', ui.tabs(E.tabs || [B.ui.screen.title], 0), /^\.ui-tabs/, 'nv'), '', { wide: true })],
    };
  },

  lists: (ctx, K) => {
    const ui = ctx.ui, S = sc(ctx), d = S.deliveries;
    const kinds = [
      { label: 'Without a lead', wide: true, html: w(`<ul class="ui-list">${d.slice(0, 2).map((x) => ui.row({ title: x.to, sub: x.when, end: x.price })).join('')}</ul>`) },
      { label: 'With a person and an action, dark', dark: true, wide: true, html: w(`<ul class="ui-list">${ui.row({ lead: A(S.initials), title: S.rider, sub: S.riderNote, endHtml: ui.btn(S.call, { variant: 'secondary', size: 'sm' }) })}</ul>`) },
    ];
    return {
      lede: 'The title says who or where, the line under it says when, and the status is the only colour in the row.',
      enl: `<div class="hk-stack hk-stack--l">${ui.deliveryRows(Math.min(4, d.length))}</div>`,
      parts: [band('The kinds', cut('Rows', kinds)),
        row('Measures', vals([['Row height, at least', '64 px'], ['Lead', '40 px'], ['Divider', `${pxOf(ctx.borders, 'border-hairline')} px`]]), note('Prices and times use tabular figures, so a column lines up.')),
        row('Code', code(K, 'Row', `<ul class="ui-list">${ui.row({ title: d[0].to, sub: d[0].when, end: d[0].price })}</ul>`, /^\.ui-(list|row)/, 'ls'), '', { wide: true })],
    };
  },

  status: (ctx, K) => {
    const ui = ctx.ui, L = colourMap(ctx, 'light'), D = colourMap(ctx, 'dark');
    const key = (s) => (s.custom ? `status-${s.id}-text` : s.tone === 'action' ? 'action-text' : s.tone === 'neutral' ? 'text-soft' : s.tone);
    const light = ctx.status.map((s) => ({ label: s.label, html: ui.statusChip(s.id) }));
    const dark = ctx.status.map((s) => ({ label: s.label, dark: true, html: ui.statusChip(s.id) }));
    return {
      lede: 'A status is plain words in one colour. The words carry the meaning, so the colour is never the only cue.',
      enl: `<div class="hk-chips">${ctx.status.map((s) => ui.statusChip(s.id)).join('')}</div>`,
      parts: [band('Light', cut('Status, light', light)), band('Dark', cut('Status, dark', dark)),
        row('Ratios', vals(ctx.status.map((s) => [s.label, `${ratioText(ctx, L[key(s)] || L.text, L.surface)} / ${ratioText(ctx, D[key(s)] || D.text, D.surface)}`])), note('Each ratio is the words on the surface, light / dark.')),
        row('Code', code(K, 'Status', ui.statusChip(ctx.status[0].id), /^\.ui-chip/, 'st'), '', { wide: true })],
    };
  },

  feedback: (ctx, K) => {
    const ui = ctx.ui, S = sc(ctx), F = S.form;
    const kinds = [
      { label: 'Inline message', html: w(`<p class="ui-inline-msg">${ui.icon('info', 16)}<span>${A(S.inline)}</span></p>`) },
      { label: 'Spinner', html: ui.spinner() },
      { label: 'Skeleton', html: w(`<div class="hk-stack">${ui.skeleton('100%')}${ui.skeleton('62%')}${ui.skeleton('80%')}</div>`) },
      { label: 'Toast', wide: true, html: w(ui.toast(S.toast)) },
    ];
    return {
      lede: 'Say what happened and what to do next, in one or two sentences.',
      enl: `<div class="hk-stack hk-stack--l">${ui.alert('info', S.pickup)}${ui.alert('success', S.toast)}${ui.alert('warning', S.alert)}${ui.alert('danger', F.readyError)}</div>`,
      enlCap: 'The four banners.',
      parts: [band('Waiting and hints', cut('Feedback', kinds)),
        row('How long', p('A banner stays until it is dealt with. A toast leaves by itself, and its action can be reached from the keyboard.'), note('The spinner is for a wait of a few seconds. A longer wait shows skeleton lines in the shape of what is coming.')),
        row('Code', code(K, 'Banner', ui.alert('warning', S.alert), /^\.ui-alert/, 'fb'), '', { wide: true })],
    };
  },

  dialog: (ctx, K) => {
    const ui = ctx.ui, S = sc(ctx), D = S.dialog;
    return {
      lede: 'A dialog asks one question. Its buttons say what each answer does, and the safe one comes first.',
      enl: `<div class="hk-dlg">${ui.dialog(D)}</div>`,
      enlCap: 'The dialog over its scrim.',
      parts: [row('The words', vals([['Title', D.title], ['Confirm', D.confirm], ['Keep', D.keep]]), note('Escape and the keep button both close it without a change.')),
        row('Code', code(K, 'Dialog', ui.dialog(D), /^\.ui-(dialog|scrim)/, 'dg'), '', { wide: true })],
    };
  },

  table: (ctx, K) => {
    const ui = ctx.ui, S = sc(ctx), heads = ['Booking', 'When', 'Status', S.paidLabel || 'Paid'];
    const t = `<table class="ui-table"><thead><tr>${heads.map((x, i) => `<th scope="col"${i === 3 ? ' class="is-num"' : ''}>${A(x)}</th>`).join('')}</tr></thead><tbody>${S.deliveries.map((d, i) => `<tr${i === 0 ? ' aria-selected="true"' : ''}><td>${A(d.to)}</td><td>${A(d.when)}</td><td>${ui.statusChip(d.status)}</td><td class="is-num">${A(d.price)}</td></tr>`).join('')}</tbody></table>`;
    // at phone width the same rows in two columns: the status moves under the booking, the time is left out
    const n = `<table class="ui-table"><thead><tr><th scope="col">${A(heads[0])}</th><th scope="col" class="is-num">${A(heads[3])}</th></tr></thead><tbody>${S.deliveries.map((d, i) => `<tr${i === 0 ? ' aria-selected="true"' : ''}><td>${A(d.to)}<br>${ui.statusChip(d.status)}</td><td class="is-num">${A(d.price)}</td></tr>`).join('')}</tbody></table>`;
    return {
      lede: 'A table is for comparing many of one thing. Money sits right, in tabular figures, so the column reads down.',
      enl: `<div class="hk-tw hk-tw--w">${t}</div><div class="hk-tw hk-tw--n">${n}</div>`,
      enlCap: 'Every booking, the first one selected.',
      flush: true,
      parts: [row('Rows', p('Status stays as plain words in its own colour, and the selected row carries a bar in the action colour.')),
        row('Code', code(K, 'Table', t.replace(/<tbody>[\s\S]*<\/tbody>/, '<tbody></tbody>'), /^\.ui-table/, 'tb'), '', { wide: true })],
    };
  },

  empty: (ctx, K) => {
    const ui = ctx.ui, S = sc(ctx), E = S.empty;
    const html = `<div class="ui-empty">${ui.icon('image', 32)}<p class="ui-empty__title">${A(E.title)}</p><p class="ui-empty__text">${A(E.body)}</p>${ui.btn(E.cta)}</div>`;
    return {
      lede: 'An empty screen says what is missing and offers the one action that fills it.',
      enl: html,
      parts: [row('The words', vals([['Title', E.title], ['Action', E.cta]]), note(E.body)),
        row('Code', code(K, 'Empty state', html, /^\.ui-empty/, 'em'), '', { wide: true })],
    };
  },

  'screen-light': (ctx) => ({ lede: 'The product screen in the light theme, built only from the components on these pages.', enl: screen(ctx, 'light'), lt: true, flush: true }),
  'screen-dark': (ctx) => ({ lede: 'The same screen in the dark theme. Nothing moves; only the roles change.', enl: screen(ctx, 'dark'), dark: true, flush: true }),
  'screen-mobile': (ctx) => ({ lede: 'The screen at phone width. The top bar keeps the logo, and the list runs full width.', enl: `<div class="hk-phone">${screen(ctx, 'light', { phone: true })}</div>` }),

  tokens: (ctx) => {
    const L = colourMap(ctx, 'light'), D = colourMap(ctx, 'dark'), G = tokenGroups(ctx);
    const colours = `<ul class="hk-tok">${Object.keys(L).map((k) => `<li><span class="hk-sw" style="background:${L[k]}" aria-hidden="true"></span><span class="hk-sw" style="background:${D[k] || L[k]}" aria-hidden="true"></span>${mono('--' + k)}<span class="hk-tok__v">${mono(`${L[k]} / ${D[k] || L[k]}`)}</span></li>`).join('')}</ul>`;
    const group = (g) => vals(Object.entries(G[g] || {}).map(([k, v]) => ['--' + k, String(v)]));
    return {
      lede: 'Every value the components read, by name. Colours show light, then dark.',
      parts: [row('Colour', colours, '', { wide: true }), row('Space', group('space')), row('Radius and width', group('radius') + group('width')), row('Type', group('text'), group('font'))],
    };
  },

  code: (ctx, K) => {
    const ui = ctx.ui, F = sc(ctx).form;
    return {
      lede: 'Each component is plain markup and one class name. The tokens carry the brand, so a mode switch is one attribute on the root.',
      parts: [row('A button', code(K, 'Button', ui.btn(F.book), /^\.ui-btn(?![-\w])/, 'k1'), '', { wide: true }),
        row('Dark mode', codeBlock('Switch the theme', '<html data-theme="dark">', 'dark theme attribute', 'hk-c-k2'), note('Without the attribute, the kit follows the system setting.'))],
    };
  },
};

// ---- colour, light or dark: the role grounds as a test strip; the roles as rows with their ratios ----
function colourPage(ctx, mode) {
  const M = colourMap(ctx, mode), dark = mode === 'dark', ui = ctx.ui, F = sc(ctx).form;
  const keys = [['surface', 'Surface'], ['raised', 'Raised'], ['sunken', 'Sunken'], ['text', 'Text'], ['text-soft', 'Soft text'], ['quiet', 'Quiet'], ['edge', 'Edge'], ['divider', 'Divider'], ['action', 'Action'], ['action-hover', 'Action, hover'], ['action-label', 'Action label'], ['focus', 'Focus']].filter(([k]) => M[k]);
  const ground = keys.filter(([k]) => ['surface', 'raised', 'sunken', 'text', 'action'].includes(k)).map(([k, l]) => ({ label: l, dark, lt: !dark, html: `<span class="hk-gr" style="background:var(--${k})" aria-hidden="true"></span>` }));
  const list = `<ul class="hk-tok">${keys.map(([k, l]) => `<li><span class="hk-sw" style="background:${M[k]}" aria-hidden="true"></span><span class="hk-tok__n">${A(l)}</span>${mono('--' + k)}<span class="hk-tok__v">${mono(M[k])}</span></li>`).join('')}</ul>`;
  const tones = ['success', 'warning', 'danger', 'info'].filter((k) => M[k]).map((k) => [ctx.cap(k), ratioText(ctx, M[k], M.surface)]);
  return {
    lede: dark ? 'The darkroom: the same roles, set for a dark ground. Every component reads them by name.' : 'The paper: every role the components read, set for a light ground.',
    enl: `<div class="hk-zz"><div class="hk-stack hk-stack--l">${ui.field({ id: `hk-cl-${mode}`, label: F.pickup, value: F.pickupValue })}<div class="hk-acts">${ui.btn(F.book)}${ui.btn(ex(ctx).secondary || F.book, { variant: 'secondary' })}</div>${ui.alert('warning', sc(ctx).alert)}</div></div>`,
    enlCap: `Live components in the ${mode} theme.`, dark, lt: !dark,
    parts: [band('Grounds', cut(`Grounds, ${mode}`, ground)), row('Roles', list, '', { wide: true }),
      row('Ratios', vals([['Text on surface', ratioText(ctx, M.text, M.surface)], ['Soft text on surface', ratioText(ctx, M['text-soft'], M.surface)], ['Quiet on surface', ratioText(ctx, M.quiet, M.surface)], ['Label on action', ratioText(ctx, M['action-label'], M.action)], ...tones]), note('Status colours are measured as words on the surface.'))],
  };
}
