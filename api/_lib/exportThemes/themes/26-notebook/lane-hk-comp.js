// Theme 26, Notebook, lane hk: the component pages of the kit site. Every component is ctx.ui's, forced into a state by the class the shipped
// CSS answers to (is-hover, is-focus, is-pressed) or by disabled; the notebook only writes around them.
import { statusText } from '../../engine/tokens.js';
import { kitColours, modeLabel } from './lane-u1.js';
import { sc, ex, ut, E, uid, piece, says, ladder, pair, stack, appendix, sec, note, mono, ink, name, cap, ratio, tapeTab } from './lane-hk-parts.js';

const body = (...parts) => `<div class="hk-body">${parts.join('')}</div>`;
const wrapIn = (html) => `<div class="hk-wrap">${html}</div>`;
const fieldCell = (html) => `<div style="flex:1 1 220px;min-width:0">${html}</div>`;
const logoSpan = (ctx, mode) => {
  const g = ctx.logo.geos.colour || ctx.logo.geos.primary, lw = 96, lh = g ? Math.round(lw * g.h / g.w) : 24, rev = ctx.brand.logo.colourways.reversed;
  return `<span style="display:block;width:${lw}px;min-height:${lh}px">${mode === 'dark' ? ctx.logo.html('reversed', { width: lw, color: rev.name }) : ctx.logo.html('colour', { width: lw })}</span>`;
};

// ---- states: a row per state, top to bottom as a press goes; what changes sits beside each, with its token and ratio ----
function states(ctx) {
  const S = sc(ctx), F = S.form, X = ex(ctx), ui = ctx.ui, M = kitColours(ctx, 'light'), D = kitColours(ctx, 'dark'), r = (a, b) => ratio(ctx, a, b);
  const fv = [[F.pickup, F.pickupValue], [F.dropoff, F.dropoffValue]].filter((x) => x[0])[0] || [F.ready, F.readyValue];
  const row = (st, o) => piece(ctx, 'light', wrapIn((o.p === false ? '' : ui.btn(F.book, { state: st })) + ui.btn(X.secondary, { variant: 'secondary', state: st, disabled: o.dis }) + fieldCell(ui.field({ id: uid('st'), label: fv[0], value: fv[1] || '', state: o.fs, disabled: o.dis }))));
  const ring = ctx.borders[2] ? ctx.borders[2].px : 2;
  const rows = [
    ['Rest', row(undefined, {}), 'Action fill with its label on it.', `--action ${M.action}, label ${r(M['action-label'], M.action)}`],
    ['Hover', row('hover', {}), 'Action steps to its hover fill; outlined controls take the sunken ground. Fields do not change.', `--action-hover ${M['action-hover']}, label ${r(M['action-label'], M['action-hover'])}`],
    ['Focus', row('focus', { fs: 'focus' }), `A ${ring} px ring on a 2 px gap of the ground. A field's edge also turns to the text colour.`, `--focus ${M.focus}, ${r(M.focus, M.surface)} on the surface`],
    ['Pressed', row('pressed', {}), 'Action goes to its pressed fill and the button scales to 0.97. Fields do not change.', `--action-pressed ${M['action-pressed']}, label ${r(M['action-label'], M['action-pressed'])}`],
    ['Disabled', row(undefined, { dis: true, p: false }), `The primary is never disabled. It stays live and says what is missing: ${F.bookWhy || ''}`.trim(), `--disabled-bg ${M['disabled-bg']}, type ${r(M['disabled-text'], M['disabled-bg'])}`],
  ].map(([n, p, w, v]) => [p, says(ctx, n, w, v)]);
  const dk = piece(ctx, 'dark', wrapIn(ui.btn(F.book, { state: 'focus' }) + ui.btn(X.secondary, { variant: 'secondary', state: 'focus' }) + fieldCell(ui.field({ id: uid('st'), label: fv[0], value: fv[1] || '', state: 'focus' }))), { label: 'Focus, dark' });
  return body(note(ctx, 'Each state is the shipped CSS, forced by its class or by the disabled attribute, so the kit shows exactly what the product draws.'), ladder(rows), sec(ctx, '', `${dk}${note(ctx, `In dark the ring is --focus ${D.focus}, ${r(D.focus, D.surface)} on the dark surface.`)}`));
}

