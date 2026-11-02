// AI-generated results carry the shared "AI-generated" label. See
// src/components/AiLabel.jsx and src/config/aiLabel.js.
//
// MUTATION: remove the <AiLabel> from any of the three pages and that page's
// test fails; give a page its own hard-coded "AI-generated" string and the
// no-second-copy test fails; write the label into a clipboard call and the
// clipboard test fails.
import test from 'node:test'
import assert from 'node:assert/strict'
import { AI_GENERATED_LABEL } from '../../src/config/aiLabel.js'
import { read, stripComments } from './helpers/source-text.js'

const PAGES = [
  ['src/pages/AltTextGenerator.jsx', /<AiLabel what="alt text" \/>/],
  ['src/pages/AiPromptGenerator.jsx', /<AiLabel what="prompt" \/>/],
  ['src/pages/BrandStarter.jsx', /<AiLabel what="brand starter" \/>/],
]

test('the label wording is short and says what it is', () => {
  assert.equal(AI_GENERATED_LABEL, 'AI-generated')
})

test('the component renders the shared wording and nothing else visible', () => {
  const src = stripComments(read('src/components/AiLabel.jsx'))
  assert.match(src, /import \{ AI_GENERATED_LABEL \} from '\.\.\/config\/aiLabel'/)
  assert.match(src, /\{AI_GENERATED_LABEL\}/)
  // The visible text is the start of the accessible name (label in name).
  assert.match(src, /<span className="sr-only"> \{what\}<\/span>/)
})

for (const [file, usage] of PAGES) {
  test(`${file} labels its AI result`, () => {
    const src = stripComments(read(file))
    assert.match(src, /import AiLabel from '\.\.\/components\/AiLabel'/, `${file} does not import AiLabel`)
    assert.match(src, usage, `${file} does not render the label on its result`)
  })

  test(`${file} has no second copy of the wording`, () => {
    const src = stripComments(read(file))
    assert.ok(!src.includes(AI_GENERATED_LABEL), `${file} spells the label out instead of using AiLabel`)
  })
}

test('the label stays out of everything copied or downloaded', () => {
  for (const [file] of PAGES) {
    const src = stripComments(read(file))
    const writes = src.match(/clipboard\.writeText\([^)]*\)|new Blob\(\[[^\]]*\]/g) || []
    for (const w of writes) assert.ok(!/AiLabel|AI_GENERATED_LABEL/.test(w), `${file} puts the label into: ${w}`)
  }
})
