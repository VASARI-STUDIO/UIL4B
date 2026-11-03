// /create/semantic-color: the "Download" menu in the tool toolbar.
//
// Two rows, Download CSS and Download HTML, and both hand over exactly what is on
// screen: the CSS is the same text Copy tokens puts on the clipboard, and the HTML
// is a swatch sheet of the four visible role ramps. Below the width where the
// button fits it moves into the More overflow as two flat rows. A signed-out
// visitor gets the account prompt and no file; Copy tokens stays free.
//
// Seam: the `.tl-export-btn` trigger and the rows it opens (role menuitem), or the
// same two rows as buttons in the More sheet at 390. The app header's own "Export"
// button means the whole design system, so this one is named differently.
//
// MUTATIONS (each should turn a case red):
//   * drop `exportItem` from `items` in ColorStudio -> no control at 390 or 1440
//   * build the CSS file from anything but `tokensCSS` -> "the CSS file is Copy tokens"
//   * skip a role in `exportRoles` -> "the HTML lists every role and step"
//   * call the Blob download without `gatedDownload` -> "signed out, both downloads"
//   * remove the `menu` of `exportItem` -> at 390 the rows are not in More
//   * remove the ArrowDown branch in ExportMenu's onMenuKey -> the keyboard case
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'

const ROUTE = '/create/semantic-color'
const LABEL = 'Download'
const ROLES = ['success', 'warning', 'error', 'info']
const STEPS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900']

const trigger = (page) => page.locator('.tl-export-btn')
const row = (page, name) => page.getByRole('menuitem', { name, exact: true })
const loginOpen = (page) => page.evaluate(() => !!document.querySelector('#ui-login-title'))
const clipboard = (page) => page.evaluate(() => navigator.clipboard.readText())

async function open(page, width = 1440, height = 900) {
  await page.setViewportSize({ width, height })
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {})
  await go(page, ROUTE)
  await expect(page.locator('.stc-ramp')).toHaveCount(4)
  await expect(page.locator('[data-tool-toolbar]')).not.toHaveClass(/is-measuring/)
}

// Where the toolbar's children sit: one row means one centre line.
async function readRow(page) {
  return page.locator('[data-tool-toolbar]').evaluate((bar) => {
    const kids = [...bar.children].filter((el) => {
      const r = el.getBoundingClientRect()
      return r.width > 0 && r.height > 0 && getComputedStyle(el).position !== 'absolute'
    })
    const centres = kids.map((el) => Math.round(el.getBoundingClientRect().top + el.getBoundingClientRect().height / 2))
    return {
      spread: Math.max(...centres) - Math.min(...centres),
      right: Math.round(Math.max(...kids.map((el) => el.getBoundingClientRect().right))),
      vw: window.innerWidth,
      height: Math.round(bar.getBoundingClientRect().height),
    }
  })
}

// Open the control wherever it is: its own menu when it is on the row, the More
// sheet's flat rows when it has moved there. Returns a getter for a row by name.
async function reach(page) {
  const bar = page.locator('[data-tool-toolbar]')
  if (await trigger(page).isVisible().catch(() => false)) {
    await trigger(page).click()
    await expect(page.getByRole('menu', { name: LABEL })).toBeVisible()
    return (name) => row(page, name)
  }
  await bar.getByRole('button', { name: 'More', exact: true }).click()
  const panel = page.getByRole('dialog', { name: 'More' })
  await expect(panel).toBeVisible()
  return (name) => panel.getByRole('button', { name, exact: true })
}

// Record every blob handed to a download anchor: its file name, type and text.
async function watchDownloads(page) {
  await page.evaluate(() => {
    window.__dl = []
    const blobs = new Map()
    const create = URL.createObjectURL.bind(URL)
    URL.createObjectURL = (obj) => { const u = create(obj); blobs.set(u, obj); return u }
    const click = HTMLAnchorElement.prototype.click
    HTMLAnchorElement.prototype.click = function patched() {
      if (this.hasAttribute('download')) {
        const blob = blobs.get(this.href)
        const entry = { name: this.download, type: blob?.type || '', text: '' }
        window.__dl.push(entry)
        blob?.text().then((t) => { entry.text = t })
      }
      return click.apply(this, arguments)
    }
  })
}
const downloads = (page) => page.evaluate(() => window.__dl)

