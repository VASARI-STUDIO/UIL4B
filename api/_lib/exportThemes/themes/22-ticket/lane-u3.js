// Theme 22, Ticket, lane u3: the UI kit's screens and code (dialog, table, empty, screen-light, screen-dark, screen-mobile, tokens, code).
// Every page is the kit's roll ticket from lane u1 (its chrome is imported read-only). The body is printed on whatever the page documents:
// the product's own light or dark surface for components and screens, its scrim behind the dialog, the brand's field under the phone and
// the code, and the paper colour for the token reference. The components are the shipped ones (ctx.ui, componentsCss), never restyled,
// and every token name, value and code line is read from the engine's own exports, so the page prints what the package ships.
// Every class here starts u3-.
import { A, px, T, roles } from './helpers.js';
import { kitPage, surfaceBody, uiPlate, PLATE, at, wrap } from './lane-u1.js';
import { colourMap, tokenGroups, tokensCss, tailwindCss } from '../../engine/tokens.js';
import { componentsCss, iconSet } from '../../engine/components.js';

const sc = (ctx) => ctx.brand.ui.screen.content;
const mono = (s) => `<span class="m">${A(s)}</span>`;
// the demo copy the shipped example page uses: brand.json ui.screen.content.example, else the engine's own neutral words
const ex = (ctx) => ({ account: 'Account', crumbs: ['Home', 'Section'], tabs: ['One', 'Two', 'Three'], links: [['One', 'map-pin'], ['Two', 'plus'], ['Three', 'clock']], ...(sc(ctx).example || {}) });
const typeOf = (ctx, token) => ctx.uiType.find((t) => t.token === token);
// the live status the screens lead with: the status whose label is the screen's status line, else the first row's
const liveStatus = (ctx) => (ctx.status.find((s) => s.label === sc(ctx).status) || {}).id || sc(ctx).deliveries[0].status;

// a value as the shipped components.css writes it, read from componentsCss(ctx), so a measurement printed on a page is the shipped one
const cssCache = new WeakMap();
function shipped(ctx, sel, prop) {
  if (!cssCache.has(ctx)) cssCache.set(ctx, componentsCss(ctx));
  const css = cssCache.get(ctx), key = `\n${sel} {`, i = css.indexOf(key);
  if (i < 0) throw new Error(`ticket u3: ${sel} is not in componentsCss`);
  const rule = css.slice(i + key.length, css.indexOf('}', i));
  const m = new RegExp(`(?:^|;)\\s*${prop}:\\s*([^;]+)`).exec(rule);
  if (!m) throw new Error(`ticket u3: ${sel} has no ${prop}`);
  return m[1].trim();
}
const shippedPx = (ctx, sel, prop) => parseFloat(shipped(ctx, sel, prop));

// a dark-zone note: the name in paper, the rule in the measured quiet colour (the same note the other kit pages use)
const note = (x, y, w, name, html) => at(x, y, 'zone', `<div class="c15 b paper">${A(name)}</div><div class="c13 qt" style="margin-top:4px">${html}</div>`, '', w);
// a label over its detail, printed in one ink (on the field or the scrim the hierarchy is weight only)
const fact = (name, html, cls = '') => `<div class="u3-fact ${cls}"><b>${A(name)}</b><span>${html}</span></div>`;

// ---------------------------------------------------------------- screen pieces (the shipped components, composed as the product uses them)

