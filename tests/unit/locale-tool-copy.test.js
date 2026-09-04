// THE LOCALE FILES ARE A COPY OF THE TOOL LIST, AND THEY WENT STALE.
//
// ── The failure this exists for ─────────────────────────────────────────────
//
// src/locales/*.json carries a `tools` block and a `categories` block: a label
// and a description per entry, translated into ten languages. That is a fourth
// hand-kept copy of the same reality CREATE_GROUPS in src/data/toolTree.js owns
// — and on 2026-09-03 it named FIVE tools the product does not have:
//
//   tools.imageConverter    "Image Converter"      — renamed and rescoped to
//                                                    File Converter, which now
//                                                    does video too
//   tools.videoFrames       "Video to Frames"      — /video-frames is retired,
//                                                    301 to /create/file-converter
//   tools.designReference   "Design Reference"     — /design-reference retired to /learn
//   tools.designExport      "Design System Export" — /export retired to /create/color
//   tools.cadConverter      "CAD Converter"        — no route, in any table, ever
//
// #332 narrowed TOOL_I18N_MAP so none of the five could render any more, which
// stopped the bleeding without removing the copy. Nothing then stopped the next
// one: mapping a live tool onto `tools.imageConverter` would have renamed File
// Converter after a tool retired two releases ago, confidently, in nine
// languages. That is the same defect class the search index had, and it gets
// the same answer #332 gave — derive both sides, and fail the build when they
// disagree.
//
// ── Why these assertions and not a list of the eleven keys ──────────────────
//
// A test naming the keys would be a FIFTH copy. Both sides are derived:
//
//   · TOOL_I18N_MAP and CATEGORY_ENTRIES are imported and asked which locale
//     keys the app can actually consume — toolIndex.js is plain .js precisely
//     so `node --test` can do that;
//   · the source tree is scanned, comments stripped, for the keys read directly
//     through t() rather than through the map (there is one: ColorStudio.jsx
//     still reads `tools.colorStudio.description` for its own page copy, which
//     is why that key survives while the tool it named does not);
//   · the ten locale files are read and compared against the union.
//
// ── The two directions, and why they are not symmetrical ────────────────────
//
// STALENESS is enforced on every locale: no locale file may name a tool or a
// category the app cannot consume. That is the direction that broke.
//
// COMPLETENESS is enforced on en.json only. en is the base locale — I18nContext
// falls back to it before it will ever surface a raw key — so en must answer
// every key the code asks for. A translated locale is allowed to be short of it.
//
// That second rule is a DELIBERATE decision, not an oversight, and it is
// recorded here because it is currently load-bearing: the eight non-English
// locales carry four of the eight `categories` blocks, so de/es/fr/it/ja/ko/pt/zh
// have no translation for `categories.resources` — the one missing block that is
// reachable today — and render it in English. The honest options were to fall
// back to English or to invent nine translations; falling back is what the
// runtime already does, so the entries stay omitted and the gap is written down
// rather than machine-translated into copy nobody wrote. The last test below
// pins that fallback so the choice is safe by construction instead of by luck.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  CATEGORY_ENTRIES,
  TOOL_ENTRIES,
  TOOL_I18N_MAP,
  categoryPillFor,
  localiseCategoriesWith,
  localiseWith,
} from '../../src/data/toolIndex.js'
import { assertStripperWorks, read, stripComments } from './helpers/source-text.js'

