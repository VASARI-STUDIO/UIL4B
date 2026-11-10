// One source of truth for what Free and Pro are.
//
// Every surface that describes a plan says the same thing: Settings, Checkout
// and the Pro upgrade modal must not keep their own feature lists, and
// Settings must name the real cadence. src/config/planFacts.js is the only place those
// lines are written; these tests hold every surface to it.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  FREE_POINTS, PRO_POINTS, FREE_EXCLUSION, BILLING_OPTIONS, DEFAULT_BILLING, TOOL_COUNT,
  resolveOffers, subscriptionCadence, CADENCE_LABEL,
} from '../../src/config/planFacts.js'
import { PLAN_LADDER, formatMoney } from '../../src/config/planLadder.js'
import { AI_LIMITS, FREE_SAVE_LIMITS } from '../../src/config/plans.js'
import { TOOL_COUNT as LANDING_TOOL_COUNT } from '../../src/components/spectrum/spectrumFacts.js'

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')
const code = (p) => read(p)
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
  .replace(/^\s*\/\/.*$/gm, ' ')

const SURFACES = {
  settings: 'src/pages/Settings.jsx',
  checkout: 'src/pages/Checkout.jsx',
  modal: 'src/components/ProUpgradeModal.jsx',
}

test('every surface that describes Pro reads its lines from planFacts', () => {
  for (const [name, file] of Object.entries(SURFACES)) {
    assert.match(read(file), /from '\.\.\/config\/planFacts'/, `${name} does not import planFacts`)
    assert.match(code(file), /\bPRO_POINTS\b/, `${name} does not use PRO_POINTS`)
  }
  assert.match(code(SURFACES.settings), /\bFREE_POINTS\b/, 'Settings\' Free column does not use FREE_POINTS')
  assert.match(code(SURFACES.settings), /\bFREE_EXCLUSION\b/, 'Settings\' Free column drops /plans\' minus line')
})

test('no surface keeps a feature list of its own', () => {
  // The lines each surface used to type for itself. Any of them back is a
  // second description of Pro, which is the defect.
  const ownLines = [
    'Advanced colour controls',
    'All core design tools',
    'Unlimited palettes, scales',
    'Local browser saves',
    'Pro colour tools',
    '12-page A4 manual',
    'Everything in Free, plus',
  ]
  for (const [name, file] of Object.entries(SURFACES)) {
    const src = code(file)
    for (const line of ownLines) assert.ok(!src.includes(line), `${name} still says "${line}"`)
  }
})

test('the lines are derived from what the product enforces', () => {
  assert.ok(FREE_POINTS.some((l) => l.includes(`${AI_LIMITS.free.daily} AI generations a day`)))
  assert.ok(FREE_POINTS.some((l) => l.includes(`${FREE_SAVE_LIMITS.projects} saved projects`)))
  assert.ok(PRO_POINTS.some((l) => l.includes(`${AI_LIMITS.pro.daily} AI generations a day, ${AI_LIMITS.pro.monthly} a month`)))
  assert.equal(TOOL_COUNT, LANDING_TOOL_COUNT, 'Settings and the landing count the tools differently')
  assert.equal(FREE_EXCLUSION, 'A small “Made with UI L4B” line on exported files')
})

test('Pro has six ticks, in the order the card prints them, and the checkout reads the same array', () => {
  assert.equal(PRO_POINTS.length, 6)
  assert.match(PRO_POINTS[0], new RegExp(`^${AI_LIMITS.pro.daily} AI generations a day, ${AI_LIMITS.pro.monthly} a month$`))
  assert.match(PRO_POINTS[1], /^All \d+ colour systems, plus HCT editing$/)
  assert.equal(PRO_POINTS[2], 'Every palette, gradient, prompt and brand palette')
  assert.match(PRO_POINTS[3], /icons, in any size and line style$/)
  assert.equal(PRO_POINTS[4], 'Unlimited saved projects and custom icons')
  assert.match(PRO_POINTS[5], /, with no “Made with UI L4B” line on anything$/)
  // Checkout builds its feature list straight from PRO_POINTS, so the card, the
  // modal, Settings and the checkout summary cannot differ.
  assert.match(code(SURFACES.checkout), /const FEATURES = PRO_POINTS\b/)
  assert.match(code(SURFACES.modal), /const DEFAULT_FEATURES = PRO_POINTS\b/)
})

