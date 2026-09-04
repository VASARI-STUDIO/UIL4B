import test from 'node:test'
import assert from 'node:assert/strict'
import {
  SCENES, familyRole, familyShape, fontsInUseSearchUrl, ladderFor,
  sceneIdsFor, sceneWeights, scenesFor, weightFor,
} from '../../src/utils/fontScenes.js'

// The founder asked three times (2026-08-08, 2026-08-15, 2026-09-04) for "real
// world examples not the same UI examples for each one". Every test here guards
// one of the two ways that request can be betrayed: giving two different
// typefaces the same examples, or giving one typeface an example that lies
// about what it can do.
//
// EVERY FIXTURE BELOW IS REAL. The values are read out of Google's own family
// metadata (fonts.google.com/metadata/fonts, snapshot of 2026-09-04), not
// invented to make an assertion pass — a fixture that disagrees with the
// catalogue would prove the rules work on data that never arrives.

const F = (family, category, classifications, stroke, variants, italics) =>
  ({ family, category, classifications, stroke, variants, italics })

const playfair = F('Playfair Display', 'serif', ['Display'], 'Serif', [400, 500, 600, 700, 800, 900], true)
const anton = F('Anton', 'sans-serif', ['Display'], 'Sans Serif', [400], false)
const bebas = F('Bebas Neue', 'sans-serif', ['Display'], 'Sans Serif', [400], false)
const dmSerifDisplay = F('DM Serif Display', 'serif', ['Display'], 'Serif', [400], true)
const roboto = F('Roboto', 'sans-serif', [], 'Sans Serif', [100, 200, 300, 400, 500, 600, 700, 800, 900], true)
const lora = F('Lora', 'serif', [], 'Serif', [400, 500, 600, 700], true)
const robotoSlab = F('Roboto Slab', 'serif', [], 'Slab Serif', [100, 200, 300, 400, 500, 600, 700, 800, 900], false)
const robotoMono = F('Roboto Mono', 'monospace', ['Monospace'], '', [100, 200, 300, 400, 500, 600, 700], true)
const courierPrime = F('Courier Prime', 'monospace', ['Monospace'], 'Serif', [400, 700], true)
const pacifico = F('Pacifico', 'handwriting', ['Handwriting'], '', [400], false)
const greatVibes = F('Great Vibes', 'handwriting', ['Display', 'Handwriting'], '', [400], false)
const barcode = F('Libre Barcode 39', 'display', ['Symbols', 'Display'], '', [400], false)

// The degraded catalogue: family/category/variants and nothing else. This is
// what src/data/fallbackFonts.js holds, and what a deployment carrying
// VITE_GOOGLE_FONTS_API_KEY gets from the WebFonts API.
const thin = (font) => ({
  family: font.family, category: font.category, variants: font.variants,
})

// ── The defect the founder reported ─────────────────────────────────────────

test('the four fixed scenes are gone — no two of these families get the same set', () => {
  const families = [playfair, roboto, lora, robotoSlab, robotoMono, pacifico, barcode]
  const sets = families.map(f => sceneIdsFor(f).join(','))
  assert.equal(new Set(sets).size, families.length,
    `every family must get its own scene set, got:\n${families.map((f, i) => `  ${f.family}: ${sets[i]}`).join('\n')}`)
})

test('the old fixed array is not what any family renders', () => {
  const old = ['editorial', 'ui', 'pricing', 'display'].join(',')
  for (const font of [playfair, roboto, lora, robotoMono, pacifico, barcode]) {
    assert.notEqual(sceneIdsFor(font).join(','), old, `${font.family} still gets the fixed four`)
  }
  // The pricing table was the scene with no home: it asked a question about
  // numerals at display size that the figures scene now asks properly, of the
  // families that are actually judged on it.
  assert.ok(!Object.keys(SCENES).includes('pricing'))
})

// ── Why `category` alone could not do this ──────────────────────────────────

test('a display face wearing a serif category is treated as a display face', () => {
  // Playfair Display is category "Serif". Handing it a long-form reading column
  // is EXACTLY the founder's complaint, and category alone cannot avoid it.
  assert.equal(playfair.category, 'serif')
  assert.equal(familyRole(playfair).role, 'display')
  assert.equal(familyRole(playfair).basis, 'classifications')
  const ids = sceneIdsFor(playfair)
  assert.ok(ids.includes('poster'), 'a display face earns a poster')
  assert.ok(!ids.includes('column'), 'a display face must not be given a reading column')
})

