// Theme 22, Ticket: lane ht, the UI kit as a web site (kitSite). Every page opens on a ticket whose body is the product's raised surface with the
// real components on it, live: they are the shipped components.css, they follow the light and dark switch, and the states are the shipped CSS
// forced by class. The stub is printed in the ticket colour, as on every other piece, and carries the page's name, number, barcode and the next page.
// Under the ticket: what the component is for, the tokens it reads, and its markup to copy. Copy comes from brand.json (ui.screen.content) or is the
// template's own; every value is read from ctx.
import { A, roles } from './helpers.js';
import { colourMap, tokenGroups } from '../../engine/tokens.js';
import { big, ticket, pageStub, codeOf, h2, rows, zone, main, side, full, bar, order, pager } from './lane-ht-parts.js';

const PART = 'UI kit';
const sc = (ctx) => ctx.brand.ui.screen.content;
const ex = (ctx) => sc(ctx).example || {};
const m = (t) => `<span class="m">${A(t)}</span>`;

// the page's ticket. live: the components; dark: the plate is the dark surface in both modes
function open(ctx, R, K, live, { dark = false, cls = '', label = '' } = {}) {
  const p = K.page, nx = K.next;
  const stub = pageStub(ctx, { part: PART, section: p.section ? `${p.section.n} ${p.section.title}` : '', title: p.id === 'cover' ? `${ctx.brand.name} UI kit` : p.title, no: p.ref || ctx.brand.version.number, code: codeOf(ctx, 'u', ctx.pageNo(p.id)), next: nx ? { href: K.href(nx.id), ref: nx.ref, title: nx.title } : null });
  return ticket(ctx, R, { body: `<div class="ui hk-live${dark ? ' hk-live--dark' : ''}"${dark ? ' data-theme="dark"' : ''}${label ? ` role="group" aria-label="${A(label)}"` : ''}>${live}</div>`, stub, cls: `tb-tk--open ht-tk hk-tk ${cls}` });
}
// the markup to copy, pretty-printed by the engine, and the tokens the component reads
function code(ctx, K, name, markup, re) {
  const pretty = K.prettyHtml(markup), used = re ? K.tokensUsed(re) : null;
  const block = (title, text, what) => `<div class="hk-code"><div class="hk-code__h"><p class="ht-k">${title}</p><button type="button" class="tb-btn hk-copy" data-copy="${A(text)}" data-copy-name="${A(what)}"><span data-copy-text>Copy</span></button></div><pre><code>${A(text)}</code></pre></div>`;
  return full(`${h2('The code')}<div class="hk-codes">${block('Markup', pretty, `${name} markup`)}${used && used.names.length ? block('Tokens it reads', used.css, `${name} tokens`) : ''}</div>`);
}
const page = (ctx, R, K, live, z, opt) => `${open(ctx, R, K, live, opt)}\n${zone(z)}`;
const lead = (t) => main(`<p class="tb-lead">${t}</p>`);
const note = (t) => side(`<p class="tb-note">${t}</p>`);
const spec = (list) => main(`${h2('Values')}${rows(list)}`);

