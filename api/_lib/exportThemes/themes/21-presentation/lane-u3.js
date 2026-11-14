// Lane u3 for theme 21 (UI kit screens and code): dialog, table, empty, screen-light, screen-dark, screen-mobile, tokens, code.
// The kit speaks the guidelines' slide language: full-height fields in the brand's role colours meeting at straight edges, one big thing a slide,
// chrome at 12 to 15 px, and the one running head at y 28 with a three-digit folio. Every component is the real ctx.ui markup inside a .ui region, so
// the page documents what the code package ships. Token names, values and code are read from engine/tokens.js, never typed. Styles: u3- classes below.
import { deliveryRows, noPrices } from './once.js';
import { colourMap, tokenGroups, tokensCss, tokensJson, tokensTs, tailwindCss } from '../../engine/tokens.js';
import { componentsCss, exampleHtml } from '../../engine/components.js';
import { A, dispW, textW, topForBaseline, greedy, fitOne, lineHtml, bodyLines, px, L, byRole, inkOn, chromeOn, softOn, box, field, p, mono, grid, head, page, uiR, sc, logoAt } from './lane-u3-lib.js';

// a note: a label in the body face at 15/600, then its text as measured lines at 15/24
const note = (ctx, x, y, w, label, text, ink, soft) => box(x, y, w, 0, '', p('r-t15 r-w600', label, `color:${ink}`) + p('r-t15', bodyLines(ctx, text, 15, w), `color:${soft}`));
// the Statement slide's note: a 2 px rule in the ink, 14 px, then the note
const ruled = (ctx, x, y, w, label, text, ink, soft) => box(x, y, w, 2, `background:${ink}`) + note(ctx, x, y + 16, w, label, text, ink, soft);
// a spec row: token in mono, then its value, then what it is for, each in a fixed column so rows line up
const spec = (x, y, w, tok, val, use, ink, quiet) => box(x, y, w, 16, `color:${ink}`, `<p class="r-t12 r-nw u3-sr">${mono(tok)}${mono(val)}<span style="color:${quiet}">${A(use)}</span></p>`);
// the navigation the brand's screens carry: its example links, then the account item when it is not already one of them
const navItems = (ctx) => { const X = sc(ctx).example || {}, links = X.links || [], acc = X.account; return acc && !links.some(([t]) => t === acc) ? [...links, [acc, 'user']] : links; };
const pct = (k) => `${Math.round(k * 100)}%`;
// the live status (the first delivery's) and whether it is shown in the action colour
const liveIsAction = (ctx) => ctx.status.find((s) => s.id === sc(ctx).deliveries[0].status)?.tone === 'action';

