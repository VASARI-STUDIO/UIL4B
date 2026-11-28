import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// Site copy names the export mark the way the exported files print it: "Made with UIL4B", one word, as the theme
// documents print it. The files that build the older exports are held to the same spelling.
const SOURCES = [
  'src/components/PillNav.jsx',
  'src/components/spectrum/spectrumFacts.js',
  'src/config/planFacts.js',
  'src/pages/Pricing.jsx',
  'src/pages/PaletteBuilder.jsx',
  'src/locales/en.json',
  'src/locales/en-US.json',
  'src/utils/appBundle.js',
  'src/utils/designTokens.js',
  'src/utils/exportBuilder.js',
  'src/utils/styleGuideExport.js',
  'src/utils/styleGuideRaster.js',
  'src/utils/tailwindTheme.js',
  'src/utils/uiKitExport.js',
  'api/_lib/bookPages.js',
]

for (const file of SOURCES) {
  test(`${file} spells the mark "Made with UIL4B"`, () => {
    const src = readFileSync(file, 'utf8')
    // "Made with UI L4B's own tools" is a heading that names the product, not the mark
    assert.doesNotMatch(src, /(Made|Built) with UI L4B(?!['’]s own)/, 'the mark is spelt without the space')
    assert.doesNotMatch(src, /UI L4B (line|mark)/, 'the mark is named without the space')
  })
}
