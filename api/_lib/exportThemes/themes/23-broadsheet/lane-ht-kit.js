// Theme 23, Broadsheet, lane ht: the UI kit as the paper's web edition (kitSite). Each page is a story with a display ad: the folio bar, the
// page's name as the headline and a deck, then the live components boxed as an ad in a heavy and a hairline rule. The ad is the shipped
// components.css on the product's own surface; it follows the day and night switch (the dark pages print it on the dark set in both). Beside
// the ad, the values in the fourth column; under it, the markup and the tokens it reads, to copy. Copy comes from brand.json (ui.screen.content)
// or is the template's own; every value is read from ctx.
import { colourMap, tokenGroups } from '../../engine/tokens.js';
import { A, head, mono, masthead, folio, pageNo, jumps, foot, also } from './lane-ht-parts.js';

const PART = 'UI kit';
const sc = (ctx) => ctx.brand.ui.screen.content;
const ex = (ctx) => sc(ctx).example || {};
const ROLE_ORDER = ['surface', 'raised', 'sunken', 'text', 'text-soft', 'quiet', 'edge', 'divider', 'action', 'action-hover', 'action-pressed', 'action-label', 'focus'];
const STATES = [['Rest', ''], ['Hover', 'is-hover'], ['Focus', 'is-focus'], ['Pressed', 'is-pressed'], ['Disabled', 'disabled']];

