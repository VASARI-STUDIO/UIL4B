// THE PLAN FACTS — one module every surface that describes Free and Pro reads.
//
// /plans, Settings → Subscription, the Pro upgrade modal and the checkout
// summary all describe what Free and Pro include. The lines live HERE, and
// every surface imports them — so a fact can only change in one place, and
// tests/unit/plan-facts.test.js fails if a surface grows its own list again.
//
// Every number is derived from the module that ENFORCES it; nothing is typed:
//   AI_LIMITS / FREE_SAVE_LIMITS → config/plans.js (mirror of api/_lib/plans.js)
//   COLOUR_SYSTEMS               → what the palette engine gates on
//   export formats               → config/exportFormats.js, which renders the buttons
//   libraries, icons, sizes      → data/libraryTotals.js, utils/lockedPreview.js, data/iconPackTiers.js,
//                                  utils/iconSize.js, utils/iconLineStyle.js
//   cadences, trials             → config/planLadder.js (mirror of api/_lib/pricing.js)
//   prices                       → /api/get-prices, passed in; never typed
//   the tool count               → data/toolTree.js, live and not beta
//
// DOM-free, React-free.

import { AI_LIMITS, FREE_SAVE_LIMITS } from './plans.js'
import { COLOUR_SYSTEMS } from './colourSystems.js'
import { creditedFormats, freeFormats, proOnlyFormats, styleGuideFormats } from './exportFormats.js'
import { LIBRARY_TOTALS } from '../data/libraryTotals.js'
import { GALLERY_TIER_LIMITS } from '../utils/lockedPreview.js'
import { ICON_PACK_TIERS } from '../data/iconPackTiers.js'
import { CUSTOM_SIZE_MAX, CUSTOM_SIZE_MIN, ICON_SIZE_PRESETS } from '../utils/iconSize.js'
import { LINE_STYLES } from '../utils/iconLineStyle.js'
import { PLAN_LADDER, formatMoney, livePriceOf } from './planLadder.js'
import { createTools } from '../data/toolTree.js'
import { BILLED_EVERY } from '../utils/billingCadence.js'

const AI = AI_LIMITS

/** Live and not beta — the same count /plans and the landing print. */
export const TOOL_COUNT = createTools().filter((t) => !t.soon && !t.beta).length

const NUMBER_WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen', 'twenty',
]
export function numberWord(n) {
  return NUMBER_WORDS[n] || String(n)
}

const SYSTEMS_TOTAL = COLOUR_SYSTEMS.length

// "Style guide (HTML)" → "HTML".
const shortName = (f) => {
  const inParens = /\(([^)]+)\)\s*$/.exec(f.name)
  return inParens ? inParens[1] : f.name
}
const listNames = (formats) => {
  const names = formats.map(shortName)
  if (names.length < 2) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}
export const FREE_EXPORT_NAMES = listNames(freeFormats())
/** The free formats other than the UI kit, which the Free card names on its own. */
export const STYLE_GUIDE_EXPORT_NAMES = listNames(styleGuideFormats())
export const PRO_EXPORT_NAMES = proOnlyFormats().map((f) => f.name).join(' and ')

/** What Free includes — /plans' Free card, in order. */
export const FREE_POINTS = Object.freeze([
  `All ${numberWord(TOOL_COUNT)} tools`,
  `${AI.free.daily} AI generations a day, ${AI.free.monthly} a month`,
  `The UI kit, and style guide exports in ${STYLE_GUIDE_EXPORT_NAMES}`,
  `${FREE_SAVE_LIMITS.projects} saved projects and ${FREE_SAVE_LIMITS.customIcons} custom icons`,
])

/** /plans' one minus line on the Free card. */
export const FREE_EXCLUSION = 'Small mark on exported files'

