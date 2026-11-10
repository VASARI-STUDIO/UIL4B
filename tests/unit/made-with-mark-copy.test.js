import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// Site copy names the export mark the way the exported files print it.
const SOURCES = [
  'src/components/PillNav.jsx',
  'src/components/spectrum/spectrumFacts.js',
  'src/config/planFacts.js',
  'src/pages/Pricing.jsx',
  'src/locales/en.json',
  'src/locales/en-US.json',
]

for (const file of SOURCES) {
  test(`${file} spells the mark "Made with UI L4B"`, () => {
    const src = readFileSync(file, 'utf8')
    assert.doesNotMatch(src, /Made with UIL4B/, 'the mark is spelt without the space')
  })
}
