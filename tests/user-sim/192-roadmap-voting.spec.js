// Roadmap voting, seen as a signed-out visitor.
//
// The feature sits behind the tool-votes flag, which is off in production and in
// CI. This file is written against both builds and each half skips unless the
// served build is the one it describes:
//
//   flag ON  (a `--mode test` build made with VITE_FORCE_TOOL_VOTES=1): the
//            /roadmap page, the #whats-next group on /tools, the Vote button.
//   flag OFF (the normal build): /roadmap is an unknown route and /tools keeps
//            its two plain sentences.
//
// Which build is being served is read from the page itself (does /tools carry
// #whats-next), so a spec cannot be pointed at the wrong build by a mislabelled
// flag. To make a mismatch loud instead of a skip, set UIL4B_EXPECT_ROADMAP to
// `on` or `off`: the probe then fails when the served build disagrees.
//
// Counts come from Firestore, which the sandboxed runner cannot reach, so the
// counts here are in their failed state ("–"); the number paths are covered by
// tests/unit/roadmap-voting.test.js.
import { test, expect } from './base.js'
import { FIREBASE_HOSTS, go, watch } from './helpers.js'

const PERSONA = 'signed-out visitor looking at the roadmap'
const EXPECTED = process.env.UIL4B_EXPECT_ROADMAP

/** True when the served build has the roadmap flag on. Reads /tools in the browser. */
async function served(page) {
  await go(page, '/tools')
  await expect(page.locator('main, #main').first()).toBeVisible()
  const on = (await page.locator('#whats-next').count()) > 0
  if (EXPECTED) {
    expect(on, `UIL4B_EXPECT_ROADMAP=${EXPECTED} but the served build has the flag ${on ? 'on' : 'off'}`).toBe(EXPECTED === 'on')
  }
  return on
}
async function needFlag(page, wanted) {
  const on = await served(page)
  test.skip(on !== wanted, wanted ? 'this build has the roadmap flag off' : 'this build has the roadmap flag on')
}

/** Writes to Firestore, whichever protocol the SDK used (WebChannel Write stream or REST commit). */
function firestoreWrites(page) {
  const writes = []
  page.on('request', (req) => {
    let url
    try { url = new URL(req.url()) } catch { return }
    if (url.hostname !== 'firestore.googleapis.com' || !FIREBASE_HOSTS.includes(url.hostname)) return
    if (/\/Write(\/|$)|:commit$/.test(url.pathname)) writes.push(req.url())
  })
  return writes
}

/** Computed font families under `root` that look monospace. */
function monospaceElements(page, root) {
  return page.evaluate((selector) => {
    const mono = /mono|courier|consolas|menlo/i
    const bad = []
    for (const el of document.querySelectorAll(`${selector}, ${selector} *`)) {
      const family = getComputedStyle(el).fontFamily
      if (mono.test(family)) bad.push(`${el.tagName.toLowerCase()}.${el.className || ''}: ${family}`.slice(0, 160))
    }
    return bad
  }, root)
}

