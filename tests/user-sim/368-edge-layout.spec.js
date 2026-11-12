// THE EDGE PAGES' LAYOUT AND COLOUR: the 404, maintenance, a reset link that no
// longer works, a project that is not in the account, and the two error cards.
//
// They share one layout (EdgeScreen), which runs edge to edge out of the app's
// page column and clips its own horizontal overflow. This checks what a person
// would see go wrong without a word on the page changing:
//
//   - the page cannot be scrolled sideways, at a phone width and a desktop width,
//     even when something inside the layout is wider than the window
//   - the layout really does reach both edges of the window
//   - the page's soft greys and hairlines resolve to the page ink at the
//     intended strength, in light and in dark (a token that falls back to
//     nothing draws as transparent or black)
//
// ── MUTATION ────────────────────────────────────────────────────────────────
// In v3-edge.css remove `overflow-x: clip` from `.ed`, or change its width to
// 100%: the sideways-scroll and edge-to-edge tests fail. Change `--ed-hair` back
// to a value that does not resolve (`rgba(var(--ink), .1)`): the colour test
// fails on every surface.
import { test, expect } from './base.js'
import { go, goRaw, signIn, watch } from './helpers.js'
import { landChromelessCrash, landLoadFailed, setConnection } from './edge-cards.js'

const SURFACES = [
  {
    name: 'the 404',
    land: async (page) => {
      await goRaw(page, '/plan-s')
      await expect(page.getByRole('heading', { level: 1, name: 'That page doesn’t exist' })).toBeVisible()
    },
  },
  {
    name: 'maintenance',
    land: async (page) => {
      await page.addInitScript(() => window.sessionStorage.setItem('uil4b-maintenance', 'on'))
      await goRaw(page, '/plans')
      await expect(page.getByRole('button', { name: 'Check again' })).toBeVisible()
    },
  },
  {
    name: 'the expired reset link',
    land: async (page) => {
      await goRaw(page, '/reset-password')
      await expect(page.getByRole('button', { name: 'Reset your password' })).toBeVisible()
    },
  },
  {
    name: 'the project-missing page',
    land: async (page) => {
      await signIn(page, { plan: 'free', projects: [] })
      await go(page, '/projects/not-a-project')
      await expect(page.getByRole('heading', { level: 1, name: 'That project isn’t in your account' })).toBeVisible()
    },
  },
  {
    name: 'the crash card',
    land: async (page) => { await landChromelessCrash(page) },
  },
  {
    name: 'the load-failed card',
    land: async (page) => { await landLoadFailed(page) },
  },
]

// Hand-checked from global.css (--ink-rgb, --page-rgb) and v3-edge.css, not
// worked out from the stylesheet at run time.
const EXPECTED = {
  light: {
    '--ed-ink': 'rgb(18, 20, 24)',
    '--ed-on': 'rgb(245, 245, 242)',
    '--ed-2': 'rgba(18, 20, 24, 0.72)',
    '--ed-3': 'rgba(18, 20, 24, 0.62)',
    '--ed-hair': 'rgba(18, 20, 24, 0.1)',
    '--ed-hl20': 'rgba(18, 20, 24, 0.2)',
    '--ed-l2': 'rgba(18, 20, 24, 0.06)',
    '--ed-hover': 'rgba(18, 20, 24, 0.86)',
  },
  dark: {
    '--ed-ink': 'rgb(239, 238, 234)',
    '--ed-on': 'rgb(6, 6, 7)',
    '--ed-2': 'rgba(239, 238, 234, 0.68)',
    '--ed-3': 'rgba(239, 238, 234, 0.56)',
    '--ed-hair': 'rgba(239, 238, 234, 0.1)',
    '--ed-hl20': 'rgba(239, 238, 234, 0.2)',
    '--ed-l2': 'rgba(239, 238, 234, 0.06)',
    '--ed-hover': 'rgba(239, 238, 234, 0.86)',
  },
}

