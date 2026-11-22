// projectToBrand(project, themeId): the words a project has not written come from the theme's sample brand, with the project's name in
// place of the sample's, so a live preview never prints filler or another brand's name.
//   1. NO FILLER, NO SAMPLE NAME: for every theme, none of the old filler lines and not the sample brand's name.
//      Break: put 'Your headline here' back in typeBlock, or drop swapDeep from sampleCopy.
//   2. NO THEME ID, NO SAMPLE WORDS: the filler is blank, and everything that is not wording (colours, fonts, slug, type scale) is
//      the same with or without a theme id.
//      Break: let sampleCopy return something for an unknown id.
//   3. THE PROJECT'S OWN FIELDS WIN: name, description, colours and fonts are the project's whatever the theme.
//      Break: spread `...sample?.copy` after the `own.description` line in build().
//   4. THE TABLE: THEME_SAMPLE names the same sample brand per theme as the picker.
//      Break: change one entry in THEME_SAMPLE.
import test from 'node:test'
import assert from 'node:assert/strict'
import { projectToBrand, THEME_SAMPLE } from '../../api/_lib/exportThemes/brandFromProject.js'
import { BRANDS } from '../../api/_lib/exportThemes/brands/index.js'
import { PICKER_THEMES } from '../../src/config/exportThemePicker.js'

const palette = (colors, base) => ({ colors, base: base || colors[0], harmony: 'auto' })
const DESIGN = {
  palette: palette(['#2F6F5E', '#F2C14E', '#8FB8A8', '#F4F1EA', '#1D2B27']),
  fonts: { heading: { family: 'Barlow Condensed', weight: 700, category: 'sans-serif' }, body: { family: 'Roboto', weight: 400, category: 'sans-serif' } },
}
const FILLER = ['Write this in your own words.', 'Your main line goes here.', 'A second line.', 'A third line.', 'Your headline here', 'Say where this version goes.']
const FILLER_RULE = /Writing rule \d/
const NAME = 'Tidewater'

const strings = (v, out = []) => {
  if (typeof v === 'string') out.push(v)
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out))
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => strings(x, out))
  return out
}

for (const id of Object.keys(THEME_SAMPLE)) {
  test(`${id}: a named project has no filler line and not the sample brand's name`, () => {
    const brand = projectToBrand({ design: DESIGN, projectName: NAME }, id)
    const sample = BRANDS[THEME_SAMPLE[id]].data
    const all = strings(brand)
    for (const f of FILLER) assert.ok(!all.some((s) => s.includes(f)), `${id} still says "${f}"`)
    assert.ok(!all.some((s) => FILLER_RULE.test(s)), `${id} still has a "Writing rule N"`)
    // the name in its own spelling and in capitals; a lower-case word on its own (Margin's "margin") is a word, not the brand
    const gone = new RegExp(`${sample.name}|${sample.name.toUpperCase()}`)
    assert.deepEqual(all.filter((s) => gone.test(s)).slice(0, 3), [], `${id} still names ${sample.name}`)
    assert.equal(brand.name, NAME)
    assert.ok(brand.lines.primary.length > 0, 'the sample copy should have filled the main line')
  })
}

test('without a theme id the prose is blank, and nothing but the wording changes', () => {
  const bare = projectToBrand({ design: DESIGN, projectName: NAME })
  const all = strings(bare)
  for (const f of FILLER) assert.ok(!all.includes(f), `"${f}" is back`)
  assert.equal(bare.description, '')
  assert.equal(bare.lines.primary, '')
  const unknown = projectToBrand({ design: DESIGN, projectName: NAME }, 'no-such-theme')
  assert.deepEqual(unknown, bare, 'an id that is not a theme must act as no id')
  const themed = projectToBrand({ design: DESIGN, projectName: NAME }, '01-presentation')
  for (const k of ['slug', 'colours', 'pairs', 'fonts', 'ui', 'name', 'version']) assert.deepEqual(themed[k], bare[k], `${k} must not depend on the theme id`)
  assert.deepEqual(themed.type.scale, bare.type.scale)
})

test("the project's own name, description, colours and fonts win over the sample's", () => {
  const design = { ...DESIGN, identity: { name: 'Ignored by a project name', description: 'Parking, simply.' } }
  const withId = projectToBrand({ design, projectName: NAME }, '04-standards')
  const without = projectToBrand({ design, projectName: NAME })
  assert.equal(withId.name, NAME)
  assert.equal(withId.description, 'Parking, simply.')
  assert.equal(withId.product, 'Parking, simply.')
  assert.deepEqual(withId.colours, without.colours)
  assert.deepEqual(withId.fonts, without.fonts)
  assert.notEqual(withId.description, BRANDS['two-shores'].data.description)
})

test('a project with no name still gets a name that is not the sample brand', () => {
  const brand = projectToBrand({ design: DESIGN }, '04-standards')
  assert.equal(brand.name, 'Your brand')
  assert.ok(!strings(brand).some((s) => /Two Shores/.test(s)))
})

test('the theme-to-sample table is the picker\'s', () => {
  assert.deepEqual(Object.keys(THEME_SAMPLE).sort(), PICKER_THEMES.map((t) => t.id).sort())
  for (const t of PICKER_THEMES) assert.equal(THEME_SAMPLE[t.id], t.brand.toLowerCase().replace(/ /g, '-'), t.id)
})
