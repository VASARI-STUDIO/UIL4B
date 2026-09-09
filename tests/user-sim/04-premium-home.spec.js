// Premium-home regression coverage: the public promise, interactive proof and
// responsive information hierarchy must remain usable without animation.
import { test, expect } from './base.js'
import { go, goRaw, watch } from './helpers.js'

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
      await goRaw(page, '/', { waitUntil: 'commit' })
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
    // THE EXPECTED WORDS CHANGED WITH THE HEADLINE, 2026-09-07. The hero now
    // carries a line assembled from the founder's own sentences ("Build and
    // export UI and brand design kits, in one unified location."), which names
    // the OUTPUT rather than the material — so the old
    // /colour|color|type|token|system/ probe no longer matches and would have
    // failed on a correct page. It is replaced, not deleted: the contract this
    // line stands for is that the h1 names the work, and "design kits" is how
    // the shipped headline names it. 10-home-chaos-to-calm still owns the
    // property pins.
    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toContainText(/design kits|unified location/i)

    // THE KICKER ASSERTION IS GONE, AND ITS INVERSE TAKES ITS PLACE.
    // `.home-hero-kicker` carried "UI system toolkit"; the founder removed it
    // on 2026-09-07 — "these all over the place is a huge AI Slop feature" —
    // and asked that nothing replace it. So the check flips: the element must
    // be ABSENT, which is what stops a future edit quietly reinstating a
    // category line above the headline. Paired with the stat-strip check below,
    // which has the same shape and the same history.
    await expect(page.locator('.home-hero-kicker'), 'the hero kicker tagline is back').toHaveCount(0)
    await expect(page.locator('.home-hero-stats'), 'the hero stat strip is back').toHaveCount(0)

    // The figures moved beside the toolset grid on 2026-09-07 and were
    // removed from there on 2026-09-09: the founder marked the three-up
    // figure strip "AI" on the Font Gallery masthead and asked for the change
    // to reach every header that matches, and a figure strip under a section
    // heading matches. So this check flips the same way the kicker check did —
    // the strip must be ABSENT, wherever it is put. The mock's invented
    // "40+ TOOLS" cannot come back through a component that no longer exists;
    // 70-anti-slop-marketing.spec.js owns the rendered absence.
    await expect(page.locator('.htools-facts'), 'the figure strip is back').toHaveCount(0)
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
