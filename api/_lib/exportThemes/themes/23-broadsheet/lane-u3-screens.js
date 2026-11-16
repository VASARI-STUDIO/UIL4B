// Theme 23, Broadsheet, lane u3: the product's own screens, built only from ctx.ui and the brand's ui copy. Imported by lane-u3.js; never auto-loaded.
// The screens are app layout (where the parts sit), never a restyle of a part: every colour, size and weight inside them is a token var.
import { esc } from '../../engine/brand.js';

const sc = (ctx) => ctx.brand.ui.screen.content;
const ex = (ctx) => sc(ctx).example || {};
const wordmark = (ctx) => `<strong class="ui-display u3-wm">${esc(ctx.brand.logo.showcase.wordmark)}</strong>`;
// the status the screen is in: the one whose label is the screen's status line, else the first delivery's
const liveStatus = (ctx) => { const S = sc(ctx); return (ctx.status.find((s) => s.label === S.status) || ctx.status.find((s) => s.id === S.deliveries[0].status) || ctx.status[0]).id; };

export const css = (ctx) => {
  const W = ctx.weights;
  return `
.pg .u3-app{position:absolute;left:0;top:0;right:0;bottom:0;display:flex;flex-direction:column}
.pg .u3-app > .ui-topbar{flex:none;padding:0 24px}
.pg .u3-wm{font-size:var(--fs-title);line-height:var(--lh-title)}
.pg .u3-time{color:var(--text-soft);font-size:var(--fs-label);line-height:var(--lh-label)}
.pg .u3-main{flex:1;display:grid;grid-template-columns:360px minmax(0,1fr);min-height:0}
.pg .u3-ad{display:flex;flex-direction:column;height:100%}
.pg .u3-adh{margin:0;font-size:72px;line-height:76px;max-width:16ch;text-wrap:balance}
.pg .u3-add{margin:16px 0 0;max-width:40ch;font-size:var(--fs-title);line-height:var(--lh-title);color:var(--text-soft)}
.pg .u3-frame{position:relative;flex:none;margin-top:40px;border:var(--w-control) solid var(--edge);overflow:hidden}
.pg .u3-sig{margin-top:auto;display:flex;justify-content:space-between;align-items:center;gap:24px}
.pg .u3-logo svg{display:block}
.pg .u3-pane{padding:40px;display:flex;flex-direction:column;gap:20px;min-width:0}
.pg .u3-pane + .u3-pane{border-left:var(--w-hairline) solid var(--divider)}
.pg .u3-eta{margin:0;font-size:var(--fs-headline);line-height:var(--lh-headline)}
.pg .u3-soft{color:var(--text-soft)}
.pg .u3-route{display:flex;justify-content:space-between;margin-top:8px;color:var(--quiet);font-size:var(--fs-label);line-height:var(--lh-label)}
.pg .u3-rider{display:flex;align-items:center;gap:12px;padding:16px 0;border-top:var(--w-hairline) solid var(--divider);border-bottom:var(--w-hairline) solid var(--divider)}
.pg .u3-rider > div{flex:1;min-width:0}
.pg .u3-rname{font-weight:${W.medium}}
.pg .u3-rsub{color:var(--quiet);font-size:var(--fs-label);line-height:var(--lh-label)}
.pg .u3-dl{margin:0}
.pg .u3-dl div{display:flex;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:var(--w-hairline) solid var(--divider)}
.pg .u3-dl dt{color:var(--quiet)}
.pg .u3-dl dd{margin:0;font-weight:${W.medium};text-align:right}
.pg .u3-head{display:flex;justify-content:space-between;align-items:center;gap:16px}
.pg .u3-t{margin:0;font-size:var(--fs-title);line-height:var(--lh-title)}
.pg .u3-h{margin:0;font-size:var(--fs-headline);line-height:var(--lh-headline)}
.pg .u3-form{display:grid;grid-template-columns:minmax(0,1fr) 232px;gap:40px;align-items:start}
.pg .u3-fields{display:flex;flex-direction:column;gap:20px}
.pg .u3-checks{display:flex;flex-direction:column;gap:12px}
.pg .u3-btns{display:flex;gap:12px;flex-wrap:wrap}
.pg .u3-side{display:flex;flex-direction:column;gap:16px}
.pg .u3-body{flex:1;padding:32px 40px 40px;display:flex;flex-direction:column;gap:24px;min-height:0}

/* the phone, 390 x 844: a status strip, the body, the tab bar on the floor */
.pg .u3-ph{position:absolute;left:0;top:0;right:0;bottom:0;display:flex;flex-direction:column}
.pg .u3-ph-top{flex:none;display:flex;justify-content:space-between;align-items:center;height:52px;padding:0 20px;border-bottom:var(--w-hairline) solid var(--divider)}
.pg .u3-ph-body{flex:1;padding:24px 20px;display:flex;flex-direction:column;gap:20px;min-height:0}
.pg .u3-ph .ui-tabbar{flex:none}
.pg .u3-ph .ui-tabbar a{min-width:0}
`;
};

