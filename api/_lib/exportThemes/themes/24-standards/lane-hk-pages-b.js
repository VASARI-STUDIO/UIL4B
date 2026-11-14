// Theme 24, Standards, lane hk: the kit site's component pages (buttons, inputs, choices, cards, navigation, lists, status, feedback).
// One real component drawn large (zoomed, never redrawn) and dimensioned in x, beside the real components at 1:1 in every state.
import { A, xOf, fx, adv, bodyFace, sc, hv, ratioText, ex, T, sp, hairW, ceilTo, btnW, dimH, dimV, chainH, chainV, drawing, ui, sec, reg, title } from './lane-hk-parts.js';
import { colourMap, statusText } from '../../engine/tokens.js';

const split = (t, stage) => `<div class="hk-split">${t}<div class="hk-stage">${stage}</div></div>`;
const nth = (html, tag, map) => { let i = -1; return html.replace(new RegExp(`<${tag} `, 'g'), (m) => { i++; return map[i] ? `<${tag} data-hk="${map[i]}" ` : m; }).replace(/ data-hk="([^"]+)"( class=")?/g, (m, c, k) => (k ? ` class="${c} ` : ` class="${c}" `)); };
const seg = (ctx, items, active, { hoverAt, focusAt, disabled } = {}) => nth(ctx.ui.segmented(items, active, { disabled }), 'button', { [hoverAt]: 'is-hover', [focusAt]: 'is-focus' });
const lab = (t) => `<span class="hk-lab">${A(t)}</span>`;
const item = (name, html) => `<div>${lab(name)}${html}</div>`;
const mx = (items) => `<div class="hk-mx">${items.join('')}</div>`;
const fits = (list, w, measure) => list.find((t) => measure(t) <= w) || [...list].sort((a, b) => measure(a) - measure(b))[0];
const choiceW = (ctx, label, box = 22) => box + 12 + adv(bodyFace(ctx, ctx.weights.regular), label, T(ctx, 'control', { size: 16 }).size);

