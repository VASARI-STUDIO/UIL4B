// How every file the product hands over is named: `{project}-{artefact}.{ext}`,
// from this one module. The dialog's manifest and preview heading, the export
// runner, the UI kit's own download buttons and the tools' save menus all call it,
// so a file is never called one thing on screen and another on disk.
//
// A project with no name is `untitled`, never the product's name. The token files
// are the one exception to the hyphen: `lumen.tokens.css` and `lumen.tokens.json`
// keep the dot that token tools look for.
//
// Plain functions with no React or DOM, so the kit renderer and node tests read it.

/** What a file is called when its project has no name. */
export const UNTITLED = 'untitled'

/** The longest project part of a name, in characters. */
export const PROJECT_SLUG_MAX = 52

const ARTEFACT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const EXTENSION = /^[a-z0-9]+$/
// Artefacts joined to the project with a dot instead of a hyphen.
const DOTTED = new Set(['tokens'])

/** A project name as the part of a file name: lowercase letters, digits and single hyphens. */
export function projectSlug(project) {
  const slug = String(project ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, PROJECT_SLUG_MAX)
    .replace(/^-+|-+$/g, '')
  return slug || UNTITLED
}

/**
 * `lumen-ui-kit.html` from ('Lumen', 'ui-kit', 'html'). `project` is the project's
 * name as typed (any string, or nothing); `artefact` is a lowercase hyphenated word
 * and `ext` has no dot. A malformed artefact or extension is a bug in the caller, so
 * it throws instead of writing a stray name to disk.
 */
export function fileName(project, artefact, ext) {
  if (typeof artefact !== 'string' || !ARTEFACT.test(artefact)) throw new Error(`Not a file artefact: ${artefact}`)
  if (typeof ext !== 'string' || !EXTENSION.test(ext)) throw new Error(`Not a file extension: ${ext}`)
  return `${projectSlug(project)}${DOTTED.has(artefact) ? '.' : '-'}${artefact}.${ext}`
}

// What each export format (the ids in config/exportFormats.js) is called, as
// [artefact, ext]. The book as a PDF is not saved by us: it opens in a print window,
// and the name is the one the browser offers, so it is listed for the manifest and
// used only if the window is blocked and the HTML is saved instead.
const FORMAT_FILES = Object.freeze({
  book: Object.freeze(['book', 'pdf']),
  'book-png': Object.freeze(['book-pages', 'zip']),
  'book-html': Object.freeze(['book', 'html']),
  guidelines: Object.freeze(['brand-guidelines', 'pdf']),
  'guidelines-html': Object.freeze(['brand-guidelines', 'html']),
  html: Object.freeze(['style-guide', 'html']),
  png: Object.freeze(['style-guide', 'png']),
  jpeg: Object.freeze(['style-guide', 'jpg']),
  md: Object.freeze(['style-guide', 'md']),
  kit: Object.freeze(['ui-kit', 'html']),
  css: Object.freeze(['tokens', 'css']),
  json: Object.freeze(['tokens', 'json']),
  tailwind: Object.freeze(['tailwind', 'css']),
  contrast: Object.freeze(['contrast-pairs', 'csv']),
  'contrast-json': Object.freeze(['contrast-pairs', 'json']),
})

/** True for an export format id this module can name. */
export const hasFormatFile = (formatId) => Object.hasOwn(FORMAT_FILES, formatId)

/**
 * The name an export format downloads under for a project, or '' for an id it does
 * not know. The saved file of a print format is its HTML: pass `saved: true`.
 */
export function formatFileName(project, formatId, { saved = false } = {}) {
  if (!hasFormatFile(formatId)) return ''
  const [artefact, ext] = FORMAT_FILES[formatId]
  return fileName(project, artefact, saved && ext === 'pdf' ? 'html' : ext)
}
