// Theme 22, Ticket, lane u2: the UI kit's component pages (states, buttons, inputs, choices, cards, navigation, lists, status, feedback).
// Each page is the same roll ticket as the rest of the kit, its body printed on the product's own surface, so every component is the
// shipped one (ctx.ui with componentsCss) on the ground it ships on. States are forced with the shipped .is-* classes, never restyled.
// The ticket's language does the documenting: a strip of joined tickets for the states, a ticket torn in two for light and dark status,
// leader lines like the fields printed on a ticket face, and drawings at a stated scale. Every class here starts u2-.
import { A, px, T, textWidth } from './helpers.js';
import { kitPage, surfaceBody, uiPlate, PLATE, at, kitRoles, ratioText } from './lane-u1.js';
import { colourMap, statusText } from '../../engine/tokens.js';
import { componentsCss } from '../../engine/components.js';

export function css() {
  return `
.pg .u2-q{font:400 12px/16px var(--body);color:var(--quiet)}
.pg .u2-n{font:600 13px/18px var(--body);color:var(--text)}
.pg .u2-h{font:600 20px/28px var(--body);color:var(--text)}
.pg .u2-nw{white-space:nowrap}
.pg .u2-r{text-align:right}
.pg .u2-ln{position:absolute;background:var(--quiet)}
.pg .u2-col{position:absolute;display:flex;flex-direction:column}
.pg .u2-arow{display:flex;align-items:flex-start}
.pg .u2-arow .u2-lead{flex:none;height:1px;background:var(--quiet)}
.pg .u2-pair{display:flex;align-items:center;gap:12px}
.pg .u2-pair .u2-sw{flex:none;width:64px}
.pg .u2-z{position:absolute}
.pg .u2-z .ui-field,.pg .u2-col .ui-field{width:100%}
.pg .u2-cact{margin-top:6px}
.pg .u2-load{display:flex;align-items:center;gap:24px}
.pg .u2-sk{display:flex;flex-direction:column;gap:10px;width:200px}
.pg .u2-nw .ui-row__sub{white-space:nowrap}
.pg .u2-strip .u2-slot{position:absolute;left:12px;right:12px}
`;
}

// ---------------------------------------------------------------- pieces

const sc = (ctx) => ctx.brand.ui.screen.content;
const mono = (s) => `<span class="m">${A(s)}</span>`;
// a dark-zone note: the name in paper, the rule in the measured quiet colour of the bar top
const note = (x, y, w, name, html) => at(x, y, 'zone', `<div class="c15 b paper">${A(name)}</div><div class="c13 qt" style="margin-top:4px">${html}</div>`, '', w);
// a name over a caption, inside a plate, in the product's own text and quiet roles
const named = (name, html) => `<div class="u2-n">${A(name)}</div>${html ? `<div class="u2-q" style="margin-top:2px">${html}</div>` : ''}`;
// a real component drawn larger: zoom, not transform, so the type stays vector and the PDF page is not shrunk. The zoom sits on an inner box,
// because zoom on a positioned box scales its left and top too
const zoomed = (k, html, style = '') => `<div style="zoom:${k};${style}">${html}</div>`;
// a number read from the shipped component CSS, so the page states what the code does; a missing rule fails the build rather than guess
function cssNum(ctx, re, what) {
  const m = re.exec(componentsCss(ctx));
  if (!m) throw new Error(`ticket u2: ${what} not found in componentsCss`);
  return +m[1];
}
const btnH = (ctx, v = '') => cssNum(ctx, new RegExp(`\\.ui-btn${v ? '--' + v : ''} \\{[^}]*?[\\s;]height: (\\d+)px`), `ui-btn${v} height`);
const pressScale = (ctx) => cssNum(ctx, /\.ui-btn\.is-pressed \{[^}]*?scale\(([\d.]+)\)/, 'pressed scale');
const typeOf = (ctx, token) => ctx.uiType.find((t) => t.token === token);
const spPx = (ctx, n, dflt) => (ctx.space.find((s) => s.token === `space-${n}`) || { px: dflt }).px;
// a page body that is one plate on the product's surface, and a function that places content on it in page coordinates
function plateOn(mode) {
  const P = PLATE;
  return { P, o: (x, y, cls, html, style = '', w = null) => at(x - P.x, y - P.y, cls, html, style, w), plate: (inner) => uiPlate(P.x, P.y, P.w, P.h, mode, inner) };
}