// ---- the Track screen, as the code package's components build it (the markup of uikit.js, with the brand's logo and its own navigation) ----
const progress = (S) => `<div class="ui-progress" role="progressbar" aria-label="Progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(S.progress * 100)}"><div class="ui-progress__bar"><i style="width:${S.progress * 100}%"></i></div><span class="ui-progress__dot" style="left:${S.progress * 100}%"></span></div><div class="ks-route"><span>${A(S.from)}</span><span>${A(S.to)}</span></div>`;
const riderRow = (ctx, S) => `<div class="ks-rider"><span class="ui-avatar">${A(S.initials)}</span><div class="ks-rmain"><p class="ks-rname">${A(S.rider)}</p><p class="ks-rsub">${A(S.riderNote)}</p></div>${ctx.ui.btn(S.call, { variant: 'secondary', size: 'sm', iconLeft: 'phone' })}</div>`;
const detailRows = (S) => `<dl class="ks-detail"><div><dt>${A(S.deliverToLabel)}</dt><dd>${A(S.deliverTo)}</dd></div><div><dt>${A(S.paidLabel)}</dt><dd class="ui-num">${A(S.paid)}</dd></div></dl>`;
const DESK = 1280;   // the desktop screen's own width in CSS px; the page shows it zoomed
function desktop(ctx, dark, k) {
  const S = sc(ctx), ui = ctx.ui, R = dark ? ctx.roles.dark : L(ctx), nav = navItems(ctx), list = (S.example && S.example.crumbs && S.example.crumbs[0]) || ctx.brand.ui.screen.title;
  const logo = logoAt(ctx, 'horizontal', 112, { colourway: dark ? 'reversed' : 'colour', ink: R.text, k });
  return `<div class="ui kscreen u3-desk"${dark ? ' data-theme="dark"' : ''} style="width:${DESK}px">
<nav class="ui-topbar" aria-label="Main">${logo}<div class="ui-topbar__links">${ui.links(nav.slice(0, 3), 0)}</div><span class="ks-clock ui-num">${A(S.time)}</span></nav>
<div class="ks-main">
<section class="ks-track" aria-label="${A(ctx.brand.ui.screen.title)}">
<p class="ks-title">${A(ctx.brand.ui.screen.title)}</p>
<div class="ks-eta"><h2 class="ui-display ks-time">${A(S.eta)}</h2>${ui.statusChip(S.deliveries[0].status)}</div>
<p class="ks-pickup">${A(S.pickup)}</p>
<div class="ks-prog">${progress(S)}</div>
${riderRow(ctx, S)}
${detailRows(S)}
${ui.btn(S.share, { variant: 'secondary', block: true })}
</section>
<section class="ks-deliv" aria-label="${A(list)}"><p class="ks-title">${A(list)}</p>${deliveryRows(ctx, 4)}<div class="ks-book">${ui.btn(S.form.book, { iconRight: 'arrow-right' })}</div></section>
</div></div>`;
}
function phone(ctx, k) {
  const S = sc(ctx), ui = ctx.ui, nav = navItems(ctx);
  const logo = logoAt(ctx, 'horizontal', 84, { colourway: 'colour', ink: L(ctx).text, k });
  return `<div class="ui kphone r-ph u3-phone">
<div class="kph-top"><span class="ui-num">${A(S.time)}</span>${logo}</div>
<div class="kph-body">
<span class="kph-chip">${ui.statusChip(S.deliveries[0].status)}</span>
<h2 class="ui-display kph-time">${A(S.eta)}</h2>
<p class="ks-pickup">${A(S.pickup)}</p>
<div class="ks-prog">${progress(S)}</div>
${riderRow(ctx, S)}
${detailRows(S)}
${ui.btn(S.share, { variant: 'secondary', block: true })}
</div>
<nav class="ui-tabbar" aria-label="Sections" style="grid-template-columns:repeat(${nav.length},1fr)">${nav.map(([t, i], n) => `<a href="#"${n === 0 ? ' aria-current="page"' : ''}>${ui.icon(i, 20)}${A(t)}</a>`).join('')}</nav>
</div>`;
}

// the two desktop pages share one slide: the screen at 82% on a field across the top, four notes on the white under it
const DESK_H = 560;
function screenPage(ctx, id, dark) {
  const W = ctx.size.w, H = ctx.size.h, R = L(ctx), k = 0.82, sw = DESK * k, sh = DESK_H * k, sx = (W - sw) / 2, sy = 88, fh = sy + sh + 40;
  const white = R.surface, fieldBg = dark ? R.sunken : byRole(ctx, 'action').hex, ink = R.text, q = chromeOn(ctx, white), act = byRole(ctx, 'action'), G = grid(ctx), w = G.span(3);
  let out = field(0, 0, W, fh, fieldBg);
  out += box(sx, sy, sw, sh, '', `<div style="zoom:${k}">${desktop(ctx, dark, k).replace('class="ui kscreen u3-desk"', `class="ui kscreen u3-desk" data-h="${DESK_H}"`).replace(`style="width:${DESK}px"`, `style="width:${DESK}px;height:${DESK_H}px"`)}</div>`);
  const Lm = colourMap(ctx, 'light'), Dm = colourMap(ctx, 'dark'), y = fh + 16;
  const small = (x, label, text) => box(x, y, w, 0, '', p('r-t15 r-w600 r-nw', label, `color:${ink}`) + p('r-t12', bodyLines(ctx, text, 12, w), `color:${q}`));
  out += small(G.col(0), A(ctx.brand.ui.screen.title), `${dark ? 'Dark' : 'Light'}, at ${DESK} px wide, shown at ${pct(k)}.`);
  if (dark) {
    out += small(G.col(3), 'Same markup', 'One attribute on the root swaps every colour value. The token names stay.');
    out += small(G.col(6), act.name, 'The action and its label keep their values, so a button reads alike in both modes.');
    out += box(G.col(9), y + 4, w, 16, `color:${ink}`, p('r-t12 r-nw', mono('data-theme="dark"')));
    ['surface', 'text'].forEach((t, i) => { out += box(G.col(9), y + 24 + i * 16, w, 16, `color:${q}`, `<p class="r-t12 r-nw u3-tv">${mono('--' + t)}${mono(Lm[t])}${mono(Dm[t])}</p>`); });
  } else {
    out += small(G.col(3), 'One large line', 'The time is the only line set in the display face.');
    out += small(G.col(6), act.name, liveIsAction(ctx) ? 'Marks the live status, the progress dot and the one primary button.' : 'Fills the progress dot and the one primary button.');
    ['surface', 'action'].forEach((t, i) => { out += box(G.col(9), y + 4 + i * 20, w, 16, `color:${ink}`, `<p class="r-t12 r-nw u3-t2">${mono('--' + t)}${mono(Lm[t])}</p>`); });
  }
  return page(id, out + head(ctx, id, { left: [fieldBg] }), white);
}