// ---- buttons: the primary drawn large (the browser's zoom, so still the shipped button), the spec, and every variant light beside dark ----
function buttons(ctx) {
  const S = sc(ctx), F = S.form, X = ex(ctx), ui = ctx.ui, M = kitColours(ctx, 'light'), B = ctx.brand, ctl = ut(ctx, 'control'), bw = B.ui.border;
  const pad = (ctx.space[4] || { px: 20 }).px, sm = (ctx.space[3] || { px: 16 }).px, lg = (ctx.space[5] || { px: 24 }).px;
  const big = piece(ctx, 'light', `<div style="zoom:2;width:max-content;max-width:100%">${ui.btn(F.book)}</div>`, { label: 'Primary, drawn at 2 times' });
  const vars = [['Primary', ui.btn(F.book)], ['Secondary', ui.btn(X.secondary, { variant: 'secondary' })], ['Quiet', ui.btn(X.quiet, { variant: 'quiet' })], ['Danger', ui.btn(X.danger, { variant: 'danger' })], ['Small', ui.btn(X.small, { size: 'sm' })], ['Large, with an icon', ui.btn(F.book, { size: 'lg', iconRight: 'arrow-right' })]];
  const col = (mode) => piece(ctx, mode, `<div class="hk-stack" style="gap:24px">${vars.map(([n, h]) => `<div class="hk-cell">${cap(ctx, n)}${h}</div>`).join('')}</div>`, { label: modeLabel(mode) });
  return body(
    sec(ctx, '', `${big}${ink(ctx, `44 px high, ${pad} px of padding either side of the label`)}${note(ctx, 'One primary per screen. Its label is the verb it does.')}`),
    pair(col('light'), col('dark')),
    note(ctx, 'Danger is only for what cannot be undone. Quiet is for a way out beside the primary. Small sits inside rows and cards.'),
    appendix(ctx, `${B.fonts.body.family}, at 1:1`, [['Height', '44 px, small 36, large 52'], ['Padding', `${pad} px, small ${sm}, large ${lg}`], ['Radius', `${ctx.radius.button} px`], ['Label', `${ctl.weight} ${ctl.size} px`], ['Edge', `${bw} px, secondary only`], ['Label on action', ratio(ctx, M['action-label'], M.action)]]),
  );
}

// ---- inputs: the product's own fields, each in a different state, with what shows and the token that draws it ----
function inputs(ctx) {
  const S = sc(ctx), F = S.form, X = ex(ctx), ui = ctx.ui, M = kitColours(ctx, 'light'), r = (a, b) => ratio(ctx, a, b), cap_ = ut(ctx, 'caption');
  const f = (h) => piece(ctx, 'light', h);
  const rows = [
    ['Focus', ui.field({ id: uid('in'), label: F.pickup, value: F.pickupValue || '', state: 'focus' }), 'The edge turns to the text colour and the ring sits outside it.', `--focus ${M.focus}, ${r(M.focus, M.surface)}`],
    ['Filled', ui.field({ id: uid('in'), label: F.dropoff, value: F.dropoffValue || '' }), `The value in the text colour at ${ut(ctx, 'control').size} px, on a ${ctx.brand.ui.border} px edge.`, `--edge ${M.edge}, ${r(M.edge, M.surface)}`],
    ['Select', ui.field({ id: uid('in'), label: F.size, kind: 'select', options: F.sizes || [], value: (F.sizes || [])[1] }), 'The same field, with a chevron in the quiet colour.', `--quiet ${M.quiet}, ${r(M.quiet, M.surface)}`],
    ['Error', ui.field({ id: uid('in'), label: F.ready, value: F.readyValue || '', error: F.readyError }), 'The edge and the message take the danger colour. The message says what to do.', `--danger ${M.danger}, ${r(M.danger, M.surface)}`],
    ['Hint', ui.field({ id: uid('in'), label: F.notes, kind: 'textarea', help: F.notesHelp }), `A hint sits under the field at ${cap_.size} px and gives way to the error.`, `--quiet ${M.quiet}, ${r(M.quiet, M.surface)}`],
    ['Disabled', ui.field({ id: uid('in'), label: X.account, value: ctx.brand.name, disabled: true }), 'The disabled ground, its type, and no edge.', `--disabled-bg ${M['disabled-bg']}, type ${r(M['disabled-text'], M['disabled-bg'])}`],
  ].map(([n, h, w, v]) => [f(h), says(ctx, n, w, v)]);
  return body(ladder(rows), note(ctx, 'The label always sits above the field.'));
}