// ---------------------------------------------------------------- 009 states: a strip of five joined tickets, one per state

function states(ctx) {
  const R = kitRoles(ctx), M = colourMap(ctx, 'light'), S = sc(ctx), F = S.form, E = S.example || {}, ui = ctx.ui;
  const rt = (a, b) => ratioText(ctx, a, b);
  const cols = [
    ['Rest', null, 'The shipped default, with nothing forced.'],
    ['Hover', 'hover', `${mono('--action-hover')}, its label at ${rt(M['action-label'], M['action-hover'])}. Outlined buttons fill ${mono('--sunken')}.`],
    ['Focus', 'focus', `A 2 px ring in ${mono('--focus')} on a gap of the ground, ${rt(M.focus, M.surface)}.`],
    ['Pressed', 'pressed', `${mono('--action-pressed')}, its label at ${rt(M['action-label'], M['action-pressed'])}, scaled to ${pressScale(ctx)}.`],
    ['Disabled', 'disabled', `${mono('--disabled-bg')}, its type at ${rt(M['disabled-text'], M['disabled-bg'])}.`],
  ];
  const n = cols.length, w = T.bodyW / n;
  const segments = cols.map((_, i) => ({ x: Math.round(T.x + i * w), w: Math.round(T.x + (i + 1) * w) - Math.round(T.x + i * w), hex: M.surface }));
  // the secondary label must fit the narrow ticket with its padding; the brand's short label stands in when the long one would not
  const inner = Math.floor(w) - 12 - 24, ctl = typeOf(ctx, 'control');
  const sec = textWidth(ctx, 'body', E.secondary || '', ctl.size) * 1.08 + 2 * spPx(ctx, 5, 20) <= inner ? E.secondary : E.small;
  const none = (t) => `<div class="u2-q" style="padding-top:12px">${A(t)}</div>`;
  // the narrow tickets take the brand's shortest switch label, so it wraps to two lines at most
  const shortest = (xs) => [...xs].sort((a, b) => a.length - b.length)[0];
  const lab = typeOf(ctx, 'label').line;
  // fixed rows, so a part sits at the same height on every ticket of the strip
  const rows = [
    [56, (st) => (st === 'disabled' ? `<div class="u2-q">Never shown disabled. It stays live and says why:</div><div class="u2-q" style="color:var(--text)">${A(F.bookWhy)}</div>` : ui.btn(F.book, { state: st || undefined }))],
    [116, (st) => ui.btn(sec, { variant: 'secondary', state: st || undefined })],
    [176, (st, i) => (st === 'hover' || st === 'pressed' ? `<div style="padding-top:${lab + 6}px">${none(`No ${st} style`)}</div>` : ui.field({ id: `u2-st-f${i}`, label: F.ready, value: F.readyValue, state: st === 'focus' ? 'focus' : undefined, disabled: st === 'disabled' }))],
    [264, (st) => (st === 'hover' || st === 'pressed' ? none(`No ${st} style`) : ui.check(E.checks ? E.checks[0] : F.notes, { state: st === 'focus' ? 'focus' : undefined, disabled: st === 'disabled' }))],
    [324, (st) => (st === 'hover' || st === 'pressed' ? none(`No ${st} style`) : ui.switch(shortest(E.switches || [F.notes]), { checked: true, state: st === 'focus' ? 'focus' : undefined, disabled: st === 'disabled' }))],
  ];
  let body = '';
  cols.forEach(([name, st, rule], i) => {
    const s = segments[i], pl = { x: s.x + 6, y: PLATE.y, w: s.w - 12, h: PLATE.h };
    let h = `<div class="u2-slot u2-h" style="top:16px">${A(name)}</div>`;
    rows.forEach(([y, f]) => { h += `<div class="u2-slot a" style="top:${y}px">${f(st, i)}</div>`; });
    h += `<div class="u2-slot a u2-q" style="top:372px">${rule}</div>`;
    body += uiPlate(pl.x, pl.y, pl.w, pl.h, 'light', h, '').replace('class="ui u1-plate"', 'class="ui u1-plate u2-strip"');
  });
  const zone = note(72, 532, 400, 'Forced to hold still', `Each ticket prints the shipped classes ${mono('.is-hover')}, ${mono('.is-focus')} and ${mono('.is-pressed')}. In the product the same styles follow the pointer and the keyboard.`)
    + note(520, 532, 416, 'Every state reads', `Labels stay at 4.5 : 1 or better on every fill. Focus never relies on colour alone: the ring sits outside the control, on a gap of the ground.`);
  return kitPage(ctx, R, 'states', { segments, body, zone });
}

