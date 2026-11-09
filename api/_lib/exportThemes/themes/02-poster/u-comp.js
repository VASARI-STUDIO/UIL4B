// UI kit pages: buttons, inputs, choices, cards, navigation, lists. Styles are in css-u-comp.js (classes start tu2-).
// The components are the product's own UI (ctx.ui, the engine's working components) drawn in the brand's ui roles, standing straight on
// the page: Stock pages carry the light roles, and navigation and lists are the queue at night (Night ground, the dark roles). The ticket
// never frames a component. Its parts are the page's structure: the perforation as a rule between a body and its stub, or between rows;
// serials as running numbers (states run as consecutive serials, as tickets do on a roll); fact fields label over value; the condensed
// stub face for small labels. Brand copy is only printed whole through A() (the ui helpers escape their own). No hex is written here.
import { A, ratioText, fit } from './helpers.js';
import { page, perf, serial, fields, hexName } from './gate.js';

// the perforation on an open page: holes 3 px across at a 9 px pitch, in the page's ink, on the left (or top) edge of its column
const pv = () => perf('currentColor', { d: 3, p: 9, cls: 'tu2-perf' });
const ph = () => perf('currentColor', { d: 3, p: 9, dir: 'h', cls: 'tu2-perf' });
const m = (s) => `<span class="tk-mono">${A(s)}</span>`;
const rt = (ctx, a, b) => ratioText(ctx.fmt(ctx.ratio(a, b)));
const sc = (ctx) => ctx.brand.ui.screen.content;
const act = (ctx) => ctx.colours.find((c) => c.role === 'action');
// a role value named by its palette colour when it is one, else printed as the literal value
const nm = (ctx, hex) => { const n = hexName(ctx, hex); return n === hex ? m(hex) : A(n); };
// a small label in the stub face, with its serial
const sk = (n, t, w = 3) => `<p class="tu2-sk"><span class="tk-sn">${serial(n, w)}</span><span class="tu2-k">${A(t)}</span></p>`;
const cap = (t) => `<p class="tu2-cap">${t}</p>`;
// the components stand in the product's own roles: the light roles on Stock, the dark ones on Night
const ui = (inner, dark, cls = '') => `<div class="ui tu2-ui ${cls}"${dark ? ' data-theme="dark"' : ''}>${inner}</div>`;
const night = 'tu2-night';

