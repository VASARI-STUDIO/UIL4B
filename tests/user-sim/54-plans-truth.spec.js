// What /plans actually SAYS to a visitor, checked against what the product can
// actually do.
//
// tests/unit/plans-truth.test.js reads the source and is the faster, sharper
// guard. This file exists because source text and rendered DOM fail
// differently, and this page has been bitten by the second kind:
//
//   · A claim can be true in the source and absent from the page — a component
//     that stopped rendering passes every string assertion ever written about
//     it. That is not hypothetical here: the entire closing CTA on this page
//     rendered at `opacity: 0` for every visitor, in every browser, and the
//     suite stayed green because Playwright treats an opacity-0 node with a
//     real bounding box as visible and clicks it happily.
//     18-signup-intent.spec.js had been clicking an invisible button.
//
//   · A claim can be assembled at runtime from imports, so the literal never
//     appears in the source at all. Every figure on this page is now derived,
//     which means the source no longer contains "7 of 37" — only the DOM does.
//     A page whose claims exist only after render needs a check after render.
//
// The rule both halves enforce: the page may not advertise a capability the
// product does not have.
// `test` comes from ./base.js, not @playwright/test — that is where Google One
// Tap is stubbed on the browser fixture, and tests/unit/one-tap-stub.test.js
// fails the build for any spec that reaches past it.
import { test, expect } from './base.js'
import { go, watch, expectRendered } from './helpers.js'
import {
  EXPORT_FORMATS,
  freeFormats,
  proOnlyFormats,
  unbuiltFormats,
} from '../../src/config/exportFormats.js'
import { AI_LIMITS, FREE_SAVE_LIMITS } from '../../src/config/plans.js'
import { COLOUR_SYSTEMS } from '../../src/config/colourSystems.js'
import { BRAND_PALETTES } from '../../src/data/brandPalettes.js'
import { TOOL_COUNT, numberWord } from '../../src/components/spectrum/spectrumFacts.js'

// /plans IS THE DESIGN'S PRICING SCREEN (src/pages/Pricing.jsx,
// built from "UIL4B - Spectrum.dc.html"). Every guard below keeps the intent it
// had against the legacy page; the selectors are the new page's:
//   .sub-tier-list → .pr-plan-list      .plans-free-card → .pr-plan--free
//   .plans-page    → .pricing main      .plans-excludes  → the Free card's minus line

const PERSONA = 'someone deciding whether this is worth paying for'

