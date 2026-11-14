// Theme 29 (Blueprint), lane hk: the kit site's component sheets (buttons, inputs, choices, cards, navigation, lists, status, feedback, dialog, table, empty).
import { colourMap, statusText } from '../../engine/tokens.js';
import { A, sc, ex, mono, det, plate, kr, ttl, sch, uniq } from './lane-hk-parts.js';

const x1 = '<span class="hk-m">1:1</span>';
const wrap = (n, name, note, inner, opt) => kr(n, name, note, inner, opt);
const list = (rows) => `<div class="hk-kl">${rows.join('')}</div>`;
const row = (html) => `<div class="hk-plate--row">${html}</div>`;

function buttons(ctx) {
  const ui = ctx.ui, S = sc(ctx), F = S.form, X = ex(ctx);
  const kinds = row(`${ui.btn(F.book)}${ui.btn(X.secondary, { variant: 'secondary' })}${ui.btn(X.quiet, { variant: 'quiet' })}${ui.btn(X.danger, { variant: 'danger' })}`);
  const sizes = row(`${ui.btn(F.book)}${ui.btn(X.small, { size: 'sm' })}${ui.btn(X.small, { variant: 'secondary', size: 'sm' })}`);
  const icons = row(`${ui.btn(F.book, { iconRight: 'arrow-right' })}${ui.btn(X.small, { variant: 'secondary', iconLeft: 'plus' })}${ui.btn(S.call, { variant: 'secondary', size: 'sm', iconLeft: 'phone' })}`);
  const off = row(`${ui.btn(F.book, { disabled: true })}${ui.btn(X.secondary, { variant: 'secondary', disabled: true })}${ui.btn(X.quiet, { variant: 'quiet', disabled: true })}`);
  const block = ui.btn(F.book, { block: true });
  return `${ttl('Buttons', 'One primary action a screen. The rest step back through secondary, quiet and danger.')}
${det(1, 'Kinds', x1, list([wrap(1, 'Primary, secondary, quiet, danger', 'Four kinds, in that order', kinds), wrap(2, 'Dark', 'The same four on the dark surface', row(`${ui.btn(F.book)}${ui.btn(X.secondary, { variant: 'secondary' })}${ui.btn(X.quiet, { variant: 'quiet' })}${ui.btn(X.danger, { variant: 'danger' })}`), { dark: true })]))}
${det(2, 'Sizes and icons', x1, list([wrap(3, 'Sizes', 'Default and small', sizes), wrap(4, 'Icons', 'Left or right of the label', icons), wrap(5, 'Block', 'Fills its container', block, { cls: 'hk-plate--fill' }), wrap(6, 'Disabled', 'The disabled attribute', off)]))}`;
}

function inputs(ctx) {
  const ui = ctx.ui, S = sc(ctx), F = S.form;
  return `${ttl('Inputs', 'A label above every field, help below it, and an error that says how to fix it.')}
${det(1, 'Text, select and text area', x1, list([
    wrap(1, 'Text field', 'With its label', ui.field({ id: 'hk-in-a', label: F.pickup, value: F.pickupValue }), { cls: 'hk-plate--fill' }),
    wrap(2, 'Select', 'Options from the brand', ui.field({ id: 'hk-in-b', label: F.size, kind: 'select', options: F.sizes, value: F.sizes[1] }), { cls: 'hk-plate--fill' }),
    wrap(3, 'Text area', 'With help text', ui.field({ id: 'hk-in-c', label: F.notes, kind: 'textarea', help: F.notesHelp }), { cls: 'hk-plate--fill' }),
    wrap(4, 'Error', 'Names the fix', ui.field({ id: 'hk-in-d', label: F.ready, value: F.readyValue, error: F.readyError }), { cls: 'hk-plate--fill' }),
    wrap(5, 'Disabled', 'The disabled attribute', ui.field({ id: 'hk-in-e', label: F.dropoff, value: F.dropoffValue, disabled: true }), { cls: 'hk-plate--fill' }),
  ]))}
${det(2, 'Dark', x1, wrap(6, 'Text field, error', 'On the dark surface', ui.field({ id: 'hk-in-f', label: F.ready, value: F.readyValue, error: F.readyError }), { dark: true, cls: 'hk-plate--fill' }))}`;
}

function choices(ctx) {
  const ui = ctx.ui, X = ex(ctx), set = (n) => `<div class="hk-kl" style="gap:12px">${X.checks.map((t, i) => ui.check(t, { checked: i === 0, name: `hk-ch-${n}` + i })).join('')}</div>`;
  const radios = (n) => X.radios.map((t, i) => ui.check(t, { type: 'radio', name: 'hk-r' + n, checked: i === 0 })).join('');
  const sws = (n) => X.switches.map((t, i) => ui.switch(t, { checked: i === 0 })).join('');
  return `${ttl('Choices', 'Checkboxes for several, radios for one, a switch for something that takes effect at once.')}
${det(1, 'Light', x1, list([wrap(1, 'Checkbox', 'Checked, unchecked', set('a')), wrap(2, 'Radio', 'One of two', `<div class="hk-kl" style="gap:12px">${radios('a')}</div>`), wrap(3, 'Switch', 'On, off', `<div class="hk-kl" style="gap:12px">${sws('a')}</div>`), wrap(4, 'Segmented', 'A choice of views', ui.segmented(X.tabs, 0))]))}
${det(2, 'Dark', x1, list([wrap(5, 'Checkbox and switch', 'On the dark surface', `${set('b')}${sws('b')}`, { dark: true })]))}`;
}