// ---- the pages: { deck, ad, cap, rows, note, code: [name, markup, selector re], dark, flush } ------------------------------------------
function colour(mode) {
  return (ctx) => {
    const M = colourMap(ctx, mode), ui = ctx.ui, S = sc(ctx), keys = ROLE_ORDER.filter((k) => M[k]);
    const sw = (k) => `<li><span class="hx-sw" style="background:var(--${k})"></span><p>--${A(k)}</p><p>${A(M[k].toUpperCase())}</p></li>`;
    const pr = (fg, bg) => [`--${fg} on --${bg}`, `${ctx.fmt(ctx.ratio(M[fg], M[bg]))}:1`];
    return {
      deck: mode === 'dark' ? 'The night set: the same roles, stepped for a dark ground. This ad prints it in either edition.' : 'The day set: every colour role the components read, by its token name.',
      ad: `<div class="hx-stack"><div class="hx-row">${ui.btn(S.form.book)}${ui.alert('info', S.alert)}</div><ul class="hx-sws">${keys.map(sw).join('')}</ul></div>`,
      cap: `${keys.length} roles, live`, dark: mode === 'dark',
      rows: [['text', 'surface'], ['text-soft', 'surface'], ['quiet', 'surface'], ['action-label', 'action'], ['text', 'raised']].filter(([a, b]) => M[a] && M[b]).map(([a, b]) => pr(a, b)),
      rowsHead: 'Contrast', note: 'The components use the names, never the values.',
    };
  };
}
function typeScale(ctx) {
  const T = [...ctx.uiType].sort((a, b) => b.size - a.size), F = ctx.brand.fonts;
  const fam = (f) => (f === 'display' ? `var(--hx-disp);font-stretch:${F.display.stretch || 100}%` : f === 'mono' ? `'${F.mono.family}',monospace` : 'var(--hx-body)');
  const wOf = (t) => { const f = F[t.face] || F.body; return f.weights.reduce((b, w) => (Math.abs(w - t.weight) < Math.abs(b - t.weight) ? w : b)); };
  return {
    deck: `${T.length} steps, each set at its own size, line and weight. Use the token, never a size.`,
    ad: `<ol class="hx-type">${T.map((t) => `<li><span>${t.size}</span><p style="font-family:${fam(t.face)};font-size:${t.size}px;line-height:${t.line}px;font-weight:${wOf(t)}">${A(t.use)}</p></li>`).join('')}</ol>`,
    cap: 'The type scale, live', rows: T.map((t) => [`--fs-${t.token}`, `${t.size} / ${t.line} px`]),
  };
}
function spacing(ctx) {
  const S = ctx.space, max = Math.max(...S.map((s) => s.px));
  return {
    deck: `Every gap is a step on a ${ctx.brand.ui.spacingBase} px base.`,
    ad: `<ol class="hx-space">${S.map((s) => `<li><span>${s.px}</span><i style="width:${((s.px / max) * 100).toFixed(2)}%"></i></li>`).join('')}</ol>`,
    cap: `${S.length} steps`, rows: S.map((s) => [`--${s.token}`, `${s.px} px`]),
  };
}
function radiiBorders(ctx) {
  const rd = ctx.radius, bw = ctx.brand.ui.border;
  const items = [['control', rd.control], ['button', rd.button], ['input', rd.input], ['chip', rd.chip], ['card', rd.card]].filter(([, v]) => v != null);
  return {
    deck: `${items.length} corner radii and one edge width, ${bw} px.`,
    ad: `<ul class="hx-radii">${items.map(([k, v]) => `<li><span class="hx-rbox" style="border-radius:${v}px;border-width:${bw}px"></span>${A(ctx.cap(k))} ${v} px</li>`).join('')}</ul>`,
    cap: 'Radii and edges', rows: [...items.map(([k, v]) => [`--r-${k}`, `${v} px`]), ['Edge', `${bw} px`]],
  };
}
function elevation(ctx) {
  const S = sc(ctx), ui = ctx.ui;
  return {
    deck: ctx.brand.ui.elevationNote || 'Surfaces step in value; a floating piece gets an edge.',
    ad: `<div class="hx-elev"><div class="hx-elev__s" style="background:var(--sunken)">Sunken</div><div class="hx-elev__s" style="background:var(--surface)">Surface</div>${ui.card({ meta: S.status, title: S.rider, text: S.riderNote, raised: true })}</div><div class="hx-row" style="margin-top:24px">${ui.toast(S.toast)}</div>`,
    cap: 'Three surfaces and a floating toast', rows: [['Shadows', ctx.brand.ui.shadows === 'none' ? 'none' : String(ctx.brand.ui.shadows)]],
  };
}
function states(ctx) {
  const S = sc(ctx), ui = ctx.ui;
  const btn = (c) => (c === 'disabled' ? ui.btn(S.form.book, { disabled: true }) : ui.btn(S.form.book, { state: c ? c.replace('is-', '') : undefined }));
  return {
    deck: 'Every control has five states. Each one here is the shipped CSS, forced by its class.',
    ad: `<ol class="hx-states">${STATES.map(([t, c]) => `<li>${t}${btn(c)}</li>`).join('')}</ol>`,
    cap: 'One button in each state', rows: STATES.map(([t, c]) => [t, c ? (c === 'disabled' ? '[disabled]' : '.' + c) : 'at rest']),
    code: ['Button', ui.btn(S.form.book), /^\.ui-btn(?![-\w])/],
  };
}
function buttons(ctx) {
  const S = sc(ctx), X = ex(ctx), ui = ctx.ui;
  const set = [ui.btn(S.form.book), ui.btn(X.secondary || S.call, { variant: 'secondary' }), ui.btn(X.quiet || S.call, { variant: 'quiet' }), ui.btn(X.danger || S.call, { variant: 'danger' })];
  return {
    deck: 'One primary button a screen. Secondary for the other way on, quiet for the way out, danger only for what cannot be undone.',
    ad: `<div class="hx-stack"><p class="hx-big">${A(S.eta)}</p><div class="hx-row">${set.join('')}</div><div class="hx-row">${ui.btn(X.small || S.share, { size: 'sm', variant: 'secondary' })}${ui.btn(S.form.book, { iconRight: 'arrow-right' })}${ui.btn(S.form.book, { disabled: true })}</div></div>`,
    cap: 'Four kinds, a small size, an icon and disabled', rows: [['Primary', '.ui-btn'], ['Secondary', '.ui-btn--secondary'], ['Quiet', '.ui-btn--quiet'], ['Danger', '.ui-btn--danger'], ['Small', '.ui-btn--sm']],
    code: ['Buttons', set.join('\n'), /^\.ui-btn/],
  };
}
function inputs(ctx) {
  const F = sc(ctx).form, ui = ctx.ui;
  const f = [ui.field({ id: 'hx-f1', label: F.pickup, value: F.pickupValue }), ui.field({ id: 'hx-f2', label: F.dropoff, value: F.dropoffValue, help: F.notesHelp }),
    ui.field({ id: 'hx-f3', label: F.ready, value: F.readyValue, error: F.readyError }), ui.field({ id: 'hx-f4', label: F.size, kind: 'select', options: F.sizes, value: F.sizes[1] }),
    ui.field({ id: 'hx-f5', label: F.notes, kind: 'textarea', value: '' }), ui.field({ id: 'hx-f6', label: F.pickup, value: F.pickupValue, disabled: true })];
  return {
    deck: 'A label above every field, always. Help and errors sit under the field and are joined to it.',
    ad: `<div class="hx-two">${f.join('')}</div>`, cap: 'Fields at rest, with help, with an error, a select, a text area and disabled',
    rows: [['Label', '.ui-label'], ['Input', '.ui-input'], ['Help', '.ui-help'], ['Error', '.ui-error']], note: 'The error says what went wrong and what to do.',
    code: ['Field', f[2], /^\.ui-(field|label|input|error|help)/],
  };
}
function choices(ctx) {
  const X = ex(ctx), ui = ctx.ui, ch = X.checks || [], sw = X.switches || [], rd = X.radios || [];
  return {
    deck: 'Checkboxes for many, radios for one, a switch for a setting that takes effect at once.',
    ad: `<div class="hx-three"><fieldset class="hx-fs"><legend>Checkboxes</legend>${ch.map((t, i) => ui.check(t, { checked: i === 0, disabled: i === 2 })).join('')}</fieldset>
<fieldset class="hx-fs"><legend>Radios</legend>${rd.map((t, i) => ui.check(t, { type: 'radio', name: 'hx-r', checked: i === 0 })).join('')}</fieldset>
<fieldset class="hx-fs"><legend>Switches</legend>${sw.map((t, i) => ui.switch(t, { checked: i === 0 })).join('')}</fieldset></div><div style="margin-top:32px">${ui.segmented(X.tabs || rd, 0)}</div>`,
    cap: 'Choices, live: press them', rows: [['Checkbox', '.ui-choice'], ['Switch', '.ui-switch'], ['Segmented', '.ui-segmented']],
    code: ['Checkbox', ui.check(ch[0] || rd[0] || 'Option', { checked: true }), /^\.ui-choice/],
  };
}
function cards(ctx) {
  const S = sc(ctx), X = ex(ctx), ui = ctx.ui, d = S.deliveries;
  const set = [ui.card({ meta: d[0].when, title: d[0].to, text: S.pickup, action: ui.btn(S.form.book, { size: 'sm' }) }), ui.card({ meta: d[1].when, title: d[1].to, text: S.riderNote, raised: true })];
  return {
    deck: 'A card holds one item. The raised card is the one that needs looking at now.',
    ad: `<div class="hx-three">${set.join('')}${ui.stat(S.paid, X.statLabel || S.paidLabel)}</div>`, cap: 'A card, a raised card and a figure',
    rows: [['Card', '.ui-card'], ['Raised', '.ui-card--raised'], ['Figure', '.ui-stat']], code: ['Card', set[0], /^\.ui-card/],
  };
}
function navigation(ctx) {
  const X = ex(ctx), ui = ctx.ui, tabs = ui.tabs(X.tabs || [], 0);
  return {
    deck: 'Tabs switch a view, links move between screens, the breadcrumb says where you are.',
    ad: `<div class="hx-stack">${tabs}${ui.crumbs(X.crumbs || [])}<nav class="hx-row" aria-label="Example links">${ui.links(X.links || [], 0)}</nav></div>`,
    cap: 'Tabs, a breadcrumb and links', rows: [['Tabs', '.ui-tabs'], ['Breadcrumb', '.ui-crumbs'], ['Link', '.ui-link']], code: ['Tabs', tabs, /^\.ui-tabs/],
  };
}
function lists(ctx) {
  const ui = ctx.ui, S = sc(ctx);
  return {
    deck: 'A row: what and when on the left, the price and the status on the right.',
    ad: ui.deliveryRows(5), cap: `${Math.min(5, S.deliveries.length)} rows from the product`, rows: [['List', '.ui-list'], ['Row', '.ui-row']], code: ['List', ui.deliveryRows(1), /^\.ui-(list|row)/],
  };
}
function status(ctx) {
  const ui = ctx.ui;
  return {
    deck: 'Status is a word, printed in its colour. Never a colour alone.',
    ad: `<ul class="hx-row">${ctx.status.map((s) => `<li>${ui.statusChip(s.id)}</li>`).join('')}</ul>`, cap: `${ctx.status.length} statuses`,
    rows: ctx.status.map((s) => [s.label, s.tone]), code: ['Status', ui.statusChip(ctx.status[0].id), /^\.ui-chip/],
  };
}
function feedback(ctx) {
  const S = sc(ctx), ui = ctx.ui;
  return {
    deck: 'An alert stays until the problem is gone. A toast confirms and leaves. Loading shows the shape of what is coming.',
    ad: `<div class="hx-stack">${ui.alert('warning', S.alert)}${ui.alert('success', S.toast)}<p class="ui-inline-msg">${A(S.inline)}</p>${ui.toast(S.toast)}<div class="hx-row">${ui.spinner()}${ui.skeleton('240px')}</div></div>`,
    cap: 'Alerts, an inline message, a toast and loading', rows: [['Alert', '.ui-alert'], ['Toast', '.ui-toast'], ['Spinner', '.ui-spinner'], ['Skeleton', '.ui-skeleton']],
    code: ['Alert', ui.alert('warning', S.alert), /^\.ui-alert/],
  };
}
function dialog(ctx) {
  const D = sc(ctx).dialog, ui = ctx.ui, dlg = ui.dialog(D).replace(/dlg-t/g, 'hx-dlg-t');
  return {
    deck: 'A dialog asks one thing. The title asks it and the two buttons answer it.', flush: true,
    ad: `<div class="ui-scrim">${dlg}</div>`, cap: 'A dialog on its scrim', rows: [['Scrim', '.ui-scrim'], ['Dialog', '.ui-dialog']],
    note: 'Escape and a press on the scrim choose the safe answer.', code: ['Dialog', dlg, /^\.ui-(dialog|scrim)/],
  };
}
function table(ctx) {
  const S = sc(ctx), ui = ctx.ui, heads = ['Booking', 'Details', 'Status', S.paidLabel];
  const t = `<div class="hx-tw"><table class="ui-table"><thead><tr>${heads.map((x, i) => `<th scope="col"${i === 3 ? ' class="is-num"' : i === 1 ? ' class="hx-wide"' : ''}>${A(x)}</th>`).join('')}</tr></thead><tbody>${S.deliveries.map((d, i) => `<tr${i === 0 ? ' aria-selected="true"' : ''}><td>${A(d.to)}</td><td class="hx-wide">${A(d.when)}</td><td>${ui.statusChip(d.status)}</td><td class="is-num">${A(d.price)}</td></tr>`).join('')}</tbody></table></div>`;
  return {
    deck: 'Numbers right-aligned, statuses as words, the chosen row marked.', ad: t, cap: `${S.deliveries.length} rows`, rows: [['Table', '.ui-table'], ['Number cell', '.is-num']],
    note: 'At phone width the details column steps out; the booking, its status and the price stay.',
    code: ['Table', t.replace(/<tbody>[\s\S]*<\/tbody>/, '<tbody></tbody>'), /^\.ui-table/],
  };
}
function empty(ctx) {
  const E = sc(ctx).empty, ui = ctx.ui;
  const e = `<div class="ui-empty"><h3 class="ui-empty__title">${A(E.title)}</h3><p class="ui-empty__text">${A(E.body)}</p>${ui.btn(E.cta)}</div>`;
  return { deck: 'An empty screen says what will be here and gives the one way to fill it.', ad: e, cap: 'The empty list', rows: [['Empty', '.ui-empty']], code: ['Empty state', e, /^\.ui-empty/] };
}
function screenOf(ctx, { phone = false } = {}) {
  const S = sc(ctx), ui = ctx.ui, X = ex(ctx);
  return `<div class="hx-scr"><div class="hx-scr__top"><span class="ui-num">${A(S.time)}</span>${ui.statusChip(S.deliveries[0].status)}</div>
<p class="hx-big">${A(S.eta)}</p><p class="hx-p">${A(S.pickup)}</p>
<div class="ui-progress"><div class="ui-progress__bar"><i style="width:${S.progress * 100}%"></i></div><span class="ui-progress__dot" style="left:${S.progress * 100}%"></span></div>
<div class="hx-scr__ft"><span>${A(S.from)}</span><span>${A(S.to)}</span></div>
<ul class="ui-list">${ui.row({ lead: `<span class="ui-avatar">${A(S.initials)}</span>`, title: S.rider, sub: S.riderNote, endHtml: ui.btn(S.call, { variant: 'secondary', size: 'sm' }) })}</ul>
${ui.btn(S.share, { variant: 'secondary', block: true })}${phone && X.links ? `<nav class="ui-tabbar" aria-label="Example tab bar">${ui.links(X.links, 0, 'page')}</nav>` : ''}</div>`;
}
function screen(kind) {
  return (ctx) => {
    const B = ctx.brand;
    const ad = kind === 'mobile' ? `<div style="padding:32px 16px">${`<div class="hx-phone">${screenOf(ctx, { phone: true })}</div>`}</div>` : `<div class="hx-desk"><div>${screenOf(ctx)}</div><div class="hx-desk__r"><p>${A(B.ui.screen.title)}</p>${ctx.ui.deliveryRows(4)}</div></div>`;
    return {
      deck: kind === 'dark' ? 'The same screen on the night set. Nothing moves; only the tokens change.' : kind === 'mobile' ? 'The screen at phone width: one column, the tab bar at the foot.' : `${B.ui.screen.title}: the screen the product opens on, built only from the kit.`,
      ad, flush: true, dark: kind === 'dark', cap: `The product screen, ${kind}`,
    };
  };
}
function tokensPage(ctx) {
  const L = colourMap(ctx, 'light'), D = colourMap(ctx, 'dark'), G = tokenGroups(ctx);
  const others = Object.values(G).reduce((n, o) => n + Object.keys(o).length, 0);
  return {
    deck: `${Object.keys(L).length} colour tokens and ${others} others. Press a name to copy it.`,
    ad: `<ul class="hx-sws">${ROLE_ORDER.filter((k) => L[k]).map((k) => `<li><span class="hx-sw" style="background:var(--${k})"></span><p>--${A(k)}</p><p>${A(L[k].toUpperCase())}</p></li>`).join('')}</ul>`,
    cap: 'The colour roles, live', extra: tokenTables(ctx, L, D, G),
  };
}
function tokenTables(ctx, L, D, G) {
  const cv = (k) => `<button type="button" class="hx-tok" data-copy="var(--${A(k)})" data-copy-name="--${A(k)}"><span data-copy-text>--${A(k)}</span></button>`;
  const rowsC = Object.keys(L).map((k) => `<li><p>${cv(k)}</p><p class="hx-tv"><i class="hx-dot" style="background:${L[k]}"></i>${A(L[k].toUpperCase())}</p><p class="hx-tv"><i class="hx-dot" style="background:${D[k]}"></i>${A(D[k].toUpperCase())}</p></li>`).join('');
  const grp = (name, o) => `<li><h3 class="hx-lab">${A(ctx.cap(name))}</h3><ul class="hx-tl hx-tl--2">${Object.entries(o).map(([k, v]) => `<li><p>${cv(k)}</p><p class="hx-tv">${A(v)}</p></li>`).join('')}</ul></li>`;
  return `<section class="hx-code" aria-labelledby="hx-tk-c"><div class="hx-code__h"><h2 id="hx-tk-c">Colour, day and night</h2></div><ul class="hx-tl"><li class="hx-tl__h"><p>Token</p><p>Day</p><p>Night</p></li>${rowsC}</ul></section>
<ul class="hx-grps">${Object.entries(G).map(([k, o]) => grp(k, o)).join('')}</ul>`;
}
function codePage(ctx) {
  const S = sc(ctx), ui = ctx.ui;
  const snippet = `<link rel="stylesheet" href="tokens.css">\n<link rel="stylesheet" href="components.css">\n\n<div class="ui">\n  ${ui.btn(S.form.book)}\n</div>`;
  return {
    deck: 'Two stylesheets and a wrapper. Everything in this kit is in them.',
    ad: `<div class="hx-stack">${ui.btn(S.form.book)}<p class="hx-p">This button is the package&rsquo;s own CSS, as shipped.</p></div>`, cap: 'The package, live',
    rows: [['tokens.css', 'every token'], ['components.css', 'every component']], note: 'Day is on the root; night is on data-theme="dark". Components are scoped under .ui.',
    snippet,
  };
}
function cover(ctx, K) {
  const S = sc(ctx), X = ex(ctx), ui = ctx.ui;
  return {
    ad: `<div class="hx-two"><div class="hx-stack"><p class="hx-big">${A(S.eta)}</p><p class="hx-p">${A(S.pickup)}</p><div class="hx-row">${ui.btn(S.form.book)}${ui.btn(X.secondary || S.call, { variant: 'secondary' })}</div></div>${ui.deliveryRows(3)}</div>`,
    cap: 'The product, live',
  };
}