// ---------------------------------------------------------------- 010 buttons: the primary drawn at a stated scale, the set at true size

function buttons(ctx) {
  const R = kitRoles(ctx), M = colourMap(ctx, 'light'), S = sc(ctx), F = S.form, E = S.example || {}, ui = ctx.ui, { P, o, plate } = plateOn('light');
  const rt = (a, b) => ratioText(ctx, a, b);
  const H = btnH(ctx), pad = spPx(ctx, 5, 20), ctl = typeOf(ctx, 'control'), rad = ctx.radius.button, bw = ctx.brand.ui.border;
  // the drawing: the largest whole-and-quarter scale, up to 3, at which the primary fits the left of the body
  const estW = textWidth(ctx, 'body', F.book, ctl.size) * 1.08 + 2 * pad;
  const k = Math.max(1.5, Math.min(3, Math.floor((528 - 152) / estW * 4) / 4)), bx = 152, by = 164, hk = H * k, pk = pad * k;
  const line = (x, y, w, h) => `<i class="u2-ln" style="left:${px(x - P.x)};top:${px(y - P.y)};width:${px(w)};height:${px(h)}"></i>`;
  let inner = o(bx, by, '', zoomed(k, ui.btn(F.book)))
    // the padding along the top, the height down the left, each with end ticks, in the product's quiet ink
    + line(bx, by - 16, pk, 1) + line(bx, by - 20, 1, 9) + line(bx + pk - 1, by - 20, 1, 9)
    + o(bx, by - 44, 'u2-q u2-nw', `Padding ${mono(`${pad} px`)}`)
    + line(bx - 20, by, 1, hk) + line(bx - 24, by, 9, 1) + line(bx - 24, by + hk - 1, 9, 1)
    + o(72, by + hk / 2 - 16, 'u2-q u2-r', `Height<br>${mono(`${H} px`)}`, '', 44)
    + o(bx, by + hk + 16, 'u2-n u2-nw', A(`The primary button, ${k} times its size`))
    + o(bx, by + hk + 40, 'u2-q', `Radius ${mono(`${rad} px`)}. Label ${A(ctx.brand.fonts.body.family)} ${ctl.weight}, ${mono(`${ctl.size} px`)}, at ${rt(M['action-label'], M.action)} on ${mono('--action')}.`, '', 320);
  // the set at true size: each variant beside its name and the one thing that sets it apart
  const sm = btnH(ctx, 'sm'), lg = btnH(ctx, 'lg');
  const set = [
    [ui.btn(F.book), 'Primary', `${mono('--action')}. One a screen, and it names what it does.`],
    [ui.btn(E.secondary, { variant: 'secondary' }), 'Secondary', `A ${bw} px edge in ${mono('--text')}.`],
    [ui.btn(E.quiet, { variant: 'quiet' }), 'Quiet', 'Underlined, with no fill.'],
    [ui.btn(E.danger, { variant: 'danger' }), 'Danger', `${mono('--danger')}, only for what can't be undone.`],
    [ui.btn(E.small, { variant: 'secondary', size: 'sm' }), 'Small', `${mono(`${sm} px`)} tall, inside rows and cards.`],
    [ui.btn(F.book, { size: 'lg', iconRight: 'arrow-right' }), 'Large', `${mono(`${lg} px`)} tall, for the last step.`],
  ];
  const step = Math.floor((460 - 72) / set.length);
  set.forEach(([b, name, cap], i) => {
    const cy = 72 + i * step + step / 2;
    inner += o(576, cy - lg / 2, 'u2-pair', b, `height:${lg}px`) + o(768, cy - 17, '', named(name, cap), '', 168);
  });
  const zone = note(72, 532, 400, 'Labels are verbs', `${A(F.book)}, ${A(E.secondary)}, ${A(E.danger)}. A label says what happens, never Submit or OK.`)
    + note(520, 532, 416, 'A primary is never disabled', `When it can't act yet, it stays live and the reason sits beside it: ${A(F.bookWhy)}`);
  return kitPage(ctx, R, 'buttons', { segments: surfaceBody(ctx, 'light'), body: plate(inner), zone });
}

