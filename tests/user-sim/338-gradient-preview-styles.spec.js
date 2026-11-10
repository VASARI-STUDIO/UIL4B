// /create/gradient: the six preview styles (Grain, Fluted glass, Glow ring, Streak, Soft
// glow, Fade) beside Fill, Hero, Card and Button.
//
// What a designer relies on:
//   - each style draws the colours of THEIR stops: pixels read off the rendered style, not
//     the page's own variables (red to red has no blue in it; red to blue has both);
//   - the switch is operable by keyboard, every choice has a name and a pressed state;
//   - the choice is kept in sessionStorage ('vs-gradient-preview') and survives a reload;
//   - the switch never wraps; what does not fit goes to a More menu that lists the rest and
//     picks one;
//   - nothing scrolls sideways at 320.
//
// MUTATIONS (each turns the tests named red):
//   a style painting fixed colours, not the stops                -> "a style draws its own stops ..."
//   choosePreview not writing sessionStorage                     -> "the choice is kept ..."
//   PREVIEW_STYLES dropping a style                              -> "the switch lists all ten choices ..."
//   .grd-ctx wrapping (flex-wrap: wrap)                          -> "at 320 the switch is one row and the page does not scroll sideways"
//   PreviewSwitch always showing every option                    -> "at 320 the switch is one row ..." (the row overflows the stage)
//   MenuSelect onChange not calling choosePreview                -> "More lists the rest and picks one"
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const KEY = 'vs-gradient-preview'
const STYLES = [['grain', 'Grain'], ['fluted', 'Fluted glass'], ['ring', 'Glow ring'], ['streak', 'Streak'], ['glow', 'Soft glow'], ['fade', 'Fade']]
const ALL = ['Fill', 'Hero', 'Card', 'Button', ...STYLES.map(([, n]) => n)]

const switchOf = (page) => page.getByRole('group', { name: 'Preview as' })
const stageOf = (page) => page.locator('.grd-stage')

async function open(page) {
  await go(page, '/create/gradient')
  await expect(page.getByRole('heading', { level: 1, name: 'Gradient' })).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
}
const startOn = (page, id) => page.addInitScript(([k, v]) => { sessionStorage.setItem(k, v) }, [KEY, id])
const withStops = (page, from, to) => page.addInitScript(([a, b]) => {
  localStorage.setItem('vs-current-design', JSON.stringify({
    gradient: { type: 'Linear', angle: 90, stops: [{ color: a, position: 0 }, { color: b, position: 100 }] },
  }))
}, [from, to])

/** Share of the style's pixels that lean red and lean blue, read from a screenshot of the canvas slot below the switch. */
async function hues(page) {
  const box = await stageOf(page).boundingBox()
  const shot = await page.screenshot({ clip: { x: box.x, y: box.y + box.height * 0.3, width: box.width, height: box.height * 0.7 } })
  return page.evaluate(async (b64) => {
    const blob = await (await fetch(`data:image/png;base64,${b64}`)).blob()
    const bmp = await createImageBitmap(blob)
    const cv = new OffscreenCanvas(bmp.width, bmp.height)
    const cx = cv.getContext('2d')
    cx.drawImage(bmp, 0, 0)
    const { data } = cx.getImageData(0, 0, bmp.width, bmp.height)
    let red = 0
    let blue = 0
    const n = data.length / 4
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] > data[i + 2] + 50) red++
      else if (data[i + 2] > data[i] + 50) blue++
    }
    return { red: red / n, blue: blue / n }
  }, shot.toString('base64'))
}

