// Homepage field metrics on a throttled mobile profile — the instrument that
// produced the numbers recorded on the `homepage-field-metrics` pipeline item.
//
// WHY THIS IS A SCRIPT AND NOT A TEST. These numbers depend on the machine they
// were taken on, so they cannot fail a build without failing it at random on a
// busy laptop. What CAN be asserted is asserted elsewhere:
// tests/unit/home-asset-budget.test.js holds the byte budgets. This exists so
// the timings are re-measurable rather than remembered — a perf figure nobody
// can reproduce is indistinguishable from one that was estimated.
//
// THE PROFILE, stated in full, because a latency number without one is not a
// field metric:
//   device   Playwright devices['Pixel 5'] — 393x851 CSS px, DSF 2.75, isMobile
//   network  CDP Network.emulateNetworkConditions — REAL packet-level shaping,
//            not Lighthouse's simulation: latency 150 ms, down 204800 B/s
//            (1.6 Mbit/s), up 96000 B/s (750 Kbit/s). These are the documented
//            "Slow 4G" mobile targets.
//   cpu      CDP Emulation.setCPUThrottlingRate, rate 4 (4x slowdown)
//   cache    disabled, and a NEW BROWSER CONTEXT PER RUN. A same-context reload
//            reuses the HTTP and compiled-script caches, which is the whole
//            difference between a ~2.9s cold first paint and a ~27ms warm one.
//            Reporting the warm number as a field metric would be the entire
//            error this file exists to avoid.
//
// HOW IT SETTLES. Never on a stopwatch. It waits for `load`, then for every
// running animation's `finished` promise, then for an 800ms window with no new
// layout shift. Two equal pixel reads are not proof a page is still.
//
// WHAT IT REPORTS. FCP, LCP, CLS and interaction response. Interaction is read
// from the Event Timing API — the same entries INP is computed from — after
// clicking a real control on the page, not from a stopwatch around the click.
//
// USAGE
//   npm run build
//   npx vite preview --host 127.0.0.1 --port 4565 --strictPort &
//   node scripts/home-field-metrics.mjs http://127.0.0.1:4565 10 out.json
//   # then kill the preview server
import fs from 'node:fs'
import { chromium, devices } from '@playwright/test'

const BASE = (process.argv[2] || 'http://127.0.0.1:4173').replace(/\/$/, '')
const RUNS = Number(process.argv[3] || 10)
const OUT = process.argv[4]

const NETWORK = { offline: false, latency: 150, downloadThroughput: 204800, uploadThroughput: 96000 }
const CPU_RATE = 4

// The budgets this item inherited from the retired homepage acceptance contract.
const BUDGETS = { lcpMs: 2500, cls: 0.05, interactionMs: 200 }

// Installed before any page script so no early entry can be missed; `buffered`
// covers anything that landed before the observer attached.
const INIT = `
window.__perf = { lcp: 0, lcpEl: '', cls: 0, shifts: 0, fcp: 0, events: [] }
try { new PerformanceObserver(l => { for (const e of l.getEntries()) {
  window.__perf.lcp = e.startTime
  window.__perf.lcpEl = e.element ? e.element.tagName + (e.element.className ? '.' + String(e.element.className).split(' ')[0] : '') : ''
} }).observe({ type: 'largest-contentful-paint', buffered: true }) } catch { /* unsupported */ }
try { new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) { window.__perf.cls += e.value; window.__perf.shifts += 1 } })
  .observe({ type: 'layout-shift', buffered: true }) } catch { /* unsupported */ }
try { new PerformanceObserver(l => { for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') window.__perf.fcp = e.startTime })
  .observe({ type: 'paint', buffered: true }) } catch { /* unsupported */ }
try { new PerformanceObserver(l => { for (const e of l.getEntries()) if (e.interactionId) window.__perf.events.push(e.duration) })
  .observe({ type: 'event', buffered: true, durationThreshold: 0 }) } catch { /* unsupported */ }
`

const SETTLE = `(async () => {
  await new Promise(r => (document.readyState === 'complete' ? r() : addEventListener('load', r, { once: true })))
  await Promise.race([
    Promise.allSettled(document.getAnimations().map(a => a.finished)),
    new Promise(r => setTimeout(r, 6000)),
  ])
  await new Promise(res => {
    let last = performance.now()
    let po
    try { po = new PerformanceObserver(() => { last = performance.now() }); po.observe({ type: 'layout-shift', buffered: false }) } catch { /* unsupported */ }
    const started = performance.now()
    const t = setInterval(() => {
      if (performance.now() - last > 800 || performance.now() - started > 8000) { clearInterval(t); if (po) po.disconnect(); res() }
    }, 100)
  })
})()`

const REMOTE_CATALOGUE = /iconify|fonts\.googleapis|fonts\.gstatic|googleapis\.com\/webfonts/i
const FFMPEG = /ffmpeg/i
const GSAP = /gsap|ScrollTrigger/i

