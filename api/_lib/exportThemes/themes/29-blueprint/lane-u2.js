// Theme 29 (Blueprint), lane u2: the UI kit's component sheets (states, buttons, inputs, choices, cards, navigation, lists, status, feedback).
// Every component is the shipped one (ctx.ui and componentsCss, through lane u1's kit tokens) with its state forced, never restyled. The sheet around
// it does the drafting: a schedule of states, enlarged details with true sizes in px, keys read across to a schedule, and a legend for status.
// The chrome (kitSheet, plate, keys, leaders, notes) is lane u1's, imported read-only. Every class this lane adds starts u2-.
import { esc as A } from '../../engine/brand.js';
import { colourMap, statusText } from '../../engine/tokens.js';
import { wrap } from './measure.js';
import { kitSheet, plate, at, svgAll, drawingTitle, notes, notesH, keyTag, breakLine, spread, sc, uiT, textW, linesOf, ratioOf, reds, ZX, r1 } from './lane-u1.js';

// ---------------------------------------------------------------- shared small parts

const mx = (t) => t.replace(/\[(.+?)\]/g, '<span class="v">$1</span>'); // [x] is a mono literal (theme text only)
const ex = (ctx) => ({ checks: ['Checked', 'Unchecked', 'Disabled'], switches: ['Switch on', 'Switch off'], radios: ['First choice', 'Second choice'], statLabel: 'Total', crumbs: ['Home', 'Section'], tabs: ['One', 'Two', 'Three'], links: [['One', 'map-pin'], ['Two', 'plus'], ['Three', 'clock']], secondary: 'Secondary', quiet: 'Skip', danger: 'Delete', small: 'Add', account: 'Account', ...(sc(ctx).example || {}) });
const pxOf = (list, token, d) => (list.find((t) => t.token === token) || { px: d }).px;
const shortest = (ctx, list, size, face = 'body') => list.filter(Boolean).map((t) => [t, textW(ctx, face, t, size)]).sort((a, b) => a[1] - b[1])[0][0];
const frame = (x, y, w, h) => `<rect x="${r1(x - 0.5)}" y="${r1(y - 0.5)}" width="${r1(w + 1)}" height="${r1(h + 1)}" stroke="var(--ink)" stroke-width="1"/>`;
const rowAt = (x, y, html, cls = '', style = '') => `<span class="u1-row ${cls}" style="left:${r1(x)}px;top:${r1(y)}px;${style}">${html}</span>`;
const mono = (x, y, t, style = '') => rowAt(x, y, A(t), 'u1-m u2-q', style);
// an enlarged detail: a .ui plate drawn at K:1, its children placed in unzoomed px (use at())
const zoomPlate = (x, y, w, h, K, inner, mode = 'light') => `<div class="a" style="left:${r1(x)}px;top:${r1(y)}px;width:${r1(w * K)}px;height:${r1(h * K)}px"><div class="ui u1-plate"${mode === 'dark' ? ' data-theme="dark"' : ''} style="position:relative;width:${r1(w)}px;height:${r1(h)}px;zoom:${K}">${inner}</div></div>`;
// the same, given the OUTER size on the sheet (the inner plate is w/K by h/K)
const zoomFit = (x, y, w, h, K, inner, mode = 'light') => zoomPlate(x, y, w / K, h / K, K, inner, mode);
// general notes anchored to the content floor, with their head
const noteBlock = (x, w, items, floor = 947) => { const nh = notesH(items, w); return `<h3 class="a c-head" style="left:${x}px;top:${r1(floor - nh - 38)}px">General notes</h3>` + notes(x, floor - nh, w, items); };
// a schedule head: the column names over a heavy rule
const head = (cols, y, x0, x1) => cols.map(([h, x]) => `<span class="a c-label" style="left:${x}px;top:${y}px">${h}</span>`).join('') + `<div class="hl" style="left:${x0}px;top:${y + 24}px;width:${x1 - x0}px;background:var(--ink)"></div>`;
const sheetOf = (ctx, id, body, scale = '[1:1], sizes in px') => kitSheet(ctx, id, { drawing: ctx.pages.find((p) => p.id === id).title, scale }, body);
const hexOf = (M, k) => String(M[k]).toUpperCase();

// ---------------------------------------------------------------- states