// the reference sheet: a token name and its value, in two mono columns
const tline = (x, y, w, tok, val, ink, cls = 'u3-t2') => box(x, y, w, 16, `color:${ink}`, `<p class="r-t12 r-nw ${cls}">${mono(tok)}${mono(val)}</p>`);
// css as lines for the code page: the property in one ink, its value in another, comments quiet
// takes whole lines from the top while their wrapped rows fit `rows` at width w, measured with the brand's mono face; returns the html and the lines used
function codeLines(ctx, text, rows, w, { prop, val, quiet }) {
  const all = text.split('\n'), take = [];
  let used = 0;
  for (const l of all) { const r = Math.max(1, Math.ceil(textW(ctx, 'mono', 400, l || ' ', 12) / w)); if (used + r > rows) break; used += r; take.push(l); }
  return { n: take.length, total: all.length, html: take.map((l) => {
    const m = /^(\s*)(--[\w-]+)(:\s*)(.*)$/.exec(l);
    if (m) return `<span class="u3-cl">${A(m[1])}<span style="color:${prop}">${A(m[2])}</span>${A(m[3])}<span style="color:${val}">${A(m[4])}</span></span>`;
    if (/^\s*\/?\*/.test(l)) return `<span class="u3-cl" style="color:${quiet}">${A(l)}</span>`;
    return `<span class="u3-cl" style="color:${val}">${A(l) || ' '}</span>`;
  }).join('') };
}

