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
import { withAvailability } from './price-payload.js'
import {
  EXPORT_FORMATS,
  freeFormats,
  proOnlyFormats,
  unbuiltFormats,
  EXPORT_THEMES,
  freeThemes,
} from '../../src/config/exportFormats.js'
import { AI_LIMITS, FREE_SAVE_LIMITS } from '../../src/config/plans.js'
import { COLOUR_SYSTEMS } from '../../src/config/colourSystems.js'
import { BRAND_PALETTES } from '../../api/_lib/library/brandPalettes.js'
import { TOOL_COUNT, numberWord } from '../../src/components/spectrum/spectrumFacts.js'

// /plans is the plan ledger (src/pages/Pricing.jsx): one table whose columns are
// Free and Pro. The selectors below are its own:
//   the table              table (rowheader label, then Free and Pro cells)
//   what both plans share  .pl-same
//   a plan's card          .hpl-free, .hpl-pro

const PERSONA = 'someone deciding whether this is worth paying for'

// A cell's words as a reader gets them: the small "Free" / "Pro" tag that
// labels a cell on a narrow screen is chrome, not part of the answer.
const cellText = (cell) => cell.evaluate((td) => {
  const copy = td.cloneNode(true)
  copy.querySelectorAll('.nothing').forEach((n) => n.remove())
  return copy.textContent.trim()
})
// The suite's preview has no serverless functions. Without an answer from
// /api/get-prices the Pro button is disabled (and dimmed) and the Pro note reads
// "Checking the live price…", so the tests about what a buyer is offered
// answer it with production's own shape.
const stubPrices = (page) => page.route('**/api/get-prices', (route) => route.fulfill({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify(withAvailability({ source: { monthly: 'live', yearly: 'live' }, monthly: { usd: 7 }, yearly: { usd: 48 } })),
}))
const ledgerRow = (page, label) =>
  page.locator('tbody tr', { has: page.getByRole('rowheader', { name: label, exact: true }) })

