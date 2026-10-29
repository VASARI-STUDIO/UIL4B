// THE PRO PREVIEW SWAPS COPY SVG FOR UPGRADE TO PRO, AND NOTHING ELSE MOVES.
//
// A free or signed-out viewer who previews a Pro setting (Sharp, Crisp, a mixed pair, a custom size)
// keeps working. In the same frame:
//   - the primary button is the SAME node, now named "Upgrade to Pro" with aria-haspopup="dialog";
//     focus is not moved (it stays on the Sharp tile) and the foot does not change width;
//   - Download SVG (both parts), Save to project and the code's Copy are aria-disabled, still in the
//     tab order, and Enter, Space and click on them change nothing;
//   - #icust-preview-line (a live region) says what is Pro and holds "Back to free settings".
// Upgrade to Pro opens the shared upgrade popup with the title for the gate hit, over a proof that
// draws the viewer's own icon. Escape closes only that popup and focus returns to Upgrade to Pro.
// Back to free settings restores Round and the last preset, keeps every other setting, and focuses
// Copy SVG. Leaving for /plans and coming Back reopens the popup as it was. Pro viewers never see
// a preview; signed-out viewers get exactly what free viewers get.
//
// HOW TO SEE EACH FAIL (src/utils/iconProPreview.js, src/components/library/SplitDownload.jsx,
// src/pages/IconLibrary.jsx):
//   proPreview ignores isPro                                  -> "a Pro viewer never sees a preview"
//   the `blocked` guard in SplitDownload's onClick is dropped  -> "Enter and Space on a dimmed button ..."
//   backToFree drops `primaryRef.current?.focus()`             -> "Back to free settings restores ..."
//   the primary becomes a second <button> (a key on it)        -> "the primary is the same node ..."
//   the gate for a size alone becomes icon-line-style          -> "Upgrade to Pro opens the popup that names what was hit"
//   the proof prop is not passed to openProModal               -> the same test: no icon in the popup
//   the popup's Escape no longer stops propagation             -> "Escape closes only the upgrade popup ..."
//   writePreviewDraft is not called                            -> "going to /plans and back ..."
//   the @media(max-width:780px) and (max-height:800px) rule that hides .ui-pro--proof .ui-pro-proof
//     is removed (src/styles/global.css)                       -> "on a 390 by 780 phone the upgrade popup shows its trial button ..."
//   readPreviewDraft stops requiring the stamp (iconPreviewDraft.js) -> "a reload, or the address typed again, opens no preview ..."
//   src restored byte for byte                                 -> all of them pass again.
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'
import { withAvailability } from './price-payload.js'

const PERSONA = 'someone previewing a Pro icon setting'
const SHARP = 'Sharp is a Pro line style. Preview it here; saving and export need Pro.'
const SIZE = 'Custom sizes are Pro. Preview them here; saving and export need Pro.'
const BOTH = 'Custom ends, corners and sizes are Pro. Preview them here; saving and export need Pro.'
const FREE_AGAIN = 'Back to free settings. Copy, download and save are on.'

/** Open the customiser on the first icon as a free viewer, a signed-out one (plan null), or Pro. */
async function openAs(browser, plan, viewport = { width: 1440, height: 900 }) {
  const ctx = await browser.newContext({ colorScheme: 'dark', viewport })
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {})
  const page = await ctx.newPage()
  watch(page, PERSONA)
  await page.addInitScript(() => {
    window.__clipboardWrites = []
    const orig = navigator.clipboard.writeText.bind(navigator.clipboard)
    navigator.clipboard.writeText = (text) => { window.__clipboardWrites.push(text); return orig(text) }
  })
  const downloads = { count: 0 }
  page.on('download', () => { downloads.count += 1 })
  if (plan) await signIn(page, { plan })
  await go(page, '/create/icons')
  const cell = page.locator('.ig .ic').first()
  await expect(cell).toBeVisible({ timeout: 20_000 })
  await cell.click()
  await expect(page.locator('.icust-stage')).toBeVisible({ timeout: 20_000 })
  await expect(page.locator('.icust-line-tile svg').first()).toBeVisible({ timeout: 20_000 })
  await expect(page.locator('.icust-size-cell[data-s="16"] svg')).toBeVisible({ timeout: 20_000 })
  await expect(primary(page)).toBeEnabled({ timeout: 20_000 })
  return { ctx, page, downloads }
}

