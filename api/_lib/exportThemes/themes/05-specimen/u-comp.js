// UI kit pages for theme 05, Catalogue: buttons, inputs, choices, cards, navigation, lists. Styles are in css-u-comp.js (classes start ku2-).
// Open sheets from the gate (call number top left, rod hole at the foot). The components are the product's own working UI, drawn by the
// engine (ctx.ui) in the brand's ui roles, light on the Card ground and dark in the drawer interior (a .ui block with data-theme="dark").
// The catalogue frames the page, never the component: no component sits inside a catalogue card. Each page carries one piece of furniture
// as its device: the tracings line, drawer label holders, third-cut guide tabs, the call number, See and See also references.
// Brand copy is read only through A(); nothing here splits or slices a brand string.
import { A, ratioText } from './helpers.js';
import { hole } from './guidelines-k.js';

const sc = (ctx) => ctx.brand.ui.screen.content;
const byRole = (ctx, role) => ctx.colours.find((c) => c.role === role);
const nameOfHex = (ctx, hex) => ctx.colours.find((c) => c.hex.toLowerCase() === hex.toLowerCase())?.name;
const rt = (ctx, a, b) => ratioText(ctx.fmt(ctx.ratio(a, b)));
const m = (s) => `<span class="ku2-mono">${A(s)}</span>`;
// a See also reference to another page of the UI kit: its title and its page number
const see = (ctx, id) => { const p = ctx.pages.find((x) => x.id === id); return p ? `${A(p.title)}, page <span class="num">${ctx.pageNo(id)}</span>.` : ''; };
// the open sheet, run head "UI kit": the gate's frame classes, with a .ui region so the components get their tokens
function frame(ctx, id, inner, cls = '') {
  const p = ctx.pages.find((x) => x.id === id);
  return `<section class="pg k-sheet ku2-pg ${cls}" data-page="${id}">
<header class="k-hd"><div><span class="k-call k-mono">${A(p.ref || '')}</span><h1 class="k-ttl">${A(p.title)}</h1></div><p class="k-rh">${A(ctx.brand.name)} UI kit</p></header>
<div class="ui ku2-body">${inner}</div>
<footer class="k-ft">${hole(16)}<span class="k-fo num">${ctx.pageNo(id)}</span></footer></section>`;
}
// the drawer interior: the same components in the dark ui roles
const dark = (inner, cls = '') => `<div class="ui ku2-dk ${cls}" data-theme="dark">${inner}</div>`;
// a drawer label holder: the frame and its two screws, the label slid in
const holder = (inner, cls = '') => `<span class="ku2-hold ${cls}"><i class="ku2-screw"></i><span class="ku2-lab">${inner}</span><i class="ku2-screw"></i></span>`;
// a caption: number, name, note (the note may carry a mono token name)
const cap = (n, name, note = '', cls = '') => `<p class="ku2-cap ${cls}">${n ? `<span class="num">${n}.</span> ` : ''}<b>${A(name)}</b>${note ? ` ${note}` : ''}</p>`;
// a book cover drawn as a block (a spine, a title bar), the row's lead: no brand word on it, so it holds in the slot too
const cover = '<i class="ku-cvr" aria-hidden="true"></i>';
const trace = (items) => items.map(([n, t], i) => `<span class="num">${i + 1}.</span> <b>${A(n)}.</b> ${t}`).join(' ');

