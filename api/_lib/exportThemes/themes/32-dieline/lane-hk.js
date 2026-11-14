// Theme 32, Dieline, lane hk: the UI kit site (kitSite). Every page is the brand's pack, die-cut and run down the screen as the book runs it
// (lane-ht-net.js, shared with the guide site and imported read-only). The live components show through die-cut windows in the board, their
// markup sits on a sealed strip under each window with a copy tab, and buttons, inputs and choices each get a bench: kind and state tabs that
// drive one live figure, and the values the browser computed for every state in both modes.
import { A, rows, strip, bar, contentsNav, pager, win, h2, lead, netCss } from './lane-ht-net.js';
import { colourMap, statusText } from '../../engine/tokens.js';
import { env, copyOf, shortest, mixed, note, code, spec, specs, tgt, BTN_STATES, BENCH_ROWS, benchTop, benchMatrix, benchCode, benchAttrs } from './lane-hk-parts.js';
import { found, page, pageHex, DESC } from './lane-hk-found.js';
import { hkCss } from './lane-hk-css.js';

const ratio = (ctx, a, b) => `${ctx.fmt(ctx.ratio(a, b))}:1`;
const logo = (ctx, mode, w = 120) => {
  const { R } = env(ctx), M = colourMap(ctx, mode);
  return `<span class="hk-uilogo" style="width:${w}px">${ctx.logo.html('horizontal', { width: w, colourway: R.colourwayOn(M.surface), color: M.text, label: ctx.brand.name })}</span>`;
};

// ---- benches: one live figure, its kinds and its states ----
const benches = {
  buttons(ctx) {
    const u = ctx.ui, c = copyOf(ctx);
    return {
      target: 'button',
      variants: [
        { id: 'primary', label: 'Primary', html: tgt(u.btn(c.book)) },
        { id: 'secondary', label: 'Secondary', html: tgt(u.btn(c.secondary, { variant: 'secondary' })) },
        { id: 'quiet', label: 'Quiet', html: tgt(u.btn(c.quiet, { variant: 'quiet' })) },
        { id: 'danger', label: 'Danger', html: tgt(u.btn(c.danger, { variant: 'danger' })) },
      ],
      states: BTN_STATES,
    };
  },
  inputs(ctx) {
    const u = ctx.ui, F = copyOf(ctx).F, sizes = F.sizes || [F.size];
    return {
      target: 'input',
      variants: [
        { id: 'text', label: 'Text', html: tgt(u.field({ id: 'hk-bi-t', label: F.pickup, value: F.pickupValue }), /<(input|select|textarea)\b/) },
        { id: 'select', label: 'Select', html: tgt(u.field({ id: 'hk-bi-s', label: F.size, kind: 'select', options: sizes, value: sizes[0] }), /<(input|select|textarea)\b/) },
        { id: 'textarea', label: 'Text area', html: tgt(u.field({ id: 'hk-bi-a', label: F.notes, kind: 'textarea', help: F.notesHelp }), /<(input|select|textarea)\b/) },
      ],
      states: [{ id: 'rest', label: 'Rest' }, { id: 'hover', label: 'Hover', cls: 'is-hover' }, { id: 'focus', label: 'Focus', cls: 'is-focus' }, { id: 'disabled', label: 'Disabled', attr: { disabled: '' } }],
    };
  },
  choices(ctx) {
    const u = ctx.ui, c = copyOf(ctx);
    return {
      target: 'input',
      variants: [
        { id: 'checkbox', label: 'Checkbox', html: tgt(u.check(shortest(c.checks), { name: 'hk-bc-c' }), /<input\b/) },
        { id: 'radio', label: 'Radio', html: tgt(u.check(shortest(c.radios), { name: 'hk-bc-r', type: 'radio' }), /<input\b/) },
        { id: 'switch', label: 'Switch', html: tgt(u.switch(shortest(c.switches), {}), /<input\b/) },
      ],
      states: [{ id: 'rest', label: 'Off' }, { id: 'checked', label: 'On', attr: { checked: '' } }, { id: 'hover', label: 'Hover', cls: 'is-hover' }, { id: 'focus', label: 'Focus', cls: 'is-focus' }, { id: 'disabled', label: 'Disabled', attr: { disabled: '' } }],
    };
  },
};
// a bench page: the controls and the figure on the printed panel, the measured matrix and the markup on the board, then the page's specimens
function benchPage(ctx, K, text, rest) {
  const first = `${lead(text)}${benchTop(K, K.page.title)}`;
  const mx = `${h2('Every state, measured')}${note('Read back from the live component in both modes: the light value, then the dark. A token is named where both match one.')}${benchMatrix(K)}${benchCode(K)}`;
  return `<div class="hk-bench"${benchAttrs(K)}>${page(ctx, K, first, [mx, ...rest])}</div>`;
}

