// UI kit document pages for theme 10, In use (25 ids, see engine/pages.js UIKIT_PAGES). Every component is the real engine component (ctx.ui),
// so a page shows what components.css ships; states are forced with the .is-* classes. Light pages stand on Chalk, dark pages on the dark surface.
// The theme's structure: the product on phones. Every component sits inside a phone screen on a sunken stage, a numbered pin marks what it points
// at, and the numbered key beside (or under) the phones says what each pin is. Styles are in css-kit.js (classes start k).
import { A, ratioText, fit, mk } from './helpers.js';
import { colourMap, tokenGroups, statusText } from '../../engine/tokens.js';

const m = (s) => `<span class="mono">${A(s)}</span>`;
const rt = (ctx, a, b) => ratioText(ctx.fmt(ctx.ratio(a, b)));
const NW = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const nw = (n) => { const w = NW[n] || String(n); return w[0].toUpperCase() + w.slice(1); };
const sc = (ctx) => ctx.brand.ui.screen.content;
const uniq = (html, tag) => html.replace(/dlg-t/g, tag);
const radiusText = (px) => (px >= 999 ? 'Pill' : `${px} px`);
const byRole = (ctx, role) => ctx.colours.find((c) => c.role === role);

// one kit page: running head, title, a short lead, then a .ui body (dark tokens on the dark pages)
function kpage(ctx, id, lead, inner, { dark = false, cls = '' } = {}) {
  const p = ctx.pages.find((x) => x.id === id);
  return `<section class="pg pg--std pg--k${dark ? ' pg--kdark' : ''} ${cls}" data-page="${id}"><div class="hd"><span>${A(ctx.brand.name)} UI kit, in use</span><span class="fo">${ctx.pageNo(id)}</span></div><h1 class="ttl">${A(p.title)}</h1>${lead ? `<p class="klead">${lead}</p>` : ''}<div class="ui kb"${dark ? ' data-theme="dark"' : ''}>${inner}</div></section>`;
}

// ---- the phone, the pin and the key
// a numbered pin beside the thing it points at; o.i shrinks the wrapper to the content (corner pin), o.l puts the pin on the left, o.cls picks a mode
// (kn--c corner in a grid cell, kn--rc beside a chip, kn--r beside a row, kn--d above a dialog), o.s adds inline style
const pin = (n, html, o = {}) => `<div class="kn${o.i ? ' kn--in' : ''}${o.cls ? ' ' + o.cls : ''}">${html}<span class="mk kmk${o.l ? ' kmk--l' : ''}"${o.s ? ` style="${o.s}"` : ''}>${n}</span></div>`;
// a phone screen: status bar with the time, then the body. o.dark makes it a dark phone, o.foot goes under the body (a tab bar), o.w sets the width
const phone = (ctx, inner, o = {}) => `<div class="ui kp${o.cls ? ' ' + o.cls : ''}"${o.dark ? ' data-theme="dark"' : ''}${o.w ? ` style="--pw:${o.w}px"` : ''}>${o.bar === false ? '' : `<div class="ksb"><span class="num">${A(sc(ctx).time)}</span>${o.pin ? `<span class="mk kmk kmk--sb">${o.pin}</span>` : ''}</div>`}<div class="kp-b">${inner}</div>${o.foot || ''}</div>`;
const stage = (inner, cls = '') => `<div class="kstage${cls ? ' ' + cls : ''}">${inner}</div>`;
// stage on the left, the key on the right, optional notes under the stage
const side = (ph, right, below = '') => `<div class="kside"><div class="kside-l">${stage(ph)}${below}</div><div class="kside-r">${right}</div></div>`;
// the key: one numbered row per pin. items are inner html; rowCls styles each row
const kt = (t, d) => `<b>${t}</b>${d ? `<span>${d}</span>` : ''}`;
const kkey = (items, { cols = 1, start = 1, rowCls = '', cls = '' } = {}) => `<ol class="kkey${cols === 2 ? ' kkey--2' : ''}${cls ? ' ' + cls : ''}" style="--rows:${Math.ceil(items.length / cols)}">${items.map((it, i) => `<li class="kk${rowCls ? ' ' + rowCls : ''}">${mk(start + i)}${rowCls ? it : `<div>${it}</div>`}</li>`).join('')}</ol>`;
const kh = (t) => `<h3 class="kh">${A(t)}</h3>`;
const wordmark = (ctx, dark, w = 120) => (ctx.edition === 'slot' ? `<strong class="ui-display">${A(ctx.brand.name)}</strong>` : ctx.logo.html(dark ? 'reversed' : 'colour', { width: fit(ctx, dark ? 'reversed' : 'colour', w, 28) }));
const tabbar = (ctx, ui, items) => `<nav class="ui-tabbar" aria-label="Sections">${items.map(([t, i], k) => `<a href="#"${k === 0 ? ' aria-current="page"' : ''}>${ui.icon(i, 20)}${A(t)}</a>`).join('')}</nav>`;

// ---- the booking form on a phone (cover) and the Today screen (screens)
function phoneBook(ctx, style) {
  const S = sc(ctx), F = S.form, ui = ctx.ui;
  return `<div class="ui kph" style="${style}" aria-hidden="true"><div class="ksb">${A(S.time)}</div><div class="kph-b"><div class="ui-display kph-h">${A(F.title)}</div>${pin(1, ui.field({ id: 'cv-1', label: F.pickup, value: F.pickupValue }))}${pin(2, ui.field({ id: 'cv-2', label: F.dropoff, value: F.dropoffValue }))}${pin(3, `<div class="kfld"><span class="ui-label">${A(F.size)}</span>${ui.segmented(F.sizes, 1)}</div>`)}${pin(4, ui.field({ id: 'cv-3', label: F.ready, value: F.readyValue }))}</div>
</div>`;
}
const pool = (ctx, S) => `<div class="kpool">${[20, 40, 60, 80].map((x) => `<i class="lane" style="left:${x}%"></i>`).join('')}<span class="fl">${A(S.to)}</span></div>`;
const teacher = (ctx, S) => `<div class="kteach"><span class="ui-avatar kav">${A(S.initials)}</span><div class="kteach-t"><b>${A(S.rider.split(',')[0])}</b><span>${A(S.riderNote)}</span></div>${ctx.ui.btn(S.call, { variant: 'secondary', size: 'sm', iconLeft: 'message-circle' })}</div>`;

