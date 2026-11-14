// Theme 29 (Blueprint), lane u3: shared small parts and the two product screens. The chrome (kitSheet, plate, keys, notes, drawing titles) is lane u1's,
// the small drafting helpers below are copies of lane u2's (they were not exported there). Every class this file uses starts u3-.
import { esc as A } from '../../engine/brand.js';
import { kitSheet, plate, at, notes, notesH, keyTag, sc, uiT, textW, linesOf, r1 } from './lane-u1.js';

export const mx = (t) => t.replace(/\[(.+?)\]/g, '<span class="v">$1</span>'); // [x] is a mono literal (theme text only)
export const pxOf = (list, token, d) => (list.find((t) => t.token === token) || { px: d }).px;
export const hexOf = (M, k) => String(M[k]).toUpperCase();
export const frame = (x, y, w, h) => `<rect x="${r1(x - 0.5)}" y="${r1(y - 0.5)}" width="${r1(w + 1)}" height="${r1(h + 1)}" stroke="var(--ink)" stroke-width="1"/>`;
export const rowAt = (x, y, html, cls = '', style = '') => `<span class="u1-row ${cls}" style="left:${r1(x)}px;top:${r1(y)}px;${style}">${html}</span>`;
export const mono = (x, y, t, style = '') => rowAt(x, y, A(t), 'u1-m u3-q', style);
// an enlarged detail: a .ui plate drawn at K:1 and given its OUTER size on the sheet; children are placed in unzoomed px (use at())
export const zoomFit = (x, y, w, h, K, inner, mode = 'light') => `<div class="a" style="left:${r1(x)}px;top:${r1(y)}px;width:${r1(w)}px;height:${r1(h)}px"><div class="ui u1-plate"${mode === 'dark' ? ' data-theme="dark"' : ''} style="position:relative;width:${r1(w / K)}px;height:${r1(h / K)}px;zoom:${K}">${inner}</div></div>`;
export const noteBlock = (x, w, items, floor = 947) => { const nh = notesH(items, w); return `<h3 class="a c-head" style="left:${x}px;top:${r1(floor - nh - 38)}px">General notes</h3>` + notes(x, floor - nh, w, items); };
export const head = (cols, y, x0, x1) => cols.map(([h, x]) => `<span class="a c-label" style="left:${x}px;top:${y}px">${h}</span>`).join('') + `<div class="hl" style="left:${x0}px;top:${y + 24}px;width:${x1 - x0}px;background:var(--ink)"></div>`;
export const sheetOf = (ctx, id, body, scale = '[1:1], sizes in px') => kitSheet(ctx, id, { drawing: ctx.pages.find((p) => p.id === id).title, scale }, body);
export const links = (ctx) => (sc(ctx).example?.links || []).slice(0, 3);
export const account = (ctx) => sc(ctx).example?.account || '';
export const uniq = (html, tag) => html.replace(/dlg-t/g, tag);

// a key schedule: the heavy-ruled head and one row a key, each row's cells laid at the given offsets. cols: [[name, dx, mono]]; rows: arrays of cell text.
export function schedule(x0, x1, y, cols, rows, step = 36) {
  let html = head(cols.map(([h, dx]) => [h, x0 + dx]), y, x0, x1), svg = '';
  rows.forEach((r, i) => {
    const cy = y + 24 + step / 2 + i * step + 2;
    html += keyTag(x0 + 12, cy, i + 1);
    r.forEach((t, k) => { const [, dx, m] = cols[k + 1]; html += rowAt(x0 + dx, cy - 10, A(t), m ? 'u1-m' : ''); });
    svg += `<path d="M${x0} ${r1(cy + step / 2 - 0.5)}H${x1}" stroke="var(--hair)" stroke-width="1"/>`;
  });
  return { html, svg, end: y + 24 + rows.length * step + 4 };
}

// ---------------------------------------------------------------- the product screens, drawn from the shipped components

const wordmark = (ctx, cw = 'colour') => `<span style="display:block;width:104px">${ctx.logo.html('horizontal', { width: 104, colourway: cw })}</span>`;
const progress = (S) => { const p = Math.round((S.progress ?? 0.6) * 100); return `<div class="ui-progress"><div class="ui-progress__bar"><i style="width:${p}%"></i></div><span class="ui-progress__dot" style="left:${p}%"></span></div><div class="u3-route"><span>${A(S.from)}</span><span>${A(S.to)}</span></div>`; };
const rider = (ctx, S) => `<div class="u3-rider"><span class="ui-avatar">${A(S.initials || '')}</span><div class="u3-rmain"><p class="u3-rname">${A(S.rider)}</p><p class="u3-rsub">${A(S.riderNote)}</p></div>${ctx.ui.btn(S.call, { variant: 'secondary', size: 'sm', iconLeft: 'phone' })}</div>`;
const detail = (S) => `<dl class="u3-detail"><div><dt>${A(S.deliverToLabel)}</dt><dd>${A(S.deliverTo)}</dd></div><div><dt>${A(S.paidLabel)}</dt><dd class="ui-num">${A(S.paid)}</dd></div></dl>`;