const runs = []
const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] })

for (let i = 0; i < RUNS; i += 1) {
  const context = await browser.newContext({ ...devices['Pixel 5'] })
  await context.addInitScript({ content: INIT })
  const page = await context.newPage()

  const requested = []
  page.on('request', r => requested.push(r.url()))

  const cdp = await context.newCDPSession(page)
  await cdp.send('Network.enable')
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
  await cdp.send('Network.emulateNetworkConditions', NETWORK)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_RATE })

  await page.goto(`${BASE}/`, { waitUntil: 'commit', timeout: 120000 })
  await page.evaluate(SETTLE)
  const load = await page.evaluate(() => ({ ...window.__perf }))

  // POSITIVE CONTROL. A page that rendered nothing paints fast; without this,
  // a broken build would look like a performance win.
  const heroChars = await page.evaluate(() => (document.querySelector('.home-hero-h1')?.innerText || '').length)
  if (!heroChars) throw new Error(`run ${i + 1}: the homepage rendered no headline — these timings would be meaningless`)

  let interaction = null
  const tabs = page.locator('.hw-tab')
  if (await tabs.count() > 1) {
    await tabs.nth(1).click({ timeout: 20000 })
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))))
    await page.waitForTimeout(600)
    const durs = await page.evaluate(() => window.__perf.events)
    interaction = durs.length ? Math.round(Math.max(...durs)) : null
  }
  const after = await page.evaluate(() => ({ ...window.__perf }))

  runs.push({
    run: i + 1,
    fcp: Math.round(load.fcp),
    lcp: Math.round(load.lcp),
    lcpEl: load.lcpEl,
    cls: Number(after.cls.toFixed(4)),
    shifts: after.shifts,
    interactionMs: interaction,
    remoteCatalogue: requested.filter(u => REMOTE_CATALOGUE.test(u)),
    ffmpeg: requested.filter(u => FFMPEG.test(u)),
    gsap: requested.filter(u => GSAP.test(u)),
  })
  const r = runs[i]
  console.log(`run ${r.run}/${RUNS}  fcp=${r.fcp}ms  lcp=${r.lcp}ms (${r.lcpEl})  cls=${r.cls} (${r.shifts} shifts)  interaction=${r.interactionMs}ms`)
  await context.close()
}
await browser.close()

const stat = (key) => {
  const v = runs.map(r => r[key]).filter(x => typeof x === 'number')
  if (!v.length) return null
  const s = [...v].sort((a, b) => a - b)
  return { n: v.length, mean: Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 1e4) / 1e4, median: s[(s.length / 2) | 0], min: s[0], worst: s[s.length - 1] }
}

const summary = {
  base: BASE,
  profile: { device: 'Pixel 5 (393x851, DSF 2.75, isMobile)', network: NETWORK, cpuThrottlingRate: CPU_RATE, cacheDisabled: true, contextPerRun: true },
  runs: RUNS,
  fcp: stat('fcp'),
  lcp: stat('lcp'),
  cls: stat('cls'),
  interactionMs: stat('interactionMs'),
  lcpElements: [...new Set(runs.map(r => r.lcpEl))],
  remoteCatalogueCalls: [...new Set(runs.flatMap(r => r.remoteCatalogue))],
  ffmpegCalls: [...new Set(runs.flatMap(r => r.ffmpeg))],
  gsapChunks: [...new Set(runs.flatMap(r => r.gsap))],
}

const verdict = (name, got, budget, ok) => `  ${ok ? 'MET   ' : 'MISSED'}  ${name}: ${got} (budget ${budget})`
console.log('\nBUDGETS')
console.log(verdict('LCP', `${summary.lcp.mean}ms mean / ${summary.lcp.worst}ms worst`, `<= ${BUDGETS.lcpMs}ms`, summary.lcp.worst <= BUDGETS.lcpMs))
console.log(verdict('CLS', `${summary.cls.worst} worst`, `<= ${BUDGETS.cls}`, summary.cls.worst <= BUDGETS.cls))
console.log(verdict('interaction response', `${summary.interactionMs.worst}ms worst`, `<= ${BUDGETS.interactionMs}ms`, summary.interactionMs.worst <= BUDGETS.interactionMs))
console.log(verdict('no remote image/icon/font-catalogue call', `${summary.remoteCatalogueCalls.length} call(s)`, '0', !summary.remoteCatalogueCalls.length))
console.log(verdict('no FFmpeg on the homepage', `${summary.ffmpegCalls.length} call(s)`, '0', !summary.ffmpegCalls.length))
console.log(verdict('GSAP loaded as its own chunk', `${summary.gsapChunks.length} chunk(s)`, '>= 1, after first paint', summary.gsapChunks.length >= 1))

if (OUT) { fs.writeFileSync(OUT, JSON.stringify({ ...summary, runsDetail: runs }, null, 2)); console.log(`\nwrote ${OUT}`) }