// ---- the benches: one live figure, a variant and a state control, and the values each state reads, measured by the engine in a browser ----
const tgt = (html) => html.replace(/<(button|input|select)\b/, '<$1 data-target');
const st = (id, label, o = {}) => ({ id, label, ...o });
const BENCHES = {
  buttons: (ctx) => {
    const S = sc(ctx), X = ex(ctx), ui = ctx.ui;
    return { target: '.ui-btn',
      variants: [['primary', 'Primary', ui.btn(S.form.book)], ['secondary', 'Secondary', ui.btn(X.secondary || S.call, { variant: 'secondary' })], ['quiet', 'Quiet', ui.btn(X.quiet || S.call, { variant: 'quiet' })], ['danger', 'Danger', ui.btn(X.danger || S.call, { variant: 'danger' })]].map(([id, label, html]) => ({ id, label, html: tgt(html) })),
      states: [st('rest', 'Rest'), st('hover', 'Hover', { cls: 'is-hover' }), st('focus', 'Focus', { cls: 'is-focus' }), st('pressed', 'Pressed', { cls: 'is-pressed' }), st('disabled', 'Disabled', { attr: { disabled: '' } })] };
  },
  inputs: (ctx) => {
    const F = sc(ctx).form, ui = ctx.ui;
    return { target: '.ui-input',
      variants: [['text', 'Text', ui.field({ id: 'hk-b-text', label: F.dropoff, value: F.dropoffValue })], ['select', 'Select', ui.field({ id: 'hk-b-sel', label: F.size, kind: 'select', options: F.sizes, value: F.sizes[1] })]].map(([id, label, html]) => ({ id, label, html: tgt(html) })),
      states: [st('rest', 'Rest'), st('focus', 'Focus', { cls: 'is-focus' }), st('error', 'Error', { attr: { 'aria-invalid': 'true' } }), st('disabled', 'Disabled', { attr: { disabled: '' } })] };
  },
  choices: (ctx) => {
    const X = ex(ctx), ui = ctx.ui;
    return { target: '.ui-choice input',
      variants: [['checkbox', 'Checkbox', ui.check((X.checks || [])[0] || 'Option')], ['radio', 'Radio', ui.check((X.radios || [])[0] || 'Option', { type: 'radio', name: 'hk-br' })], ['switch', 'Switch', ui.switch((X.switches || [])[0] || 'Option')]].map(([id, label, html]) => ({ id, label, html: tgt(html) })),
      states: [st('rest', 'Rest'), st('checked', 'On', { attr: { checked: '' } }), st('focus', 'Focus', { cls: 'is-focus' }), st('disabled', 'Disabled', { attr: { disabled: '' } })] };
  },
};
const tok = (p) => { if (!p || (!p.light && !p.dark)) return 'none'; if (p.token) return p.token.startsWith('--') ? p.token : '--' + p.token; const l = (p.light || '').toUpperCase(), d = (p.dark || '').toUpperCase(); return l === d || !d ? l : `${l} / ${d}`; };
function bench(ctx, K) {
  const B = K.bench; if (!B) return '';
  const scan = K.scan || {}, v0 = B.variants[0].id, s0 = B.states[0];
  const hid = (i) => (i ? ' hidden' : '');
  const box = K.page.id === 'choices'; // a checkbox, radio or switch is a box with no text of its own: its label reads --text
  const pressed = (on) => ` aria-pressed="${on}"`;
  const vars = B.variants.length > 1 ? `<div class="hk-seg" role="group" aria-label="Variant"><span class="tb-s">Variant</span>${B.variants.map((v, i) => `<button type="button" data-set-variant="${v.id}"${pressed(i === 0)}>${A(v.label)}</button>`).join('')}</div>` : '';
  const sts = `<div class="hk-seg" role="group" aria-label="State"><span class="tb-s">State</span>${B.states.map((s, i) => `<button type="button" data-set-state="${s.id}" data-label="${A(s.label)}"${s.cls ? ` data-state-cls="${s.cls}"` : ''}${s.attr ? ` data-state-attr="${A(JSON.stringify(s.attr))}"` : ''}${pressed(i === 0)}>${A(s.label)}</button>`).join('')}</div>`;
  const fig = `<div class="ui hk-live hk-bench__fig" data-fig role="group" aria-label="The component in the chosen state">${B.variants.map((v, i) => `<div class="hk-bench__v" data-for-variant="${v.id}"${hid(i)}>${v.html}</div>`).join('')}</div>`;
  const cell = (k, p) => `<p><span class="tb-s">${k}</span>${m(tok(p))}</p>`;
  const mx = B.variants.map((v, i) => `<ul class="hk-mx" data-for-variant="${v.id}"${hid(i)}>${B.states.map((s) => { const r = (scan[v.id] || {})[s.id]; return r ? `<li data-st="${s.id}"><p class="ht-k">${A(s.label)}</p>${cell('Fill', r.bg)}${box ? '' : cell('Text', r.fg)}${cell('Edge', r.border)}${cell('Focus ring', r.outline)}<p><span class="tb-s">Scale</span>${m(`${r.scale || 100}%`)}</p></li>` : ''; }).join('')}</ul>`).join('');
  return full(`${h2('Every state, live')}<div class="hk-bench" data-bench data-variant="${v0}" data-state="${s0.id}"><div class="hk-bench__ctl">${vars}${sts}</div>
<p class="ht-k hk-bench__now"><span data-bench-label>${A(s0.label)}</span></p>${fig}<p class="tb-s">The values each state reads, measured from the shipped CSS in light and dark. A token name means both modes use it.</p>${mx}</div>`);
}

