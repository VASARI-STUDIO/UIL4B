// UI kit pages for theme 05, Catalogue: status, feedback, dialog, table, empty. Styles are in css-u-more.js (classes start ku3-).
// Open sheets from the gate (call number top left, rod hole at the foot). The components are the product's own UI in the brand's
// ui roles, set straight on the page, never on a card. The catalogue's furniture carries the page around them: guide-card tabs
// as dividers, drawer label holders as captions, the drawer interior (the dark ground) for dark mode, See also references,
// and the tracings line at the foot for the page's rules. Brand copy is read only through A().
import { A, ratioText } from './helpers.js';
import { statusText } from '../../engine/tokens.js';
import { hole } from './guidelines-k.js';

const sc = (ctx) => ctx.brand.ui.screen.content;
const rt = (ctx, a, b) => ratioText(ctx.fmt(ctx.ratio(a, b)));
const mono = (s) => `<span class="ku3-mono">${A(s)}</span>`;
const uniq = (html, tag) => html.replace(/dlg-t/g, tag);
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const word = (n) => WORDS[n] || String(n);
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// the open sheet, as the gate's: call number and title, the run head, the rod hole at the foot. The run head names the UI kit
function ksheet(ctx, id, inner, cls = '') {
  const p = ctx.pages.find((x) => x.id === id);
  return `<section class="pg k-sheet ku3-pg ${cls}" data-page="${id}">
<header class="k-hd"><div><span class="k-call ku3-mono">${A(p.ref || '')}</span><h1 class="k-ttl">${A(p.title)}</h1></div><p class="k-rh">${A(ctx.brand.name)} UI kit</p></header>
<div class="ku3-body">${inner}</div>
<footer class="k-ft">${hole(16)}<span class="k-fo num">${ctx.pageNo(id)}</span></footer></section>`;
}
// a See also reference to another page of the kit: its title and its page number
const see = (ctx, ids) => {
  const refs = ids.map((id) => ctx.pages.find((x) => x.id === id)).filter(Boolean).map((p) => `${A(p.title)}, page <span class="num">${ctx.pageNo(p.id)}</span>.`);
  return refs.length ? `<p class="ku3-see"><b>See also</b> ${refs.join(' ')}</p>` : '';
};
// the tracings at the foot of the sheet: the page's rules, numbered as on a catalogue card
const tracings = (items) => (items.length ? `<p class="ku3-trace">${items.map((t, i) => `<span class="num">${i + 1}.</span> ${t}`).join(' ')}</p>` : '');
const foot = (ctx, rl, ids) => `<div class="ku3-foot">${see(ctx, ids)}${tracings(rl)}</div>`;
// a guide card seen edge on: a Rod line across the drawer with its tab standing up in a third-cut position
const guide = (name, pos) => `<div class="ku3-guide ku3-guide--${pos}"><span class="ku3-gtab">${A(name)}</span></div>`;
// a drawer label holder: the frame and its two screws, the label slid in
const holder = (name, sub) => `<p class="ku3-hold"><i class="ku3-screw"></i><span class="ku3-lab"><b>${A(name)}</b>${sub ? ` ${A(sub)}` : ''}</span><i class="ku3-screw"></i></p>`;

