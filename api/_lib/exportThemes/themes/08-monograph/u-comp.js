// UI kit pages: buttons, inputs, choices, cards, navigation, lists. Styles are in css-u-comp.js (classes start ru2-).
// The riso press proofs the product's own UI. A figure is a printed proof: the components on the paper in the brand's light ui roles,
// or on a panel where the Ink drum floods the print area and the components sit in the dark ui roles. The components hold their own
// edges, so a proof is never boxed again: its four registration crosses are the only mark of the sheet, set at the corners of the
// figure (a light one) or of the Ink panel (a dark one). Each page ends its last proof with one job line: the drums it prints in,
// any tone, then the paper, from the brand's real colours. Composites only: no separations in the UI kit.
import { A } from './helpers.js';
import { corners, drums, drumNo, paper, byRole, isSurface } from './guidelines-r.js';
import { statusText } from '../../engine/tokens.js';

const sc = (ctx) => ctx.brand.ui.screen.content;
const titleOf = (ctx, id) => ctx.pages.find((p) => p.id === id).title;
const m = (s) => `<span class="r-mono">${A(s)}</span>`;
const tone = (ctx, role) => ctx.tones.find((t) => t.role === role);
// the palette name for a hex, else the hex itself
const nm = (ctx, hex) => { const c = ctx.colours.find((x) => x.hex.toLowerCase() === String(hex).toLowerCase()); return c ? c.name : hex; };
// a status chip whose label is a placeholder in the slot edition: the state names are the sample brand's own words
const stateOf = (ctx, id) => (ctx.status.find((s) => s.id === id) || { label: '' }).label;
const chip = (ctx, id) => ctx.ui.statusChip(id, { label: ctx.ph('ui.screen.content.status', stateOf(ctx, id)) });

// the page: a running head (the kit's name left, folio right), the title and an optional lead, then the body
function pg(ctx, id, inner, lead = '', cls = '') {
  const head = `<div class="r-hd"><span>${A(ctx.brand.name)}, UI kit</span><span class="num">${ctx.pageNo(id)}</span></div>`;
  return `<section class="pg r-pg ru2-pg ${cls}" data-page="${id}">${head}<div class="r-top"><h1 class="r-h1">${A(titleOf(ctx, id))}</h1>${lead ? `<p class="r-lead">${lead}</p>` : ''}</div><div class="ru2-b">${inner}</div></section>`;
}
// a light proof: the components on the paper, marked by the four crosses alone (no sheet edge round components that have their own)
const open = (ctx, inner, cls = '') => `<div class="ru2-op ${cls}">${corners(ctx.roles.light.text, 13)}<div class="ui ru2-op__pr">${inner}</div></div>`;
// a dark proof: the Ink drum floods the print area; the panel is the sheet, with the crosses at its own corners
const ink = (ctx, inner, cls = '') => `<div class="ru2-op ru2-op--dk ${cls}">${corners(ctx.roles.light.text, 13)}<div class="ui ru2-op__pr" data-theme="dark">${inner}</div></div>`;

