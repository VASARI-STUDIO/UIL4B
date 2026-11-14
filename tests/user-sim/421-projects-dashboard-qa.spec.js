// The /projects dashboard, second QA round: five findings, one group of tests each.
//
//   1  a Free account whose projects read failed must not read as "0 of 3" once the sync error clears
//   2  the phone's Open project text link (320 to 359px) is a 24px target on a mouse and 44px on touch
//   3  a lead name that needs three lines at 390px is shown in full, and its heading carries the full name
//   4  the Find field has a visible label at every width, and no placeholder standing in for one
//   5  an unsaved parked kit is drawn on /projects (the toast says it is "in Your workspace")
//
// MUTATION (make the change, the named test goes red, put it back):
//   src/pages/Projects.jsx loadFailed: drop the `|| unchecked` term
//       -> "a failed read stays failed ..."
//   src/styles/pages/dashboard.css, the 359px block: `.db-opent { display: inline-flex; ... min-height: 24px }`
//       back to `display: inline`                  -> "Open project at 320, 340 and 359px is a 24px target ..."
//   dashboard.css, the (pointer: coarse) and (max-width: 359px) block: `min-height: 44px` -> 20px
//                                                  -> "Open project at 320px on touch ..."
//   dashboard.css, `@media (max-width: 479px) { .db-name:not(.wrap) { -webkit-line-clamp: 3 } }` removed
//       -> "a lead name that needs three lines ..." (the name is cut after two)
//   src/components/dashboard/KitSheet.jsx: drop `title={kit.title}` from the name heading
//       -> the same test (the heading has no full name)
//   src/components/dashboard/OtherProjects.jsx: put `placeholder="Project name"` back
//       -> "the Find field has a visible label ..."
//   dashboard.css: put `.db-find label { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0) }`
//       back inside the max-width: 1199px block   -> the same test at 390 and 768
//   src/pages/Projects.jsx: remove `<ParkedLine />`
//       -> "an unsaved parked kit is drawn on /projects ..."
import { test, expect } from './base.js'
import { go, watch, signIn, expectRendered } from './helpers.js'
import { DEFAULT_DESIGN } from '../../src/data/designDefaults.js'
import { DAY, MINUTE, ago, complete, half, many } from './fixtures/dashboard-projects.js'

const UID = 'test-uid-free'
const PARKED = 'vs-previous-design'

function remoteProject(id, name, age) {
  return {
    id,
    name,
    design: { palette: { colors: ['#101010', '#2B6CB0', '#F0F0F0'] } },
    createdAt: ago((age + 5) * DAY),
    updatedAt: ago(age * DAY),
  }
}

const ACCOUNT = [remoteProject('r1', 'Offcut', 1), remoteProject('r2', 'Shallow End', 2), remoteProject('r3', 'Tenner', 3)]

const sheetOf = (page, name) => page.getByRole('region', { name })

// 1
test.describe('a projects read that failed', () => {
  test('a failed read stays failed after the sync error clears, and never reads as 0 of 3', async ({ page }) => {
    test.setTimeout(120_000)
    watch(page, 'a Free designer with three projects on a new device, the list refused, an auto-save then goes through')
    // The sync notice is recorded as it appears, so "it cleared" is told apart from "it never showed".
    await page.addInitScript(() => {
      window.__sawSyncNotice = false
      new MutationObserver(() => {
        if (document.querySelector('[data-testid="sync-notice"]')) window.__sawSyncNotice = true
      }).observe(document, { childList: true, subtree: true })
    })
    await signIn(page, {
      plan: 'free',
      projects: [],
      docs: { [`users/${UID}/sync/projects`]: { list: ACCOUNT, v: 1, _updatedAt: Date.now() - DAY } },
      deny: [{ path: 'sync/projects', ops: ['get'] }],
    })
    await go(page, '/projects')
    const failed = page.getByRole('alert').filter({ hasText: /Your projects didn.t load\./ })
    await expect(failed).toBeVisible({ timeout: 10_000 })
    await expect.poll(() => page.evaluate(() => window.__sawSyncNotice), { message: 'the read failure reached the sync notice' }).toBe(true)
    // The push after the failed read is not denied, so it succeeds and the notice goes.
    await expect(page.locator('[data-testid="sync-notice"]'), 'the auto-save did not clear the sync error').toHaveCount(0, { timeout: 15_000 })

    await expect(failed, 'the failed sheet went with the sync error').toBeVisible()
    await expect(page.getByText(/Projects \d+ of \d+/), 'no project count is claimed').toHaveCount(0)
    await expect(sheetOf(page, 'Start your first brand kit'), 'the empty-account sheet is not drawn').toHaveCount(0)
    await expect(sheetOf(page, 'Example brand kit'), 'the example sheet is not drawn').toHaveCount(0)
    await expect(page.getByTestId('other-projects')).toHaveCount(0)
  })
})

