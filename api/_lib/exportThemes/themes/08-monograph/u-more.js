// UI kit pages: status, feedback, dialog, table, empty. Styles are in css-u-more.js (classes start ru3-).
// The page is Wall. Every figure is a printed sheet of the paper with a registration cross at each corner, and under it the job line:
// the drums the figure prints in, in drum order, then the paper. Where a figure holds a component with an edge of its own (a dialog, a
// field, a toast) the sheet drops its hairline and the crosses are the only edge. Composites only. The components are the engine's own
// (ctx.ui) inside a .ui region, so they read the real roles; a dark figure is the dark ground itself, with its crosses in the paper.
// The slot edition is any brand's: words that only fit the sample brand are placeholders or neutral words (see ed()).
import { A } from './helpers.js';
import { corners, drums, drumNo, paper, isSurface, Word } from './guidelines-r.js';
import { colourMap, statusText } from '../../engine/tokens.js';

const m = (s) => `<span class="r-mono">${A(s)}</span>`;
const rt = (ctx, a, b) => (a && b ? `${ctx.fmt(ctx.ratio(a, b))} : 1` : '');
const sc = (ctx) => ctx.brand.ui.screen.content;
const uniq = (html, tag) => html.replace(/dlg-t/g, tag);
const roleOf = (ctx, role) => ctx.colours.find((c) => c.role === role);
// the palette name for a hex, else the hex itself
const nm = (ctx, hex) => { const c = ctx.colours.find((x) => x.hex.toLowerCase() === String(hex).toLowerCase()); return c ? c.name : hex; };
// the sample brand's words in the showcase, words true for any brand in the slot edition
const ed = (ctx, show, slot) => (ctx.edition === 'slot' ? slot : show);
// a status chip: its label is the brand's own (a placeholder, Status 1 to n, in the slot edition)
const chip = (ctx, id) => { const i = ctx.status.findIndex((s) => s.id === id); return ctx.ui.statusChip(id, { label: ctx.brand.ui.status[i].label }); };

// the page: the gate's running head (named for the UI kit), the title and its lead, then the body
function kpage(ctx, id, lead, body, cls = '') {
  const p = ctx.pages.find((x) => x.id === id);
  const head = `<div class="r-hd"><span>${A(ctx.brand.name)}, UI kit</span><span class="num">${ctx.pageNo(id)}</span></div>`;
  return `<section class="pg r-pg ru3-pg ${cls}" data-page="${id}">${head}<div class="r-top"><h1 class="r-h1">${A(p.title)}</h1>${lead ? `<p class="r-lead">${lead}</p>` : ''}</div><div class="ru3-body">${body}</div></section>`;
}

// the job line, one form for the whole book (review D1): one line under the figure, flush with the sheet's left edge, never inside it,
// at most two lines. Each drum the sheet prints, in drum order: an 8 px swatch, `Drum n Name`, then what it prints. Whatever is in
// the paper's colour is the paper showing through and closes the line; a tone that is no drum is named as it is. `photo` adds the
// photograph sentence: pass it on photo-direction only, where it is printed once for the book.
// Other lanes copy this function as it stands (with drums, drumNo, paper, isSurface from guidelines-r.js and A from helpers.js) and
// its four css lines (.ri-job, .ri-jd, .ri-sw, .ri-jn), renamed to their own prefix.
function job(ctx, uses, photo = false) {
  const D = drums(ctx), p = paper(ctx), by = new Map(), through = [], other = [];
  const hex_ = (h) => String(h).toLowerCase();
  for (const [hex, what] of uses) {
    const c = D.find((d) => hex_(d.hex) === hex_(hex));
    const t = ctx.colours.find((x) => hex_(x.hex) === hex_(hex)) || ctx.tones.find((x) => hex_(x.hex) === hex_(hex));
    if (c) { if (!by.has(c)) by.set(c, []); if (!by.get(c).includes(what)) by.get(c).push(what); } else if (isSurface(ctx, hex) || hex_(hex) === hex_(p.hex)) { if (!through.includes(what)) through.push(what); } else other.push([t ? t.name : '', what]);
  }
  const parts = D.filter((c) => by.has(c)).map((c) => `<span class="ru3-jd"><i class="ru3-sw" style="background:${c.hex}"></i>Drum ${drumNo(ctx, c)} ${A(c.name)}: ${by.get(c).join(', ')}.</span>`);
  const rest = other.map(([nm_, what]) => `<span class="ru3-jd">${A(nm_)}: ${what}.</span>`);
  const show = through.length ? [`<span class="ru3-jd">Paper ${A(p.name)}: ${through.join(', ')}.</span>`] : [];
  const ph = photo ? [`<span class="ru3-jn">The photograph keeps its own colour: no drum prints over it.</span>`] : [];
  return `<p class="ru3-job">${[...parts, ...rest, ...show, ...ph].join(' ')}</p>`;
}
// the job line for a figure from its roles: [token, what it prints]. A role whose value is no brand colour (a screen tint, the scrim)
// is left out: the line names real inks only. jlm is a page's one legend: groups of [mode, pairs] in a single call, so a page that
// prints in both grounds still gets one line.
const roleUses = (ctx, mode, pairs) => {
  const M = colourMap(ctx, mode), known = [...ctx.colours, ...ctx.tones].map((c) => c.hex.toLowerCase());
  return pairs.filter(([t]) => M[t] && known.includes(String(M[t]).toLowerCase())).map(([t, what]) => [M[t], what]);
};
const jlm = (ctx, groups) => job(ctx, groups.flatMap(([mode, pairs]) => roleUses(ctx, mode, pairs)));
const jl = (ctx, mode, pairs) => jlm(ctx, [[mode, pairs]]);