// ---- choices: the choices as the product uses them, then every state of each kind, a row per state ----
function choices(ctx) {
  const S = sc(ctx), F = S.form, X = ex(ctx), ui = ctx.ui, M = kitColours(ctx, 'light'), r = (a, b) => ratio(ctx, a, b);
  const grp = (t, items) => `<div class="hk-cell">${cap(ctx, t)}${items}</div>`;
  const use = `<div class="hk-stack" style="gap:24px">${grp('Checkbox', (X.checks || []).slice(0, 3).map((c, i) => ui.check(c, { checked: i === 0, disabled: i === 2 })).join(''))}${grp('Radio', (X.radios || []).slice(0, 2).map((c, i) => ui.check(c, { type: 'radio', name: uid('set'), checked: i === 0 })).join(''))}${grp('Switch', (X.switches || []).slice(0, 2).map((c, i) => ui.switch(c, { checked: i === 0 })).join(''))}<div class="hk-cell"><p class="ui-label">${E(ctx, F.size)}</p>${ui.segmented(F.sizes || [], 1)}</div></div>`;
  const short = (a) => [...a].sort((p, q) => p.length - q.length)[0];
  const ck = short(X.checks || ['On']), rd = short(X.radios || ['On']), sw = short(X.switches || ['On']);
  const st = [['Off', {}], ['On', { checked: true }], ['Focus', { checked: true, state: 'focus' }], ['Disabled', { disabled: true }], ['Disabled, on', { disabled: true, checked: true }]];
  const rows = st.map(([n, o]) => [piece(ctx, 'light', wrapIn(`${ui.check(ck, o)}${ui.check(rd, { ...o, type: 'radio', name: uid('r') })}${ui.switch(sw, o)}`)), says(ctx, n, '', '')]);
  const lines = [
    ['Checked', 'A checkbox or radio fills with the text colour; a switch fills with the action colour and its knob takes the text colour.', `--text ${M.text}, --action ${M.action}`],
    ['Disabled', 'The disabled ground with no edge, and the label in the disabled type.', `type ${r(M['disabled-text'], M.surface)} on the surface`],
    ['Segmented', 'One choice, always one selected, filled with the text colour.', `${ctx.radius.button} px, ${ctx.brand.ui.border} px edge`],
  ];
  return body(sec(ctx, '', `${piece(ctx, 'light', use, { label: 'In use' })}${note(ctx, 'Each choice is 44 px tall to tap, with the label as part of the target.')}`), sec(ctx, 'Every state', ladder(rows)), `<div class="hk-sec">${lines.map(([n, w, v]) => says(ctx, n, w, v)).join('')}</div>`);
}