const primary = (page) => page.locator('.icust-copy')
const line = (page) => page.locator('#icust-preview-line')
const back = (page) => page.getByRole('button', { name: 'Back to free settings', exact: true })
const group = (page) => page.getByRole('radiogroup', { name: 'Line style' })
const tile = (page, name) => group(page).getByRole('radio', { name: new RegExp(`^${name}`) })
const sizeGroup = (page) => page.getByRole('radiogroup', { name: 'Export size' })
const customRadio = (page) => sizeGroup(page).getByRole('radio', { name: /^Custom(,|$)/ })
const sizeInput = (page) => page.getByRole('textbox', { name: 'Custom size' })
const dimmed = (page) => ({
  'the code Copy': page.locator('.icust-code-box'),
  'Download SVG': page.getByRole('button', { name: 'Download SVG', exact: true }),
  'Download formats': page.getByRole('button', { name: 'Download formats', exact: true }),
  'Save to project': page.getByRole('button', { name: 'Save to project', exact: true }),
})
const upgradeDialog = (page, title) => page.getByRole('dialog', { name: title, exact: true })
const customiser = (page) => page.locator('.icust-panel')
const stageCap = (page) => page.locator('.icust-stage').evaluate((el) => el.style.getPropertyValue('--ig-cap'))

async function commitSize(page, n) {
  await customRadio(page).click()
  await sizeInput(page).fill(String(n))
  await sizeInput(page).press('Enter')
}

const VIEWERS = [['a signed-in free viewer', 'free'], ['a signed-out viewer', null]]

