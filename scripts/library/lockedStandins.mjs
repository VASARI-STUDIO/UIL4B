// Writes the stand-in pictures a locked image preview shows in place of the real one.
//
//   node scripts/library/lockedStandins.mjs
//
// A locked Pro preview (a locked prompt's output poster, an export theme's book
// or guidelines pages) used to load the real picture and blur it with CSS. The
// real file was then one right-click, one devtools edit or one image-saving
// extension away. Now a locked card loads one of these instead: the same picture
// shrunk to a few dozen pixels and softened, so there is no sharper version in
// the page, the stylesheet, a srcset or a preload to find. The card scales it up
// with a mild CSS blur, which reads as the same soft wash the heavy blur gave.
//
// Reads  public/previews/prompts/poster/<id>.webp (free)
//        api/_lib/pro/previews/prompts/poster/<id>.webp (locked, fetched Pro data)
//        public/export-themes/<theme>-(book|guideCover|guidePalette).webp
// Writes public/locked-images/prompts/<id>.webp
//        public/locked-images/export-themes/<theme>-<key>.webp
//
// The UI kit pictures are not here: the kit is previewed sharp in every theme.
//
// Needs Playwright's Chromium, which does the resize and the WebP encoding on a
// canvas. Run it after a poster or a theme picture changes; the test checks every
// source has a stand-in and that no stand-in is big enough to carry detail.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
export const STANDIN_DIR = 'public/locked-images'
// Widest a stand-in may be, in pixels. Small enough that no letterform survives.
export const STANDIN_MAX_W = 48
export const PROMPT_W = 32
export const THEME_W = 40
const QUALITY = 0.6
export const THEME_KEYS = Object.freeze(['book', 'guideCover', 'guidePalette'])
// Free posters, then the locked ones from the fetched Pro data (scripts/fetch-pro-data.mjs).
export const POSTER_DIRS = Object.freeze(['public/previews/prompts/poster', 'api/_lib/pro/previews/prompts/poster'])

/** Every { from, to, width } job, as repo-relative paths. */
export function standinJobs() {
  const jobs = []
  // Free posters are public. Locked ones come with the fetched Pro data and are
  // absent when it was not fetched (no PRO_DATA_TOKEN): their committed stand-ins stay as they are.
  for (const dir of POSTER_DIRS) {
    if (!fs.existsSync(path.join(ROOT, dir))) continue
    for (const f of fs.readdirSync(path.join(ROOT, dir)).filter((n) => n.endsWith('.webp')).sort()) {
      jobs.push({ from: `${dir}/${f}`, to: `${STANDIN_DIR}/prompts/${f}`, width: PROMPT_W })
    }
  }
  const themes = path.join(ROOT, 'public/export-themes')
  for (const f of fs.readdirSync(themes).filter((n) => n.endsWith('.webp')).sort()) {
    const key = THEME_KEYS.find((k) => f.endsWith(`-${k}.webp`))
    if (key) jobs.push({ from: `public/export-themes/${f}`, to: `${STANDIN_DIR}/export-themes/${f}`, width: THEME_W })
  }
  return jobs
}

// Runs in the page: halve until close to the target (one big step aliases), draw
// at the target size, soften by a pixel, encode.
async function shrink({ b64, width, quality }) {
  const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
  const bmp = await createImageBitmap(new Blob([bin], { type: 'image/webp' }))
  const w = width
  const h = Math.max(1, Math.round((bmp.height / bmp.width) * w))
  let from = bmp
  let fw = bmp.width
  let fh = bmp.height
  while (fw / 2 > w * 2) {
    fw = Math.round(fw / 2)
    fh = Math.round(fh / 2)
    const step = new OffscreenCanvas(fw, fh)
    const c = step.getContext('2d')
    c.imageSmoothingQuality = 'high'
    c.drawImage(from, 0, 0, fw, fh)
    from = step
  }
  const small = new OffscreenCanvas(w, h)
  const sc = small.getContext('2d')
  sc.imageSmoothingQuality = 'high'
  sc.drawImage(from, 0, 0, w, h)
  const out = new OffscreenCanvas(w, h)
  const oc = out.getContext('2d')
  oc.filter = 'blur(1px)'
  oc.drawImage(small, 0, 0)
  const blob = await out.convertToBlob({ type: 'image/webp', quality })
  const buf = new Uint8Array(await blob.arrayBuffer())
  let s = ''
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000))
  return { b64: btoa(s), w, h }
}

export async function writeStandins() {
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    await page.goto('about:blank')
    let written = 0
    for (const job of standinJobs()) {
      const b64 = fs.readFileSync(path.join(ROOT, job.from)).toString('base64')
      const out = await page.evaluate(`(${shrink.toString()})(${JSON.stringify({ b64, width: job.width, quality: QUALITY })})`)
      const dest = path.join(ROOT, job.to)
      fs.mkdirSync(path.dirname(dest), { recursive: true })
      fs.writeFileSync(dest, Buffer.from(out.b64, 'base64'))
      written += 1
    }
    return written
  } finally {
    await browser.close()
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const n = await writeStandins()
  console.log(`wrote ${n} stand-ins to ${STANDIN_DIR}`)
}
