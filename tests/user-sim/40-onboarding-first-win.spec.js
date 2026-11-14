// Onboarding, walked: where each way out of the kit builder lands, and what it records.
//
// /onboarding is signed-in only. signIn() (a test-mode build with the Firebase double) gives an
// un-onboarded free account, so the page mounts and the exits can be followed for real. The full
// beat-by-beat journeys live in v3-pro-onboarding.spec.js; this spec pins the exits and the
// state they leave behind:
//
//   Save to my projects  -> /create/palette, or a stashed checkout when the account came to pay
//   Skip                 -> /projects, or a stashed checkout
//   Type scale / Gradient -> that tool (the palette is what Save already opens, so it has no link)
//
// Whatever the exit, onboarding is complete and the time-to-value clock is running.
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'

const STASH = 'vs-resume-after-onboarding'

async function openOnboarding(page, size) {
  if (size) await page.setViewportSize(size)
  await signIn(page, { onboarded: false })
  await go(page, '/onboarding')
  await expect(page.locator('[data-h1]'), 'the signed-in account must reach the kit builder').toBeVisible()
}

const path = (page) => new URL(page.url()).pathname
const pathAndSearch = (page) => new URL(page.url()).pathname + new URL(page.url()).search
const local = (page, key) => page.evaluate((k) => localStorage.getItem(k), key)
const stash = (page, value) => page.evaluate(([k, v]) => sessionStorage.setItem(k, v), [STASH, value])
const stashed = (page) => page.evaluate((k) => sessionStorage.getItem(k), STASH)

/** Open the page, then walk to the last beat with a valid colour, so the pill reads "Save to my projects". */
async function toSave(page) {
  await page.locator('#onb-hex').fill('#3a6ea5')
  await page.locator('[data-go]').click()
  await expect(page.locator('[data-h1]')).toHaveText('Pick your fonts')
  await page.locator('[data-go]').click()
  await expect(page.locator('[data-h1]')).toHaveText('Name your kit')
  await expect(page.locator('[data-go]')).toContainText('Save to my projects')
}