// ---- front matter ----
function cover(ctx, K) {
  const R = roles(ctx), B = ctx.brand, S = sc(ctx), X = ex(ctx), ui = ctx.ui;
  const live = `<div class="hk-cover"><div class="hk-cover__l"><p class="ui-display hk-eta">${A(S.eta)}</p><p class="hk-p">${A(S.pickup)}</p><div class="hk-row">${ui.btn(S.form.book)}${ui.btn(X.secondary || S.call, { variant: 'secondary' })}</div></div>
<ul class="ui-list hk-cover__r">${S.deliveries.slice(0, 3).map((d) => ui.row({ title: d.to, sub: d.when, end: d.price, chip: ui.statusChip(d.status) })).join('')}</ul></div>`;
  const count = K.pages.filter((p) => p.section).length;
  return page(ctx, R, K, live,
    main(`<p class="tb-big disp hk-title">${big(ctx, `${B.name} UI kit`, { max: 96, min: 40, maxLines: ctx.edition === 'slot' ? 2 : 1, nMax: 48, nMin: 28, nLines: 2 })}</p><p class="tb-lead ht-gap">The components the product ships, live, in light and dark, with the markup to copy.</p>`)
    + side(rows([['Pages', m(String(count))], ['Version', A(B.version.number)], ['Issued', A(ctx.date)]]))
    + full(`${h2('Running order')}<ol class="ht-runs">${K.sections.map((s) => `<li class="ht-run"><h2 class="ht-run__h"><span class="num disp">${s.n}</span><span>${A(s.title)}</span></h2><ol>${s.pages.map((q) => `<li><a href="${K.href(q.id)}"><span class="num">${A(q.ref)}</span><span>${A(q.title)}</span></a></li>`).join('')}</ol></li>`).join('')}</ol>`), { label: 'The product, live' });
}
function contents(ctx, K) {
  const R = roles(ctx), ui = ctx.ui, X = ex(ctx);
  const live = `<div class="hk-stack">${ui.tabs(K.sections.slice(0, 3).map((s) => s.title), 1)}<nav aria-label="Example links" class="hk-links">${ui.links(X.links || [], 0)}</nav>${ui.crumbs(X.crumbs || [K.sections[0].title])}</div>`;
  return page(ctx, R, K, live, full(`${h2('Every page')}<ol class="ht-runs">${K.sections.map((s) => `<li class="ht-run"><h2 class="ht-run__h"><span class="num disp">${s.n}</span><span>${A(s.title)}</span></h2><ol>${s.pages.map((q) => `<li><a href="${K.href(q.id)}"><span class="num">${A(q.ref)}</span><span>${A(q.title)}</span></a></li>`).join('')}</ol></li>`).join('')}</ol>`), { label: 'Navigation components' });
}