function cards(ctx) {
  const ui = ctx.ui, S = sc(ctx), X = ex(ctx), d = S.deliveries;
  const card = (o = {}) => ui.card({ meta: d[1].price, title: d[1].to, text: d[1].when, ...o });
  return `${ttl('Cards', 'A card holds one thing. A raised card is the one to look at; a stat is a number with its name.')}
${det(1, 'Light', x1, list([wrap(1, 'Card', 'Meta, title and text', card(), { cls: 'hk-plate--fill' }), wrap(2, 'Raised card', 'One step up the surface', card({ raised: true }), { cls: 'hk-plate--fill' }), wrap(3, 'Stat', 'A value and its label', ui.stat(S.paid, X.statLabel), { cls: 'hk-plate--fill' })]))}
${det(2, 'Dark', x1, list([wrap(4, 'Card and raised card', 'On the dark surface', `${card()}${card({ raised: true })}`, { dark: true, cls: 'hk-plate--fill' })]))}`;
}

function navigation(ctx) {
  const ui = ctx.ui, S = sc(ctx), B = ctx.brand, X = ex(ctx), links = X.links.slice(0, 3), all = [...links, [X.account, 'user']];
  const lg = ctx.logo.html('horizontal', { width: 132, colourway: ctx.edition === 'slot' ? undefined : 'colour' });
  const top = `<nav class="ui-topbar" aria-label="Main"><span style="display:block;width:132px">${lg}</span><div class="ui-topbar__links">${ui.links(links, 0)}</div></nav>`;
  return `${ttl('Navigation', 'A top bar and tab bar for the main places, a side bar for sections, crumbs and tabs inside a page.')}
${det(1, 'Top bar and side bar', x1, list([wrap(1, 'Top bar', 'Logo and page links', top, { cls: 'hk-plate--fill', style: 'padding:0' }), wrap(2, 'Side bar', 'The current page is marked', `<nav class="ui-sidebar" aria-label="Sections">${ui.links(all, 0)}</nav>`)]))}
${det(2, 'Within a page', x1, list([wrap(3, 'Crumbs', 'Where you are', ui.crumbs(X.crumbs)), wrap(4, 'Tabs', 'Views of one thing', ui.tabs(X.tabs, 0), { cls: 'hk-plate--fill' }), wrap(5, 'Tab bar', 'On a phone', `<nav class="ui-tabbar" aria-label="Sections">${all.map(([t, i], k) => `<a href="#"${k === 0 ? ' aria-current="page"' : ''}>${ui.icon(i, 20)}${A(t)}</a>`).join('')}</nav>`, { cls: 'hk-plate--fill', style: 'padding:0' })]))}`;
}

function lists(ctx) {
  const ui = ctx.ui, S = sc(ctx), d = S.deliveries;
  return `${ttl('Lists', 'A row is a title and a line under it, with a price or a status at the end.')}
${det(1, 'Rows', x1, list([wrap(1, 'List', 'Rows with icon, price and status', ui.deliveryRows(5), { cls: 'hk-plate--fill' }), wrap(2, 'Row, initials', 'A person leads the row', ui.row({ lead: A(S.initials || ''), title: S.rider, sub: S.riderNote }), { cls: 'hk-plate--fill' }), wrap(3, 'Row, status', 'A status chip at the end', ui.row({ title: d[1].to, sub: d[1].when, chip: ui.statusChip(d[1].status) }), { cls: 'hk-plate--fill' })]))}
${det(2, 'Dark', x1, wrap(4, 'List', 'On the dark surface', ui.deliveryRows(3), { dark: true, cls: 'hk-plate--fill' }))}`;
}

function status(ctx) {
  const ui = ctx.ui, ML = colourMap(ctx, 'light'), MD = colourMap(ctx, 'dark');
  const rows = ctx.status.map((s) => {
    const l = statusText(ctx, 'light', s), dk = statusText(ctx, 'dark', s);
    return [plate(ui.statusChip(s.id), { cls: 'hk-plate--row', style: 'padding:8px;width:fit-content' }), `${mono(l.token)}<br>${mono(String(l.hex).toUpperCase())}`, `${mono(ctx.fmt(ctx.ratio(l.hex, ML.surface)) + ' : 1')}<span class="hk-lab"> light</span>`, `${mono(ctx.fmt(ctx.ratio(dk.hex, MD.surface)) + ' : 1')}<span class="hk-lab"> dark</span>`];
  });
  const dk = plate(ctx.status.map((s) => ui.statusChip(s.id)).join(''), { dark: true, cls: 'hk-plate--row' });
  return `${ttl('Status', 'Each state of the work has a name and a chip. The chip is the same in every list and card.')}
${det(1, 'Chips and their text colour', x1, sch(['Chip', 'Token', 'Light', 'Dark'], rows, 'hk-sr--st'))}
${det(2, 'Dark', x1, dk)}`;
}