// 2
test.describe('Open project as a text link on a narrow phone', () => {
  const FREE = () => [complete('p-done', 'Violet Lime', ago(10 * MINUTE)), half()]

  for (const width of [320, 340, 359]) {
    test(`Open project at ${width}px is a 24px target on a mouse`, async ({ page }) => {
      watch(page, `a designer on a ${width}px window`)
      await page.setViewportSize({ width, height: 800 })
      await signIn(page, { plan: 'free', projects: FREE() })
      await go(page, '/projects')
      await expectRendered(page, '/projects')
      const link = sheetOf(page, 'Violet Lime, latest project').locator('.db-opent')
      await expect(link, 'the text link stands in for the hidden head button').toBeVisible()
      const box = await link.boundingBox()
      expect(box.height, `Open project at ${width}px`).toBeGreaterThanOrEqual(24)
    })
  }

  test('Open project at 320px on touch is a 44px target', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 320, height: 700 }, hasTouch: true, isMobile: true, locale: 'en-AU' })
    try {
      const page = await context.newPage()
      watch(page, 'a thumb on a 320px phone')
      await signIn(page, { plan: 'free', projects: FREE() })
      await go(page, '/projects')
      await expectRendered(page, '/projects')
      const box = await sheetOf(page, 'Violet Lime, latest project').locator('.db-opent').boundingBox()
      expect(box.height, 'Open project on touch').toBeGreaterThanOrEqual(44)
    } finally {
      await context.close()
    }
  })
})

// 3
test('a lead name that needs three lines is shown in full at 390px, with the full name in its title', async ({ page }) => {
  // At 390px the name has about 196px beside the Open project button; each of these words fits a line, and no
  // two of them fit together, so the name takes three lines.
  const NAME = 'Harbour Lights Studio'
  watch(page, 'a designer on a 390px phone')
  await page.setViewportSize({ width: 390, height: 844 })
  await signIn(page, { plan: 'free', projects: [complete('p-lights', NAME, ago(10 * MINUTE)), half()] })
  await go(page, '/projects')
  await expectRendered(page, '/projects')
  const sheet = sheetOf(page, `${NAME}, latest project`)
  const name = sheet.getByRole('heading', { level: 2 })
  await expect(name).toHaveText(NAME)
  await expect(name, 'the full name is on the heading').toHaveAttribute('title', NAME)
  // Measure the clamped box, then the same box with the clamp lifted: equal heights mean no line is hidden.
  const shape = await name.evaluate((el) => {
    const clamped = el.getBoundingClientRect().height
    el.style.webkitLineClamp = 'none'
    const free = el.getBoundingClientRect().height
    el.style.webkitLineClamp = ''
    return { lines: Math.round(clamped / parseFloat(getComputedStyle(el).lineHeight)), hidden: free - clamped }
  })
  expect(shape.lines, 'three lines, not two with an ellipsis').toBe(3)
  expect(shape.hidden, 'the clamp hides no line of the name').toBeLessThanOrEqual(1)
})

// 4
test('the Find field has a visible label and no placeholder at 390, 768 and 1440px', async ({ page }) => {
  watch(page, 'a Pro designer with a dozen projects')
  await signIn(page, { plan: 'pro', projects: many(12) })
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 900 })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    const label = page.locator('label[for="db-find"]')
    await expect(label, `the label at ${width}px`).toHaveText('Find')
    const box = await label.boundingBox()
    expect(box.width, `the label is drawn, not clipped to a pixel, at ${width}px`).toBeGreaterThanOrEqual(20)
    expect(box.height, `the label height at ${width}px`).toBeGreaterThanOrEqual(14)
    const find = page.getByRole('searchbox', { name: 'Find a project' })
    await expect(find, `a placeholder is not standing in for the label at ${width}px`).not.toHaveAttribute('placeholder', /.+/)
  }
})

// 5
test('an unsaved parked kit is drawn on /projects with Continue, Save as project and Discard', async ({ page }) => {
  watch(page, 'a Free designer who started a new kit over unsaved work')
  const design = { ...DEFAULT_DESIGN, identity: { ...(DEFAULT_DESIGN.identity || {}), name: 'Lantern Press' } }
  await page.addInitScript(({ key, value }) => {
    try {
      if (sessionStorage.getItem('__t421_seeded') === '1') return
      sessionStorage.setItem('__t421_seeded', '1')
      localStorage.setItem(key, JSON.stringify(value))
    } catch { /* a blocked store is the app's problem */ }
  }, { key: PARKED, value: { design, parkedAt: Date.now() - 5 * MINUTE } })
  await signIn(page, { plan: 'free', projects: [complete('p-done', 'Violet Lime', ago(10 * MINUTE)), half()] })
  await go(page, '/projects')
  await expectRendered(page, '/projects')

  const group = page.getByRole('group', { name: 'Unsaved brand kit' })
  await expect(group, 'the toast says it is in Your workspace, so it is drawn there').toBeVisible()
  await expect(page.getByTestId('parked-line')).toContainText('Unsaved brand kit (Lantern Press), put aside')
  for (const action of ['Continue', 'Save as project', 'Discard']) {
    await expect(group.getByRole('button', { name: action })).toBeVisible()
  }
})