test.describe('/plans advertises only what the product has', () => {
  test('no unbuilt export format is offered as a plan benefit', async ({ page }) => {
    // THE CENTRAL GUARD, at the DOM. `.pr-plan-list` is what a buyer reads as
    // "this is what I get". An unbuilt format appearing in one is the exact
    // shape of the defect that shipped: "full design JSON" sold on a plan card
    // while `json` has never carried `live: true`.
    watch(page, PERSONA)
    await go(page, '/plans')
    await expectRendered(page)

    const benefitText = await page.evaluate(() =>
      [...document.querySelectorAll('.pr-plan-list')].map((ul) => ul.innerText).join('\n'))

    expect(benefitText.length, 'the plan benefit lists rendered empty — this test would pass vacuously')
      .toBeGreaterThan(80)

    for (const format of unbuiltFormats()) {
      expect(
        benefitText.includes(format.name),
        `the plan cards offer "${format.name}", which is not built — it renders a Soon badge over a disabled button for everyone, on every plan`,
      ).toBe(false)
    }

    // …and the gated one that IS built must be offered, or Pro's export
    // benefit is an empty promise. Asserted in both directions on purpose.
    for (const format of proOnlyFormats()) {
      expect(
        benefitText.includes(format.name),
        `Pro no longer names "${format.name}", the only export it actually gates`,
      ).toBe(true)
    }
  })

  test('the export-formats answer names only what a plan delivers', async ({ page }) => {
    // The FAQ answer is read as a list of what you get, so it follows the same
    // rule as the plan cards: every Pro-gated format is named, and no unbuilt
    // one is. It sits in a narrow column at tablet widths, so it stays short.
    watch(page, PERSONA)
    await go(page, '/plans')
    await expectRendered(page)

    const answer = page.locator('.pr-faq-row', { has: page.locator('h3', { hasText: 'Which export formats can I actually get?' }) })
    await expect(answer).toBeVisible()
    const text = await answer.innerText()
    for (const format of proOnlyFormats()) {
      expect(text, `the answer no longer names "${format.name}", the export Pro adds`).toContain(format.name)
    }
    for (const format of unbuiltFormats()) {
      expect(text, `the answer names "${format.name}", which no plan delivers`).not.toContain(format.name)
    }
    expect(text, 'the answer lists formats between dashes again').not.toContain('—')
  })

  test('every quoted limit matches the configuration the product enforces', async ({ page }) => {
    // The figures exist only after render, so only a rendered check can read
    // them. Each is compared against the module that also drives the behaviour.
    watch(page, PERSONA)
    await go(page, '/plans')
    await expectRendered(page)

    const text = await page.locator('.pricing main').innerText()
    const systemsFree = COLOUR_SYSTEMS.filter((s) => s.free).length
    const brandsFree = BRAND_PALETTES.filter((b) => b.free === true).length

    const claims = [
      [`${systemsFree} of ${COLOUR_SYSTEMS.length}`, 'the colour-system split'],
      [`${brandsFree} of ${BRAND_PALETTES.length}`, 'the brand-palette split'],
      [`${AI_LIMITS.free.daily}`, 'the free daily AI allowance'],
      [`${AI_LIMITS.pro.daily}`, 'the Pro daily AI allowance'],
      [`${FREE_SAVE_LIMITS.projects}`, 'the free project cap'],
      [`${FREE_SAVE_LIMITS.customIcons}`, 'the free custom-icon cap'],
    ]
    for (const [value, what] of claims) {
      expect(text, `${what} on the page does not match the enforced configuration`).toContain(value)
    }

    // The paywall is stated as the cap itself now (the design's comparison has
    // a "Saved projects" row), so the Free cell of that row must BE the cap —
    // a digit that merely appears somewhere on the page is not enough.
    const saved = page.locator('.pr-compare-row', { has: page.locator('th', { hasText: /^Saved projects$/ }) })
    await expect(saved.locator('td[data-plan="Free"]'), 'the page states the wrong free project cap')
      .toHaveText(String(FREE_SAVE_LIMITS.projects))
    await expect(saved.locator('td[data-plan="Pro"]')).toHaveText('Unlimited')
  })

  test('the free tier is not described as having more export formats than it has', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/plans')
    await expectRendered(page)

    const freeCard = await page.locator('.pr-plan--free').innerText()
    // Every format the free card names must be one a free user can produce.
    for (const format of EXPORT_FORMATS) {
      const shortName = /\(([^)]+)\)\s*$/.exec(format.name)?.[1] || format.name
      const named = new RegExp(`\\b${shortName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(freeCard)
      if (!named) continue
      const isFree = freeFormats().some((f) => f.id === format.id)
      // A format may appear in the card's minus line — the design's exclusion
      // row — which is the honest reason a non-free name would be there.
      const excluded = await page.locator('.pr-plan--free .pr-plan-list li.is-off').innerText()
      const inExclusions = excluded.includes(format.name) || excluded.includes(shortName)
      expect(
        isFree || inExclusions,
        `the Free card names "${shortName}" outside its exclusions block, but a free user cannot produce it`,
      ).toBe(true)
    }
  })

  test('the calls to action are actually painted, not merely present', async ({ page }) => {
    // THE REGRESSION GUARD for the invisible CTA. Asserted on computed opacity
    // because that is precisely what was wrong on the legacy page and what
    // every other check missed: toBeVisible() passed, .innerText() returned the
    // copy, and .click() worked — on a block no human could see.
    //
    // The design's Pricing screen has no closing SystemCTA; its ways in are
    // the two plan buttons and the footer's "Open the toolkit". Each one, and
    // every ancestor it paints through, must be opaque after a scroll to it.
    watch(page, PERSONA)
    await go(page, '/plans')
    await expectRendered(page)

    const ctas = [
      page.locator('.pr-plan--free .pr-cta'),
      page.locator('.pr-plan--pro .pr-cta'),
      page.getByRole('contentinfo').getByRole('link', { name: /Open the toolkit/ }),
    ]
    for (const cta of ctas) {
      await expect(cta).toBeVisible()
      await cta.scrollIntoViewIfNeeded()
      await expect
        .poll(
          () => cta.evaluate((el) => {
            let o = 1
            for (let n = el; n && n.nodeType === 1; n = n.parentElement) o *= Number(getComputedStyle(n).opacity)
            return o
          }),
          { message: 'a call to action on /plans is not painted — its effective opacity never reached 0.9', timeout: 6000 },
        )
        .toBeGreaterThan(0.9)
    }
  })

  test('no invented urgency, social proof or metric appears on the page', async ({ page }) => {
    // A pricing page is where these are most tempting. `fpr-product-stats`
    // ("12k Teams · 4.9 Rating · 99.9% Uptime") is the removed example this
    // repo keeps as previewed content rather than a claim; nothing of that
    // shape may reach this page.
    watch(page, PERSONA)
    await go(page, '/plans')
    await expectRendered(page)

    const text = await page.locator('.pricing main').innerText()
    const banned = [
      /\b\d[\d,.]*k?\+? (?:teams|designers|users|customers|companies) (?:trust|use|choose)/i,
      /\b\d\.\d\s*(?:\/\s*5)?\s*rating\b/i,
      /\b99\.\d+% uptime\b/i,
      /offer ends|limited time|only \d+ (?:left|spots)|hurry|act now/i,
      /join \d[\d,.]*k?\+? /i,
      /most popular choice|everyone is switching/i,
    ]
    for (const pattern of banned) {
      expect(text, `the page carries manufactured pressure or social proof matching ${pattern}`)
        .not.toMatch(pattern)
    }
  })
})

test.describe('/plans says what the design says', () => {
  test('the hero carries the design’s pricing h1 and sub-line, with the facts derived', async ({ page }) => {
    // The design's pricing h1 and sub-line, from
    // "UIL4B - Spectrum.dc.html" (D:1085-1086), with the false clauses
    // corrected. The expected sub-line is COMPUTED here from the modules that
    // enforce the numbers, so a page that types "six" or "eight" goes red the
    // day the config moves.
    watch(page, PERSONA)
    await go(page, '/plans')
    await expectRendered(page)

    await expect(page.getByRole('heading', { level: 1 }))
      .toHaveText('Improve your design systems for less than 1 coffee per month.')
    await expect(page.locator('.pr-h1 em')).toHaveText('less than 1 coffee')

    const multiple = AI_LIMITS.pro.daily / AI_LIMITS.free.daily
    await expect(page.locator('.pr-hero .pr-sub')).toHaveText(
      `Pro gives you the controls real client work needs: ${numberWord(multiple)} times the AI generations, `
      + `all ${numberWord(COLOUR_SYSTEMS.length)} colour systems, unlimited projects and clean, unmarked exports.`,
    )
    // The Free card's first tick counts the real tools.
    await expect(page.locator('.pr-plan--free .pr-plan-list li').first()).toHaveText(`All ${numberWord(TOOL_COUNT)} tools`)
  })

  test('the retired lines are nowhere on the page; cancelling is stated once', async ({ page }) => {
    // "No card needed for Free" is a retired tagline and may not come back in
    // any wording. Version history does not exist. "Cancel Pro any time" is
    // true (Settings opens the billing portal's cancellation flow), but "in
    // two clicks" is a count nobody has measured.
    watch(page, PERSONA)
    await go(page, '/plans')
    await expectRendered(page)
    const text = (await page.locator('body').innerText()).toLowerCase()
    for (const phrase of ['no card', 'in two clicks', 'version history']) {
      expect(text, `/plans says "${phrase}"`).not.toContain(phrase)
    }
    // The unit is a "project", never a "kit" ("toolkit", the
    // product's name for itself, is not the unit and is allowed).
    // "UI kit" names the exported file, the one thing the word may mean here.
    const main = await page.locator('.pricing main').innerText()
    expect(main.replace(/\bUI kit\b/g, ''), 'the pricing page calls a saved project a "kit"').not.toMatch(/\bkits?\b/i)
    expect(main, 'the pricing page no longer names the unit at all').toMatch(/\bprojects\b/)
    // Positive control: the design's assurances minus the retired one, in order.
    await expect(page.locator('.pr-assure li')).toHaveText(['Cancel Pro any time', 'Files stay in your browser'])
  })
})
