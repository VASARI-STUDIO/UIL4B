// ACCOUNT-BOUND DATA — what follows the person, not the browser.
//
// Settings and user-specific state are attached to the account, not the
// browser, so they follow a person across devices and locations.
//
// These drive the real app against the signed-in test double. The double's
// store is rebuilt on every page LOAD, so each test does its work in one load
// and reads what the app pushed straight out of `window.__UIL4B_TEST_STORE__`;
// the second-device test then seeds a fresh browser context with exactly
// those documents — which is what a second device's first read would return.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'

const syncDoc = (page, uid, id) => page.evaluate(
  ([u, d]) => window.__UIL4B_TEST_STORE__?.get(`users/${u}/sync/${d}`) || null,
  [uid, id],
)
const local = (page, key) => page.evaluate((k) => {
  const raw = localStorage.getItem(k)
  if (raw === null) return null
  try { return JSON.parse(raw) } catch { return raw }
}, key)

async function openSection(page, id) {
  // Phones open on the section list; a row opens its section.
  await page.locator(`#settab-${id}`).click()
  await expect(page.locator(`#set-${id}`)).toBeVisible()
}

// Record one export the way every tool does it: an <a download> clicked.
// history.pushState keeps the double's store (a reload would rebuild it); the
// observer reads the pathname at the moment of the click.
async function exportFromPalette(page, filename, bytes) {
  await page.evaluate(([name, size]) => {
    const back = location.pathname
    history.pushState({}, '', '/create/palette')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['x'.repeat(size)], { type: 'text/css' }))
    a.download = name
    a.click()
    URL.revokeObjectURL(a.href)
    history.pushState({}, '', back)
  }, [filename, bytes])
}