// a .ui region the size of its ad box
export const shell = (ctx, inner, cls = 'u3-app') => `<div class="${cls}">${inner}</div>`;

const progress = (S) => `<div><div class="ui-progress" role="progressbar" aria-label="${esc(S.status)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(S.progress * 100)}"><div class="ui-progress__bar"><i style="width:${S.progress * 100}%"></i></div><span class="ui-progress__dot" style="left:${S.progress * 100}%"></span></div><p class="u3-route"><span>${esc(S.from)}</span><span>${esc(S.to)}</span></p></div>`;
const rider = (ctx, S) => `<div class="u3-rider"><span class="ui-avatar">${esc(S.initials)}</span><div><p class="u3-rname">${esc(S.rider)}</p><p class="u3-rsub">${esc(S.riderNote)}</p></div>${ctx.ui.btn(S.call, { variant: 'secondary', size: 'sm', iconLeft: 'phone' })}</div>`;
const details = (S) => `<dl class="u3-dl"><div><dt>${esc(S.deliverToLabel)}</dt><dd>${esc(S.deliverTo)}</dd></div><div><dt>${esc(S.paidLabel)}</dt><dd class="ui-num">${esc(S.paid)}</dd></div></dl>`;
const status = (ctx, S) => `<div>${ctx.ui.statusChip(liveStatus(ctx))}</div><h2 class="ui-display u3-eta">${esc(S.eta)}</h2><p class="u3-soft">${esc(S.pickup)}</p>`;
const topbar = (ctx, active = 0) => { const S = sc(ctx), X = ex(ctx); return `<nav class="ui-topbar" aria-label="Main">${wordmark(ctx)}<div class="ui-topbar__links">${ctx.ui.links(X.links || [], active)}</div><span class="ui-num u3-time">${esc(S.time)}</span></nav>`; };

// the working screen: the live order on the left, the week's list on the right
export function desktop(ctx) {
  const S = sc(ctx), X = ex(ctx), ui = ctx.ui, F = S.form;
  const left = `<section class="u3-pane">${status(ctx, S)}${progress(S)}${rider(ctx, S)}${details(S)}${ui.btn(S.share, { variant: 'secondary', block: true })}</section>`;
  const right = `<section class="u3-pane"><div class="u3-head"><h2 class="ui-display u3-t">${esc(ctx.brand.ui.screen.title)}</h2>${ui.btn(F.book, { iconRight: 'arrow-right' })}</div>${X.tabs ? ui.tabs(X.tabs, 0) : ''}${ui.deliveryRows(5)}${S.alert ? ui.alert('warning', S.alert) : ''}</section>`;
  return `${topbar(ctx)}<div class="u3-main">${left}${right}</div>`;
}

