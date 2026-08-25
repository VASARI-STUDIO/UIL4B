import test from 'node:test'
import assert from 'node:assert/strict'
import { EMOJI_DATA } from '../../src/data/emojiData.js'
import { EMOJI_TERMS } from '../../src/data/emojiIndex.js'
import { normaliseQuery, scoreEmoji, searchEmoji } from '../../src/data/emojiSearch.js'

// The catalogue, in the shape the page passes to searchEmoji.
const GROUPS = EMOJI_DATA.map((g) => ({
  cat: g.cat,
  items: g.emojis.split(/\s+/).filter(Boolean).map((char) => ({ char })),
}))

const find = (query) => searchEmoji(GROUPS, EMOJI_TERMS, query).map((i) => i.char)
const first = (query) => find(query)[0]
const rank = (query, char) => find(query).indexOf(char)

// ── The reported fault ───────────────────────────────────────────────────────
// Every one of these returned a whole CATEGORY before the index existed: the
// old filter matched a per-category keyword table, so "dog" returned all 123
// Animals and "thumbs up" returned all 61 Hands. These assert the surface now
// finds the emoji itself.

test('a query names one emoji instead of selecting its category', () => {
  assert.equal(first('pizza'), '🍕')
  assert.equal(first('unicorn'), '🦄')
  assert.equal(first('thumbs up'), '👍')
  assert.equal(first('thumbs down'), '👎')
  assert.equal(first('laptop'), '💻')
  assert.equal(first('trophy'), '🏆')
  assert.equal(first('robot'), '🤖')
  assert.equal(first('ghost'), '👻')
})

test('a specific query returns a handful of emoji, not a category', () => {
  // "dog" used to return 123 (all of Animals) and "pizza" 125 (all of Food).
  assert.ok(find('dog').length < 15, `dog returned ${find('dog').length}`)
  assert.equal(find('pizza').length, 1)
  assert.equal(find('thumbs up').length, 1)
})

test('queries the category table could not answer at all now resolve', () => {
  // These returned zero results before: no category keyword mentioned them.
  for (const [query, expected] of [['grinning', '😀'], ['laptop', '💻'], ['warning', '⚠️']]) {
    const hits = find(query)
    assert.ok(hits.length > 0, `${query} returned nothing`)
    assert.ok(hits.includes(expected), `${query} did not include ${expected}`)
  }
})

test('a query that contains a keyword does not match on that alone', () => {
  // The old rule also matched when the QUERY contained a category keyword, so
  // "rocket" returned Hands ("rock"), "cathedral" returned Smileys ("cat") and
  // "unicorn" returned Food ("corn").
  assert.deepEqual(find('cathedral'), [])
  assert.ok(!find('rocket').includes('👋'), 'rocket still matches the waving hand')
  assert.equal(find('unicorn').length, 1)
})

test('nonsense finds nothing, so the empty state is reachable', () => {
  assert.deepEqual(find('zzzzz'), [])
  assert.deepEqual(find('qwerty'), [])
})

// ── Ranking ──────────────────────────────────────────────────────────────────
// An index that holds the right entry but ranks it below incidental matches is
// still unusable. These pin the specific inversions that were found and fixed.

test('the plain emoji outranks compound names that merely begin with the word', () => {
  // ❤️ "red heart" ranked seventh, behind 💝 "heart with ribbon", 💘 "heart
  // with arrow" and three more that just started with the word.
  assert.equal(first('heart'), '❤️')
})

test('a whole keyword outranks a name that only shares a prefix', () => {
  // "car" led with 🥕 carrot, whose name merely starts with those letters,
  // while 🚗 carries "car" as a whole keyword.
  assert.ok(rank('car', '🥕') > rank('car', '🚗'), 'carrot still outranks the car')
  // Same shape: 🎬 "clapper board" over 👏, whose keywords include "clap".
  assert.equal(first('clap'), '👏')
})

test('an inflection of the name outranks another emoji keyword', () => {
  // The mirror of the rule above, and the reason it is scored rather than
  // ordered: "lock" is an inflection of 🔒 "locked", so 🔒 must stay ahead of
  // 🔑, which only lists "lock" as a keyword.
  assert.ok(rank('lock', '🔒') < rank('lock', '🔑'), 'the key outranks the lock')
  assert.ok(rank('music', '🎵') < rank('music', '🎤'), 'the microphone outranks the note')
})

