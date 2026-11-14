// Theme 26, Notebook, lane u2: the UI kit's component spreads (states, buttons, inputs, choices, cards, navigation, lists, status, feedback).
// Each spread sticks real components into the notebook as pieces cut from the product's own ground (lane u1's piece()), every state forced
// by the class the shipped CSS already answers to (is-hover, is-focus, is-pressed) or by the disabled attribute. The components are never
// restyled: the notebook only writes around them, in graphite and on tape, and most notes sit across the fold, level with what they name.
// Every value printed here is read from ctx (tokens, ratios, sizes) and every word on a component is the brand's own copy.
// Every class here starts u2-.
import { kitSpread, piece, ua, tapeLabel, stemOf, ratioText, modeLabel, kitColours } from './lane-u1.js';
import { A, U, row, px, tokens, block, rightText, advance, advanceLabel, wrap, tab, labelStripW, lineOffset, weightName } from './helpers.js';
import { statusText } from '../../engine/tokens.js';

// ---------------------------------------------------------------- small pieces

const sc = (ctx) => ctx.brand.ui.screen.content;
// the demo words the code package falls back on, overridden by the brand's own (as exampleHtml does)
const ex = (ctx) => ({ secondary: 'Secondary', quiet: 'Skip', danger: 'Delete', small: 'Add', account: 'Account', checks: ['Checked', 'Unchecked', 'Disabled'], switches: ['Switch on', 'Switch off'], radios: ['First choice', 'Second choice'], statLabel: 'Total', crumbs: ['Home', 'Section'], tabs: ['One', 'Two', 'Three'], links: [['One', 'map-pin'], ['Two', 'plus'], ['Three', 'clock']], ...(sc(ctx).example || {}) });
const ut = (ctx, token) => ctx.uiType.find((t) => t.token === token);
const sp = (ctx, i, d) => (ctx.space[i] ? ctx.space[i].px : d);
const units = (n) => Math.ceil(n / U - 1e-6) * U;
// the dot row a line of notes sits on to read level with something whose middle is at y (the text's middle is about 4 px over its baseline)
const level = (y) => row(Math.round((y + 4 - 17) / U));

// a note on the paper with its first baseline on bl, wrapped to w
function note(T, { x, w, bl, text, cls = 'c-note' }) {
  const t = T[cls];
  return block(t, { x, w, baseline: bl, lines: wrap(t.stem, t.size, text, w, t.track), cls }).html;
}
const noteLines = (T, text, w, cls = 'c-note') => wrap(T[cls].stem, T[cls].size, text, w, T[cls].track).length;
// a note whose last line sits on `last`
function noteUp(T, { x, w, last, text, cls = 'c-note' }) {
  return note(T, { x, w, bl: last - U * (noteLines(T, text, w, cls) - 1), text, cls });
}
const mono = (T, x, w, bl, text) => block(T['c-mono'], { x, w, baseline: bl, lines: [text], cls: 'c-mono' }).html;
const strong = (T, x, w, bl, text) => block(T['c-strong'], { x, w, baseline: bl, lines: [text], cls: 'c-strong' }).html;
// a label strip of tape whose words sit on baseline bl (left edge x, or right edge xr)
function tapeAt(T, { x, xr, bl, text }) {
  const w = labelStripW(T, 'c-label', text), left = xr != null ? xr - w : x;
  return `<div class="tape tab c-label" style="left:${px(left)};top:${px(bl - lineOffset(T['c-label'].stem, 11, 19))};width:${w}px;height:${U}px">${A(text)}</div>`;
}
// a graphite hairline on the paper (horizontal when h is 1)
const hair = (x, y, w, h) => `<div class="u2-hair" style="left:${px(x)};top:${px(y)};width:${px(w)};height:${px(h)}"></div>`;
// a caption inside a piece, in the kit's small chrome (as lane u1 names its grounds)
const cap = (x, y, text) => ua(x, y, A(text), { cls: 'u1-cap' });

// widths of the shipped controls, measured from the brand face at the size and weight the CSS sets them
function metrics(ctx) {
  const ctl = ut(ctx, 'control'), lab = ut(ctx, 'label'), body = ut(ctx, 'body'), bw = ctx.brand.ui.border;
  const cStem = stemOf(ctx, 'body', ctl.weight), lStem = stemOf(ctx, 'body', lab.weight);
  const pad = { sm: sp(ctx, 3, 16), md: sp(ctx, 4, 20), lg: sp(ctx, 5, 24) };
  const btnW = (label, size = 'md', icon = false) => {
    const t = size === 'sm' ? advanceLabel(lStem, lab.size, label) : advanceLabel(cStem, ctl.size, label);
    return Math.ceil(t + 2 * pad[size] + 2 * bw + (icon ? 18 + sp(ctx, 1, 8) : 0));
  };
  const textW = (text) => advanceLabel(stemOf(ctx, 'body', ctx.weights.regular), ctl.size, text);
  const choiceW = (label, sw = false) => Math.ceil((sw ? 44 : 22) + 12 + textW(label));
  return { ctl, lab, body, bw, pad, btnW, textW, choiceW, cStem, lStem };
}

