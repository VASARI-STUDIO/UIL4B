// Acceptance coverage for the homepage chaos → calm experience:
// eleven real tool links resolving into one five-mode mini-workbench, and the
// two in-memory hand-offs (images → File Converter, icon draft → Icon Editor).
//
// Numbers in the test titles refer to the acceptance list in
// the homepage acceptance contract (retired to git history in #204 — this file
// IS the contract now; its unmet performance budgets moved to the
// homepage-field-metrics item in src/data/pipeline.js).
import { test, expect } from '@playwright/test'
import { watch, go } from './helpers.js'

const PERSONA = 'designer evaluating the workspace from the homepage'

const SATELLITES = [
  ['Palette', '/color/palette'],
  ['Semantic', '/color/semantic'],
  ['Tint', '/color/tint'],
  ['Gradient Generator', '/color/gradient'],
  ['Contrast', '/color/contrast'],
  ['Icon Library', '/icons'],
  ['File Converter', '/file-converter'],
  ['Aspect & Resolution', '/ratio'],
  ['Font Gallery', '/fontgallery'],
  ['Font Pair', '/fontpairs'],
  ['Type Scale', '/typescale'],
]

const TABS = ['Palette', 'Gradient', 'Image', 'Icon', 'Typography']

async function reducedMotion(page) {
  await page.addInitScript(() => {
    localStorage.setItem('vs-appearance', JSON.stringify({
      rounding: 'default', density: 'cozy', reducedMotion: true,
    }))
  })
}

const png = (name) => ({
  name,
  mimeType: 'image/png',
  // A 1×1 transparent PNG — real bytes, no encoding work.
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64',
  ),
})

const overflowOf = (page) => page.evaluate(
  () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
)

// Records every programmatic window.scrollTo so a test can prove HOW the page
// moved (instant vs smooth), not just where it ended up. Lenis owns the scroll
// when motion is on, so this only sees the app's own calls.
async function spyOnScrollTo(page) {
  await page.addInitScript(() => {
    window.__scrollCalls = []
    const native = window.scrollTo.bind(window)
    window.scrollTo = (...args) => {
      const opts = args[0]
      if (opts && typeof opts === 'object') {
        window.__scrollCalls.push({ top: opts.top || 0, behavior: opts.behavior || 'auto' })
      } else {
        window.__scrollCalls.push({ top: args[1] || 0, behavior: 'auto' })
      }
      return native(...args)
    }
  })
}

const scrollCalls = (page) => page.evaluate(() => window.__scrollCalls || [])

// Where the converter's queue region sits relative to the fixed PillNav and the
// viewport, plus what holds focus.
const converterView = (page) => page.evaluate(() => {
  const box = (sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { top: r.top, bottom: r.bottom, height: r.height }
  }
  const queue = document.querySelector('.fc-queue')
  return {
    scrollY: Math.round(window.scrollY),
    viewport: window.innerHeight,
    navBottom: document.querySelector('.pnav')?.getBoundingClientRect().bottom ?? 0,
    queue: box('.fc-queue'),
    card: box('.fc-card'),
    drop: box('.fc-drop'),
    focusedQueue: !!queue && document.activeElement === queue,
    focusLabel: document.activeElement?.getAttribute('aria-label') || null,
  }
})

// Drive the homepage Image panel's "Try your image" hand-off.
async function handOffImages(page, files) {
  await page.locator('.hw-tab[data-tab="image"]').click()
  await page.locator('.hw-body input[type="file"]').setInputFiles(files)
  await page.waitForURL('**/file-converter')
}