test('a match inside a word does not count as a match on that word', () => {
  // "lock" is a larger share of "clock" than of "locked", so scoring
  // containment rather than prefixes put ⏲️ "timer clock" top for "lock".
  assert.ok(rank('lock', '🔒') < rank('lock', '⏲️'), 'a clock outranks the lock')
})

test('the name corroborating a keyword breaks a keyword tie', () => {
  // ✈️ "airplane" and 🧑‍✈️ "pilot" both list the keyword "plane".
  assert.equal(first('plane'), '✈️')
})

test('results are ordered deterministically for the same query', () => {
  assert.deepEqual(find('heart'), find('heart'))
  assert.deepEqual(find('star'), find('star'))
})

// ── Matching rules ───────────────────────────────────────────────────────────

test('every token must match, so extra words narrow the result', () => {
  const heart = find('heart')
  const redHeart = find('red heart')
  assert.ok(redHeart.length < heart.length, 'the second word did not narrow anything')
  assert.equal(redHeart[0], '❤️')
})

test('a one-character query matches word starts, not any letter', () => {
  const hits = find('o')
  assert.ok(hits.includes('👌'), 'ok hand missing from a one-letter query')
  // 🍕 "pizza" contains an o in none of its word starts; before the
  // word-boundary rule a single letter matched most of the catalogue.
  assert.ok(!hits.includes('🍕'), 'pizza matched the letter o')
  assert.ok(hits.length < GROUPS.reduce((n, g) => n + g.items.length, 0) / 2)
})

test('queries are normalised for case and stray whitespace', () => {
  assert.equal(normaliseQuery('  RED   Heart '), 'red heart')
  assert.equal(first('  PIZZA  '), '🍕')
  assert.equal(first('ThUmBs Up'), '👍')
})

test('an empty or index-less search returns nothing rather than everything', () => {
  assert.deepEqual(searchEmoji(GROUPS, EMOJI_TERMS, ''), [])
  assert.deepEqual(searchEmoji(GROUPS, EMOJI_TERMS, '   '), [])
  assert.deepEqual(searchEmoji(GROUPS, null, 'heart'), [])
})

test('an unknown emoji scores zero rather than throwing', () => {
  assert.equal(scoreEmoji(undefined, 'heart', ['heart']), 0)
  assert.equal(scoreEmoji(null, 'heart', ['heart']), 0)
})

test('searching inside a category only returns that category', () => {
  const food = GROUPS.filter((g) => g.cat === 'Food')
  const hits = searchEmoji(food, EMOJI_TERMS, 'heart').map((i) => i.char)
  assert.ok(!hits.includes('❤️'), 'a Symbols emoji leaked into a Food search')
})

test('an emoji listed in two categories is ranked once', () => {
  // 🙈 is in both Smileys and Animals.
  const hits = find('monkey')
  assert.equal(hits.filter((c) => c === '🙈').length, 1)
})

// ── The index itself ─────────────────────────────────────────────────────────

test('every emoji in the catalogue is searchable', () => {
  const missing = []
  for (const group of EMOJI_DATA) {
    for (const char of group.emojis.split(/\s+/).filter(Boolean)) {
      const entry = EMOJI_TERMS.get(char)
      if (!entry || !entry.name || !entry.terms) missing.push(char)
    }
  }
  // An emoji in the grid with no terms is invisible to search — the exact
  // fault this index exists to fix, reintroduced one character at a time.
  assert.deepEqual(missing, [], `${missing.length} emoji have no search terms`)
})

test('every index entry can find itself by its own name', () => {
  // A spot check across the catalogue rather than all 1,636: enough to catch a
  // packing or parsing error in the generated file.
  for (const char of ['🍕', '🦄', '💻', '👍', '🚀', '🏆', '❤️', '🐕']) {
    const { name } = EMOJI_TERMS.get(char)
    assert.ok(find(name).includes(char), `${char} cannot be found by its name "${name}"`)
  }
})
