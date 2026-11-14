// /create/gradient: the places (Fill, Hero, Card, Button, Poster, Spec card, App icon, Phone)
// on the preview switch, and the fill styles (Plain, Grain, Fluted glass, Glow ring, Streak,
// Soft glow, Fade, Mesh, Waves) in the Fill style picker at the end of the switch on Fill.
//
// What a designer relies on:
//   - each style draws the colours of THEIR stops: pixels read off the rendered style, not
//     the page's own variables (red to red has no blue in it; red to blue has both);
//   - the switch and the picker are operable by keyboard, every choice has a name and a
//     pressed state; the picker is offered only on Fill;
//   - the place ('vs-gradient-preview') and the style ('vs-gradient-fill') are kept in
//     sessionStorage and survive a reload; under 768 a pick closes the sheet;
//   - the switch never wraps; what does not fit goes to a More menu that lists the rest and
//     picks one;
//   - nothing scrolls sideways at 320.
//
// MUTATIONS (each turns the tests named red):
//   a style painting fixed colours, not the stops                -> "a style draws its own stops ..."
//   choosePlace or chooseFill not writing sessionStorage         -> "the choice is kept ..."
//   FILL_STYLES or PREVIEW_PLACES dropping an entry              -> "the switch lists the places ..."
//   the trigger rendered on every place                          -> "the style picker is only offered on Fill"
//   FillStylePicker not closing on pick under 768                -> "a pick in the Fill style sheet ..."
//   .grd-ctx wrapping (flex-wrap: wrap)                          -> "at 320 the switch is one row and the page does not scroll sideways"
//   PreviewSwitch always showing every option                    -> "at 320 the switch is one row ..." (the row overflows the stage)
//   MenuSelect onChange not calling choosePlace                  -> "More lists the rest and picks one"
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const KEY = 'vs-gradient-preview'
const FILL_KEY = 'vs-gradient-fill'
const STYLES = [['grain', 'Grain'], ['fluted', 'Fluted glass'], ['ring', 'Glow ring'], ['streak', 'Streak'], ['glow', 'Soft glow'], ['fade', 'Fade']]
const PLACES = ['Fill', 'Hero', 'Card', 'Button', 'Poster', 'Spec card', 'App icon', 'Phone']
const FILL_NAMES = ['Plain', ...STYLES.map(([, n]) => n), 'Mesh', 'Waves']

const switchOf = (page) => page.getByRole('group', { name: 'Preview as' })
const stageOf = (page) => page.locator('.grd-stage')
const triggerOf = (page) => page.getByRole('button', { name: /^Fill style: / })
const pickerOf = (page) => page.getByRole('dialog', { name: 'Fill style' })
// The style drawn on the canvas, not the swatches on the picker's tiles.
const fxOf = (page, sel = '') => page.locator(`.grd-fx${sel}:not([role="dialog"] *)`)

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
      await expect(fxOf(page, `[data-fx="${id}"]`)).toBeVisible()
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

  test('the switch lists the places and the Fill style picker lists the styles, by keyboard', async ({ page }) => {
    await startOn(page, 'grain')
    await open(page)
    await expect(page.getByRole('img', { name: /shown as grain$/ })).toBeVisible()
    const group = switchOf(page)
    await expect(group).toBeVisible()
    for (const name of PLACES) {
      await expect(group.getByRole('button', { name, exact: true }), `${name} is a named button`).toHaveAttribute('aria-pressed', /true|false/)
    }
    await expect(group.getByRole('button', { name: 'Grain', exact: true }), 'the styles are not places').toHaveCount(0)
    const trigger = triggerOf(page)
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await trigger.focus()
    await page.keyboard.press('Enter')
    const picker = pickerOf(page)
    await expect(picker).toBeVisible()
    for (const name of FILL_NAMES) {
      await expect(picker.getByRole('button', { name, exact: true }), `${name} is a named tile`).toHaveAttribute('aria-pressed', /true|false/)
    }
    await expect(picker.getByRole('button', { name: 'Grain', exact: true })).toBeFocused()
    await page.keyboard.press('ArrowRight')
    await expect(picker.getByRole('button', { name: 'Fluted glass', exact: true })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(picker.getByRole('button', { name: 'Fluted glass', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(picker.getByRole('button', { name: 'Grain', exact: true })).toHaveAttribute('aria-pressed', 'false')
    await expect(fxOf(page)).toHaveAttribute('data-fx', 'fluted')
    await page.keyboard.press('Escape')
    await expect(picker).toHaveCount(0)
    await expect(triggerOf(page)).toBeFocused()
    await expect(triggerOf(page)).toHaveAccessibleName('Fill style: Fluted glass')
  })

  test('the style picker is only offered on Fill', async ({ page }) => {
    await open(page)
    await expect(triggerOf(page)).toBeVisible()
    await switchOf(page).getByRole('button', { name: 'Button', exact: true }).click()
    await expect(triggerOf(page)).toHaveCount(0)
    await switchOf(page).getByRole('button', { name: 'Fill', exact: true }).click()
    await expect(triggerOf(page)).toBeVisible()
  })

  test('the choice is kept in sessionStorage and survives a reload', async ({ page }) => {
    await open(page)
    await triggerOf(page).click()
    await pickerOf(page).getByRole('button', { name: 'Streak', exact: true }).click()
    expect(await page.evaluate((k) => sessionStorage.getItem(k), FILL_KEY)).toBe('streak')
    await page.reload()
    await expect(triggerOf(page)).toHaveAccessibleName('Fill style: Streak')
    await expect(fxOf(page)).toHaveAttribute('data-fx', 'streak')
    await switchOf(page).getByRole('button', { name: 'Card', exact: true }).click()
    expect(await page.evaluate((k) => sessionStorage.getItem(k), KEY)).toBe('card')
    await page.reload()
    await expect(switchOf(page).getByRole('button', { name: 'Card', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await switchOf(page).getByRole('button', { name: 'Fill', exact: true }).click()
    await expect(fxOf(page)).toHaveAttribute('data-fx', 'streak')
  })

  test('Fill and the contexts draw no style', async ({ page }) => {
    await startOn(page, 'hero')
    await open(page)
    await expect(fxOf(page)).toHaveCount(0)
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
    watch(page, 'someone on a small phone choosing a preview place')
    await open(page)
    await switchOf(page).getByRole('button', { name: /^More/ }).click()
    const list = page.getByRole('listbox', { name: 'More previews' })
    await expect(list).toBeVisible()
    await list.getByRole('option', { name: 'Phone' }).click()
    expect(await page.evaluate((k) => sessionStorage.getItem(k), KEY)).toBe('phone')
    await expect(switchOf(page).getByRole('button', { name: 'Phone', exact: true }), 'the chosen place is kept on the bar').toHaveAttribute('aria-pressed', 'true')
  })

  test('a pick in the Fill style sheet applies it and closes the sheet', async ({ page }) => {
    watch(page, 'someone on a small phone choosing a fill style')
    await open(page)
    await triggerOf(page).click()
    await pickerOf(page).getByRole('button', { name: 'Fade', exact: true }).click()
    await expect(pickerOf(page)).toHaveCount(0)
    await expect(fxOf(page)).toHaveAttribute('data-fx', 'fade')
    expect(await page.evaluate((k) => sessionStorage.getItem(k), FILL_KEY)).toBe('fade')
    await expect(triggerOf(page)).toBeFocused()
  })
})
