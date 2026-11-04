// The Styles row in the Emoji Library's detail dialog: which Iconify icon draws
// an emoji in each of four emoji art sets, and how an answer becomes an image.
//
// The expected names below are written out, not computed with the function
// under test, and each one was read off the registry's own icon list for that
// set. The coverage tests read the committed pack lists in
// public/iconify/collections, so a naming rule that stops matching the real
// sets fails here.
//
// HOW TO SEE EACH FAIL (src/utils/ unless named):
//   emojiStyleNames.js  Fluent's toneSuffix '' -> '-skin-tone'      -> "Fluent drops the -skin-tone suffix", "toned emoji coverage"
//   emojiStyleNames.js  the NFD fold removed                         -> "accents are folded"
//   emojiStyleNames.js  toneBeforeHair removed from noto             -> "the tone goes before the hair"
//   emojiStyleNames.js  the '#' guard removed                        -> "keycap: # names no icon"
//   emojiStyleNames.js  a set's prefix typed wrong                   -> "the four sets" and the coverage tests
//   emojiStyleImage.js  svgFromBatch ignores aliases                 -> "an alias is followed"
//   emojiStyleImage.js  loadStyleImage treats not_found as ok        -> "a set with no icon is missing"
//   data/iconPackTiers.js  one of the four moves off 'paid'          -> "all four sets are Pro"
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  EMOJI_STYLE_SETS, kebabEmojiName, styleCandidates, styleIconName,
} from '../../src/utils/emojiStyleNames.js'
import { loadStyleImage, svgDataUri, svgFromBatch } from '../../src/utils/emojiStyleImage.js'
import { SKIN_TONES } from '../../src/utils/emojiSkinTone.js'
import { lookupEmoji } from '../../src/utils/emojiCodes.js'
import { parseEmojiIndex } from '../../src/data/emojiIndex.js'
import { EMOJI_DATA } from '../../src/data/emojiData.js'
import { TONE_EMOJI } from '../../src/data/emojiTones.js'
import { ICON_PACK_CREDITS } from '../../src/data/iconPackCredits.js'
import { ICON_PACK_TIERS } from '../../src/data/iconPackTiers.js'

const ROOT = new URL('../../', import.meta.url)
const read = (p) => fs.readFileSync(fileURLToPath(new URL(p, ROOT)), 'utf8')
const set = (prefix) => EMOJI_STYLE_SETS.find(s => s.prefix === prefix)

test('the four sets are Noto, Twemoji, Fluent Emoji and OpenMoji, labelled by set name', () => {
  assert.deepEqual(EMOJI_STYLE_SETS.map(s => s.prefix), ['noto', 'twemoji', 'fluent-emoji', 'openmoji'])
  assert.deepEqual(EMOJI_STYLE_SETS.map(s => s.label), ['Noto Emoji', 'Twemoji', 'Fluent Emoji', 'OpenMoji'])
  // Nobody's vendor is a label: Apple and Windows art is never offered.
  for (const s of EMOJI_STYLE_SETS) assert.doesNotMatch(s.label, /apple|google|microsoft|windows/i)
})

test('all four sets are Pro, credited, and credited under the label the tile shows', () => {
  for (const s of EMOJI_STYLE_SETS) {
    assert.equal(ICON_PACK_TIERS[s.prefix]?.tier, 'paid', `${s.prefix} is not on the paid tier`)
    assert.ok(ICON_PACK_CREDITS[s.prefix], `${s.prefix} has no credit row`)
  }
  assert.equal(ICON_PACK_CREDITS.noto.spdx, 'Apache-2.0')
  assert.equal(ICON_PACK_CREDITS.twemoji.spdx, 'CC-BY-4.0')
  assert.equal(ICON_PACK_CREDITS['fluent-emoji'].spdx, 'MIT')
  assert.equal(ICON_PACK_CREDITS.openmoji.spdx, 'CC-BY-SA-4.0')
})