test('every family the catalogue mislabels as text is caught, not just Playfair', () => {
  for (const font of [anton, bebas, dmSerifDisplay]) {
    assert.equal(familyRole(font).role, 'display', `${font.family} is a display face`)
    assert.ok(!sceneIdsFor(font).includes('column'), `${font.family} must not get a reading column`)
  }
})

test('Symbols beats Display, so a barcode family is never sent to a poster', () => {
  // 17 of the 22 symbol families are ALSO classified Display. Checking Display
  // first would set a pricing table in Libre Barcode 39.
  assert.deepEqual(barcode.classifications, ['Symbols', 'Display'])
  assert.equal(familyRole(barcode).role, 'symbol')
  assert.deepEqual(sceneIdsFor(barcode), ['glyphs'])
})

test('Handwriting beats Display, so a decorative script stays a script', () => {
  // 156 families carry both. A brush face is a script that happens to be big.
  assert.deepEqual(greatVibes.classifications, ['Display', 'Handwriting'])
  assert.equal(familyRole(greatVibes).role, 'script')
  assert.ok(sceneIdsFor(greatVibes).includes('signature'))
})

test('Monospace beats stroke, so a mono face with serifs still gets code', () => {
  // Courier Prime carries stroke "Serif". Ordering stroke first would hand a
  // typewriter face an editorial reading column.
  assert.equal(courierPrime.stroke, 'Serif')
  assert.equal(familyRole(courierPrime).role, 'mono')
  assert.ok(sceneIdsFor(courierPrime).includes('code'))
})

test('stroke recovers Slab Serif, which category erases into Serif', () => {
  assert.equal(robotoSlab.category, 'serif')
  assert.equal(familyShape(robotoSlab), 'slab')
  assert.equal(familyRole(robotoSlab).role, 'slab')
  assert.equal(familyRole(robotoSlab).basis, 'stroke')
  // And a slab is not shown the same three scenes as a text serif.
  assert.notEqual(sceneIdsFor(robotoSlab).join(','), sceneIdsFor(lora).join(','))
  assert.ok(sceneIdsFor(robotoSlab).includes('signage'))
  assert.ok(!sceneIdsFor(lora).includes('signage'))
})

test('a display serif gets a masthead where a display sans gets a title card', () => {
  assert.ok(sceneIdsFor(playfair).includes('masthead'))
  assert.ok(!sceneIdsFor(playfair).includes('titlecard'))
  assert.ok(sceneIdsFor(anton).includes('titlecard'))
  assert.ok(!sceneIdsFor(anton).includes('masthead'))
})

// ── The degraded path ───────────────────────────────────────────────────────

test('with neither field the role degrades to category — worse, but not wrong', () => {
  // Not a different answer: a script is still a script, a mono still a mono.
  assert.equal(familyRole(thin(pacifico)).role, 'script')
  assert.equal(familyRole(thin(robotoMono)).role, 'mono')
  assert.equal(familyRole(thin(lora)).role, 'serif')
  assert.equal(familyRole(thin(roboto)).role, 'sans')
  for (const font of [pacifico, robotoMono, lora, roboto]) {
    assert.equal(familyRole(thin(font)).basis, 'category')
  }
})

test('what the degraded path actually loses is the sharpening, and it says so', () => {
  // Playfair reads as a text serif and Roboto Slab as a plain serif. That is
  // the documented cost, pinned here so nobody claims the fallback is lossless.
  assert.equal(familyRole(thin(playfair)).role, 'serif')
  assert.equal(familyRole(thin(robotoSlab)).role, 'serif')
  assert.equal(familyRole(thin(barcode)).role, 'display')
})

test('a family with no descriptive field at all still varies by its own cuts', () => {
  // The last resort is NOT one fixed template. Two nameless families with
  // different cut counts must not render the same panel.
  const many = { family: 'A', variants: [300, 400, 700] }
  const one = { family: 'B', variants: [400] }
  assert.equal(familyRole(many).basis, 'none')
  assert.equal(familyRole(one).basis, 'none')
  assert.notEqual(sceneIdsFor(many).join(','), sceneIdsFor(one).join(','))
  assert.ok(sceneIdsFor(many).includes('ladder'))
  assert.ok(!sceneIdsFor(one).includes('ladder'))
})

