// Theme 24, Standards, lane u2: the UI kit's component pages (states, buttons, inputs, choices, cards, navigation, lists, status, feedback).
// Each page keeps the kit's move, the drawing then the thing: one real component drawn large (zoomed, never redrawn) and dimensioned
// in x, beside the real components at 1:1 in every state. States are forced by class (is-hover, is-focus, is-pressed, disabled) so
// print can show them; the components are ctx.ui and componentsCss exactly as the code package ships them.
// The chrome (running head, title, tab, ruler, dimension lines) is lane u1's, imported read-only. Every class here starts u2-.
import { A, G, f2, xOf, fx, roles, adv, blk, fill, dimH, dimV, cropTicks, ruler, kitHead, kitTitle, kitPage, uiPlate, ratioText, val, sc, bodyFace, dispFace, typeOf } from './lane-u1.js';
import { colourMap, tokenGroups, statusText } from '../../engine/tokens.js';
import { slotLabel } from './helpers.js';

// the components' own constants, read from componentsCss: a pressed button scales to 0.97; the focus ring is 2 px wide, 2 px out
const PRESS = 0.97, RING = 2;

// ---------------------------------------------------------------- small pieces

const T = (ctx, tok, d) => typeOf(ctx, tok) || d;
const ty = (ctx) => ({ c: T(ctx, 'control', { size: 16, line: 24, weight: 500 }), l: T(ctx, 'label', { size: 14, line: 20, weight: 500 }), b: T(ctx, 'body', { size: 16, line: 24 }), cap: T(ctx, 'caption', { size: 12, line: 16 }), ts: T(ctx, 'title-s', { size: 20, line: 24 }) });
const sp = (ctx, n, d) => parseFloat(tokenGroups(ctx).space[`sp-${n}`] || d);
const hairW = (ctx) => parseFloat(tokenGroups(ctx).width['w-hairline'] || '1px');
const ex = (ctx) => sc(ctx).example || {};
// a real component on the page at 1:1, and one drawn at k:1 (the same markup, zoomed, so the drawing is the shipped component)
const at = (x, y, w, inner, extra = '') => `<div class="ui a" style="left:${f2(x)}px;top:${f2(y)}px;${w ? `width:${f2(w)}px;` : ''}${extra}">${inner}</div>`;
const drawn = (x, y, k, w, inner) => `<div class="a" style="left:${f2(x)}px;top:${f2(y)}px"><div class="ui" style="zoom:${k};width:${f2(w)}px">${inner}</div></div>`;
const cap = (x, y, w, text, col, cls = 'c-micro nw') => blk(f2(x), f2(y), w, 16, cls, text, `color:${col}`);
const D = (ctx, o) => { const R = roles(ctx); return { col: R.ink, qcol: R.quiet, ...o }; };
const hDim = (ctx, o) => dimH(ctx, D(ctx, o));
const vDim = (ctx, o) => dimV(ctx, D(ctx, o));
// a chain of horizontal dimensions along one line, labels over the line so short links never collide
const chain = (ctx, x0, k, segs, y, obj) => { let a = x0, s = ''; for (const v of segs) { s += hDim(ctx, { x1: a, x2: a + v * k, y, label: fx(ctx, v), obj, above: true }); a += v * k; } return s; };
const vChain = (ctx, y0, k, segs, x, obj) => { let a = y0, s = ''; for (const v of segs) { s += vDim(ctx, { x, y1: a, y2: a + v * k, label: fx(ctx, v), obj, labelY: a + (v * k) / 2 + 4 }); a += v * k; } return s; };

// widths measured from the faces the components set in, so layout and dimensions follow the brand
function btnW(ctx, label, { variant = 'primary', size, icon } = {}) {
  const { c, l } = ty(ctx), fs = size === 'sm' ? l.size : c.size;
  const pad = variant === 'quiet' ? sp(ctx, 3, 12) : size === 'sm' ? sp(ctx, 4, 16) : size === 'lg' ? sp(ctx, 6, 24) : sp(ctx, 5, 20);
  return adv(bodyFace(ctx, c.weight), slotLabel(ctx, label), fs) + 2 * pad + 2 * ctx.brand.ui.border + (icon ? 18 + sp(ctx, 2, 8) : 0);
}
const choiceW = (ctx, label, box = 22) => box + 12 + adv(bodyFace(ctx, ctx.weights.regular), slotLabel(ctx, label), ty(ctx).c.size);
const segW = (ctx, items) => items.reduce((a, t) => a + 32 + adv(bodyFace(ctx, ctx.weights.medium), slotLabel(ctx, t), ty(ctx).l.size) + ctx.brand.ui.border, ctx.brand.ui.border);
const inputW = (ctx, v) => Math.ceil(adv(bodyFace(ctx, ctx.weights.regular), v, ty(ctx).c.size) + 24 + 2 * ctx.brand.ui.border + 16);
// the first label that fits w, else the shortest
const fits = (ctx, list, w, measure) => list.find((t) => measure(t) <= w) || [...list].sort((a, b) => measure(a) - measure(b))[0];