test('the emoji name becomes a kebab-case icon name', () => {
  assert.equal(kebabEmojiName('waving hand'), 'waving-hand')
  assert.equal(kebabEmojiName('flag: United States'), 'flag-united-states')
  assert.equal(kebabEmojiName('keycap: 10'), 'keycap-10')
  assert.equal(kebabEmojiName('family: man, woman, girl'), 'family-man-woman-girl')
  assert.equal(kebabEmojiName('a button (blood type)'), 'a-button-blood-type')
  assert.equal(kebabEmojiName('mrs. claus'), 'mrs-claus')
})

test('apostrophes and quotes vanish, and "&" is spelt out', () => {
  assert.equal(kebabEmojiName('woman’s hat'), 'womans-hat')
  assert.equal(kebabEmojiName('one o’clock'), 'one-oclock')
  assert.equal(kebabEmojiName('japanese “bargain” button'), 'japanese-bargain-button')
  assert.equal(kebabEmojiName('flag: antigua & barbuda'), 'flag-antigua-and-barbuda')
})

test('accents are folded, so a piñata finds the set’s pinata', () => {
  assert.equal(kebabEmojiName('piñata'), 'pinata')
})

test('keycap: * is the asterisk keycap, and keycap: # names no icon', () => {
  assert.equal(kebabEmojiName('keycap: *'), 'keycap-asterisk')
  // Dropping the symbol would name the blank keycap, a different picture.
  assert.equal(kebabEmojiName('keycap: #'), '')
})

test('a missing or empty name builds nothing', () => {
  assert.equal(kebabEmojiName(''), '')
  assert.equal(kebabEmojiName(undefined), '')
  assert.equal(kebabEmojiName(null), '')
  assert.equal(kebabEmojiName('’ !'), '')
  assert.equal(styleIconName(set('noto'), undefined, 'light'), '')
  assert.deepEqual(styleCandidates('', ''), [])
})

test('an untoned emoji uses the bare name in every set', () => {
  for (const s of EMOJI_STYLE_SETS) assert.equal(styleIconName(s, 'thumbs up', ''), 'thumbs-up', s.prefix)
  for (const s of EMOJI_STYLE_SETS) assert.equal(styleIconName(s, 'thumbs up', undefined), 'thumbs-up', s.prefix)
})

test('Noto, Twemoji and OpenMoji add -<tone>-skin-tone', () => {
  const want = {
    light: 'waving-hand-light-skin-tone',
    'medium-light': 'waving-hand-medium-light-skin-tone',
    medium: 'waving-hand-medium-skin-tone',
    'medium-dark': 'waving-hand-medium-dark-skin-tone',
    dark: 'waving-hand-dark-skin-tone',
  }
  assert.deepEqual(SKIN_TONES.map(t => t.id), Object.keys(want))
  for (const prefix of ['noto', 'twemoji', 'openmoji']) {
    for (const [tone, icon] of Object.entries(want)) {
      assert.equal(styleIconName(set(prefix), 'waving hand', tone), icon, `${prefix} ${tone}`)
    }
  }
})

test('Fluent drops the -skin-tone suffix', () => {
  const fluent = set('fluent-emoji')
  assert.equal(styleIconName(fluent, 'waving hand', 'light'), 'waving-hand-light')
  assert.equal(styleIconName(fluent, 'waving hand', 'medium-light'), 'waving-hand-medium-light')
  assert.equal(styleIconName(fluent, 'waving hand', 'dark'), 'waving-hand-dark')
  assert.equal(styleIconName(fluent, 'woman technologist', 'medium'), 'woman-technologist-medium')
})

test('the tone goes before the hair or beard in Noto, Twemoji and OpenMoji, after it in Fluent', () => {
  for (const prefix of ['noto', 'twemoji', 'openmoji']) {
    assert.equal(styleIconName(set(prefix), 'man: beard', 'medium'), 'man-medium-skin-tone-beard', prefix)
    assert.equal(styleIconName(set(prefix), 'person: red hair', 'dark'), 'person-dark-skin-tone-red-hair', prefix)
    // Not a person-with-hair name: the tone still goes last.
    assert.equal(styleIconName(set(prefix), 'woman technologist', 'light'), 'woman-technologist-light-skin-tone', prefix)
  }
  assert.equal(styleIconName(set('fluent-emoji'), 'man: beard', 'medium'), 'man-beard-medium')
  assert.equal(styleIconName(set('fluent-emoji'), 'person: red hair', 'dark'), 'person-red-hair-dark')
})