// ---- the screens: the components put together ----
function screenParts(ctx, idp) {
  const u = ctx.ui, c = copyOf(ctx), C = c.C, p = typeof C.progress === 'number' ? Math.round(C.progress * 100) : null;
  const progress = p === null ? '' : `<div class="ui-progress" role="progressbar" aria-label="Progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${p}"><div class="ui-progress__bar"><i style="width:${p}%"></i></div><span class="ui-progress__dot" style="left:${p}%"></span></div>${C.from && C.to ? `<div class="hk-route"><span>${A(C.from)}</span><span>${A(C.to)}</span></div>` : ''}`;
  const person = C.rider ? `<div class="hk-person">${C.initials ? `<span class="ui-avatar">${A(C.initials)}</span>` : ''}<div class="hk-pm"><p class="hk-pn">${A(C.rider)}</p>${C.riderNote ? `<p class="hk-ps">${A(C.riderNote)}</p>` : ''}</div>${C.call ? u.btn(C.call, { variant: 'secondary', size: 'sm' }) : ''}</div>` : '';
  const details = `<dl class="hk-dl">${C.deliverToLabel ? `<div><dt>${A(C.deliverToLabel)}</dt><dd>${A(C.deliverTo)}</dd></div>` : ''}${C.paidLabel ? `<div><dt>${A(C.paidLabel)}</dt><dd class="ui-num">${A(C.paid)}</dd></div>` : ''}</dl>`;
  const list = `<ul class="ui-list">${(C.deliveries || []).slice(0, 4).map((d) => u.row({ lead: u.icon(d.icon || ctx.brand.ui.rowIcon || 'package', 18), title: d.to, sub: d.when, end: d.price, chip: u.statusChip(d.status, { label: c.st(d.status) }) })).join('')}</ul>`;
  const track = `<div class="hk-track">${u.statusChip('on-the-way', { label: c.st('on-the-way') })}<p class="ui-display hk-big">${A(C.eta)}</p><p class="hk-soft">${A(C.pickup)}</p>${progress}${person}${details}</div>`;
  return { track, list, links: c.links, share: C.share || c.secondary };
}
function screen(ctx, mode) {
  const u = ctx.ui, c = copyOf(ctx), S = screenParts(ctx, mode), C = c.C;
  return `<div class="hk-scr"><nav class="ui-topbar" aria-label="Main, ${mode}">${logo(ctx, mode)}<div class="ui-topbar__links">${u.links(S.links, 0)}</div>${C.time ? `<span class="ui-num hk-clock">${A(C.time)}</span>` : ''}</nav>
<div class="hk-scr__body"><section class="hk-scr__main" aria-label="${A(C.status || 'Status')}">${S.track}<div class="hk-samp">${u.btn(S.share, { variant: 'secondary' })}${u.btn(c.quiet, { variant: 'quiet' })}</div></section><section class="hk-scr__side" aria-label="${A(c.tabs[0] || 'List')}">${c.tabs.length ? u.tabs(c.tabs, 0) : ''}${S.list}</section></div></div>`;
}
function phone(ctx, mode) {
  const u = ctx.ui, c = copyOf(ctx), S = screenParts(ctx, 'm'), C = c.C;
  const nav = [...S.links, ...(c.account ? [[c.account, 'user']] : [])].slice(0, 4);
  return `<div class="hk-phone"><div class="hk-phone__top">${C.time ? `<span class="ui-num">${A(C.time)}</span>` : '<span></span>'}${logo(ctx, mode, 104)}</div>
<div class="hk-phone__body">${S.track}${u.btn(S.share, { variant: 'secondary', block: true })}</div>
<nav class="ui-tabbar" aria-label="Sections, phone">${nav.map(([t, i], k) => `<a href="#"${k === 0 ? ' aria-current="page"' : ''}>${u.icon(i, 20)}${A(t)}</a>`).join('')}</nav></div>`;
}

