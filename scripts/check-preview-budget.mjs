// Checks the preview examples against their size budget, from a finished build.
//
//   npx vite build --mode test --manifest --outDir dist-<lane>
//   node scripts/check-preview-budget.mjs --outDir dist-<lane>
//
// The budget (docs: the UI preview examples spec, section 7):
//   * each example: at most 14 KB gzip of its own JS and CSS (inline SVG is in
//     the JS), counted from its chunk and the stylesheets that chunk pulls in,
//     not from the React and shared chunks it imports;
//   * each example: at most 2 font files that are not already loaded by the app,
//     and the pair at most 120 KB together;
//   * the dialog shell (PalettePreviewDialog + PalettePreview): at most 20 KB gzip.
//
// Exits 1 on any miss, with the sizes so the miss can be read. Pass --json to
// print the numbers and not fail (for the PR description).
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import zlib from 'node:zlib'

export const EXAMPLE_GZIP = 14 * 1024
export const EXAMPLE_FONT_FILES = 2
export const EXAMPLE_FONT_BYTES = 120 * 1024
export const SHELL_GZIP = 20 * 1024

// Font files the app loads for every visitor, so an example that names them
// costs nothing extra. (global.css: Switzer and Geist Mono.)
export const GLOBAL_FONTS = [
  /\/fonts\/switzer\//,
  /\/fonts\/geist-mono-/,
  /\/fonts\/caveat-/,
]

const EXAMPLE_KEY = /^src\/components\/palette\/examples\/[A-Za-z0-9]+\.jsx$/
const SHELL_KEYS = [
  'src/components/palette/PalettePreviewDialog.jsx',
  'src/components/palette/PalettePreview.jsx',
]

const gz = (buf) => zlib.gzipSync(buf, { level: 9 }).length

function args(argv) {
  const out = { outDir: null, json: false }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--outDir') out.outDir = argv[++i]
    else if (argv[i].startsWith('--outDir=')) out.outDir = argv[i].slice('--outDir='.length)
    else if (argv[i] === '--json') out.json = true
  }
  return out
}

function readManifest(outDir) {
  for (const rel of ['.vite/manifest.json', 'manifest.json']) {
    const file = path.join(outDir, rel)
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'))
  }
  throw new Error(
    `no Vite manifest in ${outDir}. Build with --manifest: npx vite build --mode test --manifest --outDir ${outDir}`,
  )
}

// Gzip size of a chunk's own files: its JS and the CSS the build attached to it.
function chunkBytes(outDir, entry) {
  const files = [entry.file, ...(entry.css || [])]
  let total = 0
  for (const f of files) total += gz(fs.readFileSync(path.join(outDir, f)))
  return { total, files }
}

// The woff2 files a chunk's stylesheets ask for, with the app-wide ones removed.
function fontsOf(outDir, entry) {
  const urls = new Set()
  for (const css of entry.css || []) {
    const text = fs.readFileSync(path.join(outDir, css), 'utf8')
    for (const m of text.matchAll(/url\(\s*["']?([^"')]+\.woff2)["']?\s*\)/g)) urls.add(m[1])
  }
  const own = [...urls].filter((u) => !GLOBAL_FONTS.some((re) => re.test(u)))
  const sized = own.map((u) => {
    const file = path.join(outDir, u.replace(/^\//, ''))
    return { url: u, bytes: fs.existsSync(file) ? fs.statSync(file).size : null }
  })
  return sized
}

export function check(outDir) {
  const manifest = readManifest(outDir)
  const rows = []
  const misses = []

  const examples = Object.entries(manifest).filter(([key]) => EXAMPLE_KEY.test(key))
  if (!examples.length) misses.push('the manifest has no example chunks (src/components/palette/examples/*.jsx)')

  for (const [key, entry] of examples) {
    const { total, files } = chunkBytes(outDir, entry)
    const fonts = fontsOf(outDir, entry)
    const fontBytes = fonts.reduce((n, f) => n + (f.bytes || 0), 0)
    const unsized = fonts.filter((f) => f.bytes == null).map((f) => f.url)
    rows.push({ kind: 'example', key, gzip: total, files, fonts, fontBytes })
    if (total > EXAMPLE_GZIP) misses.push(`${key}: ${total} B gzip is over ${EXAMPLE_GZIP} B`)
    if (fonts.length > EXAMPLE_FONT_FILES) misses.push(`${key}: ${fonts.length} new font files, over ${EXAMPLE_FONT_FILES}`)
    if (fontBytes > EXAMPLE_FONT_BYTES) misses.push(`${key}: fonts are ${fontBytes} B together, over ${EXAMPLE_FONT_BYTES} B`)
    if (unsized.length) misses.push(`${key}: font file not found in the build: ${unsized.join(', ')}`)
  }

  // The dialog and the scene may share a chunk; count each file once.
  const shellFiles = []
  for (const key of SHELL_KEYS) {
    const entry = manifest[key]
    if (!entry) continue
    for (const f of chunkBytes(outDir, entry).files) if (!shellFiles.includes(f)) shellFiles.push(f)
  }
  const shell = shellFiles.reduce((n, f) => n + gz(fs.readFileSync(path.join(outDir, f))), 0)
  rows.push({ kind: 'shell', key: SHELL_KEYS.join(' + '), gzip: shell, files: shellFiles })
  if (!shellFiles.length) misses.push('the manifest has no dialog chunk')
  else if (shell > SHELL_GZIP) misses.push(`dialog shell: ${shell} B gzip is over ${SHELL_GZIP} B`)

  return { rows, misses }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const { outDir, json } = args(process.argv.slice(2))
  if (!outDir) {
    console.error('usage: node scripts/check-preview-budget.mjs --outDir dist-<lane> [--json]')
    process.exit(2)
  }
  let result
  try {
    result = check(outDir)
  } catch (err) {
    console.error(err.message)
    process.exit(2)
  }
  const kb = (n) => `${(n / 1024).toFixed(1)} KB`
  for (const r of result.rows) {
    const fonts = r.fonts ? `, fonts ${r.fonts.length} (${kb(r.fontBytes)})` : ''
    console.log(`${r.kind === 'shell' ? 'shell  ' : 'example'} ${kb(r.gzip).padStart(8)} gzip${fonts}  ${r.key}`)
  }
  if (json) {
    console.log(JSON.stringify(result, null, 2))
  } else if (result.misses.length) {
    console.error(`\n${result.misses.length} over budget:`)
    for (const m of result.misses) console.error(`  ${m}`)
    process.exit(1)
  } else {
    console.log('\nwithin budget')
  }
}