// ---------------------------------------------------------------- 011 inputs: the product's own form, its fields called out like a ticket's

function inputs(ctx) {
  const R = kitRoles(ctx), M = colourMap(ctx, 'light'), S = sc(ctx), F = S.form, ui = ctx.ui, { P, o, plate } = plateOn('light');
  const rt = (a, b) => ratioText(ctx, a, b), bw = ctx.brand.ui.border;
  const lab = typeOf(ctx, 'label').line, mid = lab + 6 + 22;
  // each field with a leader from its input's centre to the call-out, so the call-out reads against the control, not the label
  const row = (field, name, cap) => `<div class="u2-arow"><div style="width:300px;flex:none">${field}</div><i class="u2-lead" style="width:28px;margin:${mid}px 8px 0 12px"></i><div style="width:224px;margin-top:${mid - 9}px">${named(name, cap)}</div></div>`;
  const form = [
    row(ui.field({ id: 'u2-in1', label: F.pickup, value: F.pickupValue }), 'Filled', `Type in ${mono('--text')}, a ${bw} px edge in ${mono('--edge')} at ${rt(M.edge, M.surface)}.`),
    row(ui.field({ id: 'u2-in2', label: F.dropoff, value: F.dropoffValue, state: 'focus' }), 'Focus', `The edge turns ${mono('--text')} and a ring in ${mono('--focus')} sits outside it.`),
    row(ui.field({ id: 'u2-in3', label: F.ready, value: F.readyValue, error: F.readyError }), 'Error', `Edge and message in ${mono('--danger')}, ${rt(M.danger, M.surface)}. It says what to do.`),
    row(ui.field({ id: 'u2-in4', label: F.size, kind: 'select', options: F.sizes, value: F.sizes[1] }), 'Select', `The same box, its chevron drawn in ${mono('--quiet')}.`),
  ].join('');
  let inner = `<div class="u2-col" style="left:${88 - P.x}px;top:${64 - P.y}px;gap:12px">${form}</div>`;
  // the two that need room of their own: the text area with its help, and a disabled field
  inner += `<div class="u2-col" style="left:${688 - P.x}px;top:${72 - P.y}px;width:248px;gap:28px">`
    + `<div>${ui.field({ id: 'u2-in5', label: F.notes, kind: 'textarea', help: F.notesHelp })}<div style="margin-top:10px">${named('Text area', `Help in ${mono('--quiet')}, ${rt(M.quiet, M.surface)}. It becomes the error when there is one.`)}</div></div>`
    + `<div>${ui.field({ id: 'u2-in6', label: F.dropoff, value: F.dropoffValue, disabled: true })}<div style="margin-top:10px">${named('Disabled', `${mono('--disabled-bg')} and no edge, its type at ${rt(M['disabled-text'], M['disabled-bg'])}.`)}</div></div>`
    + '</div>';
  const zone = note(72, 532, 400, 'A label is always there', 'It sits above the field and never moves inside it. A hint sits under the field and turns into the error when there is one.')
    + note(520, 532, 416, 'An error says what to enter', A(F.readyError));
  return kitPage(ctx, R, 'inputs', { segments: surfaceBody(ctx, 'light'), body: plate(inner), zone });
}

// ---------------------------------------------------------------- 012 choices: on the dark surface, the segmented control drawn large