function states(ctx) {
  const ui = ctx.ui, S = sc(ctx), F = S.form, X = ex(ctx), M = colourMap(ctx, 'light'), tC = uiT(ctx, 'control');
  const X0 = ZX[1], PW = 1547 - X0, N = 5, cw = PW / N;
  const [fv, fl] = [[F.pickupValue, F.pickup], [F.dropoffValue, F.dropoff], [F.readyValue, F.ready]].sort((a, b) => textW(ctx, 'body', a[0], tC.size) - textW(ctx, 'body', b[0], tC.size))[0];
  const chk = shortest(ctx, X.checks, tC.size), sw = shortest(ctx, X.switches, tC.size);
  const errLines = linesOf(ctx, 'body', F.readyError, 13, cw - 64, ctx.weights.medium);
  const fH = 18 + 6 + 44 + 6 + errLines * 18.2;
  const ST = ['Rest', 'Hover', 'Focus', 'Pressed', 'Disabled'], BS = [undefined, 'hover', 'focus', 'pressed', 'disabled'];
  const btnRow = (v, lab, toks) => ST.map((n, i) => ({ n, tok: toks[i], html: ui.btn(lab, { variant: v, state: BS[i] }) }));
  const fld = (id, st, dis, err) => `<div style="width:100%;padding:0 32px;align-self:flex-start;margin-top:20px">${ui.field({ id: `u2s-${id}`, label: err ? F.ready : fl, value: err ? F.readyValue : fv, state: st, disabled: dis, error: err ? F.readyError : undefined })}</div>`;
  const rows = [
    { name: 'Primary button', sub: 'Height [44 px]', h: 64, cells: btnRow('primary', F.book, ['action', 'action-hover', 'focus', 'action-pressed', 'disabled-bg']) },
    { name: 'Secondary button', sub: 'Height [44 px]', h: 64, cells: btnRow('secondary', X.secondary, ['text', 'sunken', 'focus', 'sunken', 'disabled-bg']) },
    { name: 'Text field', sub: 'Input [44 px] high', h: Math.round(fH + 40), cells: [
      { n: 'Rest', tok: 'edge', html: fld('a') }, { n: 'Focus', tok: 'focus', html: fld('b', 'focus') },
      { n: 'Error', tok: 'danger', html: fld('c', undefined, false, true) }, { n: 'Error, focus', tok: 'focus', html: fld('e', 'focus', false, true) }, { n: 'Disabled', tok: 'disabled-bg', html: fld('d', undefined, true) }] },
    { name: 'Choices', sub: 'Box [22 px], switch [44 x 26 px]', h: 64, cells: [
      { n: 'Checkbox, checked', tok: 'text', html: ui.check(chk, { checked: true, name: 'u2s-c1' }) },
      { n: 'Checkbox, focus', tok: 'focus', html: ui.check(chk, { state: 'focus', name: 'u2s-c2' }) },
      { n: 'Checkbox, disabled', tok: 'disabled-bg', html: ui.check(chk, { disabled: true, name: 'u2s-c3' }) },
      { n: 'Switch, focus', tok: 'focus', html: ui.switch(sw, { checked: true, state: 'focus' }) },
      { n: 'Switch, disabled', tok: 'disabled-bg', html: ui.switch(sw, { disabled: true }) }] },
  ];
  let y = 72, html = '', svg = '';
  rows.forEach((r) => {
    const h = r.h, n = r.cells.length;
    let inner = '', dv = '';
    r.cells.forEach((c, i) => { inner += at(i * cw, 0, c.html, `width:${r1(cw)}px;height:${h}px;display:flex;align-items:center;justify-content:center`); });
    for (let i = 1; i < n; i++) dv += `M${r1(i * cw) - 0.5} 0V${h}`;
    inner += `<svg class="a" style="left:0;top:0" width="${r1(PW)}" height="${h}" fill="none" aria-hidden="true"><path d="${dv}" stroke="${M.divider}" stroke-width="1"/></svg>`;
    html += plate(X0, y, PW, h, 'light', inner);
    svg += frame(X0, y, PW, h);
    for (let i = 0; i <= n; i++) svg += `<path d="M${r1(X0 + i * cw)} ${y + h}v8" stroke="var(--ink)" stroke-width="1"/>`;
    r.cells.forEach((c, i) => { html += rowAt(X0 + i * cw + 16, y + h + 12, A(c.n)) + mono(X0 + i * cw + 16, y + h + 32, `--${c.tok}  ${hexOf(M, c.tok)}`); });
    html += `<h3 class="a c-head nw" style="left:64px;top:${r1(y + h / 2 - 22)}px">${A(r.name)}</h3><p class="a c-note c-quiet" style="left:64px;top:${r1(y + h / 2)}px;width:148px;color:var(--quiet)">${mx(r.sub)}</p>`;
    y += h + 12 + 36 + 28;
  });
  const items = [
    'Each cell is the shipped component with its state forced by class: [.is-hover], [.is-focus], [.is-pressed]. Nothing on this sheet is restyled.',
    'Pressed also scales a button to [0.97]; a disabled control never scales.',
    'Focus is a [2 px] ring set [2 px] off the edge in [--focus]. On a field the edge also turns to [--text]; on error it turns to [--danger].',
  ];
  html += noteBlock(64, 420, items);
  return sheetOf(ctx, 'states', html + svgAll(svg));
}

// ---------------------------------------------------------------- buttons

