// Where the home converter preview sends a visitor, and the marketing pages' layout at
// the widths people use.
//
//   · /create/file-converter?mode=animation|video|frames opens that tab; an unknown,
//     empty or wrong-case mode opens Image, and a mode asked for twice is read once
//   · no sideways scroll at 320, 390, 768, 1200 and 1440 on /, /tools and /mobile
//   · /tools: hex labels read across, the nine-step card is three by three under 1200
//     and the hero ramp stacks at 374 and under; a row's picture is 72px wide at 320 and
//     112px at 390
//   · /mobile: the gap from the button to the phones is 64px from 768, 56 at 390, 48 at 320
//
// The light and dark captures on /mobile (one drawn, with its description) are held by
// 99-mobile-page.spec.js.
//
// MUTATIONS (each turns a test red):
//   - change an id in MODES in FileConverter.jsx, or read ?mode= with toLowerCase -> deep links
//   - stop the .mk-lead-card .mk-ramp three-column rule at 1199 -> the 3x3 test
//   - set .mk-phones margin-top back to 40px -> the gap test
import { test, expect } from './base.js'
import { go, watch, homeSectionsLoaded } from './helpers.js'

const PERSONA = 'a visitor arriving from the marketing pages'

test.describe('File Converter ?mode= deep links', () => {
  const TABS = [
    ['animation', 'Animation'],
    ['video', 'Video'],
    ['frames', 'Extract frames'],
  ]
  const selected = (page) => page.locator('[role="tab"][aria-selected="true"]')

  for (const [id, label] of TABS) {
    test(`?mode=${id} opens the ${label} tab`, async ({ page }) => {
      watch(page, PERSONA)
      await go(page, `/create/file-converter?mode=${id}`)
      // Mutation: ignore the query in FileConverter.jsx -> Image stays selected.
      await expect(page.locator(`#fc-tab-${id}`)).toHaveAttribute('aria-selected', 'true')
      await expect(selected(page)).toHaveCount(1)
      await expect(selected(page)).toHaveText(label)
      await expect(page.locator(`#fc-panel-${id}`)).toBeVisible()
    })
  }

  test('no mode opens Image', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/create/file-converter')
    await expect(page.locator('#fc-tab-image')).toHaveAttribute('aria-selected', 'true')
    await expect(selected(page)).toHaveCount(1)
  })

  for (const bad of ['bogus', '', 'VIDEO', 'Animation', 'frames%20', 'image%2Fvideo']) {
    test(`?mode=${bad} falls back to Image`, async ({ page }) => {
      watch(page, PERSONA)
      await go(page, `/create/file-converter?mode=${bad}`)
      // Mutation: lower-case the asked mode before matching -> VIDEO and Animation open another tab.
      await expect(page.locator('#fc-tab-image')).toHaveAttribute('aria-selected', 'true')
      await expect(selected(page)).toHaveCount(1)
      await expect(page.getByText('Page not found')).toHaveCount(0)
    })
  }

  test('the tab is only picked on arrival: choosing another tab afterwards sticks', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/create/file-converter?mode=video')
    await expect(page.locator('#fc-tab-video')).toHaveAttribute('aria-selected', 'true')
    await page.locator('#fc-tab-image').click()
    await expect(page.locator('#fc-tab-image')).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator('#fc-tab-video')).toHaveAttribute('aria-selected', 'false')
  })

  test('the home preview link for each tab lands on that tab', async ({ page }) => {
    watch(page, PERSONA)
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/')
    await page.locator('#try').scrollIntoViewIfNeeded()
    await page.locator('#ht-n-3').click()
    const stage = page.locator('#ht-s-3')
    await expect(stage).toBeInViewport()
    await stage.getByRole('tab', { name: 'Video' }).click()
    await stage.locator('.ht-go').click()
    await expect(page).toHaveURL(/\/create\/file-converter\?mode=video$/)
    await expect(page.locator('#fc-tab-video')).toHaveAttribute('aria-selected', 'true')
  })
})

