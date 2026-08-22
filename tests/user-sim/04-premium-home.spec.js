// Premium-home regression coverage: the public promise, interactive proof and
// responsive information hierarchy must remain usable without animation.
import { test, expect } from '@playwright/test'
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

    // The headline — see 10-home-chaos-to-calm for the full reasoning. It no
    // longer says "Every design tool, / one search box away.": that is the
    // framing positioning.md retired as selling "a grab-bag of tools", and
    // "Every" was contradicted by this page's own data.
    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toContainText('A UI system that')
    await expect(heading).toContainText('survives the handoff.')

    // The stat line is DELETED. The assertion that lived here checked the
    // numbers were derived rather than the mock's invented "40+ TOOLS", and
    // that job moves with the one honest number: the live tool count is now in
    // the command bar's placeholder, still derived from the tool tree.
    //
    // Asserting a NUMBER rather than the literal 13 on purpose — the point is
    // that a function counted the tool tree, and hard-coding today's answer
    // here would just move the drift from the page into the test.
    const placeholder = await page.locator('.hcmd-input').getAttribute('placeholder')
    expect(placeholder).toMatch(/^Search \d+ live tools$/)
    expect(placeholder).not.toContain('40+')

    // …and the two BORROWED catalogue numbers are gone from the page entirely.
    // 200K is Iconify's catalogue and 1,500+ is Google Fonts' — both real, both
    // already claimed in context deeper in the product, and neither ours to
    // print in a hero as though it were an achievement of this product.
    const body = await page.locator('body').innerText()
    expect(body).not.toContain('200K ICONS')
    expect(body).not.toContain('1,500+ FONTS')
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