test('the cadences are exactly the buyable rungs of the ladder, yearly first choice', () => {
  assert.deepEqual(BILLING_OPTIONS.map((o) => o.id), PLAN_LADDER.filter((p) => p.checkoutPlan).map((p) => p.id))
  assert.equal(DEFAULT_BILLING, 'yearly')
})

test('prices, savings, trials and the billed line come out as /plans prints them', () => {
  const prices = {
    monthly: { usd: 7 }, yearly: { usd: 48 },
    currencyAvailability: { monthly: { usd: true }, yearly: { usd: true } },
  }
  const { offers, priceServiceDown } = resolveOffers({ prices, currency: 'usd', loaded: true })
  assert.equal(priceServiceDown, false)
  const by = Object.fromEntries(offers.map((o) => [o.id, o]))
  assert.equal(by.monthly.amountLabel, '$7')
  assert.equal(by.monthly.billedNote, 'Billed monthly, cancel any time. Keep every export you made.')
  assert.equal(by.yearly.amountLabel, '$4')
  assert.equal(by.yearly.savingLabel, 'Save 43%')
  assert.equal(by.yearly.billedNote, 'Billed $48 yearly, 7-day free trial, cancel any time. Keep every export you made.')
  assert.deepEqual(offers.map((o) => o.id), ['monthly', 'yearly'], 'the sellable offers are monthly and yearly, nothing else')
  assert.equal(by.quarterly, undefined, 'quarterly is no longer an offer')
  for (const o of offers) {
    const rung = PLAN_LADDER.find((p) => p.id === o.id)
    assert.equal(o.trialDays, rung.trialDays || 0, `${o.id}: the trial disagrees with the ladder (and so with the server)`)
  }
})

test('a USD amount on a page in another currency is labelled US$, never a bare $', () => {
  assert.equal(formatMoney(7, 'usd'), '$7')
  assert.equal(formatMoney(7, 'usd', { qualify: true }), 'US$7')
  assert.equal(formatMoney(75, 'aud'), 'A$75')
  assert.equal(formatMoney(75, 'aud', { qualify: true }), 'A$75', 'only USD takes the label')
})

test('no price means no amount, never a guess', () => {
  const down = resolveOffers({ prices: null, loaded: true })
  assert.equal(down.priceServiceDown, true)
  assert.ok(down.offers.every((o) => o.amountLabel === null && o.billedNote === null))
  const loading = resolveOffers({ prices: { monthly: { usd: 7 } }, loaded: false })
  assert.ok(loading.offers.every((o) => o.amountLabel === null))
})

test('a subscription names its cadence only when the record can say', () => {
  assert.equal(subscriptionCadence({ interval: 'year' }), 'yearly')
  assert.equal(subscriptionCadence({ interval: 'month', intervalCount: 3 }), 'quarterly')
  assert.equal(subscriptionCadence({ interval: 'month', interval_count: 1 }), 'monthly')
  assert.equal(subscriptionCadence({ billingInterval: 'quarterly' }), 'quarterly')
  assert.equal(subscriptionCadence({ interval: 'quarterly' }), 'quarterly')
  // The case that shipped wrong: `month` alone could be monthly OR quarterly.
  assert.equal(subscriptionCadence({ interval: 'month' }), null)
  assert.equal(subscriptionCadence(null), null)
  assert.equal(CADENCE_LABEL.quarterly, 'Billed every three months')
})

