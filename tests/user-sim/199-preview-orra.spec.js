// The Product page (Orra Workroom) in the Palette Builder's "Preview on a UI" dialog is a
// softly interactive mockup. 153 holds how it renders and 50 holds its ink; this holds what a
// person DOES with it, and the dialog around it.
//
//   1. the colourways: a radiogroup of four; picking one repaints the shirt and names the colour
//   2. the pictures: the thumbnails (and, on a phone, the dots and a swipe) move the strip
//   3. the sizes: XXL is sold out but selectable; it moves the State menu and offers Notify me
//   4. Add to bag: the header count, the State menu, the bag sheet, and the page behind it inert
//   5. Escape closes the sheet and not the dialog; Continue (and the scrim) hand focus back
//   6. Save, the Delivery and Returns disclosures, and the nav's current page
//   7. the page forgets all of it when the preview closes, and nothing navigates
//   8. the compare view (two palettes side by side) is a still picture: no buttons
//
// Nothing is mocked: the dialog is opened the way a person opens it, signed in as a free
// account (the Product page is not a Pro example), at 1440 so the State menu is in the header.
//
// To make each go red (undo it after), all in src/components/palette/examples/OrraWorkroom.jsx:
//   1  in Swatches, make the button's onClick `live.setWay(0)`
//   2  in OrraWorkroom, make `show` do nothing but `setPic(i)` (drop the strip scrollTo)
//   3  in pickSize, drop `onState('soldout')`
//   4  in the ghost button's onClick, drop `setNotified`
//   5  in `add`, drop `onState('added')`; or `setCount`
//   6  drop the `useEscapeLayer(...)` line (Escape closes the whole dialog)
//   7  in the effect after `sheetOpen`, drop the `refocus.current` branch
//   8  in OrraWorkroom, make `toggle` return the same object (`(o) => o`)
//   9  in Header, make aria-current `'page'` for every link
//  10  in `isLive`, drop the `!pair &&` AND hand the compare Stage an onState
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'
import { clickPaletteAction, pickPreviewState } from './palette-helpers.js'

test.use({ viewport: { width: 1440, height: 900 } })

// Red, so the colourway names are distinct words and the swatches are far apart in colour.
const RED = ['#c8321e', '#e8a33d', '#2f6b4f', '#f1d9c4', '#4a1d1d']
const BLUE = ['#1e50c8', '#3da3e8', '#2f6b4f', '#c4d9f1', '#1d2b4a']
// The names OrraWorkroom.data.js gives RED's primary, secondary and deep, then the fixed one; by hand from the hue table.
const WAYS = ['Rust', 'Wattle', 'Dark Rust', 'Natural']
const NATURAL_RGB = 'rgb(217, 205, 180)'
const STATES = ['Overview', 'Sold out size', 'Added to bag', 'Focused size']
const STATE_ID = { Overview: 'overview', 'Sold out size': 'soldout', 'Added to bag': 'added', 'Focused size': 'focus' }

async function seed(page, colors) {
  await page.addInitScript((cols) => {
    const raw = localStorage.getItem('vs-current-design')
    const design = raw ? JSON.parse(raw) : {}
    design.palette = {
      ...(design.palette || {}),
      base: cols[0], harmony: 'auto', extraColors: [], activeIdx: 0,
      colors: cols, baseColors: cols,
      globalAdjust: { h: 0, s: 0, b: 0, temp: 0 }, locked: [],
    }
    localStorage.setItem('vs-current-design', JSON.stringify(design))
  }, colors)
}

async function openPalette(page, colors) {
  await seed(page, colors)
  await page.addInitScript(() => localStorage.setItem('vs-t', 'light'))
  await signIn(page, { plan: 'free' })
  await go(page, '/create/palette')
}

/** Open the preview dialog on the Product page, the way a person does. */
async function openOrra(page, { colors = RED } = {}) {
  await openPalette(page, colors)
  await clickPaletteAction(page, 'Preview')
  const dialog = page.getByRole('dialog', { name: 'Palette preview' })
  await expect(dialog).toBeVisible()
  const wide = await dialog.getByRole('option', { name: /^Product page/ }).count()
  if (wide) await dialog.getByRole('option', { name: /^Product page/ }).click()
  else {
    await dialog.locator('.pvd-menu-btn').click()
    await dialog.getByRole('option', { name: /^Product page/ }).click()
  }
  await expect(dialog.locator('.pvs[data-preview-scene="Product page"] .or')).toBeVisible()
  await expect(dialog.locator('.or-slide:first-child .rc-base')).toHaveJSProperty('complete', true)
  return dialog
}

const scene = (dialog) => dialog.locator('.pvs[data-preview-scene="Product page"]')
const trigger = (dialog) => dialog.getByRole('button', { name: /^State\b/ })
/** The state the scene is showing, read off the scene itself and not off the menu. */
const shown = (dialog) => scene(dialog).locator('.or').getAttribute('data-state')
const colourLabel = (sc) => sc.locator('.or-opt-l', { hasText: /^Colour/ }).locator('b')
const sizeLabel = (sc) => sc.locator('.or-opt-l', { hasText: /^Size/ }).locator('b')
const way = (sc, name) => sc.getByRole('radiogroup', { name: 'Colourway' }).getByRole('radio', { name, exact: true })
const sizeBtn = (sc, name) => sc.getByRole('radiogroup', { name: 'Size' }).getByRole('radio', { name, exact: true })
const add = (sc) => sc.getByRole('button', { name: 'Add to bag', exact: true })
const sheet = (sc) => sc.getByRole('dialog', { name: 'Your bag' })
const bagBtn = (sc) => sc.getByRole('button', { name: /^Bag, \d+ items?$/ })
const picNames = ['Front', 'Back', 'Pocket detail']

