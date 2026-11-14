// Theme 23, Broadsheet, lane u2: the rest of the component pages (not auto-loaded; lane-u2.js imports it).
// inputs is the clip-out coupon, choices the reader ballot, cards the property pages, navigation the section strip, lists the notices column,
// status the weather key and feedback the stop-press box. Every number is read from ctx, the tokens or the CSS the code ships.
import { A, E, G, px, col, hr, fitLogo } from './helpers.js';
import { colourMap, statusText } from '../../engine/tokens.js';
import { Word, mono, ratioText, kitPage, kitHead, kitDeck, adBox } from './lane-u1-kit.js';
import { sc, tok, ad, typeOf, notes } from './lane-u2-kit.js';

export const moreCss = () => `
.pg .u2-nr{padding:18px 0;border-bottom:.75px solid var(--hair)}
.pg .u2-nr:last-child{border-bottom:1px solid var(--ink)}
.pg .u2-story p+p{margin-top:4px}
.pg .u2-story .u1-m{display:inline-block;margin-top:6px}
/* inputs: the coupon, cut along a dashed line */
.pg .u2-cpg{display:grid;grid-template-columns:488px 232px;column-gap:24px;align-items:start}
.pg .u2-cut{display:block;align-self:stretch;margin:-14px;border:1.5px dashed var(--ink);box-sizing:border-box}
.pg .u2-cp{position:relative;align-self:stretch;box-sizing:border-box;border-left:1px solid var(--ink);border-right:1px solid var(--ink);padding:0 40px 32px}
.pg .u2-cp.first{border-top:1px solid var(--ink);padding-top:40px}
.pg .u2-cp.last{border-bottom:1px solid var(--ink);padding-bottom:40px}
/* choices */
.pg .u2-ballot{display:flex;flex-direction:column;gap:72px}
.pg .u2-grp{display:flex;flex-direction:column;align-items:flex-start;gap:4px}
.pg .u2-mx{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));grid-auto-rows:112px;align-items:center;justify-items:start}
/* cards: the cards are display ads already, so they sit straight on the paper */
.pg .ui.u2-bare{background:transparent}
.pg .u2-pair{display:grid;grid-template-columns:232px 232px;column-gap:24px;align-items:start}
/* navigation */
.pg .u2-nav{display:grid;grid-template-columns:488px 232px;column-gap:24px;row-gap:56px;align-items:start}
.pg .u2-phone{display:flex;flex-direction:column;justify-content:space-between}
.pg .u2-phone .ui-list{margin:16px 16px 0}
/* status */
.pg .u2-kr{display:flex;align-items:center;padding:0 24px;box-sizing:border-box}
.pg .u2-row{display:flex;align-items:center;gap:12px}
/* feedback */
.pg .u2-alerts{display:flex;flex-direction:column;gap:24px}
`;

// a story in the ruled columns: a short head, the words, and the class that draws it
const story = (head, text, cls = '') => `<div class="u2-story"><p class="u1-sh c-ink">${A(head)}</p><p class="c-cap c-ink">${text}</p>${cls ? mono(cls) : ''}</div>`;