// ---------------------------------------------------------------- states
// Verso: one piece of the light surface with the three controls people press most, a row per state, top to bottom as a press goes. Across
// the fold, level with each row, the state on tape and what changes, with its token, hex and ratio. Under it, focus again in dark.
function states(ctx) {
  const T = tokens(ctx), S = sc(ctx), F = S.form, X = ex(ctx), ui = ctx.ui, M = kitColours(ctx, 'light'), D = kitColours(ctx, 'dark');
  const G = metrics(ctx), lab = G.lab, r = (a, b) => ratioText(ctx, a, b);
  const w1 = G.btnW(F.book), w2 = G.btnW(X.secondary);
  const c2 = units(19 + w1 + 19), c3 = units(c2 + w2 + 19);
  const P = { x: 42, y: 112, w: 475 };
  const fw = P.w - 19 - c3;
  // the field takes whichever of the form's two addresses is shorter, so it reads whole in its column; when neither fits, the time it is ready by
  const fits = (x) => fw >= G.textW(x[1] || '') + 30;
  let fv = [[F.pickup, F.pickupValue], [F.dropoff, F.dropoffValue]].filter((x) => x[0]).sort((a, b) => G.textW(a[1] || '') - G.textW(b[1] || ''))
    .concat([[F.ready, F.readyValue]].filter((x) => x[0])).find(fits);
  if (!fv && ctx.edition === 'slot') fv = [F.pickup, F.pickupValue];   // slot: the field prints placeholders, which clip rather than fit
  if (!fv) throw new Error(`states: the field column is ${fw} px`);
  const fieldTop = 3, inTop = fieldTop + lab.line + 6;           // the input sits under its label; the buttons line up with the input
  const rows = [
    ['Rest', ui.btn(F.book), ui.btn(X.secondary, { variant: 'secondary' }), {}],
    ['Hover', ui.btn(F.book, { state: 'hover' }), ui.btn(X.secondary, { variant: 'secondary', state: 'hover' }), null],
    ['Focus', ui.btn(F.book, { state: 'focus' }), ui.btn(X.secondary, { variant: 'secondary', state: 'focus' }), { state: 'focus' }],
    ['Pressed', ui.btn(F.book, { state: 'pressed' }), ui.btn(X.secondary, { variant: 'secondary', state: 'pressed' }), null],
    ['Disabled', '', ui.btn(X.secondary, { variant: 'secondary', disabled: true }), { disabled: true }],
  ];
  let inner = cap(19, 19, 'Primary') + cap(c2, 19, 'Secondary') + cap(c3, 19, 'Field');
  const top0 = 57, pitch = 4 * U, mids = [];
  rows.forEach(([, b1, b2, fo], i) => {
    const t = top0 + i * pitch;
    if (b1) inner += ua(19, t + inTop, b1);
    inner += ua(c2, t + inTop, b2);
    if (fo) inner += ua(c3, t + fieldTop, ui.field({ id: `u2-st-${i}`, label: fv[0], value: fv[1] || '', ...fo }), { w: fw });
    mids.push(P.y + t + inTop + 22);
  });
  P.h = units(top0 + rows.length * pitch);
  let vc = piece(ctx, { ...P, mode: 'light', inner }) + tab(T, { x: P.x + U, y: P.y, label: 'Surface, light' });
  vc += noteUp(T, { x: 42, w: 380, last: 739, text: 'Each state is the shipped CSS, forced by its class or by the disabled attribute, so the kit shows exactly what the product draws.' });

  // across the fold: the state on tape and what changes, level with its row
  const ring = ctx.borders[2] ? ctx.borders[2].px : 2;
  const say = [
    ['Action fill with its label on it.', `--action ${M.action}, label ${r(M['action-label'], M.action)}`],
    ['Action steps to its hover fill; outlined controls take the sunken ground. Fields do not change.', `--action-hover ${M['action-hover']}, label ${r(M['action-label'], M['action-hover'])}`],
    [`A ${ring} px ring on a 2 px gap of the ground. A field's edge also turns to the text colour.`, `--focus ${M.focus}, ${r(M.focus, M.surface)} on the surface`],
    ['Action goes to its pressed fill and the button scales to 0.97. Fields do not change.', `--action-pressed ${M['action-pressed']}, label ${r(M['action-label'], M['action-pressed'])}`],
    [`The primary is never disabled. It stays live and says what is missing: ${F.bookWhy || ''}`.trim(), `--disabled-bg ${M['disabled-bg']}, type ${r(M['disabled-text'], M['disabled-bg'])}`],
  ];
  let rc = '';
  rows.forEach(([name], i) => {
    const bl = level(mids[i]) - U;
    const [words, val] = say[i], n = noteLines(T, words, 361);
    rc += tapeAt(T, { x: 42, bl, text: name }) + note(T, { x: 156, w: 361, bl, text: words }) + mono(T, 156, 361, bl + n * U, val);
  });
  // focus again on a piece of the dark surface: the ring changes colour with the mode
  const Q = { x: 42, y: 587, w: 475, h: 6 * U };
  let dk = ua(19, 19 + lab.line + 6, ui.btn(F.book, { state: 'focus' })) + ua(c2, 19 + lab.line + 6, ui.btn(X.secondary, { variant: 'secondary', state: 'focus' }))
    + ua(c3, 19, ui.field({ id: 'u2-st-dk', label: fv[0], value: fv[1] || '', state: 'focus' }), { w: fw });
  rc += piece(ctx, { ...Q, mode: 'dark', inner: dk }) + tab(T, { x: Q.x + U, y: Q.y, label: 'Focus, dark' });
  rc += note(T, { x: 42, w: 475, bl: Q.y + Q.h + U + 19, text: `In dark the ring is --focus ${D.focus}, ${r(D.focus, D.surface)} on the dark surface.` });
  return kitSpread(ctx, 'states', { verso: vc, recto: rc });
}