test.describe('Semantic Colour · Download', () => {
  test('1440: the control is on the toolbar row, quiet, and the row does not wrap', async ({ page }) => {
    watch(page, 'designer looking for the CSS')
    await open(page, 1440)
    await expect(trigger(page), 'the Download button is not on the toolbar').toBeVisible()
    await expect(trigger(page)).toHaveAccessibleName(LABEL)
    await expect(trigger(page), 'the page has one accent fill, Copy tokens').toHaveClass(/tl-btn--quiet/)
    const r = await readRow(page)
    expect(r.spread, 'toolbar children sit on more than one line').toBeLessThanOrEqual(2)
    expect(r.height, 'the toolbar is a second row tall').toBeLessThan(72)
    expect(r.right, 'the toolbar runs past the screen').toBeLessThanOrEqual(r.vw)

    await trigger(page).click()
    await expect(page.getByRole('menuitem')).toHaveText(['Download CSSFree account', 'Download HTMLFree account'])
    await expect(row(page, 'Download CSS')).toHaveAccessibleDescription('Free account')
  })

  test('390: the control is reachable (on the row or in More), the row does not wrap, targets are 44px', async ({ page }) => {
    watch(page, 'phone user looking for the CSS')
    await open(page, 390, 844)
    const r = await readRow(page)
    expect(r.spread, 'toolbar children sit on more than one line').toBeLessThanOrEqual(2)
    expect(r.height, 'the toolbar is a second row tall').toBeLessThan(72)
    expect(r.right, 'the toolbar runs past the screen').toBeLessThanOrEqual(r.vw)

    const get = await reach(page)
    for (const name of ['Download CSS', 'Download HTML']) {
      const box = await get(name).first().boundingBox()
      expect(box, `${name} is not on screen`).toBeTruthy()
      expect(box.height, `${name} is under the 44px touch floor`).toBeGreaterThanOrEqual(44)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), 'the page scrolls sideways').toBe(false)
  })

  test('signed out, both downloads show the account prompt and hand over no file; Copy tokens needs none', async ({ page }) => {
    watch(page, 'someone trying the tool before signing up')
    await open(page, 1440)
    await watchDownloads(page)

    for (const name of ['Download CSS', 'Download HTML']) {
      await trigger(page).click()
      await row(page, name).click()
      await expect(page.locator('#ui-login-title'), `${name} was a dead item signed out`).toBeVisible({ timeout: 10000 })
      await page.keyboard.press('Escape')
      await expect(page.locator('#ui-login-title')).toHaveCount(0)
    }
    expect(await downloads(page), 'a file left without an account').toEqual([])

    await page.getByRole('button', { name: 'Copy tokens' }).click()
    expect(await clipboard(page)).toMatch(/^:root \{/)
    expect(await loginOpen(page), 'copying is free; it must not open the sign-in dialog').toBe(false)
  })

  test('signed in, the CSS file is exactly what Copy tokens copies and the HTML lists every visible role', async ({ page }) => {
    watch(page, 'designer with an account')
    await signIn(page, {})
    await open(page, 1440)
    await watchDownloads(page)

    await page.getByRole('button', { name: 'Copy tokens' }).click()
    const copied = await clipboard(page)
    expect(copied).toMatch(/^:root \{/)

    await trigger(page).click()
    await expect(page.locator('.tl-menu-row-hint'), 'signed in, no row asks for an account').toHaveCount(0)
    await row(page, 'Download CSS').click()
    await trigger(page).click()
    await row(page, 'Download HTML').click()

    await expect.poll(async () => (await downloads(page)).length, { message: 'the two files were not produced' }).toBe(2)
    await expect.poll(async () => (await downloads(page)).every((f) => f.text !== '')).toBe(true)
    const [css, html] = await downloads(page)
    expect(css.name).toMatch(/-colour-system\.css$/)
    expect(css.type).toContain('text/css')
    expect(html.name).toMatch(/-colour-system\.html$/)
    expect(html.type).toContain('text/html')
    const lf = (s) => s.replace(/\r\n/g, '\n').trim()
    expect(lf(css.text), 'the file is not the text Copy tokens copies').toBe(lf(copied))
    expect(css.text, 'no hidden palette or tint variables').not.toMatch(/--tint-|--color-(primary|secondary|accent|neutral|surface):/)

    expect(html.text).toMatch(/^<!DOCTYPE html>/)
    expect(html.text, 'the sheet is self-contained').not.toMatch(/<script|<link|https?:\/\//)
    // Every visible role and step: its variable, and the hex the copied text gives it.
    for (const role of ROLES) {
      for (const step of STEPS) {
        const name = `--color-${role}-${step}`
        const hex = copied.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6});`))?.[1]
        expect(hex, `${name} is missing from Copy tokens`).toBeTruthy()
        expect(html.text, `${name} is missing from the swatch sheet`).toContain(`<code>${name}</code>`)
        expect(html.text.toUpperCase(), `${name}'s hex ${hex} is missing from the swatch sheet`).toContain(hex.toUpperCase())
      }
    }
    for (const label of ['Success', 'Warning', 'Error', 'Information']) {
      expect(html.text, `${label} is missing from the swatch sheet`).toContain(`>${label}</h2>`)
    }
    expect(await loginOpen(page)).toBe(false)
  })

  test('keyboard: Enter opens onto the first row, arrows move and wrap, Escape closes and refocuses the button', async ({ page }) => {
    watch(page, 'keyboard user')
    await open(page, 1440)
    await expect(trigger(page)).toBeVisible()

    await trigger(page).focus()
    await page.keyboard.press('Enter')
    await expect(row(page, 'Download CSS')).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(row(page, 'Download HTML')).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(row(page, 'Download CSS'), 'the arrows wrap').toBeFocused()
    await page.keyboard.press('ArrowUp')
    await expect(row(page, 'Download HTML')).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('menu')).toHaveCount(0)
    await expect(trigger(page)).toBeFocused()

    // ArrowUp on the closed button opens onto the last row.
    await page.keyboard.press('ArrowUp')
    await expect(row(page, 'Download HTML')).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(trigger(page)).toBeFocused()
  })
})
