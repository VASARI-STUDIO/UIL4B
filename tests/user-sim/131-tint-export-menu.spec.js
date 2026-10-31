// /create/tint — the "Copy or save" menu replaces the old "Copy variables" button.
//
// One accent pill in the toolbar opens Copy CSS, Save to project and Download.
// Copy is free for anybody; saving and taking a file away ask for an account
// (the same gates the other tools use), so a signed-out press opens the
// sign-in dialog rather than doing nothing.
//
// Seam: the Copy or save button (`.tl-export-btn`) and the rows it opens. The page
// also carries the app header's own "Export" button (the whole design system), so
// the toolbar one is named differently and is still found by its class.
//
// MUTATIONS (each should turn a case red):
//   * drop `onSelect` from the Download row -> "Download hands over a .css file"
//   * call saveProject without the `patch` -> "Save to project keeps the ramp"
//   * remove the useGatedDownload gate -> "signed out, Download asks for an account"
//   * remove the ArrowUp branch in ExportMenu's onTriggerKey -> the keyboard case
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'

const trigger = (page) => page.locator('.tl-export-btn')
const row = (page, name) => page.getByRole('menuitem', { name, exact: true })
const loginOpen = (page) => page.evaluate(() => !!document.querySelector('#ui-login-title'))

async function openMenu(page) {
  await expect(trigger(page), 'the Copy or save button is not in the toolbar').toBeVisible({ timeout: 15000 })
  await trigger(page).click()
  await expect(page.getByRole('menu', { name: 'Copy or save' })).toBeVisible()
}

// Record every blob handed to a download anchor: its file name and its text.
// A blob download started by a script click does not reliably raise
// Playwright's own `download` event headlessly, so the anchor is watched.
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