test.describe('the preview styles', () => {
  test.beforeEach(async ({ page }) => { watch(page, 'a designer trying their gradient as grain, glass and glow') })

  for (const [id, name] of STYLES) {
    test(`a style draws its own stops, not fixed colours (${name})`, async ({ page }) => {
      await startOn(page, id)
      await withStops(page, '#FF0000', '#0000FF')
      await open(page)
      await expect(page.locator(`.grd-fx[data-fx="${id}"]`)).toBeVisible()
      const both = await hues(page)
      expect(both.red, `${name}: red stop drawn`).toBeGreaterThan(0.02)
      expect(both.blue, `${name}: blue stop drawn`).toBeGreaterThan(0.02)
    })

    test(`a style with one colour twice has nothing of the other colour (${name})`, async ({ page }) => {
      await startOn(page, id)
      await withStops(page, '#FF0000', '#FF0000')
      await open(page)
      const one = await hues(page)
      expect(one.red, `${name}: red drawn`).toBeGreaterThan(0.02)
      expect(one.blue, `${name}: no blue anywhere`).toBeLessThan(0.002)
    })
  }

  test('the switch lists all ten choices with names and a pressed state, by keyboard', async ({ page }) => {
    await startOn(page, 'grain')
    await open(page)
    await expect(page.getByRole('img', { name: /shown as grain$/ })).toBeVisible()
    const group = switchOf(page)
    await expect(group).toBeVisible()
    for (const name of ALL) {
      await expect(group.getByRole('button', { name, exact: true }), `${name} is a named button`).toHaveAttribute('aria-pressed', /true|false/)
    }
    await group.getByRole('button', { name: 'Fluted glass', exact: true }).focus()
    await page.keyboard.press('Tab')
    await expect(group.getByRole('button', { name: 'Glow ring', exact: true })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(group.getByRole('button', { name: 'Glow ring', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(group.getByRole('button', { name: 'Grain', exact: true })).toHaveAttribute('aria-pressed', 'false')
    await expect(page.locator('.grd-fx')).toHaveAttribute('data-fx', 'ring')
  })

  test('the choice is kept in sessionStorage and survives a reload', async ({ page }) => {
    await open(page)
    await switchOf(page).getByRole('button', { name: 'Streak', exact: true }).click()
    expect(await page.evaluate((k) => sessionStorage.getItem(k), KEY)).toBe('streak')
    await page.reload()
    await expect(switchOf(page).getByRole('button', { name: 'Streak', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('.grd-fx')).toHaveAttribute('data-fx', 'streak')
  })

  test('Fill and the contexts draw no style', async ({ page }) => {
    await startOn(page, 'hero')
    await open(page)
    await expect(page.locator('.grd-fx')).toHaveCount(0)
  })
})

test.describe('at 320 the switch holds to one row', () => {
  test.use({ viewport: { width: 320, height: 700 }, hasTouch: true, isMobile: true })

  test('at 320 the switch is one row and the page does not scroll sideways', async ({ page }) => {
    watch(page, 'someone on a small phone choosing a preview style')
    await startOn(page, 'fade')
    await open(page)
    const found = await page.evaluate(() => {
      const bar = document.querySelector('.grd-ctx')
      const stage = document.querySelector('.grd-stage').getBoundingClientRect()
      const tops = [...bar.children].filter((el) => !el.classList.contains('grd-ctx-gauge')).map((el) => Math.round(el.getBoundingClientRect().top))
      const right = bar.getBoundingClientRect().right
      const root = document.scrollingElement
      return { tops, over: right - stage.right, scrollW: root.scrollWidth, clientW: root.clientWidth }
    })
    expect(new Set(found.tops).size, `one row, tops ${found.tops.join(',')}`).toBe(1)
    expect(found.over, 'the switch stays inside the stage').toBeLessThanOrEqual(0.5)
    expect(found.scrollW, 'no sideways scroll').toBeLessThanOrEqual(found.clientW)
    await expect(switchOf(page).getByRole('button', { name: /^More/ })).toBeVisible()
  })

  test('More lists the rest and picks one', async ({ page }) => {
    watch(page, 'someone on a small phone choosing a preview style')
    await open(page)
    await switchOf(page).getByRole('button', { name: /^More/ }).click()
    const list = page.getByRole('listbox', { name: 'More previews' })
    await expect(list).toBeVisible()
    await list.getByRole('option', { name: 'Fade' }).click()
    await expect(page.locator('.grd-fx')).toHaveAttribute('data-fx', 'fade')
    expect(await page.evaluate((k) => sessionStorage.getItem(k), KEY)).toBe('fade')
    await expect(switchOf(page).getByRole('button', { name: /^More previews: Fade/ })).toBeVisible()
  })
})