// the job line, one form for the whole book (review D1): one line under the figure, flush with the sheet's left edge, never inside it,
// at most two lines. Each drum the sheet prints, in drum order: an 8 px swatch, `Drum n Name`, then what it prints. Whatever is in
// the paper's colour is the paper showing through and closes the line; a tone that is no drum is named as it is. `photo` adds the
// photograph sentence: pass it on photo-direction only, where it is printed once for the book.
// (Copied from p-image.js as it stands, with its four css lines renamed to this lane's prefix.)
function job(ctx, uses, photo = false) {
  const D = drums(ctx), p = paper(ctx), by = new Map(), through = [], other = [];
  const hex_ = (h) => String(h).toLowerCase();
  for (const [hex, what] of uses) {
    const c = D.find((d) => hex_(d.hex) === hex_(hex));
    const t = ctx.colours.find((x) => hex_(x.hex) === hex_(hex)) || ctx.tones.find((x) => hex_(x.hex) === hex_(hex));
    if (c) { if (!by.has(c)) by.set(c, []); if (!by.get(c).includes(what)) by.get(c).push(what); } else if (isSurface(ctx, hex) || hex_(hex) === hex_(p.hex)) { if (!through.includes(what)) through.push(what); } else other.push([t ? t.name : '', what]);
  }
  const parts = D.filter((c) => by.has(c)).map((c) => `<span class="ru2-jd"><i class="ru2-sw" style="background:${c.hex}"></i>Drum ${drumNo(ctx, c)} ${A(c.name)}: ${by.get(c).join(', ')}.</span>`);
  const rest = other.map(([nm, what]) => `<span class="ru2-jd">${A(nm)}: ${what}.</span>`);
  const show = through.length ? [`<span class="ru2-jd">Paper ${A(p.name)}: ${through.join(', ')}.</span>`] : [];
  const ph = photo ? [`<span class="ru2-jn">The photograph keeps its own colour: no drum prints over it.</span>`] : [];
  return `<p class="ru2-job">${[...parts, ...rest, ...show, ...ph].join(' ')}</p>`;
}
// the hex of a palette role, and of a tone
const hexOf = (ctx, role) => byRole(ctx, role).hex;
const toneHex = (ctx, role) => (tone(ctx, role) || { hex: '' }).hex;
// the colours the status words of some rows print in (light ground), for the job line: only inks the brand has
const swords = (ctx, rows) => {
  const known = [...ctx.colours, ...ctx.tones].map((c) => c.hex.toLowerCase());
  return [...new Set(rows.map((d) => d.status))].map((id) => statusText(ctx, 'light', ctx.status.find((s) => s.id === id)).hex)
    .filter((h) => known.includes(String(h).toLowerCase())).map((h) => [h, 'the status words']);
};
// the page's one plain paragraph: the rules as sentences, no run-in labels, no grid
const para = (...s) => `<p class="ru2-np">${s.join(' ')}</p>`;
// a state's name, set small and quiet beside the thing it names
const sn = (t) => `<span class="ru2-sn">${A(t)}</span>`;