test.describe('roadmap voting, flag on', () => {
  test('/roadmap lists the open tools with their stage and a Vote button each', async ({ page }) => {
    watch(page, PERSONA)
    await needFlag(page, true)
    await go(page, '/roadmap')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Vote for the tools you want next.')
    const rows = page.locator('ol.vl[aria-label="Tools you can vote for"] > li.vr')
    expect(await rows.count(), 'fewer than two rows: the list is empty or one tool has gone missing').toBeGreaterThanOrEqual(2)
    for (const row of await rows.all()) {
      await expect(row.locator('.vr-name')).not.toBeEmpty()
      await expect(row.locator('.stage span')).toHaveText(/In beta|In the workshop/)
      await expect(row.getByRole('button', { name: /^Vote for / })).toBeEnabled()
    }
    await expect(page.getByRole('heading', { level: 2, name: 'How voting works' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'feedback form' })).toHaveAttribute('href', '/feedback')
  })

  for (const scheme of ['dark', 'light']) {
    test(`no element on /roadmap or the /tools foot computes to a monospace font (${scheme})`, async ({ page }) => {
      watch(page, PERSONA)
      await page.emulateMedia({ colorScheme: scheme })
      await needFlag(page, true)
      await go(page, '/roadmap')
      await expect(page.locator('li.vr').first()).toBeVisible()
      expect(await monospaceElements(page, 'main')).toEqual([])
      await go(page, '/tools')
      await expect(page.locator('#whats-next li.vr').first()).toBeVisible()
      expect(await monospaceElements(page, '#whats-next')).toEqual([])
    })
  }

  test('the monospace check can see a monospace font (it would catch one)', async ({ page }) => {
    await needFlag(page, true)
    await go(page, '/roadmap')
    await page.evaluate(() => { document.querySelector('.vote').style.fontFamily = 'ui-monospace, monospace' })
    expect((await monospaceElements(page, 'main')).length, 'a monospace font went unseen').toBeGreaterThan(0)
  })

  test('Vote buttons are 44px tall on a phone, on /roadmap and on the /tools foot', async ({ page }) => {
    watch(page, PERSONA)
    await page.setViewportSize({ width: 390, height: 844 })
    await needFlag(page, true)
    for (const [path, scope] of [['/roadmap', 'main'], ['/tools', '#whats-next']]) {
      await go(page, path)
      const buttons = page.locator(`${scope} button.vote`)
      expect(await buttons.count(), `${path} has no Vote buttons`).toBeGreaterThanOrEqual(2)
      for (const b of await buttons.all()) {
        const box = await b.boundingBox()
        expect(box.height, `${path} Vote button height`).toBeGreaterThanOrEqual(44)
        expect(box.width, `${path} Vote button width`).toBeGreaterThanOrEqual(92)
      }
    }
  })

  test('/roadmap and the /tools foot do not scroll sideways at 320px', async ({ page }) => {
    watch(page, PERSONA)
    await page.setViewportSize({ width: 320, height: 800 })
    await needFlag(page, true)
    for (const path of ['/roadmap', '/tools']) {
      await go(page, path)
      await expect(page.locator('li.vr').first()).toBeVisible()
      const overflow = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth
        // `body { overflow-x: clip }` hides a wide element instead of scrolling to it,
        // so the page's own width proves nothing: check where each row's parts end.
        const out = []
        for (const el of document.querySelectorAll('li.vr, li.vr .vr-name, li.vr .stage, li.vr .count, li.vr .vote, .vl-more')) {
          const r = el.getBoundingClientRect()
          if (r.right > vw + 1 || r.left < -1) out.push(`${el.className || el.tagName}: ${Math.round(r.left)}..${Math.round(r.right)} of ${vw}`)
        }
        return { scroll: document.documentElement.scrollWidth - vw, out }
      })
      expect(overflow.scroll, `${path} scrolls sideways`).toBeLessThanOrEqual(0)
      expect(overflow.out, `${path} parts outside the viewport`).toEqual([])
    }
  })

  test('pressing Vote while signed out opens the sign-in popup with the reason, and nothing is voted or written', async ({ page }) => {
    watch(page, PERSONA)
    const writes = firestoreWrites(page)
    await needFlag(page, true)
    await go(page, '/roadmap')
    const row = page.locator('li.vr').first()
    const button = row.locator('button.vote')
    const label = (await row.locator('.vr-name').innerText()).trim()
    await button.click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText(`Sign in to vote for ${label}`)
    expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('uil4b.pendingVote')).id),
      'the press should wait in sessionStorage for sign-in').toBe(await row.evaluate((el) => el.id.replace('vote-', '')))

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    // Dismissing drops the waiting vote and leaves the row as it was.
    expect(await page.evaluate(() => sessionStorage.getItem('uil4b.pendingVote'))).toBeNull()
    await expect(button).toHaveText(/^Vote/)
    await expect(button).toHaveAttribute('data-voted', 'false')
    // The row's live region stays on the page, empty.
    await expect(row.locator('.vr-status')).toHaveCount(1)
    await expect(row.locator('.vr-status')).toBeEmpty()
    expect(writes, 'a signed-out press wrote to Firestore').toEqual([])
  })

  test('every row has an empty status live region from the start, and the load line is one too', async ({ page }) => {
    watch(page, PERSONA)
    await needFlag(page, true)
    await go(page, '/roadmap')
    const rows = page.locator('ol.vl[aria-label="Tools you can vote for"] > li.vr')
    expect(await rows.count()).toBeGreaterThanOrEqual(2)
    for (const row of await rows.all()) {
      const region = row.locator('p.vr-status')
      await expect(region).toHaveCount(1)
      await expect(region).toHaveAttribute('role', 'status')
      await expect(region).toBeEmpty()
    }
    const line = page.locator('main p.vl-load')
    await expect(line).toHaveCount(1)
    await expect(line).toHaveAttribute('role', 'status')
  })

  test('with the counts failed, Try again keeps the load line on the page and says it is loading', async ({ page }) => {
    watch(page, PERSONA)
    await needFlag(page, true)
    await go(page, '/roadmap')
    const line = page.locator('main p.vl-load')
    // Firestore is out of reach for the runner; if the counts load anyway there is no failure to retry.
    await expect(page.locator('li.vr .count:not(:has(.sk))').first()).toBeVisible({ timeout: 30000 })
    test.skip(await page.locator('li.vr .count[id^="c-"]').count() > 0, 'the counts loaded, so there is no failed state to retry')
    await expect(line).toContainText('didn’t load')

    // Record every text the region shows, and keep a handle to the element itself.
    await line.evaluate((el) => {
      window.__loadLine = { el, texts: [] }
      new MutationObserver(() => window.__loadLine.texts.push(el.textContent)).observe(el, { childList: true, characterData: true, subtree: true })
    })
    await line.getByRole('button', { name: 'Try again' }).click()
    await expect.poll(() => page.evaluate(() => window.__loadLine.texts.some((t) => t.startsWith('Loading the counts'))),
      'the load line never said it was loading').toBe(true)
    expect(await page.evaluate(() => window.__loadLine.el.isConnected), 'the load line was removed and rebuilt').toBe(true)
  })

  test('a count that is unavailable reads through hidden text, not an aria-label on the number', async ({ page }) => {
    watch(page, PERSONA)
    await page.setViewportSize({ width: 1440, height: 900 })
    await needFlag(page, true)
    await go(page, '/roadmap')
    await expect(page.locator('li.vr .count:not(:has(.sk))').first()).toBeVisible({ timeout: 30000 })
    const dash = page.locator('li.vr .count.dash b').first()
    test.skip(await dash.count() === 0, 'the counts loaded, so there is no unavailable count')
    await expect(dash).not.toHaveAttribute('aria-label', /.*/)
    await expect(dash.locator('.sr-only')).toHaveText('Count unavailable')
    await expect(dash.locator('[aria-hidden="true"]')).toHaveText('–')
    // The slot is wide enough for three digits at the number's own size.
    const { width, size } = await dash.evaluate((el) => ({ width: el.getBoundingClientRect().width, size: parseFloat(getComputedStyle(el).fontSize) }))
    expect(width, 'the count slot is narrower than three digits').toBeGreaterThanOrEqual(size * 1.4)
    expect(await dash.evaluate((el) => getComputedStyle(el).fontVariantNumeric)).toContain('tabular-nums')
  })

  test('the /tools foot has a What\'s next group in place of the two sentences, linking to /roadmap', async ({ page }) => {
    watch(page, PERSONA)
    await needFlag(page, true)
    await go(page, '/tools')
    const group = page.locator('#whats-next')
    await expect(group.getByRole('heading', { name: 'What’s next' })).toBeVisible()
    await expect(group.getByRole('link', { name: 'See the full roadmap' })).toHaveAttribute('href', '/roadmap')
    await expect(page.locator('.spt-more')).toHaveCount(0)
    await expect(page.getByRole('contentinfo').getByRole('link', { name: 'Roadmap', exact: true })).toHaveAttribute('href', '/roadmap')
  })
})

test.describe('roadmap voting, flag off', () => {
  test('/roadmap is not the roadmap page', async ({ page }) => {
    watch(page, PERSONA)
    await needFlag(page, false)
    const res = await go(page, '/roadmap')
    await expect(page.locator('main, #main').first()).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Vote for the tools you want next.' })).toHaveCount(0)
    await expect(page.locator('li.vr')).toHaveCount(0)
    await expect(page).not.toHaveTitle(/Roadmap/)
    // The app's own unknown-route answer: the not-found page (the preview server sends it with a 200; a host may send 404).
    await expect(page).toHaveTitle('UI L4B | Page not found')
    expect([200, 404], `/roadmap answered ${res.status()}`).toContain(res.status())
  })

  test('/tools keeps its two sentences and has no #whats-next', async ({ page }) => {
    watch(page, PERSONA)
    await needFlag(page, false)
    await go(page, '/tools')
    await expect(page.locator('#whats-next')).toHaveCount(0)
    await expect(page.locator('.spt-more')).toHaveCount(2)
    await expect(page.getByRole('contentinfo').getByRole('link', { name: 'Roadmap', exact: true })).toHaveCount(0)
  })
})
