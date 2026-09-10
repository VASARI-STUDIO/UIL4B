// The suite's one comment-stripper.
//
// A dozen unit tests read application source and assert on what they find, so
// every one of them has to answer the same question first: does a COMMENT that
// mentions a string count as the code containing it? It must not — assertions
// in this repository have matched the explanatory prose that quotes the very
// string under test more than once, and passed forever while guarding nothing.
//
// Until now each of those tests answered it with its own copy of a one-line
// regex. This module is the single answer. Nothing in tests/ should define
// another one; a local copy is a copy that drifts.
//
// ── Why not the one-line regex ───────────────────────────────────────────────
//
// The form that spread through the suite was:
//
//     src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ')
//
// It is not merely imprecise, it is dangerous, and the danger was MEASURED
// while building #277. src/pages/ColorStudio.jsx contains an
// `accept="image/*"` attribute. The slash-star in that attribute value reads as
// the start of a block comment; the non-greedy match then ran to the next
// closing marker **819 lines later** and blanked a third of the file —
// including a price the scan existed to check. Nothing went red. The guard
// simply stopped being able to see the code, which is the worst way for a test
// to fail: it fails green.
//
// The same shape has two smaller siblings. A double slash inside a string — a
// URL such as https://uil4b.com — and the escaped slash in a regex literal like
// /https?:\/\// both read as the start of a line comment to /^\s*\/\/.*$/gm
// when they begin a line.
//
// ── What this does instead ───────────────────────────────────────────────────
//
// It walks the source one character at a time, copying string and template
// literals through untouched and blanking only real comments. Escape pairs are
// copied as pairs, which is what stops \/ opening a comment.
//
// Two invariants hold for every input, and tests/unit/strip-comments.test.js
// asserts both:
//
//   1. LENGTH IS PRESERVED. Comments are overwritten with spaces, never
//      deleted, so an offset into the stripped text is an offset into the
//      original.
//   2. NEWLINES SURVIVE. Line N of the output is line N of the input, so a
//      failure message that reports a line number points at the right code.
//
// ── The known limitation, stated rather than hidden ──────────────────────────
//
// The walk is not a JavaScript parser. A lone apostrophe outside a string — a
// character class like /['"]/, or an unescaped apostrophe in JSX text — opens a
// pseudo-string that runs to the next quote of the same kind. The consequence
// is that a comment inside that span is NOT stripped.
//
// That failure direction is deliberate and it is the safe one: this
// under-strips, so an assertion sees prose it should not have seen and goes
// RED. The naive regex over-strips, so an assertion sees nothing at all and
// goes GREEN. A loud wrong answer is worth having; a quiet one is not.

/**
 * Blank the comments in JavaScript, JSX, CSS or JSON source.
 *
 * @param {string} src
 * @param {{ lineComments?: boolean }} [options]
 *   `lineComments` — strip a double slash to end of line. Default true. Pass
 *   **false** for CSS, which has no line comments at all: there, a double slash
 *   is always part of a URL, and treating it as a comment deletes the rest of
 *   the declaration. JSON has no comments of either kind, but running the same
 *   pass over it with `lineComments: false` is harmless and keeps one code path.
 * @returns {string} the same source, same length, same line count, comments
 *   replaced by spaces.
 */
export function stripComments(src, { lineComments = true } = {}) {
  let out = ''
  let i = 0
  const n = src.length
  while (i < n) {
    const c = src[i]
    const d = src[i + 1]
    if (c === '\\' && i + 1 < n) { out += c + d; i += 2; continue }
    if (c === '/' && d === '*') {
      let end = src.indexOf('*/', i + 2)
      end = end === -1 ? n : end + 2
      for (let k = i; k < end; k += 1) out += src[k] === '\n' ? '\n' : ' '
      i = end
      continue
    }
    if (lineComments && c === '/' && d === '/') {
      let end = src.indexOf('\n', i)
      end = end === -1 ? n : end
      out += ' '.repeat(end - i)
      i = end
      continue
    }
    if (c === '"' || c === "'" || c === '`') {
      out += c
      i += 1
      while (i < n) {
        const s = src[i]
        if (s === '\\') { out += src.slice(i, i + 2); i += 2; continue }
        out += s
        i += 1
        if (s === c) break
      }
      continue
    }
    out += c
    i += 1
  }
  return out
}

/** JavaScript and JSX: both comment forms. */
export const stripJs = (src) => stripComments(src, { lineComments: true })

/**
 * CSS: block comments only.
 *
 * Not a stylistic choice. CSS has no line comments, and src/styles/global.css
 * carries https:// inside url() declarations. Stripping a double slash there
 * would delete live declarations, which is the same fault this module exists to
 * stop, pointed the other way.
 */
export const stripCss = (src) => stripComments(src, { lineComments: false })

/** JSON: no comments exist, but callers scanning mixed trees want one entry point. */
export const stripJson = (src) => stripComments(src, { lineComments: false })

/**
 * HTML comments, preserving length and line numbers like the others.
 *
 * `script` and `style` element content is raw text — per the HTML parsing rules
 * a comment opener in there does not open a document comment — so this copies
 * those elements through untouched rather than letting a closing marker inside
 * an inline script's string swallow the rest of the document. If you need the
 * JS comments inside an inline script blanked as well, run `stripJs` over that
 * script's text yourself; no test needs that today and guessing at it would be
 * one more unmeasured behaviour.
 */
export function stripHtml(src) {
  const RAW_TEXT = /^<(script|style)\b/i
  let out = ''
  let i = 0
  const n = src.length
  const lower = src.toLowerCase()
  while (i < n) {
    if (src.startsWith('<!--', i)) {
      let end = src.indexOf('-->', i + 4)
      end = end === -1 ? n : end + 3
      for (let k = i; k < end; k += 1) out += src[k] === '\n' ? '\n' : ' '
      i = end
      continue
    }
    if (src[i] === '<') {
      const tag = RAW_TEXT.exec(src.slice(i, i + 8))
      if (tag) {
        const close = lower.indexOf('</' + tag[1].toLowerCase(), i)
        const end = close === -1 ? n : close + tag[1].length + 2
        out += src.slice(i, end)
        i = end
        continue
      }
    }
    out += src[i]
    i += 1
  }
  return out
}

/**
 * The canary, as a reusable measurement: the longest run of consecutive lines
 * that had content before stripping and have none after.
 *
 * The longest genuine comment block in this repository is 49 lines. The
 * ColorStudio miss described at the top of this file blanked 819. Anything past
 * ~150 is the stripper eating code, and a scan running blind over what it ate.
 *
 * @param {string} raw       source as read from disk
 * @param {string} stripped  the same source through one of the strippers above
 * @returns {number} longest blanked run, in lines
 */
export function longestBlankedRun(raw, stripped) {
  const before = raw.split('\n')
  const after = stripped.split('\n')
  let run = 0
  let worst = 0
  for (let i = 0; i < before.length; i += 1) {
    const had = before[i].trim().length > 0
    const has = (after[i] || '').trim().length > 0
    if (had && !has) { run += 1; worst = Math.max(worst, run) } else run = 0
  }
  return worst
}

/** The stripper appropriate to a path's extension. Comments in, comments out. */
export function stripForPath(filePath, src) {
  if (/\.html?$/i.test(filePath)) return stripHtml(src)
  if (/\.css$/i.test(filePath)) return stripCss(src)
  if (/\.json$/i.test(filePath)) return stripJson(src)
  return stripJs(src)
}