function choices(ctx) {
  const R = kitRoles(ctx), M = colourMap(ctx, 'dark'), S = sc(ctx), F = S.form, E = S.example || {}, ui = ctx.ui, { P, o, plate } = plateOn('dark');
  const lab = typeOf(ctx, 'label');
  // the segmented control at the largest scale up to 2 that keeps it inside the left two-thirds of the body
  const segW = F.sizes.reduce((t, s) => t + textWidth(ctx, 'body', s, lab.size) * 1.08 + 32, 0) + 4;
  const k = Math.max(1, Math.min(2, Math.floor(560 / segW * 4) / 4));
  let inner = o(72, 80, '', zoomed(k, ui.segmented(F.sizes, 1)))
    + o(72, 80 + 40 * k + 16, '', named(`Segmented, ${k} times its size`, `One choice from a few, and one is always chosen. The chosen part fills with ${mono('--text')}.`), '', 420);
  const item = (state, html) => `<div class="u2-pair"><span class="u2-q u2-sw">${A(state)}</span>${html}</div>`;
  const checks = E.checks || [], radios = E.radios || [], sws = E.switches || [];
  const groups = [
    ['Checkbox', [item('On', ui.check(checks[0], { checked: true })), item('Focus', ui.check(checks[1], { state: 'focus' })), checks[2] ? item('Disabled', ui.check(checks[2], { disabled: true })) : '']],
    ['Radio', [item('On', ui.check(radios[0], { type: 'radio', name: 'u2-rd', checked: true })), radios[1] ? item('Focus', ui.check(radios[1], { type: 'radio', name: 'u2-rd', state: 'focus' })) : '']],
    ['Switch', [item('On', ui.switch(sws[0], { checked: true })), sws[1] ? item('Off', ui.switch(sws[1])) : '', item('Disabled', ui.switch(sws[sws.length - 1], { disabled: true }))]],
  ];
  groups.forEach(([name, items], i) => {
    inner += `<div class="u2-col" style="left:${72 + i * 296 - P.x}px;top:${272 - P.y}px;width:272px;gap:2px"><div class="u2-n" style="margin-bottom:6px">${A(name)}</div>${items.join('')}</div>`;
  });
  const zone = note(72, 532, 400, 'Choose, then act', 'A choice never sends anything by itself. It waits for the button that names the step.')
    + note(520, 532, 416, 'Marks in the text colour', `Ticked, chosen and on are drawn in ${mono('--text')}, ${ratioText(ctx, M.text, M.surface)} on the dark surface, so the mark never depends on the brand colour alone.`);
  return kitPage(ctx, R, 'choices', { segments: surfaceBody(ctx, 'dark'), body: plate(inner), zone });
}

// ---------------------------------------------------------------- 013 cards: one card drawn large with its parts named, the others at true size