export const uComp = {
  // one two-drum sheet: the four variants with their rules, then the sizes beside the states of quiet and danger. Hover and pressed
  // are where the press changes drum: the Vermilion fill goes to Ink.
  buttons(ctx) {
    const S = sc(ctx), ui = ctx.ui, F = S.form, X = S.example, R = ctx.roles.light, act = byRole(ctx, 'action');
    const padTok = ctx.space.find((s) => s.token === 'space-5') || { px: 24, token: 'space-5' };
    const vr = [['Primary', ui.btn(F.book), `${A(act.name)}. The one action on a screen.`], ['Secondary', ui.btn(X.secondary, { variant: 'secondary' }), `${A(nm(ctx, R.text))} edge. Every other action.`],
      ['Quiet', ui.btn(X.quiet, { variant: 'quiet' }), 'Underlined text. A way out.'], ['Danger', ui.btn(X.danger, { variant: 'danger' }), 'Dark red fill. Confirms a cancel.']];
    const variants = `<div class="ru2-vr">${vr.map(([n, b, u]) => `<div class="ru2-vr__i">${b}<p class="ru2-vr__u"><b>${n}</b> ${u}</p></div>`).join('')}</div>`;
    const sizes = `<div class="ru2-sz">${sn('Sizes')}${ui.btn(X.small, { size: 'sm' })}${ui.btn(F.book)}${ui.btn(F.book, { size: 'lg' })}</div>`;
    const sts = [['Rest', undefined], ['Hover', 'hover'], ['Focus', 'focus'], ['Pressed', 'pressed'], ['Disabled', 'disabled']];
    const run = `<ol class="ru2-run"><li class="ru2-run__h"><span></span>${sn('Quiet')}${sn('Danger')}</li>${sts.map(([n, s]) => `<li>${sn(n)}<span>${ui.btn(X.quiet, { variant: 'quiet', state: s })}</span><span>${ui.btn(X.danger, { variant: 'danger', state: s })}</span></li>`).join('')}</ol>`;
    const sheet = `${variants}<div class="ru2-bt__lo">${sizes}<div>${run}<p class="ru2-bt__cap">Hover and pressed print in ${A(nm(ctx, R.text))}: the ${A(act.name)} fill changes drum. Primary and secondary are on the ${A(titleOf(ctx, 'states'))} page.</p></div></div>`;
    return pg(ctx, 'buttons', `<div class="ru2-bt1">${open(ctx, sheet)}`
      + `${job(ctx, [[hexOf(ctx, 'text'), 'edges, labels, quiet and the hover fill'], [hexOf(ctx, 'action'), 'the primary and danger fills'], [toneHex(ctx, 'panel'), 'the disabled fill'], [paper(ctx).hex, 'every ground']])}</div>`
      + para(`One ${A(act.name)} button a screen. Everything else is ${A(nm(ctx, R.text))} on ${A(nm(ctx, R.surface))}.`, (ctx.edition === 'slot' ? 'The label says what happens, in the product\'s own words. Never Submit.' : `The label says what happens: ${A(F.book)}, ${A(X.secondary)}. Never Submit.`),
        'A price or a condition is said beside the button, never inside it.', `Three heights: <span class="num">36</span>, <span class="num">44</span> and <span class="num">52</span> px. The one on a screen is <span class="num">44</span> px, with ${m(padTok.token.replace('space-', 'sp-'))} (<span class="num">${padTok.px}</span> px) each side.`));
  },

  // the text field's five states down one proof, each named at the right of its label; the rules and the select beside it; the
  // textarea closes the page on an Ink panel
  inputs(ctx) {
    const S = sc(ctx), ui = ctx.ui, F = S.form;
    const f = (id, o) => ui.field({ id, ...o });
    const st = (n, html) => `<div class="ru2-fs">${sn(n)}${html}</div>`;
    const txt = [['Rest', f('ru2-in1', { label: F.pickup, placeholder: 'First and last name' })], ['Filled', f('ru2-in2', { label: F.pickup, value: F.pickupValue })],
      ['Focus', f('ru2-in3', { label: F.dropoff, value: F.dropoffValue, state: 'focus', help: ctx.ph('ui.screen.content.form.notesHelp', 'We use this only to reach you.') })], ['Error', f('ru2-in4', { label: F.ready, value: F.readyValue, error: F.readyError })],
      ['Disabled', f('ru2-in5', { label: F.pickup, value: F.pickupValue, disabled: true })]].map(([n, h]) => st(n, h)).join('');
    const sel = [['Rest', f('ru2-in6', { label: F.size, kind: 'select', options: F.sizes, value: F.sizes[1] })], ['Focus', f('ru2-in7', { label: F.size, kind: 'select', options: F.sizes, value: F.sizes[1], state: 'focus' })]].map(([n, h]) => st(n, h)).join('');
    const ta = [['Rest', f('ru2-in8', { label: F.notes, kind: 'textarea', help: F.notesHelp })], ['Focus', f('ru2-in9', { label: F.notes, kind: 'textarea', value: 'Step-free entry, please.', state: 'focus' })]].map(([n, h]) => st(n, h)).join('');
    return pg(ctx, 'inputs', `<div class="ru2-in1"><div class="ru2-in1__l">${para('Every field has a label above it. A placeholder is an example, never the label.', `Help sits under the field in ${m('--quiet')}. An error replaces it, says what to do, and the field takes the danger edge.`, 'Fields are 44 px tall and as wide as their column. A textarea grows with its text.')}`
      + `<div class="ru2-in1__s">${open(ctx, sel)}</div></div>`
      + `<div>${open(ctx, txt)}</div></div>`
      + `<div class="ru2-in2">${ink(ctx, `<div class="ru2-ta">${ta}</div>`)}`
      + `${job(ctx, [[hexOf(ctx, 'text'), 'field edges, text and the focus ring, flooded behind the textarea'], [toneHex(ctx, 'panel'), 'the disabled fill'], [paper(ctx).hex, 'the fields']])}</div>`);
  },

  // the segmented control large, across the page, on an Ink panel; then one short form with each option once: a checkbox group, a radio
  // group and a switch group, every label said once. Focus is shown on one checkbox and disabled on one switch, named at the row's end.
  choices(ctx) {
    const ui = ctx.ui, F = sc(ctx).form, X = sc(ctx).example;
    const seg = `<div class="ru2-sg"><div>${sn('Second selected')}${ui.segmented(F.sizes, 1)}</div><div>${sn('Disabled')}${ui.segmented(F.sizes, 0, { disabled: true })}</div></div>`;
    const ck = X.checks, rd = X.radios, sw = X.switches;
    const row = (html, s) => `<div class="ru2-fr"><div class="ru2-fr__c">${html}</div>${s ? sn(s) : ''}</div>`;
    const grp = (name, items) => `<fieldset class="ru2-fc"><legend class="ru2-ch__n">${name}</legend>${items.join('')}</fieldset>`;
    const form = `<form class="ru2-fm" onsubmit="return false">`
      + grp('Checkbox', [row(ui.check(ck[0], { checked: true })), row(ui.check(ck[1] || ck[0], { state: 'focus' }), 'Focus'), row(ui.check(ck[2] || ck[0]))])
      + grp('Radio', [row(ui.check(rd[0], { type: 'radio', name: 'ru2-rd', checked: true })), row(ui.check(rd[1] || rd[0], { type: 'radio', name: 'ru2-rd' }))])
      + grp('Switch', [row(ui.switch(sw[0], { checked: true })), row(ui.switch(sw[1] || sw[0], { disabled: true }), 'Disabled')])
      + `</form>`;
    return pg(ctx, 'choices', `<div class="ru2-cc1">${ink(ctx, seg, 'ru2-sgw')}</div>`
      + `<div class="ru2-cc2"><div>${open(ctx, form)}`
      + `${job(ctx, [[hexOf(ctx, 'text'), 'edges, ticks and the segmented panel, flooded'], [hexOf(ctx, 'action'), 'the switch when it is on'], [toneHex(ctx, 'panel'), 'the disabled fill'], [paper(ctx).hex, 'every ground']])}</div>`
      + para(`A segmented control is one choice of a few, in ${m('aria-pressed')}.`, `A checkbox is square, with a tick in ${A(nm(ctx, ctx.roles.light.text))}, and you can choose many.`,
        'Choose one. A radio group has two or more, one on. Use a segmented control when the choices are short.', 'A switch takes effect at once. Say what it does, not its state.',
        'The row is the target, 44 px tall, so the label can be pressed.')
      + `</div>`);
  },

  // the card with media beside the stats on an Ink panel (one card, three figures between rules); then the card without media and
  // the raised card with its action; the four rules in a line at the foot. The cards are the edges, the crosses sit at their corners.
  cards(ctx) {
    const S = sc(ctx), ui = ctx.ui, F = S.form, X = S.example;
    const prod = `<div class="ru2-cd2__c">${ui.card({ raised: true, meta: S.from + '. ' + S.to, title: S.deliverTo === 'Gallery 2' ? 'Low Light' : S.deliverTo, text: S.pickup, action: `<div class="ru2-act">${ui.btn(F.book, { size: 'sm' })}</div>` })}</div>`;
    const stats = `<div class="ru2-st">${ui.stat(S.paid, X.statLabel)}${ui.stat(S.deliverTo, 'Where')}${ui.stat(ctx.edition === 'slot' ? 'Count' : String(S.deliveries.filter((x) => x.status === 'booked').length), ctx.edition === 'slot' ? 'Count label' : ctx.ph('ui.screen.content.status', stateOf(ctx, 'booked')))}</div>`;
    const solo = `<div class="ru2-cd2__p">${ui.card({ meta: S.status, title: S.rider, text: S.riderNote })}</div>`;
    return pg(ctx, 'cards', `<div class="ru2-cd1"><div>${open(ctx, `<div class="ru2-cd1__m">${ui.card({ media: ctx.photo('work', { cls: 'ui-card__media' }), meta: S.status, title: S.eta, text: S.pickup })}</div>`, 'ru2-op--flush ph-tight')}</div>`
      + `<div>${ink(ctx, stats, 'ru2-op--st')}</div></div>`
      + `<div class="ru2-cd2">${open(ctx, `<div class="ru2-cd2__r">${solo}${prod}</div>`, 'ru2-op--flush ph-tight')}`
      + `${job(ctx, [[hexOf(ctx, 'text'), 'card edges, text and the stat panel, flooded'], [hexOf(ctx, 'action'), 'the action'], [toneHex(ctx, 'panel'), 'the media slot'], [paper(ctx).hex, 'the cards']])}</div>`
      + para('A card sits on the page with a hairline and square corners. No shadow.', 'The picture is 16 : 9 and runs to the card edge. Text sits under it, never on it.',
        `A card that holds an action sits on the raised ground, ${m('--raised')}. One action, at the foot.`, 'A stat is a figure and its label. The figure is in the display face. Figures sit apart, with a rule between.'));
  },

  // the top bar across the full width of its proof; the breadcrumbs and tabs beside their rules; the sidebar to the right; the
  // phone's tab bar at its true 390 px on an Ink panel. The bar, the sidebar and the tab bar are the edges: the crosses sit at theirs.
  navigation(ctx) {
    const S = sc(ctx), ui = ctx.ui, X = S.example, act = byRole(ctx, 'action');
    const links = (X.links || []).map(([t]) => [t, null]);
    const top = `<nav class="ui-topbar" aria-label="Main"><span class="ru2-lg">${ctx.logo.html('horizontal', { width: 140, color: 'var(--text)', label: 'Logo' })}</span><div class="ui-topbar__links">${ui.links(links, 0)}</div></nav>`;
    const tabs = `${ui.crumbs([...X.crumbs, S.deliverTo])}<div class="ru2-gap"></div>${ui.tabs(X.tabs, 0)}`;
    const side = `<nav class="ui-sidebar" aria-label="Section">${ui.links(X.links.map(([t, i]) => [t, i]), 0)}</nav>`;
    // the phone's places: the brand's own three links, then More, which holds true for any brand
    const tb = [[X.links[0][1] || 'calendar', X.links[0][0]], [X.links[1][1] || 'ticket', X.links[1][0]], [X.links[2][1] || 'clock', X.links[2][0]], ['menu', 'More']];
    const tabbar = `<nav class="ui-tabbar" aria-label="Phone">${tb.map(([i, t], k) => `<a href="#"${k === 2 ? ' aria-current="page"' : ''}>${ui.icon(i, 20)}${A(t)}</a>`).join('')}</nav>`;
    // the phone: the foot of a screen, a short list above the tab bar, so the Ink panel stands tall and the bar sits where a thumb is
    const phoneRows = S.deliveries.slice(0, 3).map((d) => ui.row({ title: d.to, sub: d.when, end: d.price, chip: chip(ctx, d.status) })).join('');
    const phone = `<div class="ru2-w390"><ul class="ui-list">${phoneRows}</ul>${tabbar}</div>`;
    return pg(ctx, 'navigation', `<div class="ru2-nv1">${open(ctx, top, 'ru2-op--flush')}</div>`
      + `<div class="ru2-nv2"><div>${open(ctx, tabs)}</div><div class="ru2-nv3">${open(ctx, side, 'ru2-op--flush')}</div></div>`
      + `<div class="ru2-nv4"><div>${ink(ctx, phone, 'ru2-op--flush ru2-op--tall')}`
      + `${job(ctx, [[hexOf(ctx, 'text'), 'text, rules and the tab bar panel, flooded'], [hexOf(ctx, 'action'), 'the bar on the current place'], [paper(ctx).hex, 'the top bar, tabs and sidebar']])}</div>`
      + `${para(`The current page is marked in the nav: ${m('aria-current')}, a ${A(act.name)} bar on the edge. It is the one mark.`, `Tabs switch a view on the same page. The selected tab takes the ${A(act.name)} bar.`,
        'The phone tab bar is 64 px, four places, an icon over a word. The current place takes the bar alone.')}</div>`);
  },

  // the row's anatomy, its parts bracketed under it; then the list itself, large, across the page, the second row in its hover fill;
  // the rules as a line of notes at the foot. Only the anatomy row carries a lead: the list shows that rows without one keep the order.
  lists(ctx) {
    const S = sc(ctx), ui = ctx.ui;
    const lead = ui.icon(ctx.brand.ui.rowIcon || 'package', 18);
    const rows = S.deliveries.slice(0, 4).map((d, i) => ui.row({ title: d.to, sub: d.when, end: d.price, chip: chip(ctx, d.status) }).replace('class="ui-row"', i === 1 ? 'class="ui-row is-hover"' : 'class="ui-row"')).join('');
    const d0 = S.deliveries[0];
    const brk = (cls, t) => `<span class="ru2-an__b ${cls}"><i>${A(t)}</i></span>`;
    const one = `<ul class="ui-list">${ui.row({ lead, title: d0.to, sub: d0.when, end: d0.price, chip: chip(ctx, d0.status) })}</ul><div class="ru2-an">${brk('ru2-an__b--l', 'Lead')}${brk('ru2-an__b--t', 'Title, then detail')}${brk('ru2-an__b--e', 'Trailing, then status')}</div>`;
    return pg(ctx, 'lists', `<div class="ru2-ls1"><div>${open(ctx, one)}</div>`
      + para('Lead, then title with a detail line, then the price or count, then the status.', 'The status is the only colour in a row. Words, not dots.',
        'A row is 64 px or more, with a hairline under it. Nothing is boxed.', `A row that opens something is a link and fills on hover, in ${m('--raised')}. Rows with no lead keep the same order.`) + `</div>`
      + `<div class="ru2-ls2">${open(ctx, `<ul class="ui-list">${rows}</ul>`)}`
      + `${job(ctx, [[hexOf(ctx, 'text'), 'text and the rules'], ...swords(ctx, S.deliveries.slice(0, 4)), [paper(ctx).hex, 'the rows']])}</div>`,
    '');
  },
};