for (const [who, plan] of VIEWERS) {
  test.describe(who, () => {
    test('pressing Sharp keeps focus on the tile and swaps the one primary node to Upgrade to Pro without moving the foot', async ({ browser }) => {
      const { ctx, page } = await openAs(browser, plan)
      await expect(primary(page)).toHaveAccessibleName('Copy SVG')
      await expect(primary(page)).not.toHaveAttribute('aria-haspopup', /.*/)

      // Mark the node in the page, and keep a handle to it: both must still be the live primary.
      await primary(page).evaluate((el) => { el.dataset.swapMarker = 'same-node' })
      const handle = await primary(page).elementHandle()
      const before = {
        button: (await primary(page).boundingBox()).width,
        foot: (await page.locator('.icust-foot').boundingBox()).width,
        x: (await primary(page).boundingBox()).x,
      }
      const dialogs = await page.locator('[role="dialog"]').count()

      await tile(page, 'Sharp').click()
      await expect(tile(page, 'Sharp')).toHaveAttribute('aria-checked', 'true')
      await expect(primary(page)).toHaveAccessibleName('Upgrade to Pro')
      await expect(primary(page)).toHaveAttribute('aria-haspopup', 'dialog')
      await expect(line(page)).toHaveText(SHARP)

      expect(await stageCap(page), 'the stage shows square ends').toBe('square')
      await expect(tile(page, 'Sharp'), 'the swap moved focus').toBeFocused()
      await expect(page.locator('[role="dialog"]'), 'pressing Sharp opened a dialog').toHaveCount(dialogs)

      expect(await handle.evaluate((el) => el.isConnected), 'the old primary node was thrown away').toBe(true)
      expect(await handle.evaluate((el) => el.dataset.swapMarker), 'the old node lost its marker').toBe('same-node')
      expect(await primary(page).evaluate((el) => el.dataset.swapMarker), 'the primary now is a different node').toBe('same-node')
      expect(await primary(page).evaluate((el, h) => el === h, handle)).toBe(true)

      const after = {
        button: (await primary(page).boundingBox()).width,
        foot: (await page.locator('.icust-foot').boundingBox()).width,
        x: (await primary(page).boundingBox()).x,
      }
      expect(Math.abs(after.button - before.button), 'the button changed width with its label (measured: 1.7px from the faces sizing, see the report)').toBeLessThan(3)
      expect(after.foot, 'the foot changed width').toBeCloseTo(before.foot, 0)
      expect(after.x, 'the button moved sideways').toBeCloseTo(before.x, 0)
      await ctx.close()
    })

    test('the swap is not an ambush: arrowing Round to Sharp to Crisp and back keeps focus in the tiles', async ({ browser }) => {
      const { ctx, page } = await openAs(browser, plan)
      await tile(page, 'Round').focus()
      await page.keyboard.press('ArrowRight')
      await expect(tile(page, 'Sharp')).toBeFocused()
      await expect(primary(page)).toHaveAccessibleName('Upgrade to Pro')
      await page.keyboard.press('ArrowRight')
      await expect(tile(page, 'Crisp')).toBeFocused()
      await page.keyboard.press('ArrowLeft')
      await page.keyboard.press('ArrowLeft')
      await expect(tile(page, 'Round')).toBeFocused()
      await expect(primary(page), 'back on Round, the button is Copy SVG again').toHaveAccessibleName('Copy SVG')
      await expect(tile(page, 'Round'), 'focus was pulled away').toBeFocused()
      await ctx.close()
    })

    test('Download, Save and the code Copy stay in the tab order, are aria-disabled, and Enter and Space on them change nothing', async ({ browser }) => {
      const { ctx, page, downloads } = await openAs(browser, plan)
      await tile(page, 'Sharp').click()
      await expect(line(page)).toHaveText(SHARP)

      // Tab order through the code and the foot: code Copy, Back, Upgrade, Download SVG, Download formats, Save.
      const d = dimmed(page)
      await d['the code Copy'].focus()
      await expect(d['the code Copy']).toBeFocused()
      for (const [label, next] of [
        ['Back to free settings', back(page)],
        ['Upgrade to Pro', primary(page)],
        ['Download SVG', d['Download SVG']],
        ['Download formats', d['Download formats']],
        ['Save to project', d['Save to project']],
      ]) {
        await page.keyboard.press('Tab')
        await expect(next, `Tab did not reach ${label}`).toBeFocused()
      }

      const dialogs = await page.locator('[role="dialog"]').count()
      for (const [label, button] of Object.entries(d)) {
        await expect(button, `${label} is dimmed`).toHaveAttribute('aria-disabled', 'true')
        await expect(button, `${label} is a real button the Tab key can reach`).not.toHaveAttribute('disabled', /.*/)
        await expect(button, `${label} points at the reason`).toHaveAttribute('aria-describedby', 'icust-preview-line')
        await button.focus()
        for (const key of ['Enter', 'Space']) {
          await page.keyboard.press(key)
          await expect(button, `${key} on ${label} moved focus`).toBeFocused()
        }
      }
      // ArrowDown is how the formats menu opens.
      await d['Download formats'].focus()
      await page.keyboard.press('ArrowDown')
      await page.waitForTimeout(250)

      expect(await page.evaluate(() => window.__clipboardWrites), 'something reached the clipboard').toEqual([])
      expect(downloads.count, 'a file was downloaded').toBe(0)
      await expect(page.locator('[role="menu"]'), 'the formats menu opened').toHaveCount(0)
      await expect(page.locator('[role="dialog"]'), 'a dialog or save picker opened').toHaveCount(dialogs)
      await expect(page.getByRole('button', { name: /Copied!/ })).toHaveCount(0)
      await expect(line(page), 'the preview changed').toHaveText(SHARP)
      await expect(primary(page)).toHaveAccessibleName('Upgrade to Pro')
      await ctx.close()
    })

    for (const c of [
      { name: 'a line style alone', title: 'Export icons in Sharp and Crisp', caption: 'Sharp', cap: 'square', setup: async (page) => { await tile(page, 'Sharp').click() } },
      { name: 'a size alone', title: 'Export icons at any size', caption: 'Exports at 40px', cap: 'round', setup: async (page) => { await commitSize(page, 40) } },
      { name: 'both', title: 'Export your Pro settings', caption: 'Sharp, 40px', cap: 'square', setup: async (page) => { await tile(page, 'Sharp').click(); await commitSize(page, 40) } },
    ]) {
      test(`Upgrade to Pro opens the popup that names what was hit (${c.name}), over a picture of the icon`, async ({ browser }) => {
        const { ctx, page } = await openAs(browser, plan)
        await c.setup(page)
        await expect(primary(page)).toHaveAccessibleName('Upgrade to Pro')
        await primary(page).click()

        const dialog = upgradeDialog(page, c.title)
        await expect(dialog, `no popup titled "${c.title}"`).toBeVisible()
        const proof = dialog.locator('.ui-pro-proof')
        await expect(proof, 'no proof of the icon').toBeVisible()
        await expect(proof.locator('.ui-pro-proof-cap')).toHaveText(c.caption)
        const art = proof.locator('.ui-pro-proof-art img')
        await expect(art).toBeVisible()
        expect(await art.evaluate((img) => ({ done: img.complete, w: img.naturalWidth, shown: Math.round(img.getBoundingClientRect().width) })), 'the picture did not draw').toMatchObject({ done: true })
        expect(await art.evaluate((img) => img.naturalWidth), 'the picture is empty').toBeGreaterThan(0)
        expect(await art.evaluate((img) => img.getBoundingClientRect().width), 'the picture is too small to read').toBeGreaterThanOrEqual(48)
        const drawn = decodeURIComponent((await art.getAttribute('src')).replace(/^data:image\/svg\+xml[^,]*,/, ''))
        expect(drawn, 'the picture is not the icon in the previewed ends').toContain(`stroke-linecap="${c.cap}"`)
        expect(drawn).toContain('width="64"')

        await dialog.getByRole('button', { name: 'Close', exact: true }).click()
        await expect(dialog).toHaveCount(0)
        await expect(primary(page), 'closing the popup did not return focus to Upgrade').toBeFocused()
        await ctx.close()
      })
    }

    test('Escape closes only the upgrade popup, focus returns to Upgrade to Pro, and the customiser still previews', async ({ browser }) => {
      const { ctx, page } = await openAs(browser, plan)
      await tile(page, 'Sharp').click()
      await primary(page).click()
      const dialog = upgradeDialog(page, 'Export icons in Sharp and Crisp')
      await expect(dialog).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(dialog).toHaveCount(0)
      await expect(customiser(page), 'Escape closed the customiser too').toBeVisible()
      await expect(primary(page)).toBeFocused()
      await expect(primary(page)).toHaveAccessibleName('Upgrade to Pro')
      await expect(line(page)).toHaveText(SHARP)
      await expect(tile(page, 'Sharp')).toHaveAttribute('aria-checked', 'true')
      await ctx.close()
    })

    test('Back to free settings restores Round and the preset, keeps the rest, focuses Copy SVG, and Copy works again', async ({ browser }) => {
      const { ctx, page } = await openAs(browser, plan)
      await sizeGroup(page).getByRole('radio', { name: '32 pixels' }).click()
      await page.locator('.icust-seg button', { hasText: 'Horizontal' }).click()
      await tile(page, 'Sharp').click()
      await commitSize(page, 40)
      await expect(line(page)).toHaveText(BOTH)

      await back(page).click()
      await expect(tile(page, 'Round'), 'line style is not Round').toHaveAttribute('aria-checked', 'true')
      await expect(sizeGroup(page).getByRole('radio', { name: '32 pixels' }), 'size is not the last preset').toHaveAttribute('aria-checked', 'true')
      await expect(page.locator('.icust-size-custom'), 'the custom row stayed open').toHaveCount(0)
      await expect(page.locator('.icust-seg button', { hasText: 'Horizontal' }), 'another setting was reset').toHaveAttribute('aria-pressed', 'true')
      await expect(primary(page)).toHaveAccessibleName('Copy SVG')
      await expect(primary(page), 'focus did not land on Copy SVG').toBeFocused()
      await expect(back(page)).toHaveCount(0)
      await expect(line(page), 'the live region did not announce leaving').toHaveText(FREE_AGAIN)
      await expect(line(page)).toHaveAttribute('aria-live', 'polite')
      for (const [label, button] of Object.entries(dimmed(page))) await expect(button, `${label} did not come back`).toBeEnabled()

      await primary(page).click()
      await expect.poll(() => page.evaluate(() => window.__clipboardWrites.length), { timeout: 10_000 }).toBeGreaterThan(0)
      const written = await page.evaluate(() => window.__clipboardWrites.at(-1))
      expect(written).toMatch(/<svg[^>]* width="32" height="32"/)
      expect(written).toMatch(/stroke-linecap="round"/)
      await ctx.close()
    })

    test('Back to free settings with no preset chosen returns to 24, from the keyboard', async ({ browser }) => {
      const { ctx, page } = await openAs(browser, plan)
      await tile(page, 'Crisp').click()
      await commitSize(page, 100)
      await expect(primary(page)).toHaveAccessibleName('Upgrade to Pro')
      await back(page).focus()
      await page.keyboard.press('Enter')
      await expect(sizeGroup(page).getByRole('radio', { name: '24 pixels' })).toHaveAttribute('aria-checked', 'true')
      await expect(tile(page, 'Round')).toHaveAttribute('aria-checked', 'true')
      await expect(primary(page), 'focus fell to the page').toBeFocused()
      await expect(primary(page)).toHaveAccessibleName('Copy SVG')
      await ctx.close()
    })

    test('going to /plans and back reopens the popup with the settings kept, and closing it forgets them', async ({ browser }) => {
      const { ctx, page } = await openAs(browser, plan)
      await sizeGroup(page).getByRole('radio', { name: '32 pixels' }).click()
      await tile(page, 'Sharp').click()
      await commitSize(page, 40)
      await page.locator('.icust-seg button', { hasText: 'Vertical' }).click()
      await expect(line(page)).toHaveText(BOTH)
      const name = await customiser(page).getAttribute('aria-labelledby').then((id) => page.locator(`#${id}`).innerText())

      await primary(page).click()
      await upgradeDialog(page, 'Export your Pro settings').getByRole('button', { name: 'See all plans' }).click()
      await expect(page).toHaveURL(/\/plans$/)
      await page.goBack()

      await expect(customiser(page), 'the popup did not reopen').toBeVisible({ timeout: 20_000 })
      await expect(page.locator('#icust-title')).toHaveText(name)
      await expect(tile(page, 'Sharp')).toHaveAttribute('aria-checked', 'true')
      await expect(customRadio(page)).toHaveAccessibleName('Custom, 40 pixels')
      await expect(page.locator('.icust-seg button', { hasText: 'Vertical' })).toHaveAttribute('aria-pressed', 'true')
      await expect(primary(page)).toHaveAccessibleName('Upgrade to Pro')
      await expect(line(page)).toHaveText(BOTH)

      // Closing the popup drops the kept preview: a second trip to /plans and back opens nothing.
      await page.getByRole('button', { name: 'Close customizer' }).click()
      await expect(customiser(page)).toHaveCount(0)
      await page.evaluate(() => { window.history.pushState({}, '', '/plans') })
      await page.goBack()
      await expect(page.locator('.ig .ic').first()).toBeVisible({ timeout: 20_000 })
      await expect(customiser(page), 'a closed preview came back').toHaveCount(0)
      expect(await page.evaluate(() => sessionStorage.getItem('vs-icon-draft')), 'the draft was not cleared').toBeNull()
      await ctx.close()
    })

    test('a reload, or the address typed again, opens no preview: only the way back from /plans does', async ({ browser }) => {
      const { ctx, page } = await openAs(browser, plan)
      await commitSize(page, 40)
      await primary(page).click()
      // The popup is open but nobody has left yet: the draft exists and is not stamped.
      await expect(upgradeDialog(page, 'Export icons at any size')).toBeVisible()
      expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('vs-icon-draft')).leftAt), 'stamped before leaving').toBeUndefined()
      await page.reload()
      await expect(page.locator('.ig .ic').first()).toBeVisible({ timeout: 20_000 })
      await expect(customiser(page), 'a reload reopened the preview').toHaveCount(0)
      expect(await page.evaluate(() => sessionStorage.getItem('vs-icon-draft')), 'the stale draft was kept').toBeNull()
      await ctx.close()
    })

    test('on a 390 by 780 phone the upgrade popup shows its trial button and Maybe later without scrolling', async ({ browser }) => {
      const { ctx, page } = await openAs(browser, plan, { width: 390, height: 780 })
      // The suite's preview has no serverless functions; without prices the popup shows an outage
      // note and no buttons. Production's own answer shape, monthly and yearly (yearly carries the trial).
      await page.route('**/api/get-prices', (route) => route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify(withAvailability({ source: { monthly: 'live', yearly: 'live' }, monthly: { usd: 7 }, yearly: { usd: 48 } })),
      }))
      await tile(page, 'Sharp').click()
      await commitSize(page, 40)
      await primary(page).click()
      const dialog = upgradeDialog(page, 'Export your Pro settings')
      await expect(dialog).toBeVisible()
      const trial = dialog.getByRole('button', { name: 'Start your 7-day free trial', exact: true })
      const later = dialog.getByRole('button', { name: 'Maybe later', exact: true })
      await expect(trial).toBeVisible()
      // Whole buttons, inside the window as it stands: no scroll of the popup or the page has happened.
      await expect(trial, 'the trial button is below the fold').toBeInViewport({ ratio: 1 })
      await expect(later, 'Maybe later is below the fold').toBeInViewport({ ratio: 1 })
      const box = await later.boundingBox()
      expect(box.y + box.height, 'Maybe later ends past the bottom of the window').toBeLessThanOrEqual(780)
      await ctx.close()
    })

    test('a size outside a preset alone says so, and Crisp or a mixed pair name themselves', async ({ browser }) => {
      const { ctx, page } = await openAs(browser, plan)
      await commitSize(page, 40)
      await expect(line(page)).toHaveText(SIZE)
      await tile(page, 'Crisp').click()
      await expect(line(page)).toHaveText(BOTH)
      await back(page).click()
      await page.getByRole('button', { name: 'Set ends and corners separately' }).click()
      await page.getByRole('radiogroup', { name: 'Ends' }).getByRole('radio', { name: 'Square' }).click()
      await expect(line(page)).toHaveText('Custom ends and corners are Pro. Preview them here; saving and export need Pro.')
      await ctx.close()
    })
  })
}