// ── Do not fake capability ──────────────────────────────────────────────────

test('a single-weight family is never given a weight ladder', () => {
  for (const font of [anton, bebas, pacifico, dmSerifDisplay, barcode]) {
    assert.deepEqual(ladderFor(font), [], `${font.family} ships one cut`)
    assert.ok(!sceneIdsFor(font).includes('ladder'))
  }
})

test('two cuts is still not a ladder, three is', () => {
  assert.deepEqual(ladderFor(courierPrime), [], 'two cuts is a before/after, not a ladder')
  assert.equal(ladderFor(lora).length, 4)
  assert.ok(ladderFor(playfair).length >= 3)
})

test('every rung of a ladder is a cut the family really ships', () => {
  for (const font of [playfair, roboto, lora, robotoSlab, robotoMono]) {
    for (const weight of ladderFor(font)) {
      assert.ok(font.variants.includes(weight),
        `${font.family} does not ship ${weight}`)
    }
  }
})

test('a scene weight is always a real cut, never an invented one', () => {
  for (const font of [playfair, anton, roboto, lora, robotoMono, pacifico, courierPrime]) {
    const w = sceneWeights(font)
    for (const [role, weight] of Object.entries(w)) {
      assert.ok(font.variants.includes(weight),
        `${font.family} ${role}=${weight} is not a cut it ships`)
    }
  }
})

test('a single-weight family collapses all three weights onto its one cut', () => {
  // Anton has one cut, so every line of its panel is that cut. Asking for 700
  // would make the browser smear a faux bold of a weight that does not exist.
  assert.deepEqual(sceneWeights(anton), { body: 400, mid: 400, bold: 400 })
})

test('weightFor snaps to the nearest real cut, and a tie goes lighter', () => {
  const heavy = { variants: [500, 700, 900] }
  assert.equal(weightFor(heavy, 400), 500, 'nearest below the range is its floor')
  assert.equal(weightFor(heavy, 700), 700)
  const tie = { variants: [300, 500] }
  assert.equal(weightFor(tie, 400), 300, 'a tie must not round up into a heavier face')
  assert.equal(weightFor({ variants: [] }, 700), 400, 'no cuts at all is not a crash')
})

// ── Shape of the output ─────────────────────────────────────────────────────

test('every scene a family can be given has a label and a question', () => {
  const families = [playfair, anton, roboto, lora, robotoSlab, robotoMono,
    courierPrime, pacifico, greatVibes, barcode]
  for (const font of families) {
    const scenes = scenesFor(font)
    assert.ok(scenes.length > 0, `${font.family} got no scenes`)
    for (const scene of scenes) {
      assert.ok(SCENES[scene.id], `${scene.id} has no entry in SCENES`)
      assert.equal(typeof scene.label, 'string')
      assert.ok(scene.label.length > 0, `${scene.id} has no label`)
      assert.ok(scene.asks.length > 0, `${scene.id} asks nothing`)
    }
  }
})

test('a missing font produces no scenes rather than a default set', () => {
  assert.deepEqual(sceneIdsFor(null), [])
  assert.deepEqual(scenesFor(undefined), [])
})

// ── The outbound link ───────────────────────────────────────────────────────

test('the fontsinuse link uses terms=, the parameter that actually searches', () => {
  // `?q=` returns HTTP 200 and a plausible page for every family — but it is
  // the EMPTY-QUERY page. Verified 2026-09-04 at their Crawl-delay of 10:
  // terms=Playfair%20Display returns 59 real /uses/ links.
  const url = fontsInUseSearchUrl('Playfair Display')
  assert.equal(url, 'https://fontsinuse.com/search?terms=Playfair%20Display')
  assert.ok(!url.includes('?q='), 'q= is the burned parameter and silently matches nothing')
})

test('a family name cannot break out of the query', () => {
  const url = fontsInUseSearchUrl('Rock & Roll #1')
  assert.ok(url.includes('%26') && url.includes('%231'), 'the name must be percent-encoded')
  assert.equal(url.split('?').length, 2)
})

test('no family name yields no link at all', () => {
  assert.equal(fontsInUseSearchUrl(''), '')
  assert.equal(fontsInUseSearchUrl(null), '')
  assert.equal(fontsInUseSearchUrl('   '), '')
})