function buttons(ctx) {
  const ui = ctx.ui, S = sc(ctx), F = S.form, X = ex(ctx), M = colourMap(ctx, 'light'), tC = uiT(ctx, 'control');
  const K = 3, bw = pxOf(ctx.borders, 'border-control', 1), pad = pxOf(ctx.space, 'space-5', 20), rr = ctx.radius.button, rd = rr >= 999 ? 22 : rr;
  const labW = textW(ctx, 'body', F.book, tC.size, tC.weight), BW = labW + 2 * pad + 2 * bw, BH = 44;
  const P = { x: 40, y: 40, w: ZX[4] - 40, h: 480 }, ux = 32, uy = (P.h / K - BH) / 2, BX = P.x + ux * K, BY = P.y + uy * K, R = reds();
  let html = zoomFit(P.x, P.y, P.w, P.h, K, at(ux, uy, ui.btn(F.book)));
  let svg = frame(P.x, P.y, P.w, P.h);
  R.dim([BX, BY], [BX, BY + BH * K], [-1, 0], { d: 36, value: `${BH} px`, place: 'left' });
  R.dim([BX, BY], [BX + (bw + pad) * K, BY], [0, -1], { d: 28, value: `${pad} px` });
  R.dim([BX + (BW - bw - pad) * K, BY], [BX + BW * K, BY], [0, -1], { d: 28, value: `${pad} px` });
  // keys: the radius, the label, the fill, read across to the schedule
  const c = 1 - Math.SQRT1_2, pts = [
    { x: BX + BW * K - rd * K * c, y: BY + rd * K * c, a: 'Radius', t: '--r-button', v: rr >= 999 ? 'Round' : `${rr} px` },
    { x: BX + (bw + pad) * K + labW * K + 14, y: BY + 66, a: 'Label', t: 'control', v: `${tC.size} / ${tC.line} / ${tC.weight}` },
    { x: BX + BW * K - 16, y: BY + BH * K - 18, a: 'Fill', t: '--action', v: hexOf(M, 'action') },
  ].sort((a, b) => a.y - b.y);
  const ky = spread(pts.map((p) => p.y), 36, 112, 260), KX = 826, edge = P.x + P.w;
  html += head([['Key', KX - 12], ['Part', 852], ['Token', 976], ['Value', 1140]], 64, KX - 12, 1523);
  pts.forEach((p, i) => {
    svg += `<path d="M${r1(p.x)} ${r1(p.y)}H${r1(edge)}" stroke="${M.text}" stroke-width="1"/><circle cx="${r1(p.x)}" cy="${r1(p.y)}" r="2.5" fill="${M.text}"/><path d="M${r1(edge)} ${r1(p.y)}H${r1(edge + 10)}L${KX - 12} ${r1(ky[i])}" stroke="var(--ink)" stroke-width="1"/>`;
    html += keyTag(KX, ky[i], i + 1) + rowAt(852, ky[i] - 10, A(p.a)) + rowAt(976, ky[i] - 10, A(p.t), 'u1-m') + rowAt(1140, ky[i] - 10, A(p.v), 'u1-m');
  });
  html += drawingTitle(P.x + 24, P.y + P.h + 28, 1, 'Primary button', '[3:1]');

  // the kinds, 1:1: a plate of real buttons, and the schedule of what each is made of
  const lg = { variant: 'primary', size: 'lg' }, rowsK = [
    ['Primary', F.book, {}, 'action-label', 'action', 44], ['Secondary', X.secondary, { variant: 'secondary' }, 'text', 'surface', 44],
    ['Quiet', X.quiet, { variant: 'quiet' }, 'text', 'surface', 44], ['Danger', X.danger, { variant: 'danger' }, 'surface', 'danger', 44],
    ['Small', X.small, { size: 'sm' }, 'action-label', 'action', 36], ['Large', F.book, lg, 'action-label', 'action', 52],
  ];
  const Kp = { x: ZX[4], y: 391, w: ZX[6] - ZX[4], h: 580 }, TX = ZX[6] + 24;
  let kin = '';
  rowsK.forEach(([name, lab, o, fg, bg, h], i) => {
    const yc = 40 + i * 90;
    kin += at(24, yc - h / 2, ui.btn(lab, o));
    const yy = Kp.y + yc;
    html += `<h3 class="a c-head nw" style="left:${TX}px;top:${r1(yy - 34)}px">${name}</h3>` + rowAt(TX, yy - 10, `--${fg} on --${bg}`, 'u1-m') + rowAt(TX, yy + 10, `${ratioOf(ctx, M[fg], M[bg])} : 1, ${h} px high`, 'u1-m u2-q');
    if (i < rowsK.length - 1) svg += `<path d="M${r1(Kp.x + Kp.w)} ${Kp.y + yc + 45.5}H1523" stroke="var(--hair)" stroke-width="1"/>`;
  });
  html += plate(Kp.x, Kp.y, Kp.w, Kp.h, 'light', kin) + drawingTitle(Kp.x + 24, Kp.y - 52, 2, 'Kinds and sizes', '[1:1]');
  svg += frame(Kp.x, Kp.y, Kp.w, Kp.h);
  const items = [
    `Buttons are [44 px] high, [36 px] small and [52 px] large. The label is the [control] type, [${tC.size} px] at weight [${tC.weight}].`,
    'Hover changes the fill only. Pressed fills with [--action-pressed] and scales to [0.97]; a disabled button never scales.',
    `The words on the primary fill are [${ratioOf(ctx, M['action-label'], M.action)} : 1] against [--action].`,
  ];
  html += noteBlock(64, 560, items);
  return sheetOf(ctx, 'buttons', html + svgAll(svg) + R.svg(), '[3:1] and [1:1], sizes in px');
}

// ---------------------------------------------------------------- inputs

