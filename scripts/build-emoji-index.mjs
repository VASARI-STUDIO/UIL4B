// Generates `src/data/emojiIndex.js` — the per-emoji search terms that make the
// Emoji Library's search box find a SINGLE emoji rather than a whole category.
//
// Why a generator rather than a hand-written table: there are 1,600+ characters
// in `src/data/emojiData.js`, and hand-authored names drift from the grid the
// moment either side is edited. This reads the catalogue and pulls the names and
// keywords from Unicode CLDR, so every character the grid renders is covered by
// construction and the coverage assertion below fails the run if it is not.
//
// Run it when `src/data/emojiData.js` changes:
//
//   node scripts/build-emoji-index.mjs
//
// It needs network access (raw.githubusercontent.com). It is NOT part of
// `npm run build` — the generated file is committed, so an offline build and CI
// never depend on a third party being up. That is deliberate: the alternative
// puts a remote fetch on the critical path of every build.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { EMOJI_DATA } from '../src/data/emojiData.js'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(HERE, '..', 'src', 'data', 'emojiIndex.js')

// CLDR ships base annotations and "derived" ones (flags, ZWJ sequences, skin
// tones) in two separate files. The catalogue draws on both, so we need both.
const SOURCES = [
  'https://raw.githubusercontent.com/unicode-org/cldr-json/main/cldr-json/cldr-annotations-full/annotations/en/annotations.json',
  'https://raw.githubusercontent.com/unicode-org/cldr-json/main/cldr-json/cldr-annotations-derived-full/annotationsDerived/en/annotations.json',
]

// A few characters in the catalogue predate or sit outside CLDR's annotation
// set, and a couple carry names nobody would actually type. Names here win.
const OVERRIDES = {
  '🫨': 'shaking face | shake | shock | vibrate | tremble',
  '🩷': 'pink heart | love | heart',
  '🩵': 'light blue heart | love | heart',
  '🩶': 'grey heart | gray heart | love | heart',
  '🪿': 'goose | bird | honk',
  '🫎': 'moose | elk | antlers | animal',
  '🫏': 'donkey | mule | ass | animal',
  '🪼': 'jellyfish | sting | ocean',
  '🫛': 'pea pod | peas | vegetable',
  '🫚': 'ginger root | ginger | spice | root',
  '🪭': 'folding hand fan | fan',
  '🪮': 'hair pick | comb | afro pick',
  '🪇': 'maracas | shaker | rattle | percussion',
  '🪈': 'flute | recorder | fife | pipe | woodwind',
  '🐦‍⬛': 'black bird | blackbird | crow | raven',
  '⛓️': 'chains | chain | link',
  '🖐️': 'hand with fingers splayed | five | palm | splayed',
  '✋': 'raised hand | stop | high five | palm',
  '👋': 'waving hand | wave | hello | goodbye | hi | bye',
  '👍': 'thumbs up | thumb | yes | like | approve | +1',
  '👎': 'thumbs down | thumb | no | dislike | -1',
  '💻': 'laptop | computer | pc | macbook | notebook',
  '🖥️': 'desktop computer | monitor | screen | pc',
  '⌨️': 'keyboard | keys | typing',
  '🖱️': 'computer mouse | cursor | click',
}

async function loadAnnotations() {
  const map = new Map()
  for (const url of SOURCES) {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`)
    const json = await res.json()
    const bag = json.annotations?.annotations || json.annotationsDerived?.annotations
    if (!bag) throw new Error(`${url} → unexpected shape`)
    for (const [char, entry] of Object.entries(bag)) {
      // `tts` is the spoken name ("thumbs up"); `default` is the keyword list.
      const name = Array.isArray(entry.tts) ? entry.tts[0] : entry.tts
      const words = Array.isArray(entry.default) ? entry.default : []
      const prev = map.get(char)
      const merged = [name, ...words].filter(Boolean)
      map.set(char, prev ? [...new Set([...prev, ...merged])] : [...new Set(merged)])
    }
  }
  return map
}

// CLDR keys sequences without the emoji-presentation selector about half the
// time, so look the character up in a few normalised forms before giving up.
function lookup(map, char) {
  const candidates = [
    char,
    char.replace(/️/g, ''),
    char + '️',
    [...char].filter(c => c.codePointAt(0) !== 0xFE0F).join(''),
  ]
  for (const c of candidates) {
    const hit = map.get(c)
    if (hit && hit.length) return hit
  }
  return null
}

function clean(terms) {
  const seen = new Set()
  const out = []
  for (const raw of terms) {
    const term = String(raw).toLowerCase().replace(/[|\t\n]/g, ' ').replace(/\s+/g, ' ').trim()
    if (!term || seen.has(term)) continue
    seen.add(term)
    out.push(term)
  }
  return out
}

const annotations = await loadAnnotations()

const chars = []
for (const group of EMOJI_DATA) {
  for (const char of group.emojis.split(/\s+/).filter(Boolean)) {
    if (!chars.includes(char)) chars.push(char)
  }
}

const lines = []
const missing = []
for (const char of chars) {
  let terms
  if (OVERRIDES[char]) {
    terms = OVERRIDES[char].split('|')
  } else {
    const hit = lookup(annotations, char)
    if (!hit) { missing.push(char); continue }
    terms = hit
  }
  lines.push(`${char}\t${clean(terms).join('|')}`)
}

// Coverage is the whole point of generating this: an emoji in the grid with no
// terms is invisible to search, which is the exact bug this file exists to fix.
// Fail loudly rather than silently shipping a partial index.
if (missing.length) {
  console.error(`\nNo annotation for ${missing.length} character(s):`)
  console.error(missing.map(c => `  ${c}  ${[...c].map(x => 'U+' + x.codePointAt(0).toString(16).toUpperCase()).join(' ')}`).join('\n'))
  console.error('\nAdd them to OVERRIDES in scripts/build-emoji-index.mjs and re-run.')
  process.exit(1)
}

const banner = `// GENERATED by scripts/build-emoji-index.mjs — do not edit by hand.
//
// Per-emoji search terms, so that searching "thumbs up" finds 👍 instead of
// returning all 61 Hands emoji. Before this existed the Emoji Library matched
// on CATEGORY keywords only, so every query resolved to whole categories and
// nothing could be found by name.
//
// Packed as ONE string rather than ${chars.length} object literals: it is a little
// over half the source size, and \`EMOJI_TERMS\` below parses it into a Map in
// about a millisecond at module load. Format per line:
//
//   <emoji>\\t<name>|<keyword>|<keyword>...
//
// The first field is the display name; the rest are CLDR search keywords.
// Regenerate with \`node scripts/build-emoji-index.mjs\` after editing
// src/data/emojiData.js.

const PACKED = \``

const body = lines.join('\n')

const footer = `\`

// char → { name, terms } where \`terms\` is one lowercase haystack string.
export const EMOJI_TERMS = (() => {
  const map = new Map()
  for (const line of PACKED.split('\\n')) {
    const tab = line.indexOf('\\t')
    if (tab === -1) continue
    const char = line.slice(0, tab)
    const parts = line.slice(tab + 1).split('|')
    map.set(char, { name: parts[0], terms: parts.join(' ') })
  }
  return map
})()
`

fs.writeFileSync(OUT, banner + body + footer, 'utf8')

const bytes = Buffer.byteLength(banner + body + footer, 'utf8')
console.log(`wrote src/data/emojiIndex.js — ${lines.length} emoji, ${(bytes / 1024).toFixed(1)} KB`)