const wordmark = (ctx) => `<strong class="ui-display u3-wm">${A(ctx.brand.logo.showcase.wordmark)}</strong>`;
function topbar(ctx, active) {
  const X = ex(ctx), S = sc(ctx);
  return `<nav class="ui-topbar" aria-label="Main">${wordmark(ctx)}<div class="ui-topbar__links">${ctx.ui.links(X.links, active)}</div><span class="ui-avatar" aria-label="${A(X.account)}">${A(S.initials)}</span></nav>`;
}
function progress(ctx) {
  const S = sc(ctx), p = Math.max(0, Math.min(1, S.progress || 0)) * 100;
  return `<div class="u3-prog"><div class="ui-progress" role="img" aria-label="${A(S.from)} to ${A(S.to)}"><div class="ui-progress__bar"><i style="width:${p}%"></i></div><span class="ui-progress__dot" style="left:${p}%"></span></div>`
    + `<div class="u3-ends ui-num"><span>${A(S.from)}</span><span>${A(S.to)}</span></div></div>`;
}
function riderRow(ctx) {
  const S = sc(ctx);
  return `<div class="u3-rider"><span class="ui-avatar">${A(S.initials)}</span><div class="u3-who"><p class="u3-b">${A(S.rider)}</p><p class="u3-q ui-num">${A(S.riderNote)}</p></div>${ctx.ui.btn(S.call, { variant: 'secondary', size: 'sm' })}</div>`;
}
function facts(ctx) {
  const S = sc(ctx);
  return `<dl class="u3-dl"><div><dt>${A(S.deliverToLabel)}</dt><dd>${A(S.deliverTo)}</dd></div><div><dt>${A(S.paidLabel)}</dt><dd class="ui-num">${A(S.paid)}</dd></div></dl>`;
}
// the live block: status, the live line, what to do, the progress and who is on. The phone and its 1:1 detail share it
const liveTop = (ctx, cls = '') => `<div class="u3-live ${cls}">${ctx.ui.statusChip(liveStatus(ctx))}<h2 class="ui-display u3-eta">${A(sc(ctx).eta)}</h2><p class="u3-soft">${A(sc(ctx).pickup)}</p>${progress(ctx)}${riderRow(ctx)}</div>`;

// the phone: 390 x 844, dark, a status line, the brand's bar, the live block, the facts, one action, and the tab bar
const PH = { w: 390, h: 844, status: 44, bar: 56, pad: 20 };
function liveHeight(ctx, w) {
  const S = sc(ctx), hd = typeOf(ctx, 'headline'), bd = typeOf(ctx, 'body');
  const eta = wrap(ctx, S.eta, hd.size, w, { role: hd.face === 'display' ? 'display' : 'body', margin: 0.9 }).length;
  const pick = wrap(ctx, S.pickup, bd.size, w, { margin: 0.9 }).length;
  // chip, the live line, the soft line, the progress with its ends, the rider row, with the block's 12 px gaps and its padding
  return Math.ceil(PH.pad * 2 + 18 + eta * hd.line + pick * bd.line + 44 + 44 + 12 * 4);
}
function phone(ctx) {
  const X = ex(ctx), S = sc(ctx), tabs = [...X.links.slice(0, 3), [X.account, 'user']];
  return `<div class="ui u3-ph" data-theme="dark">
<div class="u3-sb ui-num"><span>${A(S.time)}</span></div>
<div class="u3-pbar">${wordmark(ctx)}<span class="ui-avatar">${A(S.initials)}</span></div>
${liveTop(ctx, 'u3-live--ph')}
<div class="u3-pfoot">${facts(ctx)}${ctx.ui.btn(S.share, { variant: 'secondary', block: true })}</div>
<nav class="ui-tabbar" aria-label="Sections">${tabs.map(([t, i], k) => `<a href="#"${k === 0 ? ' aria-current="page"' : ''}>${ctx.ui.icon(i, 20)}${A(t)}</a>`).join('')}</nav>
</div>`;
}

// ---------------------------------------------------------------- css