function inputs(ctx) {
  const ui = ctx.ui, S = sc(ctx), F = S.form, M = colourMap(ctx, 'light'), tL = uiT(ctx, 'label'), tC = uiT(ctx, 'control');
  // the kinds at 1:1 on a plate down the left
  const KW = 328, taH = 18 + 6 + 96 + 6 + 24;
  let y = 32, kin = '';
  const stack = [[ui.field({ id: 'u2i-a', label: F.pickup, value: F.pickupValue }), 68], [ui.field({ id: 'u2i-b', label: F.size, kind: 'select', options: F.sizes, value: F.sizes[1] }), 68], [ui.field({ id: 'u2i-c', label: F.notes, kind: 'textarea', help: F.notesHelp }), taH]];
  for (const [h, hh] of stack) { kin += at(24, y, h, `width:${KW}px`); y += hh + 40; }
  const KP = { x: 40, y: 40, w: ZX[2] - 40, h: y - 40 + 32 };
  let html = plate(KP.x, KP.y, KP.w, KP.h, 'light', kin) + drawingTitle(KP.x + 24, KP.y + KP.h + 28, 1, 'Text, select and text area', '[1:1]');
  let svg = frame(KP.x, KP.y, KP.w, KP.h);

  // the anatomy: an error field at 2:1, its vertical rhythm dimensioned, three parts keyed
  const K = 2, FW = 280, ex0 = 48, ey0 = 24, eL = linesOf(ctx, 'body', F.readyError, tL.size, FW, ctx.weights.medium), eH = eL * tL.size * 1.4;
  const fieldH = tL.line + 6 + 44 + 6 + eH, Pw = ex0 + FW + 24, Ph = ey0 + fieldH + 24;
  const FX = ZX[2] + 40, FY = 96, R = reds();
  html += zoomPlate(FX, FY, Pw, Ph, K, at(ex0, ey0, ui.field({ id: 'u2i-e', label: F.ready, value: F.readyValue, error: F.readyError }), `width:${FW}px`));
  svg += frame(FX, FY, Pw * K, Ph * K);
  const X0 = FX + ex0 * K, Y0 = FY + ey0 * K;
  let acc = 0;
  for (const [v, lab] of [[tL.line, 'label'], [6, 'gap'], [44, 'input'], [6, 'gap']]) { R.dim([X0, Y0 + acc * K], [X0, Y0 + (acc + v) * K], [-1, 0], { d: 28, value: `${v} px`, place: 'left' }); acc += v; }
  const edge = FX + Pw * K, KX = edge + 40;
  const pts = [
    { x: X0 + textW(ctx, 'body', F.ready, tL.size, tL.weight) * K + 14, y: Y0 + tL.line * K / 2, a: 'Label', t: 'label', v: `${tL.size} / ${tL.line} / ${tL.weight}` },
    { x: X0 + FW * K - 12, y: Y0 + (tL.line + 6 + 22) * K, a: 'Edge', t: '--danger', v: `${pxOf(ctx.borders, 'border-control', 1)} px, ${hexOf(M, 'danger')}` },
    { x: X0 + FW * K - 12, y: Y0 + (tL.line + 6 + 44 + 6 + 9) * K, a: 'Message', t: '--danger', v: `${ratioOf(ctx, M.danger, M.surface)} : 1 on --surface` },
  ];
  const ky = spread(pts.map((p) => p.y), 48, FY + 8, FY + Ph * K);
  pts.forEach((p, i) => {
    svg += `<path d="M${r1(p.x)} ${r1(p.y)}H${r1(edge)}" stroke="${M.text}" stroke-width="1"/><circle cx="${r1(p.x)}" cy="${r1(p.y)}" r="2.5" fill="${M.text}"/><path d="M${r1(edge)} ${r1(p.y)}H${r1(edge + 10)}L${r1(KX - 12)} ${r1(ky[i])}" stroke="var(--ink)" stroke-width="1"/>`;
    html += keyTag(KX, ky[i], i + 1) + rowAt(KX + 24, ky[i] - 18, A(p.a)) + rowAt(KX + 24, ky[i] + 2, `${p.t}  ${p.v}`, 'u1-m u2-q');
  });
  html += drawingTitle(FX, FY + Ph * K + 28, 2, 'Field, error state', '[2:1]');
  const items = [
    'The label sits above the field and stays on screen. Help sits under the field and gives way to the error message.',
    `The field is [44 px] high with a [${pxOf(ctx.borders, 'border-control', 1)} px] edge. Focus turns the edge to [--text] and adds the ring; an error turns it to [--danger].`,
    `The input text is the [control] type, [${tC.size} px] at weight [${ctx.weights.regular}].`,
  ];
  html += noteBlock(ZX[3] + 24, 520, items);
  return sheetOf(ctx, 'inputs', html + svgAll(svg) + R.svg(), '[2:1] and [1:1], sizes in px');
}

// ---------------------------------------------------------------- choices

function choices(ctx) {
  const ui = ctx.ui, S = sc(ctx), F = S.form, X = ex(ctx), M = colourMap(ctx, 'light'), R = reds(), K = 4;
  // a control with no label, at the plate's own scale, so the shipped box or switch can be dimensioned
  const bare = (h) => h.replace('class="ui-choice"', 'class="ui-choice" style="gap:0;min-height:0"');
  const bwC = pxOf(ctx.borders, 'border-control', 1), rIn = ctx.radius.input;
  const DW = ZX[2] - ZX[0], DH = 300, PW0 = DW / K, uy = (DH / K - 26) / 2;
  const det = [
    { n: 'Checkbox, checked', w: 22, h: 22, html: bare(ui.check('', { checked: true, name: 'u2d1' })), dims: (x, y) => { R.dim([x, y], [x + 22 * K, y], [0, -1], { d: 28, value: '22 px' }); R.dim([x, y], [x, y + 22 * K], [-1, 0], { d: 28, value: '22 px', place: 'left' }); } },
    { n: 'Radio, selected', w: 22, h: 22, html: bare(ui.check('', { type: 'radio', checked: true, name: 'u2d2' })), dims: (x, y) => { R.dim([x, y], [x + 22 * K, y], [0, -1], { d: 28, value: '22 px' }); R.dim([x + 6 * K, y + 22 * K], [x + 16 * K, y + 22 * K], [0, 1], { d: 28, value: '10 px' }); } },
    { n: 'Switch, off', w: 44, h: 26, html: bare(ui.switch('', {})), dims: (x, y) => { R.dim([x, y], [x + 44 * K, y], [0, -1], { d: 28, value: '44 px' }); R.dim([x, y], [x, y + 26 * K], [-1, 0], { d: 28, value: '26 px', place: 'left' }); } },
    { n: 'Switch, on', w: 44, h: 26, html: bare(ui.switch('', { checked: true })), dims: (x, y) => { R.dim([x + 3 * K, y], [x + 21 * K, y], [0, -1], { d: 28, value: '18 px' }); R.dim([x + 24 * K, y + 26 * K], [x + 40 * K, y + 26 * K], [0, 1], { d: 28, value: '16 px' }); } },
  ];
  let html = '', svg = '';
  det.forEach((d, i) => {
    const px = ZX[i * 2], ux = (PW0 - d.w) / 2, uyy = (DH / K - d.h) / 2;
    html += zoomFit(px, 40, DW, DH, K, at(ux, uyy, d.html)) + drawingTitle(px + 24, 40 + DH + 28, i + 1, d.n, '[4:1]');
    svg += frame(px, 40, DW, DH);
    d.dims(px + ux * K, 40 + uyy * K);
  });
  // the set as it ships, 1:1, on a plate across the sheet; the column names sit on the film above
  const cols = [[ZX[0] + 24, 'Checkbox', X.checks.map((t, i) => ui.check(t, { checked: i === 0, name: 'u2c' + i })).join('')], [ZX[2] + 24, 'Radio', X.radios.map((t, i) => ui.check(t, { type: 'radio', name: 'u2r', checked: i === 0 })).join('')], [ZX[4] + 24, 'Switch', X.switches.map((t, i) => ui.switch(t, { checked: i === 0 })).join('')], [ZX[6] + 24, 'Segmented', `<div class="ui-field"><span class="ui-label">${A(F.size)}</span>${ui.segmented(F.sizes, 1)}</div>`]];
  const SY = 472, SH = 44 * Math.max(X.checks.length, 3) + 48;
  html += cols.map(([x, nm]) => `<span class="a c-label" style="left:${x}px;top:${SY - 26}px">${nm}</span>`).join('');
  html += plate(40, SY, 1507, SH, 'light', cols.map(([x, , h]) => at(x - 40, 24, h, 'display:flex;flex-direction:column;align-items:flex-start')).join(''));
  svg += frame(40, SY, 1507, SH);
  html += drawingTitle(64, SY + SH + 28, 5, 'The set, as shipped', '[1:1]');
  const items = [
    `A box is [22 px] with a [${bwC} px] edge and a corner of [${rIn} px]; a switch is [44 x 26 px]. Each is a [44 px] target with its label.`,
    'A checked box fills with [--text]. A checked switch fills with [--action] and its thumb moves [18 px].',
  ];
  html += noteBlock(64, 420, items);
  return sheetOf(ctx, 'choices', html + svgAll(svg) + R.svg(), '[4:1] and [1:1], sizes in px');
}