export const uikit = {
  // Dialog: the confirmation at 140% on a full-height scrim field, the way a reader meets it; what each part does runs down the white beside it.
  dialog(ctx) {
    const W = ctx.size.w, H = ctx.size.h, R = L(ctx), S = sc(ctx), D = S.dialog, ui = ctx.ui, M = colourMap(ctx, 'light'), g = tokenGroups(ctx);
    const sx = 768, k = 1.4, dw = 440, white = R.surface, chS = chromeOn(ctx, R.scrim), ink = R.text, soft = softOn(ctx, white), q = chromeOn(ctx, white);
    const dlg = ui.dialog({ title: D.title, body: D.body, confirm: D.confirm, keep: D.keep, danger: true }).replace(/dlg-t/g, 'u3-dlg');
    let out = field(0, 0, sx, H, R.scrim);
    out += box((sx - dw * k) / 2, 0, dw * k, H, 'display:flex;flex-direction:column;justify-content:center', uiR(dlg, { st: `zoom:${k};width:${dw}px` }));
    out += box(56, H - 56, sx - 112, 16, `color:${chS}`, p('r-t12 r-nw', `The confirmation, shown at ${pct(k)} on the ${mono('--scrim')} ground.`));
    const x = sx + 56, w = W - sx - 112;
    out += box(x, 104, w, 0, `color:${ink}`, p('r-lead', bodyLines(ctx, 'A dialog asks one question, and its two buttons answer it.', 22, w, 500)));
    let y = 264;
    for (const [label, text] of [
      [D.keep, 'The safe answer comes first, and focus lands on it.'],
      [D.confirm, 'Names what happens. The danger fill is kept for an action that loses something.'],
      ['Esc, or the scrim', `Both close the dialog, the same as ${D.keep}.`],
    ]) { const n = greedy(ctx, 'body', 400, text, 15, w).length; out += note(ctx, x, y, w, A(label), text, ink, soft); y += 24 + n * 24 + 24; }
    const rows = [['--r-card', g.radius['r-card'], 'Corner'], ['--w-control', g.width['w-control'], 'Edge, in --text'], ['--scrim', M.scrim, 'The ground behind it'], ['--shadow-float', g.shadow['shadow-float'], 'Elevation']];
    rows.forEach(([t, v, u], i) => { out += spec(x, H - 56 - (rows.length - i) * 20 + 4, w, t, v, u, ink, q); });
    return page('dialog', out + head(ctx, 'dialog', { left: [R.scrim], right: [white] }), white);
  },

  // Table: the real table across the slide at its true size, sorted, with a selected and a hovered row; the four rules stand under it on the panel.
  table(ctx) {
    const W = ctx.size.w, H = ctx.size.h, R = L(ctx), S = sc(ctx), ui = ctx.ui, G = grid(ctx), act = byRole(ctx, 'action');
    const sortBtn = (t, dir) => `<button type="button">${A(t)}${dir ? ui.icon(dir === 'asc' ? 'arrow-up' : 'arrow-down', 14) : ''}</button>`;
    const D = S.deliveries;
    const rows = D.map((d, i) => `<tr${i === 0 ? ' aria-selected="true"' : ''}${i === 2 ? ' class="is-hover"' : ''}><td>${A(d.to)}</td><td class="ui-num">${A(d.when)}</td><td>${ui.statusChip(d.status)}</td>${noPrices(ctx) ? '' : `<td class="is-num">${A(d.price)}</td>`}</tr>`).join('');
    const table = `<table class="ui-table"><thead><tr><th scope="col" aria-sort="ascending">${sortBtn(S.deliverToLabel, 'asc')}</th><th scope="col">${sortBtn('When')}</th><th scope="col">Status</th>${noPrices(ctx) ? '' : `<th scope="col" class="is-num">${sortBtn(S.paidLabel)}</th>`}</tr></thead><tbody>${rows}</tbody></table>`;
    const fy = 472, panel = R.sunken, ink = R.text, soft = softOn(ctx, panel);
    let out = box(56, 104, W - 112, 0, '', uiR(table));
    out += field(0, fy, W, H - fy, panel);
    const w = G.span(3);
    [
      ['Sorted', `A header that sorts is a button. The sorted one shows its direction: ${S.deliverToLabel}, ascending.`],
      ['Selected', `The first row. The raised ground, with a bar in ${act.name} on its left edge.`],
      ['Hover', 'The third row. The ground steps up to raised, on pointer devices only.'],
      ['Numbers', 'Sit right and use tabular figures, so a column of prices lines up.'],
    ].forEach(([l, t], i) => { out += ruled(ctx, G.col(i * 3), fy + 40, w, A(l), t, ink, soft); });
    return page('table', out + head(ctx, 'table'), R.surface);
  },

  // Empty: the empty state at 140% fills a raised field, which is the ground it ships on, so it has no edge; the first run stands at its true size on the white.
  empty(ctx) {
    const W = ctx.size.w, H = ctx.size.h, R = L(ctx), S = sc(ctx), F = S.form, E = S.empty, ui = ctx.ui, fx = 512, k = 1.4, ew = 480;
    const white = R.surface, ink = R.text, soft = softOn(ctx, white), q = chromeOn(ctx, white), chR = chromeOn(ctx, R.raised);
    const none = `<div class="ui-empty"><h3 class="ui-empty__title">${A(E.title)}</h3><p class="ui-empty__text">${A(E.body)}</p>${ui.btn(E.cta)}</div>`;
    const first = `<div class="ui-empty"><h3 class="ui-empty__title">${A(F.title)}</h3><ol class="u3-steps">${[F.pickup, F.dropoff, F.ready].map((t, i) => `<li><span class="ui-num">${i + 1}</span>${A(t)}</li>`).join('')}</ol>${ui.btn(F.book)}</div>`;
    let out = field(fx, 0, W - fx, H, R.raised);
    out += box(fx + (W - fx - ew * k) / 2, 72, ew * k, H - 72 - 72, 'display:flex;flex-direction:column;justify-content:center', uiR(none, { st: `zoom:${k};width:${ew}px` }));
    out += box(fx + 56, H - 56, W - fx - 112, 16, `color:${chR}`, p('r-t12 r-nw', `Empty, shown at ${pct(k)}. It ships on ${mono('--raised')} with no edge, so it never reads as a card.`));
    const cw = fx - 112;
    out += box(56, 104, cw, 0, '', uiR(first));
    out += box(56, 432, cw, 0, '', p('r-t15 r-w600', 'First run', `color:${ink}`) + p('r-t15', bodyLines(ctx, 'Before the first one, it lists what the form asks for, in the order it asks.', 15, cw), `color:${soft}`));
    out += box(56, H - 56 - 56, cw, 0, `color:${q}`, p('r-t15', bodyLines(ctx, 'Say what is missing, and offer the one action that fixes it.', 15, cw)));
    return page('empty', out + head(ctx, 'empty', { left: [white], right: [R.raised] }), white);
  },

  'screen-light': (ctx) => screenPage(ctx, 'screen-light', false),
  'screen-dark': (ctx) => screenPage(ctx, 'screen-dark', true),

  // Screen, mobile: the Track screen at 390 x 844, shown at 74%, standing on the edge of the action field; the large line, state by state, runs down the white.
  'screen-mobile'(ctx) {
    const W = ctx.size.w, H = ctx.size.h, R = L(ctx), S = sc(ctx), act = byRole(ctx, 'action'), ui = ctx.ui, k = 0.74, fw = 520;
    const pw = 390 * k, ph = 844 * k, onA = inkOn(ctx, act.hex), white = R.surface, ink = R.text, q = chromeOn(ctx, white);
    let out = field(0, 0, fw, H, act.hex);
    out += box(fw - pw / 2, 72 + (H - 72 - ph) / 2, pw, ph, `box-shadow:0 0 0 1px ${R.sunken}`, `<div style="zoom:${k}">${phone(ctx, k)}</div>`);
    const lw = fw - pw / 2 - 56 - 32;
    const lead = liveIsAction(ctx) ? `The time is the largest line. ${act.name} marks the live status only.` : 'The time is the largest line on the screen.';
    out += box(56, 104, lw, 0, `color:${onA}`, p('r-lead', bodyLines(ctx, lead, 22, lw, 500)));
    out += box(56, H - 56 - 32, lw, 32, `color:${chromeOn(ctx, act.hex)}`, p('r-t12', bodyLines(ctx, `${ctx.brand.ui.screen.title}. 390 by 844 px, shown at ${pct(k)}.`, 12, lw)));
    // one row a status: the status as the chip shows it, then that delivery's time in the display face
    const seen = new Set(), rows = S.deliveries.filter((d) => !seen.has(d.status) && seen.add(d.status));
    const x = 720, w = W - 56 - x, size = fitOne(ctx, rows.map((d) => d.when), 26, 18, w), rh = Math.min(96, (H - 56 - 168) / rows.length);
    out += box(x, 104, w, 0, '', p('r-t15 r-w600', 'The large line, state by state', `color:${ink}`) + p('r-t12', 'Each time comes from the deliveries list. The status sits above it.', `color:${q}`));
    rows.forEach((d, i) => {
      const y = 168 + i * rh;
      out += box(x, y, w, 1, `background:${R.divider}`);
      out += box(x, y + 16, w, 24, '', uiR(ui.statusChip(d.status)));
      out += box(x, topForBaseline(ctx, 'display', dispW(ctx), size, 1.1, y + 16 + 32 + size), w, 0, `color:${ink};font-size:${size}px;line-height:1.1`, `<p class="disp r-nw">${A(d.when)}</p>`);
    });
    return page('screen-mobile', out + head(ctx, 'screen-mobile', { left: [act.hex], right: [white] }), white);
  },

  // Tokens: the reference sheet, read from the code package's own token functions. Colour runs down the page with its light value on the white
  // and its dark value on a field of the dark surface; space, radius, width, type, palette and fonts stand to the right.
  tokens(ctx) {
    const W = ctx.size.w, H = ctx.size.h, R = L(ctx), Lm = colourMap(ctx, 'light'), Dm = colourMap(ctx, 'dark'), g = tokenGroups(ctx);
    const white = R.surface, ink = R.text, q = chromeOn(ctx, white), dS = Dm.surface, dInk = Dm.text, dq = chromeOn(ctx, dS);
    const keys = Object.keys(Lm), top = 136, rh = Math.min(20, Math.floor((H - 48 - top) / keys.length));
    const nameW = Math.max(...keys.map((k) => textW(ctx, 'mono', 400, '--' + k, 12))) + 16;
    const lx = 56, hx = lx + nameW + 20, dfx = hx + 96, dx = dfx + 24, dfw = 128;
    const sw = (c, on) => `<i class="u3-sw" style="background:${c};box-shadow:inset 0 0 0 1px ${ctx.ratio(c, on) < 1.5 ? (on === white ? R.divider : Dm.divider) : 'transparent'}"></i>`;
    let out = field(dfx, 0, dfw, H, dS);
    out += box(lx, 104, nameW, 16, `color:${ink}`, p('r-t12 r-w600 r-nw', 'Colour')) + box(hx, 104, 80, 16, `color:${q}`, p('r-t12 r-nw', 'Light')) + box(dx, 104, 80, 16, `color:${dq}`, p('r-t12 r-nw', 'Dark'));
    keys.forEach((k, i) => {
      const y = top + i * rh;
      out += box(lx, y, nameW, 16, `color:${ink}`, p('r-t12 r-nw', mono('--' + k)));
      out += box(hx, y, 88, 16, `color:${ink}`, `<p class="r-t12 r-nw u3-hx">${sw(Lm[k], white)}${mono(Lm[k])}</p>`);
      out += box(dx, y, 88, 16, `color:${dInk}`, `<p class="r-t12 r-nw u3-hx">${sw(Dm[k], dS)}${mono(Dm[k])}</p>`);
    });
    // the other groups, in two columns, then the font stacks under both
    const rx = dfx + dfw + 48, cw = (W - 56 - rx - 32) / 2, c2 = rx + cw + 32;
    const group = (x, y, title, rows, w = cw) => { let h = box(x, y, w, 16, `color:${ink}`, p('r-t12 r-w600 r-nw', A(title))); rows.forEach(([t, v], i) => { h += tline(x, y + 28 + i * rh, w, t, v, ink); }); return [h, y + 28 + rows.length * rh + 24]; };
    let y1 = 104, y2 = 104, h;
    [h, y1] = group(rx, y1, 'Space', Object.entries(g.space).map(([k, v]) => ['--' + k, v])); out += h;
    [h, y1] = group(rx, y1, 'Radius', Object.entries(g.radius).map(([k, v]) => ['--' + k, v])); out += h;
    [h, y1] = group(rx, y1, 'Border width', Object.entries(g.width).map(([k, v]) => ['--' + k, v])); out += h;
    [h, y2] = group(c2, y2, 'Type: size, line, weight', ctx.uiType.map((t) => [`--fs-${t.token}`, `${g.text['fs-' + t.token]} ${g.text['lh-' + t.token]} ${g.text['fw-' + t.token]}`])); out += h;
    [h, y2] = group(c2, y2, 'Palette', ctx.colours.map((c) => [`--palette-${c.id}`, c.hex])); out += h;
    [h, y2] = group(c2, y2, 'Shadow', [['--shadow-float', g.shadow['shadow-float']]]); out += h;
    const fy = Math.max(y1, y2);
    [h] = group(rx, fy, 'Fonts', Object.entries(g.font).map(([k, v]) => ['--' + k, v]), W - 56 - rx); out += h;
    return page('tokens', out + head(ctx, 'tokens', { left: [white], right: [white] }), white);
  },

  // Code: the package's own files on a dark field, as an editor shows them. tokens.css and tailwind.css are printed from the functions that write them;
  // the white column says how to install, with the button markup the components helper returns, and counts every file's lines.
  code(ctx) {
    const W = ctx.size.w, H = ctx.size.h, R = L(ctx), F = sc(ctx).form, ui = ctx.ui, Dk = ctx.roles.dark, fx = 440, ed = byRole(ctx, 'text').hex;
    const white = R.surface, ink = R.text, soft = softOn(ctx, white), q = chromeOn(ctx, white);
    const val = inkOn(ctx, ed) === R.surface ? Dk.text : R.surface, prop = ctx.ratio(R.action, ed) >= 4.5 ? R.action : Dk.textSoft, dq = chromeOn(ctx, ed);
    const C = { prop, val, quiet: dq };
    let out = field(fx, 0, W - fx, H, ed);
    const pw = (W - fx - 40 - 40 - 32) / 2, rows = Math.floor((H - 104 - 24 - 56 - 24) / 18);
    [['tokens.css', tokensCss(ctx)], ['tailwind.css', tailwindCss(ctx)]].forEach(([name, text], i) => {
      const x = fx + 40 + i * (pw + 32), c = codeLines(ctx, text, rows, pw, C);
      out += box(x, 104, pw, 16, `color:${val}`, `<p class="r-t12 r-nw u3-fn">${mono(name)}<span style="color:${dq}">${c.n} of ${c.total} lines</span></p>`);
      out += box(x, 136, pw, 0, `box-shadow:0 -1px 0 ${Dk.divider};padding-top:12px;color:${val}`, `<pre class="u3-code">${c.html}</pre>`);
    });
    const cw = fx - 112;
    const btn = ui.btn(F.book).replace(/\s+>/, '>');
    const snippet = `<link rel="stylesheet" href="fonts.css">\n<link rel="stylesheet" href="tokens.css">\n<link rel="stylesheet" href="components.css">\n\n<body class="ui">\n  ${btn}\n</body>`;
    out += box(56, 104, cw, 0, `color:${ink}`, p('r-lead', bodyLines(ctx, 'Plain CSS, no framework. Link three stylesheets and put the ui class on the body.', 22, cw, 500)));
    out += box(56, 224, cw, 0, '', `<pre class="u3-code" style="color:${ink}">${A(snippet)}</pre>`);
    const files = [['tokens.css', tokensCss(ctx)], ['tokens.json', JSON.stringify(tokensJson(ctx), null, 2) + '\n'], ['tokens.ts', tokensTs(ctx)], ['tailwind.css', tailwindCss(ctx)], ['components.css', componentsCss(ctx)], ['example.html', exampleHtml(ctx)]];
    const fy = H - 56 - files.length * 20 - 48;
    out += box(56, fy, cw, 16, `color:${ink}`, p('r-t12 r-w600 r-nw', 'In the package'));
    files.forEach(([n, t], i) => { out += box(56, fy + 28 + i * 20, cw, 16, `color:${ink}`, `<p class="r-t12 r-nw u3-t2">${mono(n)}<span style="color:${q}">${t.split('\n').length} lines</span></p>`); });
    out += box(56, H - 56 - 16, cw, 16, `color:${q}`, p('r-t12 r-nw', 'With README.md, fonts.css, the logo, icons and font files.'));
    return page('code', out + head(ctx, 'code', { left: [white], right: [ed] }), white);
  },
};

