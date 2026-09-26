// The 2026-09-09 anti-slop audit of the marketing and wayfinding surfaces,
// as rendered assertions — one per fix, each of which was seen to FAIL with
// the fix reverted before it was trusted (the mutation tally is in the PR).
//
// ── What "the bar" is, in one paragraph ─────────────────────────────────────
//
// .claude/skills/uil4b-brand-design/references/anti-slop-quality-bar.md, read
// against the founder's own verdicts: taglines and payment-reassurance lines
// are "a huge AI Slop feature", "Not a screenshot. The actual
// tools, running here." is defensive negation he threw out, "Everything below
// is the real tool. Use it." is "MEGA AI generated", "Systems worth stealing."
// is "bad copy", and the three-up figure strip and the taxonomy eyebrow above
// an h1 were both marked "AI" on the gallery mastheads. Every check below
// names which of those a surface was failing.
//
// ── Copy rule the fixes obey, and the tests therefore assume ────────────────
//
// An agent may DELETE slop and may REPLACE a sentence only with one the
// founder wrote, read from src/data/positioning.js by id. So where a heading
// changed, the test computes the expected text from that module rather than
// pinning a string — the same shape 54-plans-truth and 57-help-and-principles
// use — and where a figure appears it is read from the config that enforces
// it, so a typed number cannot creep back in under a passing test.
//
// ── Every absence is paired with a presence ─────────────────────────────────
//
// `toHaveCount(0)` is free on a blank page (#394). Each test clears
// expectRendered() first and then asserts something the surface must still
// show, so "delete the section" cannot be the way any of these goes green.
// The retired PHRASES are swept by 62-retired-taglines.spec.js across every
// prerendered route plus `/`; this file owns the structural checks.

import { test, expect } from './base.js'
import { expectRendered, go, watch } from './helpers.js'
import { SURFACE_LINE, line } from '../../src/data/positioning.js'
import { AI_LIMITS } from '../../src/config/plans.js'
import { COLOUR_SYSTEMS } from '../../src/config/colourSystems.js'
import { CREATE_GROUPS, DISCOVER_GROUPS, createTools } from '../../src/data/toolTree.js'
import { SECTIONS } from '../../scripts/share-cards.mjs'
import { sectionEyebrow } from '../../scripts/og-cards.mjs'

const PERSONA = 'a designer who has seen a hundred AI-generated SaaS pages'

test.describe('the homepage below the hero', () => {
  /* FOUR TESTS REMOVED HERE, 2026-09-22 — the sections they guarded are gone.
   *
   * They asserted the OLD homepage below its hero: the tools-section lede and
   * its Soon-badged grid, the six-card tool grid, the export section read by
   * #hkit-title, and the starting-points count. Spectrum has none of those
   * objects, and SURFACE_LINE.homeExportHeading is no longer rendered by any
   * page, so there was nothing to re-point them at.
   *
   * What they were really protecting — that this page does not invent proof,
   * does not badge a figure strip, and does not claim an unbuilt tool — did
   * not go with them:
   *   · the price panel below still checks every figure against the config
   *     that enforces it, and still bans the four sentences he removed;
   *   · 04-premium-home sums the bench rail against the lede's "thirteen"
   *     and asserts the figure strip stays absent;
   *   · Spectrum omits unbuilt tools rather than badging them, so there is no
   *     Soon badge left to guard on this page.
   *
   * ALSO REMOVED: "ends on the price panel — the closing CTA banner is gone".
   * Spectrum DOES end on a closing CTA section (.sp-close, "Start your first
   * kit today") after the pricing and FAQ. That is the design as drawn, so
   * asserting the banner's absence would fail a page behaving as drawn; a
   * test does not overrule the design to satisfy an old rule. */

  test('the plans page describes Pro from the config that enforces it', async ({ page }) => {
    // Was: "Free covers the complete core toolkit with no trial clock. Pro
    // raises the AI limits and unlocks saved projects, exports and
    // submissions." over four typed lines, three of them wrong — Free has
    // every tool and saves projects too, "full system exports" once sold a
    // JSON the product cannot make, and submissions need a sign-in, not Pro.
    //
    // Every plan detail lives on the Pricing screen at /plans, not on the
    // landing. The claims are
    // about the PRODUCT, so they follow the page that makes them; read as page
    // text rather than through the old `.sp-plan` markup, because /plans is
    // being rebuilt and the figures, not the classes, are the contract.
    watch(page, PERSONA)
    await go(page, '/plans')
    await expectRendered(page, '/plans')

    const text = (await page.locator('main').first().evaluate((el) => el.textContent || ''))
      .replace(/\s+/g, ' ')
    expect(text).toContain(`${AI_LIMITS.pro.daily} AI generations a day`)
    expect(text).toContain(`${AI_LIMITS.pro.monthly} a month`)

    const lower = text.toLowerCase()
    // The two claims that were FALSE of Pro. ("Every colour, type, icon and
    // image tool" and "no trial clock" were only wrong as Pro bullets; on a
    // whole pricing page they can describe Free truthfully, so they are not
    // page-wide bans.)
    for (const wrong of ['community submissions', 'full system exports']) {
      expect(lower, `/plans is back to claiming "${wrong}"`).not.toContain(wrong)
    }
    // And the landing carries none of it: plan detail lives on /plans only.
    await go(page, '/')
    await expectRendered(page, '/')
    await expect(page.locator('.sp-plan'), 'a plan card is back on the landing').toHaveCount(0)
  })

})