// ---------------------------------------------------------------- cards

function cards(ctx) {
  const ui = ctx.ui, S = sc(ctx), X = ex(ctx), M = colourMap(ctx, 'light'), R = reds(), d = S.deliveries;
  const tB = uiT(ctx, 'body'), tS = uiT(ctx, 'title-s'), K = 2, CW = 300, bh = pxOf(ctx.borders, 'border-hairline', 1), rc = ctx.radius.card;
  const P = { x: 40, y: 40, w: ZX[4] - 40, h: 480 }, ux = 64, uy = 40, CX = P.x + ux * K, CY = P.y + uy * K;
  const cl = linesOf(ctx, 'body', S.pickup, tB.size, CW - 34), cardH = 2 * bh + 32 + tB.line + 6 + tS.line + 6 + cl * tB.size * 1.5;
  let html = zoomFit(P.x, P.y, P.w, P.h, K, at(ux, uy, ui.card({ meta: S.status, title: S.eta, text: S.pickup }), `width:${CW}px`));
  let svg = frame(P.x, P.y, P.w, P.h);
  R.dim([CX + bh * K, CY], [CX + (bh + 16) * K, CY], [0, -1], { d: 24, value: '16 px' });
  R.dim([CX, CY], [CX, CY + cardH * K], [-1, 0], { d: 28, value: `${Math.round(cardH)} px`, place: 'left' });
  const titleY = CY + (bh + 16 + tB.line + 6 + tS.line / 2) * K, c = 1 - Math.SQRT1_2, edge = P.x + P.w, KX = 826;
  const pts = [
    { x: CX + CW * K - rc * K * c, y: CY + rc * K * c, a: 'Corner', t: '--r-card', v: `${rc} px` },
    { x: CX + (bh + 16 + textW(ctx, 'display', S.eta, tS.size)) * K + 14, y: titleY, a: 'Title', t: 'title-s', v: `${tS.size} / ${tS.line} / ${tS.weight}` },
    { x: CX + CW * K - 12, y: CY + cardH * K / 2, a: 'Edge', t: '--divider', v: `${bh} px, ${hexOf(M, 'divider')}` },
    { x: CX + (bh + 16 + Math.min(CW - 34, textW(ctx, 'body', S.pickup, tB.size))) * K + 14, y: CY + (cardH - bh - 16 - tB.size * 0.75) * K, a: 'Text', t: '--text-soft', v: `${ratioOf(ctx, M['text-soft'], M.surface)} : 1 on --surface` },
  ].sort((a, b) => a.y - b.y);
  const ky = spread(pts.map((p) => p.y), 36, 112, 330);
  html += head([['Key', KX - 12], ['Part', 852], ['Token', 976], ['Value', 1140]], 64, KX - 12, 1523);
  pts.forEach((p, i) => {
    svg += `<path d="M${r1(p.x)} ${r1(p.y)}H${r1(edge)}" stroke="${M.text}" stroke-width="1"/><circle cx="${r1(p.x)}" cy="${r1(p.y)}" r="2.5" fill="${M.text}"/><path d="M${r1(edge)} ${r1(p.y)}H${r1(edge + 10)}L${KX - 12} ${r1(ky[i])}" stroke="var(--ink)" stroke-width="1"/>`;
    html += keyTag(KX, ky[i], i + 1) + rowAt(852, ky[i] - 10, A(p.a)) + rowAt(976, ky[i] - 10, A(p.t), 'u1-m') + rowAt(1140, ky[i] - 10, A(p.v), 'u1-m');
  });
  html += drawingTitle(P.x + 24, P.y + P.h + 28, 1, 'Card', '[2:1]');
  // the kinds, 1:1, light then dark, in a band on the content floor
  const BY = 747, BH = 224, KW = 320, LW = ZX[6] - 40, mk = (x, h) => at(x, 32, h, `width:${KW}px`);
  const kLight = mk(24, ui.card({ meta: d[1].price, title: d[1].to, text: d[1].when })) + mk(24 + KW + 24, ui.card({ meta: d[2].price, title: d[2].to, text: d[2].when, raised: true })) + at(24 + 2 * (KW + 24), 32, ui.stat(S.paid, X.statLabel), `width:${KW}px`);
  html += plate(40, BY, LW, BH, 'light', kLight) + plate(ZX[6], BY, 1547 - ZX[6], BH, 'dark', mk(24, ui.card({ meta: d[1].price, title: d[1].to, text: d[1].when })).replace('width:320px', 'width:328px'));
  svg += frame(40, BY, 1507, BH) + `<path d="M${ZX[6] - 0.5} ${BY}V${BY + BH}" stroke="var(--ink)" stroke-width="1"/>`;
  html += drawingTitle(40 + 24, BY - 52, 2, 'Card, raised card and stat, then dark', '[1:1]');
  const items = [
    `A card rests on the surface with a [${bh} px] hairline. A raised card drops the line and steps up one ground, to [--raised].`,
    `The body is padded [16 px] and the corner is [${rc} px]. Nothing is lifted by a shadow.`,
  ];
  html += noteBlock(826, 600, items, BY - 78);
  return sheetOf(ctx, 'cards', html + svgAll(svg) + R.svg(), '[2:1] and [1:1], sizes in px');
}