// ---- foundations ----
const ROLE_ORDER = ['surface', 'raised', 'sunken', 'text', 'text-soft', 'quiet', 'edge', 'divider', 'action', 'action-hover', 'action-pressed', 'action-label', 'focus'];
function colour(mode) {
  return (ctx, K) => {
    const R = roles(ctx), M = colourMap(ctx, mode), ui = ctx.ui, S = sc(ctx);
    const keys = ROLE_ORDER.filter((k) => M[k]);
    const live = `<div class="hk-colour"><div class="hk-stack">${ui.btn(S.form.book)}${ui.alert('info', S.alert)}<div class="ui-card"><div class="ui-card__body"><p class="ui-card__meta">${A(S.status)}</p><h3 class="ui-card__title">${A(S.rider)}</h3><p class="ui-card__text">${A(S.riderNote)}</p></div></div></div></div>`;
    const sw = (k) => `<li><span class="hk-sw" style="background:${M[k]}"></span><p class="ht-k">${m('--' + k)}</p><p class="tb-s">${m(M[k].toUpperCase())}</p></li>`;
    const pr = (fg, bg) => [`${m('--' + fg)} on ${m('--' + bg)}`, m(`${ctx.fmt(ctx.ratio(M[fg], M[bg]))} : 1`)];
    const pairs = [['text', 'surface'], ['text-soft', 'surface'], ['quiet', 'surface'], ['action-label', 'action'], ['text', 'raised']].filter(([a, b]) => M[a] && M[b]).map(([a, b]) => pr(a, b));
    return page(ctx, R, K, live,
      lead(mode === 'dark' ? 'The dark set: the same roles, stepped up from the bar top. The plate stays dark in either mode.' : 'The light set: every role the components read, by its token name.')
      + note(`${keys.length} roles. The components use the names, never the values.`)
      + full(`<ul class="hk-sws">${keys.map(sw).join('')}</ul>`) + main(`${h2('Contrast')}${rows(pairs)}`), { dark: mode === 'dark', label: `Components in ${mode}` });
  };
}
function typeScale(ctx, K) {
  const R = roles(ctx), T = [...ctx.uiType].sort((a, b) => b.size - a.size), F = ctx.brand.fonts;
  const fam = (f) => (f === 'display' ? `var(--display);font-stretch:${F.display.stretch || 100}%` : f === 'mono' ? 'var(--mono)' : 'var(--body)');
  const wOf = (t) => { const f = F[t.face] || F.body; return f.weights.includes(t.weight) ? t.weight : f.weights[f.weights.length - 1]; };
  const live = `<ol class="hk-type">${T.map((t) => `<li><span class="tb-s num">${t.size}</span><p style="font-family:${fam(t.face)};font-size:${t.size}px;line-height:${t.line}px;font-weight:${wOf(t)}">${A(t.use)}</p></li>`).join('')}</ol>`;
  return page(ctx, R, K, live, lead('Each step set in its own size, line and weight. Use the token, never a size.')
    + full(`${h2('Values')}<ul class="ht-cols-l ht-cols-l--4">${T.map((t) => `<li><p class="ht-k">${m('--fs-' + t.token)}</p><p class="tb-p">${A(t.use)}</p><p class="ht-v">${m(`${t.size} / ${t.line} px`)}<span class="tb-s">weight ${wOf(t)}</span></p><p></p></li>`).join('')}</ul>`), { label: 'The type scale' });
}
function spacing(ctx, K) {
  const R = roles(ctx), S = ctx.space, max = Math.max(...S.map((s) => s.px));
  const live = `<ol class="hk-space">${S.map((s) => `<li><span class="tb-s num">${s.px}</span><i style="width:${(s.px / max * 100).toFixed(2)}%"></i></li>`).join('')}</ol>`;
  return page(ctx, R, K, live, lead(`Every gap is a step on a ${ctx.brand.ui.spacingBase} px base.`) + spec(S.map((s) => [m('--' + s.token.replace('space-', 'sp-')), m(s.px + ' px')])), { label: 'The spacing steps' });
}
function radiiBorders(ctx, K) {
  const R = roles(ctx), rd = ctx.radius, bw = ctx.brand.ui.border;
  const items = [['control', rd.control], ['button', rd.button], ['input', rd.input], ['chip', rd.chip], ['card', rd.card]].filter(([, v]) => v != null);
  const live = `<ul class="hk-radii">${items.map(([k, v]) => `<li><span class="hk-rbox" style="border-radius:${v}px;border-width:${bw}px"></span><span class="tb-s">${A(ctx.cap(k))} ${v} px</span></li>`).join('')}</ul>`;
  return page(ctx, R, K, live, lead(`Corners stay nearly square. Edges are ${bw} px, in the edge colour.`)
    + spec([...items.map(([k, v]) => [m('--r-' + k), m(v + ' px')]), [m('--w-control'), m(bw + ' px')], [m('--w-focus'), m('2 px')]]), { label: 'Radii and edges' });
}
function elevation(ctx, K) {
  const R = roles(ctx), S = sc(ctx), ui = ctx.ui;
  const live = `<div class="hk-elev"><div class="hk-elev__s" style="background:var(--sunken)"><span class="tb-s">Sunken</span></div><div class="hk-elev__s" style="background:var(--surface)"><span class="tb-s">Surface</span></div>${ui.card({ meta: S.status, title: S.rider, text: S.riderNote, raised: true })}${ui.toast(S.toast)}</div>`;
  return page(ctx, R, K, live, lead(A(ctx.brand.ui.elevationNote || 'Surfaces step in value; a floating piece gets an edge.')) + spec([[m('--shadow-float'), m(ctx.brand.ui.shadows === 'none' ? 'none' : 'set')]]), { label: 'Surfaces and a floating toast' });
}
const STATES = [['Rest', ''], ['Hover', 'is-hover'], ['Focus', 'is-focus'], ['Pressed', 'is-pressed'], ['Disabled', 'disabled']];
function states(ctx, K) {
  const R = roles(ctx), S = sc(ctx), ui = ctx.ui;
  const btn = (c) => (c === 'disabled' ? ui.btn(S.form.book, { disabled: true }) : ui.btn(S.form.book, { attrs: c ? `data-state="${c}"` : '' }).replace('class="ui-btn"', `class="ui-btn${c ? ' ' + c : ''}"`));
  const live = `<ol class="hk-states">${STATES.map(([t, c]) => `<li><span class="tb-s">${t}</span>${btn(c)}</li>`).join('')}</ol>`;
  return page(ctx, R, K, live, lead('Every control has five states. The ticket shows the shipped CSS, each state forced by its class.')
    + spec(STATES.map(([t, c]) => [t, c ? m(c === 'disabled' ? '[disabled]' : '.' + c) : m(':default')])) + code(ctx, K, 'Button', ui.btn(S.form.book), /^\.ui-btn(?![-\w])/), { label: 'A button in each state' });
}

