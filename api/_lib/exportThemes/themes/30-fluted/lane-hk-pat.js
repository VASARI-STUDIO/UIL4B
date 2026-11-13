// Theme 30, Fluted, kit site: the pattern and handoff pages (dialog, table, empty, screen-light, screen-dark, screen-mobile, tokens, code).
// The real components (ctx.ui) are placed, never restyled; the glass holds that page's own data: the scrim and the two answers, the table's columns, a screen's rows as their
// status colours, the phone's foot, every colour token in both modes, the package's files as tall as their lines. Every class here starts hk-.
import { A, adv, TXT } from './helpers.js';
import { colourMap, tokenGroups, tokensCss, tokensJson, tokensTs, tailwindCss } from '../../engine/tokens.js';
import { componentsCss, exampleHtml, iconSet } from '../../engine/components.js';
import { tower, win, box, columns, VW, VH, FLAT, P } from './lane-hk-glass.js';
import { frame, grp, cols, ui as region, v, sc, faint } from './lane-hk-parts.js';

const ex = (ctx) => sc(ctx).example || {};
const kn = (s) => `<span class="hk-kn">${A(s)}</span>`;
const tok = (s) => `<span class="hk-v">${A(s)}</span>`;
const titleOf = (K, id) => (K.pages.find((p) => p.id === id) || { title: id }).title;
// the colour a status is written in on a mode's surface (state is plain words in one colour)
function statusInk(M, s) {
  if (s.custom) return M[`status-${s.id}-text`];
  if (s.tone === 'action') return M['action-text'];
  if (s.tone === 'neutral') return M.text;
  return M[s.tone] || M.text;
}
// a button's width as componentsCss draws it: the label at the control size, sp-5 either side, the control edge both sides
function btnW(ctx, label) {
  const pad = parseFloat(tokenGroups(ctx).space['sp-5']) || 24;
  return adv(ctx, 'body', label, 16, 0, ctx.weights.medium) + 2 * pad + 2 * ctx.brand.ui.border;
}

// ---------------------------------------------------------------- the product's screen, built only from the shipped components and the brand's screen data
const wordmark = (ctx) => `<strong class="ui-display" style="font-size:var(--fs-title-s)">${A(ctx.brand.logo.showcase.wordmark || ctx.brand.name)}</strong>`;
const progress = (S) => `<div class="ui-progress" role="progressbar" aria-label="${A(S.status)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(S.progress * 100)}"><div class="ui-progress__bar"><i style="width:${S.progress * 100}%"></i></div><span class="ui-progress__dot" style="left:${S.progress * 100}%"></span></div><div class="hk-route ui-num"><span>${A(S.from)}</span><span>${A(S.to)}</span></div>`;
function liveColumn(ctx) {
  const S = sc(ctx), u = ctx.ui, live = S.deliveries[0];
  const who = `<ul class="ui-list">${u.row({ lead: `<span class="ui-avatar">${A(S.initials)}</span>`, title: S.rider, sub: S.riderNote, endHtml: u.btn(S.call, { variant: 'secondary', size: 'sm' }) })}</ul>`;
  return `<p class="hk-lbl">${A(ctx.brand.ui.screen.title)}</p><div class="hk-eta"><h2 class="ui-display hk-big2">${A(S.eta)}</h2>${u.statusChip(live.status)}</div><p class="hk-soft">${A(S.pickup)}</p><div>${progress(S)}</div>${who}`;
}

function screenPage(ctx, K, id, mode) {
  const S = sc(ctx), X = ex(ctx), u = ctx.ui, M = colourMap(ctx, mode);
  const links = X.links ? `<div class="ui-topbar__links">${u.links(X.links, 0)}</div>` : '';
  const scr = `<div class="hk-scr"><nav class="ui-topbar" aria-label="Main">${wordmark(ctx)}${links}<span class="ui-num hk-soft">${A(S.time)}</span></nav>`
    + `<div class="hk-scrmain"><section class="hk-col">${liveColumn(ctx)}${u.btn(S.share, { variant: 'secondary', block: true })}</section><section class="hk-col">${X.tabs ? u.tabs(X.tabs, 0) : ''}${u.deliveryRows(5)}</section></div></div>`;
  const rowsD = S.deliveries.slice(0, 5), n = rowsD.length;
  return frame(ctx, K, {
    title: titleOf(K, id), mode, show: scr,
    lead: `${A(ctx.brand.ui.screen.title)}, the product's main screen on the ${mode} surface. In the glass, the list's rows as the colours their status is written in.`,
    build: () => {
      const cl = columns(n);
      return {
        art: rowsD.map((d, i) => tower(cl.x(i), cl.cw, 0, { fill: statusInk(M, ctx.status.find((x) => x.id === d.status)) })).join(''),
        items: rowsD.map((d, i) => ({ x: cl.x(i), w: cl.cw + P, a: A(ctx.status.find((x) => x.id === d.status).label), b: A(d.to) })),
        note: `Each window is a row of the list, in the colour its status is written in on the ${mode} surface.`,
      };
    },
  });
}