test('Fluent spells "blond" as "blonde"; the others do not', () => {
  assert.equal(styleIconName(set('fluent-emoji'), 'person: blond hair', ''), 'person-blonde-hair')
  assert.equal(styleIconName(set('fluent-emoji'), 'person: blond hair', 'light'), 'person-blonde-hair-light')
  assert.equal(styleIconName(set('noto'), 'person: blond hair', 'light'), 'person-light-skin-tone-blond-hair')
  assert.equal(styleIconName(set('twemoji'), 'person: blond hair', ''), 'person-blond-hair')
})

test('styleCandidates pairs each set with its own name, in tile order', () => {
  const c = styleCandidates('waving hand', 'medium')
  assert.deepEqual(c.map(x => x.set.prefix), ['noto', 'twemoji', 'fluent-emoji', 'openmoji'])
  assert.deepEqual(c.map(x => x.icon), [
    'waving-hand-medium-skin-tone', 'waving-hand-medium-skin-tone', 'waving-hand-medium', 'waving-hand-medium-skin-tone',
  ])
})

// ── Against the real sets ─────────────────────────────────────────────────

const INDEX = parseEmojiIndex(read('src/data/emojiIndex.txt'))
const CATALOGUE = EMOJI_DATA.flatMap(g => g.emojis.split(/\s+/).filter(Boolean))
const namesIn = (prefix) => {
  const d = JSON.parse(read(`public/iconify/collections/${prefix}.json`))
  return new Set([...(d.uncategorized || []), ...Object.values(d.categories || {}).flat()])
}

/** The share of the catalogue (or of its toned emoji) whose built name is in the set's pack list. */
function coverage(prefix, toneId) {
  const have = namesIn(prefix)
  const s = set(prefix)
  const pool = toneId ? CATALOGUE.filter(e => TONE_EMOJI.has(e)) : CATALOGUE
  const hit = pool.filter(e => have.has(styleIconName(s, lookupEmoji(INDEX, e)?.name, toneId)))
  return { share: hit.length / pool.length, pool: pool.length }
}

test('plain emoji coverage: Twemoji and OpenMoji nearly all, Noto most (its flags live elsewhere)', () => {
  assert.ok(coverage('twemoji', '').share >= 0.98, 'twemoji')
  assert.ok(coverage('openmoji', '').share >= 0.98, 'openmoji')
  const noto = coverage('noto', '')
  assert.ok(noto.share >= 0.85, `noto ${noto.share}`)
  // Noto's pack carries no flags, so a flag is a miss and its tile is hidden.
  assert.ok(!namesIn('noto').has(styleIconName(set('noto'), 'flag: United States', '')))
  assert.ok(namesIn('twemoji').has(styleIconName(set('twemoji'), 'flag: United States', '')))
})

test('toned emoji coverage: every toned emoji resolves in Noto, Twemoji and OpenMoji', () => {
  for (const prefix of ['noto', 'twemoji', 'openmoji']) {
    for (const tone of SKIN_TONES) {
      const { share, pool } = coverage(prefix, tone.id)
      assert.ok(pool > 200, 'the toned pool is real')
      assert.ok(share >= 0.98, `${prefix} ${tone.id} ${share}`)
    }
  }
})

test('Fluent names match its own pack list', () => {
  // The committed Fluent list is a short sample; every name in it is a bare name.
  const sample = JSON.parse(read('tests/user-sim/fixtures/iconify/collection/fluent-emoji.json')).uncategorized
  const fluent = set('fluent-emoji')
  assert.ok(sample.includes(styleIconName(fluent, 'thumbs up', '')))
  assert.ok(sample.includes(styleIconName(fluent, 'red heart', '')))
  assert.ok(sample.includes(styleIconName(fluent, 'party popper', '')))
})