test('Settings never decides the cadence itself', () => {
  const src = code(SURFACES.settings)
  assert.ok(!/'Billed monthly'|"Billed monthly"/.test(src), 'Settings types "Billed monthly" again')
  assert.match(src, /subscriptionCadence\(/)
})

test('"no card needed" stays out of the surfaces that sell Pro, and cancelling is offered only to an account', () => {
  // Cancelling is real now (the Customer Portal), so the line may appear, but
  // only where the reader has a subscription to cancel from.
  for (const file of [SURFACES.settings, SURFACES.modal]) {
    assert.ok(!/no card/i.test(code(file)), `${file} promises "no card needed"`)
  }
  const lines = code(SURFACES.modal).split('\n').filter((l) => /cancel any ?time/i.test(l))
  for (const l of lines) {
    assert.match(l, /\buser \?/, `the upgrade modal offers cancelling to a visitor with no account: ${l.trim()}`)
  }
})

// ── The long-form lists and the export themes switch ─────────────────────────
import {
  FREE_LINES, PRO_ROWS, PRO_ROWS_PHONE, PRO_PHONE_COLLAPSED_ROWS, PLANS_LEAD, THEME_FACTS,
  STYLE_GUIDE_EXPORT_NAMES, PRO_EXPORT_NAMES, freeLines, proRows, proValue, plansLead, freeUiKitLine, proDocumentsLine, numberWord,
} from '../../src/config/planFacts.js'
import {
  EXPORT_GROUPS, EXPORT_THEMES, EXPORT_THEMES_LIVE, EXPORT_THEME_EXPORTS, freeThemes, proThemes,
} from '../../src/config/exportFormats.js'
import { LIBRARY_TOTALS } from '../../src/data/libraryTotals.js'
import { COLOUR_SYSTEMS } from '../../src/config/colourSystems.js'

test('FREE_POINTS and PRO_POINTS keep their text while the themes are off, and name the themes when on', () => {
  const tail = `, and style guide exports in ${STYLE_GUIDE_EXPORT_NAMES}`
  assert.equal(FREE_POINTS[2], `${freeUiKitLine(EXPORT_THEMES_LIVE)}${tail}`)
  assert.equal(PRO_POINTS[5], `${proDocumentsLine(EXPORT_THEMES_LIVE)}, with no “Made with UI L4B” line on anything`)
  assert.equal(FREE_POINTS.length, 4)
  assert.equal(PRO_POINTS.length, 6)
  // Off: the exact lines /plans, Settings, the modal and checkout printed before the themes existed.
  assert.equal(freeUiKitLine(false) + tail, `The UI kit${tail}`)
  assert.equal(proDocumentsLine(false), PRO_EXPORT_NAMES)
  assert.ok(!/export themes/.test(`${freeUiKitLine(false)} ${proDocumentsLine(false)}`))
})

test('the switch turns the Free UI kit line and the Pro export rows, both ways', () => {
  const free = freeThemes()
  const freeNames = free.map((t) => t.name).join(' and ')
  assert.equal(freeLines(false)[2], 'The UI kit')
  assert.equal(freeLines(true)[2], `The UI kit in ${free.length} export themes: ${freeNames}`)
  assert.equal(freeLines(true).length, 8)
  assert.equal(freeLines(false).length, 8)

  // Off: the panel's own two Pro documents, named from the export rows.
  const book = EXPORT_GROUPS.find((g) => g.id === 'book')
  const guidelines = EXPORT_GROUPS.find((g) => g.id === 'guidelines')
  const off = proRows(false)
  assert.equal(off[1].title, book.name)
  assert.equal(off[2].title, guidelines.name)
  assert.ok(off.every((r) => !/export themes/i.test(`${r.title} ${r.sub} ${r.phoneSub}`)))

  // On: counts and names come from the theme list.
  const on = proRows(true)
  const proNames = proThemes().map((t) => t.name)
  assert.equal(on[1].title, `All ${EXPORT_THEMES.length} export themes`)
  assert.equal(on[1].sub, `${proThemes().length} more than Free: ${proNames.slice(0, -1).join(', ')} and ${proNames.at(-1)}. Each has all ${numberWord(EXPORT_THEME_EXPORTS.filter((e) => !e.inside).length)} exports.`)
  assert.equal(on[1].phoneSub, `${proThemes().length} more than Free, each with all ${numberWord(EXPORT_THEME_EXPORTS.filter((e) => !e.inside).length)} exports.`)
  assert.ok(on[1].phoneSub.length < on[1].sub.length)
  const pages = EXPORT_THEME_EXPORTS.find((e) => e.id === 'brand-guidelines').guidelinesPages
  assert.ok(on[2].sub.startsWith(`A ${pages}-page guidelines PDF`))
  // The documents row names every export that is Pro in all themes, and not the free UI kit.
  for (const e of EXPORT_THEME_EXPORTS.filter((x) => x.proOnly && !x.inside)) assert.ok(on[2].title.toLowerCase().includes(e.short), `the documents row leaves out ${e.id}`)
  // The brand kit has no panel row of its own; the documents row says it comes inside the brand book.
  assert.match(on[2].sub, /brand book[^.]*with the brand kit[^.]*inside/, 'the documents row no longer says where the brand kit is')
  assert.ok(!/ui kit/i.test(on[2].title))

  assert.match(plansLead(true), new RegExp(`all ${EXPORT_THEMES.length} export themes, brand guidelines`))
  assert.match(plansLead(false), /client-ready books and decks/)
  assert.ok(!/export themes/.test(plansLead(false)))
})

test('the long lists have the rows the plan section prints, in order', () => {
  assert.equal(FREE_LINES.length, 8)
  assert.equal(FREE_LINES[0], FREE_POINTS[0])
  assert.equal(FREE_LINES[1], FREE_POINTS[1])
  assert.equal(FREE_LINES[4], `${FREE_SAVE_LIMITS.projects} saved projects, with ${FREE_SAVE_LIMITS.customIcons} icons in each`)
  assert.equal(FREE_LINES[5], 'Auto and monochromatic colour systems')
  assert.equal(FREE_LINES[6], `The first ${GALLERY_CAP} of each library`)
  assert.match(FREE_LINES[7], /^Outline and solid icon packs, at five set sizes$/)
  assert.equal(PRO_ROWS.length, 10)
  assert.deepEqual(PRO_ROWS.map((r) => r.id), [
    'white-label', 'export-themes', 'export-documents', 'icon-packs', 'icon-tools',
    'ai', 'colour-systems', 'library', 'prompts', 'saves',
  ])
  const by = Object.fromEntries(PRO_ROWS.map((r) => [r.id, r]))
  assert.equal(by.ai.title, `${numberWord(AI_LIMITS.pro.daily / AI_LIMITS.free.daily).replace(/^./, (c) => c.toUpperCase())} times the AI`)
  assert.equal(by.ai.sub, `${AI_LIMITS.pro.daily} generations a day and ${AI_LIMITS.pro.monthly} a month, up from ${AI_LIMITS.free.daily} and ${AI_LIMITS.free.monthly}.`)
  assert.equal(by.library.sub, `All ${LIBRARY_TOTALS.palettes} palettes, ${LIBRARY_TOTALS.gradients} gradients and ${LIBRARY_TOTALS.brandPalettes} brand palettes.`)
  assert.equal(by.prompts.sub, `All ${LIBRARY_TOTALS.prompts} starting directions in the Prompt Library, up from ${GALLERY_CAP}.`)
  assert.ok(by['colour-systems'].sub.startsWith(`All ${COLOUR_SYSTEMS.length}, adding `))
  for (const s of COLOUR_SYSTEMS.filter((x) => !x.free)) assert.ok(by['colour-systems'].sub.includes(s.label.toLowerCase()), `${s.id} is not named as a Pro colour system`)
  assert.equal(new Set(PRO_ROWS.map((r) => r.icon)).size, 10, 'two rows share an icon key')
  assert.ok(PRO_ROWS.every((r) => r.title && r.sub && r.phoneSub))
})

test('the phone order is the same ten rows, with the AI row among the rows shown first', () => {
  assert.deepEqual([...PRO_ROWS_PHONE.map((r) => r.id)].sort(), [...PRO_ROWS.map((r) => r.id)].sort())
  assert.equal(PRO_PHONE_COLLAPSED_ROWS, 4)
  assert.ok(PRO_ROWS_PHONE.slice(0, PRO_PHONE_COLLAPSED_ROWS).some((r) => r.id === 'ai'))
  assert.ok(PRO_ROWS_PHONE.slice(0, PRO_PHONE_COLLAPSED_ROWS).some((r) => r.id === 'export-themes'))
  assert.equal(proRows(false, { phone: true }).length, 10)
})

test('THEME_FACTS is worked out from the theme list', () => {
  assert.equal(THEME_FACTS.live, EXPORT_THEMES_LIVE)
  assert.equal(THEME_FACTS.count, EXPORT_THEMES.length)
  assert.equal(THEME_FACTS.freeCount, freeThemes().length)
  assert.equal(THEME_FACTS.proCount + THEME_FACTS.freeCount, THEME_FACTS.count)
  assert.equal(THEME_FACTS.freeTag, `Free in ${freeThemes().length} themes`)
  assert.equal(THEME_FACTS.uiKitNote, `The UI kit is free in ${freeThemes().length} of the ${EXPORT_THEMES.length} themes`)
  assert.equal(THEME_FACTS.exportsPerThemeWord, numberWord(EXPORT_THEME_EXPORTS.filter((e) => !e.inside).length))
  assert.equal(PLANS_LEAD, plansLead(EXPORT_THEMES_LIVE))
})

test('planFacts types no count word or price into the lists', () => {
  const src = code('src/config/planFacts.js')
  assert.ok(!/\b(Eight|Ten|Two|Four|Six|Thirteen)\b/.test(src), 'a count word is typed in planFacts')
  assert.ok(!/All \d+|\b\d+ (export )?themes\b|-page/.test(src.replace(/\$\{[^}]*\}-page/g, '')), 'a count is typed in planFacts')
  const text = [...FREE_LINES, ...PRO_ROWS.flatMap((r) => [r.title, r.sub, r.phoneSub]), PLANS_LEAD].join(' ')
  assert.ok(!/(US|A|C)?\$\d/.test(text), 'a price is typed into a plan list')
})

