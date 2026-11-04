import { useCallback, useMemo, useState, useSyncExternalStore } from 'react'
import { detectCurrency, formatCurrency } from '../utils/currency'
import { livePriceOf } from '../config/planLadder'

export const formatPrice = formatCurrency

let priceCache = null
let priceSettled = false
let inflight = null
// Rises on every settle and every refreshPrices(). It is what React compares: a
// component that rendered before a settle and subscribes after it reads a
// different number on subscribing, and renders again.
let version = 0
const subscribers = new Set()

function bump() {
  version += 1
  subscribers.forEach((notify) => notify())
}

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
      bump()
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
  bump()
  return fetchPricesOnce()
}

function subscribe(notify) {
  subscribers.add(notify)
  if (!priceCache) fetchPricesOnce()
  return () => { subscribers.delete(notify) }
}
const getSnapshot = () => version
const getServerSnapshot = () => 0

export function usePrices() {
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  return { prices: priceCache, settled: priceSettled }
}

// A Retry the person pressed. `retrying` is true from the press until the
// request it made settles, so the Retry button can read "Checking Stripe…" in
// its own place.
export function usePriceRetry() {
  const [retrying, setRetrying] = useState(false)
  const retry = useCallback(() => {
    const request = refreshPrices()
    setRetrying(true)
    request.finally(() => setRetrying(false))
  }, [])
  return { retrying, retry }
}

export function useProPrice(requestedCurrency) {
  const currency = requestedCurrency || detectCurrency()
  const { prices, settled } = usePrices()
  return useMemo(() => {
    // Live amounts only: a fallback default is not a price (see livePriceOf).
    const monthlyAmount = livePriceOf(prices, 'monthly', currency)
    const yearlyAmount = livePriceOf(prices, 'yearly', currency)
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
      savingsPct,
      availability: {
        monthly: !!currencyAvailability.monthly?.[currency],
        yearly: !!currencyAvailability.yearly?.[currency],
      },
      source: {
        monthly: prices?.source?.monthly || 'unavailable',
        yearly: prices?.source?.yearly || 'unavailable',
      },
    }
  }, [prices, settled, currency])
}