for (const [scheme, schemeLabel] of [['light', 'light'], ['dark', 'dark']]) {
  for (const [label, size] of [['1440', { width: 1440, height: 900 }], ['390', { width: 390, height: 844 }]]) {
    for (const surface of SURFACES) {
      test.describe(`${surface.name} at ${label}, ${schemeLabel}`, () => {
        test.use({ viewport: size, colorScheme: scheme })

        test('cannot be scrolled sideways, even by something wider than the window, and reaches both edges', async ({ page }) => {
          watch(page, 'a visitor on an edge page')
          await surface.land(page)
          await expect(page.locator('html')).toHaveAttribute('data-theme', scheme)
          await expect(page.locator('.ed').first()).toBeVisible()

          // Something inside the layout wider than the window (a tall horizon
          // image, a long line) must be clipped there, not become a sideways scroll.
          const measured = await page.evaluate(() => {
            const root = document.documentElement
            const edge = document.querySelector('.ed')
            const box = edge.getBoundingClientRect()
            const before = { left: box.left, right: box.right, clientWidth: root.clientWidth }
            const wide = document.createElement('div')
            wide.setAttribute('data-probe', 'wide')
            wide.style.cssText = 'width: 3000px; height: 1px'
            edge.appendChild(wide)
            window.scrollTo(2000, 0)
            const after = {
              scrollX: window.scrollX,
              scrollWidth: root.scrollWidth,
              bodyScrollWidth: document.body.scrollWidth,
            }
            wide.remove()
            return { ...before, ...after }
          })
          expect(Math.abs(measured.left), 'the layout does not start at the left edge').toBeLessThanOrEqual(1)
          expect(measured.right, 'the layout does not reach the right edge').toBeGreaterThanOrEqual(measured.clientWidth - 1)
          expect(measured.scrollX, 'the page moved sideways').toBe(0)
          expect(measured.scrollWidth, 'the document is wider than the window').toBeLessThanOrEqual(measured.clientWidth)
          expect(measured.bodyScrollWidth, 'the body is wider than the window').toBeLessThanOrEqual(measured.clientWidth)
        })

        test('its greys and hairlines resolve to the page ink at the intended strength', async ({ page }) => {
          watch(page, 'a visitor on an edge page')
          await surface.land(page)
          await expect(page.locator('.ed').first()).toBeVisible()

          const tokens = Object.keys(EXPECTED[scheme])
          const resolved = await page.evaluate((names) => {
            const host = document.querySelector('.ed')
            const probe = document.createElement('span')
            host.appendChild(probe)
            const out = {}
            for (const name of names) {
              probe.style.color = 'rgba(255, 0, 255, 1)'
              probe.style.color = `var(${name})`
              out[name] = getComputedStyle(probe).color
            }
            probe.remove()
            return out
          }, tokens)
          expect(resolved).toEqual(EXPECTED[scheme])
        })
      })
    }
  }
}

// THE OUTER CRASH CARD UNDER THE NOTICE STRIP. A route with no app shell has no
// nav above its card, and the offline banner is fixed over the top of the page.
// While the strip shows, the card's heading must start below it (the root carries
// data-notice for as long as the strip has height); with no strip the heading
// stays where the layout puts it: 112px at desktop, 80 at tablet, 48 at phone.
// Mutation: drop the `html[data-notice] .error-boundary--outer .ed-ground` rule
// from v3-edge.css, or stop NoticeStack setting data-notice: the banner covers
// the heading and every case here fails.
const HEADING_TOP = [
  ['1440', { width: 1440, height: 900 }, 112],
  ['768', { width: 768, height: 1024 }, 80],
  ['390', { width: 390, height: 844 }, 48],
]

for (const scheme of ['light', 'dark']) {
  for (const [label, size, restingTop] of HEADING_TOP) {
    test.describe(`the crash card under the offline banner at ${label}, ${scheme}`, () => {
      test.use({ viewport: size, colorScheme: scheme })

      test('starts below the banner while offline, and returns to its own top when back online', async ({ page, context }) => {
        watch(page, 'a visitor whose page crashed as the connection dropped')
        await landChromelessCrash(page)
        const h1 = page.locator('.error-boundary h1')
        const top = () => h1.evaluate((el) => el.getBoundingClientRect().top)
        await expect(page.locator('html')).toHaveAttribute('data-theme', scheme)
        await expect(page.locator('html'), 'no strip, no marker').not.toHaveAttribute('data-notice', /.*/)
        expect(await top(), 'the heading top with no strip').toBeCloseTo(restingTop, 0)

        await setConnection(page, context, false)
        await expect(page.locator('.offline-banner')).toBeVisible()
        await expect(page.locator('html'), 'the strip has height, so the root says so').toHaveAttribute('data-notice', '')
        await expect.poll(async () => {
          const strip = await page.locator('.notice-stack').evaluate((el) => el.getBoundingClientRect().bottom)
          return (await top()) - strip
        }, { message: 'the heading starts above the bottom of the offline banner' }).toBeGreaterThanOrEqual(0)

        await setConnection(page, context, true)
        await expect(page.locator('.offline-banner')).toHaveCount(0)
        await expect(page.locator('html'), 'the marker leaves with the strip').not.toHaveAttribute('data-notice', /.*/)
        await expect.poll(top, { message: 'the heading did not return to its resting top' }).toBeCloseTo(restingTop, 0)
      })
    })
  }
}
