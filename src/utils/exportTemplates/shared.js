// Helpers every export template shares. Templates return strings; they never
// read the design and never import a generator (tests/unit/template-seam.test.js).

export const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')

/**
 * Put `items` in the order a template names. Ids the template does not name keep
 * their place at the end, so a section the generator produced is never dropped;
 * ids it names that the generator did not produce are skipped.
 */
export function orderSections(items, order = [], key = (x) => x) {
  const rank = (item) => {
    const at = order.indexOf(key(item))
    return at === -1 ? order.length : at
  }
  return items.map((item, i) => ({ item, i })).sort((a, b) => rank(a.item) - rank(b.item) || a.i - b.i).map((x) => x.item)
}
