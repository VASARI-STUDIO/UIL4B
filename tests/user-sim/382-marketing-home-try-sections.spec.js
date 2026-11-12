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
