// Coming back to a brand kit asks first: carry on, open another, or start new.
//
// "Build a brand kit" used to open over whatever the last kit left on the board.
// Now, after a gap of six hours (or right after a kit was finished), the first
// step opens a chooser. Each test here is one path through it, and each reads
// something that only exists with the chooser: the panel, the tab's session mark,
// the parked slot's contents or the row on the workspace.
import { test, expect } from './base.js'
import { go, watch, signIn, expectRendered } from './helpers.js'
import { DEFAULT_DESIGN } from '../../src/data/designDefaults.js'

const CURRENT = 'vs-current-design'
const PARKED = 'vs-previous-design'
const HOUR = 60 * 60 * 1000
// A tool page past step one: the press from here is what brings a person back to
// the first step, where the chooser asks.
const AWAY = '/create/font-pair'

const withColours = (colors) => ({
  ...DEFAULT_DESIGN,
  palette: { ...DEFAULT_DESIGN.palette, base: colors[0], colors },
})
const WORK = withColours(['#E4572E', '#17BEBB', '#FFC914', '#2E294E', '#76B041'])

const project = (id, name, design, updatedAt) => ({ id, name, design, createdAt: updatedAt, updatedAt })

/** Storage as a returning designer left it, written once per tab before the app reads it. */
async function seedKit(page, { design = WORK, hoursAgo = 7, session = null, flag = true, pendingSave = false } = {}) {
  const now = Date.now()
  await page.addInitScript((s) => {
    try {
      if (sessionStorage.getItem('__t294_seeded') === '1') return
      sessionStorage.setItem('__t294_seeded', '1')
      localStorage.setItem('vs-current-design', JSON.stringify(s.design))
      localStorage.setItem('vs-current-design-at', String(s.now - s.hoursAgo * 3600000))
      if (s.flag) {
        localStorage.setItem('vs-uikit-guide', '1')
        localStorage.setItem('vs-uikit-guide-at', String(s.now))
      }
      localStorage.setItem('vs-uikit-guide-seen', '1')
      if (s.session) sessionStorage.setItem('vs-kit-session', s.session)
      if (s.pendingSave) sessionStorage.setItem('vs-pending-save', JSON.stringify({ tool: 'palette', name: '', at: s.now }))
    } catch { /* a blocked store is the app's problem */ }
  }, { design, now, hoursAgo, session, flag, pendingSave })
}

const read = (page, key) => page.evaluate((k) => localStorage.getItem(k), key)
const readJson = async (page, key) => JSON.parse((await read(page, key)) || 'null')
const sessionMark = (page) => page.evaluate(() => sessionStorage.getItem('vs-kit-session'))
const toast = (page) => page.locator('.toast.show')
const chooser = (page) => page.getByRole('dialog', { name: /^Your brand kit from / })
const orientation = (page) => page.getByRole('dialog', { name: /^Step 1 of 4/ })
const colours = async (page) => (await readJson(page, CURRENT))?.palette?.colors

/** The nav's brand kit entry, from the Create menu. */
async function pressBrandKit(page) {
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  await page.locator('.pnav-editorial-cta').click()
}

test.use({ viewport: { width: 1440, height: 900 } })

