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

    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toContainText('No more tab hoarding.')
    await expect(heading).toContainText('Build your UI system in one place.')
    await expect(page.getByText('The operating workspace for UI systems')).toBeVisible()
    await expect(page.locator('.home-proof-item')).toHaveCount(0)
    await expect(page.locator('.home-stage-cap')).toHaveCount(0)
    await expect(page.getByText(/Typography and component tooling are coming next/)).toBeVisible()
    await expect(page.locator('.home-export-soon')).toHaveCount(5)
    await expect(page.getByRole('tab')).toHaveCount(3)

    const preview = page.locator('.home-stage-shell')
    await preview.scrollIntoViewIfNeeded()
    await expect(preview).toBeVisible()
    await page.locator('.home-workspace-bridge-tab', { hasText: 'Imagery' }).click()
    const imageryTab = page.getByRole('tab', { name: 'Imagery' })
    await expect(imageryTab).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('slider', { name: 'Compression quality' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Open Imagery' })).toHaveAttribute('href', '/file-converter')

    await imageryTab.focus()
    await imageryTab.press('ArrowRight')
    await expect(page.getByRole('tab', { name: 'Colour' })).toBeFocused()
    await expect(page.getByRole('tab', { name: 'Colour' })).toHaveAttribute('aria-selected', 'true')
    await page.getByRole('tab', { name: 'Colour' }).press('End')
    await expect(imageryTab).toBeFocused()
    await expect(imageryTab).toHaveAttribute('aria-selected', 'true')

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)
  })

  test('keeps the static product bridge and calls to action readable on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await useReducedMotion(page)
    watch(page, PERSONA)
    await go(page, '/')

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Start building free' }).first()).toBeVisible()
    await expect(page.locator('.home-workspace-bridge-tab')).toHaveCount(3)
    const bridgePosition = await page.locator('.home-workspace-bridge').evaluate(
      (element) => getComputedStyle(element).position,
    )
    expect(bridgePosition).toBe('relative')
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)
  })

  test('reports real upload and output bytes, including an honest larger result', async ({ page }) => {
    await useReducedMotion(page)
    watch(page, 'developer checking an image before handoff')
    await go(page, '/')
    await page.getByRole('tab', { name: 'Imagery' }).click()

    const source = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><path fill="#f00" d="M0 0h2v2H0z"/></svg>',
    )
    await page.locator('.imc-file-input').setInputFiles({
      name: 'tiny-source.svg',
      mimeType: 'image/svg+xml',
      buffer: source,
    })

    await expect(page.locator('.imc-file-name')).toHaveText('tiny-source.svg')
    await expect(page.locator('.imc-bar-row').first()).toContainText(`${source.length} B`)
    await expect(page.locator('.imc-result')).toContainText(/larger|smaller|Same file size/)
    await expect(page.locator('.imc-output-meta')).toContainText(/WebP|JPEG/)
    await expect(page.getByRole('link', { name: /Download (WebP|JPEG)/ })).toBeVisible()
  })

  test('rejects unreadable and oversized image inputs without losing the current preview', async ({ page }) => {
    await useReducedMotion(page)
    watch(page, 'designer testing compressor recovery')
    await go(page, '/')
    await page.getByRole('tab', { name: 'Imagery' }).click()
    const input = page.locator('.imc-file-input')

    await input.setInputFiles({
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('not an image'),
    })
    await expect(page.getByRole('alert')).toContainText('Choose a PNG')
    await expect(page.locator('.imc-file-name')).toHaveText('sample-hero.png')

    await input.setInputFiles({
      name: 'too-large.png',
      mimeType: 'image/png',
      buffer: Buffer.alloc(25 * 1024 * 1024 + 1),
    })
    await expect(page.getByRole('alert')).toContainText('over 25 MB')
    await expect(page.locator('.imc-file-name')).toHaveText('sample-hero.png')
  })

  test('holds keyboard bridge static until Tab reaches the selected preview, then restores on reverse', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.addInitScript(() => {
      localStorage.setItem('vs-appearance', JSON.stringify({
        rounding: 'default',
        density: 'cozy',
        reducedMotion: false,
      }))
    })
    watch(page, 'motion-enabled product evaluator')
    await go(page, '/')
    await expect.poll(() => page.locator('.home').getAttribute('data-home-bridge-state')).not.toBeNull()
    const bridge = page.locator('.home-workspace-bridge')
    const iconsBridge = page.locator('.home-workspace-bridge-tab', { hasText: 'Icons' })
    const bridgeSiblings = bridge.locator('li:not([data-preview-id="icons"])')
    const iconsTabDom = page.locator('.prev-tab[data-preview-id="icons"]')
    const iconsTab = page.getByRole('tab', { name: 'Icons' })
    await iconsBridge.focus()
    await expect(iconsBridge).toBeFocused()
    await expect(page.locator('.home')).toHaveAttribute('data-home-bridge-state', 'keyboard-held')
    await iconsBridge.press('Enter')
    await expect(iconsTabDom).toHaveAttribute('aria-selected', 'true')
    await expect(iconsBridge).toBeFocused()
    await expect(page.locator('.home')).toHaveAttribute('data-home-bridge-state', 'keyboard-held')
    await page.evaluate(() => {
      const hero = document.querySelector('.home-hero')
      window.scrollTo({ top: hero.offsetTop + hero.offsetHeight, behavior: 'instant' })
    })
    await expect.poll(
      () => page.locator('.home').getAttribute('data-home-bridge-state'),
      { timeout: 5000 },
    ).toBe('keyboard-held')
    await expect(iconsBridge).toBeFocused()
    await expect(bridge).not.toHaveAttribute('inert', '')
    await expect(bridge).not.toHaveAttribute('aria-hidden', 'true')
    await expect(bridgeSiblings).toHaveCount(2)
    for (const sibling of await bridgeSiblings.all()) {
      await expect(sibling).toHaveAttribute('inert', '')
      await expect(sibling).toHaveAttribute('aria-hidden', 'true')
    }

    await iconsBridge.press('Tab')
    await expect(iconsTab).toBeFocused()
    await expect.poll(
      () => page.locator('.home').getAttribute('data-home-bridge-state'),
      { timeout: 5000 },
    ).toBe('converged')
    await expect(bridge).toHaveAttribute('inert', '')
    await expect(bridge).toHaveAttribute('aria-hidden', 'true')

    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
    await expect.poll(
      () => page.locator('.home').getAttribute('data-home-bridge-state'),
      { timeout: 5000 },
    ).toBe('moving')
    await expect(bridge).not.toHaveAttribute('inert', '')
    await expect(bridge).not.toHaveAttribute('aria-hidden', 'true')
    await expect(iconsBridge).toBeEnabled()
    for (const item of await bridge.locator('li').all()) {
      await expect(item).not.toHaveAttribute('inert', '')
      await expect(item).not.toHaveAttribute('aria-hidden', 'true')
    }
  })

  test('lets a mouse-clicked bridge control converge without entering keyboard-held mode', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.addInitScript(() => {
      localStorage.setItem('vs-appearance', JSON.stringify({
        rounding: 'default',
        density: 'cozy',
        reducedMotion: false,
      }))
    })
    watch(page, 'pointer-first product evaluator')
    await go(page, '/')
    await expect.poll(() => page.locator('.home').getAttribute('data-home-bridge-state')).not.toBeNull()

    const bridge = page.locator('.home-workspace-bridge')
    const imageryBridge = page.locator('.home-workspace-bridge-tab', { hasText: 'Imagery' })
    await imageryBridge.click()
    await expect(imageryBridge).toBeFocused()
    expect(await imageryBridge.evaluate((button) => button.matches(':focus-visible'))).toBe(false)
    await expect(page.locator('.prev-tab[data-preview-id="imagery"]')).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator('.home')).not.toHaveAttribute('data-home-bridge-state', 'keyboard-held')

    await page.evaluate(() => {
      const hero = document.querySelector('.home-hero')
      window.scrollTo({ top: hero.offsetTop + hero.offsetHeight, behavior: 'instant' })
    })
    await expect.poll(
      () => page.locator('.home').getAttribute('data-home-bridge-state'),
      { timeout: 5000 },
    ).toBe('converged')
    await expect(bridge).toHaveAttribute('inert', '')
    await expect(bridge).toHaveAttribute('aria-hidden', 'true')
  })

  test('debounces async blob encoding, publishes the latest quality and revokes stale URLs', async ({ page }) => {
    await useReducedMotion(page)
    await page.addInitScript(() => {
      window.__homeEncodeCalls = 0
      window.__homeRevokeCalls = 0
      HTMLCanvasElement.prototype.toDataURL = () => {
        throw new Error('Synchronous canvas encoding must not run')
      }
      const originalToBlob = HTMLCanvasElement.prototype.toBlob
      HTMLCanvasElement.prototype.toBlob = function (...args) {
        window.__homeEncodeCalls += 1
        return originalToBlob.apply(this, args)
      }
      const originalRevoke = URL.revokeObjectURL
      URL.revokeObjectURL = function (...args) {
        window.__homeRevokeCalls += 1
        return originalRevoke.apply(this, args)
      }
    })
    watch(page, 'developer stress-testing image quality changes')
    await go(page, '/')
    await page.getByRole('tab', { name: 'Imagery' }).click()

    const compressor = page.locator('.imc')
    await expect(compressor).toHaveAttribute('aria-busy', 'false')
    const firstDownload = page.getByRole('link', { name: /Download (WebP|JPEG|PNG)/ })
    await expect(firstDownload).toHaveAttribute('href', /^blob:/)
    const firstUrl = await firstDownload.getAttribute('href')
    const before = await page.evaluate(() => window.__homeEncodeCalls)

    await page.getByRole('slider', { name: 'Compression quality' }).evaluate((input) => {
      const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
      for (const value of [31, 42, 54, 66, 78, 95]) {
        setValue.call(input, String(value))
        input.dispatchEvent(new Event('input', { bubbles: true }))
      }
    })
    await expect(page.getByRole('button', { name: /Encoding/ })).toBeDisabled()
    await expect(compressor).toHaveAttribute('aria-busy', 'false')
    await expect(page.locator('.imc-output-meta')).toContainText('95% quality')

    const after = await page.evaluate(() => window.__homeEncodeCalls)
    expect(after - before).toBeGreaterThanOrEqual(1)
    expect(after - before).toBeLessThanOrEqual(2)
    const secondUrl = await page.getByRole('link', { name: /Download/ }).getAttribute('href')
    expect(secondUrl).not.toBe(firstUrl)
    await expect.poll(() => page.evaluate(() => window.__homeRevokeCalls)).toBeGreaterThanOrEqual(1)

    await page.getByRole('tab', { name: 'Icons' }).click()
    await expect.poll(() => page.evaluate(() => window.__homeRevokeCalls)).toBeGreaterThanOrEqual(2)
  })
})