// a printed sheet: the paper with its crosses, and the print area as a .ui region. bare: no hairline (the component's own edge is the
// only box); dark: the sheet is the dark ground, its crosses in the paper
const sheet = (ctx, inner, { dark = false, bare = false, cls = '' } = {}) => `<div class="r-sheet ru3-sh${dark ? ' ru3-sh--ink' : bare ? ' ru3-sh--bare' : ''} ${cls}">${corners(dark ? ctx.roles.dark.text : ctx.roles.light.text, 13)}<div class="ru3-pr ui"${dark ? ' data-theme="dark"' : ''}>${inner}</div></div>`;
// a caption: the figure's title, its note, then the facts as run-in notes (dialog and table only; elsewhere one() is a single plain paragraph)
const facts = (rows) => rows.map(([t, d]) => `<p class="ru3-f"><b>${A(t)}.</b> ${d}</p>`).join('');
const cap = (title, note, rows = []) => `<h2 class="ru3-ct">${A(title)}</h2>${note ? `<p class="ru3-cn">${note}</p>` : ''}${facts(rows)}`;
const fig = (sh, jlHtml, capHtml, cls = '') => `<figure class="ru3-fig ${cls}">${sh}${jlHtml}${capHtml ? `<figcaption class="ru3-cap">${capHtml}</figcaption>` : ''}</figure>`;
// a caption of one plain paragraph under its title (no run-ins)
const one = (title, text) => `<h2 class="ru3-ct">${A(title)}</h2><p class="ru3-f">${text}</p>`;
// the product's top bar over a slice of its list, for a dialog to sit on
const slice = (ctx, rows, narrow = false) => {
  const S = sc(ctx), ui = ctx.ui, X = S.example, T = ctx.brand.ui.screen.title;
  const links = (X.links || []).map(([t]) => [t, null]);
  const list = S.deliveries.slice(0, rows).map((d) => ui.row({ title: d.to, sub: d.when, end: d.price, chip: chip(ctx, d.status) })).join('');
  return `<div class="ru3-sl" data-allow-overlap><nav class="ui-topbar" aria-label="Main"><strong class="ui-display">${A(ctx.brand.logo.showcase.wordmark)}</strong>${narrow ? '' : `<div class="ui-topbar__links">${ui.links(links, 0)}</div>`}</nav><div class="ru3-sl__b"><h3 class="ui-display ru3-sl__t">${A(T)}</h3><ul class="ui-list">${list}</ul></div></div>`;
};
// a banner with its own icon and the engine's one edge in the tone colour, so the four tones differ without colour: info an i, success
// a tick, warning a triangle, danger a stop sign
const ICON = { info: 'info', success: 'check', warning: 'triangle-alert', danger: 'octagon-x' };
const banner = (ctx, tone, inner) => `<div class="ui-alert ui-alert--${tone} ru3-al ru3-al--${tone}" role="${tone === 'danger' ? 'alert' : 'status'}">${ctx.ui.icon(ICON[tone], 20)}<span>${inner}</span></div>`;

