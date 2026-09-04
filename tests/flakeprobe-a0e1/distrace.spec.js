// Probe: does a REBUILD OF dist/ DURING a run reproduce the flake class?
//
// `vite build` empties dist/ before refilling it, and `vite preview` serves
// dist/ as static files. So for the duration of a build, every asset the
// running workers ask for can 404 — the entry bundle, a lazy route chunk, or
// index.html itself. Set FLAKE_REBUILD=1 in the environment and run a
// `vite build` loop alongside this to see what that does to an ordinary
// navigate-and-assert.
import { test, expect } from '../user-sim/base.js'
import { go, renderState } from '../user-sim/helpers.js'

const ROUTES = [
  ['/create/font-gallery', 'Font Gallery'],
  ['/create/font-pair', 'Font Pair'],
]

const LAPS = Number(process.env.FLAKE_LAPS || 12)

for (const [route, heading] of ROUTES) {
  test(`${route} survives ${LAPS} laps`, async ({ page }) => {
    const failures = []
    const net = []
    page.on('response', (r) => {
      if (r.status() >= 400 && /\/assets\/|\.js$|\.css$|\/$/.test(r.url())) {
        net.push(`${r.status()} ${r.url().split('/').pop()}`)
      }
    })

    for (let lap = 0; lap < LAPS; lap++) {
      let err = null
      try {
        await go(page, route)
        await expect(page.getByRole('heading', { level: 1, name: heading }))
          .toBeVisible({ timeout: 5000 })
      } catch (e) {
        err = String(e.message).split('\n')[0].slice(0, 120)
      }
      if (err) {
        const s = await renderState(page).catch(() => null)
        failures.push({ lap, err, state: s })
      }
    }

    console.log(`\n### ${route} failures=${failures.length}/${LAPS}`)
    for (const f of failures) console.log(`###   lap ${f.lap}: ${f.err} :: ${JSON.stringify(f.state)}`)
    if (net.length) console.log(`### 4xx/5xx assets (${net.length}): ${[...new Set(net)].slice(0, 8).join(', ')}`)
  })
}
