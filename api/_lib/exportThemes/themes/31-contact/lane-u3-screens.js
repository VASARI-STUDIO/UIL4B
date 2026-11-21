// Theme 31, Contact sheet, lane u3: the product screens, built only from the real ctx.ui components and the brand's ui content.
// The pages print these as enlargements (lane-u3.js); the markup here is what a product team would ship, so the theme never restyles a component.
import { A, cwOn } from './helpers.js';

const sc = (ctx) => ctx.brand.ui.screen.content;
const ex = (ctx) => sc(ctx).example || {};
// the four places the app goes: the brand's nav links and its account link
const navItems = (ctx) => [...(ex(ctx).links || []), [ex(ctx).account || 'Account', 'user']];
const progress = (S) => `<div class="ui-progress" role="progressbar" aria-label="${A(S.from)}, ${A(S.to)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(S.progress * 100)}"><div class="ui-progress__bar"><i style="width:${S.progress * 100}%"></i></div><span class="ui-progress__dot" style="left:${S.progress * 100}%"></span></div><div class="u3-route"><span>${A(S.from)}</span><span>${A(S.to)}</span></div>`;
const riderRow = (ctx, S) => `<ul class="ui-list">${ctx.ui.row({ lead: `<span class="ui-avatar">${A(S.initials)}</span>`, title: S.rider, sub: S.riderNote, endHtml: ctx.ui.btn(S.call, { variant: 'secondary', size: 'sm' }) })}</ul>`;

// the components each screen is built from, in the order they appear, so the page can name them truthfully
export const DESK_PARTS = [['Top bar', 'ui-topbar'], ['Links', 'ui-link'], ['Breadcrumbs', 'ui-crumbs'], ['Status', 'ui-chip'], ['Progress', 'ui-progress'], ['Rows', 'ui-list, ui-row'], ['Avatar', 'ui-avatar'], ['Stats', 'ui-stat'], ['Switch', 'ui-switch'], ['Tabs', 'ui-tabs'], ['Alert', 'ui-alert'], ['Buttons', 'ui-btn']];

// the desktop screen at 1120 x 720 css px: the top bar, the job in progress on the left, the list of all jobs on the right
export const DESK_W = 1120, DESK_H = 720;
export function deskScreen(ctx, mode) {
  const B = ctx.brand, S = sc(ctx), X = ex(ctx), ui = ctx.ui, g = ctx.roles[mode].surface, d0 = S.deliveries[0];
  const bar = `<nav class="ui-topbar u3-bar" aria-label="Main"><div class="u3-bar__l">${ctx.logo.html('horizontal', { width: 120, colourway: cwOn(ctx, g) })}<div class="ui-topbar__links">${ui.links(X.links || [], 0)}</div></div><div class="u3-bar__r"><span class="ui-num">${A(S.time)}</span><span class="ui-avatar">${A(S.initials)}</span></div></nav>`;
  const main = `<section class="u3-main" aria-label="${A(B.ui.screen.title)}">${X.crumbs ? ui.crumbs(X.crumbs) : ''}
<div class="u3-head"><h1 class="u3-title">${A(B.ui.screen.title)}</h1>${ui.statusChip(d0.status)}</div>
<h2 class="ui-display u3-eta">${A(S.eta)}</h2>
<div class="u3-prog">${progress(S)}</div>
<p class="u3-pickup">${A(S.pickup)}</p>
${riderRow(ctx, S)}
<div class="u3-stats">${ui.stat(S.paid, S.paidLabel)}${ui.stat(S.deliverTo, S.deliverToLabel)}</div>
${ui.switch(S.share, { checked: true })}</section>`;
  const side = `<section class="u3-side" aria-label="${A((X.tabs || [])[0] || B.ui.screen.title)}">${X.tabs ? ui.tabs(X.tabs, 0) : ''}${ui.deliveryRows(5)}${ui.alert('info', S.alert)}<div class="u3-acts">${ui.btn(S.form.book, { iconRight: 'arrow-right' })}${X.secondary ? ui.btn(X.secondary, { variant: 'secondary' }) : ''}</div></section>`;
  return `<div class="u3-desk" style="width:${DESK_W}px;height:${DESK_H}px">${bar}<div class="u3-desk__body">${main}${side}</div></div>`;
}

// phones at 390 x 844 css px
export const PHONE_W = 390, PHONE_H = 844;
const phoneTop = (ctx, mode) => `<div class="u3-ptop"><span class="ui-num">${A(sc(ctx).time)}</span>${ctx.logo.html('horizontal', { width: 84, colourway: cwOn(ctx, ctx.roles[mode].surface) })}</div>`;
const tabbar = (ctx, active) => `<nav class="ui-tabbar u3-tabbar" aria-label="Main">${navItems(ctx).map(([t, i], k) => `<a href="#"${k === active ? ' aria-current="page"' : ''}>${ctx.ui.icon(i, 20)}<span>${A(t)}</span></a>`).join('')}</nav>`;
const phone = (inner) => `<div class="u3-phone" style="width:${PHONE_W}px;height:${PHONE_H}px">${inner}</div>`;

