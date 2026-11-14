// Theme 32, Dieline, lane u2: the UI kit components (states, buttons, inputs, choices, cards, navigation, lists, status, feedback).
// Every page is a panel (or a run of panels) of the brand's pack, and the real ctx.ui components show through die-cut windows in the board.
// States are forced with the components' own .is-* classes. Rules and values sit on the board beside the window they describe.
// Chrome comes from lane-u1 (read-only): KitPage, panel, kitNet, inner, reach, say, kitCopy, inkOn, textW.
import { KitPage, panel, kitNet, reach, say, kitCopy, inkOn, textW, isSlot } from './lane-u1.js';
import { allocate, wrap, r2, esc } from './geom.js';
import { focusOf } from './lane-fix-focus.js';
import { colourMap, statusText } from '../../engine/tokens.js';

// ---- small shared parts ----
// slot copy inside an attribute, a textarea or an option is turned into plain label text by unmark() in lane-u1
const win = (P, x, y, w, h, html, o) => P.win(x, y, w, h, html, o);
// a caption with only its literal values (tokens, hex, px, ratios) in mono
const VAL = /--[a-z0-9-]+|#[0-9A-Fa-f]{6}\b|\d+(?:\.\d+)?(?::1| px)?/g;
const mixed = (s) => { s = String(s); let o = '', i = 0; for (const m of s.matchAll(VAL)) { o += esc(s.slice(i, m.index)) + `<span class="m">${esc(m[0])}</span>`; i = m.index + m[0].length; } return o + esc(s.slice(i)); };
const ratio = (ctx, a, b) => `${ctx.fmt(ctx.ratio(a, b))}:1`;
// one item of a brand list, through say(): the slot edition gets the descriptor label for that item
const item = (ctx, path, arr, i) => say(ctx, path, arr[i], i + 1);
// the shortest item of a brand list at the control size, so a narrow window holds it on one line
function shortest(ctx, path, arr, size, weight) {
  let k = 0; arr.forEach((s, i) => { if (textW(ctx, 'body', weight, s, size) < textW(ctx, 'body', weight, arr[k], size)) k = i; });
  return item(ctx, path, arr, k);
}
// nav links have no descriptor of their own: in the slot edition each is a numbered link label
const linkLabel = (ctx, s, i) => (isSlot(ctx) ? `⟦Link ${i + 1}⟧` : s);
// the largest size in the list at which a line of display type fits maxW
function fit(ctx, s, sizes, maxW) {
  for (const z of sizes) if (textW(ctx, 'display', ctx.weights.heading, s, z) * 1.01 <= maxW) return z;
  return sizes[sizes.length - 1];
}
// a display word on a field or the ground, sized to fit
function word(P, x, y, w, s, sizes, col) {
  const z = fit(P.ctx, s, sizes, w);
  P.text(x, y, w, z, 'disp', esc(s), `font-size:${z}px;line-height:${z}px;letter-spacing:-.01em;color:${col}`);
  return z;
}
// a wrapped caption in the chrome face; returns its height
function cap(P, x, y, w, s, col, { size = 14, lh = 20, weight = 400, align = 'left' } = {}) {
  const rows = String(s).includes('⟦') ? [s] : wrap(P.ctx, 'chrome', weight, s, size, w);
  P.text(x, y, w, rows.length * lh, 'cap wrap', rows.map(mixed).join('<br>'), `font-size:${size}px;line-height:${lh}px;font-weight:${weight};color:${col};text-align:${align}`);
  return rows.length * lh;
}
// body copy on a field or the ground; returns its height
const body = (P, x, y, w, s, col, size = 14, lh = 20) => P.para(x, y, w, 'b-small', 'body', P.ctx.weights.regular, size, lh, s, `font-size:${size}px;color:${col}`);
const uiT = (ctx, tok) => ctx.uiType.find((t) => t.token === tok) || { size: 15, line: 20, weight: ctx.weights.medium };
const ctlPad = (ctx) => (ctx.space[4] || ctx.space[ctx.space.length - 1]).px;
// the outer width of a button at its real size
const btnW = (ctx, s, { sm, lg } = {}) => { const t = uiT(ctx, sm ? 'label' : 'control'); return textW(ctx, 'body', t.weight, s, t.size) + 2 * (sm ? ctx.space[3].px : lg ? ctx.space[5].px : ctlPad(ctx)) + 2; };

// the large button in a narrow window: the main label with its arrow, else without it, else the brand's short action
function large(ctx, book, E, max) {
  const w = btnW(ctx, book, { lg: true });
  if (w + 26 <= max) return ctx.ui.btn(book, { size: 'lg', iconRight: 'arrow-right' });
  if (w <= max) return ctx.ui.btn(book, { size: 'lg' });
  return ctx.ui.btn(say(ctx, 'ui.screen.content.example.small', E.small), { size: 'lg', iconRight: 'arrow-right' });
}
const tB = (kind) => (kind === 'bag' ? 88 : 48), bB = (kind) => (kind === 'bag' ? 56 : kind === 'satchel' ? 40 : 32);