// ---------------------------------------------------------------- navigation

function navigation(ctx) {
  const ui = ctx.ui, B = ctx.brand, S = sc(ctx), X = ex(ctx), R = reds(), tT = uiT(ctx, 'title');
  const links = (X.links || []).slice(0, 3), all = [...links, [X.account, 'user']], stretch = B.fonts.display.stretch || 100;
  const lg = (cw) => `<span style="display:block;width:104px">${ctx.logo.html('horizontal', { width: 104, colourway: cw })}</span>`;
  const N = { x: ZX[1], y: 40, w: ZX[6] - ZX[1] }, lhT = tT.line;
  const top = `<nav class="ui-topbar" aria-label="Main">${lg('colour')}<div class="ui-topbar__links">${ui.links(links, 0)}</div></nav>`;
  const under = `<div style="padding:20px 16px 0"><div style="height:24px;display:flex;align-items:center">${ui.crumbs(X.crumbs)}</div><div class="ui-display" style="margin:12px 0 16px;font-size:var(--fs-title);line-height:var(--lh-title);font-stretch:${stretch}%">${A(B.ui.screen.title)}</div>${ui.tabs(X.tabs, 0)}</div>`;
  const tabY = 56 + 20 + 24 + 12 + lhT + 16; N.h = tabY + 45 + 28;
  let html = plate(N.x, N.y, N.w, N.h, 'light', at(0, 0, top + under, `width:${N.w}px`));
  let svg = frame(N.x, N.y, N.w, N.h);
  R.dim([N.x, N.y], [N.x, N.y + 56], [-1, 0], { d: 28, value: '56 px', place: 'left' });
  R.dim([N.x, N.y + tabY], [N.x, N.y + tabY + 44], [-1, 0], { d: 28, value: '44 px', place: 'left' });
  html += drawingTitle(N.x + 24, N.y + N.h + 28, 1, 'Top bar, breadcrumbs and tabs', '[1:1]');
  // the sidebar on the light surface, the phone's tab bar on the dark
  const R2 = 450, sbH = 4 * 44 + 3 * 2 + 24, SB = { x: ZX[1], y: R2, w: 252, h: sbH + 32 };
  html += plate(SB.x, SB.y, SB.w, SB.h, 'light', at(16, 16, `<nav class="ui-sidebar" aria-label="Sections">${ui.links(all, 0)}</nav>`));
  svg += frame(SB.x, SB.y, SB.w, SB.h);
  R.dim([SB.x + 16, SB.y], [SB.x + 236, SB.y], [0, -1], { d: 28, value: '220 px' });
  html += drawingTitle(SB.x + 24, SB.y + SB.h + 28, 2, 'Sidebar', '[1:1]');
  const TB = { x: ZX[3] + 24, y: R2 + SB.h - 64, w: 390, h: 64 };
  html += plate(TB.x, TB.y, TB.w, TB.h, 'dark', `<nav class="ui-tabbar" aria-label="Sections">${all.map(([t, i], k) => `<a href="#"${k === 0 ? ' aria-current="page"' : ''}>${ui.icon(i, 20)}${A(t)}</a>`).join('')}</nav>`);
  svg += frame(TB.x, TB.y, TB.w, TB.h);
  R.dim([TB.x, TB.y], [TB.x + TB.w, TB.y], [0, -1], { d: 28, value: '390 px' });
  R.dim([TB.x, TB.y], [TB.x, TB.y + 64], [-1, 0], { d: 28, value: '64 px', place: 'left' });
  html += drawingTitle(TB.x, TB.y + TB.h + 28, 3, 'Tab bar, dark, on a phone', '[1:1]');
  const items = [
    'The current page takes a [3 px] bar in [--action]: under a link or a tab, down the edge of a sidebar link, over a tab bar item.',
    'Links and tabs are [44 px] high, the top bar [56 px] and the tab bar [64 px].',
    'Under [480 px] the top bar wraps its links onto a second line.',
  ];
  html += noteBlock(ZX[6] + 24, 329, items, 560);
  return sheetOf(ctx, 'navigation', html + svgAll(svg) + R.svg());
}

// ---------------------------------------------------------------- lists