// ---------------------------------------------------------------- buttons
// Verso: the primary drawn large (the browser's zoom, so it is still the shipped button) with its measurements on the paper around it, and
// the spec under it as an appendix. Recto: every variant at 1:1 on a piece of each ground, light beside dark, row for row.
function buttons(ctx) {
  const T = tokens(ctx), S = sc(ctx), F = S.form, X = ex(ctx), ui = ctx.ui, M = kitColours(ctx, 'light');
  const G = metrics(ctx), r = (a, b) => ratioText(ctx, a, b), B = ctx.brand;
  const w = G.btnW(F.book);
  const k = Math.max(1.5, Math.min(3, Math.floor((475 - 4 * U - 57) / w * 2) / 2));
  const bz = w * k, hz = 44 * k;
  const P = { x: 42, y: 112 };
  P.w = units(bz + 4 * U); P.h = units(hz + 4 * U);
  const bx = Math.round((P.w - bz) / 2), by = Math.round((P.h - hz) / 2);
  let vc = tapeLabel(T, 42, 74, `Primary, drawn at ${k} times`)
    + piece(ctx, { ...P, mode: 'light', inner: ua(bx, by, `<div class="u2-zoom" style="zoom:${k}">${ui.btn(F.book)}</div>`) });
  // the height, beside the piece
  const hx = P.x + P.w + 10, y0 = P.y + by, y1 = y0 + hz;
  vc += hair(hx, y0, 1, hz) + hair(hx - 4, y0, 9, 1) + hair(hx - 4, y1 - 1, 9, 1)
    + mono(T, hx + 9, 60, level((y0 + y1) / 2), '44 px');
  // the width, under it: padding, label, padding
  const x0 = P.x + bx, x3 = x0 + bz, pz = (G.pad.md + G.bw) * k, ly = P.y + P.h + U / 2;
  vc += hair(x0, ly, bz, 1) + [x0, x0 + pz, x3 - pz, x3 - 1].map((x) => hair(x, ly - 4, 1, 9)).join('');
  const bl = P.y + P.h + 2 * U;
  vc += mono(T, x0, 60, bl, `${G.pad.md} px`) + rightText(T['c-mono'], { x: x3, text: `${G.pad.md} px`, baseline: bl, cls: 'c-mono' }).html;
  const lbl = `${G.ctl.size} px, ${G.ctl.weight}`, lw = advance(T['c-mono'].stem, 11, lbl);
  if (bz - 2 * pz > lw + 8) vc += block(T['c-mono'], { x: x0 + pz, w: bz - 2 * pz, baseline: bl, lines: [lbl], align: 'center', cls: 'c-mono' }).html;
  // the spec, as an appendix
  const spec = [
    ['Height', `44 px, small 36, large 52`],
    ['Padding', `${G.pad.md} px, small ${G.pad.sm}, large ${G.pad.lg}`],
    ['Radius', `${ctx.radius.button} px`],
    ['Label', `${weightName(G.ctl.weight)} ${G.ctl.size} px`],
    ['Edge', `${G.bw} px, secondary only`],
    ['Label on action', r(M['action-label'], M.action)],
  ];
  let sy = Math.max(bl + 3 * U, 500);
  sy = row(Math.ceil((sy - 17) / U));
  vc += strong(T, 42, 300, sy, `${B.fonts.body.family}, at 1:1`);
  spec.forEach(([n, v], i) => { vc += note(T, { x: 42, w: 114, bl: sy + (i + 1) * U, text: n }) + mono(T, 156, 247, sy + (i + 1) * U, v); });
  vc += noteUp(T, { x: 42, w: 380, last: 739, text: 'One primary per screen. Its label is the verb it does.' });

  // the variants, light beside dark, each row named on the light piece
  const vars = [
    ['Primary', ui.btn(F.book)],
    ['Secondary', ui.btn(X.secondary, { variant: 'secondary' })],
    ['Quiet', ui.btn(X.quiet, { variant: 'quiet' })],
    ['Danger', ui.btn(X.danger, { variant: 'danger' })],
    ['Small', ui.btn(X.small, { size: 'sm' })],
    ['Large, with an icon', ui.btn(F.book, { size: 'lg', iconRight: 'arrow-right' })],
  ];
  const pitch = 5 * U;
  let li = '', di = '';
  vars.forEach(([n, html], i) => {
    const t = 19 + i * pitch;
    li += cap(19, t, n) + ua(19, t + 23, html);
    di += cap(19, t, n) + ua(19, t + 23, html);
  });
  const H = units(19 + vars.length * pitch);
  let rc = piece(ctx, { x: 42, y: 74, w: 228, h: H, mode: 'light', inner: li }) + tab(T, { x: 61, y: 74, label: modeLabel('light') })
    + piece(ctx, { x: 289, y: 74, w: 228, h: H, mode: 'dark', inner: di }) + tab(T, { x: 308, y: 74, label: modeLabel('dark') });
  rc += noteUp(T, { x: 42, w: 475, last: 739, text: 'Danger is only for what cannot be undone. Quiet is for a way out beside the primary. Small sits inside rows and cards.' });
  return kitSpread(ctx, 'buttons', { verso: vc, recto: rc });
}