/** The colour the shirt on show is painted with, as the browser computed it. */
const tint = (sc) => sc.locator('.or-slide').first().locator('.rc-tint').evaluate((el) => getComputedStyle(el).backgroundColor)
/** A palette slot as the scene was handed it, as rgb(). */
const slot = (sc, name) => sc.evaluate((el, n) => {
  const probe = document.createElement('i')
  probe.style.color = `var(${n})`
  el.appendChild(probe)
  const c = getComputedStyle(probe).color
  probe.remove()
  return c
}, name)

// ── 1. the colourways ────────────────────────────────────────────────────────

test.describe('the colourways', () => {
  test('four are offered, the first is chosen, and each is named in words by its hue', async ({ page }) => {
    watch(page, 'shopper reading the Orra colourways')
    const dialog = await openOrra(page)
    const sc = scene(dialog)
    const group = sc.getByRole('radiogroup', { name: 'Colourway' })
    await expect(group.getByRole('radio')).toHaveCount(4)
    await expect(group.getByRole('radio')).toHaveText(WAYS)
    for (const name of WAYS) await expect(way(sc, name), name).toHaveAttribute('aria-checked', name === WAYS[0] ? 'true' : 'false')
    await expect(colourLabel(sc)).toHaveText(WAYS[0])
    await expect(sc.locator('.or-cap')).toHaveText(`Front · ${WAYS[0]}`)
  })

  test('picking a colourway repaints the shirt, names the colour, and checks only that one', async ({ page }) => {
    watch(page, 'shopper switching the Orra colourway')
    const dialog = await openOrra(page)
    const sc = scene(dialog)
    const expected = {
      Rust: await slot(sc, '--pv-primary'),
      Wattle: await slot(sc, '--pv-secondary'),
      'Dark Rust': await slot(sc, '--pv-deep'),
      Natural: NATURAL_RGB,
    }
    expect(new Set(Object.values(expected)).size, 'the four colourways are four colours').toBe(4)
    expect(await tint(sc), 'opens on the primary').toBe(expected.Rust)

    for (const name of ['Wattle', 'Dark Rust', 'Natural', 'Rust']) {
      await way(sc, name).click()
      await expect(way(sc, name), `${name} is checked`).toHaveAttribute('aria-checked', 'true')
      await expect(sc.locator('.or-sw[aria-checked="true"]'), `${name}: exactly one is checked`).toHaveCount(1)
      await expect(colourLabel(sc), `${name}: the Colour label`).toHaveText(name)
      await expect(sc.locator('.or-cap'), `${name}: the caption`).toContainText(name)
      await expect.poll(() => tint(sc), `${name}: the shirt tint`).toBe(expected[name])
      // Every picture in the strip is that colour, not just the one on show.
      const tints = await sc.locator('.or-stage .rc-tint').evaluateAll((els) => els.map((e) => getComputedStyle(e).backgroundColor))
      expect(tints, `${name}: all three pictures`).toEqual([expected[name], expected[name], expected[name]])
    }
  })

  test('the pixels follow the colourway, not just the tint layer', async ({ page }) => {
    watch(page, 'shopper comparing the Orra colourways on screen')
    const dialog = await openOrra(page)
    const sc = scene(dialog)
    const mean = async () => {
      let prev = null
      let m = null
      for (let i = 0; i < 20; i++) {
        const png = (await sc.locator('.or-stage').screenshot()).toString('base64')
        m = await page.evaluate(async (b64) => {
          const img = new Image()
          img.src = `data:image/png;base64,${b64}`
          await img.decode()
          const cv = document.createElement('canvas')
          cv.width = img.width
          cv.height = img.height
          const cx = cv.getContext('2d')
          cx.drawImage(img, 0, 0)
          const px = cx.getImageData(0, 0, cv.width, cv.height).data
          let r = 0; let g = 0; let b = 0; let n = 0
          for (let k = 0; k < px.length; k += 4) { r += px[k]; g += px[k + 1]; b += px[k + 2]; n++ }
          return { r: r / n, g: g / n, b: b / n }
        }, png)
        if (prev && Math.abs(prev.r - m.r) + Math.abs(prev.g - m.g) + Math.abs(prev.b - m.b) < 1) break
        prev = m
        await page.waitForTimeout(100)
      }
      return m
    }
    const seen = {}
    for (const name of ['Rust', 'Dark Rust']) {
      await way(sc, name).click()
      await expect.poll(() => tint(sc)).not.toBe('rgba(0, 0, 0, 0)')
      seen[name] = await mean()
    }
    const light = (m) => m.r + m.g + m.b
    expect(light(seen.Rust) - light(seen['Dark Rust']), `Rust ${JSON.stringify(seen.Rust)} against Dark Rust ${JSON.stringify(seen['Dark Rust'])}`).toBeGreaterThan(15)
  })

  test('the arrow keys move the choice and the focus, and only the chosen swatch is in the tab order', async ({ page }) => {
    watch(page, 'keyboard shopper walking the Orra colourways')
    const dialog = await openOrra(page)
    const sc = scene(dialog)
    await way(sc, 'Rust').focus()
    await expect(sc.locator('.or-sw[tabindex="0"]'), 'one swatch in the tab order').toHaveCount(1)
    await page.keyboard.press('ArrowRight')
    await expect(way(sc, 'Wattle')).toBeFocused()
    await expect(way(sc, 'Wattle')).toHaveAttribute('aria-checked', 'true')
    await expect(colourLabel(sc)).toHaveText('Wattle')
    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('ArrowLeft')
    await expect(way(sc, 'Natural'), 'wraps from the first to the last').toBeFocused()
    await expect(colourLabel(sc)).toHaveText('Natural')
    await expect(sc.locator('.or-sw[tabindex="0"]')).toHaveText('Natural')
  })

  test('the colour you pick stays picked when you change the picture', async ({ page }) => {
    const dialog = await openOrra(page)
    const sc = scene(dialog)
    await way(sc, 'Wattle').click()
    await sc.getByRole('button', { name: 'Back', exact: true }).click()
    await expect(sc.locator('.or-cap')).toHaveText('Back · Wattle')
    await expect(colourLabel(sc)).toHaveText('Wattle')
  })
})