export const uMore = {
  // the third printed moment: one full-width Ink sheet, the four statuses on the dark ground each set as the key to its sentence (dark
  // ratios), with the badge on it as the last key; then a small row of the same chips on Wall with their ratios. Crosses only.
  status(ctx) {
    const ui = ctx.ui, Ml = colourMap(ctx, 'light'), Md = colourMap(ctx, 'dark'), act = roleOf(ctx, 'action'), S = sc(ctx), n = ctx.status.length, w = Word(n), wall = A(paper(ctx).name);
    const use = { booked: 'The visitor holds a free entry time.', 'open-late': 'A Thursday late is on, open until 9 pm.', 'few-places': 'Places are running out for that time.', cancelled: 'The session will not run. The entry is released.' };
    // the slot edition reads each state from its tone, in words true for any product
    const toneMeans = { action: 'Asks for a step, or marks the state that matters most.', neutral: 'Nothing needs doing, so the words stay neutral.', success: 'Done. Nothing more is needed.', info: 'Under way. Say what happens next, and when.', warning: 'Running out, delayed or changed. Say when it clears.', danger: 'Not available, or it failed. Say so plainly and offer the next step.' };
    const means = (s) => (ctx.edition !== 'slot' && use[s.id]) || toneMeans[s.tone] || '';
    // a status is words in one colour: statusText gives the colour its words print in, and its token
    const words_ = (mode) => ctx.status.map((s) => statusText(ctx, mode, s));
    const tokens = [...new Set(words_('light').map((x) => x.token))];
    // the page's words, one plain paragraph
    const words = [
      'A status is words in one colour. Colour helps, it never carries the meaning alone.',
      ed(ctx, `The brand has ${w.toLowerCase()} states a visit can be in. They are all the statuses there are.`, `The brand sets ${w.toLowerCase()} states for its product. They are all the statuses there are.`),
      `Each reads a status role: ${tokens.map((t) => m(t)).join(', ')}. The ratio is the words on the ground, measured on each ground.`,
      'One line, no fill, no box.',
      `Nothing outside these ${w.toLowerCase()} is a status. ${A(act.name)} stays on the button.`,
    ].join(' ');
    const ratio = (M, a, b) => `<p class="ru3-st__r"><b class="num">${rt(ctx, M[a], M[b])}</b> ${m('--' + a)} on ${m('--' + b)}</p>`;
    const sratio = (mode, s) => { const t = statusText(ctx, mode, s); return `<p class="ru3-st__r"><b class="num">${rt(ctx, t.hex, ctx.roles[mode].surface)}</b> ${m(t.token)} on ${m('--surface')}</p>`; };
    const keys = ctx.status.map((s) => `<div class="ru3-st"><div class="ru3-st__c">${chip(ctx, s.id)}</div><div><p class="ru3-st__u">${A(means(s))}</p>${sratio('dark', s)}</div></div>`).join('');
    const live = S.deliveries.filter((d) => d.status !== 'cancelled').length;
    const badge = `<div class="ru3-st"><div class="ru3-st__c"><span class="ru3-badge">${A(ed(ctx, 'Your visits', 'Open items'))}<span class="ui-badge">${live}</span></span></div><div><p class="ru3-st__u">A count is a badge, never a status.</p>${ratio(Md, 'action-label', 'action')}</div></div>`;
    const lite = `<div class="ru3-lr">${ctx.status.map((s) => `<div>${chip(ctx, s.id)}${sratio('light', s)}</div>`).join('')}</div>`;
    // the page's one legend, under the Ink sheet: both grounds in one call. The status words print in the colour statusText gives them.
    const known = [...ctx.colours, ...ctx.tones].map((c) => c.hex.toLowerCase());
    const sw = (mode) => words_(mode).filter((x) => known.includes(String(x.hex).toLowerCase())).map((x) => [x.hex, 'status words']);
    const legend = job(ctx, [...roleUses(ctx, 'dark', [['surface', 'the ground'], ['text', 'the words']]), ...sw('dark'), ...roleUses(ctx, 'dark', [['action', 'the count'], ['action-label', 'its numeral']]), ...roleUses(ctx, 'light', [['text', 'the words']]), ...sw('light')]);
    const big = fig(sheet(ctx, `<div class="ru3-sts">${keys}${badge}</div>`, { dark: true }), legend, one('Brand statuses', words));
    const lo = fig(sheet(ctx, lite, { bare: true, cls: 'ru3-sh--lr' }), '', cap('On ' + paper(ctx).name, `The same statuses on ${wall}, with the ratios for the light ground.`));
    return kpage(ctx, 'status', ed(ctx, `${w} statuses, one for each state a visit can be in, and a badge for a count.`, `${w} statuses, one for each state the product can be in, and a badge for a count.`), `${big}${lo}`, 'ru3-pg--status');
  },

  // bands down the page: the four banners with their caption beside them, then the toast and the wait side by side, then the field
  // with its help and with its error, caption beside
  feedback(ctx) {
    const S = sc(ctx), ui = ctx.ui, F = S.form;
    const al = `<div class="ru3-alerts">${banner(ctx, 'info', A(S.inline))}${banner(ctx, 'success', A(S.toast))}${banner(ctx, 'warning', A(S.alert))}${banner(ctx, 'danger', A(F.readyError))}</div>`;
    const toast = `<div class="ru3-foot">${ui.toast(S.toast)}</div>`;
    const inl = `<div class="ru3-two">${ui.field({ id: 'fb-h', label: F.notes, help: F.notesHelp })}${ui.field({ id: 'fb-e', label: F.ready, value: F.readyValue, error: F.readyError })}</div>`;
    const load = `<div class="ru3-load"><div class="ru3-spin">${ui.spinner()}<span>${A(ed(ctx, 'Finding times', 'Loading'))}</span></div><div class="ru3-skel">${ui.skeleton('90%')}${ui.skeleton('70%')}${ui.skeleton('40%')}</div></div>`;
    // the page's one legend sits under the alerts, the main figure
    const legend = jlm(ctx, [['light', [['text', 'the words, edges, toast and field edges'], ['danger', 'the danger edge, stop sign and error words'], ['sunken', 'the grey lines']]]]);
    const a = fig(sheet(ctx, al, { bare: true }), legend,
      one('Alerts', 'A banner for the page. An icon and words, so it reads without colour. Each tone has its own icon and one edge in its colour. Danger is the stop sign.'), 'ru3-fig--side');
    const t = fig(sheet(ctx, toast, { bare: true }), '',
      one('Toast', 'At the foot of the screen, gone in five seconds. Undo stays reachable by keyboard. Confirms something that just happened. It offers Undo and goes.'));
    const l = fig(sheet(ctx, load, { bare: true }), '',
      one('Loading', 'A spinner when the wait is short. Grey lines in the shape of the content when it is a list. The spinner turns once a second and stops under reduced motion.'));
    const i = fig(sheet(ctx, inl, { bare: true }), '',
      one('Inline messages', 'Help under a field, then the error that replaces it. Next to the thing it is about. An error says what to do.'), 'ru3-fig--in');
    return kpage(ctx, 'feedback', 'How the product answers: a banner for the page, a toast for what just happened, a message beside a field, and the wait.', `${a}<div class="ru3-row">${t}${l}</div>${i}`, 'ru3-pg--feedback');
  },

  // two figures: the confirmation over a slice of the product's screen across the full width, its facts in a row under it, then the same
  // dialog at 390 as a bottom sheet with its caption at the left. The scrim lies over the slice; nothing else is drawn round it.
  dialog(ctx) {
    const S = sc(ctx), ui = ctx.ui, D = S.dialog;
    const dlg = (tag) => uniq(ui.dialog({ title: D.title, body: D.body, confirm: D.confirm, keep: D.keep, danger: true }), tag);
    const desk = `<div class="ru3-over">${slice(ctx, 2, true)}<div class="ui-scrim ru3-scrim">${dlg('dlg-d1')}</div></div>`;
    const phone = `<div class="ru3-over ru3-over--m">${slice(ctx, 1, true)}<div class="ui-scrim ru3-scrim ru3-scrim--m">${dlg('dlg-d2').replace('class="ui-dialog"', 'class="ui-dialog ru3-dsheet"')}</div></div>`;
    const R = [
      ['Edge', `A dialog takes a ${ctx.borders[1].px} px edge in ${A(nm(ctx, ctx.roles.light.text))} and no shadow: ${m('--shadow-float')} is none.`],
      ['Words', ed(ctx, `The title asks the question. The buttons answer it: ${A(D.confirm)}, ${A(D.keep)}. Never Yes or No.`, 'The title asks the question. The buttons answer it, each naming what it does. Never Yes or No.')],
      ['Order', 'Side by side when they fit, the safe answer first and the quiet one. The one that acts comes last.'],
      ['Keys', 'Focus moves into the dialog and returns to the button that opened it. Escape closes it.'],
    ];
    // the desktop figure runs the full width, so the slice shows whole words each side of the dialog; its facts sit in a row under it
    const deskCap = `<h2 class="ru3-ct">Confirmation</h2><p class="ru3-cn">A destructive step, over the scrim.</p><div class="ru3-facts">${facts(R.slice(0, 3))}</div>`;
    const one = fig(sheet(ctx, desk, { bare: true, cls: 'ru3-sh--over' }), jl(ctx, 'light', [['text', 'the edge and the words'], ['danger', 'the action'], ['surface', 'the dialog ground']]), deskCap, 'ru3-fig--dd');
    const two = `<div class="ru3-zz ru3-zz--r"><div class="ru3-cap">${cap('At 390', 'The same dialog as a bottom sheet. Its buttons run the full width, the safe answer first.', R.slice(3))}</div>${fig(sheet(ctx, phone, { bare: true, cls: 'ru3-sh--over' }), '', '')}</div>`;
    return kpage(ctx, 'dialog', ed(ctx, 'A dialog stops the visitor to ask one question. It sits over the scrim, and its buttons give the answers.', 'A dialog stops the person to ask one question. It sits over the scrim, and its buttons give the answers.'), one + two, 'ru3-pg--dialog');
  },

  // the table large across the full width, its four notes in a row of columns under it; then the loading and empty tables side by side,
  // each keeping the table's header
  table(ctx) {
    const S = sc(ctx), ui = ctx.ui, d = S.deliveries, F = S.form, sz = ctx.edition === 'slot' ? [] : (F.sizes || []);
    const arrow = '<svg class="ru3-sort" viewBox="0 0 8 6" width="8" height="6" aria-hidden="true"><path d="M4 0 8 6H0z" fill="currentColor"/></svg>';
    const H = ['When', ed(ctx, 'Visit', 'Item'), sz.length ? F.size : 'Amount', 'Status'];
    const sh = (t, extra = '', cls = '') => `<th${cls ? ` class="${cls}"` : ''}${extra}><button type="button">${A(t)}${extra ? arrow : ''}</button></th>`;
    const rows = d.slice(0, 4).map((r, i) => `<tr${i === 1 ? ' aria-selected="true"' : ''}${i === 2 ? ' class="is-hover"' : ''}><td>${A(r.when)}</td><td>${A(r.to)}</td><td class="is-num">${sz.length ? A(sz[i % sz.length]) : A(r.price)}</td><td>${chip(ctx, r.status)}</td></tr>`).join('');
    const tbl = `<table class="ui-table"><thead><tr>${sh(H[0], ' aria-sort="ascending"')}${sh(H[1])}${sh(H[2], '', 'is-num')}<th>${A(H[3])}</th></tr></thead><tbody>${rows}</tbody></table>`;
    const thead = `<thead><tr><th>${A(H[0])}</th><th>${A(H[1])}</th><th class="is-num">${A(H[2])}</th><th>${A(H[3])}</th></tr></thead>`;
    const skel = `<table class="ui-table" aria-label="Loading">${thead}<tbody>` + [['70%', '50%', '20px', '56px'], ['60%', '60%', '20px', '64px']].map((w) => '<tr>' + w.map((x, i) => '<td' + (i === 2 ? ' class="is-num"' : '') + '>' + ui.skeleton(x) + '</td>').join('') + '</tr>').join('') + '</tbody></table>';
    const E = S.empty;
    const none = `<table class="ui-table">${thead}<tbody><tr><td colspan="4" class="ru3-emp"><span>${A(E.title)}</span>${ui.btn(E.cta, { variant: 'quiet', size: 'sm' })}</td></tr></tbody></table>`;
    const R = [
      ['Header', `The raised ground, with a ${A(nm(ctx, ctx.roles.light.text))} rule under it. A sortable header is a button.`],
      ['Sorting', 'The arrow shows the sorted column and its order. The sort is also said to a screen reader.'],
      ['Rows', 'Rows are 52 px. Numbers sit right and use tabular figures, so a column adds up by eye.'],
      ['States', `Hover fills the row ${m('--raised')}. A selected row also takes a ${A(roleOf(ctx, 'action').name)} bar at its left edge.`],
    ];
    const big = fig(sheet(ctx, tbl, { cls: 'ru3-sh--tbl' }), jl(ctx, 'light', [['text', 'the words, header rule and lines'], ['raised', 'the header ground'], ['action', 'the selected bar'], ['sunken', 'the grey lines']]), `<h2 class="ru3-ct">${A(ed(ctx, 'Visits', 'Rows'))}</h2><p class="ru3-cn">Sorted by when. The second row is selected, the third shows hover.</p><div class="ru3-notes">${R.map((r) => `<div class="ru3-note">${facts([r])}</div>`).join('')}</div>`, 'ru3-fig--wide');
    const lo = fig(sheet(ctx, skel, { cls: 'ru3-sh--tbl ru3-sh--tbs' }), '', cap('Loading', 'The header stays. Grey lines take the place of the rows.'));
    const no = fig(sheet(ctx, none, { cls: 'ru3-sh--tbl ru3-sh--tbs' }), '', cap('No rows', ed(ctx, 'The header stays. One line, with what to do next.', 'The header stays. A title and an action, with what to do next.')));
    return kpage(ctx, 'table', ed(ctx, 'A table lists visits to compare and sort. A list is for reading one at a time.', 'A table lists items to compare and sort. A list is for reading one at a time.'), `${big}<div class="ru3-row ru3-row--t">${lo}${no}</div>`, 'ru3-pg--table');
  },

  // First visit is the one large figure: the headline on the sheet, no panel, its one action. Under it, side by side: no results as one
  // line and a quiet link under a search field, and a failure as an inline error in a list frame with its own way back.
  empty(ctx) {
    const S = sc(ctx), ui = ctx.ui, E = S.empty;
    const first = `<div class="ui-empty ru3-first"><h3 class="ui-empty__title">${A(E.title)}</h3><p class="ui-empty__text">${A(E.body)}</p>${ui.btn(E.cta)}</div>`;
    const noRes = `<div class="ru3-nr"><div class="ui-field"><label class="ui-label" for="em-q">Search</label><input class="ui-input" id="em-q" type="search" value="${A(ed(ctx, 'Sunday', 'Your search'))}"></div><p class="ru3-nr__t">${A(ctx.ph('uikit.noResults.title', 'Nothing on Sunday'))}</p><p class="ru3-nr__x">${A(ctx.ph('uikit.noResults.text', 'No entry times are listed for that day. The next late is Thursday, open until 9 pm.'))}</p>${ui.btn(ctx.ph('uikit.noResults.action', "What's on"), { variant: 'quiet' })}</div>`;
    const fail = `<div class="ru3-lf">${banner(ctx, 'danger', `<b class="ru3-al__t">${A(ctx.ph('uikit.error.title', 'Your visits did not load'))}</b> ${A(ctx.ph('uikit.error.text', 'Check your connection and try again. Your bookings are safe.'))}`)}${ui.btn(ctx.ph('uikit.error.action', 'Try again'), { variant: 'secondary' })}</div>`;
    // no note grid on this page: each figure's words are one plain paragraph under its title
    // (in the slot the action is a placeholder, whose hint would break the sentence: plain words there)
    const err = `A failure is not an empty state. It says what went wrong and offers ${ctx.edition === 'slot' ? 'a way to try again' : A(ctx.ph('uikit.error.action', 'Try again'))}.`;
    const legend = jlm(ctx, [['light', [['text', 'the words, field edge, rule and secondary button'], ['action', 'the button'], ['action-label', 'its label'], ['danger', 'the message and its edge']]]]);
    const f1 = fig(sheet(ctx, first), legend,
      one('First visit', `${ed(ctx, 'Nothing booked yet.', 'Nothing here yet.')} ${ed(ctx, 'The title says what is missing, in words a visitor would use.', 'The title says what is missing, in words a person would use.')} ${ed(ctx, 'The body says what to do next: one sentence, and Entry is free where it matters.', 'The body says what to do next, in one sentence.')} One button, and it is the way out of the empty state.`), 'ru3-fig--wide');
    const f2 = fig(sheet(ctx, noRes, { bare: true }), '', one('No results', ed(ctx, 'A search or a day with nothing in it.', 'A search or a filter that finds nothing.')));
    const f3 = fig(sheet(ctx, fail, { bare: true }), '', one('Could not load', `A failure, with a way back. ${err}`));
    return kpage(ctx, 'empty', 'When there is nothing to show, say what is missing and give one way forward.', `${f1}<div class="ru3-row ru3-row--t">${f2}${f3}</div>`, 'ru3-pg--empty');
  },
};
