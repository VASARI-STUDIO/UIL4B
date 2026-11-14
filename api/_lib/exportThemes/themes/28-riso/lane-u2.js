// Lane u2 for theme 28 (Riso): the UI kit's component pages (states, buttons, inputs, choices, cards, navigation, lists, status, feedback).
// Each is a kit sheet off the brand's press (lane u1's chrome, imported read-only): a plate, a pass and a hit, and the hit is always a real
// count from ctx, named on the plate. The components are the shipped ones (ctx.ui and componentsCss, written once by lane u1's css()),
// pasted clean onto the paper on the product's own surface and never restyled. A state that only shows under a pointer or a key is forced
// with the class the code package ships for it (is-hover, is-focus, is-pressed) or the disabled attribute.
//
// The pages are ledgers and proofs: a note on paper sits level with the component it describes, so a row reads across like a press's
// job ticket. Every token value and ratio printed is read from ctx. Copy on the components is the brand's own (ui.screen.content), printed
// whole. Every class here starts u2-.
import { A, inkW, faceFor, val, X0, X1, W, fitW } from './sheet.js';
import { kitSheet, plateLabel, plateNote, label, note, hair, table, Word, word, rt, sc } from './lane-u1.js';
import { colourMap, tokenGroups, statusText } from '../../engine/tokens.js';

// ---------------------------------------------------------------- shared pieces

const uiT = (ctx, token) => ctx.uiType.find((t) => t.token === token) || ctx.uiType[ctx.uiType.length - 1];
const px = (v, d) => { const n = parseFloat(v); return Number.isFinite(n) ? n : d; };
const sp = (ctx, n, d) => px(tokenGroups(ctx).space[`sp-${n}`], d);
const pg = (ctx, id) => val(String(ctx.pageNo(id)).padStart(3, '0'));
const ex = (S) => S.example || {};

// a button's width as the browser lays it out: the label's ink at the control's size and weight, its padding each side, its edge, its icon
function btnW(ctx, label, { size, icon } = {}) {
  const t = uiT(ctx, 'control'), fs = size === 'sm' ? uiT(ctx, 'label').size : t.size;
  const pad = size === 'sm' ? sp(ctx, 4, 16) : size === 'lg' ? sp(ctx, 6, 24) : sp(ctx, 5, 20);
  return Math.ceil(inkW(faceFor(ctx, 'body', t.weight).stem, String(label), fs) + 2 * pad + 2 * ctx.brand.ui.border + (icon ? 18 + sp(ctx, 2, 8) : 0) + 6);
}

// the row heading and its note on paper, in the chrome
const lab = (name, html) => `<p class="c-body u2-b">${A(name)}</p>${html ? `<p class="c-note u2-n">${html}</p>` : ''}`;
// a fixed-width slot inside a surface row, so the same component sits in the same column on every row
const slot = (w, html) => `<div class="u2-s" style="width:${w}px">${html || ''}</div>`;

// a ledger: rows of [note on paper | the product's surface]; mirrored puts the surface first. The surface cells of every row join into one
// panel (key hairline round it, the product's own divider between rows), so each note sits level with the component it describes.
function ledger(x, y, rows, { lw, rw, mirror = false, mode = 'light', pad = '16px 20px', gap = 12, foot = '' }) {
  const body = rows.map(([l, r]) => {
    const L = `<div class="u2-l" style="width:${lw}px;${mirror ? `margin-left:${gap}px` : `margin-right:${gap}px`}">${l}</div>`;
    const R = `<div class="ui u2-r"${mode === 'dark' ? ' data-theme="dark"' : ''} style="width:${rw}px;padding:${pad}">${r}</div>`;
    return `<div>${mirror ? R + L : L + R}</div>`;
  }).join('');
  // a foot note rides in the flow under the last row, so it follows the ledger however tall the rows come out
  return `<div class="u2-lg" style="left:${x}px;top:${y}px">${body}${foot ? `<p class="c-note u2-ft" style="width:${lw + gap + rw}px">${foot}</p>` : ''}</div>`;
}

// a clean panel of the product's surface (lane u1's .u1-pan keeps the key edge and the clip)
const pan = (x, y, w, inner, { mode = 'light', pad = 24, h } = {}) => `<div class="ui u1-pan u2-p"${mode === 'dark' ? ' data-theme="dark"' : ''} style="left:${x}px;top:${y}px;width:${w}px;${h ? `height:${h}px;` : ''}padding:${pad}px">${inner}</div>`;

