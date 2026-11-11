// A locked Pro preview must never deliver the real picture to the browser.
//
// A CSS blur over the real file is not a paywall: an image-saving extension, "Save image as"
// or a devtools edit gets the sharp file. So for a free account these surfaces load a tiny
// blurred stand-in (public/locked-images/, utils/lockedStandin.js) and the real address is
// in neither the page HTML nor the network.
//
// Two surfaces, with request capture:
//   - the Export dialog's book and guidelines previews in a Pro theme
//   - the community prompt gallery's locked cards (parked: skipped until the gallery is public, see its block below)
// A Pro account is the control: it must still get the real pictures, or the test would pass
// by loading nothing.
//
// To see it fail: in ThemeStage (ExportThemeRow.jsx) draw themeShots in place of themeStandinShots,
// or in PromptLockedCard.jsx use promptPosterSrc in place of promptStandinSrc.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'
import { chooseFormat, exportPanel } from './export-rows.js'

const BOARD = '/create/palette?c=1F4B8E,2E7BB8,3FA9A0'
// Not preceded by locked-images: the stand-in's path ends in the same /export-themes/<file> and must not count as the real one.
const REAL_THEME = /(?<!locked-images)\/export-themes\/[\w-]+-(book|guideCover|guidePalette)\.webp/
const STANDIN_THEME = /\/locked-images\/export-themes\/[\w-]+-(book|guideCover|guidePalette)\.webp/

function capture(page) {
  const urls = []
  page.on('request', (r) => urls.push(new URL(r.url()).pathname))
  return urls
}

async function openExport(page, plan, file) {
  await signIn(page, { plan })
  await go(page, BOARD)
  await page.getByRole('button', { name: 'Export', exact: true }).first().click()
  const panel = exportPanel(page)
  await expect(panel).toBeVisible()
  await chooseFormat(panel, file)
  return panel
}

async function chooseTheme(page, panel, name) {
  await panel.getByRole('button', { name: /^Change theme, current / }).click()
  await page.getByRole('listbox', { name: 'Theme' }).getByRole('option', { name: new RegExp(`^${name}\\b`) }).click()
}

test.describe('export dialog theme previews', () => {
  for (const file of ['book', 'guidelines']) {
    test(`${file} in a Pro theme: a free account never loads or holds the real pictures`, async ({ page }) => {
      watch(page, `a free account previewing the ${file} in a Pro theme, with requests captured`)
      const urls = capture(page)
      const panel = await openExport(page, 'free', file)
      await chooseTheme(page, panel, 'Studio')
      const stage = panel.locator('.xd-theme-stage')
      await expect(stage).toHaveClass(/is-locked/)
      for (const img of await stage.locator('img').all()) {
        await expect(img).toHaveAttribute('src', STANDIN_THEME)
        await expect.poll(() => img.evaluate((el) => el.complete && el.naturalWidth), 'the stand-in loads').toBeGreaterThan(0)
        expect(await img.evaluate((el) => el.naturalWidth), 'a stand-in too small to carry detail').toBeLessThanOrEqual(48)
      }
      const html = await page.content()
      expect(html.match(REAL_THEME) || [], 'the real theme picture is not in the page').toEqual([])
      expect(urls.filter((u) => REAL_THEME.test(u)), 'the real theme picture is not requested').toEqual([])
      expect(urls.some((u) => STANDIN_THEME.test(u)), 'the stand-in is what was requested').toBe(true)
    })

    test(`${file} in a Pro theme: a Pro account still gets the real pictures`, async ({ page }) => {
      watch(page, `a Pro account previewing the ${file} in a Pro theme`)
      const urls = capture(page)
      const panel = await openExport(page, 'pro', file)
      await chooseTheme(page, panel, 'Studio')
      const stage = panel.locator('.xd-theme-stage')
      await expect(stage).not.toHaveClass(/is-locked/)
      await expect(stage.locator('img').first()).toHaveAttribute('src', REAL_THEME)
      expect(urls.some((u) => REAL_THEME.test(u)), 'the real picture is requested for Pro').toBe(true)
    })
  }
})

// PARKED, like 45-prompt-library-gate: /discover/prompts opens for an admin only (App.jsx RequireAdmin), and an admin is
// always Pro, so no account that can open the gallery is shown a locked card. Until the gallery is public this test cannot
// reach the surface it checks; the address half is held by tests/unit/locked-standins.test.js.
test.describe('community prompt gallery', () => {
  test.skip(true, 'parked: admin-only, and an admin is Pro, so no locked card is reachable')

  test('locked cards load stand-ins, never the real poster, and the page has no real poster for them', async ({ page }) => {
    watch(page, 'a signed-out visitor on the prompt gallery, with requests captured')
    const urls = capture(page)
    await go(page, '/discover/prompts')
    // The locked cards and the end gate's faded rows (GateFadeCards) both show stand-ins.
    const locked = page.locator('.pl-locked-card .pl-card-poster, .pl-mosaic-tile.is-locked img, .geg-fade .geg-ph img')
    await expect(locked.first()).toBeAttached()
    const srcs = await locked.evaluateAll((els) => els.map((el) => el.getAttribute('src') || ''))
    expect(srcs.length, 'a free visitor sees locked previews').toBeGreaterThan(0)
    const ids = []
    for (const src of srcs) {
      expect(src, 'a locked poster is a stand-in').toMatch(/^\/locked-images\/prompts\/c-\d+\.webp$/)
      ids.push(src.match(/(c-\d+)\.webp$/)[1])
    }
    // Let lazy images and any preloads settle before reading the log.
    await page.waitForLoadState('networkidle')
    const html = await page.content()
    for (const id of ids) {
      expect(html, `the real poster of ${id} is not in the page`).not.toContain(`/previews/prompts/poster/${id}.webp`)
      expect(html, `the real animation of ${id} is not in the page`).not.toContain(`/previews/prompts/anim/${id}.webp`)
      expect(urls, `the real poster of ${id} is not requested`).not.toContain(`/previews/prompts/poster/${id}.webp`)
    }
  })
})