const comp = {
  buttons(ctx, K) {
    const u = ctx.ui, c = copyOf(ctx), sm = u.btn(c.small, { size: 'sm', variant: 'secondary' }), lg = u.btn(c.book, { size: 'lg', iconRight: 'arrow-right' }), blk = u.btn(c.book, { block: true });
    return benchPage(ctx, K, 'Pick a kind and a state: the button under it is the live component, and the table on the next panel is what the browser draws for it.', [
      specs([
        spec(K, { title: 'Small', text: 'Inside rows and cards.', live: sm, html: sm }),
        spec(K, { title: 'Large, with an icon', text: 'One a screen, at most.', live: lg, html: lg }),
        spec(K, { title: 'Full width', text: 'On a phone, at the foot of a form.', live: blk, html: blk }),
      ]),
      `${h2('Rules')}${rows([['One main action', 'Only one filled button on a screen. Everything else is secondary or quiet.'], ['Say what happens', A(`The label names the result: ${c.book}.`)], ['Danger is for what cannot be undone', 'And it always asks first.']])}`,
    ]);
  },
  inputs(ctx, K) {
    const u = ctx.ui, F = copyOf(ctx).F;
    const empty = u.field({ id: 'hk-i-e', label: F.pickup }), err = u.field({ id: 'hk-i-x', label: F.ready || F.pickup, value: F.readyValue || F.pickupValue, error: F.readyError || F.notesHelp });
    const two = `${u.field({ id: 'hk-i-p', label: F.pickup, value: F.pickupValue })}${F.dropoff ? u.field({ id: 'hk-i-d', label: F.dropoff, value: F.dropoffValue }) : ''}`;
    return benchPage(ctx, K, 'Every field has its label above it. Pick a kind and a state to see the live field change.', [
      specs([
        spec(K, { title: 'Empty', text: 'The label stays above the field. A hint inside it is never the only label.', live: empty, html: empty }),
        spec(K, { title: 'Error', text: 'A --danger edge. The message says what to enter, not what went wrong.', live: err, html: err }),
        spec(K, { title: 'A pair', text: 'Fields in a form stack with the same gap.', live: `<div class="hk-form">${two}</div>`, html: two, name: 'two fields' }),
      ]),
    ]);
  },
  choices(ctx, K) {
    const u = ctx.ui, c = copyOf(ctx), sizes = c.F.sizes || c.radios;
    const seg = u.segmented(sizes, Math.min(1, sizes.length - 1)), segD = u.segmented(sizes, 0, { disabled: true });
    const group = `<fieldset class="hk-fs"><legend class="ui-label">${A(c.F.size || c.F.pickup)}</legend>${c.radios.map((r, i) => u.check(r, { name: 'hk-ch-g', type: 'radio', checked: i === 0 })).join('')}</fieldset>`;
    const checks = c.checks.map((x, i) => u.check(x, { name: `hk-ch-k${i}`, checked: i === 0 })).join('');
    return benchPage(ctx, K, 'A box for each thing that can be on or off, a radio for one of a few, a switch for a setting that applies at once.', [
      specs([
        spec(K, { title: 'Checkboxes', text: 'Any number of them may be on.', live: `<div class="hk-col">${checks}</div>`, html: checks, name: 'checkboxes' }),
        spec(K, { title: 'Radios', text: 'One of a few, in a named group.', live: group, html: group, name: 'radio group' }),
        spec(K, { title: 'Segmented', text: 'One of a few, always one chosen. The chosen part fills with --text.', live: seg, html: seg, name: 'segmented control' }),
        spec(K, { title: 'Segmented, disabled', live: segD, html: segD, name: 'disabled segmented control' }),
      ]),
    ]);
  },
  cards(ctx, K) {
    const u = ctx.ui, c = copyOf(ctx), C = c.C;
    const plain = u.card({ meta: C.status, title: C.rider, text: C.riderNote }), raised = u.card({ meta: C.deliverToLabel, title: C.deliverTo, text: C.eta, raised: true });
    const act = u.card({ meta: C.status, title: C.eta, text: C.pickup, action: `<div>${u.btn(c.secondary, { variant: 'secondary', size: 'sm' })}</div>` }), stat = u.stat(C.paid, c.statLabel);
    return page(ctx, K, `${lead('A card holds one thing and what to do with it. Cards never sit inside cards.')}${win(`<div class="hk-cardw">${act}</div>`, { label: 'Card with an action' })}${code(K, act, 'card with an action')}`, [specs([
      spec(K, { title: 'Plain', text: 'Meta, a title and one line, on --surface with a hairline.', live: plain, html: plain, name: 'plain card' }),
      spec(K, { title: 'Raised', text: 'A --raised ground and no edge, for a second level.', live: raised, html: raised, name: 'raised card' }),
      spec(K, { title: 'Stat', text: 'One figure and what it counts.', live: stat, html: stat, name: 'stat' }),
    ])]);
  },
  navigation(ctx, K) {
    const u = ctx.ui, c = copyOf(ctx), nav = [...c.links, ...(c.account ? [[c.account, 'user']] : [])].slice(0, 4);
    const top = `<nav class="ui-topbar" aria-label="Main">${logo(ctx, 'light')}<div class="ui-topbar__links">${u.links(nav, 0)}</div></nav>`;
    const side = `<nav class="ui-sidebar" aria-label="Sections">${u.links(nav, 0)}</nav>`;
    const tabs = c.tabs.length ? u.tabs(c.tabs, 0) : '', crumbs = c.crumbs.length ? u.crumbs([...c.crumbs, (c.C.deliveries || [{}])[0].to].filter(Boolean)) : '';
    const tabbar = `<nav class="ui-tabbar" aria-label="Sections, phone">${nav.map(([t, i], k) => `<a href="#"${k === 0 ? ' aria-current="page"' : ''}>${u.icon(i, 20)}${A(t)}</a>`).join('')}</nav>`;
    return page(ctx, K, `${lead('Where you are, and where else you can go. The page you are on is marked in every kind.')}${win(top, { label: 'Top bar', cls: 'hk-flush' })}${code(K, top, 'top bar')}`, [specs([
      spec(K, { title: 'Sidebar', text: 'A bar on the left marks the page.', live: `<div class="hk-sidew">${side}</div>`, html: side, name: 'sidebar' }),
      tabs && spec(K, { title: 'Tabs', text: 'Views of one list. They do not change the page.', live: tabs, html: tabs, name: 'tabs' }),
      crumbs && spec(K, { title: 'Breadcrumbs', text: 'Quiet, with the page you are on in full --text.', live: crumbs, html: crumbs, name: 'breadcrumbs' }),
      spec(K, { title: 'Phone tab bar', text: 'Four places at most, at the foot of a phone screen.', live: `<div class="hk-tabbarw">${tabbar}</div>`, html: tabbar, name: 'phone tab bar', wcls: 'hk-flush' }),
    ].filter(Boolean))]);
  },
  lists(ctx, K) {
    const u = ctx.ui, c = copyOf(ctx), D = c.C.deliveries || [], ic = (d) => u.icon(d.icon || ctx.brand.ui.rowIcon || 'package', 18);
    const full = `<ul class="ui-list">${D.slice(0, 5).map((d) => u.row({ lead: ic(d), title: d.to, sub: d.when, end: d.price, chip: u.statusChip(d.status, { label: c.st(d.status) }) })).join('')}</ul>`;
    const plain = `<ul class="ui-list">${D.slice(0, 2).map((d) => u.row({ title: d.to, sub: d.when, end: d.price })).join('')}</ul>`;
    const link = D[0] ? `<ul class="ui-list">${u.row({ lead: ic(D[0]), title: D[0].to, sub: D[0].when, end: D[0].price, href: '#' })}</ul>` : '';
    return page(ctx, K, `${lead('One row is one thing. The title says what it is, the line under it says when, and the status is always words.')}${win(full, { label: 'List with status' })}${code(K, full, 'list with status')}`, [specs([
      spec(K, { title: 'Without a lead', text: 'For a short list.', live: plain, html: plain, name: 'plain list' }),
      link && spec(K, { title: 'As a link', text: 'The whole row is the target.', live: link, html: link, name: 'linked row' }),
    ].filter(Boolean))]);
  },
  status(ctx, K) {
    const u = ctx.ui, c = copyOf(ctx);
    const side = (mode) => { const M = colourMap(ctx, mode); return `<div class="hk-srs">${ctx.status.map((s) => { const t = statusText(ctx, mode, s); return `<div class="hk-sr">${u.statusChip(s.id, { label: c.st(s.id) })}<span class="m">${A(ratio(ctx, t.hex, M.surface))}</span></div>`; }).join('')}</div>`; };
    const all = ctx.status.map((s) => u.statusChip(s.id, { label: c.st(s.id) })).join('');
    const tok = rows(ctx.status.map((s) => { const L = statusText(ctx, 'light', s), Dk = statusText(ctx, 'dark', s); return [A(s.label), `<span class="m">${A(L.token === Dk.token ? `--${L.token}` : `--${L.token} light, --${Dk.token} dark`)}</span>`]; }));
    return page(ctx, K, `${lead('A status is words in one colour. Each one reads on the light surface and the dark one, at the ratio beside it.')}<div class="hs-two"><div>${win(side('light'), { label: 'Status, light' })}</div><div>${win(side('dark'), { dark: true, label: 'Status, dark' })}</div></div>`, [`${h2('Tokens')}${tok}`, code(K, all, 'every status')]);
  },
  feedback(ctx, K) {
    const u = ctx.ui, c = copyOf(ctx), C = c.C, F = c.F;
    const tones = [['info', 'Info', C.pickup], ['success', 'Success', C.toast], ['warning', 'Warning', C.alert], ['danger', 'Danger', F.readyError || C.alert]].filter((t) => t[2]);
    const alerts = tones.map(([t, , x]) => u.alert(t, x)).join('');
    const toast = u.toast(C.toast), inline = C.inline ? `<p class="ui-inline-msg">${u.icon('info', 16)}<span>${A(C.inline)}</span></p>` : '';
    const load = `<div class="hk-load">${u.spinner()}<div class="hk-col hk-grow">${u.skeleton('100%')}${u.skeleton('70%')}${u.skeleton('85%')}</div></div>`;
    return page(ctx, K, `${lead('Tell people what happened, and what they can do next, next to where it happened.')}${win(`<div class="hk-col">${alerts}</div>`, { label: 'Alerts' })}${code(K, alerts, 'alerts')}`, [specs([
      spec(K, { title: 'Toast', text: 'At the foot of the screen, gone in five seconds. Undo stays in reach of the keyboard.', live: toast, html: toast, name: 'toast' }),
      inline && spec(K, { title: 'Inline message', text: 'Next to the thing it is about.', live: inline, html: inline, name: 'inline message' }),
      spec(K, { title: 'Loading', text: 'A spinner for a short wait; skeleton lines in the shape of the rows for a list.', live: load, html: load, name: 'loading' }),
    ].filter(Boolean))]);
  },
  dialog(ctx, K) {
    const u = ctx.ui, D = copyOf(ctx).D;
    const dlg = u.dialog({ title: D.title, body: D.body, confirm: D.confirm, keep: D.keep });
    const shown = (d) => `<div class="hk-scrim">${d}</div>`;
    return page(ctx, K, `${lead('The page waits until the question is answered. The safe choice comes first; the one that acts is the filled button.')}${win(shown(dlg), { label: 'Dialog, light', cls: 'hk-flush' })}${code(K, dlg, 'dialog')}`, [
      spec(K, { title: 'Dark', live: shown(dlg.replace(/dlg-t/g, 'dlg-td')), dark: true, wcls: 'hk-flush', name: 'dialog, dark' }),
    ]);
  },
  table(ctx, K) {
    const u = ctx.ui, c = copyOf(ctx), C = c.C, D = C.deliveries || [];
    const t = `<table class="ui-table"><thead><tr><th scope="col">Item</th><th scope="col">When</th><th scope="col">Status</th><th scope="col" class="is-num">${A(C.paidLabel || 'Price')}</th></tr></thead><tbody>${D.map((d) => `<tr><td>${A(d.to)}</td><td class="ui-num">${A(d.when)}</td><td>${u.statusChip(d.status, { label: c.st(d.status) })}</td><td class="is-num">${A(d.price)}</td></tr>`).join('')}</tbody></table>`;
    return page(ctx, K, `${lead('A table is for rows people compare. Figures sit right, in tabular figures, so a column lines up.')}${win(t, { label: 'Table, light', cls: 'hk-flush hk-tbl' })}${code(K, t, 'table')}`, [
      spec(K, { title: 'Dark', live: t, dark: true, name: 'table, dark', wcls: 'hk-flush hk-tbl' }),
    ]);
  },
  empty(ctx, K) {
    const u = ctx.ui, c = copyOf(ctx), M = c.M, F = c.F;
    const none = `<div class="ui-empty"><h3 class="ui-empty__title">${A(M.title || F.title)}</h3>${M.body ? `<p class="ui-empty__text">${A(M.body)}</p>` : ''}${u.btn(M.cta || F.book)}</div>`;
    const first = `<div class="ui-empty"><h3 class="ui-empty__title">${A(F.title || M.title)}</h3>${u.btn(F.book, { disabled: true })}${F.bookWhy ? `<p class="ui-help">${A(F.bookWhy)}</p>` : ''}</div>`;
    return page(ctx, K, `${lead('An empty screen says what will be here and the one thing to do about it.')}${win(none, { label: 'Nothing yet' })}${code(K, none, 'empty state')}`, [
      spec(K, { title: 'Before the first step', text: 'The action stays in view, disabled, with the reason under it.', live: first, html: first, name: 'first-run state' }),
    ]);
  },
  'screen-light'(ctx, K) {
    const s = screen(ctx, 'light');
    return page(ctx, K, `${lead('The parts on one screen: the top bar, the live status, the details and the list beside it.')}${win(s, { label: 'Screen, light', cls: 'hk-flush' })}`, [code(K, s, 'screen')]);
  },
  'screen-dark'(ctx, K) {
    const s = screen(ctx, 'dark').replace(/hk-bi/g, 'hk-bd');
    return page(ctx, K, `${lead('The same screen on the dark surface. Nothing moves; only the roles change.')}${win(s, { dark: true, label: 'Screen, dark', cls: 'hk-flush' })}`, [code(K, s, 'screen, dark')]);
  },
  'screen-mobile'(ctx, K) {
    const s = phone(ctx, 'light');
    return page(ctx, K, `${lead('At phone width the list moves to its own screen, and the tab bar takes the top bar’s place at the foot.')}<div class="hs-two"><div>${win(s, { label: 'Phone, light', cls: 'hk-flush' })}</div><div>${win(phone(ctx, 'dark'), { dark: true, label: 'Phone, dark', cls: 'hk-flush' })}</div></div>`, [code(K, s, 'phone screen')]);
  },
};