// the order form: crumbs, the form's title, its fields (one in error), the choices, and the total beside it
export function bookingScreen(ctx) {
  const S = sc(ctx), X = ex(ctx), ui = ctx.ui, F = S.form;
  const fields = [ui.field({ id: 'u3-f1', label: F.pickup, value: F.pickupValue })];
  if (F.dropoff !== F.ready) fields.push(ui.field({ id: 'u3-f2', label: F.dropoff, value: F.dropoffValue }));
  fields.push(ui.field({ id: 'u3-f3', label: F.ready, value: F.readyValue, error: F.readyError }));
  fields.push(ui.field({ id: 'u3-f4', label: F.size, kind: 'select', options: F.sizes, value: F.sizes[0] }));
  fields.push(ui.field({ id: 'u3-f5', label: F.notes, kind: 'textarea', help: F.notesHelp }));
  const checks = `<div class="u3-checks">${(X.checks || []).slice(0, 2).map((c, i) => ui.check(c, { checked: i === 0 })).join('')}${X.switches ? ui.switch(X.switches[0], { checked: true }) : ''}</div>`;
  const side = `<aside class="u3-side">${ui.stat(S.paid, X.statLabel || S.paidLabel)}${ui.card({ meta: S.deliverToLabel, title: S.deliverTo, text: S.pickup })}</aside>`;
  const body = `<div class="u3-body">${X.crumbs ? ui.crumbs([...X.crumbs, F.title]) : ''}<h2 class="ui-display u3-h">${esc(F.title)}</h2><div class="u3-form"><div class="u3-fields">${fields.join('')}${checks}<div class="u3-btns">${ui.btn(F.book)}</div></div>${side}</div></div>`;
  return `${topbar(ctx, 1)}${body}`;
}

// the phone: the live order, held in one hand, with the tab bar on the floor
export function phone(ctx) {
  const S = sc(ctx), X = ex(ctx), ui = ctx.ui;
  const tabs = [...(X.links || []), [X.account || 'Account', 'user']].slice(0, 4);
  const bar = `<nav class="ui-tabbar" aria-label="Main">${tabs.map(([t, i], k) => `<a href="#"${k === 0 ? ' aria-current="page"' : ''}>${ui.icon(i, 22)}<span>${esc(t)}</span></a>`).join('')}</nav>`;
  return `<div class="u3-ph"><div class="u3-ph-top"><span class="ui-num u3-time">${esc(S.time)}</span>${wordmark(ctx)}</div><div class="u3-ph-body">${status(ctx, S)}${progress(S)}${rider(ctx, S)}${details(S)}${ui.btn(S.share, { variant: 'secondary', block: true })}</div>${bar}</div>`;
}

// the component blocks a screen is built from, in the order they first appear (utilities like .ui-icon and .ui-num left out)
export function classesIn(html) {
  const out = [];
  for (const m of html.matchAll(/class="([^"]+)"/g)) for (const c of m[1].split(/\s+/)) if (/^ui-[a-z]+$/.test(c) && !['ui-icon', 'ui-num', 'ui-display'].includes(c) && !out.includes(c)) out.push(c);
  return out;
}
// each block with the kit page that documents it
const HOME = {
  btn: 'buttons', topbar: 'navigation', link: 'navigation', tabs: 'navigation', crumbs: 'navigation', tabbar: 'navigation', list: 'lists', row: 'lists',
  chip: 'status', progress: 'status', avatar: 'radii-borders', stat: 'cards', card: 'cards', alert: 'feedback', toast: 'feedback', field: 'inputs', input: 'inputs',
  select: 'inputs', textarea: 'inputs', label: 'inputs', help: 'inputs', error: 'inputs', choice: 'choices', switch: 'choices', dialog: 'dialog', scrim: 'dialog', table: 'table', empty: 'empty',
};
export const indexOf = (ctx, classes) => classes.map((c) => [`.${c}`, HOME[c.slice(3)] ? ctx.pageNo(HOME[c.slice(3)]) : null]);