export const pagesB = {
  // ---- buttons: the primary with an icon drawn at 3:1 with its run of paddings and gap; the three sizes by height; the four variants in every state ----
  buttons(ctx, K) {
    const u = ctx.ui, S = sc(ctx), F = S.form || {}, E = ex(ctx), bw = ctx.brand.ui.border, c = T(ctx, 'control', { size: 16, weight: 500 });
    const label = F.book || S.call, pad = sp(ctx, 5, 20), gap = sp(ctx, 2, 8), lw = adv(bodyFace(ctx, c.weight), label, c.size), wA = btnW(ctx, label, { icon: true });
    const draw = drawing({ k: 3, km: 1.5, w: wA + 1, html: u.btn(label, { iconRight: 'arrow-right' }), hdims: `<div style="padding-left:calc(${bw}px * var(--k))">${chainH(ctx, [[pad], [lw], [gap], [18], [pad]])}</div>`, vdims: dimV(44, fx(ctx, 44)), cap: 'Primary with an icon, drawn at 3:1' });
    const sizes = [['Small', 'sm', E.small || label, 36], ['Default', null, label, 44], ['Large', 'lg', label, 52]];
    const sz = mx(sizes.map(([n, size, t, h]) => `<div style="display:flex;gap:8px;align-items:flex-end"><div>${lab(n)}${hv(size ? `ui-btn--${size}` : 'ui-btn')}<div class="ui hk-ui--tight" style="margin-top:12px">${u.btn(t, { size: size || undefined })}</div></div><div style="--k:1;padding-bottom:16px">${dimV(h, fx(ctx, h))}</div></div>`));
    const st = [['Rest'], ['Hover', 'hover'], ['Focus', 'focus'], ['Pressed', 'pressed'], ['Disabled', 'disabled']];
    const vars = [['Primary', 'primary', 'ui-btn', label], ['Secondary', 'secondary', 'ui-btn--secondary', E.secondary || S.call], ['Quiet', 'quiet', 'ui-btn--quiet', E.quiet || S.call], ['Danger', 'danger', 'ui-btn--danger', E.danger || S.call]];
    const matrix = vars.map(([name, v, cl, t]) => `<div class="hk-grp"><div><h3>${A(name)}</h3><span>${hv(cl)}</span></div><div class="hk-mx">${st.map(([n, s]) => `<div>${lab(n)}${s === 'disabled' && v === 'primary' ? '<p class="hk-cap" style="margin:8px 0">Never disabled</p>' : ui(u.btn(t, { variant: v, state: s === 'disabled' ? undefined : s, disabled: s === 'disabled' }), { cls: 'hk-ui--tight' })}</div>`).join('')}</div></div>`).join('');
    return split(title(ctx, K, `Four variants and three sizes, all from one ${hv('ui-btn')}. Every button is 44 px tall by default; the label and its icon sit ${fx(ctx, pad)} in from each end.`), draw)
      + sec('Three sizes, by height', sz) + sec('Four variants in every state', matrix);
  },

  // ---- inputs: a field with help drawn at 2:1, its stack of label, gap, control, gap and help down its side; the real fields in every state ----
  inputs(ctx, K) {
    const u = ctx.ui, S = sc(ctx), F = S.form || {}, x = xOf(ctx), bw = ctx.brand.ui.border, W = ctx.weights, c = T(ctx, 'control', { line: 24 }), l = T(ctx, 'label', { line: 20 }), cp = T(ctx, 'caption', { size: 12, line: 16 });
    const help = F.notesHelp || F.bookWhy || '', FW = Math.min(232, Math.max(200, ceilTo(adv(bodyFace(ctx, W.regular), help, cp.size) + 8, x)));
    const taH = Math.max(96, 3 * c.line + 20 + 2 * bw);
    const draw = drawing({ k: 2, km: 1.25, w: FW, html: u.field({ id: 'hk-in-d', label: F.notes || F.pickup, kind: 'textarea', help }), hdims: dimH(FW, fx(ctx, FW)), vdims: chainV(ctx, [[l.line], [6], [taH], [6], [cp.line]]), cap: 'Textarea with help, drawn at 2:1' });
    const fld = (id, o) => `<div style="width:240px;max-width:100%">${u.field({ id: `hk-in-${id}`, ...o })}</div>`;
    const fields = mx([
      item('Rest', fld(1, { label: F.ready || F.pickup, value: '' })),
      item('Error', fld(2, { label: F.ready || F.pickup, value: F.readyValue || '', error: F.readyError })),
      item('Focus', fld(3, { label: F.dropoff, value: F.dropoffValue, state: 'focus' })),
      item('Disabled', fld(4, { label: F.dropoff, value: F.dropoffValue, disabled: true })),
      item('Filled', fld(5, { label: F.pickup, value: F.pickupValue })),
      item('Select', fld(6, { label: F.size, kind: 'select', options: F.sizes || [], value: (F.sizes || [])[0] })),
    ]);
    return split(title(ctx, K, `Text field, select and textarea share one frame: a ${fx(ctx, 44)} control under its label, help or an error under it. The label is always shown; a placeholder never stands in for it.`), draw)
      + sec('Fields in every state', ui(fields));
  },

  // ---- choices: the switch drawn at 5:1; the checkbox, radio and switch in each state; the segmented control ----
  choices(ctx, K) {
    const u = ctx.ui, S = sc(ctx), F = S.form || {}, E = ex(ctx);
    const sws = E.switches || [S.share], sw0 = sws[0], k = 5;
    const swOn = u.switch(sw0, { checked: true }).replace(/<span>[^<]*<\/span>/, '').replace('role="switch"', `role="switch" aria-label="${A(sw0)}"`);
    const draw = drawing({ k, km: 3, w: 44, html: swOn, hdims: dimH(44, fx(ctx, 44)), vdims: `<div style="padding-top:calc(9px * var(--k));">${dimV(26, fx(ctx, 26))}</div>`, cap: `Switch on, drawn at ${k}:1: ${fx(ctx, 26)} high in a ${fx(ctx, 44)} target.` });
    const cw = 220, ck = fits(E.checks || [F.notes], cw, (t) => choiceW(ctx, t)), rds = E.radios || F.sizes || [], rd = fits(rds, cw, (t) => choiceW(ctx, t)), sw = fits(sws, cw, (t) => choiceW(ctx, t, 44));
    const rows = [['Off', {}], ['On', { checked: true }], ['Focus', { state: 'focus' }], ['Disabled', { disabled: true }]];
    const grid = rows.map(([n, o], r) => `<div class="hk-grp"><div><h3>${n}</h3></div><div class="hk-mx">${[['Checkbox', u.check(ck, o)], ['Radio', u.check(rd, { type: 'radio', name: `hk-rd-${r}`, ...o })], ['Switch', u.switch(sw, o)]].map(([c, h]) => `<div>${lab(c)}${ui(h, { cls: 'hk-ui--tight' })}</div>`).join('')}</div></div>`).join('');
    const items = F.sizes || E.tabs || [];
    const segs = mx([['Rest', {}], ['Hover', { hoverAt: 1 }], ['Focus', { focusAt: 1 }], ['Disabled', { disabled: true }]].map(([n, o]) => item(n, ui(seg(ctx, items, 0, o), { cls: 'hk-ui--tight' }))));
    return split(title(ctx, K, `A checkbox for each of many, a radio for one of a few, a switch for a setting that applies at once. The box is ${fx(ctx, 22)}, the switch ${fx(ctx, 44)} by ${fx(ctx, 26)}, and the label is part of the target.`), draw)
      + sec('Checkbox, radio and switch', grid) + sec('Segmented control', segs);
  },

  // ---- cards: the content card drawn at 2:1, its padding and first lines dimensioned; the real cards at 1:1 ----
  cards(ctx, K) {
    const u = ctx.ui, S = sc(ctx), F = S.form || {}, E = ex(ctx), hw = hairW(ctx), b = T(ctx, 'body', { line: 24 }), CW = 220;
    const card = u.card({ meta: S.status, title: S.rider, text: S.riderNote });
    const draw = drawing({ k: 2, km: 1.25, w: CW, html: card, hdims: `<div style="padding-left:calc(${hw}px * var(--k))">${chainH(ctx, [[16]])}</div>`, vdims: `<div style="padding-top:calc(${hw}px * var(--k))">${chainV(ctx, [[16], [b.line], [6]])}</div>`, cap: 'Card, drawn at 2:1' });
    const sets = [['Card', card], ['Raised', u.card({ meta: S.deliverToLabel, title: S.deliverTo, text: `${S.paidLabel} ${S.paid}`, raised: true })]];
    sets.push(['With an action', u.card({ meta: F.title || S.status, title: S.deliverTo, text: S.riderNote, action: `<div>${u.btn(E.small || F.book, { size: 'sm' })}</div>` })], ['Stat', u.stat(S.paid, E.statLabel || S.paidLabel)]);
    return split(title(ctx, K, `A card sits on the surface inside a ${hw} px ${hv('--divider')} edge; a raised card steps up to ${hv('--raised')} and drops the edge. Content keeps ${fx(ctx, 16)} from every side.`), draw)
      + sec('Every card, at size', `<div class="hk-mx">${sets.map(([n, h]) => `<div style="width:${CW}px;max-width:100%">${lab(n)}${ui(h, { cls: 'hk-ui--tight' })}</div>`).join('')}</div>`);
  },

  // ---- navigation: the top bar across the measure with its link states; the sidebar, tabs, breadcrumbs and the mobile tab bar ----
  navigation(ctx, K) {
    const u = ctx.ui, S = sc(ctx), E = ex(ctx), links = E.links || [[S.call, 'phone']];
    const top = `<nav class="ui-topbar" aria-label="Main"><span>${ctx.logo.html('horizontal', { width: 112, label: 'Logo' })}</span><div class="ui-topbar__links">${nth(u.links(links, 0), 'a', { 1: 'is-hover', 2: 'is-focus' })}</div><span class="ui-avatar">${A(S.initials || '')}</span></nav>`;
    const side = `<nav class="ui-sidebar" aria-label="Sections">${u.links(links, 0)}</nav>`;
    const bar = [...links, [E.account || S.call, 'user']].slice(0, 4);
    const tabbar = `<nav class="ui-tabbar" aria-label="Sections">${bar.map(([t, i], n) => `<a href="#"${n === 0 ? ' aria-current="page"' : ''}>${u.icon(i, 20)}${A(t)}</a>`).join('')}</nav>`;
    return title(ctx, K, `The current place is marked by a 3&nbsp;px bar in ${hv('--action')} and the text going to ${hv('--text')}, never by colour alone. Every target is at least 44&nbsp;px tall.`)
      + sec('Top bar', `<div style="--k:1;display:flex;gap:8px">${dimV(56, fx(ctx, 56))}<div style="flex:1;min-width:0">${ui(top, { cls: 'hk-ui--bare' })}<p class="hk-cap">Links, left to right: current, hover, focus.</p></div></div>`)
      + `<div class="hk-dg">${sec('Sidebar', ui(side, { cls: 'hk-ui--tight' }))}${sec('Tabs and breadcrumbs', ui(`${nth(u.tabs(E.tabs || [], 0), 'button', { 1: 'is-hover' })}<p class="hk-cap" style="margin:8px 0 24px">Selected, then hover.</p>${u.crumbs(E.crumbs || [])}`, { cls: 'hk-ui--tight' }))}</div>`
      + sec('Mobile tab bar, at its 390 px', `<div style="--k:1;max-width:390px">${dimH(390, fx(ctx, 390))}${ui(tabbar, { cls: 'hk-ui--bare' })}</div>`);
  },

  // ---- lists: one row drawn at 2:1, its leading, gaps, text and trailing chained along the top; the list at 1:1 with a row in hover and one in focus ----
  lists(ctx, K) {
    const u = ctx.ui, S = sc(ctx), W = ctx.weights, l = T(ctx, 'label', { size: 14, line: 20 }), hw = hairW(ctx);
    const ds = S.deliveries || [], icon = ctx.brand.ui.rowIcon || 'package', stOf = (id) => ctx.status.find((s) => s.id === id) || { label: '' };
    const row = (d, href) => u.row({ lead: u.icon(d.icon || icon, 18), title: d.to, sub: d.when, end: d.price, chip: u.statusChip(d.status), href });
    const RW = 480, endW = Math.max(adv(bodyFace(ctx, W.regular), ds[0].price || '', l.size), adv(bodyFace(ctx, W.medium), stOf(ds[0].status).label, l.size));
    const draw = drawing({ k: 2, km: 0.7, w: RW, html: `<ul class="ui-list">${row(ds[0])}</ul>`, hdims: chainH(ctx, [[40], [12], [RW - 40 - 24 - endW], [12], [endW]]), cap: 'List row, drawn at 2:1' });
    const n = Math.min(4, ds.length), list = `<ul class="ui-list">${ds.slice(0, n).map((d, i) => nth(row(d, '#'), 'a', { 0: ['', 'is-hover', 'is-focus', ''][i] })).join('')}</ul>`;
    return title(ctx, K, `A row is a leading mark, two lines of text and a trailing value with its status, on a ${hw} px ${hv('--divider')} rule. A row that opens something is a link, and takes hover and focus.`)
      + `<div class="hk-stage" style="padding-top:8px">${draw}</div>`
      + sec('The list, at size', `<div class="hk-dg"><div>${ui(list, { cls: 'hk-ui--bare' })}</div><div>${reg([['Rest', ''], ['Hover', hv('--raised')], ['Focus', 'the 2 px ring']])}</div></div>`);
  },

  // ---- status: the first status word and the count badge drawn at 4:1; every state the brand ships, on light and dark, each with its token and ratio ----
  status(ctx, K) {
    const u = ctx.ui, S = sc(ctx), W = ctx.weights, l = T(ctx, 'label', { size: 14 }), cp = T(ctx, 'caption', { size: 12 });
    const L = colourMap(ctx, 'light'), Dk = colourMap(ctx, 'dark'), s0 = ctx.status[0], cw = Math.ceil(adv(bodyFace(ctx, W.medium), s0.label, l.size)) + 1, ch = l.size * 1.3;
    const n = String((S.deliveries || []).length), bW = Math.max(20, 12 + adv(bodyFace(ctx, W.strong), n, cp.size));
    const d1 = drawing({ k: 4, km: 2, w: cw, html: u.statusChip(s0.id), hdims: dimH(cw, fx(ctx, cw)), vdims: dimV(ch, fx(ctx, ch)), cap: 'A status word, drawn at 4:1' });
    const d2 = drawing({ k: 4, km: 2, w: bW, html: `<span class="ui-badge">${A(n)}</span>`, hdims: dimH(bW, fx(ctx, bW)), vdims: dimV(20, fx(ctx, 20)), cap: 'The count badge, drawn at 4:1' });
    const rows = ctx.status.slice(0, 6).map((s) => {
      const tl = statusText(ctx, 'light', s), td = statusText(ctx, 'dark', s);
      return `<li><span>${ui(u.statusChip(s.id), { cls: 'hk-ui--tight' })}</span><span>${ui(u.statusChip(s.id), { dark: true, cls: 'hk-ui--tight' })}</span><span>${hv(tl.token)}</span><span>${hv(tl.hex)} ${ratioText(ctx, tl.hex, L.surface)}</span><span>${hv(td.hex)} ${ratioText(ctx, td.hex, Dk.surface)}</span></li>`;
    }).join('');
    return split(title(ctx, K, `A status is the product's own words in one colour, never a filled pill. Each is measured on the surface it sits on, light and dark.`), `<div class="hk-flow">${d1}${d2}</div>`)
      + sec('Every status, light and dark', `<p class="hk-cap" style="margin:-8px 0 12px">On light, on dark, token, light on its surface, dark on its surface.</p><ul class="hk-reg hk-reg--5">${rows}</ul>`);
  },

  // ---- feedback: the toast drawn at 2:1 with its run of paddings; the four alert tones; the inline message and the loading pieces ----
  feedback(ctx, K) {
    const u = ctx.ui, S = sc(ctx), F = S.form || {}, W = ctx.weights, l = T(ctx, 'label', { size: 14 }), b = T(ctx, 'body', { size: 16, line: 24 });
    const msg = S.toast || S.status, tw = adv(bodyFace(ctx, W.regular), msg, b.size), uw = adv(bodyFace(ctx, W.strong), 'Undo', l.size), TW = 16 + tw + 26 + uw + 22;
    const draw = drawing({ k: 2, km: 1, w: Math.ceil(TW + 4), html: `<div class="hk-inl">${u.toast(msg)}</div>`, hdims: chainH(ctx, [[16], [tw], [26], [uw], [22]]), vdims: dimV(24 + b.line, fx(ctx, 24 + b.line)), cap: 'Toast, drawn at 2:1' });
    const tones = [['Info', 'info', S.inline], ['Success', 'success', S.toast], ['Warning', 'warning', S.alert], ['Danger', 'danger', F.readyError]].filter((t) => t[2]);
    const alerts = `<div class="hk-stk">${tones.map(([n, t, s]) => `<p class="hk-lab" style="margin:8px 0 0">${n}</p>${u.alert(t, s)}`).join('')}</div>`;
    const p = Math.round((S.progress || 0) * 100);
    const loading = mx([item('Spinner', u.spinner()), item('Skeleton', `<div class="hk-sk" style="width:160px">${u.skeleton('100%')}${u.skeleton('72%')}${u.skeleton('86%')}</div>`),
      item('Progress', `<div style="width:240px;max-width:100%"><div class="ui-progress" role="progressbar" aria-label="${A(S.rider || '')}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${p}"><div class="ui-progress__bar"><i style="width:${p}%"></i></div><span class="ui-progress__dot" style="left:${p}%"></span></div><div class="hk-route"><span>${A(S.from || '')}</span><span>${A(S.to || '')}</span></div></div>`)]);
    return split(title(ctx, K, `Messages are words on the surface. An icon and a ${fx(ctx, 2)} edge carry the tone and the text stays in ${hv('--text')}; only the toast inverts.`), draw)
      + `<div class="hk-dg">${sec('Alerts, one a tone', ui(alerts))}<div>${sec('Inline message', ui(`<p class="ui-inline-msg">${u.icon('info', 16)}${A(S.inline || '')}</p>`))}<div style="margin-top:32px">${sec('Loading', ui(loading))}</div></div></div>`;
  },
};
