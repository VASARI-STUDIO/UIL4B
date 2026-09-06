// THE HOMEPAGE BYTE BUDGETS, WHICH ARE THE HALF A MACHINE CAN CHECK.
//
// `homepage-field-metrics` carries several budgets. The timings among them
// (LCP, CLS, interaction response) depend on the machine they are taken on, so
// they belong to scripts/home-field-metrics.mjs and to the measurement recorded
// on the item — asserting them here would fail the build at random on a busy
// laptop, and a guard that cries wolf is one people start ignoring.
//
// The BYTE budgets are different: they are properties of the repository, they
// are exact, and they are the ones that regress silently. Somebody swaps a
// reference thumbnail for a nicer photo, the file triples, and nothing says so
// until a phone on a slow link pays for it. That is what this file catches.
//
// Measured on 2026-09-06, on the throttled profile named on the pipeline item:
// none of these three images is fetched on a cold homepage load at all — they
// belong to the converter tab. The budget is still real, because the moment the
// visitor opens that tab they are fetched together.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8')

const THUMB_DIR = 'public/previews/home-image-converter'
// 180 KB, the figure the retired homepage acceptance contract set. Decimal KB,
// as file sizes are quoted everywhere else in this repo.
const THUMB_BUDGET_BYTES = 180_000

test('the bundled reference thumbnails exist and are still three', () => {
  // Positive control. The size assertion below is trivially satisfied by an
  // empty directory, which is exactly how a budget check quietly stops
  // checking anything.
  const files = fs.readdirSync(path.join(ROOT, THUMB_DIR)).filter(f => f.endsWith('.webp'))
  assert.equal(files.length, 3, `expected three reference thumbnails, found ${files.length}: ${files.join(', ')}`)
  for (const f of files) {
    assert.ok(fs.statSync(path.join(ROOT, THUMB_DIR, f)).size > 1000, `${f} is suspiciously small — is it a placeholder?`)
  }
})

test('the three reference thumbnails stay within 180 KB encoded, in total', () => {
  const files = fs.readdirSync(path.join(ROOT, THUMB_DIR)).filter(f => f.endsWith('.webp'))
  const sizes = files.map(f => ({ f, bytes: fs.statSync(path.join(ROOT, THUMB_DIR, f)).size }))
  const total = sizes.reduce((n, s) => n + s.bytes, 0)
  assert.ok(
    total <= THUMB_BUDGET_BYTES,
    `the reference thumbnails total ${total} bytes, over the ${THUMB_BUDGET_BYTES}-byte budget:\n  `
    + sizes.map(s => `${s.bytes} ${s.f}`).join('\n  '),
  )
})

test('the homepage still names those thumbnails, so the budget guards something live', () => {
  // A budget on files nothing references is not a budget. If the workbench
  // stops using these, this test should be deleted along with them rather than
  // left passing on dead weight.
  const workbench = read('src/components/HomeWorkbench.jsx')
  for (const name of ['architecture', 'people', 'nature']) {
    assert.match(workbench, new RegExp(`/previews/home-image-converter/${name}\\.webp`), `the workbench no longer references ${name}.webp`)
  }
})

test('every declared face is served from /fonts, never from a catalogue', () => {
  // One of the budgets that is already MET and must stay met: "the homepage
  // must make no remote image/icon/font-catalogue call". Two sequential
  // third-party round trips (fonts.googleapis.com for the CSS, which only then
  // revealed the fonts.gstatic.com URL to fetch) were replaced by self-hosted
  // subsets under /fonts. The rendered half is measured by
  // scripts/home-field-metrics.mjs, which counts catalogue calls per run; this
  // is the static half.
  //
  // Comments are stripped first: global.css EXPLAINS the googleapis/gstatic
  // round trips it removed, and a naive search for those hostnames matches the
  // explanation. A guard that fails on its own documentation gets deleted.
  const css = read('src/styles/global.css').replace(/\/\*[\s\S]*?\*\//g, ' ')

  const faces = [...css.matchAll(/@font-face\s*\{[^}]*\}/g)].map(m => m[0])
  assert.ok(faces.length >= 2, `expected self-hosted @font-face rules, found ${faces.length}`)
  for (const face of faces) {
    const urls = [...face.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)].map(m => m[1])
    assert.ok(urls.length, 'a @font-face with no src tells us nothing')
    for (const u of urls) {
      assert.ok(u.startsWith('/fonts/'), `@font-face src must be self-hosted, got ${u}`)
      assert.ok(
        fs.existsSync(path.join(ROOT, 'public', u.replace(/^\//, ''))),
        `${u} is declared but not present in public/ — the face would 404`,
      )
    }
  }

  assert.doesNotMatch(css, /@import[^;]*(googleapis|gstatic)/, 'no remote font-catalogue import')
})