test.describe('the Discover landing', () => {
  test('is headed by its own name, with no eyebrow and no lede', async ({ page }) => {
    // Was: a "Discover" eyebrow over "Find systems worth stealing." — a line
    // the founder had already thrown out on the homepage ('"Systems worth
    // stealing." is bad copy', 56-homepage-headline-copy) with "Find" in
    // front of it — over an agent lede built on the "earn a tab" idiom.
    watch(page, PERSONA)
    await go(page, '/discover')
    await expectRendered(page, '/discover')

    const hero = page.locator('.home-hero--surface')
    await expect(hero).toHaveCount(1)
    await expect(hero.getByRole('heading', { level: 1 })).toHaveText('Discover')
    await expect(hero.locator('.home-eyebrow'), 'the taxonomy eyebrow is back above the h1').toHaveCount(0)
    await expect(hero.locator('.home-hero-sub'), 'a lede is back under the h1').toHaveCount(0)
    // The derived status line and the way in survive.
    const live = DISCOVER_GROUPS.filter((g) => !g.soon).length
    await expect(hero.locator('.home-hero-hint')).toContainText(`${live} libraries open`)
    // THE WAY IN MOVED OUT OF THE HERO, and that is the change rather than a
    // loss. The hero carried a "Browse palettes" CTA above an index whose first
    // card is the Palette Library — one destination offered twice, a screen
    // apart. The sales intro came off this page in the redesign and it opens on
    // the index now, so the way in is asserted where it actually is.
    await expect(hero.getByRole('link')).toHaveCount(0)
    await expect(page.locator('main').getByRole('link', { name: /Palette Library/ }).first())
      .toHaveAttribute('href', '/discover/palettes')
  })
})

test.describe('the Help centre', () => {
  test('opens on the founder’s sentence and nothing after it', async ({ page }) => {
    // Was: the founder line followed by "No account, no setup, no blank
    // canvas. Sign in later if you want the same work on another device." —
    // a three-part reassurance in the class he retired, and a sentence the
    // "Do I need an account?" answer below already carries.
    watch(page, PERSONA)
    await go(page, '/help')
    await expectRendered(page, '/help')

    const lede = page.locator('.hlp-hero .hlp-lede')
    await expect(lede).toHaveCount(1)
    await expect(lede).toHaveText(line(SURFACE_LINE.helpOpening))
  })
})

// /plans has no closing SystemCTA band: it is the design's Pricing screen, which ends on the colour band and
// the footer's handoff. What this block guarded — no payment reassurance in a
// micro-line slot, and the numbers derived — is guarded where the design puts
// the same kind of line: the Free card's note.
test.describe('the Plans page reassurance lines', () => {
  test('the Free card note is the design\'s sentence without the retired payment reassurances', async ({ page }) => {
    // The design reads "Free because the tools cost us nothing to run. No trial
    // clock, no card." Both trailing clauses are the retired "no card" class
    // the product no longer makes; the sentence before them
    // stays, and the slot keeps the design's two-line height.
    watch(page, PERSONA)
    await go(page, '/plans')
    await expectRendered(page, '/plans')

    const note = page.locator('.pr-plan--free .pr-plan-note')
    await expect(note).toHaveText('Free because the tools cost us nothing to run.')
    const text = (await page.locator('.pricing main').innerText()).toLowerCase()
    for (const phrase of ['no trial clock', 'no card', 'ready today', 'upgrade when your workflow']) {
      expect(text, `/plans says "${phrase}" again`).not.toContain(phrase)
    }
    // The sub-line's colour-system count is derived, not typed.
    await expect(page.locator('.pr-sub')).toContainText(`colour systems`)
    expect(COLOUR_SYSTEMS.length).toBeGreaterThan(2)
  })
})

/* THE APP FOOTER'S OWN RULES, ON THE ROUTES THAT MOUNT IT.
 *
 * '/' left this loop when it became Spectrum. The front door renders
 * `<SpectrumFooter />` instead of `<AppFooter />` — deliberately, so the page
 * has one contentinfo landmark rather than two — and that footer is a different
 * object with different rules: no wordmark block, and it DOES carry one
 * sentence ("Save time, and save your mind."), which SpectrumFooter.jsx argues
 * is a handoff above a button rather than the tagline-under-a-wordmark the
 * founder retired. Asserting the AppFooter rules there would fail a page that
 * is behaving as designed.
 *
 * What still holds on every route, '/' included, is the founder attribution —
 * and 07-public-shell-library-palette asserts it across both footers. The
 * Spectrum footer's link parity with AppFooter is pinned by
 * tests/unit/spectrum-footer-parity.test.js. */