// ── 2. the pictures ──────────────────────────────────────────────────────────

const stripAt = (sc) => sc.locator('.or-strip').evaluate((el) => Math.round(el.scrollLeft / el.clientWidth))

test.describe('the pictures', () => {
  test('the thumbnails move the strip to the front, back and pocket, and say which is on show', async ({ page }) => {
    watch(page, 'shopper flicking through the Orra pictures')
    const dialog = await openOrra(page)
    const sc = scene(dialog)
    const thumb = (n) => sc.getByRole('button', { name: n, exact: true })
    await expect(sc.locator('.or-thumb')).toHaveCount(3)
    await expect(thumb('Front')).toHaveAttribute('aria-pressed', 'true')
    expect(await stripAt(sc)).toBe(0)
    for (const [i, n] of picNames.entries()) {
      await thumb(n).click()
      await expect(thumb(n), `${n} is pressed`).toHaveAttribute('aria-pressed', 'true')
      await expect(sc.locator('.or-thumb[aria-pressed="true"]'), `${n}: exactly one is pressed`).toHaveCount(1)
      await expect(sc.locator('.or-cap'), `${n}: the caption`).toHaveText(`${n} · ${WAYS[0]}`)
      await expect.poll(() => stripAt(sc), `${n}: the strip scrolled to picture ${i}`).toBe(i)
    }
    await thumb('Front').click()
    await expect.poll(() => stripAt(sc)).toBe(0)
  })
})

test.describe('the pictures on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

  test('the dots move the strip, and swiping the strip moves the dot and the caption', async ({ page }) => {
    watch(page, 'shopper swiping the Orra pictures on a phone')
    const dialog = await openOrra(page)
    const sc = scene(dialog)
    await expect(sc.locator('.or-thumbs'), 'no thumbnails on a phone').toBeHidden()
    const dots = sc.locator('.or-dot')
    await expect(dots).toHaveCount(3)
    for (const dot of await dots.all()) expect((await dot.boundingBox()).width, 'a dot is wide enough to tap').toBeGreaterThanOrEqual(44)
    await expect(dots.nth(0)).toHaveAttribute('aria-current', 'true')

    await sc.getByRole('button', { name: 'Show back', exact: true }).tap()
    await expect(sc.locator('.or-cap')).toHaveText(`Back · ${WAYS[0]}`)
    await expect.poll(() => stripAt(sc)).toBe(1)
    await expect(dots.nth(1)).toHaveAttribute('aria-current', 'true')

    // A swipe is a scroll of the strip; the dot and the caption follow it.
    await sc.locator('.or-strip').evaluate((el) => el.scrollTo({ left: el.clientWidth * 2, behavior: 'instant' }))
    await expect(sc.locator('.or-cap')).toHaveText(`Pocket detail · ${WAYS[0]}`)
    await expect(dots.nth(2)).toHaveAttribute('aria-current', 'true')
    await expect(dots.nth(1)).not.toHaveAttribute('aria-current', 'true')
  })

  test('the bag sheet sits at the bottom of a phone screen, in view, with Continue tappable', async ({ page }) => {
    watch(page, 'shopper adding the shirt to the bag on a phone')
    const dialog = await openOrra(page)
    const sc = scene(dialog)
    await add(sc).scrollIntoViewIfNeeded()
    await add(sc).tap()
    await expect(sheet(sc)).toBeVisible()
    const cont = sheet(sc).getByRole('button', { name: 'Continue shopping' })
    await expect(cont).toBeFocused()
    const box = await sheet(sc).boundingBox()
    const view = page.viewportSize()
    expect(box.y + box.height, 'the sheet reaches the bottom of the screen').toBeGreaterThan(view.height - 120)
    expect(box.y, 'the sheet is on screen').toBeGreaterThanOrEqual(0)
    expect(box.width, 'the sheet is full width').toBeGreaterThan(view.width - 4)
    await cont.tap()
    await expect(sheet(sc)).toHaveCount(0)
    await expect(add(sc)).toBeFocused()
  })

  test('the State menu reaches Added to bag from the More sheet, and the scene follows', async ({ page }) => {
    const dialog = await openOrra(page)
    await pickPreviewState(dialog, 'Added to bag')
    await expect.poll(() => shown(dialog)).toBe('added')
    await expect(sheet(scene(dialog))).toBeVisible()
  })
})