export function css() {
  return `
.pg .u3-fact{display:flex;flex-direction:column;gap:2px}
.pg .u3-fact b{font:600 13px/18px var(--body)}
.pg .u3-fact span{font:400 12px/16px var(--body)}
.pg .u3-fact .m{font-size:12px}
.pg .u3-col{position:absolute;display:flex;flex-direction:column;gap:12px}
.pg .u3-cap{display:flex;flex-direction:column;gap:2px;font:400 12px/16px var(--ff-body);color:var(--quiet)}
.pg .u3-cap b{font:600 13px/18px var(--ff-body);color:var(--text)}
.pg .u3-lead{position:absolute;height:1px}
.pg .u3-scrim{display:block;padding:0}
.pg .u3-dlg{position:absolute}
.pg .u3-tbl{position:absolute}
.pg .u3-tbl .ui-table th button{color:inherit;font:inherit}
.pg .u3-skr{display:flex;flex-direction:column;gap:8px;flex:1}
/* the screens: a window the size of the plate, the shipped top bar over a two-column main */
.pg .u3-scr{position:absolute;left:0;top:0;width:${PLATE.w}px;height:${PLATE.h}px;display:flex;flex-direction:column}
.pg .u3-wm{font-size:20px;line-height:24px;white-space:nowrap}
.pg .u3-main{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 296px;gap:32px;padding:24px 24px 0}
.pg .u3-main>div{display:flex;flex-direction:column;min-width:0}
.pg .u3-h{margin:8px 0 16px;font-size:var(--fs-title);line-height:var(--lh-title)}
.pg .u3-form{display:flex;flex-direction:column;gap:12px;margin-top:10px}
.pg .u3-live{display:flex;flex-direction:column;align-items:flex-start;gap:12px}
.pg .u3-live>*{max-width:100%}
.pg .u3-eta{margin:0;font-size:var(--fs-headline);line-height:var(--lh-headline)}
.pg .u3-soft{margin:0;color:var(--text-soft);max-width:44ch}
.pg .u3-prog{width:100%;display:flex;flex-direction:column;gap:4px}
.pg .u3-ends{display:flex;justify-content:space-between;gap:12px;font-size:var(--fs-caption);line-height:var(--lh-caption);color:var(--quiet)}
.pg .u3-rider{width:100%;display:flex;align-items:center;gap:12px}
.pg .u3-who{flex:1;min-width:0}
.pg .u3-b{margin:0;font-weight:${600};line-height:var(--lh-label)}
.pg .u3-q{margin:0;color:var(--quiet);font-size:var(--fs-label);line-height:var(--lh-label)}
.pg .u3-dl{margin:0;display:flex;flex-direction:column;gap:12px}
.pg .u3-dl dt{font-size:var(--fs-label);line-height:var(--lh-label);color:var(--quiet)}
.pg .u3-dl dd{margin:0;font-weight:600}
.pg .u3-side{gap:16px}
/* the phone */
.pg .u3-ph{position:relative;width:${PH.w}px;height:${PH.h}px;overflow:hidden}
.pg .u3-sb{height:${PH.status}px;display:flex;align-items:center;padding:0 ${PH.pad}px;font-weight:600}
.pg .u3-pbar{height:${PH.bar}px;display:flex;align-items:center;justify-content:space-between;padding:0 ${PH.pad}px;border-bottom:var(--w-hairline) solid var(--divider)}
.pg .u3-live--ph,.pg .u3-det{padding:${PH.pad}px}
.pg .u3-pfoot{display:flex;flex-direction:column;gap:20px;padding:0 ${PH.pad}px}
.pg .u3-ph .ui-tabbar{position:absolute;left:0;right:0;bottom:0}
.pg .u3-phw{position:absolute;overflow:hidden}
.pg .u3-det{position:absolute;width:${PH.w}px}
.pg .u3-brk{position:absolute;border:1px solid var(--ink);border-left:0}
/* the token reference and the code */
.pg .u3-tk{position:absolute;display:grid;column-gap:8px;row-gap:2px;align-items:center;color:var(--ink)}
.pg .u3-tk .h{font:600 12px/16px var(--body)}
.pg .u3-tk .m{white-space:nowrap}
.pg .u3-sw{display:flex;width:24px;height:16px;border:1px solid var(--ink);box-sizing:border-box}
.pg .u3-sw i{flex:1}
.pg .u3-grp{position:absolute;display:grid;grid-template-columns:max-content max-content;column-gap:12px;row-gap:0;align-content:start}
.pg .u3-grp .h{grid-column:1/-1;font:600 13px/18px var(--body);margin-bottom:8px}
.pg .u3-grp .m{white-space:nowrap}
.pg .u3-pre{position:absolute;margin:0;font-family:var(--mono);font-weight:400;white-space:pre;font-variant-numeric:tabular-nums}
.pg .u3-pre15{font-size:15px;line-height:24px}
.pg .u3-pre12{font-size:12px;line-height:16px}
`;
}

// ---------------------------------------------------------------- the pages

