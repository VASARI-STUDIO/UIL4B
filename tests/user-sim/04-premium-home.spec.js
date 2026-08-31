// Premium-home regression coverage: the public promise, interactive proof and
// responsive information hierarchy must remain usable without animation.
import { test, expect } from './base.js'
import { watch, go } from './helpers.js'

const PERSONA = 'prospective UI-system builder'

async function useReducedMotion(page) {
  await page.addInitScript(() => {
    localStorage.setItem('vs-appearance', JSON.stringify({
      rounding: 'default',
      density: 'cozy',
      reducedMotion: true,
    }))
  })
}

test.describe('premium homepage', () => {
  test.use({ reducedMotion: 'reduce' })

  test('shows a quiet branded shell before the application script mounts', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    let releaseScript
    const scriptGate = new Promise((resolve) => { releaseScript = resolve })
    await page.route(/\/assets\/index-[^/]+\.js$/, async (route) => {
      await scriptGate
      await route.continue()
    })

    try {
      await page.goto('/', { waitUntil: 'commit' })
      const shell = page.locator('#boot-shell')
      await expect(shell).toBeVisible()
      await expect(shell.getByRole('status')).toHaveText('Loading UIL4B')
      await expect(shell.locator('.boot-decoration')).toHaveAttribute('aria-hidden', 'true')
      const animationName = await shell.locator('.boot-card').first().evaluate(
        (element) => getComputedStyle(element, '::after').animationName,
      )
      expect(animationName).toBe('none')
    } finally {
      releaseScript()
    }

    await expect(page.locator('#boot-shell')).toHaveCount(0)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('communicates the product and proves it with a working preview', async ({ page }) => {
    await useReducedMotion(page)
    watch(page, PERSONA)
    await go(page, '/')

    // The headline says what the product MAKES rather than naming a category.
    //
    // It used to be pinned verbatim ("Every design tool, / one search box
    // away."). That sentence is gone: a user told the founder the page read
    // instantly as "an AI-generated website", and a headline that could sit on
    // any design product was part of why. The full reasoning and the property
    // pins live in 10-home-chaos-to-calm, which owns this contract; here the
    // check is only that the hero still names the work.
    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toContainText(/colour|color|type|token|system/i)

    // The kicker still does the job the "operating workspace" pill and then the
    // mono stat line each did before it: say what this is before the headline
    // lands. What changed is that it is now ONE quiet category line rather than
    // a four-item statistics strip — the strip was the most recognisable piece
    // of generic SaaS furniture on the page.
    await expect(page.locator('.home-hero-kicker')).toBeVisible()
    await expect(page.locator('.home-hero-stats'), 'the hero stat strip is back').toHaveCount(0)

    // The figures did not disappear — they moved beside the toolset grid they
    // describe. Still derived from the tool tree, still never the mock's
    // invented "40+ TOOLS".
    const facts = page.locator('.htools-facts')
    await expect(facts).toContainText('tools live today')
    await expect(facts).toContainText('icons, via Iconify')
    await expect(facts).not.toContainText('40+')
    await expect(page.locator('.home-proof-item')).toHaveCount(0)
    await expect(page.getByText(/Component tooling is coming next/)).toBeVisible()

    // V2 retired the Export roadmap section, but the honesty rule it guarded —
    // unbuilt things are visibly marked Soon, never claimed as live — now lives
    // on the tools grid. Component tooling is the unbuilt category.
    const componentCard = page.locator('.htool', { hasText: 'UI Component Builder' })
    await expect(componentCard.locator('.htool-soon').first()).toBeVisible()
    await expect(page.locator('.htool-soon').first()).toHaveText('Soon')

    // Every live tool reachable above; five ways of working below. The
    // relationship is the page's argument, so both are regression-guarded.
    await expect(page.locator('.htool-link')).toHaveCount(18)
    await expect(page.locator('.htool')).toHaveCount(6)
    const workbench = page.locator('.hw-shell')
    await workbench.scrollIntoViewIfNeeded()
    await expect(workbench).toBeVisible()
    await expect(page.locator('.hw-tab')).toHaveCount(5)
    await expect(page.getByRole('link', { name: /Continue in Palette Builder/ }))
      .toHaveAttribute('href', '/create/palette')

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)
  })

  test('keeps the static tool list and calls to action readable on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await useReducedMotion(page)
    watch(page, PERSONA)
    await go(page, '/')

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Start building free' }).first()).toBeVisible()
    await expect(page.locator('.htool-link')).toHaveCount(18)
    // The phone gets the calm stacked arrangement: the demo panel does not
    // stick, so the narrative reads as one column of prose. Same guarantee the
    // satellite field's `position: static` used to give.
    const stickyPosition = await page.locator('.hsteps-sticky').evaluate(
      (element) => getComputedStyle(element).position,
    )
    expect(stickyPosition).toBe('static')
    // The command bar is the hero's primary control and must be usable here.
    await expect(page.locator('.hcmd-input')).toBeVisible()
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)
  })
})