// ---- components ----
function buttons(ctx, K) {
  const R = roles(ctx), S = sc(ctx), X = ex(ctx), ui = ctx.ui;
  const set = [ui.btn(S.form.book), ui.btn(X.secondary || S.call, { variant: 'secondary' }), ui.btn(X.quiet || S.call, { variant: 'quiet' }), ui.btn(X.danger || S.call, { variant: 'danger' })];
  const live = `<div class="hk-stack"><div class="hk-row">${set.join('')}</div><div class="hk-row">${ui.btn(X.small || S.share, { size: 'sm', variant: 'secondary' })}${ui.btn(S.form.book, { iconRight: 'arrow-right' })}${ui.btn(S.form.book, { disabled: true })}</div>${ui.btn(S.share, { variant: 'secondary', block: true })}</div>`;
  return page(ctx, R, K, live, lead('One primary button a screen. Secondary for the other way on, quiet for the way out, danger only for what cannot be undone.')
    + spec([['Primary', m('.ui-btn')], ['Secondary', m('.ui-btn--secondary')], ['Quiet', m('.ui-btn--quiet')], ['Danger', m('.ui-btn--danger')], ['Small', m('.ui-btn--sm')]]) + bench(ctx, K) + code(ctx, K, 'Buttons', set.join('\n'), /^\.ui-btn/), { label: 'Buttons' });
}
function inputs(ctx, K) {
  const R = roles(ctx), F = sc(ctx).form, ui = ctx.ui;
  const f = [ui.field({ id: 'hk-show', label: F.pickup, value: F.pickupValue }), ui.field({ id: 'hk-name', label: F.dropoff, value: F.dropoffValue, help: F.notesHelp }),
    ui.field({ id: 'hk-code', label: F.ready, value: F.readyValue, error: F.readyError }), ui.field({ id: 'hk-size', label: F.size, kind: 'select', options: F.sizes, value: F.sizes[1] }),
    ui.field({ id: 'hk-note', label: F.notes, kind: 'textarea', value: '' }), ui.field({ id: 'hk-off', label: F.pickup, value: F.pickupValue, disabled: true })];
  const live = `<div class="hk-form">${f.join('')}</div>`;
  return page(ctx, R, K, live, lead('A label above every field, always. Help and errors sit under the field and are joined to it.') + note('The error names what went wrong and what to do.')
    + bench(ctx, K) + code(ctx, K, 'Field', f[2], /^\.ui-(field|label|input|error|help)/), { label: 'Fields' });
}
function choices(ctx, K) {
  const R = roles(ctx), X = ex(ctx), ui = ctx.ui, ch = X.checks || [], sw = X.switches || [], rd = X.radios || [];
  const live = `<div class="hk-choices"><fieldset class="hk-fs"><legend class="tb-s">Checkboxes</legend>${ch.map((t, i) => ui.check(t, { checked: i === 0, disabled: i === 2 })).join('')}</fieldset>
<fieldset class="hk-fs"><legend class="tb-s">Radios</legend>${rd.map((t, i) => ui.check(t, { type: 'radio', name: 'hk-r', checked: i === 0 })).join('')}</fieldset>
<fieldset class="hk-fs"><legend class="tb-s">Switches</legend>${sw.map((t, i) => ui.switch(t, { checked: i === 0 })).join('')}</fieldset>
<div class="hk-fs">${ui.segmented(X.tabs || rd, 0)}</div></div>`;
  return page(ctx, R, K, live, lead('Checkboxes for many, radios for one, a switch for a setting that takes effect at once.')
    + bench(ctx, K) + code(ctx, K, 'Checkbox', ui.check(ch[0] || 'Option', { checked: true }), /^\.ui-choice/), { label: 'Choices' });
}
function cards(ctx, K) {
  const R = roles(ctx), S = sc(ctx), X = ex(ctx), ui = ctx.ui, d = S.deliveries;
  const set = [ui.card({ meta: d[0].when, title: d[0].to, text: S.pickup, action: ui.btn(S.form.book, { size: 'sm' }) }), ui.card({ meta: d[1].when, title: d[1].to, text: S.riderNote, raised: true })];
  const live = `<div class="hk-cards">${set.join('')}${ui.stat(S.paid, X.statLabel || S.paidLabel)}</div>`;
  return page(ctx, R, K, live, lead('A card holds one show. The raised card is for the one that needs looking at now.') + code(ctx, K, 'Card', set[0], /^\.ui-card/), { label: 'Cards' });
}
function navigation(ctx, K) {
  const R = roles(ctx), X = ex(ctx), ui = ctx.ui;
  const tabs = ui.tabs(X.tabs || [], 0);
  const live = `<div class="hk-stack">${tabs}${ui.crumbs(X.crumbs || [])}<nav class="hk-links" aria-label="Example links">${ui.links(X.links || [], 0)}</nav></div>`;
  return page(ctx, R, K, live, lead('Tabs switch a view, links move between screens, the breadcrumb says where you are.') + code(ctx, K, 'Tabs', tabs, /^\.ui-tabs/), { label: 'Navigation' });
}
function lists(ctx, K) {
  const R = roles(ctx), ui = ctx.ui, rows5 = ui.deliveryRows(5);
  return page(ctx, R, K, rows5, lead('A row: what, where and when, the price on the right and the status beside it.') + code(ctx, K, 'List', ui.deliveryRows(1), /^\.ui-(list|row)/), { label: 'A list' });
}
function status(ctx, K) {
  const R = roles(ctx), ui = ctx.ui;
  const live = `<ul class="hk-status">${ctx.status.map((s) => `<li>${ui.statusChip(s.id)}</li>`).join('')}</ul>`;
  return page(ctx, R, K, live, lead('Status is a word, printed in its colour. Never a colour alone.') + spec(ctx.status.map((s) => [A(s.label), m(s.tone)])) + code(ctx, K, 'Status', ui.statusChip(ctx.status[0].id), /^\.ui-chip/), { label: 'Statuses' });
}
function feedback(ctx, K) {
  const R = roles(ctx), S = sc(ctx), ui = ctx.ui;
  const live = `<div class="hk-stack">${ui.alert('warning', S.alert)}${ui.alert('success', S.toast)}<p class="ui-inline-msg">${A(S.inline)}</p>${ui.toast(S.toast)}<div class="hk-row">${ui.spinner()}${ui.skeleton('60%')}</div></div>`;
  return page(ctx, R, K, live, lead('Alerts stay until the problem is gone. A toast confirms and leaves. Loading shows the shape of what is coming.') + code(ctx, K, 'Alert', ui.alert('warning', S.alert), /^\.ui-alert/), { label: 'Feedback' });
}
function dialog(ctx, K) {
  const R = roles(ctx), D = sc(ctx).dialog, ui = ctx.ui, dlg = ui.dialog(D).replace(/dlg-t/g, 'hk-dlg-t');
  return page(ctx, R, K, `<div class="hk-scrim">${dlg}</div>`, lead('A dialog asks one thing. The title asks it and the two buttons answer it.') + note('Esc and a press on the scrim choose the safe answer.') + code(ctx, K, 'Dialog', dlg, /^\.ui-dialog/), { cls: 'hk-tk--scrim', label: 'A dialog on its scrim' });
}
function table(ctx, K) {
  const R = roles(ctx), S = sc(ctx), ui = ctx.ui;
  const heads = ['Booking', 'Details', 'Status', S.paidLabel];
  const t = `<div class="hk-tw"><table class="ui-table"><thead><tr>${heads.map((h, i) => `<th scope="col"${i === 3 ? ' class="is-num"' : i === 1 ? ' class="hk-wide"' : ''}>${A(h)}</th>`).join('')}</tr></thead><tbody>${S.deliveries.map((d, i) => `<tr${i === 0 ? ' aria-selected="true"' : ''}><td>${A(d.to)}</td><td class="hk-wide">${A(d.when)}</td><td>${ui.statusChip(d.status)}</td><td class="is-num">${A(d.price)}</td></tr>`).join('')}</tbody></table></div>`;
  return page(ctx, R, K, t, lead('Numbers right-aligned, statuses as words, the selected row marked by a bar.') + note('At phone width the details column folds away; the booking, its status and the price stay.') + code(ctx, K, 'Table', t.replace(/<tbody>.*<\/tbody>/, '<tbody></tbody>').replace(/ class="hk-wide"/g, '').replace(/^<div class="hk-tw">|<\/div>$/g, ''), /^\.ui-table/), { label: 'A table' });
}
function empty(ctx, K) {
  const R = roles(ctx), E = sc(ctx).empty, ui = ctx.ui;
  const e = `<div class="ui-empty"><h3 class="ui-empty__title">${A(E.title)}</h3><p class="ui-empty__text">${A(E.body)}</p>${ui.btn(E.cta)}</div>`;
  return page(ctx, R, K, e, lead('An empty screen says what will be here and gives the one way to fill it.') + code(ctx, K, 'Empty state', e, /^\.ui-empty/), { label: 'An empty state' });
}