export const uikit = {
  // ---- the dialog on the scrim it ships with: the body is printed in the scrim colour, the dialog sits on it at true size, and its
  // parts are read off on the right in the scrim's ink, the way the stub reads off the ticket ----
  dialog: (ctx) => {
    const R = roles(ctx), M = colourMap(ctx, 'light'), S = sc(ctx), D = S.dialog, P = PLATE;
    const maxW = shippedPx(ctx, '.ui-dialog', 'max-width'), pad = shippedPx(ctx, '.ui-dialog', 'padding'), gap = shippedPx(ctx, '.ui-dialog', 'gap');
    const actTop = shippedPx(ctx, '.ui-dialog__actions', 'margin-top'), btnH = shippedPx(ctx, '.ui-btn', 'height'), bw = ctx.brand.ui.border;
    const tt = typeOf(ctx, 'title-s'), bt = typeOf(ctx, 'body'), cw = maxW - 2 * pad - 2 * bw;
    const tl = wrap(ctx, D.title, tt.size, cw, { role: tt.face === 'display' ? 'display' : 'body', margin: 0.9 }).length;
    const xl = wrap(ctx, D.body, bt.size, cw, { margin: 0.9 }).length;
    const dh = 2 * bw + 2 * pad + tl * tt.line + gap + xl * bt.line + gap + actTop + btnH;
    const dx = 72, dy = Math.round(T.y + (T.h - dh) / 2);
    const dlg = ctx.ui.dialog(D).replace(/dlg-t/g, 'u3-dlg-t');
    // the scrim's ink: whichever of the surface and the text reads better on it
    const ink = ctx.ratio(M.surface, M.scrim) >= ctx.ratio(M.text, M.scrim) ? 'var(--surface)' : 'var(--text)';
    const shadow = tokenGroups(ctx).shadow['shadow-float'];
    const parts = [
      fact('The box', `${mono(`${maxW} px`)} wide at most, ${mono(`${pad} px`)} inside. A ${mono(`${bw} px`)} edge in ${mono('--text')}${shadow === 'none' ? ', and no shadow' : `, and ${mono('--shadow-float')}`}.`),
      fact('The question', `The title, in ${mono('--fs-title-s')} at ${mono(`${tt.size} / ${tt.line}`)}.`),
      fact('What happens next', `One or two sentences in ${mono('--text-soft')}, before anyone chooses.`),
      fact('Two answers', `${A(D.keep)} first, then ${A(D.confirm)}. The action is the filled button, on the right.`),
    ];
    const ax = 600, ay = dy, step = Math.max(64, Math.floor((dh - 34) / (parts.length - 1)));
    let inner = `<div class="a ui-scrim u3-scrim" style="left:0;top:0;width:${P.w}px;height:${P.h}px"></div>`
      + `<div class="u3-dlg" style="left:${dx - P.x}px;top:${dy - P.y}px;width:${maxW}px">${dlg}</div>`;
    parts.forEach((p, i) => { inner += at(ax - P.x, ay + i * step - P.y, '', p, `color:${ink}`, 336); });
    const body = uiPlate(P.x, P.y, P.w, P.h, 'light', inner, 'background:var(--scrim)');
    const zone = note(72, 532, 400, 'One question, one way out', 'A dialog stops the screen to ask one thing. The title asks it and the two buttons answer it, so nothing else on the screen can be pressed.')
      + note(520, 532, 416, 'Closing it', `Esc and a press on the scrim both choose the safe answer. Focus goes back to whatever opened the dialog. The scrim is ${mono('--scrim')}.`);
    return kitPage(ctx, R, 'dialog', { segments: [{ x: T.x, w: T.bodyW, hex: M.scrim }], body, zone });
  },

  // ---- the table at true size on the light surface, its three row states read off on the right like the fields of a ticket ----
  table: (ctx) => {
    const R = roles(ctx), S = sc(ctx), X = ex(ctx), ui = ctx.ui, P = PLATE;
    const thH = shippedPx(ctx, '.ui-table th', 'height'), tdH = shippedPx(ctx, '.ui-table td', 'height');
    const bar = /inset (\d+(?:\.\d+)?)px 0 0/.exec(shipped(ctx, '.ui-table tbody tr[aria-selected="true"]', 'box-shadow'))[1];
    const heads = ['Booking', 'Details', 'Status', S.paidLabel];
    const sortBtn = (t, dir) => `<button type="button">${A(t)}${dir ? ui.icon('arrow-up', 14) : ''}</button>`;
    const rows = S.deliveries.map((d, i) => `<tr${i === 0 ? ' aria-selected="true"' : ''}${i === 2 ? ' class="is-hover"' : ''}><td>${A(d.to)}</td><td class="ui-num">${A(d.when)}</td><td>${ui.statusChip(d.status)}</td><td class="is-num">${A(d.price)}</td></tr>`).join('');
    const table = `<table class="ui-table"><thead><tr><th scope="col" aria-sort="ascending">${sortBtn(heads[0], 'asc')}</th><th scope="col">${A(heads[1])}</th><th scope="col">${A(heads[2])}</th><th scope="col" class="is-num">${sortBtn(heads[3])}</th></tr></thead><tbody>${rows}</tbody></table>`;
    const title = X.crumbs[X.crumbs.length - 1] || ctx.brand.ui.screen.title;
    const tx = 72, tw = 640, ty = 128, row = (i) => ty + thH + i * (tdH + 1) + tdH / 2;
    let inner = at(tx - P.x, 72 - P.y, 'ui-display u3-h', A(title), 'margin:0;white-space:nowrap')
      + `<div class="u3-tbl" style="left:${tx - P.x}px;top:${ty - P.y}px;width:${tw}px">${table}</div>`;
    // the callouts: each sits level with the row it names, joined to the table's edge by a 16 px rule
    const calls = [
      [ty + thH / 2, 'Sorted', `${A(heads[0])}, A to Z. The sorted header shows its arrow.`],
      [row(0), 'Selected', `The ${mono('--raised')} ground and a ${mono(`${bar} px`)} bar in ${mono('--action')}.`],
      [row(2), 'Hover', `The ${mono('--raised')} ground, on a pointer only.`],
    ];
    for (const [y, name, text] of calls) {
      inner += `<div class="u3-lead" style="left:${tx + tw + 8 - P.x}px;top:${Math.round(y) - P.y}px;width:16px;background:var(--quiet)"></div>`
        + at(tx + tw + 32 - P.x, Math.round(y) - 9 - P.y, 'u3-cap', `<b>${A(name)}</b><span>${text}</span>`, '', 936 - (tx + tw + 32));
    }
    const body = uiPlate(P.x, P.y, P.w, P.h, 'light', inner);
    const zone = note(72, 532, 400, 'Read across, then down', `Rows are ${mono(`${tdH} px`)} and the header ${mono(`${thH} px`)}, with a ${mono('--divider')} hairline between rows. Status is in words, never a colour alone.`)
      + note(520, 532, 416, 'Figures line up', 'Prices sit right in tabular figures, so a column of totals reads at a glance. A header that sorts is a button.');
    return kitPage(ctx, R, 'table', { segments: surfaceBody(ctx, 'light'), body, zone });
  },

  // ---- an unissued ticket: the empty state at true size on the dark surface, and beside it the same list while it loads ----
  empty: (ctx) => {
    const R = roles(ctx), S = sc(ctx), E = S.empty, ui = ctx.ui, P = PLATE, hd = typeOf(ctx, 'headline');
    const empty = `<div class="ui-empty"><h3 class="ui-empty__title">${A(E.title)}</h3><p class="ui-empty__text">${A(E.body)}</p>${ui.btn(E.cta)}</div>`;
    const sk = (a, b) => `<li><div class="ui-row"><span class="ui-row__lead"></span><div class="u3-skr">${ui.skeleton(a)}${ui.skeleton(b)}</div></div></li>`;
    const loading = `<ul class="ui-list" aria-busy="true">${sk('62%', '38%')}${sk('48%', '30%')}${sk('56%', '42%')}</ul>`;
    const cap = (name, text) => `<div class="u3-cap"><b>${A(name)}</b><span>${text}</span></div>`;
    let inner = `<div class="u3-col" style="left:${72 - P.x}px;top:${72 - P.y}px;width:472px">${empty}${cap('Empty', 'What is missing, and the one action that fills it.')}</div>`;
    inner += `<div class="u3-col" style="left:${600 - P.x}px;top:${72 - P.y}px;width:336px">${loading}${cap('Loading', 'The list keeps its shape while it loads, so nothing jumps.')}</div>`;
    const body = uiPlate(P.x, P.y, P.w, P.h, 'dark', inner);
    const zone = note(72, 532, 400, 'Words first', `The title is ${mono('--fs-headline')}, ${mono(`${hd.size} / ${hd.line}`)}: ${A(hd.use)}. It sits on ${mono('--raised')} with no edge, so it never reads as a card.`)
      + note(520, 532, 416, 'No dead ends', 'An empty screen always offers the next step as a button. A loading screen draws the rows it is waiting for, never a spinner on its own.');
    return kitPage(ctx, R, 'empty', { segments: surfaceBody(ctx, 'dark'), body, zone });
  },

  // ---- the product's list screen in daylight, printed across the whole body: top bar, crumbs, tabs, the list and the booking card ----
  'screen-light': (ctx) => {
    const R = roles(ctx), S = sc(ctx), F = S.form, X = ex(ctx), ui = ctx.ui, P = PLATE;
    const form = `<div class="u3-form">${ui.field({ id: 'u3-f1', label: F.size, kind: 'select', options: F.sizes, value: F.sizes[1] })}${ui.field({ id: 'u3-f2', label: F.dropoff, value: F.dropoffValue })}${ui.btn(F.book, { block: true })}</div>`;
    const scr = `<div class="u3-scr">${topbar(ctx, 0)}<div class="u3-main">
<div>${ui.crumbs(X.crumbs)}<h2 class="ui-display u3-h">${A(X.crumbs[X.crumbs.length - 1] || ctx.brand.ui.screen.title)}</h2>${ui.tabs(X.tabs, 0)}${ui.deliveryRows(3)}</div>
<div>${ui.card({ title: F.title, raised: true, action: form })}</div></div></div>`;
    const body = uiPlate(P.x, P.y, P.w, P.h, 'light', scr);
    const zone = note(72, 532, 400, 'Built from the kit', 'Top bar, links, crumbs, tabs, list rows, a raised card, a select, an input and the one filled button. Nothing on the screen is drawn for this page.')
      + note(520, 532, 416, 'Light, the default', `${A(ctx.brand.ui.screen.title)}, at true size, ${mono(`${P.w} × ${P.h} px`)}. The filled button is the only ${mono('--action')} fill on the screen.`);
    return kitPage(ctx, R, 'screen-light', { segments: surfaceBody(ctx, 'light'), body, zone });
  },

  // ---- the live screen after dark: the status, the live line as large as the kit sets type, the progress and the facts ----
  'screen-dark': (ctx) => {
    const R = roles(ctx), S = sc(ctx), ui = ctx.ui, P = PLATE;
    const scr = `<div class="u3-scr">${topbar(ctx, 0)}<div class="u3-main">
<div>${liveTop(ctx)}</div>
<div class="u3-side">${ui.alert('warning', S.alert)}${facts(ctx)}${ui.btn(S.share, { variant: 'secondary', block: true })}</div></div></div>`;
    const body = uiPlate(P.x, P.y, P.w, P.h, 'dark', scr);
    const zone = note(72, 532, 400, 'The live line leads', `The live line is ${mono('--fs-headline')}, the largest type in the kit. The status word above it says where things stand, in words.`)
      + note(520, 532, 416, 'Dark is the same markup', `The same screen under ${mono('data-theme="dark"')}. Only the token values change, so nothing is restyled for the night.`);
    return kitPage(ctx, R, 'screen-dark', { segments: surfaceBody(ctx, 'dark'), body, zone });
  },

  // ---- the phone printed on the brand's field: the whole screen at about half size, and its top at true size beside it ----
  'screen-mobile': (ctx) => {
    const R = roles(ctx), k = (T.h - 32) / PH.h, pw = PH.w * k, px0 = 56, py0 = T.y + 16;
    const lh = liveHeight(ctx, PH.w - PH.pad * 2), top = PH.status + PH.bar;
    const ph = `<div class="a u3-phw${ctx.edition === "slot" ? " ph-tight" : ""}" role="img" aria-label="${A(ctx.brand.ui.screen.title)}, the whole phone screen" style="left:${px(px0)};top:${px(py0)};width:${px(pw)};height:${px(PH.h * k)}"><div style="zoom:${k};width:${PH.w}px;height:${PH.h}px">${phone(ctx)}</div></div>`;
    // the bracket beside the small phone marks the part shown at true size
    const by0 = py0 + top * k, by1 = py0 + (top + lh) * k;
    const brk = `<div class="u3-brk" style="left:${px(px0 + pw + 4)};top:${px(by0)};width:8px;height:${px(by1 - by0)}"></div>`;
    const dx = 296, dy = Math.max(72, Math.round(T.y + (T.h - lh) / 2));
    const det = `<div class="a ui u3-det${ctx.edition === "slot" ? " ph-tight" : ""}" data-theme="dark" style="left:${dx}px;top:${dy}px;height:${lh}px">${liveTop(ctx)}</div>`;
    const cx = dx + PH.w + 32, cw = 936 - cx;
    const caps = at(cx, dy, 'ink', fact('At true size', `The top of the screen, ${mono(`${PH.w} px`)} wide, as it ships.`), '', cw)
      + at(cx, 460 - 50, 'ink', fact('The whole screen', `${mono(`${PH.w} × ${PH.h}`)}, shown at ${Math.round(k * 100)}%.`), '', cw);
    const body = ph + brk + det + caps;
    const zone = note(72, 532, 400, 'One column', 'Everything stacks in one column, and the live line stays the largest thing on the screen. The facts and the action follow it.')
      + note(520, 532, 416, 'Within reach', `The action and the ${mono('ui-tabbar')} sit in the lower half, where a thumb reaches. Every target is at least ${mono(`${shippedPx(ctx, '.ui-btn', 'height')} px`)} tall.`);
    return kitPage(ctx, R, 'screen-mobile', { body, zone });
  },

  // ---- the token reference printed on a paper ticket: every colour role in light and dark, then space, radius, lines and type;
  // fonts and the palette in the dark zone. Every name and value is read from the engine's token export ----
  tokens: (ctx) => {
    const R = roles(ctx).onPaper(), g = tokenGroups(ctx), L = colourMap(ctx, 'light'), D = colourMap(ctx, 'dark');
    const keys = Object.keys(L), cols = 3, per = Math.ceil(keys.length / cols);
    const groups = [
      ['Space', Object.entries(g.space)],
      ['Radius', Object.entries(g.radius)],
      ['Lines', [...Object.entries(g.width), ['shadow-float', g.shadow['shadow-float']]]],
      ['Type, size line weight', ctx.uiType.map((t) => [t.token, `${t.size}px ${t.line}px ${t.weight}`]), true],
    ];
    const lowH = 26 + Math.max(...groups.map((x) => x[1].length)) * 16, lowY = 460 - lowH;
    const rowH = Math.min(18, Math.floor((lowY - 24 - 72 - 18) / per));
    let body = '';
    for (let c = 0; c < cols; c++) {
      const ks = keys.slice(c * per, (c + 1) * per);
      const cells = `<span></span><span class="h">${c === 0 ? 'Colour' : ''}</span><span class="h">Light</span><span class="h">Dark</span>`
        + ks.map((k) => `<span class="u3-sw"><i style="background:${L[k]}"></i><i style="background:${D[k]}"></i></span>${mono('--' + k)}${mono(L[k])}${mono(D[k])}`).join('');
      body += `<div class="u3-tk" style="left:${72 + c * 296}px;top:72px;width:272px;grid-template-columns:24px 1fr max-content max-content;grid-auto-rows:${rowH}px">${cells}</div>`;
    }
    const lowX = [72, 224, 416, 648];
    groups.forEach(([name, list, type], i) => {
      body += `<div class="u3-grp ink" style="left:${lowX[i]}px;top:${lowY}px"><span class="h">${A(name)}</span>${list.map(([k, v]) => `${mono(type ? k : '--' + k)}${mono(v)}`).join('')}</div>`;
    });
    // the dark zone: the font stacks and the palette, then where the values come from
    const ff = Object.entries(g.font), pal = ctx.colours;
    const zone = `<div class="u3-grp paper" style="left:72px;top:532px"><span class="h">Fonts</span>${ff.map(([k, v]) => `${mono('--' + k)}<span class="m qt">${A(v)}</span>`).join('')}</div>`
      + `<div class="u3-grp paper" style="left:568px;top:532px"><span class="h">Palette</span>${pal.map((c) => `${mono('--palette-' + c.id)}<span class="m qt">${A(c.hex)}</span>`).join('')}</div>`
      + at(72, 640, 'c13 qt', `Type tokens are ${mono('--fs-')}, ${mono('--lh-')} and ${mono('--fw-')} with the name. Every value here is read from ${mono('tokens.css')} as the package ships it.`, '', 440);
    return kitPage(ctx, R, 'tokens', { segments: [{ x: T.x, w: T.bodyW, hex: R.field }], body, zone });
  },

  // ---- the code package printed on the brand's field: how to install it at the size it is typed, the shipped tokens.css and the Tailwind
  // block beside it, and the files in the dark zone ----
  code: (ctx) => {
    const R = roles(ctx), F = sc(ctx).form;
    const install = `<link rel="stylesheet" href="fonts.css">\n<link rel="stylesheet" href="tokens.css">\n<link rel="stylesheet" href="components.css">\n\n<body class="ui">\n  <button class="ui-btn" type="button">\n    ${F.book}\n  </button>\n</body>`;
    // four colour roles as tokens.css writes them, light then dark, cut from the engine's own output
    const want = ['surface', 'text', 'action', 'action-label'];
    const blocks = tokensCss(ctx);
    const block = (open) => {
      const lines = blocks.split('\n'), i = lines.indexOf(open), out = [open];
      for (let j = i + 1; j < lines.length && lines[j] !== '}'; j++) if (want.some((w) => lines[j].startsWith(`  --${w}:`))) out.push(lines[j]);
      if (i < 0 || out.length !== want.length + 1) throw new Error(`ticket u3: tokens.css has no ${open} block with ${want.join(', ')}`);
      return [...out, '}'].join('\n');
    };
    const cssCut = `${block(':root {')}\n${block('[data-theme="dark"] {')}`;
    const tw = tailwindCss(ctx).split('\n'), ti = tw.indexOf('@theme inline {');
    const twCut = [tw[ti], ...tw.slice(ti + 1).filter((l) => ['surface', 'text', 'action'].some((w) => l.startsWith(`  --color-${w}:`))), '}'].join('\n');
    const head = (x, y, t) => at(x, y, 'c13 b ink', A(t));
    const pre = (x, y, cls, code) => `<pre class="u3-pre ${cls} ink" style="left:${x}px;top:${y}px">${A(code)}</pre>`;
    const nIn = install.split('\n').length, dmY = 98 + nIn * 24 + 32;
    const cssN = cssCut.split('\n').length, twY = 98 + cssN * 16 + 32;
    let body = head(72, 72, 'Install') + pre(72, 98, 'u3-pre15', install)
      + head(72, dmY, 'Dark mode') + pre(72, dmY + 26, 'u3-pre15', '<html data-theme="dark">')
      + head(600, 72, 'From tokens.css') + pre(600, 98, 'u3-pre12', cssCut)
      + head(600, twY, 'From tailwind.css') + pre(600, twY + 26, 'u3-pre12', twCut);
    const fams = [...new Set(ctx.faces.map((f) => f.family))];
    const files = [
      ['README.md', 'How to install and use the kit.'], ['tokens.css', 'Custom properties, light and dark.'], ['tokens.json', 'The same tokens in the W3C format.'],
      ['tokens.ts', 'A typed export of the same values.'], ['tailwind.css', 'A Tailwind CSS v4 @theme block.'], ['components.css', 'Every component, built on the tokens.'],
      ['example.html', 'Every component live, light and dark.'], ['fonts.css', `@font-face rules for ${fams.length} families.`], ['assets/', `The logo, ${iconSet(ctx).length} icons and the fonts.`],
    ];
    const zone = files.map(([n, d], i) => at(72 + (i % 3) * 296, 532 + Math.floor(i / 3) * 52, '', `<div class="m paper">${A(n)}</div><div class="c12 qt">${A(d)}</div>`, '', 272)).join('');
    return kitPage(ctx, R, 'code', { body, zone });
  },
};
