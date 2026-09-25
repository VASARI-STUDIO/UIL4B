// Errors nothing caught — a throw in a timer, an unhandled rejection — are
// recorded (src/utils/errorReport.js), once each, and outside production only
// logged. The crash SCREEN is tested in 47-lazy-route-readiness.spec.js, the one
// spec allowed to read a route before it has rendered.
import { test, expect } from './base.js'
import { go } from './helpers.js'

for (const [kind, raise] of [
  ['an error thrown in a timer', () => { setTimeout(() => { throw new Error('probe: uncaught') }, 0) }],
  ['an unhandled rejection', () => { Promise.reject(new Error('probe: uncaught')) }],
]) {
  test(`${kind} is recorded once, and outside production it is only logged`, async ({ page }) => {
    const posted = []
    page.on('request', (r) => { if (r.url().includes('/api/support')) posted.push(r.url()) })
    const logged = []
    page.on('console', (m) => {
      if (m.text().includes('[crash report, not sent outside production]')) logged.push(m.text())
    })

    await go(page, '/create/contrast')
    await page.evaluate(raise)
    await expect.poll(() => logged.length, { timeout: 5000 }).toBe(1)
    expect(logged[0]).toContain('Crash on /create/contrast: probe: uncaught')
    // The same error again is not a second report.
    await page.evaluate(raise)
    await page.waitForTimeout(500)
    expect(logged).toHaveLength(1)
    expect(posted, 'a local build must never post a crash to the admin queue').toEqual([])
  })
}