// ---------------------------------------------------------------- inputs
// Verso: the product's own form cut out whole, each field in a different state. Across the fold, level with each field, the state on tape,
// what shows, and the token that draws it.
function inputs(ctx) {
  const T = tokens(ctx), S = sc(ctx), F = S.form, X = ex(ctx), ui = ctx.ui, M = kitColours(ctx, 'light');
  const G = metrics(ctx), r = (a, b) => ratioText(ctx, a, b), lab = G.lab, cap_ = ut(ctx, 'caption');
  const P = { x: 42, y: 74, w: 361 }, fw = P.w - 38;
  const errStem = stemOf(ctx, 'body', ctx.weights.medium), capStem = stemOf(ctx, 'body', ctx.weights.regular);
  const errLines = F.readyError ? wrap(errStem, lab.size, F.readyError, fw).length : 0;
  const helpLines = F.notesHelp ? wrap(capStem, cap_.size, F.notesHelp, fw).length : 0;
  const f = [
    ['Focus', ui.field({ id: 'u2-in-1', label: F.pickup, value: F.pickupValue || '', state: 'focus' }), 44, 0,
      `The edge turns to the text colour and the ring sits outside it.`, `--focus ${M.focus}, ${r(M.focus, M.surface)}`],
    ['Filled', ui.field({ id: 'u2-in-2', label: F.dropoff, value: F.dropoffValue || '' }), 44, 0,
      `The value in the text colour at ${G.ctl.size} px, on a ${G.bw} px edge.`, `--edge ${M.edge}, ${r(M.edge, M.surface)}`],
    ['Select', ui.field({ id: 'u2-in-3', label: F.size, kind: 'select', options: F.sizes || [], value: (F.sizes || [])[1] }), 44, 0,
      'The same field, with a chevron in the quiet colour.', `--quiet ${M.quiet}, ${r(M.quiet, M.surface)}`],
    ['Error', ui.field({ id: 'u2-in-4', label: F.ready, value: F.readyValue || '', error: F.readyError }), 44, errLines * lab.size * 1.4 + 6,
      'The edge and the message take the danger colour. The message says what to do.', `--danger ${M.danger}, ${r(M.danger, M.surface)}`],
    ['Hint', ui.field({ id: 'u2-in-5', label: F.notes, kind: 'textarea', help: F.notesHelp }), 96, helpLines * cap_.line + 6,
      `A hint sits under the field at ${cap_.size} px and gives way to the error.`, `--quiet ${M.quiet}, ${r(M.quiet, M.surface)}`],
    ['Disabled', ui.field({ id: 'u2-in-6', label: X.account, value: ctx.brand.name, disabled: true }), 44, 0,
      'The disabled ground, its type, and no edge.', `--disabled-bg ${M['disabled-bg']}, type ${r(M['disabled-text'], M['disabled-bg'])}`],
  ];
  let inner = '', rc = '', y = 19;
  for (const [name, html, ch, extra, words, val] of f) {
    inner += ua(19, y, html, { w: fw });
    const mid = P.y + y + lab.line + 6 + Math.min(ch, 44) / 2;
    const bl = level(mid);
    rc += tapeAt(T, { x: 42, bl, text: name }) + note(T, { x: 156, w: 361, bl, text: words }) + mono(T, 156, 361, bl + noteLines(T, words, 361) * U, val);
    y = Math.round(y + lab.line + 6 + ch + extra + 16);
  }
  P.h = units(y - 8);
  if (P.y + P.h > 739) throw new Error(`inputs: the form runs to ${P.y + P.h}`);
  const vc = piece(ctx, { ...P, mode: 'light', inner }) + tab(T, { x: P.x + U, y: P.y, label: F.title || 'Form' })
    + noteUp(T, { x: 422, w: 95, last: 739, text: 'The label always sits above the field.' });
  return kitSpread(ctx, 'inputs', { verso: vc, recto: rc });
}

