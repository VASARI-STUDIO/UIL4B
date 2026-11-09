// THE THEME PICTURES: the preview under the Export dialog's Theme step.
//
// Each theme has pictures of its own sample brand's pages (public/export-themes/<theme>-<key>.webp): the UI kit shows an app
// screen and a buttons page, the book its first page, the slides a cover and a palette page. This spec checks, as a person sees it:
//
//   1. Every picture of every theme is served as a real webp (a missing file would answer 200 with the app's page, so the
//      content type and the first bytes are read).
//   2. The preview draws pictures of the chosen theme, and their alt names that theme and its sample brand.
//   3. For a free account the book and slides previews are blurred with a "Pro export" lock; the UI kit preview is sharp in a
//      Pro theme and the dock says "Pro theme". A Pro account sees none of it blurred.
//   4. At 390 neither the preview nor the Theme step pushes the page or the dialog sideways.
//
// MUTATION
//   - exportThemePicker.js: themeShots points at '.png'                  -> tests 1 and 2
//   - ExportSteps (Preview): locked is always false for a free account   -> test 3
//   - export-dialog.css: .xd-theme-stage.is-locked img loses its blur    -> test 3
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'
import { chooseFormat, exportPanel } from './export-rows.js'

const BOARD = '/create/palette?c=1F4B8E,2E7BB8,3FA9A0'
const THEMES = [
  ['01-presentation', 'Presentation', 'Kerbside'], ['02-poster', 'Ticket', 'Encore'], ['03-broadsheet', 'Broadsheet', 'Saltbush'],
  ['04-standards', 'Standards', 'Two Shores'], ['05-specimen', 'Catalogue', 'Margin'], ['06-studio', 'Studio', 'Offcut'],
  ['07-spec', 'Specification', 'Northern Current'], ['08-monograph', 'Riso', 'Long Room'], ['09-blueprint', 'Blueprint', 'Plumbline'],
  ['10-inuse', 'In use', 'Shallow End'],
]
const KEYS = { kit: ['kitScreen', 'kitButtons'], book: ['book'], guidelines: ['guideCover', 'guidePalette'] }

async function open(page, plan, file, size) {
  if (size) await page.setViewportSize(size)
  await signIn(page, { plan })
  await go(page, BOARD)
  await page.getByRole('button', { name: 'Export', exact: true }).first().click()
  const panel = exportPanel(page)
  await expect(panel).toBeVisible()
  await chooseFormat(panel, file)
  return panel
}
const change = (panel) => panel.getByRole('button', { name: /^Change theme, current / })
async function choose(page, panel, name) {
  await change(panel).click()
  await page.getByRole('listbox', { name: 'Theme' }).getByRole('option', { name: new RegExp(`^${name}\\b`) }).click()
  await expect(change(panel)).toHaveAccessibleName(`Change theme, current ${name}`)
}

for (const [kind, keys] of Object.entries(KEYS)) {
  test(`every ${kind} picture of every theme is served as a real webp`, async ({ page }) => {
    watch(page, `checking the ${kind} theme pictures`)
    await go(page, BOARD)
    for (const [id] of THEMES) {
      for (const key of keys) {
        const res = await page.request.get(`/export-themes/${id}-${key}.webp`)
        expect(res.status(), `${id}-${key}`).toBe(200)
        expect(res.headers()['content-type'], `${id}-${key}`).toBe('image/webp')
        const bytes = await res.body()
        expect(bytes.subarray(0, 4).toString('latin1'), `${id}-${key} starts RIFF`).toBe('RIFF')
        expect(bytes.subarray(8, 12).toString('latin1'), `${id}-${key} is WEBP`).toBe('WEBP')
      }
    }
  })

  test(`the ${kind} preview draws the chosen theme’s pictures, named by theme and sample brand`, async ({ page }) => {
    watch(page, `a Pro account moving through the themes on ${kind}`)
    const panel = await open(page, 'pro', kind)
    for (const [id, name, brand] of [THEMES[0], THEMES[3], THEMES[9]]) {
      if (id !== '01-presentation') await choose(page, panel, name)
      const shots = panel.locator('.xd-theme-stage img')
      await expect(shots).toHaveCount(keys.length)
      for (const [i, key] of keys.entries()) {
        await expect(shots.nth(i)).toHaveAttribute('src', `/export-themes/${id}-${key}.webp`)
        await expect(shots.nth(i)).toHaveAttribute('alt', new RegExp(`^${name} theme .*shown with the ${brand} sample brand$`))
        await expect.poll(() => shots.nth(i).evaluate((el) => el.complete && el.naturalWidth), `${id}-${key} loads`).toBeGreaterThan(0)
      }
    }
  })
}

test.describe('blur and lock', () => {
  for (const file of ['book', 'guidelines']) {
    for (const [, name] of [THEMES[0], THEMES[3], THEMES[6], THEMES[9]]) {
      test(`${file} in ${name}: free sees it blurred and locked, Pro sees it sharp`, async ({ page, browser }) => {
        watch(page, `a free account looking at the ${file} preview in ${name}`)
        const panel = await open(page, 'free', file)
        await choose(page, panel, name)
        const stage = panel.locator('.xd-theme-stage')
        await expect(stage).toHaveClass(/is-locked/)
        await expect(panel.locator('.xd-theme-lock')).toHaveText('Pro export')
        for (const img of await stage.locator('img').all()) expect(await img.evaluate((el) => getComputedStyle(el).filter)).toMatch(/blur\(\d+px\)/)

        const ctx = await browser.newContext()
        const proPage = await ctx.newPage()
        watch(proPage, `a Pro account looking at the ${file} preview in ${name}`)
        const proPanel = await open(proPage, 'pro', file)
        await choose(proPage, proPanel, name)
        await expect(proPanel.locator('.xd-theme-stage')).not.toHaveClass(/is-locked/)
        await expect(proPanel.locator('.xd-theme-lock')).toHaveCount(0)
        expect(await proPanel.locator('.xd-theme-stage img').first().evaluate((el) => getComputedStyle(el).filter)).toBe('none')
        await ctx.close()
      })
    }
  }

  test('free: the UI kit preview is sharp even in a Pro theme, and the dock says Pro theme', async ({ page }) => {
    watch(page, 'a free account looking at the kit in a Pro theme')
    const panel = await open(page, 'free', 'kit')
    await choose(page, panel, 'Studio')
    await expect(panel.locator('.xd-theme-stage')).not.toHaveClass(/is-locked/)
    expect(await panel.locator('.xd-theme-stage img').first().evaluate((el) => getComputedStyle(el).filter)).toBe('none')
    await expect(panel.locator('.xd-dock')).toContainText('Pro theme.')
  })
})

for (const file of ['kit', 'book', 'guidelines']) {
  test(`at 390 the ${file} preview and the Theme step stay inside the dialog with no sideways scroll`, async ({ page }) => {
    watch(page, `a phone user on ${file}`)
    const panel = await open(page, 'pro', file, { width: 390, height: 844 })
    for (const name of ['Standards', 'Catalogue', 'Presentation']) {
      await choose(page, panel, name)
      const fit = await page.evaluate(() => {
        const card = document.querySelector('.xd-card').getBoundingClientRect()
        const stage = document.querySelector('.xd-theme-stage').getBoundingClientRect()
        return { sideways: document.documentElement.scrollWidth > document.documentElement.clientWidth, inside: stage.left >= card.left - 1 && stage.right <= card.right + 1 }
      })
      expect(fit, name).toEqual({ sideways: false, inside: true })
    }
  })
}
