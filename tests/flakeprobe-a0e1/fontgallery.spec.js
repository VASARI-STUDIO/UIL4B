// Probe: can the Font Gallery h1 assertion fail on demand under CPU load?
import { test, expect } from '../user-sim/base.js'
import { go, renderState } from '../user-sim/helpers.js'

const RATES = [1, 2, 4, 6, 8, 10, 16, 20]

for (const rate of RATES) {
  test(`font-gallery h1 @ cpu ${rate}x`, async ({ page }) => {
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate })

    const t0 = Date.now()
    let readyErr = null
    try {
      await go(page, '/create/font-gallery')
    } catch (e) {
      readyErr = String(e.message).slice(0, 200)
    }
    const readyMs = Date.now() - t0

    const s = await renderState(page).catch(() => null)
    const h1 = await page.evaluate(() => {
      const el = document.querySelector('h1')
      if (!el) return { exists: false }
      const r = el.getBoundingClientRect()
      return {
        exists: true,
        html: el.innerHTML,
        text: el.innerText,
        textContent: el.textContent,
        w: Math.round(r.width),
        h: Math.round(r.height),
        count: document.querySelectorAll('h1').length,
      }
    }).catch(() => null)

    // The actual assertion the real spec makes, with a short timeout so we can
    // see it fail rather than wait for the suite timeout.
    let assertErr = null
    try {
      await expect(page.getByRole('heading', { level: 1, name: 'Font Gallery' }))
        .toBeVisible({ timeout: 5000 })
    } catch (e) {
      assertErr = String(e.message).split('\n').slice(0, 6).join(' | ').slice(0, 300)
    }

    console.log(`\n### rate=${rate} readyMs=${readyMs} readyErr=${readyErr}`)
    console.log(`### state=${JSON.stringify(s)}`)
    console.log(`### h1=${JSON.stringify(h1)}`)
    console.log(`### assertErr=${assertErr}`)
  })
}
