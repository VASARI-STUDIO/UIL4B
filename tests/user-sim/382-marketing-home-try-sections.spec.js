// The home "try the tools" section as a visitor scrolls it, and the File Converter
// inside it.
//
//   · each of the four tools can be reached from its name, at a desktop and a phone width
//   · the tools stand apart: the gap between one tool's frame and the next is wide
//     (240px from 1200, 104 from 768, 80 under it), and a short nudge of the wheel
//     settles the tool back to the middle of the window
//   · the File Converter's Animation, Video and Extract frames tabs each draw their own
//     preview, the preview answers a setting, and the "Open in File Converter" link
//     carries that tab's mode (Image keeps the bare link)
//
// MUTATIONS (each turns a test red):
//   - put the row-gap in home-try.css back to 56px / 120px -> the gap test
//   - delete the settle effect in HomeTry.jsx -> the settle test
//   - make a converter tab render the Image card in ConverterTool.jsx -> the tabs test
//   - change an entry of MODE_IDS in ConverterTool.jsx -> the link test
import { test, expect } from './base.js'
import { go, watch, wheelToRest, homeSectionsLoaded } from './helpers.js'

const PERSONA = 'a visitor scrolling the home page to try the tools'
const NAMES = ['Palette Builder', 'Icon Library', 'Font Gallery', 'File Converter']

async function openTool(page, i) {
  await page.locator('#try').scrollIntoViewIfNeeded()
  await page.locator(`#ht-n-${i}`).click()
  await expect(page.locator(`#ht-n-${i}`)).toHaveAttribute('aria-current', 'true')
  await expect(page.locator(`#ht-s-${i}`)).toBeInViewport()
}

for (const [width, height] of [[1440, 900], [390, 844]]) {
  test.describe(`home try section at ${width}`, () => {
    test.use({ viewport: { width, height } })

    test('each of the four tools is reached from its name', async ({ page }) => {
      watch(page, PERSONA)
      await go(page, '/')
      await homeSectionsLoaded(page)
      const names = page.locator('.ht-names .ht-n')
      await expect(names).toHaveCount(4)
      for (let i = 0; i < 4; i += 1) {
        await openTool(page, i)
        // Exactly one name is current at a time.
        await expect(page.locator('.ht-names .ht-n[aria-current="true"]')).toHaveCount(1)
        await expect(page.locator(`#ht-h3-${i}`)).toHaveText(new RegExp(NAMES[i].split(' ')[0]))
      }
    })

    test('the gap between one tool and the next is wide', async ({ page }) => {
      watch(page, PERSONA)
      await go(page, '/')
      await homeSectionsLoaded(page)
      await page.locator('#try').scrollIntoViewIfNeeded()
      const gaps = await page.locator('.ht-stage').evaluateAll((els) => els.slice(1).map((el, i) => el.getBoundingClientRect().top - els[i].getBoundingClientRect().bottom))
      expect(gaps).toHaveLength(3)
      // The values the stylesheet sets (240 wide, 80 on a phone); the old ones were 120 and 56.
      const least = width >= 1200 ? 200 : 72
      for (const g of gaps) expect(g, `a ${Math.round(g)}px gap is too tight at ${width}`).toBeGreaterThanOrEqual(least)
    })
  })
}

test.describe('home try section settle', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('a short wheel nudge settles the tool back to the middle of the window', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/')
    await homeSectionsLoaded(page)
    await openTool(page, 1)
    const offMiddle = () => page.locator('#ht-s-1').evaluate((el) => {
      const r = el.getBoundingClientRect()
      return Math.abs(r.top + r.height / 2 - window.innerHeight / 2)
    })
    await expect.poll(offMiddle, { message: 'a name click centres the tool' }).toBeLessThan(4)
    await wheelToRest(page, 140, 'the page after the nudge')
    // Mutation: drop the settle in HomeTry.jsx -> the tool stays where the wheel left it.
    await expect.poll(offMiddle, { message: 'the tool eases back to the middle', timeout: 8000 }).toBeLessThan(4)
  })
})