// ---- patterns: the product screen ----
function screenOf(ctx, { phone = false } = {}) {
  const S = sc(ctx), ui = ctx.ui, X = ex(ctx);
  return `<div class="hk-scr${phone ? ' hk-scr--phone' : ''}"><div class="hk-scr__top"><span class="ui-num">${A(S.time)}</span>${ui.statusChip(S.deliveries[0].status)}</div>
<p class="ui-display hk-eta">${A(S.eta)}</p><p class="hk-p">${A(S.pickup)}</p>
<div class="ui-progress"><div class="ui-progress__bar"><i style="width:${S.progress * 100}%"></i></div><span class="ui-progress__dot" style="left:${S.progress * 100}%"></span></div>
<div class="hk-scr__ft"><span>${A(S.from)}</span><span>${A(S.to)}</span></div>
<ul class="ui-list">${ui.row({ lead: `<span class="ui-avatar">${A(S.initials)}</span>`, title: S.rider, sub: S.riderNote, endHtml: ui.btn(S.call, { variant: 'secondary', size: 'sm' }) })}</ul>
${rows([[A(S.deliverToLabel), A(S.deliverTo)], [A(S.paidLabel), A(S.paid)]])}
${ui.btn(S.share, { variant: 'secondary', block: true })}${phone ? `<nav class="ui-tabbar hk-tabbar" aria-label="Example tab bar">${ui.links(X.links || [], 0, 'page')}</nav>` : ''}</div>`;
}
function screen(kind) {
  return (ctx, K) => {
    const R = roles(ctx), B = ctx.brand;
    const live = kind === 'mobile' ? `<div class="hk-phone">${screenOf(ctx, { phone: true })}</div>` : `<div class="hk-desk"><div class="hk-desk__l">${screenOf(ctx)}</div><div class="hk-desk__r"><p class="tb-b">${A(B.ui.screen.title)}</p>${ctx.ui.deliveryRows(4)}</div></div>`;
    return page(ctx, R, K, live, lead(kind === 'dark' ? 'The same screen on the dark set. Nothing moves; only the tokens change.' : kind === 'mobile' ? 'The screen at phone width: one column, the tab bar at the foot.' : `${A(B.ui.screen.title)}: the screen the product opens on, built only from the kit.`), { dark: kind === 'dark', label: `Product screen, ${kind}` });
  };
}