export function css(ctx) {
  return `
.pg .u2-b{font-weight:600}
.pg .u2-n{margin-top:4px}
.pg .u2-ft{margin-top:16px}
.pg .u2-lg{position:absolute;display:flex;flex-direction:column}
.pg .u2-lg>div{display:flex;align-items:stretch}
.pg .u2-lg .u2-l{flex:none;padding:14px 0;border-top:.5px solid var(--hair)}
.pg .u2-lg>div:last-child .u2-l{border-bottom:.5px solid var(--hair)}
.pg .u2-lg .u2-r{flex:none;display:flex;align-items:center;gap:12px;background:var(--surface);border-left:.5px solid var(--hair);border-right:.5px solid var(--hair)}
.pg .u2-lg>div+div .u2-r{border-top:var(--w-hairline) solid var(--divider)}
.pg .u2-lg>div:first-child .u2-r{border-top:.5px solid var(--hair)}
.pg .u2-lg>div:last-child .u2-r{border-bottom:.5px solid var(--hair)}
.pg .u2-s{flex:none;display:flex;align-items:center}
.pg .u2-s>.ui-field{width:100%}
.pg .u2-p{position:absolute}
.pg .u2-col{display:flex;flex-direction:column;align-items:flex-start}
.pg .u2-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.pg .u2-p .photo-slot{display:block;width:100%;aspect-ratio:16/9;background:var(--sunken)}
.pg .u2-zoom{position:absolute}
.pg .u2-dim{position:absolute;background:var(--key)}
${statusCss}`;
}

// ---------------------------------------------------------------- the pages

