// Where the home converter preview sends a visitor, and the marketing pages' layout at
// the widths people use.
//
//   · /create/file-converter?mode=animation|video|frames opens that tab; an unknown,
//     empty or wrong-case mode opens Image, and a mode asked for twice is read once, the
//     first; the tab is picked on arrival only, and a photo carried over from the home
//     preview opens Image whatever ?mode= says
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

  // A mode asked for twice is read once, and it is the first: URLSearchParams.get gives the first value.
  for (const [url, id, label] of [
    ['mode=video&mode=animation', 'video', 'Video'],
    ['mode=animation&mode=video', 'animation', 'Animation'],
    ['mode=bogus&mode=video', 'image', 'Image'],
  ]) {
    test(`?${url} opens the ${label} tab, the first one asked for`, async ({ page }) => {
      watch(page, PERSONA)
      await go(page, `/create/file-converter?${url}`)
      // Mutation: read the last value (getAll().pop()) -> the first two cases swap their tabs.
      await expect(page.locator(`#fc-tab-${id}`)).toHaveAttribute('aria-selected', 'true')
      await expect(selected(page)).toHaveCount(1)
      await expect(selected(page)).toHaveText(label)
    })
  }

  test('the tab is only picked on arrival: later renders never read ?mode= again', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/create/file-converter?mode=video')
    await expect(page.locator('#fc-tab-video')).toHaveAttribute('aria-selected', 'true')
    // A flip back to the asked-for tab one render after a click would pass a plain "is selected" check
    // before it happened, so every change of the selected tab is written down and the whole run read.
    await page.evaluate(() => {
      const list = document.querySelector('[role="tablist"][aria-label="Converter mode"]')
      const current = () => list.querySelector('[role="tab"][aria-selected="true"]')?.id
      window.__selected = [current()]
      new MutationObserver(() => {
        const id = current()
        if (id && id !== window.__selected[window.__selected.length - 1]) window.__selected.push(id)
      }).observe(list, { attributes: true, attributeFilter: ['aria-selected'], subtree: true })
    })
    const settle = () => page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(done)))))
    await page.locator('#fc-tab-image').click()
    await expect(page.locator('#fc-tab-image')).toHaveAttribute('aria-selected', 'true')
    await settle()
    await page.locator('#fc-tab-frames').click()
    await expect(page.locator('#fc-tab-frames')).toHaveAttribute('aria-selected', 'true')
    await settle()
    // Mutation: re-read ?mode= in an effect with no dependencies (setMode(asked)) -> the run ends back on video.
    expect(await page.evaluate(() => window.__selected)).toEqual(['fc-tab-video', 'fc-tab-image', 'fc-tab-frames'])
    await expect(selected(page)).toHaveCount(1)
    await expect(page.locator('#fc-tab-video')).toHaveAttribute('aria-selected', 'false')
  })

  // A photo carried over from the home preview opens the Image tab, whatever ?mode= says.
  // The home link for Image is bare, so a ?mode= is put on the address for it here, as a
  // pasted or edited link would have one. The photo is chosen on the home page for real.
  const arriveWithAskedMode = async (page, { photo }) => {
    await page.addInitScript(() => {
      const push = history.pushState.bind(history)
      history.pushState = (state, title, url) => push(state, title, typeof url === 'string' && url.startsWith('/create/file-converter') ? `${url}?mode=video` : url)
    })
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/')
    await homeSectionsLoaded(page)
    await page.locator('#try').scrollIntoViewIfNeeded()
    await page.locator('#ht-n-3').click()
    const stage = page.locator('#ht-s-3')
    await expect(stage).toBeInViewport()
    if (photo) {
      const png = await page.evaluate(() => {
        const c = document.createElement('canvas'); c.width = 96; c.height = 64
        const x = c.getContext('2d'); x.fillStyle = '#1c40f2'; x.fillRect(0, 0, 96, 64)
        return c.toDataURL('image/png').split(',')[1]
      })
      await stage.locator('input.ht-cv-file').setInputFiles([{ name: 'handoff.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') }])
      await expect(stage.locator('.ht-cv-name')).toHaveText('handoff.png')
    }
    await stage.locator('.ht-go').click()
    await expect(page).toHaveURL(/\/create\/file-converter\?mode=video$/)
  }

  test('a chosen photo wins over ?mode=: the Image tab opens with the photo in it', async ({ page }) => {
    watch(page, PERSONA)
    await arriveWithAskedMode(page, { photo: true })
    // Mutation: drop the `!handoff?.files?.length &&` test in FileConverter.jsx -> the Video tab opens and the photo is lost.
    await expect(page.locator('#fc-tab-image')).toHaveAttribute('aria-selected', 'true')
    await expect(selected(page)).toHaveCount(1)
    await expect(page.locator('#fc-panel-image').getByText('handoff.png').first()).toBeVisible()
  })

  test('the same address with no photo chosen does open the tab it asks for', async ({ page }) => {
    watch(page, PERSONA)
    // Positive control for the test above: the address it builds really does carry ?mode=video.
    await arriveWithAskedMode(page, { photo: false })
    await expect(page.locator('#fc-tab-video')).toHaveAttribute('aria-selected', 'true')
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
