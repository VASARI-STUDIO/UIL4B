// THE PLAN FACTS — one module every surface that describes Free and Pro reads.
//
// /plans, Settings → Plan and billing, the Pro upgrade modal and the checkout
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
import {
  EXPORT_GROUPS, EXPORT_THEMES, EXPORT_THEMES_LIVE, EXPORT_THEME_EXPORTS,
  creditedFormats, freeFormats, freeThemes, proOnlyFormats, proThemes, styleGuideFormats,
} from './exportFormats.js'
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
const joinAnd = (items) => (items.length < 2
  ? items.join('')
  : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`)
const listNames = (formats) => joinAnd(formats.map(shortName))
export const FREE_EXPORT_NAMES = listNames(freeFormats())
/** The free formats other than the UI kit, which the Free card names on its own. */
export const STYLE_GUIDE_EXPORT_NAMES = listNames(styleGuideFormats())
export const PRO_EXPORT_NAMES = joinAnd(proOnlyFormats().map((f) => f.name))

const capitalise = (text) => `${text.charAt(0).toUpperCase()}${text.slice(1)}`

// ships with the export themes
const THEME_COUNT = EXPORT_THEMES.length
// ships with the export themes
const joinNames = (themes) => joinAnd(themes.map((t) => t.name))
// ships with the export themes
const FREE_THEME_NAMES = joinNames(freeThemes())
// ships with the export themes
const PRO_THEME_NAMES = joinNames(proThemes())
// ships with the export themes
// The exports a person picks; the brand kit rides inside the brand book.
const EXPORTS_PER_THEME = EXPORT_THEME_EXPORTS.filter((e) => !e.inside).length
// ships with the export themes
// The Free line about the UI kit. Without the themes it is the UI kit alone.
// `live` is the themes switch; the tests pass it both ways.
export const freeUiKitLine = (live = EXPORT_THEMES_LIVE) => (live
  ? `The UI kit in ${numberWord(freeThemes().length)} export themes: ${FREE_THEME_NAMES}`
  : 'The UI kit')
// ships with the export themes
// The Pro-only exports of a theme, in the order the plan row names them.
const PRO_THEME_DOCS = ['brand-guidelines', 'brand-book']
  .map((id) => EXPORT_THEME_EXPORTS.find((e) => e.id === id))
// ships with the export themes
const PRO_THEME_DOCS_TITLE = capitalise(joinAnd(PRO_THEME_DOCS.map((e) => e.short)))

/** What Free includes — /plans' Free card, in order. */
export const FREE_POINTS = Object.freeze([
  `All ${numberWord(TOOL_COUNT)} tools`,
  `${AI.free.daily} AI generations a day, ${AI.free.monthly} a month`,
  `${freeUiKitLine()}, and style guide exports in ${STYLE_GUIDE_EXPORT_NAMES}`,
  `${FREE_SAVE_LIMITS.projects} saved projects, with ${FREE_SAVE_LIMITS.customIcons} icons in each`,
])

/** /plans' one minus line on the Free card. */
export const FREE_EXCLUSION = 'Small mark on exported files'

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
    { label: 'Icons per project', free: String(FREE_SAVE_LIMITS.customIcons), pro: 'Unlimited' },
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

// ships with the export themes
// The export clause of the Pro line: the themes' documents, or the panel's own Pro documents.
export const proDocumentsLine = (live = EXPORT_THEMES_LIVE) => (live
  ? `${PRO_THEME_DOCS_TITLE} in all ${numberWord(THEME_COUNT)} export themes`
  : PRO_EXPORT_NAMES)

/** What Pro adds — /plans' Pro card, Checkout, Settings and the upgrade modal, in order. */
export const PRO_POINTS = Object.freeze([
  `${AI.pro.daily} AI generations a day, ${AI.pro.monthly} a month`,
  `All ${SYSTEMS_TOTAL} colour systems, plus HCT editing`,
  'Every palette, gradient, prompt and brand palette',
  `${capitalise(joinAnd(PAID_PACK_WORDS))} icons, in any size and line style`,
  'Unlimited saved projects and custom icons',
  `${proDocumentsLine()}, with no UIL4B line on anything`,
])

// ── The long-form lists ──────────────────────────────────────────────────────
//
// The same facts as FREE_POINTS and PRO_POINTS, at the length a full-width plan
// section prints them: eight Free lines, ten Pro rows each with a sub-line and
// an icon key. FREE_POINTS and PRO_POINTS stay the short lists the other
// surfaces print; both are written from the constants above and below.

/** The Free card's minus line, in full. FREE_EXCLUSION is its short form. */
export const FREE_EXCLUSION_FULL = 'A small “Made with UIL4B” line on exported files'

const FREE_SYSTEM_LABELS = COLOUR_SYSTEMS.filter((s) => s.free).map((s) => s.label.toLowerCase())
const PRO_SYSTEM_ADDS = COLOUR_SYSTEMS.filter((s) => !s.free).map((s) => s.label.toLowerCase())
const AI_MULTIPLE = AI.pro.daily / AI.free.daily
const FREE_SYSTEMS_LINE = `${capitalise(joinAnd(FREE_SYSTEM_LABELS))} colour systems`
const FREE_ICON_SIZES_LINE = `Outline and solid icon packs, at ${numberWord(ICON_SIZE_PRESETS.length)} set sizes`

/** What Free includes, one line each, in the order a full-width Free card prints them. */
export const freeLines = (live = EXPORT_THEMES_LIVE) => Object.freeze([
  FREE_POINTS[0],
  FREE_POINTS[1],
  freeUiKitLine(live),
  `Style guide exports in ${STYLE_GUIDE_EXPORT_NAMES}`,
  `${FREE_SAVE_LIMITS.projects} saved projects, with ${FREE_SAVE_LIMITS.customIcons} icons in each`,
  FREE_SYSTEMS_LINE,
  `The first ${LIBRARY_CAP} of each library`,
  FREE_ICON_SIZES_LINE,
])
export const FREE_LINES = freeLines()

// ships with the export themes
const THEMES_ROW_SUB = `${capitalise(numberWord(proThemes().length))} more than Free: ${PRO_THEME_NAMES}. Each has all ${numberWord(EXPORTS_PER_THEME)} exports.`
// ships with the export themes
const THEMES_ROW_SUB_PHONE = `${capitalise(numberWord(proThemes().length))} more than Free, each with all ${numberWord(EXPORTS_PER_THEME)} exports.`
// ships with the export themes
const DOCUMENTS_ROW_SUB = `A ${EXPORT_THEME_EXPORTS.find((e) => e.id === 'brand-guidelines').guidelinesPages}-page guidelines PDF, and an HTML brand book that works offline, with the brand kit of colour, type and icon files inside.`

// Without the themes the two export rows describe the panel's own Pro documents.
const BOOK_GROUP = EXPORT_GROUPS.find((g) => g.id === 'book')
const GUIDELINES_GROUP = EXPORT_GROUPS.find((g) => g.id === 'guidelines')

// A row's id names its slot, not its words: 'export-themes' and 'export-documents'
// hold the theme rows when the themes are live and the panel's two Pro documents when not.
const proRow = (id, icon, title, sub, phoneSub = sub) => Object.freeze({ id, icon, title, sub, phoneSub })

const proRowsById = (live) => Object.freeze(Object.fromEntries([
  proRow('white-label', 'shield-check', 'White-label exports', 'No “Made with UIL4B” line on any file you hand over.'),
  live
    ? proRow('export-themes', 'layers', `All ${THEME_COUNT} export themes`, THEMES_ROW_SUB, THEMES_ROW_SUB_PHONE)
    : proRow('export-themes', 'layers', BOOK_GROUP.name, BOOK_GROUP.desc),
  live
    ? proRow('export-documents', 'book', PRO_THEME_DOCS_TITLE, DOCUMENTS_ROW_SUB)
    : proRow('export-documents', 'book', GUIDELINES_GROUP.name, GUIDELINES_GROUP.desc),
  proRow('icon-packs', 'star', 'Premium icon packs', `${capitalise(joinAnd(PAID_PACK_WORDS))} packs, beside the free outline and solid sets.`),
  proRow('icon-tools', 'pencil', 'Icon editing tools', `Any export size from ${CUSTOM_SIZE_MIN} to ${CUSTOM_SIZE_MAX}px, ${joinAnd(PRO_LINE_STYLE_NAMES)} line styles, and no daily copy limit.`),
  proRow(
    'ai', 'sparkles',
    Number.isInteger(AI_MULTIPLE) ? `${capitalise(numberWord(AI_MULTIPLE))} times the AI` : 'More AI',
    `${AI.pro.daily} generations a day and ${AI.pro.monthly} a month, up from ${AI.free.daily} and ${AI.free.monthly}.`,
  ),
  proRow('colour-systems', 'colour-wheel', 'Every colour system', `All ${SYSTEMS_TOTAL}, adding ${joinAnd(PRO_SYSTEM_ADDS)}, plus HCT editing.`),
  proRow('library', 'grid', 'The full library', `All ${LIBRARY_TOTALS.palettes} palettes, ${LIBRARY_TOTALS.gradients} gradients and ${LIBRARY_TOTALS.brandPalettes} brand palettes.`),
  proRow('prompts', 'compass', 'Every prompt', `All ${LIBRARY_TOTALS.prompts} starting directions in the Prompt Library, up from ${LIBRARY_CAP}.`),
  proRow('saves', 'infinity', 'Unlimited saves', 'Projects and custom icons, kept in your account with no cap.'),
].map((row) => [row.id, row])))

const PRO_ROW_ORDER = Object.freeze([
  'white-label', 'export-themes', 'export-documents', 'icon-packs', 'icon-tools',
  'ai', 'colour-systems', 'library', 'prompts', 'saves',
])
// The AI row is lifted into the rows shown before the phone's "Show all".
const PRO_ROW_ORDER_PHONE = Object.freeze([
  'white-label', 'export-themes', 'export-documents', 'ai', 'icon-tools',
  'icon-packs', 'colour-systems', 'library', 'prompts', 'saves',
])

/**
 * What Pro adds, one row each ({ id, icon, title, sub, phoneSub }). `icon` is a
 * key, not a drawing. `phoneSub` is the shorter sub-line for a phone and equals
 * `sub` where there is no shorter one. `live` is the themes switch.
 */
export const proRows = (live = EXPORT_THEMES_LIVE, { phone = false } = {}) => {
  const byId = proRowsById(live)
  return Object.freeze((phone ? PRO_ROW_ORDER_PHONE : PRO_ROW_ORDER).map((id) => byId[id]))
}

/** The rows in the order a full-width Pro card prints them. */
export const PRO_ROWS = proRows()

/** The rows in the phone's order. */
export const PRO_ROWS_PHONE = proRows(EXPORT_THEMES_LIVE, { phone: true })

/** How many PRO_ROWS_PHONE rows show before "Show all". */
export const PRO_PHONE_COLLAPSED_ROWS = 4

/** The line under the plans heading. */
export const plansLead = (live = EXPORT_THEMES_LIVE) => `Every tool, the UI kit and the style guides stay free, with no time limit. Pro is the full studio: ${
  live ? `all ${numberWord(THEME_COUNT)} export themes, brand guidelines` : 'client-ready books and decks'
}, white-label exports, ${Number.isInteger(AI_MULTIPLE) ? `${numberWord(AI_MULTIPLE)} times the` : 'more'} AI and the whole library.`
export const PLANS_LEAD = plansLead()

// ships with the export themes
/**
 * The export themes in words, for any section that talks about them. `live` is
 * the switch; every other field is derived from the theme list.
 */
export const THEME_FACTS = Object.freeze({
  live: EXPORT_THEMES_LIVE,
  count: THEME_COUNT,
  countWord: numberWord(THEME_COUNT),
  freeCount: freeThemes().length,
  freeCountWord: numberWord(freeThemes().length),
  proCount: proThemes().length,
  freeNames: FREE_THEME_NAMES,
  proNames: PRO_THEME_NAMES,
  exportsPerTheme: EXPORTS_PER_THEME,
  exportsPerThemeWord: numberWord(EXPORTS_PER_THEME),
  freeTag: `Free in ${freeThemes().length} themes`,
  uiKitNote: `The UI kit is free in ${numberWord(freeThemes().length)} of the ${numberWord(THEME_COUNT)} themes`,
})

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
