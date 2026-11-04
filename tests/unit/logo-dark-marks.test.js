// On dark, the Logo.dev tiles for brands Logo.dev serves only on a white square
// show the transparent SVG Logos mark instead (src/pages/IconLibrary.jsx).
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { read, stripComments } from './helpers/source-text.js'

const SRC = stripComments(read('src/pages/IconLibrary.jsx'))
const map = () => {
  const body = SRC.match(/const DARK_LOGO_MARKS = Object\.freeze\(\{([^}]*)\}\)/)
  assert.ok(body, 'DARK_LOGO_MARKS is gone from IconLibrary.jsx')
  return Object.fromEntries([...body[1].matchAll(/'([^']+)':\s*'([^']+)'/g)].map((m) => [m[1], m[2]]))
}

test('every swapped brand is a curated Logo.dev brand and a mark SVG Logos ships', () => {
  const marks = map()
  assert.ok(Object.keys(marks).length >= 6)
  const names = JSON.parse(fs.readFileSync('public/iconify/collections/logos.json', 'utf8')).uncategorized
  for (const [domain, mark] of Object.entries(marks)) {
    assert.ok(SRC.includes(`domain: '${domain}'`), `${domain} is not in LOGODEV_BRANDS`)
    assert.ok(names.includes(mark), `SVG Logos has no ${mark}`)
  }
})

test('brands whose only mark is dark keep their plate', () => {
  const marks = map()
  for (const domain of ['paypal.com', 'visa.com', 'notion.so', 'anthropic.com']) {
    assert.ok(!(domain in marks), `${domain} would vanish on the dark page`)
  }
})

test('the swap applies on dark only, and copy still gives the Logo.dev file', () => {
  assert.match(SRC, /const darkMark = theme !== 'light' \? DARK_LOGO_MARKS\[icon\.ref\] : null/)
  assert.match(SRC, /api\.iconify\.design\/logos\/\$\{darkMark\}\.svg/)
  assert.match(SRC, /onCopy\?\.\(logodevUrl\(icon\.ref, 512\)\)/)
})
