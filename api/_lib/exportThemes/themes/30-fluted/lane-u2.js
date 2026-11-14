// Theme 30, Fluted, lane u2: the UI kit's component pages (states, buttons, inputs, choices, cards, navigation, lists, status, feedback).
// Each page keeps lane u1's chrome: the real components (ctx.ui, componentsCss, unrestyled) sit above the band, every state forced by class, and the band
// shows that page's own data in the theme's window, standing in line under the column it belongs to. Values are printed in the key row under the band.
// Colours come from ctx roles only; brand copy is printed whole through A(), never cut or counted. Every class here starts u2-.
import { A, put, tokens, adv } from './helpers.js';
import { warpPath } from './glass.js';
import { colourMap, statusText } from '../../engine/tokens.js';
import { iconSet } from '../../engine/components.js';
import { kitPage, editionMode, tower, box, uiAt, headline, lead, keyAt, snap, P, LIP, BB, KEY } from './lane-u1.js';

const sc = (ctx) => ctx.brand.ui.screen.content;
const r1 = (ctx, a, b) => ctx.fmt(ctx.ratio(a, b));
const tok = (s) => `<span class="v">${A(s)}</span>`;
const sizeOf = (ctx, token) => (ctx.uiType.find((t) => t.token === token) || { size: 16 }).size;
// the shortest of a brand's labels, measured (so it fits a narrow column whole); never cut
const shortest = (ctx, list, size, weight) => (list || []).filter((s) => typeof s === 'string' && s.length)
  .map((s) => [s, adv(ctx, 'body', s, size, 0, weight)]).sort((a, b) => a[1] - b[1]).map((x) => x[0])[0] || '';
// the page's mode and its colour roles
const pageOf = (ctx) => { const T = tokens(ctx), mode = editionMode(T); return { T, mode, M: colourMap(ctx, mode) }; };
// a hairline across the band at a contrast ratio (the towers stand ratio * u tall)
const ratioLine = (T, u, v) => `<rect x="0" y="${(BB - v * u - 0.5).toFixed(1)}" width="1080" height="1" fill="${T.quiet}"/>`;
// the band's closing sentence, under the keys
const keyNote = (ctx, html, dy = 56) => put(ctx, { x: 64, y: KEY + dy, w: 952, cls: 'k', style: 'white-space:normal', html });
// a filled polygon seen flat above the band and bent inside it, like u1's marks
function poly(pts, fill) {
  const d = `M${pts.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join('L')}Z`, wd = warpPath(d, 0, 0, {});
  return { flat: `<path d="${d}" fill="${fill}"/>`, over: `<path d="${wd || d}" fill="${fill}"/>`, body: '' };
}
// a window as faint as the ground gets a quiet outline, so it still reads as a window
const faint = (ctx, T, hex) => ctx.ratio(hex, T.ground) < 1.3;
// the state grid: a .ui region laid out as a CSS grid, its row names in the page's chrome type
const grid = (ctx, T, x, y, w, cols, rows, { gap = 12, rowGap = 20, names = 'span' } = {}) => {
  const tmpl = names === 'col' ? `${cols[0]}px repeat(${cols[1]},${cols[2]}px)` : `repeat(${cols[1]},${cols[2]}px)`;
  const body = rows.map(([n, cells], i) => (names === 'col' ? `<div class="u2-rn">${A(n)}</div>` : `<div class="u2-rn u2-rn--span${i ? '' : ' u2-rn--first'}">${A(n)}</div>`)
    + cells.map((c) => `<div class="u2-c">${c}</div>`).join('')).join('');
  return uiAt(ctx, T, x, y, w, `<div class="u2-grid" style="grid-template-columns:${tmpl};column-gap:${gap}px;row-gap:${rowGap}px">${body}</div>`, { style: 'background:transparent' });
};
const na = (t) => `<span class="u2-na">${t}</span>`;
const heads = (ctx, xs, w, names, y = 280) => names.map((n, i) => put(ctx, { x: xs[i], y, w, cls: 'kn', html: n })).join('');