// ---- cards ----
function cards(ctx) {
  const S = sc(ctx), X = ex(ctx), ui = ctx.ui, M = kitColours(ctx, 'light'), Dk = kitColours(ctx, 'dark');
  const one = { meta: S.status, title: S.eta, text: S.pickup, action: `<div>${ui.btn(X.secondary, { variant: 'secondary', size: 'sm' })}</div>` };
  const two = { meta: S.deliverToLabel, title: S.deliverTo, text: S.riderNote, raised: true };
  const ts = ut(ctx, 'title-s');
  const mid = pair(piece(ctx, 'light', `${ui.card(two)}`, { label: 'Raised' }) , piece(ctx, 'light', ui.stat(S.paid, S.paidLabel || X.statLabel), { label: 'Stat' }));
  const dark = pair(piece(ctx, 'dark', ui.card({ meta: S.status, title: S.eta, text: S.pickup }), { label: 'Card, dark' }), piece(ctx, 'dark', ui.card(two), { label: 'Raised, dark' }));
  return body(
    ladder([[piece(ctx, 'light', ui.card(one), { label: 'Card' }), `<div class="hk-sec">${[['Meta', S.status], ['Title', `${ts.size} / ${ts.line}, ${ctx.brand.fonts.display.family}`], ['Text', 'The body size, in the text colour'], ['Action', 'A small secondary button, when the card has one']].map(([n, v]) => says(ctx, n, '', v)).join('')}</div>`]]),
    appendix(ctx, 'The card', [['Radius', `${ctx.radius.card} px`], ['Edge', `1 px, --divider ${M.divider}`], ['Padding', '16 px, 6 px between parts']]),
    note(ctx, 'Cards draw an edge, not a shadow. A card never holds another card.'),
    mid, `${note(ctx, 'The raised ground and no edge, for a second level. A stat is one number and its label, in tabular figures.')}`, dark,
    note(ctx, `In dark the edge is --divider ${Dk.divider} and the raised ground ${Dk.raised}.`),
  );
}

// ---- navigation ----
function navigation(ctx) {
  const S = sc(ctx), X = ex(ctx), ui = ctx.ui, links = (X.links || []).slice(0, 3);
  const top = (mode) => `<nav class="ui-topbar" aria-label="Main ${mode}">${logoSpan(ctx, mode)}<div class="ui-topbar__links">${ui.links(links, 0)}</div></nav>`;
  const all = [...links, [X.account, 'settings']];
  const bar = `<nav class="ui-tabbar" aria-label="Sections">${all.map(([t, i], k) => `<a href="#"${k === 0 ? ' aria-current="page"' : ''}>${ui.icon(i, 20)}${E(ctx, t)}</a>`).join('')}</nav>`;
  const flush = (mode, h, label) => piece(ctx, mode, h, { label, cls: 'hk-flush' });
  return body(
    sec(ctx, '', `${flush('light', top('light'), 'Top bar')}${note(ctx, 'The current page has a 3 px bar in the action colour under it. Links are 44 px tall.')}`),
    sec(ctx, '', `${piece(ctx, 'light', ui.tabs(X.tabs || [], 0), { label: 'Tabs' })}${note(ctx, 'Tabs switch views of one list. They do not change the page.')}`),
    sec(ctx, '', `${piece(ctx, 'light', ui.crumbs([...(X.crumbs || []), S.deliverTo]), { label: 'Breadcrumbs' })}${note(ctx, 'Quiet, with the current page in full ink.')}`),
    pair(`<div class="hk-sec">${piece(ctx, 'light', `<nav class="ui-sidebar" aria-label="Sections list">${ui.links(all, 0)}</nav>`, { label: 'Sidebar' })}${note(ctx, 'A bar on the left marks the current page, on the surface, inside the raised ground.')}</div>`,
      `<div class="hk-sec">${piece(ctx, 'dark', bar, { label: 'Tab bar, dark', cls: 'hk-flush' })}${note(ctx, `${all.length} destinations at most, 64 px tall, for a phone.`)}</div>`),
    note(ctx, 'The bar under the current page is the only place the action colour marks where you are.'),
  );
}

// ---- lists ----
function lists(ctx) {
  const S = sc(ctx), ui = ctx.ui, d = S.deliveries || [], n = Math.min(5, d.length);
  const plain = `<ul class="ui-list">${d.slice(0, 2).map((x) => ui.row({ title: x.to, sub: x.when, end: x.price })).join('')}</ul>`;
  return body(
    pair(piece(ctx, 'light', ui.deliveryRows(n), { label: 'Light' }), piece(ctx, 'dark', ui.deliveryRows(n), { label: 'Dark' })),
    `<div class="hk-sec">${['One row is one item. The name is the title, the detail sits under it, and the status is the only colour.', 'Money and times use tabular figures, so a column of them lines up.', 'A row that opens is a link, and the whole row is the target.'].map((t) => note(ctx, t)).join('')}</div>`,
    sec(ctx, '', `${piece(ctx, 'light', plain, { label: 'Without a lead' })}${note(ctx, 'A row is at least 64 px tall, divided by a 1 px line in the divider colour.')}`),
  );
}

