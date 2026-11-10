// UI kit pages for theme 02, Ticket: status, feedback, dialog, table, empty. Styles are in css-u-more.js (classes start tu3-).
// The components are the real engine components (ctx.ui) in the brand's ui roles, standing on Stock (light) or Night (dark). The ticket
// frames the page and never the component: perforations are rules between a body and a stub column (or between rows), serials are
// running numbers, fact fields are label over value, and the condensed stub face sets small labels. Dialog is the one page after dark.
// Each page has its own structure: status a roll with its Night stub, feedback a run of four, dialog a body and a tall stub, table the
// table across the page with its keys torn off below, empty the empty state on the body with first run on the stub. No hex is written here.
import { A, ratioText } from './helpers.js';
import { statusText } from '../../engine/tokens.js';
import { page, perf, serial, fields } from './gate.js';

const sc = (ctx) => ctx.brand.ui.screen.content;
const NW = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const nw = (n) => { const w = NW[n] || String(n); return w[0].toUpperCase() + w.slice(1); };
const actionColour = (ctx) => ctx.colours.find((c) => c.role === 'action');
const uniq = (html, t) => html.replace(/dlg-t/g, t);
// the perforation as an open-page rule: holes in the quiet tone of the ground they are punched in
const holes = (ctx, night) => (night ? ctx.roles.dark : ctx.roles.light).quiet;
const hRule = (ctx, night = false, cls = '') => `<div class="tu3-hr ${cls}" aria-hidden="true">${perf(holes(ctx, night), { d: 3, p: 9, dir: 'h' })}</div>`;
const vRule = (ctx, night = false) => perf(holes(ctx, night), { d: 3, p: 9 });
// a headline in the display face; the sentence after the first full stop takes the second line
const head = (line, cls = '') => {
  const [a, ...b] = line.split('. ');
  return `<h1 class="disp tu3-h ${cls}">${b.length ? `${A(a)}.<br>${A(b.join('. '))}` : A(line)}</h1>`;
};
// the headline dropped to the stub at lead size, so the component is the large thing on the page
const stubHead = (line) => `<h1 class="tu3-sh">${A(line)}</h1>`;
// the stub label: a serial and a name in the condensed face
const tag = (n, name, cls = '') => `<p class="tu3-tag ${cls}"><span class="tk-sn">${serial(n)}</span><b>${A(name)}</b></p>`;
// a .ui block in light or dark tokens
const ui = (inner, dark = false, cls = '', el = 'div') => `<${el} class="ui ${cls}"${dark ? ' data-theme="dark"' : ''}>${inner}</${el}>`;
// a contrast ratio at label size: the chip is the large thing, the ratio is its footnote
const ratioCell = (ctx, a, b) => `<span class="tu3-sr__r">${ratioText(ctx.fmt(ctx.ratio(a, b)))}</span>`;

