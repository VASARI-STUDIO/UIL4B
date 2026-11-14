// Theme 24, Standards, lane hk: the kit site's last pages (dialog, table, empty, screen-light, screen-dark, screen-mobile, tokens, code).
// The drawing then the thing: the shipped dialog and empty state zoomed and dimensioned in x, the table at size with its rows stacked on a
// phone, the three screens built from ctx.ui, and the reference as registers read from the engine's own token export.
import { A, xOf, fx, adv, wrap, bodyFace, dispFace, sc, f2, hv, shippedPx, shipped, ex, T, dimH, dimV, chainV, drawing, ui, sec, reg, cap, title, swatch } from './lane-hk-parts.js';
import { colourMap, tokenGroups, tokensCss, tailwindCss } from '../../engine/tokens.js';
import { iconSet } from '../../engine/components.js';

const split = (t, stage) => `<div class="hk-split">${t}<div class="hk-stage">${stage}</div></div>`;
const px4 = (ctx, p) => `${f2(p)} px, ${fx(ctx, p)}`;
const kFor = (w, max) => Math.min(max, Math.floor((640 / w) * 20) / 20);
const kmFor = (w) => Math.min(1, Math.floor((300 / w) * 100) / 100);

// ---------------------------------------------------------------- screen pieces (the shipped components, composed as the product uses them)
function logoFor(ctx, mode, width) {
  const cw = mode === 'dark' ? (ctx.brand.logo.colourways.reversed ? 'reversed' : 'mono-light') : undefined;
  return ctx.logo.html('horizontal', { width, colourway: cw, label: 'Logo' });
}
function topbar(ctx, mode, active = 0) {
  const X = ex(ctx), S = sc(ctx);
  return `<nav class="ui-topbar" aria-label="Main"><span>${logoFor(ctx, mode, 112)}</span><div class="ui-topbar__links">${ctx.ui.links(X.links, active)}</div><span class="ui-avatar" aria-label="${A(X.account)}">${A(S.initials)}</span></nav>`;
}
function progress(ctx) {
  const S = sc(ctx), p = Math.max(0, Math.min(1, S.progress || 0)) * 100;
  return `<div class="hk-prog"><div class="ui-progress" role="img" aria-label="${A(S.from)} to ${A(S.to)}"><div class="ui-progress__bar"><i style="width:${p}%"></i></div><span class="ui-progress__dot" style="left:${p}%"></span></div><div class="hk-ends"><span>${A(S.from)}</span><span>${A(S.to)}</span></div></div>`;
}
function riderRow(ctx) {
  const S = sc(ctx);
  return `<div class="hk-rider"><span class="ui-avatar">${A(S.initials)}</span><div class="hk-who"><p class="hk-b">${A(S.rider)}</p><p class="hk-q2">${A(S.riderNote)}</p></div>${ctx.ui.btn(S.call, { variant: 'secondary', size: 'sm' })}</div>`;
}
function facts(ctx) {
  const S = sc(ctx);
  return `<dl class="hk-dl"><div><dt>${A(S.deliverToLabel)}</dt><dd>${A(S.deliverTo)}</dd></div><div><dt>${A(S.paidLabel)}</dt><dd>${A(S.paid)}</dd></div></dl>`;
}
const liveStatus = (ctx) => (ctx.status.find((s) => s.label === sc(ctx).status) || {}).id || sc(ctx).deliveries[0].status;
const liveTop = (ctx, cls = '') => `<div class="hk-live ${cls}">${ctx.ui.statusChip(liveStatus(ctx))}<h2 class="ui-display hk-eta">${A(sc(ctx).eta)}</h2><p class="hk-soft">${A(sc(ctx).pickup)}</p>${progress(ctx)}${riderRow(ctx)}</div>`;

const PH = { w: 390, h: 844, live: 320 };
const phoneTop = (ctx) => `${topbar(ctx, 'light').replace(/<div class="ui-topbar__links">[\s\S]*?<\/div>/, '')}${liveTop(ctx, 'hk-live--ph')}`;
function phone(ctx, h = PH.h) {
  const X = ex(ctx), S = sc(ctx), tabs = [...X.links.slice(0, 3), [X.account, 'user']];
  return `<div class="hk-ph" style="height:${h}px">${phoneTop(ctx)}<div class="hk-prows">${ctx.ui.deliveryRows(4)}</div><div class="hk-pfoot">${ctx.ui.btn(S.share || S.call, { block: true })}</div>`
    + `<nav class="ui-tabbar" aria-label="Sections">${tabs.map(([t, i], k) => `<a href="#"${k === 0 ? ' aria-current="page"' : ''}>${ctx.ui.icon(i, 20)}${A(t)}</a>`).join('')}</nav></div>`;
}
const screenPage = (ctx, K, lead, scr, rows, dark) => `<div class="hk-ttl hk-ttl--wide"><h1 class="hk-t">${A(K.page.title)}</h1><p class="hk-lead">${lead}</p></div>`
  + ui(scr, { cls: 'hk-ui--bare', dark, style: 'border:1px solid var(--ink)', label: `${ctx.brand.ui.screen.title}, built from the kit` })
  + sec('Measures', reg(rows.map(([n, v]) => [A(n), A(v)])), 'hk-mt');

