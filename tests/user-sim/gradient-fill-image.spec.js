import { readFile } from 'node:fs/promises'
import { test, expect } from './base.js'
import { go, signIn } from './helpers.js'

const finishes = {
  plain: 'Plain', aperture: 'Aperture', satin: 'Satin', folds: 'Folded paper',
  halftone: 'Halftone', grain: 'Grain', fluted: 'Fluted glass', ring: 'Glow ring',
  streak: 'Streak', glow: 'Soft glow', fade: 'Fade', mesh: 'Mesh', waves: 'Waves',
}

const cases = Object.entries(finishes).map(([id, label]) => ({ id, label }))
cases.push({ id: 'mesh', label: 'Mesh', mobile: true })

for (const { id, label, mobile } of cases) {
  test(`${label} PNG reproduces the active fill${mobile ? ' on mobile' : ''}`, async ({ page }, testInfo) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 })
    await signIn(page, { plan: 'pro' })
    await page.addInitScript(style => sessionStorage.setItem('vs-gradient-fill', style), id)
    await go(page, '/create/gradient?gs=F5AB66-0_D84674-38_403174-68_173E50-100&gt=' + (id === 'mesh' ? 'mesh' : 'conic') + '&ga=48')
    await expect(page.getByRole('button', { name: `Fill style: ${id === 'mesh' ? 'Plain' : label}` })).toBeVisible()
    const stage = page.locator('.grd-stage')
    const preview = await stage.screenshot({ style: '.grd-ctx,.grd-fx-cap { visibility:hidden }' })
    await page.getByRole('button', { name: 'Save or share' }).click()
    const pending = page.waitForEvent('download')
    await page.getByRole('button', { name: `Download ${label} PNG`, exact: false }).click()
    const download = await pending
    expect(download.suggestedFilename()).toMatch(new RegExp(`-gradient-${id}\\.png$`))
    const file = testInfo.outputPath(`${id}.png`)
    await download.saveAs(file)
    const png = await readFile(file)
    const error = await page.evaluate(async ([before, after]) => {
      async function sample(data) {
        const bitmap = await createImageBitmap(await (await fetch('data:image/png;base64,' + data)).blob())
        const ctx = new OffscreenCanvas(64, 40).getContext('2d')
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(bitmap, 0, 0, 64, 40)
        return { pixels: ctx.getImageData(0, 0, 64, 40).data, w: bitmap.width, h: bitmap.height }
      }
      const [a, b] = await Promise.all([sample(before), sample(after)])
      let difference = 0
      for (let y = 1; y < 39; y++) {
        for (let x = 1; x < 63; x++) {
          const offset = (y * 64 + x) * 4
          for (let c = 0; c < 4; c++) difference += Math.abs(a.pixels[offset + c] - b.pixels[offset + c])
        }
      }
      return { edge: Math.max(b.w, b.h), ratio: (b.w / b.h) / (a.w / a.h), difference: difference / (38 * 62 * 4) }
    }, [preview.toString('base64'), png.toString('base64')])
    expect(error.edge).toBe(2048)
    expect(error.ratio).toBeCloseTo(1, 1)
    expect(error.difference).toBeLessThan(5)
  })
}


test('the image action identifies the Pro export on a free account', async ({ page }) => {
  await signIn(page, { plan: 'free' })
  await go(page, '/create/gradient')
  await page.getByRole('button', { name: 'Save or share' }).click()
  await page.getByRole('button', { name: 'Download Plain PNG Pro' }).click()
  await expect(page.getByRole('heading', { name: 'Export your fill as an image' })).toBeVisible()
})
