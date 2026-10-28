// Renders 40 seeded Random rolls to one PNG each: grid-40.png (this branch's best of
// eight) and grid-40-before.png (main's Random, from the last commit before G3).
// Same 40 seeds in both. No dev server: the tiles are static HTML that use the same
// CSS the tool paints (`in oklch` where the roll says Perceived).
//   node .claude/scratch/gradg3/grid.mjs
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { chromium } from '@playwright/test'

const root = path.resolve(import.meta.dirname, '../../..')
const out = path.join(root, '.claude/scratch/gradg3')
const BASE = '42338ee1' // the G2 head: Random as it was before G3
const SEEDS = Array.from({ length: 40 }, (_, i) => 101 + i)

// The old engine, as a temp file beside the scratch output, pointed at this lane's oklch helper.
const oldDir = path.join(out, 'before')
fs.mkdirSync(oldDir, { recursive: true })
const oldSrc = execFileSync('git', ['show', `${BASE}:src/utils/gradientRandom.js`], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 24 })
  .replace("'../components/tool/oklch.js'", JSON.stringify(pathToFileURL(path.join(root, 'src/components/tool/oklch.js')).href))
const oldFile = path.join(oldDir, 'gradientRandomOld.mjs')
fs.writeFileSync(oldFile, oldSrc)

const { rollGradient: rollNew, mulberry32 } = await import(pathToFileURL(path.join(root, 'src/utils/gradientRandom.js')).href)
const { rollGradient: rollOld } = await import(pathToFileURL(oldFile).href)

const cssOf = (g, space) => {
  const s = g.stops.map((x) => `${x.color} ${x.position}%`).join(', ')
  const sp = space === 'srgb' ? '' : ' in oklch'
  if (g.type === 'Radial') return `radial-gradient(circle${sp}, ${s})`
  if (g.type === 'Conic') return `conic-gradient(from ${g.angle}deg${sp}, ${s})`
  return `linear-gradient(${g.angle}deg${sp}, ${s})`
}

async function render(title, rolls, file) {
  const tiles = rolls.map((g, i) => {
    const space = g.space || 'oklch' // main's Random never set the space, so the page kept its default
    return `<figure><div class="t" style="background:${cssOf(g, space)}"></div>
      <figcaption>${i + 1} · ${g.type} ${g.type === 'Radial' ? '' : g.angle + '°'} · ${space === 'srgb' ? 'Standard' : 'Perceived'}<br>${g.stops.map((x) => x.color).join(' ')}</figcaption></figure>`
  }).join('')
  const html = `<!doctype html><meta charset="utf-8"><style>
    body{margin:0;padding:20px;background:#f4f4f2;font:12px/1.35 system-ui,sans-serif;color:#222;width:1600px}
    h1{font:600 16px system-ui;margin:0 0 12px}
    .g{display:grid;grid-template-columns:repeat(8,1fr);gap:14px}
    figure{margin:0}.t{height:150px;border-radius:8px}
    figcaption{margin-top:5px;font-size:11px;color:#555}
  </style><h1>${title}</h1><div class="g">${tiles}</div>`
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1640, height: 1100 } })
  await page.setContent(html)
  await page.screenshot({ path: path.join(out, file), fullPage: true })
  await browser.close()
  console.log('wrote', file)
}

await render('Random, this branch (best of eight, drawn interpolation) - seeds 101-140', SEEDS.map((s) => rollNew(mulberry32(s))), 'grid-40.png')
await render('Random, before G3 (single roll, no interpolation draw) - seeds 101-140', SEEDS.map((s) => rollOld(mulberry32(s))), 'grid-40-before.png')
fs.rmSync(oldDir, { recursive: true, force: true })