export const uComp = {
  // the body carries the primary button drawn at three times with its measurements, and the rules; its states run along the foot as
  // five consecutive serials torn apart by perforations; the variants are on the stub, beyond the long perforation
  buttons(ctx) {
    const S = sc(ctx), F = S.form, U = ctx.ui, L = ctx.roles.light, a = act(ctx);
    const ctl = ctx.uiType.find((t) => t.token === 'control');
    const padPx = ctx.space[4].px, H = 44, rad = ctx.brand.ui.radius.button ?? ctx.brand.ui.radius.control, Z = 3;
    const lab = nm(ctx, L.actionLabel);
    // the primary is never shown disabled where it teaches the pattern: when it cannot act yet, its label names the next step
    const next = ctx.ph('ui.screen.content.form.book', 'Choose a show');
    const draw = `<figure class="tu2-draw">
<div class="tu2-dim tu2-dim--h" style="width:${padPx * Z}px"><span class="tk-mono">${padPx}</span></div>
<div class="tu2-zrow"><div class="tu2-dim tu2-dim--v" style="height:${H * Z}px"><span class="tk-mono">${H}</span></div>${ui(U.btn(F.book), false, 'tu2-zoom')}</div>
<figcaption class="tu2-cap">Drawn at ${Z}&times;. Measurements are at 1&times;.</figcaption>
${fields([['Face', `${A(ctx.brand.fonts.body.family)} ${ctl.weight}`], ['Size', m(`${ctl.size} px`)], ['Height', m(H)], ['Padding', m(padPx)], ['Radius', m(rad)]], 'tu2-ff')}</figure>`;
    const rules = `<div class="tu2-bt__rules"><p class="tu2-bt__r1">One per screen. It is the only ${A(a.name)} on the page.</p>
<p>The label says what happens next: ${A(F.book)}, Pay ${A(S.paid)}.</p><p>When it cannot act yet, the label names the next step: ${A(next)}.</p></div>`;
    const st = [
      [U.btn(F.book), 'Default', `${A(a.name)}, ${lab} type ${rt(ctx, L.actionLabel, L.action)}.`],
      [U.btn(F.book, { state: 'hover' }), 'Hover', `${m(L.actionHover)}, ${lab} type ${rt(ctx, L.actionLabel, L.actionHover)}.`],
      [U.btn(F.book, { state: 'focus' }), 'Focus', `${ctx.borders[2].px} px ring on a ${ctx.borders[2].px} px gap.`],
      [U.btn(F.book, { state: 'pressed' }), 'Pressed', `${m(L.actionPressed)}, scaled to 0.97.`],
      // the primary is never drawn disabled, so the disabled fill is shown on the secondary
      [U.btn(S.example.secondary, { variant: 'secondary', state: 'disabled' }), 'Disabled', `${m('--disabled-bg')} fill, muted type. Secondary only: the primary names the next step.`],
      // pending: the payment is going through. The label stays, a 16 px spinner goes before it, and the fill does not change
      [U.btn(F.book, { attrs: 'aria-busy="true"' }).replace(/^(<button[^>]*>)/, '$1<span class="tu2-spin" aria-hidden="true"></span>'), 'Loading', 'Label kept, a 16 px spinner before it. Presses are ignored until it ends.'],
    ];
    // six states in two rows of three: the second row is torn from the first by a perforation
    const roll = `<ol class="tu2-roll">${st.map(([b, n, d], i) => `<li class="tu2-roll__t${i > 2 ? ' tu2-roll__t--r2' : ''}">${i % 3 ? pv() : ''}${i > 2 ? ph() : ''}${sk(i + 1, n)}${ui(b)}${cap(d)}</li>`).join('')}</ol>`;
    const va = [
      [U.btn(S.example.secondary, { variant: 'secondary' }), 'Secondary', `${ctx.borders[1].px} px ${nm(ctx, L.text)} edge, for the second action.`],
      [U.btn(S.example.quiet, { variant: 'quiet' }), 'Quiet', 'Underlined, no fill.'],
      [U.btn(S.example.danger, { variant: 'danger' }), 'Danger', 'Only for what cannot be undone.'],
      [U.btn(S.example.small, { size: 'sm', variant: 'secondary' }), 'Small, 36', 'Inside rows and cards.'],
      [U.btn(F.book, { size: 'lg', iconRight: 'arrow-right' }), 'Large, 52', 'One per screen, at most.'],
    ];
    const stub = `<div class="tu2-bt__stub">${pv()}<h3 class="tk-h3">Variants</h3><ul class="tu2-va">${va.map(([b, n, d]) => `<li>${ui(b)}<p class="tu2-k tu2-va__n">${A(n)}</p>${cap(d)}</li>`).join('')}</ul></div>`;
    const body = `<div class="tu2-bt__body"><div class="tu2-bt__top">${draw}${rules}</div><div class="tu2-bt__foot">${ph()}<h3 class="tk-h3">States</h3>${roll}</div></div>`;
    return page(ctx, 'buttons', `<div class="tu2-bt">${body}${stub}</div>`, 'tu2 tu2--buttons');
  },

  // one form, not a matrix. The body is the form as it ships, drawn large: each kind of field at rest and in focus, the two states as
  // consecutive serials, and the disabled form torn off along its foot. The stub beyond the long perforation carries the rule and the
  // three errors, the form gone wrong
  inputs(ctx) {
    const S = sc(ctx), F = S.form, U = ctx.ui;
    const sel = (id, o) => U.field({ id, label: F.size, kind: 'select', options: F.sizes, value: F.sizes[1], ...o });
    // slot: a field's value is the descriptor sentence, which a one-line field clips mid-word; there it holds a short neutral entry
    const val = (v) => (ctx.edition === 'slot' ? 'Sample entry' : v);
    const txt = (id, o) => U.field({ id, label: F.dropoff, value: val(F.dropoffValue), ...o });
    const ta = (id, o) => U.field({ id, label: F.notes, kind: 'textarea', value: F.notesHelp, ...o });
    // per kind: rest, focus, error, disabled
    const kinds = [
      ['Text field', [txt('tu2-t1', { value: '', placeholder: 'Full name' }), txt('tu2-t2', { state: 'focus' }), U.field({ id: 'tu2-t3', label: F.ready, value: val(F.readyValue), error: F.readyError }), txt('tu2-t4', { disabled: true })]],
      ['Select', [sel('tu2-s1'), sel('tu2-s2', { state: 'focus' }), sel('tu2-s3', { error: 'Choose one from the list.' }), sel('tu2-s4', { disabled: true })]],
      ['Textarea', [U.field({ id: 'tu2-a1', label: F.notes, kind: 'textarea', help: F.notesHelp }), ta('tu2-a2', { state: 'focus' }), ta('tu2-a3', { error: 'Keep the note under 200 characters.' }), ta('tu2-a4', { disabled: true })]],
    ];
    const form = `<div class="tu2-in__form"><span></span>${sk(1, 'Rest')}<div class="tu2-in__fc">${sk(2, 'Focus')}</div>
${kinds.map(([k, c]) => `<p class="tu2-k tu2-in__k">${A(k)}</p><div class="tu2-in__c">${ui(c[0])}</div><div class="tu2-in__c tu2-in__fc">${ui(c[1])}</div>`).join('')}</div>`;
    const off = `<div class="tu2-in__off">${ph()}${sk(4, 'Disabled')}<div class="tu2-in__offr">${kinds.map(([, c]) => ui(c[3])).join('')}</div></div>`;
    const lead = `The label is always visible and sits above the field. A hint turns into the error when there is one, and says what to enter: ${A(F.readyError)} Placeholders are a hint, never the label.`;
    const err = `<div class="tu2-in__err">${ph()}${sk(3, 'Error')}<ul>${kinds.map(([, c]) => `<li>${ui(c[2])}</li>`).join('')}</ul></div>`;
    const stub = `<div class="tu2-in__stub">${pv()}<h1 class="tu2-lh">Always a label. Never a guess.</h1><p class="tk-lead">${lead}</p>${err}</div>`;
    return page(ctx, 'inputs', `<div class="tu2-in"><div class="tu2-in__body">${form}${off}</div>${stub}</div>`, 'tu2 tu2--inputs');
  },

  // the rule across the top as the page's event line; under the tear, one stub per control with its five states down it, the state
  // serials in the first column; the segmented control on the last stub
  choices(ctx) {
    const U = ctx.ui, S = sc(ctx), X = S.example, F = S.form;
    const def = [['Off', {}], ['On', { checked: true }], ['Focus', { state: 'focus', checked: true }], ['Disabled', { disabled: true }], ['Disabled, on', { disabled: true, checked: true }]];
    const col = (head, f) => `<div class="tu2-ch__col">${pv()}<h3 class="tk-h3">${head}</h3><ul class="tu2-ch__st">${def.map(([, o], i) => `<li>${ui(f(o, i))}</li>`).join('')}</ul></div>`;
    const names = `<div class="tu2-ch__names"><h3 class="tk-h3" aria-hidden="true">&nbsp;</h3><ul class="tu2-ch__st">${def.map(([n], i) => `<li>${sk(i + 1, n)}</li>`).join('')}</ul></div>`;
    const cols = [
      col('Checkbox', (o, i) => U.check(X.checks[0], { ...o, name: 'tu2-cb' + i })),
      col('Radio', (o, i) => U.check(X.radios[0], { ...o, type: 'radio', name: 'tu2-rd' + i })),
      col('Switch', (o) => U.switch(X.switches[0], o)),
    ].join('');
    const seg = `<div class="tu2-ch__seg">${pv()}<h3 class="tk-h3">Segmented control</h3>
<div class="tu2-ch__sg">${ui(U.segmented(F.sizes, 1))}<p class="tu2-k">One choice, always one</p>${cap(`The selected segment fills with ${m('--text')}.`)}</div>
<div class="tu2-ch__sg">${ui(U.segmented(F.sizes, 0, { disabled: true }))}<p class="tu2-k">Disabled</p>${cap('All segments go grey together.')}</div></div>`;
    const lead = 'A checkbox is a list of yes or no. A radio is one of a few. A switch acts at once. The whole label is the target, 44 px tall, and on reads without colour.';
    const top = `<div class="tu2-ch__top"><h1 class="disp tu2-ch__d">Yes or no. One of few.</h1><p class="tk-lead">${lead}</p></div>`;
    return page(ctx, 'choices', `${top}<div class="tu2-ch">${ph()}${names}${cols}${seg}</div>`, 'tu2 tu2--choices');
  },

  // the card with a photo is the headliner, large on the body; the stub carries the rule at lead size, then the other three as
  // smaller serials, each with what it is for; the two stat cards share one width
  cards(ctx) {
    const S = sc(ctx), U = ctx.ui, d0 = S.deliveries[0];
    const media = ctx.photo('stage', { cls: 'ui-card__media' });
    const lead = 'A card holds one thing: an item, a person, a number. It is a hairline, not a shadow. No card holds another card, and a photo sits on top at 16 : 9.';
    const head = `<div class="tu2-cd__lead">${sk(1, 'With a photo')}${ui(U.card({ media, meta: S.status, title: S.eta, text: S.pickup }), false, 'tu2-cd__big')}${cap('The photo takes 16 : 9. The card keeps its hairline.')}</div>`;
    const small = (n, t, inner, note, tear = '') => `<div class="tu2-cd__s">${tear}${sk(n, t)}${ui(inner)}${cap(note)}</div>`;
    const pair = `<div class="tu2-cd__pair">${small(2, 'Without a photo', U.card({ meta: S.status, title: S.rider, text: S.riderNote }), 'Meta, title, one line.')}${small(3, 'Raised', U.card({ meta: S.deliverToLabel, title: S.deliverTo, text: S.eta, raised: true }), `${m('--raised')} ground and no edge, for a second level.`, pv())}</div>`;
    const stats = `<div class="tu2-cd__sr">${ph()}${small(4, 'Stat', `<div class="tu2-stats">${U.stat(S.paid, S.paidLabel)}${U.stat(d0.price, ctx.ph('ui.screen.content.example.statLabel', 'Each ticket'))}</div>`, 'One number, one label. Both cards take one width.')}</div>`;
    const stub = `<div class="tu2-cd__r">${pv()}<div class="tu2-cd__t"><h1 class="tu2-lh">One thing. One edge.</h1><p class="tk-lead">${lead}</p></div>${pair}${stats}</div>`;
    return page(ctx, 'cards', `<div class="tu2-cd">${head}${stub}</div>`, 'tu2 tu2--cards');
  },

  // the queue at night. The top bar is the headliner, drawn large across the page's full width; under the tear the sidebar, then tabs
  // and breadcrumbs, then the stub: the rule at lead size over the mobile tab bar at a phone's width
  navigation(ctx) {
    const U = ctx.ui, S = sc(ctx), X = S.example, D = ctx.roles.dark;
    const items = [...X.links, [X.account, 'user']];
    const cw = ctx.brand.logo.colourways['on-stage'] ? 'on-stage' : 'mono-light';
    const wm = ctx.logo.html('horizontal', { width: fit(ctx, 'horizontal', 150, 30), colourway: cw, color: D.text });
    const bar = `<nav class="ui-topbar" aria-label="Main">${wm}<div class="ui-topbar__links">${U.links(X.links, 0)}</div></nav>`;
    const tabbar = `<nav class="ui-tabbar" aria-label="Sections">${items.map(([t, i], k) => `<a href="#"${k === 0 ? ' aria-current="page"' : ''}>${U.icon(i, 20)}${A(t)}</a>`).join('')}</nav>`;
    const lead = `Where you are is always marked, and by more than colour: the current page has a 3 px bar in ${nm(ctx, D.action)}. Links are 44 tall. The mobile bar holds four destinations at most.`;
    const g = (n, t, inner, note, cls = '') => `<div class="tu2-nv__g ${cls}">${sk(n, t)}${ui(inner, true)}${cap(note)}</div>`;
    const head = g(1, 'Top bar', bar, 'Wordmark left, links right. Drawn at 1.5&times;.', 'tu2-nv__bar');
    const side = `<div class="tu2-nv__c tu2-nv__c--side">${g(2, 'Sidebar', `<nav class="ui-sidebar" aria-label="Sections">${U.links(items, 0)}</nav>`, 'A bar on the left marks the page. Drawn at 1.5&times;.', 'tu2-nv__z15')}</div>`;
    const mid = `<div class="tu2-nv__c tu2-nv__c--mid">${pv()}${g(3, 'Tabs', U.tabs(X.tabs, 0), 'Same list, other view. Drawn at 1.25&times;.', 'tu2-nv__z125')}<div class="tu2-nv__cr">${ph()}${g(4, 'Breadcrumbs', U.crumbs([...X.crumbs, S.deliverTo]), 'The current page is in full ink. Drawn at 1.25&times;.', 'tu2-nv__z125')}</div></div>`;
    const mob = `<div class="tu2-nv__c tu2-nv__c--mob">${pv()}<div class="tu2-nv__t"><h1 class="tu2-lh">Always say where you are.</h1><p class="tk-lead">${lead}</p></div>
<div class="tu2-nv__cr">${ph()}${g(5, 'Mobile tab bar', tabbar, 'Four destinations, 64 px tall. Drawn at 1.25&times;.', 'tu2-nv__mob tu2-nv__z125')}</div></div>`;
    return page(ctx, 'navigation', `${head}<div class="tu2-nv">${ph()}${side}${mid}${mob}</div>`, `tu2 tu2--navigation ${night}`);
  },

  // still at night. The rule set big over the whole list at actual size, the body you keep; the two smaller forms of a row
  // on the stub beyond the perforation, with the reason for the row's order
  lists(ctx) {
    const U = ctx.ui, S = sc(ctx), d = S.deliveries, ic = (n) => U.icon(n, 18);
    const count = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight'][d.length - 1] || String(d.length);
    // slot: the row's picture is the neutral calendar, since a music note is a gig noun
    const all = `<ul class="ui-list">${d.map((x) => U.row({ lead: ic(ctx.edition === 'slot' ? 'calendar' : 'music'), title: x.to, sub: x.when, end: x.price, chip: U.statusChip(x.status) })).join('')}</ul>`;
    const link = `<ul class="ui-list">${U.row({ lead: ic('ticket'), title: d[1].to, sub: d[1].when, end: d[1].price, href: '#' })}</ul>`;
    const plain = `<ul class="ui-list">${U.row({ title: S.deliverTo, sub: S.from, end: S.paid })}</ul>`;
    const lead = 'One row is one item. Its name comes first, then the line under it, then the value and the status in words. The whole row is the target, and it opens the item.';
    const body = `<div class="tu2-ls__body">${sk(1, `${count} rows, drawn at 1.25×`)}${ui(all, true, 'tu2-ls__all')}</div>`;
    const stub = `<div class="tu2-ls__stub">${pv()}<div class="tu2-ls__t"><h1 class="tu2-lh">One row. One tap.</h1><p class="tk-lead">${lead}</p></div>
<div class="tu2-ls__v">${sk(2, 'As a link')}${ui(link, true)}${cap(`A tap opens the item. The row steps to ${m('--sunken')} on hover.`)}</div>
<div class="tu2-ls__v">${ph()}${sk(3, 'Without an icon or chip')}${ui(plain, true)}${cap('For details, where nothing is chosen.')}</div></div>`;
    return page(ctx, 'lists', `<div class="tu2-ls">${body}${stub}</div>`, `tu2 tu2--lists ${night}`);
  },
};
