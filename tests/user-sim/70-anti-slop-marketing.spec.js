// The 2026-09-09 anti-slop audit of the marketing and wayfinding surfaces,
// as rendered assertions — one per fix, each of which was seen to FAIL with
// the fix reverted before it was trusted (the mutation tally is in the PR).
//
// ── What "the bar" is, in one paragraph ─────────────────────────────────────
//
// .claude/skills/uil4b-brand-design/references/anti-slop-quality-bar.md, read
// against the founder's own verdicts: taglines and payment-reassurance lines
// are "a huge AI Slop feature" (2026-09-07), "Not a screenshot. The actual
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
import { proOnlyFormats } from '../../src/config/exportFormats.js'
import { CREATE_GROUPS, DISCOVER_GROUPS, createTools } from '../../src/data/toolTree.js'
import { SECTIONS } from '../../scripts/share-cards.mjs'
import { sectionEyebrow } from '../../scripts/og-cards.mjs'

const PERSONA = 'a designer who has seen a hundred AI-generated SaaS pages'

// Scroll the whole page once so every `[data-reveal]` band has been given its
// chance to reveal; the checks below read the DOM, but a visible-text check on
// a band GSAP is still holding at autoAlpha:0 would fail for the wrong reason.
async function walk(page) {
  const h = await page.evaluate(() => document.documentElement.scrollHeight)
  for (let y = 0; y < h; y += 600) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y)
    await page.waitForTimeout(40)
  }
  await page.evaluate(() => window.scrollTo(0, 0))
}

