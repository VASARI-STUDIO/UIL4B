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
import { SURFACE_LINE, line } from '../../src/data/positioning.js'

const PERSONA = 'someone deciding whether this is worth paying for'

test.describe('/plans advertises only what the product has', () => {
  test('no unbuilt export format is offered as a plan benefit', async ({ page }) => {
    // THE CENTRAL GUARD, at the DOM. `.sub-tier-list` is what a buyer reads as
    // "this is what I get". An unbuilt format appearing in one is the exact
    // shape of the defect that shipped: "full design JSON" sold on a plan card
    // while `json` has never carried `live: true`.
    watch(page, PERSONA)
    await go(page, '/plans')
    await expectRendered(page)

    const benefitText = await page.evaluate(() =>
      [...document.querySelectorAll('.sub-tier-list')].map((ul) => ul.innerText).join('\n'))

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

  test('the unbuilt formats are disclosed rather than hidden', async ({ page }) => {
    // The counterpart. Not selling them is the floor; SAYING they do not exist
    // is the thing this page decided to do, and a silent removal would look
    // identical to the guard above while being much less honest.
    watch(page, PERSONA)
    await go(page, '/plans')
    await expectRendered(page)

    const page_ = await page.locator('.plans-page').innerText()
    for (const format of unbuiltFormats()) {
      expect(page_, `"${format.name}" is neither sold nor disclosed — the page has gone quiet about it instead of honest`)
        .toContain(format.name)
    }
    await expect(page.locator('.plans-soon-badge').first()).toBeVisible()
  })

  test('every quoted limit matches the configuration the product enforces', async ({ page }) => {
    // The figures exist only after render, so only a rendered check can read
    // them. Each is compared against the module that also drives the behaviour.
    watch(page, PERSONA)
    await go(page, '/plans')
    await expectRendered(page)

    const text = await page.locator('.plans-page').innerText()
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

    // The paywall position, stated as an ordinal, must be the cap plus one.
    expect(text, 'the page states the wrong project as the paywall')
      .toContain(`${FREE_SAVE_LIMITS.projects + 1}th project`)
  })

  test('the free tier is not described as having more export formats than it has', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/plans')
    await expectRendered(page)

    const freeCard = await page.locator('.plans-free-card').innerText()
    // Every format the free card names must be one a free user can produce.
    for (const format of EXPORT_FORMATS) {
      const shortName = /\(([^)]+)\)\s*$/.exec(format.name)?.[1] || format.name
      const named = new RegExp(`\\b${shortName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(freeCard)
      if (!named) continue
      const isFree = freeFormats().some((f) => f.id === format.id)
      // A format may appear in the card's "Not on Free" exclusions block, which
      // is the honest reason a non-free name would be there.
      const excluded = await page.locator('.plans-excludes').innerText()
      const inExclusions = excluded.includes(format.name) || excluded.includes(shortName)
      expect(
        isFree || inExclusions,
        `the Free card names "${shortName}" outside its exclusions block, but a free user cannot produce it`,
      ).toBe(true)
    }
  })

  test('the closing call to action is actually painted, not merely present', async ({ page }) => {
    // THE REGRESSION GUARD for the invisible CTA. Asserted on computed opacity
    // because that is precisely what was wrong and precisely what every other
    // check missed: toBeVisible() passed, .innerText() returned the copy, and
    // .click() worked — on a block no human could see.
    watch(page, PERSONA)
    await go(page, '/plans')
    await expectRendered(page)

    const cta = page.locator('.system-cta')
    await expect(cta).toBeVisible()
    await cta.scrollIntoViewIfNeeded()

    // Settle on the element's own painted opacity rather than a fixed wait or
    // getAnimations().finished — the page carries a looping animation, so
    // awaiting `finished` never returns.
    await expect
      .poll(
        () => page.evaluate(() => Number(getComputedStyle(document.querySelector('.system-cta-inner')).opacity)),
        {
          message:
            'the closing CTA never became opaque. Plans.jsx must call useReveal() — SystemCTA renders its content '
            + 'in a [data-reveal] div and global.css starts those at opacity:0, so a page that mounts it without a '
            + 'reveal driver shows a blank box where its final call to action should be.',
          timeout: 6000,
        },
      )
      .toBeGreaterThan(0.9)

    // …and the button inside it is a real, reachable control.
    await expect(page.getByRole('button', { name: /Start building free/ })).toBeVisible()
  })

  test('no invented urgency, social proof or metric appears on the page', async ({ page }) => {
    // A pricing page is where these are most tempting. `fpr-product-stats`
    // ("12k Teams · 4.9 Rating · 99.9% Uptime") is the removed example this
    // repo keeps as previewed content rather than a claim; nothing of that
    // shape may reach this page.
    watch(page, PERSONA)
    await go(page, '/plans')
    await expectRendered(page)

    const text = await page.locator('.plans-page').innerText()
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

test.describe('/plans says what the founder said', () => {
  test('the hero carries the founder’s framing line, rendered, from positioning.js', async ({ page }) => {
    // The unit guard proves Plans.jsx CALLS line(SURFACE_LINE.plansFraming).
    // This proves the sentence reaches a visitor: the hero's text is compared
    // to the module's own record of the line, computed here rather than read
    // off the page, so a page that stopped rendering the paragraph goes red
    // while the helper stays perfect.
    watch(page, PERSONA)
    await go(page, '/plans')
    await expectRendered(page)

    const hero = await page.locator('.plans-hero').innerText()
    expect(hero.length, 'the plans hero rendered empty').toBeGreaterThan(40)
    expect(hero, 'the hero no longer carries the founder’s framing line').toContain(line(SURFACE_LINE.plansFraming))
    // The founder’s line is a plain paragraph in the hero, not a badge or a
    // tagline slot — the taglines were retired 2026-09-07 and must not return.
    await expect(page.locator('.plans-hero .plans-framing')).toHaveCount(1)
  })
})
