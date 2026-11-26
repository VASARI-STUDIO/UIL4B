import { readFile } from 'node:fs/promises'
import { test, expect } from './base.js'
import { go, signIn } from './helpers.js'

const route = '/create/gradient?gs=FFDEA3-0_DD749B-40_7249A0-73_242A54-100&gt=linear&ga=128&src=link'

for (const [kind, label] of [['mesh', 'Mesh'], ['orb', 'Orb']]) {
  test(`${label} geometry survives edits, undo, reload and a shared link`, async ({ page, browser }, info) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
    await go(page, route)
    await page.getByRole('button', { name: 'Fill style: Plain' }).click()
    await page.getByRole('button', { name: label, exact: true }).click()
    await page.keyboard.press('Escape')
    const editor = page.locator('.grd-art-editor')
    const slider = editor.getByRole('slider', { name: /horizontal$/ })
    const original = await slider.inputValue()
    const map = editor.locator('.grd-art-map')
    const box = await map.boundingBox()
    await map.click({ position: { x: box.width * .58, y: box.height * .69 } })
    await expect(slider).toHaveValue('58')
    await page.keyboard.press('Control+z')
    await expect(slider).toHaveValue(original)
    await page.keyboard.press('Control+y')
    await expect(slider).toHaveValue('58')
    await editor.getByRole('slider', { name: /spread$|diameter$/ }).press('ArrowLeft')
    await expect(editor.getByRole('slider', { name: /spread$|diameter$/ })).toHaveValue(kind === 'orb' ? '73' : '99')
    await expect(page.getByRole('tab', { name: label + ' CSS' })).toHaveAttribute('aria-selected', 'true')
    await page.reload()
    await expect(editor.getByRole('slider', { name: /spread$|diameter$/ })).toHaveValue(kind === 'orb' ? '73' : '99')
    await expect(slider).toHaveValue('58')
    await page.getByRole('button', { name: 'Save or share' }).click()
    await page.getByRole('button', { name: 'Copy link to this gradient' }).click()
    const link = await page.evaluate(() => navigator.clipboard.readText())
    expect(JSON.parse(new URL(link).searchParams.get('sp'))[0].size).toBe(kind === 'orb' ? 73 : 99)
    const fresh = await browser.newContext({ viewport: { width: 390, height: 844 } })
    try {
      const phone = await fresh.newPage()
      await phone.goto(link)
      await expect(phone.getByRole('button', { name: `Fill style: ${label}` })).toBeVisible()
      await expect(phone.getByRole('slider', { name: /horizontal$/ })).toHaveValue('58')
      await expect(phone.getByRole('slider', { name: /spread$|diameter$/ })).toHaveValue(kind === 'orb' ? '73' : '99')
      expect(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await phone.screenshot({ path: info.outputPath(kind + '-phone.png') })
    } finally { await fresh.close() }
    await page.screenshot({ path: info.outputPath(kind + '-desktop.png') })
  })
}

test('the exported orb preserves a transparent exterior and the edited centre', async ({ page }, info) => {
  await signIn(page, { plan: 'pro' })
  await go(page, route + '&st=orb&sp=' + encodeURIComponent(JSON.stringify([{ x: 72, y: 50, size: 58 }])))
  await page.getByRole('button', { name: 'Save or share' }).click()
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: /Download Orb PNG/ }).click()
  const download = await pending
  const file = info.outputPath('orb.png')
  await download.saveAs(file)
  const alpha = await page.evaluate(async data => {
    const img = await createImageBitmap(await (await fetch('data:image/png;base64,' + data)).blob())
    const ctx = new OffscreenCanvas(100, 100).getContext('2d')
    ctx.drawImage(img, 0, 0, 100, 100)
    return [ctx.getImageData(2, 2, 1, 1).data[3], ctx.getImageData(72, 50, 1, 1).data[3]]
  }, (await readFile(file)).toString('base64'))
  expect(alpha).toEqual([0, 255])
})

test('saving a named project keeps its authored mesh geometry', async ({ page }) => {
  await signIn(page, { plan: 'free' })
  await go(page, route + '&st=mesh')
  const point = page.getByRole('button', { name: /^Select mesh point 2/ })
  await point.focus()
  await point.press('Enter')
  await page.getByRole('slider', { name: 'Point 2 spread' }).press('ArrowRight')
  await expect(page.getByRole('slider', { name: 'Point 2 spread' })).toHaveValue('101')
  await page.getByRole('button', { name: 'Save or share' }).click()
  const menu = page.getByRole('dialog', { name: 'Save, share and export this gradient' })
  await menu.getByLabel('Project name').fill('Night field')
  await menu.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(menu).toHaveCount(0)
  const artwork = await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem('vs-projects'))).flat()[0].design.gradient.artwork)
  expect(artwork.active).toBe('mesh')
  expect(artwork.mesh[1]).toEqual({ x: 88, y: 96, size: 101 })
})

test('a designer adds and recolours a mesh point from its inspector', async ({ page }) => {
  await go(page, route + '&st=mesh')
  const editor = page.getByRole('group', { name: 'Mesh points' })
  await editor.getByRole('button', { name: 'Add point' }).click()
  await expect(editor.getByRole('button', { name: /^Select mesh point/ })).toHaveCount(5)
  await editor.getByRole('button', { name: /Change point .* colour/ }).click()
  const dialog = page.getByRole('dialog', { name: /Change point .* colour/ })
  await dialog.getByRole('textbox', { name: 'Colour value' }).fill('#208381')
  await dialog.getByRole('textbox', { name: 'Colour value' }).press('Enter')
  await expect(page.getByLabel('Mesh CSS code')).toContainText('#208381')
})