export const more = {
  // ---- 011: the clip-out coupon. The form as it ships, cut along a dashed line, each field in a different state; the margin names the state
  // beside it, and the fourth column is the field's own spec ----
  inputs: (ctx) => {
    const S = sc(ctx), F = S.form, X = S.example || {}, ui = ctx.ui, M = colourMap(ctx, 'light'), bw = ctx.brand.ui.border;
    const hd = kitHead(ctx, 'The label sits above, the message below.', { max: 64, min: 48 });
    const y0 = hd.bottom + 80;
    const fld = (o) => `<div style="width:408px">${ui.field(o)}</div>`;
    const note = (n, t) => `<div class="u2-gn"><p class="u1-sh c-ink">${A(n)}</p><p class="c-cap c-ink">${t}</p></div>`;
    const rows = [
      [`<p class="u1-scr-t">${A(F.title)}</p>`, ''],
      [fld({ id: 'u2-in-f', label: F.pickup, value: F.pickupValue, state: 'focus' }), note('Focus', `The edge turns ${tok('text')} and the ${tok('focus')} ring sits ${ctx.borders[2].px} px off it.`)],
    ];
    if (F.dropoff !== F.ready) rows.push([fld({ id: 'u2-in-r', label: F.dropoff }), note('Rest', `Empty, inside a ${bw} px ${tok('edge')}. The label stays in view.`)]);
    rows.push(
      [fld({ id: 'u2-in-s', label: F.size, kind: 'select', options: F.sizes, value: F.sizes[1] }), note('Select', `The value in ${tok('text')}, the chevron in ${tok('quiet')}.`)],
      [fld({ id: 'u2-in-e', label: F.ready, value: F.readyValue, error: F.readyError }), note('Error', `A ${tok('danger')} edge and a message that says what to enter, at ${ratioText(ctx, M.danger, M.surface)}.`)],
      [fld({ id: 'u2-in-t', label: F.notes, kind: 'textarea', help: F.notesHelp }), note('Help', `One line under the field, in ${tok('quiet')} at ${tok('fs-caption')}.`)],
      [fld({ id: 'u2-in-d', label: X.account || F.pickup, value: ctx.brand.name, disabled: true }), note('Disabled', `${tok('disabled-bg')} ground and ${tok('disabled-text')} words, with no edge.`)],
      [ui.btn(F.book), ''],
    );
    const n = rows.length;
    const grid = `<div class="a u2-cpg" style="left:${px(G.left)};top:${px(y0)};width:744px"><i class="u2-cut" style="grid-column:1;grid-row:1/${n + 1}"></i>`
      + rows.map(([f, t], i) => `<div class="ui u2-cp${i === 0 ? ' first' : ''}${i === n - 1 ? ' last' : ''}" style="grid-column:1;grid-row:${i + 1}"><!--art-->${f}<!--/art--></div><div style="grid-column:2;grid-row:${i + 1}">${t}</div>`).join('') + '</div>';
    const ctl = typeOf(ctx, 'control'), lab = typeOf(ctx, 'label');
    const spec = [['Height', '44px'], ['Padding', '12px'], ['--r-input', `${ctx.radius.input}px`], ['--w-control', `${bw}px`], ['--fs-control', `${ctl.size}px`], ['--fs-label', `${lab.size}px`], ['--edge', M.edge], ['Edge on surface', ratioText(ctx, M.edge, M.surface)]];
    const specCol = col(G.x[3], y0 - 14, G.col, `<p class="u1-sh c-ink">How a field is built</p><div class="u2-sl">${spec.map(([k, v]) => `<div class="u2-sr">${k.startsWith('--') ? mono(k) : `<span class="c-cap c-quiet">${A(k)}</span>`}${mono(v)}</div>`).join('')}</div><p class="c-cap c-quiet" style="margin-top:16px">Every field is ${mono('.ui-field')}: a ${mono('label')}, the control, then the help or the error, tied to it by ${mono('aria-describedby')}.</p>`, { rule: true });
    return kitPage(ctx, 'inputs', hd.html + grid + specCol);
  },

  // ---- 012: the reader ballot. The brand's own choices as a filled-in ballot in the first two columns; the states as a matrix in the last two,
  // the five states across and the three controls down, with the rules for each under it ----
  choices: (ctx) => {
    const S = sc(ctx), F = S.form, X = S.example || {}, ui = ctx.ui, bw = ctx.brand.ui.border;
    const hd = kitHead(ctx, 'Four ways to choose.', { max: 64, min: 48 });
    const y0 = hd.bottom + 64;
    const grp = (h) => `<div class="u2-grp">${h}</div>`;
    const ballot = grp((X.checks || []).map((c, i) => ui.check(c, { checked: i === 0 })).join(''))
      + grp((X.radios || []).map((c, i) => ui.check(c, { type: 'radio', name: 'u2-bal', checked: i === 0 })).join(''))
      + grp((X.switches || []).map((c, i) => ui.switch(c, { checked: i === 0 })).join(''))
      + `<div class="u2-grp"><p class="ui-label">${A(F.size)}</p>${ui.segmented(F.sizes, 1)}</div>`;
    const left = adBox(ctx, G.left, y0, 488, `<div class="u2-ballot">${ballot}</div>`, { pad: 56 });
    // the matrix: five states across, three controls down, each control live and forced into its state
    const st = [{}, { checked: true }, { checked: true, state: 'focus' }, { disabled: true }, { disabled: true, checked: true }];
    const heads = ['Off', 'On', 'Focus', 'Disabled', 'Disabled, on'];
    const mx0 = G.x[2] + 104, mw = 384, cw = (mw - 32) / 5;
    let cells = '';
    ['checkbox', 'radio', 'switch'].forEach((k, r) => st.forEach((o, j) => {
      cells += `<div>${k === 'switch' ? ui.switch('', o) : ui.check('', { ...o, type: k, name: `u2-mx-${r}-${j}` })}</div>`;
    }));
    let mx = heads.map((h, j) => E(mx0 + 16 + j * cw, y0, 'c-folio c-quiet', A(h), { w: cw })).join('');
    const my = y0 + 56;
    mx += ['Checkbox', 'Radio', 'Switch'].map((h, r) => E(G.x[2], my + 16 + r * 112 + 45, 'c-label c-ink', h)).join('');
    mx += adBox(ctx, mx0, my, mw, `<div class="u2-mx">${cells}</div>`, { pad: 16 });
    const rIn = ctx.radius.input;
    const rules = col(G.x[2], my + 3 * 112 + 32 + 48, 488, notes([
      ['Checkbox', `Square, at ${tok('r-input')} ${rIn} px, inside a ${bw} px ${tok('edge')}. Ticked, it fills ${tok('text')}.`],
      ['Radio', `Round. Picked, it holds a 10 px dot in ${tok('text')}.`],
      ['Switch', `Off, the knob sits left in ${tok('edge')}. On, the track fills ${tok('action')} and the knob moves 18 px.`],
      ['Segmented', `One ${tok('text')} edge round the set. The picked part fills ${tok('text')}.`],
      ['Target', 'Each choice is 44 px tall, and its words are part of the target.'],
    ]), { rule: true });
    return kitPage(ctx, 'choices', hd.html + left + mx + rules);
  },

  // ---- 013: the property pages. A card is a display ad already, so the cards sit straight on the paper: the feature listing with its photograph
  // in the first two columns, the same card flat and raised in the last two, and the figure; each with its particulars in small print ----
  cards: (ctx) => {
    const S = sc(ctx), X = S.example || {}, ui = ctx.ui, M = colourMap(ctx, 'light');
    const hd = kitHead(ctx, 'A card, with or without a picture.', { max: 64, min: 48 });
    const y0 = hd.bottom + 64, shot = ((ctx.brand.imagery || {}).shots || [])[0];
    const media = shot ? ctx.photo(shot.id, { cls: 'ui-card__media' }) : '';
    const act = X.secondary ? `<div style="margin-top:8px">${ui.btn(X.secondary, { variant: 'secondary', size: 'sm' })}</div>` : '';
    const bare = (x, y, w, inner) => `<div class="a ui u2-bare" style="left:${px(x)};top:${px(y)};width:${px(w)}"><!--art-->${inner}<!--/art--></div>`;
    const feat = bare(G.left, y0, 744, ui.card({ media, meta: S.status, title: S.eta, text: S.pickup, action: act }));
    const c = { meta: S.deliverToLabel, title: S.deliverTo, text: S.rider };
    // the second row: the same card flat and raised, and the figure, each with its small print under it
    const y2 = Math.min(G.floor - 330, y0 + Math.round(744 * 9 / 16) + 300), capY = y2 + 184;
    const pair = hr(G.left, y2 - 32, 1000, 1) + bare(G.left, y2, G.col, ui.card(c)) + bare(G.x[1], y2, G.col, ui.card({ ...c, raised: true }));
    const caps = col(G.left, capY, G.col, story('Flat', `${tok('surface')} inside a ${ctx.borders[0].px} px ${tok('divider')} hairline, at ${tok('r-card')} ${ctx.radius.card} px.`, '.ui-card'))
      + col(G.x[1], capY, G.col, story('Raised', `${tok('raised')} ground and no edge, for a second level. Text holds ${ratioText(ctx, M.text, M.raised)}.`, '.ui-card--raised'), { rule: true });
    const stat = bare(G.x[2], y2, G.col, ui.stat(S.paid, X.statLabel || S.paidLabel))
      + col(G.x[2], capY, G.col, story('Figure', `One number in the display face at ${tok('fs-title')}, tabular, over its label.`, '.ui-stat'), { rule: true });
    const t = typeOf(ctx, 'title-s');
    const anat = col(G.x[3], y0, G.col, `<p class="u1-sh c-ink">Particulars</p>` + notes([
      ['Picture', 'Cut to 16:9 across the top, behind no frame of its own.'],
      ['Meta', `${tok('fs-label')} in ${tok('quiet')}, at ${ratioText(ctx, M.quiet, M.surface)}.`],
      ['Title', `The display face at ${tok('fs-title-s')}, ${t.size} px.`],
      ['Text', `${tok('fs-body')} in ${tok('text-soft')}, at ${ratioText(ctx, M['text-soft'], M.surface)}.`],
      ['Body', '16 px of padding, 6 px between the lines of it.'],
    ]), { rule: true });
    return kitPage(ctx, 'cards', hd.html + feat + pair + caps + stat + anat);
  },

  // ---- 014: the section strip. The top bar runs the full measure under the headline, like the strip under a nameplate; under it, the sidebar
  // in the first column and the tabs, the breadcrumbs and the phone's tab bar down the middle, each with its story in the fourth ----
  navigation: (ctx) => {
    const S = sc(ctx), X = S.example || {}, ui = ctx.ui, B = ctx.brand;
    const hd = kitHead(ctx, 'Five ways to find your place.', { max: 64, min: 48 });
    const y0 = hd.bottom + 64, links = X.links || [], all = [...links, [X.account || 'Account', 'user']];
    const lw = fitLogo(ctx, 'colour', 160, 28);
    const top = `<nav class="ui-topbar" aria-label="Main"><span style="display:block;width:${lw}px">${ctx.logo.html('colour', { width: lw, label: 'Logo' })}</span><div class="ui-topbar__links">${ui.links(links, 0)}</div></nav>`;
    const topAd = adBox(ctx, G.left, y0, 1000, top, { pad: 0 });
    const topStory = col(G.left, y0 + 58 + 20, 744, `<p class="c-cap c-ink"><b class="c-label">Top bar.</b> 56 px high on ${tok('surface')}, with a ${tok('divider')} hairline under it. The current link carries a 3 px ${tok('action')} bar. ${mono('.ui-topbar')}</p>`);
    const y1 = y0 + 58 + 96;
    const side = adBox(ctx, G.left, y1, G.col, `<nav class="ui-sidebar" aria-label="Sections">${ui.links(all, 0)}</nav>`, { pad: 5 })
      + col(G.left, y1 + all.length * 46 + 24 + 32, G.col, story('Sidebar', `220 px on ${tok('raised')}. The current page sits on ${tok('surface')} with a 3 px ${tok('action')} bar at its left.`, '.ui-sidebar'));
    const crumbs = [...(X.crumbs || []), S.deliverTo];
    const bar = `<nav class="ui-tabbar" aria-label="Sections">${all.slice(0, 4).map(([t, i], k) => `<a href="#"${k === 0 ? ' aria-current="page"' : ''}>${ui.icon(i, 20)}${A(t)}</a>`).join('')}</nav>`;
    const phone = `<div class="u2-phone" style="height:262px">${ui.deliveryRows(2)}${bar}</div>`;
    const grid = `<div class="a u2-nav" style="left:${px(G.x[1])};top:${px(y1)};width:744px">`
      + ad(ui.tabs(X.tabs || [], 0), { pad: 24 }) + story('Tabs', `Views of the same list. The picked tab carries a 3 px ${tok('action')} bar; the page stays put.`, '.ui-tabs')
      + ad(ui.crumbs(crumbs), { pad: 24 }) + story('Breadcrumbs', `The trail in ${tok('quiet')}, the links in ${tok('text-soft')}, and the page you are on in ${tok('text')}.`, '.ui-crumbs')
      + ad(phone, { pad: 0, style: 'width:392px' }) + story('Phone tab bar', `64 px high, four places to a bar. The current one carries a 3 px ${tok('action')} bar along its top.`, '.ui-tabbar')
      + '</div>';
    return kitPage(ctx, 'navigation', hd.html + topAd + topStory + side + grid);
  },

  // ---- 015: the notices column. The brand's list in a long display ad, its parts named in a strip across its head; the anatomy runs down the
  // fourth column, and the two variants sit under it, without a lead and on the dark ground ----
  lists: (ctx) => {
    const S = sc(ctx), ui = ctx.ui, M = colourMap(ctx, 'light'), d = S.deliveries || [];
    const hd = kitHead(ctx, `${Word(d.length)} rows, each with its status at the end.`, { max: 64, min: 48 });
    const y0 = hd.bottom + 72, pad = 32;
    const strip = E(G.left + pad, y0, 'c-folio c-quiet', 'Lead') + E(G.left + pad + 52, y0, 'c-folio c-quiet', 'Title and detail')
      + E(G.left + 744 - pad - 232, y0, 'c-folio c-quiet c-right', 'Price and status', { w: 232 }) + hr(G.left, y0 + 32, 744, 1);
    const main = adBox(ctx, G.left, y0 + 48, 744, ui.deliveryRows(d.length), { pad });
    const anat = col(G.x[3], y0, G.col, `<p class="u1-sh c-ink">The parts of a row</p>` + notes([
      ['Lead', `40 px round on ${tok('sunken')}, the icon in ${tok('text')}.`],
      ['Title', `${tok('fs-body')} in the medium weight. A long one wraps; it never clips.`],
      ['Detail', `${tok('fs-label')} in ${tok('quiet')}, at ${ratioText(ctx, M.quiet, M.surface)}, with tabular figures.`],
      ['End', 'The price over the status, set right, with tabular figures.'],
      ['Row', `At least 64 px, with a ${tok('divider')} hairline under each.`],
    ]), { rule: true });
    const y1 = G.floor - 300;
    const noLead = adBox(ctx, G.left, y1, 488, `<ul class="ui-list">${d.slice(0, 2).map((x) => ui.row({ title: x.to, sub: x.when, end: x.price })).join('')}</ul>`, { pad: 24 });
    const dark = adBox(ctx, G.x[2], y1, 488, ui.deliveryRows(2), { pad: 24, dark: true });
    const caps = col(G.left, y1 - 56, 488, `<p class="u1-sh c-ink">Without a lead</p>`) + col(G.x[2], y1 - 56, 488, `<p class="u1-sh c-ink">On the dark ground</p>`, { rule: true });
    return kitPage(ctx, 'lists', hd.html + strip + main + anat + caps + noLead + dark);
  },

  // ---- 016: the weather key. Every status the brand ships, on the light ground and the dark, down two display ads side by side; across from
  // each, its token, its ratio on both grounds and how many rows of the list carry it ----
  status: (ctx) => {
    const S = sc(ctx), ui = ctx.ui, d = S.deliveries || [], sts = ctx.status, n = sts.length, B = ctx.brand;
    const hd = kitHead(ctx, `${Word(n)} states, in words and one colour.`, { max: 64, min: 48 });
    const dk = kitDeck(ctx, 'A status is never a tinted pill: the words carry it, in a colour that reads on the surface and on a raised card.', G.left, hd.bottom + 32, 744);
    const y0 = hd.bottom + 32 + dk.h + 64;
    const lab = ['Light ground', 'Dark ground', 'Token', 'On its ground'];
    let head = lab.map((t, i) => E(G.x[i], y0, 'c-folio c-quiet', A(t), { w: G.col })).join('') + hr(G.left, y0 + 32, 1000, 1);
    const t0 = y0 + 48, rowH = Math.round(Math.min(144, (G.floor - 320 - t0) / n));
    const keys = (mode) => sts.map((s) => `<div class="u2-kr" style="height:${rowH}px">${ui.statusChip(s.id)}</div>`).join('');
    let body = adBox(ctx, G.x[0], t0, G.col, keys('light'), { pad: 0 }) + adBox(ctx, G.x[1], t0, G.col, keys('dark'), { pad: 0, dark: true });
    const R = ctx.roles;
    sts.forEach((s, i) => {
      const L = statusText(ctx, 'light', s), D = statusText(ctx, 'dark', s), y = t0 + i * rowH, on = d.filter((x) => x.status === s.id).length;
      const tk = L.token === D.token ? mono(L.token) : `${mono(L.token)}<br>${mono(D.token)}`;
      body += E(G.x[2], y + 16, '', `<p>${tk}</p><p class="c-cap c-quiet">${A(s.label)}</p>`, { w: G.col })
        + E(G.x[3], y + 16, '', `<p class="c-cap c-ink">Light ${mono(ratioText(ctx, L.hex, R.light.surface))}</p><p class="c-cap c-ink">Dark ${mono(ratioText(ctx, D.hex, R.dark.surface))}</p><p class="c-cap c-quiet">${on ? `On ${on} of the ${d.length} rows in the list` : 'Not on the list this week'}</p>`, { w: G.col });
      if (i) body += hr(G.x[2], y, 488, 0.75, 'hair');
    });
    body += hr(G.left, t0 + n * rowH + 16, 1000, 1);
    // the count badge, in use beside the list title
    const by = t0 + n * rowH + 72;
    const badge = adBox(ctx, G.left, by, 488, `<div class="u2-row"><p class="u1-scr-t">${A(B.ui.screen.title)}</p><span class="ui-badge">${d.length}</span></div>`, { pad: 32 })
      + col(G.x[2], by, 488, story('Count badge', `A count, never a word: ${tok('action')} fill with ${tok('action-label')} figures, at ${ratioText(ctx, R.light.actionLabel, R.light.action)}. 20 px high, tabular figures.`, '.ui-badge'), { rule: true });
    return kitPage(ctx, 'status', hd.html + dk.html + head + body + badge);
  },

  // ---- 017: the stop-press box. The four alerts stacked in a display ad across three columns, each tone's colour and ratio beside it in the
  // fourth; under it the toast, the inline message and the two ways to wait ----
  feedback: (ctx) => {
    const S = sc(ctx), F = S.form, ui = ctx.ui, M = colourMap(ctx, 'light');
    const hd = kitHead(ctx, 'Four alerts, a toast, and two ways to wait.', { max: 64, min: 48 });
    const y0 = hd.bottom + 64;
    const tones = [['info', S.pickup], ['success', S.toast], ['warning', S.alert], ['danger', F.readyError]];
    const press = adBox(ctx, G.left, y0, 744, `<div class="u2-alerts">${tones.map(([t, s]) => ui.alert(t, s)).join('')}</div>`, { pad: 40 });
    const toneCol = col(G.x[3], y0, G.col, `<p class="u1-sh c-ink">Tone</p>` + notes(tones.map(([t]) => [t[0].toUpperCase() + t.slice(1), `${tok(t)} ${mono(M[t])}, edge and icon at ${ratioText(ctx, M[t], M.surface)}.`]))
      + `<p class="c-cap c-quiet" style="margin-top:12px">The words stay in ${tok('text')}. Only the 2 px edge and the icon take the tone.</p>`, { rule: true });
    const y1 = Math.min(G.floor - 340, y0 + 40 + tones.length * 64 + 136);
    const cap = (x, w, h, t, c, r) => col(x, y1 + 164, w, story(h, t, c), { rule: r });
    const low = adBox(ctx, G.left, y1, 488, ui.toast(S.toast), { pad: 32, h: 140 })
      + adBox(ctx, G.x[2], y1, G.col, `<p class="ui-inline-msg">${ui.icon('info', 16)}${A(S.inline)}</p>`, { pad: 24, h: 140 })
      + adBox(ctx, G.x[3], y1, G.col, `<div class="u2-row">${ui.spinner()}<div class="u2-stack" style="gap:10px;flex:1">${ui.skeleton('100%')}${ui.skeleton('70%')}</div></div>`, { pad: 24, h: 140 })
      + cap(G.left, 488, 'Toast', `${tok('text')} ground with ${tok('surface')} words, at ${ratioText(ctx, M.surface, M.text)}. It names what happened and offers the way back.`, '.ui-toast', false)
      + cap(G.x[2], G.col, 'Inline', `${tok('fs-label')} in ${tok('text-soft')}, with a 16 px icon, beside the thing it is about.`, '.ui-inline-msg', true)
      + cap(G.x[3], G.col, 'Waiting', `A 24 px spinner that stops turning under reduced motion; skeleton lines in ${tok('sunken')}.`, '.ui-spinner', true);
    return kitPage(ctx, 'feedback', hd.html + press + toneCol + low);
  },
};