// ---------------------------------------------------------------- choices
// Verso: the choices as the product uses them, a settings piece. Recto: every state of each kind on one piece, a row per state; the states
// are named on tape at the fold's edge of the verso, so the names read straight across into their rows.
function choices(ctx) {
  const T = tokens(ctx), S = sc(ctx), F = S.form, X = ex(ctx), ui = ctx.ui, M = kitColours(ctx, 'light');
  const G = metrics(ctx), r = (a, b) => ratioText(ctx, a, b), lab = G.lab;
  // the settings piece
  const P = { x: 42, y: 74, w: 323 };
  let inner = '', y = 19;
  const head = (t) => { inner += cap(19, y, t); y += U + 3; };
  head('Checkbox');
  (X.checks || []).slice(0, 3).forEach((c, i) => { inner += ua(19, y - 3, ui.check(c, { checked: i === 0, disabled: i === 2 })); y += 2 * U; });
  y += U; head('Radio');
  (X.radios || []).slice(0, 2).forEach((c, i) => { inner += ua(19, y - 3, ui.check(c, { type: 'radio', name: 'u2-ch-set', checked: i === 0 })); y += 2 * U; });
  y += U; head('Switch');
  (X.switches || []).slice(0, 2).forEach((c, i) => { inner += ua(19, y - 3, ui.switch(c, { checked: i === 0 })); y += 2 * U; });
  y += U;
  inner += ua(19, y, `<p class="ui-label">${A(F.size)}</p>`); y += lab.line + 6;
  inner += ua(19, y, ui.segmented(F.sizes || [], 1)); y += 40 + 19;
  P.h = units(y);
  let vc = piece(ctx, { ...P, mode: 'light', inner }) + tab(T, { x: P.x + U, y: P.y, label: 'In use' });

  // the ladder: the shortest label of each kind, so three columns fit
  const short = (a) => [...a].sort((p, q) => G.textW(p) - G.textW(q))[0];
  const ck = short(X.checks || ['On']), rd = short(X.radios || ['On']), sw = short(X.switches || ['On']);
  const slot = ctx.edition === 'slot';   // slot: the placeholder labels are wide, so the columns pack with an 8 px gap instead of sitting on the unit grid
  const c1 = 19, c2 = slot ? c1 + G.choiceW(ck) + 8 : units(c1 + G.choiceW(ck) + 19), c3 = slot ? c2 + G.choiceW(rd) + 8 : units(c2 + G.choiceW(rd) + 19);
  const Q = { x: 42, y: 105, w: 475 };
  if (c3 + G.choiceW(sw, true) > Q.w - 19) throw new Error('choices: the ladder is too wide');
  const states = [
    ['Off', {}], ['On', { checked: true }], ['Focus', { checked: true, state: 'focus' }], ['Disabled', { disabled: true }], ['Disabled, on', { disabled: true, checked: true }],
  ];
  let li = cap(c1, 19, 'Checkbox') + cap(c2, 19, 'Radio') + cap(c3, 19, 'Switch');
  const top0 = 57, pitch = 3 * U;
  states.forEach(([name, o], i) => {
    const t = top0 + i * pitch;
    li += ua(c1, t, ui.check(ck, o)) + ua(c2, t, ui.check(rd, { ...o, type: 'radio', name: `u2-ch-${i}` })) + ua(c3, t, ui.switch(sw, o));
    vc += tapeAt(T, { xr: 517, bl: level(Q.y + t + 22), text: name });
  });
  Q.h = units(top0 + states.length * pitch);
  let rc = piece(ctx, { ...Q, mode: 'light', inner: li });
  let ny = Q.y + Q.h + 2 * U;
  const lines = [
    ['Checked', 'A checkbox or radio fills with the text colour; a switch fills with the action colour and its knob takes the text colour.', `--text ${M.text}, --action ${M.action}`],
    ['Disabled', 'The disabled ground with no edge, and the label in the disabled type.', `type ${r(M['disabled-text'], M.surface)} on the surface`],
    ['Segmented', 'One choice, always one selected, filled with the text colour.', `${ctx.radius.button} px, ${G.bw} px edge`],
  ];
  for (const [n, words, val] of lines) {
    const k = noteLines(T, words, 361);
    rc += strong(T, 42, 114, ny, n) + note(T, { x: 156, w: 361, bl: ny, text: words }) + mono(T, 156, 361, ny + k * U, val);
    ny += (k + 2) * U;
  }
  if (ny - 2 * U > 739) throw new Error(`choices: the notes run to ${ny}`);
  vc += noteUp(T, { x: 42, w: 323, last: 739, text: `Each choice is ${44} px tall to tap, with the label as part of the target.` });
  return kitSpread(ctx, 'choices', { verso: vc, recto: rc });
}

// ---------------------------------------------------------------- cards
// the height a shipped card takes at a width, from the CSS it ships with (padding 16, gaps 6, the type tokens)
function cardH(ctx, w, { meta, title, text, action }) {
  const G = metrics(ctx), ts = ut(ctx, 'title-s'), body = G.body, inner = w - 2 - 32;
  const tStem = stemOf(ctx, 'display', ctx.weights.heading), bStem = stemOf(ctx, 'body', ctx.weights.regular);
  const parts = [];
  if (meta) parts.push(body.line);
  parts.push(wrap(tStem, ts.size, title, inner, -0.01).length * ts.line);
  if (text) parts.push(wrap(bStem, body.size, text, inner).length * body.size * 1.5);
  if (action) parts.push(36);
  return { h: 2 + 32 + parts.reduce((a, b) => a + b, 0) + 6 * (parts.length - 1), parts };
}
// Verso: one card at 1:1, each of its parts named on the paper beside it with a short leader. Recto: the raised card and the stat on the
// light surface, and both cards again on the dark.
function cards(ctx) {
  const T = tokens(ctx), S = sc(ctx), X = ex(ctx), ui = ctx.ui, M = kitColours(ctx, 'light'), Dk = kitColours(ctx, 'dark');
  const G = metrics(ctx), r = (a, b) => ratioText(ctx, a, b);
  const act = `<div>${ui.btn(X.secondary, { variant: 'secondary', size: 'sm' })}</div>`;
  const one = { meta: S.status, title: S.eta, text: S.pickup, action: act };
  const cw = 266, P = { x: 42, y: 112, w: cw + 38 };
  const ch = cardH(ctx, cw, one);
  P.h = units(ch.h + 38);
  let vc = piece(ctx, { ...P, mode: 'light', inner: ua(19, 19, ui.card(one), { w: cw }) }) + tab(T, { x: P.x + U, y: P.y, label: 'Card' });
  // the parts, top to bottom, each named level with its middle
  const names = ['Meta', 'Title', 'Text', 'Action'];
  let y = P.y + 19 + 1 + 16, last = -99;
  ch.parts.forEach((h, i) => {
    const mid = y + h / 2;
    let bl = level(mid); if (bl <= last) bl = last + U; last = bl;
    vc += hair(P.x + P.w + 4, mid, 15, 1) + note(T, { x: P.x + P.w + 24, w: 517 - P.x - P.w - 24, bl, text: names[i] });
    y += h + 6;
  });
  // the card's spec under it
  let sy = P.y + P.h + 2 * U;
  [['Radius', `${ctx.radius.card} px`], ['Edge', `1 px, --divider ${M.divider}`], ['Padding', '16 px, 6 px between parts'], ['Title', `${ut(ctx, 'title-s').size} / ${ut(ctx, 'title-s').line}, ${ctx.brand.fonts.display.family}`]]
    .forEach(([n, v], i) => { vc += note(T, { x: 42, w: 95, bl: sy + i * U, text: n }) + mono(T, 137, 380, sy + i * U, v); });
  vc += noteUp(T, { x: 42, w: 380, last: 739, text: 'Cards draw an edge, not a shadow. A card never holds another card.' });

  // recto: raised and stat on light, then both cards on dark
  const two = { meta: S.deliverToLabel, title: S.deliverTo, text: S.riderNote, raised: true };
  const hw = 209, hRaised = cardH(ctx, hw, two).h;
  const statH = 2 + 32 + ut(ctx, 'title').line + 4 + G.body.line;
  const Q = { x: 42, y: 112, w: 475, h: units(Math.max(hRaised, statH) + 38) };
  let rc = piece(ctx, { ...Q, mode: 'light', inner: ua(19, 19, ui.card(two), { w: hw }) + ua(247, 19, ui.stat(S.paid, S.paidLabel || X.statLabel), { w: hw }) })
    + tab(T, { x: Q.x + U, y: Q.y, label: 'Raised' }) + tab(T, { x: Q.x + 247, y: Q.y, label: 'Stat' });
  let ny = Q.y + Q.h + 2 * U;
  rc += note(T, { x: 42, w: 209, bl: ny, text: 'The raised ground and no edge, for a second level.' })
    + note(T, { x: 289, w: 228, bl: ny, text: 'One number and its label, in tabular figures.' });
  const ch1 = cardH(ctx, hw, { meta: S.status, title: S.eta, text: S.pickup }).h;
  const R = { x: 42, y: units(ny + 3 * U - 17) + 17, w: 475 };
  R.h = units(Math.max(ch1, hRaised) + 38);
  rc += piece(ctx, { ...R, mode: 'dark', inner: ua(19, 19, ui.card({ meta: S.status, title: S.eta, text: S.pickup }), { w: hw }) + ua(247, 19, ui.card(two), { w: hw }) })
    + tab(T, { x: R.x + U, y: R.y, label: modeLabel('dark') });
  if (R.y + R.h > 700) throw new Error(`cards: the dark piece runs to ${R.y + R.h}`);
  rc += noteUp(T, { x: 42, w: 475, last: 739, text: `In dark the edge is --divider ${Dk.divider} and the raised ground ${Dk.raised}.` });
  return kitSpread(ctx, 'cards', { verso: vc, recto: rc });
}

