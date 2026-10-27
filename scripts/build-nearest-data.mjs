// Build the nearest-match colour data: src/data/nearest/*.json and index.js.
//
//   node scripts/build-nearest-data.mjs            all five systems
//   node scripts/build-nearest-data.mjs --screen   Tailwind, CSS and Material only (Node, no Python)
//
// Tailwind, CSS and Material are read from pinned URLs (sha256 checked) and
// converted here. Munsell and ISCC-NBS are converted by scripts/munsell_to_lab.py
// through `uv run` (colour-science, pinned). Every system is stored as Lab (D50).
// Outputs are committed; nothing is fetched at run time in the app. The script
// prints counts and gzip sizes and fails above each system's budget.
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { oklchToHex, oklchInGamut } from '../src/components/tool/oklch.js'
import { hexToLabD50 } from '../src/utils/nearestMatch.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'src/data/nearest')
const SRC = path.join(ROOT, 'scripts/nearest-sources/systems.json')
const meta = JSON.parse(readFileSync(SRC, 'utf8'))
const byId = Object.fromEntries(meta.systems.map((s) => [s.id, s]))
const screenOnly = process.argv.includes('--screen')

async function fetchPinned(sys) {
  const res = await fetch(sys.sourceUrl)
  if (!res.ok) throw new Error(`${sys.id}: ${res.status} for ${sys.sourceUrl}`)
  const text = await res.text()
  const sum = createHash('sha256').update(text).digest('hex')
  if (sum !== sys.sha256) throw new Error(`${sys.id}: source changed (sha256 ${sum}); check it before updating systems.json`)
  return text
}

const r2 = (v) => { const r = Math.round(v * 100) / 100; return r === 0 ? 0 : r }
const labRow = (name, code, copy, hex) => {
  const [L, a, b] = hexToLabD50(hex)
  return [name, code, copy, r2(L), r2(a), r2(b)]
}

function header(sys, rows, extra = {}) {
  const { id, label, group, version, source, sourceUrl, licence, licenceUrl, note } = sys
  return { id, label, group, version, source, sourceUrl, licence, licenceUrl, note, count: rows.length, ...extra }
}
function write(sys, rows, extra) {
  const head = JSON.stringify(header(sys, rows, extra))
  const body = `${head.slice(0, -1)},"rows":[\n${rows.map((r) => JSON.stringify(r)).join(',\n')}\n]}\n`
  writeFileSync(path.join(OUT, `${sys.id}.json`), body)
}

// ---- Tailwind v4: OKLCH -> hex with the app's own oklchToHex ------------------
function buildTailwind(css) {
  const rows = []
  const clipped = []
  const re = /--color-([a-z]+)(?:-(\d+))?:\s*(?:oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+|none)\s*\)|(#[0-9a-fA-F]{3,6}))\s*;/g
  for (const m of css.matchAll(re)) {
    const name = m[2] ? `${m[1]}-${m[2]}` : m[1]
    let hex = m[6]
    if (!hex) {
      const L = parseFloat(m[3]) / 100
      const C = parseFloat(m[4])
      const H = m[5] === 'none' ? 0 : parseFloat(m[5])
      hex = oklchToHex(L, C, H)
      if (!oklchInGamut(L, C, H)) clipped.push(name)
    }
    rows.push(labRow(name, null, null, hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex))
  }
  console.log(`tailwind: ${rows.length} rows, ${clipped.length} outside sRGB and clipped: ${clipped.join(' ')}`)
  return { rows, extra: { clippedOutsideSrgb: clipped.length } }
}