export const pagesC = {
  // ---- dialog: the shipped dialog on its scrim, drawn large, its box and run of paddings dimensioned in x ----
  dialog(ctx, K) {
    const S = sc(ctx), D = S.dialog, bw = ctx.brand.ui.border;
    const maxW = shippedPx(ctx, '.ui-dialog', 'max-width'), pad = shippedPx(ctx, '.ui-dialog', 'padding'), gap = shippedPx(ctx, '.ui-dialog', 'gap');
    const actTop = shippedPx(ctx, '.ui-dialog__actions', 'margin-top'), btnH = shippedPx(ctx, '.ui-btn', 'height'), sp = shippedPx(ctx, '.ui-scrim', 'padding');
    const tt = T(ctx, 'title-s', { size: 20, line: 28 }), bt = T(ctx, 'body', { size: 16, line: 24 }), cw = maxW - 2 * bw - 2 * pad;
    const tl = wrap(dispFace(ctx, ctx.weights.heading), D.title, tt.size, cw, -0.01).length, xl = wrap(bodyFace(ctx, ctx.weights.regular), D.body, bt.size, cw).length;
    const W = maxW + 2 * sp, k = kFor(W, 1.5);
    const draw = drawing({
      k, km: kmFor(W), w: W, html: `<div class="ui-scrim">${ctx.ui.dialog(D)}</div>`,
      hdims: `<div class="hk-pl" style="--s:${sp}">${dimH(maxW, fx(ctx, maxW))}</div>`,
      vdims: `<div class="hk-pt" style="--s:${sp}">${chainV(ctx, [[bw + pad], [tl * tt.line], [gap], [xl * bt.line], [gap + actTop], [btnH], [pad + bw]])}</div>`,
      cap: `Dialog on its scrim, drawn at ${k}:1`,
    });
    const rows = [['Width', px4(ctx, maxW)], ['Padding', px4(ctx, pad)], ['Edge', px4(ctx, bw)], ['Gap', px4(ctx, gap)], ['Buttons', px4(ctx, btnH)]];
    return split(title(ctx, K, `A dialog stops the screen to ask one thing. The title asks it; ${A(D.keep)} and ${A(D.confirm)} answer it, the action on the right.`), draw)
      + sec('Measures', reg(rows.map(([n, v]) => [A(n), A(v)])), 'hk-mt');
  },

  // ---- table: the shipped table at size, header and row dimensioned; on a phone each row stacks, its cells labelled ----
  table(ctx, K) {
    const S = sc(ctx), u = ctx.ui, bw = ctx.brand.ui.border;
    const thH = shippedPx(ctx, '.ui-table th', 'height'), tdH = shippedPx(ctx, '.ui-table td', 'height');
    const bar = /inset (\d+(?:\.\d+)?)px 0 0/.exec(shipped(ctx, '.ui-table tbody tr[aria-selected="true"]', 'box-shadow'))[1];
    const heads = [S.deliverToLabel, 'When', 'Status', S.paidLabel];
    const sortBtn = (t, dir) => `<button type="button">${A(t)}${dir ? u.icon('arrow-up', 14) : ''}</button>`;
    const rowsH = S.deliveries.slice(0, 5).map((d, i) => `<tr${i === 0 ? ' aria-selected="true"' : ''}${i === 2 ? ' class="is-hover"' : ''}><td data-label="${A(heads[0])}">${A(d.to)}</td><td data-label="${A(heads[1])}">${A(d.when)}</td><td data-label="${A(heads[2])}">${u.statusChip(d.status)}</td><td class="is-num" data-label="${A(heads[3])}">${A(d.price)}</td></tr>`).join('');
    const table = `<table class="ui-table"><thead><tr><th scope="col" aria-sort="ascending">${sortBtn(heads[0], true)}</th><th scope="col">${A(heads[1])}</th><th scope="col">${A(heads[2])}</th><th scope="col" class="is-num">${sortBtn(heads[3])}</th></tr></thead><tbody>${rowsH}</tbody></table>`;
    const stage = `<div class="hk-tbf">${chainV(ctx, [[thH], [tdH]])}${ui(`<div class="hk-tbl">${table}</div>`, { cls: 'hk-ui--bare', label: 'Table' })}</div>${cap('Table at size. Header, then a row, in x.')}`;
    const notes = [['Header', px4(ctx, thH), `On ${hv('--raised')}, a ${fx(ctx, bw)} rule in ${hv('--text')} under it.`], ['Row', px4(ctx, tdH), `A ${hv('--divider')} hairline between rows. Status in words, never colour alone.`],
      ['Selected', `${bar} px bar`, `The first row: ${hv('--raised')} ground and a bar in ${hv('--action')}.`], ['Hover', '', `The third row: ${hv('--raised')} ground, on a pointer only.`]];
    return split(title(ctx, K, 'Read across, then down. Figures sit right in tabular numerals, so a column of totals lines up. A header that sorts is a button.'), stage)
      + sec('Rows', reg(notes.map(([n, v, t]) => [A(n), A(v), t]), 'hk-reg--3'), 'hk-mt');
  },

  // ---- empty: the shipped empty state on the dark surface, drawn large with its paddings in x; the same list while it loads, at size ----
  empty(ctx, K) {
    const S = sc(ctx), E = S.empty, u = ctx.ui, wd = 420, k = kFor(wd, 1.5);
    const pad = shippedPx(ctx, '.ui-empty', 'padding'), gap = shippedPx(ctx, '.ui-empty', 'gap'), btnH = shippedPx(ctx, '.ui-btn', 'height');
    const hd = T(ctx, 'headline', { size: 24, line: 32 }), bt = T(ctx, 'body', { size: 16, line: 24 }), bf = bodyFace(ctx, ctx.weights.regular);
    const tl = wrap(dispFace(ctx, ctx.weights.heading), E.title, hd.size, wd - 2 * pad, -0.01).length;
    const xl = wrap(bf, E.body, bt.size, Math.min(wd - 2 * pad, 36 * adv(bf, '0', bt.size))).length;
    const empty = `<div class="ui-empty"><h3 class="ui-empty__title">${A(E.title)}</h3><p class="ui-empty__text">${A(E.body)}</p>${u.btn(E.cta)}</div>`;
    const draw = drawing({ k, km: kmFor(wd), w: wd, dark: true, html: empty, hdims: dimH(wd, fx(ctx, wd)), vdims: chainV(ctx, [[pad], [tl * hd.line], [gap], [xl * bt.line], [gap], [btnH], [pad]]), cap: `Empty state, drawn at ${k}:1 on the dark surface` });
    const sk = (a, b) => `<li><div class="ui-row"><span class="ui-row__lead"></span><div class="hk-skr">${u.skeleton(a)}${u.skeleton(b)}</div></div></li>`;
    const loading = `<ul class="ui-list" aria-busy="true">${sk('62%', '38%')}${sk('48%', '30%')}${sk('56%', '42%')}</ul>`;
    return split(title(ctx, K, 'What is missing, and the one action that fills it. While a list loads it keeps its shape, so nothing jumps.'), draw)
      + sec('Loading, at size', ui(loading, { dark: true, label: 'Loading list' }), 'hk-mt');
  },

  // ---- the screens: the product's own list, live line and phone, built from the kit and nothing else ----
  'screen-light'(ctx, K) {
    const S = sc(ctx), F = S.form || {}, X = ex(ctx), u = ctx.ui;
    const form = `<div class="hk-form">${u.field({ id: 'hk-f1', label: F.size, kind: 'select', options: F.sizes, value: (F.sizes || [])[1] })}${u.field({ id: 'hk-f2', label: F.dropoff, value: F.dropoffValue })}${u.btn(F.book, { block: true })}</div>`;
    const scr = `<div class="hk-scr">${topbar(ctx, 'light', 0)}<div class="hk-main2"><div>${u.crumbs(X.crumbs)}<h2 class="ui-display hk-h2">${A(ctx.brand.ui.screen.title)}</h2>${u.tabs(X.tabs, 0)}${u.deliveryRows(4)}</div><div>${u.card({ title: F.title, raised: true, action: form })}</div></div></div>`;
    const tb = shippedPx(ctx, '.ui-topbar', 'height'), tab = shippedPx(ctx, '.ui-tabs [role="tab"]', 'height'), row = shippedPx(ctx, '.ui-row', 'min-height'), btn = shippedPx(ctx, '.ui-btn', 'height');
    return screenPage(ctx, K, `${A(ctx.brand.ui.screen.title)}, built from the kit at size. Nothing on the screen is drawn for this page. The filled button is the only ${hv('--action')} fill.`, scr,
      [['Top bar', px4(ctx, tb)], ['Tab', px4(ctx, tab)], ['Row, at least', px4(ctx, row)], ['Button', px4(ctx, btn)]], false);
  },

  'screen-dark'(ctx, K) {
    const S = sc(ctx), u = ctx.ui;
    const scr = `<div class="hk-scr">${topbar(ctx, 'dark', 0)}<div class="hk-main2"><div>${liveTop(ctx)}</div><div class="hk-side">${u.alert('warning', S.alert)}${facts(ctx)}${u.btn(S.share, { variant: 'secondary', block: true })}</div></div></div>`;
    const tb = shippedPx(ctx, '.ui-topbar', 'height'), hd = T(ctx, 'headline', { size: 24 }), pg = shippedPx(ctx, '.ui-progress', 'height'), btn = shippedPx(ctx, '.ui-btn', 'height');
    return screenPage(ctx, K, `The same markup under ${hv('data-theme="dark"')}. Only the token values change. The status says where things stand, in words, and the live line is the largest type in the kit.`, scr,
      [['Top bar', px4(ctx, tb)], ['Live line', px4(ctx, hd.size)], ['Progress', px4(ctx, pg)], ['Button', px4(ctx, btn)]], true);
  },

  'screen-mobile'(ctx, K) {
    const k = 0.7, tb = shippedPx(ctx, '.ui-topbar', 'height'), tabbar = shippedPx(ctx, '.ui-tabbar', 'height'), btn = shippedPx(ctx, '.ui-btn', 'height'), topH = tb + PH.live;
    const whole = drawing({ k, km: k, w: PH.w, html: phone(ctx), hdims: dimH(PH.w, fx(ctx, PH.w)), vdims: dimV(PH.h, fx(ctx, PH.h)), cap: `The whole screen at ${Math.round(k * 100)}%` });
    const top = drawing({ k: 1, km: 0.75, w: PH.w, html: `<div class="hk-ph" style="height:${topH}px">${phoneTop(ctx)}</div>`, hdims: dimH(PH.w, fx(ctx, PH.w)), vdims: chainV(ctx, [[tb], [PH.live]]), cap: `Top of the screen, ${PH.w} px wide, at size` });
    const rows = [['Top bar', px4(ctx, tb)], ['Tab bar', px4(ctx, tabbar)], ['Button', px4(ctx, btn)], ['Side margin', px4(ctx, 20)]];
    return `<div class="hk-ttl hk-ttl--wide"><h1 class="hk-t">${A(K.page.title)}</h1><p class="hk-lead">The whole screen at ${Math.round(k * 100)}%, and its top at size. One column, with the live line the largest thing on it, and the action and tab bar in reach of a thumb.</p></div>`
      + `<div class="hk-pair">${whole}${top}</div>` + sec('Measures', reg(rows.map(([n, v]) => [A(n), A(v)])), 'hk-mt');
  },

  // ---- tokens: every name and value read from the engine's token export; space drawn as bars at true length ----
  tokens(ctx, K) {
    const g = tokenGroups(ctx), L = colourMap(ctx, 'light'), D = colourMap(ctx, 'dark'), B = ctx.brand;
    const keys = Object.keys(L).filter((q) => !q.startsWith('status-')), per = Math.ceil(keys.length / 2), nSt = ctx.status.filter((s) => s.custom).length;
    const head = `<li class="hk-th"><span></span><span class="hk-lab">Role</span><span class="hk-lab">Light</span><span class="hk-lab">Dark</span></li>`;
    const col = (list) => `<ul class="hk-reg">${head}${list.map((q) => `<li><span style="display:flex;gap:2px">${swatch(L[q])}${swatch(D[q])}</span><span class="hk-rn">${hv('--' + q)}</span><span class="hk-rv">${hv(L[q])}</span><span class="hk-rq">${hv(D[q])}</span></li>`).join('')}</ul>`;
    const colour = `<div class="hk-tk">${col(keys.slice(0, per))}${col(keys.slice(per))}</div>${nSt ? cap(`And ${nSt} status ${nSt === 1 ? 'colour' : 'colours'}, each as ${hv('--status-id')}, ${hv('-bg')}, ${hv('-edge')} and ${hv('-text')}.`) : ''}`;
    const bars = ctx.space.map((s, i) => `<div class="hk-sp">${hv(`--sp-${i + 1}`)}<i style="width:${f2(s.px)}px"></i><span>${A(px4(ctx, s.px))}</span></div>`).join('');
    const lines = [...Object.entries(g.width), ['shadow-float', g.shadow['shadow-float']]];
    const two = (rows) => reg(rows.map(([n, v]) => [hv('--' + n), A(v)]));
    const typeRows = ctx.uiType.map((t) => [hv(t.token), A(`${t.size} / ${t.line}, ${t.weight}`)]);
    const fonts = [['--ff-display', B.fonts.display.family], ['--ff-body', B.fonts.body.family], ['--ff-mono', B.fonts.mono.family]];
    return `<div class="hk-ttl hk-ttl--wide"><h1 class="hk-t">${A(K.page.title)}</h1><p class="hk-lead">Every value the code package ships, read from ${hv('tokens.css')}. Colour roles in light and dark; the font stacks are ${hv('--ff-display')}, ${hv('--ff-body')} and ${hv('--ff-mono')}.</p></div>`
      + sec('Colour', colour) + sec('Space, at true length', `<div>${bars}</div>`, 'hk-mt')
      + `<div class="hk-pair hk-mt"><div>${sec('Radius', two(Object.entries(g.radius)))}<div style="margin-top:32px">${sec('Lines', two(lines))}</div><div style="margin-top:32px">${sec('Fonts', two(fonts.map(([n, f]) => [n.slice(2), f])))}</div></div>${sec('Type, size / line px, weight', reg(typeRows))}</div>`;
  },

  // ---- code: the install and the shipped tokens, printed on the brand's dark field at the size they are typed; the files beside ----
  code(ctx, K) {
    const F = sc(ctx).form || {};
    const install = `<link rel="stylesheet" href="fonts.css">\n<link rel="stylesheet" href="tokens.css">\n<link rel="stylesheet" href="components.css">\n\n<body class="ui">\n  <button class="ui-btn" type="button">\n    ${F.book || sc(ctx).call}\n  </button>\n</body>`;
    const want = ['surface', 'text', 'action', 'action-label'], all = tokensCss(ctx).split('\n');
    const block = (open) => {
      const i = all.indexOf(open), out = [open];
      for (let j = i + 1; j < all.length && all[j] !== '}'; j++) if (want.some((w) => all[j].startsWith(`  --${w}:`))) out.push(all[j]);
      if (i < 0 || out.length !== want.length + 1) throw new Error(`standards hk: tokens.css has no ${open} block with ${want.join(', ')}`);
      return [...out, '}'].join('\n');
    };
    const cssCut = `${block(':root {')}\n${block('[data-theme="dark"] {')}`;
    const tw = tailwindCss(ctx).split('\n'), ti = tw.indexOf('@theme inline {');
    const twCut = [tw[ti], ...tw.slice(ti + 1).filter((l) => ['surface', 'text', 'action'].some((w) => l.startsWith(`  --color-${w}:`))), '}'].join('\n');
    const pre = (label, code) => `<div><p class="hk-lab">${A(label)}</p><pre class="hk-pre" tabindex="0" role="region" aria-label="${A(label)}">${A(code)}</pre></div>`;
    const fams = new Set(ctx.faces.map((f) => f.family)).size;
    const files = [['README.md', 'How to install and use the kit.'], ['tokens.css', 'Custom properties, light and dark.'], ['tokens.json', 'The same tokens in W3C format.'], ['tokens.ts', 'A typed export of the same values.'], ['tailwind.css', 'A Tailwind v4 @theme block.'], ['components.css', 'Every component, built on tokens.'], ['example.html', 'Every component, light and dark.'], ['fonts.css', `@font-face rules, ${fams} families.`], ['assets/', `The logo, ${iconSet(ctx).length} icons, the fonts.`]];
    const code = `<div class="hk-code"><div class="hk-pair"><div class="hk-stk" style="gap:24px">${pre('Install', install)}${pre('Dark mode', '<html data-theme="dark">')}</div><div class="hk-stk" style="gap:24px">${pre('From tokens.css', cssCut)}${pre('From tailwind.css', twCut)}</div></div>`
      + `<p class="hk-cap" style="margin-top:24px">Light on ${hv(':root')}, dark on ${hv('[data-theme="dark"]')}, as the package ships them.</p></div>`;
    return split(title(ctx, K, 'Three stylesheets and a class. The tokens are plain custom properties, so there is no framework to install.'), `<ul class="hk-reg hk-files">${files.map(([n, d]) => `<li>${hv(n)}<p>${A(d)}</p></li>`).join('')}</ul>`)
      + sec('Install and tokens', code, 'hk-mt');
  },
};