export const uComp = {
  // the primary button as the one entry on a catalogue card, across the page: its call number, its heading, the button at twice actual
  // size, and the card's tracings in two runs, the measurements and the other states (each state is drawn on the states page, which
  // this page points to). The variants stand below in the drawer interior
  buttons(ctx) {
    const S = sc(ctx), F = S.form, ui = ctx.ui, R = ctx.roles.light, e = S.example;
    const act = byRole(ctx, 'action'), gnd = byRole(ctx, 'ground'), ctl = ctx.uiType.find((t) => t.token === 'control');
    const lab = nameOfHex(ctx, R.actionLabel) || 'The label';
    const padPx = ctx.space[4].px, H = 44, rad = ctx.radius.button;
    const p = ctx.pages.find((x) => x.id === 'buttons');
    const run = (items, from) => `<ol class="ku2-tl">${items.map(([n, t], i) => `<li><span class="num">${from + i}.</span> <b>${A(n)}.</b> ${t}</li>`).join('')}</ol>`;
    const spec = [['Height', `<span class="num">${H}</span> px.`], ['Padding', `<span class="num">${padPx}</span> px each side.`],
      ['Label', `${A(ctx.brand.fonts.body.family)} <span class="num">${ctl.size} / ${ctl.weight}</span>, ${A(lab)} on ${A(act.name)}, <span class="num">${rt(ctx, R.actionLabel, R.action)}</span>.`],
      ['Radius', `<span class="num">${rad}</span> px.`]];
    const states = [
      ['Hover', 'The label underlines, 1 px, 3 px under the baseline.'],
      ['Focus', `${ctx.borders[2].px} px ring in ${m('--focus')}, outside a ${ctx.borders[2].px} px ${A(gnd.name)} gap.`],
      ['Pressed', `${m('--action-pressed')} fill, scaled to 0.97.`],
      // the primary is never drawn disabled: when it cannot act yet, its label names the next step
      ['Disabled', `Not used: the label names the next step. The secondary takes the ${m('--disabled-bg')} fill.`],
    ];
    const entry = `<div class="ku2-entry"><span class="ku2-ftab"><span class="num">1</span> Rest</span>
<div class="ku2-fhead"><span class="ku2-mono ku2-fcn">${A(p.ref || '')}.1</span><span class="ku2-fsub">${A(act.name)} fill, ${A(lab)} label.</span></div>
<h2 class="ku2-fttl">Primary button</h2><div class="ku2-fbig"><div class="ku2-z2">${ui.btn(F.book)}</div><p class="ku2-trace ku2-ftr">Drawn at twice actual size; every number is the 1&times; value.</p></div>
<div class="ku2-etr"><div><p class="ku2-th">Measured</p>${run(spec, 1)}</div><div><p class="ku2-th">The other states</p>${run(states, spec.length + 1)}<p class="ku2-see ku2-esee"><b>See also</b> ${see(ctx, 'states')}</p></div></div>
${hole(14, 'k-hole--card')}</div>`;
    const variants = [
      [ui.btn(e.secondary, { variant: 'secondary' }), 'Secondary', `${ctx.borders[1].px} px edge, label in ${m('--text')}.`],
      [ui.btn(e.quiet, { variant: 'quiet' }), 'Quiet', 'Underlined, no fill.'],
      [ui.btn(e.danger, { variant: 'danger' }), 'Danger', 'Only for what cannot be undone.'],
      [ui.btn(e.small, { size: 'sm', variant: 'secondary' }), 'Small, 36', 'Inside rows and cards.'],
      [ui.btn(F.book, { size: 'lg', iconRight: 'arrow-right' }), 'Large, 52', 'One per screen, at most.'],
    ].map(([b, n, d]) => `<li class="ku2-va"><div class="ku2-ctl">${b}</div>${cap(0, n, `<span class="ku2-q">${d}</span>`)}</li>`).join('');
    const inner = `${entry}
${dark(`${holder('Variants, dark')}<ul class="ku2-vas">${variants}</ul>`, 'ku2-vcol')}
<div class="ku2-rules"><p>One ${A(act.name)} button per screen, for the thing the reader came to do. On ${ctx.edition === 'slot' ? 'an item' : 'a book'} page that is ${A(F.book)}.</p>
<p>The label is a verb and fits on one line. Never Buy now, never Submit. When it cannot act yet, the label names the next step: ${A(F.book)}.</p></div>`;
    return frame(ctx, 'buttons', inner, 'ku2-pg-bt');
  },

  // the error, the state that has to teach, set large in the drawer interior; below it a column per control, each headed by its
  // drawer label, its states filed down it; the states are keyed by the tracings line at the foot
  inputs(ctx) {
    const S = sc(ctx), F = S.form, ui = ctx.ui;
    const sel = (id, o = {}) => ui.field({ id, label: F.size, kind: 'select', options: F.sizes, value: F.sizes[0], ...o });
    const ta = (id, o = {}) => ui.field({ id, label: F.notes, kind: 'textarea', ...o });
    const ent = (n, name, html) => `<li class="ku2-fe">${cap(n, name)}${html}</li>`;
    const col = (head, items) => `<div class="ku2-fc">${holder(head)}<ol class="ku2-fes">${items.join('')}</ol></div>`;
    const cols = [
      col('Text field', [ent(1, 'Rest', ui.field({ id: 'in-t1', label: F.pickup })), ent(2, 'Focus', ui.field({ id: 'in-t2', label: F.pickup, state: 'focus' })), ent(3, 'Filled', ui.field({ id: 'in-t3', label: F.pickup, value: F.pickupValue })), ent(4, 'Disabled', ui.field({ id: 'in-t5', label: F.pickup, value: F.pickupValue, disabled: true }))]),
      col('Select', [ent(1, 'Rest', sel('in-s1')), ent(2, 'Focus', sel('in-s2', { state: 'focus' })), ent(3, 'Filled', sel('in-s3', { value: F.sizes[1] })), ent(4, 'Disabled', sel('in-s5', { disabled: true }))]),
      col('Textarea', [ent(1, 'Rest', ta('in-a1', { help: F.notesHelp })), ent(2, 'Focus', ta('in-a2', { state: 'focus' })), ent(4, 'Disabled', ta('in-a5', { disabled: true }))]),
    ].join('');
    const err = dark(`<div class="ku2-errbig"><div class="ku2-z15">${ui.field({ id: 'in-t4', label: F.ready, value: F.readyValue, error: F.readyError })}</div></div>
<div class="ku2-errside">${cap(5, 'Error', '<span class="ku2-q">The hint becomes the message and says what to enter, not what went wrong.</span>')}${sel('in-s4', { error: ctx.ph('ui.screen.content.form.readyError', 'Choose a format.') })}</div>`, 'ku2-errp');
    const key = trace([['Rest', 'Label above, field below, a hint under it.'], ['Focus', `A ${ctx.borders[2].px} px ring and the edge in ${m('--text')}.`], ['Filled', 'The value in full ink.'], ['Disabled', `${m('--disabled-bg')} fill, no edge.`], ['Error', 'Shown above, in the dark roles.']]);
    const inner = `${err}<div class="ku2-fcs">${cols}</div>
<div class="ku2-in-foot"><p class="ku2-trace">${key}</p>
<div class="ku2-rules ku2-rules--in"><p>The label is always visible and sits above the field. A hint sits under it and turns into the error when there is one.</p><p>An error says what to enter, not what went wrong: ${A(F.readyError)}</p></div></div>`;
    return frame(ctx, 'inputs', inner, `ku2-pg-in${ctx.edition === 'slot' ? ' ku2-pg-in--slot' : ''}`);
  },

  // the segmented control set large; below it three guide tabs head the checkbox, radio and switch columns, all three on the
  // light roles, each tab cut as wide as its column; each column files its five states top to bottom
  choices(ctx) {
    const ui = ctx.ui, F = sc(ctx).form, e = sc(ctx).example;
    const states = [['Off', {}], ['On', { checked: true }], ['Focus', { checked: true, state: 'focus' }], ['Disabled', { disabled: true }], ['Disabled, on', { disabled: true, checked: true }]];
    const list = (fn) => `<ol class="ku2-chs">${states.map(([n, o], i) => `<li class="ku2-che">${fn(o, i)}${cap(i + 1, n, '', 'ku2-cap--s')}</li>`).join('')}</ol>`;
    const cb = list((o, i) => ui.check(e.checks[0], { name: 'cb' + i, ...o }));
    const rd = list((o, i) => ui.check(e.radios[0], { type: 'radio', name: 'rd' + i, ...o }));
    const sw = list((o) => ui.switch(e.switches[0], o));
    const tab = (t) => `<span class="ku2-tab">${A(t)}</span>`;
    const inner = `<div class="ku2-seg"><div class="ku2-z2">${ui.segmented(F.sizes, 1)}</div>
<div class="ku2-segs">${cap(0, 'Segmented, selected', '<span class="ku2-q">One choice, always one selected. Selected fills with the text colour.</span>')}
<div class="ku2-segd">${ui.segmented(F.sizes, 0, { disabled: true })}${cap(0, 'Disabled', '<span class="ku2-q">All segments grey together.</span>')}</div></div></div>
<div class="ku2-tabs">${tab('Checkbox')}${tab('Radio')}${tab('Switch')}</div>
<div class="ku2-chc"><div class="ku2-chcol">${cb}</div><div class="ku2-chcol">${rd}</div><div class="ku2-chcol">${sw}</div></div>
<p class="k-disp ku2-chline">Checkbox: any number. Radio: exactly one. Switch: takes effect at once.</p>
<div class="ku2-rules ku2-rules--two"><p>A choice is the box and its words together, one target at least 44 px tall.</p></div>`;
    return frame(ctx, 'choices', inner, 'ku2-pg-ch');
  },

  // the content card set large with its anatomy as the tracings beside it; the card without media and the raised card
  // in the drawer interior; the two stats; See also references to the pages a card leans on
  cards(ctx) {
    const S = sc(ctx), ui = ctx.ui, b = S.deliveries[0], b2 = S.deliveries[1];
    const media = `<div class="ui-card__media ku2-cover" role="img" aria-label="Cover of ${A(b.to)}"><span>Cover of ${A(b.to)}, supplied by ${A(ctx.brand.name)}</span></div>`;
    const withMedia = ui.card({ media, meta: S.status, title: b.to, text: b.when, action: `<div class="ku2-cact">${ui.btn(S.example.secondary, { variant: 'secondary', size: 'sm' })}</div>` });
    const noMedia = ui.card({ meta: ctx.ph('ui.screen.content.status', (ctx.status.find((s) => s.id === b2.status) || ctx.status[0]).label), title: b2.to, text: b2.when });
    const raised = ui.card({ meta: S.deliverToLabel, title: S.deliverTo, text: S.eta, raised: true });
    const anat = [['Meta', 'First, in the quiet colour.'], ['Title', 'The subject, in the display face.'], ['Detail', 'One line.'], ['Action', 'Last, if there is one.']]
      .map(([n, t], i) => `<li><span class="num ku2-an">${i + 1}</span><p><b>${n}.</b> ${t}</p></li>`).join('');
    const inner = `<div class="ku2-cd-top"><div class="ku2-cbig">${withMedia}</div>
<div class="ku2-cside">${cap(0, 'Content card', '<span class="ku2-q">With media: the cover takes 16 : 9 and the card keeps its hairline.</span>')}<ol class="ku2-anat">${anat}</ol>
<p class="ku2-rule1">A card holds one subject: meta first, then the title, then a line of detail. The action, if there is one, sits last.</p></div></div>
${dark(`<div class="ku2-dcell">${noMedia}${cap(0, 'Without media', '<span class="ku2-q">Meta, title, one line.</span>')}</div><div class="ku2-dcell">${raised}${cap(0, 'Raised', `<span class="ku2-q">${m('--raised')} ground and no edge, for a second level.</span>`)}</div>`, 'ku2-cdk')}
<div class="ku2-cd-foot"><div class="ku2-stats">${ui.stat(S.paid, S.paidLabel)}${ui.stat(String(S.deliveries.length), ctx.ph('ui.screen.content.example.statLabel', 'On the list'))}</div>
<div class="ku2-cd-notes">${cap(0, 'Stat', '<span class="ku2-q">One number, one label.</span>')}
<p class="ku2-body15">A card is a hairline and a ground. It never carries a shadow or a card inside it. A raised card drops the hairline and takes ${m('--raised')} instead, so a second level never needs a shadow.</p>
<p class="ku2-see"><b>See also</b> ${see(ctx, 'elevation')} ${see(ctx, 'radii-borders')}</p></div></div>`;
    return frame(ctx, 'cards', inner, 'ku2-pg-cd');
  },

  // the top bar across the page in the drawer interior, the current-page rule set as the page's line; each pattern under its own
  // call number, the sidebar and the phone's tab bar side by side at the foot
  navigation(ctx) {
    const ui = ctx.ui, S = sc(ctx), e = S.example, act = byRole(ctx, 'action');
    const links = [...e.links, [e.account, 'user']];
    const p = ctx.pages.find((x) => x.id === 'navigation'), ref = (n) => `<span class="ku2-mono ku2-cn">${A(p.ref || '')}.${n}</span>`;
    const top = `<nav class="ui-topbar" aria-label="Main"><span class="ku2-logo">${ctx.logo.html('horizontal', { width: 112, colourway: 'reversed', color: 'var(--text)', label: 'Logo' })}</span><div class="ui-topbar__links">${ui.links(links.slice(0, 3), 0)}</div></nav>`;
    const side = `<nav class="ui-sidebar" aria-label="Sections">${ui.links(links, 0)}</nav>`;
    const bar = `<nav class="ui-tabbar" aria-label="Sections">${links.map(([t, i], k) => `<a href="#"${k === 0 ? ' aria-current="page"' : ''}>${ui.icon(i, 20)}${A(t)}</a>`).join('')}</nav>`;
    const head = (n, name, note) => `<div class="ku2-nh">${ref(n)}<p class="ku2-cap"><b>${A(name)}</b> <span class="ku2-q">${note}</span></p></div>`;
    const inner = `${dark(`<div class="ku2-z13">${top}</div>`, 'ku2-topband')}
<div class="ku2-nv-cap">${head(1, 'Top bar', `Dark roles. The current page has a 3 px bar in ${A(act.name)} under it. Links are 44 px tall.`)}</div>
<p class="k-disp ku2-nline">The current page is marked by a 3 px bar in ${A(act.name)}: under a link, beside a sidebar item, over a tab-bar item.</p>
<p class="ku2-body15 ku2-nsub">A bar is a cue colour alone cannot be. Links and tabs are 44 px tall. The tab bar holds four destinations at most and is 64 px tall.</p>
<div class="ku2-nv">${head(2, 'Tabs', 'Tabs switch views of the same list. They do not change the page.')}${ui.tabs(e.tabs, 0)}</div>
<div class="ku2-nv">${head(3, 'Breadcrumbs', 'Quiet, with the current page in full ink.')}${ui.crumbs([...e.crumbs, S.deliveries[0].to])}</div>
<div class="ku2-nv-foot"><div class="ku2-nv">${head(4, 'Sidebar', 'A bar on the left marks the current page.')}${side}</div>
<div class="ku2-nv ku2-nv--ph">${head(5, 'Tab bar', 'Mobile. Four destinations at most, 64 px tall.')}<div class="ku2-phone">${bar}</div></div></div>`;
    return frame(ctx, 'navigation', inner, 'ku2-pg-nv');
  },

  // the shelf list: the books in list order, set large, with the row's anatomy as the tracings under it; the plain row
  // and the row as a link filed side by side in the drawer interior
  lists(ctx) {
    const ui = ctx.ui, S = sc(ctx), d = S.deliveries, slot = ctx.edition === 'slot', noun = slot ? 'item' : 'book';
    const rows = `<ul class="ui-list">${d.slice(0, 4).map((x) => ui.row({ lead: cover, title: x.to, sub: x.when, end: x.price, chip: ui.statusChip(x.status) })).join('')}</ul>`;
    const key = trace([['Lead', slot ? 'An image or an icon.' : 'The cover.'], ['Title', `The ${noun}, first.`], ['Detail', 'The author, then a line about the book.'], ['Price', 'Tabular figures, so the column lines up.'], ['Status', 'The only colour in the row.']]);
    const inner = `${cap(0, 'Leading, status', `<span class="ku2-q">${slot ? 'An image' : 'A cover'}, the title and detail, a price and a status.</span>`, 'ku2-cap--top')}
<div class="ku2-shelf"><div class="ku2-z12">${rows}</div></div>
<p class="ku2-trace ku2-trace--ls">${key}</p>
${dark(`<div class="ku2-lcell">${cap(0, 'No lead', '')}<ul class="ui-list">${d.slice(0, 2).map((x) => ui.row({ title: x.to, sub: x.when, end: x.price })).join('')}</ul></div>
<div class="ku2-lcell">${cap(0, 'As a link', '<span class="ku2-q">The whole row is the link. It fills on hover.</span>')}<ul class="ui-list">${ui.row({ lead: cover, title: d[0].to, sub: d[0].when, end: d[0].price, href: '#' })}</ul></div>`, 'ku2-lsdk')}
<div class="ku2-rules ku2-rules--ls"><p>One row is one ${noun}. The title leads, the detail follows, and the status is the only colour.</p>
<p>Prices use tabular figures so a column lines up. A row that opens is a link, and the whole row is the target.</p>
<p class="ku2-see"><b>See also</b> ${see(ctx, 'status')} ${see(ctx, 'table')}</p></div>`;
    return frame(ctx, 'lists', inner, 'ku2-pg-ls');
  },
};