const joinAnd = (items) => (items.length < 2
  ? items.join('')
  : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`)
const capitalise = (text) => `${text.charAt(0).toUpperCase()}${text.slice(1)}`

// The kinds of paid icon pack, in the order the plan lines name them. Every
// `tier: 'paid'` entry in data/iconPackTiers.js carries one as its `group`.
export const PAID_PACK_GROUPS = Object.freeze(['brand', 'flag', 'emoji', 'colour', 'animated'])
const PACK_GROUP_WORD = Object.freeze({ brand: 'brand', flag: 'flag', emoji: 'emoji', colour: 'coloured', animated: 'animated' })
const PAID_PACK_WORDS = PAID_PACK_GROUPS
  .filter((g) => Object.values(ICON_PACK_TIERS).some((t) => t.tier === 'paid' && t.group === g))
  .map((g) => PACK_GROUP_WORD[g])

const PRO_LINE_STYLE_NAMES = LINE_STYLES.filter((s) => s.pro).map((s) => s.name)
const FREE_LINE_STYLE_NAMES = LINE_STYLES.filter((s) => !s.pro).map((s) => s.name)
const FREE_SIZE_NAMES = `${joinAnd(ICON_SIZE_PRESETS.map(String))}px`
const LIBRARY_CAP = GALLERY_TIER_LIMITS.free
const LIBRARY_CAP_SIGNED_OUT = GALLERY_TIER_LIMITS.anonymous
const SYSTEMS_FREE_COUNT = COLOUR_SYSTEMS.filter((s) => s.free).length
const CREDIT_FREE_NAMES = listNames(creditedFormats())
const CREDIT_NONE_NAMES = listNames(freeFormats().filter((f) => f.credit === false))
/** The free files with no place for the credit line, named for the FAQ. */
export const UNCREDITED_EXPORT_NAMES = CREDIT_NONE_NAMES
/** The free files that carry the credit line. */
export const CREDITED_EXPORT_NAMES = CREDIT_FREE_NAMES

/**
 * WHAT PRO ADDS, as the comparison groups /plans prints. Each row is one limit
 * or gate the product enforces, quoted from the module that enforces it:
 *   AI                  config/plans.js (api/_lib/plans.js is the server's copy)
 *   colour systems      config/colourSystems.js (the palette engine's gate)
 *   brand palettes      data/libraryTotals.js
 *   libraries           utils/lockedPreview.js GALLERY_TIER_LIMITS, data/libraryTotals.js
 *   icon packs          data/iconPackTiers.js (`tier: 'paid'` and its `group`)
 *   icon size, styles   utils/iconSize.js, utils/iconLineStyle.js
 *   saved work          config/plans.js FREE_SAVE_LIMITS
 *   exports             config/exportFormats.js
 */
export const PRO_VALUE = Object.freeze([
  { group: 'AI', rows: [
    { label: 'AI generations', free: `${AI.free.daily} a day, ${AI.free.monthly} a month`, pro: `${AI.pro.daily} a day, ${AI.pro.monthly} a month` },
  ] },
  { group: 'Colour', rows: [
    { label: 'Colour systems', free: `${SYSTEMS_FREE_COUNT} of ${SYSTEMS_TOTAL}`, pro: `All ${SYSTEMS_TOTAL}, plus HCT editing` },
  ] },
  { group: 'Libraries', rows: [
    { label: 'Brand palettes', free: `${LIBRARY_TOTALS.freeBrandPalettes} of ${LIBRARY_TOTALS.brandPalettes}`, pro: `All ${LIBRARY_TOTALS.brandPalettes}` },
    {
      label: 'Palette, gradient and prompt libraries',
      free: `First ${LIBRARY_CAP} of each, ${LIBRARY_CAP_SIGNED_OUT} when signed out`,
      pro: `All ${LIBRARY_TOTALS.palettes} palettes, ${LIBRARY_TOTALS.gradients} gradients and ${LIBRARY_TOTALS.prompts} prompts`,
    },
  ] },
  { group: 'Icons', rows: [
    { label: 'Icon packs', free: 'Outline and solid interface packs', pro: `Plus ${joinAnd(PAID_PACK_WORDS)} packs, and Carbon’s brand logos` },
    { label: 'Icon export size', free: FREE_SIZE_NAMES, pro: `Any size from ${CUSTOM_SIZE_MIN} to ${CUSTOM_SIZE_MAX}px` },
    { label: 'Icon line styles', free: joinAnd(FREE_LINE_STYLE_NAMES), pro: `Plus ${joinAnd(PRO_LINE_STYLE_NAMES)}` },
  ] },
  { group: 'Your work', rows: [
    { label: 'Saved projects', free: String(FREE_SAVE_LIMITS.projects), pro: 'Unlimited' },
    { label: 'Custom icons', free: String(FREE_SAVE_LIMITS.customIcons), pro: 'Unlimited' },
  ] },
  { group: 'Exports', rows: [
    ...proOnlyFormats().map((f) => ({ label: f.name, free: null, pro: 'Included' })),
    {
      label: '“Made with UIL4B” line on exports',
      free: CREDIT_NONE_NAMES ? `Small line, except on ${CREDIT_NONE_NAMES}` : 'Small line',
      pro: 'Removed',
    },
  ] },
])

/** What Pro adds — /plans' Pro card, Checkout, Settings and the upgrade modal, in order. */
export const PRO_POINTS = Object.freeze([
  `${AI.pro.daily} AI generations a day, ${AI.pro.monthly} a month`,
  `All ${SYSTEMS_TOTAL} colour systems, plus HCT editing`,
  'Every palette, gradient, prompt and brand palette',
  `${capitalise(joinAnd(PAID_PACK_WORDS))} icons, at any size`,
  'Unlimited saved projects and custom icons',
  `${PRO_EXPORT_NAMES}, with no UIL4B line on anything`,
])

// ── Cadences ─────────────────────────────────────────────────────────────────

/** The cadences a person can buy — a tier with no checkout is never offered. */
export const BILLING_OPTIONS = Object.freeze(PLAN_LADDER.filter((p) => p.checkoutPlan))
export const DEFAULT_BILLING = (BILLING_OPTIONS.find((p) => p.best) || BILLING_OPTIONS[0]).id
// The cadence wording lives in utils/billingCadence.js, the one source.
export { BILLED_EVERY }

/** Rounded once, the way planLadder rounds it: $48/12 is $4, never $3.99. */
export const perMonth = (total, months) => Math.round((total / months) * 100) / 100

/**
 * Every buyable cadence resolved against the live prices, carrying exactly
 * what /plans prints for it: the per-month amount, the saving against monthly
 * ("Save 17%", nothing under 5%), the trial, and the billed line.
 *
 * `prices` is usePrices().prices; `loaded` is useProPrice().loaded. No price →
 * `amountLabel: null` and `priceServiceDown: true`: an offer is never shown
 * without its amount.
 *
 * Only a price Stripe reports live, in this currency, counts (livePriceOf). A
 * cadence the service answers for with a fallback default has `available:
 * false`, no amount and an `unavailableNote`: it is never offered for
 * checkout. `priceServiceDown` is true only when NO cadence has a price. The
 * saving exists only when the monthly price is live in the same currency.
 */
export function resolveOffers({ prices, currency = 'usd', loaded = true } = {}) {
  const totalOf = (o) => (loaded ? livePriceOf(prices, o.liveKey, currency) : undefined)
  const monthly = BILLING_OPTIONS.find((o) => o.id === 'monthly')
  const monthlyTotal = monthly ? totalOf(monthly) : undefined
  const hasMonthly = typeof monthlyTotal === 'number'
  const offers = BILLING_OPTIONS.map((o) => {
    const total = totalOf(o)
    const has = typeof total === 'number'
    let saving = 0
    if (o.id !== 'monthly' && hasMonthly && has) {
      const pct = Math.round((1 - perMonth(total, o.months) / monthlyTotal) * 100)
      saving = pct >= 5 ? pct : 0
    }
    const trial = o.trialDays ? `, ${o.trialDays}-day free trial` : ''
    const billedNote = !has ? null : o.months > 1
      ? `Billed ${formatMoney(total, currency)} ${BILLED_EVERY[o.id]}${trial}, cancel any time. Keep every export you made.`
      : `Billed ${BILLED_EVERY[o.id]}${trial}, cancel any time. Keep every export you made.`
    return {
      id: o.id,
      label: o.label,
      months: o.months,
      checkoutPlan: o.checkoutPlan,
      trialDays: o.trialDays || 0,
      available: has,
      total: has ? total : null,
      amountLabel: has ? formatMoney(perMonth(total, o.months), currency) : null,
      totalLabel: has ? formatMoney(total, currency) : null,
      saving,
      savingLabel: saving > 0 ? `Save ${saving}%` : '',
      unavailableNote: loaded && !has ? `No ${currency.toUpperCase()} price for this billing period right now` : null,
      billedNote,
    }
  })
  return { offers, priceServiceDown: loaded && offers.every((o) => o.amountLabel === null) }
}

/**
 * THE ONE PRICE STATE every Pro button and price slot reads (/plans, /checkout,
 * Settings). Exactly one of:
 *   loading          the fetch has not settled
 *   retrying         the fetch has not settled, after a Retry the person pressed
 *   unreachable      settled, and Stripe has no live price for any cadence
 *   no-currency      Stripe has a live price, but none in this currency
 *   cadence-missing  the selected cadence has no price here, another one does
 *   live             the selected cadence has a price: the only state that sells
 *
 * `price` is useProPrice(); `offers` is resolveOffers().offers.
 */
export function priceState({ price, offers, selectedId, retrying = false } = {}) {
  if (!price?.loaded) return retrying ? 'retrying' : 'loading'
  const live = (id) => price.source?.[id] === 'live'
  const noLiveSource = !price.serviceAvailable || !BILLING_OPTIONS.some((o) => live(o.id))
  if (noLiveSource) return 'unreachable'
  // An amount sells only when its own cadence reports 'live'; a cadence with no
  // `source` entry is never live.
  const sellable = (o) => !!o.amountLabel && live(o.id)
  const list = offers || []
  const selected = list.find((o) => o.id === selectedId) || list[0]
  if (selected && sellable(selected)) return 'live'
  return list.some(sellable) ? 'cadence-missing' : 'no-currency'
}

/** Only a live price may open a checkout. Every other state links nowhere. */
export const canCheckout = (state) => state === 'live'

/** A Retry is the action in the states where asking again can change the answer. */
export const canRetryPrice = (state) => state === 'unreachable' || state === 'no-currency' || state === 'retrying'

/**
 * THE ONLY PLACE OUTAGE WORDS LIVE. Each surface imports these, so /plans,
 * /checkout and Settings cannot describe one outage three ways. "Unavailable"
 * is said once, in the price slot.
 *   word    the price slot (instead of an amount)
 *   line1   the note's first line      line2  its second line, or ''
 *   button  the label of the action in the Pro button slot, or null for the
 *           surface's normal Pro label
 *   under   the line under the button
 * `ctx` is { currencyLabel, selectedLabel, otherLabel }.
 */
const FREE_KEEPS_WORKING = 'Everything on Free keeps working.'
const RETRY_LABEL = 'Retry live pricing'
export const PRICE_STATE_COPY = Object.freeze({
  loading: () => ({ word: '—', line1: 'Checking the live price…', line2: '', button: null, under: '' }),
  retrying: () => ({ word: '—', line1: 'Checking the live price…', line2: '', button: 'Checking Stripe…', under: '' }),
  unreachable: () => ({
    word: 'Unavailable',
    line1: 'Stripe didn’t answer, so no checkout can start.',
    line2: 'Your card isn’t asked for until it does.',
    button: RETRY_LABEL,
    under: FREE_KEEPS_WORKING,
  }),
  'no-currency': ({ currencyLabel }) => ({
    word: 'Unavailable',
    line1: `Pro has no ${currencyLabel} price yet.`,
    line2: 'Checkout opens once it has one.',
    button: RETRY_LABEL,
    under: FREE_KEEPS_WORKING,
  }),
  'cadence-missing': ({ currencyLabel, selectedLabel, otherLabel }) => ({
    word: 'Unavailable',
    line1: `No ${currencyLabel} price for ${selectedLabel} yet.`,
    line2: `${otherLabel} can be bought in ${currencyLabel}.`,
    button: `Switch to ${otherLabel}`,
    under: FREE_KEEPS_WORKING,
  }),
  // A live state has no outage words: the surface prints the amount and its own terms.
  live: () => ({ word: null, line1: '', line2: '', button: null, under: '' }),
})

/** The words for one state, from the one table above. */
export const priceStateCopy = (state, ctx = {}) => PRICE_STATE_COPY[state](ctx)

/**
 * Which cadence a live subscription is on, or null when the record cannot say.
 *
 * The subscription document carries Stripe's `recurring.interval` (see
 * api/_lib/billing.js subscriptionDocFields). A quarterly price is
 * `interval: 'month'` with `interval_count: 3`, stored as `intervalCount`.
 * A `month` record with no stored count could be monthly or quarterly, so it
 * returns null: such a subscription says when it renews and not how often.
 * `interval_count` and an explicit `billingInterval` ('monthly' | 'quarterly'
 * | 'yearly') are read too.
 */
export function subscriptionCadence(sub) {
  if (!sub) return null
  if (['monthly', 'quarterly', 'yearly'].includes(sub.billingInterval)) return sub.billingInterval
  // A record that already spells the cadence out (checkout-status reports
  // `interval` as the checkout's own 'monthly' | 'quarterly' | 'yearly').
  if (['monthly', 'quarterly', 'yearly'].includes(sub.interval)) return sub.interval
  if (sub.interval === 'year') return 'yearly'
  if (sub.interval === 'month') {
    const count = Number(sub.intervalCount ?? sub.interval_count)
    if (count === 3) return 'quarterly'
    if (count === 1) return 'monthly'
    return null
  }
  return null
}

export const CADENCE_LABEL = Object.freeze({
  monthly: `Billed ${BILLED_EVERY.monthly}`,
  quarterly: `Billed ${BILLED_EVERY.quarterly}`,
  yearly: `Billed ${BILLED_EVERY.yearly}`,
})