function lists(ctx) {
  const ui = ctx.ui, S = sc(ctx), M = colourMap(ctx, 'light'), d = S.deliveries, tB = uiT(ctx, 'body'), tL = uiT(ctx, 'label');
  const L = { x: ZX[2], y: 40, w: ZX[5] - ZX[2] }, W = L.w - 48, RH = 66;
  const rowA = ui.row({ lead: A(S.initials || ''), title: S.rider, sub: S.riderNote });
  const rowB = ui.row({ title: d[0].to, sub: d[0].when, end: d[0].price });
  const rowC = ui.row({ title: d[1].to, sub: d[1].when, chip: ui.statusChip(d[1].status) });
  L.h = 24 + 1 + 3 * RH + 1 + 24;
  let html = plate(L.x, L.y, L.w, L.h, 'light', at(24, 24, `<ul class="ui-list">${rowA}${rowB}${rowC}</ul>`, `width:${W}px`));
  const D = { x: L.x, y: L.y + L.h, w: L.w, h: 24 + 1 + d.length * RH + 24 };
  html += plate(D.x, D.y, D.w, D.h, 'dark', at(24, 24, ui.deliveryRows(d.length), `width:${W}px`));
  let svg = frame(L.x, L.y, L.w, L.h + D.h) + `<path d="M${L.x} ${D.y - 0.5}H${L.x + L.w}" stroke="var(--ink)" stroke-width="1"/>`;
  // keys: parts at the left of a row read to a schedule on the left, parts at the right to one on the right
  const rt = (r, off) => L.y + 24 + 1 + r * RH + off, lx = L.x + 24, rx = L.x + L.w - 24;
  const left = [
    { y: rt(0, RH / 2), a: 'Lead', l: `${40} px, --sunken` },
    { y: rt(1, RH / 2 - 11), a: 'Title', l: `body, 500` },
    { y: rt(1, RH / 2 + 11), a: 'Sub line', l: `label, --quiet` },
  ];
  const right = [
    { y: rt(1, RH / 2 - 11), a: 'End', l: 'label, tabular figures' },
    { y: rt(2, RH / 2 + 2), a: 'Status', l: 'label, 500' },
    { y: rt(2, RH), a: 'Divider', l: `${pxOf(ctx.borders, 'border-hairline', 1)} px, --divider` },
  ];
  const kyL = spread(left.map((p) => p.y), 52, L.y + 24, L.y + 300), kyR = spread(right.map((p) => p.y), 52, L.y + 24, L.y + 300);
  left.forEach((p, i) => {
    const kx = L.x - 32;
    svg += `<path d="M${r1(kx + 12)} ${r1(kyL[i])}L${r1(L.x - 8)} ${r1(p.y)}H${r1(lx - 6)}" stroke="var(--ink)" stroke-width="1"/><circle cx="${r1(lx - 6)}" cy="${r1(p.y)}" r="2.5" fill="${M.text}"/>`;
    html += keyTag(kx, kyL[i], i + 1) + rowAt(72, kyL[i] - 18, A(p.a), '', 'width:276px;text-align:right') + rowAt(72, kyL[i] + 2, p.l, 'u1-m u2-q', 'width:276px;text-align:right');
  });
  right.forEach((p, i) => {
    const kx = L.x + L.w + 32;
    svg += `<path d="M${r1(rx + 6)} ${r1(p.y)}H${r1(L.x + L.w + 8)}L${r1(kx - 12)} ${r1(kyR[i])}" stroke="var(--ink)" stroke-width="1"/><circle cx="${r1(rx + 6)}" cy="${r1(p.y)}" r="2.5" fill="${M.text}"/>`;
    html += keyTag(kx, kyR[i], left.length + i + 1) + rowAt(kx + 24, kyR[i] - 18, A(p.a)) + rowAt(kx + 24, kyR[i] + 2, p.l, 'u1-m u2-q');
  });
  html += drawingTitle(L.x + 24, D.y + D.h + 28, 1, 'Row parts, then the list in dark', '[1:1]');
  const items = [
    'A row is at least [64 px] high. The title says who or where; the line under it carries the detail.',
    'Prices and times use tabular figures, so a column lines up.',
    `A status is the only colour in a row. The words are [${tL.size} px], weight [500].`,
  ];
  html += noteBlock(64, 296, items);
  return sheetOf(ctx, 'lists', html + svgAll(svg));
}

// ---------------------------------------------------------------- status: a legend, one column a status, light and dark bands over it

function status(ctx) {
  const ui = ctx.ui, S = sc(ctx), ML = colourMap(ctx, 'light'), MD = colourMap(ctx, 'dark'), st = ctx.status;
  const n = st.length + 1, X0 = ZX[1], PW = 1547 - X0, cw = PW / n, BH = 64;
  const cols = [...st.map((s) => ({ chip: ui.statusChip(s.id), tk: statusText(ctx, 'light', s).token, l: statusText(ctx, 'light', s).hex, dk: statusText(ctx, 'dark', s).hex, rl: ratioOf(ctx, statusText(ctx, 'light', s).hex, ML.surface), rd: ratioOf(ctx, statusText(ctx, 'dark', s).hex, MD.surface) })),
    { chip: `<span class="ui-badge">${S.deliveries.length}</span>`, tk: '--action-label on --action', l: ML['action-label'], dk: MD['action-label'], rl: ratioOf(ctx, ML['action-label'], ML.action), rd: ratioOf(ctx, MD['action-label'], MD.action) }];
  const place = (mode) => cols.map((c, i) => at(i * cw + 16, (BH - 18) / 2, c.chip)).join('');
  let html = plate(X0, 112, PW, BH, 'light', place('light')) + plate(X0, 112 + BH, PW, BH, 'dark', place('dark'));
  let svg = frame(X0, 112, PW, 2 * BH);
  html += `<h3 class="a c-head nw" style="left:64px;top:${112 + 21}px">Light</h3><h3 class="a c-head nw" style="left:64px;top:${112 + BH + 21}px">Dark</h3>`;
  for (let i = 0; i <= n; i++) svg += `<path d="M${r1(X0 + i * cw)} ${112 + 2 * BH}v8" stroke="var(--ink)" stroke-width="1"/>`;
  const lab = ['Token', 'Words, light', 'Ratio, light', 'Words, dark', 'Ratio, dark'], RH = 40, Y1 = 112 + 2 * BH + 28;
  lab.forEach((t, r) => {
    const y = Y1 + r * RH;
    html += `<span class="a c-label" style="left:64px;top:${y + 12}px">${t}</span>`;
    svg += `<path d="M64 ${y + RH - 0.5}H1547" stroke="var(--hair)" stroke-width="1"/>`;
    cols.forEach((c, i) => {
      const x = X0 + i * cw + 16, v = [c.tk, c.l.toUpperCase(), `${c.rl} : 1`, c.dk.toUpperCase(), `${c.rd} : 1`][r];
      html += r === 0 ? `<span class="a u2-tk" style="left:${r1(x)}px;top:${y + 4}px;width:${r1(cw - 28)}px">${A(v)}</span>` : rowAt(x, y + 10, A(v), 'u1-m');
    });
  });
  svg += `<path d="M64 ${Y1 - 0.5}H1547" stroke="var(--ink)" stroke-width="1.5"/>`;
  html += drawingTitle(64, Y1 + 5 * RH + 40, 1, 'Status legend, one column a status', '[1:1]');
  const items = [
    'A status is plain words in one colour. There is no fill and no pill, so the words carry the meaning.',
    'Each ratio is the words against [--surface] in that mode. The badge is measured against its own fill, [--action].',
    ...(st.some((s) => s.custom) ? ['A status with its own colour reads as text on the surface and on a raised card. Where its colour does not, it falls back to [--text].'] : []),
  ];
  html += noteBlock(64, 420, items);
  return sheetOf(ctx, 'status', html + svgAll(svg));
}