test.describe('the homepage below the hero', () => {
  test('ends on the price panel — the closing CTA banner is gone', async ({ page }) => {
    // Was: a <SystemCTA> — "Start free" eyebrow, "From first decision to clean
    // handoff." over "Build a coherent UI system in one place, then take it
    // straight into production.", an "Upgrade only when you're ready" hint,
    // beams and a grid — one scroll after a panel that already ends in "See
    // plans and start free". The founder had the same object deleted from the
    // secondary landings (52-compressed-landings) for being a second copy of
    // a CTA the page had already made.
    watch(page, PERSONA)
    await go(page, '/')
    await expectRendered(page, '/')
    await walk(page)

    await expect(page.locator('.system-cta'), 'the closing CTA banner is back').toHaveCount(0)
    // …and the page still has a close: the price panel and its own button are
    // the last section in <main>.
    const last = page.locator('#main > section').last()
    await expect(last).toHaveClass(/\bhprice\b/)
    // The href carries the cadence the panel has selected, since 2026-09-14 —
    // the rows are a radiogroup now and the choice travels to /plans, which
    // seeds its own toggle from it. Asserted as a pattern rather than a literal
    // so the default tier can move in planLadder.js without failing here; the
    // guarantee is that the close still points at /plans, not which tier wins.
    await expect(last.locator('.hprice-cta')).toHaveAttribute('href', /^\/plans\?billing=(monthly|yearly)$/)
  })

  test('the price panel describes Pro from the config that enforces it', async ({ page }) => {
    // Was: "Free covers the complete core toolkit with no trial clock. Pro
    // raises the AI limits and unlocks saved projects, exports and
    // submissions." over four typed lines, three of them wrong — Free has
    // every tool and saves projects too, "full system exports" once sold a
    // JSON the product cannot make, and submissions need a sign-in, not Pro.
    watch(page, PERSONA)
    await go(page, '/')
    await expectRendered(page, '/')
    await walk(page)

    const panel = page.locator('.hprice-panel')
    await expect(panel).toHaveCount(1)
    await expect(panel.locator('.hprice-lede')).toHaveText('Everything in Free, plus:')

    const items = await panel.locator('.hprice-includes li').allTextContents()
    const joined = items.join(' | ')
    expect(joined).toContain(`${AI_LIMITS.pro.daily} AI generations a day`)
    expect(joined).toContain(`${AI_LIMITS.pro.monthly} a month`)
    expect(joined).toContain(`All ${COLOUR_SYSTEMS.length} colour systems`)
    for (const f of proOnlyFormats()) expect(joined).toContain(f.name)

    const lower = joined.toLowerCase()
    for (const wrong of ['community submissions', 'full system exports', 'every colour, type, icon and image tool', 'no trial clock']) {
      expect(lower, `the price panel is back to claiming "${wrong}"`).not.toContain(wrong)
    }
  })

  test('the tools section has no figure strip and one status sentence', async ({ page }) => {
    // Was: "Every tool reads and writes the same system, so a colour decision
    // in one place is the same colour decision everywhere else." — a balanced
    // clause on a "so" hinge describing what the workbench above has just
    // shown — followed by a three-up <dl> of figures. The founder marked the
    // three-up figure strip "AI" on the Font Gallery masthead and asked for
    // the change to reach every header that matches.
    watch(page, PERSONA)
    await go(page, '/')
    await expectRendered(page, '/')
    await walk(page)

    await expect(page.locator('.htools-facts'), 'the figure strip is back').toHaveCount(0)
    const lede = page.locator('.htools-head .hlede')
    await expect(lede).toHaveCount(1)
    await expect(lede).toHaveText('Component tooling is coming next.')
    // The grid it introduces is still the grid, with its honest Soon badge.
    await expect(page.locator('.htool').first()).toBeAttached()
    await expect(page.locator('.htool-soon').first()).toHaveText('Soon')
  })

  test('the tool grid is weighted by what is live, not six equal cards', async ({ page }) => {
    // THE FOUNDER: "the mini tools on the homepage are bad visual
    // representations." Measured at 1280 on 2026-09-14: six cards of identical
    // weight for six unequal things. Colour System Generator has five live
    // tools and UI Component Builder has none — both of its tools are Soon —
    // and the grid said they were peers. Equal visual weight across unequal
    // items is on the anti-slop tell list.
    //
    // Nothing here pins a width or a card order as a LITERAL. Both are read
    // off the same thing the page reads them off: how many tools in each group
    // a visitor can actually open. Add a live tool to Imagery and this test
    // keeps passing while the layout changes, which is the point — the shape
    // is a report, not a decision.
    //
    // MUTATION: drop the data-tier spans, or sort HOME_TOOL_GROUPS the other
    // way, and `narrower` and `outOfOrder` name the exact pair that broke.
    watch(page, PERSONA)
    await go(page, '/')
    await expectRendered(page, '/')
    await walk(page)

    const cards = await page.evaluate(() => [...document.querySelectorAll('.htool')].map((el) => ({
      title: el.querySelector('.htool-title').textContent.trim(),
      tier: el.dataset.tier,
      width: Math.round(el.getBoundingClientRect().width),
      top: Math.round(el.getBoundingClientRect().top),
      height: Math.round(el.getBoundingClientRect().height),
      live: [...el.querySelectorAll('.htool-link')].filter((a) => !a.querySelector('.htool-soon')).length,
      // The stretch shows up HERE, not under the card. `.htool-open` is
      // `margin-top:auto`, so a card padded out to its row's height keeps its
      // footer on the floor and opens a hole above it instead.
      gapBeforeFooter: (() => {
        const links = el.querySelector('.htool-links')
        const open = el.querySelector('.htool-open')
        if (!links || !open) return 0
        return Math.round(open.getBoundingClientRect().top - links.getBoundingClientRect().bottom)
      })(),
    })))
    expect(cards.length, 'the tool grid is not rendering').toBeGreaterThan(4)

    // 1 · Among the CARDS, a family with more live tools is never given less
    //     room than one with fewer. This is the founder's complaint as
    //     arithmetic. The unbuilt family is excluded here and checked in 3:
    //     it spans the row as a strip, so its WIDTH is the widest on the page
    //     while its height is the shortest, and width alone would read that
    //     backwards.
    const narrower = []
    const built = cards.filter((c) => c.tier !== 'next')
    for (const a of built) {
      for (const b of built) {
        if (a.live > b.live && a.width < b.width) {
          narrower.push(`${a.title} (${a.live} live) is ${a.width}px, ${b.title} (${b.live}) is ${b.width}px`)
        }
      }
    }
    expect(narrower, `a deeper family got a smaller card:\n  ${narrower.join('\n  ')}`).toEqual([])

    // …and "never smaller" is satisfied by six identical cards, which is the
    // thing being fixed. The deepest family must be STRICTLY wider than the
    // shallowest one, so a grid that went back to equal columns fails here
    // rather than passing on a technicality.
    const deepest = built.reduce((a, b) => (b.live > a.live ? b : a))
    const shallowest = built.reduce((a, b) => (b.live < a.live ? b : a))
    expect(deepest.live, 'every built family has the same number of live tools')
      .toBeGreaterThan(shallowest.live)
    expect(deepest.width, `${deepest.title} (${deepest.live} live) is no wider than ${shallowest.title} (${shallowest.live})`)
      .toBeGreaterThan(shallowest.width)

    // 2 · DOM order is reading order is visual order. Sorting in the component
    //     rather than with CSS `order` is what keeps a keyboard user's tab
    //     sequence the same as what they see.
    const outOfOrder = cards
      .slice(1)
      .map((c, i) => (c.live > cards[i].live ? `${c.title} (${c.live} live) comes after ${cards[i].title} (${cards[i].live})` : null))
      .filter(Boolean)
    expect(outOfOrder, `the grid reads out of order:\n  ${outOfOrder.join('\n  ')}`).toEqual([])

    // 3 · The family with nothing live is last, spans the row on its own, and
    //     is the only one that does. A Soon badge on a peer-sized card was the
    //     old way of saying this and it did not carry.
    const dead = cards.filter((c) => c.live === 0)
    expect(dead.length, 'no group has nothing live — this fixture has changed').toBe(1)
    expect(dead[0], 'the unbuilt family is not last').toEqual(cards[cards.length - 1])
    expect(dead[0].tier).toBe('next')
    expect(dead[0].width, 'the unbuilt family does not span the row')
      .toBeGreaterThan(Math.max(...built.map((c) => c.width)))
    // …and spanning the row is only honest because it is a STRIP. Without
    //  this the rule above would be satisfied by making the one thing nobody
    //  can use the largest object on the page.
    expect(dead[0].height, 'the unbuilt family is the tallest thing in the grid')
      .toBeLessThan(Math.min(...built.map((c) => c.height)))

    // 4 · AND NO CARD IS PADDED OUT TO ANOTHER CARD'S HEIGHT, which is what
    //     three equal columns did: on 2026-09-14 Icons & Emoji carried one row
    //     of chips above 180px of nothing, because its row was stretched to the
    //     tallest card in it. A card now ends where its content ends.
    const padded = cards
      .filter((c) => c.gapBeforeFooter > 48)
      .map((c) => `${c.title} has a ${c.gapBeforeFooter}px hole above its footer`)
    expect(padded, `cards are being stretched to fill a row:\n  ${padded.join('\n  ')}`).toEqual([])
  })

  test('the export section is headed by the founder’s sentence, read by id', async ({ page }) => {
    // Was: "Your system leaves as a document, not a screenshot." — the
    // "not an X" defensive negation the founder rejected by name on the tools
    // heading. The section draws the export; his build-and-export line names
    // it, and it arrives through positioning.js so it cannot be retyped.
    watch(page, PERSONA)
    await go(page, '/')
    await expectRendered(page, '/')
    await walk(page)

    const title = page.locator('#hkit-title')
    await expect(title).toHaveCount(1)
    await expect(title).toHaveText(line(SURFACE_LINE.homeExportHeading))
    // The demonstration under it is still drawn.
    await expect(page.locator('.hkit-page-swatch').first()).toBeAttached()
  })

  test('the starting-points note is a count and nothing else', async ({ page }) => {
    // Was: "…ship with the app. Open one and it arrives in the tool with its
    // values already loaded — nothing to copy across, nothing to sign up for."
    // The "nothing to X, nothing to Y" pair is the anaphoric tic the founder
    // called "MEGA AI generated", and the second half is sign-up reassurance.
    watch(page, PERSONA)
    await go(page, '/')
    await expectRendered(page, '/')
    await walk(page)

    const note = page.locator('.hcomm-note')
    await expect(note).toHaveCount(1)
    await expect(note).toHaveText(/^\d+ gradients and \d+ palettes ship with the app\.$/)
    await expect(page.locator('.hcomm-card-link').first()).toHaveAttribute('href', /\/create\//)
  })
})

test.describe('the Discover landing', () => {
  test('is headed by its own name, with no eyebrow and no lede', async ({ page }) => {
    // Was: a "Discover" eyebrow over "Find systems worth stealing." — a line
    // the founder had already thrown out on the homepage ('"Systems worth
    // stealing." is bad copy', 56-founder-rejected-headlines) with "Find" in
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
    await expect(hero.getByRole('link', { name: /Browse palettes/ })).toHaveAttribute('href', '/discover/palettes')
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

test.describe('the Plans page closing band', () => {
  test('is the founder’s sentence over derived facts, with no eyebrow or hint', async ({ page }) => {
    // Was: "Start on Free" eyebrow / "Build first. Upgrade when your workflow
    // asks for it." / "The complete toolkit is ready today. …" / "No trial
    // clock on Free" — the third payment reassurance on one page.
    watch(page, PERSONA)
    await go(page, '/plans')
    await expectRendered(page, '/plans')

    const cta = page.locator('.system-cta')
    await expect(cta).toHaveCount(1)
    await expect(cta.locator('.system-cta-title')).toHaveText(line(SURFACE_LINE.plansClosing))
    await expect(cta.locator('.home-eyebrow'), 'the eyebrow is back').toHaveCount(0)
    await expect(cta.locator('.system-cta-hint'), 'the reassurance hint is back').toHaveCount(0)
    const lede = cta.locator('.system-cta-lede')
    await expect(lede).toContainText(`All ${COLOUR_SYSTEMS.length} colour systems`.replace('All ', 'all '))
    await expect(lede).not.toContainText('ready today')
    // 54-plans-truth owns the paint check; this only needs the control to exist.
    await expect(cta.getByRole('button', { name: /Start building free/ })).toBeAttached()
  })
})

test.describe('the footer', () => {
  for (const route of ['/', '/plans', '/discover/palettes']) {
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
      await expect(footer.getByRole('link', { name: /Start with colour/ })).toHaveAttribute('href', '/create/color')
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