const PAGES = {
  'colour-light': colour('light'), 'colour-dark': colour('dark'), 'type-scale': typeScale, spacing, 'radii-borders': radiiBorders, elevation, states,
  buttons, inputs, choices, cards, navigation, lists, status, feedback, dialog, table, empty,
  'screen-light': screen('light'), 'screen-dark': screen('dark'), 'screen-mobile': screen('mobile'), tokens: tokensPage, code: codePage,
};

// ---- the layout ------------------------------------------------------------------------------------------------------------------------
const adBox = (ctx, P, label) => `<div class="hx-ad${P.flush ? ' hx-ad--flush' : ''}"><div class="hx-ad__in ui"${P.dark ? ' data-theme="dark"' : ''} role="group" aria-label="${A(label)}">${P.ad}</div></div><p class="hx-adcap"><span>${A(P.cap || label)}</span><span>components.css, as shipped</span></p>`;
const vals = (P) => (P.rows && P.rows.length ? `<h2 class="hx-lab">${A(P.rowsHead || 'Values')}</h2><ul class="hx-vals">${P.rows.map(([k, v]) => `<li><span>${A(k)}</span><span class="hx-m">${A(v)}</span></li>`).join('')}</ul>` : '') + (P.note ? `<p class="hx-note">${A(P.note)}</p>` : '');
const block = (title, text, what, id) => `<div><div class="hx-code__h"><h2 id="${id}">${A(title)}</h2><button type="button" class="hx-copy" data-copy="${A(text)}" data-copy-name="${A(what)}"><span data-copy-text>Copy</span></button></div><pre><code>${A(text)}</code></pre></div>`;
function codeOf(K, P) {
  if (P.snippet) return `<section class="hx-code" aria-label="Start here">${block('Start here', P.snippet, 'starter markup', 'hx-c1')}</section>`;
  if (!P.code) return '';
  const [name, markup, re] = P.code, used = K.tokensUsed(re);
  return `<section class="hx-code hx-code__two" aria-label="The code">${block(`${name}: markup`, K.prettyHtml(markup), `${name} markup`, 'hx-c1')}${used.names.length ? block('Tokens it reads', used.css, `${name} tokens`, 'hx-c2') : ''}</section>`;
}
const tocOf = (K) => `<section class="hx-toc" aria-labelledby="hx-toc-h"><div class="hx-folio"><p class="hx-folio__no"></p><h2 class="hx-folio__t" id="hx-toc-h">Contents</h2><p class="hx-folio__pg">${K.pages.filter((p) => p.section).length} pages</p></div><i class="hx-rule" aria-hidden="true"></i>
<ol class="hx-toc__cols">${K.sections.map((s) => `<li class="hx-toc__s"><h3 class="hx-toc__h"><span class="hx-n">${s.n}</span><span>${A(s.title)}</span></h3><ol>${s.pages.map((q) => `<li><a href="${K.href(q.id)}"><span class="hx-n">${A(q.ref)}</span><span>${A(q.title)}</span></a></li>`).join('')}</ol></li>`).join('')}</ol></section>`;