/** Every .js / .jsx file under src/, minus the locale JSON itself. */
function sourceFiles(dir = 'src') {
  const out = []
  for (const entry of fs.readdirSync(path.join(process.cwd(), dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`
    if (entry.isDirectory()) out.push(...sourceFiles(rel))
    else if (/\.jsx?$/.test(entry.name)) out.push(rel)
  }
  return out
}

/** Locale files, keyed by their code. */
function locales() {
  const dir = path.join(process.cwd(), 'src/locales')
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => [f.replace(/\.json$/, ''), JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))])
}

/** The matcher, split out so it can be proved against a fixture. */
const DIRECT_READ = /\bt\(\s*['"`](tools|categories)\.([A-Za-z0-9_]+)\./g

function collectDirectReads(src, into) {
  for (const m of src.matchAll(DIRECT_READ)) into[m[1]].add(m[2])
  return into
}

/** `tools.` / `categories.` keys read straight through t(), from source. */
function directlyReadKeys() {
  const found = { tools: new Set(), categories: new Set() }
  for (const file of sourceFiles()) {
    collectDirectReads(stripComments(read(file)), found)
  }
  return found
}

/** Every locale key the app can consume, block by block. Derived, never typed. */
function consumedKeys() {
  const direct = directlyReadKeys()
  const tools = new Set([
    ...Object.values(TOOL_I18N_MAP).map((prefix) => prefix.split('.')[1]),
    ...direct.tools,
  ])
  const categories = new Set([
    ...CATEGORY_ENTRIES.flatMap((c) => [c.labelKey, c.descKey]).map((k) => k.split('.')[1]),
    ...direct.categories,
  ])
  return { tools, categories }
}

test('the comment stripper works, so the source scan can be trusted', () => {
  // Both halves matter. A stripper that removed nothing would let a comment
  // satisfy the scan; one that ate code would make the scan miss a real reader
  // and delete a key that is still in use. The fixture half lives beside the
  // stripper in tests/unit/helpers/source-text.js so the guard cannot be left
  // behind when a new caller copies the read but not the check.
  assertStripperWorks(assert)

  // On a real file, with tokens that appear on ONE side only. This file quotes
  // every retired key in its own header comment, so a stripper that did nothing
  // would let the scan below read them as live again.
  //
  // The needle is assembled from halves on purpose: written whole it would be a
  // string literal in this very file, survive stripping legitimately, and the
  // assertion would fail against itself rather than against a broken stripper.
  const ghost = 'design' + 'Export'
  const self = stripComments(read('tests/unit/locale-tool-copy.test.js'))
  assert.ok(self.includes('function consumedKeys'), 'stripping ate this file own code')
  assert.ok(self.includes('missEverything'), 'stripping ate this file JS')
  assert.ok(!self.includes(ghost),
    'a comment survived stripping — the scan below would read retired keys as live')
})

test('the source scan is not vacuous — the direct-read matcher still matches', () => {
  // If the regex stopped matching, `consumedKeys()` would silently shrink and
  // the staleness test would start demanding the deletion of live keys.
  //
  // This used to pin the one direct reader that existed: ColorStudio.jsx read
  // tools.colorStudio.description straight through t(). That page has since had
  // its three unreachable sections deleted, the merged-studio hero went with
  // them, and it was the LAST direct reader in src — so the pin failed, exactly
  // as a pin to one file eventually does. Re-pinning it to whichever page reads
  // a key today would only buy the next deletion the same failure.
  //
  // So prove the matcher against a FIXTURE. That is the actual invariant — the
  // regex still recognises a direct read — and it holds whether src contains
  // zero such reads or fifty.
  const fixture = [
    "const a = t('tools.typeScale.label')",
    'const b = t("categories.colour.desc")',
    'const c = t(`tools.altText.description`)',
    "const d = t( 'tools.iconLibrary.label' )",
  ].join('\n')
  const found = collectDirectReads(fixture, { tools: new Set(), categories: new Set() })
  assert.deepEqual([...found.tools].sort(), ['altText', 'iconLibrary', 'typeScale'],
    'the direct-read matcher stopped recognising t() reads of tools.* — consumedKeys() '
    + 'would silently shrink and the staleness test would demand live keys be deleted')
  assert.deepEqual([...found.categories], ['colour'],
    'the direct-read matcher stopped recognising t() reads of categories.*')

  // And it must not match things that are not direct reads.
  const noise = "t('nav.home')\nlabel = 'tools.typeScale.label'\ntranslate('tools.foo.bar')"
  const none = collectDirectReads(noise, { tools: new Set(), categories: new Set() })
  assert.deepEqual([...none.tools, ...none.categories], [],
    'the matcher is matching strings that are not t() reads, so consumedKeys() would '
    + 'grow and the staleness test would stop demanding real deletions')

  const scanned = sourceFiles()
  assert.ok(scanned.length >= 50, `only ${scanned.length} source files scanned`)
})

test('THE ONE THAT MATTERS: no locale names a tool or category the app does not have', () => {
  // The subtractive direction, and the one that was broken: five tools.* blocks
  // named tools that no longer exist, in all ten files.
  const consumed = consumedKeys()
  const files = locales()
  assert.ok(files.length >= 10, `only ${files.length} locale files — this guard would pass vacuously`)
  assert.ok(consumed.tools.size >= 8 && consumed.categories.size >= 6,
    'the consumed sets look empty — the derivation broke, not the locales')
  for (const [code, messages] of files) {
    for (const block of ['tools', 'categories']) {
      for (const key of Object.keys(messages[block] || {})) {
        assert.ok(consumed[block].has(key),
          `${code}.json translates ${block}.${key}, which names nothing the app can render. `
          + 'Either wire it up in toolIndex.js or delete the block — a translated string '
          + 'for a tool that does not exist is a fourth copy of the tool list going stale.')
      }
    }
  }
})

test('en.json answers every key the app asks for — it is the fallback for all the others', () => {
  // The additive direction. I18nContext resolves a missing key against en
  // before it will surface a raw key, so a gap HERE is the one gap that reaches
  // a visitor as `tools.altText.label`.
  const consumed = consumedKeys()
  const en = JSON.parse(read('src/locales/en.json'))
  for (const block of ['tools', 'categories']) {
    for (const key of consumed[block]) {
      const entry = en[block]?.[key]
      assert.ok(entry, `the app reads ${block}.${key} and en.json does not define it`)
      for (const field of ['label', 'description']) {
        assert.equal(typeof entry[field], 'string',
          `en.json ${block}.${key}.${field} is missing`)
        assert.ok(entry[field].trim().length > 0, `en.json ${block}.${key}.${field} is empty`)
      }
    }
  }
})

test('every translated block that IS present is a complete label + description pair', () => {
  // A half-written block is worse than an absent one: the absent one falls back
  // to en whole, the half-written one mixes two languages inside one result row.
  const consumed = consumedKeys()
  for (const [code, messages] of locales()) {
    for (const block of ['tools', 'categories']) {
      for (const [key, entry] of Object.entries(messages[block] || {})) {
        if (!consumed[block].has(key)) continue
        for (const field of ['label', 'description']) {
          assert.ok(typeof entry[field] === 'string' && entry[field].trim(),
            `${code}.json ${block}.${key} has a ${field === 'label' ? 'description' : 'label'} `
            + `but no ${field} — half a row renders in ${code} and half in English`)
        }
      }
    }
  }
})

test('the i18n map can rename a tool but cannot invent one', () => {
  // TOOL_I18N_MAP is the only thing that can point a locale string at a tool.
  // A key naming a tool that does not exist is silently ignored at runtime, so
  // nothing else would notice it had been aimed at a ghost.
  const known = new Set(TOOL_ENTRIES.map((t) => t.id))
  assert.ok(Object.keys(TOOL_I18N_MAP).length >= 8, 'the map looks empty — this would pass vacuously')
  for (const [id, prefix] of Object.entries(TOOL_I18N_MAP)) {
    assert.ok(known.has(id), `TOOL_I18N_MAP translates "${id}", which is not a tool in the registry`)
    assert.match(prefix, /^tools\.[A-Za-z0-9_]+$/, `${id} maps to "${prefix}", which is not a tools.* key`)
  }
})

test('THE OMISSION IS SAFE: a locale with no entry falls back to English, never to a raw key', () => {
  // This is the assertion behind the decision recorded at the top of this file.
  // Eight locales have no `categories.resources` block and none of the ten will
  // gain one from a machine — so the fallback is the product behaviour, and it
  // has to be checked rather than assumed. `t` here is the worst case: a locale
  // that resolves nothing, which is what I18nContext returns after both the
  // active locale AND en have missed.
  const missEverything = (key) => key
  const cats = localiseCategoriesWith(CATEGORY_ENTRIES, missEverything)
  assert.equal(cats.length, CATEGORY_ENTRIES.length)
  for (const cat of cats) {
    assert.ok(!cat.label.includes('categories.'), `${cat.id} rendered a raw key as its label`)
    assert.ok(!cat.description.includes('categories.'), `${cat.id} rendered a raw key as its description`)
    const registry = CATEGORY_ENTRIES.find((c) => c.id === cat.id)
    assert.equal(cat.label, registry.label, `${cat.id} did not fall back to the registry label`)
  }
  const tools = localiseWith(TOOL_ENTRIES, missEverything, TOOL_I18N_MAP)
  for (const tool of tools) {
    assert.ok(!tool.label.includes('tools.'), `${tool.id} rendered a raw key as its label`)
    const registry = TOOL_ENTRIES.find((t) => t.id === tool.id)
    assert.equal(tool.label, registry.label, `${tool.id} did not fall back to the registry label`)
  }
})

// THE BADGE AND THE ROW IT LABELS MUST COME FROM THE SAME FILE.
//
// The search rows on the homepage and in the command palette show a tool's
// label and description beside a pill naming its category. The words came from
// the registry unless TOOL_I18N_MAP vouched for a translation; the pill came
// from the locale unconditionally. In en-US that put "COLOR STUDIO" against
// "Generate a full palette from one colour, with tints, shades and accessible
// pairings" - four such rows, ~700px under an H1 reading "Colour, type and
// tokens that stay one system", answering a visitor who had typed "colour".
//
// Asserted against a locale that translates EVERYTHING, so the two branches
// are told apart by the map alone rather than by which keys happen to ship.
test('a search row takes its category badge from the same source as its own words', () => {
  const translated = (key) => `[${key}]`

  const mapped = TOOL_ENTRIES.filter((tool) => TOOL_I18N_MAP[tool.id])
  const unmapped = TOOL_ENTRIES.filter((tool) => !TOOL_I18N_MAP[tool.id])
  assert.ok(mapped.length > 0, 'expected some tools to carry a vouched translation')
  assert.ok(unmapped.length > 0, 'expected some tools to fall back to the registry')

  for (const tool of mapped) {
    const cat = CATEGORY_ENTRIES.find((c) => c.id === tool.category)
    if (!cat) continue
    // Its own label is localised, so its badge is too.
    assert.equal(
      categoryPillFor(tool, cat, translated), `[${cat.labelKey}]`,
      `${tool.id} is translated but its badge ignored the locale`,
    )
  }

  for (const tool of unmapped) {
    const cat = CATEGORY_ENTRIES.find((c) => c.id === tool.category)
    if (!cat) continue
    // Its own label is the registry's, so its badge must be too.
    assert.equal(
      categoryPillFor(tool, cat, translated), cat.label,
      `${tool.id} keeps the registry's words but took a localised badge`,
    )
  }

  // The colour tools are the ones that shipped the split, so name them.
  const colourCat = CATEGORY_ENTRIES.find((c) => c.id === 'color')
  assert.ok(colourCat, 'the colour category should exist')
  assert.equal(colourCat.label, 'Colour Studio', 'the registry holds the house spelling')
  const palette = TOOL_ENTRIES.find((tool) => tool.id === 'palette')
  assert.ok(palette, 'the Palette tool should be in the index')
  assert.equal(
    categoryPillFor(palette, colourCat, translated), 'Colour Studio',
    'the Palette row still shows a badge in a spelling its own description does not use',
  )

  // A row with no category is a badge with nothing to say.
  assert.equal(categoryPillFor(palette, null, translated), null)
})
