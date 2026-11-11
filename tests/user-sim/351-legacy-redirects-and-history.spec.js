// A RETIRED ADDRESS MOVES THE BUYER ON WITHOUT TRAPPING THE BACK BUTTON.
//
// The router answers each retired path with <Navigate replace> (App.jsx LegacyRedirect).
// `replace` is the whole point: with a push, Back from the new page returns to the
// retired one, which redirects forward again, and the visitor can never leave. Nothing
// else in the suite walks the browser history through one.
//
// For each retired path the spec opens a page first, goes to the retired address and
// checks, polling each time:
//   · the page lands on the new address, the visitor's own query and the destination's
//     fragment carried over (mergeRedirectQuery);
//   · the retired address took no history entry of its own (history.length is one more
//     than on the page before: the new address replaced it);
//   · Back is the page before, not the retired address and not a bounce;
//   · Forward is the new address again, and it stays there.
// One case moves without a reload (the retired path pushed onto the router's own
// history), because a link inside the app does that.
//
// ── MUTATION ────────────────────────────────────────────────────────────────
// App.jsx LegacyRedirect: remove `replace` from the <Navigate>. The history.length
// check and Back both fail (Back lands on the retired address, which bounces forward).
// Point a row of legacyRoutes.js at the wrong place: the landing check names it.
import { test, expect } from './base.js'
import { go, goRaw, ready, signIn, watch } from './helpers.js'

const START = '/credits'

const CASES = [
  { retired: '/pricing', lands: '/plans' },
  { retired: '/pricing?billing=yearly', lands: '/plans?billing=yearly', note: 'a query is carried over' },
  { retired: '/support?reason=card', lands: '/feedback?reason=card&from=support', note: 'the destination query and the visitor\'s are merged' },
  { retired: '/site-map', lands: '/sitemap' },
  { retired: '/help', lands: '/learn/help' },
  { retired: '/about', lands: '/learn/help#about', note: 'a fragment on the destination is kept' },
  { retired: '/dashboard', lands: '/projects', signedIn: true, note: 'a signed-in route behind the retired name' },
]

const here = (page) => {
  const u = new URL(page.url())
  return u.pathname + u.search + u.hash
}
// Query order is not part of the address.
const canonical = (address) => {
  const u = new URL(address, 'http://x.test')
  return u.pathname + '?' + [...u.searchParams].map(([k, v]) => `${k}=${v}`).sort().join('&') + u.hash
}
const sameAddress = (a, b) => canonical(a) === canonical(b)
const historyLength = (page) => page.evaluate(() => window.history.length)

async function openFrom(page, signedIn) {
  if (signedIn) await signIn(page, { plan: 'free', projects: 1 })
  await go(page, START)
  expect(here(page), 'the page before').toBe(START)
  return historyLength(page)
}

for (const c of CASES) {
  test(`${c.retired} lands on ${c.lands}, and Back and Forward do not loop${c.note ? ` (${c.note})` : ''}`, async ({ page }) => {
    watch(page, 'a visitor who follows an old link')
    const before = await openFrom(page, c.signedIn)

    await goRaw(page, c.retired)
    await expect.poll(() => sameAddress(here(page), c.lands), { message: `landed on ${here(page)}` }).toBe(true)
    await ready(page, c.lands)
    expect(await historyLength(page), 'the retired address took no history entry of its own').toBe(before + 1)

    await page.goBack()
    await expect.poll(() => here(page), { message: 'one step back is the page before the old link' }).toBe(START)
    await ready(page, START)

    await page.goForward()
    await expect.poll(() => sameAddress(here(page), c.lands), { message: `forward landed on ${here(page)}` }).toBe(true)
    await ready(page, c.lands)
    expect(await historyLength(page), 'going forward made no new entries').toBe(before + 1)
  })
}

test('a retired address reached inside the app (no reload) is replaced too', async ({ page }) => {
  watch(page, 'a visitor who follows an old link inside the app')
  const before = await openFrom(page, false)

  // What a router <Link to="/pricing"> does: push the address and tell the router.
  await page.evaluate(() => {
    window.history.pushState({}, '', '/pricing')
    window.dispatchEvent(new PopStateEvent('popstate', { state: {} }))
  })
  await expect.poll(() => here(page), { message: 'moved on without a reload' }).toBe('/plans')
  await ready(page, '/plans')
  expect(await historyLength(page), 'the retired address was replaced, not kept').toBe(before + 1)

  await page.goBack()
  await expect.poll(() => here(page), { message: 'Back is the page before the old link' }).toBe(START)
  await page.goForward()
  await expect.poll(() => here(page)).toBe('/plans')
})

test('a page opened with /plans first, then the old pricing link, comes back to /plans and not further', async ({ page }) => {
  await go(page, '/plans')
  const before = await historyLength(page)
  await go(page, '/plans')
  await goRaw(page, '/pricing')
  await expect.poll(() => here(page)).toBe('/plans')
  await ready(page, '/plans')
  await page.goBack()
  await expect.poll(() => here(page), { message: 'Back is the first /plans, not a loop through /pricing' }).toBe('/plans')
  await page.goForward()
  await expect.poll(() => here(page)).toBe('/plans')
  expect(await historyLength(page), 'the old link left one entry, not two').toBe(before + 1)
})
