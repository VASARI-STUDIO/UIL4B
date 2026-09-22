// Persona: FIRST-TIME VISITOR — never seen UIL4B, no account, no vocabulary
// for the product. Goals: understand what the product is within seconds,
// reach a real tool through the navigation alone, find the price, and never
// hit a blank or broken page while wandering.
import { test, expect } from './base.js'
import { watch, expectRendered, renderState, go } from './helpers.js'

const PERSONA = 'first-time visitor'

test.describe('first-time visitor', () => {
  test('landing page communicates the product and offers a way in', async ({ page }) => {
    const fb = watch(page, PERSONA)
    await go(page, '/')
    await expect(page).toHaveTitle(/UI ?L4B/i)

    const h1 = page.locator('h1').first()
    await expect(h1).toBeVisible()
    const heroText = (await h1.innerText()).trim()
    if (heroText.length < 8) {
      fb.note('improve', `Hero headline is very short ("${heroText}") — a first-time visitor may not learn what the product does.`)
    }

    // There must be at least one obvious call to action above the fold.
    const cta = page.locator('a[href="/login"], a[href="/plans"], a[href^="/create/color"], a[href="/home"]').first()
    if (!(await cta.count())) {
      fb.note('improve', 'No obvious CTA link found on the landing page (login / plans / a tool).')
    }
  })

  /* THE JOURNEY IS THE TEST, AND THE JOURNEY SURVIVED THE NEW FRONT DOOR.
   *
   * This drove the app header's mega menu (`.pnav-trigger`) while Home owned
   * '/'. Spectrum mounts the marketing pill instead, whose navigation is a
   * full-screen menu — so the selectors moved, but the thing being asserted did
   * not: a first-time visitor who has never seen this product can land on the
   * front door and find a named tool by reading the nav.
   *
   * It is deliberately NOT re-pointed at an app route. Doing that would keep the
   * test green while dropping the only coverage of the one journey every new
   * visitor actually takes — and this is the file about a first-time visitor. */
  test('can reach the Aspect & Resolution tool through the front door nav', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/')

    await page.locator('.spnav-burger').click()
    // The menu is a full-screen panel with a staggered entrance. Waiting on the
    // animation layer rather than a timeout: mid-stagger the panel is still at
    // opacity 0, and a stopwatch that happens to read it there reports a menu
    // that is present and invisible.
    await page.evaluate(async () => {
      await Promise.all((document.getAnimations?.() || []).map((a) => a.finished.catch(() => {})))
    })

    // The utility tools live under their own "Media" eyebrow, the same eyebrow
    // the app header uses — both are built from the one tool tree.
    await expect(page.locator('.spnav-tree-colhead', { hasText: /^Media$/ })).toBeVisible()
    const tool = page.locator('.spnav-tool', { hasText: 'Aspect & Resolution' }).first()
    await expect(tool).toBeVisible()
    await tool.click()
    await expect(page).toHaveURL(/\/create\/aspect-ratio/)
    await expect(page.locator('h1', { hasText: /Aspect & Resolution/i })).toBeVisible()
  })

  test('can find out what it costs', async ({ page }) => {
    const fb = watch(page, PERSONA)
    await go(page, '/')
    const pricingLink = page.getByRole('link', { name: 'Plans', exact: true }).first()
    if (await pricingLink.count()) {
      await pricingLink.click()
      await expect(page).toHaveURL(/\/plans/)
    } else {
      fb.note('improve', 'No pricing link reachable from the landing page — going direct.')
      await go(page, '/plans')
    }
    // Headline rewritten in the plans overhaul: it now leads with what is free
    // rather than with the upgrade, because the toolkit genuinely is.
    await expect(page.getByRole('heading', { level: 1, name: /The whole toolkit is free/ })).toBeVisible()
    await expect(page.locator('.sub-tier', { hasText: 'Free' }).first()).toContainText('$0')
  })

  test('wandering the main surfaces never hits a blank or broken page', async ({ page }) => {
    // Eight sequential navigations in one journey — needs more than the
    // default 30s budget when parallel workers make cold chunk loads slow.
    test.setTimeout(150000)
    const fb = watch(page, PERSONA)
    const surfaces = ['/discover', '/learn', '/community', '/help', '/info', '/sitemap', '/plans', '/login']
    for (const url of surfaces) {
      // Eight of these nine surfaces are `lazy()`, so the reading below has to
      // be of the route rather than of the Suspense fallback's 421 characters
      // of shared chrome. `go()` is what guarantees that now.
      await go(page, url)
      const state = await renderState(page)
      if (state.own <= 40) {
        fb.note('critical', `Surface ${url} rendered ${state.own} characters of its own content — reads as a blank page.`, url)
      }
      await expectRendered(page, url)
    }
  })

  test('a mistyped URL says so, and offers a way on', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/this-page-does-not-exist')

    // POLICY CHANGE, deliberate. This used to assert `toHaveURL(/\/$/)` —
    // unknown routes redirected to the homepage. That silently teleported the
    // visitor, so a broken link looked like it had worked and nobody ever
    // reported one; and it returned 200 with `index,follow`, which made every
    // typo an indexable copy of the homepage.
    await expect(page, 'the visitor stays on the URL they typed').toHaveURL(/this-page-does-not-exist/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/doesn’t exist/i)

    // "Not a dead end" is still the requirement — it is just met by offering
    // real destinations rather than by hiding the failure.
    const suggestions = page.locator('.nf-card')
    expect(await suggestions.count(), 'the 404 offers somewhere to go').toBeGreaterThan(2)
    await expect(page.getByRole('link', { name: /Back to the homepage/i })).toBeVisible()

    // And it must not ask to be indexed.
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)

    // The links work: following one leaves the 404 behind.
    await suggestions.first().click()
    await expect(page).not.toHaveURL(/this-page-does-not-exist/)
    await expectRendered(page)
  })
})