test.describe('homepage: eleven tools, five ways of working', () => {
  test.use({ reducedMotion: 'reduce' })

  test('1–4 · the promise, the eleven links and exactly five tabs', async ({ page }) => {
    await reducedMotion(page)
    watch(page, PERSONA)
    await go(page, '/')

    // 1 · both approved sentences survive.
    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toContainText('No more tab hoarding.')
    await expect(heading).toContainText('Build your UI system in one place.')

    // 2 · exactly eleven satellites, with the approved labels and stable routes.
    // A real href is what makes open-in-new-tab and copy-link behave.
    const links = page.locator('.hsat-link')
    await expect(links).toHaveCount(11)
    for (const [label, href] of SATELLITES) {
      const link = page.locator(`.hsat-link:has(.hsat-label:text-is("${label}"))`)
      await expect(link).toHaveCount(1)
      await expect(link).toHaveAttribute('href', href)
      await expect(link.locator('.hsat-icon svg')).toHaveCount(1)
    }

    // Source order is the reading order: copy, then links, then workbench.
    const order = await page.evaluate(() => {
      const pos = (sel) => {
        const el = document.querySelector(sel)
        return [...document.querySelectorAll('*')].indexOf(el)
      }
      return { copy: pos('.home-hero-core'), links: pos('.hsat'), bench: pos('.hw') }
    })
    expect(order.copy).toBeLessThan(order.links)
    expect(order.links).toBeLessThan(order.bench)

    // 3 · exactly five primary tabs, in the approved order.
    const tabs = page.locator('.hw-tab')
    await expect(tabs).toHaveCount(5)
    expect(await tabs.allInnerTexts()).toEqual(TABS)
    await expect(tabs.first()).toHaveAttribute('aria-selected', 'true')

    // 4 · the satellites that are NOT workbench modes never become tabs.
    for (const label of ['Semantic', 'Tint', 'Contrast', 'File Converter', 'Aspect & Resolution']) {
      await expect(page.locator('.hw-tab', { hasText: label })).toHaveCount(0)
    }
  })

  test('3 · the tablist follows the ARIA keyboard pattern', async ({ page }) => {
    await reducedMotion(page)
    watch(page, PERSONA)
    await go(page, '/')

    const tab = (name) => page.locator(`.hw-tab[data-tab="${name}"]`)
    await tab('palette').focus()
    // One roving tab stop: only the selected tab is reachable with Tab.
    expect(await page.locator('.hw-tab[tabindex="0"]').count()).toBe(1)

    await tab('palette').press('ArrowRight')
    await expect(tab('gradient')).toBeFocused()
    await expect(tab('gradient')).toHaveAttribute('aria-selected', 'true')

    await tab('gradient').press('End')
    await expect(tab('typography')).toBeFocused()
    await expect(tab('typography')).toHaveAttribute('aria-selected', 'true')

    await tab('typography').press('Home')
    await expect(tab('palette')).toBeFocused()
    await expect(tab('palette')).toHaveAttribute('aria-selected', 'true')

    await tab('palette').press('ArrowLeft')
    await expect(tab('typography')).toBeFocused()

    // Tab moves into the active panel; Shift+Tab comes back to the tab stop.
    await tab('icon').press('Home')
    await tab('palette').press('Tab')
    const insidePanel = await page.evaluate(
      () => !!document.querySelector('.hw-panel')?.contains(document.activeElement),
    )
    expect(insidePanel).toBe(true)
    await page.keyboard.press('Shift+Tab')
    await expect(tab('palette')).toBeFocused()
  })

  test('5 · a failed GSAP chunk leaves the hero, links and workbench usable', async ({ page }) => {
    // Motion enabled, then the motion chunks are blocked outright.
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.addInitScript(() => {
      localStorage.setItem('vs-appearance', JSON.stringify({
        rounding: 'default', density: 'cozy', reducedMotion: false,
      }))
    })
    await page.route(/\/assets\/(gsap|ScrollTrigger)-[^/]+\.js$/, (route) => route.abort())
    watch(page, 'visitor whose motion chunk never arrives')
    await go(page, '/')

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.locator('.hsat-link').first()).toBeVisible()
    await expect(page.locator('.hw-shell')).toBeVisible()
    await expect(page.locator('.hw-panel')).toBeVisible()

    // No stranded arming class, and no decorative proxy layer was ever built.
    await expect.poll(
      () => page.locator('.home.motion-armed').count(),
      { timeout: 8000 },
    ).toBe(0)
    await expect(page.locator('.hsat-proxy-layer')).toHaveCount(0)

    // Everything still operates.
    await page.locator('.hw-tab[data-tab="gradient"]').click()
    await expect(page.locator('.hw-grad-preview')).toBeVisible()
    await page.locator('.hsat-link').first().focus()
    await expect(page.locator('.hsat-link').first()).toBeFocused()
  })

  test('6 · reduced motion and ≤768px use the calm static arrangement', async ({ page }) => {
    await reducedMotion(page)
    watch(page, PERSONA)
    await go(page, '/')

    // Reduced motion: no proxies, no transform on any satellite.
    await expect(page.locator('.hsat-proxy-layer')).toHaveCount(0)
    const transforms = await page.locator('.hsat-item').evaluateAll(
      (items) => items.map((el) => getComputedStyle(el).transform),
    )
    expect(transforms.every((t) => t === 'none')).toBe(true)
    expect(await page.locator('.hsat').evaluate((el) => getComputedStyle(el).position)).toBe('static')

    await page.setViewportSize({ width: 768, height: 900 })
    await go(page, '/')
    expect(await page.locator('.hsat').evaluate((el) => getComputedStyle(el).position)).toBe('static')
    const narrowTransforms = await page.locator('.hsat-item').evaluateAll(
      (items) => items.map((el) => getComputedStyle(el).transform),
    )
    expect(narrowTransforms.every((t) => t === 'none')).toBe(true)
    expect(await overflowOf(page)).toBeLessThanOrEqual(1)
  })

  test('7 · holds from 320px to 4K with no overflow, collision or clipped label', async ({ page }) => {
    await reducedMotion(page)
    watch(page, PERSONA)

    for (const width of [320, 380, 480, 768, 980, 1440, 3840]) {
      await page.setViewportSize({ width, height: width < 700 ? 780 : 900 })
      await go(page, '/')
      await expect(page.locator('.hw-shell')).toBeVisible()

      expect(await overflowOf(page), `page overflow at ${width}px`).toBeLessThanOrEqual(1)

      const report = await page.evaluate(() => {
        const sats = [...document.querySelectorAll('.hsat-link')]
        const clipped = sats
          .filter((a) => a.scrollWidth > a.clientWidth + 1)
          .map((a) => a.textContent)
        const boxes = sats.map((a) => a.getBoundingClientRect())
        const collisions = []
        for (let i = 0; i < boxes.length; i++) {
          for (let j = i + 1; j < boxes.length; j++) {
            const a = boxes[i]; const b = boxes[j]
            const hit = !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top)
            if (hit) collisions.push([i, j])
          }
        }
        const small = sats.filter((a) => a.getBoundingClientRect().height < 40).length
        return { clipped, collisions, small, count: sats.length }
      })
      expect(report.count, `satellite count at ${width}px`).toBe(11)
      expect(report.clipped, `clipped labels at ${width}px`).toEqual([])
      expect(report.collisions, `satellite collisions at ${width}px`).toEqual([])
      expect(report.small, `under-sized touch targets at ${width}px`).toBe(0)

      // Every control in the default panel stays inside the viewport.
      const reachable = await page.evaluate(() => {
        const controls = [...document.querySelectorAll('.hw-panel button, .hw-panel a, .hw-panel select, .hw-panel input')]
        return controls
          .filter((el) => !el.classList.contains('sr-only'))
          .every((el) => {
            const r = el.getBoundingClientRect()
            return r.left >= -1 && r.right <= document.documentElement.clientWidth + 1
          })
      })
      expect(reachable, `unreachable control at ${width}px`).toBe(true)
    }
  })

  test('5–7 · the authored wide field stays clear of the copy, and its proxies are decorative only', async ({ page }) => {
    // Motion ON: this is the only path that renders the absolute satellite field
    // and the convergence proxies, so the reduced-motion sweep above cannot
    // cover it.
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.addInitScript(() => {
      localStorage.setItem('vs-appearance', JSON.stringify({
        rounding: 'default', density: 'cozy', reducedMotion: false,
      }))
    })
    watch(page, 'motion-enabled product evaluator')

    for (const width of [1440, 3840]) {
      await page.setViewportSize({ width, height: 900 })
      await go(page, '/')
      await expect(page.locator('.hw-shell')).toBeVisible()
      // Wait for the enhancement to arm, then measure the resting layout.
      await expect.poll(() => page.locator('.hsat-proxy').count(), { timeout: 10000 }).toBe(11)

      const report = await page.evaluate(() => {
        // Neutralise the idle drift so we measure authored positions, then add a
        // safety margin at least as large as the drift itself.
        const items = [...document.querySelectorAll('.hsat-item')]
        const saved = items.map((el) => el.style.transform)
        items.forEach((el) => { el.style.transform = 'none' })
        const box = (el) => {
          const r = el.getBoundingClientRect()
          return [r.left, r.top, r.right, r.bottom]
        }
        const textBox = (el) => {
          const range = document.createRange()
          range.selectNodeContents(el)
          const r = range.getBoundingClientRect()
          return [r.left, r.top, r.right, r.bottom]
        }
        const copy = [
          ...[...document.querySelectorAll('.home-hero-cta .ui-pill')].map(box),
          textBox(document.querySelector('.home-hero-hint')),
          textBox(document.querySelector('.home-hero-kicker')),
        ]
        const sats = [...document.querySelectorAll('.hsat-link')].map(box)
        const MARGIN = 14
        const hit = (a, b) => !(
          a[2] + MARGIN < b[0] || b[2] + MARGIN < a[0] || a[3] + MARGIN < b[1] || b[3] + MARGIN < a[1]
        )
        const collisions = []
        for (const c of copy) for (const s of sats) if (hit(c, s)) collisions.push(['copy', c, s])
        for (let i = 0; i < sats.length; i++) {
          for (let j = i + 1; j < sats.length; j++) if (hit(sats[i], sats[j])) collisions.push(['satellite', i, j])
        }
        const inside = sats.every((s) => s[0] >= 0 && s[2] <= document.documentElement.clientWidth)
        items.forEach((el, i) => { el.style.transform = saved[i] })

        const layer = document.querySelector('.hsat-proxy-layer')
        return {
          collisions,
          inside,
          layerHidden: layer?.getAttribute('aria-hidden'),
          focusableInLayer: layer?.querySelectorAll('a,button,input,select,textarea,[tabindex]').length,
          position: getComputedStyle(document.querySelector('.hsat')).position,
        }
      })

      expect(report.position, `authored field at ${width}px`).toBe('absolute')
      expect(report.collisions, `collisions at ${width}px`).toEqual([])
      expect(report.inside, `a satellite left the viewport at ${width}px`).toBe(true)
      // Decorative proxies are announced to nobody and reachable by nobody.
      expect(report.layerHidden).toBe('true')
      expect(report.focusableInLayer).toBe(0)
      expect(await overflowOf(page)).toBeLessThanOrEqual(1)

      if (width === 1440) {
        await page.locator('.hw-shell').scrollIntoViewIfNeeded()
        await expect.poll(
          () => page.locator('.home[data-home-converge="converged"]').count(),
          { timeout: 10000 },
        ).toBe(1)
        await expect(page.locator('.hw-shell')).toHaveCSS('animation-name', 'hw-shell-arrive')
        await expect(page.locator('.hw-splash')).toHaveCSS('animation-name', 'hw-splash')
      }
    }
  })

  test('typography mode previews real scale maths and hands the draft to Type Scale', async ({ page }) => {
    await reducedMotion(page)
    watch(page, 'designer beginning a typography system on the homepage')
    await page.addInitScript(() => {
      localStorage.setItem('vs-current-design', JSON.stringify({
        fonts: {
          heading: { family: 'Merriweather', weight: 700, category: 'serif' },
          body: { family: 'Lora', weight: 400, category: 'serif' },
        },
        typeScale: {
          base: 15,
          ratio: 1.2,
          lineHeight: 1.5,
          headingSpacing: 0,
          bodySpacing: 0,
        },
      }))
    })
    await go(page, '/')

    await page.locator('.hw-tab[data-tab="typography"]').click()
    await expect(page.locator('.hw-type-row')).toHaveCount(4)
    await expect(page.locator('.hw-panel').getByRole('link', { name: /Font Gallery/ })).toHaveAttribute('href', '/fontgallery')
    await expect(page.locator('.hw-panel').getByRole('link', { name: /Font Pair/ })).toHaveAttribute('href', '/fontpairs')

    // Real key entry must allow the native number input to become empty while
    // replacing its value; the committed draft is validated on blur.
    const baseInput = page.getByLabel('Base size')
    await baseInput.focus()
    await page.keyboard.press('Control+A')
    await page.keyboard.press('Backspace')
    await expect(baseInput).toHaveValue('')
    await page.keyboard.type('20')
    await page.keyboard.press('Tab')
    await expect(baseInput).toHaveValue('20')
    await page.getByLabel('Scale ratio').selectOption('1.333')
    await page.getByLabel('Preview text').fill('Systems need typographic rhythm')
    await expect(page.locator('.hw-type-row').first()).toContainText('47.4px')
    await expect(page.locator('.hw-type-sample')).toHaveText([
      'Systems need typographic rhythm',
      'Systems need typographic rhythm',
      'Systems need typographic rhythm',
      'Systems need typographic rhythm',
    ])

    // Session state survives mode changes.
    await page.locator('.hw-tab[data-tab="palette"]').click()
    await page.locator('.hw-tab[data-tab="typography"]').click()
    await expect(page.getByLabel('Base size')).toHaveValue('20')

    await page.getByRole('button', { name: /Continue in Type Scale/ }).click()
    await page.waitForURL('**/typescale')
    await expect(page.locator('.tsc-status')).toContainText('20px')
    await expect(page.locator('.tsc-status')).toContainText('1.333')
    // The homepage carries scale maths only: saved family choices survive.
    await expect(page.getByLabel('Heading family', { exact: true })).toHaveValue('Merriweather')
    await expect(page.getByLabel('Body family', { exact: true })).toHaveValue('Lora')
  })

  test('8 · palette and gradient produce real values with honest states', async ({ page }) => {
    await reducedMotion(page)
    watch(page, PERSONA)
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
    await go(page, '/')

    // Palette: real generated hex values, locking, and copy that reports truth.
    const hexes = page.locator('.hw-pal-hex')
    await expect(hexes).toHaveCount(5)
    const before = await hexes.allInnerTexts()
    expect(before.every((h) => /^#[0-9A-F]{6}$/.test(h))).toBe(true)

    await page.locator('.hw-pal-lock').first().click()
    await expect(page.locator('.hw-pal-lock').first()).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('button', { name: 'Generate' }).click()
    const after = await hexes.allInnerTexts()
    expect(after[0], 'a locked colour survives generate').toBe(before[0])
    expect(after.slice(1).join()).not.toBe(before.slice(1).join())

    // Copy announces success without renaming the swatch's control.
    const copyButton = page.locator('.hw-pal-copy').first()
    const name = await copyButton.getAttribute('aria-label')
    await copyButton.click()
    await expect(copyButton).toHaveAttribute('aria-label', name)
    await expect(page.locator('.hw-shell [role="status"]')).toContainText(after[0])
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(after[0])

    // Gradient: editable stops, a real CSS value, and copy.
    await page.locator('.hw-tab[data-tab="gradient"]').click()
    const startHex = page.locator('#hw-grad-from')
    await startHex.fill('#FF0000')
    await expect(page.locator('.hw-code')).toContainText('#FF0000')
    await page.locator('#hw-grad-angle').fill('90')
    await expect(page.locator('.hw-code')).toContainText('linear-gradient(90deg')

    // Invalid input keeps the last valid preview and explains the correction.
    await startHex.fill('not-a-colour')
    await expect(page.locator('.hw-field-err')).toContainText('#FF0000')
    await expect(page.locator('.hw-code')).toContainText('#FF0000')

    await page.getByRole('button', { name: 'Copy CSS' }).click()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('linear-gradient(90deg')
  })

  test('9 · the three references and the 4K · WebP · Lossless output intent', async ({ page }) => {
    await reducedMotion(page)
    watch(page, PERSONA)
    await go(page, '/')
    await page.locator('.hw-tab[data-tab="image"]').click()

    const subtabs = page.locator('.hw-subtab')
    await expect(subtabs).toHaveCount(3)
    expect(await subtabs.allInnerTexts()).toEqual(['Architecture', 'People', 'Nature'])
    await expect(subtabs.first()).toHaveAttribute('aria-selected', 'true')

    // First entry: the approved default intent, stated as an intent.
    await expect(page.locator('.hw-intent')).toContainText('4K · WebP · Lossless')
    await expect(page.locator('.hw-intent')).toContainText('Nothing is converted here')
    // WebP cannot honour Lossless in the real converter, and says so up front.
    await expect(page.locator('.hw-limit')).toContainText('cannot store a')

    // The bundled thumbnail carries its intrinsic size, so nothing shifts.
    const active = page.locator('.hw-ref-img:not([hidden])')
    await expect(active).toHaveAttribute('width', '880')
    await expect(active).toHaveAttribute('height', '495')
    await expect(active).toHaveAttribute('alt', /.{20,}/)

    // Changing a reference does not discard edited output choices.
    await page.locator('#hw-img-fmt').selectOption('image/png')
    await page.locator('#hw-img-res').selectOption('2k')
    await subtabs.nth(2).click()
    await expect(subtabs.nth(2)).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator('.hw-intent')).toContainText('2K · PNG · Lossless')
    await expect(page.locator('.hw-limit')).toHaveCount(0)

    // Switching primary tabs preserves the session's edits.
    await page.locator('.hw-tab[data-tab="palette"]').click()
    await page.locator('.hw-tab[data-tab="image"]').click()
    await expect(page.locator('.hw-intent')).toContainText('2K · PNG · Lossless')
    await expect(subtabs.nth(2)).toHaveAttribute('aria-selected', 'true')

    // Sub-tab keyboard pattern.
    await subtabs.nth(2).press('Home')
    await expect(subtabs.first()).toBeFocused()
    await expect(subtabs.first()).toHaveAttribute('aria-selected', 'true')

    // Reset returns Architecture and the default intent.
    await page.getByRole('button', { name: 'Reset' }).click()
    await expect(subtabs.first()).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator('.hw-intent')).toContainText('4K · WebP · Lossless')
  })

  test('10 · Try your image raises the picker synchronously; cancel changes nothing', async ({ page }) => {
    await reducedMotion(page)
    watch(page, PERSONA)
    await go(page, '/')
    await page.locator('.hw-tab[data-tab="image"]').click()
    await page.locator('#hw-img-fmt').selectOption('image/png')

    const button = page.getByRole('button', { name: 'Try your image' })

    // Pointer activation.
    const byClick = page.waitForEvent('filechooser', { timeout: 3000 })
    await button.click()
    const chooser = await byClick
    expect(chooser.isMultiple(), 'the converter accepts a batch').toBe(true)

    // Keyboard activation raises it from the same trusted handler.
    const byKeyboard = page.waitForEvent('filechooser', { timeout: 3000 })
    await button.focus()
    await button.press('Enter')
    await byKeyboard

    // Cancelling produces no route change, no error and no draft change.
    expect(new URL(page.url()).pathname).toBe('/')
    await expect(page.locator('.hw-tab[data-tab="image"]')).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator('.hw-intent')).toContainText('4K · PNG · Lossless')
    await expect(page.locator('.hw-alert')).toHaveCount(0)
  })

  test('11–12 · the image hand-off transfers once and never resurrects', async ({ page }) => {
    await reducedMotion(page)
    watch(page, PERSONA)
    await go(page, '/')
    await page.locator('.hw-tab[data-tab="image"]').click()
    await page.locator('#hw-img-fmt').selectOption('image/png')
    await page.locator('#hw-img-res').selectOption('2k')

    await page.locator('.hw-body input[type="file"]').setInputFiles([png('one.png'), png('two.png')])

    // 11 · the converter receives both files and the draft, exactly once.
    await page.waitForURL('**/file-converter')
    await expect(page.locator('.fc-card')).toHaveCount(2)
    const note = page.locator('.fc-draft-note')
    await expect(note).toContainText('PNG')
    await expect(note).toContainText('1920 px')
    await expect(page.locator('select').first()).toHaveValue('image/png')

    // Nothing about the files reached the URL or web storage.
    expect(page.url()).not.toContain('one.png')
    const leaked = await page.evaluate(() => {
      const all = [
        ...Object.entries(localStorage).map(([k, v]) => `${k}=${v}`),
        ...Object.entries(sessionStorage).map(([k, v]) => `${k}=${v}`),
      ].join('|')
      return /one\.png|two\.png/.test(all)
    })
    expect(leaked, 'filenames must never reach web storage').toBe(false)

    // 12 · a second visit / remount does not import them again.
    await page.goBack()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await page.goForward()
    await expect(page.locator('.fc-drop')).toBeVisible()
    await expect(page.locator('.fc-card')).toHaveCount(0)
    await expect(page.locator('.fc-draft-note')).toHaveCount(0)
  })

  test('12 · a direct or reloaded File Converter opens no picker and holds no stale file', async ({ page }) => {
    watch(page, 'visitor arriving at the converter directly')
    let choosers = 0
    page.on('filechooser', () => { choosers += 1 })

    await go(page, '/file-converter')
    await expect(page.locator('.fc-drop')).toBeVisible()
    await expect(page.locator('.fc-card')).toHaveCount(0)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.locator('.fc-drop')).toBeVisible()
    await expect(page.locator('.fc-card')).toHaveCount(0)
    expect(choosers, 'no picker may open on mount').toBe(0)

    // A fresh activation still opens it.
    const opened = page.waitForEvent('filechooser', { timeout: 3000 })
    await page.locator('.fc-drop').click()
    await opened
    expect(choosers).toBe(1)
  })

  test('13 · an unsupported selection stays home with a recovery path', async ({ page }) => {
    await reducedMotion(page)
    watch(page, PERSONA)
    await go(page, '/')
    await page.locator('.hw-tab[data-tab="image"]').click()

    await page.locator('.hw-body input[type="file"]').setInputFiles({
      name: 'brief.pdf', mimeType: 'application/pdf', buffer: Buffer.from('not an image'),
    })

    expect(new URL(page.url()).pathname).toBe('/')
    const alert = page.getByRole('alert')
    await expect(alert).toContainText('not images')
    await expect(alert.getByRole('button', { name: 'Choose images again' })).toBeVisible()
    // The draft survived the rejection.
    await expect(page.locator('.hw-intent')).toContainText('4K · WebP · Lossless')

    // One accepted selection produces exactly one transfer.
    await page.locator('.hw-body input[type="file"]').setInputFiles([png('ok.png')])
    await page.waitForURL('**/file-converter')
    await expect(page.locator('.fc-card')).toHaveCount(1)
  })

  test('14–15 · the icon preview is local-only and opens the real editor', async ({ page }) => {
    await reducedMotion(page)
    watch(page, PERSONA)
    await go(page, '/')
    await page.locator('.hw-tab[data-tab="icon"]').click()

    const snapshot = () => page.evaluate(() => JSON.stringify(Object.entries(localStorage).sort()))
    const before = await snapshot()

    // 14 · controls mutate the preview and nothing else.
    await page.getByRole('button', { name: /Preview the zap icon/ }).click()
    await page.locator('#hw-icon-size').selectOption('32')
    await page.locator('#hw-icon-stroke').selectOption('2')
    await expect(page.locator('.hw-icon-meta')).toContainText('zap · 32px · 2 stroke')
    await expect(page.locator('.hw-icon-preview svg')).toHaveAttribute('width', '32')
    expect(await snapshot(), 'no storage, recents or quota write').toBe(before)

    // 15 · a valid draft opens the real editor with the supported values.
    await page.getByRole('button', { name: /Continue in Icon Editor/ }).click()
    await page.waitForURL('**/icons')
    const customiser = page.locator('.icust, .ig-custom, [class*="icust"]').first()
    await expect(customiser).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('zap', { exact: false }).first()).toBeVisible()

    // A reloaded editor route falls back to the normal state — the ephemeral
    // draft is gone and grants nothing.
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.locator('.ic').first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('.icust').first()).toHaveCount(0)
  })

  test('15 · a direct Icon Library visit never inherits a draft', async ({ page }) => {
    watch(page, 'visitor arriving at the editor directly')
    await go(page, '/icons')
    await expect(page.locator('.ic').first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('.icust')).toHaveCount(0)
  })

  test('11a · a hand-off lands looking at the uploaded images, not the drop zone', async ({ page }) => {
    // Motion ON: this is the smooth-scroll path (Lenis owns the position), which
    // the reduced-motion tests below cannot exercise.
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.addInitScript(() => {
      localStorage.setItem('vs-appearance', JSON.stringify({
        rounding: 'default', density: 'cozy', reducedMotion: false,
      }))
    })
    watch(page, PERSONA)
    await go(page, '/')
    await handOffImages(page, [png('one.png'), png('two.png')])
    await expect(page.locator('.fc-card')).toHaveCount(2)

    // The viewport actually moved off the top, and settled.
    await expect.poll(
      async () => (await converterView(page)).scrollY,
      { timeout: 10000 },
    ).toBeGreaterThan(0)
    let view = await converterView(page)
    await expect.poll(async () => {
      const next = await converterView(page)
      const settled = next.scrollY === view.scrollY
      view = next
      return settled
    }, { timeout: 10000 }).toBe(true)

    // The heading of the region is clear of the fixed bar, not under it.
    expect(view.queue.top, 'queue hidden beneath the sticky nav').toBeGreaterThanOrEqual(view.navBottom - 1)
    // And the first uploaded image is fully on screen.
    expect(view.card.top).toBeGreaterThanOrEqual(view.navBottom - 1)
    expect(view.card.bottom).toBeLessThanOrEqual(view.viewport)

    // Assistive tech is told where the viewport went: focus is on the named region.
    expect(view.focusedQueue, 'focus did not move to the queue region').toBe(true)
    expect(view.focusLabel).toContain('2 images')

    // The drop zone is still there, above, and still reachable for more files.
    expect(view.drop.height).toBeGreaterThan(0)
    await page.locator('.fc-drop').scrollIntoViewIfNeeded()
    const back = await converterView(page)
    expect(back.drop.bottom).toBeGreaterThan(back.navBottom)
    expect(back.drop.top).toBeLessThanOrEqual(back.viewport)
  })

  test('11b · reduced motion jumps instantly, and never smooth-scrolls', async ({ page }) => {
    await reducedMotion(page)
    await spyOnScrollTo(page)
    watch(page, 'visitor who asked the OS to reduce motion')
    await go(page, '/')
    await handOffImages(page, [png('one.png')])
    await expect(page.locator('.fc-card')).toHaveCount(1)

    await expect.poll(async () => (await converterView(page)).scrollY, { timeout: 5000 }).toBeGreaterThan(0)
    const calls = await scrollCalls(page)
    // Reduced motion never instantiates Lenis, so the reveal goes through
    // window.scrollTo — and must ask for an instant jump.
    expect(calls.every((c) => c.behavior !== 'smooth'), JSON.stringify(calls)).toBe(true)
    const reveal = calls.filter((c) => c.top > 0)
    expect(reveal.length, 'exactly one reveal scroll').toBe(1)
    expect(reveal[0].behavior).toBe('auto')

    const view = await converterView(page)
    expect(view.queue.top).toBeGreaterThanOrEqual(view.navBottom - 1)
    expect(view.card.bottom).toBeLessThanOrEqual(view.viewport)
  })

  test('11c · a direct visit and a manual upload never move the viewport', async ({ page }) => {
    await reducedMotion(page)
    await spyOnScrollTo(page)
    watch(page, 'visitor arriving at the converter directly')

    await go(page, '/file-converter')
    await expect(page.locator('.fc-drop')).toBeVisible()
    expect((await converterView(page)).scrollY, 'a direct visit auto-scrolled').toBe(0)

    // Uploading by hand is the visitor's own action, at the drop zone they are
    // already looking at — it must not yank the page anywhere.
    await page.locator('.fc-drop input[type="file"]').setInputFiles([png('one.png'), png('two.png')])
    await expect(page.locator('.fc-card')).toHaveCount(2)
    // Longer than the reveal's own frame budget, so a late scroll would be caught.
    await page.waitForTimeout(800)
    expect((await converterView(page)).scrollY, 'a manual upload scrolled').toBe(0)
    expect((await scrollCalls(page)).filter((c) => c.top > 0), 'a manual upload scrolled').toEqual([])
  })

  test('16 · offline: no catalogue or remote image calls, and every panel still works', async ({ page }) => {
    await reducedMotion(page)
    watch(page, 'designer working on a train')

    const remote = []
    page.on('request', (request) => {
      const url = request.url()
      const hostname = url.startsWith('http') ? new URL(url).hostname : ''
      if (hostname !== 'localhost' && hostname !== '127.0.0.1' && !url.startsWith('data:') && !url.startsWith('blob:')) {
        remote.push(url)
      }
    })

    await go(page, '/')
    // Visit every panel and every reference while online-ish.
    for (const id of ['gradient', 'image', 'icon', 'typography']) {
      await page.locator(`.hw-tab[data-tab="${id}"]`).click()
    }
    await page.locator('.hw-tab[data-tab="image"]').click()
    for (const index of [1, 2, 0]) await page.locator('.hw-subtab').nth(index).click()

    expect(remote.filter((u) => /iconify|logo\.dev|logodev/i.test(u)),
      'the homepage never calls an icon or logo catalogue').toEqual([])
    expect(remote.filter((u) => /\.(png|jpe?g|webp|avif|gif)(\?|$)/i.test(u)),
      'reference images are bundled, never fetched from a CDN').toEqual([])

    // Now genuinely offline: the local panels keep working.
    await page.context().setOffline(true)
    await page.locator('.hw-tab[data-tab="palette"]').click()
    await page.getByRole('button', { name: 'Generate' }).click()
    await expect(page.locator('.hw-pal-hex').first()).toHaveText(/^#[0-9A-F]{6}$/)

    await page.locator('.hw-tab[data-tab="gradient"]').click()
    await page.locator('#hw-grad-angle').fill('45')
    await expect(page.locator('.hw-code')).toContainText('linear-gradient(45deg')

    await page.locator('.hw-tab[data-tab="icon"]').click()
    await page.getByRole('button', { name: /Preview the star icon/ }).click()
    await expect(page.locator('.hw-icon-meta')).toContainText('star')

    await page.locator('.hw-tab[data-tab="image"]').click()
    await expect(page.locator('.hw-intent')).toBeVisible()

    await page.locator('.hw-tab[data-tab="typography"]').click()
    await page.getByLabel('Base size').fill('18')
    await expect(page.locator('.hw-type-row').first()).toContainText('35.2px')
    await page.context().setOffline(false)
  })
})