// ---- handoff ----
function tokens(ctx, K) {
  const R = roles(ctx), L = colourMap(ctx, 'light'), D = colourMap(ctx, 'dark'), G = tokenGroups(ctx);
  const cv = (k) => `<button type="button" class="tb-val" data-copy="var(--${k})" data-copy-name="--${k}"><span data-copy-text>--${A(k)}</span></button>`;
  const colRows = Object.keys(L).map((k) => `<li><p>${cv(k)}</p><p class="hk-tv"><i class="hk-dot" style="background:${L[k]}"></i>${m(L[k].toUpperCase())}</p><p class="hk-tv"><i class="hk-dot" style="background:${D[k]}"></i>${m(D[k].toUpperCase())}</p></li>`).join('');
  const grp = (name, o) => `<li class="hk-grp"><p class="ht-k">${A(ctx.cap(name))}</p><ul class="hk-tl">${Object.entries(o).map(([k, v]) => `<li><p>${cv(k)}</p><p class="hk-tv">${m(v)}</p></li>`).join('')}</ul></li>`;
  const live = `<ul class="hk-swrow">${ROLE_ORDER.filter((k) => L[k]).map((k) => `<li style="background:var(--${k})"></li>`).join('')}</ul><p class="hk-p">${Object.keys(L).length} colour tokens, ${Object.values(G).reduce((n, o) => n + Object.keys(o).length, 0)} others. Press a name to copy it.</p>`;
  return page(ctx, R, K, live, full(`${h2('Colour')}<ul class="hk-tl hk-tl--3"><li class="hk-tl__h"><p class="tb-s">Token</p><p class="tb-s">Light</p><p class="tb-s">Dark</p></li>${colRows}</ul>`)
    + full(`<ul class="hk-grps">${Object.entries(G).map(([k, o]) => grp(k, o)).join('')}</ul>`), { label: 'The colour tokens, live' });
}
function codePage(ctx, K) {
  const R = roles(ctx), S = sc(ctx), ui = ctx.ui;
  const snippet = `<link rel="stylesheet" href="tokens.css">\n<link rel="stylesheet" href="components.css">\n\n<div class="ui">\n  ${ui.btn(S.form.book)}\n</div>`;
  const live = `<div class="hk-stack">${ui.btn(S.form.book)}<p class="hk-p">This button is the package&rsquo;s own CSS, as shipped.</p></div>`;
  return page(ctx, R, K, live, lead('Two stylesheets and a wrapper. Everything in this kit is in them.')
    + spec([['tokens.css', 'Every token, light on the root, dark on data-theme="dark"'], ['components.css', 'Every component, scoped under .ui']])
    + full(`<div class="hk-codes">${`<div class="hk-code"><div class="hk-code__h"><p class="ht-k">Start here</p><button type="button" class="tb-btn hk-copy" data-copy="${A(snippet)}" data-copy-name="starter markup"><span data-copy-text>Copy</span></button></div><pre><code>${A(snippet)}</code></pre></div>`}</div>`), { label: 'The package, live' });
}