function screenPage(ctx, id, dark) {
  const S = sc(ctx), ui = ctx.ui;
  const later = `<ul class="ui-list">${S.deliveries.slice(1, 4).map((d) => ui.row({ lead: ui.icon('waves', 18), title: d.to, sub: d.when, end: d.price, chip: ui.statusChip(d.status) })).join('')}</ul>`;
  const body = `${pin(1, `<div class="khead">${wordmark(ctx, dark)}</div>`, { i: 1, cls: 'kn--rc' })}${pin(2, ui.statusChip('booked'), { i: 1, cls: 'kn--rc' })}${pin(3, `<h2 class="ui-display kscr-h">${A(S.eta)}</h2><p class="kscr-p">${A(S.pickup)}</p>`)}${pin(4, pool(ctx, S))}${pin(5, teacher(ctx, S))}${pin(6, `<h3 class="kh kh--in">Later this week</h3>${later}`)}${pin(7, ui.btn(S.form.book, { iconRight: 'arrow-right' }), { i: 1 })}`;
  const key = kkey([
    kt('Wordmark', `The brand sits top left. The time is in the status bar above it.`),
    kt('The status first', 'The status words say where the lesson stands before anything else.'),
    kt('One headline', `The time and place is the headline, with who and where underneath. ${m('--text-soft')} for the detail.`),
    kt('Float marks the lane', 'The lane sits in the pool, behind Deep end type. It is the only Float on the screen.'),
    kt('Who is waiting', `${A(S.riderNote)}. The one secondary action is ${A(S.call)}.`),
    kt('Later this week', 'One row is one lesson: the swimmer, when and where, the price, where it stands.'),
    kt('One thing to do', `${A(S.form.book)}. The only filled button, in ${A(byRole(ctx, 'action').name)}.`),
  ]);
  const lead = dark ? 'The same screen after dark. The roles swap values and nothing moves. Float is still the lane in the pool, and the one filled button is still the one thing to do.' : `${A(ctx.brand.ui.screen.title)}: where the lesson is, who is waiting, and what is booked next. The lane is the only Float on the page.`;
  return kpage(ctx, id, lead, side(phone(ctx, body, { cls: 'kp--scr', dark }), key), { dark });
}

// ---- colour roles, in use: two things on one phone, a key of every role with its pair and ratio
function roleRows(ctx, mode) {
  const M = colourMap(ctx, mode);
  const R = (a, b) => rt(ctx, M[a], M[b]);
  const g = (label, tok) => [label, tok, M[tok], M.text, '', R('text', tok)];
  const t = (label, tok, bgTok) => [label, tok, M[bgTok], M[tok], '', R(tok, bgTok)];
  const st = (label, tok) => [label, tok, M.surface, M[tok], `box-shadow:inset 0 0 0 1px ${M.divider}`, R(tok, 'surface')];
  return [
    g('Surface', 'surface'), g('Raised', 'raised'), g('Sunken', 'sunken'),
    t('Text', 'text', 'surface'), t('Soft text', 'text-soft', 'surface'), t('Quiet text', 'quiet', 'surface'), t('Quiet on sunken', 'quiet-sunken', 'sunken'),
    ['Control edge', 'edge', M.surface, M.text, `box-shadow:inset 0 0 0 var(--w-control) ${M.edge}`, R('edge', 'surface')],
    ['Divider', 'divider', M.surface, M.text, `box-shadow:inset 0 -1px 0 ${M.divider}`, R('divider', 'surface')],
    ['Focus ring', 'focus', M.surface, M.text, `box-shadow:inset 0 0 0 2px ${M.focus}`, R('focus', 'surface')],
    ['Action', 'action', M.action, M['action-label'], '', R('action', 'surface')],
    ['Action hover', 'action-hover', M['action-hover'], M['action-label'], '', R('action-label', 'action-hover')],
    ['Action pressed', 'action-pressed', M['action-pressed'], M['action-label'], '', R('action-label', 'action-pressed')],
    ['Action label', 'action-label', M.action, M['action-label'], '', R('action-label', 'action')],
    ['Disabled text', 'disabled-text', M['disabled-bg'], M['disabled-text'], '', R('disabled-text', 'disabled-bg')],
    ['Scrim', 'scrim', M.scrim, M.scrim, '', null],
    st('Success', 'success'), st('Warning', 'warning'), st('Danger', 'danger'), st('Info', 'info'),
  ].map(([label, tok, bg, fg, ring, ratio]) => ({ label, tok, val: M[tok], bg, fg, ring, ratio }));
}
const roleKey = (r) => `<span class="ksw" style="background:${r.bg};color:${r.fg};${r.ring}">${r.tok === 'scrim' ? '' : 'Aa'}</span><span class="krn"><b>${A(r.label)}</b>${m('--' + r.tok)}</span><span class="krr"><b>${r.ratio || 'Overlay'}</b>${m(r.val)}</span>`;

function colourPage(ctx, id, mode) {
  const dark = mode === 'dark', ui = ctx.ui, S = sc(ctx), F = S.form, X = S.example;
  const R = ctx.roles[mode], nm = (hex) => (ctx.colours.find((c) => c.hex.toLowerCase() === hex.toLowerCase()) || {}).name || hex;
  const roles = roleRows(ctx, mode);
  const order = ['surface', 'raised', 'sunken', 'text', 'text-soft', 'quiet', 'quiet-sunken', 'divider', 'success', 'warning', 'danger', 'info', 'edge', 'focus', 'action', 'action-label', 'action-hover', 'action-pressed', 'disabled-text', 'scrim'];
  const n = (tok) => order.indexOf(tok) + 1;
  const chip = (tok, sid) => pin(n(tok), ui.statusChip(sid), { i: 1 });
  const body = `<div class="krow2">${chip('success', 'booked')}${chip('warning', 'waitlist')}${chip('danger', 'closed')}${chip('info', 'done')}</div>
${pin(n('text'), `<h2 class="ui-display kscr-h kscr-h--s">${A(S.eta)}</h2>`)}${pin(n('text-soft'), `<p class="kscr-p">${A(S.pickup)}</p>`)}${pin(n('quiet'), `<p class="kq">${A(S.riderNote)}</p>`)}
<div class="kfr">${pin(n('raised'), `<div class="kraise"><span class="kq">${A(S.paidLabel)}</span><b class="num">${A(S.paid)}</b></div>`, { l: 1 })}${pin(n('sunken'), pin(n('quiet-sunken'), `<div class="ksunk"><span>Pool opens</span><b class="num">${A(S.time)}</b></div>`, { l: 1, cls: 'kn--c' }))}</div>
${pin(n('divider'), `<ul class="ui-list">${ui.row({ lead: ui.icon('waves', 18), title: S.deliveries[1].to, sub: S.deliveries[1].when, end: S.deliveries[1].price })}</ul>`)}
<div class="kfr">${pin(n('edge'), ui.field({ id: 'cl-1', label: F.pickup, value: F.pickupValue }), { l: 1 })}${pin(n('focus'), ui.field({ id: 'cl-2', label: F.dropoff, value: F.dropoffValue, state: 'focus' }))}</div>
${pin(n('action'), pin(n('action-label'), ui.btn(F.book), { i: 1, l: 1 }), { i: 1 })}
<div class="krow2">${pin(n('action-hover'), ui.btn(X.small, { size: 'sm', state: 'hover' }), { i: 1 })}${pin(n('action-pressed'), ui.btn(X.small, { size: 'sm', state: 'pressed' }), { i: 1 })}${pin(n('disabled-text'), ui.btn(X.small, { size: 'sm', state: 'disabled' }), { i: 1 })}</div>
${pin(n('scrim'), '<div class="kscrimband"></div>')}`;
  const ph = phone(ctx, body, { cls: 'kp--col', dark });
  const key = kkey(order.map((tok) => roleKey(roles.find((r) => r.tok === tok))), { rowCls: 'kk--c' });
  const cap = `<p class="kcap kcap--cap">${dark ? `In dark the action is ${A(nm(R.action))} and its label ${A(nm(R.actionLabel))}, so the one filled button still stands out on ${A(nm(R.surface))}.` : `In light the action is ${A(nm(R.action))} and its label ${A(nm(R.actionLabel))}. The roles, in use.`}</p>`;
  const lead = `Components read ${m('--action')}, never a palette name, so ${dark ? 'dark' : 'light'} changes nothing in the markup. Text under 24 px needs 4.5&nbsp;:&nbsp;1. Edges, the ring and fills need 3&nbsp;:&nbsp;1.`;
  return kpage(ctx, id, lead, side(ph, key, cap), { dark, cls: 'pg--kcol' });
}

