import { useState, useEffect, useMemo } from 'react'
import { detectCurrency, formatCurrency } from '../utils/currency'

const CANONICAL_LIFETIME = {
  usd: 89.99, eur: 84.99, gbp: 74.99, aud: 129, nzd: 139.99, cad: 119.99,
}

export const formatPrice = formatCurrency

let priceCache = null
let priceSettled = false
let inflight = null
const subscribers = new Set()

function fetchPricesOnce() {
  if (priceCache) return Promise.resolve(priceCache)
  if (inflight) return inflight
  inflight = fetch('/api/get-prices')
    .then((response) => {
      if (!response.ok) throw new Error(`Price service returned ${response.status}`)
      return response.json()
    })
    .then((data) => { priceCache = data })
    .catch(() => { /* retain an explicit unavailable state */ })
    .finally(() => {
      priceSettled = true
      inflight = null
      subscribers.forEach((notify) => notify())
    })
  return inflight
}

// Recovery path for the offline / price-service-down state: clears the settled
// flag so subscribers re-render into the loading state, then refetches. Without
// this a single failed fetch leaves the page permanently stuck on "Unavailable"
// until a full reload.
export function refreshPrices() {
  if (inflight) return inflight
  priceCache = null
  priceSettled = false
  subscribers.forEach((notify) => notify())
  return fetchPricesOnce()
}

export function usePrices() {
  const [, force] = useState(0)
  useEffect(() => {
    if (priceCache) return undefined
    const rerender = () => force((value) => value + 1)
    subscribers.add(rerender)
    fetchPricesOnce()
    return () => { subscribers.delete(rerender) }
  }, [])
  return { prices: priceCache, settled: priceSettled }
}

export function useProPrice(requestedCurrency) {
  const currency = requestedCurrency || detectCurrency()
  const { prices, settled } = usePrices()
  return useMemo(() => {
    const monthlyAmount = prices?.monthly?.[currency]
    const yearlyAmount = prices?.yearly?.[currency]
    const lifetimeAmount = prices?.lifetime?.[currency] ?? CANONICAL_LIFETIME[currency] ?? null
    const hasRecurring = typeof monthlyAmount === 'number' && typeof yearlyAmount === 'number'
    const savingsPct = hasRecurring
      ? Math.max(0, Math.round((1 - yearlyAmount / (monthlyAmount * 12)) * 100))
      : 0
    const currencyAvailability = prices?.currencyAvailability || {}
    return {
      currency,
      currencyLabel: currency.toUpperCase(),
      loaded: settled,
      serviceAvailable: !!prices,
      monthly: settled && typeof monthlyAmount === 'number' ? formatPrice(monthlyAmount, currency) : null,
      yearlyPerMonth: settled && typeof yearlyAmount === 'number' ? formatPrice(yearlyAmount / 12, currency) : null,
      yearlyTotal: settled && typeof yearlyAmount === 'number' ? formatPrice(yearlyAmount, currency) : null,
      lifetime: settled && typeof lifetimeAmount === 'number' ? formatPrice(lifetimeAmount, currency) : null,
      savingsPct,
      availability: {
        monthly: !!currencyAvailability.monthly?.[currency],
        yearly: !!currencyAvailability.yearly?.[currency],
        lifetime: !!currencyAvailability.lifetime?.[currency],
      },
      source: {
        monthly: prices?.source?.monthly || 'unavailable',
        yearly: prices?.source?.yearly || 'unavailable',
        lifetime: prices?.source?.lifetime || 'unavailable',
      },
    }
  }, [prices, settled, currency])
}