const PAGES = {
  cover, contents, 'colour-light': colour('light'), 'colour-dark': colour('dark'), 'type-scale': typeScale, spacing, 'radii-borders': radiiBorders, elevation, states,
  buttons, inputs, choices, cards, navigation, lists, status, feedback, dialog, table, empty,
  'screen-light': screen('light'), 'screen-dark': screen('dark'), 'screen-mobile': screen('mobile'), tokens, code: codePage,
};

function shell(ctx, K, body) {
  const R = roles(ctx), p = K.page;
  const sections = K.sections.map((s) => ({ n: s.n, title: s.title, items: s.pages.map((q) => ({ href: K.href(q.id), ref: q.ref, title: q.title, current: q.id === p.id })) }));
  const ext = K.pages.find((q) => q.id === 'contents');
  const first = [{ href: 'index.html', ref: '', title: 'Overview', current: p.id === 'cover' }, ...(ext ? [{ href: K.href('contents'), ref: '', title: ext.title, current: p.id === 'contents' }] : [])];
  const pv = K.prev && { href: K.href(K.prev.id), ref: K.prev.ref, title: K.prev.id === 'cover' ? 'Overview' : K.prev.title }, nx = K.next && { href: K.href(K.next.id), ref: K.next.ref, title: K.next.title };
  return `<a class="bk-skip" href="#ht-main">Skip to the page</a>
<div class="bk ht sx" data-page="${p.id}">
${bar(ctx, R, { part: 'kit', home: 'index.html' })}
<div class="ht-body">
${order(ctx, { first, sections, current: p.section ? { ref: p.ref, title: p.title } : null, toggle: 'data-disclosure' })}
<main class="ht-main" id="ht-main" tabindex="-1"><article class="sx-art">${body}</article>${pager(pv, nx)}
<footer class="bk-foot"><span>${A(ctx.brand.name)} UI kit</span><span>${A(ctx.versionLine)}</span></footer></main>
</div>
</div>`;
}

export const kitSite = { css: null, shell, pages: PAGES, benches: BENCHES, fallback: (ctx, K) => { throw new Error(`kit site: no page ${K.page.id}`); } };