import { GALLERY_TIER_LIMITS } from '../../src/utils/lockedPreview.js'
const GALLERY_CAP = GALLERY_TIER_LIMITS.free

test('the homepage components type no plan line, count word or price', () => {
  for (const file of ['PlanLists.jsx', 'HomePlans.jsx', 'plansPrices.js', 'planListArt.js']) {
    const src = code(`src/components/home/${file}`)
    for (const line of [...FREE_LINES, ...PRO_ROWS.flatMap((r) => [r.title, r.sub, r.phoneSub]), PLANS_LEAD]) {
      assert.ok(!src.includes(line), `${file} types the plan line "${line}"`)
    }
    assert.ok(!/\b(Eight|Ten|Two|Four|Six|Thirteen)\b/.test(src), `${file} types a count word`)
    assert.ok(!/(US|A|C)?\$\d/.test(src), `${file} types a price`)
  }
  const section = code('src/components/home/HomePlans.jsx')
  assert.match(section, /proRows\(live\)\.length/, 'the "Show all" count is not derived')
})

// ── One name for the line Pro removes ───────────────────────────────────────
import { MADE_WITH_LINE, FREE_EXCLUSION_FULL } from '../../src/config/planFacts.js'

test('/plans, the homepage and Settings all name the export line “Made with UI L4B”', () => {
  assert.equal(MADE_WITH_LINE, '“Made with UI L4B” line')
  // Free's minus line is one string on every surface that prints it.
  assert.equal(FREE_EXCLUSION_FULL, FREE_EXCLUSION)
  assert.ok(FREE_EXCLUSION.includes(MADE_WITH_LINE))
  // Pro's removal names the same quoted line on the lists /plans, Settings, the modal and checkout share.
  assert.ok(PRO_POINTS.at(-1).includes(`no ${MADE_WITH_LINE}`), PRO_POINTS.at(-1))
  assert.ok(PRO_ROWS.find((r) => r.id === 'white-label').sub.includes(MADE_WITH_LINE))
  assert.ok(proValue(true).find((g) => g.group === 'Exports').rows.some((r) => r.label.startsWith('“Made with UI L4B” line')))
  // Settings prints Free's line and Pro's points from planFacts, with no wording of its own.
  const settings = code(SURFACES.settings)
  assert.match(settings, /\{FREE_EXCLUSION\}/)
  assert.match(settings, /PRO_POINTS\.map/)
  assert.ok(!/Small mark|UI L4B line/.test(settings), 'Settings words the export line itself')
  // The /plans page and the homepage plan lists read the same constants.
  assert.match(code('src/pages/Pricing.jsx'), /\$\{MADE_WITH_LINE\}/)
  assert.match(code('src/components/home/PlanLists.jsx'), /\bFREE_EXCLUSION_FULL\b/)
  // No surface file types a different name for it.
  for (const file of ['src/pages/Pricing.jsx', 'src/pages/Settings.jsx', 'src/components/home/PlanLists.jsx', 'src/components/home/HomePlans.jsx']) {
    assert.ok(!/UI L4B line|UIL4B line|Small mark|small mark/.test(code(file)), `${file} names the export line its own way`)
  }
})