// ---- the shell: the bar, the running order, the page's head, the net, previous and next ----
function shell(ctx, K, body) {
  const { R } = env(ctx), cover = K.page.id === 'cover', B = ctx.brand;
  const hex = (/data-hex="(#[0-9A-Fa-f]{3,8})"/.exec(body) || [])[1] || pageHex(ctx, K);
  const toggle = '';
  const ctl = `<button class="hs-ctl" type="button" data-disclosure aria-controls="hs-nav" aria-expanded="false"><span>Contents</span><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M3 6l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg></button>`;
  const nav = contentsNav(K.sections, { cur: K.page.id, front: cover, href: (q) => K.href(q.id), frontTitle: 'Cover' });
  const s = K.page.section;
  const head = cover ? '' : `<header class="hs-head">${s ? `<p class="hs-kick">${A(s.title)}</p>` : ''}<h1 class="hs-h1">${K.page.ref ? `<span class="hs-ref">${A(K.page.ref)}</span>` : ''}${A(K.page.title)}</h1>${DESC[K.page.id] ? `<p class="hs-sub">${A(DESC[K.page.id])}</p>` : ''}</header>`;
  const pg = (u) => (u ? { href: K.href(u.id), ref: u.ref, title: u.title } : null);
  return `<div class="sx hs">${bar(ctx, R, { part: 'kit', hex, toggle })}
<div class="hs-cols"><div class="hs-side">${ctl}${nav}</div>
<main class="hs-main" id="hs-main" tabindex="-1">${head}${body}${pager(pg(K.prev), pg(K.next))}</main></div>
<footer class="hs-foot"><span>${A(B.name)} UI kit</span><span class="m">${A(ctx.versionLine)}</span></footer></div>`;
}

export const kitSite = {
  css(ctx) { return netCss(ctx, env(ctx).R) + hkCss(ctx, BENCH_ROWS); },
  shell,
  pages: { ...found, ...comp },
  fallback(ctx, K) { return page(ctx, K, lead(A(DESC[K.page.id] || K.page.title))); },
  benches,
};