export const uMore = {
  // the light page and the drawer interior side by side: each status set large on Card, its dark twin in the same line inside the
  // drawer, bleeding off the right edge. Under the drawer, each state as an entry: what it means, its two ratios and its tokens
  status(ctx) {
    const act = ctx.colours.find((c) => c.role === 'action') || ctx.colours[0];
    const meaning = { 'pre-order': `A copy is reserved and ships the week the book is printed. The only status in ${A(act.name)}.`, 'in-print': 'Printed and on the shelf. Neutral, because nothing needs doing.', reprinting: 'A new run is being printed. Say when it is back, as in Back in print in January.', 'out-of-print': 'Not available. Say so plainly and point to another title.' };
    // the slot edition is any brand's, so its entries read from the tone, in words true for any product; the showcase keeps the book's own
    const toneMeans = { action: `Asks for a step, or marks the state that matters most. The only status in ${A(act.name)}.`, neutral: 'Nothing needs doing, so it stays neutral.', success: 'Done. Nothing more is needed.', info: 'Under way. Say what happens next, and when.', warning: 'Delayed or changed. Say when it clears.', danger: 'Not available, or it failed. Say so plainly and offer the next step.' };
    const means = (s) => (ctx.edition !== 'slot' && meaning[s.id]) || toneMeans[s.tone] || '';
    const chips = ctx.status.map((s) => `<li class="ku3-chiprow">${ctx.ui.statusChip(s.id)}</li>`).join('');
    const entries = ctx.status.map((s) => {
      // the words' colour on the page ground of each mode, never on a tint
      const L = statusText(ctx, 'light', s), D = statusText(ctx, 'dark', s);
      return `<li class="ku3-ent"><p class="ku3-en"><b>${A(s.label)}.</b> ${means(s)}</p><p class="ku3-et">Light <span class="num">${rt(ctx, L.hex, ctx.roles.light.surface)}</span>. Dark <span class="num">${rt(ctx, D.hex, ctx.roles.dark.surface)}</span>. ${mono(L.token)} on the page.</p></li>`;
    }).join('');
    const rl = [`${cap(word(ctx.status.length))} states, each in plain words.`];
    const inner = `<p class="k-lead">A status is words in one colour; the colour is a second cue, never the only one. The ratio is the words on the page.</p>
<div class="ku3-st">
<div class="ui ku3-st-l"><span class="ku3-side">Light</span><ul class="ku3-chips">${chips}</ul></div>
<div class="ui ku3-st-d" data-theme="dark"><span class="ku3-side">Dark</span><ul class="ku3-chips">${chips}</ul></div>
</div>
<ol class="ku3-ents">${entries}</ol>
<div class="ui ku3-badge"><span class="ui-badge ku3-badge-n">3</span><p class="ku3-en">A count badge sits on a tab or an icon.</p></div>
${foot(ctx, rl, ['navigation', 'table'])}`;
    return ksheet(ctx, 'status', inner, 'ku3-pg-st');
  },

  // the drawer pulled open, filed by how long a message stays: guide cards divide it, their tabs stepping left, centre and right.
  // Banners stay until they are dealt with, the toast leaves by itself, the inline message sits with its field, loading is a wait
  feedback(ctx) {
    const ui = ctx.ui, S = sc(ctx);
    const group = (name, pos, note, inner, cls = '') => `<li class="ku3-fg ${cls}">${guide(name, pos)}${note ? `<p class="ku3-fn">${note}</p>` : ''}<div class="ui ku3-fc">${inner}</div></li>`;
    const groups = [
      group('Alert banners', 'l', 'Info, success, warning and danger.', `<div class="ku3-alerts">${ui.alert('info', S.pickup)}${ui.alert('success', S.toast)}${ui.alert('warning', S.alert)}${ui.alert('danger', S.form.readyError)}</div>`, 'ku3-fg--big'),
      group('Toast', 'c', 'Bottom of the screen. Gone in five seconds. Undo stays reachable by keyboard.', `<div class="ku3-toast">${ui.toast(S.toast)}</div>`),
      group('Inline', 'r', '', `<p class="ui-inline-msg ku3-inline">${ui.icon('info', 16)}${A(S.inline)}</p>`),
      group('Loading', 'l', 'The spinner is for a wait under a few seconds. Longer lists get skeleton lines in the shape of the rows.', `<div class="ku3-load">${ui.spinner()}<div class="ku3-skel">${ui.skeleton('220px')}${ui.skeleton('150px')}${ui.skeleton('180px')}</div></div>`),
    ].join('');
    const rl = ['Say what happened and what to do, in one or two sentences. A banner stays until it is dealt with. A toast leaves by itself.', 'Colour is carried by the icon and the words too.'];
    const inner = `<p class="k-lead">Banners, a toast, an inline message and loading.</p>
<div class="ku3-drw"><ol class="ku3-fgs">${groups}</ol><span class="ku3-lip"></span></div>
${foot(ctx, rl, ['status', 'dialog'])}`;
    return ksheet(ctx, 'feedback', inner, 'ku3-pg-fb');
  },

  // one dialog large on its scrim, across the sheet: the confirmation, which is the one that matters. Below it, the modal smaller,
  // inside the drawer (the dark ground), and the rules for both as numbered notes beside it
  dialog(ctx) {
    const ui = ctx.ui, S = sc(ctx), b = S.deliveries[0];
    const a = uniq(ui.dialog({ title: S.share, body: `Anyone with the link sees the page for ${b.to}.`, confirm: 'Copy link', keep: 'Close' }), 'dlg-a');
    const c = uniq(ui.dialog({ title: S.dialog.title, body: S.dialog.body, confirm: S.dialog.confirm, keep: S.dialog.keep, danger: true }), 'dlg-b');
    const rl = ['A dialog asks one thing. The title is the question, and the buttons answer it.', 'The safe answer is on the left, and it is the one the cursor lands on. Esc and a click on the scrim close it.', ctx.edition === 'slot' ? 'Danger is for an action that cannot be undone or that costs something. The button names the action, never OK or Yes.' : 'Danger is for what cannot be undone. Here, a cancelled copy goes back on sale and may not come back, so the button says what it does.'];
    const inner = `<p class="k-lead">A modal with one action, and a confirmation.</p>
${holder('Confirmation', 'The danger button names the action.')}
<div class="ui ku3-dl-big"><div class="ui-scrim ku3-scrim">${c}</div></div>
<div class="ku3-dl-row">
<div class="ku3-dl-mod">${holder('Modal', 'One action and a way out. Dark.')}<div class="ui ku3-dl-dk" data-theme="dark"><div class="ui-scrim ku3-scrim ku3-scrim--s">${a}</div></div></div>
<ol class="ku3-dl-rules">${rl.map((t, i) => `<li><b class="k-disp num">${i + 1}</b><p>${t}</p></li>`).join('')}</ol>
</div>
${foot(ctx, [], ['feedback', 'buttons'])}`;
    return ksheet(ctx, 'dialog', inner, 'ku3-pg-dl');
  },

  // the shelf list: the table is the drawer's own register, set large across the sheet. The row states are written in the
  // margin beside the rows they mark, as a librarian pencils a note against an entry. Under it, the same list in the drawer interior
  table(ctx) {
    const ui = ctx.ui, S = sc(ctx), act = ctx.colours.find((c) => c.role === 'action') || ctx.colours[0];
    // drawn at actual size in both editions: the Details cell holds its line, so the table needs the sheet's full width
    const Z = ctx.edition === 'slot' ? 1 : 0.93;
    const sortBtn = (t, dir) => `<button type="button">${A(t)}${dir ? ui.icon(dir === 'asc' ? 'arrow-up' : 'arrow-down', 14) : ''}</button>`;
    const rows = S.deliveries.map((d, i) => `<tr${i === 0 ? ' aria-selected="true"' : ''}${i === 2 ? ' class="is-hover"' : ''}><td>${A(d.to)}</td><td>${A(d.when)}</td><td>${ui.statusChip(d.status)}</td><td class="is-num">${A(d.price)}</td></tr>`).join('');
    const table = `<table class="ui-table"><thead><tr><th scope="col" aria-sort="ascending">${sortBtn('Title', 'asc')}</th><th scope="col">${sortBtn('Details')}</th><th scope="col">Status</th><th scope="col" class="is-num">${sortBtn('Price')}</th></tr></thead><tbody>${rows}</tbody></table>`;
    const rl = ['Headers name the data. A sortable header is a button, and the sorted one shows its direction.', `Numbers sit right and use tabular figures. Row states: rest, hover on pointer devices, and selected with a 3 px ${A(act.name)} bar on the left.`];
    const inner = `<p class="k-lead">A table with a header, sorting and row states.</p>
<div class="ui ku3-tbw" style="--z:${Z}">${table}</div>
<p class="ku3-key">${Z === 1 ? 'Drawn at actual size.' : `Drawn at <span class="num">${Z}</span> times actual size, so the Details hold one line.`} Selected: first row. Hover: third row. Sorted: Title, ascending.</p>
<div class="ui ku3-tbd" data-theme="dark"><span class="ku3-side">Dark, at actual size. The same rows in the same states.</span>${table}</div>
${foot(ctx, rl, ['status', 'lists'])}`;
    return ksheet(ctx, 'table', inner, 'ku3-pg-tb');
  },

  // two drawers with nothing in them yet, each named on its label holder: the empty order set large at the first indention,
  // the first run below it at the second indention, its three questions in the order they are asked
  empty(ctx) {
    const S = sc(ctx), F = S.form, ui = ctx.ui, E = S.empty;
    const none = `<div class="ui-empty"><h3 class="ui-empty__title">${A(E.title)}</h3><p class="ui-empty__text">${A(E.body)}</p>${ui.btn(E.cta)}</div>`;
    const first = `<div class="ui-empty"><h3 class="ui-empty__title">${A(F.title)}</h3><ol class="ku3-steps"><li><span class="num">1</span>${A(F.pickup)}</li><li><span class="num">2</span>${A(F.dropoff)}</li><li><span class="num">3</span>${A(F.ready)}</li></ol>${ui.btn(F.book)}<p class="ui-help">${A(F.bookWhy)}</p></div>`;
    const rl = ['Say what is missing and offer the one action that fixes it. First-run lists what is needed, in the order it is asked, and its main action stays live, and the line under it names the next step.', 'The empty state steps in one indention and the first run two, 40 and 80 px, as the lines of a catalogue card do.', 'The empty state sits on a raised ground with no edge, so it does not read as a card.'];
    const inner = `<p class="k-lead">Nothing to show yet, and the first time through.</p>
<div class="ku3-em ku3-em--1">${holder('Empty', 'Nothing filed yet.')}<div class="ui ku3-emc ku3-emc--big">${none}</div></div>
<div class="ku3-em ku3-em--2">${holder('First run', 'The first time through.')}<div class="ui ku3-emc">${first}</div></div>
${foot(ctx, rl, ['feedback', 'inputs'])}`;
    return ksheet(ctx, 'empty', inner, 'ku3-pg-em');
  },
};
