// A brand that says one word once (Long Room: "Say free once") must not print it on every row of the product screens. These helpers give the pages the
// brand's product-screen content with that word left off the repeated places. A brand without such a rule gets its content exactly as it is.
import { onceRe, sayOnce } from './lane-g3-kit.js';
import { ORDER_STATUS, LINK_ICONS } from './real-copy.js';

const cache = new WeakMap();
const slotted = new WeakMap();
// the slot edition's sample orders each carry the status real-copy.js gives them (the generic data cycles new, active, waiting, closed), and the
// navigation links their own icons
// (set in place, once: the placeholder swap also writes into these objects, and may run after the first call, so a copy would keep the generic words)
function slotOrders(S) {
  if (!slotted.has(S)) {
    slotted.set(S, true);
    S.deliveries.forEach((d, i) => { d.status = ORDER_STATUS[i] || d.status; });
    ((S.example || {}).links || []).forEach((l, k) => { l[1] = LINK_ICONS[k] || l[1]; });
  }
  return S;
}
// ctx.brand.ui.screen.content, but: the card text drops the sentence that carries the word, a row's price drops out where it is that word,
// and the paid stat shows the booking's status in its place
export function screenContent(ctx) {
  const S = ctx.edition === 'slot' ? slotOrders(ctx.brand.ui.screen.content) : ctx.brand.ui.screen.content, re = onceRe(ctx);
  if (!re) return S;
  if (!cache.has(S)) {
    const hit = (t) => re.test(t || '');
    cache.set(S, { ...S, pickup: sayOnce(ctx, S.pickup) || S.deliverTo, deliveries: S.deliveries.map((d) => ({ ...d, price: hit(d.price) ? '' : d.price })), ...(hit(S.paid) ? { paid: S.status, paidLabel: 'Status' } : {}) });
  }
  return cache.get(S);
}
// true where no row has a price to print, so a table can leave its price column out
export const noPrices = (ctx) => screenContent(ctx).deliveries.every((d) => !d.price);
// the orders under each tab, by the tone of their status: a warning is late, a neutral one is closed, the rest are open
export function tally(ctx) {
  const tone = (id) => (ctx.status.find((x) => x.id === id) || {}).tone, out = { open: [], late: [], closed: [] };
  for (const d of screenContent(ctx).deliveries) { const t = tone(d.status); (t === 'neutral' ? out.closed : t === 'warning' || t === 'danger' ? out.late : out.open).push(d); }
  return out;
}
// minutes into the day of the first "11:40 am" in a line; a line with no time sorts after the ones that have one
const clock = (t) => { const m = /(\d{1,2}):(\d{2})\s?([ap])m/i.exec(t || ''); return m ? (Number(m[1]) % 12 + (m[3].toLowerCase() === 'p' ? 12 : 0)) * 60 + Number(m[2]) : Infinity; };
// the orders as a table lists them, in the order the product screen tells: the late ones first, then the open ones by due time, the closed last
export function ordersByDue(ctx) {
  const t = tally(ctx);
  return [...t.late, ...[...t.open].sort((a, b) => clock(a.when) - clock(b.when)), ...t.closed];
}
// the engine's delivery rows (ctx.ui.deliveryRows), built from the content above (or from the given orders)
// The row of the order the screen's card is about (the customer the card names) is marked as the one in hand: aria-current, and the selected
// row state components.css ships (meta.shipped.selectedRow).
export function deliveryRows(ctx, n = 5, orders) {
  const ui = ctx.ui, S = screenContent(ctx);
  const row = (d) => { const h = ui.row({ lead: ui.icon(d.icon || ctx.brand.ui.rowIcon || 'package', 18), title: d.to, sub: d.when, end: d.price, chip: ui.statusChip(d.status) }); return d.to === S.deliverTo ? h.replace('class="ui-row"', 'class="ui-row" aria-current="true"') : h; };
  return `<ul class="ui-list">${(orders || S.deliveries).slice(0, n).map(row).join('')}</ul>`;
}
// What the card on the product screen, the kit's cover and the example page says it is: the order, its customer and its status, from the
// one sample story ("Order 1042 · Maya Chen · Packing"). Another edition keeps the engine's own words.
export function orderMeta(ctx) {
  const S = screenContent(ctx), no = /Order\s+(\d+)/.exec((S.deliveries.find((d) => d.to === S.deliverTo) || {}).when || '');
  return ctx.edition === 'slot' && no ? `Order ${no[1]} · ${S.deliverTo} · ${S.status}` : S.status;
}
// The open order's day as rows: what the card's own words already say (packing began, three of five items packed, due for hand-over), so the
// column under its buttons holds the order's progress and not a gap. Slot edition only.
export function orderTimeline(ctx) {
  const S = screenContent(ctx);
  if (ctx.edition !== 'slot') return '';
  const start = /(\d{1,2}:\d{2}\s?[ap]m)/i.exec(S.pickup || ''), due = /(\d{1,2}:\d{2}\s?[ap]m)/i.exec(S.eta || '');
  if (!start || !due) return '';
  const r = (title, end) => ctx.ui.row({ title, end });
  return `<ul class="ui-list">${r('Packing started', start[1])}${r(S.riderNote, 'Now')}${r('Hand over', due[1])}</ul>`;
}
// The example page's words and extras, for the slot edition's sample orders (engine hook: theme.exampleDemo):
// the day's takings (the order totals added up here, in cents) and the person signed in (a total that is not a plain price is left as the
// engine prints it); the card's order line; the list of open orders by due time; no stray count badge in the status row (nothing it counts);
// the open list under the dialog's scrim; and the page's layout rules (equal cards, buttons on one line).
export function exampleDemo(ctx) {
  if (ctx.edition !== 'slot') return {};
  const S = screenContent(ctx), open = tally(ctx).open;
  const base = {
    cardMeta: orderMeta(ctx), noBadge: true, sizesRow: true, list: deliveryRows(ctx, 5, open), behind: deliveryRows(ctx, 6, open),
    css: `.exrow--cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))}
@media (max-width:720px){.exrow--cards{grid-template-columns:minmax(0,1fr)}}
.exrow .ui-btn{white-space:nowrap}
.exrow__l{flex:none;min-width:48px;font:500 13px/1.4 var(--ff-body);color:var(--quiet)}
.ex-dlg{display:grid;border:1px solid var(--divider)}
.ex-dlg>*{grid-area:1/1;min-width:0}
.ex-dlg__behind{padding:16px;align-self:start}
.ex-dlg .ui-scrim{min-height:360px}`,
  };
  const rows = S.deliveries.map((d) => /^(\D*)(\d[\d,]*)(?:\.(\d{1,2}))?$/.exec(String(d.price || '').trim()));
  if (!rows.length || rows.some((m) => !m)) return base;
  const cents = rows.reduce((a, m) => a + Number(m[2].replace(/,/g, '')) * 100 + Number((m[3] || '0').padEnd(2, '0')), 0);
  const money = `${rows[0][1]}${Math.floor(cents / 100).toLocaleString('en-AU')}.${String(cents % 100).padStart(2, '0')}`;
  return { ...base, stat: [money, 'Taken today'], account: S.rider };
}