// ── 3. the sizes ─────────────────────────────────────────────────────────────

test.describe('the sizes', () => {
  test('M is chosen to start, six are offered, and XXL says it is sold out', async ({ page }) => {
    watch(page, 'shopper reading the Orra sizes')
    const dialog = await openOrra(page)
    const sc = scene(dialog)
    const group = sc.getByRole('radiogroup', { name: 'Size' })
    await expect(group.getByRole('radio')).toHaveCount(6)
    await expect(sizeBtn(sc, 'M')).toHaveAttribute('aria-checked', 'true')
    await expect(sizeLabel(sc)).toHaveText('M')
    const xxl = sizeBtn(sc, 'XXL, sold out')
    await expect(xxl, 'XXL is announced as sold out').toBeVisible()
    await expect(xxl, 'sold out is not disabled: it can be picked').not.toHaveAttribute('aria-disabled', 'true')
    await expect(xxl).toBeEnabled()
    await expect(xxl, 'struck through').toHaveCSS('text-decoration-line', 'line-through')
    await expect(sizeBtn(sc, 'XL'), 'a size in stock is not struck through').toHaveCSS('text-decoration-line', 'none')
    await expect(sc.locator('.or-note')).toHaveText('Size M is ready to ship in 2 days.')
  })

  test('picking XXL moves the State menu to Sold out size and swaps Add to bag for Notify me', async ({ page }) => {
    watch(page, 'shopper picking the sold-out Orra size')
    const dialog = await openOrra(page)
    const sc = scene(dialog)
    await expect(trigger(dialog)).toContainText('Overview')
    await expect(sc.getByRole('button', { name: 'Notify me' })).toHaveCount(0)

    await sizeBtn(sc, 'XXL, sold out').click()
    await expect(trigger(dialog), 'the State menu moved').toContainText('Sold out size')
    await expect.poll(() => shown(dialog)).toBe('soldout')
    await expect(sizeBtn(sc, 'XXL, sold out')).toHaveAttribute('aria-checked', 'true')
    await expect(sizeLabel(sc)).toHaveText('XXL')
    await expect(sc.locator('.or-note'), 'the size note is announced and says why').toHaveText('XXL is sold out. Back in 4 weeks.')
    await expect(sc.locator('.or-note')).toHaveAttribute('role', 'status')
    await expect(add(sc), 'there is no Add to bag for a sold-out size').toHaveCount(0)
    await expect(sc.getByRole('button', { name: 'Notify me', exact: true })).toBeVisible()
    await trigger(dialog).click()
    await expect(dialog.getByRole('menuitemradio', { name: 'Sold out size', exact: true })).toHaveAttribute('aria-checked', 'true')
    await page.keyboard.press('Escape')

    // Back to a size in stock: the State menu and the button follow.
    await sizeBtn(sc, 'L').click()
    await expect(trigger(dialog)).toContainText('Overview')
    await expect(add(sc)).toBeVisible()
    await expect(sc.getByRole('button', { name: /^Notif/ })).toHaveCount(0)
    await expect(sc.locator('.or-note')).toHaveText('Size L is ready to ship in 2 days.')
  })

  test('Notify me turns into Notification set and the note says so, there and back', async ({ page }) => {
    watch(page, 'shopper asking to be told when XXL is back')
    const dialog = await openOrra(page)
    const sc = scene(dialog)
    await sizeBtn(sc, 'XXL, sold out').click()
    const notify = sc.getByRole('button', { name: 'Notify me', exact: true })
    await expect(notify).toHaveAttribute('aria-pressed', 'false')
    await notify.click()
    const set = sc.getByRole('button', { name: 'Notification set', exact: true })
    await expect(set).toHaveAttribute('aria-pressed', 'true')
    await expect(sc.locator('.or-note')).toHaveText('Got it. We will email you when XXL is back.')
    await expect(trigger(dialog), 'asking to be told is not a state of its own').toContainText('Sold out size')
    await set.click()
    await expect(sc.getByRole('button', { name: 'Notify me', exact: true })).toHaveAttribute('aria-pressed', 'false')
    await expect(sc.locator('.or-note')).toHaveText('XXL is sold out. Back in 4 weeks.')
  })

  test('the arrow keys walk the sizes into XXL and the State menu follows', async ({ page }) => {
    watch(page, 'keyboard shopper walking the Orra sizes')
    const dialog = await openOrra(page)
    const sc = scene(dialog)
    await sizeBtn(sc, 'M').focus()
    await page.keyboard.press('ArrowRight')
    await expect(sizeBtn(sc, 'L')).toBeFocused()
    await page.keyboard.press('ArrowRight')
    await expect(sizeBtn(sc, 'XL')).toBeFocused()
    await expect(trigger(dialog), 'a size in stock keeps the Overview').toContainText('Overview')
    await page.keyboard.press('ArrowRight')
    await expect(sizeBtn(sc, 'XXL, sold out')).toBeFocused()
    await expect(trigger(dialog)).toContainText('Sold out size')
    await page.keyboard.press('ArrowLeft')
    await expect(sizeBtn(sc, 'XL')).toBeFocused()
    await expect(trigger(dialog)).toContainText('Overview')
  })

  test('the State menu draws a focus ring on the chosen size and the other states draw none', async ({ page }) => {
    const dialog = await openOrra(page)
    const sc = scene(dialog)
    await expect(sc.locator('.or-size.is-focus')).toHaveCount(0)
    await trigger(dialog).click()
    await dialog.getByRole('menuitemradio', { name: 'Focused size', exact: true }).click()
    await expect.poll(() => shown(dialog)).toBe('focus')
    const ringed = sc.locator('.or-size.is-focus')
    await expect(ringed).toHaveCount(1)
    await expect(ringed).toHaveText('M')
    await expect(ringed).toHaveCSS('outline-style', 'solid')
    await expect(ringed).toHaveCSS('outline-width', '2px')
  })
})