export const uikit = {
  // States: the six states a control can be in, one row each, every one forced by its class. The field leads each row, so the error row,
  // which only a field has, can run its message across the whole surface. A primary button is never shown disabled (the house rule), so
  // that cell is left empty and the row's note says why.
  states(ctx) {
    const S = sc(ctx), F = S.form || {}, X = ex(S), ui = ctx.ui, bw = ctx.brand.ui.border;
    const second = X.secondary || S.call;
    // the note column is wide enough to hold each note to four lines, so a row is set by its field and not by its note
    const lw = 150, sidePad = 12, rw = X1 - X0 - lw - 12, inner = rw - 2 * sidePad;
    const pW = btnW(ctx, F.book), sW = btnW(ctx, second, {}), fW = Math.max(100, inner - pW - sW - 24);
    const P = (st) => slot(pW, ui.btn(F.book, { state: st })), Sb = (st) => slot(sW, ui.btn(second, { variant: 'secondary', state: st }));
    const fld = (id, o = {}) => slot(fW, ui.field({ id, label: F.ready, value: F.readyValue, ...o }));
    const rows = [
      [lab('Rest', 'As the code ships it, with nothing pressed or pointed at.'), fld('u2-st1') + P() + Sb()],
      [lab('Hover', `${val('is-hover')}. The fill steps to ${val('--action-hover')}; an outline to ${val('--sunken')}.`), slot(fW) + P('hover') + Sb('hover')],
      [lab('Focus', `${val('is-focus')}. A ${val('2 px')} ${val('--focus')} ring, ${val('2 px')} off the edge.`), fld('u2-st2', { state: 'focus' }) + P('focus') + Sb('focus')],
      [lab('Pressed', `${val('is-pressed')}. ${val('--action-pressed')} fill, scaled to ${val('0.97')}.`), slot(fW) + P('pressed') + Sb('pressed')],
      [lab('Disabled', `${val('disabled')}. ${val('--disabled-bg')} ground, no edge. A primary is never disabled.`), fld('u2-st3', { disabled: true }) + slot(pW) + Sb('disabled')],
      [lab('Error', `${val('aria-invalid')}. A ${val(bw + ' px')} ${val('--danger')} edge and a message.`), slot(inner, ui.field({ id: 'u2-st4', label: F.ready, value: F.readyValue, error: F.readyError }))],
    ];
    const n = rows.length, x0 = X0 + lw + 12 + sidePad, y0 = 288;
    const heads = `${label(X0, 264, 'State and class')}${label(x0, 264, 'Text field')}${label(x0 + fW + 12, 264, 'Primary')}${label(x0 + fW + pW + 24, 264, 'Secondary')}`;
    const inner2 = `${plateLabel('States')}
${plateNote(`<b class="u2-b">${Word(n)} states</b><br>a control can be in, each forced here by the class the code ships, so the sheet shows what the browser draws.`, 403, 72, 224)}
${heads}${ledger(X0, y0, rows, { lw, rw, pad: `14px ${sidePad}px`, foot: `Checkboxes, radios, switches and segments take the same ring. Their states are on page ${pg(ctx, 'choices')}, Choices.` })}`;
    return kitSheet(ctx, 'states', { hp: 232, hit: { text: String(n), x: 49, base: 200, size: 200, maxW: 300 } }, inner2);
  },

  // Buttons: the primary button drawn large with its measurements, beside its spec; then the four variants, each at rest, on hover and
  // pressed, and the three sizes. The hit is the number of variants.
  buttons(ctx) {
    const S = sc(ctx), F = S.form || {}, X = ex(S), D = S.dialog || {}, ui = ctx.ui, M = colourMap(ctx, 'light'), R = ctx.radius, bw = ctx.brand.ui.border;
    const ctl = uiT(ctx, 'control'), padX = sp(ctx, 5, 20), H = 44;
    // the anatomy: the real button at k times, zoomed (vector), with key dimension marks for its height and side padding
    const pW = ctx.placeholders ? 150 : btnW(ctx, F.book), bx = 97, by = 336;  // slot edition: the label is a placeholder wider than the sentinel measures
    const k = Math.max(1.5, Math.min(2.5, Math.floor(((403 - 24 - bx) / pW) * 4) / 4));
    const dims = `<i class="u2-dim" style="left:${bx - 16}px;top:${by}px;width:1px;height:${H * k}px"></i><i class="u2-dim" style="left:${bx - 20}px;top:${by}px;width:9px;height:1px"></i><i class="u2-dim" style="left:${bx - 20}px;top:${by + H * k - 1}px;width:9px;height:1px"></i>
<p class="a c-value nw" style="right:${W - bx + 24}px;top:${Math.round(by + (H * k) / 2 - 7)}px">${H}</p>
<i class="u2-dim" style="left:${bx}px;top:${by - 16}px;width:${padX * k}px;height:1px"></i><i class="u2-dim" style="left:${bx}px;top:${by - 20}px;width:1px;height:9px"></i><i class="u2-dim" style="left:${bx + padX * k - 1}px;top:${by - 20}px;width:1px;height:9px"></i>
<p class="a c-value nw" style="left:${bx}px;top:${by - 38}px">${padX}</p>`;
    const big = `<div class="ui u2-zoom" style="left:${bx / k}px;top:${by / k}px;zoom:${k};background:transparent">${ui.btn(F.book)}</div>`;
    const spec = [
      ['Height', `${H} px`], ['Padding', `${padX} px each side`], ['Radius', `${R.button} px`], ['Edge', bw + ' px'],
      ['Label', null, `${A(ctx.brand.fonts.body.family)} ${val(ctl.weight)}, ${val(ctl.size + ' px')}`], ['On the fill', `${rt(ctx, M['action-label'], M.action)}`],
    ];
    let sy = 288, specH = '';
    for (const [l, v, html] of spec) { specH += `${hair(sy, 403, 224)}<p class="a c-note nw" style="left:403px;top:${sy + 5}px">${l}</p><p class="a c-note nw" style="right:${W - 627}px;top:${sy + 5}px;text-align:right">${html || val(v)}</p>`; sy += 27; }
    specH += hair(sy, 403, 224);

    // the variants: rest, hover and pressed while three of the widest fit the surface, else rest and hover
    const V = [
      ['Primary', F.book, 'primary', `${val('--action')} fill, ${val('--action-label')} words.`],
      ['Secondary', X.secondary || S.call, 'secondary', `${val('--surface')} with a ${val(bw + ' px')} ${val('--text')} edge.`],
      ['Quiet', X.quiet || S.call, 'quiet', 'No fill, an underlined label.'],
      ['Danger', X.danger || D.confirm, 'danger', `${val('--danger')} fill, for what cannot be undone.`],
    ];
    const lw = 130, rw = X1 - X0 - lw - 12, inner = rw - 40;
    const colW = Math.max(...V.map(([, l]) => btnW(ctx, l)));
    const st = 3 * colW + 24 <= inner ? [undefined, 'hover', 'pressed'] : [undefined, 'hover'];
    const rows = V.map(([name, l, variant, how]) => [lab(name, how), st.map((s) => slot(colW, ui.btn(l, { variant, state: s }))).join('')]);
    const small = X.small || F.book, sizes = [['sm', small], [undefined, F.book], ['lg', F.book, 'arrow-right']];
    rows.push([lab('Sizes', `${val('36')}, ${val('44')} and ${val('52 px')} tall: in a row, on a form, once a screen.`), `<div class="u2-row" style="row-gap:8px">${sizes.map(([size, l, icon]) => ui.btn(l, { size, iconRight: icon })).join('')}</div>`]);
    const x0 = X0 + lw + 12 + 20, ly = 520;
    const heads = `${label(X0, ly - 24, 'Variant')}${st.map((s, i) => label(x0 + i * (colW + 12), ly - 24, ['At rest', 'Hover', 'Pressed'][i])).join('')}`;
    const n = V.length;
    const innerHtml = `${plateLabel('Buttons', 49)}
${plateNote(`<b class="u2-b">${Word(n)} variants</b><br>of the one button, each at rest, on hover${st.length > 2 ? ' and pressed' : ''}, then the three sizes.`, 49, 72, 272)}
${label(X0, 264, `The primary button, ${String(k).replace('.', '.')} times its size`)}${dims}${big}${label(403, 264, 'At 1 : 1')}${specH}
${heads}${ledger(X0, ly, rows, { lw, rw, pad: '14px 20px' })}`;
    return kitSheet(ctx, 'buttons', { hp: 232, hit: { text: String(n), x: 403, base: 200, size: 200, maxW: 224 } }, innerHtml);
  },

  // Inputs: the product's own form, field by field, each in a different state, with the note on the paper beside it. The hit is the
  // number of fields the form asks for; the disabled field under them is the account the booking goes to.
  inputs(ctx) {
    const S = sc(ctx), F = S.form || {}, X = ex(S), ui = ctx.ui, M = colourMap(ctx, 'light'), bw = ctx.brand.ui.border;
    const fields = [F.pickup, F.dropoff, F.ready, F.size, F.notes].filter(Boolean), n = fields.length;
    const f = (o) => ui.field(o);
    const rows = [
      [f({ id: 'u2-in1', label: F.pickup, value: F.pickupValue }), lab('Filled', `The value in ${val('--text')}, a ${val(bw + ' px')} ${val('--edge')} edge. The label always sits above.`)],
      [f({ id: 'u2-in2', label: F.dropoff, value: F.dropoffValue, state: 'focus' }), lab('Focus', `${val('is-focus')}. The edge turns ${val('--text')} and a ${val('2 px')} ${val('--focus')} ring sits ${val('2 px')} off it.`)],
      [f({ id: 'u2-in3', label: F.ready, value: F.readyValue, error: F.readyError }), lab('Error', `A ${val('--danger')} edge. The message says what to enter, at ${rt(ctx, M.danger, M.surface)}.`)],
      [f({ id: 'u2-in4', label: F.size, kind: 'select', options: F.sizes || [], value: (F.sizes || [])[1] }), lab('Select', `The same box, with a chevron in ${val('--quiet')}.`)],
      [f({ id: 'u2-in5', label: F.notes, kind: 'textarea', help: F.notesHelp }), lab('Help', `In ${val('--quiet')} under the field, at ${rt(ctx, M.quiet, M.surface)}. An error takes its place.`)],
      [f({ id: 'u2-in6', label: X.account || F.pickup, value: ctx.brand.name, disabled: true }), lab('Disabled', `${val('--disabled-text')} on ${val('--disabled-bg')}, ${rt(ctx, M['disabled-text'], M['disabled-bg'])}, and no edge.`)],
    ];
    const rw = 330, lw = X1 - X0 - rw - 24;
    const innerHtml = `${plateLabel('Inputs')}
${plateNote(`<b class="u2-b">${Word(n)} fields</b><br>in the form ${A(F.title || F.book)}, each set here in a different state.`, 403, 72, 224)}
${label(X0, 264, A(F.title || F.book))}${label(X0 + rw + 24, 264, 'State')}
${ledger(X0, 288, rows, { lw, rw, mirror: true, pad: '12px 24px', gap: 24 })}`;
    return kitSheet(ctx, 'inputs', { hp: 232, hit: { text: String(n), x: 49, base: 200, size: 200, maxW: 300 } }, innerHtml);
  },

  // Choices: the four controls with the product's own options, each option in a different state, column by column on one surface;
  // then a ruled table of what each state changes, by control.
  choices(ctx) {
    const S = sc(ctx), F = S.form || {}, X = ex(S), ui = ctx.ui, M = colourMap(ctx, 'light');
    const checks = X.checks || [], radios = X.radios || [], sw = X.switches || [], sizes = F.sizes || [];
    const cState = ['checked', 'is-focus', 'disabled'], rState = ['checked', 'is-focus'], wState = ['on, is-focus', 'off'];
    const cHtml = checks.slice(0, 3).map((t, i) => ui.check(t, { checked: i === 0, state: i === 1 ? 'focus' : undefined, disabled: i === 2 })).join('');
    const rHtml = radios.slice(0, 2).map((t, i) => ui.check(t, { type: 'radio', name: 'u2-rd', checked: i === 0, state: i === 1 ? 'focus' : undefined })).join('');
    const wHtml = sw.slice(0, 2).map((t, i) => ui.switch(t, { checked: i === 0, state: i === 0 ? 'focus' : undefined })).join('');
    // the segmented control ships no state option, so focus is forced on its first unpressed segment with the class the code ships
    const seg = ui.segmented(sizes, 1).replace('<button type="button" aria-pressed="false"', '<button type="button" class="is-focus" aria-pressed="false"');
    const segOff = ui.segmented(sizes, 1, { disabled: true });
    const cw = Math.floor((578 - 48 - 48) / 3), cx = (i) => 24 + i * (cw + 24);
    const colH = 3 * 44 + 8;
    const panelIn = `<div class="a u2-col" style="left:${cx(0)}px;top:24px;width:${cw}px;gap:4px">${cHtml}</div>
<div class="a u2-col" style="left:${cx(1)}px;top:24px;width:${cw}px;gap:4px">${rHtml}</div>
<div class="a u2-col" style="left:${cx(2)}px;top:24px;width:${cw}px;gap:4px">${wHtml}</div>
<div class="a u2-col" style="left:24px;top:${24 + colH + 24}px;width:530px;gap:16px">${seg}${segOff}</div>`;
    // the two segmented controls are 271 px each and do not fit side by side in 530, so they stack; the panel is as tall as they are (42 px)
    const segH = 42, ph = 24 + colH + 24 + 2 * segH + 16 + 24;
    const heads = ['Checkbox', 'Radio', 'Switch'].map((t, i) => label(X0 + cx(i), 264, t)).join('');
    const said = (items, states) => (ctx.placeholders ? states.join('. ') : items.map((t, i) => `${A(t)}: ${states[i]}`).join('. ')) + '.';  // slot edition: the option names are placeholders too long for the 112 px note, so the states stand alone
    const notes = [said(checks.slice(0, 3), cState), said(radios.slice(0, 2), rState), said(sw.slice(0, 2), wState)].map((h, i) => note(X0 + cx(i), 288 + ph + 12, cw, h)).join('');
    const ny = 288 + ph + 12 + 72;
    const segNote = note(X0, ny, 578, (ctx.placeholders ? 'Segmented, one option selected, focus on another; then the same control disabled, every segment greyed together.' : `Segmented, ${A(sizes[1] || '')} selected, focus on ${A(sizes[0] || '')}; then the same control disabled, every segment greyed together.`));
    // what each state changes, by control (read from the shipped component styles)
    const ty = ny + 48;
    const cols = [{ x: 49, w: 100, head: 'State', cls: 'c-note u2-b' }, { x: 155, w: 112, head: 'Checkbox', cls: 'c-value' }, { x: 273, w: 112, head: 'Radio', cls: 'c-value' }, { x: 391, w: 112, head: 'Switch', cls: 'c-value' }, { x: 509, w: 118, head: 'Segmented', cls: 'c-value' }];
    const T = table(ctx, ty, cols, [
      ['Off', '--edge edge', '--edge edge', '--edge knob', '--surface'],
      ['On', '--text fill', '--text dot', '--action track', '--text fill'],
      ['Focus', '--focus ring', '--focus ring', '--focus ring', '--focus inset'],
      ['Disabled', '--disabled-bg', '--disabled-bg', '--disabled-bg', '--disabled-bg'],
    ].map((r) => r.map(A)), { rowH: 20 });
    const n = 4;
    const innerHtml = `${plateLabel('Choices', 49)}
${plateNote(`<b class="u2-b">${Word(n)} controls</b><br>for a choice, set with the product's own options, each option in a different state.`, 49, 72, 272)}
${heads}${pan(X0, 288, 578, panelIn, { h: ph, pad: 0 })}${notes}${segNote}${T.html}
${note(X0, T.y + 12, 578, `On the light surface the switch's ${val('--action')} track sits at ${rt(ctx, M.action, M.surface)}, with a ${val('--text')} knob.`)}`;
    return kitSheet(ctx, 'choices', { hp: 232, hit: { text: String(n), x: 403, base: 200, size: 200, maxW: 224 } }, innerHtml);
  },

  // Cards: one surface holding the four forms the code ships, the card with media largest; under it, a ruled table of what each holds.
  cards(ctx) {
    const S = sc(ctx), X = ex(S), ui = ctx.ui, M = colourMap(ctx, 'light'), B = ctx.brand;
    const real = (B.imagery.shots || []).filter((s) => s.photo), shot = real[0] || (B.imagery.shots || [])[0];
    const media = shot ? ctx.photo(shot.id, { cls: 'ui-card__media', slotNote: false }) : '';
    const act = `<div style="margin-top:6px">${ui.btn(S.call, { variant: 'secondary', size: 'sm' })}</div>`;
    const lw = 300, rw = 578 - 48 - 24 - lw;
    const left = ui.card({ media, meta: S.status, title: S.eta, text: S.pickup, action: act });
    // each label sits over its own value: the destination under its label, the rider (name, then note) on the raised card, the paid figure in the stat
    const right = `${ui.card({ meta: S.deliverToLabel, title: S.deliverTo, text: S.deliverTo.includes(S.to) ? '' : S.to })}${ui.card({ title: S.rider, text: S.riderNote, raised: true })}${ui.stat(S.paid, X.statLabel || S.paidLabel)}`;
    const panelIn = `<div style="display:flex;gap:24px;align-items:flex-start"><div style="width:${lw}px;flex:none">${left}</div><div class="u2-col" style="width:${rw}px;flex:none;gap:16px;align-items:stretch">${right}</div></div>`;
    const ty = 836;
    const cols = [{ x: 49, w: 106, head: 'Form', cls: 'c-note u2-b' }, { x: 167, w: 224, head: 'Holds' }, { x: 403, w: 224, head: 'Ground and edge' }];
    const T = table(ctx, ty, cols, [
      ['With media', 'A 16 : 9 picture, meta, title, text, an action', `${val('--surface')}, ${val('1 px')} ${val('--divider')}`],
      ['Without', 'Meta, title, one line of text', `${val('--surface')}, ${val('1 px')} ${val('--divider')}`],
      ['Raised', 'The same, a level up', `${val('--raised')}, no edge`],
      ['Stat', 'One figure and its label', `${val('--surface')}, ${val('1 px')} ${val('--divider')}`],
    ].map((r) => [A(r[0]), A(r[1]), r[2]]), { rowH: 20 });
    const n = 4;
    const innerHtml = `${plateLabel('Cards')}
${plateNote(`<b class="u2-b">${Word(n)} forms</b><br>of card, each holding the product's own words. Text on a card reads at ${rt(ctx, M['text-soft'], M.surface)}.`, 403, 72, 224)}
${label(X0, 264, 'With media')}${label(X0 + 24 + lw + 24, 264, 'Without, raised, and a stat')}
${pan(X0, 288, 578, panelIn, { h: 520 })}${T.html}`;
    return kitSheet(ctx, 'cards', { hp: 232, hit: { text: String(n), x: 49, base: 200, size: 200, maxW: 300 } }, innerHtml);
  },

  // Navigation: a slice of the product's desktop with the top bar, sidebar, breadcrumbs and tabs in place, then the phone's tab bar;
  // under them, how each marks the page you are on.
  navigation(ctx) {
    const S = sc(ctx), X = ex(S), ui = ctx.ui;
    const links = X.links || [], tabs = X.tabs || [], crumbs = [...(X.crumbs || []), S.deliverTo];
    const lgw = fitW(ctx, 'colour', 130, 26);
    const logo = `<div style="width:${lgw}px;flex:none">${ctx.logo.html('colour', { width: lgw, colourway: 'colour', label: 'Logo' })}</div>`;
    const top = `<nav class="ui-topbar" aria-label="Main">${logo}<div class="ui-topbar__links">${ui.links(links, 0)}</div></nav>`;
    const side = `<nav class="ui-sidebar" aria-label="Sections">${ui.links(links, 0)}</nav>`;
    const body = `<div style="display:flex;gap:24px;padding:24px;align-items:flex-start">${side}<div class="u2-col" style="flex:1;min-width:0;gap:24px;align-items:stretch">${ui.crumbs(crumbs)}${ui.tabs(tabs, 0)}</div></div>`;
    // the tab bar takes the product's own destinations, the account added when it is not one of them already
    const items = [...links];
    if (X.account && !items.some(([t]) => t === X.account)) items.push([X.account, 'user']);
    const bar = `<nav class="ui-tabbar" aria-label="Sections" style="grid-template-columns:repeat(${items.length},1fr)">${items.map(([t, i], k) => `<a href="#"${k === 0 ? ' aria-current="page"' : ''}>${ui.icon(i || 'chevron-right', 20)}${A(t)}</a>`).join('')}</nav>`;
    const mw = 330;
    const ty = 760;
    const cols = [{ x: 49, w: 130, head: 'Pattern', cls: 'c-note u2-b' }, { x: 185, w: 442, head: 'Marks the page you are on with' }];
    const T = table(ctx, ty, cols, [
      ['Top bar', `A ${val('3 px')} ${val('--action')} bar under the link, the words in ${val('--text')}`],
      ['Sidebar', `A ${val('--surface')} ground and a ${val('3 px')} ${val('--action')} bar on the left`],
      ['Breadcrumbs', `The page itself in ${val('--text')}, not a link`],
      ['Tabs', `A ${val('3 px')} ${val('--action')} bar under the tab; tabs change the view, not the page`],
      ['Tab bar', `A ${val('3 px')} ${val('--action')} bar above it, ${word(items.length)} destinations`],
    ].map((r) => [A(r[0]), r[1]]), { rowH: 22 });
    const n = 5;
    const innerHtml = `${plateLabel('Navigation', 49)}
${plateNote(`<b class="u2-b">${Word(n)} patterns</b><br>for finding the way, each marking the page you are on.`, 49, 72, 272)}
${label(X0, 264, 'Desktop: top bar, sidebar, breadcrumbs and tabs')}
${pan(X0, 288, 578, top + body, { pad: 0 })}
${label(X0, 600, 'Phone: the tab bar')}${pan(X0, 624, mw, bar, { pad: 0 })}
${note(X0 + mw + 24, 624, 578 - mw - 24, `At the foot of a ${val('390 px')} screen, ${val('64 px')} tall. Each destination has an icon and its word.`)}
${T.html}`;
    return kitSheet(ctx, 'navigation', { hp: 232, hit: { text: String(n), x: 403, base: 200, size: 200, maxW: 224 } }, innerHtml);
  },

  // Lists: the product's own list, every row, on one surface, with the parts named above their columns; then rows without a lead,
  // each a link, and a ruled table of the parts.
  lists(ctx) {
    const S = sc(ctx), ui = ctx.ui, M = colourMap(ctx, 'light'), d = S.deliveries || [], n = d.length;
    const pad = 24, x0 = X0 + pad;
    const heads = `${label(x0, 264, 'Lead')}${label(x0 + 52, 264, 'Title and time')}<p class="a c-label nw" style="right:${W - (X1 - pad)}px;top:264px">Price and status</p>`;
    // the list's own top divider is dropped: the panel's key edge already closes it
    const mainWrapped = `<div class="ui u1-pan u2-p" style="left:${X0}px;top:288px;width:578px;padding:4px ${pad}px 0">${ui.deliveryRows(n).replace('class="ui-list"', 'class="ui-list" style="border-top:0"')}</div>`;
    const rowH = 65, mainH = 4 + n * rowH;
    const y2 = 288 + mainH + 48;
    const linkRows = `<ul class="ui-list" style="border-top:0">${d.slice(0, 2).map((x) => ui.row({ title: x.to, sub: x.when, end: x.price, href: '#' })).join('')}</ul>`;
    const lw = 330;
    const second = `<div class="ui u1-pan u2-p" style="left:${X0}px;top:${y2 + 24}px;width:${lw}px;padding:4px ${pad}px 0">${linkRows}</div>`;
    const ty = y2 + 24 + 4 + 2 * rowH + 40;
    const cols = [{ x: 49, w: 106, head: 'Part', cls: 'c-note u2-b' }, { x: 167, w: 224, head: 'Set in' }, { x: 403, w: 224, head: 'On the surface' }];
    const lt = uiT(ctx, 'label'), bt = uiT(ctx, 'body');
    const T = table(ctx, ty, cols, [
      ['Lead', `A ${val('40 px')} circle of ${val('--sunken')}`, ''],
      ['Title', `${val(bt.size + ' px')}, ${val('--text')}`, rt(ctx, M.text, M.surface)],
      ['Time', `${val(lt.size + ' px')}, ${val('--quiet')}, tabular`, rt(ctx, M.quiet, M.surface)],
      ['Status', 'Its own words in one colour', `page ${pg(ctx, 'status')}`],
    ].map((r) => [A(r[0]), r[1], r[2]]), { rowH: 20 });
    const innerHtml = `${plateLabel('Lists')}
${plateNote(`<b class="u2-b">${Word(n)} rows</b><br>from the product's own list, each with a lead, a title, a time and its status.`, 403, 72, 224)}
${heads}${mainWrapped}
${label(X0, y2, 'Without a lead, each row a link')}${second}
${note(X0 + lw + 24, y2 + 24, 578 - lw - 24, `The whole row is the target. A row that opens nothing is a ${val('div')}, never a link.`)}
${T.html}`;
    return kitSheet(ctx, 'lists', { hp: 232, hit: { text: String(n), x: 49, base: 200, size: 200, maxW: 300 } }, innerHtml);
  },

  // Status: every state the product names, in its words, on the light surface and the dark one side by side, with the ratio each reads
  // at and how many rows of the product's list are in it now. The hit is the number of states.
  status(ctx) {
    const S = sc(ctx), ui = ctx.ui, d = S.deliveries || [], st = ctx.status, n = st.length;
    const L = colourMap(ctx, 'light'), Dk = colourMap(ctx, 'dark');
    const cw = 200, nx = X0 + 2 * cw + 24, nw = X1 - nx;
    const cell = (mode, html) => `<div class="ui u2-c"${mode === 'dark' ? ' data-theme="dark"' : ''} style="width:${cw}px;padding:18px 20px">${html}</div>`;
    const count = (id) => d.filter((x) => x.status === id).length;
    const rows = st.map((s) => {
      const lt = statusText(ctx, 'light', s), dt = statusText(ctx, 'dark', s), c = count(s.id);
      const tok = lt.token === dt.token ? val(lt.token) : `${val(lt.token)}, ${val(dt.token)} dark`;
      return `<div class="u2-sr">${cell('light', ui.statusChip(s.id))}${cell('dark', ui.statusChip(s.id))}
<div class="u2-sn" style="width:${nw}px">${tok}<br>${rt(ctx, lt.hex, L.surface)} light, ${rt(ctx, dt.hex, Dk.surface)} dark<br>${c ? `${Word(c)} in the list` : 'None in the list'}</div></div>`;
    });
    // a count badge: the state with the most rows in the list, and how many
    const top = [...st].sort((a, b) => count(b.id) - count(a.id))[0], tc = count(top.id);
    const badge = (mode) => cell(mode, `<span class="u2-row" style="gap:8px">${ui.statusChip(top.id)}<span class="ui-badge">${tc}</span></span>`);
    const bRow = tc ? `<div class="u2-sr">${badge('light')}${badge('dark')}<div class="u2-sn" style="width:${nw}px">A count badge: ${word(tc)} ${tc === 1 ? 'row is' : 'rows are'} in this state. ${val('--action')} under ${val('--action-label')}, ${rt(ctx, L['action-label'], L.action)}</div></div>` : '';
    const innerHtml = `${plateLabel('Status', 49)}
${plateNote(`<b class="u2-b">${Word(n)} states</b><br>the product names, in plain words in one colour, never a tinted pill.`, 49, 72, 272)}
${label(X0, 264, 'Light')}${label(X0 + cw + 24, 264, 'Dark')}${label(nx, 264, 'Token, ratio on the surface')}
<div class="u2-st" style="left:${X0}px;top:288px">${rows.join('')}${bRow}</div>
${note(X0, 1000, 578, `Each ratio is the words on the surface they print on: ${val(L.surface)} light, ${val(Dk.surface)} dark.`)}`;
    return kitSheet(ctx, 'status', { hp: 232, hit: { text: String(n), x: 403, base: 200, size: 200, maxW: 224 } }, innerHtml);
  },

  // Feedback: the alert in each of its four tones, with the product's own messages, then the toast, the inline message and loading;
  // the tones' tokens and ratios as a ruled table between them.
  feedback(ctx) {
    const S = sc(ctx), F = S.form || {}, ui = ctx.ui, M = colourMap(ctx, 'light');
    const tones = [['info', S.pickup], ['success', S.toast], ['warning', S.alert], ['danger', F.readyError]];
    const n = tones.length;
    const alerts = `<div class="u2-col ph-tight" style="gap:16px;align-items:stretch">${tones.map(([t, m]) => ui.alert(t, m)).join('')}</div>`;
    const aH = 24 * 2 + n * 44 + (n - 1) * 16;
    const ty = 288 + aH + 32;
    const cols = [{ x: 49, w: 106, head: 'Tone', cls: 'c-note u2-b' }, { x: 167, w: 106, head: 'Token', cls: 'c-value' }, { x: 285, w: 106, head: 'Value', cls: 'c-value' }, { x: 403, w: 120, head: 'Icon and edge' }, { x: 527, w: 100, head: 'Ratio', right: true, cls: 'c-value' }];
    const T = table(ctx, ty, cols, tones.map(([t]) => [A(t[0].toUpperCase() + t.slice(1)), A('--' + t), A(M[t]), 'On the surface', A(rt(ctx, M[t], M.surface))]), { rowH: 20 });
    const y2 = T.y + 48;
    const panelIn = `<div style="display:flex;gap:32px;align-items:flex-start;justify-content:space-between">
<div class="u2-col" style="gap:20px">${ui.toast(S.toast)}<p class="ui-inline-msg">${ui.icon('info', 16)}${A(S.inline)}</p></div>
<div class="u2-row" style="gap:20px;align-items:flex-start;flex-wrap:nowrap">${ui.spinner()}<div class="u2-col" style="gap:10px">${ui.skeleton('150px')}${ui.skeleton('110px')}${ui.skeleton('130px')}</div></div></div>`;
    const ph = 24 * 2 + 48 + 20 + 20;
    const innerHtml = `${plateLabel('Feedback')}
${plateNote(`<b class="u2-b">${Word(n)} tones</b><br>for an alert. The icon and a ${val('2 px')} edge carry the tone; the words stay in ${val('--text')}.`, 403, 72, 224)}
${label(X0, 264, 'Alerts, in the product\'s own messages')}${pan(X0, 288, 578, alerts, { h: aH })}${T.html}
${label(X0, y2 - 24, 'Toast and inline message')}${label(X0 + 578 - 24 - 150 - 44, y2 - 24, 'Loading')}
${pan(X0, y2, 578, panelIn, { h: ph })}
${note(X0, y2 + ph + 12, 330, 'A toast leaves by itself and keeps its undo. An alert stays until it is dealt with.')}
${note(403, y2 + ph + 12, 224, 'The spinner is for a short wait; a list waits in skeleton lines the shape of its rows.')}`;
    return kitSheet(ctx, 'feedback', { hp: 232, hit: { text: String(n), x: 49, base: 200, size: 200, maxW: 300 } }, innerHtml);
  },
};

// the status page's rows: a light surface cell, a dark one, and the note on paper
const statusCss = `
.pg .u2-st{position:absolute;display:flex;flex-direction:column}
.pg .u2-sr{display:flex;align-items:stretch}
.pg .u2-sr .u2-c{flex:none;display:flex;align-items:center;border-left:.5px solid var(--hair);border-top:.5px solid var(--hair)}
.pg .u2-sr .u2-c+.u2-c{margin-left:24px;border-right:.5px solid var(--hair)}
.pg .u2-sr .u2-c:first-child{border-right:.5px solid var(--hair)}
.pg .u2-st>.u2-sr:last-child .u2-c{border-bottom:.5px solid var(--hair)}
.pg .u2-sn{flex:none;margin-left:12px;padding:12px 0;border-top:.5px solid var(--hair);font:400 12px/17px var(--chrome)}
.pg .u2-st>.u2-sr:last-child .u2-sn{border-bottom:.5px solid var(--hair)}
`;