test.describe('/plans advertises only what the product has', () => {
  test('no unbuilt export format is offered as a plan benefit', async ({ page }) => {
    // THE CENTRAL GUARD, at the DOM. The ledger is what a buyer reads as
    // "this is what I get". An unbuilt format appearing in it is the exact
    // shape of the defect that shipped: "full design JSON" sold on a plan card
    // while `json` has never carried `live: true`.
    watch(page, PERSONA)
    await go(page, '/plans')
    await expectRendered(page)

    const benefitText = await page.evaluate(() => document.querySelector('table')?.innerText ?? '')

    expect(benefitText.length, 'the ledger rendered empty — this test would pass vacuously')
      .toBeGreaterThan(80)

    for (const format of unbuiltFormats()) {
      expect(
        benefitText.includes(format.name),
        `the ledger offers "${format.name}", which is not built — it renders a Soon badge over a disabled button for everyone, on every plan`,
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

  test('the questions and the Pro card name only exports a plan delivers', async ({ page }) => {
    // The FAQ answer is read as a list of what you get, so it follows the same
    // rule as the plan cards: every Pro-gated format is named, and no unbuilt
    // one is. It sits in a narrow column at tablet widths, so it stays short.
    watch(page, PERSONA)
    await go(page, '/plans')
    await expectRendered(page)

    // Open every question: a closed answer is hidden and has no text to read.
    const faq = page.locator('section[aria-labelledby="pl-faq-h"]')
    for (const q of await faq.getByRole('button').all()) await q.click()
    const text = await faq.innerText()
    expect(text.length, 'no answers were read — this test would pass vacuously').toBeGreaterThan(500)
    for (const format of unbuiltFormats()) {
      expect(text, `an answer names "${format.name}", which no plan delivers`).not.toContain(format.name)
    }
    expect(text, 'an answer lists formats between dashes').not.toContain(' — ')
    // …and the Pro card names the exports Pro adds.
    const proCard = await page.locator('.hpl-pro').innerText()
    for (const format of proOnlyFormats()) expect(proCard + (await page.locator('table').innerText()), `Pro no longer names "${format.name}"`).toContain(format.name)
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

    // The paywall is stated as the cap itself (the ledger has a "Saved projects"
    // row), so the Free cell of that row must BE the cap — a digit that merely
    // appears somewhere on the page is not enough.
    const saved = ledgerRow(page, 'Saved projects')
    expect(await cellText(saved.locator('td').nth(0)), 'the page states the wrong free project cap')
      .toBe(String(FREE_SAVE_LIMITS.projects))
    expect(await cellText(saved.locator('td').nth(1))).toBe('Unlimited')
    const icons = ledgerRow(page, 'Icons per project')
    expect(await cellText(icons.locator('td').nth(0)), 'the page states the wrong free icons-per-project cap')
      .toBe(String(FREE_SAVE_LIMITS.customIcons))
  })

  test('the free tier is not described as having more export formats than it has', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/plans')
    await expectRendered(page)

    // Everything the page says about what a free account gets: the Free cell of
    // each row, and the line for what both plans share. A Pro-only export has a
    // row of its own whose Free cell is a dash, so it never reaches this text.
    const freeCells = await page.locator('tbody:not(.pl-same) tr td:first-of-type').evaluateAll((cells) => cells.map((td) => {
      const copy = td.cloneNode(true)
      copy.querySelectorAll('.nothing').forEach((n) => n.remove())
      return copy.textContent
    }))
    const shared = await page.locator('.pl-same td').innerText()
    const freeCard = await page.locator('.hpl-free').innerText()
    const freeSide = [...freeCells, shared, freeCard].join('\n')
    expect(freeSide.length, 'nothing was read from the Free side — this test would pass vacuously')
      .toBeGreaterThan(80)

    const named = (text, format) => {
      const shortName = /\(([^)]+)\)\s*$/.exec(format.name)?.[1] || format.name
      return new RegExp(`\\b${shortName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(text)
    }
    for (const format of EXPORT_FORMATS) {
      if (freeFormats().some((f) => f.id === format.id)) continue
      expect(
        named(freeSide, format),
        `the Free side names "${format.name}", but a free user cannot produce it`,
      ).toBe(false)
    }
    // …and the formats a free account does get are named in the shared line,
    // so the loop above is reading the right text.
    for (const format of freeFormats().filter((f) => !f.kit)) {
      expect(named(shared, format), `the shared line no longer names the free "${format.name}" export`).toBe(true)
    }
  })

  test('the ledger shows the export themes, and the UI kit as it differs by plan', async ({ page }) => {
    // Free previews every theme and exports the UI kit in its free themes; Pro has
    // every theme. The UI kit is therefore NOT "the same on both plans", and the
    // row titles and labels carry numerals, running sentences words, as the board draws them.
    watch(page, PERSONA)
    await go(page, '/plans')
    await expectRendered(page)

    const row = ledgerRow(page, 'Export themes')
    await expect(row, 'the ledger has no export-themes row').toHaveCount(1)
    const free = await cellText(row.locator('td').nth(0))
    const pro = await cellText(row.locator('td').nth(1))
    expect(free).toContain(`Preview all ${EXPORT_THEMES.length}`)
    expect(free).toContain(`UI kit exports in ${freeThemes().length}`)
    for (const t of freeThemes()) expect(free, `${t.name} is a free theme`).toContain(t.name)
    expect(pro).toMatch(new RegExp(`^All ${EXPORT_THEMES.length}\\b`))

    const shared = await page.locator('.pl-same td').innerText()
    expect(shared, 'the UI kit is listed as the same on both plans').not.toMatch(/\bUI kit\b/)

    // The older formats stay while the export dialog still offers them.
    for (const format of proOnlyFormats()) {
      await expect(ledgerRow(page, format.name), `the dialog still offers "${format.name}"`).toHaveCount(1)
    }

    // The Pro card: the row title has a numeral, its sub-line (a sentence) a word.
    const proCard = await page.locator('.hpl-pro').evaluate((el) => el.textContent)
    expect(proCard).toContain(`All ${EXPORT_THEMES.length} export themes`)
    expect(proCard).toContain('Eight more than Free')
    expect(proCard).not.toMatch(/\b(?:ten|eight|two) (?:export )?themes\b/i)
  })

  test('Tab order follows the picture: Free then Pro from 1200 up, Pro then Free below', async ({ page }) => {
    watch(page, PERSONA)
    await stubPrices(page)
    const freeFirst = () => page.evaluate(() => {
      const free = document.querySelector('.pa-pair > .hpl-free')
      const pro = document.querySelector('.pa-pair > .hpl-pro')
      return !!(free.compareDocumentPosition(pro) & Node.DOCUMENT_POSITION_FOLLOWING)
    })
    for (const [width, expected] of [[1440, true], [1200, true], [1199, false], [768, false], [390, false]]) {
      await page.setViewportSize({ width, height: 900 })
      await go(page, '/plans')
      await expectRendered(page)
      expect(await freeFirst(), `at ${width}px Free ${expected ? 'should' : 'should not'} come first in the markup`).toBe(expected)
    }
    // Resizing across 1200 swaps the order without a reload.
    // The order follows a media query listener, so it is read until it has caught up with the resize.
    await page.setViewportSize({ width: 1440, height: 900 })
    await expect.poll(freeFirst).toBe(true)
    await page.setViewportSize({ width: 1000, height: 900 })
    await expect.poll(freeFirst).toBe(false)
  })

  test('the calls to action are actually painted, not merely present', async ({ page }) => {
    // THE REGRESSION GUARD for the invisible CTA. Asserted on computed opacity
    // because that is precisely what was wrong on the legacy page and what
    // every other check missed: toBeVisible() passed, .innerText() returned the
    // copy, and .click() worked — on a block no human could see.
    //
    // The page's ways in are the two plan buttons and the closing call's two
    // buttons. Each one, and every ancestor it paints through, must be opaque
    // after a scroll to it.
    watch(page, PERSONA)
    await stubPrices(page)
    await go(page, '/plans')
    await expectRendered(page)

    const ctas = [
      page.locator('.hpl-free').getByRole('link', { name: 'Open the toolkit' }),
      page.locator('.hpl-pro .pa-cta').locator('a, button').first(),
      page.locator('.hm-close').getByRole('link', { name: 'Open the toolkit' }),
      page.locator('.hm-close').getByRole('link', { name: 'Choose Pro' }),
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

test.describe('/plans says what it claims', () => {
  test('the hero carries the coffee headline and a sub-line whose facts are derived', async ({ page }) => {
    // The expected sub-line is COMPUTED here from the modules that enforce the
    // numbers, so a page that types "six" or "forty" goes red the day the
    // config moves.
    watch(page, PERSONA)
    await go(page, '/plans')
    await expectRendered(page)

    await expect(page.getByRole('heading', { level: 1 }))
      .toHaveText('Improve your design systems for less than 1 coffee per month.')

    await expect(page.locator('.pa-lead')).toHaveText(
      `Pro lifts AI from ${AI_LIMITS.free.daily} to ${AI_LIMITS.pro.daily} generations a day, opens all ${numberWord(COLOUR_SYSTEMS.length)} colour systems, `
      + 'gives you unlimited projects, and removes the “Made with UI L4B” line from your exports.',
    )
    await expect(page.locator('.pl-same td')).toContainText(`All ${numberWord(TOOL_COUNT)} tools.`)
  })

  test('the retired lines are nowhere on the page; cancelling is stated once', async ({ page }) => {
    // "No card needed for Free" is a retired tagline and may not come back in
    // any wording. Version history does not exist. "Cancel Pro any time" is
    // true (Settings opens the billing portal's cancellation flow), but "in
    // two clicks" is a count nobody has measured.
    watch(page, PERSONA)
    await stubPrices(page)
    await go(page, '/plans')
    await expectRendered(page)
    const text = (await page.locator('body').innerText()).toLowerCase()
    for (const phrase of ['no card', 'in two clicks', 'version history']) {
      expect(text, `/plans says "${phrase}"`).not.toContain(phrase)
    }
    // The unit is a "project", never a "kit" ("toolkit", the
    // product's name for itself, is not the unit and is allowed).
    // "UI kit" and "brand kit" name exported files, the one thing the word may mean here.
    const main = await page.locator('.pricing main').innerText()
    expect(main.replace(/\b(UI|brand) kit\b/gi, ''), 'the pricing page calls a saved project a "kit"').not.toMatch(/\bkits?\b/i)
    expect(main, 'the pricing page no longer names the unit at all').toMatch(/\bprojects\b/)
    // Positive control: the assurances are present, and cancelling is said in
    // one place (the Pro note), not repeated down the page.
    expect(text.split('cancel pro any time').length - 1, 'cancelling is not stated exactly once').toBe(1)
    await expect(page.locator('.pl-same td')).toContainText('Files stay in your browser')
  })
})