test.describe('Tint · Copy or save menu', () => {
  test('the old Copy variables button is gone and Copy or save lists four rows', async ({ page }) => {
    watch(page, 'designer looking for the CSS')
    await go(page, '/create/tint')
    await expect(page.getByRole('button', { name: 'Copy variables' })).toHaveCount(0)
    await openMenu(page)
    await expect(page.getByRole('menuitem')).toHaveText(['Copy CSS', 'Save to projectFree account', 'DownloadFree account', 'Export design system…Free account'])
  })

  test('the button is not called Export (the header owns that word) and signed out the account rows carry a hint', async ({ page }) => {
    watch(page, 'designer looking for the CSS')
    await go(page, '/create/tint')
    await expect(trigger(page)).toBeVisible({ timeout: 15000 })
    await expect(trigger(page), 'the toolbar button clashes with the header Export button').toHaveAccessibleName('Copy or save')
    await openMenu(page)
    await expect(row(page, 'Copy CSS').locator('.tl-menu-row-hint'), 'copying is free, no hint').toHaveCount(0)
    for (const name of ['Save to project', 'Download']) {
      await expect(row(page, name).locator('.tl-menu-row-hint'), `${name} should say it needs an account`).toHaveText('Free account')
      // Read by a screen reader as the row's description, not glued onto its name.
      await expect(row(page, name), `${name}: the hint should be its description`).toHaveAccessibleDescription('Free account')
    }
    await expect(row(page, 'Copy CSS'), 'copying is free, nothing to describe').toHaveAccessibleDescription('')
  })

  test('signed in, the account rows carry no hint', async ({ page }) => {
    watch(page, 'designer with an account')
    await signIn(page, {})
    await go(page, '/create/tint')
    await openMenu(page)
    await expect(page.locator('.tl-menu-row-hint')).toHaveCount(0)
  })

  test('Copy CSS puts the tint variables on the clipboard without asking for an account', async ({ page }) => {
    watch(page, 'someone trying the tool before signing up')
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {})
    await go(page, '/create/tint')
    await openMenu(page)
    await row(page, 'Copy CSS').click()
    const text = await page.evaluate(() => navigator.clipboard.readText())
    expect(text).toMatch(/^:root \{/)
    expect(text).toContain('--tint-50:')
    expect(text).toContain('--tint-950:')
    expect(await loginOpen(page), 'copying is free; it must not open the sign-in dialog').toBe(false)
    await expect(page.getByText('Copied', { exact: true }).first()).toBeVisible()
    // Choosing a row closes the menu and gives focus back to the button.
    await expect(page.getByRole('menu')).toHaveCount(0)
    await expect(trigger(page)).toBeFocused()
  })

  test('signed out, Save to project and Download each open the sign-in dialog', async ({ page }) => {
    watch(page, 'someone trying the tool before signing up')
    await go(page, '/create/tint')
    await watchDownloads(page)

    await openMenu(page)
    await row(page, 'Save to project').click()
    await expect(page.locator('#ui-login-title'), 'Save to project was a dead item signed out').toBeVisible({ timeout: 10000 })
    await page.keyboard.press('Escape')
    await expect(page.locator('#ui-login-title')).toHaveCount(0)

    await openMenu(page)
    await row(page, 'Download').click()
    await expect(page.locator('#ui-login-title'), 'Download was a dead item signed out').toBeVisible({ timeout: 10000 })
    expect(await downloads(page), 'a file left without an account').toEqual([])
  })

  test('signed in, Download hands over a .css file named for the colour with the same text as Copy CSS', async ({ page }) => {
    watch(page, 'developer with an account')
    await signIn(page, {})
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {})
    await go(page, '/create/tint')
    await watchDownloads(page)

    await openMenu(page)
    await row(page, 'Copy CSS').click()
    const copied = await page.evaluate(() => navigator.clipboard.readText())

    await openMenu(page)
    await row(page, 'Download').click()
    await expect.poll(async () => (await downloads(page)).length, { message: 'no file was produced' }).toBe(1)
    await expect.poll(async () => (await downloads(page))[0].text).not.toBe('')
    const [file] = await downloads(page)
    expect(file.name).toMatch(/^untitled-tint-[0-9a-f]{6}\.css$/)
    expect(file.type).toContain('text/css')
    // The OS clipboard may hand text back with CRLF line ends, so compare on LF.
    const lf = (s) => s.replace(/\r\n/g, '\n').trim()
    expect(lf(file.text)).toBe(lf(copied))
    expect(await loginOpen(page)).toBe(false)
  })

  test('signed in, Save to project keeps the ramp in a new project', async ({ page }) => {
    watch(page, 'designer with an account')
    await signIn(page, {})
    await go(page, '/create/tint')

    await openMenu(page)
    await row(page, 'Save to project').click()
    const dialog = page.getByRole('dialog', { name: 'Save tints to a project' })
    await expect(dialog).toBeVisible()
    const name = dialog.getByRole('textbox', { name: 'Project name' })
    await expect(name, 'the name starts filled in').toHaveValue(/^Tint #[0-9A-F]{6}$/)
    await expect(name).toBeFocused()
    expect(await name.evaluate((el) => el.selectionStart === 0 && el.selectionEnd === el.value.length), 'the suggested name is selected').toBe(true)
    await expect(dialog.getByText(/^The project keeps the 11-step ramp of #[0-9A-F]{6}\.$/)).toBeVisible()
    await name.fill('Brand tints')
    await dialog.getByRole('button', { name: 'Save', exact: true }).click()

    await expect(page.getByText('Saved to Brand tints. Tints included.', { exact: true }).first()).toBeVisible()
    await expect(dialog).toHaveCount(0)
    const kept = await keptScale(page, 'Brand tints')
    expect(kept, 'the saved project carries the eleven-step ramp').toHaveLength(11)
  })

  test('signed in, Save to project keeps the ramp that is on screen: a 9-step setting saves 9 stops', async ({ page }) => {
    watch(page, 'designer with an account')
    await signIn(page, {})
    await go(page, '/create/tint')
    await page.getByRole('button', { name: '9 steps' }).click()
    await expect(page.locator('.tt-cell')).toHaveCount(9)
    const onScreen = await page.locator('.tt-cell').evaluateAll((cells) => cells.map((c) => c.style.getPropertyValue('--tt-c').trim().toLowerCase()))

    await openMenu(page)
    await row(page, 'Save to project').click()
    const dialog = page.getByRole('dialog', { name: 'Save tints to a project' })
    await expect(dialog.getByText(/^The project keeps the 9-step ramp of #[0-9A-F]{6}\.$/)).toBeVisible()
    await dialog.getByRole('textbox', { name: 'Project name' }).fill('Nine stops')
    await dialog.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(dialog).toHaveCount(0)
    expect(await keptScale(page, 'Nine stops'), 'the saved ramp ignored the 9-step setting').toHaveLength(9)
    expect((await keptScale(page, 'Nine stops')).map((h) => h.toLowerCase()), 'the saved ramp is not the one drawn').toEqual(onScreen)
  })

  test('an empty project name is refused with an error the field points to', async ({ page }) => {
    watch(page, 'designer with an account')
    await signIn(page, {})
    await go(page, '/create/tint')
    await openMenu(page)
    await row(page, 'Save to project').click()
    const dialog = page.getByRole('dialog', { name: 'Save tints to a project' })
    const name = dialog.getByRole('textbox', { name: 'Project name' })
    await name.fill('')
    await dialog.getByRole('button', { name: 'Save', exact: true }).click()
    const err = dialog.getByRole('alert')
    await expect(err).toHaveText('Give the project a name.')
    const errId = await err.getAttribute('id')
    await expect(name).toHaveAttribute('aria-describedby', errId)
  })

  // The saved project's tint ramp (the hexes), or [] when it is not found.
  async function keptScale(page, projectName) {
    return page.evaluate((wanted) => {
      for (let i = 0; i < localStorage.length; i += 1) {
        const raw = localStorage.getItem(localStorage.key(i)) || ''
        if (!raw.includes(wanted)) continue
        try {
          const found = Object.values(JSON.parse(raw)).flat().find((p) => p?.name === wanted)
          if (found) return found.design?.tints?.scale ?? []
        } catch { /* not a projects store */ }
      }
      return []
    }, projectName)
  }

  test('keyboard: Enter, ArrowDown and ArrowUp open it, arrows move, Escape closes and refocuses the button', async ({ page }) => {
    watch(page, 'keyboard user')
    await go(page, '/create/tint')
    await expect(trigger(page)).toBeVisible({ timeout: 15000 })

    await trigger(page).focus()
    await page.keyboard.press('Enter')
    await expect(row(page, 'Copy CSS')).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(row(page, 'Save to project')).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(row(page, 'Download')).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(row(page, 'Export design system…')).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(row(page, 'Copy CSS'), 'the arrows wrap').toBeFocused()
    await page.keyboard.press('End')
    await expect(row(page, 'Export design system…')).toBeFocused()
    await page.keyboard.press('Home')
    await expect(row(page, 'Copy CSS')).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('menu')).toHaveCount(0)
    await expect(trigger(page)).toBeFocused()

    await page.keyboard.press('ArrowDown')
    await expect(row(page, 'Copy CSS')).toBeFocused()
    await page.keyboard.press('Escape')
    await page.keyboard.press('ArrowUp')
    await expect(row(page, 'Export design system…'), 'ArrowUp opens onto the last row').toBeFocused()
    // The last row opens the export popup on the stylesheet, with no account asked for.
    await page.keyboard.press('Space')
    await expect(page.getByRole('dialog', { name: /^Export/ })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('radio', { name: 'Code' })).toBeChecked()
    await expect(page.locator('#ui-login-title')).toHaveCount(0)
  })

  test('390: the rows are a bottom sheet with 44px targets and nothing overflows', async ({ page }) => {
    watch(page, 'phone user')
    await page.setViewportSize({ width: 390, height: 844 })
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {})
    await go(page, '/create/tint')
    await openMenu(page)
    await expect(page.locator('.tl-sheet')).toBeVisible()

    for (const name of ['Copy CSS', 'Save to project', 'Download']) {
      const box = await row(page, name).boundingBox()
      expect(box.height, `${name} is under 44px`).toBeGreaterThanOrEqual(44)
    }
    const trig = await trigger(page).boundingBox()
    expect(trig.height, 'the Copy or save button is shorter than the toolbar floor (44 on a coarse pointer, 36 otherwise)').toBeGreaterThanOrEqual(36)
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false)

    await row(page, 'Copy CSS').click()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('--tint-500:')
    await expect(page.locator('.tl-sheet')).toHaveCount(0)
  })
})
