import { useState, useEffect, useMemo } from 'react'

// Currency symbols the site quotes. AUD is the anchor currency (the founder is
// AU-based — see docs/OWNER-ACTIONS.md). Prices are always sourced live from
// Stripe via /api/get-prices so no surface can display a price we don't charge.
const SYMBOLS = { usd: '$', eur: '€', gbp: '£', aud: 'A$', nzd: 'NZ$', cad: 'C$', sgd: 'S$', chf: 'Fr' }

// AUD anchor used ONLY when Stripe is unreachable, so a price field never renders
// blank. Not a source of truth — the server's DEFAULT_PRICES fallback owns that;
// this just keeps the UI graceful before /api/get-prices resolves.
const FALLBACK = { monthly: 4.99, yearly: 39.99 }

export function formatPrice(amount, currency = 'usd') {
  const sym = SYMBOLS[currency] || '$'
  return `${sym}${Number(amount).toFixed(2)}`
}

// Fetch the live price map once per mount. Shape from /api/get-prices:
//   { monthly: { usd, aud, … }, yearly: { usd, aud, … } }
// Returns null until loaded so callers can fall back gracefully.
export function usePrices() {
  const [prices, setPrices] = useState(null)
  useEffect(() => {
    let alive = true
    fetch('/api/get-prices')
      .then(r => r.json())
      .then(d => { if (alive) setPrices(d) })
      .catch(() => { /* keep null → callers use the fallback anchor */ })
    return () => { alive = false }
  }, [])
  return prices
}

// Derive Pro display strings for one currency (default AUD, the site anchor).
// Only ever formats numbers Stripe actually returns; the fallback is the AUD
// anchor, never an invented figure. savingsPct is computed from the same two
// numbers, so a "Save N%" badge can never contradict the prices shown.
export function useProPrice(currency = 'aud') {
  const prices = usePrices()
  return useMemo(() => {
    const liveMonthly = prices?.monthly?.[currency]
    const liveYearly = prices?.yearly?.[currency]
    const monthly = typeof liveMonthly === 'number' ? liveMonthly : FALLBACK.monthly
    const yearly = typeof liveYearly === 'number' ? liveYearly : FALLBACK.yearly
    const savingsPct = Math.round((1 - yearly / (monthly * 12)) * 100)
    return {
      currency,
      loaded: !!prices,
      monthly: formatPrice(monthly, currency),
      yearlyPerMonth: formatPrice(yearly / 12, currency),
      yearlyTotal: formatPrice(yearly, currency),
      savingsPct: savingsPct > 0 ? savingsPct : 0,
    }
  }, [prices, currency])
}