function cards(ctx) {
  const R = kitRoles(ctx), M = colourMap(ctx, 'light'), S = sc(ctx), E = S.example || {}, ui = ctx.ui, { P, o, plate } = plateOn('light');
  const k = 1.4, cw = 270, cx = 88, cy = 72;
  const L = typeOf(ctx, 'label').line, TS = typeOf(ctx, 'title-s'), tb = Math.round(typeOf(ctx, 'body').size * 1.5), bt = 1, pad = 16, g = 6;
  const card = ui.card({ meta: S.status, title: S.rider, text: S.riderNote, action: `<div class="u2-cact">${ui.btn(E.secondary, { variant: 'secondary', size: 'sm' })}</div>` });
  // the centre of each part, from the shipped padding, gaps and line heights, at the drawing's scale
  const yMeta = bt + pad + L / 2, yTitle = bt + pad + L + g + TS.line / 2, yText = bt + pad + L + g + TS.line + g + tb / 2;
  const yAct = bt + pad + L + g + TS.line + g + tb + g + 6 + btnH(ctx, 'sm') / 2;
  const parts = [
    [0, 'Edge', `${mono('1 px')} ${mono('--divider')}`],
    [yMeta, 'Meta', `${mono('--quiet')}, ${mono(`${typeOf(ctx, 'label').size} px`)}`],
    [yTitle, 'Title', `${A(ctx.brand.fonts.display.family)}, ${mono(`${TS.size} px`)}`],
    [yText, 'Text', `${mono('--text-soft')}, ${mono(`${typeOf(ctx, 'body').size} px`)}`],
    [yAct, 'Action', 'A small secondary button'],
  ];
  const rx = cx + cw * k;
  let inner = o(cx, cy, '', zoomed(k, card, `width:${cw}px`));
  for (const [y, name, cap] of parts) {
    const ly = cy + y * k;
    inner += `<i class="u2-ln" style="left:${px(rx + 8 - P.x)};top:${px(ly - P.y)};width:24px;height:1px"></i>`
      + o(rx + 40, ly - 9, 'u2-nw', `<span class="u2-n">${A(name)}</span> <span class="u2-q">${cap}</span>`);
  }
  inner += o(cx, cy + (yAct + btnH(ctx, 'sm') / 2 + pad + bt) * k + 16,'u2-nw', `<span class="u2-n">${A(`A card, ${k} times its size`)}</span> <span class="u2-q">Radius ${mono(`${ctx.radius.card} px`)}</span>`);
  // the other two at true size, down the right of the body
  inner += `<div class="u2-col" style="left:${752 - P.x}px;top:${72 - P.y}px;width:184px;gap:12px">`
    + ui.card({ meta: S.deliverToLabel, title: S.deliverTo, text: S.paid, raised: true }) + `<div>${named('Raised', `${mono('--raised')} and no edge, for a second level.`)}</div>`
    + '</div>' + o(cx, 352, 'u2-pair', ui.stat(S.paid, S.paidLabel) + `<div style="width:240px">${named('Stat', 'One figure and the words that name it.')}</div>`);
  const zone = note(72, 532, 400, 'A card holds one thing', 'One thing, under one title. A card never holds another card, and it is never the only way to reach what it shows.')
    + note(520, 532, 416, 'Edge or step, never both', `A card on the surface takes the 1 px divider. A raised card takes ${mono('--raised')} instead, ${ratioText(ctx, M.text, M.raised)} for its text.`);
  return kitPage(ctx, R, 'cards', { segments: surfaceBody(ctx, 'light'), body: plate(inner), zone });
}

// ---------------------------------------------------------------- 014 navigation: the product's frame, its parts where they sit on a screen

function navigation(ctx) {
  const R = kitRoles(ctx), M = colourMap(ctx, 'light'), S = sc(ctx), E = S.example || {}, ui = ctx.ui, { P, o, plate } = plateOn('light');
  const links = E.links || [], asp = ctx.logo.geo.aspect, lh = 24, lw = Math.min(140, lh * asp);
  const logo = `<div style="width:${px(lw)};height:${px(lw / asp)};position:relative">${ctx.logo.html('colour', { width: lw, colourway: R.colourwayOn(M.surface), color: R.inkOn(M.surface, 13, 400, '(Logo slot frame on the kit surface)'), label: 'Logo' })}</div>`;
  const top = `<nav class="ui-topbar" aria-label="Main">${logo}<div class="ui-topbar__links">${ui.links(links, 0)}</div></nav>`;
  const side = `<nav class="ui-sidebar" aria-label="Sections">${ui.links(links, 0)}</nav>`;
  const items = [...links, [E.account || 'Account', 'user']].slice(0, 4);
  const bar = `<nav class="ui-tabbar" aria-label="Sections">${items.map(([t, i], j) => `<a href="#"${j === 0 ? ' aria-current="page"' : ''}>${ui.icon(i, 20)}${A(t)}</a>`).join('')}</nav>`;
  let inner = o(72, 72, '', top, '', 864)
    + o(72, 140, 'u2-nw', `<span class="u2-n">Top bar</span> <span class="u2-q">The current page has a 3 px bar in ${mono('--action')} under it. Links are 44 px tall.</span>`)
    + o(72, 196, '', side, '', 220)
    + o(72, 372, '', named('Sidebar', 'A bar on the left edge marks the current page.'), '', 220)
    + o(336, 196, '', ui.tabs(E.tabs || [], 0), '', 296)
    + o(336, 252, '', named('Tabs', 'Views of the same list. A tab never changes the page.'), '', 296)
    + o(336, 324, '', ui.crumbs([...(E.crumbs || []), S.rider]), '', 296)
    + o(336, 352, '', named('Breadcrumbs', 'Quiet, with the current page in full ink.'), '', 296)
    + o(680, 196, '', bar, '', 256)
    + o(680, 272, '', named('Mobile tab bar', `${items.length} places at most, 64 px tall, the current one marked along its top.`), '', 256);
  const zone = note(72, 532, 400, 'One mark for here', `Every kind of navigation marks the current place the same way: full ink and a bar in ${mono('--action')}, never colour alone.`)
    + note(520, 532, 416, 'The same places everywhere', 'The top bar, the sidebar and the tab bar list the same places in the same order, so a person who switches device finds them where they were.');
  return kitPage(ctx, R, 'navigation', { segments: surfaceBody(ctx, 'light'), body: plate(inner), zone });
}

