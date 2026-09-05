// Measure the prose length of each Learn article, so `words` in
// src/data/learnIndex.js is a measurement rather than an estimate.
//
// The reading time under every article heading is derived from that number. A
// typed "5 min read" is a guess that never changes when the article does, and
// on a reference surface whose whole claim is that its figures are checkable,
// the first uncheckable figure should not be the one at the top of the page.
//
// ── What it counts, and what it deliberately does not ──────────────────────
//
// It counts the visible prose: text nodes in the JSX, plus the strings passed
// as `caption` on a figure. It removes, in order:
//
//   • the file's own comments (they are for whoever edits the article);
//   • import/export machinery;
//   • JSX tags with all their attributes — an href is not read;
//   • JSX expression containers `{...}` — these hold template literals for
//     formulas, arrays of table rows, and interpolation, none of which reads
//     as running prose. Captions are recovered separately, because they ARE
//     read and they are long enough to matter.
//
// The result is an undercount for the tables (the cells are inside expression
// containers) and that is the honest direction to be wrong in: a reading
// estimate that overstates is a promise the article breaks.
//
// Usage:  node scripts/learn-wordcount.mjs
// Output: one line per article, then the `words:` value to paste.
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dir = path.join(root, 'src', 'data', 'learn')

/** The reading prose in one article module, as plain text. */
export function proseOf(source) {
  let s = source
  s = s.replace(/\/\*[\s\S]*?\*\//g, ' ')
  s = s.replace(/^\s*\/\/.*$/gm, ' ')
  s = s.replace(/^\s*(import|export)\b.*$/gm, ' ')

  // Captions and other read-aloud string props, pulled out before the
  // expression containers that may hold them are dropped.
  const captions = [...s.matchAll(/\b(?:caption|source)=(?:"([^"]*)"|\{'([^']*)'\})/g)]
    .map((m) => m[1] || m[2] || '')
    .join(' ')

  // Expression containers, innermost first, so nested braces collapse.
  let previous
  do {
    previous = s
    s = s.replace(/\{[^{}]*\}/g, ' ')
  } while (s !== previous)

  s = s.replace(/<[^>]*>/g, ' ')
  s = `${s} ${captions}`
  // Entities that stand for a word or a mark, so &ldquo;x&rdquo; is one word.
  s = s.replace(/&[a-z]+;/gi, '')
  // Leftover punctuation that is not a word: the brackets the scaffolding sat in.
  s = s.replace(/(^|\s)[(){};,]+(?=\s|$)/g, ' ')
  return s.replace(/\s+/g, ' ').trim()
}

export const countWords = (text) => (text ? text.split(/\s+/).filter(Boolean).length : 0)

/** Every article's measured word count, keyed by filename. */
export async function wordCounts() {
  const files = (await readdir(dir)).filter((f) => f.endsWith('.jsx')).sort()
  const out = {}
  for (const file of files) out[file] = countWords(proseOf(await readFile(path.join(dir, file), 'utf8')))
  return out
}

// Only print when run as a script. tests/unit/learn-articles.test.js imports
// wordCounts() to check the `words` values on disk are still true, and a module
// that logs on import would print into the middle of the test output.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const counts = await wordCounts()
  let total = 0
  for (const [file, words] of Object.entries(counts)) {
    total += words
    console.log(`${file.padEnd(24)} ${String(words).padStart(5)} words   words: ${words},`)
  }
  const n = Object.keys(counts).length
  console.log(`${''.padEnd(24)} ${String(total).padStart(5)} words total across ${n} article${n === 1 ? '' : 's'}`)
}