// ---- the pages ----
export const uikit = {
  // the states as a run of panels: one panel a state, rest to error, folded left to right, the same four controls in each window
  states(ctx) {
    const P = new KitPage(ctx, 'states'), { R, kind } = P, ui = ctx.ui, S = kitCopy(ctx), E = ctx.brand.ui.screen.content.example || {}, F = ctx.brand.ui.screen.content.form;
    const M = colourMap(ctx, 'light'), gi = R.groundText, hex = R.front.hex, ink = inkOn(P, hex);
    const ctl = uiT(ctx, 'control'), lab = uiT(ctx, 'label');
    const go = shortest(ctx, 'ui.screen.content.example.small', [E.small || F.book], ctl.size, ctl.weight);
    const sec = say(ctx, 'ui.screen.content.example.secondary', E.secondary || F.book);
    const chk = shortest(ctx, 'ui.screen.content.example.checks.*', E.checks || [F.size], ctl.size, ctx.weights.regular);
    const fl = say(ctx, 'ui.screen.content.form.ready', F.ready), fv = say(ctx, 'ui.screen.content.form.readyValue', F.readyValue), fe = say(ctx, 'ui.screen.content.form.readyError', F.readyError);
    const cols = [
      ['Rest', [ui.btn(go), ui.btn(sec, { variant: 'secondary' }), ui.check(chk, { name: 'u2s1' }), ui.field({ id: 'u2-s1', label: fl, value: fv })],
        'What a control looks like before anyone touches it. Every control is 44 px tall.'],
      ['Hover', [ui.btn(go, { state: 'hover' }), ui.btn(sec, { variant: 'secondary', state: 'hover' }), '', ''],
        `The fill steps to ${M['action-hover']}. An outlined button fills --sunken. Fields and boxes do not change.`],
      ['Focus', [ui.btn(go, { state: 'focus' }), ui.btn(sec, { variant: 'secondary', state: 'focus' }), ui.check(chk, { name: 'u2s3', state: 'focus' }), ui.field({ id: 'u2-s3', label: fl, value: fv, state: 'focus' })],
        `A ${ctx.borders[2].px} px ring in --focus on a 2 px gap, on every control the keyboard reaches.`],
      ['Pressed', [ui.btn(go, { state: 'pressed' }), ui.btn(sec, { variant: 'secondary', state: 'pressed' }), '', ''],
        `The fill goes to ${M['action-pressed']} and the button scales to 0.97 for 120 ms.`],
      ['Disabled', ['', ui.btn(sec, { variant: 'secondary', state: 'disabled' }), ui.check(chk, { name: 'u2s5', disabled: true }), ui.field({ id: 'u2-s5', label: fl, value: fv, disabled: true })],
        'A --disabled-bg fill and --disabled-text type. The main action is never shown disabled.'],
      ['Error', ['', '', '', ui.field({ id: 'u2-s6', label: fl, value: fv, error: fe })],
        'A --danger edge, and a message under the field that says what to enter.'],
    ];
    const sx = kind === 'box' ? 72 : 56, ws = allocate(cols.map(() => 1), 1040 - sx, 120);
    const t = kind === 'bag' ? 88 : 48, b = kind === 'bag' ? 56 : kind === 'satchel' ? 40 : 32;
    const innerW = Math.min(...ws) - 48;
    const errRows = String(fe).includes('⟦') ? 1 : wrap(ctx, 'body', ctx.weights.medium, fe, lab.size, innerW).length;
    const winH = 24 + 44 * 3 + 12 * 3 + (lab.line + 6 + 44) + 6 + Math.ceil(errRows * lab.size * 1.4) + 4;
    const y0 = P.y0, wy = y0 + t + 52, y1 = wy + winH + 16 + b;
    const { xs } = kitNet(P, cols.map(() => ({ w: ws[0], hex })).map((c, i) => ({ ...c, w: ws[i] })), y0, y1);
    const down = reach(kind, true).down;
    cols.forEach(([name, cells, rule], i) => {
      const x = xs[i], w = ws[i];
      word(P, x + 16, y0 + t, w - 32, name, [28, 24, 20], ink);
      win(P, x + 12, wy, w - 24, winH, `<div class="u2-st">${cells.map((c) => `<div>${c}</div>`).join('')}</div>`, { on: hex, pad: 12 });
      cap(P, x + 12, y1 + down + 32, w - 24, rule, gi.ink, { size: 13, lh: 20 });
    });
    return P.html(hex);
  },

  // the main button through one large window, drawn up so its parts can be read; its states below it; the other kinds down the board
  buttons(ctx) {
    const P = new KitPage(ctx, 'buttons'), { R } = P, ui = ctx.ui, S = kitCopy(ctx), E = ctx.brand.ui.screen.content.example || {}, M = colourMap(ctx, 'light');
    const hex = R.back.hex, ink = inkOn(P, hex), gi = R.groundText, inn = P.inn, ctl = uiT(ctx, 'control');
    const g = panel(P, 'back', hex);
    const book = S.form.book, pad = ctlPad(ctx), bw = btnW(ctx, book);
    // the big window: the button at the largest half step that fits, up to three times
    const ww = g.x1 - 80, z = Math.max(1, Math.min(3, Math.floor(((ww - 96) / bw) * 2) / 2)), wh = Math.round(44 * z + 128);
    win(P, 40, inn.top, ww, wh, `<div class="u2-zw"><div style="zoom:${z}">${ui.btn(book)}</div></div>`, { on: hex, pad: 0 });
    let y = inn.top + wh + 16;
    P.text(40, y, ww, 16, 'm', `${z === 1 ? 'Actual size' : `Drawn at ${z}x`}&nbsp; 44 px tall&nbsp; ${pad} px padding&nbsp; ${ctx.radii[0].px} px radius`, `color:${ink}`);
    y += 20;
    P.text(40, y, ww, 20, 'cap', mixed(`${ctx.brand.fonts.body.family} ${ctl.weight} at ${ctl.size} px. The label reads ${ratio(ctx, M['action-label'], M.action)} on --action.`), `color:${ink}`);
    // the states of the main button, at real size, each named under it inside the window
    y += 20 + 40;
    const st = [['hover', 'Hover', M['action-hover']], ['focus', 'Focus', `${ctx.borders[2].px} px ring`], ['pressed', 'Pressed', M['action-pressed']]];
    const sh = 44 + 8 + 16 + 48;
    if (y + sh <= inn.bot) {
      win(P, 40, y, ww, sh, `<div class="u2-row3">${st.map(([s, n, v]) => `<div class="u2-cell">${ui.btn(book, { state: s })}<span class="u2-k">${esc(n)}, <span class="u2-v">${esc(v)}</span></span></div>`).join('')}</div>`, { on: hex, pad: 24 });
    }
    // the other kinds, down the board to the right of the fold
    const rx = g.x1 + (g.fin ? 14 : 0) + 40, rw = 1040 - rx;
    const kinds = [
      [ui.btn(say(ctx, 'ui.screen.content.example.secondary', E.secondary), { variant: 'secondary' }), 44, 'Secondary', `A ${ctx.borders[1].px} px --text edge, no fill.`],
      [ui.btn(say(ctx, 'ui.screen.content.example.quiet', E.quiet), { variant: 'quiet' }), 44, 'Quiet', 'Underlined, no fill.'],
      [ui.btn(say(ctx, 'ui.screen.content.example.danger', E.danger), { variant: 'danger' }), 44, 'Danger', 'Only for what cannot be undone.'],
      [ui.btn(say(ctx, 'ui.screen.content.example.small', E.small), { size: 'sm', variant: 'secondary' }), 36, 'Small, 36 px', 'Inside rows and cards.'],
      [large(ctx, book, E, rw - 32), 52, 'Large, 52 px', 'One a screen, at most.'],
    ];
    let ky = inn.top;
    for (const [html, h, n, use] of kinds) {
      win(P, rx, ky, rw, h + 32, `<div class="u2-c">${html}</div>`, { pad: 16 });
      ky += h + 32 + 10;
      P.text(rx, ky, rw, 20, 'cap', `<span style="font-weight:500">${esc(n)}.</span> ${mixed(use)}`, `color:${gi.ink}`);
      ky += 20 + 22;
    }
    return P.html(hex);
  },

  // the gusset as a column of windows: one text field through its five states, top to bottom; the rule for each on the board beside it
  inputs(ctx) {
    const P = new KitPage(ctx, 'inputs'), { R } = P, ui = ctx.ui, S = kitCopy(ctx), F = ctx.brand.ui.screen.content.form;
    const hex = R.side.hex, gi = R.groundText, inn = P.inn, lab = uiT(ctx, 'label'), capT = uiT(ctx, 'caption');
    const x0 = 380, x1 = 740;
    panel(P, 'side', hex, { x0, x1, near: [[40, x0], [x1, 1040]], far: [] });
    const wx = x0 + 40, ww = x1 - x0 - 80, iw = ww - 32, base = lab.line + 6 + 44;
    const errLines = (s, w) => (String(s).includes('⟦') ? 1 : wrap(ctx, 'body', ctx.weights.medium, s, lab.size, w).length);
    const fe = say(ctx, 'ui.screen.content.form.readyError', F.readyError);
    const pk = { label: S.form.pickup }, pv = S.form.pickupValue;
    const rows = [
      ['Rest', ui.field({ id: 'u2-i1', ...pk }), base, 'Empty, with the label above it. A hint inside the field is never the only label.'],
      ['Focus', ui.field({ id: 'u2-i2', ...pk, state: 'focus' }), base, `The edge goes to --text and a ${ctx.borders[2].px} px --focus ring sits outside it.`],
      ['Filled', ui.field({ id: 'u2-i3', ...pk, value: pv }), base, 'The value in --text. Nothing else changes.'],
      ['Error', ui.field({ id: 'u2-i4', label: say(ctx, 'ui.screen.content.form.ready', F.ready), value: say(ctx, 'ui.screen.content.form.readyValue', F.readyValue), error: fe }), base + 6 + Math.ceil(errLines(fe, iw) * lab.size * 1.4), 'A --danger edge. The message under it says what to enter, not what went wrong.'],
      ['Disabled', ui.field({ id: 'u2-i5', ...pk, value: pv, disabled: true }), base, 'A --disabled-bg fill and no edge. Say nearby why it is locked.'],
    ];
    const total = rows.reduce((s, r) => s + r[2] + 32, 0), gap = Math.max(12, Math.min(28, Math.floor((inn.bot - inn.top - total) / (rows.length - 1))));
    let y = inn.top;
    for (const [n, html, h, rule] of rows) {
      win(P, wx, y, ww, h + 32, html, { on: hex, pad: 16 });
      P.text(40, y + 14, x0 - 80, 20, 'cap', esc(n), `color:${gi.ink};font-weight:500;text-align:right`);
      cap(P, 40, y + 38, x0 - 80, rule, gi.quiet, { size: 13, lh: 20, align: 'right' });
      y += h + 32 + gap;
    }
    // the select and the text area, on the board to the right
    const rx = x1 + 40, rw = 1040 - rx, sz = F.sizes || [];
    const opts = sz.map((s, i) => item(ctx, 'ui.screen.content.form.sizes.*', sz, i));
    let ry = inn.top;
    win(P, rx, ry, rw, base + 32, ui.field({ id: 'u2-i6', label: say(ctx, 'ui.screen.content.form.size', F.size), kind: 'select', options: opts, value: opts[1] || opts[0] }), { pad: 16 });
    ry += base + 32 + 12;
    ry += cap(P, rx, ry, rw, 'Select. The chevron is drawn in --quiet, in both modes.', gi.ink, { size: 13 }) + 32;
    const help = S.form.notesHelp, hl = String(help).includes('⟦') ? 1 : wrap(ctx, 'body', ctx.weights.regular, help, capT.size, rw - 32).length;
    const th = lab.line + 6 + 96 + 6 + hl * capT.line;
    win(P, rx, ry, rw, th + 32, ui.field({ id: 'u2-i7', label: S.form.notes, kind: 'textarea', help }), { pad: 16 });
    ry += th + 32 + 12;
    cap(P, rx, ry, rw, 'Text area. 96 px to start, and it grows with the words. The hint sits under it and turns into the error when there is one.', gi.ink, { size: 13 });
    return P.html(hex);
  },

  // the choices in one window on the flap colour, a row a state; the state names on the board, level with their rows
  choices(ctx) {
    const P = new KitPage(ctx, 'choices'), { R } = P, ui = ctx.ui, E = ctx.brand.ui.screen.content.example || {}, F = ctx.brand.ui.screen.content.form;
    const hex = R.flap.hex, ink = inkOn(P, hex), gi = R.groundText, inn = P.inn, ctl = uiT(ctx, 'control'), wr = ctx.weights.regular;
    const x0 = 420;
    panel(P, 'front', hex, { x0, near: [[40, x0]], far: [] });
    const ck = shortest(ctx, 'ui.screen.content.example.checks.*', E.checks || [F.size], ctl.size, wr);
    const rd = shortest(ctx, 'ui.screen.content.example.radios.*', E.radios || [F.size], ctl.size, wr);
    const sw = shortest(ctx, 'ui.screen.content.example.switches.*', E.switches || [F.size], ctl.size, wr);
    const st = [
      ['Off', {}, ''],
      ['On', { checked: true }, 'A box and a radio fill with --text. A switch fills with --action and its knob slides across.'],
      ['Focus', { checked: true, state: 'focus' }, `The same ${ctx.borders[2].px} px ring as every other control.`],
      ['Disabled', { disabled: true }, 'A --disabled-bg fill, and the label in --disabled-text.'],
      ['Disabled, on', { disabled: true, checked: true }, 'Kept as it was, and locked.'],
    ];
    const RH = 52, wx = x0 + 40, ww = 1000 - wx, head = 16 + 12;
    const cells = st.map(([, o], k) => [ui.check(ck, { ...o, name: 'u2c' + k }), ui.check(rd, { ...o, type: 'radio', name: 'u2r' + k }), ui.switch(sw, o)]);
    const wh = 48 + head + st.length * RH;
    win(P, wx, inn.top, ww, wh, `<div class="u2-ch" style="grid-auto-rows:${RH}px"><span class="u2-k">Checkbox</span><span class="u2-k">Radio</span><span class="u2-k">Switch</span>${cells.flat().map((c) => `<div>${c}</div>`).join('')}</div>`, { on: hex, pad: 24 });
    const lx = 40, lw = x0 - 80;
    st.forEach(([n, , rule], k) => {
      const ry = inn.top + 24 + head + k * RH + (rule ? 2 : 16);
      P.text(lx, ry, lw, 20, 'cap', esc(n), `color:${gi.ink};font-weight:500`);
      if (rule) cap(P, lx, ry + 20, lw, rule, gi.quiet, { size: 13, lh: 16 });
    });
    // the segmented control: one choice of a few, always one chosen
    const sy = inn.top + wh + 48, sh = 48 + 40 + 24 + 40;
    const sizes = (F.sizes || []).map((s, i) => item(ctx, 'ui.screen.content.form.sizes.*', F.sizes, i));
    if (sy + sh <= inn.bot) {
      win(P, wx, sy, ww, sh, `<div class="u2-col" style="gap:24px">${ui.segmented(sizes, 1)}${ui.segmented(sizes, 1, { disabled: true })}</div>`, { on: hex, pad: 24 });
      P.text(lx, sy + 24 + 10, lw, 20, 'cap', 'Segmented', `color:${gi.ink};font-weight:500`);
      P.text(lx, sy + 24 + 64 + 10, lw, 20, 'cap', 'Segmented, disabled', `color:${gi.ink};font-weight:500`);
      cap(P, wx, sy + sh + 16, ww, 'One of a few, always one chosen. The chosen part fills with --text.', ink, { size: 13 });
    }
    return P.html(hex);
  },

  // a card with media through the big window on the back panel; the plain, raised and stat cards down the board beside it
  cards(ctx) {
    const P = new KitPage(ctx, 'cards'), { R } = P, ui = ctx.ui, S = kitCopy(ctx), C = ctx.brand.ui.screen.content, E = C.example || {};
    const hex = R.side.hex, ink = inkOn(P, hex), gi = R.groundText, inn = P.inn;
    const g = panel(P, 'back', hex, { x1: 620, near: [[634, 1000]], far: [] });
    const lab = uiT(ctx, 'label'), tS = uiT(ctx, 'title-s'), bd = uiT(ctx, 'body');
    // the height of a card body at a width: meta, title, text and an optional small button, each wrapped at its real size
    const lines = (s, role, wt, size, w) => (String(s).includes('⟦') ? 1 : wrap(ctx, role, wt, s, size, w).length);
    const bodyH = (w, { title, text, action }) => 32 + lab.line + 6 + lines(title, 'display', ctx.weights.heading, tS.size, w) * tS.line + (text ? 6 + lines(text, 'body', ctx.weights.regular, bd.size, w) * Math.ceil(bd.size * 1.5) : 0) + (action ? 6 + 36 : 0) + 2;
    // the photo: the brand's first shot that exists; until one is shot (and in the slot edition), the media is a --sunken slot with its brief
    const shots = ctx.brand.imagery.shots || [], shot = !isSlot(ctx) && shots.find((s) => s.photo);
    const media = shot ? ctx.photo(shot.id, { cls: 'ui-card__media', pos: focusOf(shot.id) }) : `<div class="ui-card__media u2-slot" role="img" aria-label="Photo slot"><span>${esc(say(ctx, 'imagery.shots.*.slot', (shots[0] || {}).slot || '', 1))}</span></div>`;
    const mw = 540, cw = mw - 48 - 2, mh = Math.round(cw * 9 / 16);
    const big = { meta: S.status, title: S.eta, text: S.pickup, action: `<div>${ui.btn(say(ctx, 'ui.screen.content.example.secondary', E.secondary), { variant: 'secondary', size: 'sm' })}</div>` };
    const bh = 48 + mh + bodyH(cw - 32, big);
    win(P, 40, inn.top, mw, bh, `<div class="u2-card">${ui.card({ ...big, media })}</div>`, { on: hex, pad: 24 });
    cap(P, 40, inn.top + bh + 16, mw, shot ? 'With media. The photo takes 16:9, and the card keeps its hairline edge.' : 'With media. The photo takes 16:9. Until it is shot, the card holds a --sunken slot with the brief.', ink, { size: 13 });
    // the others, on the board right of the fold
    const rx = g.x1 + (g.fin ? 14 : 0) + 40, rw = 1040 - rx, iw = rw - 32 - 2 - 32;
    const plain = { meta: S.status, title: S.rider, text: S.riderNote };
    const raised = { meta: say(ctx, 'ui.screen.content.deliverToLabel', C.deliverToLabel), title: S.deliverTo, text: S.eta, raised: true };
    const items = [
      [ui.card(plain), bodyH(iw, plain), 'Plain', 'Meta, a title and one line, on --surface.'],
      [ui.card(raised), bodyH(iw, raised), 'Raised', 'A --raised ground and no edge, for a second level.'],
      [ui.stat(S.paid, say(ctx, 'ui.screen.content.example.statLabel', E.statLabel || C.paidLabel)), 32 + uiT(ctx, 'title').line + 4 + lab.line + 2, 'Stat', 'One number and what it counts.'],
    ];
    let y = inn.top;
    for (const [html, h, n, use] of items) {
      win(P, rx, y, rw, h + 32, `<div class="u2-card">${html}</div>`, { pad: 16 });
      y += h + 32 + 10;
      P.text(rx, y, rw, 20, 'cap', `<span style="font-weight:500">${esc(n)}.</span> ${mixed(use)}`, `color:${gi.ink}`);
      y += 20 + 28;
    }
    return P.html(hex);
  },

  // the top bar runs across a band of the board like a header strip; the sidebar stands in a gusset under it; tabs, crumbs and the phone bar beside it
  navigation(ctx) {
    const P = new KitPage(ctx, 'navigation'), { R, kind } = P, ui = ctx.ui, C = ctx.brand.ui.screen.content, E = C.example || {};
    const gi = R.groundText, M = colourMap(ctx, 'light'), up = reach(kind, true).up, down = reach(kind, true).down;
    const links = (E.links || [['Track', 'map-pin']]).map(([t, i], k) => [linkLabel(ctx, t, k), i]);
    const nav = [...links, [say(ctx, 'ui.screen.content.example.account', E.account || ''), 'user']].filter((l) => l[0]).slice(0, 4);
    // the band: a full-width panel holding the top bar at its real height
    const A = R.back.hex, a0 = P.y0, ay = a0 + tB(kind), a1 = ay + 56 + bB(kind);
    panel(P, 'base', A, { x0: 40, x1: 1040, y0: a0, y1: a1, l: 'cut', r: 'cut', near: [], far: [] });
    const asp = ctx.logo.geo.aspect, lw = Math.min(160, 28 * asp);
    const logo = ctx.logo.html('colour', { width: lw, colourway: R.colourwayOn(M.surface), color: M.text });
    win(P, 80, ay, 920, 56, `<nav class="ui-topbar u2-top" aria-label="Main"><span class="u2-logo" style="width:${r2(lw)}px">${logo}</span><div class="ui-topbar__links">${ui.links(nav, 0)}</div></nav>`, { on: A, pad: 0 });
    const cy = a1 + down + 16;
    cap(P, 80, cy, 920, 'Top bar. The page you are on has a 3 px --action bar under it. Links are 44 px tall.', gi.ink, { size: 13 });
    // the gusset: the sidebar, at its real width
    const B = R.front.hex, bink = inkOn(P, B), b0 = cy + 20 + 32 + up, by = b0 + tB(kind), sh = 24 + nav.length * 44 + (nav.length - 1) * 2 + 32;
    const b1 = by + sh + 16 + 20 + bB(kind);
    panel(P, 'side', B, { x0: 40, x1: 400, y0: b0, y1: b1, l: 'cut', r: 'fold', near: [], far: [] });
    win(P, 80, by, 252, sh, `<nav class="ui-sidebar" aria-label="Sections">${ui.links(nav, 0)}</nav>`, { on: B, pad: 16 });
    cap(P, 80, by + sh + 16, 280, 'Sidebar. A bar on the left marks the page.', bink, { size: 13 });
    // the board to the right: tabs, breadcrumbs and the phone's tab bar at 390 px
    const rx = 440, rw = 600;
    let y = cy + 20 + 40;
    const tabs = (E.tabs || []).map((t, i) => item(ctx, 'ui.screen.content.example.tabs.*', E.tabs, i));
    const crumbs = [...(E.crumbs || []).map((t, i) => item(ctx, 'ui.screen.content.example.crumbs.*', E.crumbs, i)), say(ctx, 'ui.screen.content.deliveries.*.to', C.deliveries[0].to, 1)];
    const parts = [
      [ui.tabs(tabs, 0), 44, 16, rw, 'Tabs switch views of one list. They do not change the page.'],
      [ui.crumbs(crumbs), 20, 16, rw, 'Breadcrumbs. Quiet, with the page you are on in full --text.'],
      [`<nav class="ui-tabbar" aria-label="Sections">${nav.map(([t, i], k) => `<a href="#"${k === 0 ? ' aria-current="page"' : ''}>${ui.icon(i, 20)}${esc(t)}</a>`).join('')}</nav>`, 64, 0, 390, 'The tab bar on a phone, at 390 px. Four places at most, 64 px tall.'],
    ];
    for (const [html, h, pad, w, use] of parts) {
      if (y + h + 2 * pad + 40 > 996) break;
      win(P, rx, y, w, h + 2 * pad, html, { pad });
      y += h + 2 * pad + 12;
      y += cap(P, rx, y, rw, use, gi.ink, { size: 13 }) + 32;
    }
    return P.html('all');
  },

  // one long window of rows on the front; the two smaller kinds of row under it; the rules on the board to the left
  lists(ctx) {
    const P = new KitPage(ctx, 'lists'), { R } = P, ui = ctx.ui, S = kitCopy(ctx), C = ctx.brand.ui.screen.content;
    const hex = R.front.hex, ink = inkOn(P, hex), gi = R.groundText, inn = P.inn;
    const g = panel(P, 'front', hex, { far: [] });
    const D = C.deliveries || [], p = 'ui.screen.content.deliveries.*.';
    const d = D.map((x, i) => ({ to: say(ctx, p + 'to', x.to, i + 1), when: say(ctx, p + 'when', x.when, i + 1), price: say(ctx, p + 'price', x.price, i + 1), status: x.status, icon: x.icon }));
    const icon = (x) => ui.icon(x.icon || ctx.brand.ui.rowIcon || 'package', 18);
    const n = Math.min(5, d.length), wx = g.x0 + 40, ww = 1000 - wx;
    const mh = 32 + 1 + n * 64 + 12;
    win(P, wx, inn.top, ww, mh, `<ul class="ui-list">${d.slice(0, n).map((x) => ui.row({ lead: icon(x), title: x.to, sub: x.when, end: x.price, chip: ui.statusChip(x.status, { label: S.st(x.status) }) })).join('')}</ul>`, { on: hex, pad: 16 });
    let y = inn.top + mh + 12;
    cap(P, wx, y, ww, 'With a lead icon, a price and a status. The lead sits on a --sunken circle.', ink, { size: 13 });
    y += 20 + 40;
    const hw = Math.floor((ww - 40) / 2), h2 = 32 + 1 + 2 * 64, h1 = 32 + 1 + 64;
    if (y + h2 + 32 <= inn.bot) {
      win(P, wx, y, hw, h2, `<ul class="ui-list">${d.slice(0, 2).map((x) => ui.row({ title: x.to, sub: x.when, end: x.price })).join('')}</ul>`, { on: hex, pad: 16 });
      cap(P, wx, y + h2 + 12, hw, 'Without a lead, for a short list.', ink, { size: 13 });
      win(P, wx + hw + 40, y, hw, h1, `<ul class="ui-list">${ui.row({ lead: icon(d[0]), title: d[0].to, sub: d[0].when, end: d[0].price, href: '#' })}</ul>`, { on: hex, pad: 16 });
      cap(P, wx + hw + 40, y + h1 + 12, hw, 'As a link. The whole row is the target.', ink, { size: 13 });
    }
    // the rules, on the board left of the fold
    let ry = inn.top;
    for (const s of ['One row is one thing. The title says what it is, the line under it says when.', 'The status is the only colour in a row, and it is always words.', 'Prices and times use tabular figures, so a column lines up.']) {
      ry += body(P, 40, ry, g.x0 - 80, s, gi.ink, 14, 20) + 20;
    }
    return P.html(hex);
  },

  // a band across the sheet like a tamper strip: every status in the light window and the dark one, its ratio beside it; the token and the use below
  status(ctx) {
    const P = new KitPage(ctx, 'status'), { R, kind } = P, ui = ctx.ui, S = kitCopy(ctx), C = ctx.brand.ui.screen.content, E = C.example || {};
    const hex = R.back.hex, gi = R.groundText, ML = colourMap(ctx, 'light'), MD = colourMap(ctx, 'dark'), up = reach(kind, true).up, down = reach(kind, true).down;
    const y0 = Math.max(P.y0, 216 + up), wy = y0 + tB(kind), RH = 40, rows = ctx.status.length;
    const open = (C.deliveries || []).filter((x) => ['booked', 'on-the-way', 'late'].includes(x.status)).length;
    const wh = 48 + 16 + 12 + rows * RH + (open ? RH + 8 : 0), y1 = wy + wh + bB(kind);
    panel(P, 'base', hex, { x0: 40, x1: 1040, y0, y1, l: 'cut', r: 'cut', near: [], far: [] });
    const side = (mode, M) => {
      const rowsH = ctx.status.map((s, i) => { const t = statusText(ctx, mode, s); return `<div class="u2-sr">${ui.statusChip(s.id, { label: S.st(s.id) })}<span class="u2-v">${esc(ratio(ctx, t.hex, M.surface))}</span></div>`; }).join('');
      const badge = open && mode === 'light' ? `<div class="u2-sr u2-sr--b"><span class="u2-bd">${esc(item(ctx, 'ui.screen.content.example.tabs.*', E.tabs || [''], 0))}<span class="ui-badge">${open}</span></span><span class="u2-k">Count badge</span></div>` : '';
      return `<span class="u2-k">${mode === 'light' ? 'Light' : 'Dark'}, on --surface ${esc(M.surface)}</span><div class="u2-srs">${rowsH}${badge}</div>`;
    };
    win(P, 80, wy, 420, wh, side('light', ML), { on: hex, pad: 24 });
    win(P, 540, wy, 420, wh, side('dark', MD), { on: hex, pad: 24, dark: true });
    // above the band: what a status is; below it: each status's token and when to use it
    body(P, 40, 96, 520, 'A status is words in one colour, never a filled pill. Each one reads on the light surface and the dark one, at the ratio beside it.', gi.ink, 15, 24);
    const use = { action: 'The live state, and the only one in the action colour.', info: 'Booked, and still to come.', success: 'Done. The label says when.', warning: 'Behind what we said. The label says by how much.', danger: 'Nothing happened. Offer the next step beside it.', neutral: 'Kept for the record.' };
    const cw = Math.floor((1000 - 40 * (rows - 1)) / rows), ty = y1 + down + 32;
    ctx.status.forEach((s, i) => {
      const x = 40 + i * (cw + 40), L = statusText(ctx, 'light', s), Dk = statusText(ctx, 'dark', s);
      let yy = ty;
      yy += cap(P, x, yy, cw, L.token === Dk.token ? L.token : `${L.token} light, ${Dk.token} dark`, gi.ink, { size: 12, lh: 16 }) + 4;
      cap(P, x, yy, cw, use[s.tone] || use.neutral, gi.quiet, { size: 13, lh: 20 });
    });
    return P.html(hex);
  },

  // the alerts as a run of panels, one tone a panel; the toast, the inline message and loading on the board under the run
  feedback(ctx) {
    const P = new KitPage(ctx, 'feedback'), { R, kind } = P, ui = ctx.ui, S = kitCopy(ctx), C = ctx.brand.ui.screen.content, M = colourMap(ctx, 'light');
    const gi = R.groundText, down = reach(kind, true).down, bd = uiT(ctx, 'body');
    const tones = [['info', 'Info', S.pickup], ['success', 'Success', say(ctx, 'ui.screen.content.toast', C.toast)], ['warning', 'Warning', say(ctx, 'ui.screen.content.alert', C.alert)], ['danger', 'Danger', say(ctx, 'ui.screen.content.form.readyError', C.form.readyError)]];
    const cols = R.order.filter((c) => !R.isGround(c.hex)), hexes = tones.map((t, i) => cols[i % cols.length].hex);
    const sx = kind === 'box' ? 72 : 56, ws = allocate(tones.map(() => 1), 1040 - sx, 160);
    const tw = Math.min(...ws) - 32 - 48 - 14 - 32;
    const lh = Math.ceil(bd.size * 1.5), most = Math.max(...tones.map((t) => (String(t[2]).includes('⟦') ? 1 : wrap(ctx, 'body', ctx.weights.regular, t[2], bd.size, tw).length)));
    const y0 = P.y0, wy = y0 + tB(kind) + 48, wh = 48 + 20 + most * lh, y1 = wy + wh + 16 + bB(kind);
    const { xs } = kitNet(P, tones.map((t, i) => ({ w: ws[i], hex: hexes[i] })), y0, y1);
    tones.forEach(([tone, name, text], i) => {
      const x = xs[i], w = ws[i], ink = inkOn(P, hexes[i]);
      word(P, x + 16, y0 + tB(kind), w - 32, name, [28, 24, 20], ink);
      win(P, x + 16, wy, w - 32, wh, ui.alert(tone, text), { on: hexes[i], pad: 24 });
      cap(P, x + 16, y1 + down + 24, w - 32, `A 2 px --${tone} edge and icon, ${ratio(ctx, M[tone], M.surface)} on --surface. The words stay --text.`, gi.ink, { size: 13 });
    });
    // under the run: the toast, the inline message and the two kinds of loading, each in its own window
    const y = y1 + down + 24 + 60 + 32, h = Math.min(160, 996 - 80 - y);
    const items = [
      [400, ui.toast(say(ctx, 'ui.screen.content.toast', C.toast)), 'Toast. At the foot of the screen, gone in five seconds. Undo stays in reach of the keyboard.'],
      [260, `<p class="ui-inline-msg">${ui.icon('info', 16)}<span>${esc(say(ctx, 'ui.screen.content.inline', C.inline))}</span></p>`, 'Inline message. Next to the thing it is about.'],
      [260, `<div class="u2-load">${ui.spinner()}<div class="u2-col" style="gap:10px;flex:1">${ui.skeleton('100%')}${ui.skeleton('70%')}${ui.skeleton('85%')}</div></div>`, 'Loading. A spinner for a short wait; skeleton lines in the shape of the rows for a list.'],
    ];
    let x = 40;
    if (h >= 96) for (const [w, html, use] of items) {
      win(P, x, y, w, h, `<div class="u2-c u2-wrap">${html}</div>`, { pad: 24 });
      cap(P, x, y + h + 12, w, use, gi.ink, { size: 13 });
      x += w + 40;
    }
    return P.html('all');
  },
};

