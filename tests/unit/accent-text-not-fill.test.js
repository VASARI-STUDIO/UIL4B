// The accent's TEXT members (--accent-mid, --accent-text, --accent-bright and
// the --accent-strong alias) are lifted toward paper in dark mode so that
// accent-coloured text stays readable on a dark ground. Painted as a FILL under
// the accent ink, they fail: #F4F7FF on the dark --accent-mid is about 2.6:1.
// A filled control rests on --accent-fill and hovers to --accent-fill-hover.
//
// This walks every stylesheet and fails on any background painted with a text
// member. A fill that genuinely needs one has to be argued for here.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.join(process.cwd(), 'src', 'styles')
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(dir, e.name)
  return e.isDirectory() ? walk(p) : p.endsWith('.css') ? [p] : []
})

const TEXT_MEMBER = /var\(--accent-(mid|text|bright|strong)\)/

function textFills(css) {
  const out = []
  const code = css.replace(/\/\*[\s\S]*?\*\//g, '')
  for (const m of code.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    for (const decl of m[2].split(';')) {
      if (/^\s*background(-color)?\s*:/.test(decl) && TEXT_MEMBER.test(decl)) {
        out.push(`${m[1].trim().replace(/\s+/g, ' ').slice(0, 80)} { ${decl.trim()} }`)
      }
    }
  }
  return out
}

test('the scan sees a text member used as a fill', () => {
  assert.equal(textFills('.a{color:var(--accent-ink);background:var(--accent-mid)}').length, 1)
  assert.equal(textFills('.a:hover { background: var(--accent-text); }').length, 1)
  assert.equal(textFills('.a{background:var(--accent-fill);color:var(--accent-mid)}').length, 0)
})

test('no stylesheet paints a background with an accent text member', () => {
  const files = walk(ROOT)
  assert.ok(files.length > 20, `only ${files.length} stylesheets found`)
  const found = files.flatMap((f) => textFills(fs.readFileSync(f, 'utf8')).map((r) => `${path.relative(process.cwd(), f)}: ${r}`))
  assert.deepEqual(found, [], 'a fill uses an accent TEXT member; use --accent-fill / --accent-fill-hover')
})