export function css() {
  return `.pg .u2-grid{display:grid;align-items:center}
.pg .u2-rn{font:500 15px/20px var(--chrome);color:var(--ink);white-space:nowrap}
.pg .u2-rn--span{grid-column:1/-1;margin:12px 0 -8px}
.pg .u2-rn--first{margin-top:0}
.pg .u2-c{display:flex;align-items:center;min-height:44px;min-width:0}
.pg .u2-c>.ui-field{width:100%}
.pg .u2-na{font:400 15px/20px var(--chrome);color:var(--quiet);white-space:normal}
.pg .u2-stack{display:flex;flex-direction:column;gap:12px;align-items:flex-start}
.pg .u2-row{display:flex;align-items:center;gap:16px}
.pg .u2-cards{display:grid;grid-template-columns:repeat(4,226px);column-gap:16px;align-items:start}
.pg .u2-cards .ui-stat+.ui-stat{margin-top:12px}
.pg .u2-act{margin-top:6px}
.pg .u2-mode{padding:24px;display:flex;flex-direction:column;gap:0}
.pg .u2-mode>div{display:flex;align-items:center;justify-content:space-between;min-height:40px;border-bottom:var(--w-hairline) solid var(--divider)}
.pg .u2-mode>div:last-child{border-bottom:0}
.pg .u2-mode .u2-r{font:400 15px/20px var(--dm);color:var(--text-soft);font-variant-numeric:tabular-nums}
.pg .u2-mode .u2-m{font:500 15px/20px var(--chrome);color:var(--text);min-height:0;padding-bottom:8px}
.pg .u2-bar{width:468px}
.pg .u2-load{display:flex;align-items:center;gap:24px}
.pg .u2-skel{display:flex;flex-direction:column;gap:10px;width:260px}
.pg .u2-skel .ui-skeleton{background:var(--divider)}   /* the sunken fill is near-black on a dark page: the bars take the divider tone so they read */
.pg .u2-alerts{display:grid;grid-template-columns:repeat(4,226px);column-gap:16px;align-items:start}
`;
}