// ---------------------------------------------------------------- navigation
// Verso: the wide pieces, the top bar, tabs and breadcrumbs, cut the width of the leaf. Recto: the sidebar on the light surface, and the
// phone's tab bar cut from the dark at the phone's own width. Each is noted on the dot row under it.
function navigation(ctx) {
  const T = tokens(ctx), S = sc(ctx), X = ex(ctx), ui = ctx.ui, B = ctx.brand;
  const links = (X.links || []).slice(0, 3);
  const g = ctx.logo.geos.colour || ctx.logo.geos.primary, lw = 96, lh = g ? Math.round(lw * g.h / g.w) : 24;
  const top = `<nav class="ui-topbar" aria-label="Main"><span style="display:block;width:${lw}px;height:${lh}px">${ctx.logo.html('colour', { width: lw })}</span><div class="ui-topbar__links">${ui.links(links, 0)}</div></nav>`;
  let vc = '', y = 112;
  const put = (label, h, inner, words, mode = 'light') => {
    vc += piece(ctx, { x: 42, y, w: 475, h, mode, inner }) + tab(T, { x: 61, y, label });
    vc += note(T, { x: 42, w: 475, bl: y + h + U + 19 - 2, text: words });
    y += h + 5 * U;
  };
  put('Top bar', 3 * U, ua(0, 0, top, { w: 475 }), 'The current page has a 3 px bar in the action colour under it. Links are 44 px tall.');
  put('Tabs', 4 * U, ua(19, 19, ui.tabs(X.tabs || [], 0), { w: 437 }), 'Tabs switch views of one list. They do not change the page.');
  put('Breadcrumbs', 3 * U, ua(19, 19, ui.crumbs([...(X.crumbs || []), S.deliverTo])), 'Quiet, with the current page in full ink.');
  vc += noteUp(T, { x: 42, w: 380, last: 739, text: 'The bar under the current page is the only place the action colour marks where you are.' });

  const all = [...links, [X.account, 'settings']];
  const side = `<nav class="ui-sidebar" aria-label="Sections">${ui.links(all, 0)}</nav>`;
  const sh = units(24 + all.length * 44 + (all.length - 1) * 2 + 38);
  let rc = piece(ctx, { x: 42, y: 112, w: 266, h: sh, mode: 'light', inner: ua(19, 19, side) }) + tab(T, { x: 61, y: 112, label: 'Sidebar' });
  rc += note(T, { x: 327, w: 190, bl: 131 + 2, text: 'A bar on the left marks the current page, on the surface, inside the raised ground.' });
  const bar = `<nav class="ui-tabbar" aria-label="Sections">${all.map(([t, i], k) => `<a href="#"${k === 0 ? ' aria-current="page"' : ''}>${ui.icon(i, 20)}${A(t)}</a>`).join('')}</nav>`;
  const Q = { x: 42, y: units(112 + sh + 3 * U - 17) + 17, w: 21 * U, h: 5 * U };
  rc += piece(ctx, { ...Q, mode: 'dark', inner: ua(0, Q.h - 64, bar, { w: Q.w }) }) + tab(T, { x: Q.x + U, y: Q.y, label: 'Tab bar, dark' });
  rc += note(T, { x: 42, w: 475, bl: Q.y + Q.h + U + 17, text: `Cut at ${Q.w} px, about a phone's width. ${all.length} destinations at most, 64 px tall.` });
  if (Q.y + Q.h > 680) throw new Error(`navigation: the tab bar runs to ${Q.y + Q.h}`);
  return kitSpread(ctx, 'navigation', { verso: vc, recto: rc });
}