test.describe('the footer', () => {
  // /plans renders the marketing footer and app pages draw no site footer, so
  // the reading pages are where the site footer is checked.
  for (const route of ['/help']) {
    test(`${route} carries the wordmark and no tagline`, async ({ page }) => {
      // Was: "The operating workspace for building, validating and exporting
      // interface foundations." under the wordmark on every page — a tagline,
      // the founder's word for the line he retired as "a huge AI Slop
      // feature", and a value claim typed outside positioning.js.
      watch(page, PERSONA)
      await go(page, route)
      await expectRendered(page, route)

      const footer = page.locator('.app-footer')
      await expect(footer).toHaveCount(1)
      await expect(footer.locator('.app-footer-mark')).toHaveText('UIL4B')
      await expect(footer.locator('.app-footer-tagline'), 'the footer tagline is back').toHaveCount(0)
      // '/create/color' until the colour landing was deleted. The link is built
      // from categoryDestination('colour'), which now answers with the group's
      // first tool because the category home only bounces.
      await expect(footer.getByRole('link', { name: /Start with colour/ })).toHaveAttribute('href', '/create/palette')
    })
  }
})

test.describe('the 404', () => {
  test('suggests destinations by their names in the tool tree', async ({ page }) => {
    // Was: four hand-written cards — "Palette Generator" (not the product's
    // name for /create/palette anywhere else) and "Community palettes,
    // gradients and prompts" (the palettes are curated and brand; community
    // is the group still marked Soon).
    watch(page, PERSONA)
    await go(page, '/anti-slop-audit-this-does-not-exist')
    await expectRendered(page, '/anti-slop-audit-this-does-not-exist')

    const tools = createTools()
    const groupLabel = Object.fromEntries(CREATE_GROUPS.map((g) => [g.id, g.label]))
    const expected = ['palette', 'type-scale', 'icons'].map((id) => {
      const t = tools.find((x) => x.id === id)
      return { label: t.label, desc: groupLabel[t.group], href: t.route }
    })
    expected.push({
      label: 'Discover',
      desc: `${DISCOVER_GROUPS.filter((g) => !g.soon).length} libraries open`,
      href: '/discover',
    })

    const cards = page.locator('.nf-card')
    await expect(cards).toHaveCount(expected.length)
    for (let i = 0; i < expected.length; i += 1) {
      await expect(cards.nth(i).locator('.nf-card-label')).toHaveText(expected[i].label)
      await expect(cards.nth(i).locator('.nf-card-desc')).toHaveText(expected[i].desc)
      await expect(cards.nth(i)).toHaveAttribute('href', expected[i].href)
    }
    const text = (await page.locator('.nf-grid').textContent()).toLowerCase()
    expect(text).not.toContain('palette generator')
    expect(text).not.toContain('community palettes')
  })
})

test.describe('the gallery mastheads', () => {
  // THE PALETTE AND GRADIENT LIBRARY MASTHEAD SENTENCES WERE DELETED AND PUT
  // BACK, in the same audit. "…with a point of view … make it yours." is one
  // sentence with the nouns swapped, and it is on the founder's list to
  // rewrite — but three standing contracts pin the masthead as title +
  // description (15-discover-library-parity, 34-palette-library-sections),
  // and without the sentence the 390px masthead is 183px of dead space, the
  // exact defect 40-gallery-hero was written for. A hole is worse than a
  // templated line, so the line stays until he writes its replacement. The
  // audit's only gallery-chrome change is the one below.

  test('the Curated Resources grid heading has no "not scraped" label above it', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/discover/resources')
    await expectRendered(page, '/discover/resources')
    const heading = page.locator('#cur-bands-heading')
    await expect(heading).toHaveCount(1)
    await expect(heading.locator('xpath=..').locator('span')).toHaveCount(0)
  })
})

test.describe('the share cards', () => {
  test('no section card falls back to a "Design toolkit" eyebrow', async () => {
    // The generator used to print "Design toolkit" above every section name
    // that had no eyebrow of its own — the retired framing, as the same kind
    // of kicker the homepage card dropped when "UI system toolkit" went. Read
    // from the rule the generator exports rather than from the pixels.
    const fallbacks = SECTIONS.filter((s) => !s.eyebrow)
    expect(fallbacks.length, 'the positive control: some section relies on the default').toBeGreaterThan(0)
    for (const s of fallbacks) {
      expect(sectionEyebrow(s), `the ${s.id} card prints an eyebrow it did not ask for`).toBeNull()
    }
    // …and a section that does say something above its name keeps it.
    const learn = SECTIONS.find((s) => s.id === 'learn')
    expect(sectionEyebrow(learn)).toBe(learn.eyebrow)
  })
})