// ── 4 and 5. Add to bag and its sheet ────────────────────────────────────────

test.describe('Add to bag', () => {
  test('puts one in the bag: the header count, the State menu and the sheet all say so', async ({ page }) => {
    watch(page, 'shopper adding the Orra overshirt to the bag')
    const dialog = await openOrra(page)
    const sc = scene(dialog)
    await expect(bagBtn(sc)).toHaveAttribute('aria-label', 'Bag, 0 items')
    await expect(sc.locator('.or-count')).toHaveText('0')
    await expect(sheet(sc)).toHaveCount(0)
    await expect(add(sc)).toHaveAttribute('aria-haspopup', 'dialog')

    await way(sc, 'Wattle').click()
    await sizeBtn(sc, 'L').click()
    await add(sc).click()
    await expect(sc.locator('.or-count'), 'the header count').toHaveText('1')
    await expect(bagBtn(sc)).toHaveAttribute('aria-label', 'Bag, 1 item')
    await expect(trigger(dialog), 'the State menu moved').toContainText('Added to bag')
    await expect.poll(() => shown(dialog)).toBe('added')
    const s = sheet(sc)
    await expect(s).toBeVisible()
    await expect(s.getByRole('heading', { name: 'Your bag' })).toBeVisible()
    await expect(s.getByText('Added to your bag')).toBeVisible()
    await expect(s.getByText('The Field Overshirt')).toBeVisible()
    await expect(s.getByText('Wattle, size L'), 'the line names the colour and size that were picked').toBeVisible()
    await expect(s.getByText('$240', { exact: true })).toBeVisible()
    await expect(s.getByRole('button', { name: 'Continue shopping' }), 'focus moves into the sheet').toBeFocused()
    await expect(sc.locator('.or-page'), 'the page behind a modal is inert').toHaveAttribute('inert', '')
    await expect(s).toHaveAttribute('aria-modal', 'true')
    await expect(add(sc), 'aria-expanded follows the sheet').toHaveAttribute('aria-expanded', 'true')
  })

  test('the header Bag button with nothing in the bag opens an empty bag, not an added one', async ({ page }) => {
    watch(page, 'shopper opening the Orra bag before adding anything')
    const dialog = await openOrra(page)
    const sc = scene(dialog)
    await bagBtn(sc).click()
    const s = sheet(sc)
    await expect(s).toBeVisible()
    await expect(s.getByText('Your bag is empty')).toBeVisible()
    await expect(s.getByText('Added to your bag'), 'nothing was added').toHaveCount(0)
    await expect(s.getByText('The Field Overshirt'), 'no line for a product that is not in the bag').toHaveCount(0)
    await expect(sc.locator('.or-count'), 'the count stays 0').toHaveText('0')
    await expect(bagBtn(sc)).toHaveAttribute('aria-label', 'Bag, 0 items')
    await s.getByRole('button', { name: 'Continue shopping' }).click()
    await expect(sheet(sc)).toHaveCount(0)
    // The State menu's own "Added to bag" still shows one.
    await trigger(dialog).click()
    await dialog.getByRole('menuitemradio', { name: 'Added to bag' }).click()
    await expect(sheet(sc).getByText('Added to your bag')).toBeVisible()
    await expect(sc.locator('.or-count')).toHaveText('1')
  })

  test('a second one makes it two: quantity two, $480, and the count follows', async ({ page }) => {
    const dialog = await openOrra(page)
    const sc = scene(dialog)
    await add(sc).click()
    await sheet(sc).getByRole('button', { name: 'Continue shopping' }).click()
    await expect(sheet(sc)).toHaveCount(0)
    await expect(sc.locator('.or-count')).toHaveText('1')
    await add(sc).click()
    await expect(sc.locator('.or-count')).toHaveText('2')
    await expect(bagBtn(sc)).toHaveAttribute('aria-label', 'Bag, 2 items')
    await expect(sheet(sc).getByText('Rust, size M, quantity 2')).toBeVisible()
    await expect(sheet(sc).getByText('$480', { exact: true })).toBeVisible()
  })

  test('the page behind the sheet cannot be reached: not by the pointer and not by the keyboard', async ({ page }) => {
    watch(page, 'shopper trying to reach the Orra page behind the bag sheet')
    const dialog = await openOrra(page)
    const sc = scene(dialog)
    await add(sc).click()
    await expect(sheet(sc)).toBeVisible()
    // The pointer: what is under the middle of Save is not Save (an inert page is not hit-tested).
    const hit = await sc.locator('.or-save').evaluate((el) => {
      el.scrollIntoView({ block: 'center' })
      const r = el.getBoundingClientRect()
      const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
      return { onSave: Boolean(at && at.closest('.or-save')), inPage: Boolean(at && at.closest('.or-page')) }
    })
    expect(hit, 'the pointer reaches the page behind the sheet').toEqual({ onSave: false, inPage: false })
    // The keyboard: the sheet comes after the page in the DOM, so Shift+Tab from Continue would step straight
    // back into the page if it were not inert. Five of them, and Tab too, never land on anything in it.
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press(i < 5 ? 'Shift+Tab' : 'Tab')
      const inPage = await page.evaluate(() => Boolean(document.activeElement && document.activeElement.closest('.or-page')))
      expect(inPage, `key press ${i + 1} landed behind the sheet`).toBe(false)
    }
    await expect(sheet(sc), 'the sheet is still up').toBeVisible()
    await expect(sc.locator('.or-save')).toHaveAttribute('aria-pressed', 'false')
  })
})