// home: the job in progress, what is next, the tab bar
export function phoneHome(ctx, mode) {
  const S = sc(ctx), ui = ctx.ui;
  return phone(`${phoneTop(ctx, mode)}<div class="u3-pbody">${ui.statusChip(S.deliveries[0].status)}<h1 class="ui-display u3-peta">${A(S.eta)}</h1><p class="u3-pickup">${A(S.pickup)}</p><div class="u3-prog">${progress(S)}</div>${riderRow(ctx, S)}${ui.deliveryRows(3).replace('<ul class="ui-list">', '<ul class="ui-list u3-tail">')}</div>${tabbar(ctx, 0)}`);
}
// the booking form, one field in error, the main action in reach of the thumb
export function phoneForm(ctx) {
  const F = sc(ctx).form, ui = ctx.ui;
  const fields = ui.field({ id: 'u3f1', label: F.pickup, value: F.pickupValue }) + ui.field({ id: 'u3f2', label: F.dropoff, value: F.dropoffValue })
    + ui.field({ id: 'u3f3', label: F.ready, value: F.readyValue, error: F.readyError }) + `<div class="ui-field"><span class="ui-label">${A(F.size)}</span>${ui.segmented(F.sizes, 1)}</div>`;
  return phone(`${phoneTop(ctx, 'light')}<div class="u3-pbody"><h1 class="ui-display u3-ptitle">${A(F.title)}</h1><div class="u3-fields">${fields}</div></div><div class="u3-pfoot">${ui.btn(F.book, { block: true })}</div>`);
}
// the list, just after booking: the toast confirms it, with the way back
export function phoneList(ctx) {
  const B = ctx.brand, S = sc(ctx), X = ex(ctx), ui = ctx.ui;
  return phone(`${phoneTop(ctx, 'light')}<div class="u3-pbody"><h1 class="ui-display u3-ptitle">${A(B.ui.screen.title)}</h1>${X.tabs ? ui.tabs(X.tabs, 1) : ''}${ui.deliveryRows(4)}</div><div class="u3-ptoast">${ui.toast(S.toast)}</div>${tabbar(ctx, 0)}`);
}

// screen layout only: where the real components sit. Scoped under .pg and the lane's u3- prefix.
export const screensCss = (ctx) => `
.pg .u3-desk{display:flex;flex-direction:column;background:var(--surface);color:var(--text)}
.pg .u3-bar{height:72px;padding:0 40px;flex:none}
.pg .u3-bar__l,.pg .u3-bar__r{display:flex;align-items:center;gap:40px}
.pg .u3-bar__r{gap:16px;font:500 var(--fs-label)/1 var(--ff-body);color:var(--text-soft)}
.pg .u3-desk__body{flex:1;min-height:0;display:grid;grid-template-columns:1fr 440px}
.pg .u3-main{padding:36px 48px 36px 40px;display:flex;flex-direction:column;gap:18px;min-width:0}
.pg .u3-head{display:flex;align-items:center;gap:16px}
.pg .u3-title{font:${ctx.weights.regular} var(--fs-title)/var(--lh-title) var(--ff-body);color:var(--text-soft)}
.pg .u3-eta{font-size:56px;line-height:60px;letter-spacing:-0.02em;font-stretch:${ctx.brand.fonts.display.stretch || 100}%;text-wrap:balance}
.pg .u3-prog{max-width:640px}
.pg .u3-route{display:flex;justify-content:space-between;margin-top:8px;color:var(--quiet);font-size:var(--fs-label)}
.pg .u3-pickup{color:var(--text-soft);max-width:60ch}
.pg .u3-stats{display:grid;grid-template-columns:1fr 1fr;gap:12px;max-width:640px}
.pg .u3-side{padding:28px 32px;background:var(--raised);display:flex;flex-direction:column;gap:20px;min-width:0}
.pg .u3-side .ui-list{border-top:0}
.pg .u3-acts{display:flex;gap:12px}
.pg .u3-phone{position:relative;overflow:hidden;background:var(--surface);color:var(--text)}
.pg .u3-ptop{display:flex;justify-content:space-between;align-items:center;height:64px;padding:0 20px;font:500 15px/20px var(--ff-body)}
.pg .u3-pbody{padding:8px 20px 0;display:flex;flex-direction:column;align-items:flex-start;gap:16px}
.pg .u3-pbody > *{align-self:stretch}
.pg .u3-pbody > .ui-chip{align-self:flex-start}
.pg .u3-peta{font-size:40px;line-height:44px;letter-spacing:-0.01em;font-stretch:${ctx.brand.fonts.display.stretch || 100}%;text-wrap:balance}
.pg .u3-ptitle{font-size:32px;line-height:36px;letter-spacing:-0.01em;font-stretch:${ctx.brand.fonts.display.stretch || 100}%}
.pg .u3-tail{border-top:0}
.pg .u3-fields{display:flex;flex-direction:column;gap:16px}
.pg .u3-pfoot{position:absolute;left:20px;right:20px;bottom:32px}
.pg .u3-ptoast{position:absolute;left:20px;right:20px;bottom:84px}
.pg .u3-ptoast .ui-toast{display:flex;justify-content:space-between}
.pg .u3-tabbar{position:absolute;left:0;right:0;bottom:0}
`;