// the desktop screen, W by H px, in the plate's own light or dark
export function desktopScreen(ctx, W, H, dark = false) {
  const S = sc(ctx), ui = ctx.ui, ttl = ctx.brand.ui.screen.title;
  return `<div class="u3-scr" style="width:${W}px;height:${H}px">
<nav class="ui-topbar" aria-label="Main">${wordmark(ctx, dark ? 'reversed' : 'colour')}<div class="ui-topbar__links">${ui.links(links(ctx), 0)}</div><span class="u3-clock ui-num">${A(S.time)}</span></nav>
<div class="u3-main">
<section class="u3-track" aria-label="${A(ttl)}"><p class="u3-ttl">${A(ttl)}</p><div class="u3-eta">${ui.statusChip(S.deliveries[0].status)}<h2 class="ui-display u3-time">${A(S.eta)}</h2></div><p class="u3-pick">${A(S.pickup)}</p><div class="u3-prog">${progress(S)}</div>${rider(ctx, S)}${detail(S)}${ui.btn(S.share, { variant: 'secondary', block: true })}</section>
<section class="u3-deliv" aria-label="${A(S.deliverToLabel)}">${ui.deliveryRows(S.deliveries.length)}<div class="u3-book">${ui.btn(S.form.book, { iconRight: 'arrow-right' })}</div></section>
</div></div>`;
}

// the phone screen, 390 by 844 px
export function phoneScreen(ctx) {
  const S = sc(ctx), ui = ctx.ui, all = [...links(ctx), [account(ctx), 'user']].filter((l) => l[0]);
  return `<div class="u3-ph" style="width:390px;height:844px">
<div class="ui-topbar u3-phtop">${wordmark(ctx)}<span class="u3-clock ui-num">${A(S.time)}</span></div>
<div class="u3-phbody"><span class="u3-chip">${ui.statusChip(S.deliveries[0].status)}</span><h2 class="ui-display u3-phtime">${A(S.eta)}</h2><p class="u3-pick">${A(S.pickup)}</p><div class="u3-prog">${progress(S)}</div>${rider(ctx, S)}${ui.card({ meta: S.paidLabel, title: S.paid, text: S.deliverTo })}${ui.btn(S.share, { variant: 'secondary', block: true })}</div>
<nav class="ui-tabbar" aria-label="Sections">${all.map(([t, i], k) => `<a href="#"${k === 0 ? ' aria-current="page"' : ''}>${ui.icon(i, 20)}${A(t)}</a>`).join('')}</nav>
</div>`;
}

export function css() {
  return `
.pg .u3-q{color:var(--quiet)}
.pg .u3-scr{display:flex;flex-direction:column;background:var(--surface);color:var(--text)}
.pg .u3-scr .u3-main{flex:1;display:grid;grid-template-columns:1fr 460px;gap:48px;padding:32px 32px 24px;min-height:0}
.pg .u3-deliv{grid-column:1;grid-row:1}
.pg .u3-track{grid-column:2;grid-row:1;display:flex;flex-direction:column;gap:0;align-items:flex-start}
.pg .u3-ttl{margin:0 0 8px;font:var(--fw-label) var(--fs-label)/var(--lh-label) var(--ff-body);color:var(--quiet)}
.pg .u3-eta{display:flex;flex-direction:column;gap:8px;align-items:flex-start}
.pg .u3-time{margin:0;font-size:var(--fs-title);line-height:var(--lh-title)}
.pg .u3-pick{margin:8px 0 0;color:var(--text-soft)}
.pg .u3-prog{width:100%;margin-top:24px}
.pg .u3-route{display:flex;justify-content:space-between;margin-top:8px;font-size:var(--fs-caption);line-height:var(--lh-caption);color:var(--quiet)}
.pg .u3-rider{display:flex;align-items:center;gap:12px;width:100%;margin-top:24px}
.pg .u3-rmain{flex:1;min-width:0}
.pg .u3-rname{margin:0;font:var(--fw-label) var(--fs-body)/var(--lh-label) var(--ff-body)}
.pg .u3-rsub{margin:0;color:var(--quiet);font-size:var(--fs-label)}
.pg .u3-detail{width:100%;margin:24px 0;display:grid;gap:8px}
.pg .u3-detail div{display:flex;justify-content:space-between;gap:16px;padding-bottom:8px;border-bottom:var(--w-hairline) solid var(--divider)}
.pg .u3-detail dt{color:var(--quiet);font-size:var(--fs-label)}
.pg .u3-detail dd{margin:0;font-variant-numeric:tabular-nums}
.pg .u3-deliv{display:flex;flex-direction:column;min-width:0}
.pg .u3-book{margin-top:24px;display:flex;justify-content:flex-start}
.pg .u3-clock{font-size:var(--fs-label);color:var(--quiet)}
.pg .u3-ph{display:flex;flex-direction:column;background:var(--surface);color:var(--text)}
.pg .u3-phbody{flex:1;display:flex;flex-direction:column;align-items:flex-start;padding:24px 16px 16px;gap:0;min-height:0}
.pg .u3-phbody > .ui-card,.pg .u3-phbody > .ui-btn{margin-top:24px;width:100%}
.pg .u3-phtime{margin:8px 0 0;font-size:var(--fs-title);line-height:var(--lh-title)}
.pg .u3-phbody > .ui-btn{margin-top:auto}
.pg .u3-chip{display:block}
.pg .u3-steps{margin:0;padding:0;list-style:none;display:grid;gap:8px;width:100%}
.pg .u3-steps li{display:flex;align-items:center;gap:12px;font-size:var(--fs-body);line-height:var(--lh-body)}
.pg .u3-steps b{display:grid;place-items:center;width:24px;height:24px;border:var(--w-control) solid var(--text);border-radius:var(--r-round);font:var(--fw-label) var(--fs-caption)/1 var(--ff-body);font-variant-numeric:tabular-nums}
.pg .u3-code{margin:0;padding:16px 20px;font:400 12px/20px var(--cmono);color:var(--text);white-space:pre;overflow:hidden;tab-size:2}
.pg .u3-tk{position:absolute;font:400 12px/16px var(--cmono);color:var(--ink);white-space:nowrap}
`;
}
