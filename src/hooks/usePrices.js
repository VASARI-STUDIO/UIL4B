import { useState, useEffect, useMemo } from 'react'

// Currency symbols the site quotes. AUD is the anchor currency (the founder is
// AU-based — see docs/OWNER-ACTIONS.md). Prices are always sourced live from
// Stripe via /api/get-prices so no surface can display a price we don't charge.
const SYMBOLS = { usd: '$', eur: '€', gbp: '£', aud: 'A$', nzd: 'NZ$', cad: 'C$', sgd: 'S$', chf: 'Fr' }

// AUD anchor used ONLY when Stripe is unreachable, so a price field never renders
// blank. Not a source of truth — the server's DEFAULT_PRICES fallback owns that;
// this just keeps the UI graceful when /api/get-prices genuinely fails.
const FALLBACK = { monthly: 4.99, yearly: 39.99 }

export function formatPrice(amount, currency = 'usd') {
  const sym = SYMBOLS[currency] || '$'
  return `${sym}${Number(amount).toFixed(2)}`
}

// ── Module-scoped price cache ────────────────────────────────────────────────
// The Stripe price map is identical for every surface and never changes within a
// session, so we fetch it exactly once and share the result. Before this, each
// mount re-fetched, briefly rendering the AUD fallback anchor before the live
// number arrived — a visible price "flash" (wrong-then-right) every time a Pro
// modal opened. The cache lets a second-and-later mount read the settled price
// synchronously (no flash at all), and `settled` lets the very first mount show a
// neutral placeholder while the single request is in flight, rather than a number
// that changes a second later.
let priceCache = null      // last resolved price map, or null before first success
let priceSettled = false   // true once the single fetch has resolved OR failed
let inflight = null        // shared promise so concurrent mounts fetch only once
const subscribers = new Set()

function fetchPricesOnce() {
  if (priceSettled) return Promise.resolve(priceCache)
  if (inflight) return inflight
  inflight = fetch('/api/get-prices')
    .then(r => r.json())
    .then(d => { priceCache = d })
    .catch(() => { /* leave priceCache null → callers use the fallback anchor */ })
    .finally(() => {
      priceSettled = true
      inflight = null
      subscribers.forEach(fn => fn())
    })
  return inflight
}

// Fetch the live price map once per session (see cache note above). Returns
// { prices, settled }: `prices` is null until a fetch succeeds; `settled` flips
// true once the single request has resolved or failed, so a caller can tell
// "still loading" apart from "loaded, falling back to the anchor".
export function usePrices() {
  const [, force] = useState(0)
  useEffect(() => {
    if (priceSettled) return undefined
    const rerender = () => force((n) => n + 1)
    subscribers.add(rerender)
    fetchPricesOnce()
    return () => { subscribers.delete(rerender) }
  }, [])
  return { prices: priceCache, settled: priceSettled }
}

// Derive Pro display strings for one currency (default AUD, the site anchor).
// Only ever formats numbers Stripe actually returns; the fallback is the AUD
// anchor, never an invented figure. savingsPct is computed from the same two
// numbers, so a "Save N%" badge can never contradict the prices shown. `loaded`
// tracks `settled` — so a surface can hold a placeholder until the one real
// request lands and only ever paints the anchor after a genuine failure.
export function useProPrice(currency = 'aud') {
  const { prices, settled } = usePrices()
  return useMemo(() => {
    const liveMonthly = prices?.monthly?.[currency]
    const liveYearly = prices?.yearly?.[currency]
    const monthly = typeof liveMonthly === 'number' ? liveMonthly : FALLBACK.monthly
    const yearly = typeof liveYearly === 'number' ? liveYearly : FALLBACK.yearly
    const savingsPct = Math.round((1 - yearly / (monthly * 12)) * 100)
    return {
      currency,
      loaded: settled,
      monthly: formatPrice(monthly, currency),
      yearlyPerMonth: formatPrice(yearly / 12, currency),
      yearlyTotal: formatPrice(yearly, currency),
      savingsPct: savingsPct > 0 ? savingsPct : 0,
    }
  }, [prices, settled, currency])
}