// ---- css: this lane's parts only (u1 carries the kit tokens and componentsCss), all under .pg with the u2- prefix ----
export function css(ctx) {
  return `
.pg .u2-st{display:grid;grid-template-rows:44px 44px 44px auto;row-gap:12px;align-items:center}
.pg .u2-st>div{min-width:0;display:flex;align-items:center}
.pg .u2-st>div:last-child{align-items:flex-start;align-self:start}
.pg .u2-st>div:last-child>.ui-field{width:100%}
.pg .u2-st .ui-choice span,.pg .u2-st .ui-error{white-space:normal}
.pg .u2-zw{display:flex;align-items:center;height:100%;padding-left:48px}
.pg .u2-row3{display:grid;grid-template-columns:repeat(3,max-content);column-gap:40px}
.pg .u2-cell{display:flex;flex-direction:column;align-items:flex-start;gap:8px}
.pg .u2-k{font:400 13px/16px var(--chrome);color:var(--quiet);white-space:nowrap}
.pg .u2-v{font:400 12px/16px var(--val)}
.pg .u2-c{display:flex;align-items:center;height:100%}
.pg .u2-col{display:flex;flex-direction:column;align-items:flex-start}
.pg .u2-ch{display:grid;grid-template-columns:repeat(3,max-content);column-gap:40px;grid-template-rows:28px;align-items:center}
.pg .u2-ch>.u2-k{align-self:start}
.pg .u2-card{display:flex;flex-direction:column;height:100%}.pg .u2-card>.ui-card,.pg .u2-card>.ui-stat{flex:1}
.pg .u2-card img.ui-card__media{position:static}
.pg .u2-slot{display:flex;align-items:flex-end;padding:16px;white-space:normal}
.pg .u2-slot>span{font:400 13px/18px var(--chrome);color:var(--text-soft);max-width:48ch}
.pg .u2-logo{display:block;flex:none}
.pg .u2-top{height:56px}
.pg .u2-srs{display:flex;flex-direction:column;margin-top:12px}
.pg .u2-sr{display:flex;align-items:center;justify-content:space-between;height:40px;border-bottom:var(--w-hairline) solid var(--divider)}
.pg .u2-sr--b{margin-top:8px;border-bottom:0}
.pg .u2-bd{display:inline-flex;align-items:center;gap:8px;font:var(--fw-label) var(--fs-label)/1 var(--ff-body);color:var(--text)}
.pg .u2-wrap{white-space:normal}.pg .u2-wrap .ui-toast{max-width:100%}
.pg .u2-load{display:flex;align-items:center;gap:16px;width:100%}
`;
}