// ---------------------------------------------------------------- 015 lists: the product's own list as the one big thing

function lists(ctx) {
  const R = kitRoles(ctx), S = sc(ctx), ui = ctx.ui, { P, o, plate } = plateOn('light'), d = S.deliveries;
  const icon = d[0].icon || ctx.brand.ui.rowIcon || 'package';
  let inner = o(72, 72, '', ui.deliveryRows(Math.min(5, d.length)), '', 568)
    + o(72, 424, '', named('With a lead and a status', 'The title is the thing, the detail is when and where, and the status is the only colour.'), '', 568);
  inner += `<div class="u2-col" style="left:${688 - P.x}px;top:${72 - P.y}px;width:248px;gap:8px">`
    + `<ul class="ui-list">${ui.row({ title: d[1].to, sub: d[1].when, end: d[1].price })}</ul>` + named('Without a lead', 'For a list that is all one kind of thing.')
    + `<ul class="ui-list u2-nw" style="margin-top:24px">${ui.row({ lead: ui.icon(icon, 18), title: d[0].to, sub: d[0].when, end: d[0].price, href: '#' })}</ul>` + named('As a link', 'The whole row is the target, at least 64 px tall.')
    + '</div>';
  const zone = note(72, 532, 400, 'One row, one thing', 'A row is never a card. It is divided from the next by a 1 px line in the divider colour, and the end column holds the figure and the state.')
    + note(520, 532, 416, 'Figures line up', 'Prices and times are set in tabular figures, so a column of them reads straight down.');
  return kitPage(ctx, R, 'lists', { segments: surfaceBody(ctx, 'light'), body: plate(inner), zone });
}

// ---------------------------------------------------------------- 016 status: one ticket torn in two, light on the left and dark on the right