function feedback(ctx) {
  const ui = ctx.ui, S = sc(ctx), F = S.form;
  const alerts = `<div class="hk-kl" style="gap:16px;width:100%">${ui.alert('info', S.pickup)}${ui.alert('success', S.toast)}${ui.alert('warning', S.alert)}${ui.alert('danger', F.readyError)}</div>`;
  return `${ttl('Feedback', 'Say what happened and what to do next. Loading shows its shape before its content.')}
${det(1, 'Banners', x1, wrap(1, 'Alert', 'Info, success, warning and danger', alerts, { cls: 'hk-plate--fill' }))}
${det(2, 'Messages and waiting', x1, list([wrap(2, 'Toast', 'With an undo', ui.toast(S.toast)), wrap(3, 'Inline message', 'Beside the field it is about', `<p class="ui-inline-msg">${ui.icon('info', 16)}<span>${A(S.inline)}</span></p>`), wrap(4, 'Spinner', 'While something runs', ui.spinner()), wrap(5, 'Skeleton', 'Where content will land', `<div class="hk-kl" style="gap:12px;width:100%">${ui.skeleton('100%')}${ui.skeleton('62%')}${ui.skeleton('80%')}</div>`, { cls: 'hk-plate--fill' })]))}
${det(3, 'Dark', x1, wrap(6, 'Alert and toast', 'On the dark surface', `${ui.alert('warning', S.alert)}${ui.toast(S.toast)}`, { dark: true, cls: 'hk-plate--fill' }))}`;
}

function dialog(ctx) {
  const ui = ctx.ui, D = sc(ctx).dialog, d = (o, id) => uniq(ui.dialog({ ...D, ...o }), id);
  return `${ttl('Dialog', 'A dialog asks one question and gives two ways out. The destructive one says what it destroys.')}
${det(1, 'Light', x1, list([wrap(1, 'Dialog', 'Title, text and two actions', d({}, 'hk-dg-a')), wrap(2, 'Dialog, danger', 'The confirm action is danger', d({ danger: true }, 'hk-dg-b'))]))}
${det(2, 'Dark', x1, wrap(3, 'Dialog, danger', 'On the dark surface', d({ danger: true }, 'hk-dg-c'), { dark: true }))}`;
}

function table(ctx) {
  const ui = ctx.ui, S = sc(ctx), d = S.deliveries, hd = [S.deliverToLabel, 'When', 'Status', S.paidLabel];
  const sortBtn = (t, dir) => `<button type="button">${A(t)}${dir ? ui.icon(dir === 'asc' ? 'arrow-up' : 'arrow-down', 14) : ''}</button>`;
  const tb = (dark) => `<table class="ui-table"><thead><tr><th scope="col" aria-sort="ascending">${sortBtn(hd[0], 'asc')}</th><th scope="col">${sortBtn(hd[1])}</th><th scope="col">${hd[2]}</th><th scope="col" class="is-num">${sortBtn(hd[3])}</th></tr></thead><tbody>${d.map((r, i) => `<tr${i === 0 ? ' aria-selected="true"' : ''}><td data-l="${A(hd[0])}">${A(r.to)}</td><td class="ui-num" data-l="${A(hd[1])}">${A(r.when)}</td><td data-l="${A(hd[2])}">${ui.statusChip(r.status)}</td><td class="is-num" data-l="${A(hd[3])}">${A(r.price)}</td></tr>`).join('')}</tbody></table>`;
  return `${ttl('Table', 'For comparing rows. Sort from the header; the selected row carries the action bar.')}
${det(1, 'Light', x1, `<div class="hk-tbl">${plate(tb(false), { cls: 'hk-plate--fill' })}</div>`)}
${det(2, 'Dark', x1, `<div class="hk-tbl">${plate(tb(true), { dark: true, cls: 'hk-plate--fill' })}</div>`)}`;
}

function empty(ctx) {
  const ui = ctx.ui, E = sc(ctx).empty, e = `<div class="ui-empty"><h3 class="ui-empty__title">${A(E.title)}</h3><p class="ui-empty__text">${A(E.body)}</p>${ui.btn(E.cta)}</div>`;
  return `${ttl('Empty', 'When there is nothing yet, say so, and offer the one thing to do about it.')}
${det(1, 'Light', x1, wrap(1, 'Empty state', 'Headline, line and one action', e, { cls: 'hk-plate--fill' }))}
${det(2, 'Dark', x1, wrap(2, 'Empty state', 'On the dark surface', e, { dark: true, cls: 'hk-plate--fill' }))}`;
}

export const pages2 = { buttons, inputs, choices, cards, navigation, lists, status, feedback, dialog, table, empty };
