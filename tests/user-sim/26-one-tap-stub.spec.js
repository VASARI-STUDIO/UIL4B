// Guard: Google One Tap never reaches the network, from any browser context.
//
// This is the observational half of the guard. The structural half —
// "every spec gets `test` from base.js, and no spec rolls its own stub" — is
// `tests/unit/one-tap-stub.test.js`, so a spec that bypasses the mechanism
// fails the cheap gate rather than only the browser one. The suite-wide half is
// `assertOneTapNeverLeft()` in the global teardown, which fails the whole run if
// a single response from accounts.google.com arrived without the stub's header.
//
// Numbered 26 rather than 25: 25 is claimed by the layout-target-sweep spec in flight
// alongside this branch.
//
// Each case injects the exact script tag src/components/GoogleOneTap.jsx
// injects, rather than waiting for the app to inject it. Waiting would make the
// guard depend on Firebase auth resolving in the runner, and a guard that can
// pass by never running the thing it guards is worth nothing.
import { test, expect, isOneTapStubInstalled, STUB_HEADER, isOneTapUrl } from './base.js'

const GIS_SRC = 'https://accounts.google.com/gsi/client'

async function loadGisTheWayTheAppDoes(page) {
  const responded = page.waitForResponse((r) => isOneTapUrl(r.url()), { timeout: 15000 })
  const outcome = await page.evaluate((src) => new Promise((resolve) => {
    const s = document.createElement('script')
    s.src = src
    s.async = true
    s.onload = () => resolve('load')
    s.onerror = () => resolve('error')
    document.head.appendChild(s)
  }), GIS_SRC)
  return { outcome, response: await responded }
}

test('the One Tap stub is installed on the browser, not just on the page fixture', async ({ browser }) => {
  expect(isOneTapStubInstalled(browser)).toBe(true)
})

// The context the default `page` fixture rides on, and a context built by hand
// inside the test body — the second is the one a page-fixture-only stub misses.
for (const origin of ['the default page fixture', 'a context built inside the test body']) {
  test(`One Tap is served from the stub and never reaches Google — ${origin}`, async ({ browser, page }) => {
    let target = page
    let own = null
    if (origin !== 'the default page fixture') {
      own = await browser.newContext({ viewport: { width: 1440, height: 900 } })
      target = await own.newPage()
    }

    await target.goto('/', { waitUntil: 'domcontentloaded' })
    const { outcome, response } = await loadGisTheWayTheAppDoes(target)

    // Fulfilled, not aborted: the script tag must fire onload, because an
    // abort fires onerror and raises the console error this stub exists to
    // avoid.
    expect(outcome).toBe('load')

    // Observed, not inferred: this header only exists because our route wrote
    // it, and a response carrying it never left the machine.
    expect(response.headers()[STUB_HEADER]).toBe('1')
    expect(response.status()).toBe(200)
    expect(await response.text()).toBe('')

    // Independent confirmation from Playwright's own network layer: a fulfilled
    // route has no remote peer.
    expect(await response.serverAddr()).toBeNull()

    // The decisive one. The real GSI client defines window.google.accounts.id;
    // an empty script cannot. If this is ever defined, the stub did not hold —
    // and this assertion does not care *how* it failed to hold.
    expect(await target.evaluate(() => typeof window.google)).toBe('undefined')

    await own?.close()
  })
}