// ---------------------------------------------------------------- lists
// The product's list cut out twice at the same height, light on the verso and dark on the recto, so its rows run straight across the fold.
// The rules for a row sit under the light; the list without a lead sits under the dark.
function rowH(ctx) {
  const lab = ut(ctx, 'label'), body = ut(ctx, 'body');
  return Math.max(64, 24 + Math.max(40, lab.line + body.line, body.line + 4 + lab.size * 1.3));
}
function lists(ctx) {
  const T = tokens(ctx), S = sc(ctx), ui = ctx.ui;
  const d = S.deliveries || [], n = Math.min(5, d.length), rh = rowH(ctx);
  const P = { x: 42, y: 112, w: 475, h: units(n * rh + 1 + 38) };
  const list = ua(19, 19, ui.deliveryRows(n), { w: 437 });
  let vc = piece(ctx, { ...P, mode: 'light', inner: list }) + tab(T, { x: 61, y: 112, label: modeLabel('light') });
  let rc = piece(ctx, { ...P, mode: 'dark', inner: list }) + tab(T, { x: 61, y: 112, label: modeLabel('dark') });
  let ny = P.y + P.h + 2 * U;
  const rules = [
    'One row is one item. The name is the title, the detail sits under it, and the status is the only colour.',
    'Money and times use tabular figures, so a column of them lines up.',
    'A row that opens is a link, and the whole row is the target.',
  ];
  for (const t of rules) { vc += note(T, { x: 42, w: 380, bl: ny, text: t }); ny += (noteLines(T, t, 380) + 1) * U; }
  // without a lead, two rows
  const Q = { x: 42, y: units(P.y + P.h + 2 * U - 17) + 17, w: 475, h: units(2 * rh + 1 + 38) };
  const plain = `<ul class="ui-list">${d.slice(0, 2).map((x) => ui.row({ title: x.to, sub: x.when, end: x.price })).join('')}</ul>`;
  rc += piece(ctx, { ...Q, mode: 'light', inner: ua(19, 19, plain, { w: 437 }) }) + tab(T, { x: 61, y: Q.y, label: 'Without a lead' });
  if (Q.y + Q.h > 739) throw new Error(`lists: the second list runs to ${Q.y + Q.h}`);
  if (Q.y + Q.h <= 700) rc += noteUp(T, { x: 42, w: 475, last: 739, text: `A row is at least 64 px tall, divided by a 1 px line in the divider colour.` });
  return kitSpread(ctx, 'lists', { verso: vc, recto: rc });
}

// ---------------------------------------------------------------- status
// Each status as the product prints it, words in one colour, on a strip of the light surface; the same words on the dark across the fold,
// row for row. Beside each, its token and the ratio of the words on that ground. The count badge closes the spread.
function status(ctx) {
  const T = tokens(ctx), S = sc(ctx), X = ex(ctx), ui = ctx.ui, M = kitColours(ctx, 'light'), D = kitColours(ctx, 'dark');
  const lab = ut(ctx, 'label'), r = (a, b) => ratioText(ctx, a, b);
  const st = ctx.status, stem = stemOf(ctx, 'body', ctx.weights.medium), lhc = lab.size * 1.3, off = lineOffset(stem, lab.size, lhc);
  const P = { x: 42, y: 112, w: 228 }, pitch = 3 * U, b0 = P.y + 2 * U + 2;
  const bl0 = row(Math.ceil((P.y + 2 * U - 17) / U));
  let li = '', di = '', vc = '', rc = '';
  st.forEach((s, i) => {
    const bl = bl0 + i * pitch, t = bl - P.y - off;
    li += ua(19, t, ui.statusChip(s.id)); di += ua(19, t, ui.statusChip(s.id));
    const L = statusText(ctx, 'light', s), Dt = statusText(ctx, 'dark', s);
    vc += mono(T, 289, 133, bl, L.token) + rightText(T['c-mono'], { x: 517, text: r(L.hex, M.surface), baseline: bl, cls: 'c-mono' }).html;
    rc += mono(T, 289, 133, bl, Dt.token) + rightText(T['c-mono'], { x: 517, text: r(Dt.hex, D.surface), baseline: bl, cls: 'c-mono' }).html;
  });
  P.h = units(bl0 + (st.length - 1) * pitch - P.y + 2 * U);
  vc = piece(ctx, { ...P, mode: 'light', inner: li }) + tab(T, { x: 61, y: P.y, label: modeLabel('light') }) + vc;
  rc = piece(ctx, { ...P, mode: 'dark', inner: di }) + tab(T, { x: 61, y: P.y, label: modeLabel('dark') }) + rc;
  const ty = P.y - U;
  vc += mono(T, 289, 133, ty, 'Token') + rightText(T['c-mono'], { x: 517, text: 'On the surface', baseline: ty, cls: 'c-mono' }).html;
  rc += mono(T, 289, 133, ty, 'Token') + rightText(T['c-mono'], { x: 517, text: 'On the dark surface', baseline: ty, cls: 'c-mono' }).html;
  let ny = P.y + P.h + 2 * U;
  vc += note(T, { x: 42, w: 380, bl: ny, text: `${st.length} states. A status is words in one colour with no fill, and its ratio is those words on the ground.` });
  // the badge: on a tab whose name is a status the list holds, counting the rows in that status
  const d = S.deliveries || [];
  const hit = (X.tabs || []).map((t) => [t, st.find((s) => s.label === t)]).find((x) => x[1] && d.some((r_) => r_.status === x[1].id));
  if (hit) {
    const count = d.filter((x) => x.status === hit[1].id).length;
    const Q = { x: 42, y: units(ny + 2 * U - 17) + 17, w: 228, h: 3 * U };
    rc += piece(ctx, { ...Q, mode: 'light', inner: ua(19, 19, `<div style="display:flex;align-items:center;gap:8px"><span class="ui-label">${A(hit[0])}</span><span class="ui-badge">${count}</span></div>`) })
      + tab(T, { x: 61, y: Q.y, label: 'Count badge' })
      + note(T, { x: 289, w: 228, bl: Q.y + U + 2, text: `It counts the rows in that status: ${count} here. The badge is the action colour with its label.` });
  }
  rc += noteUp(T, { x: 42, w: 475, last: 739, text: 'Each status keeps its words in both modes; only the colour steps to stay legible on the dark.' });
  return kitSpread(ctx, 'status', { verso: vc, recto: rc });
}

