// A brand that says one word once (Long Room: "Say free once") must not print it on every row of the product screens. These helpers give the pages the
// brand's product-screen content with that word left off the repeated places. A brand without such a rule gets its content exactly as it is.
import { onceRe, sayOnce } from './lane-g3-kit.js';
import { ORDER_STATUS } from './real-copy.js';

const cache = new WeakMap();
const slotted = new WeakMap();
// the slot edition's sample orders each carry the status real-copy.js gives them (the generic data cycles new, active, waiting, closed)
function slotOrders(S) {
  if (!slotted.has(S)) slotted.set(S, { ...S, deliveries: S.deliveries.map((d, i) => ({ ...d, status: ORDER_STATUS[i] || d.status })) });
  return slotted.get(S);
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
// the engine's delivery rows (ctx.ui.deliveryRows), built from the content above (or from the given orders)
export function deliveryRows(ctx, n = 5, orders) {
  const ui = ctx.ui, S = screenContent(ctx);
  return `<ul class="ui-list">${(orders || S.deliveries).slice(0, n).map((d) => ui.row({ lead: ui.icon(d.icon || ctx.brand.ui.rowIcon || 'package', 18), title: d.to, sub: d.when, end: d.price, chip: ui.statusChip(d.status) })).join('')}</ul>`;
}
// The example page's total and account value, for the slot edition's sample orders: the day's takings (the order totals added up here,
// in cents) and the person signed in. A total that is not a plain price is left as the engine prints it.
export function exampleDemo(ctx) {
  if (ctx.edition !== 'slot') return {};
  const S = screenContent(ctx);
  const rows = S.deliveries.map((d) => /^(\D*)(\d[\d,]*)(?:\.(\d{1,2}))?$/.exec(String(d.price || '').trim()));
  if (!rows.length || rows.some((m) => !m)) return {};
  const cents = rows.reduce((a, m) => a + Number(m[2].replace(/,/g, '')) * 100 + Number((m[3] || '0').padEnd(2, '0')), 0);
  const money = `${rows[0][1]}${Math.floor(cents / 100).toLocaleString('en-AU')}.${String(cents % 100).padStart(2, '0')}`;
  return { stat: [money, 'Taken today'], account: S.rider };
}