test('a Pro viewer never sees a preview: no line, Copy SVG stays, and Sharp at 40 exports', async ({ browser }) => {
  const { ctx, page } = await openAs(browser, 'pro')
  await tile(page, 'Sharp').click()
  await commitSize(page, 40)
  await expect(tile(page, 'Sharp')).toHaveAttribute('aria-checked', 'true')
  await expect(line(page), 'a Pro viewer got a preview line').toHaveText('')
  await expect(back(page)).toHaveCount(0)
  await expect(primary(page)).toHaveAccessibleName('Copy SVG')
  await expect(primary(page)).not.toHaveAttribute('aria-haspopup', /.*/)
  for (const [label, button] of Object.entries(dimmed(page))) {
    await expect(button, `${label} is dimmed for Pro`).toBeEnabled()
    await expect(button).not.toHaveAttribute('aria-describedby', /.*/)
  }
  await primary(page).click()
  await expect.poll(() => page.evaluate(() => window.__clipboardWrites.length), { timeout: 10_000 }).toBeGreaterThan(0)
  const written = await page.evaluate(() => window.__clipboardWrites.at(-1))
  expect(written).toMatch(/<svg[^>]* width="40" height="40"/)
  expect(written).toMatch(/stroke-linecap="square"/)
  expect(written).toMatch(/stroke-linejoin="miter"/)
  await expect(page.locator('[role="dialog"]:not(.icust-panel)'), 'an upgrade popup opened for Pro').toHaveCount(0)
  await ctx.close()
})
