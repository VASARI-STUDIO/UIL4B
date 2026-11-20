// The file names the image converter saves under.
//
// Free keeps the source's own name with the new extension, which is what
// everyone expects. A pattern (a Pro control) swaps that for a template the
// visitor writes once and every file in the batch follows:
//
//   {name}    the source file's name, without its extension
//   {format}  the output extension: png, jpg, webp, avif or ico
//   {width}   the output width in pixels
//   {height}  the output height in pixels
//   {n}       the file's place in the batch, from 1
//
// Pure functions, no DOM: the page calls them for the preview line, the single
// download and every ZIP entry, so all three always agree.

export const DEFAULT_NAME_PATTERN = '{name}'

/** The tokens a pattern may use, in the order the helper text lists them. */
export const NAME_TOKENS = ['name', 'format', 'width', 'height', 'n']

const MAX_BASE = 120
// Characters a file name cannot carry on Windows (the strictest of the three
// desktops), plus control characters. Replaced with a hyphen so "a/b" stays
// readable as "a-b" rather than fusing to "ab".
// eslint-disable-next-line no-control-regex
const UNSAFE = /[\x5c/:*?"<>|\u0000-\u001f]+/g

/** Tokens in `pattern` this converter does not know, so the page can say so. */
export function unknownTokens(pattern) {
  const found = []
  for (const m of String(pattern ?? '').matchAll(/\{([^{}]*)\}/g)) {
    if (!NAME_TOKENS.includes(m[1]) && !found.includes(m[0])) found.push(m[0])
  }
  return found
}

/** A name safe to save: no path or reserved characters, no edge dots or spaces. */
export function safeBase(text) {
  const clean = String(text ?? '')
    .replace(UNSAFE, '-')
    .replace(/\s+/g, ' ')
    .replace(/^[\s.]+|[\s.]+$/g, '')
    .slice(0, MAX_BASE)
    .replace(/[\s.]+$/g, '')
  return clean
}

/**
 * The name, without its extension, that `pattern` gives one file.
 * An empty pattern, or one that comes to nothing once made safe, falls back to
 * the source name so a download is never nameless.
 *
 * @param {string} pattern
 * @param {{name: string, ext: string, w?: number, h?: number, n?: number}} file
 */
export function applyNamePattern(pattern, { name, ext, w = 0, h = 0, n = 1 }) {
  const stem = safeBase(String(name ?? '').replace(/\.[^.]+$/, '')) || 'image'
  const text = String(pattern ?? '').trim()
  if (!text) return stem
  const values = { name: stem, format: ext, width: w || '', height: h || '', n }
  const made = safeBase(text.replace(/\{([^{}]*)\}/g, (all, key) => (key in values ? String(values[key]) : '')))
  // Only separators and dots left ("///") is nothing at all.
  return /[\p{L}\p{N}]/u.test(made) ? made : stem
}

/** `base.ext`, made unique within `used` by counting up: a, a-1, a-2. */
export function uniqueFileName(base, ext, used) {
  let file = `${base}.${ext}`
  let k = 1
  while (used.has(file)) file = `${base}-${k++}.${ext}`
  used.add(file)
  return file
}
