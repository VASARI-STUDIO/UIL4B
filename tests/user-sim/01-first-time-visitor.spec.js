// Persona: FIRST-TIME VISITOR — never seen UIL4B, no account, no vocabulary
// for the product. Goals: understand what the product is within seconds,
// reach a real tool through the navigation alone, find the price, and never
// hit a blank or broken page while wandering.
import { test, expect } from '@playwright/test'
import { watch, expectRendered, go } from './helpers.js'

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
    const cta = page.locator('a[href="/login"], a[href="/plans"], a[href^="/color"], a[href="/home"]').first()
    if (!(await cta.count())) {
      fb.note('improve', 'No obvious CTA link found on the landing page (login / plans / a tool).')
    }
  })

  test('can reach the Aspect & Resolution tool through the nav mega menu', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/')

    // Open the first nav dropdown (Create) and follow a tool link like a
    // curious human would: read the menu, click the thing that matches.
    // NB: a real pointer hovers before it clicks — hover opens the menu and
    // the click must PIN it open, not toggle it shut (regression guard).
    await page.locator('.pnav-trigger').first().click()
    // The utility tools live under their own "Media" eyebrow.
    await expect(page.locator('.pnav-col-label', { hasText: /^Media$/ })).toBeVisible()
    const tool = page.locator('.pnav-tool', { hasText: 'Aspect & Resolution' }).first()
    await expect(tool).toBeVisible()
    await tool.click()
    await expect(page).toHaveURL(/\/ratio/)
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
      await go(page, url)
      if (!(await expectRendered(page))) {
        fb.note('critical', `Surface ${url} rendered (almost) no visible text — reads as a blank page.`, url)
      }
      expect(await expectRendered(page), `${url} should render visible content`).toBe(true)
    }
  })

  test('a mistyped URL lands somewhere sensible, not a dead end', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/this-page-does-not-exist')
    // App policy: unknown routes redirect home.
    await expect(page).toHaveURL(/\/$/)
    expect(await expectRendered(page)).toBe(true)
  })
})