// forced states on markup the helpers do not take a state for: a class on the nth button, link or row of the component's own markup
const nth = (html, tag, map) => { let i = -1; return html.replace(new RegExp(`<${tag} `, 'g'), (m) => { i++; return map[i] ? `<${tag} data-u2="${map[i]}" ` : m; }).replace(/ data-u2="([^"]+)"( class=")?/g, (m, c, k) => (k ? ` class="${c} ` : ` class="${c}" `)); };
const seg = (ctx, items, active, { hoverAt, focusAt, disabled } = {}) => nth(ctx.ui.segmented(items, active, { disabled }), 'button', { [hoverAt]: 'is-hover', [focusAt]: 'is-focus' });
const bare = (ctx, value, label, w, state, disabled) => `<div style="width:${w}px"><input class="ui-input${state ? ' is-' + state : ''}" type="text" value="${A(value)}" aria-label="${A(label)}"${disabled ? ' disabled' : ''}></div>`;
// a row of controls: as many as fit the width, in order
const line = (items, maxW, gap = 16) => { let w = 0; const out = []; for (const [html, iw] of items) { const nw = w + (out.length ? gap : 0) + iw; if (nw > maxW) continue; out.push(html); w = nw; } return `<div class="u2-line">${out.join('')}</div>`; };

// ---------------------------------------------------------------- css (the light tokens and componentsCss come from the theme base)

export function css() {
  return `.pg.u2-k .u2-line{display:flex;align-items:center;gap:16px;white-space:nowrap;height:100%}
.pg.u2-k .u2-stack{display:flex;flex-direction:column;align-items:stretch;gap:8px}
.pg.u2-k .u2-stack > .u2-cap{margin:0;font-family:var(--chrome);font-size:12px;line-height:16px;font-weight:600;color:var(--ink)}
.pg.u2-k .u2-stack > .u2-sp{height:16px}
.pg.u2-k .u2-route{display:flex;justify-content:space-between;margin-top:8px;font-size:var(--fs-label);line-height:var(--lh-label);color:var(--quiet)}
.pg.u2-k .u2-sk{display:flex;flex-direction:column;gap:12px}
.pg.u2-k .u2-inl{display:inline-block;white-space:nowrap}
/* hover forced by class for the components whose shipped hover is a pseudo-class only; each declaration is the one componentsCss ships */
.pg.u2-k .ui .ui-link.is-hover{background:var(--sunken);color:var(--text)}
.pg.u2-k .ui .ui-tabs [role="tab"].is-hover{background:var(--sunken)}
.pg.u2-k .ui .ui-segmented button[aria-pressed="false"].is-hover{background:var(--sunken)}
.pg.u2-k .ui a.ui-row.is-hover{background:var(--raised)}
`;
}

const pageOf = (ctx, id, body, svg) => kitPage(ctx, id, { body: kitHead(ctx, id) + body, svg, cls: 'u2-k' });

// ---------------------------------------------------------------- the pages