test.describe('the kit builder is the first screen, and its exits go to real places', () => {
  test('a brand-new account is asked for a colour, not for money', async ({ page }) => {
    watch(page, 'a brand-new account reaching onboarding')
    await openOnboarding(page)
    await expect(page.locator('[data-h1]')).toHaveText('Start with your brand colour')

    // Two other ways in. The palette is what Save opens, so it is not offered a second time.
    await expect(page.locator('a[data-start][data-first-win]')).toHaveCount(2)
    for (const id of ['type-scale', 'gradient']) {
      await expect(page.locator(`a[data-first-win="${id}"]`)).toBeVisible()
    }
    await expect(page.locator('a[data-first-win="palette"]')).toHaveCount(0)

    // The step that asked for money before anything had been made is gone.
    await expect(page.locator('.onb-tiers')).toHaveCount(0)
    await expect(page.locator('.onb-billing')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Go Pro/ })).toHaveCount(0)

    // Gone from the path, not hidden: the tier truth stays, with a real link.
    await expect(page.getByRole('link', { name: 'Pro', exact: true })).toHaveAttribute('href', '/plans')
  })

  test('the heading takes focus, so the screen is announced', async ({ page }) => {
    // App.jsx navigates here with replace:true and manages no focus of its own,
    // so without this a keyboard or screen-reader user is dropped on <body>.
    watch(page, 'reaching onboarding with a keyboard')
    await openOnboarding(page)
    await expect.poll(() => page.evaluate(() => document.activeElement?.tagName), { timeout: 5000 }).toBe('H1')
    expect(await page.evaluate(() => document.activeElement?.textContent)).toContain('Start with your brand colour')
  })

  // Each other start must OPEN ITS TOOL, not land on the "still building" state.
  for (const [id, heading] of [
    ['type-scale', /type scale/i],
    ['gradient', /gradient/i],
  ]) {
    test(`starting with "${id}" opens the real tool`, async ({ page }) => {
      watch(page, `a new account starting with ${id}`)
      await openOnboarding(page)
      await page.locator(`a[data-first-win="${id}"]`).click()

      await expect.poll(() => path(page), { timeout: 10000 }).toBe(`/create/${id}`)
      await expect(page.getByText(/still building|coming soon/i)).toHaveCount(0)
      await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible()

      // Onboarding is finished, so the flow cannot re-appear on the next load, and the
      // time-to-value clock is running.
      expect(await local(page, 'vs-onboarded')).toBe('1')
      expect(await local(page, 'vs-first-win-started'), 'the clock must start when the screen is answered').toMatch(/^\d+$/)
    })
  }

  test('Save to my projects opens the palette tool and finishes onboarding', async ({ page }) => {
    watch(page, 'a new account saving its first kit')
    await openOnboarding(page)
    await toSave(page)
    await page.locator('[data-go]').click()

    await expect.poll(() => path(page), { timeout: 10000 }).toBe('/create/palette')
    await expect(page.getByText(/still building|coming soon/i)).toHaveCount(0)
    expect(await local(page, 'vs-onboarded')).toBe('1')
    expect(await local(page, 'vs-first-win-started')).toMatch(/^\d+$/)
  })

  // Someone who signed up by clicking a Pro button came to pay. The plans page stashes the
  // checkout before the login popup opens; finishing the kit must not throw that away. Any
  // other stashed page still gives way to the exit that was chosen.
  test('saving after clicking Pro goes on to that checkout, and the answer is still recorded', async ({ page }) => {
    watch(page, 'a new account that signed up from a Pro button')
    await openOnboarding(page)
    await stash(page, '/checkout?plan=monthly')
    await toSave(page)
    await page.locator('[data-go]').click()

    await expect.poll(() => pathAndSearch(page), { timeout: 10000 }).toBe('/checkout?plan=monthly')
    expect(await stashed(page)).toBeNull()
    expect(await local(page, 'vs-onboarded')).toBe('1')
    expect(await local(page, 'vs-first-win-started')).toMatch(/^\d+$/)
  })

  test('starting a tool after clicking Pro goes on to that checkout too', async ({ page }) => {
    watch(page, 'a new account from a Pro button choosing another start')
    await openOnboarding(page)
    await stash(page, '/checkout?plan=monthly')
    await page.locator('a[data-first-win="gradient"]').click()

    await expect.poll(() => pathAndSearch(page), { timeout: 10000 }).toBe('/checkout?plan=monthly')
    expect(await stashed(page)).toBeNull()
  })

  test('saving drops any stashed page that is not a checkout', async ({ page }) => {
    watch(page, 'a new account that signed up from a tool page')
    await openOnboarding(page)
    await stash(page, '/create/gradient')
    await toSave(page)
    await page.locator('[data-go]').click()

    await expect.poll(() => path(page), { timeout: 10000 }).toBe('/create/palette')
    expect(await stashed(page)).toBeNull()
  })

  test('Skip still finishes onboarding and lands on the teaching empty state', async ({ page }) => {
    // The decline path used to write localStorage only, so the account never learned onboarding
    // had happened and it returned on every new browser. It must complete, and it must not
    // invent an answer.
    watch(page, 'a new account skipping the kit')
    await openOnboarding(page)
    await page.locator('a[data-skip]').click()

    await expect.poll(() => path(page), { timeout: 10000 }).toBe('/projects')
    expect(await local(page, 'vs-onboarded')).toBe('1')
    expect(await local(page, 'vs-first-win-started')).toMatch(/^\d+$/)
  })

  test('Skip takes a stashed checkout and clears the stash', async ({ page }) => {
    watch(page, 'a new account skipping after a Pro button')
    await openOnboarding(page)
    await stash(page, '/checkout?plan=yearly')
    await page.locator('a[data-skip]').click()
    await expect.poll(() => pathAndSearch(page), { timeout: 10000 }).toBe('/checkout?plan=yearly')
    expect(await stashed(page)).toBeNull()
  })

  test('Skip returns to a stashed tool page, so signing up mid-task does not lose the task', async ({ page }) => {
    watch(page, 'a new account skipping after a tool page')
    await openOnboarding(page)
    await stash(page, '/create/gradient')
    await page.locator('a[data-skip]').click()
    await expect.poll(() => path(page), { timeout: 10000 }).toBe('/create/gradient')
    expect(await stashed(page)).toBeNull()
  })

  test('at 390px Skip and the other starts are 44px targets and the page has no outer card', async ({ page }) => {
    watch(page, 'a new account on a phone')
    await openOnboarding(page, { width: 390, height: 844 })

    for (const sel of ['a[data-skip]', 'a[data-first-win="type-scale"]', 'a[data-first-win="gradient"]', '[data-go]']) {
      const box = await page.locator(sel).boundingBox()
      expect(box.height, `${sel} is shorter than 44px on a phone`).toBeGreaterThanOrEqual(44)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'the page scrolls sideways at 390px').toBe(true)
    await expect(page.locator('.onb-card')).toHaveCount(0)
  })

  test('the three unread survey questions are gone from the flow', async ({ page }) => {
    // Asserted on the RENDERED flow rather than on source text: the question is whether a new
    // account is still made to answer them, not whether a string survives somewhere.
    watch(page, 'checking the survey is really gone')
    await openOnboarding(page)

    await expect(page.getByText('How did you hear about us?')).toHaveCount(0)
    await expect(page.getByText('What best describes you?')).toHaveCount(0)
    await expect(page.getByText(/Quick question \d of \d/)).toHaveCount(0)
    await expect(page.locator('.onb-dot')).toHaveCount(0)
    await expect(page.locator('.onb-skip')).toHaveCount(0)
  })
})

test.describe('onboarding stays signed-in only', () => {
  test('a signed-out visitor is sent to sign in, not shown the flow', async ({ page }) => {
    watch(page, 'a signed-out visitor opening /onboarding directly')
    await go(page, '/onboarding')
    await expect.poll(() => path(page), { timeout: 10000 }).toBe('/login')
    await expect(page.locator('[data-h1]')).toHaveCount(0)
  })

  test('the sign-up promise still names the three starting points', async ({ page }) => {
    // utils/firstWin.js derives the three from this sentence. If the dialog's promise changes,
    // the first wins must change with it: a unit test pins the source, and this pins what a
    // person is actually shown.
    watch(page, 'reading the sign-up dialog')
    await go(page, '/discover/palettes')
    await page.getByRole('button', { name: 'Menu', exact: true }).click()
    await page.getByRole('button', { name: 'Create a free account' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText(/palettes, type scales and gradients/)).toBeVisible()
  })
})
