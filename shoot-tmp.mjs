// Fidelity comparison capture: the five homepage mini tools vs the five real tools.
// Usage: node shoot.mjs <outDirTag> [baseUrl]
import { chromium } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const TAG = process.argv[2] || 'before'
const BASE = process.argv[3] || 'http://localhost:5199'
const OUT = path.isAbsolute(TAG) ? TAG : path.join(process.cwd(), TAG)
fs.mkdirSync(OUT, { recursive: true })

const MODES = ['palette', 'gradient', 'image', 'icon', 'typography']
const REAL = [
  ['palette', '/create/palette'],
  ['gradient', '/create/gradient'],
  ['image', '/create/file-converter'],
  ['icon', '/create/icons'],
  ['typography', '/create/type-scale'],
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await chromium.launch()
const measurements = []

for (const [w, h] of [[1440, 900], [1280, 660]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.log(`PAGEERROR ${w}x${h}:`, e.message))

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await sleep(1200)
  // Bring the sticky workbench to rest.
  await page.evaluate(() => document.querySelector('.hsteps-sticky')?.scrollIntoView({ block: 'center' }))
  await sleep(900)
  const restingY = await page.evaluate(() => scrollY)

  for (const mode of MODES) {
    await page.evaluate((m) => {
      const t = [...document.querySelectorAll('.hsteps-sticky .hw-tab')].find((b) => b.dataset.tab === m)
      t?.click()
    }, mode)
    await sleep(320)
    await page.evaluate((y) => scrollTo(0, y), restingY)
    await sleep(420)
    const shell = page.locator('.hsteps-sticky .hw-shell')
    await shell.screenshot({ path: path.join(OUT, `mini-${mode}-${w}x${h}.png`) })

    const m = await page.evaluate(() => {
      const vis = (el) => el && el.offsetParent !== null
      const pick = (s) => [...document.querySelectorAll(`.hsteps-sticky ${s}`)].filter(vis)[0]
      const r = (el) => (el ? +el.getBoundingClientRect().height.toFixed(1) : null)
      const zone = pick('.hw-controls')
      return {
        shell: r(pick('.hw-shell')),
        stage: r(pick('.hw-stage')),
        controls: r(zone),
        foot: r(pick('.hw-foot')),
        controlsScrollH: zone ? zone.scrollHeight : null,
      }
    })
    measurements.push({ viewport: `${w}x${h}`, mode, ...m })
  }
  await page.close(); await ctx.close()
}

// Real tools at 1440x900 only — this is about visual language, not their reflow.
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  for (const [name, route] of REAL) {
    try {
      await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' })
      await sleep(3000)
      await page.screenshot({ path: path.join(OUT, `real-${name}.png`) })
    } catch (e) { console.log(`REAL ${name} failed:`, e.message) }
  }
  await page.close(); await ctx.close()
}

await browser.close()
fs.writeFileSync(path.join(OUT, 'measurements.json'), JSON.stringify(measurements, null, 2))
console.log(JSON.stringify(measurements, null, 2))