export const pages = {
  // ---- dialog: the product's one question over its scrim; the scrim runs on into the glass, and in it the two answers stand k times their size ----
  dialog: (ctx, K) => {
    const D = sc(ctx).dialog || {}, u = ctx.ui, R = ctx.radius;
    const dlg = u.dialog({ title: D.title, body: D.body, confirm: D.confirm, keep: D.keep }).replace(/dlg-t/g, 'hk-dlg-t');
    return frame(ctx, K, {
      title: titleOf(K, 'dialog'), lead: 'A dialog asks one question and holds the screen behind it on the scrim. The way out is on the left and the answer on the right; Esc and a click on the scrim close it.',
      show: region(`<div class="ui-scrim hk-scrim">${dlg}</div>`),
      build: (M) => {
        const wk = btnW(ctx, D.keep), wc = btnW(ctx, D.confirm), gap = 12, k = Math.max(1, Math.min(4, Math.floor((952 - 96) / ((wk + wc + gap) * 1.03))));
        const H = 44 * k, y = Math.round(FLAT + (384 - H) / 2), right = 1020 - 48, xc = Math.round(right - wc * k), xk = Math.round(xc - gap * k - wk * k), sw = Math.max(2, ctx.brand.ui.border * k);
        const art = box(60, 0, 960, VH, 0, { fill: M.scrim }) + box(xk, y, Math.round(wk * k), H, R.button * k, { fill: M.surface }) + box(xk, y, Math.round(wk * k), H, R.button * k, { stroke: M.edge, sw })
          + box(xc, y, Math.round(wc * k), H, R.button * k, { fill: M.action }) + (M['action-edge'] ? box(xc, y, Math.round(wc * k), H, R.button * k, { stroke: M['action-edge'], sw }) : '');
        return {
          art,
          items: [{ x: 60, w: Math.max(120, xk - 72), a: `The two answers ${k} times their size`, b: tok(`44 px high, ${R.button} px corners`) },
            { x: xk, w: Math.round(wk * k) + 12, a: A(D.keep), b: tok(`Secondary, ${Math.round(wk)} px`) }, { x: xc, w: Math.round(wc * k), a: A(D.confirm), b: tok(`Primary, ${Math.round(wc)} px`) }],
          note: `The dialog: 440 px at most, a ${parseFloat(tokenGroups(ctx).space['sp-5'])} px padding, a ${ctx.brand.ui.border} px edge, on the scrim, ${tok(M.scrim.toUpperCase())}.`,
        };
      },
    });
  },

  // ---- table: the list as a data table, sorted by its first column; each column runs on into the glass at its own share of the width ----
  table: (ctx, K) => {
    const S = sc(ctx), u = ctx.ui, W = ctx.weights;
    const heads = ['Item', 'Detail', 'Status', S.paidLabel || 'Total'];
    const rowsD = S.deliveries.slice().sort((a, b) => a.to.localeCompare(b.to, 'en-AU', { numeric: true }));
    const lab = (s) => (ctx.status.find((x) => x.id === s) || {}).label || '';
    const need = [
      Math.max(adv(ctx, 'body', heads[0], 13, 0, W.medium) + 24, ...rowsD.map((d) => adv(ctx, 'body', d.to, 15, 0, W.regular))),
      Math.max(adv(ctx, 'body', heads[1], 13, 0, W.medium) + 24, ...rowsD.map((d) => adv(ctx, 'body', d.when, 15, 0, W.regular))),
      Math.max(adv(ctx, 'body', heads[2], 13, 0, W.medium), ...rowsD.map((d) => adv(ctx, 'body', lab(d.status), 13, 0, W.medium))),
      Math.max(adv(ctx, 'body', heads[3], 13, 0, W.medium) + 24, ...rowsD.map((d) => adv(ctx, 'body', d.price, 15, 0, W.regular))),
    ].map((w) => Math.ceil(w * 1.05) + 24);
    const spare = Math.max(0, 952 - need.reduce((a, b) => a + b, 0)), cw = [need[0] + Math.floor(spare * 0.55), need[1] + spare - Math.floor(spare * 0.55), need[2], need[3]], sum = cw.reduce((a, b) => a + b, 0);
    const sortBtn = (t, on) => `<button type="button">${A(t)}${on ? u.icon('chevron-right', 14) : ''}</button>`;
    const body = rowsD.map((d, i) => `<tr${i === 0 ? ' aria-selected="true"' : ''}${i === 2 ? ' class="is-hover"' : ''}><td>${A(d.to)}</td><td class="ui-num">${A(d.when)}</td><td>${u.statusChip(d.status)}</td><td class="is-num">${A(d.price)}</td></tr>`).join('');
    const tbl = `<table class="ui-table hk-tbl"><colgroup>${cw.map((w) => `<col style="width:${(w / sum * 100).toFixed(2)}%">`).join('')}</colgroup><thead><tr><th scope="col" aria-sort="ascending">${sortBtn(heads[0], true)}</th><th scope="col">${sortBtn(heads[1])}</th><th scope="col">${A(heads[2])}</th><th scope="col" class="is-num">${sortBtn(heads[3])}</th></tr></thead><tbody>${body}</tbody></table>`;
    const notes = `<p class="hk-d"><span class="hk-kn">Selected</span> ${A(rowsD[0].to)}<br><span class="hk-kn">Hover</span> ${A(rowsD[2].to)}<br><span class="hk-kn">Sorted</span> ${A(heads[0])}, ascending</p>`;
    const align = ['Left', 'Left', 'Left', 'Right, tabular'];
    return frame(ctx, K, {
      title: titleOf(K, 'table'), lead: 'The list as a table, sorted by its first column. A sortable header is a button; the last column sits right in tabular figures. Rows rest, take the raised ground on hover, and carry a bar in the action colour when selected.',
      show: `<div class="hk-tw">${region(tbl)}</div>${notes}`,
      build: (M) => {
        const art = [], items = [];
        let x = 60;
        cw.forEach((w, i) => {
          const ww = Math.round(w / sum * 960 / P) * P, wi = ww - 12;
          art.push(i === 0 ? tower(x + 6, wi, 0, { fill: M.action }) : tower(x + 6, wi, FLAT + 48, { stroke: M.text, sw: 2 }));
          items.push({ x: x + 6, w: wi, a: A(heads[i]), b: tok(`${Math.round(w / sum * 100)}% of the width, ${align[i].toLowerCase()}`) });
          x += ww;
        });
        return { art: art.join(''), items, note: 'Each column runs on into the glass at its own share of the width. Solid: the sorted column. Rows are 44 px under a header, then 52 px each.' };
      },
    });
  },

  // ---- empty: first run in three frames, loading, empty, the first one added; each frame runs on into the glass in its own ground ----
  empty: (ctx, K) => {
    const S = sc(ctx), E = S.empty || {}, u = ctx.ui;
    const frames = [
      ['Loading', `<div class="hk-well">${u.spinner()}${u.skeleton('84%')}${u.skeleton('56%')}${u.skeleton('70%')}</div>`, 'sunken'],
      ['Empty', `<div class="ui-empty"><h3 class="ui-empty__title">${A(E.title)}</h3><p class="ui-empty__text">${A(E.body)}</p>${u.btn(E.cta)}</div>`, 'raised'],
      ['The first one', `<div class="hk-stackg">${u.deliveryRows(1)}${u.toast(S.toast)}</div>`, 'surface'],
    ];
    return frame(ctx, K, {
      title: titleOf(K, 'empty'), lead: 'First run, in the order a new account sees it. While it loads, the shape of the list; when there is nothing, say what is missing and offer the one action that fixes it; then the first one, confirmed.',
      show: cols(3, frames.map(([t, inner]) => grp(t, region(inner))).join('')),
      build: (M) => {
        const cl = columns(3, { gap: 24 });
        return {
          art: frames.map(([, , t], i) => win(cl.x(i), cl.cw, (2 - i) * 64, { fill: M[t], ring: faint(ctx, M, M[t]) ? M.quiet : null })).join(''),
          items: frames.map(([n, , t], i) => ({ x: cl.x(i), w: cl.cw + 24, a: A(n), b: tok(`--${t} ${M[t].toUpperCase()}`) })),
          note: 'Each frame runs on into the glass in the ground it sits on, each a step higher than the one before it in time.',
        };
      },
    });
  },

  'screen-light': (ctx, K) => screenPage(ctx, K, 'screen-light', 'light'),
  'screen-dark': (ctx, K) => screenPage(ctx, K, 'screen-dark', 'dark'),

  // ---- screen-mobile: the product at 390 px and 1:1, on the light surface; the phone's screen runs on behind the glass to its foot and tab bar ----
  'screen-mobile': (ctx, K) => {
    const S = sc(ctx), X = ex(ctx), u = ctx.ui, PW = 390, TB = 64;
    const tabs = (X.links || []).slice(0, 4), links = tabs.length ? `<nav class="ui-tabbar" aria-label="Sections">${tabs.map(([t, i], j) => `<a href="#"${j === 0 ? ' aria-current="page"' : ''}>${i ? u.icon(i, 20) : ''}${A(t)}</a>`).join('')}</nav>` : '';
    const scr = `<div class="hk-scr hk-phonescr"><div class="hk-top2"><span class="ui-num hk-soft">${A(S.time)}</span>${wordmark(ctx)}</div><section class="hk-col">${liveColumn(ctx)}${u.btn(S.share, { variant: 'secondary', block: true })}</section>${links}</div>`;
    return frame(ctx, K, {
      title: titleOf(K, 'screen-mobile'), mode: 'light', lead: `${A(ctx.brand.ui.screen.title)} at ${PW} px, the width of a phone, on the light surface. The same components as the desktop screen, in one column.`, show: scr,
      build: (M) => ({
        art: tower(60, PW, 0, { r: 0, stroke: M.edge, sw: 2 }) + box(60, VH - TB, PW, 2, 0, { fill: M.divider }) + (tabs.length ? box(60, VH - TB, Math.round(PW / tabs.length), 4, 0, { fill: M.action }) : ''),
        items: [{ x: 60, w: PW, a: `${PW} px wide, 1:1`, b: tok(`The tab bar, ${TB} px, at the foot`) }, { x: 480, w: 540, a: '', b: `In the glass, the phone's screen to its foot: the tab bar's hairline and the active tab${X.tabs ? `, ${A(X.tabs[0])}` : ''}, in the action colour.` }],
      }),
    });
  },

  // ---- tokens: every token name and value from ctx, in the theme's mono; every colour token as a window, its light value above and its dark value below ----
  tokens: (ctx, K) => {
    const g = tokenGroups(ctx), L = colourMap(ctx, 'light'), D = colourMap(ctx, 'dark'), names = Object.keys(L), nc = names.length, steps = ctx.uiType.map((s) => s.token);
    const total = nc + ['space', 'radius', 'width', 'font', 'text', 'shadow'].reduce((a, k) => a + Object.keys(g[k]).length, 0);
    const sw = (h) => `<i class="hk-dot" style="background:${h}"></i>`;
    const colour = grp('Colour', `<ul class="hk-tkc"><li class="hk-tkh"><span>Name</span><span>Light</span><span>Dark</span></li>${names.map((k) => `<li><span class="hk-v hk-tn">${A('--' + k)}</span><span class="hk-v">${sw(L[k])}${A(L[k].toUpperCase())}</span><span class="hk-v">${sw(D[k])}${A(D[k].toUpperCase())}</span></li>`).join('')}</ul>`);
    const list = (rowsX, plain) => `<ul class="hk-tkl">${rowsX.map(([k, val]) => `<li><span class="hk-v">${A(plain ? k : '--' + k)}</span><span class="hk-v hk-tv">${A(String(val))}</span></li>`).join('')}</ul>`;
    const rest = cols(4, grp('Space', list(Object.entries(g.space))) + `<div class="hk-stackg">${grp('Radius', list(Object.entries(g.radius)))}${grp('Border width', list(Object.entries(g.width)))}</div>`
      + grp('Type: --fs-, --lh-, --fw-', list(steps.map((s) => [s, `${g.text['fs-' + s]} ${g.text['lh-' + s]} ${g.text['fw-' + s]}`]), true))
      + `<div class="hk-stackg">${grp('Fonts', list(Object.entries(g.font)))}${grp('Shadow', list(Object.entries(g.shadow)))}</div>`);
    return frame(ctx, K, {
      title: titleOf(K, 'tokens'), lead: `${total} tokens, as the code package writes them. Colour names a job and keeps its name in dark; only the value swaps. In the glass, every colour token in the table's order: its light value above the middle and its dark value below.`,
      show: colour + rest,
      build: (M) => {
        const cw = Math.floor((960 - P * (nc - 1)) / nc), mid = Math.round(VH / 2 / P) * P, art = [];
        names.forEach((k, i) => {
          const x = 60 + i * (cw + P);
          art.push(win(x, cw, 0, { fill: L[k], ring: faint(ctx, M, L[k]) ? M.quiet : null }), box(x, mid, cw, VH - mid, 0, { fill: D[k] }), faint(ctx, M, D[k]) ? box(x, mid, cw, VH - mid, 0, { stroke: M.quiet, sw: 2 }) : '');
        });
        return { art: art.join(''), items: [{ x: 60, w: 960, a: '', b: `Values in px are written as the stylesheet reads them; the type steps give size, line and weight in that order.` }] };
      },
    });
  },

  // ---- code: what is in the package and the three lines that install it; the files the tokens and components become, as tall as their lines ----
  code: (ctx, K) => {
    const F = sc(ctx).form || {}, fams = [...new Set(ctx.faces.map((f) => f.family))];
    const files = [
      ['README.md', 'Install, use, token names, light and dark, accessibility.'],
      ['tokens.css', 'Custom properties: light on :root, dark on data-theme and the system setting.'],
      ['tokens.json', 'The same tokens in the design token format, a dark value on each colour.'],
      ['tokens.ts', 'A typed export of the same values.'],
      ['tailwind.css', 'A Tailwind v4 @theme block mapped to the tokens.'],
      ['components.css', 'A class for every component in this kit, built only on the tokens.'],
      ['example.html', 'Every component live, with a light and dark switch.'],
      ['fonts.css', `@font-face rules for ${fams.join(' and ')}.`],
      ['assets/', `The logo, ${iconSet(ctx).length} icons and the font files.`],
    ];
    const install = `<link rel="stylesheet" href="fonts.css">\n<link rel="stylesheet" href="tokens.css">\n<link rel="stylesheet" href="components.css">\n\n<body class="ui">\n  <button class="ui-btn" type="button">\n    ${F.book || 'Save'}\n  </button>\n</body>`;
    const blocks = [['Install', install], ['Dark mode', '<html data-theme="dark">'], ['Tailwind v4', '@import "tailwindcss";\n@import "./tokens.css";\n@import "./tailwind.css";']];
    const snip = ([t, c]) => grp(t, `<pre class="hk-pre">${A(c)}</pre><button class="hk-btn hk-copy" type="button" data-copy="${A(c)}" data-copy-name="${A(t)}"><span data-copy-text>Copy</span></button>`);
    const show = cols(2, grp('In the package', `<ul class="hk-files">${files.map(([n, d]) => `<li><span class="hk-v">${A(n)}</span><span class="hk-d">${A(d)}</span></li>`).join('')}</ul>`) + `<div class="hk-stackg">${blocks.map(snip).join('')}</div>`);
    const out = [['tokens.css', tokensCss(ctx)], ['tokens.json', JSON.stringify(tokensJson(ctx), null, 2) + '\n'], ['tokens.ts', tokensTs(ctx)], ['tailwind.css', tailwindCss(ctx)], ['components.css', componentsCss(ctx)], ['example.html', exampleHtml(ctx)]];
    const lines = out.map(([, s]) => s.replace(/\n$/, '').split('\n').length), top = Math.max(...lines);
    return frame(ctx, K, {
      title: titleOf(K, 'code'), lead: 'Plain CSS, no framework. Copy the folder, link three stylesheets and put the class ui on the body. Colour tokens name a job; dark swaps the values and keeps the names.', show,
      build: (M) => {
        const cl = columns(out.length), un = VH / top;
        return {
          art: out.map((_, i) => tower(cl.x(i), cl.cw, Math.round(VH - lines[i] * un), { fill: M.action })).join(''),
          items: out.map(([nm], i) => ({ x: cl.x(i), w: cl.cw + P, a: `<span class="hk-v">${A(nm)}</span>`, b: `${lines[i]} lines` })),
          note: 'In the glass, the six files written from the tokens and the components, each as tall as its lines for this brand.',
        };
      },
    });
  },
};