// The section's one scroll listener does three jobs: keep the names in step with the
// tool in view, settle a tool onto its spot when the wheel stops, and leave a name click
// to scroll to its tool. Each is read here at a desktop and a phone width.
for (const [width, height] of [[1440, 900], [390, 844]]) {
  test.describe(`home try section follows the scroll at ${width}`, () => {
    test.use({ viewport: { width, height } })
    const wide = width >= 1200

    // How far the tool sits from the spot it lands on: the middle of the window from
    // 1200, just below the names row under it.
    const offSpot = (page, i) => page.locator(`#ht-s-${i}`).evaluate((el, isWide) => {
      const r = el.getBoundingClientRect()
      const names = document.querySelector('.ht-names')
      if (isWide) return Math.abs(r.top + r.height / 2 - window.innerHeight / 2)
      return Math.abs(r.top - (names.getBoundingClientRect().height + 16))
    }, wide)
    const current = (page) => page.locator('.ht-names .ht-n[aria-current="true"]').evaluate((el) => el.id)
    // Wheel the page until tool i is the one nearest its spot (the names do not drive it).
    const wheelTo = async (page, i) => {
      for (let step = 0; step < 40; step += 1) {
        const gap = await page.locator(`#ht-s-${i}`).evaluate((el, isWide) => {
          const r = el.getBoundingClientRect()
          return isWide ? r.top + r.height / 2 - window.innerHeight / 2 : r.top
        }, wide)
        if (Math.abs(gap) < 160) return
        await wheelToRest(page, Math.max(-800, Math.min(800, gap)), `the page on its way to tool ${i}`)
      }
    }

    test('the current name follows a scroll that no name click made', async ({ page }) => {
      watch(page, PERSONA)
      await go(page, '/')
      await homeSectionsLoaded(page)
      await openTool(page, 0)
      await expect.poll(() => current(page)).toBe('ht-n-0')
      // Scrolling down to the third tool (by the wheel, never a name) moves the name with it.
      await wheelTo(page, 2)
      // Mutation: drop track() from the scroll handler in HomeTry.jsx -> the name stays on the first tool.
      await expect.poll(() => current(page), { message: 'the name for the tool in view is current', timeout: 8000 }).toBe('ht-n-2')
      // And back up to the first.
      await wheelTo(page, 0)
      await expect.poll(() => current(page), { message: 'the name follows the scroll back up', timeout: 8000 }).toBe('ht-n-0')
    })

    test('a short wheel nudge settles the tool back onto its spot', async ({ page }) => {
      watch(page, PERSONA)
      await go(page, '/')
      await homeSectionsLoaded(page)
      await openTool(page, 1)
      await expect.poll(() => offSpot(page, 1), { message: 'a name click lands the tool' }).toBeLessThan(6)
      await wheelToRest(page, 120, 'the page after the nudge')
      // Mutation: drop the settle timer (arm) from the scroll handler in HomeTry.jsx -> the tool stays off its spot.
      await expect.poll(() => offSpot(page, 1), { message: 'the tool eases back onto its spot', timeout: 8000 }).toBeLessThan(6)
    })

    test('clicking a name lands its tool and no other name is current on the way', async ({ page }) => {
      watch(page, PERSONA)
      await go(page, '/')
      await homeSectionsLoaded(page)
      await page.locator('#try').scrollIntoViewIfNeeded()
      // From the click on, every frame notes which name is current.
      await page.evaluate(() => {
        window.__seen = new Set()
        window.__armed = false
        document.addEventListener('click', () => { window.__seen.clear(); window.__armed = true }, true)
        const tick = () => {
          const el = document.querySelector('.ht-names .ht-n[aria-current="true"]')
          if (window.__armed && el) window.__seen.add(el.id)
          requestAnimationFrame(tick)
        }
        tick()
      })
      for (const i of [3, 1]) {
        await page.locator(`#ht-n-${i}`).click()
        await expect.poll(() => offSpot(page, i), { message: `tool ${i} lands from its name`, timeout: 8000 }).toBeLessThan(6)
        const seen = await page.evaluate(() => { window.__armed = false; return [...window.__seen] })
        // Mutation: drop dest in go() in HomeTry.jsx -> the tools passed on the way take the name.
        expect(seen, `names current on the way to tool ${i}`).toEqual([`ht-n-${i}`])
      }
    })
  })
}