function status(ctx) {
  const R = kitRoles(ctx), ML = colourMap(ctx, 'light'), MD = colourMap(ctx, 'dark'), S = sc(ctx), ui = ctx.ui;
  const split = 592, segments = [{ x: T.x, w: split - T.x, hex: ML.surface }, { x: split, w: T.perf - split, hex: MD.surface }];
  const L = { x: T.x + 16, y: PLATE.y, w: split - T.x - 28, h: PLATE.h }, D = { x: split + 12, y: PLATE.y, w: T.perf - split - 28, h: PLATE.h };
  const lab = typeOf(ctx, 'label'), n = ctx.status.length;
  // the status words drawn at the largest scale up to 2 at which the longest fits beside its figures on the dark half
  const longest = Math.max(...ctx.status.map((s) => textWidth(ctx, 'body', s.label, lab.size) * 1.08));
  const k = Math.max(1, Math.min(2, Math.floor(200 / longest * 4) / 4));
  const step = Math.min(64, Math.floor(296 / n)), y0 = 128;
  const tokW = 16 + longest * k + 24;
  let li = `<div class="a" style="left:16px;top:16px">${named('On the light surface', `${mono('--surface')} ${mono(ML.surface)}`)}</div>`;
  let di = `<div class="a" style="left:16px;top:16px">${named('On the dark surface', `${mono('--surface')} ${mono(MD.surface)}`)}</div>`;
  ctx.status.forEach((s, i) => {
    const tl = statusText(ctx, 'light', s), td = statusText(ctx, 'dark', s), y = y0 + i * step - L.y, h = lab.line * k;
    li += `<div class="a" style="left:16px;top:${y}px">${zoomed(k, ui.statusChip(s.id))}</div>`
      + `<div class="a u2-nw" style="left:${tokW}px;top:${y + h / 2 - 8}px">${mono(tl.token)}</div>`
      + `<div class="a u2-q u2-r u2-nw" style="left:${L.w - 88}px;top:${y + h / 2 - 8}px;width:72px">${A(ratioText(ctx, tl.hex, ML.surface))}</div>`;
    di += `<div class="a" style="left:16px;top:${y}px">${zoomed(k, ui.statusChip(s.id))}</div>`
      + `<div class="a u2-q u2-r u2-nw" style="left:${D.w - 88}px;top:${y + h / 2 - 8}px;width:72px">${A(ratioText(ctx, td.hex, MD.surface))}</div>`;
  });
  // the count badge: the rows in the product's own list, so the figure counts something real
  const count = String(S.deliveries.length);
  li += `<div class="a u2-pair" style="left:16px;top:${y0 + n * step + 8 - L.y}px"><span class="ui-badge">${A(count)}</span><span class="u2-q">A count badge, in ${mono('--action')} with ${mono('--action-label')}. It counts the ${A(count)} rows in the list.</span></div>`;
  const body = uiPlate(L.x, L.y, L.w, L.h, 'light', li) + uiPlate(D.x, D.y, D.w, D.h, 'dark', di);
  const zone = note(72, 532, 400, 'Words in one colour', `A status is plain words in its tone's colour, with no fill. Each is drawn here ${k} times its size, beside its ratio on the ground.`)
    + note(520, 532, 416, 'The same words in both modes', 'Each tone has a light and a dark value, measured on its own surface. A state never relies on colour alone: the words carry it.');
  return kitPage(ctx, R, 'status', { segments, body, zone });
}

// ---------------------------------------------------------------- 017 feedback: on the dark surface, what the product says back

function feedback(ctx) {
  const R = kitRoles(ctx), S = sc(ctx), F = S.form, ui = ctx.ui, { P, o, plate } = plateOn('dark');
  const alerts = [['info', S.pickup], ['success', S.toast], ['warning', S.alert], ['danger', F.readyError]];
  let inner = `<div class="u2-col" style="left:${72 - P.x}px;top:${72 - P.y}px;width:472px;gap:20px">${alerts.map(([t, s]) => ui.alert(t, s)).join('')}`
    + `<div style="margin-top:4px">${named('Banners', `A 2 px edge and an icon in the tone's colour. The words stay in ${mono('--text')}, and a banner stays until it is dealt with.`)}</div></div>`;
  inner += `<div class="u2-col" style="left:${616 - P.x}px;top:${72 - P.y}px;width:320px;gap:10px">`
    + `<div>${ui.toast(S.toast)}</div>` + named('Toast', 'Bottom of the screen. It leaves by itself, and Undo stays reachable by keyboard.')
    + `<p class="ui-inline-msg" style="margin-top:22px">${ui.icon('info', 16)}${A(S.inline)}</p>` + named('Inline message', 'Beside the thing it is about, in the quiet text colour.')
    + `<div class="u2-load" style="margin-top:22px">${ui.spinner()}<div class="u2-sk">${ui.skeleton('200px')}${ui.skeleton('144px')}${ui.skeleton('172px')}</div></div>`
    + named('Loading', 'The spinner for a short wait. A list that takes longer gets skeleton lines in the shape of its rows.')
    + '</div>';
  const zone = note(72, 532, 400, 'Say what happened, then what to do', 'One or two sentences in plain words. A message never blames the person reading it.')
    + note(520, 532, 416, 'It stays or it leaves', 'A banner stays until it is dealt with. A toast leaves by itself, so it never carries the only way to act.');
  return kitPage(ctx, R, 'feedback', { segments: surfaceBody(ctx, 'dark'), body: plate(inner), zone });
}

export const uikit = { states, buttons, inputs, choices, cards, navigation, lists, status, feedback };
