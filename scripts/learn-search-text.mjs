// The body text of every Learn guide, as plain strings, for the search field
// on /learn.
//
// ── Why the text is extracted at BUILD time and not at render time ─────────
//
// The guides are JSX modules that measure things while they render — a
// contrast table reads the page's own custom properties, a metrics table paints
// to a canvas. Rendering seven of them to a string on the landing page just to
// search their prose would pull the whole article chunk (and its measuring
// components) into /learn, a page whose job is to hand over links. Reading the
// prose out of the SOURCE instead costs the landing nothing at all until the
// reader focuses the search field, and then it costs one small chunk.
//
// The extraction is scripts/learn-wordcount.mjs's proseOf(), the same function
// that measures the `words` figure printed under every guide heading, so the
// text that is searchable is exactly the text that is counted as prose: what a
// reader can see on the page, with the tags, the expression containers and the
// module scaffolding removed. tests/unit/learn-search.test.js asserts that for
// every guide the result carries a run of words that appears in its body and
// in none of its metadata — so a search for something only the body says has
// to reach the body.
//
// ── How it reaches the browser ─────────────────────────────────────────────
//
// vite.config.js serves this map as the virtual module
// `virtual:learn-search-text`. SurfaceLanding.jsx imports it DYNAMICALLY on the
// first focus of the search field, which is the same arrangement the Emoji
// Library uses for its ~31 KB index: never on the first paint, normally
// resolved before the first keystroke. There is no committed artefact to
// drift; the module is derived from the guides on every build and every dev
// start.
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { LEARN_ARTICLES } from '../src/data/learnIndex.js'
import { proseOf } from './learn-wordcount.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dir = path.join(root, 'src', 'data', 'learn')

export const VIRTUAL_ID = 'virtual:learn-search-text'

/** The absolute path of every guide module, for a watcher. */
export const articleFiles = () => LEARN_ARTICLES.map((a) => path.join(dir, a.file))

/**
 * One guide's searchable prose. proseOf() with two adjustments that do not
 * matter for a word COUNT but do for a word SEARCH:
 *
 *   · `&nbsp;` and the dash entities become a space rather than nothing, so
 *     "font&nbsp;size" searches as two words rather than as "fontsize", and
 *     the quote entities become the mark they stand for, so "WCAG&rsquo;s"
 *     searches as "wcag's" rather than as "wcags";
 *   · a module-level `const X = '...'` line (a URL prefix, say) is not prose
 *     and is dropped, as `import` and `export` lines already are.
 */
export function searchableProse(source) {
  const s = source
    .replace(/&(?:nbsp|thinsp|ensp|emsp);/g, ' ')
    .replace(/&(?:ndash|mdash|minus);/g, ' ')
    .replace(/&(?:rsquo|lsquo|apos|#39);/g, '\u2019')
    .replace(/&(?:ldquo|rdquo|quot);/g, '"')
    .replace(/^\s*(?:const|let|var|return)\b.*$/gm, ' ')
  return proseOf(s)
}

/** `{ [slug]: text }` for every registered guide, in registry order. */
export async function learnSearchText() {
  const out = {}
  for (const a of LEARN_ARTICLES) {
    out[a.slug] = searchableProse(await readFile(path.join(dir, a.file), 'utf8'))
  }
  return out
}

/**
 * The Vite plugin. `import('virtual:learn-search-text')` resolves to a module
 * whose default export is the map above.
 */
export function learnSearchTextPlugin() {
  const resolved = `\0${VIRTUAL_ID}`
  return {
    name: 'uil4b-learn-search-text',
    resolveId(id) {
      return id === VIRTUAL_ID ? resolved : null
    },
    async load(id) {
      if (id !== resolved) return null
      // In dev, an edit to a guide re-derives the module rather than serving
      // the text of the guide as it was when the server started.
      for (const file of articleFiles()) this.addWatchFile(file)
      return `export default ${JSON.stringify(await learnSearchText())}\n`
    },
  }
}

// Print the sizes when run directly — the number the PR quotes as the cost.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const map = await learnSearchText()
  let total = 0
  for (const [slug, text] of Object.entries(map)) {
    total += text.length
    console.log(`${slug.padEnd(20)} ${String(text.length).padStart(6)} chars`)
  }
  console.log(`${''.padEnd(20)} ${String(total).padStart(6)} chars across ${Object.keys(map).length} guides`)
}