export const uikit = {
  cover(ctx) {
    const B = ctx.brand, slot = ctx.edition === 'slot', S = sc(ctx), F = S.form;
    const name = slot ? `<div class="slot-corner">${ctx.logo.html('colour', { width: 300, color: ctx.roles.light.text, label: 'Your logo goes here' })}</div>` : `<div class="name">${ctx.logo.html('colour', { width: 330 })}</div>`;
    const keys = [[F.pickup, F.pickupValue], [F.dropoff, F.dropoffValue], [F.size, F.sizes[1]], [F.ready, F.readyValue]];
    return `<section class="pg pg--cover pg--kcover" data-page="cover"><div class="stripe"></div>
<div class="top"><span>${A(B.name)} UI kit</span><span class="num">Version ${A(B.version.number)}</span></div>${name}
<p class="sub">UI kit. ${A(B.lines.primary)}</p>
${phoneBook(ctx, 'left:378px;top:560px')}
<p class="note cap"><b>Book a lesson, ${A(S.time)} pm</b>${A(B.product)}</p>
<div class="kcover-key">${kkey(keys.map(([t, d]) => kt(A(t), A(d))))}</div>
<p class="ver">${A(B.city)}<br>${A(ctx.date)}</p></section>`;
  },

  contents(ctx) {
    const rows = ctx.sections.map((s) => `<li>${mk(s.n)}<div class="ktoc-t"><span class="ktoc-h">${A(s.title)}</span><span class="ktoc-s">${s.pages.map((p) => A(p.title)).join(', ')}</span></div><span class="ktoc-p">${s.pages[0].no}</span></li>`).join('');
    return `<section class="pg pg--std pg--kcontents" data-page="contents"><div class="kstripe"></div><div class="hd"><span>${A(ctx.brand.name)} UI kit, in use</span><span class="fo">${ctx.pageNo('contents')}</span></div><h1 class="ttl">Contents</h1><div class="ui kstage kstage--toc">${phone(ctx, `<ol class="ktoc">${rows}</ol>`, { cls: 'kp--toc' })}</div></section>`;
  },

  'colour-light': (ctx) => colourPage(ctx, 'colour-light', 'light'),
  'colour-dark': (ctx) => colourPage(ctx, 'colour-dark', 'dark'),

  'type-scale'(ctx) {
    const S = sc(ctx), F = S.form, B = ctx.brand, fb = B.fonts.body;
    const sample = { caption: F.notesHelp, label: F.pickup, body: S.pickup, control: F.book, 'title-s': S.dialog.title, title: S.rider, headline: S.eta };
    const list = [...ctx.uiType].reverse();
    const body = list.map((t, i) => {
      const face = t.face === 'display' ? 'font-family:var(--ff-display);letter-spacing:-0.01em;' : 'font-family:var(--ff-body);';
      return pin(i + 1, `<span class="kts" style="${face}font-size:${t.size}px;line-height:${t.line}px;font-weight:${t.weight}">${A(sample[t.token] || t.use)}</span>`);
    }).join('');
    const key = kkey(list.map((t) => `${m(t.token)}<b class="num">${t.size} / ${t.line} / ${t.weight}</b><span>${A(t.use)}</span>`));
    const faces = `<div class="kfaces"><div class="kface"><span class="ui-display kface-a">Aa</span><span class="kcap"><b>${A(B.fonts.display.family)} ${B.fonts.display.weights.join(', ')}</b>Titles, the time and the status line. Never under 20.</span></div><div class="kface"><span class="kface-a kface-a--b">Aa</span><span class="kcap"><b>${A(fb.family)} ${fb.weights.join(', ')}</b>Everything people read, and every control.</span></div></div>`;
    const lead = `Sizes are px, then line height, then weight. ${A(B.fonts.display.family)} says the time and the place; ${A(fb.family)} does the rest. ${nw(ctx.uiType.length)} sizes, and nothing smaller than 12.`;
    return kpage(ctx, 'type-scale', lead, side(phone(ctx, body, { cls: 'kp--type' }), key, faces));
  },

  spacing(ctx) {
    const base = ctx.brand.ui.spacingBase, Z = 2;
    const uses = ['Icon to label, inside a chip', 'Label to field, row gaps', 'Field padding', 'Card padding', 'Button sides, between fields', 'Between groups', 'Between sections', 'Page header to body', 'Hero gaps'];
    const g1 = ctx.space[1].px, g2 = ctx.space[4].px, F = sc(ctx).form, ui = ctx.ui;
    const rows = ctx.space.map((s, i) => `<li class="ksr">${m('--' + s.token.replace('space-', 'sp-'))}<span class="ksr-b"><i style="width:${s.px * Z}px"></i></span><b class="num">${s.px}</b><span class="kcap">${A(uses[i] || '')}</span></li>`).join('');
    const body = `<div class="ui-display kph-h">${A(F.title)}</div>${pin(1, ui.field({ id: 'sp-1', label: F.pickup, value: F.pickupValue }))}${pin(2, `<div class="kband" style="height:${g2}px"><b class="num">${g2}</b></div>`)}${pin(3, ui.field({ id: 'sp-2', label: F.dropoff, value: F.dropoffValue }))}`;
    const notes = kkey([
      kt('Inside a field', `The label sits ${g1} px above its input: ${m('--' + ctx.space[1].token.replace('space-', 'sp-'))}.`),
      kt('Between fields', `${g2} px, the Float band: ${m('--' + ctx.space[4].token.replace('space-', 'sp-'))}. Always bigger than the gap inside.`),
      kt('Always a step', 'No 10 and no 18. If a gap is not on the scale, the layout is wrong.'),
    ]);
    const lead = `Every gap is a step on this scale, in steps of ${base}. A gap inside a group is smaller than the gap between groups, so grouping reads at a glance. Controls are 44 tall: ${nw(44 / base).toLowerCase()} steps.`;
    return kpage(ctx, 'spacing', lead, side(phone(ctx, body, { cls: 'kp--sp' }), `<ul class="ksp">${rows}</ul><p class="kcap kcap--cap">Drawn at ${Z}&times;. Figures are px at 1&times;.</p>`, `<div class="kside-n">${notes}</div>`), { cls: 'pg--ksp' });
  },

  'radii-borders'(ctx) {
    const S = sc(ctx), ui = ctx.ui, F = S.form;
    const R = Object.fromEntries(ctx.radii.map((r) => [r.token.replace('radius-', ''), r]));
    const tk = (k) => `${m('--r-' + k)}`;
    const cap = (k) => `${tk(k)}, ${radiusText(R[k].px)}`;
    const [bh, bc, bf] = ctx.borders;
    const body = `${pin(1, `<div class="krow2">${ui.btn(F.book)}${ui.btn(S.example.secondary, { variant: 'secondary' })}</div>`)}
${pin(2, ui.field({ id: 'rb-i', label: F.pickup, value: F.pickupValue }))}
${pin(3, ui.toast(S.toast), { i: 1 })}
${pin(4, `<div class="kcard">${ui.card({ meta: S.status, title: S.rider, text: S.riderNote })}</div>`)}
${pin(5, `<div class="krow2"><span class="ui-avatar">${A(S.initials)}</span>${ui.switch('Text me', { checked: true })}</div>`, { i: 1, cls: 'kn--rc' })}
${pin(6, `<ul class="ui-list kw">${ui.row({ title: S.deliverTo, sub: S.from, end: S.paid })}</ul>`)}
<div class="kfr">${pin(7, ui.field({ id: 'rb-b', label: F.dropoff, value: F.dropoffValue }), { l: 1 })}${pin(8, ui.field({ id: 'rb-f', label: F.dropoff, value: F.dropoffValue, state: 'focus' }))}</div>`;
    const key = kkey([
      kt(cap('button'), R.button.use), kt(cap('input'), R.input.use), kt(cap('control'), R.control.use), kt(cap('card'), R.card.use),
      kt(`${m('--r-round')}, round`, R.round.use), kt(`${m('--w-hairline')}, ${bh.px} px`, bh.use), kt(`${m('--w-control')}, ${bc.px} px`, bc.use), kt(`${m('--w-focus')}, ${bf.px} px`, bf.use),
    ].map((x) => x));
    const lead = `Actions are pills and fields are ${R.input.px} px, so a button never reads as a place to type. Cards are ${R.card.px}. The focus ring sits outside the edge on a ${bf.px} px gap of the ground, so it shows on any fill.`;
    return kpage(ctx, 'radii-borders', lead, side(phone(ctx, body, { cls: 'kp--rb' }), key));
  },

  elevation(ctx) {
    const S = sc(ctx), ui = ctx.ui, g = tokenGroups(ctx);
    const dlg = uniq(ui.dialog({ title: S.dialog.title, body: S.dialog.body, confirm: S.dialog.confirm, keep: S.dialog.keep, danger: true }), 'dlg-el');
    const body = `${pin(2, ui.card({ meta: S.deliverToLabel, title: S.deliverTo, text: S.eta, raised: true }))}${pin(3, `<div class="ksunk ksunk--b"><span>Pool opens</span><b class="num">${A(S.time)}</b></div>`)}${pin(4, ui.card({ meta: S.status, title: S.eta, text: S.pickup }))}${pin(5, `<div class="ui-scrim kscrim-in">${dlg}</div>`)}`;
    const key = kkey([
      kt('Surface', `${m('--surface')}, the page and the ground of every list.`), kt('Raised', `${m('--raised')}, for empty states, table headers and sidebars.`), kt('Sunken', `${m('--sunken')}, for skeletons, avatars and hover on a row.`),
      kt('Hairline', `${m('--divider')} at ${ctx.borders[0].px} px and no shadow. A raised card drops the line.`), kt('Floating', `Dialog is the only thing that floats: ${m('--shadow-float')} on a ${m('--scrim')} ground.`),
    ]);
    const lead = `${A(ctx.brand.ui.elevationNote)} ${m('--shadow-float')} is ${m(String(g.shadow['shadow-float']))}.`;
    return kpage(ctx, 'elevation', lead, side(phone(ctx, body, { cls: 'kp--el', pin: 1 }), key));
  },

  states(ctx) {
    const S = sc(ctx), ui = ctx.ui, F = S.form, X = S.example;
    const P = (st) => ui.btn(F.book, { state: st }), Sc = (st) => ui.btn(X.secondary, { variant: 'secondary', state: st });
    const fld = (st, id, o = {}) => ui.field({ id, label: F.ready, value: F.readyValue, state: st, ...o });
    const ck = (o) => ui.check(X.checks[0], o), sw = (o) => ui.switch(X.switches[0].split(' when')[0], { checked: true, ...o });
    const rowsDef = [
      ['Rest', 'How every control starts. Nothing is decorated until it is used.', [`<div class="krow2">${P()}${Sc()}</div>`, fld(undefined, 'st-r'), `<div class="krow2">${ck()}${sw()}</div>`]],
      ['Hover', `Action steps to ${m('--action-hover')}. Outlined controls fill ${m('--sunken')}. Touch screens skip hover.`, [`<div class="krow2">${P('hover')}${Sc('hover')}</div>`]],
      ['Focus', `A ${ctx.borders[2].px} px ring in ${m('--focus')} on a ${ctx.borders[2].px} px gap, on every control and for keyboards only.`, [`<div class="krow2">${P('focus')}${Sc('focus')}</div>`, fld('focus', 'st-f'), `<div class="krow2">${ck({ state: 'focus' })}${sw({ state: 'focus' })}</div>`]],
      ['Pressed', `Action goes to ${m('--action-pressed')} and the control scales to 0.97.`, [`<div class="krow2">${P('pressed')}${Sc('pressed')}</div>`]],
      ['Disabled', `${m('--disabled-bg')} fill and ${m('--disabled-text')} type. It never scales, and the page says why.`, [`<div class="krow2">${P('disabled')}${Sc('disabled')}</div>`, fld(undefined, 'st-d', { disabled: true }), `<div class="krow2">${ck({ disabled: true })}${sw({ disabled: true })}</div>`]],
      ['Error', `${m('--danger')} edge and a message under the field that says what to do.`, [fld(undefined, 'st-e', { error: F.readyError })]],
    ];
    const grp = (i) => pin(i + 1, `<div class="kgrp">${rowsDef[i][2].join('')}</div>`);
    const a = phone(ctx, [0, 1, 3].map(grp).join(''), { cls: 'kp--st', bar: false }), b = phone(ctx, [2, 4, 5].map(grp).join(''), { cls: 'kp--st', bar: false });
    const key = kkey(rowsDef.map(([n, r]) => kt(n, r)), { cols: 2 });
    return kpage(ctx, 'states', 'Rest, hover, focus, pressed, disabled and error, drawn on the real components. A control with no change in a state is left out, not repeated.', `${stage(a + b)}${key}`, { cls: 'pg--kstates' });
  },

  buttons(ctx) {
    const S = sc(ctx), F = S.form, ui = ctx.ui, X = S.example, R = ctx.roles.light, rd = ctx.radius;
    const act = byRole(ctx, 'action'), ctl = ctx.uiType.find((t) => t.token === 'control');
    const pad = ctx.space[4].px;
    const va = [
      [ui.btn(F.book), 'Primary', `${A(act.name)}. One per screen.`],
      [ui.btn(X.secondary, { variant: 'secondary' }), 'Secondary', `${ctx.borders[1].px} px edge, for the second choice.`],
      [ui.btn(X.quiet, { variant: 'quiet' }), 'Quiet', 'Underlined, no fill.'],
      [ui.btn(X.danger, { variant: 'danger' }), 'Danger', 'Only for what cannot be undone.'],
    ];
    const sz = [
      [ui.btn(X.small, { size: 'sm' }), 'Small, 36', 'Inside rows and cards.'],
      [ui.btn(F.book), 'Default, 44', 'The thumb target.'],
      [ui.btn(F.book, { size: 'lg', iconRight: 'arrow-right' }), 'Large, 52', 'One per screen, at most.'],
      [ui.btn(S.call, { variant: 'secondary', iconLeft: 'message-circle' }), 'With an icon', 'Icon and label, 8 px apart.'],
    ];
    const Bk = X.small;
    const st = [
      [ui.btn(Bk), 'Default', `${rt(ctx, R.actionLabel, R.action)} label on ${A(act.name)}.`],
      [ui.btn(Bk, { state: 'hover' }), 'Hover', `${m(R.actionHover)}, ${rt(ctx, R.actionLabel, R.actionHover)}.`],
      [ui.btn(Bk, { state: 'focus' }), 'Focus', `${ctx.borders[2].px} px ring on a ${ctx.borders[2].px} px gap.`],
      [ui.btn(Bk, { state: 'pressed' }), 'Pressed', `${m(R.actionPressed)}, scaled to 0.97.`],
      [ui.btn(Bk, { state: 'disabled' }), 'Disabled', `${m(R.disabledBg)} fill, muted type.`],
    ];
    // rule pins ride on the buttons they are about: 14 primary, 15 default, 16 disabled, 17 secondary
    const all = [...va, ...sz, ...st];
    const pins = all.map(([b], i) => {
      let h = pin(i + 1, b, { i: 1 });
      if (i === 0) h = pin(14, h, { i: 1, l: 1 });
      if (i === 1) h = pin(17, h, { i: 1, l: 1 });
      if (i === 5) h = pin(15, h, { i: 1, l: 1 });
      if (i === 12) h = pin(16, h, { i: 1, l: 1 });
      return h;
    });
    const col = (from, n, tail = '') => phone(ctx, pins.slice(from, from + n).join('') + tail, { w: 200, cls: 'kp--bt' });
    const stg = stage(`${col(0, 4)}${col(4, 4)}${col(8, 5, `<p class="ui-help">${A(F.bookWhy)}</p>`)}`, 'kstage--3');
    const key = kkey([...all.map(([, n, d]) => kt(n, d)),
      kt('One filled button a screen', `It is the only ${A(act.name)} the thumb needs. Secondary buttons carry an edge, never a fill.`), kt('The label is what happens next', `${A(F.book)}. ${A(S.dialog.confirm)}. Never "Submit" or "OK".`), kt('Disabled says why', `${A(F.bookWhy)} The reason sits beside the button, not in a tooltip.`), kt('Pills for actions', `Buttons are ${radiusText(rd.button).toLowerCase()} and fields are ${rd.input} px, so the two never get mixed up. Height ${m('44')}, side padding ${m(pad)}, ${A(ctx.brand.fonts.body.family)} ${ctl.weight} at ${m(ctl.size)} px.`)], { cols: 2 });
    return kpage(ctx, 'buttons', 'Four kinds, three sizes, five states. Every one is a real button from components.css.', `${stg}${key}`, { cls: 'pg--kbt' });
  },

  inputs(ctx) {
    const S = sc(ctx), F = S.form, ui = ctx.ui;
    const sel = (id, o) => ui.field({ id, label: F.size, kind: 'select', options: F.sizes, value: F.sizes[1], ...o });
    const txt = (id, o) => ui.field({ id, label: F.dropoff, value: F.dropoffValue, ...o });
    const ta = (id, o) => ui.field({ id, label: F.notes, kind: 'textarea', value: 'Goggles, please.', ...o });
    const rows = [
      [txt('in-t1', { value: '', placeholder: 'Pool name' }), sel('in-s1'), ui.field({ id: 'in-a1', label: F.notes, kind: 'textarea', help: F.notesHelp })],
      [txt('in-t2', { state: 'focus' }), sel('in-s2', { state: 'focus' }), ta('in-a2', { state: 'focus' })],
      [ui.field({ id: 'in-t4', label: F.ready, value: F.readyValue, error: F.readyError }), sel('in-s4', { error: 'Pick a level.' }), ta('in-a4', { error: 'Keep the note short.' })],
      [txt('in-t5', { disabled: true }), sel('in-s5', { disabled: true }), ta('in-a5', { disabled: true })],
    ];
    const col = (c) => phone(ctx, rows.map((r, i) => {
      let h = pin(i + 1, r[c]);
      if (c === 0 && i === 0) h = pin(5, h, { l: 1 });
      if (c === 0 && i === 2) h = pin(6, h, { l: 1 });
      if (c === 1 && i === 0) h = pin(7, h, { l: 1 });
      return h;
    }).join(''), { w: 200, cls: 'kp--in' });
    const b = ctx.borders;
    const heads = ['Text field', 'Select', 'Textarea'];
    const stg = `<div class="kstage kstage--3 kstage--h">${[0, 1, 2].map((c) => `<div class="kcol"><h3 class="kh">${heads[c]}</h3>${col(c)}</div>`).join('')}</div>`;
    const key = kkey([
      kt('Rest', 'How every control starts. Nothing is decorated until it is used.'), kt('Focus', `A ${b[2].px} px ring in ${m('--focus')} on a ${b[2].px} px gap, on every control and for keyboards only.`),
      kt('Error', `${m('--danger')} edge and a message under the field that says what to do.`), kt('Disabled', `${m('--disabled-bg')} fill and ${m('--disabled-text')} type. It never scales, and the page says why.`),
      kt('A label, always above', 'It stays visible while you type. A placeholder is a hint, never the label.'), kt('The hint becomes the error', `When a field fails, the hint under it gives way to what went wrong and what to do: ${A(F.readyError)}`), kt(`${ctx.radius.input} px, not a pill`, 'Fields are 44 tall with a 12 px corner, so they read as a place to type beside a pill button.'),
    ], { cols: 2 });
    return kpage(ctx, 'inputs', 'Text fields, selects and textareas share one shape: label above, 44 tall, a 1.5 px edge in the control colour.', `${stg}${key}`, { cls: 'pg--kin' });
  },

  choices(ctx) {
    const ui = ctx.ui, S = sc(ctx), X = S.example, F = S.form;
    const rowsDef = [['Off', {}], ['On', { checked: true }], ['Focus', { state: 'focus', checked: true }], ['Disabled', { disabled: true }], ['Disabled, on', { disabled: true, checked: true }]];
    const sw = X.switches[0].split(' when')[0];
    const lines = (f) => rowsDef.map(([n, o], i) => `<div class="kct">${f(o, i)}<span class="kcap">${n}</span></div>`).join('');
    const A1 = phone(ctx, pin(1, lines((o, i) => ui.check(X.checks[0], { ...o, name: 'cb' + i }))), { w: 200, cls: 'kp--ch' });
    const A2 = phone(ctx, pin(2, lines((o, i) => ui.check(X.radios[0], { ...o, type: 'radio', name: 'rd' + i }))), { w: 200, cls: 'kp--ch' });
    const A3 = phone(ctx, pin(3, lines((o) => ui.switch(sw, o))), { w: 200, cls: 'kp--ch' });
    const seg = `<div class="kp-b kseg">${pin(4, ui.segmented(F.sizes, 1))}${pin(5, ui.segmented(F.sizes, 0, { disabled: true }))}</div>`;
    const wide = `<div class="ui kp kp--wide">${seg}</div>`;
    const key = kkey([
      kt('Checkbox', 'A list of yes or no.'), kt('Radio', 'One of a few.'), kt('Switch', 'Acts at once.'),
      kt('Segmented control', `One choice, always one. The picked segment fills with ${m('--text')}, so it reads without colour.`), kt('Segmented, disabled', 'All segments grey together.'),
    ], { cols: 2 });
    const lead = 'A checkbox is a list of yes or no. A radio is one of a few. A switch acts at once. The whole label is the target, 44 px tall, and on reads without colour.';
    return kpage(ctx, 'choices', lead, `${stage(A1 + A2 + A3, 'kstage--3')}${stage(wide, 'kstage--w')}${key}`, { cls: 'pg--kch' });
  },

  cards(ctx) {
    const S = sc(ctx), ui = ctx.ui;
    const media = ctx.photo('lane-ropes', { cls: 'ui-card__media' });
    const body = `${pin(1, pin(6, ui.card({ media, meta: S.status, title: S.eta, text: S.pickup }), { l: 1 }))}${pin(2, pin(5, ui.card({ meta: S.status, title: S.rider, text: S.riderNote }), { l: 1 }))}${pin(3, ui.card({ meta: S.deliverToLabel, title: S.deliverTo, text: S.eta, raised: true }))}${pin(4, `<div class="kstats">${ui.stat(S.paid, S.paidLabel)}${ui.stat(S.time, 'Pool opens')}</div>`)}`;
    const key = kkey([
      kt('With a photo', 'The photo takes 16 : 9 and the card keeps its hairline.'), kt('Without a photo', 'Meta, title, one line.'), kt('Raised', `${m('--raised')} ground and no edge, for a second level.`), kt('Stat', 'One number, one label.'),
      kt('One thing', 'If a card needs two headings, it is two cards.'), kt('A hairline, not a shadow', `${m('--divider')} at ${ctx.borders[0].px} px. Only a dialog floats.`), kt('The photo is a swimmer, not a pool', 'Cropped 16 : 9, with the lane ropes in frame.'),
    ]);
    return kpage(ctx, 'cards', 'A card holds one thing: a lesson, a swimmer, a number. It has a hairline and a 20 px corner, not a shadow. No card holds another card.', side(phone(ctx, body, { cls: 'kp--cards' }), key));
  },

  navigation(ctx) {
    const ui = ctx.ui, S = sc(ctx), X = S.example, act = byRole(ctx, 'action');
    const items = [...X.links, [X.account, 'user']];
    const top1 = `<nav class="ui-topbar ktop" aria-label="Main">${wordmark(ctx, false)}<div class="ui-topbar__links">${ui.links(X.links, 0)}</div></nav>`;
    const a = phone(ctx, `${pin(1, top1)}${pin(3, ui.crumbs([...X.crumbs, S.deliverTo]))}${pin(2, ui.tabs(X.tabs, 0))}`, { cls: 'kp--nav', w: 344, foot: pin(4, `<div class="kbar">${tabbar(ctx, ui, items)}</div>`) });
    const b = phone(ctx, pin(5, `<nav class="ui-sidebar" aria-label="Sections">${ui.links(items, 0)}</nav>`), { cls: 'kp--nav', w: 270 });
    const key = kkey([kt('Top bar', 'Wordmark first, then the links. On a phone the bar stacks.'), kt('Tabs', 'Same list, other view.'), kt('Breadcrumbs', 'The current page is in full ink.'), kt('Mobile tab bar', 'Four destinations, 64 px tall.'), kt('Sidebar', 'A bar on the left marks the page.')], { cols: 2 });
    const lead = `Where you are is always marked, and by more than colour: the current page has a 3 px bar in ${A(act.name)}. Links are 44 tall. The mobile bar holds four destinations at most.`;
    return kpage(ctx, 'navigation', lead, `${stage(a + b, 'kstage--eq')}${key}`);
  },

  lists(ctx) {
    const ui = ctx.ui, S = sc(ctx), d = S.deliveries, ic = (n) => ui.icon(n, 18);
    const all = `<ul class="ui-list">${d.map((x) => ui.row({ lead: ic('waves'), title: x.to, sub: x.when, end: x.price, chip: ui.statusChip(x.status) })).join('')}</ul>`;
    const link = `<ul class="ui-list">${ui.row({ lead: ic('calendar'), title: d[1].to, sub: d[1].when, end: d[1].price, href: '#' })}</ul>`;
    const plain = `<ul class="ui-list">${ui.row({ title: S.deliverTo, sub: S.from, end: S.paid })}</ul>`;
    const key = kkey([kt('Five lessons, actual size', ''), kt('As a link', `A tap opens the lesson. The row fills ${m('--sunken')} on hover.`), kt('Without an icon or status', 'For details, where nothing is chosen.')]);
    const lead = 'One row is one lesson. The swimmer comes first, then when and where, then the price and where the lesson stands. The whole row is the target.';
    return kpage(ctx, 'lists', lead, side(phone(ctx, `${pin(1, all)}${pin(2, link)}${pin(3, plain)}`, { cls: 'kp--ls' }), key));
  },

  status(ctx) {
    const pairs = (mode) => { const M = colourMap(ctx, mode); const o = {}; for (const s of ctx.status) o[s.id] = [statusText(ctx, mode, s).hex, M.surface]; return o; };
    const L = pairs('light'), D = pairs('dark'), act = byRole(ctx, 'action');
    const meaning = { booked: 'A lane is held for the swimmer. The lane and time follow in the title.', today: `Today's lesson. In the action colour, ${A(act.name)}.`, waitlist: 'Full, with a place in line. Say where, and offer the nearest yes.', closed: 'Not running. Say why, what it costs, and the one fix.', done: 'Finished. Lead with what she did, then when she is back.' };
    const S = sc(ctx), ui = ctx.ui;
    const order = S.deliveries.map((d) => d.status);
    const rows = (dark) => phone(ctx, `<ul class="ui-list">${S.deliveries.map((d, i) => ui.row({ lead: ui.icon('waves', 18), title: d.to, sub: d.when, end: d.price, chip: pin(i + 1, ui.statusChip(d.status), { i: 1, cls: 'kn--r' }) })).join('')}</ul>`, { dark, cls: 'kp--sts' });
    const key = kkey(order.map((id) => { const s = ctx.status.find((x) => x.id === id); return `${kt(A(s.label), `<span class="kratio"><b class="num">${rt(ctx, ...L[id])}</b> light, <b class="num">${rt(ctx, ...D[id])}</b> dark</span>${meaning[id] || ''}`)}`; }), { cols: 2 });
    const lead = `Status is words first, colour second. ${nw(ctx.status.length)} states, each in plain words in one colour, so it reads without the colour. The ratio is the words on the page ground. A count badge sits on a tab or an icon: <span class="ui"><span class="ui-badge">3</span></span>`;
    return kpage(ctx, 'status', lead, `${stage(rows(false) + rows(true))}${key}`, { cls: 'pg--ksts' });
  },

  feedback(ctx) {
    const ui = ctx.ui, S = sc(ctx);
    const a = phone(ctx, pin(1, `<div class="kalerts">${ui.alert('info', S.pickup)}${ui.alert('success', S.toast)}${ui.alert('warning', S.form.readyError)}${ui.alert('danger', S.alert)}</div>`), { cls: 'kp--fb' });
    const b = phone(ctx, `${pin(2, ui.toast(S.toast), { i: 1 })}${pin(3, `<p class="ui-inline-msg">${ui.icon('info', 16)}${A(S.inline)}</p>`)}${pin(4, `<div class="kload">${ui.spinner()}<div class="kskel">${ui.skeleton('150px')}${ui.skeleton('100px')}${ui.skeleton('120px')}</div></div>`)}`, { cls: 'kp--fb' });
    const key = kkey([kt('Alert banners', 'A banner stays until it is dealt with.'), kt('Toast', 'Bottom of the screen, gone in five seconds. Undo stays reachable by keyboard.'), kt('Inline message', ''), kt('Loading', 'A spinner for a short wait. Longer lists get skeleton lines in the shape of the rows.')], { cols: 2 });
    return kpage(ctx, 'feedback', 'Say what happened and what to do, in one or two sentences. The icon and the words carry the meaning, and colour is the second cue.', `${stage(a + b, 'kstage--eq')}${key}`);
  },

  dialog(ctx) {
    const ui = ctx.ui, S = sc(ctx);
    const a = uniq(ui.dialog({ title: S.share, body: "Mia's lesson goes into your calendar: Tuesday at 4:15, Pool 2, lane 3.", confirm: 'Add to calendar', keep: 'Close' }), 'dlg-a');
    const b = uniq(ui.dialog({ title: S.dialog.title, body: S.dialog.body, confirm: S.dialog.confirm, keep: S.dialog.keep, danger: true }), 'dlg-b');
    const S2 = sc(ctx), ghost = `<div class="kghost" aria-hidden="true"><h2 class="ui-display kscr-h kscr-h--s">${A(S2.eta)}</h2><p class="kscr-p">${A(S2.pickup)}</p>${pool(ctx, S2)}<div class="kgrow"><i class="kgav"></i><span class="kgl"><i></i><i></i></span></div></div>`;
    const ph = (d, n) => phone(ctx, `${ghost}<div class="ui-scrim kscrim-ov">${pin(n, d, { cls: 'kn--d' })}</div>`, { cls: 'kp--dlg' });
    const key = kkey([kt('Modal', 'One action and a way out.'), kt('Confirmation', 'Danger is for what cannot be undone, and the button names what it does.')], { cols: 2 });
    const lead = 'A dialog asks one thing. The title is the question and the buttons answer it. The safe answer sits on the left and takes the focus. Esc and a press on the scrim close it.';
    return kpage(ctx, 'dialog', lead, `${stage(ph(a, 1) + ph(b, 2), 'kstage--eq')}${key}`);
  },

  table(ctx) {
    const ui = ctx.ui, S = sc(ctx), act = byRole(ctx, 'action');
    const sortBtn = (t, dir) => `<button type="button">${A(t)}${dir ? ui.icon(dir === 'asc' ? 'arrow-up' : 'arrow-down', 14) : ''}</button>`;
    const dot = (n) => `<span class="mk kmk kmk--row">${n}</span>`;
    const rows = S.deliveries.slice(0, 5).map((d, i) => `<tr${i === 0 ? ' aria-selected="true"' : ''}${i === 2 ? ' class="is-hover"' : ''}><td>${i === 0 ? dot(2) : i === 2 ? dot(3) : ''}${A(d.to)}</td><td>${A(d.when)}</td><td>${ui.statusChip(d.status)}</td><td class="is-num">${A(d.price)}</td></tr>`).join('');
    const table = `<table class="ui-table"><thead><tr><th scope="col" aria-sort="ascending"><span class="mk kmk">1</span>${sortBtn('Swimmer', 'asc')}</th><th scope="col">${sortBtn('When and where')}</th><th scope="col">Status</th><th scope="col" class="is-num">${sortBtn('Price')}</th></tr></thead><tbody>${rows}</tbody></table>`;
    const list = `<ul class="ui-list">${S.deliveries.slice(0, 3).map((d) => ui.row({ lead: ui.icon('waves', 18), title: d.to, sub: d.when, end: d.price, chip: ui.statusChip(d.status) })).join('')}</ul>`;
    const wide = `<div class="ui kp kp--wide kp--tbl"><div class="kp-b">${table}</div></div>`;
    const key = kkey([kt('Sorted', 'Swimmer, ascending. The arrow is the cue.'), kt('Selected', 'First row, with the Lane bar.'), kt('Hover', 'Third row, on pointer devices only.'), kt('Under 480 px it becomes a list', 'The same rows, the same order. The chip moves under the swimmer.')]);
    const lead = `A table is for comparing and a list is for choosing. A sortable header is a button and the sorted one shows its direction. Numbers sit right in tabular figures. A selected row has a 3 px ${A(act.name)} bar.`;
    return kpage(ctx, 'table', lead, `${stage(wide, 'kstage--w')}${side(phone(ctx, pin(4, list), { cls: 'kp--tl' }), key)}`, { cls: 'pg--ktbl' });
  },

  empty(ctx) {
    const S = sc(ctx), F = S.form, ui = ctx.ui, E = S.empty;
    const none = `<div class="ui-empty">${pin(3, `<h3 class="ui-empty__title">${A(E.title)}</h3>`)}<p class="ui-empty__text">${A(E.body)}</p>${pin(4, ui.btn(E.cta), { i: 1 })}</div>`;
    const first = `<div class="ui-empty"><h3 class="ui-empty__title">${A(F.title)}</h3><ol class="ksteps"><li>${mk(1)}${A(F.pickup)}</li><li>${mk(2)}${A(F.dropoff)}</li><li>${mk(3)}${A(F.ready)}</li></ol>${ui.btn(F.book, { disabled: true })}<p class="ui-help">${A(F.bookWhy)}</p></div>`;
    const a = phone(ctx, pin(1, pin(5, none, { l: 1 })), { cls: 'kp--em' }), b = phone(ctx, pin(2, first), { cls: 'kp--em' });
    const key = kkey([kt('Empty', 'No lessons booked yet.'), kt('First run', 'Before the first lesson.'), kt('Say what is missing', 'In words a parent would use at the pool door.'), kt('Offer one fix', 'One button, in Lane. Never two.'), kt('No illustration', 'The headline is the picture. Keep the panel quiet.')], { cols: 2 });
    const lead = 'Say what is missing and offer the one action that fixes it. First run lists what is needed in the order it is asked, and the disabled button says why. The panel is a raised ground with no edge, so it does not read as a card.';
    return kpage(ctx, 'empty', lead, `${stage(a + b, 'kstage--eq')}${key}`);
  },

  'screen-light': (ctx) => screenPage(ctx, 'screen-light', false),
  'screen-dark': (ctx) => screenPage(ctx, 'screen-dark', true),

  'screen-mobile'(ctx) {
    const S = sc(ctx), ui = ctx.ui, X = S.example;
    const items = [...X.links, [X.account, 'user']];
    const body = `${pin(1, ui.statusChip('booked'), { i: 1, cls: 'kn--rc' })}${pin(2, `<h2 class="ui-display kph-h kph-h--l">${A(S.eta)}</h2>`)}${pin(3, pool(ctx, S))}${pin(4, teacher(ctx, S))}`;
    const ph = phone(ctx, body, { cls: 'kp--m', w: 320, foot: pin(5, tabbar(ctx, ui, items), { s: 'top:-12px;right:8px' }) });
    const lead = `${A(ctx.brand.ui.screen.title)} at 390, in the light. The status leads, the time and place is the headline, and the lane is marked in the pool. No button needs Lane here.`;
    const side5 = kkey([kt('The status first', 'The status words say where the lesson stands before anything else.'), kt('One headline', 'Bricolage 30, the only display type on the screen.'), kt('Float marks the lane', 'The lane sits in the pool, behind Deep end type.'), kt('Who is waiting', `${A(S.riderNote)}. The one secondary action is Message.`), kt('Four destinations', 'The tab bar is 64 px and marks where you are with a Lane bar.')]);
    return kpage(ctx, 'screen-mobile', lead, side(ph, side5), { cls: 'pg--kphone' });
  },

  tokens(ctx) {
    const g = tokenGroups(ctx), L = colourMap(ctx, 'light'), D = colourMap(ctx, 'dark'), S = sc(ctx), ui = ctx.ui;
    const sw = (c) => `<i class="ktsw" style="background:${c}"></i>`;
    const keys = Object.keys(L);
    const colRows = keys.map((k) => `<div class="ktk"><span class="mono">--${k}</span><span class="ktv">${sw(L[k])}${m(L[k])}</span><span class="ktv">${sw(D[k])}${m(D[k])}</span></div>`).join('');
    const line = (k, v) => `<div class="ktk ktk--2"><span class="mono">--${k}</span>${m(v)}</div>`;
    const fam = (id) => ctx.brand.fonts[id].family;
    const sp = Object.entries(g.space).map(([k, v]) => line(k, v)).join('');
    const rd = Object.entries(g.radius).map(([k, v]) => line(k, v)).join('');
    const wd = Object.entries(g.width).map(([k, v]) => line(k, v)).join('');
    const ff = [['ff-display', fam('display')], ['ff-body', fam('body')], ['ff-mono', fam('mono')]].map(([k, v]) => `<div class="ktk ktk--2"><span class="mono">--${k}</span><span>${A(v)}</span></div>`).join('');
    const tx = ctx.uiType.map((t) => `<div class="ktk ktk--2"><span class="mono">${A(t.token)}</span>${m(`${t.size} / ${t.line} / ${t.weight}`)}</div>`).join('');
    const pal = ctx.colours.map((c) => `<div class="ktk ktk--2"><span class="mono">--palette-${A(c.id)}</span><span class="ktv">${sw(c.hex)}${m(c.hex)}</span></div>`).join('');
    const G = (n, t, inner) => `<div class="ktg"><h3>${mk(n)}${A(t)}</h3>${inner}</div>`;
    const hd = '<div class="ktk ktk--h"><span></span><span>Light</span><span>Dark</span></div>';
    // a cropped phone under the colour list: each token group points at where it shows on the screen
    const body = `${pin(1, ui.statusChip('booked'), { i: 1, cls: 'kn--rc' })}${pin(6, `<h2 class="ui-display kscr-h kscr-h--s">${A(S.eta)}</h2>`)}${pin(3, pin(2, `<div class="kband kband--s"><b class="num">${ctx.space[4].px}</b></div>`, { l: 1 }))}${pin(4, ui.btn(S.form.book), { i: 1 })}`;
    const crop = phone(ctx, body, { cls: 'kp--crop' });
    const lead = 'Every token in the kit, as the code package names it. Colour tokens name a job and dark swaps the values, not the names. Type is size, line height and weight in px. Each group has a number. The phone marks where space, radius, colour and type land on a screen.';
    return kpage(ctx, 'tokens', lead, `<div class="ktokens"><div>${G(1, 'Colour, light then dark', hd + colRows)}${G(2, 'Palette', pal)}${stage(crop, 'kstage--crop')}</div><div>${G(3, 'Space', sp)}${G(4, 'Radius', rd)}${G(5, 'Border width', wd)}${G(6, 'Type, size / line / weight', tx)}${G(7, 'Fonts', ff)}${G(8, 'Shadow', `<div class="ktk ktk--2"><span class="mono">--shadow-float</span></div><div class="ktk ktk--3">${m(String(g.shadow['shadow-float']))}</div>`)}</div></div>`, { cls: 'pg--ktok' });
  },

  code(ctx) {
    const F = sc(ctx).form, ui = ctx.ui, S = sc(ctx);
    const files = [
      ['README.md', 'Install, use, token naming, light and dark, accessibility notes.'], ['tokens.css', 'Custom properties. Light on :root, dark on [data-theme="dark"] and the system setting.'],
      ['tokens.json', 'The same tokens in the W3C design token format, with a dark value on each colour.'], ['tokens.ts', 'A typed export of the same values.'], ['tailwind.css', 'A Tailwind CSS v4 @theme block mapped to the tokens.'],
      ['components.css', 'Classes for every component in this kit, built only on the tokens.'], ['example.html', 'Every component live, with a light and dark switch.'], ['fonts.css', `@font-face rules for ${[...new Set(ctx.faces.map((f) => f.family))].join(', ')}.`],
      ['assets/', 'The logo, the icons and the font files.'],
    ];
    const key = kkey(files.map(([n, d]) => `${m(n)}<span>${A(d)}</span>`), { cls: 'kkey--f' });
    const body = `${pin(9, `<div class="khead">${wordmark(ctx, false)}</div>`, { i: 1, cls: 'kn--rc' })}${pin(8, `<h2 class="ui-display kscr-h kscr-h--s">${A(F.title)}</h2>`)}${pin(2, ui.field({ id: 'cd-1', label: F.pickup, value: F.pickupValue }))}${pin(6, ui.btn(F.book), { i: 1 })}`;
    const ph = phone(ctx, body, { cls: 'kp--code', pin: 7 });
    const code = `<link rel="stylesheet" href="fonts.css">
<link rel="stylesheet" href="tokens.css">
<link rel="stylesheet" href="components.css">

<body class="ui">
  <button class="ui-btn" type="button">
    ${F.book}
  </button>
</body>`;
    const tw = `@import "tailwindcss";
@import "./tokens.css";
@import "./tailwind.css";`;
    const block = (t, c) => `<div class="kg"><h3 class="kh">${A(t)}</h3><pre class="ui kcode" data-theme="dark"><code>${A(c)}</code></pre></div>`;
    const lead = `Plain CSS, no framework. Copy the folder and link three stylesheets. Put class ${m('ui')} on the body. State is carried by ${m('disabled')}, ${m('aria-invalid')}, ${m('aria-pressed')} and ${m('aria-current')}.`;
    return kpage(ctx, 'code', lead, `${side(ph,`${kh('In the package')}${key}`)}${block('Install', code)}<div class="k2">${block('Dark mode', '<html data-theme="dark">')}${block('Tailwind v4', tw)}</div>`, { cls: 'pg--kcode' });
  },
  // @@END pages
};