// ── Turning an answer into an image ───────────────────────────────────────

test('svgFromBatch wraps the body in a standalone svg with the right box', () => {
  const svg = svgFromBatch({ width: 32, height: 32, icons: { 'red-heart': { body: '<path d="M0 0"/>' } } }, 'red-heart')
  assert.equal(svg, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32"><path d="M0 0"/></svg>')
})

test('an icon’s own size beats the set’s, and a missing size falls back to 16', () => {
  assert.match(svgFromBatch({ width: 32, height: 32, icons: { a: { body: '<g/>', width: 20, height: 10 } } }, 'a'), /viewBox="0 0 20 10"/)
  assert.match(svgFromBatch({ icons: { a: { body: '<g/>' } } }, 'a'), /viewBox="0 0 16 16"/)
})

test('an alias is followed to its parent icon', () => {
  const data = { width: 24, height: 24, icons: { 'a-button-blood-type': { body: '<g id="x"/>' } }, aliases: { 'a-button': { parent: 'a-button-blood-type' } } }
  assert.match(svgFromBatch(data, 'a-button'), /<g id="x"\/>/)
})

test('an alias that flips or rotates its parent is not drawn', () => {
  const data = { icons: { p: { body: '<g/>' } }, aliases: { q: { parent: 'p', hFlip: true }, r: { parent: 'p', rotate: 1 } } }
  assert.equal(svgFromBatch(data, 'q'), '')
  assert.equal(svgFromBatch(data, 'r'), '')
})

test('an answer with no such icon, or no body, or nothing at all, draws nothing', () => {
  assert.equal(svgFromBatch({ icons: {}, not_found: ['x'] }, 'x'), '')
  assert.equal(svgFromBatch({ icons: { x: { body: '' } } }, 'x'), '')
  assert.equal(svgFromBatch({ icons: { x: {} } }, 'x'), '')
  assert.equal(svgFromBatch(null, 'x'), '')
  assert.equal(svgFromBatch({}, 'x'), '')
})

test('the image src is a data: URI, never a remote URL, and carries the markup encoded', () => {
  const src = svgDataUri('<svg><g/></svg>')
  assert.ok(src.startsWith('data:image/svg+xml;utf8,'))
  assert.ok(!src.includes('<'))
})

/** Answer every fetch with `answer(url)` for the length of `fn`. */
async function withFetch(answer, fn) {
  const real = globalThis.fetch
  const urls = []
  globalThis.fetch = async (url) => { urls.push(String(url)); return answer(String(url)) }
  try { return await fn(urls) } finally { globalThis.fetch = real }
}
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

test('loadStyleImage asks the batched endpoint for one name and returns an image', async () => {
  await withFetch(() => json({ width: 24, height: 24, icons: { 'unit-ok': { body: '<g/>' } } }), async (urls) => {
    const out = await loadStyleImage('noto', 'unit-ok')
    assert.equal(out.status, 'ok')
    assert.ok(out.src.startsWith('data:image/svg+xml'))
    assert.equal(urls.length, 1)
    assert.equal(urls[0], 'https://api.iconify.design/noto.json?icons=unit-ok')
    // A settled answer is kept: the second ask sends nothing.
    assert.equal((await loadStyleImage('noto', 'unit-ok')).status, 'ok')
    assert.equal(urls.length, 1)
  })
})

test('a set with no icon is missing, not broken', async () => {
  await withFetch(() => json({ icons: {}, not_found: ['unit-gone'] }), async () => {
    assert.deepEqual(await loadStyleImage('noto', 'unit-gone'), { status: 'missing' })
  })
})

test('a refused or failed request is an error, kept apart from missing, and is not remembered', async () => {
  await withFetch(() => json({ error: 'nope' }, 500), async () => {
    assert.deepEqual(await loadStyleImage('twemoji', 'unit-err'), { status: 'error' })
  })
  await withFetch(() => json({ width: 24, height: 24, icons: { 'unit-err': { body: '<g/>' } } }), async () => {
    assert.equal((await loadStyleImage('twemoji', 'unit-err')).status, 'ok')
  })
})
