// /api/get-prices' answer shape for a stub.
//
// The route sends `source` and `currencyAvailability` beside every price list,
// and the app treats a price as live only when its own cadence's `source` is
// 'live' and `currencyAvailability` says so for that currency. A stub that
// spells out only the amounts would read as "no live price", so this fills both
// the way the route does:
//   · `source[interval]` is 'live' when the cadence lists a currency, else 'fallback'
//   · `currencyAvailability[interval][currency]` is true for each listed currency
//     of a live cadence, false otherwise
// A `source` the body already has is kept; a body that already has
// `currencyAvailability` keeps it.
export function withAvailability(body) {
  if (!body || typeof body !== 'object') return body
  const source = { ...(body.source || {}) }
  const currencyAvailability = {}
  for (const interval of ['monthly', 'yearly']) {
    const listed = Object.keys(body[interval] || {})
    source[interval] ??= listed.length ? 'live' : 'fallback'
    const live = source[interval] === 'live'
    currencyAvailability[interval] = Object.fromEntries(listed.map((currency) => [currency, live]))
  }
  return { ...body, source, currencyAvailability: body.currencyAvailability || currencyAvailability }
}