function render(ctx, K) {
  const p = K.page, B = ctx.brand;
  if (p.id === 'cover' || p.id === 'contents') {
    const P = cover(ctx, K), title = p.id === 'cover' ? `${B.name} UI kit` : p.title;
    const deck = p.id === 'cover' ? 'The components the product ships, live in day and night, with the markup to copy.' : `${K.sections.length} sections, ${K.pages.filter((q) => q.section).length} pages.`;
    return `<div class="hx-g hx-lead"><div class="hx-c14 hx-fit">${head(ctx, 'h1', title, { cls: 'hx-h1 hx-h1--xl', fs: 120 })}<p class="hx-deck">${A(deck)}</p></div></div>
${p.id === 'cover' ? `<div class="hx-kit">${adBox(ctx, P, 'The product, live')}</div>` : ''}${tocOf(K)}`;
  }
  const P = PAGES[p.id](ctx, K), sec = K.sections.find((s) => s.n === p.section.n);
  const others = sec.pages.map((q) => ({ href: K.href(q.id), ref: q.ref, title: q.title, current: q.id === p.id }));
  const side = vals(P);
  return `${folio(ctx, { no: `${p.section.n}`, title: p.section.title, page: `${p.ref}, page ${pageNo(ctx, p.id)}` })}
<div class="hx-g hx-hd"><div class="hx-c13 hx-fit">${head(ctx, 'h1', p.title, { fs: 88 })}<p class="hx-deck">${A(P.deck)}</p></div>
<aside class="hx-c4 hx-r" aria-label="In this section"><h2 class="hx-lab">In this section</h2>${also(others)}</aside></div>
<div class="hx-g hx-kit"><div class="${side ? 'hx-c13' : 'hx-c14'}">${adBox(ctx, P, p.title)}</div>${side ? `<aside class="hx-c4 hx-r" aria-label="Values">${side}</aside>` : ''}</div>
${codeOf(K, P)}${P.extra || ''}`;
}

function shell(ctx, K, body) {
  const p = K.page, cur = p.section && K.sections.find((s) => s.n === p.section.n);
  const secs = K.sections.map((s) => ({ n: s.n, title: s.title, href: K.href(s.pages[0].id), current: cur && s.n === cur.n }));
  const lk = (x) => x && { href: K.href(x.id), title: x.id === 'cover' ? 'the front page' : `${x.ref ? x.ref + ' ' : ''}${x.title}` };
  return `<a class="hx-skip" href="#hx-main">Skip to the page</a>
<div class="hx sx" data-page="${p.id}">
${masthead(ctx, { part: PART, secs, toggle: 'data-disclosure', front: p.id === 'cover', current: cur ? `${cur.n} ${cur.title}` : 'Front page' })}
<main class="hx-main hx-wrap" id="hx-main" tabindex="-1"><article class="sx-art hx-art">${body}</article>
${jumps(lk(K.prev), lk(K.next))}
${foot(ctx, PART)}</main>
</div>`;
}

export const kitSite = { shell, pages: {}, fallback: render };