// ---- CSS Color 4, section 6.1 ---------------------------------------------------
function buildCss(html) {
  const rows = []
  const re = /id="valdef-color-([a-z]+)">\1<\/dfn>\s*<td>(#[0-9a-f]{6})/g
  for (const m of html.matchAll(re)) rows.push(labRow(m[1], m[2].toUpperCase(), null, m[2]))
  if (rows.length !== 148) throw new Error(`css: expected 148 named colours, got ${rows.length}`)
  return { rows, extra: {} }
}

// ---- Material 2014 (material-design-lite palette) -----------------------------------
function buildMaterial(scss) {
  const rows = []
  const steps = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', 'A100', 'A200', 'A400', 'A700']
  const re = /\$palette-([a-z-]+):\s*((?:"\d+,\d+,\d+"\s*)+);/g
  for (const m of scss.matchAll(re)) {
    const title = m[1].split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')
    const triplets = [...m[2].matchAll(/"(\d+),(\d+),(\d+)"/g)]
    triplets.forEach((t, i) => {
      const hex = '#' + [t[1], t[2], t[3]].map((v) => Number(v).toString(16).padStart(2, '0')).join('').toUpperCase()
      rows.push(labRow(`${title} ${steps[i]}`, hex, hex, hex))
    })
  }
  return { rows, extra: {} }
}

function runPython() {
  const args = ['run', '--quiet', '--with', 'colour-science==0.4.7', 'python', '-I',
    path.join(ROOT, 'scripts/munsell_to_lab.py'), '--out-dir', OUT]
  const res = spawnSync('uv', args, { stdio: 'inherit', cwd: ROOT, shell: process.platform === 'win32' })
  if (res.status !== 0) throw new Error('munsell_to_lab.py failed (needs `uv`; see scripts/munsell_to_lab.py)')
}

mkdirSync(OUT, { recursive: true })
for (const [id, build] of [['tailwind', buildTailwind], ['css', buildCss], ['material', buildMaterial]]) {
  const { rows, extra } = build(await fetchPinned(byId[id]))
  write(byId[id], rows, extra)
}
if (!screenOnly) runPython()

// ---- sizes, budgets, index.js -------------------------------------------------------
const present = meta.systems.filter((s) => existsSync(path.join(OUT, `${s.id}.json`)))
let failed = false
const entries = []
for (const s of present) {
  const raw = readFileSync(path.join(OUT, `${s.id}.json`))
  const gz = gzipSync(raw, { level: 9 }).length
  const count = JSON.parse(raw).count
  const over = gz > s.budgetGzip
  if (over) failed = true
  console.log(`${s.id.padEnd(9)} ${String(count).padStart(5)} rows  ${String(raw.length).padStart(7)} B raw  ${String(gz).padStart(6)} B gzip  budget ${s.budgetGzip}${over ? '  OVER BUDGET' : ''}`)
  entries.push({ ...s, count })
}
const q = (v) => JSON.stringify(v)
const index = `// Generated by scripts/build-nearest-data.mjs. Do not edit by hand.
//
// The only nearest-match file a Free user loads: system order, labels, groups,
// row counts and the credit lines. Each system's colour data is its own JSON
// asset (see urls.js), fetched for Pro users only. Rows are Lab under D50:
// ${meta.rowShape}
export const NEAREST_SYSTEMS = [
${entries.map((s) => `  { id: ${q(s.id)}, label: ${q(s.label)}, group: ${q(s.group)}, count: ${s.count}, version: ${q(s.version)},
    credit: ${q(s.credit)} },`).join('\n')}
]
`
writeFileSync(path.join(OUT, 'index.js'), index)
console.log(`index.js ${gzipSync(index).length} B gzip`)

// The asset URLs, as `?url` imports (never import(): see utils/nearestLoader.js).
const ident = (id) => id.replace(/-(\w)/g, (_, c) => c.toUpperCase())
const urls = `// Generated by scripts/build-nearest-data.mjs. Do not edit by hand.
//
// Each system's colour data as a hashed asset URL (a \`?url\` import), fetched
// by utils/nearestSystems.js for Pro users only. Importing a URL requests
// nothing, so a Free user pays for this file's few lines and no colour data.
// Every file must stay over Vite's 4 KB assetsInlineLimit, or the "URL" would
// be a data: URI carrying the rows inside the JS.
${entries.map((s) => `import ${ident(s.id)} from ${q(`./${s.id}.json?url`)}`).join('\n')}

export const NEAREST_URLS = {
${entries.map((s) => `  ${q(s.id)}: ${ident(s.id)},`).join('\n')}
}
`
writeFileSync(path.join(OUT, 'urls.js'), urls)
if (failed) { console.error('A system is over its gzip budget.'); process.exit(1) }