test.describe('home converter tabs', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  // [tab, mode id in the link, text its spec line carries at the start]
  const TABS = [
    ['Animation', 'animation', /GIF · 6 frames · 200 ms each · 1\.2 s/],
    ['Video', 'video', /0:08 to 0:08/],
    ['Extract frames', 'frames', /4 frames, one every 2 s, as PNG/],
  ]

  test('Image keeps the bare link and the three other tabs each carry their mode', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/')
    await homeSectionsLoaded(page)
    await openTool(page, 3)
    const link = page.locator('#ht-s-3 .ht-go')
    // Mutation: add ?mode=image to the Image link -> the bare-URL check fails.
    await expect(link).toHaveAttribute('href', '/create/file-converter')
    for (const [tab, id] of TABS) {
      await page.locator('#ht-s-3').getByRole('tab', { name: tab }).click()
      await expect(link, `${tab} tab link`).toHaveAttribute('href', `/create/file-converter?mode=${id}`)
    }
    await page.locator('#ht-s-3').getByRole('tab', { name: 'Image' }).click()
    await expect(link).toHaveAttribute('href', '/create/file-converter')
  })

  test('each tab draws its own preview in place of the Image card', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/')
    await homeSectionsLoaded(page)
    await openTool(page, 3)
    const stage = page.locator('#ht-s-3')
    await expect(stage.locator('.ht-cv-card')).toBeVisible()
    for (const [tab, , spec] of TABS) {
      await stage.getByRole('tab', { name: tab }).click()
      await expect(stage.getByRole('tab', { name: tab })).toHaveAttribute('aria-selected', 'true')
      await expect(stage.locator('.ht-cv-card'), `${tab} replaces the Image card`).toHaveCount(0)
      await expect(stage.locator('.ht-cv-scr')).toBeVisible()
      await expect(stage.locator('.ht-cv-spec')).toHaveText(spec)
    }
    await stage.getByRole('tab', { name: 'Image' }).click()
    await expect(stage.locator('.ht-cv-card')).toBeVisible()
    await expect(stage.locator('.ht-cv-scr')).toHaveCount(0)
  })

  test('a setting on the Animation, Video and Frames previews changes what the preview says', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/')
    await homeSectionsLoaded(page)
    await openTool(page, 3)
    const stage = page.locator('#ht-s-3')
    const set = stage.locator('.ht-cv-set')
    const spec = stage.locator('.ht-cv-spec')

    await stage.getByRole('tab', { name: 'Animation' }).click()
    await set.getByRole('radio', { name: '500 ms' }).click()
    await expect(spec).toHaveText('GIF · 6 frames · 500 ms each · 3.0 s')

    await stage.getByRole('tab', { name: 'Video' }).click()
    await set.getByRole('radio', { name: '2×' }).click()
    await set.getByRole('radio', { name: 'On' }).click()
    await set.getByRole('radio', { name: '16:9' }).click()
    await expect(spec).toHaveText('0:08 to 0:04, crop 16:9, reversed')

    await stage.getByRole('tab', { name: 'Extract frames' }).click()
    await set.getByRole('radio', { name: '1 s' }).click()
    await set.getByRole('radio', { name: 'WebP' }).click()
    await expect(spec).toHaveText('8 frames, one every 1 s, as WebP')
    await expect(stage.locator('.ht-cv-grid li')).toHaveCount(8)
  })
})

test.describe('home converter tabs on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('the Video tab swaps the card for its preview and its link carries the mode', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/')
    await homeSectionsLoaded(page)
    await openTool(page, 3)
    const stage = page.locator('#ht-s-3')
    await stage.getByRole('tab').filter({ hasText: /^Video$/ }).click()
    await expect(stage.locator('.ht-cv-scr')).toBeVisible()
    await expect(stage.locator('.ht-cv-card')).toHaveCount(0)
    await expect(stage.locator('.ht-go')).toHaveAttribute('href', '/create/file-converter?mode=video')
  })
})