test.describe('the bag sheet closes', () => {
  test('Escape closes the sheet and not the dialog, then a second Escape closes the dialog', async ({ page }) => {
    watch(page, 'shopper pressing Escape on the Orra bag sheet')
    const dialog = await openOrra(page)
    const sc = scene(dialog)
    await add(sc).click()
    await expect(sheet(sc)).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog, 'Escape closed the sheet and not the dialog').toBeVisible()
    await expect(sheet(sc)).toHaveCount(0)
    await expect(trigger(dialog), 'the State menu went back to Overview').toContainText('Overview')
    await expect.poll(() => shown(dialog)).toBe('overview')
    await expect(sc.locator('.or-count'), 'the bag keeps what was added').toHaveText('1')
    await expect(add(sc), 'focus returns to Add to bag').toBeFocused()
    await expect(sc.locator('.or-page')).not.toHaveAttribute('inert', /.*/)
    await page.keyboard.press('Escape')
    await expect(dialog, 'a second Escape closes the dialog').toHaveCount(0)
  })

  test('Escape with the State menu open closes the menu first, and the sheet stays', async ({ page }) => {
    // Was a product bug: with the bag sheet open and then the State menu opened over it, the first Escape
    // closed the sheet (the older layer). escapeLayer.js keeps one stack and closes the layer opened last.
    const dialog = await openOrra(page)
    const sc = scene(dialog)
    await add(sc).click()
    await expect(sheet(sc)).toBeVisible()
    await trigger(dialog).click()
    await expect(dialog.getByRole('menu', { name: 'State' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog.getByRole('menu', { name: 'State' })).toHaveCount(0)
    await expect(dialog).toBeVisible()
    await expect(sheet(sc), 'the sheet is still open').toBeVisible()
    await page.keyboard.press('Escape')
    await expect(sheet(sc), 'the next Escape closes the sheet').toHaveCount(0)
    await expect(dialog).toBeVisible()
  })

  test('Continue shopping closes the sheet and focus returns to Add to bag', async ({ page }) => {
    watch(page, 'shopper continuing after adding to the bag')
    const dialog = await openOrra(page)
    const sc = scene(dialog)
    await add(sc).click()
    await sheet(sc).getByRole('button', { name: 'Continue shopping' }).click()
    await expect(sheet(sc)).toHaveCount(0)
    await expect(trigger(dialog)).toContainText('Overview')
    await expect(add(sc), 'focus is back where it was').toBeFocused()
    await expect(add(sc)).toHaveAttribute('aria-expanded', 'false')
  })

  test('Continue shopping by the keyboard (Enter) does the same', async ({ page }) => {
    const dialog = await openOrra(page)
    const sc = scene(dialog)
    await add(sc).focus()
    await page.keyboard.press('Enter')
    await expect(sheet(sc).getByRole('button', { name: 'Continue shopping' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(sheet(sc)).toHaveCount(0)
    await expect(add(sc)).toBeFocused()
  })

  test('clicking the scrim closes the sheet too', async ({ page }) => {
    const dialog = await openOrra(page)
    const sc = scene(dialog)
    await add(sc).click()
    await expect(sheet(sc)).toBeVisible()
    const box = await sc.locator('.or-scrim').boundingBox()
    const sh = await sheet(sc).boundingBox()
    await page.mouse.click(Math.max(box.x + 20, 1), Math.min(box.y + box.height - 40, 880))
    expect(sh.x, 'the click was beside the sheet').toBeGreaterThan(box.x + 40)
    await expect(sheet(sc)).toHaveCount(0)
    await expect(add(sc)).toBeFocused()
  })

  test('the Bag button in the header opens the sheet, and Continue hands focus back to the Bag button', async ({ page }) => {
    watch(page, 'shopper opening the Orra bag from the header')
    const dialog = await openOrra(page)
    const sc = scene(dialog)
    await bagBtn(sc).click()
    await expect(sheet(sc)).toBeVisible()
    await expect(trigger(dialog)).toContainText('Added to bag')
    await sheet(sc).getByRole('button', { name: 'Continue shopping' }).click()
    await expect(sheet(sc)).toHaveCount(0)
    await expect(bagBtn(sc), 'focus returns to the control that opened it').toBeFocused()
  })

  test('the State menu closes the sheet too: picking Overview takes it away', async ({ page }) => {
    const dialog = await openOrra(page)
    const sc = scene(dialog)
    await trigger(dialog).click()
    await dialog.getByRole('menuitemradio', { name: 'Added to bag', exact: true }).click()
    await expect(sheet(sc)).toBeVisible()
    await trigger(dialog).click()
    await dialog.getByRole('menuitemradio', { name: 'Overview', exact: true }).click()
    await expect(sheet(sc)).toHaveCount(0)
    await expect.poll(() => shown(dialog)).toBe('overview')
  })
})

// ── 6. Save, the disclosures, the nav ────────────────────────────────────────

test.describe('the small controls', () => {
  test('Save fills the heart and says Saved, and a second press undoes it', async ({ page }) => {
    watch(page, 'shopper saving the Orra overshirt')
    const dialog = await openOrra(page)
    const sc = scene(dialog)
    const save = sc.locator('.or-save')
    await expect(save).toHaveText('Save')
    await expect(save).toHaveAttribute('aria-pressed', 'false')
    await expect(save.locator('svg')).toHaveAttribute('fill', 'none')
    await save.click()
    await expect(save).toHaveText('Saved')
    await expect(save).toHaveAttribute('aria-pressed', 'true')
    await expect(save.locator('svg'), 'the heart is filled').toHaveAttribute('fill', 'currentColor')
    await expect(trigger(dialog), 'saving is not a state').toContainText('Overview')
    await save.click()
    await expect(save).toHaveText('Save')
    await expect(save).toHaveAttribute('aria-pressed', 'false')
  })

  test('Delivery and Returns open and close on their own, and say so', async ({ page }) => {
    watch(page, 'shopper reading the Orra delivery and returns')
    const dialog = await openOrra(page)
    const sc = scene(dialog)
    const delivery = sc.getByRole('button', { name: 'Delivery', exact: true })
    const returns = sc.getByRole('button', { name: 'Returns', exact: true })
    const panel = (b) => sc.locator(`#${b}`)
    await expect(delivery).toHaveAttribute('aria-expanded', 'false')
    await expect(returns).toHaveAttribute('aria-expanded', 'false')
    await expect(panel('or-delivery'), 'closed text is hidden').toBeHidden()
    await expect(panel('or-returns')).toBeHidden()
    await expect(delivery).toHaveAttribute('aria-controls', 'or-delivery')

    await delivery.click()
    await expect(delivery).toHaveAttribute('aria-expanded', 'true')
    await expect(panel('or-delivery')).toBeVisible()
    await expect(panel('or-delivery')).toContainText('Free over $150 within Australia')
    await expect(returns, 'the other one stays shut').toHaveAttribute('aria-expanded', 'false')
    await expect(panel('or-returns')).toBeHidden()

    await returns.click()
    await expect(panel('or-returns')).toContainText('Return it unworn within 30 days')
    await expect(panel('or-delivery'), 'both can be open').toBeVisible()

    await delivery.click()
    await expect(delivery).toHaveAttribute('aria-expanded', 'false')
    await expect(panel('or-delivery')).toBeHidden()
    await expect(panel('or-returns')).toBeVisible()
  })

  test('a disclosure opens from the keyboard', async ({ page }) => {
    const dialog = await openOrra(page)
    const sc = scene(dialog)
    const returns = sc.getByRole('button', { name: 'Returns', exact: true })
    await returns.focus()
    await page.keyboard.press('Enter')
    await expect(returns).toHaveAttribute('aria-expanded', 'true')
    await page.keyboard.press('Space')
    await expect(returns).toHaveAttribute('aria-expanded', 'false')
  })

  test('the nav marks the page you are on with aria-current, and the breadcrumb follows; nothing navigates', async ({ page }) => {
    watch(page, 'shopper using the Orra nav')
    const dialog = await openOrra(page)
    const sc = scene(dialog)
    const nav = sc.getByRole('navigation', { name: 'Orra Workroom' })
    const link = (n) => nav.getByRole('button', { name: n, exact: true })
    const url = page.url()
    await expect(nav.getByRole('button')).toHaveText(['Shirts', 'Trousers', 'Workroom'])
    await expect(link('Shirts')).toHaveAttribute('aria-current', 'page')
    await expect(nav.locator('[aria-current="page"]'), 'exactly one current page').toHaveCount(1)
    await expect(sc.locator('.or-crumb')).toHaveText('Shirts / Overshirts / The Field Overshirt')

    await link('Workroom').click()
    await expect(link('Workroom')).toHaveAttribute('aria-current', 'page')
    await expect(link('Shirts')).not.toHaveAttribute('aria-current', 'page')
    await expect(nav.locator('[aria-current="page"]')).toHaveCount(1)
    await expect(sc.locator('.or-crumb')).toHaveText('Workroom / Overshirts / The Field Overshirt')
    await link('Trousers').click()
    await expect(link('Trousers')).toHaveAttribute('aria-current', 'page')
    expect(page.url(), 'a nav link in a mockup goes nowhere').toBe(url)
    await expect(dialog).toBeVisible()
  })
})

// ── 7. the page forgets ──────────────────────────────────────────────────────

test.describe('closing the preview', () => {
  test('forgets the colour, size, bag, Save and nav, and the next opening is the resting page', async ({ page }) => {
    watch(page, 'shopper reopening the Orra preview')
    let dialog = await openOrra(page)
    let sc = scene(dialog)
    await way(sc, 'Natural').click()
    await sizeBtn(sc, 'XL').click()
    await sc.locator('.or-save').click()
    await sc.getByRole('navigation', { name: 'Orra Workroom' }).getByRole('button', { name: 'Trousers', exact: true }).click()
    await add(sc).click()
    await sheet(sc).getByRole('button', { name: 'Continue shopping' }).click()
    await expect(sc.locator('.or-count')).toHaveText('1')
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)

    await clickPaletteAction(page, 'Preview')
    dialog = page.getByRole('dialog', { name: 'Palette preview' })
    await expect(dialog).toBeVisible()
    // The preview reopens on the scene it was left on; wait for it to be the product page.
    if (!(await scene(dialog).count())) {
      await dialog.getByRole('option', { name: /^Product page/ }).click()
    }
    sc = scene(dialog)
    await expect(sc.locator('.or')).toBeVisible()
    await expect(colourLabel(sc)).toHaveText('Rust')
    await expect(sizeLabel(sc)).toHaveText('M')
    await expect(sc.locator('.or-count')).toHaveText('0')
    await expect(sc.locator('.or-save')).toHaveText('Save')
    await expect(sc.getByRole('navigation', { name: 'Orra Workroom' }).getByRole('button', { name: 'Shirts', exact: true })).toHaveAttribute('aria-current', 'page')
    await expect(trigger(dialog)).toContainText('Overview')
  })

  test('the State menu lists the four states, checks one, and the scene shows only that one', async ({ page }) => {
    watch(page, 'designer reading the Orra State menu')
    const dialog = await openOrra(page)
    const sc = scene(dialog)
    await trigger(dialog).click()
    const items = dialog.getByRole('menuitemradio')
    await expect(items).toHaveText(STATES)
    for (const label of STATES) {
      await items.filter({ hasText: label }).click()
      await expect(trigger(dialog)).toContainText(label)
      await expect(sc.locator('.or'), `${label}: one scene, not one per state`).toHaveCount(1)
      await expect.poll(() => shown(dialog), `${label}: the scene is in that state`).toBe(STATE_ID[label])
      await expect(sheet(sc), `${label}: the sheet is Added to bag's alone`).toHaveCount(label === 'Added to bag' ? 1 : 0)
      await expect(sc.locator('.or-btn--ghost'), `${label}: Notify me is Sold out size's alone`).toHaveCount(label === 'Sold out size' ? 1 : 0)
      await trigger(dialog).click()
      await expect(items.and(dialog.locator('[aria-checked="true"]')), `${label}: exactly one is checked`).toHaveCount(1)
    }
  })
})

// ── 8. the compare view is a still picture ───────────────────────────────────

test.describe('the compare view', () => {
  test('shows the Product page twice as a still picture: no buttons, no radios, no links', async ({ page }) => {
    watch(page, 'designer comparing a suggested palette on the Product page')
    await openPalette(page, BLUE)
    await clickPaletteAction(page, 'Suggest variations')
    const compare = page.getByRole('button', { name: /^Compare .* with your palette$/ }).first()
    await expect(compare).toBeVisible()
    await compare.click()
    const dialog = page.getByRole('dialog', { name: 'Palette preview' })
    await expect(dialog.getByText('Compare palettes')).toBeVisible()
    await dialog.getByRole('option', { name: /^Product page/ }).click()

    const panes = dialog.locator('.pvd-stage.is-compare .pvd-pane')
    await expect(panes).toHaveCount(2)
    await expect(panes.locator('.pvs[data-preview-scene="Product page"] .or')).toHaveCount(2)
    for (const i of [0, 1]) {
      const pane = panes.nth(i)
      await expect(pane.locator('.or-title'), `pane ${i}: the scene has drawn`).toBeVisible()
      await expect(pane.locator('.pvs'), `pane ${i}`).toHaveAttribute('role', 'img')
      await expect(pane.locator('.or').first()).not.toHaveClass(/is-live/)
      for (const sel of ['button', 'input', '[role="radio"]', '[role="radiogroup"]', '[aria-pressed]', '[aria-expanded]', 'a[href]']) {
        await expect(pane.locator('.pvs').locator(sel), `pane ${i}: no ${sel}`).toHaveCount(0)
      }
      // The colours and sizes are still there to look at, as plain text.
      await expect(pane.locator('.or-sw'), `pane ${i}: four colourways`).toHaveCount(4)
      await expect(pane.locator('.or-size'), `pane ${i}: six sizes`).toHaveCount(6)
    }
    await expect(dialog.getByRole('button', { name: /^Use / })).toBeVisible()
  })
})