test.describe('account-bound data', () => {
  test('a theme change in the one open tab reaches the account', async ({ page }) => {
    // THE DEFECT: the old sync pushed only on another tab's `storage` event and
    // on an event nothing dispatched. One tab, one change, and the account
    // never heard about it.
    watch(page, 'a signed-in person switching to dark mode')
    const { uid } = await signIn(page, { plan: 'free' })
    await go(page, '/settings')
    await openSection(page, 'accessibility')
    await page.locator('#set-accessibility').getByRole('button', { name: 'Dark theme' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

    await expect.poll(async () => (await syncDoc(page, uid, 'data'))?.['vs-t'], {
      message: 'the dark theme never reached users/{uid}/sync/data', timeout: 10_000,
    }).toBe('dark')
  })

  test('sign in on a second device: settings, prompts, icons and exports come back', async ({ browser }) => {
    // DEVICE ONE — work done signed out, then the first sign-in on this device.
    const one = await browser.newContext({ locale: 'en-US' })
    const p1 = await one.newPage()
    watch(p1, 'a designer on their laptop')
    await p1.addInitScript(() => {
      if (sessionStorage.getItem('__fl_seeded')) return
      sessionStorage.setItem('__fl_seeded', '1')
      localStorage.setItem('vs-prompts', JSON.stringify([{ id: 4242, title: 'Hero copy prompt', text: 'Write a hero line', tags: 'copy' }]))
      localStorage.setItem('vs-custom-icons', JSON.stringify([{ key: 'vs-custom-icons:1:abcde', base: 'star', name: 'Custom (star 1)', svg: '<svg viewBox="0 0 24 24"></svg>' }]))
      localStorage.setItem('vs-palette-likes', JSON.stringify(['ocean-dusk']))
    })
    const { uid } = await signIn(p1, { plan: 'free' })
    await go(p1, '/settings')
    await openSection(p1, 'accessibility')
    await p1.locator('#set-accessibility').getByRole('button', { name: 'Dark theme' }).click()
    await exportFromPalette(p1, 'ocean-tokens.css', 4198)

    await expect.poll(async () => {
      const data = await syncDoc(p1, uid, 'data')
      const lib = await syncDoc(p1, uid, 'library')
      return !!(data?.['vs-t'] === 'dark'
        && data?.['vs-prompts']?.some((x) => x.id === 4242)
        && data?.['vs-palette-likes']?.includes('ocean-dusk')
        && data?.['vs-recent-exports']?.some((e) => e.filename === 'ocean-tokens.css')
        && lib?.['vs-custom-icons']?.some((i) => i.key === 'vs-custom-icons:1:abcde'))
    }, { message: 'device one never pushed its settings, prompts, likes, icons and exports up', timeout: 12_000 }).toBe(true)
    const data = await syncDoc(p1, uid, 'data')
    const library = await syncDoc(p1, uid, 'library')
    await one.close()

    // DEVICE TWO — an empty browser. Nothing local; only the account.
    const two = await browser.newContext({ locale: 'en-US' })
    const p2 = await two.newPage()
    watch(p2, 'the same designer on a borrowed machine')
    await signIn(p2, { plan: 'free', docs: { [`users/${uid}/sync/data`]: data, [`users/${uid}/sync/library`]: library } })
    await go(p2, '/settings')

    // Shown, not just stored: the theme is on screen without a reload.
    await expect(p2.locator('html')).toHaveAttribute('data-theme', 'dark', { timeout: 10_000 })
    await expect.poll(() => local(p2, 'vs-prompts'), { timeout: 10_000 }).toEqual(expect.arrayContaining([expect.objectContaining({ id: 4242 })]))
    expect(await local(p2, 'vs-custom-icons')).toEqual(expect.arrayContaining([expect.objectContaining({ key: 'vs-custom-icons:1:abcde' })]))
    expect(await local(p2, 'vs-palette-likes')).toContain('ocean-dusk')
    const exports = await local(p2, 'vs-recent-exports')
    expect(exports?.[0]).toEqual(expect.objectContaining({ filename: 'ocean-tokens.css', format: 'CSS', tool: 'palette', bytes: 4198 }))
    await two.close()
  })

  test('signing in as someone else never carries the last person\'s data up', async ({ page }) => {
    watch(page, 'a second person on a shared studio machine')
    await page.addInitScript(() => {
      if (sessionStorage.getItem('__fl_seeded')) return
      sessionStorage.setItem('__fl_seeded', '1')
      // The cache belongs to another account that used this browser.
      localStorage.setItem('vs-sync-meta', JSON.stringify({ v: 2, owner: 'someone-else', stamps: { 'vs-prompts': 900 }, pushed: { 'vs-prompts': 900 }, prints: {} }))
      localStorage.setItem('vs-prompts', JSON.stringify([{ id: 'their-secret', title: 'Not yours' }]))
      localStorage.setItem('vs-t', 'dark')
    })
    const { uid } = await signIn(page, {
      plan: 'free',
      docs: { 'users/test-uid-free/sync/data': { 'vs-t': 'light', _stamps: { 'vs-t': 5 }, _updatedAt: 5 } },
    })
    await go(page, '/settings')

    await expect.poll(() => local(page, 'vs-prompts'), { message: 'the previous account\'s prompts are still on screen', timeout: 10_000 }).toBe(null)
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    // Give any push a chance, then prove none carried the other account's data.
    await page.waitForTimeout(3000)
    expect(JSON.stringify(await syncDoc(page, uid, 'data') || {})).not.toContain('their-secret')
  })

  test('signing out releases this browser\'s copy once it has reached the account', async ({ page }) => {
    watch(page, 'a person signing out of a shared computer')
    const { uid } = await signIn(page, { plan: 'free' })
    await go(page, '/settings')
    await openSection(page, 'accessibility')
    await page.locator('#set-accessibility').getByRole('button', { name: 'Dark theme' }).click()
    await page.locator('#settab-account').click().catch(() => {})
    if (!(await page.locator('#set-account').isVisible())) {
      await page.getByRole('button', { name: 'All settings' }).click().catch(() => {})
      await page.locator('#settab-account').click()
    }
    await page.locator('#set-account').getByRole('button', { name: 'Sign out' }).click()

    // Sent first (the flush), then released.
    await expect.poll(async () => (await syncDoc(page, uid, 'data'))?.['vs-t'], { timeout: 10_000 }).toBe('dark')
    await expect.poll(() => local(page, 'vs-t'), { message: 'the theme stayed behind on this browser', timeout: 10_000 }).not.toBe('dark')
    expect(await local(page, 'vs-onboarded'), 'the next person would be told they have onboarded').toBe(null)
  })
})