export function css(ctx) {
  return `
.pg.u3 .u3-ui{background:transparent}
.pg.u3 .u3-m{font-family:'${ctx.brand.fonts.mono.family}',monospace;font-variant-numeric:tabular-nums}
.pg.u3 .u3-sr{display:grid;grid-template-columns:120px 96px minmax(0,1fr);gap:8px}
.pg.u3 .u3-tv{display:grid;grid-template-columns:minmax(0,1fr) 64px 64px;gap:8px}
.pg.u3 .u3-t2{display:flex;justify-content:space-between;gap:16px}
.pg.u3 .u3-hx{display:flex;align-items:center;gap:8px}
.pg.u3 .u3-sw{display:block;flex:none;width:12px;height:12px}
.pg.u3 .u3-fn{display:flex;justify-content:space-between;gap:16px}
.pg.u3 .u3-code{margin:0;font:400 12px/18px '${ctx.brand.fonts.mono.family}',monospace;white-space:pre-wrap;overflow-wrap:anywhere;font-variant-numeric:tabular-nums}
.pg.u3 .u3-cl{display:block}
.pg.u3 .u3-steps{margin:0;padding:0;list-style:none;align-self:stretch;border-top:1px solid var(--divider)}
.pg.u3 .u3-steps li{display:flex;gap:12px;padding:8px 0;border-bottom:1px solid var(--divider);font:400 var(--fs-body)/var(--lh-body) var(--ff-body);color:var(--text)}
.pg.u3 .u3-steps .ui-num{width:16px;color:var(--quiet)}
.pg.u3 .u3-phone{box-sizing:border-box}
`;
}
