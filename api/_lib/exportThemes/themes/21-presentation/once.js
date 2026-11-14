// A brand that says one word once (Long Room: "Say free once") must not print it on every row of the product screens. These helpers give the pages the
// brand's product-screen content with that word left off the repeated places. A brand without such a rule gets its content exactly as it is.
import { onceRe, sayOnce } from './lane-g3-kit.js';

const cache = new WeakMap();
// ctx.brand.ui.screen.content, but: the card text drops the sentence that carries the word, a row's price drops out where it is that word,
// and the paid stat shows the booking's status in its place
export function screenContent(ctx) {
  const S = ctx.brand.ui.screen.content, re = onceRe(ctx);
  if (!re) return S;
  if (!cache.has(S)) {
    const hit = (t) => re.test(t || '');
    cache.set(S, { ...S, pickup: sayOnce(ctx, S.pickup) || S.deliverTo, deliveries: S.deliveries.map((d) => ({ ...d, price: hit(d.price) ? '' : d.price })), ...(hit(S.paid) ? { paid: S.status, paidLabel: 'Status' } : {}) });
  }
  return cache.get(S);
}
// true where no row has a price to print, so a table can leave its price column out
export const noPrices = (ctx) => screenContent(ctx).deliveries.every((d) => !d.price);
// the engine's delivery rows (ctx.ui.deliveryRows), built from the content above
export function deliveryRows(ctx, n = 5) {
  const ui = ctx.ui, S = screenContent(ctx);
  return `<ul class="ui-list">${S.deliveries.slice(0, n).map((d) => ui.row({ lead: ui.icon(d.icon || ctx.brand.ui.rowIcon || 'package', 18), title: d.to, sub: d.when, end: d.price, chip: ui.statusChip(d.status) })).join('')}</ul>`;
}