// ---------------------------------------------------------------- feedback
// Verso: the four alerts as one piece, the product's own messages; across the fold, level with each, its tone, the token that draws its edge
// and icon, and that colour's ratio on the surface. Under them, the inline message and the loading state; the toast on the recto.
function feedback(ctx) {
  const T = tokens(ctx), S = sc(ctx), F = S.form, ui = ctx.ui, M = kitColours(ctx, 'light');
  const body = ut(ctx, 'body'), r = (a, b) => ratioText(ctx, a, b), bStem = stemOf(ctx, 'body', ctx.weights.regular);
  const P = { x: 42, y: 112, w: 475 }, aw = P.w - 38, tw = aw - 14 - 2 - 20 - 12;
  const alerts = [['Info', 'info', S.pickup], ['Success', 'success', S.toast], ['Warning', 'warning', S.alert], ['Danger', 'danger', F.readyError]].filter((x) => x[2]);
  let inner = '', rc = '', y = 19;
  for (const [name, tone, text] of alerts) {
    const h = 20 + wrap(bStem, body.size, text, tw).length * body.size * 1.45;
    inner += ua(19, y, ui.alert(tone, text), { w: aw });
    const bl = level(P.y + y + h / 2);
    rc += tapeAt(T, { x: 42, bl, text: name }) + mono(T, 156, 361, bl, `--${tone} ${M[tone]}, ${r(M[tone], M.surface)} on the surface`);
    y = units(y + h + 19);
  }
  P.h = y;
  let vc = piece(ctx, { ...P, mode: 'light', inner }) + tab(T, { x: 61, y: P.y, label: 'Alerts' });
  // inline message and loading, under the alerts
  const Q = { x: 42, y: P.y + P.h + 2 * U, w: 475, h: 3 * U };
  vc += piece(ctx, { ...Q, mode: 'light', inner: ua(19, 19, `<p class="ui-inline-msg">${ui.icon('info', 16)}${A(S.inline || '')}</p>`, { w: 437 }) }) + tab(T, { x: 61, y: Q.y, label: 'Inline message' });
  const L = { x: 42, y: Q.y + Q.h + 2 * U, w: 475, h: 6 * U };
  const sk = `<div style="display:flex;flex-direction:column;gap:10px;width:220px">${ui.skeleton('220px')}${ui.skeleton('150px')}${ui.skeleton('180px')}</div>`;
  vc += piece(ctx, { ...L, mode: 'light', inner: ua(19, 30, ui.spinner()) + ua(76, 29, sk) }) + tab(T, { x: 61, y: L.y, label: 'Loading' });
  if (L.y + L.h > 739) throw new Error(`feedback: loading runs to ${L.y + L.h}`);

  rc += note(T, { x: 42, w: 475, bl: P.y + P.h + U, text: 'An alert is words on the ground: the icon and a 2 px edge carry the tone, the words stay in the text colour. It stays until it is dealt with.' });
  rc += note(T, { x: 42, w: 475, bl: Q.y + U + 2 + 19, text: 'The inline message sits beside what it is about, at label size, with no edge.' });
  const R = { x: 42, y: L.y, w: 475, h: L.h };
  rc += piece(ctx, { ...R, mode: 'light', inner: ua(19, 33, ui.toast(S.toast || '')) }) + tab(T, { x: 61, y: R.y, label: 'Toast' });
  rc += noteUp(T, { x: 42, w: 475, last: 739, text: 'A toast leaves by itself and keeps its undo reachable by keyboard. The spinner is for a short wait; a list waits in skeleton lines.' });
  return kitSpread(ctx, 'feedback', { verso: vc, recto: rc });
}

export const uikit = { states, buttons, inputs, choices, cards, navigation, lists, status, feedback };

export function css() {
  return `.pg .u2-hair{position:absolute;background:var(--graphite);z-index:2}
.pg .u1-piece .u2-zoom{display:block}
`;
}