test.describe('no sideways scroll on the marketing pages', () => {
  const sideways = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  for (const width of [320, 390, 768, 1200, 1440]) {
    for (const route of ['/', '/tools', '/mobile']) {
      test(`${route} at ${width}px`, async ({ page }) => {
        watch(page, PERSONA)
        await page.setViewportSize({ width, height: width < 700 ? 844 : 900 })
        await go(page, route)
        if (route === '/') await homeSectionsLoaded(page)
        // Positive control: the page's own heading is drawn before the measure means anything.
        await expect(page.locator('h1').first()).toBeVisible()
        const over = await sideways(page)
        expect(over, `${route} at ${width}px scrolls sideways by ${over}px`).toBeLessThanOrEqual(0)
      })
    }
  }
})

test.describe('/tools layout', () => {
  test('hex labels read across, never turned on their side', async ({ page }) => {
    watch(page, PERSONA)
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/tools')
    const labels = await page.locator('.mk-ramp li span').evaluateAll((els) => els.map((el) => {
      const r = el.getBoundingClientRect()
      return { mode: getComputedStyle(el).writingMode, w: r.width, h: r.height, text: el.textContent }
    }))
    expect(labels.length).toBeGreaterThan(5)
    for (const l of labels) {
      expect(l.mode, `${l.text} is written sideways`).toBe('horizontal-tb')
      expect(l.w, `${l.text} is taller than wide`).toBeGreaterThan(l.h)
    }
  })

  for (const [width, columns] of [[1440, 9], [1200, 9], [1199, 3], [768, 3], [390, 3]]) {
    test(`the nine-step card has ${columns} columns at ${width}px`, async ({ page }) => {
      watch(page, PERSONA)
      await page.setViewportSize({ width, height: 900 })
      await go(page, '/tools')
      const ramp = page.locator('.mk-lead-card .mk-ramp')
      await expect(ramp.locator('li')).toHaveCount(9)
      const cols = await ramp.evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length)
      // Mutation: drop the three-column rule at 1199 -> nine labels squeeze into a half-width card.
      expect(cols).toBe(columns)
      // Every label fits inside its swatch.
      const cut = await ramp.locator('li').evaluateAll((els) => els.filter((li) => li.querySelector('span').scrollWidth > li.clientWidth).length)
      expect(cut, 'a hex label is wider than its swatch').toBe(0)
    })
  }

  for (const [width, stacked] of [[390, false], [375, false], [374, true], [320, true]]) {
    test(`the hero ramp is ${stacked ? 'one swatch per line' : 'five across'} at ${width}px`, async ({ page }) => {
      watch(page, PERSONA)
      await page.setViewportSize({ width, height: 844 })
      await go(page, '/tools')
      const cols = await page.locator('.mk-pal .mk-ramp').evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length)
      expect(cols).toBe(stacked ? 1 : 5)
    })
  }

  for (const [width, thumb] of [[320, 72], [390, 112]]) {
    test(`a bench row's picture is ${thumb}px wide at ${width}px`, async ({ page }) => {
      watch(page, PERSONA)
      await page.setViewportSize({ width, height: 844 })
      await go(page, '/tools')
      const box = await page.locator('.mk-row .mk-thumb').first().boundingBox()
      expect(Math.round(box.width)).toBe(thumb)
    })
  }
})

test.describe('/mobile spacing', () => {
  for (const [width, gap] of [[1440, 64], [1200, 64], [768, 64], [390, 56], [320, 48]]) {
    test(`the button sits ${gap}px above the phones at ${width}px`, async ({ page }) => {
      watch(page, PERSONA)
      await page.setViewportSize({ width, height: width < 700 ? 844 : 900 })
      await go(page, '/mobile')
      const button = await page.locator('.mk-intro a').first().boundingBox()
      const phones = await page.locator('.mk-phones').boundingBox()
      // Mutation: change the margin-top on .mk-phones -> the distance moves off the figure.
      expect(Math.round(phones.y - (button.y + button.height))).toBe(gap)
    })
  }
})