export const uMore = {
  // the roll with its stub after dark: one status a row, torn from the next by a perforation. The chip and its ratio on Stock are the
  // body (light tokens); the same chip and ratio on the Night stub are the dark tokens. The stub runs off the right edge to the foot.
  status(ctx) {
    const act = actionColour(ctx);
    // the ratio is the words' colour on the page ground of the mode shown (Stock in light, Night in dark)
    const pairs = (mode) => { const o = {}; for (const s of ctx.status) o[s.id] = [statusText(ctx, mode, s).hex, ctx.roles[mode].surface]; return o; };
    const L = pairs('light'), D = pairs('dark');
    // what each chip says, by its tone, in words true for any brand (the chip's own label carries the brand's word)
    const meaning = { action: `The state people can act on now.<span class="tu3-sr__x">In the ${A(act.name)} where it reads. Beside a lit button it goes grey, so the button keeps the only ${A(act.name)}.</span>`, warning: 'Still open, but running short. Say the number when it helps.', success: 'Going to plan. The good news, said in words.', info: 'Nothing to act on now. Quiet, and the page says what comes next.', danger: 'Not happening. Says so in words, and the row names what to do next.' };
    const rows = ctx.status.map((s, i) => `<li class="tu3-sr${i === 0 ? ' tu3-sr--lead' : ''}">${hRule(ctx, false, 'tu3-hr--day')}${hRule(ctx, true, 'tu3-hr--night')}
<span class="tk-sn">${serial(i + 1)}</span>${ui(ctx.ui.statusChip(s.id), false, 'tu3-chip')}<p class="tu3-sr__m">${meaning[s.tone] || ''}</p>${ratioCell(ctx, ...L[s.id])}
<div class="tu3-sr__n">${ui(ctx.ui.statusChip(s.id), true, 'tu3-chip')}${ratioCell(ctx, ...D[s.id])}</div></li>`).join('');
    // Light and Dark said once, as column heads over the roll, instead of on every row
    const heads = `<div class="tu3-sr tu3-srh" aria-hidden="true"><span></span><span>Light</span><span>What it says</span><span>Contrast</span><div class="tu3-sr__n"><span>Dark</span><span>Contrast</span></div></div>`;
    const lead = `A status is words in one colour. ${nw(ctx.status.length)} states, each reading without its colour. The ratio is the words on the page ground. A count badge sits on a tab or an icon: ${ui('<span class="ui-badge">3</span>', true, 'tu3-inl', 'span')}`;
    const night = `<div class="tu3-st__night" aria-hidden="true">${perf(ctx.roles.light.surface, { d: 6, p: 15 })}</div>`;
    return page(ctx, 'status', `<div class="tu3-st">${night}<div class="tu3-st__top">${head('Words first. Colour second.')}<p class="tu3-st__lead">${lead}</p></div>${heads}<ol class="tu3-srs">${rows}</ol></div>`, 'tu3 tu3--status');
  },

  // a run of four, left to right, each torn from the last by a perforation: the alert banners are the wide one, the run steps down
  feedback(ctx) {
    const u = ctx.ui, S = sc(ctx);
    const col = (n, name, inner, cap, cls = '') => `<div class="tu3-fc ${cls}">${n > 1 ? vRule(ctx) : ''}${tag(n, name)}${inner}${cap ? `<p class="tu3-cap">${cap}</p>` : ''}</div>`;
    const alerts = col(1, 'Alert banners', ui(`${u.alert('info', S.pickup)}${u.alert('success', S.toast)}${u.alert('warning', S.alert)}${u.alert('danger', S.form.readyError)}`, false, 'tu3-alerts'), 'A banner stays until it is dealt with.', 'tu3-fc--wide');
    const toast = col(2, 'Toast', ui(u.toast(S.toast), false, 'tu3-one tu3-big'), 'Bottom of the screen, gone in five seconds. Undo stays reachable by keyboard. Drawn at 1.25&times;.');
    const inline = col(3, 'Inline message', ui(`<p class="ui-inline-msg">${u.icon('info', 16)}${A(S.inline)}</p>`, false, 'tu3-one'), '');
    const load = col(4, 'Loading', ui(`${u.spinner()}<div class="tu3-skel">${u.skeleton('150px')}${u.skeleton('100px')}${u.skeleton('120px')}</div>`, false, 'tu3-load'), 'A spinner for a short wait. Longer lists get skeleton lines in the shape of the rows.');
    const lead = 'Say what happened and what to do, in one or two sentences. The icon and the words carry the meaning, and colour is the second cue. A delay says how long, and the new time.';
    return page(ctx, 'feedback', `<div class="tu3-top">${head('Say it plainly. Then say what next.')}<p class="tk-lead">${lead}</p></div><div class="tu3-run">${alerts}${toast}${inline}${load}</div>`, 'tu3 tu3--feedback');
  },

  // after dark: the body holds the plain modal; the question and its lead stand at the head of the stub (lead size) with the
  // confirmation tall beneath them, beyond the perforation. The title is the share button's word, so the body and Copy link answer it.
  dialog(ctx) {
    const u = ctx.ui, S = sc(ctx);
    const a = uniq(u.dialog({ title: S.share, body: 'Copy the link and send it on. Whoever opens it gets what you shared.', confirm: 'Copy link', keep: 'Cancel' }), 'dlg-a');
    const b = uniq(u.dialog({ title: S.dialog.title, body: S.dialog.body, confirm: S.dialog.confirm, keep: S.dialog.keep }), 'dlg-b');
    const lead = 'A dialog asks one thing. The title is the question and the buttons answer it. The safe answer sits on the left and takes the focus. Esc and a press on the scrim close it.';
    const body = `<div class="tu3-dg__body"><div class="tu3-dg__fig">${tag(1, 'Modal')}${ui(`<div class="ui-scrim">${a}</div>`, true, 'tu3-scrim')}<p class="tu3-cap">One action and a way out.</p></div></div>`;
    const stub = `<div class="tu3-dg__stub">${vRule(ctx, true)}<div class="tu3-dg__t">${stubHead('One question. Two answers.')}<p class="tk-lead">${lead}</p></div>
<div class="tu3-dg__fig">${tag(2, 'Confirmation')}${ui(`<div class="ui-scrim">${b}</div>`, true, 'tu3-scrim tu3-scrim--tall')}<p class="tu3-cap">The button names what it does, in the action colour. Danger red is kept for what cannot be undone.</p></div></div>`;
    return page(ctx, 'dialog', `<div class="tu3-dg">${body}${stub}</div>`, `tu3 tu3--dialog tu3-night${ctx.edition === 'slot' ? ' tu3--slot' : ''}`);
  },

  // the table is the body, as large as the page allows, with its three keys torn off along its foot as fact fields; the headline and
  // the lead stand on the stub beyond the perforation
  table(ctx) {
    const u = ctx.ui, S = sc(ctx), act = actionColour(ctx);
    const sortBtn = (t, dir) => `<button type="button">${A(t)}${dir ? u.icon(dir === 'asc' ? 'arrow-up' : 'arrow-down', 14) : ''}</button>`;
    // the sorted column is Name, ascending, so the rows run in name order (ctx.real reads the sample name behind a slot placeholder)
    // slot: the placeholders are numbered in display order (Item 1 to Item 5), so the rows keep their order rather than re-sorting by sample name
    const rows = [...S.deliveries.slice(0, 5)].sort((x, y) => (ctx.edition === 'slot' ? 0 : ctx.real(x.to).localeCompare(ctx.real(y.to)))).map((d, i) => `<tr${i === 0 ? ' aria-selected="true"' : ''}${i === 2 ? ' class="is-hover"' : ''}><td>${A(d.to)}</td><td>${A(d.when)}</td><td>${u.statusChip(d.status)}</td><td class="is-num">${A(d.price)}</td></tr>`).join('');
    const table = `<table class="ui-table"><thead><tr><th scope="col" aria-sort="ascending">${sortBtn('Name', 'asc')}</th><th scope="col">${sortBtn('Where and when')}</th><th scope="col">Status</th><th scope="col" class="is-num">${sortBtn('Amount')}</th></tr></thead><tbody>${rows}</tbody></table>`;
    const lead = `A table is for comparing, a list is for choosing. A sortable header is a button and the sorted one shows its direction. Numbers sit right in tabular figures. A selected row has a 3&nbsp;px ${A(act.name)} bar.`;
    const keys = [['Selected', 'First row'], ['Hover', 'Third row, on pointer devices'], ['Sorted', 'Name, ascending']]
      .map(([k, v], i) => `<li>${i ? vRule(ctx) : ''}<span class="tk-sn">${serial(i + 1)}</span>${fields([[k, A(v)]])}</li>`).join('');
    const body = `<div class="tu3-tb__body">${ui(table, false, 'tu3-tbl')}<div class="tu3-keys">${hRule(ctx)}<ol>${keys}</ol></div></div>`;
    const stub = `<div class="tu3-tb__stub">${vRule(ctx)}${stubHead('Compare in columns.')}<p class="tk-lead">${lead}</p></div>`;
    return page(ctx, 'table', `<div class="tu3-tb">${body}${stub}</div>`, 'tu3 tu3--table');
  },

  // the empty state is the body, as large as the page allows; first run is the stub beyond the perforation
  empty(ctx) {
    const S = sc(ctx), F = S.form, u = ctx.ui, E = S.empty;
    // the primary is never shown disabled: first run names the next step (the main action's placeholder in the slot edition)
    const next = ctx.ph('ui.screen.content.form.book', 'Choose a show');
    const none = `<div class="ui-empty"><h3 class="ui-empty__title">${A(E.title)}</h3><p class="ui-empty__text">${A(E.body)}</p>${u.btn(E.cta)}</div>`;
    const first = `<div class="ui-empty"><h3 class="ui-empty__title">${A(F.title)}</h3><ol class="tu3-steps"><li><span class="tu3-n">1</span>${A(F.pickup)}</li><li><span class="tu3-n">2</span>${A(F.dropoff)}</li><li><span class="tu3-n">3</span>${A(F.ready)}</li></ol>${u.btn(next)}</div>`;
    const lead = 'Say what is missing and offer the one action that fixes it. First run lists what is needed in the order it is asked, and its button names the next step. The panel is a raised ground with no edge, so it does not read as a card.';
    // one grid: the empty state alone on the body, from the top of the page to its caption; the headline at lead size, the lead and
    // first run on the stub, the perforation down the stub's edge
    const grid = `<div class="tu3-em__perf" aria-hidden="true">${vRule(ctx)}</div><div class="tu3-em__intro">${stubHead('Say what is missing.')}<p class="tk-lead">${lead}</p></div>
${tag(1, 'Empty', 'tu3-em__k1')}${tag(2, 'First run', 'tu3-em__k2')}${ui(none, false, 'tu3-em__big')}${ui(first, false, 'tu3-em__first')}<p class="tu3-cap tu3-em__c1">Nothing here yet, and the one action that changes that.</p><p class="tu3-cap tu3-em__c2">Before the first use: what is needed, in order.</p>`;
    return page(ctx, 'empty', `<div class="tu3-em">${grid}</div>`, 'tu3 tu3--empty');
  },
};