export const uikit = {
  // ---- states: every control at rest and in each state, forced by class; in the glass the primary's fill in each state, as tall as its label's contrast on it ----
  states: (ctx) => {
    const { T, M } = pageOf(ctx), S = sc(ctx), F = S.form || {}, X = S.example || {}, ui = ctx.ui, W = ctx.weights;
    const head = headline(ctx, 'States');
    const leadH = lead(ctx, `Every control at rest and in each state it can take, set here by class so they all show at once. In the glass, the primary button's fill in each state, as tall as its label's contrast on it; the line marks 4.5 : 1.`);
    const cx = (i) => 192 + i * 168, CW = 156;
    const names = ['Rest', 'Hover', 'Focus', 'Pressed', 'Disabled'];
    const sec = X.secondary || 'Edit', chk = shortest(ctx, X.checks, sizeOf(ctx, 'control'), W.regular) || F.title;
    const btn = (label, variant) => (state) => ui.btn(label, { variant, state });
    const fld = (n, o = {}) => ui.field({ id: `u2-st-${n}`, label: F.ready, value: F.readyValue, ...o });
    const same = na('Same as rest');
    const rows = [
      ['Primary', [undefined, 'hover', 'focus', 'pressed'].map(btn(F.book, 'primary')).concat(na('Never disabled: its label names the next step.'))],
      ['Secondary', [undefined, 'hover', 'focus', 'pressed', 'disabled'].map(btn(sec, 'secondary'))],
      ['Text field', [fld(1), same, fld(2, { state: 'focus' }), same, fld(3, { disabled: true })]],
      ['Checkbox', [ui.check(chk, { checked: true }), same, ui.check(chk, { checked: true, state: 'focus' }), same, ui.check(chk, { checked: true, disabled: true })]],
    ];
    const html = heads(ctx, [0, 1, 2, 3, 4].map(cx), CW, names) + grid(ctx, T, 64, 328, 960, [116, 5, CW], rows, { names: 'col', rowGap: 28 });
    // the band: the button's fill and label in each state (disabled is the secondary's grey, since a primary never shows it)
    const st = [['action', 'action-label'], ['action-hover', 'action-label'], ['action', 'action-label'], ['action-pressed', 'action-label'], ['disabled-bg', 'disabled-text']];
    const rs = st.map(([f, l]) => ctx.ratio(M[l], M[f])), u = (BB - LIP) / Math.max(...rs);
    let keys = '';
    const ms = st.map(([f, l], i) => {
      const x = cx(i), hex = M[f], focus = i === 2;
      keys += keyAt(ctx, x, CW, `${r1(ctx, M[l], M[f])} : 1`, 'v num') + keyAt(ctx, x, CW, A(`--${focus ? 'focus' : f}`), 'v', 22);
      const stroke = focus ? M.focus : faint(ctx, T, hex) ? T.quiet : null;
      return tower(x, CW, BB - rs[i] * u, { fill: hex, stroke, sw: focus ? ctx.borders[2].px * 3 : 2 });
    });
    keys += keyNote(ctx, `Each window is the button's fill in that state; the focused one carries the ring. Under each, its label's contrast and the token that changes.`);
    return kitPage(ctx, 'states', T, { marks: ms, over: ratioLine(T, u, 4.5), html: head + leadH + html + keys });
  },

  // ---- buttons: the four kinds, then the three sizes, each standing over its own window: the size's height and corner, eight times over ----
  buttons: (ctx) => {
    const { T, M } = pageOf(ctx), S = sc(ctx), F = S.form || {}, X = S.example || {}, ui = ctx.ui, Rd = ctx.radius, bc = ctx.borders[1];
    const ctl = ctx.uiType.find((t) => t.token === 'control') || { size: 16, weight: ctx.weights.medium };
    const head = headline(ctx, 'Buttons');
    const leadH = lead(ctx, `Four kinds and three sizes, one shape: ${Rd.button} px corners and the label at ${ctl.size} px. One primary on a screen, and its label is a verb that says what happens.`);
    const kinds = [
      ['Primary', ui.btn(F.book), `${tok('--action')} fill, ${tok('--action-label')} words.`],
      ['Secondary', ui.btn(X.secondary || 'Edit', { variant: 'secondary' }), `A ${bc.px} px edge in ${tok('--text')}.`],
      ['Quiet', ui.btn(X.quiet || 'Skip', { variant: 'quiet' }), 'Underlined, with no fill.'],
      ['Danger', ui.btn(X.danger || 'Remove', { variant: 'danger' }), `${tok('--danger')} fill, for what can't be undone.`],
    ];
    const GXs = [64, 306, 548, 790];
    let html = kinds.map(([n, b, d], i) => put(ctx, { x: GXs[i], y: 280, w: 226, cls: 'kn', html: n })
      + uiAt(ctx, T, GXs[i], 312, 226, `<div class="u2-stack"><div style="zoom:1.5">${b}</div><p class="k" style="white-space:normal">${d}</p></div>`, { style: 'background:transparent' })).join('');
    // the sizes: each button over its own window, the windows rising left to right
    const chev = iconSet(ctx).includes('chevron-right') ? 'chevron-right' : null;
    const sizes = [['Small', 36, 'sm'], ['Default', 44, null], ['Large', 52, 'lg']];
    const k = Math.floor((BB - LIP) / 52), CW = 300, xs = [60, 384, 708];
    html += sizes.map(([n, h, s], i) => put(ctx, { x: xs[i] + 4, y: 520, w: CW, cls: 'kn', html: n })
      + uiAt(ctx, T, xs[i] + 4, 552, CW, `<div style="zoom:1.5">${ui.btn(F.book, { size: s || undefined, iconRight: s === 'lg' ? chev : null })}</div>`, { style: 'background:transparent' })).join('');
    let keys = '';
    const ms = sizes.map(([n, h], i) => {
      keys += keyAt(ctx, xs[i] + 4, CW, `${h} px high`, 'v num') + keyAt(ctx, xs[i] + 4, CW, `${A(n)}${i === 2 ? ', one a screen at most' : i === 0 ? ', inside rows and cards' : ''}`, 'k', 22);
      return tower(xs[i], CW, BB - h * k, { r: Math.min(CW / 2, Rd.button * k), fill: T.strong });
    });
    keys += keyNote(ctx, `Each window is a size's height and its ${Rd.button} px corner, ${k} times over; the width is not to scale. The buttons above are shown at 1.5 times.`);
    return kitPage(ctx, 'buttons', T, { marks: ms, html: head + leadH + html + keys });
  },

  // ---- inputs: the text field and the select in four states, the text area beside the lead; in the glass each state's edge, as tall as its contrast ----
  inputs: (ctx) => {
    const { T, M } = pageOf(ctx), S = sc(ctx), F = S.form || {}, ui = ctx.ui, bc = ctx.borders[1], bf = ctx.borders[2];
    const head = headline(ctx, 'Inputs');
    const leadH = lead(ctx, `The label always sits above the field, and the line under it turns into the error when there is one. In the glass, each state's edge, as tall as its contrast on the surface; the line marks 3 : 1.`);
    const sizes = F.sizes || [];
    const area = uiAt(ctx, T, 548, 176, 468, `<div class="kn">Text area</div><div style="margin-top:12px">${ui.field({ id: 'u2-in-a', label: F.notes, kind: 'textarea', help: F.notesHelp })}</div>`, { style: 'background:transparent' });
    const xs = [0, 1, 2, 3].map((i) => 64 + i * 240), CW = 228;
    const sel = (n, o = {}) => ui.field({ id: `u2-in-s${n}`, label: F.size, kind: 'select', options: sizes, value: sizes[0], ...o });
    const fld = (n, o = {}) => ui.field({ id: `u2-in-t${n}`, label: F.ready, value: F.readyValue, ...o });
    const rows = [
      ['Text field', [fld(1), fld(2, { state: 'focus' }), fld(3, { error: F.readyError }), fld(4, { disabled: true })]],
      ['Select', [sel(1), sel(2, { state: 'focus' }), na('Same edge and message as the text field.'), sel(4, { disabled: true })]],
    ];
    const html = area + heads(ctx, xs, CW, ['Rest', 'Focus', 'Error', 'Disabled'], 384) + grid(ctx, T, 64, 432, 952, [0, 4, CW], rows, { rowGap: 20 });
    // the band: rest edge, focus ring, error edge as outlines (their widths 6 times over), disabled as its fill, which has no edge
    const K = 6, st = [['edge', bc.px], ['focus', bf.px], ['danger', bc.px], ['disabled-bg', 0]];
    const rs = st.map(([t]) => ctx.ratio(M[t], M.surface)), u = (BB - LIP) / Math.max(...rs);
    let keys = '';
    const ms = st.map(([t, w], i) => {
      const x = 60 + i * 240, top = BB - rs[i] * u, hex = M[t];
      keys += keyAt(ctx, x + 4, CW, `${r1(ctx, hex, M.surface)} : 1`, 'v num') + keyAt(ctx, x + 4, CW, A(`--${t}${w ? `, ${w} px` : ''}`), 'v', 22);
      return w ? tower(x, CW, top, { r: ctx.radius.input * K, stroke: hex, sw: w * K }) : tower(x, CW, top, { r: ctx.radius.input * K, fill: hex, stroke: faint(ctx, T, hex) ? T.quiet : null });
    });
    keys += keyNote(ctx, `Edges and corners ${K} times their size. Disabled drops the edge and takes the grey fill; it is the one state that need not reach 3 : 1.`);
    return kitPage(ctx, 'inputs', T, { marks: ms, over: ratioLine(T, u, 3), html: head + leadH + html + keys });
  },

  // ---- choices: checkbox, radio and switch in five states, the segmented control under them; in the glass each control switched on, eight times its size ----
  choices: (ctx) => {
    const { T, M } = pageOf(ctx), S = sc(ctx), F = S.form || {}, X = S.example || {}, ui = ctx.ui, W = ctx.weights, bc = ctx.borders[1];
    const fs = sizeOf(ctx, 'control');
    const head = headline(ctx, 'Choices');
    const leadH = lead(ctx, `Checkboxes for several, radios for one of a few, a switch for something that takes effect at once, and the segmented control to change a view. In the glass, each one switched on, ${8} times its size.`);
    const cb = shortest(ctx, X.checks, fs, W.regular) || F.title, rd = shortest(ctx, X.radios, fs, W.regular) || F.title, sw = shortest(ctx, X.switches, fs, W.regular) || F.title;
    const xs = [0, 1, 2, 3, 4].map((i) => 64 + i * 192), CW = 180;
    const st = [{}, { checked: true }, { checked: true, state: 'focus' }, { disabled: true }, { disabled: true, checked: true }];
    const rows = [
      ['Checkbox', st.map((o) => ui.check(cb, o))],
      ['Radio', st.map((o, i) => ui.check(rd, { ...o, type: 'radio', name: `u2-rd${i}` }))],
      ['Switch', st.map((o) => ui.switch(sw, o))],
    ];
    let html = heads(ctx, xs, CW, ['Off', 'On', 'Focus', 'Disabled', 'Disabled, on']) + grid(ctx, T, 64, 320, 952, [0, 5, CW], rows, { gap: 12, rowGap: 16 });
    const seg = F.sizes || [];
    html += put(ctx, { x: 64, y: 608, w: 468, cls: 'kn', html: 'Segmented' }) + uiAt(ctx, T, 64, 640, 468, ui.segmented(seg, 1), { style: 'background:transparent' })
      + put(ctx, { x: 548, y: 608, w: 468, cls: 'kn', html: 'Segmented, disabled' }) + uiAt(ctx, T, 548, 640, 468, ui.segmented(seg, 1, { disabled: true }), { style: 'background:transparent' });
    // the band, k = 8: checkbox 22 px with its corner and tick, radio 22 px round with its dot, switch 44 by 26 with its thumb at the far end
    const k = 8, cw = 22 * k, sww = 44 * k, gap = 48, x0 = snap(60 + (960 - (2 * cw + sww + 2 * gap)) / 2);
    const xc = x0, xr = xc + cw + gap, xsw = xr + cw + gap, top = LIP;
    const ms = [];
    ms.push(tower(xc, cw, top, { r: ctx.radius.input * k, fill: M.text }));
    // the tick: an L 10 by 5 with a 2 px stroke, turned -45 degrees and lifted 1 px, as componentsCss draws it
    const ccx = xc + cw / 2, ccy = top + cw / 2, th = -Math.PI / 4;
    const L = [[-5, -2.5], [-5, 2.5], [5, 2.5], [5, 0.5], [-3, 0.5], [-3, -2.5]].map(([a, b]) => [ccx + k * (a * Math.cos(th) - b * Math.sin(th)), ccy + k * (a * Math.sin(th) + b * Math.cos(th) - 1)]);
    ms.push(poly(L, M.surface));
    ms.push(tower(xr, cw, top, { r: cw / 2, stroke: M.text, sw: bc.px * k }));
    ms.push(box(xr + cw / 2 - 5 * k, top + cw / 2 - 5 * k, 10 * k, 10 * k, 5 * k, { fill: M.text }));
    ms.push(tower(xsw, sww, top, { r: 13 * k, fill: M.action, stroke: M.text, sw: bc.px * k }));
    ms.push(box(xsw + 22 * k, top + 4 * k, 16 * k, 16 * k, 8 * k, { fill: M.text }));
    const keys = keyAt(ctx, xc, cw, 'Checkbox', 'kn') + keyAt(ctx, xc, cw, `22 px, ${ctx.radius.input} px corner`, 'v num', 22)
      + keyAt(ctx, xr, cw, 'Radio', 'kn') + keyAt(ctx, xr, cw, '22 px, round', 'v num', 22)
      + keyAt(ctx, xsw, sww, 'Switch', 'kn') + keyAt(ctx, xsw, sww, `44 by 26 px, ${tok('--action')} when on`, 'v num', 22)
      + keyNote(ctx, `Each control switched on, ${k} times its size: its corner, its ${bc.px} px edge and its mark as built. The rest of each window is its foot.`);
    return kitPage(ctx, 'choices', T, { marks: ms, html: head + leadH + html + keys });
  },

  // ---- cards: four cards in columns; under each, its parts stacked in the colours they print in, one step a part ----
  cards: (ctx) => {
    const { T, M } = pageOf(ctx), S = sc(ctx), X = S.example || {}, ui = ctx.ui, B = ctx.brand;
    const head = headline(ctx, 'Cards');
    const leadH = lead(ctx, `A card holds one thing. On the surface a hairline edge marks it; a raised card takes the raised ground and drops the edge. In the glass, each card's parts, top to bottom, in the colours they print in.`);
    const shot = (B.imagery && B.imagery.shots || []).find((s) => s.photo);
    const act = `<div class="u2-act">${ui.btn(X.secondary || S.call || 'Edit', { variant: 'secondary', size: 'sm' })}</div>`;
    const cards = [
      shot ? ['With media', ui.card({ media: ctx.photo(shot.id, { cls: 'ui-card__media' }), meta: S.status, title: S.rider, text: S.riderNote }), [['Media', 'sunken'], ['Meta', 'quiet'], ['Title', 'text'], ['Text', 'text-soft']]]
        : ['Card', ui.card({ meta: S.status, title: S.rider, text: S.riderNote }), [['Meta', 'quiet'], ['Title', 'text'], ['Text', 'text-soft']]],
      ['With an action', ui.card({ meta: S.deliverToLabel, title: S.deliverTo, text: S.eta, action: act }), [['Meta', 'quiet'], ['Title', 'text'], ['Text', 'text-soft'], ['Action', 'action']]],
      ['Raised', ui.card({ meta: S.paidLabel, title: S.paid, text: S.pickup, raised: true }), [['Meta', 'quiet'], ['Title', 'text'], ['Text', 'text-soft']]],
      ['Stat', `${ui.stat(S.paid, S.paidLabel)}${ui.stat(S.deliverTo, S.deliverToLabel)}`, [['Value', 'text'], ['Label', 'quiet']]],
    ];
    const GXs = [64, 306, 548, 790];
    let html = cards.map(([n], i) => put(ctx, { x: GXs[i], y: 304, w: 226, cls: 'kn', html: n })).join('')
      + uiAt(ctx, T, 64, 336, 952, `<div class="u2-cards">${cards.map(([, c]) => `<div><div style="zoom:1.2">${c}</div></div>`).join('')}</div>`, { style: 'background:transparent' });
    // the band: one step per part, the steps one reed apart, the top step with the card's corner 4 times over
    const most = Math.max(...cards.map((c) => c[2].length)), step = Math.floor((BB - LIP + P) / most), CW = 226;
    let keys = '';
    const ms = [];
    cards.forEach(([n, , parts], i) => {
      const x = GXs[i];
      parts.forEach(([pn, t], j) => {
        const hex = M[t], from = BB - (parts.length - j) * step, foot = from + step - (j === parts.length - 1 ? 0 : P);
        ms.push(tower(x, CW, from, { r: j === 0 ? ctx.radius.card * 4 : 0, fill: hex, stroke: faint(ctx, T, hex) ? T.quiet : null, foot }));
      });
      keys += keyAt(ctx, x, CW, `<span class="num">${parts.length}</span> parts`, 'v') + keyAt(ctx, x, CW, A(parts.map((p) => p[0]).join(', ')), 'k', 22);
    });
    keys += keyNote(ctx, `Each step is one part, in the token it prints in. The top step carries the card's ${ctx.radius.card} px corner, 4 times over.`);
    return kitPage(ctx, 'cards', T, { marks: ms, html: head + leadH + html + keys });
  },

  // ---- navigation: top bar, tabs, breadcrumbs, sidebar and the phone's tab bar; in the glass the top bar's links, each as wide as it is built ----
  navigation: (ctx) => {
    const { T, M } = pageOf(ctx), S = sc(ctx), X = S.example || {}, ui = ctx.ui, W = ctx.weights, icons = iconSet(ctx);
    const links = (X.links || []).filter((l) => !l[1] || icons.includes(l[1]));
    const acct = [X.account || 'Account', icons.includes('user') ? 'user' : null];
    const head = headline(ctx, 'Navigation');
    const leadH = lead(ctx, `Where you are, said once: the current page carries a bar in the action colour, and every link is 44 px tall. In the glass, the top bar's links, each as wide as it is built.`);
    const name = `<span class="ui-display" style="font-size:var(--fs-title-s);line-height:var(--lh-title-s)">${A(ctx.brand.name)}</span>`;
    const top = `<nav class="ui-topbar" aria-label="Main">${name}<div class="ui-topbar__links">${ui.links(links, 0)}</div></nav>`;
    const all = [...links, acct];
    const side = `<nav class="ui-sidebar" aria-label="Sections">${ui.links(all, 0)}</nav>`;
    const bar = `<nav class="ui-tabbar" aria-label="Sections">${all.slice(0, 4).map(([t, i], j) => `<a href="#"${j === 0 ? ' aria-current="page"' : ''}>${i ? ui.icon(i, 20) : ''}${A(t)}</a>`).join('')}</nav>`;
    let html = put(ctx, { x: 64, y: 272, w: 468, cls: 'kn', html: 'Top bar' }) + uiAt(ctx, T, 64, 304, 952, top, { style: 'background:transparent' })
      + put(ctx, { x: 64, y: 392, w: 468, cls: 'kn', html: 'Tabs' }) + uiAt(ctx, T, 64, 424, 468, ui.tabs(X.tabs || [], 0), { style: 'background:transparent' })
      + put(ctx, { x: 548, y: 392, w: 468, cls: 'kn', html: 'Breadcrumbs' }) + uiAt(ctx, T, 548, 436, 468, ui.crumbs(X.crumbs || []), { style: 'background:transparent' })
      + put(ctx, { x: 64, y: 500, w: 468, cls: 'kn', html: 'Sidebar' }) + uiAt(ctx, T, 64, 532, 244, side, { style: 'background:transparent' })
      + put(ctx, { x: 548, y: 500, w: 468, cls: 'kn', html: 'Tab bar, on a phone' }) + uiAt(ctx, T, 548, 532, 390, bar, { style: 'background:transparent' });
    // the band: each top-bar link as wide as it is built (12 px either side, an 18 px icon, an 8 px gap, the label at the label size), k times over
    const fs = sizeOf(ctx, 'label'), lw = links.map(([t, i]) => 24 + (i ? 26 : 0) + adv(ctx, 'body', t, fs, 0, W.medium));
    const G = 24, k = Math.min(4, Math.floor((960 - G * (links.length - 1)) / lw.reduce((a, b) => a + b, 0) * 4) / 4);
    let x = 60, keys = '';
    const ms = links.map(([t], i) => {
      const w = Math.round(lw[i] * k), m = i === 0 ? tower(x, w, LIP, { r: ctx.radius.control * k, fill: M.action }) : tower(x, w, LIP + 96, { r: ctx.radius.control * k, stroke: M['text-soft'], sw: 2 });
      keys += keyAt(ctx, x, Math.max(w, 96), A(t), 'kn') + keyAt(ctx, x, Math.max(w, 96), `${Math.round(lw[i])} px`, 'v num', 22);
      x += w + G;
      return m;
    });
    keys += keyNote(ctx, `Each link ${k} times its width, its ${ctx.radius.control} px corner too. The current page stands taller, in ${tok('--action')}; the others are outlines in ${tok('--text-soft')}.`);
    return kitPage(ctx, 'navigation', T, { marks: ms, html: head + leadH + html + keys });
  },

  // ---- lists: the product's rows with lead, detail and status; in the glass the same rows at their own height, each in its status colour ----
  lists: (ctx) => {
    const { T, mode } = pageOf(ctx), S = sc(ctx), ui = ctx.ui, D = S.deliveries || [];
    const head = headline(ctx, 'Lists');
    const leadH = lead(ctx, `One row is one item: the title says what, the line under it says when, and the status is the only colour. Figures are tabular, so a column lines up. In the glass, the rows at their own 64 px, in their status colours.`);
    const LW = 572;
    let html = put(ctx, { x: 64, y: 280, w: LW, cls: 'kn', html: 'With a lead and a status' }) + uiAt(ctx, T, 64, 312, LW, ui.deliveryRows(D.length), { style: 'background:transparent' });
    const d0 = D[0] || {}, d1 = D[1] || d0;
    html += put(ctx, { x: 684, y: 280, w: 332, cls: 'kn', html: 'Without a lead' }) + uiAt(ctx, T, 684, 312, 332, `<ul class="ui-list">${[d0, d1].map((d) => ui.row({ title: d.to, sub: d.when, end: d.price })).join('')}</ul>`, { style: 'background:transparent' })
      + put(ctx, { x: 684, y: 488, w: 332, cls: 'kn', html: 'As a link, the whole row' }) + uiAt(ctx, T, 684, 520, 332, `<ul class="ui-list">${ui.row({ lead: ui.icon(d0.icon || ctx.brand.ui.rowIcon || 'package', 18), title: d0.to, sub: d0.when, href: '#' })}</ul>`, { style: 'background:transparent' });
    // the band: the rows again at 1:1 under the list, one bar a row (64 px apart, a reed between), as wide as the list, in the colour of the row's status
    const n = Math.min(D.length, 5), y0 = 768 + Math.round((384 - n * 64 + P) / 2);
    let keys = '';
    const ms = D.slice(0, n).map((d, i) => {
      const s = ctx.status.find((x) => x.id === d.status), hex = s ? statusText(ctx, mode, s).hex : T.ink;
      return box(60, y0 + i * 64, LW + 4, 64 - P, 0, { fill: hex });
    });
    keys += keyAt(ctx, 64, LW, `<span class="num">${n}</span> rows, 64 px apart, ${LW} px wide`, 'v') + keyNote(ctx, `Each bar is a row at its own height and the list's width, in the token its status prints in. The list's only colour is its status.`);
    return kitPage(ctx, 'lists', T, { marks: ms, html: head + leadH + html + keys });
  },

  // ---- status: the brand's states on the light and the dark surface, with their ratios; in the glass each state as wide as its words and as tall as their contrast ----
  status: (ctx) => {
    const { T, mode } = pageOf(ctx), ui = ctx.ui, W = ctx.weights, St = ctx.status, n = St.length;
    const head = headline(ctx, 'Status');
    const leadH = lead(ctx, `Plain words in one colour, never a tinted pill: the label says what is happening, with a time or a count where it helps. In the glass, each state as wide as its words and as tall as their contrast on this page; the line marks 4.5 : 1.`);
    const panel = (m) => {
      const R = ctx.roles[m];
      return `<div class="u2-mode"><div class="u2-m">${m === 'light' ? 'On the light surface' : 'On the dark surface'}</div>${St.map((s) => { const c = statusText(ctx, m, s); return `<div>${ui.statusChip(s.id)}<span class="u2-r">${r1(ctx, c.hex, R.surface)} : 1</span></div>`; }).join('')}</div>`;
    };
    let html = uiAt(ctx, T, 64, 288, 468, panel('light'), { mode: 'light' }) + uiAt(ctx, T, 548, 288, 468, panel('dark'), { mode: 'dark' });
    // the band: label width at the label size, k times; height its ratio on this page's surface
    const fs = sizeOf(ctx, 'label'), ws = St.map((s) => adv(ctx, 'body', s.label, fs, 0, W.medium)), G = 24;
    const k = Math.min(4, Math.floor((960 - G * (n - 1)) / ws.reduce((a, b) => a + b, 0) * 4) / 4);
    const cs = St.map((s) => statusText(ctx, mode, s)), rs = cs.map((c) => ctx.ratio(c.hex, T.ground)), u = (BB - LIP) / Math.max(...rs);
    let x = 60, keys = '';
    const ms = St.map((s, i) => {
      const w = Math.round(ws[i] * k), m = tower(x, w, BB - rs[i] * u, { fill: cs[i].hex });
      keys += keyAt(ctx, x, w, `${ctx.fmt(rs[i])} : 1`, 'v num') + keyAt(ctx, x, w, A(cs[i].token), 'v', 22);
      x += w + G;
      return m;
    });
    keys += keyNote(ctx, `Each window is a state's words ${k} times as wide as they set, in the token they print in on this page.`);
    return kitPage(ctx, 'status', T, { marks: ms, over: ratioLine(T, u, 4.5), html: head + leadH + html + keys });
  },

  // ---- feedback: toast, inline message and loading beside the lead; the four alerts in columns, each standing on its tone's window ----
  feedback: (ctx) => {
    const { T, M } = pageOf(ctx), S = sc(ctx), F = S.form || {}, ui = ctx.ui;
    const head = headline(ctx, 'Feedback');
    const leadH = lead(ctx, `Say what happened and what to do next, in a sentence or two. A banner stays until it is dealt with; a toast leaves by itself. In the glass, each tone as tall as its contrast on the surface; the line marks 3 : 1.`);
    let html = put(ctx, { x: 548, y: 176, w: 468, cls: 'kn', html: 'Toast' }) + uiAt(ctx, T, 548, 208, 468, ui.toast(S.toast), { style: 'background:transparent' })
      + put(ctx, { x: 548, y: 288, w: 468, cls: 'kn', html: 'Inline message' }) + uiAt(ctx, T, 548, 320, 468, `<p class="ui-inline-msg">${ui.icon('info', 16)}<span>${A(S.inline)}</span></p>`, { style: 'background:transparent' })
      + put(ctx, { x: 548, y: 376, w: 468, cls: 'kn', html: 'Loading' }) + uiAt(ctx, T, 548, 408, 468, `<div class="u2-load">${ui.spinner()}<div class="u2-skel">${ui.skeleton('100%')}${ui.skeleton('64%')}${ui.skeleton('80%')}</div></div>`, { style: 'background:transparent' });
    const tones = [['info', 'Information', S.pickup], ['success', 'Success', S.toast], ['warning', 'Warning', S.alert], ['danger', 'Danger', F.readyError]];
    const GXs = [64, 306, 548, 790];
    html += tones.map(([, n], i) => put(ctx, { x: GXs[i], y: 488, w: 226, cls: 'kn', html: n })).join('')
      + uiAt(ctx, T, 64, 520, 952, `<div class="u2-alerts">${tones.map(([t, , s]) => ui.alert(t, s)).join('')}</div>`, { style: 'background:transparent' });
    // the band: under each alert its tone, as tall as its contrast on the surface, the window's left edge on the alert's edge
    const rs = tones.map(([t]) => ctx.ratio(M[t], M.surface)), u = (BB - LIP) / Math.max(...rs);
    let keys = '';
    const ms = tones.map(([t], i) => {
      keys += keyAt(ctx, GXs[i], 226, `${r1(ctx, M[t], M.surface)} : 1`, 'v num') + keyAt(ctx, GXs[i], 226, A(`--${t}`), 'v', 22);
      return tower(GXs[i], 226, BB - rs[i] * u, { fill: M[t] });
    });
    keys += keyNote(ctx, `The tone is the alert's edge and icon only; its words stay in ${tok('--text')}. A spinner is for a short wait; longer ones show the rows' shape.`);
    return kitPage(ctx, 'feedback', T, { marks: ms, over: ratioLine(T, u, 3), html: head + leadH + html + keys });
  },
};