test.describe('The brand kit chooser', () => {
  test('T1 a clean browser gets the orientation panel and no chooser', async ({ page }) => {
    watch(page, 'a first-time visitor pressing Build a brand kit')
    await go(page, '/create/palette')
    await pressBrandKit(page)
    await expect(orientation(page)).toBeVisible()
    await expect(chooser(page)).toHaveCount(0)
    // The press was the answer for this tab.
    await expect.poll(() => sessionMark(page)).toBe('on')
  })

  test('T2 work edited an hour ago in an answered tab resumes with no chooser', async ({ page }) => {
    watch(page, 'a designer back from a short break')
    await seedKit(page, { hoursAgo: 1, session: 'on' })
    await go(page, '/create/palette')
    await pressBrandKit(page)
    await expect(page).not.toHaveURL(/\/create\/palette$/)
    await expect(chooser(page)).toHaveCount(0)
  })

  test('T3 work edited three hours ago in a new tab carries on and marks the tab', async ({ page }) => {
    watch(page, 'a designer opening a new tab the same afternoon')
    await seedKit(page, { hoursAgo: 3 })
    await go(page, '/create/palette')
    expect(await sessionMark(page)).toBeNull()
    await pressBrandKit(page)
    await expect(chooser(page)).toHaveCount(0)
    await expect.poll(() => sessionMark(page)).toBe('on')
  })

  test('T4 unsaved work after seven hours asks, with Continue focused and nothing to open', async ({ page }) => {
    watch(page, 'a signed-out designer back the next morning')
    await seedKit(page, { hoursAgo: 7 })
    await go(page, AWAY)
    await pressBrandKit(page)
    const panel = chooser(page)
    await expect(panel).toBeVisible()
    await expect(panel).toContainText('Your brand kit from 7 hours ago')
    await expect(panel.getByRole('button', { name: /^Continue this brand kit/ })).toBeFocused()
    await expect(panel.getByRole('button', { name: /^Open another project/ })).toHaveCount(0)
    await expect(orientation(page), 'one panel per arrival').toHaveCount(0)
  })

  test('T5 Escape answers Continue and leaves the kit exactly as it was', async ({ page }) => {
    watch(page, 'a designer dismissing the chooser')
    await seedKit(page, { hoursAgo: 7 })
    await go(page, AWAY)
    await pressBrandKit(page)
    await expect(chooser(page)).toBeVisible()
    // Read once the board has restated the kit it opened with.
    const before = await read(page, CURRENT)
    await page.keyboard.press('Escape')
    await expect(chooser(page)).toHaveCount(0)
    expect(await read(page, CURRENT)).toBe(before)
    expect((await read(page, 'vs-uikit-guide')) || '').toMatch(/^1/)
    await expect.poll(() => sessionMark(page)).toBe('on')
  })

  test('T6 changing a swatch while the chooser is open counts as Continue and keeps the edit', async ({ page }) => {
    watch(page, 'a designer who starts editing under the chooser')
    await seedKit(page, { hoursAgo: 7 })
    await go(page, AWAY)
    await pressBrandKit(page)
    await expect(chooser(page)).toBeVisible()
    const before = await colours(page)
    await page.getByRole('button', { name: 'Randomise' }).first().click()
    await expect(chooser(page)).toHaveCount(0)
    await expect.poll(() => colours(page)).not.toEqual(before)
  })

  test('T7 Start a new brand kit parks the old one, resets the board and offers Undo', async ({ page }) => {
    watch(page, 'a designer starting over')
    await seedKit(page, { hoursAgo: 7 })
    await go(page, AWAY)
    await pressBrandKit(page)
    await chooser(page).getByRole('button', { name: /^Start a new brand kit/ }).click()
    await expect(chooser(page)).toHaveCount(0)
    expect((await readJson(page, PARKED))?.design?.palette?.colors, 'the old kit is in the slot').toEqual(WORK.palette.colors)
    expect((await read(page, 'vs-uikit-guide')) || '').toBe('1')
    await expect(toast(page)).toContainText('Your last one is in Your workspace.')
    await toast(page).getByRole('button', { name: 'Undo' }).click()
    await expect.poll(() => colours(page)).toEqual(WORK.palette.colors)
    expect(await read(page, PARKED)).toBeNull()
  })

  test('T8 starting new over unsaved work does not ask a second question', async ({ page }) => {
    watch(page, 'a designer starting over without a confirm')
    await seedKit(page, { hoursAgo: 7 })
    await go(page, AWAY)
    await pressBrandKit(page)
    await expect(chooser(page).getByRole('button', { name: /^Start a new brand kit/ })).toContainText('moves to Your workspace as an unsaved brand kit')
    await chooser(page).getByRole('button', { name: /^Start a new brand kit/ }).click()
    await expect(page.getByText('Save this brand kit first?')).toHaveCount(0)
  })

  test('T9 a saved kit after a day defaults to Start new and writes nothing aside', async ({ page }) => {
    watch(page, 'a signed-in designer back the next day')
    const alpha = project('proj-a', 'Alpha', WORK, '2026-09-01T09:00:00.000Z')
    await signIn(page, { plan: 'free', projects: [alpha] })
    await seedKit(page, { design: { ...WORK, source: { projectId: 'proj-a' } }, hoursAgo: 26 })
    await go(page, AWAY)
    await pressBrandKit(page)
    const panel = chooser(page)
    await expect(panel.getByRole('button', { name: /^Start a new brand kit/ })).toBeFocused()
    await expect(panel).toContainText('Alpha stays in your projects.')
    expect(await read(page, PARKED)).toBeNull()
  })

  test('T10 Open another project lists the three newest others and loads the one chosen', async ({ page }) => {
    watch(page, 'a Pro designer moving to another project')
    const mk = (n) => withColours([`#1${n}2233`, `#2${n}3344`, `#3${n}4455`])
    const list = [
      project('proj-a', 'Alpha', mk(1), '2026-09-01T09:00:00.000Z'),
      project('proj-b', 'Bravo', mk(2), '2026-09-04T09:00:00.000Z'),
      project('proj-c', 'Charlie', mk(3), '2026-09-03T09:00:00.000Z'),
      project('proj-d', 'Delta', mk(4), '2026-09-02T09:00:00.000Z'),
    ]
    await signIn(page, { plan: 'pro', projects: list })
    const changedA = { ...mk(1), palette: { ...mk(1).palette, colors: ['#E4572E', '#17BEBB', '#FFC914'] }, source: { projectId: 'proj-a' } }
    await seedKit(page, { design: changedA, hoursAgo: 7 })
    await go(page, AWAY)
    await pressBrandKit(page)
    const panel = chooser(page)
    await panel.getByRole('button', { name: /^Open another project/ }).click()
    await expect(panel.locator('[data-choose-row="project"] .bkit-choose-label'), 'newest first, the current project left out').toHaveText(['Bravo', 'Charlie', 'Delta'])
    await expect(panel.getByRole('link', { name: 'See all projects' })).toHaveAttribute('href', '/projects')
    await panel.getByRole('button', { name: /^Bravo/ }).click()
    await expect.poll(() => colours(page)).toEqual(mk(2).palette.colors)
    await expect.poll(async () => (await readJson(page, PARKED))?.design?.palette?.colors, { message: 'the changes to Alpha are parked' }).toEqual(changedA.palette.colors)
    await expect(toast(page)).toContainText('Opened Bravo. Your unsaved brand kit is in Your workspace.')
  })

  test('T11 a Free account at the cap sees the allowance and a link to Pro, and can still start new', async ({ page }) => {
    watch(page, 'a Free designer with three projects')
    const at = '2026-09-01T09:00:00.000Z'
    const list = [project('proj-a', 'Alpha', WORK, at), project('proj-b', 'Bravo', withColours(['#112233', '#223344']), at), project('proj-c', 'Charlie', withColours(['#334455', '#445566']), at)]
    await signIn(page, { plan: 'free', projects: list })
    await seedKit(page, { design: { ...WORK, source: { projectId: 'proj-a' } }, hoursAgo: 7 })
    await go(page, AWAY)
    await pressBrandKit(page)
    const panel = chooser(page)
    await expect(panel).toContainText('Free plan: 3 of 3 projects saved.')
    await expect(panel.getByRole('link', { name: 'See Pro' })).toHaveAttribute('href', '/plans')
    await panel.getByRole('button', { name: /^Start a new brand kit/ }).click()
    await expect(chooser(page)).toHaveCount(0)
    await expect.poll(() => colours(page)).not.toEqual(WORK.palette.colors)
  })

  test('T13 opening step one by address after a gap asks on load, before any press', async ({ page }) => {
    watch(page, 'a designer reopening the palette tool from a bookmark')
    await seedKit(page, { hoursAgo: 7 })
    await go(page, '/create/palette')
    await expect(chooser(page)).toBeVisible()
    expect(await sessionMark(page), 'the load asked; nothing is answered yet').toBeNull()
    await chooser(page).getByRole('button', { name: /^Continue this brand kit/ }).click()
    await expect(chooser(page)).toHaveCount(0)
    await expect.poll(() => sessionMark(page)).toBe('on')
  })

  test('T12 a save waiting on sign-in is never interrupted by the chooser', async ({ page }) => {
    watch(page, 'a designer part-way through saving')
    await seedKit(page, { hoursAgo: 7, pendingSave: true })
    await go(page, '/create/palette')
    await pressBrandKit(page)
    await expect(chooser(page)).toHaveCount(0)
  })

  test('T14 a shared palette link parks the work, shows no bar, and leaves the flag on', async ({ page }) => {
    watch(page, 'a designer opening a colleague\'s link mid-walkthrough')
    await seedKit(page, { hoursAgo: 1, session: 'on' })
    await go(page, '/create/palette?c=4338E0,7C6CF0,A5B4FC,1E1B4B,F5F3FF')
    await expectRendered(page, '/create/palette')
    await expect(chooser(page)).toHaveCount(0)
    await expect(page.getByRole('region', { name: 'Brand kit walkthrough' }), 'no bar on a shared view').toHaveCount(0)
    expect((await readJson(page, PARKED))?.design).toEqual(WORK)
    expect((await read(page, 'vs-uikit-guide')) || '', 'the flag is kept').toMatch(/^1/)
    await expect(toast(page)).toContainText('Opened the shared palette. Your brand kit is in Your workspace.')
    await expect(toast(page).getByRole('button', { name: 'Go back to it' })).toBeVisible()
  })

  test('T15 New project parks the work and opens the orientation panel, not the chooser', async ({ page }) => {
    watch(page, 'a signed-in designer pressing New project')
    await signIn(page, { plan: 'free', projects: 1 })
    await seedKit(page, { hoursAgo: 8, flag: false })
    await go(page, '/projects')
    await page.getByRole('button', { name: 'New project' }).first().click()
    await expect(page).toHaveURL(/\/create\/palette$/)
    await expect(orientation(page)).toBeVisible()
    await expect(chooser(page)).toHaveCount(0)
    expect((await readJson(page, PARKED))?.design).toEqual(WORK)
  })

  test('T16 to T18 finishing on an opened project saves over it, marks the tab done, then asks to start new', async ({ page }) => {
    watch(page, 'a designer finishing a walkthrough and coming back')
    const alpha = project('proj-a', 'Alpha', WORK, '2026-09-01T09:00:00.000Z')
    await signIn(page, { plan: 'free', projects: [alpha] })
    await seedKit(page, { design: { ...WORK, source: { projectId: 'proj-a' } }, hoursAgo: 1, session: 'on' })
    await go(page, '/create/icons')
    await page.getByRole('region', { name: 'Brand kit walkthrough' }).getByRole('button', { name: /^Name your project/ }).click()
    const form = page.getByRole('dialog', { name: 'Name your project' })
    await form.getByRole('textbox', { name: 'Project name' }).fill('Alpha kit')
    await form.getByRole('button', { name: 'Save to Alpha' }).click()
    await expect(page).toHaveURL(/\/projects\/proj-a\/export$/)
    // The export page opens the project on mount; the mark is read after that.
    await expect(page.getByRole('heading', { level: 1, name: /^Export / })).toBeVisible()
    expect(Object.values(await readJson(page, 'vs-projects')).flat().map((p) => p.id)).toEqual(['proj-a'])
    expect(await sessionMark(page), 'T16: finishing marks the tab done').toBe('done')

    await page.goBack()
    await expect(chooser(page), 'T17: Back from the export page does not ask').toHaveCount(0)
    await expect(page.getByRole('region', { name: 'Brand kit walkthrough' })).toHaveCount(0)
    expect(await sessionMark(page)).toBe('done')

    await pressBrandKit(page)
    await expect(chooser(page).getByRole('button', { name: /^Start a new brand kit/ }), 'T18: a finished kit defaults to Start new').toBeFocused()
  })

  test('T19 opening step one does not count as an edit, so the next press still asks', async ({ page }) => {
    watch(page, 'a designer who opens the palette and leaves without touching it')
    await seedKit(page, { hoursAgo: 7 })
    await go(page, '/create/palette')
    await expect(chooser(page)).toBeVisible()
    // Long enough for the board to restate the kit it opened with.
    await page.waitForTimeout(600)
    const at = Number(await read(page, 'vs-current-design-at'))
    expect(Date.now() - at, 'the last-edited time is still seven hours ago').toBeGreaterThan(6 * HOUR)
  })

  test('the workspace row for an unsaved brand kit continues, saves and discards with Undo', async ({ page }) => {
    watch(page, 'a designer finding their put-aside kit on the workspace')
    await signIn(page, { plan: 'free', projects: 0 })
    await page.addInitScript((slot) => {
      try { if (!localStorage.getItem('vs-previous-design')) localStorage.setItem('vs-previous-design', JSON.stringify(slot)) } catch { /* blocked */ }
    }, { design: WORK, parkedAt: Date.now() - 2 * HOUR })
    await go(page, '/projects')
    const row = page.locator('.uh-parked')
    await expect(row).toContainText('Unsaved brand kit')
    await expect(row).toContainText('Not saved yet')

    await row.getByRole('button', { name: 'Discard' }).click()
    await expect(row).toHaveCount(0)
    expect(await read(page, PARKED)).toBeNull()
    await expect(toast(page)).toContainText('Unsaved brand kit discarded.')
    await toast(page).getByRole('button', { name: 'Undo' }).click()
    await expect(row).toBeVisible()

    await row.getByRole('button', { name: 'Save as project' }).click()
    await expect(row).toHaveCount(0)
    expect(Object.values(await readJson(page, 'vs-projects')).flat()).toHaveLength(1)
  })
})
