// /api/get-prices' answer shape for a stub.
//
// The route sends `currencyAvailability` beside every price list, and the app
// treats a price as live only when it says so for that currency. A stub that
// spells out only `source` and the amounts would read as "no live price", so
// this fills the flags the way the route does: true for each currency of a
// cadence whose `source` is 'live', false otherwise. A body that already has
// `currencyAvailability` is returned as given.
export function withAvailability(body) {
  if (!body || typeof body !== 'object' || body.currencyAvailability) return body
  const currencyAvailability = {}
  for (const interval of ['monthly', 'yearly']) {
    const live = body.source?.[interval] === 'live' || body.source === undefined
    currencyAvailability[interval] = Object.fromEntries(
      Object.keys(body[interval] || {}).map((currency) => [currency, live]),
    )
  }
  return { ...body, currencyAvailability }
}
