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

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Build the system.')
    await expect(page.getByText('The operating workspace for UI systems')).toBeVisible()
    await expect(page.locator('.home-proof-item')).toHaveCount(4)
    await expect(page.getByText(/Typography, component tooling and broader exports are coming soon/)).toBeVisible()
    await expect(page.locator('.home-export-soon')).toHaveCount(5)

    const preview = page.locator('.home-stage-shell')
    await preview.scrollIntoViewIfNeeded()
    await expect(preview).toBeVisible()
    await page.getByRole('tab', { name: 'Components' }).click()
    await expect(page.getByRole('slider', { name: 'Corner radius' })).toBeVisible()

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)
  })

  test('keeps product proof and calls to action readable on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await useReducedMotion(page)
    watch(page, PERSONA)
    await go(page, '/')

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Start building free' }).first()).toBeVisible()
    await expect(page.locator('.home-proof-item')).toHaveCount(4)

    const proofColumns = await page.locator('.home-proof').evaluate(
      (element) => getComputedStyle(element).gridTemplateColumns.split(' ').length,
    )
    expect(proofColumns).toBe(1)
  })
})