// ---- status: every status as the product prints it, light beside dark, with its token and the ratio of the words on that ground ----
function status(ctx) {
  const S = sc(ctx), X = ex(ctx), ui = ctx.ui, st = ctx.status;
  const col = (mode) => {
    const M = kitColours(ctx, mode);
    const rows = st.map((s) => { const t = statusText(ctx, mode, s); return `<div class="hk-inkrow">${ui.statusChip(s.id)}<span class="hk-vals"><span class="hk-mono">${E(ctx, t.token)}</span><span class="hk-mono">${ratio(ctx, t.hex, M.surface)}</span></span></div>`; }).join('');
    return piece(ctx, mode, rows, { label: modeLabel(mode) });
  };
  const d = S.deliveries || [];
  const hit = (X.tabs || []).map((t) => [t, st.find((s) => s.label === t)]).find((x) => x[1] && d.some((r_) => r_.status === x[1].id));
  const badge = hit ? sec(ctx, '', `${piece(ctx, 'light', `<div style="display:flex;align-items:center;gap:8px"><span class="ui-label">${E(ctx, hit[0])}</span><span class="ui-badge">${d.filter((x) => x.status === hit[1].id).length}</span></div>`, { label: 'Count badge' })}${note(ctx, `It counts the rows in that status: ${d.filter((x) => x.status === hit[1].id).length} here. The badge is the action colour with its label.`)}`) : '';
  return body(note(ctx, `${st.length} states. A status is words in one colour with no fill, and its ratio is those words on the ground.`), pair(col('light'), col('dark')), badge, note(ctx, 'Each status keeps its words in both modes; only the colour steps to stay legible on the dark.'));
}

// ---- feedback: the four alerts, the inline message, loading and the toast ----
function feedback(ctx) {
  const S = sc(ctx), F = S.form, ui = ctx.ui, M = kitColours(ctx, 'light'), r = (a, b) => ratio(ctx, a, b);
  const alerts = [['Info', 'info', S.pickup], ['Success', 'success', S.toast], ['Warning', 'warning', S.alert], ['Danger', 'danger', F.readyError]].filter((x) => x[2])
    .map(([n, tone, text]) => [piece(ctx, 'light', ui.alert(tone, text)), says(ctx, n, '', `--${tone} ${M[tone]}, ${r(M[tone], M.surface)} on the surface`)]);
  const sk = `<div style="display:flex;flex-direction:column;gap:10px;width:220px;max-width:100%">${ui.skeleton('220px')}${ui.skeleton('150px')}${ui.skeleton('180px')}</div>`;
  return body(
    sec(ctx, 'Alerts', `${ladder(alerts)}${note(ctx, 'An alert is words on the ground: the icon and a 2 px edge carry the tone, the words stay in the text colour. It stays until it is dealt with.')}`),
    sec(ctx, '', `${piece(ctx, 'light', `<p class="ui-inline-msg">${ui.icon('info', 16)}${E(ctx, S.inline || '')}</p>`, { label: 'Inline message' })}${note(ctx, 'The inline message sits beside what it is about, at label size, with no edge.')}`),
    pair(piece(ctx, 'light', `<div class="hk-wrap" style="gap:24px;align-items:flex-start">${ui.spinner()}${sk}</div>`, { label: 'Loading' }), piece(ctx, 'light', ui.toast(S.toast || ''), { label: 'Toast' })),
    note(ctx, 'A toast leaves by itself and keeps its undo reachable by keyboard. The spinner is for a short wait; a list waits in skeleton lines.'),
  );
}

export const comp = { states, buttons, inputs, choices, cards, navigation, lists, status, feedback };