// ---------------------------------------------------------------- feedback

function feedback(ctx) {
  const ui = ctx.ui, S = sc(ctx), F = S.form, M = colourMap(ctx, 'light'), R = reds();
  const BY = 40, BH = 300, c1 = 24, c2 = 24 + 520, c3 = 24 + 1010;
  const alerts = `<div style="display:flex;flex-direction:column;gap:16px">${ui.alert('info', S.pickup)}${ui.alert('success', S.toast)}${ui.alert('warning', S.alert)}${ui.alert('danger', F.readyError)}</div>`;
  const msgs = `<div style="display:flex;flex-direction:column;gap:32px;align-items:flex-start">${ui.toast(S.toast)}<p class="ui-inline-msg">${ui.icon('info', 16)}<span>${A(S.inline)}</span></p></div>`;
  const wait = `<div style="display:flex;flex-direction:column;gap:32px;align-items:flex-start">${ui.spinner()}<div style="width:100%;display:flex;flex-direction:column;gap:12px">${ui.skeleton('100%')}${ui.skeleton('62%')}${ui.skeleton('80%')}</div></div>`;
  let html = plate(40, BY, 1507, BH, 'light', at(c1, 24, alerts, 'width:460px') + at(c2, 24, msgs, 'width:440px') + at(c3, 24, wait, 'width:360px'));
  let svg = frame(40, BY, 1507, BH) + `<path d="M${40 + c2 - 32 + 0.5} ${BY}V${BY + BH}M${40 + c3 - 32 + 0.5} ${BY}V${BY + BH}" stroke="${M.divider}" stroke-width="1"/>`;
  html += drawingTitle(40 + c1, BY + BH + 28, 1, 'Banners', '[1:1]') + drawingTitle(40 + c2, BY + BH + 28, 2, 'Toast and inline message', '[1:1]') + drawingTitle(40 + c3, BY + BH + 28, 3, 'Waiting', '[1:1]');
  // detail 4: an alert at 2:1, its parts dimensioned along the top
  const K = 3, AW = 300, bw = 2, pl = 14, ic = 20, gp = 12, FX = 64, FY = 420, ux = 48, uy = 24;
  const tB = uiT(ctx, 'body'), aH = 20 + linesOf(ctx, 'body', F.readyError, tB.size, AW - (bw + pl + ic + gp)) * tB.size * 1.45, Pw = ux + AW + 24, Ph = uy + aH + 24;
  html += zoomPlate(FX, FY, Pw, Ph, K, at(ux, uy, ui.alert('danger', F.readyError), `width:${AW}px`)) + drawingTitle(FX, FY + Ph * K + 28, 4, 'Banner, danger', '[3:1]');
  svg += frame(FX, FY, Pw * K, Ph * K);
  const X0 = FX + ux * K, Y0 = FY + uy * K;
  R.dim([X0 + bw * K, Y0], [X0 + (bw + pl) * K, Y0], [0, -1], { d: 28, value: `${pl} px` });
  R.dim([X0 + (bw + pl) * K, Y0], [X0 + (bw + pl + ic) * K, Y0], [0, -1], { d: 44, value: `${ic} px` });
  R.dim([X0 + (bw + pl + ic) * K, Y0], [X0 + (bw + pl + ic + gp) * K, Y0], [0, -1], { d: 28, value: `${gp} px` });
  const items = [
    'A banner is words on the page ground. The icon and a [2 px] edge carry the tone; the text stays in [--text].',
    'A toast is the one inverted surface: [--text] with [--surface] words, and an Undo that can be reached from the keyboard.',
    `The spinner is [24 px]. A skeleton line is [14 px] high, in [--sunken], and stands in for a line of text that is still loading.`,
  ];
  html += noteBlock(ZX[4] + 24, 520, items);
  return sheetOf(ctx, 'feedback', html + svgAll(svg) + R.svg(), '[1:1] and [3:1], sizes in px');
}

export const uikit = { states, buttons, inputs, choices, cards, navigation, lists, status, feedback };

export function css() {
  return `
.pg .u2-q{color:var(--quiet)}
.pg .u2-tk{position:absolute;font:400 12px/16px var(--cmono);color:var(--ink);overflow-wrap:anywhere}
`;
}