export const uikit = {
  // ---- states: the pressed button drawn at 3:1 inside a dashed line of itself at rest, its shrink dimensioned; under it the five
  // rules, each shown on the real controls it changes ----
  states(ctx) {
    const R = roles(ctx), ui = ctx.ui, S = sc(ctx), F = S.form || {}, E = ex(ctx), x = xOf(ctx), W = ctx.weights, { l } = ty(ctx);
    const label = F.book || S.call, w1 = Math.ceil(btnW(ctx, label) / x) * x, h1 = 44;
    const DX = G.col[6], k = Math.max(1, Math.min(3, Math.floor((G.R - 48 - DX) / w1))), DW = w1 * k, DH = h1 * k, DY = 104;
    const ix = (DW * (1 - PRESS)) / 2, iy = (DH * (1 - PRESS)) / 2, rad = Math.min(DH / 2, (ctx.radius.button ?? ctx.radius.control ?? 0) * k);
    let body = drawn(DX, DY, k, w1, ui.btn(label, { block: true, state: 'pressed' }))
      + cap(DX, DY + DH + 40, G.R - DX, `Primary button pressed, drawn at ${k}:1. The dashed line is the same button at rest.`, R.quiet);
    let svg = `<rect x="${f2(DX + 0.5)}" y="${f2(DY + 0.5)}" width="${f2(DW - 1)}" height="${f2(DH - 1)}" rx="${f2(rad)}" fill="none" stroke="${R.ink}" stroke-width="1" stroke-dasharray="6 4"/>`
      + hDim(ctx, { x1: DX, x2: DX + DW, y: DY - 20, label: fx(ctx, w1), obj: DY })
      + hDim(ctx, { x1: DX + ix, x2: DX + DW - ix, y: DY + DH + 20, label: fx(ctx, w1 * PRESS), obj: DY + DH - iy })
      + vDim(ctx, { x: DX - 16, y1: DY, y2: DY + DH, label: fx(ctx, h1), obj: DX })
      + vDim(ctx, { x: DX + DW + 16, y1: DY + iy, y2: DY + DH - iy, label: fx(ctx, h1 * PRESS), obj: DX + DW - ix, right: true });
    // the rules: each on the controls it changes, as many as fit the row
    const CX = G.col[5], CW = G.R - CX, sizes = F.sizes || E.tabs || [], sw = fits(ctx, E.switches || [], 200, (t) => choiceW(ctx, t, 44)), ck = fits(ctx, E.checks || [], 160, (t) => choiceW(ctx, t));
    const val2 = F.dropoffValue || S.deliverTo, iw = Math.min(220, inputW(ctx, val2));
    const P = (st, opt = {}) => [ui.btn(label, { state: st, ...opt }), btnW(ctx, label)];
    const Sec = (st, opt = {}) => [ui.btn(E.secondary || S.call, { variant: 'secondary', state: st, ...opt }), btnW(ctx, E.secondary || S.call)];
    const errW = Math.min(CW, Math.max(240, Math.ceil(adv(bodyFace(ctx, W.medium), F.readyError || '', l.size) + 16)));
    const errLines = Math.ceil(adv(bodyFace(ctx, W.medium), F.readyError || '', l.size) / errW) || 1;
    const errH = l.line + 6 + 44 + 6 + Math.ceil(errLines * l.size * 1.4);
    const rows = [
      ['Hover', `Fill to ${val('--action-hover')}, or to ${val('--sunken')}`, line([P('hover'), Sec('hover'), [seg(ctx, sizes, 0, { hoverAt: 1 }), segW(ctx, sizes)], [ui.btn(E.quiet || S.call, { variant: 'quiet', state: 'hover' }), btnW(ctx, E.quiet || S.call, { variant: 'quiet' })]], CW), 56],
      ['Focus', `A ${RING} px ring in ${val('--focus')}, ${RING} px clear`, line([P('focus'), [bare(ctx, val2, F.dropoff || S.deliverToLabel, iw, 'focus'), iw], [ui.check(ck, { state: 'focus' }), choiceW(ctx, ck)], [ui.switch(sw, { state: 'focus' }), choiceW(ctx, sw, 44)]], CW), 56],
      ['Pressed', `Fill to ${val('--action-pressed')}, scaled to ${Math.round(PRESS * 100)}%`, line([P('pressed'), Sec('pressed'), [ui.btn(E.danger || S.call, { variant: 'danger', state: 'pressed' }), btnW(ctx, E.danger || S.call)]], CW), 56],
      ['Disabled', `${val('--disabled-text')} on ${val('--disabled-bg')}`, line([Sec(undefined, { disabled: true }), [bare(ctx, val2, F.dropoff || S.deliverToLabel, iw, null, true), iw], [ui.check(ck, { disabled: true }), choiceW(ctx, ck)], [ui.switch(sw, { disabled: true }), choiceW(ctx, sw, 44)], [seg(ctx, sizes, 0, { disabled: true }), segW(ctx, sizes)]], CW), 56],
      ['Error', `Edge and message in ${val('--danger')}`, `<div style="width:${errW}px">${ui.field({ id: 'u2-st-err', label: F.ready || F.pickup, value: F.readyValue || '', error: F.readyError })}</div>`, errH + 16],
    ];
    let y = G.bottom - rows.reduce((a, r) => a + r[3], 0);
    const HY = y - 28;
    body += cap(G.L, HY, 100, 'State', R.ink, 'c-head nw') + cap(G.L + 112, HY, 200, 'Rule', R.ink, 'c-head nw') + cap(CX, HY, 300, `Shown on the controls it changes`, R.ink, 'c-head nw');
    rows.forEach(([name, rule, html, h], i) => {
      const ry = rows[i][3] > 56 ? y + 8 : y + 18;
      body += fill(G.L, y, G.W, 1, i ? R.hair : R.ink)
        + blk(G.L, ry, 100, 20, 'c-name nw', name, `color:${R.ink}`, 'h2')
        + blk(G.L + 112, ry, CX - 24 - G.L - 112, 20, 'c-body nw', rule, `color:${R.quiet}`, 'p')
        + at(CX, h > 56 ? y + 8 : y + 6, CW, html, h > 56 ? '' : 'height:44px');
      y += h;
    });
    body += fill(G.L, G.bottom, G.W, 1, R.hair)
      + kitTitle(ctx, 'states', `Five rules every control follows. Each state is forced here with its class, ${val('is-hover')}, ${val('is-focus')} or ${val('is-pressed')}; in use the pseudo-class sets it. A primary button is never disabled.`);
    svg += ruler(ctx, { uid: 'u2st', live: [DX, DX + DW] });
    return pageOf(ctx, 'states', body, svg);
  },

  // ---- buttons: the primary with an icon drawn at 3:1 with its run of paddings and gap; the three sizes at 1:1 by height; then the
  // four variants in every state ----
  buttons(ctx) {
    const R = roles(ctx), ui = ctx.ui, S = sc(ctx), F = S.form || {}, E = ex(ctx), x = xOf(ctx), bw = ctx.brand.ui.border, { c } = ty(ctx);
    const label = F.book || S.call, pad = sp(ctx, 5, 20), gap = sp(ctx, 2, 8), lw = adv(bodyFace(ctx, c.weight), slotLabel(ctx, label), c.size);
    const wA = btnW(ctx, label, { icon: true }), DX = G.col[6], k = Math.max(1, Math.min(3, Math.floor((G.R - 32 - DX) / wA))), DY = 140, DW = wA * k, DH = 44 * k;
    let body = drawn(DX, DY, k, wA + 1, ui.btn(label, { iconRight: 'arrow-right' }))
      + cap(DX, DY + DH + 16, G.R - DX, `Primary with an icon, drawn at ${k}:1`, R.quiet);
    let svg = chain(ctx, DX + bw * k, k, [pad, lw, gap, 18, pad], DY - 20, DY)
      + vDim(ctx, { x: DX + DW + 16, y1: DY, y2: DY + DH, label: fx(ctx, 44), obj: DX + DW, right: true });
    // the sizes, bottom-aligned, each with its height
    const sizes = [['Small', 'sm', E.small || label, 36], ['Default', null, label, 44], ['Large', 'lg', label, 52]];
    let sx = G.L; const SB = 316;
    for (const [name, size, t, h] of sizes) {
      const w = btnW(ctx, t, { size: size || undefined });
      body += at(sx, SB - h, null, ui.btn(t, { size: size || undefined }))
        + cap(sx, SB + 12, 120, name, R.ink, 'c-head nw') + blk(f2(sx), SB + 30, 140, 16, 'nw', val(size ? `ui-btn--${size}` : 'ui-btn'), `color:${R.quiet}`);
      svg += vDim(ctx, { x: sx + w + 12, y1: SB - h, y2: SB, label: fx(ctx, h), obj: sx + w, right: true });
      sx += w + 64;
    }
    // the variants in every state
    const MY = 408, C0 = G.L + 208, cw = (G.R - C0) / 5, st = [['Rest'], ['Hover', 'hover'], ['Focus', 'focus'], ['Pressed', 'pressed'], ['Disabled', 'disabled']];
    const vars = [['Primary', 'primary', 'ui-btn', label], ['Secondary', 'secondary', 'ui-btn--secondary', E.secondary || S.call], ['Quiet', 'quiet', 'ui-btn--quiet', E.quiet || S.call], ['Danger', 'danger', 'ui-btn--danger', E.danger || S.call]];
    body += cap(G.L, MY, 120, 'Variant', R.ink, 'c-head nw') + st.map(([n], i) => cap(C0 + i * cw, MY, cw, n, R.ink, 'c-head nw')).join('');
    vars.forEach(([name, v, cl, t], r) => {
      const y = MY + 28 + r * 64;
      body += fill(G.L, y, G.W, 1, r ? R.hair : R.ink) + blk(G.L, y + 10, 200, 20, 'c-name nw', name, `color:${R.ink}`, 'h2') + blk(G.L, y + 32, 200, 16, 'nw', val(cl), `color:${R.quiet}`);
      st.forEach(([, s], i) => {
        const X = C0 + i * cw;
        if (s === 'disabled' && v === 'primary') body += blk(f2(X), y + 24, cw, 16, 'c-micro nw', 'Never disabled', `color:${R.quiet}`);
        else body += at(X, y + 10, null, ui.btn(t, { variant: v, state: s === 'disabled' ? undefined : s, disabled: s === 'disabled' }));
      });
    });
    body += fill(G.L, MY + 28 + 4 * 64, G.W, 1, R.hair)
      + kitTitle(ctx, 'buttons', `Four variants and three sizes, all from one ${val('ui-btn')}. Every button is 44 px tall by default; the label and its icon sit ${fx(ctx, pad)} in from each end.`, { w: 400 });
    svg += ruler(ctx, { uid: 'u2bt', live: [DX, DX + DW] });
    return pageOf(ctx, 'buttons', body, svg);
  },

  // ---- inputs: a field with help drawn at 2:1, its stack of label, gap, control, gap and help dimensioned down its side; the real
  // fields at 1:1 in every state ----
  inputs(ctx) {
    const R = roles(ctx), ui = ctx.ui, S = sc(ctx), F = S.form || {}, x = xOf(ctx), bw = ctx.brand.ui.border, W = ctx.weights, { c, l, cap: cp } = ty(ctx);
    const help = F.notesHelp || F.bookWhy || '', FW = Math.min(232, Math.max(200, Math.ceil((adv(bodyFace(ctx, W.regular), help, cp.size) + 8) / x) * x));
    const taH = Math.max(96, 3 * c.line + 20 + 2 * bw), k = 2, DX = G.L + 48, DY = 232, DW = FW * k;
    let body = drawn(DX, DY, k, FW, ui.field({ id: 'u2-in-d', label: F.notes || F.pickup, kind: 'textarea', help }))
      + cap(DX, DY + (l.line + 12 + taH + cp.line) * k + 24, DW, `Textarea with help, drawn at ${k}:1`, R.quiet);
    let svg = hDim(ctx, { x1: DX, x2: DX + DW, y: DY - 20, label: fx(ctx, FW), obj: DY })
      + vChain(ctx, DY, k, [l.line, 6, taH, 6, cp.line], DX - 16, DX);
    // the real fields: two columns, the state over each
    const RX = G.col[6], cw = (G.R - RX - 24) / 2, errLines = Math.ceil(adv(bodyFace(ctx, W.medium), F.readyError || '', l.size) / cw) || 1;
    const base = l.line + 6 + 44, errH = base + 6 + Math.ceil(errLines * l.size * 1.4);
    const grid = [
      [['Rest', ui.field({ id: 'u2-in-1', label: F.ready || F.pickup, value: '' }), base], ['Error', ui.field({ id: 'u2-in-2', label: F.ready || F.pickup, value: F.readyValue || '', error: F.readyError }), errH]],
      [['Focus', ui.field({ id: 'u2-in-3', label: F.dropoff, value: F.dropoffValue, state: 'focus' }), base], ['Disabled', ui.field({ id: 'u2-in-4', label: F.dropoff, value: F.dropoffValue, disabled: true }), base]],
      [['Filled', ui.field({ id: 'u2-in-5', label: F.pickup, value: F.pickupValue }), base], ['Select', ui.field({ id: 'u2-in-6', label: F.size, kind: 'select', options: F.sizes || [], value: (F.sizes || [])[0] }), base]],
    ];
    let y = G.top + 16;
    for (const row of grid) {
      row.forEach(([name, html], i) => { const X = RX + i * (cw + 24); body += fill(X, y, cw, 1, R.ink) + cap(X, y + 8, cw, name, R.ink, 'c-head nw') + at(X, y + 36, cw, html); });
      y += 36 + Math.max(...row.map((r) => r[2])) + 32;
    }
    body += kitTitle(ctx, 'inputs', `Text field, select and textarea share one frame: a ${fx(ctx, 44)} control under its label, help or an error under it. The label is always shown; a placeholder never stands in for it.`);
    svg += ruler(ctx, { uid: 'u2in', live: [DX, DX + DW] });
    return pageOf(ctx, 'inputs', body, svg);
  },

  // ---- choices: the switch drawn at 5:1, its thumb's travel dimensioned against a dashed thumb at rest; the checkbox, radio and
  // switch in each state at 1:1; the segmented control along the foot ----
  choices(ctx) {
    const R = roles(ctx), ui = ctx.ui, S = sc(ctx), F = S.form || {}, E = ex(ctx), bw = ctx.brand.ui.border;
    const sws = E.switches || [S.share], k = 5, DX = G.L + 48, DY = 288, DW = 44 * k, DH = 26 * k;
    const sw0 = sws[0], swOn = ui.switch(sw0, { checked: true }).replace(/<span>[^<]*<\/span>/, '').replace('role="switch"', `role="switch" aria-label="${A(sw0)}"`);
    // the switch sits centred in its 44 px target, so the drawing is lifted by the 9 px above it and the 26 px switch lands on DY
    let body = drawn(DX, DY - 9 * k, k, 44, swOn) + cap(DX, DY + DH + 64, 400, `Switch on, drawn at ${k}:1. The dashed circle is the thumb when off.`, R.quiet);
    const t0 = DX + (bw + 3) * k, tr = 8 * k;
    let svg = `<circle cx="${f2(t0 + tr)}" cy="${f2(DY + (bw + 3) * k + tr)}" r="${f2(tr - 0.5)}" fill="none" stroke="${R.ink}" stroke-width="1" stroke-dasharray="5 4"/>`
      + hDim(ctx, { x1: DX, x2: DX + DW, y: DY - 20, label: fx(ctx, 44), obj: DY })
      + vDim(ctx, { x: DX - 16, y1: DY, y2: DY + DH, label: fx(ctx, 26), obj: DX })
      + chain(ctx, t0, k, [18, 16], DY + DH + 24, DY + DH);
    // checkbox, radio and switch in each state
    const RX = G.col[5], C0 = RX + 88, cw = (G.R - C0) / 3;
    const ck = fits(ctx, E.checks || [F.notes], cw - 8, (t) => choiceW(ctx, t)), rds = E.radios || F.sizes || [];
    const rd = fits(ctx, rds, cw - 8, (t) => choiceW(ctx, t)), sw = fits(ctx, sws, cw - 8, (t) => choiceW(ctx, t, 44));
    const cols = [['Checkbox', (o) => ui.check(ck, o)], ['Radio', (o, i) => ui.check(rd, { type: 'radio', name: `u2-rd-${i}`, ...o })], ['Switch', (o) => ui.switch(sw, o)]];
    const rows = [['Off', {}], ['On', { checked: true }], ['Focus', { state: 'focus' }], ['Disabled', { disabled: true }]];
    const MY = G.top + 16;
    body += cols.map(([n], i) => cap(C0 + i * cw, MY, cw, n, R.ink, 'c-head nw')).join('');
    rows.forEach(([name, o], r) => {
      const y = MY + 28 + r * 56;
      body += fill(RX, y, G.R - RX, 1, r ? R.hair : R.ink) + blk(RX, y + 18, 80, 20, 'c-name nw', name, `color:${R.ink}`, 'h2')
        + cols.map(([, f], i) => at(C0 + i * cw, y + 6, cw, f(o, r))).join('');
    });
    body += fill(RX, MY + 28 + 4 * 56, G.R - RX, 1, R.hair);
    // the segmented control along the foot, in three states
    const items = F.sizes || E.tabs || [], w = segW(ctx, items), SY = 584, segs = [['Rest', {}], ['Hover', { hoverAt: 1 }], ['Focus', { focusAt: 1 }], ['Disabled', { disabled: true }]];
    const shown = Math.floor((G.W + 24) / (w + 24)) >= 4 ? segs : [segs[0], segs[2], segs[3]], pitch = (G.W - w) / (shown.length - 1);
    body += fill(G.L, SY - 36, G.W, 1, R.ink) + cap(G.L, SY - 28, 300, 'Segmented control', R.ink, 'c-head nw');
    shown.forEach(([name, o], i) => {
      const X = G.L + i * pitch;
      body += at(X, SY, w + 2, seg(ctx, items, 0, o)) + cap(X, SY + 52, 120, name, R.quiet);
    });
    svg += vDim(ctx, { x: 50, y1: SY, y2: SY + 40 + 2 * bw, label: fx(ctx, 40 + 2 * bw), obj: G.L, labelAt: 44 });
    body += kitTitle(ctx, 'choices', `A checkbox for each of many, a radio for one of a few, a switch for a setting that applies at once. The box is ${fx(ctx, 22)}, the switch ${fx(ctx, 44)} by ${fx(ctx, 26)}, and the label is part of the target.`);
    svg += ruler(ctx, { uid: 'u2ch', live: [DX, DX + DW] });
    return pageOf(ctx, 'choices', body, svg);
  },

  // ---- cards: the content card drawn at 2:1, its padding and first line dimensioned; the real cards at 1:1 in two columns ----
  cards(ctx) {
    const R = roles(ctx), ui = ctx.ui, S = sc(ctx), F = S.form || {}, E = ex(ctx), hw = hairW(ctx), { b } = ty(ctx);
    const CW = 220, k = 2, DX = G.L + 48, DY = 280, DW = CW * k, card = ui.card({ meta: S.status, title: S.rider, text: S.riderNote });
    let body = drawn(DX, DY, k, CW, card);
    let svg = hDim(ctx, { x1: DX, x2: DX + DW, y: DY - 32, label: fx(ctx, CW), obj: DY })
      + hDim(ctx, { x1: DX + hw * k, x2: DX + (hw + 16) * k, y: DY - 16, label: fx(ctx, 16), obj: DY + hw * k })
      + vChain(ctx, DY + hw * k, k, [16, b.line, 6], DX - 16, DX);
    const shot = (ctx.brand.imagery?.shots || []).find((s) => s.photo);
    const st = (pairs) => `<div class="u2-stack">${pairs.map(([n, h]) => `<p class="u2-cap">${A(n)}</p>${h}`).join('<div class="u2-sp"></div>')}</div>`;
    const A1 = [['Card', card], ['Raised', ui.card({ meta: S.deliverToLabel, title: S.deliverTo, text: `${S.paidLabel} ${S.paid}`, raised: true })]];
    if (shot) A1.push(['With media', ui.card({ media: ctx.photo(shot.id, { cls: 'ui-card__media' }), meta: S.status, title: S.rider })]);
    const B1 = [['With an action', ui.card({ meta: F.title || S.status, title: S.deliverTo, text: S.riderNote, action: `<div>${ui.btn(E.small || F.book, { size: 'sm' })}</div>` })], ['Stat', ui.stat(S.paid, E.statLabel || S.paidLabel)]];
    body += at(G.col[6], G.top + 16, CW, st(A1)) + at(G.col[6] + CW + 24, G.top + 16, CW, st(B1))
      + blk(DX, DY - 72, 300, 16, 'c-micro nw', `Card, drawn at ${k}:1`, `color:${R.quiet}`)
      + kitTitle(ctx, 'cards', `A card sits on the surface inside a ${hw} px ${val('--divider')} edge; a raised card steps up to ${val('--raised')} and drops the edge. Content keeps ${fx(ctx, 16)} from every side.`);
    svg += ruler(ctx, { uid: 'u2cd', live: [DX, DX + DW] });
    return pageOf(ctx, 'cards', body, svg);
  },

  // ---- navigation: the top bar at 1:1 across the measure, its links in their states called out; under it the sidebar, tabs,
  // breadcrumbs and the mobile tab bar at its 390 px ----
  navigation(ctx) {
    const R = roles(ctx), ui = ctx.ui, S = sc(ctx), E = ex(ctx), W = ctx.weights, { l, cap: cp } = ty(ctx);
    const links = E.links || [[S.call, 'phone']], TY = 208, LW = 112;
    const linkW = (t, i) => 12 + (i ? 18 + 8 : 0) + adv(bodyFace(ctx, W.medium), t, l.size) + 12;
    const lws = links.map(([t, i]) => linkW(t, i)), linksW = lws.reduce((a, v) => a + v, 0) + 4 * (links.length - 1);
    const free = G.W - 32 - LW - linksW - 40 - 32, LX = G.L + 16 + LW + 16 + free / 2;
    const states = ['', 'is-hover', 'is-focus'], names = ['Current', 'Hover', 'Focus'];
    const top = `<nav class="ui-topbar" aria-label="Main"><span>${ctx.logo.html('horizontal', { width: LW, label: 'Logo' })}</span><div class="ui-topbar__links">${nth(ui.links(links, 0), 'a', { 1: states[1], 2: states[2] })}</div><span class="ui-avatar">${A(S.initials || '')}</span></nav>`;
    let body = at(G.L, TY, G.W, top), svg = vDim(ctx, { x: 50, y1: TY, y2: TY + 56, label: fx(ctx, 56), obj: G.L, labelAt: 44 });
    let lx = LX;
    lws.slice(0, 3).forEach((w, i) => {
      const cx = lx + w / 2;
      svg += `<path d="M${f2(cx) + 0.5} ${TY + 56 + 4}V${TY + 56 + 24}" stroke="${R.ink}" stroke-width="1" fill="none"/>`;
      body += blk(f2(cx - 50), TY + 56 + 28, 100, 16, 'c-micro nw', names[i], `color:${R.ink};text-align:center`);
      lx += w + 4;
    });
    // the sidebar, tabs and breadcrumbs, and the tab bar
    const BY = 384;
    const side = `<nav class="ui-sidebar" aria-label="Sections">${ui.links(links, 0)}</nav>`;
    body += fill(G.L, BY - 36, G.W, 1, R.ink)
      + cap(G.L, BY - 28, 220, 'Sidebar', R.ink, 'c-head nw') + at(G.L, BY, 220, side);
    svg += vDim(ctx, { x: G.L + 220 + 16, y1: BY + 12, y2: BY + 56, label: fx(ctx, 44), obj: G.L + 220, right: true });
    const TX = G.col[4] - 24, tabsW = (E.tabs || []).reduce((a, t) => a + 32 + 4 + adv(bodyFace(ctx, W.medium), t, l.size), 0);
    body += cap(TX, BY - 28, 220, 'Tabs', R.ink, 'c-head nw') + at(TX, BY, Math.ceil(tabsW + 8), nth(ui.tabs(E.tabs || [], 0), 'button', { 1: 'is-hover' }))
      + cap(TX, BY + 64, 220, 'Selected, then hover', R.quiet)
      + cap(TX, BY + 120, 220, 'Breadcrumbs', R.ink, 'c-head nw') + at(TX, BY + 148, 300, ui.crumbs(E.crumbs || []));
    const bar = [...links, [E.account || S.call, 'user']].slice(0, 4), BX = G.R - 390, BBY = BY + 40;
    const tabbar = `<nav class="ui-tabbar" aria-label="Sections">${bar.map(([t, i], n) => `<a href="#"${n === 0 ? ' aria-current="page"' : ''}>${ui.icon(i, 20)}${A(t)}</a>`).join('')}</nav>`;
    body += cap(BX, BY - 28, 300, 'Mobile tab bar', R.ink, 'c-head nw') + at(BX, BBY, 390, tabbar);
    svg += hDim(ctx, { x1: BX, x2: G.R, y: BBY - 20, label: fx(ctx, 390), obj: BBY })
      + vDim(ctx, { x: G.R + 16, y1: BBY, y2: BBY + 64, label: fx(ctx, 64), obj: G.R, right: true });
    body += kitTitle(ctx, 'navigation', `The current place is marked by a 3&nbsp;px bar in ${val('--action')} and the text going to ${val('--text')}, never by colour alone. Every target is at least 44&nbsp;px tall.`, { w: 420 });
    void cp;
    svg += ruler(ctx, { uid: 'u2nv', live: [G.L, G.R], edgeAnchor: true });
    return pageOf(ctx, 'navigation', body, svg);
  },

  // ---- lists: one row drawn at 2:1 across the measure, its leading, gaps, text and trailing chained along the top; the list at 1:1
  // under it with a row in hover and one in focus ----
  lists(ctx) {
    const R = roles(ctx), ui = ctx.ui, S = sc(ctx), W = ctx.weights, { l, b } = ty(ctx), hw = hairW(ctx);
    const ds = S.deliveries || [], icon = ctx.brand.ui.rowIcon || 'package', stOf = (id) => ctx.status.find((s) => s.id === id) || { label: '' };
    const row = (d, href) => ui.row({ lead: ui.icon(d.icon || icon, 18), title: d.to, sub: d.when, end: d.price, chip: ui.statusChip(d.status), href });
    const RW = 480, k = 2, DX = G.R - RW * k, DY = 240;
    const endW = Math.max(adv(bodyFace(ctx, W.regular), ds[0].price || '', l.size), adv(bodyFace(ctx, W.medium), stOf(ds[0].status).label, l.size));
    const rowH = Math.max(64, 24 + hw + Math.max(40, l.line + b.line, b.line + 4 + l.size * 1.3));
    let body = drawn(DX, DY, k, RW, `<ul class="ui-list">${row(ds[0])}</ul>`)
      + cap(DX, DY + (rowH + hw) * k + 16, 400, `List row, drawn at ${k}:1`, R.quiet);
    let svg = chain(ctx, DX, k, [40, 12, RW - 40 - 24 - endW, 12, endW], DY - 20, DY)
      + vDim(ctx, { x: DX - 16, y1: DY + hw * k, y2: DY + (hw + rowH) * k, label: fx(ctx, rowH), obj: DX });
    // the list at 1:1, rows as links so they take hover and focus
    const LY = G.bottom - 4 * rowH - 8, n = Math.min(4, ds.length);
    const list = `<ul class="ui-list">${ds.slice(0, n).map((d, i) => nth(row(d, '#'), 'a', { 0: ['', 'is-hover', 'is-focus', ''][i] })).join('')}</ul>`;
    body += at(G.L, LY, RW, list);
    const notes = [['Rest', ''], ['Hover', `${val('--raised')}`], ['Focus', `the ${RING} px ring`]];
    notes.forEach(([n1, v], i) => {
      const cy = LY + hw + i * rowH + rowH / 2;
      svg += `<path d="M${G.L + RW + 8} ${f2(cy) + 0.5}H${G.L + RW + 32}" stroke="${R.ink}" stroke-width="1" fill="none"/>`;
      body += blk(G.L + RW + 40, f2(cy - 10), 300, 20, 'c-body nw', `<b style="font-weight:600;color:${R.ink}">${n1}</b>${v ? `, ${v}` : ''}`, `color:${R.quiet}`);
    });
    body += kitTitle(ctx, 'lists', `A row is a leading mark, two lines of text and a trailing value with its status, on a ${hw} px ${val('--divider')} rule. A row that opens something is a link, and takes hover and focus.`, { w: 480 });
    svg += ruler(ctx, { uid: 'u2ls', live: [DX, G.R], edgeAnchor: true });
    return pageOf(ctx, 'lists', body, svg);
  },

  // ---- status: the first status word and the count badge drawn at 4:1; under them every state the brand ships, on the light and
  // the dark surface, each with its token and its ratio ----
  status(ctx) {
    const R = roles(ctx), ui = ctx.ui, S = sc(ctx), W = ctx.weights, { l, cap: cp } = ty(ctx);
    const L = colourMap(ctx, 'light'), Dk = colourMap(ctx, 'dark'), s0 = ctx.status[0], k = 4, DX = G.col[6], DY = 120;
    const cw = Math.ceil(adv(bodyFace(ctx, W.medium), s0.label, l.size)) + 1, ch = l.size * 1.3, n = String((S.deliveries || []).length);
    const bW = Math.max(20, 12 + adv(bodyFace(ctx, W.strong), n, cp.size)), BX = DX + cw * k + 96;
    let body = drawn(DX, DY, k, cw, ui.statusChip(s0.id)) + drawn(BX, DY, k, bW, `<span class="ui-badge">${A(n)}</span>`)
      + cap(DX, DY + Math.max(ch, 20) * k + 40, G.R - DX, `A status word and a count badge, drawn at ${k}:1`, R.quiet);
    let svg = hDim(ctx, { x1: DX, x2: DX + cw * k, y: DY - 20, label: fx(ctx, cw), obj: DY })
      + vDim(ctx, { x: DX - 16, y1: DY, y2: DY + ch * k, label: fx(ctx, ch), obj: DX })
      + hDim(ctx, { x1: BX, x2: BX + bW * k, y: DY - 20, label: fx(ctx, bW), obj: DY })
      + vDim(ctx, { x: BX + bW * k + 16, y1: DY, y2: DY + 20 * k, label: fx(ctx, 20), obj: BX + bW * k, right: true });
    // the register: every status on light and on dark
    const rows = ctx.status.slice(0, 6), RH = 48, TY = G.bottom - rows.length * RH, PX = G.col[3], PW = span(3);
    const cols = [[G.L, 'On light'], [PX, 'On dark'], [G.col[6], 'Token'], [G.col[8], 'Light, on surface'], [G.col[10], 'Dark, on surface']];
    body += cols.map(([cx, t]) => cap(cx === PX ? cx + 16 : cx, TY - 28, 200, t, R.ink, 'c-head nw')).join('');
    let dark = '';
    rows.forEach((s, i) => {
      const y = TY + i * RH, tl = statusText(ctx, 'light', s), td = statusText(ctx, 'dark', s);
      body += fill(G.L, y, G.W, 1, i ? R.hair : R.ink) + at(G.L, y + 14, PX - 24 - G.L, ui.statusChip(s.id))
        + blk(G.col[6], y + 14, 160, 20, 'nw', val(tl.token), `color:${R.ink}`)
        + blk(G.col[8], y + 14, 160, 20, 'c-body nw', `${val(tl.hex)} ${ratioText(ctx, tl.hex, L.surface)}`, `color:${R.ink}`)
        + blk(G.col[10], y + 14, G.R - G.col[10], 20, 'c-body nw', `${val(td.hex)} ${ratioText(ctx, td.hex, Dk.surface)}`, `color:${R.ink}`);
      dark += `<div class="a" style="left:16px;top:${i * RH + 14}px">${ui.statusChip(s.id)}</div>`;
    });
    body += uiPlate(PX, TY + 1, PW, rows.length * RH - 1, 'dark', dark) + fill(G.L, G.bottom, G.W, 1, R.hair)
      + kitTitle(ctx, 'status', `A status is the product's own words in one colour, never a filled pill. Each is measured on the surface it sits on, light and dark.`);
    void Dk;
    svg += ruler(ctx, { uid: 'u2su', live: [DX, BX + bW * k] });
    return pageOf(ctx, 'status', body, svg);
  },

  // ---- feedback: the toast drawn at 2:1 with its run of paddings; the four alert tones at 1:1 down the right; the inline message
  // and the loading pieces under the drawing ----
  feedback(ctx) {
    const R = roles(ctx), ui = ctx.ui, S = sc(ctx), F = S.form || {}, W = ctx.weights, { l, b } = ty(ctx);
    const msg = S.toast || S.status, tw = adv(bodyFace(ctx, W.regular), msg, b.size), uw = adv(bodyFace(ctx, W.strong), 'Undo', l.size);
    const TW = 16 + tw + 12 + 8 + 6 + uw + 6 + 16, RX = G.col[7], DX = G.L + 48, k = Math.min(2, Math.floor(((RX - 40 - DX) / TW) * 2) / 2), DY = 248, TH = 24 + b.line;
    let body = drawn(DX, DY, k, Math.ceil(TW + 4), `<div class="u2-inl">${ui.toast(msg)}</div>`)
      + cap(DX, DY + TH * k + 16, 400, `Toast, drawn at ${k}:1`, R.quiet);
    let svg = chain(ctx, DX, k, [16, tw, 26, uw, 22], DY - 20, DY)
      + vDim(ctx, { x: DX - 16, y1: DY, y2: DY + TH * k, label: fx(ctx, TH), obj: DX });
    // alerts, one per tone, each with brand words that carry that tone
    const tones = [['Info', 'info', S.inline], ['Success', 'success', S.toast], ['Warning', 'warning', S.alert], ['Danger', 'danger', F.readyError]].filter((t) => t[2]);
    body += at(RX, G.top + 16, G.R - RX, `<div class="u2-stack">${tones.map(([n, t, s]) => `<p class="u2-cap">${n}</p>${ui.alert(t, s)}`).join('<div class="u2-sp"></div>')}</div>`);
    // inline message and loading
    const IY = 444;
    body += fill(G.L, IY, RX - 40 - G.L, 1, R.ink) + cap(G.L, IY + 8, 200, 'Inline message', R.ink, 'c-head nw')
      + at(G.L, IY + 36, RX - 40 - G.L, `<p class="ui-inline-msg">${ui.icon('info', 16)}${A(S.inline || '')}</p>`)
      + fill(G.L, IY + 96, RX - 40 - G.L, 1, R.ink) + cap(G.L, IY + 104, 200, 'Loading', R.ink, 'c-head nw')
      + at(G.L, IY + 140, 24, ui.spinner()) + cap(G.L, IY + 180, 80, 'Spinner', R.quiet)
      + at(G.L + 72, IY + 140, 160, `<div class="u2-sk">${ui.skeleton('100%')}${ui.skeleton('72%')}${ui.skeleton('86%')}</div>`) + cap(G.L + 72, IY + 220, 120, 'Skeleton', R.quiet)
      + at(G.L + 272, IY + 132, RX - 40 - G.L - 272, `<div class="ui-progress" role="progressbar" aria-label="${A(S.rider || '')}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round((S.progress || 0) * 100)}"><div class="ui-progress__bar"><i style="width:${(S.progress || 0) * 100}%"></i></div><span class="ui-progress__dot" style="left:${(S.progress || 0) * 100}%"></span></div><div class="u2-route"><span>${A(S.from || '')}</span><span>${A(S.to || '')}</span></div>`)
      + cap(G.L + 272, IY + 220, 120, 'Progress', R.quiet)
      + kitTitle(ctx, 'feedback', `Messages are words on the surface. An icon and a ${fx(ctx, 2)} edge carry the tone and the text stays in ${val('--text')}; only the toast inverts.`);
    svg += ruler(ctx, { uid: 'u2fb', live: [DX, DX + TW * k] });
    return pageOf(ctx, 'feedback', body, svg);
  },
};

const span = (n) => 86 * n - 24;
void cropTicks; void dispFace;
